import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { ThemeColors } from '../types/theme';

interface SubjectAutocompleteModalProps {
  visible: boolean;
  onClose: () => void;
  subjects: string[];
  onSelect: (subject: string) => void;
  title: string;
}

export default function SubjectAutocompleteModal({
  visible,
  onClose,
  subjects,
  onSelect,
  title,
}: SubjectAutocompleteModalProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const filteredSubjects = useMemo(() => {
    if (!query) return subjects;
    const lowerQuery = query.toLowerCase();
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(lowerQuery);
    
    return subjects.filter(s => normalize(s).includes(normalizedQuery));
  }, [query, subjects]);

  const handleSelect = (item: string) => {
    onSelect(item);
    setQuery('');
    onClose();
  };

  const handleSubmit = () => {
    if (query.trim()) {
      onSelect(query.trim());
      setQuery('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Tape le nom de la matière..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              onSubmitEditing={handleSubmit}
            />
          </View>

          <FlatList
            data={filteredSubjects}
            keyExtractor={(item, index) => item + index}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length > 0 ? (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={handleSubmit}
                >
                  <Text style={styles.optionText}>Créer "{query}"</Text>
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '80%',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  textInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 8,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
});
