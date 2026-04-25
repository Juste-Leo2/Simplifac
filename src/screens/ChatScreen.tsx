import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../utils/UserContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile } = useUser();
  const [inputText, setInputText] = useState('');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Assistant Simplifac</Text>
          <Text style={styles.headerSubtitle}>Problème sans catégorie</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* ZONE DE DISCUSSION */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>Aujourd'hui</Text>
        </View>

        {/* Message IA (Bulle Gauche) */}
        <View style={styles.messageRowLeft}>
          <View style={styles.avatarAIContainer}>
            <Text style={styles.avatarAIText}>✨</Text>
          </View>
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.textAI}>
              {profile.firstName ? `Bonjour ${profile.firstName} ! 👋` : 'Bonjour ! 👋'}{"\n"}
              Je suis là pour t'aider à débloquer ta situation administrative. Peux-tu me décrire ton problème en quelques mots ?
            </Text>
          </View>
        </View>

        {/* Message Utilisateur (Bulle Droite) */}
        <View style={styles.messageRowRight}>
          <View style={[styles.bubble, styles.bubbleUser]}>
            <Text style={styles.textUser}>
              Salut, je n'ai toujours pas reçu la notification pour ma bourse du CROUS.
            </Text>
          </View>
        </View>

        {/* Message IA (Bulle Gauche) */}
        <View style={styles.messageRowLeft}>
          <View style={styles.avatarAIContainer}>
            <Text style={styles.avatarAIText}>✨</Text>
          </View>
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.textAI}>
              D'accord, je peux t'aider à rédiger un email pour les relancer. Avant de faire ça, as-tu ton numéro de dossier (INE) sous la main ?
            </Text>
          </View>
        </View>
        
        {/* Simule l'espace en bas de la conversation */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ZONE DE TEXTE (Champ de saisie) */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.8}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          placeholder="Rédige ton message..."
          placeholderTextColor="#6B7280"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity 
          style={[
            styles.sendButton,
            inputText.trim().length > 0 ? styles.sendButtonActive : styles.sendButtonInactive
          ]} 
          activeOpacity={0.8}
          onPress={() => setInputText('')}
        >
          <Text style={styles.sendIcon}>↗</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0F172A',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E38',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E38',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  dateBadge: {
    alignSelf: 'center',
    backgroundColor: '#1E1E38',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    maxWidth: '85%',
  },
  messageRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    width: '100%',
  },
  avatarAIContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarAIText: {
    fontSize: 14,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleAI: {
    backgroundColor: '#1E1E38',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#9333EA',
    borderBottomRightRadius: 4,
    maxWidth: '80%',
  },
  textAI: {
    color: '#F3F4F6',
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1E1E38',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#F3F4F6',
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonInactive: {
    backgroundColor: '#1E1E38',
  },
  sendButtonActive: {
    backgroundColor: '#9333EA',
  },
  sendIcon: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
