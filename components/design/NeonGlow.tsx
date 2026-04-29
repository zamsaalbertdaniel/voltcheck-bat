/**
 * NeonGlow — wraps children with a radial neon halo behind them.
 *
 * Web: CSS radial-gradient (cheap, no repaint).
 * Native: layered View with shadow + tinted backdrop.
 */

import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { VoltColors } from '@/constants/Theme';

type Props = {
  color?: string;
  /** 0..1 — intensity of the halo */
  intensity?: number;
  /** Radius in px on web, approximate shadowRadius on native */
  radius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

export default function NeonGlow({
  color = VoltColors.neonGreen,
  intensity = 0.5,
  radius = 240,
  style,
  children,
}: Props) {
  if (Platform.OS === 'web') {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CSS background + filter are web-only, not in RN StyleSheet types
    const webStyle: any = {
      position: 'relative',
      background: `radial-gradient(circle at 50% 50%, ${hexWithAlpha(color, clampedIntensity * 0.9)} 0%, ${hexWithAlpha(color, clampedIntensity * 0.3)} 30%, transparent 70%)`,
      filter: `blur(${Math.round(radius / 6)}px)`,
    };

    return (
      <View style={[style]}>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, webStyle]}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: intensity,
          shadowRadius: radius / 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Accepts '#00FF88' or 'rgba(...)' — if not hex, return as-is
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
