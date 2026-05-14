import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { MailEntry, MailThread, UserProfile } from '../types/storage';

export type AIProvider = 'google' | 'groq';

const PROVIDER_CONFIG = {
  google: { model: 'gemma-4-26b-a4b-it' },
  groq: { model: 'openai/gpt-oss-20b', baseURL: 'https://api.groq.com/openai/v1' },
} as const;

/**
 * Sends a test prompt to validate the API key.
 * Returns true if the key works, false otherwise.
 */
export async function testApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const response = await generateAIResponse(provider, apiKey, 'Réponds juste "ok".');
    return response.length > 0;
  } catch {
    return false;
  }
}

/**
 * Generates a response from the specified AI provider.
 */
export async function generateAIResponse(
  provider: AIProvider,
  apiKey: string,
  message: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API manquante.');
  }

  if (provider === 'google') {
    return googleGenerate(apiKey, message);
  }
  return groqGenerate(apiKey, message);
}

async function googleGenerate(apiKey: string, message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: PROVIDER_CONFIG.google.model,
    contents: message,
    config: {
      thinkingConfig: {
        includeThoughts: false,
      },
    },
  });
  return response.text ?? '';
}

async function groqGenerate(apiKey: string, message: string): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: PROVIDER_CONFIG.groq.baseURL,
  });
  const response = await client.responses.create({
    model: PROVIDER_CONFIG.groq.model,
    input: message,
  });
  return response.output_text ?? '';
}

const CURRICULUM_PROMPT = `Tu es un assistant qui analyse les maquettes pédagogiques universitaires françaises.
À partir du document fourni, extrais les informations et retourne UNIQUEMENT un tableau JSON valide (sans commentaire, sans markdown, juste le JSON).
Chaque objet doit contenir :
- "semester" (string, ex: "S1", "S2")
- "ue" (string, nom de l'UE si présent, sinon "")
- "subject" (string, nom de la matière)
- "teacher" (string, nom de l'enseignant si disponible, sinon "")
- "coefficient" (number, coefficient si disponible, sinon 1)
- "ects" (number, crédits ECTS si disponible, sinon 0)

Si une information n'est pas trouvée, utilise les valeurs par défaut indiquées.
Retourne [] si aucune matière n'est identifiable.`;

type CurriculumResult = Array<Omit<import('../types/storage').CurriculumEntry, 'id'>>;

/**
 * Parses curriculum data from text (OCR) or PDF (base64).
 * source: 'text' for OCR plain text, 'pdf' for base64-encoded PDF.
 */
export async function parseCurriculumText(
  provider: AIProvider,
  apiKey: string,
  rawContent: string,
  source: 'text' | 'pdf' = 'text',
): Promise<CurriculumResult> {
  let response: string;

  if (source === 'pdf') {
    // PDF: utiliser l'API multimodale de Gemini (seul provider qui le supporte)
    if (provider !== 'google') {
      throw new Error('Le scan PDF nécessite une clé Google Gemini (API multimodale).');
    }
    response = await googleGenerateWithPdf(apiKey, CURRICULUM_PROMPT, rawContent);
  } else {
    // Texte OCR: envoi classique
    const message = `${CURRICULUM_PROMPT}\n\nTexte de la maquette :\n${rawContent}`;
    response = await generateAIResponse(provider, apiKey, message);
  }

  console.log('[AI] Réponse brute (500 premiers chars):', response.substring(0, 500));

  // Extraire le JSON de la réponse (au cas où l'IA ajoute du texte autour)
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Sends a PDF (base64) to Gemini using its multimodal API.
 */
async function googleGenerateWithPdf(apiKey: string, prompt: string, pdfBase64: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: PROVIDER_CONFIG.google.model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
        ],
      },
    ],
    config: {
      thinkingConfig: {
        includeThoughts: false,
      },
    },
  });
  return response.text ?? '';
}

// ─── Mail Assistant ─────────────────────────────────────────────────────────

const MAIL_PARSER_PROMPT = `Tu es un assistant qui analyse des mails universitaires scannés par OCR.
À partir du texte brut fourni, extrais les informations du mail et retourne UNIQUEMENT un objet JSON valide (sans commentaire, sans markdown, juste le JSON).
L'objet doit contenir :
- "subject" (string, l'objet du mail si visible, sinon déduis-le du contenu)
- "from" (string, l'expéditeur si visible, sinon "Inconnu")
- "content" (string, le corps du mail nettoyé et reformaté proprement)

Si le texte OCR est trop brouillé, fais de ton mieux pour reconstituer le mail.
Retourne toujours un objet JSON valide.`;

