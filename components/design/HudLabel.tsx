/**
 * HudLabel — small uppercase mono label in cockpit typography.
 * Used for captions, data-row headers, corner markers.
 */

import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { VoltColors, VoltFontFamily, VoltFontSize, VoltLetterSpacing } from '@/constants/Theme';

type Props = {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: TextStyle;
  /** Optional leading dot (●) for active-signal feel */
  dot?: boolean;
};

export default function HudLabel({
  children,
  color = VoltColors.textSecondary,
  size = VoltFontSize.xs,
  style,
  dot = false,
}: Props) {
  return (
    <Text style={[styles.base, { color, fontSize: size }, style]}>
      {dot ? <Text style={{ color: VoltColors.neonGreen }}>●  </Text> : null}
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: VoltFontFamily.mono,
    letterSpacing: VoltLetterSpacing.hud,
    textTransform: 'uppercase',
  },
});
