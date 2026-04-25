import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/utils/ThemeContext';
import { UserProvider } from './src/utils/UserContext';
import { initSecureStorage } from './src/services/storage';

const App = () => {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const initializeApp = async () => {
    setHasError(false);
    const success = await initSecureStorage();
    if (success) {
      setIsStorageReady(true);
    } else {
      setHasError(true);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  if (hasError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#F1F5F9', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          Impossible d'initialiser le stockage sécurisé.
        </Text>
        <TouchableOpacity
          onPress={initializeApp}
          style={{ backgroundColor: '#9333EA', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isStorageReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9333EA" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;