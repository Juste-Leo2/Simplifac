import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../utils/ThemeContext';
import { ThemeColors } from '../types/theme';
import { CurriculumEntry } from '../types/storage';
import { StorageService, initSecureStorage } from '../services/storage';
import { parseCurriculumText } from '../services/ai';
import { recognizeTextFromImage } from '../services/ocr';
import { takePhoto } from '../utils/camera';
import { pickAndReadPdf } from '../utils/pdf';

import BottomSelectModal from '../components/BottomSelectModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Curriculum'>;

const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];

const createEmptyEntry = (): CurriculumEntry => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  semester: 'S1',
  ue: '',
  subject: '',
  teacher: '',
  coefficient: '1',
  ects: '0',
});

// --- Memoized Card Component ---
const CurriculumEntryCard = React.memo(({
  entry,
  index,
  onUpdate,
  onRemove,
  onOpenSemester,
  styles
}: {
  entry: CurriculumEntry;
  index: number;
  onUpdate: (id: string, field: keyof CurriculumEntry, value: string | number) => void;
  onRemove: (id: string) => void;
  onOpenSemester: (id: string) => void;
  styles: any;
}) => (
  <View style={styles.entryCard}>
    <View style={styles.entryHeader}>
      <Text style={styles.entryNumber}>#{index + 1}</Text>
      <TouchableOpacity
        onPress={() => onRemove(entry.id)}
        style={styles.deleteBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.entryRow}>
      <View style={styles.fieldSmall}>
        <Text style={styles.fieldLabel}>Semestre</Text>
        <TouchableOpacity
          style={styles.semesterBtn}
          onPress={() => onOpenSemester(entry.id)}
        >
          <Text style={styles.semesterText}>{entry.semester}</Text>
          <Text style={styles.chevronSmall}>▼</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.fieldLarge}>
        <Text style={styles.fieldLabel}>UE</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Ex: UE1 Fondamentaux"
          placeholderTextColor="#6B7280"
          value={entry.ue}
          onChangeText={v => onUpdate(entry.id, 'ue', v)}
        />
      </View>
    </View>

    <View style={styles.entryRowSingle}>
      <Text style={styles.fieldLabel}>Matière</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder="Ex: Mathématiques"
        placeholderTextColor="#6B7280"
        value={entry.subject}
        onChangeText={v => onUpdate(entry.id, 'subject', v)}
      />
    </View>

    <View style={styles.entryRowSingle}>
      <Text style={styles.fieldLabel}>Enseignant</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder="Ex: M. Dupont"
        placeholderTextColor="#6B7280"
        value={entry.teacher}
        onChangeText={v => onUpdate(entry.id, 'teacher', v)}
      />
    </View>

    <View style={styles.entryRow}>
      <View style={styles.fieldSmall}>
        <Text style={styles.fieldLabel}>Coef.</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="1"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
          value={entry.coefficient.toString()}
          onChangeText={v => onUpdate(entry.id, 'coefficient', v)}
        />
      </View>
      <View style={styles.fieldSmall}>
        <Text style={styles.fieldLabel}>ECTS</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="0"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
          value={entry.ects.toString()}
          onChangeText={v => onUpdate(entry.id, 'ects', v)}
        />
      </View>
    </View>
  </View>
));

