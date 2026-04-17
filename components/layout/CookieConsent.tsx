/**
 * InspectEV — GDPR Cookie Consent Banner
 * Shown on first visit (web only). Stores consent in localStorage.
 * Required because Firebase Auth uses localStorage/IndexedDB
 * and Stripe injects anti-fraud cookies.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const CONSENT_KEY = 'inspectev_cookie_consent';
const DESKTOP_BREAKPOINT = 900;

export default function CookieConsent() {
    const { t } = useTranslation();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(100)).current;
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        try {
            const consent = window.localStorage.getItem(CONSENT_KEY);
            if (!consent) {
                setVisible(true);
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 60,
                    friction: 12,
                    delay: 1000,
                }).start();
            }
        } catch {
            // localStorage unavailable (private browsing, etc.)
        }
    }, [slideAnim]);

    const handleAccept = useCallback(() => {
        try {
            window.localStorage.setItem(CONSENT_KEY, 'accepted');
        } catch {
            // fail silently
        }
        Animated.timing(slideAnim, {
            toValue: 100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    }, [slideAnim]);

    // Only render on web and when no consent given
    if (Platform.OS !== 'web' || !visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                isDesktop && styles.containerDesktop,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
                <View style={styles.iconRow}>
                    <Ionicons name="shield-checkmark" size={20} color={VoltColors.neonGreen} />
                </View>

                <Text style={[styles.text, isDesktop && styles.textDesktop]}>
                    {t(
                        'cookie.message',
                        'Folosim cookie-uri esențiale pentru funcționalitatea site-ului, logare securizată și procesarea plăților (Stripe).'
                    )}
                </Text>

                <View style={[styles.actions, isDesktop && styles.actionsDesktop]}>
                    <Pressable
                        style={({ pressed }) => [styles.learnMore, pressed && styles.btnPressed]}
                        onPress={() => router.push('/legal/privacy' as never)}
                    >
                        <Text style={styles.learnMoreText}>
                            {t('cookie.manage', 'Configurează')}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.acceptBtn, pressed && styles.btnPressed]}
                        onPress={handleAccept}
                    >
                        <Text style={styles.acceptText}>
                            {t('cookie.accept', 'Acceptă Toate')}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: VoltSpacing.md,
        paddingBottom: VoltSpacing.md,
    },
    containerDesktop: {
        paddingHorizontal: VoltSpacing.xl,
        paddingBottom: VoltSpacing.lg,
    },
    inner: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        padding: VoltSpacing.md,
        flexDirection: 'column',
        gap: VoltSpacing.sm,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        // Glassmorphism on web
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }
            : {}),
    },
    innerDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 1000,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: VoltSpacing.lg,
        gap: VoltSpacing.md,
    },
    iconRow: {
        marginRight: VoltSpacing.xs,
    },
    text: {
        flex: 1,
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        lineHeight: 20,
    },
    textDesktop: {
        fontSize: VoltFontSize.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: VoltSpacing.sm,
        alignItems: 'center',
    },
    actionsDesktop: {
        flexShrink: 0,
    },
    learnMore: {
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.sm,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    learnMoreText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textTertiary,
    },
    acceptBtn: {
        backgroundColor: VoltColors.neonGreen,
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.sm,
    },
    acceptText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
    btnPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }],
    },
});
