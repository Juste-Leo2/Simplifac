import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { ThemeColors } from '../types/theme';
import { takePhoto } from '../utils/camera';
import { recognizeTextFromImage } from '../services/ocr';
import { StorageService } from '../services/storage';
import { CurriculumData, ChatSession } from '../types/storage';
import SubjectAutocompleteModal from '../components/SubjectAutocompleteModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const FAB_SPACING = 130;

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile } = useUser();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const isProcessingRef = useRef(false);

  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showExamModal, setShowExamModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCurriculum(StorageService.getCurriculum());
      setChatSessions(StorageService.getChatSessions());
    }, [])
  );

  const handleAction = async (actionName: string) => {
    if (isProcessingRef.current) return;

    if (actionName === 'copie_examen') {
      setShowExamModal(true);
      return;
    }

    // Action temporaire pour l'interaction
    console.log('Action pressée:', actionName);
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      "Supprimer la discussion",
      "Veux-tu supprimer cette discussion de l'historique ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: () => {
            StorageService.deleteChatSession(sessionId);
            setChatSessions(StorageService.getChatSessions());
          }
        }
      ]
    );
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
            <Text style={styles.avatarText}>
              {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.greetingText}>
            {profile.firstName ? `Bonjour ${profile.firstName} 👋` : 'Bonjour 👋'}
          </Text>
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

          {/* Tuile Notes */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Notes')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>📝</Text>
            </View>
            <Text style={styles.cardText}>Mes notes de cours</Text>
          </TouchableOpacity>
        </View>

        {/* Historique des discussions */}
        {chatSessions.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Discussions récentes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {chatSessions.map((session) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={styles.historyCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Chat', { sessionId: session.id } as any)}
                >
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCardTitle} numberOfLines={2}>{session.title}</Text>
                    <TouchableOpacity 
                      onPress={() => handleDeleteSession(session.id)}
                      style={styles.historyCardMenuBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.historyCardMenuIcon}>⋮</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.historyCardDate}>
                    {new Date(session.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BOUTON LANCER UNE DISCUSSION LIBRE */}
        <TouchableOpacity
          style={styles.chatShortcutButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Chat', { mode: 'free_problem' } as any)}
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

      <SubjectAutocompleteModal
        visible={showExamModal}
        onClose={() => setShowExamModal(false)}
        title="Sélectionne la matière"
        subjects={curriculum?.entries.map(e => e.subject).filter(Boolean) || []}
        onSelect={(subject) => {
          navigation.navigate('Chat', { mode: 'exam_copy', subject } as any);
        }}
      />
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
  historyContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  historyScroll: {
    paddingRight: 24, // Pour ne pas coller au bord droit
    gap: 16,
  },
  historyCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 20,
    padding: 16,
    width: 160,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    flex: 1,
    paddingRight: 8,
  },
  historyCardMenuBtn: {
    padding: 2,
  },
  historyCardMenuIcon: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCardDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
