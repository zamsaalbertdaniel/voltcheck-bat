/**
 * CornerMarks — four L-shaped corner brackets ("cockpit frame" motif).
 * Mount absolutely over a panel to signal a HUD-framed region.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { VoltColors } from '@/constants/Theme';

type Props = {
  color?: string;
  /** Length of each bracket arm in px */
  size?: number;
  /** Stroke thickness in px */
  thickness?: number;
  /** Inset from the parent edge in px */
  inset?: number;
  style?: ViewStyle;
};

export default function CornerMarks({
  color = VoltColors.neonGreenHairline,
  size = 14,
  thickness = 1.5,
  inset = 6,
  style,
}: Props) {
  const arm = { backgroundColor: color };
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      {/* top-left */}
      <View style={[styles.h, arm, { top: inset, left: inset, width: size, height: thickness }]} />
      <View style={[styles.h, arm, { top: inset, left: inset, width: thickness, height: size }]} />
      {/* top-right */}
      <View style={[styles.h, arm, { top: inset, right: inset, width: size, height: thickness }]} />
      <View style={[styles.h, arm, { top: inset, right: inset, width: thickness, height: size }]} />
      {/* bottom-left */}
      <View style={[styles.h, arm, { bottom: inset, left: inset, width: size, height: thickness }]} />
      <View style={[styles.h, arm, { bottom: inset, left: inset, width: thickness, height: size }]} />
      {/* bottom-right */}
      <View style={[styles.h, arm, { bottom: inset, right: inset, width: size, height: thickness }]} />
      <View style={[styles.h, arm, { bottom: inset, right: inset, width: thickness, height: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { position: 'absolute' },
});
