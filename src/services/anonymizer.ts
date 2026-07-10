import { extractEntities, NerEntity } from './NerService';

export interface AnonymizationResult {
  anonymizedText: string;
  mapping: Record<string, string>;
}

// Les civilités à exclure du masquage
const CIVILITIES = ['Monsieur ', 'Madame ', 'M. ', 'Mme ', 'Mr ', 'Mademoiselle ', 'Mlle '];

const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

  // Numéro INE
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
    const normalizedText = removeAccents(anonymizedText);

    for (const entity of sortedEntities) {
      if (entity.entity_group === 'PER' || entity.entity_group === 'LOC') {
        let cleanWord = entity.word.trim();
        
        // Ignorer les mots très courts qui pourraient être des erreurs de tokenisation
        if (cleanWord.length <= 2) continue;

        // Trouver toutes les occurrences de cleanWord dans le texte normalisé
        let startIndex = 0;
        let index = normalizedText.indexOf(cleanWord, startIndex);
        
        while (index !== -1) {
          // Extraire le mot exact avec sa casse et ses accents d'origine !
          // La normalisation NFD préserve la longueur exacte de la chaîne en JavaScript après notre regex.
          let originalWord = anonymizedText.substring(index, index + cleanWord.length);
          
          // Vérifier les frontières du mot (pour ne pas remplacer "Stras" dans "Strasbourgeoise")
          const beforeChar = index > 0 ? anonymizedText[index - 1] : ' ';
          const afterChar = index + cleanWord.length < anonymizedText.length ? anonymizedText[index + cleanWord.length] : ' ';
          const isWordBoundary = (char: string) => /[\s.,!?;:'"()\[\]{}\\]/.test(char);
          
          if ((index === 0 || isWordBoundary(beforeChar)) && 
              (index + cleanWord.length === anonymizedText.length || isWordBoundary(afterChar))) {
                
            // Nettoyage de la civilité pour ne masquer que le nom propre
            let wordToMask = originalWord;
            if (entity.entity_group === 'PER') {
              for (const civ of CIVILITIES) {
                if (wordToMask.toLowerCase().startsWith(civ.toLowerCase())) {
                  wordToMask = wordToMask.substring(civ.length).trim();
                  break;
                }
              }
            }

            if (wordToMask.length > 1) {
              let existingKey = Object.keys(mapping).find(key => mapping[key] === wordToMask);
              let keyToUse = existingKey;

              if (!keyToUse) {
                if (entity.entity_group === 'PER') {
                  keyToUse = `[PERSONNE${personCount++}]`;
                } else {
                  keyToUse = `[LIEU${locCount++}]`;
                }
                mapping[keyToUse] = wordToMask;
              }

              // Remplacement sécurisé via regex sur le mot exact
              const escapedWord = wordToMask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
              anonymizedText = anonymizedText.replace(regex, keyToUse);
            }
          }
          
          // Chercher l'occurrence suivante
          startIndex = index + cleanWord.length;
          index = normalizedText.indexOf(cleanWord, startIndex);
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'anonymisation NER :", error);
  }

  console.log("=== RÉSULTAT DE L'ANONYMISATION ===");
  console.log("Texte original:", text);
  console.log("Texte anonymisé:", anonymizedText);
  console.log("Dictionnaire (Mapping):", JSON.stringify(mapping, null, 2));
  console.log("===================================");

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
