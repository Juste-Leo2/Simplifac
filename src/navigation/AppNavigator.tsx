import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChatScreen from '../screens/ChatScreen';
import ApiKeysScreen from '../screens/ApiKeysScreen';
import CurriculumScreen from '../screens/CurriculumScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  Chat: undefined;
  ApiKeys: undefined;
  Curriculum: undefined;
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
    </Stack.Navigator>
  );
};

