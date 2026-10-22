export const Colors = {
  primary: '#3B82F6', // Blue 500
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  background: '#0B0F17', // Deep slate dark mode
  surface: '#151C28',
  surfaceVariant: '#1E293B',
  surfaceBorder: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#10B981', // Emerald for success/connected
  warning: '#F59E0B',
  error: '#EF4444',
  chipBg: '#1E293B',
  chipActiveBg: '#3B82F6',
  divider: '#1E293B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Typography = {
  titleLarge: { fontSize: 24, fontWeight: '700' as const, color: Colors.text },
  titleMedium: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  bodyMedium: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bodySmall: { fontSize: 12, color: Colors.textSecondary },
  label: { fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted },
  code: { fontFamily: 'monospace', fontSize: 13, color: '#E2E8F0', lineHeight: 20 },
};
