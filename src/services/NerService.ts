import { pipeline, env } from '@huggingface/transformers';
import { Image } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { InferenceSession } from 'onnxruntime-react-native';

// Monkey patch InferenceSession.create pour contourner la conversion Uint8Array de transformers.js
// Transformers.js force la conversion du buffer en Uint8Array, ce qui détruit notre string de chemin.
// On intercepte la création de session pour lui redonner le vrai chemin du fichier local !
const originalCreate = InferenceSession.create;
(InferenceSession as any).create = async function(arg0: any, arg1?: any, arg2?: any, arg3?: any) {
  if (arg0 instanceof Uint8Array && arg0.length === 0 && (global as any).latestModelPath) {
    console.log("Intercepted InferenceSession.create, using local path:", (global as any).latestModelPath);
    return originalCreate.call(InferenceSession, (global as any).latestModelPath, arg1);
  }
  return originalCreate.call(InferenceSession, arg0, arg1, arg2, arg3);
};

// Désactivation des requêtes distantes et du FS Node
env.allowLocalModels = true; 
env.allowRemoteModels = false; 
env.useFS = false;
env.localModelPath = 'assets/models/';

// Pre-load all assets via Metro bundler
const modelAssets: Record<string, any> = {
  'config.json': require('../assets/models/albert-wikiner-fr-onnx/config.json'),
  'tokenizer.json': require('../assets/models/albert-wikiner-fr-onnx/tokenizer.json'),
  'tokenizer_config.json': require('../assets/models/albert-wikiner-fr-onnx/tokenizer_config.json'),
  'special_tokens_map.json': require('../assets/models/albert-wikiner-fr-onnx/special_tokens_map.json'),
  'spiece.model': require('../assets/models/albert-wikiner-fr-onnx/spiece.model'),
  'model.onnx': require('../assets/models/albert-wikiner-fr-onnx/onnx/model.onnx'),
  'model_quantized.onnx': require('../assets/models/albert-wikiner-fr-onnx/onnx/model.onnx'),
};

