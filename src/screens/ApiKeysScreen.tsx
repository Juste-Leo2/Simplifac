import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Linking,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StorageService } from '../services/storage';
import { testApiKey, AIProvider } from '../services/ai';

type Props = NativeStackScreenProps<RootStackParamList, 'ApiKeys'>;

interface ProviderInfo {
  id: AIProvider;
  name: string;
  keyUrl: string;
  keyUrlLabel: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'google',
    name: 'Google',
    keyUrl: 'https://aistudio.google.com/api-keys',
    keyUrlLabel: 'aistudio.google.com/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'console.groq.com/keys',
  },
];

// Status for each provider card border glow
type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';

export default function ApiKeysScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Track input + status per provider
  const [inputs, setInputs] = useState<Record<AIProvider, string>>({ google: '', groq: '' });
  const [statuses, setStatuses] = useState<Record<AIProvider, KeyStatus>>({ google: 'idle', groq: 'idle' });

  // Animated border glow per provider
  const glowAnims = useRef<Record<AIProvider, Animated.Value>>({
    google: new Animated.Value(0),
    groq: new Animated.Value(0),
  }).current;

  // Load existing keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      for (const p of PROVIDERS) {
        const saved = StorageService.getApiKey(p.id);
        if (saved) {
          setInputs(prev => ({ ...prev, [p.id]: saved }));
          // Re-test saved key
          setStatuses(prev => ({ ...prev, [p.id]: 'testing' }));
          const ok = await testApiKey(p.id, saved);
          const result = ok ? 'valid' : 'invalid';
          setStatuses(prev => ({ ...prev, [p.id]: result }));
          animateGlow(p.id, result);
        }
      }
    };
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateGlow = (provider: AIProvider, status: 'valid' | 'invalid') => {
    const anim = glowAnims[provider];
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  };

  const handleSave = async (provider: AIProvider) => {
    const key = inputs[provider].trim();
    if (!key) return;

    setStatuses(prev => ({ ...prev, [provider]: 'testing' }));

    // Save key first
    StorageService.saveApiKey(provider, key);

    // Test it
    const ok = await testApiKey(provider, key);
    const result = ok ? 'valid' : 'invalid';
    setStatuses(prev => ({ ...prev, [provider]: result }));
    animateGlow(provider, result);

    if (!ok) {
      Alert.alert(
        'Clé invalide',
        'Impossible de se connecter avec cette clé. Vérifie qu\'elle est correcte.',
      );
    }
  };

  const handleDelete = (provider: AIProvider) => {
    Alert.alert(
      'Supprimer la clé',
      `Supprimer la clé API ${provider === 'google' ? 'Google' : 'Groq'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            StorageService.deleteApiKey(provider);
            setInputs(prev => ({ ...prev, [provider]: '' }));
            setStatuses(prev => ({ ...prev, [provider]: 'idle' }));
            glowAnims[provider].setValue(0);
          },
        },
      ],
    );
  };

  const getBorderColor = (provider: AIProvider): Animated.AnimatedInterpolation<string> => {
    const status = statuses[provider];
    if (status === 'testing') {
      // Pulse during loading
      return glowAnims[provider].interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['rgba(147, 51, 234, 0.2)', 'rgba(147, 51, 234, 0.6)', 'rgba(147, 51, 234, 0.2)'],
      });
    }
    if (status === 'idle') {
      return glowAnims[provider].interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'],
      });
    }
    const color = status === 'valid' ? 'rgba(34,197,94,' : 'rgba(239,68,68,';
    return glowAnims[provider].interpolate({
      inputRange: [0, 1],
      outputRange: [`${color}0)`, `${color}0.7)`],
    });
  };

  const getShadowColor = (provider: AIProvider): string => {
    const status = statuses[provider];
    if (status === 'valid') return '#22C55E';
    if (status === 'invalid') return '#EF4444';
    return '#000';
  };

  const renderProviderCard = (provider: ProviderInfo) => {
    const status = statuses[provider.id];
    const hasKey = inputs[provider.id].trim().length > 0;
    const borderColor = getBorderColor(provider.id);

    return (
      <Animated.View
        key={provider.id}
        style={[
          styles.card,
          {
            borderColor,
            borderWidth: 1.5,
            shadowColor: getShadowColor(provider.id),
            shadowOpacity: status === 'valid' || status === 'invalid' ? 0.4 : 0.1,
            shadowRadius: status === 'valid' || status === 'invalid' ? 12 : 6,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {status === 'valid' ? '✅ ' : status === 'invalid' ? '❌ ' : '🔑 '}
            {provider.name}
          </Text>
        </View>

        {/* Input zone */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.apiInput}
            placeholder="Colle ta clé API ici..."
            placeholderTextColor="#6B7280"
            value={inputs[provider.id]}
            onChangeText={(text) => setInputs(prev => ({ ...prev, [provider.id]: text }))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveButton, !hasKey && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={() => handleSave(provider.id)}
            disabled={!hasKey || status === 'testing'}
          >
            {status === 'testing' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>

          {hasKey && status !== 'testing' && (
            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.8}
              onPress={() => handleDelete(provider.id)}
            >
              <Text style={styles.deleteButtonText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Link to get key - Only show if not valid */}
        {status !== 'valid' && status !== 'testing' && (
          <TouchableOpacity
            style={styles.getButton}
            activeOpacity={0.7}
            onPress={() => Linking.openURL(provider.keyUrl)}
          >
            <Text style={styles.getButtonText}>Obtenir une clé 🔗</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clés API</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Tes clés proviennent de sources reconnues et de confiance. Elles sont cumulables pour obtenir plus de requêtes. Elles sont stockées localement et chiffrées sur ton appareil et ne transitent jamais par nos serveurs.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {PROVIDERS.map(renderProviderCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E38',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  infoText: {
    color: '#C4B5FD',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#1E1E38',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    // Shadow (iOS + Android)
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F3F4F6',
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.9,
  },
  inputRow: {
    marginBottom: 14,
  },
  apiInput: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F3F4F6',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#9333EA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  getButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  getButtonText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
});
