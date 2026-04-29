/**
 * InspectEV Design System — Cockpit / Deep-Tech
 * Accent: Neon Green #00FF88 (Matrix vibe)
 * Aesthetic: Midnight Black surfaces, terminal mono typography, measured neon highlights
 *
 * NOTE: Existing keys (neonGreen, bgPrimary, etc.) preserved for backward compatibility.
 * New cockpit tokens live alongside — migrate screen-by-screen.
 */

export const VoltColors = {
  // ── Primary neon (Matrix #00FF88) ───────────────────────────
  neonGreen: '#00FF88',
  neonGreenDark: '#00CC6E',
  neonGreenLight: '#7FFFB8',
  neonGreenMuted: 'rgba(0, 255, 136, 0.14)',
  neonGreenGlow: 'rgba(0, 255, 136, 0.35)',
  neonGreenHairline: 'rgba(0, 255, 136, 0.22)',

  // ── Midnight surfaces (cockpit hierarchy) ───────────────────
  bgPrimary: '#05070B',       // void / canvas
  bgSecondary: '#0B0F17',     // cards, panels
  bgTertiary: '#121826',      // elevated surfaces
  bgInput: '#1A2130',         // input wells
  bgOverlay: 'rgba(5, 7, 11, 0.88)',

  // Signal / graph backgrounds for cockpit UI
  bgCockpit: '#070A11',
  bgPanel: 'rgba(13, 20, 32, 0.72)',
  bgPanelBright: 'rgba(20, 30, 46, 0.82)',

  // ── Text hierarchy ──────────────────────────────────────────
  textPrimary: '#EAF3F0',
  textSecondary: '#8FA3AE',
  textTertiary: '#5B6B78',
  textMono: '#B7F5D0',        // numeric / HUD readouts
  textOnGreen: '#02110A',

  // ── Risk score (kept) ───────────────────────────────────────
  riskLow: '#00FF88',
  riskMedium: '#FFB300',
  riskHigh: '#FF6D00',
  riskCritical: '#FF1744',

  // ── Status ──────────────────────────────────────────────────
  success: '#00FF88',
  warning: '#FFB300',
  error: '#FF1744',
  info: '#29B6F6',

  // ── Borders / dividers (hairlines) ──────────────────────────
  border: 'rgba(143, 163, 174, 0.10)',
  borderStrong: 'rgba(143, 163, 174, 0.22)',
  borderFocused: '#00FF88',
  divider: 'rgba(143, 163, 174, 0.06)',
  gridLine: 'rgba(0, 255, 136, 0.08)',

  // ── Brand / misc ────────────────────────────────────────────
  stripePurple: '#635BFF',
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
  mega: 96,
} as const;

export const VoltBorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 22,
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
  mega: 64,
  hero: 88,
} as const;

/**
 * Typography stack.
 * - `display`: Satoshi (Fontshare CDN on web) — editorial / headlines
 * - `body`: Satoshi regular — UI text
 * - `mono`: Space Mono — HUD readouts, data, VIN strings
 *
 * Native fallback: Inter (already bundled). Satoshi loaded only on web (no EAS rebuild needed).
 */
export const VoltFontFamily = {
  // Body / UI
  regular: 'Satoshi-Regular, Inter_400Regular, -apple-system, BlinkMacSystemFont, sans-serif',
  medium: 'Satoshi-Medium, Inter_500Medium, -apple-system, sans-serif',
  semiBold: 'Satoshi-Bold, Inter_600SemiBold, -apple-system, sans-serif',
  bold: 'Satoshi-Bold, Inter_700Bold, -apple-system, sans-serif',

  // Display (editorial)
  display: 'Satoshi-Black, Inter_700Bold, -apple-system, sans-serif',

  // Mono / HUD
  mono: 'SpaceMono, "Space Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;

/**
 * Letter-spacing presets — mono display gets negative tracking, HUD labels get positive.
 */
export const VoltLetterSpacing = {
  tight: -0.8,
  normal: 0,
  wide: 0.8,
  wider: 1.6,
  widest: 2.8,
  hud: 3.2,
} as const;

export const VoltShadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  glowSoft: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

/**
 * Motion tokens — keep animation language consistent.
 * Durations in ms, easings as strings usable by RN Easing wrappers or CSS.
 */
export const VoltMotion = {
  duration: {
    instant: 120,
    fast: 200,
    base: 320,
    slow: 540,
    cinematic: 900,
  },
  easing: {
    // cubic-bezier equivalents — used directly in CSS on web
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',      // ease-out expo
    emphasized: 'cubic-bezier(0.19, 1, 0.22, 1)',    // cinematic
    linear: 'linear',
    enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },
} as const;

/**
 * Z-index layering — prevents ad-hoc magic numbers.
 */
export const VoltZ = {
  base: 0,
  raised: 10,
  overlay: 100,
  modal: 1000,
  toast: 9000,
  hud: 9500,
} as const;

/**
 * Web-only CSS fragment — injects Satoshi via Fontshare CDN + global cockpit tuning.
 * Applied in app/_layout.tsx via a <style> tag on web.
 */
export const VoltWebFontCSS = `
  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');

  html, body {
    background: ${VoltColors.bgPrimary};
    color: ${VoltColors.textPrimary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  ::selection {
    background: ${VoltColors.neonGreenMuted};
    color: ${VoltColors.neonGreen};
  }
`;

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
