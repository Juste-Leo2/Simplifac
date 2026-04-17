import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../utils/ThemeContext';
import { ThemeColors } from '../types/theme';
import { takePhoto } from '../utils/camera';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const FAB_SPACING = 130;

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const handleAction = async (actionName: string) => {
    if (actionName === 'scanner_document') {
      const uri = await takePhoto();
      if (uri) {
        // La photo a été confirmée nativement par la caméra du téléphone (pas besoin de double validation)
        console.log('Photo capturée et validée nativement:', uri);
        // FIXME: Ajouter l'action à faire après validation (redirection, envoi, etc.)
      }
      return;
    }
    // Action temporaire pour l'interaction
    console.log('Action pressée:', actionName);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* EN-TÊTE (Header) */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>L</Text>
          </TouchableOpacity>
          <Text style={styles.greetingText}>Bonjour Léonard 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIONS RAPIDES */}
        <Text style={styles.sectionTitle}>Situations fréquentes</Text>

        <View style={styles.gridContainer}>
          {/* Tuile 1 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleAction('copie_examen')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>📄</Text>
            </View>
            <Text style={styles.cardText}>Demander une copie d'examen</Text>
          </TouchableOpacity>

          {/* Tuile 2 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleAction('probleme_crous')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>🏛️</Text>
            </View>
            <Text style={styles.cardText}>Problème CROUS / Bourses</Text>
          </TouchableOpacity>

          {/* Tuile 3 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleAction('recours_master')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>🎓</Text>
            </View>
            <Text style={styles.cardText}>Recours Master / Inscription</Text>
          </TouchableOpacity>

          {/* Tuile 4 */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleAction('decrypter_courrier')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>📬</Text>
            </View>
            <Text style={styles.cardText}>Décrypter un courrier</Text>
          </TouchableOpacity>
        </View>

        {/* BOUTON LANCER UNE DISCUSSION LIBRE */}
        <TouchableOpacity
          style={styles.chatShortcutButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Chat')}
        >
          <View style={styles.chatShortcutContent}>
            <Text style={styles.chatShortcutIcon}>💬</Text>
            <View>
              <Text style={styles.chatShortcutTitle}>Lancer une discussion</Text>
              <Text style={styles.chatShortcutSubtitle}>Tu ne trouves pas ton problème ? Explique-le en direct.</Text>
            </View>
          </View>
          <Text style={styles.chatShortcutArrow}>→</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ACTION PRINCIPALE (Bouton d'action flottant / FAB) */}
      <View style={[styles.fabContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={styles.mainActionButton}
          activeOpacity={0.9}
          onPress={() => handleAction('scanner_document')}
        >
          <Text style={styles.mainActionIcon}>📸✨</Text>
          <Text style={styles.mainActionText}>Scanner un document ou mail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Bleu ardoise profond
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Toujours très arrondi
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  greetingText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: FAB_SPACING, // Laisse de la place pour que la dernière ligne ne soit pas cachée par le FAB
  },
  sectionTitle: {
    color: colors.textSecondary, // Gris clair
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47.5%', // Permet un petit espace entre les deux cartes (gap de ~5%)
    backgroundColor: colors.surface, // Gris-violet très sombre
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    // Ombre douce
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16, // Moins que 24 mais reste très rond
    backgroundColor: colors.surfaceHighlight, // Violet (#9333EA) avec 15% d'opacité
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  chatShortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
  },
  chatShortcutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  chatShortcutIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  chatShortcutTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  chatShortcutSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chatShortcutArrow: {
    color: colors.iconSecondary,
    fontSize: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    // Ajoute un feedback visuel qui fond vers le bas (mimic glassmorphism) 
    // ou utilise juste un fond transparent. On s'assure qu'on voit qu'il flotte.
  },
  mainActionButton: {
    backgroundColor: colors.primary, // Améthyste
    borderRadius: 30, // Très arrondi
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    // Ombre dynamique pour l'effet "WOW"
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  mainActionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  mainActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
