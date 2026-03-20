// mobile/theme/index.ts
export const theme = {
  colors: {
    bg: '#0f1419',
    surface: '#1a2332',
    surfaceHover: '#243044',
    text: '#e6edf3',
    textMuted: '#8b949e',
    accent: '#3fb950',
    accentDim: '#238636',
    danger: '#f85149',
    border: '#30363d',
  },
  fonts: {
    regular: 'System',
    mono: 'Courier',
  },
  radius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type Theme = typeof theme;
