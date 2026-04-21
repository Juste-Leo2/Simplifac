import React, { createContext, useContext, useState } from 'react';
import { ThemeType, ThemeColors } from '../types/theme';
import { darkColors, lightColors, colorblindColors } from './theme';
import { StorageService } from '../services/storage';

interface ThemeContextProps {
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const colorsByTheme: Record<ThemeType, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
  colorblind: colorblindColors,
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lecture de la préférence (ou par défaut 'dark')
  const [themeType, setThemeTypeState] = useState<ThemeType>(() => {
    const saved = StorageService.getPreferences()?.theme;
    // Migrer l'ancien 'system' vers 'dark'
    if (!saved || saved === ('system' as string)) return 'dark';
    return saved;
  });

  const setThemeType = (type: ThemeType) => {
    setThemeTypeState(type);
    // Sauvegarder la préférence
    const currentPrefs = StorageService.getPreferences() || { theme: 'dark' };
    StorageService.savePreferences({ ...currentPrefs, theme: type });
  };

  // isDark est vrai pour dark et colorblind (les deux ont un fond sombre)
  const isDark = themeType === 'dark' || themeType === 'colorblind';

  const activeColors = colorsByTheme[themeType];

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
