/**
 * InspectEV Design System — Dark Mode Tech
 * Accent: Neon Green (#00E676) — transmite precizie și tehnologie
 */

export const VoltColors = {
  // Primary palette
  neonGreen: '#00E676',
  neonGreenDark: '#00C853',
  neonGreenLight: '#69F0AE',
  neonGreenMuted: 'rgba(0, 230, 118, 0.15)',
  neonGreenGlow: 'rgba(0, 230, 118, 0.3)',

  // Background hierarchy (darkest → lightest)
  bgPrimary: '#0A0E17',       // Main background — near-black with blue undertone
  bgSecondary: '#111827',     // Cards, surfaces
  bgTertiary: '#1A2332',      // Elevated surfaces
  bgInput: '#1E2A3A',         // Input fields
  bgOverlay: 'rgba(10, 14, 23, 0.85)', // Modal overlay

  // Text hierarchy
  textPrimary: '#F0F4F8',     // Headings, important text
  textSecondary: '#94A3B8',   // Body text, descriptions
  textTertiary: '#64748B',    // Placeholder, disabled
  textOnGreen: '#0A0E17',     // Text on neon green backgrounds

  // Risk score colors
  riskLow: '#00E676',         // 0-25: Low risk — green
  riskMedium: '#FFB300',      // 26-50: Medium risk — amber
  riskHigh: '#FF6D00',        // 51-75: High risk — orange
  riskCritical: '#FF1744',    // 76-100: Critical risk — red

  // Status colors
  success: '#00E676',
  warning: '#FFB300',
  error: '#FF1744',
  info: '#29B6F6',

  // Borders & dividers
  border: 'rgba(148, 163, 184, 0.12)',
  borderFocused: '#00E676',
  divider: 'rgba(148, 163, 184, 0.08)',

  // Stripe / Payment
  stripePurple: '#635BFF',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const VoltSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const VoltBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const VoltFontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  display: 48,
} as const;

export const VoltFontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'SpaceMono',
} as const;

export const VoltShadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

/** Maps a risk score (0-100) to a color */
export function getRiskColor(score: number): string {
  if (score <= 25) return VoltColors.riskLow;
  if (score <= 50) return VoltColors.riskMedium;
  if (score <= 75) return VoltColors.riskHigh;
  return VoltColors.riskCritical;
}

/** Maps a risk score (0-100) to a category label */
export function getRiskCategory(score: number): string {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}
