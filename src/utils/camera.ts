import { launchCamera, CameraOptions } from 'react-native-image-picker';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

export const takePhoto = async (): Promise<string | null> => {
  if (Platform.OS === 'android') {
    try {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      
      if (!hasPermission) {
        // Demande manuelle via Alert pour vraiment contrôler le flux
        const userWantsToRequest = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Autorisation de la caméra",
            "Simplifac a besoin d'accéder à votre caméra pour scanner les documents.",
            [
              { text: "Plus tard", style: "cancel", onPress: () => resolve(false) },
              { text: "OK", onPress: () => resolve(true) }
            ],
            { cancelable: false }
          );
        });

        if (!userWantsToRequest) {
          console.log("Permission caméra reportée via 'Plus tard'.");
          return null; // On arrête là si l'utilisateur refuse pour le moment
        }

        // Si l'utilisateur a dit OK, on lance la vraie popup système Android (sans rationale)
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        
        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            "Caméra bloquée",
            "L'accès à la caméra a été désactivé définitivement. Veuillez l'autoriser manuellement dans les paramètres de l'application.",
            [
              { text: "Annuler", style: "cancel" },
              { text: "Ouvrir les paramètres", onPress: () => Linking.openSettings() }
            ]
          );
          return null;
        }

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permission caméra refusée par l\'utilisateur au niveau système.');
          return null;
        }
      }
    } catch (err) {
      console.error('Erreur lors de la demande de permission:', err);
      return null;
    }
  }

  const options: CameraOptions = {
    mediaType: 'photo',
    saveToPhotos: false,
    cameraType: 'back',
    quality: 0.8,
  };

  try {
    const response = await launchCamera(options);
    if (response.didCancel) {
      return null;
    }
    if (response.errorCode) {
      console.error('Camera error:', response.errorMessage);
      return null;
    }
    
    if (response.assets && response.assets.length > 0) {
      return response.assets[0].uri || null;
    }
    return null;
  } catch (error) {
    console.error('Exception in takePhoto:', error);
    return null;
  }
};
