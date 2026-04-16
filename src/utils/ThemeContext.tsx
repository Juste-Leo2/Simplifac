import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeType, ThemeColors, Theme } from '../types/theme';
import { darkColors, lightColors } from './theme';
import { StorageService } from '../services/storage';

interface ThemeContextProps {
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  // Lecture de la préférence (ou par défaut 'system')
  const [themeType, setThemeTypeState] = useState<ThemeType>(() => StorageService.getPreferences()?.theme || 'system');

  const setThemeType = (type: ThemeType) => {
    setThemeTypeState(type);
    // Sauvegarder la préférence
    const currentPrefs = StorageService.getPreferences() || { theme: 'system' };
    StorageService.savePreferences({ ...currentPrefs, theme: type });
  };

  // Logique pour déterminer si on est en light ou dark (en ce moment, on va forcer le dark comme avant)
  const isDark = themeType === 'dark' || (themeType === 'system' && systemColorScheme === 'dark');

  // On utilise darkColors si isDark est vrai, sinon lightColors.
  const activeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeType, setThemeType, colors: activeColors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
