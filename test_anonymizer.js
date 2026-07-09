// test_anonymizer.js
// Petit script de test pour s'assurer que l'anonymisation et la désanonymisation fonctionnent,
// notamment le nettoyage des civilités et le stockage correct des index (PERSONNE1, LIEU1, etc.)
// A lancer avec node test_anonymizer.js après compilation, ou via ts-node,
// mais comme onnxruntime a besoin d'un environnement asynchrone, voici la structure de test :

// Attention: le service NerService.ts a besoin d'être compilé ou on simule la fonction pour ce test rapide :

const testLogic = async () => {
  // Ceci est un mock du résultat NER pour simuler le comportement
  const mockEntities = [
    { entity_group: 'PER', score: 0.99, word: ' Monsieur Jean-Claude Convenant' },
    { entity_group: 'LOC', score: 0.98, word: ' Montpellier' }
  ];

  const CIVILITIES = ['Monsieur ', 'Madame ', 'M. ', 'Mme ', 'Mr ', 'Mademoiselle ', 'Mlle '];
  const mapping = {};
  let personCount = 1;
  let locCount = 1;
  let emailCount = 1;

  let anonymizedText = "Bonjour, je suis Monsieur Jean-Claude Convenant de Montpellier. Mon email est jc@test.com.";

  // 1. Mocks de Regex
  anonymizedText = anonymizedText.replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const key = `[EMAIL${emailCount++}]`;
    mapping[key] = match;
    return key;
  });

  // 2. Mocks de NER
  const sortedEntities = [...mockEntities].sort((a, b) => b.word.length - a.word.length);

  for (const entity of sortedEntities) {
    if (entity.entity_group === 'PER' || entity.entity_group === 'LOC') {
      let originalWord = entity.word.trim();

      if (entity.entity_group === 'PER') {
        for (const civ of CIVILITIES) {
          if (originalWord.toLowerCase().startsWith(civ.toLowerCase())) {
            originalWord = originalWord.substring(civ.length).trim();
            break;
          }
        }
      }

      if (originalWord.length > 1) {
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

        const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        
        anonymizedText = anonymizedText.replace(regex, keyToUse);
      }
    }
  }

  console.log("Texte original: Bonjour, je suis Monsieur Jean-Claude Convenant de Montpellier. Mon email est jc@test.com.");
  console.log("Texte anonymisé:", anonymizedText);
  console.log("Mapping:", mapping);

  // Deanonymize
  let deanonymizedText = "Le LLM répond : Ravi de vous rencontrer Monsieur [PERSONNE1]. J'espère qu'il fait beau à [LIEU1]. Je note votre adresse [EMAIL1].";
  for (const [key, value] of Object.entries(mapping)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    deanonymizedText = deanonymizedText.replace(regex, value);
  }

  console.log("\nTexte LLM simulé:", "Le LLM répond : Ravi de vous rencontrer Monsieur [PERSONNE1]. J'espère qu'il fait beau à [LIEU1]. Je note votre adresse [EMAIL1].");
  console.log("Texte désanonymisé:", deanonymizedText);
};

testLogic();
