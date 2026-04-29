/**
 * SectorHeader — header rendered above each Data Discovery sector.
 *
 * LIVE / HISTORY split. The "live" variant gets a glowing neon dot and a
 * brighter accent label; "history" stays subdued for visual hierarchy.
 */

import HudLabel from '@/components/design/HudLabel';
import {
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltLetterSpacing,
    VoltSpacing,
} from '@/constants/Theme';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

type Props = {
    /** Short HUD-style label (e.g. "SECTOR 01 · LIVE") */
    label: string;
    /** Larger headline (e.g. "Extragere LIVE din BMS") */
    title: string;
    /** Optional subtitle describing what the sector covers */
    subtitle?: string;
    variant: 'live' | 'history';
};

export default function SectorHeader({ label, title, subtitle, variant }: Props) {
    const isLive = variant === 'live';

    // Pulsing glow under the dot — only for the LIVE sector
    const pulse = useRef(new Animated.Value(0.55)).current;
    useEffect(() => {
        if (!isLive) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0.55,
                    duration: 1400,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [isLive, pulse]);

    return (
        <View style={styles.wrap}>
            <View style={styles.labelRow}>
                {isLive && (
                    <Animated.View
                        style={[
                            styles.dot,
                            { opacity: pulse, transform: [{ scale: pulse }] },
                        ]}
                    />
                )}
                <HudLabel
                    size={VoltFontSize.xs}
                    color={isLive ? VoltColors.neonGreen : VoltColors.textTertiary}
                >
                    {label}
                </HudLabel>
            </View>
            <Text style={[styles.title, isLive && styles.titleLive]}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View
                style={[
                    styles.hairline,
                    {
                        backgroundColor: isLive
                            ? VoltColors.neonGreenHairline
                            : VoltColors.border,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: VoltSpacing.xs,
        marginBottom: VoltSpacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: VoltColors.neonGreen,
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    title: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: -0.4,
    },
    titleLive: {
        color: VoltColors.textPrimary,
    },
    subtitle: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.textTertiary,
        letterSpacing: VoltLetterSpacing.wide,
        textTransform: 'uppercase',
    },
    hairline: {
        height: 1,
        marginTop: VoltSpacing.xs,
        width: '100%',
    },
});
