import { Platform } from 'react-native';

export const colors = {
  background: '#070B14',
  surface: '#0E1525',
  surfaceElevated: '#141D31',
  surfaceSoft: '#101827',
  primary: '#8B7CFF',
  primaryStrong: '#725FFF',
  primarySoft: '#282449',
  cyan: '#59D6FF',
  cyanSoft: '#123142',
  success: '#63E6BE',
  successSoft: '#12362F',
  warning: '#F4C96B',
  danger: '#FF7184',
  text: '#F5F7FC',
  textSecondary: '#A8B2C8',
  muted: '#6D7891',
  border: '#1E2A40',
  borderStrong: '#2A3852',
  white: '#FFFFFF',
  overlay: 'rgba(3, 6, 12, 0.78)',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
    },
    android: {
      elevation: 5,
    },
    default: {
      boxShadow: '0 18px 48px rgba(0, 0, 0, 0.24)',
    },
  }),
  glow: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
    },
    android: {
      elevation: 8,
    },
    default: {
      boxShadow: '0 12px 36px rgba(139, 124, 255, 0.28)',
    },
  }),
};

