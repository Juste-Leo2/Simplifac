import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';

/**
 * Opens the device file picker filtered to PDF files.
 * Returns the file content as a base64 string, or null if cancelled.
 */
export const pickAndReadPdf = async (): Promise<string | null> => {
  try {
    const [result] = await pick({
      type: ['application/pdf'],
    });

    if (!result?.uri) return null;

    // Nettoyer le préfixe file:// pour ReactNativeBlobUtil
    const cleanPath = Platform.OS === 'android'
      ? result.uri.replace('file://', '')
      : result.uri;

    const base64 = await ReactNativeBlobUtil.fs.readFile(cleanPath, 'base64');
    return base64;
  } catch (err: unknown) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
      return null; // L'utilisateur a annulé
    }
    console.error('Erreur lors de la lecture du PDF:', err);
    return null;
  }
};
