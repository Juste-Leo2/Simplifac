import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  
  // États locaux (Mock) pour la UI
  const [isColorBlindMode, setIsColorBlindMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [configuredKeyCount, setConfiguredKeyCount] = useState(0);

  // Recalculate key count every time the screen is focused (e.g. coming back from ApiKeys)
  useFocusEffect(
    useCallback(() => {
      let count = 0;
      if (StorageService.getApiKey('google')) count++;
      if (StorageService.getApiKey('groq')) count++;
      setConfiguredKeyCount(count);
    }, []),
  );

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
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION : IA & MOTEUR */}
        <Text style={styles.sectionTitle}>Moteur IA</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.buttonRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ApiKeys')}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔑</Text>
              <View>
                <Text style={styles.rowTitle}>Clés API (Google / Groq)</Text>
                <Text style={styles.rowSubtitle}>
                  {configuredKeyCount > 0
                    ? `${configuredKeyCount} clé${configuredKeyCount > 1 ? 's' : ''} configurée${configuredKeyCount > 1 ? 's' : ''}`
                    : 'Non configurée'}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION : PRÉFÉRENCES */}
        <Text style={styles.sectionTitle}>Préférences</Text>
        <View style={styles.cardGroup}>
          {/* Langue */}
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌍</Text>
              <Text style={styles.rowTitle}>Langue de l'interface</Text>
            </View>
            <Text style={styles.rowActionText}>Français</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          
          {/* Theme */}
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌙</Text>
              <Text style={styles.rowTitle}>Mode Sombre</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#374151', true: '#9333EA' }}
              thumbColor={'#F3F4F6'}
            />
          </View>
          <View style={styles.separator} />
          
          {/* Accessibilité */}
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>👁️</Text>
              <Text style={styles.rowTitle}>Mode Daltonien</Text>
            </View>
            <Switch
              value={isColorBlindMode}
              onValueChange={setIsColorBlindMode}
              trackColor={{ false: '#374151', true: '#9333EA' }}
              thumbColor={'#F3F4F6'}
            />
          </View>
        </View>

        {/* SECTION : COMMUNAUTÉ & OPEN SOURCE */}
        <Text style={styles.sectionTitle}>Communauté</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🤝</Text>
              <View>
                <Text style={styles.rowTitle}>Contribuer à Simplifac</Text>
                <Text style={styles.rowSubtitle}>Partager ses données (Anonymisé)</Text>
              </View>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION : DIVERS */}
        <Text style={styles.sectionTitle}>Autres</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7} onPress={() => { /* TODO: Implement data deletion with confirmation */ }}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🗑️</Text>
              <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Effacer toutes mes données</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.appVersion}>Simplifac v0.0.1 (Alpha)</Text>

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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  cardGroup: {
    backgroundColor: '#1E1E38',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden', // Pour garder les coins arrondis avec les boutons dedans
    // Ombre 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12, // Un peu plus condensé pour les switch
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Pour éviter que le texte ne pousse le switch hors de l'écran
  },
  rowIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  rowTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  rowActionText: {
    color: '#9333EA', // Violet Améthyste
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: '#6B7280',
    fontSize: 20,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
  },
  appVersion: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontSize: 13,
  }
});
