/**
 * InspectEV — Compatible Models CTA
 *
 * Pill button placed in the hero (under trust badges) that routes to
 * /modele-compatibile. Pulses subtly via an absolute "glow" layer whose
 * opacity is animated (native-driver safe). Respects Reduce-Motion a11y.
 *
 * Fires analytics event `clicked_compatible_models_cta` on press.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { trackEvent } from '@/utils/analytics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AccessibilityInfo,
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface CompatibleModelsCTAProps {
    /** Click source tag forwarded to analytics (e.g. 'landing_hero'). */
    source?: string;
}

export default function CompatibleModelsCTA({
    source = 'landing_hero',
}: CompatibleModelsCTAProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const pulse = useRef(new Animated.Value(0.25)).current;
    const [reduceMotion, setReduceMotion] = useState(false);

    // Detect user's reduce-motion preference once.
    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (mounted) setReduceMotion(enabled);
            })
            .catch(() => {
                // API not available on web fallback — treat as motion allowed.
            });
        return () => {
            mounted = false;
        };
    }, []);

    // Pulse loop: opacity 0.25 → 0.7 → 0.25, ~3.2s cycle.
    useEffect(() => {
        if (reduceMotion) {
            pulse.setValue(0.45);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.7,
                    duration: 1600,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0.25,
                    duration: 1600,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulse, reduceMotion]);

    const handlePress = () => {
        trackEvent('clicked_compatible_models_cta', { source });
        // `as never` matches the existing dynamic-route cast pattern used
        // throughout this codebase when typed-routes hasn't indexed a path.
        router.push('/modele-compatibile' as never);
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.btnContainer}>
                {/* Glow layer — pulses behind the button. */}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.glow,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        Platform.OS === 'web' ? ({ filter: 'blur(14px)' } as any) : null,
                        { opacity: pulse },
                    ]}
                />
                <Pressable
                    onPress={handlePress}
                    style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                        'landing.compatCtaA11y',
                        'Vezi lista completă de mașini electrice compatibile'
                    )}
                >
                    <MaterialCommunityIcons
                        name="car-electric"
                        size={18}
                        color={VoltColors.neonGreen}
                    />
                    <Text style={styles.label}>
                        {t('landing.compatCta', 'Vezi Modele Compatibile')}
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={VoltColors.neonGreen}
                    />
                </Pressable>
            </View>

            <Text style={styles.hint}>
                {t(
                    'landing.compatCtaHint',
                    'Verifică dacă EV-ul tău e acoperit cu diagnoză live baterie'
                )}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginTop: VoltSpacing.xl,
        gap: VoltSpacing.sm,
    },
    btnContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        top: -6,
        left: -6,
        right: -6,
        bottom: -6,
        borderRadius: VoltBorderRadius.full,
        backgroundColor: VoltColors.neonGreen,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreenMuted,
        borderRadius: VoltBorderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.45)',
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.sm + 2,
    },
    btnPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },
    label: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.neonGreen,
        letterSpacing: 0.3,
    },
    hint: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
    },
});
