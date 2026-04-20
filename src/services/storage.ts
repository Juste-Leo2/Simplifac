import 'react-native-get-random-values';
import { createMMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { UserPreferences, UserProfile } from '../types/storage';
import type { AIProvider } from './ai';

const SETTINGS_KEY = 'simplifac_settings';
const PROFILE_KEY = 'simplifac_profile';
const API_KEY_PREFIX = 'api_key_';

// Instance standard pour les réglages non sensibles (thème, langue...)
export const storage = createMMKV({
  id: 'preferences-storage',
});

// Instance dédiée au profil (données réputées sensibles) avec chiffrement
let secureStorage: ReturnType<typeof createMMKV> | null = null;

export const initSecureStorage = async (): Promise<boolean> => {
  if (secureStorage) return true;
  try {
    const service = 'secure-profile-storage-key';
    const credentials = await Keychain.getGenericPassword({ service });
    let encryptionKey = '';
    
    if (credentials) {
      encryptionKey = credentials.password;
    } else if (credentials === false) {
      // Générer une nouvelle clé de chiffrement sécurisée forte avec crypto.getRandomValues
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      encryptionKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      await Keychain.setGenericPassword('simplifac', encryptionKey, { service });
    } else {
      throw new Error("Impossible d'accéder au Keychain.");
    }

    secureStorage = createMMKV({
      id: 'secure-profile-storage',
      encryptionKey,
    });
    return true;
  } catch (e) {
    console.error("Erreur lors de l'initialisation du stockage sécurisé:", e);
    return false;
  }
};

export const StorageService = {
  // --- Paramètres Généraux ---
  getPreferences: (): UserPreferences | null => {
    try {
      const data = storage.getString(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Validation basique pour apaiser l'avertissement de sécurité de type
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as UserPreferences;
        }
      }
    } catch (e) {
      console.error('Failed to parse preferences from MMKV:', e);
    }
    return null;
  },

  savePreferences: (preferences: UserPreferences): void => {
    try {
      storage.set(SETTINGS_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences to MMKV:', e);
    }
  },

  // --- Profil Utilisateur (PII) ---
  getProfile: (): UserProfile | null => {
    if (!secureStorage) return null;
    try {
      const data = secureStorage.getString(PROFILE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as UserProfile;
        }
      }
    } catch (e) {
      console.error('Failed to parse profile from secure MMKV:', e);
    }
    return null;
  },

  saveProfile: (profile: UserProfile): void => {
    if (!secureStorage) return;
    try {
      secureStorage.set(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile to secure MMKV:', e);
    }
  },

  // --- Clés API (chiffré) ---
  saveApiKey: (provider: AIProvider, key: string): void => {
    if (!secureStorage) return;
    try {
      secureStorage.set(`${API_KEY_PREFIX}${provider}`, key);
    } catch (e) {
      console.error(`Failed to save ${provider} API key:`, e);
    }
  },

  getApiKey: (provider: AIProvider): string | null => {
    if (!secureStorage) return null;
    try {
      return secureStorage.getString(`${API_KEY_PREFIX}${provider}`) ?? null;
    } catch (e) {
      console.error(`Failed to read ${provider} API key:`, e);
      return null;
    }
  },

  deleteApiKey: (provider: AIProvider): void => {
    if (!secureStorage) return;
    try {
      secureStorage.remove(`${API_KEY_PREFIX}${provider}`);
    } catch (e) {
      console.error(`Failed to delete ${provider} API key:`, e);
    }
  },
};

