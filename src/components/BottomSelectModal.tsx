import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { ThemeColors } from '../types/theme';

interface BottomSelectModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (option: string) => void;
  title: string;
}

export default function BottomSelectModal({
  visible,
  onClose,
  options,
  onSelect,
  title,
}: BottomSelectModalProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.optionItem}
      accessibilityRole="button"
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <Text style={styles.optionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    position: 'absolute',
    bottom: 0,
    width: '100%',
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
