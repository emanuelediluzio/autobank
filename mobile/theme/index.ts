// mobile/theme/index.ts
export const theme = {
  colors: {
    bg: '#000000',
    surface: '#0a0a0a',
    surfaceHover: '#141414',
    text: '#ffffff',
    textMuted: '#666666',
    textSecondary: '#999999',
    accent: '#00d632',
    accentDim: '#00a828',
    danger: '#ff3b30',
    warning: '#ff9500',
    border: '#1a1a1a',
    accentGlow: 'rgba(0, 214, 50, 0.08)',
  },
  fonts: {
    regular: 'System',
    mono: 'Courier',
  },
  radius: 16,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type Theme = typeof theme;
