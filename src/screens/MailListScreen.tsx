import React, { useState, useCallback } from 'react';
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
import { StorageService } from '../services/storage';
import { ChatSession } from '../types/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'MailList'>;

export default function MailListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mailSessions, setMailSessions] = useState<ChatSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      const allSessions = StorageService.getChatSessions();
      const mails = allSessions.filter(s => s.mode === 'mail_thread');
      // Trier par date décroissante
      mails.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setMailSessions(mails);
    }, [])
  );

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      "Supprimer le brouillon",
      "Veux-tu vraiment supprimer ce mail de l'historique ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: () => {
            StorageService.deleteChatSession(sessionId);
            const allSessions = StorageService.getChatSessions();
            setMailSessions(allSessions.filter(s => s.mode === 'mail_thread'));
          }
        }
      ]
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
          <Text style={styles.headerTitle}>Messagerie</Text>
          <Text style={styles.headerSubtitle}>
            {mailSessions.length} brouillon{mailSessions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Spacer pour centrer le titre */}
        <View style={{ width: 40 }} />
      </View>

      {/* LISTE DES MAILS */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mailSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📬</Text>
            <Text style={styles.emptyTitle}>Aucun mail en cours</Text>
            <Text style={styles.emptySubtitle}>
              Commence à rédiger un nouveau brouillon ou scanne un mail reçu pour obtenir de l'aide.
            </Text>
          </View>
        ) : (
          mailSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.mailCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MailThread', { sessionId: session.id })}
            >
              <View style={styles.mailCardIconContainer}>
                <Text style={styles.mailCardIcon}>✉️</Text>
              </View>
              <View style={styles.mailCardContent}>
                <Text style={styles.mailCardTitle} numberOfLines={1}>{session.title}</Text>
                <Text style={styles.mailCardDate}>
                  {new Date(session.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteSession(session.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.mailCardDelete}>🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
        {/* Spacer for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOUTON FLOTTANT NOUVEAU MAIL */}
      <View style={[styles.fabContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.9}
          onPress={() => navigation.navigate('MailThread', {})}
        >
          <Text style={styles.fabIcon}>➕</Text>
          <Text style={styles.fabText}>Nouveau Mail</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    flex: 1,
  },
  headerTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  mailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E38',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  mailCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mailCardIcon: {
    fontSize: 20,
  },
  mailCardContent: {
    flex: 1,
  },
  mailCardTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mailCardDate: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  mailCardDelete: {
    fontSize: 18,
    paddingLeft: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9333EA',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#FFF',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
