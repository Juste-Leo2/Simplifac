import { NativeModules, Platform } from 'react-native';

const { MLKitTextRecognition } = NativeModules;

export const recognizeTextFromImage = async (imageUri: string): Promise<string | null> => {
  try {
    if (!MLKitTextRecognition) {
      console.warn("Le module MLKitTextRecognition n'est pas lié. Avez-vous rebuildé l'application ?");
      return null;
    }

    let uriToProcess = imageUri;
    
    // Sur iOS, parfois les assets depuis 'react-native-image-picker' ont le prefix 'file://'
    // que le module natif gère, mais assurons-nous que le chemin est clean si nécessaire.
    if (Platform.OS === 'android' && !imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
        uriToProcess = `file://${imageUri}`;
    }

    const text = await MLKitTextRecognition.recognizeText(uriToProcess);
    return text;
  } catch (error) {
    console.error('Erreur lors de la reconnaissance OCR:', error);
    return null;
  }
};
