import { extractEntities, NerEntity } from './NerService';

export interface AnonymizationResult {
  anonymizedText: string;
  mapping: Record<string, string>;
}

// Les civilités à exclure du masquage
const CIVILITIES = ['Monsieur ', 'Madame ', 'M. ', 'Mme ', 'Mr ', 'Mademoiselle ', 'Mlle '];

export const anonymize = async (text: string): Promise<AnonymizationResult> => {
  if (!text) return { anonymizedText: text, mapping: {} };

  let anonymizedText = text;
  const mapping: Record<string, string> = {};

  let personCount = 1;
  let locCount = 1;
  let emailCount = 1;
  let phoneCount = 1;
  let ineCount = 1;

  // 1. Regex Rapides
  // Emails
  anonymizedText = anonymizedText.replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const key = `[EMAIL${emailCount++}]`;
    mapping[key] = match;
    return key;
  });

  // Téléphones (français / inter)
  anonymizedText = anonymizedText.replace(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g, (match) => {
    const key = `[TELEPHONE${phoneCount++}]`;
    mapping[key] = match;
    return key;
  });

  // Numéro INE (11 caractères, alphanumérique ex: 123456789EE)
  anonymizedText = anonymizedText.replace(/\b\d{9,10}[A-Z]{1,2}\b/gi, (match) => {
    const key = `[INE${ineCount++}]`;
    mapping[key] = match;
    return key;
  });

  // 2. NER pour Personnes (PER) et Lieux (LOC)
  try {
    const entities = await extractEntities(anonymizedText);

    // Trier les entités par longueur de mot décroissante pour éviter les remplacements imbriqués partiels
    const sortedEntities = [...entities].sort((a, b) => b.word.length - a.word.length);

    for (const entity of sortedEntities) {
      if (entity.entity_group === 'PER' || entity.entity_group === 'LOC') {
        let originalWord = entity.word.trim();

        // Nettoyage de la civilité pour ne masquer que le nom propre
        if (entity.entity_group === 'PER') {
          for (const civ of CIVILITIES) {
            if (originalWord.toLowerCase().startsWith(civ.toLowerCase())) {
              originalWord = originalWord.substring(civ.length).trim();
              break;
            }
          }
        }

        // Si après nettoyage, il reste un mot valide
        if (originalWord.length > 1) {
          // On vérifie s'il n'a pas déjà été stocké dans le mapping
          let existingKey = Object.keys(mapping).find(key => mapping[key] === originalWord);
          let keyToUse = existingKey;

          if (!keyToUse) {
            if (entity.entity_group === 'PER') {
              keyToUse = `[PERSONNE${personCount++}]`;
            } else {
              keyToUse = `[LIEU${locCount++}]`;
            }
            mapping[keyToUse] = originalWord;
          }

          // Remplacement global du mot dans le texte
          // Échapper le mot original pour la regex
          const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
          
          anonymizedText = anonymizedText.replace(regex, keyToUse);
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'anonymisation NER :", error);
  }

  return { anonymizedText, mapping };
};

export const deanonymize = (text: string, mapping: Record<string, string>): string => {
  if (!text || !mapping || Object.keys(mapping).length === 0) return text;
  
  let deanonymizedText = text;
  for (const [key, value] of Object.entries(mapping)) {
    // Échapper les crochets pour la regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    deanonymizedText = deanonymizedText.replace(regex, value);
  }

  return deanonymizedText;
};
