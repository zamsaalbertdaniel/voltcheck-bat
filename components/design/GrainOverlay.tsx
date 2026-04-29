/**
 * GrainOverlay — subtle film grain / noise layer for cockpit aesthetic.
 *
 * Web: SVG filter with fractal noise (GPU-cheap, ~0 bundle cost).
 * Native: falls back to a noise-tinted translucent view (RN has no SVG filter).
 *
 * Use as a non-interactive absolute overlay over dark surfaces.
 */

import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  opacity?: number;
  style?: ViewStyle;
  /** If true, uses pointerEvents="none" (recommended for backdrop decoration) */
  decorative?: boolean;
};

export default function GrainOverlay({ opacity = 0.06, style, decorative = true }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents={decorative ? 'none' : 'auto'}
        style={[StyleSheet.absoluteFill, style]}
      >
        {/* eslint-disable-next-line react/no-unknown-property */}
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixBlendMode is web-only CSS
          style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay' } as any}
        >
          <filter id="inspectev-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.55 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#inspectev-grain)" />
        </svg>
      </View>
    );
  }

  return (
    <View
      pointerEvents={decorative ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'rgba(255,255,255,0.015)', opacity },
        style,
      ]}
    />
  );
}