export default function CurriculumScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [entries, setEntries] = React.useState<CurriculumEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showScanChoice, setShowScanChoice] = React.useState(false);

  // Semester modal state
  const [semesterModalVisible, setSemesterModalVisible] = React.useState(false);
  const [semesterEditingId, setSemesterEditingId] = React.useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  // Charger les données au montage
  React.useEffect(() => {
    const loadData = async () => {
      try {
        await initSecureStorage();
        const saved = StorageService.getCurriculum();
        if (saved && saved.entries.length > 0) {
          setEntries(saved.entries);
        }
        hasInitialized.current = true;
      } catch (error) {
        console.error('Failed to load curriculum:', error);
      }
    };
    loadData();
  }, []);

  // Sauvegarder avec un léger délai (debounce) pour éviter les lags lors de la saisie
  React.useEffect(() => {
    if (hasInitialized.current) {
      const timeout = setTimeout(() => {
        StorageService.saveCurriculum({
          entries,
          lastUpdated: new Date().toISOString(),
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [entries]);

  const updateEntry = React.useCallback((id: string, field: keyof CurriculumEntry, value: string | number) => {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, [field]: value } : e)),
    );
  }, []);

  const removeEntry = React.useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const addEntry = React.useCallback(() => {
    setEntries(prev => [...prev, createEmptyEntry()]);
  }, []);

  // --- Scan logic ---
  const handleScanPdf = async () => {
    setShowScanChoice(false);
    setLoading(true);
    console.log('[SCAN-PDF] Début du scan PDF...');
    try {
      const base64 = await pickAndReadPdf();
      console.log('[SCAN-PDF] Résultat pickAndReadPdf:', base64 ? `${base64.length} chars base64` : 'null (annulé)');
      if (!base64) {
        setLoading(false);
        return;
      }
      await processWithAI(base64, 'pdf');
    } catch (error) {
      console.error('[SCAN-PDF] Erreur:', error);
      Alert.alert('Erreur', "Impossible de lire le PDF.");
      setLoading(false);
    }
  };

  const handleScanPhoto = async () => {
    setShowScanChoice(false);
    setLoading(true);
    console.log('[SCAN-PHOTO] Début du scan photo...');
    try {
      const uri = await takePhoto();
      console.log('[SCAN-PHOTO] URI photo:', uri || 'null (annulé)');
      if (!uri) {
        setLoading(false);
        return;
      }
      console.log('[SCAN-PHOTO] Lancement OCR...');
      const text = await recognizeTextFromImage(uri);
      console.log('[SCAN-PHOTO] Résultat OCR:', text ? `${text.length} chars` : 'null (échec)');
      if (!text) {
        Alert.alert('Erreur', "Aucun texte détecté dans l'image.");
        setLoading(false);
        return;
      }
      await processWithAI(text);
    } catch (error) {
      console.error('[SCAN-PHOTO] Erreur:', error);
      Alert.alert('Erreur', "Impossible de scanner la photo.");
      setLoading(false);
    }
  };

  const processWithAI = async (rawText: string, source: 'text' | 'pdf' = 'text') => {
    console.log('[PROCESS-AI] Début du traitement IA, source:', source, ', taille:', rawText.length);
    try {
      const googleKey = StorageService.getApiKey('google');
      const groqKey = StorageService.getApiKey('groq');

      const provider = googleKey ? 'google' : groqKey ? 'groq' : null;
      const apiKey = googleKey || groqKey;
      console.log('[PROCESS-AI] Provider:', provider, '| Clé trouvée:', !!apiKey);

      if (!provider || !apiKey) {
        Alert.alert(
          'Clé API requise',
          "Configure une clé API (Google ou Groq) dans les paramètres pour utiliser le scan IA.",
        );
        setLoading(false);
        return;
      }

      console.log('[PROCESS-AI] Appel parseCurriculumText (source:', source, ')...');
      const parsed = await parseCurriculumText(provider, apiKey, rawText, source);
      console.log('[PROCESS-AI] Résultat IA:', JSON.stringify(parsed).substring(0, 500));

      if (parsed.length === 0) {
        Alert.alert('Résultat', "Aucune matière n'a pu être extraite du document.");
        setLoading(false);
        return;
      }

      const newEntries: CurriculumEntry[] = parsed.map((p, i) => ({
        id: Date.now().toString() + i.toString(),
        semester: p.semester || 'S1',
        ue: p.ue || '',
        subject: p.subject || '',
        teacher: p.teacher || '',
        coefficient: (p.coefficient ?? 1).toString(),
        ects: (p.ects ?? 0).toString(),
      }));

      console.log('[PROCESS-AI] Succès:', newEntries.length, 'matière(s) extraite(s)');

      Alert.alert(
        'Maquette analysée',
        `${newEntries.length} matière(s) extraite(s). Elles seront ajoutées à ton tableau.`,
        [
          {
            text: 'Remplacer',
            style: 'destructive',
            onPress: () => setEntries(newEntries),
          },
          {
            text: 'Ajouter',
            onPress: () => setEntries(prev => [...prev, ...newEntries]),
          },
        ],
      );
    } catch (error) {
      console.error('[PROCESS-AI] Erreur:', error);
      Alert.alert('Erreur', "L'analyse IA a échoué. Vérifie ta clé API.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma filière</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <CurriculumEntryCard
            entry={item}
            index={index}
            styles={styles}
            onUpdate={updateEntry}
            onRemove={removeEntry}
            onOpenSemester={(id) => {
              setSemesterEditingId(id);
              setSemesterModalVisible(true);
            }}
          />
        )}
        ListHeaderComponent={
          <>
            {/* Bannière info */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>📋</Text>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Tes matières & enseignants</Text>
                <Text style={styles.infoText}>
                  Remplis le tableau manuellement ou scanne ta maquette pour pré-remplir automatiquement.
                </Text>
              </View>
            </View>

            {/* Bouton Scanner */}
            <TouchableOpacity
              style={styles.scanButton}
              activeOpacity={0.8}
              onPress={() => setShowScanChoice(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} style={styles.scanIconLoader} />
              ) : (
                <Text style={styles.scanButtonIcon}>📄</Text>
              )}
              <View style={styles.scanButtonTextContainer}>
                <Text style={styles.scanButtonTitle}>
                  {loading ? 'Analyse en cours...' : 'Scanner ta maquette'}
                </Text>
                <Text style={styles.scanButtonSubtitle}>PDF ou photo de ta maquette / MCC</Text>
              </View>
            </TouchableOpacity>

            {/* Titre de section */}
            {entries.length > 0 && (
              <Text style={styles.sectionTitle}>
                Matières ({entries.length})
              </Text>
            )}
          </>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addButton} onPress={addEntry} activeOpacity={0.8}>
            <Text style={styles.addButtonIcon}>＋</Text>
            <Text style={styles.addButtonText}>Ajouter une matière</Text>
          </TouchableOpacity>
        }
      />

      {/* Modal choix de scan */}
      <BottomSelectModal
        visible={showScanChoice}
        onClose={() => setShowScanChoice(false)}
        title="Scanner ta maquette"
        options={['📄  Importer un PDF', '📷  Prendre une photo']}
        onSelect={(option) => {
          if (option.includes('PDF')) {
            handleScanPdf();
          } else {
            handleScanPhoto();
          }
        }}
      />

      {/* Modal choix semestre */}
      <BottomSelectModal
        visible={semesterModalVisible}
        onClose={() => setSemesterModalVisible(false)}
        title="Semestre"
        options={SEMESTERS}
        onSelect={(semester) => {
          if (semesterEditingId) {
            updateEntry(semesterEditingId, 'semester', semester);
          }
          setSemesterEditingId(null);
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: colors.text,
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
  // --- Info Banner ---
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  // --- Scan Button ---
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  scanButtonIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  scanIconLoader: {
    marginRight: 16,
    width: 28,
  },
  scanButtonTextContainer: {
    flex: 1,
  },
  scanButtonTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  // --- Section ---
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  // --- Entry Card ---
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryNumber: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  entryRowSingle: {
    marginBottom: 10,
  },
  fieldSmall: {
    flex: 1,
  },
  fieldLarge: {
    flex: 2,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldInput: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  semesterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  semesterText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  chevronSmall: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  // --- Add Button ---
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonIcon: {
    fontSize: 20,
    color: colors.text,
    marginRight: 8,
    fontWeight: '300',
  },
  addButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
