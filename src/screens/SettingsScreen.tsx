import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/storage';
import { useTheme } from '../utils/ThemeContext';
import { ThemeType } from '../types/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

// Configuration du segmented control
const THEME_OPTIONS: { key: ThemeType; emoji: string; label: string }[] = [
  { key: 'light', emoji: '☀️', label: 'Mode Clair' },
  { key: 'dark', emoji: '🌙', label: 'Mode Sombre' },
  { key: 'colorblind', emoji: '👁️', label: 'Mode Daltonien' },
];

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { themeType, setThemeType, colors, isDark } = useTheme();

  // État local pour le compteur de clés API
  const [configuredKeyCount, setConfiguredKeyCount] = React.useState(0);

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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Paramètres</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION : IA & MOTEUR */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Moteur IA</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <TouchableOpacity
            style={styles.buttonRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ApiKeys')}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🔑</Text>
              <View>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Clés API (Google / Groq)</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                  {configuredKeyCount > 0
                    ? `${configuredKeyCount} clé${configuredKeyCount > 1 ? 's' : ''} configurée${configuredKeyCount > 1 ? 's' : ''}`
                    : 'Non configurée'}
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: colors.iconSecondary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION : PRÉFÉRENCES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Préférences</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          {/* Langue */}
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🌍</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Langue de l'interface</Text>
            </View>
            <Text style={[styles.rowActionText, { color: colors.primary }]}>Français</Text>
          </TouchableOpacity>
          <View style={[styles.separator, { backgroundColor: colors.divider }]} />

          {/* Thème — Segmented Control */}
          <View style={styles.themeSection}>
            <View style={[styles.segmentedControl, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              {THEME_OPTIONS.map((option) => {
                const isActive = themeType === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.segmentOption,
                      isActive && [styles.segmentOptionActive, { backgroundColor: colors.primary }],
                    ]}
                    onPress={() => setThemeType(option.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.segmentEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: isActive ? (themeType === 'colorblind' ? '#000000' : '#FFFFFF') : colors.textSecondary },
                        isActive && styles.segmentLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION : COMMUNAUTÉ & OPEN SOURCE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Communauté</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🤝</Text>
              <View>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Contribuer à Simplifac</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Partager ses données (Anonymisé)</Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: colors.iconSecondary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION : DIVERS */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Autres</Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <TouchableOpacity style={styles.buttonRow} activeOpacity={0.7} onPress={() => { /* TODO: Implement data deletion with confirmation */ }}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🗑️</Text>
              <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Effacer toutes mes données</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.appVersion, { color: colors.iconSecondary }]}>Simplifac v0.0.1 (Alpha)</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  cardGroup: {
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden', // Pour garder les coins arrondis avec les boutons dedans
    // Ombre 
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
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rowActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
  },

  // — Segmented Control —
  themeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  segmentOptionActive: {
    // Ombre subtile pour le segment actif
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  segmentEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentLabelActive: {
    fontWeight: '700',
  },

  appVersion: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontSize: 13,
  },
});
