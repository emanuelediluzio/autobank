// mobile/theme/index.ts
export const theme = {
  colors: {
    bg: '#0a0a0f',
    surface: '#13131a',
    surfaceHover: '#1c1c26',
    surfaceElevated: '#1a1a24',
    text: '#f0f0f5',
    textMuted: '#6b6b80',
    textSecondary: '#9898ab',
    accent: '#6c5ce7',
    accentLight: '#a29bfe',
    accentDim: '#5a4bd1',
    danger: '#ff6b6b',
    dangerDim: '#cc5555',
    warning: '#ffd93d',
    success: '#51cf66',
    border: '#1e1e2a',
    borderLight: '#2a2a38',
    accentGlow: 'rgba(108, 92, 231, 0.1)',
    successGlow: 'rgba(81, 207, 102, 0.1)',
    dangerGlow: 'rgba(255, 107, 107, 0.08)',
    gradient: {
      start: '#6c5ce7',
      end: '#a29bfe',
    },
  },
  fonts: {
    regular: 'System',
    mono: 'Courier',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
} as const;

export type Theme = typeof theme;
