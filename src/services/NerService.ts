import { pipeline, env } from '@huggingface/transformers';

// Configuration pour React Native
// Utiliser le modèle local présent dans ton dossier 'assets/models/albert-wikiner-fr-onnx'
env.allowLocalModels = true;
env.allowRemoteModels = false; // Désactivé pour forcer le local

// Mettre le chemin vers le dossier contenant le modèle (relatif pour le bundler RN)
// Avec transformers.js et React Native, on peut utiliser des URL ou des chemins d'assets locaux
// selon la configuration du plugin babel / metro.
env.localModelPath = 'assets/models/'; 

/**
 * Service pour l'inférence NER avec le modèle ALBERT ONNX
 * Utilise Transformers.js pour gérer la tokenisation et l'inférence.
 */
class NERInference {
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      console.log("Chargement du modèle ONNX...");
      
      // Initialisation du pipeline
      this.instance = pipeline(
        'token-classification', 
        'albert-wikiner-fr-onnx', 
        { 
          quantized: false // Utiliser false car le fichier s'appelle model.onnx (pas model_quantized.onnx)
        }
      );
    }
    return this.instance;
  }
}

export interface NerEntity {
  entity_group: string;
  score: number;
  word: string;
  start?: number;
  end?: number;
}

/**
 * Fonction pour extraire les entités d'un texte
 * @param text - Le texte à analyser
 * @returns Liste des entités détectées
 */
export const extractEntities = async (text: string): Promise<NerEntity[]> => {
  if (!text) return [];
  
  try {
    const classifier = await NERInference.getInstance();
    
    // On utilise l'aggregation "simple" (comme en Python) pour regrouper les sous-mots (B-PER, I-PER -> PER)
    const results = await classifier(text, {
      aggregation_strategy: "simple"
    });
    
    return results as NerEntity[];
  } catch (error) {
    console.error("Erreur d'inférence NER :", error);
    return [];
  }
};
