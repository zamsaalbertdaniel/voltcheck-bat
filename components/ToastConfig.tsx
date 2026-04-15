/**
 * InspectEV — Toast Config (Deep-Tech Theme)
 * Stilizare custom pentru react-native-toast-message, aliniată cu Design System
 * (dark mode + accente neon). Se aplică global prin `<Toast config={toastConfig} />`
 * montat în `app/_layout.tsx`.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';

type Variant = 'success' | 'error' | 'warning' | 'info';

const VARIANTS: Record<
    Variant,
    { icon: keyof typeof Ionicons.glyphMap; accent: string; glow: string }
> = {
    success: {
        icon: 'checkmark-circle',
        accent: VoltColors.neonGreen,
        glow: 'rgba(0, 230, 118, 0.35)',
    },
    error: {
        icon: 'close-circle',
        accent: VoltColors.error,
        glow: 'rgba(255, 23, 68, 0.35)',
    },
    warning: {
        icon: 'warning',
        accent: VoltColors.warning,
        glow: 'rgba(255, 179, 0, 0.35)',
    },
    info: {
        icon: 'information-circle',
        accent: VoltColors.info,
        glow: 'rgba(41, 182, 246, 0.35)',
    },
};

interface VoltToastProps {
    variant: Variant;
    text1?: string;
    text2?: string;
}

function VoltToast({ variant, text1, text2 }: VoltToastProps) {
    const v = VARIANTS[variant];
    return (
        <View
            style={[
                styles.card,
                {
                    borderLeftColor: v.accent,
                    shadowColor: v.accent,
                    ...(Platform.OS === 'web'
                        ? ({
                              // Web: boxShadow pentru glow vizibil (prop web-only)
                              boxShadow: `0 0 16px ${v.glow}, 0 8px 24px rgba(0,0,0,0.4)`,
                          } as object)
                        : null),
                },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <View style={[styles.iconWrap, { backgroundColor: `${v.accent}22` }]}>
                <Ionicons name={v.icon} size={20} color={v.accent} />
            </View>
            <View style={styles.content}>
                {text1 ? (
                    <Text style={styles.text1} numberOfLines={2}>
                        {text1}
                    </Text>
                ) : null}
                {text2 ? (
                    <Text style={styles.text2} numberOfLines={3}>
                        {text2}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

export const toastConfig: ToastConfig = {
    success: ({ text1, text2 }) => (
        <VoltToast variant="success" text1={text1} text2={text2} />
    ),
    error: ({ text1, text2 }) => (
        <VoltToast variant="error" text1={text1} text2={text2} />
    ),
    warning: ({ text1, text2 }) => (
        <VoltToast variant="warning" text1={text1} text2={text2} />
    ),
    info: ({ text1, text2 }) => (
        <VoltToast variant="info" text1={text1} text2={text2} />
    ),
};

const styles = StyleSheet.create({
    card: {
        minHeight: 56,
        maxWidth: 520,
        width: '92%',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: VoltColors.border,
        paddingVertical: VoltSpacing.md,
        paddingHorizontal: VoltSpacing.md,
        gap: VoltSpacing.md,
        ...VoltShadow.lg,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: VoltBorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        gap: 2,
    },
    text1: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
        lineHeight: 20,
    },
    text2: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.regular,
        color: VoltColors.textSecondary,
        lineHeight: 18,
    },
});
