/**
 * VoltCheck — Dual Splash Screen Sequence
 * Phase 1: Probabilistic AI logo (1.5s) → Phase 2: BAT/VoltCheck logo (1.5s)
 * Total animation time: ~3.0s (under the 3.5s budget)
 *
 * Design: Dark Mode Tech — Carbon background, Neon Green + Cyan accents
 */

import { VoltColors, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Timing Config (Total: ~3.0s — under the 3.5s budget) ──
const PHASE_1_DURATION = 1500;   // Probabilistic AI logo visible
const CROSSFADE_DURATION = 500;  // Transition between phases
const PHASE_2_DURATION = 1000;   // BAT/VoltCheck logo visible
const FADE_OUT_DURATION = 400;   // Final fade out

interface SplashSequenceProps {
    onComplete: () => void;
}

export default function SplashSequence({ onComplete }: SplashSequenceProps) {
    const [phase, setPhase] = useState<1 | 2 | 'done'>(1);

    // Animations
    const phase1Opacity = useRef(new Animated.Value(0)).current;
    const phase1Scale = useRef(new Animated.Value(0.8)).current;
    const phase2Opacity = useRef(new Animated.Value(0)).current;
    const phase2Scale = useRef(new Animated.Value(0.8)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start glow pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: false,
                }),
                Animated.timing(glowPulse, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: false,
                }),
            ])
        ).start();

        // ── Phase 1: Probabilistic AI ──
        Animated.parallel([
            Animated.timing(phase1Opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(phase1Scale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // ── Crossfade to Phase 2 ──
        const phase2Timer = setTimeout(() => {
            setPhase(2);
            Animated.parallel([
                // Fade out phase 1
                Animated.timing(phase1Opacity, {
                    toValue: 0,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
                // Fade in phase 2
                Animated.timing(phase2Opacity, {
                    toValue: 1,
                    duration: CROSSFADE_DURATION,
                    useNativeDriver: true,
                }),
                Animated.spring(phase2Scale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        }, PHASE_1_DURATION);

        // ── Final fade out ──
        const completeTimer = setTimeout(() => {
            setPhase('done');
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: FADE_OUT_DURATION,
                useNativeDriver: true,
            }).start(() => {
                onComplete();
            });
        }, PHASE_1_DURATION + CROSSFADE_DURATION + PHASE_2_DURATION);

        return () => {
            clearTimeout(phase2Timer);
            clearTimeout(completeTimer);
        };
    }, []);

    const glowOpacity = glowPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.15, 0.45],
    });

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            {/* Subtle grid background effect */}
            <View style={styles.gridOverlay} />

            {/* ── Phase 1: Probabilistic AI ── */}
            <Animated.View
                style={[
                    styles.phaseContainer,
                    {
                        opacity: phase1Opacity,
                        transform: [{ scale: phase1Scale }],
                    },
                ]}
            >
                {/* Glow ring */}
                <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

                <View style={styles.logoContainer}>
                    <Text style={styles.aiIcon}>🧠</Text>
                    <Text style={styles.companyName}>Probabilistic</Text>
                    <Text style={styles.companyNameAccent}>AI</Text>
                </View>
                <Text style={styles.companyTagline}>Intelligent Risk Analysis</Text>
            </Animated.View>

            {/* ── Phase 2: BAT / VoltCheck ── */}
            <Animated.View
                style={[
                    styles.phaseContainer,
                    styles.phase2Container,
                    {
                        opacity: phase2Opacity,
                        transform: [{ scale: phase2Scale }],
                    },
                ]}
            >
                {/* Glow ring — green */}
                <Animated.View
                    style={[styles.glowRing, styles.glowRingGreen, { opacity: glowOpacity }]}
                />

                <View style={styles.logoContainer}>
                    <Text style={styles.batIcon}>⚡</Text>
                    <Text style={styles.batTitle}>INSPECT</Text>
                    <Text style={styles.batTitleAccent}>EV</Text>
                </View>
                <View style={styles.batBadge}>
                    <Text style={styles.batBadgeText}>BAT — Battery Analysis Technology</Text>
                </View>
                <Text style={styles.batTagline}>Verifică bateria. Cumpără în siguranță.</Text>
            </Animated.View>

            {/* Bottom branding — always visible */}
            <View style={styles.bottomBrand}>
                <View style={styles.versionPill}>
                    <Text style={styles.versionText}>v1.0</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: VoltColors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03,
        // Simulated grid via border (subtle tech pattern)
        borderWidth: 1,
        borderColor: VoltColors.neonGreen,
    },

    // ── Shared phase styles ──
    phaseContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    phase2Container: {
        // Overlays phase 1
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: VoltSpacing.md,
    },
    glowRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 188, 212, 0.15)', // Cyan glow for Probabilistic AI
    },
    glowRingGreen: {
        backgroundColor: VoltColors.neonGreenGlow,
    },

    // ── Phase 1: Probabilistic AI ──
    aiIcon: {
        fontSize: 42,
        marginRight: VoltSpacing.sm,
    },
    companyName: {
        fontSize: 32,
        fontWeight: '300',
        color: VoltColors.textPrimary,
        letterSpacing: 1,
    },
    companyNameAccent: {
        fontSize: 32,
        fontWeight: '800',
        color: '#00BCD4', // Cyan — Probabilistic AI brand
        marginLeft: VoltSpacing.xs,
    },
    companyTagline: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        letterSpacing: 3,
        textTransform: 'uppercase',
    },

    // ── Phase 2: BAT / VoltCheck ──
    batIcon: {
        fontSize: 48,
        marginRight: VoltSpacing.sm,
    },
    batTitle: {
        fontSize: 40,
        fontWeight: '800',
        color: VoltColors.textPrimary,
        letterSpacing: 3,
    },
    batTitleAccent: {
        fontSize: 40,
        fontWeight: '800',
        color: VoltColors.neonGreen,
        letterSpacing: 3,
    },
    batBadge: {
        backgroundColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderRadius: 20,
        marginBottom: VoltSpacing.sm,
    },
    batBadgeText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.neonGreen,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    batTagline: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        fontStyle: 'italic',
    },

    // ── Bottom ──
    bottomBrand: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    versionPill: {
        backgroundColor: VoltColors.bgTertiary,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    versionText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontFamily: 'SpaceMono',
    },
});
