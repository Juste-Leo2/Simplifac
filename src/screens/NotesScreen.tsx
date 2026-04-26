import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../utils/ThemeContext';
import { ThemeColors } from '../types/theme';
import { StorageService, initSecureStorage } from '../services/storage';
import SubjectAutocompleteModal from '../components/SubjectAutocompleteModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

export default function NotesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await initSecureStorage();
      const data = StorageService.getCurriculum();
      if (data) {
        const subjList = data.entries?.map(e => e.subject).filter(Boolean) || [];
        setSubjects(subjList);
        if (subjList.length > 0) {
          handleSelectSubject(subjList[0]);
        }
      }
    };
    loadData();

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleSelectSubject = (subject: string) => {
    setSelectedSubject(subject);
    const allNotes = StorageService.getNotes();
    const existingNote = allNotes[subject];
    setNoteContent(existingNote ? existingNote.content : '');
  };

  const handleNoteChange = (text: string) => {
    setNoteContent(text);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (selectedSubject) {
        StorageService.saveNote({
          subjectId: selectedSubject,
          content: text,
          lastUpdated: new Date().toISOString()
        });
      }
    }, 500); // Save after 500ms of inactivity
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={styles.headerTitle}>Notes de cours</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* SUBJECT SELECTOR */}
        <View style={styles.subjectSelectorContainer}>
          <Text style={styles.label}>Matière</Text>
          <TouchableOpacity 
            style={styles.subjectSelector} 
            activeOpacity={0.8}
            onPress={() => setShowSubjectModal(true)}
          >
            <Text style={[styles.subjectText, !selectedSubject && { color: colors.textSecondary }]}>
              {selectedSubject || 'Sélectionner une matière...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* EDITOR */}
        <View style={styles.editorContainer}>
          {selectedSubject ? (
            <TextInput
              style={styles.textInput}
              placeholder={`Écris tes notes pour ${selectedSubject} ici...`}
              placeholderTextColor={colors.textSecondary}
              value={noteContent}
              onChangeText={handleNoteChange}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📝</Text>
              <Text style={styles.emptyStateText}>Sélectionne une matière pour commencer à prendre des notes.</Text>
            </View>
          )}
        </View>
      </View>

      <SubjectAutocompleteModal
        visible={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="Choisis une matière"
        subjects={subjects}
        onSelect={handleSelectSubject}
      />
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  subjectSelectorContainer: {
    marginBottom: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    padding: 20,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
