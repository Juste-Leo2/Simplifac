import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChatScreen from '../screens/ChatScreen';
import ApiKeysScreen from '../screens/ApiKeysScreen';
import CurriculumScreen from '../screens/CurriculumScreen';
import NotesScreen from '../screens/NotesScreen';
import MailThreadScreen from '../screens/MailThreadScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  Chat: { mode?: 'exam_copy' | 'free_problem' | 'history'; subject?: string; sessionId?: string };
  MailThread: { sessionId?: string };
  ApiKeys: undefined;
  Curriculum: undefined;
  Notes: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
      />
      <Stack.Screen 
        name="ApiKeys" 
        component={ApiKeysScreen} 
      />
      <Stack.Screen 
        name="Curriculum" 
        component={CurriculumScreen} 
      />
      <Stack.Screen 
        name="Notes" 
        component={NotesScreen} 
      />
      <Stack.Screen 
        name="MailThread" 
        component={MailThreadScreen} 
      />
    </Stack.Navigator>
  );
};

