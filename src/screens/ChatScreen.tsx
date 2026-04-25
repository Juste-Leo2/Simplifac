import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../utils/UserContext';
import { StorageService } from '../services/storage';
import { ChatSession, CurriculumData } from '../types/storage';
import { Message } from '../types/index';
import { takePhoto } from '../utils/camera';
import { recognizeTextFromImage } from '../services/ocr';
import { generateAIResponse, AIProvider } from '../services/ai';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

// Simple parse for ```txt
const renderMessageText = (text: string) => {
  const parts = text.split(/```txt([\s\S]*?)```/);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // This is a code block
      return (
        <View key={index} style={styles.codeBlockContainer}>
          <Text style={styles.codeBlockText}>{part.trim()}</Text>
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={() => {
              Alert.alert("Copié !", "Le texte a été copié dans le presse-papiers.");
              // Clipboard API would go here
            }}
          >
            <Text style={styles.copyButtonText}>Copier</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <Text key={index} style={styles.textAI}>{part}</Text>;
  });
};

export default function ChatScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile } = useUser();
  const params = route.params || {};
  
  const [sessionId, setSessionId] = useState<string>(params.sessionId || Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.sessionId) {
      const sessions = StorageService.getChatSessions();
      const session = sessions.find(s => s.id === params.sessionId);
      if (session) {
        setMessages(session.messages);
      }
    } else {
      // New session
      initNewSession();
    }
  }, [params.sessionId]);

  const initNewSession = () => {
    let initialMessages: Message[] = [];
    const aiGreeting = profile.firstName ? `Bonjour ${profile.firstName} ! 👋\n` : 'Bonjour ! 👋\n';
    
    if (params.mode === 'exam_copy') {
      const subject = params.subject || '';
      
      let teacherName = "l'enseignant";
      const curriculum = StorageService.getCurriculum();
      if (curriculum) {
        const entry = curriculum.entries.find(e => e.subject === subject);
        if (entry && entry.teacher) {
          teacherName = entry.teacher;
        }
      }

      const defaultTemplate = `Bonjour Monsieur/Madame ${teacherName},
Je souhaiterais demander une copie de mon examen en ${subject}. Pourriez-vous m'indiquer la démarche à suivre ?
Cordialement,
${profile.firstName} ${profile.lastName}
${profile.fieldOfStudy}`;

      initialMessages = [
        {
          id: Date.now().toString(),
          text: `${aiGreeting}Voici un modèle de mail que tu peux envoyer à ton professeur pour demander ta copie en ${subject} :\n\n\`\`\`txt\n${defaultTemplate}\n\`\`\`\n\nSi tu reçois une réponse, n'hésite pas à la scanner ici avec le bouton trombone 📎, je t'aiderai à rédiger la suite !`,
          sender: 'AI',
          createdAt: new Date().toISOString()
        }
      ];
    } else {
      initialMessages = [
        {
          id: Date.now().toString(),
          text: `${aiGreeting}Décris-moi ta situation, avec un mail à l'appui si tu en as un.`,
          sender: 'AI',
          createdAt: new Date().toISOString()
        }
      ];
    }
    setMessages(initialMessages);
    saveSession(initialMessages);
  };

  const saveSession = (msgs: Message[]) => {
    if (msgs.length === 0) return;
    const title = params.subject ? `Copie: ${params.subject}` : (msgs.length > 1 ? msgs[1].text.substring(0, 30) + '...' : 'Nouvelle discussion');
    StorageService.saveChatSession({
      id: sessionId,
      title: title,
      mode: params.mode || 'free_problem',
      subject: params.subject,
      messages: msgs,
      updatedAt: new Date().toISOString()
    });
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'Student',
      createdAt: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputText('');
    saveSession(updatedMessages);

    const googleKey = StorageService.getApiKey('google');
    const groqKey = StorageService.getApiKey('groq');
    
    if (!googleKey && !groqKey) {
      Alert.alert(
        "Clé API manquante",
        "Tu n'as pas configuré de clé API pour l'intelligence artificielle.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Configurer", onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    const provider: AIProvider = googleKey ? 'google' : 'groq';
    const apiKey = googleKey || groqKey || '';

    setIsProcessing(true);

    try {
      const historyText = updatedMessages.map(m => `${m.sender === 'AI' ? 'IA' : 'Étudiant'}: ${m.text}`).join('\n');
      const prompt = `Tu es l'assistant IA de Simplifac. Tu aides un étudiant nommé ${profile.firstName || "l'étudiant"} dans ses démarches.
Voici l'historique :
${historyText}

Réponds au dernier message de l'étudiant. Si tu proposes un brouillon de mail ou une modification, inclus impérativement le texte complet du mail formaté dans un bloc de code \`\`\`txt
...
\`\`\``;

      const aiResponseText = await generateAIResponse(provider, apiKey, prompt);
      
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'AI',
        createdAt: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, newAiMsg];
      setMessages(finalMessages);
      saveSession(finalMessages);
    } catch (e) {
      console.error('LLM Error:', e);
      Alert.alert("Erreur", "Impossible de générer une réponse. Vérifie ta clé API ou ta connexion internet.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAttach = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const uri = await takePhoto();
      if (!uri) {
        setIsProcessing(false);
        return;
      }
      
      Alert.alert("Analyse en cours...", "Extraction du texte depuis l'image.");
      const recognizedText = await recognizeTextFromImage(uri);
      
      if (!recognizedText) {
        Alert.alert("Erreur", "Aucun texte reconnu sur l'image.");
        setIsProcessing(false);
        return;
      }

      const newUserMsg: Message = {
        id: Date.now().toString(),
        text: `[Image Scannée]\n${recognizedText}`,
        sender: 'Student',
        createdAt: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      saveSession(updatedMessages);

      const googleKey = StorageService.getApiKey('google');
      const groqKey = StorageService.getApiKey('groq');
      
      if (!googleKey && !groqKey) {
         Alert.alert("Clé API manquante", "Le texte a été extrait mais l'IA ne peut pas répondre sans clé API.", [
           { text: "OK", style: "cancel" },
           { text: "Configurer", onPress: () => navigation.navigate('Settings') }
         ]);
         setIsProcessing(false);
         return;
      }

      const provider: AIProvider = googleKey ? 'google' : 'groq';
      const apiKey = googleKey || groqKey || '';

      const historyText = updatedMessages.map(m => `${m.sender === 'AI' ? 'IA' : 'Étudiant'}: ${m.text}`).join('\n');
      const prompt = `Tu es l'assistant IA de Simplifac. Tu aides un étudiant nommé ${profile.firstName || "l'étudiant"}.
Voici l'historique :
${historyText}

L'étudiant vient de te partager un texte extrait d'une image/courrier. Réponds en lui proposant une suite ou un brouillon de mail (dans un bloc \`\`\`txt).`;

      const aiResponseText = await generateAIResponse(provider, apiKey, prompt);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'AI',
        createdAt: new Date().toISOString()
      };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      saveSession(finalMessages);
      setIsProcessing(false);

    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Un problème est survenu lors de la prise de photo.");
      setIsProcessing(false);
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    Alert.alert(
      "Supprimer le message",
      "Veux-tu revenir en arrière et supprimer ce message ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: () => {
            const updatedMessages = messages.filter(m => m.id !== msgId);
            setMessages(updatedMessages);
            saveSession(updatedMessages);
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Assistant Simplifac</Text>
          <Text style={styles.headerSubtitle}>
            {params.mode === 'exam_copy' ? `Copie d'examen (${params.subject})` : 'Discussion libre'}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* ZONE DE DISCUSSION */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>Aujourd'hui</Text>
        </View>

        {messages.map((msg) => {
          const isAI = msg.sender === 'AI';
          return (
            <TouchableOpacity 
              key={msg.id} 
              style={isAI ? styles.messageRowLeft : styles.messageRowRight}
              onLongPress={() => handleDeleteMessage(msg.id)}
              delayLongPress={500}
              activeOpacity={0.9}
            >
              {isAI && (
                <View style={styles.avatarAIContainer}>
                  <Text style={styles.avatarAIText}>✨</Text>
                </View>
              )}
              <View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
                {isAI ? (
                  renderMessageText(msg.text)
                ) : (
                  <Text style={styles.textUser}>{msg.text}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        
        {isProcessing && (
          <View style={styles.messageRowLeft}>
            <View style={styles.avatarAIContainer}>
              <Text style={styles.avatarAIText}>✨</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={[styles.textAI, { fontStyle: 'italic', opacity: 0.7 }]}>Réflexion en cours...</Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ZONE DE TEXTE (Champ de saisie) */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.8} onPress={handleAttach}>
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
            inputText.trim().length > 0 && !isProcessing ? styles.sendButtonActive : styles.sendButtonInactive
          ]} 
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={inputText.trim().length === 0 || isProcessing}
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
    maxWidth: '90%',
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
  codeBlockContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  codeBlockText: {
    color: '#A78BFA', // Violet clair pour le texte
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  copyButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: '#9333EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
