export type ThemeType = 'light' | 'dark' | 'colorblind';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  iconPrimary: string;
  iconSecondary: string;
  divider: string;
  shadow: string;
  surfaceHighlight: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}
