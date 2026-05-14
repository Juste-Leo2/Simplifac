import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, StatusBar, Alert, Keyboard, Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUser } from '../utils/UserContext';
import { StorageService } from '../services/storage';
import { MailEntry, MailThread } from '../types/storage';
import { takePhoto } from '../utils/camera';
import { recognizeTextFromImage } from '../services/ocr';
import { parseMailFromOCR, generateMailDraft, AIProvider } from '../services/ai';

type Props = NativeStackScreenProps<RootStackParamList, 'MailThread'>;

export default function MailThreadScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile } = useUser();
  const params = route.params || {};

  const [sessionId] = useState<string>(params.sessionId || Date.now().toString());
  const [thread, setThread] = useState<MailThread>({ discussion: '', mails: [] });
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Confirmation modal state for OCR-parsed mail
  const [pendingMail, setPendingMail] = useState<Omit<MailEntry, 'id' | 'type' | 'confirmedByUser'> | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editContent, setEditContent] = useState('');

  // Draft editing state
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingDraftContent, setEditingDraftContent] = useState('');

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (thread.mails.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [thread.mails.length]);

  useEffect(() => {
    if (params.sessionId) {
      const sessions = StorageService.getChatSessions();
      const session = sessions.find(s => s.id === params.sessionId);
      if (session?.mailThread) {
        setThread(session.mailThread);
      }
    }
  }, [params.sessionId]);

  const getAIConfig = (): { provider: AIProvider; apiKey: string } | null => {
    const googleKey = StorageService.getApiKey('google');
    const groqKey = StorageService.getApiKey('groq');
    if (!googleKey && !groqKey) {
      Alert.alert("Clé API manquante", "Configure ta clé API dans les paramètres.", [
        { text: "Annuler", style: "cancel" },
        { text: "Configurer", onPress: () => navigation.navigate('Settings') },
      ]);
      return null;
    }
    return { provider: googleKey ? 'google' : 'groq', apiKey: (googleKey || groqKey)! };
  };

  const saveThread = (t: MailThread) => {
    const title = t.discussion || 'Nouveau fil de mails';
    StorageService.saveChatSession({
      id: sessionId,
      title,
      mode: 'mail_thread',
      messages: [],
      mailThread: t,
      updatedAt: new Date().toISOString(),
    });
  };

  const nextMailId = () => (thread.mails.length > 0 ? Math.max(...thread.mails.map(m => m.id)) + 1 : 1);

  // ── Photo scan ──
  const handleScanMail = async () => {
    if (isProcessing) return;
    try {
      const uri = await takePhoto();
      if (!uri) return;

      const ai = getAIConfig();
      if (!ai) return;

      setIsProcessing(true);
      const ocrText = await recognizeTextFromImage(uri);
      if (!ocrText) {
        Alert.alert("Erreur", "Impossible de lire le texte sur la photo.");
        setIsProcessing(false);
        return;
      }

      const parsed = await parseMailFromOCR(ai.provider, ai.apiKey, ocrText);
      setEditSubject(parsed.subject || '');
      setEditFrom(parsed.from || '');
      setEditContent(parsed.content || '');
      setPendingMail(parsed);
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Problème lors du scan.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Confirm scanned mail (just save, wait for user instructions) ──
  const handleConfirmMail = () => {
    const newMail: MailEntry = {
      id: nextMailId(),
      type: 'received',
      subject: editSubject,
      from: editFrom,
      content: editContent,
      extractedAt: new Date().toISOString(),
      confirmedByUser: true,
    };

    const discussion = thread.discussion || editSubject;
    const updated: MailThread = {
      discussion,
      mails: [...thread.mails, newMail],
    };
    setThread(updated);
    saveThread(updated);
    setPendingMail(null);
  };

  // ── Send instruction (modify draft OR create from scratch) ──
  const handleSendInstruction = async () => {
    if (!inputText.trim() || isProcessing) return;
    const ai = getAIConfig();
    if (!ai) return;

    setIsProcessing(true);
    try {
      const currentThread: MailThread = thread.discussion
        ? thread
        : { ...thread, discussion: inputText.trim().substring(0, 50) };

      const draftContent = await generateMailDraft(ai.provider, ai.apiKey, currentThread, profile, inputText.trim());
      const lastDraft = [...currentThread.mails].reverse().find(m => m.type === 'draft');
      const newVersion = (lastDraft?.draftVersion || 0) + 1;

      const draftMail: MailEntry = {
        id: nextMailId(),
        type: 'draft',
        subject: lastDraft?.subject || inputText.trim().substring(0, 60),
        to: lastDraft?.to,
        content: draftContent,
        confirmedByUser: false,
        draftVersion: newVersion,
        finalizedByUser: false,
      };
      const updated: MailThread = { ...currentThread, mails: [...currentThread.mails, draftMail] };
      setThread(updated);
      saveThread(updated);
      setInputText('');
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de générer le brouillon.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Finalize draft → sent (supprime les autres brouillons) ──
  const handleFinalizeDraft = (mailId: number) => {
    const updated: MailThread = {
      ...thread,
      mails: thread.mails
        .filter(m => m.id === mailId || m.type !== 'draft')
        .map(m =>
          m.id === mailId ? { ...m, type: 'sent' as const, finalizedByUser: true, finalizedAt: new Date().toISOString() } : m
        ),
    };
    setThread(updated);
    saveThread(updated);
  };

  // ── Revert sent → draft ──
  const handleRevertToDraft = (mailId: number) => {
    const updated: MailThread = {
      ...thread,
      mails: thread.mails.map(m =>
        m.id === mailId ? { ...m, type: 'draft' as const, finalizedByUser: false, finalizedAt: undefined } : m
      ),
    };
    setThread(updated);
    saveThread(updated);
  };

  // ── Save manual draft edit ──
  const handleSaveDraftEdit = (mailId: number) => {
    const updated: MailThread = {
      ...thread,
      mails: thread.mails.map(m =>
        m.id === mailId ? { ...m, content: editingDraftContent } : m
      ),
    };
    setThread(updated);
    saveThread(updated);
    setEditingDraftId(null);
  };

  // ── Render a single mail entry ──
  const renderMailEntry = (mail: MailEntry) => {
    const isReceived = mail.type === 'received';
    const isDraft = mail.type === 'draft';
    const isSent = mail.type === 'sent';
    const isEditing = editingDraftId === mail.id;

    return (
      <View key={mail.id} style={[
        styles.mailCard,
        isReceived && styles.mailCardReceived,
        isDraft && styles.mailCardDraft,
        isSent && styles.mailCardSent,
      ]}>
        {/* Badge */}
        <View style={styles.mailBadgeRow}>
          <View style={[
            styles.mailBadge,
            isReceived && styles.badgeReceived,
            isDraft && styles.badgeDraft,
            isSent && styles.badgeSent,
          ]}>
            <Text style={styles.badgeText}>
              {isReceived ? '📩 Reçu' : isDraft ? `📝 Brouillon v${mail.draftVersion || 1}` : '✅ Validé'}
            </Text>
          </View>
          {mail.from && <Text style={styles.mailFrom}>de {mail.from}</Text>}
          {mail.to && <Text style={styles.mailFrom}>à {mail.to}</Text>}
        </View>

        {/* Subject */}
        <Text style={styles.mailSubject}>{mail.subject}</Text>

        {/* Content */}
        {isEditing ? (
          <TextInput
            style={styles.editDraftInput}
            value={editingDraftContent}
            onChangeText={setEditingDraftContent}
            multiline
            autoFocus
          />
        ) : (
          <Text style={styles.mailContent}>{mail.content}</Text>
        )}

        {/* Actions */}
        <View style={styles.mailActions}>
          {isDraft && !isEditing && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleFinalizeDraft(mail.id)}>
                <Text style={styles.actionBtnTextGreen}>✅ Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                setEditingDraftId(mail.id);
                setEditingDraftContent(mail.content);
              }}>
                <Text style={styles.actionBtnText}>✏️ Éditer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                Clipboard.setString(mail.content);
                Alert.alert("Copié !", "Le brouillon a été copié.");
              }}>
                <Text style={styles.actionBtnText}>📋 Copier</Text>
              </TouchableOpacity>
            </>
          )}
          {isDraft && isEditing && (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSave]} onPress={() => handleSaveDraftEdit(mail.id)}>
                <Text style={styles.actionBtnTextGreen}>💾 Sauvegarder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingDraftId(null)}>
                <Text style={styles.actionBtnText}>✕ Annuler</Text>
              </TouchableOpacity>
            </>
          )}
          {isSent && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                Clipboard.setString(mail.content);
                Alert.alert("Copié !", "Le mail a été copié.");
              }}>
                <Text style={styles.actionBtnText}>📋 Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRevertToDraft(mail.id)}>
                <Text style={styles.actionBtnText}>↩ Repasser en brouillon</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{thread.discussion || 'Nouveau fil de mails'}</Text>
          <Text style={styles.headerSubtitle}>
            {thread.mails.length} mail{thread.mails.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanMail} activeOpacity={0.8}>
          <Text style={styles.scanIcon}>📸</Text>
        </TouchableOpacity>
      </View>

      {/* MAIL LIST */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {thread.mails.length === 0 && !isProcessing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✉️</Text>
            <Text style={styles.emptyTitle}>Nouveau mail</Text>
            <Text style={styles.emptySubtitle}>
              Décris le mail que tu veux écrire, ou scanne un mail reçu avec 📸.
            </Text>
          </View>
        )}

        {thread.mails.map(renderMailEntry)}

        {isProcessing && (
          <View style={styles.processingCard}>
            <Text style={styles.processingText}>Traitement en cours...</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* INPUT BAR — toujours visible */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.8} onPress={handleScanMail}>
          <Text style={styles.attachIcon}>📸</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={thread.mails.length > 0 ? 'Modifier le brouillon...' : 'Décris le mail à rédiger...'}
          placeholderTextColor="#6B7280"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendButton, inputText.trim().length > 0 && !isProcessing ? styles.sendButtonActive : styles.sendButtonInactive]}
          activeOpacity={0.8}
          onPress={handleSendInstruction}
          disabled={!inputText.trim().length || isProcessing}
        >
          <Text style={styles.sendIcon}>↗</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: keyboardHeight }} />

      {/* CONFIRMATION MODAL */}
      <Modal visible={!!pendingMail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirme le mail scanné</Text>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalLabel}>Objet :</Text>
              <TextInput style={styles.modalInput} value={editSubject} onChangeText={setEditSubject} />
              <Text style={styles.modalLabel}>De :</Text>
              <TextInput style={styles.modalInput} value={editFrom} onChangeText={setEditFrom} />
              <Text style={styles.modalLabel}>Contenu :</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputLarge]}
                value={editContent}
                onChangeText={setEditContent}
                multiline
              />
              <View style={{ height: 8 }} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPendingMail(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmMail}>
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: '#0F172A',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E38',
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { color: '#F3F4F6', fontSize: 20, fontWeight: 'bold' },
  headerTitleContainer: { alignItems: 'center', flex: 1, marginHorizontal: 12 },
  headerTitle: { color: '#F3F4F6', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  scanButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#9333EA',
    justifyContent: 'center', alignItems: 'center',
  },
  scanIcon: { fontSize: 18 },
  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  // Empty
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  // Mail card
  mailCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1,
  },
  mailCardReceived: { backgroundColor: '#1E1E38', borderColor: 'rgba(255,255,255,0.08)' },
  mailCardDraft: { backgroundColor: '#1E1E38', borderColor: '#9333EA', borderStyle: 'dashed' },
  mailCardSent: { backgroundColor: '#1E1E38', borderColor: '#22C55E' },
  // Badge
  mailBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mailBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeReceived: { backgroundColor: 'rgba(156,163,175,0.2)' },
  badgeDraft: { backgroundColor: 'rgba(147,51,234,0.2)' },
  badgeSent: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgeText: { color: '#F3F4F6', fontSize: 12, fontWeight: '600' },
  mailFrom: { color: '#9CA3AF', fontSize: 12, marginLeft: 8 },
  // Mail content
  mailSubject: { color: '#A78BFA', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  mailContent: { color: '#D1D5DB', fontSize: 14, lineHeight: 21 },
  // Edit draft inline
  editDraftInput: {
    color: '#F3F4F6', fontSize: 14, lineHeight: 21,
    backgroundColor: '#0F172A', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#9333EA', minHeight: 100,
    textAlignVertical: 'top',
  },
  // Actions
  mailActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnSave: { backgroundColor: 'rgba(34,197,94,0.15)' },
  actionBtnText: { color: '#D1D5DB', fontSize: 12, fontWeight: '600' },
  actionBtnTextGreen: { color: '#22C55E', fontSize: 12, fontWeight: '600' },
  // Processing
  processingCard: {
    backgroundColor: '#1E1E38', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  processingText: { color: '#9CA3AF', fontSize: 14, fontStyle: 'italic' },
  // Input bar
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  attachButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E1E38',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  attachIcon: { fontSize: 20 },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#1E1E38',
    borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    color: '#F3F4F6', fontSize: 15,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  sendButtonInactive: { backgroundColor: '#1E1E38' },
  sendButtonActive: { backgroundColor: '#9333EA' },
  sendIcon: { color: '#F3F4F6', fontSize: 20, fontWeight: 'bold' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E38', borderRadius: 20, padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  modalScroll: { flexGrow: 0, marginBottom: 8 },
  modalLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: '#F3F4F6', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalInputLarge: { minHeight: 120, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
  },
  modalCancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#9333EA', alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
