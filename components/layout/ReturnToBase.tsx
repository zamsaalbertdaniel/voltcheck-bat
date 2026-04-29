/**
 * ReturnToBase — global floating "home" button for the cockpit.
 *
 * Logic
 *   - Hidden on the landing page (pathname === '/'); appears on all deeper
 *     routes (legal, dashboard, preview, etc.) so users can collapse the
 *     navigation stack in one tap.
 *   - Press triggers `router.replace('/')` — clears the stack, no back-spam.
 *
 * Design
 *   - Floating bottom-right card with glassmorphism + hairline border + MCI
 *     icon. Border + icon light up neon on hover (web) or press (native).
 *   - Haptic light-impact on native; subtle scale(0.95) on press both
 *     platforms.
 *   - Mounted in app/_layout.tsx after the route stack so it floats above
 *     all screens; z-index sits below CookieConsent and below the global
 *     Toast layer to avoid covering critical messaging.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltMotion,
    VoltSpacing,
    VoltZ,
} from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

const SIZE = 52;
const HOVER_GLOW = 'rgba(0, 255, 136, 0.32)';

export default function ReturnToBase() {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    // Hidden on the landing page — fades in on every other route.
    const visible = pathname !== '/';

    // Fade + slight rise animation on visibility change
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(8)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: visible ? 1 : 0,
                duration: VoltMotion.duration.base,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: visible ? 0 : 8,
                duration: VoltMotion.duration.base,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, opacity, translateY]);

    // Press feedback scale
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.timing(scale, {
            toValue: pressed ? 0.95 : 1,
            duration: VoltMotion.duration.fast,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [pressed, scale]);

    const onPress = () => {
        // Light haptic on native (no-op on web)
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        router.replace('/');
    };

    const borderColor = hovered ? VoltColors.neonGreen : VoltColors.borderStrong;
    const iconColor = hovered ? VoltColors.neonGreen : VoltColors.textPrimary;

    // Web: pin the wrap to the viewport with position:fixed so the button
    // stays visible across long-scroll routes (legal/privacy, etc.). On
    // native we keep position:absolute (Stack screens layer above siblings).
    const webWrapStyle =
        Platform.OS === 'web'
            ? {
                  position: 'fixed' as const,
                  right: VoltSpacing.lg,
                  bottom: VoltSpacing.lg,
              }
            : null;

    const webButtonStyle =
        Platform.OS === 'web'
            ? {
                  backdropFilter: 'blur(14px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                  transition: `border-color 220ms ${VoltMotion.easing.standard}, box-shadow 220ms ${VoltMotion.easing.standard}, background-color 220ms ${VoltMotion.easing.standard}`,
                  boxShadow: hovered
                      ? `0 0 0 1px ${VoltColors.neonGreenHairline}, 0 0 28px ${HOVER_GLOW}`
                      : `0 6px 20px rgba(0, 0, 0, 0.4)`,
              }
            : null;

    return (
        <Animated.View
            pointerEvents={visible ? 'box-none' : 'none'}
            style={[
                styles.wrap,
                {
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only `position: fixed` not in RN ViewStyle
                webWrapStyle as any,
            ]}
        >
            <Pressable
                onHoverIn={() => setHovered(true)}
                onHoverOut={() => setHovered(false)}
                onPressIn={() => setPressed(true)}
                onPressOut={() => setPressed(false)}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={t(
                    'nav.returnToBase',
                    'Înapoi la pagina principală',
                )}
                style={[
                    styles.button,
                    { borderColor },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS keys merged into RN style array
                    webButtonStyle as any,
                ]}
            >
                <View style={styles.iconWrap}>
                    <MaterialCommunityIcons
                        name="home-variant-outline"
                        size={24}
                        color={iconColor}
                    />
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        right: VoltSpacing.lg,
        bottom: VoltSpacing.lg,
        zIndex: VoltZ.overlay,
    },
    button: {
        width: SIZE,
        height: SIZE,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        backgroundColor: 'rgba(13, 20, 32, 0.78)',
        alignItems: 'center',
        justifyContent: 'center',
        // Native shadow fallback (web uses boxShadow above)
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
            },
            android: { elevation: 8 },
            default: {},
        }),
    },
    iconWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