// Surcharge de la méthode fetch pour intercepter les appels de transformers.js
env.fetch = async (url: string, init?: any) => {
  console.log("Intercepted fetch:", url);
  
  const parts = url.split('/');
  const filename = parts.pop()!;
  
  // Récupérer l'asset correspondant
  const asset = modelAssets[filename];
  
  if (asset) {
    if (filename.endsWith('.json')) {
      return new Response(JSON.stringify(asset), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (filename.endsWith('.model') || filename.endsWith('.onnx')) {
      const uri = Image.resolveAssetSource(asset).uri;
      
      if (filename.endsWith('.onnx')) {
        let modelPath = uri;
        
        if (uri.startsWith('http')) {
          const destPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
          // Toujours vérifier si le fichier est valide. Dans le doute, on peut le retélécharger,
          // mais on va assumer qu'il est bon s'il existe pour éviter de télécharger 41Mo à chaque fois.
          const exists = await ReactNativeBlobUtil.fs.exists(destPath);
          
          if (!exists) {
            console.log("Downloading ONNX model to cache in DEV mode...");
            await ReactNativeBlobUtil.config({ path: destPath }).fetch('GET', uri);
          }
          modelPath = destPath;
        } else if (uri.startsWith('raw/')) {
          // En production Android, l'URI des assets ressemble à "raw/model_onnx"
          // react-native-blob-util peut générer un chemin absolu pour les assets
          // ou onnxruntime peut le charger avec 'asset://'
          modelPath = `asset://${filename}`; // 'asset://model.onnx' si on le met à la racine des assets
          // Mais attention, metro bundler met les assets ailleurs. 
          // Le plus sûr pour onnxruntime-react-native avec les assets packagés est de donner l'URI brute.
        }
        
        // On sauvegarde le vrai chemin local dans une variable globale
        (global as any).latestModelPath = modelPath;
        
        // On retourne un ArrayBuffer vide (0 bytes). 
        // transformers.js va le cast en Uint8Array(0), puis appeler InferenceSession.create.
        // Notre monkey patch attrapera cet appel et utilisera latestModelPath !
        return {
          arrayBuffer: async () => new ArrayBuffer(0)
        } as any;
      }

      if (uri.startsWith('http')) {
        // Mode développement pour spiece.model (petit fichier, fetch classique OK)
        return fetch(uri, init);
      } else {
        // Mode production pour spiece.model (raw assets)
        try {
          const base64Str = await ReactNativeBlobUtil.fs.readFile(uri, 'base64');
          const binaryString = global.atob ? global.atob(base64Str) : ReactNativeBlobUtil.base64.decode(base64Str);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          return new Response(bytes.buffer, {
            headers: { 'Content-Type': 'application/octet-stream' }
          });
        } catch (e) {
          console.error("Error loading asset:", filename, e);
          throw e;
        }
      }
    }
  }
  
  return fetch(url, init);
};

class NERInference {
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      console.log("Chargement du modèle ONNX...");
      
      // Initialisation du pipeline (nous passons juste un nom bidon puisque fetch est intercepté)
      this.instance = pipeline(
        'token-classification', 
        'albert-wikiner-fr-onnx', 
        { 
          quantized: false,
          session_options: {
            executionProviders: ['cpu'] // onnxruntime-react-native doesn't support 'wasm'
          }
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

// Découpage du texte pour éviter de dépasser la limite de tokens d'ALBERT (généralement 512)
function chunkText(text: string, maxLength: number = 200): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Séparer par sauts de lignes et points pour garder un sens contextuel
  const sentences = text.split(/([.\n])/);
  
  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if (currentChunk.length + part.length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  
  return chunks;
}

export const extractEntities = async (text: string): Promise<NerEntity[]> => {
  console.log("=== DÉMARRAGE DE L'EXTRACTION NER ===");
  if (!text) return [];
  
  try {
    const classifier = await NERInference.getInstance();
    const chunks = chunkText(text);
    let allEntities: NerEntity[] = [];
    
    for (const chunk of chunks) {
      if (chunk.length < 2) continue;
      
      // On retire l'aggregation_strategy "simple" car il fusionne mal les mots sous React Native
      // On va faire l'agrégation manuellement.
      const results = await classifier(chunk) as Array<{entity: string, score: number, word: string, index: number}>;
      
      console.log(`Raw ALBERT tokens for chunk:`, JSON.stringify(results));
      
      let currentEntity: NerEntity | null = null;
      let lastTokenIndex = -1;
      
      if (Array.isArray(results)) {
        for (const token of results) {
          if (token.entity === 'O') {
            if (currentEntity) { allEntities.push(currentEntity); currentEntity = null; }
            continue;
          }
          
          const group = token.entity.replace('B-', '').replace('I-', '');
          const cleanPiece = token.word.replace(/ /g, '').replace(/\u2581/g, '').trim();
          
          if (cleanPiece.length === 0) continue;
          
          // Le modèle ne renvoie pas toujours B- ou les espaces de séparation.
          // La seule façon fiable de savoir si deux sous-mots appartiennent à la même entité,
          // c'est de vérifier s'ils ont été générés à la suite (index consécutifs).
          const isSameGroup = currentEntity && currentEntity.entity_group === group;
          const isConsecutive = lastTokenIndex !== -1 && (token.index === lastTokenIndex + 1);
          
          if (currentEntity && isSameGroup && isConsecutive) {
            // Concaténer le sous-mot qui appartient au MÊME mot consécutif (ex: "eco" + "ute")
            currentEntity.word += cleanPiece;
          } else {
            // C'est un nouveau mot ou une nouvelle entité !
            if (currentEntity) allEntities.push(currentEntity);
            currentEntity = { entity_group: group, word: cleanPiece, score: token.score } as NerEntity;
          }
          
          lastTokenIndex = token.index;
        }
        if (currentEntity) {
           allEntities.push(currentEntity);
           currentEntity = null;
        }
      }
    }
    
    console.log("NER EXTRACTED ENTITIES:", JSON.stringify(allEntities, null, 2));
    
    return allEntities;
  } catch (error) {
    console.error("Erreur d'inférence NER :", error);
    return [];
  }
};
