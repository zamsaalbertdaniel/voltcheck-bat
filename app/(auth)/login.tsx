/**
 * VoltCheck — Login Screen
 * Social Login: Google + Apple Sign-In
 * Zero-password authentication with device fingerprinting
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

    // Animations
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(50)).current;
    const logoScale = useRef(new Animated.Value(0.5)).current;
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Entry animations
        Animated.sequence([
            Animated.parallel([
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeIn, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(slideUp, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleLogin = async (provider: 'google' | 'apple') => {
        setIsLoading(true);
        setLoadingProvider(provider);

        try {
            // TODO: Connect to Firebase Auth
            // For Google: await GoogleSignin.signIn() → Firebase credential
            // For Apple:  await AppleAuthentication.signInAsync() → Firebase credential

            // Simulate auth delay for demo
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error) {
            console.error(`[Auth] ${provider} sign-in failed:`, error);
        } finally {
            setIsLoading(false);
            setLoadingProvider(null);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background gradient effect */}
            <View style={styles.bgGradientTop} />
            <View style={styles.bgGradientBottom} />

            {/* Animated glow behind logo */}
            <Animated.View style={[styles.glowOrb, { opacity: pulseAnim }]} />

            {/* Logo section */}
            <Animated.View style={[
                styles.logoSection,
                {
                    opacity: fadeIn,
                    transform: [{ scale: logoScale }],
                },
            ]}>
                <View style={styles.logoContainer}>
                    <MaterialCommunityIcons
                        name="battery-charging-high"
                        size={72}
                        color={VoltColors.neonGreen}
                    />
                </View>
                <Text style={styles.appName}>VoltCheck</Text>
                <Text style={styles.tagline}>{t('auth.subtitle')}</Text>
            </Animated.View>

            {/* Features showcase */}
            <Animated.View style={[styles.featuresSection, { opacity: fadeIn }]}>
                <FeatureRow icon="shield-checkmark" text="Securitate Zero-Password" />
                <FeatureRow icon="flash" text="Raport în 30 secunde" />
                <FeatureRow icon="analytics" text="AI Risk Score Proprietar" />
            </Animated.View>

            {/* Auth buttons */}
            <Animated.View style={[
                styles.authSection,
                { transform: [{ translateY: slideUp }], opacity: fadeIn },
            ]}>
                {/* Google Sign-In */}
                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={() => handleLogin('google')}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {loadingProvider === 'google' ? (
                        <ActivityIndicator size="small" color={VoltColors.bgPrimary} />
                    ) : (
                        <>
                            <View style={styles.googleIcon}>
                                <Text style={styles.googleG}>G</Text>
                            </View>
                            <Text style={styles.googleText}>{t('auth.loginGoogle')}</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Apple Sign-In (iOS only shows native style) */}
                {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                        style={styles.appleButton}
                        onPress={() => handleLogin('apple')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {loadingProvider === 'apple' ? (
                            <ActivityIndicator size="small" color={VoltColors.white} />
                        ) : (
                            <>
                                <Ionicons name="logo-apple" size={22} color={VoltColors.white} />
                                <Text style={styles.appleText}>{t('auth.loginApple')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.appleButton}
                        onPress={() => handleLogin('apple')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {loadingProvider === 'apple' ? (
                            <ActivityIndicator size="small" color={VoltColors.white} />
                        ) : (
                            <>
                                <Ionicons name="logo-apple" size={22} color={VoltColors.white} />
                                <Text style={styles.appleText}>{t('auth.loginApple')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Terms */}
                <Text style={styles.termsText}>{t('auth.termsAgree')}</Text>
            </Animated.View>

            {/* Version badge */}
            <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v1.0.0 • România 🇷🇴</Text>
            </View>
        </View>
    );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
                <Ionicons name={icon as any} size={18} color={VoltColors.neonGreen} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: VoltSpacing.xl,
    },

    // Background effects
    bgGradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
        backgroundColor: VoltColors.bgPrimary,
        opacity: 0.9,
    },
    bgGradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.3,
        backgroundColor: VoltColors.bgSecondary,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    glowOrb: {
        position: 'absolute',
        top: height * 0.15,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: VoltColors.neonGreenGlow,
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginBottom: VoltSpacing.xl,
        zIndex: 1,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
        ...VoltShadow.glow,
    },
    appName: {
        fontSize: VoltFontSize.display,
        fontWeight: '800',
        color: VoltColors.textPrimary,
        marginTop: VoltSpacing.lg,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginTop: VoltSpacing.xs,
    },

    // Features
    featuresSection: {
        width: '100%',
        marginBottom: VoltSpacing.xl,
        zIndex: 1,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: VoltSpacing.sm,
        gap: VoltSpacing.md,
    },
    featureIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        fontWeight: '500',
    },

    // Auth buttons
    authSection: {
        width: '100%',
        zIndex: 1,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.white,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: VoltSpacing.md,
        marginBottom: VoltSpacing.md,
        gap: VoltSpacing.md,
        ...VoltShadow.md,
    },
    googleIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleG: {
        fontSize: 14,
        fontWeight: '800',
        color: VoltColors.white,
    },
    googleText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    appleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.black,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: VoltSpacing.md,
        marginBottom: VoltSpacing.lg,
        gap: VoltSpacing.md,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    appleText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: VoltColors.white,
    },
    termsText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        lineHeight: 16,
    },

    // Version
    versionBadge: {
        position: 'absolute',
        bottom: VoltSpacing.xl,
    },
    versionText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
    },
});
