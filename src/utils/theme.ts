import { ThemeColors } from '../types/theme';

export const darkColors: ThemeColors = {
  background: '#0F172A', // Bleu ardoise profond (depuis Dashboard)
  surface: '#1E1E38',    // Utilisé pour les cartes, avatars
  primary: '#9333EA',    // Améthyste / Violet (actions principales)
  text: '#F3F4F6',       // Gris très clair / blanc
  textSecondary: '#9CA3AF', // Gris pour les sous-titres
  iconPrimary: '#F3F4F6',
  iconSecondary: '#6B7280',
  divider: 'rgba(255, 255, 255, 0.1)',
  shadow: '#000000',
  surfaceHighlight: 'rgba(147, 51, 234, 0.15)', // L'effet d'icône tuile
};

// Mode clair (Pour l'instant, on met des valeurs standards mais modifiables plus tard)
export const lightColors: ThemeColors = {
  background: '#F9FAFB', 
  surface: '#FFFFFF',
  primary: '#7E22CE', // Violet un peu plus foncé pour contraster
  text: '#111827',
  textSecondary: '#4B5563',
  iconPrimary: '#111827',
  iconSecondary: '#9CA3AF',
  divider: 'rgba(0, 0, 0, 0.1)',
  shadow: '#000000',
  surfaceHighlight: 'rgba(126, 34, 206, 0.1)',
};