/**
 * Parses a scanned email (OCR text) into a structured MailEntry.
 */
export async function parseMailFromOCR(
  provider: AIProvider,
  apiKey: string,
  ocrText: string,
): Promise<Omit<MailEntry, 'id' | 'type' | 'confirmedByUser'>> {
  const message = `${MAIL_PARSER_PROMPT}\n\nTexte OCR du mail :\n${ocrText}`;
  const response = await generateAIResponse(provider, apiKey, message);

  console.log('[AI] Mail parsé (500 premiers chars):', response.substring(0, 500));

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { subject: 'Sans objet', from: 'Inconnu', content: ocrText };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject || 'Sans objet',
      from: parsed.from || 'Inconnu',
      content: parsed.content || ocrText,
    };
  } catch {
    return { subject: 'Sans objet', from: 'Inconnu', content: ocrText };
  }
}

const MAIL_CREATE_PROMPT = `Tu es un assistant qui aide un étudiant à rédiger des mails professionnels et polis.
Tu vas recevoir un fil de mails au format JSON contenant les mails déjà échangés (reçus et envoyés).
Tu dois rédiger un NOUVEAU mail en tenant compte de tout le contexte.

CONSIGNES STRICTES :
- Adopte un ton formel, professionnel mais pas trop distant.
- Utilise les formules de politesse appropriées (Bonjour Monsieur/Madame, Cordialement, etc.)
- N'invente PAS d'informations que l'étudiant n'a pas fournies.
- Retourne UNIQUEMENT le corps du mail (texte brut, pas de JSON, pas de markdown).
- N'utilise AUCUN émoji.`;

const MAIL_IMPROVE_PROMPT = `Tu es un assistant qui aide un étudiant à améliorer un brouillon de mail.
Tu vas recevoir un fil de mails au format JSON. Le dernier élément de type "draft" est le brouillon actuel à améliorer.
Applique l'instruction de l'étudiant pour produire une version améliorée du brouillon.

CONSIGNES STRICTES :
- Garde le même ton formel et professionnel.
- N'invente PAS d'informations que l'étudiant n'a pas fournies.
- Retourne UNIQUEMENT le corps du mail amélioré (texte brut, pas de JSON, pas de markdown).
- N'utilise AUCUN émoji.`;

/**
 * Generates or improves a mail draft using the full thread as JSON context.
 * - No draft in thread → creates a new mail (MAIL_CREATE_PROMPT)
 * - Draft exists → improves it (MAIL_IMPROVE_PROMPT)
 */
export async function generateMailDraft(
  provider: AIProvider,
  apiKey: string,
  mailThread: MailThread,
  studentProfile: UserProfile,
  userInstruction?: string,
): Promise<string> {
  // Serialize thread as clean JSON (only relevant fields)
  const cleanMails = mailThread.mails.map(m => ({
    type: m.type,
    subject: m.subject,
    ...(m.from && { from: m.from }),
    ...(m.to && { to: m.to }),
    content: m.content,
  }));

  const threadJson = JSON.stringify({
    discussion: mailThread.discussion,
    mails: cleanMails,
  }, null, 2);

  const profileJson = JSON.stringify({
    prenom: studentProfile.firstName || undefined,
    nom: studentProfile.lastName || undefined,
    filiere: studentProfile.fieldOfStudy || undefined,
    universite: studentProfile.university || undefined,
    niveau: studentProfile.studyLevel || undefined,
  }, null, 2);

  const hasDraft = mailThread.mails.some(m => m.type === 'draft');
  const prompt = hasDraft ? MAIL_IMPROVE_PROMPT : MAIL_CREATE_PROMPT;

  const message = `${prompt}

Profil de l'étudiant :
${profileJson}

Fil de mails (JSON) :
${threadJson}

${userInstruction ? `INSTRUCTION DE L'ÉTUDIANT : ${userInstruction}` : 'Rédige le mail.'}`;

  return generateAIResponse(provider, apiKey, message);
}
