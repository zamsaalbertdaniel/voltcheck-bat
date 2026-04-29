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
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

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

    // One-shot horizontal scan-line at mount on the LIVE hairline.
    // Plays once, then disappears — non-distractive, signals "data acquired".
    const sweep = useRef(new Animated.Value(0)).current;
    const [sweepDone, setSweepDone] = useState(false);
    useEffect(() => {
        if (!isLive) return;
        const anim = Animated.timing(sweep, {
            toValue: 1,
            duration: 1100,
            delay: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        });
        anim.start(({ finished }) => {
            if (finished) setSweepDone(true);
        });
        return () => anim.stop();
    }, [isLive, sweep]);

    const sweepLeft = sweep.interpolate({
        inputRange: [0, 1],
        outputRange: ['-20%', '100%'],
    });
    const sweepOpacity = sweep.interpolate({
        inputRange: [0, 0.1, 0.85, 1],
        outputRange: [0, 1, 1, 0],
    });

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
            <View style={styles.hairlineWrap}>
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
                {isLive && !sweepDone && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.sweep,
                            {
                                left: sweepLeft,
                                opacity: sweepOpacity,
                            },
                            Platform.OS === 'web'
                                ? ({
                                      boxShadow: `0 0 12px ${VoltColors.neonGreen}, 0 0 24px ${VoltColors.neonGreen}`,
                                  } as unknown as object)
                                : {
                                      shadowColor: VoltColors.neonGreen,
                                      shadowOffset: { width: 0, height: 0 },
                                      shadowOpacity: 0.9,
                                      shadowRadius: 8,
                                  },
                        ]}
                    />
                )}
            </View>
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
    hairlineWrap: {
        position: 'relative',
        marginTop: VoltSpacing.xs,
        width: '100%',
        height: 2,
        overflow: 'hidden',
    },
    hairline: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 1,
    },
    sweep: {
        position: 'absolute',
        top: 0,
        height: 2,
        width: '24%',
        backgroundColor: VoltColors.neonGreen,
    },
});
