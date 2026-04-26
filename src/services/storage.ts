import 'react-native-get-random-values';
import { createMMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { UserPreferences, UserProfile, CurriculumData, SubjectNote, ChatSession } from '../types/storage';
import type { AIProvider } from './ai';

const SETTINGS_KEY = 'simplifac_settings';
const PROFILE_KEY = 'simplifac_profile';
const CURRICULUM_KEY = 'simplifac_curriculum';
const NOTES_KEY = 'simplifac_notes';
const CHATS_KEY = 'simplifac_chats';
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

  // --- Maquette / Curriculum ---
  getCurriculum: (): CurriculumData | null => {
    if (!secureStorage) return null;
    try {
      const data = secureStorage.getString(CURRICULUM_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as CurriculumData;
        }
      }
    } catch (e) {
      console.error('Failed to parse curriculum from secure MMKV:', e);
    }
    return null;
  },

  saveCurriculum: (curriculum: CurriculumData): void => {
    if (!secureStorage) return;
    try {
      secureStorage.set(CURRICULUM_KEY, JSON.stringify(curriculum));
    } catch (e) {
      console.error('Failed to save curriculum to secure MMKV:', e);
    }
  },

  // --- Notes ---
  getNotes: (): Record<string, SubjectNote> => {
    if (!secureStorage) return {};
    try {
      const data = secureStorage.getString(NOTES_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to parse notes from secure MMKV:', e);
    }
    return {};
  },

  saveNote: (note: SubjectNote): void => {
    if (!secureStorage) return;
    try {
      const notes = StorageService.getNotes();
      notes[note.subjectId] = note;
      secureStorage.set(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save note to secure MMKV:', e);
    }
  },

  // --- Chat Sessions (History) ---
  getChatSessions: (): ChatSession[] => {
    if (!secureStorage) return [];
    try {
      const data = secureStorage.getString(CHATS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse chat sessions from secure MMKV:', e);
    }
    return [];
  },

  saveChatSession: (session: ChatSession): void => {
    if (!secureStorage) return;
    try {
      let sessions = StorageService.getChatSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session);
      }

      // Limiter à 20 sessions
      if (sessions.length > 20) {
        sessions = sessions.slice(0, 20);
      }
      }

      secureStorage.set(CHATS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save chat session to secure MMKV:', e);
    }
  },

  deleteChatSession: (id: string): void => {
    if (!secureStorage) return;
    try {
      let sessions = StorageService.getChatSessions();
      sessions = sessions.filter(s => s.id !== id);
      secureStorage.set(CHATS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to delete chat session:', e);
    }
  }
};

