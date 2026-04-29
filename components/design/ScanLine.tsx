/**
 * ScanLine — animated horizontal scanning line (cockpit / data-parse aesthetic).
 *
 * A thin neon bar translates vertically across the parent, with a soft glow trail.
 * Non-interactive; mount as absolute decoration.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { VoltColors, VoltMotion } from '@/constants/Theme';

type Props = {
  /** Animation loop duration in ms */
  duration?: number;
  /** Line thickness in px */
  thickness?: number;
  color?: string;
  /** If false, the scan line is paused */
  active?: boolean;
  style?: ViewStyle;
  /** Fixed height of the scan "track" in px (required for absolute layouts) */
  height?: number;
};

export default function ScanLine({
  duration = VoltMotion.duration.cinematic * 2,
  thickness = 2,
  color = VoltColors.neonGreen,
  active = true,
  style,
  height,
}: Props) {
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translate, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [translate, duration, active]);

  const trackHeight = height ?? 200;
  const translateY = translate.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackHeight - thickness)],
  });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: thickness,
          backgroundColor: color,
          opacity: 0.85,
          transform: [{ translateY }],
          ...(Platform.OS === 'web'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- boxShadow is web-only CSS
              ({ boxShadow: `0 0 12px ${color}, 0 0 24px ${color}` } as any)
            : {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              }),
        }}
      />
    </View>
  );
}
