/**
 * InspectEV — Login Screen (Modernized Landing Page)
 *
 * Social Login: Google + Apple + Email Magic Link
 * Responsive: split-screen on desktop, stacked on mobile
 * Animated gradient background, hero section, trust badges
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    Image,
    useWindowDimensions,
    View,
} from 'react-native';
import VoltFooter from '@/components/layout/VoltFooter';
import { useToast } from '@/components/ToastProvider';
import { getFirebaseServices } from '@/services/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';

const DESKTOP_BREAKPOINT = 900;

/** Configure Google Sign-In once at module level (native only) */
let googleSignInConfigured = false;
async function ensureGoogleSignInConfigured() {
    if (googleSignInConfigured || Platform.OS === 'web') return;
    try {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
            offlineAccess: true,
        });
        googleSignInConfigured = true;
    } catch {
        // SDK not available — will fallback to anonymous in handleLogin
    }
}

/**
 * Pre-initialize Firebase Auth for web at module level.
 * Uses signInWithRedirect (not signInWithPopup) because:
 *  1. signInWithPopup requires synchronous user-gesture — breaks with any await
 *  2. Popup blockers silently kill signInWithPopup on most browsers
 *  3. signInWithRedirect works universally (desktop, mobile, all browsers)
 */
let _webAuth: import('firebase/auth').Auth | null = null;
let _webAuthMod: typeof import('firebase/auth') | null = null;

async function initWebAuth() {
    if (Platform.OS !== 'web') return;
    if (_webAuth && _webAuthMod) return;
    try {
        const [mod, { app }] = await Promise.all([
            import('firebase/auth'),
            getFirebaseServices(),
        ]);
        _webAuthMod = mod;
        _webAuth = mod.getAuth(app);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Auth] initWebAuth failed:', e);
    }
}

/**
 * Check for redirect result after coming back from Google/Apple sign-in.
 * Called on mount — if the user just completed OAuth, this picks up
 * the credential and logs them in automatically.
 */
async function tryCompleteRedirectSignIn(): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    try {
        await initWebAuth();
        if (!_webAuth || !_webAuthMod) return false;
        const result = await _webAuthMod.getRedirectResult(_webAuth);
        if (result?.user) {
            return true; // Auth state listener will handle navigation
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Auth] Redirect sign-in completion failed:', e);
    }
    return false;
}

/**
 * On web, check if the current URL is a Magic Link callback.
 * If so, complete the sign-in automatically.
 */
async function tryCompleteMagicLink(): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    try {
        const { getAuth, isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
        const { app } = await getFirebaseServices();
        const auth = getAuth(app);
        const url = window.location.href;

        if (isSignInWithEmailLink(auth, url)) {
            // Retrieve the email the user entered before we sent the link
            let email = window.localStorage.getItem('inspectev_magic_email');
            if (!email) {
                // Fallback: ask the user to confirm their email
                email = window.prompt('Te rugam sa confirmi adresa de email pentru verificare:');
            }
            if (email) {
                await signInWithEmailLink(auth, email, url);
                window.localStorage.removeItem('inspectev_magic_email');

                // Recover VIN from URL params or localStorage (user may return on different tab/device)
                const urlParams = new URLSearchParams(window.location.search);
                const vinFromUrl = urlParams.get('vin');
                const vinFromStorage = window.localStorage.getItem('inspectev_magic_vin');
                const recoveredVin = vinFromUrl || vinFromStorage;

                if (recoveredVin) {
                    // Store VIN for useAuthListener to pick up during post-login redirect
                    window.sessionStorage.setItem('inspectev_pending_vin', recoveredVin);
                    window.localStorage.removeItem('inspectev_magic_vin');
                }

                // Clean up the URL so the magic link params don't linger
                window.history.replaceState(null, '', window.location.pathname);
                return true;
            }
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Auth] Magic link completion failed:', e);
    }
    return false;
}

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { showToast } = useToast();
    const params = useLocalSearchParams<{ vin?: string }>();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const [isLoading, setIsLoading] = useState(false);
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

    // Magic Link state
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [email, setEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Animations
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(40)).current;
    const heroSlide = useRef(new Animated.Value(-30)).current;
    const orbFloat1 = useRef(new Animated.Value(0)).current;
    const orbFloat2 = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0.2)).current;

    // Pre-warm auth + check for OAuth redirect results on mount
    useEffect(() => {
        ensureGoogleSignInConfigured(); // native
        initWebAuth();                  // web — pre-warm

        // Check if we're returning from a Google/Apple redirect sign-in
        if (Platform.OS === 'web') {
            setIsLoading(true);
            setLoadingProvider('redirect');
            tryCompleteRedirectSignIn()
                .then((signedIn) => {
                    if (!signedIn) {
                        // Also try magic link completion
                        return tryCompleteMagicLink();
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                    setLoadingProvider(null);
                });
        }
    }, []);

    // Entry animations
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }),
            Animated.timing(slideUp, {
                toValue: 0,
                duration: 700,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(heroSlide, {
                toValue: 0,
                duration: 800,
                delay: 100,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();

        // Floating orb animations
        const orb1Loop = Animated.loop(
            Animated.sequence([
                Animated.timing(orbFloat1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(orbFloat1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const orb2Loop = Animated.loop(
            Animated.sequence([
                Animated.timing(orbFloat2, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(orbFloat2, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 0.6, duration: 3000, useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0.2, duration: 3000, useNativeDriver: true }),
            ])
        );
        orb1Loop.start();
        orb2Loop.start();
        glowLoop.start();

        return () => {
            orb1Loop.stop();
            orb2Loop.stop();
            glowLoop.stop();
        };
    }, [fadeIn, slideUp, heroSlide, orbFloat1, orbFloat2, glowPulse]);

    const handleLogin = async (provider: 'google' | 'apple') => {
        setIsLoading(true);
        setLoadingProvider(provider);

        try {
            if (Platform.OS === 'web') {
                // Use signInWithRedirect — works universally, no popup blockers.
                // After redirect completes, the user returns to this page and
                // tryCompleteRedirectSignIn() (useEffect on mount) picks up the credential.
                if (!_webAuth || !_webAuthMod) {
                    await initWebAuth();
                }
                if (!_webAuth || !_webAuthMod) {
                    throw new Error('Autentificarea nu s-a inițializat. Reîncarcă pagina și încearcă din nou.');
                }

                const { signInWithPopup, GoogleAuthProvider, OAuthProvider } = _webAuthMod;
                const auth = _webAuth;

                if (provider === 'google') {
                    await signInWithPopup(auth, new GoogleAuthProvider());
                } else {
                    const appleProvider = new OAuthProvider('apple.com');
                    appleProvider.addScope('email');
                    appleProvider.addScope('name');
                    await signInWithPopup(auth, appleProvider);
                }
                // Auth listener will handle redirect instantly after popup closes
                return;
            } else {
                const rnAuth = (await import('@react-native-firebase/auth')).default;

                if (provider === 'google') {
                    await ensureGoogleSignInConfigured();
                    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

                    try {
                        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
                    } catch {
                        throw new Error('Google Play Services nu este disponibil pe acest dispozitiv.');
                    }

                    const signInResult = await GoogleSignin.signIn();
                    const idToken = signInResult?.data?.idToken;
                    if (!idToken) {
                        throw new Error('Nu s-a putut obține token-ul Google. Încearcă din nou.');
                    }
                    const googleCredential = rnAuth.GoogleAuthProvider.credential(idToken);
                    await rnAuth().signInWithCredential(googleCredential);
                } else {
                    const AppleAuth = await import('expo-apple-authentication');
                    const isAvailable = await AppleAuth.isAvailableAsync();
                    if (!isAvailable) {
                        throw new Error('Apple Sign-In nu este disponibil pe acest dispozitiv.');
                    }

                    const appleCredential = await AppleAuth.signInAsync({
                        requestedScopes: [
                            AppleAuth.AppleAuthenticationScope.EMAIL,
                            AppleAuth.AppleAuthenticationScope.FULL_NAME,
                        ],
                    });

                    const { identityToken, authorizationCode } = appleCredential;
                    if (!identityToken) {
                        throw new Error('Nu s-a putut obține token-ul Apple. Încearcă din nou.');
                    }
                    const credential = rnAuth.AppleAuthProvider.credential(
                        identityToken,
                        authorizationCode || '',
                    );
                    await rnAuth().signInWithCredential(credential);
                }
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error(`[Auth] ${provider} sign-in failed:`, error);
            showToast(
                'error',
                error.message || t('auth.errorGeneric') || 'Autentificarea a eșuat. Încearcă din nou.',
                4500,
            );
        } finally {
            setIsLoading(false);
            setLoadingProvider(null);
        }
    };

    const handleSendMagicLink = useCallback(async () => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError(t('auth.emailInvalid'));
            return;
        }

        setIsLoading(true);
        setLoadingProvider('email');
        setEmailError('');

        try {
            const { getAuth, sendSignInLinkToEmail } = await import('firebase/auth');
            const { app } = await getFirebaseServices();
            const auth = getAuth(app);

            // Preserve VIN in magic link return URL so auto-decode works after sign-in
            const vinSuffix = params.vin ? `?vin=${encodeURIComponent(params.vin)}` : '';
            const actionCodeSettings = {
                url: Platform.OS === 'web'
                    ? window.location.origin + '/login' + vinSuffix
                    : 'https://inspect-ev.app/login' + vinSuffix,
                handleCodeInApp: true,
            };

            await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings);

            // Store email + VIN for when they come back (possibly different tab/device)
            if (Platform.OS === 'web') {
                window.localStorage.setItem('inspectev_magic_email', trimmed);
                if (params.vin) {
                    window.localStorage.setItem('inspectev_magic_vin', params.vin);
                }
            }

            setMagicLinkSent(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('[Auth] Magic link failed:', error);
            setEmailError(error.message || t('auth.errorGeneric'));
        } finally {
            setIsLoading(false);
            setLoadingProvider(null);
        }
    }, [email, t, params.vin]);

    // ── HERO PANEL (left side on desktop, top on mobile) ──
    const renderHero = () => {
        const orb1TranslateY = orbFloat1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
        const orb2TranslateY = orbFloat2.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });

        return (
            <Animated.View style={[
                isDesktop ? styles.heroDesktop : styles.heroMobile,
                { opacity: fadeIn, transform: [{ translateX: heroSlide }] },
            ]}>
                {/* Floating orbs */}
                <Animated.View style={[styles.orb1, { opacity: glowPulse, transform: [{ translateY: orb1TranslateY }] }]} />
                <Animated.View style={[styles.orb2, { opacity: glowPulse, transform: [{ translateY: orb2TranslateY }] }]} />

                {/* Logo */}
                <View style={styles.heroLogoRow}>
                    <View style={styles.heroLogoBg}>
                        <Image
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            source={require('@/assets/images/logo-small.png')}
                            style={{ width: isDesktop ? 48 : 40, height: isDesktop ? 48 : 40, resizeMode: 'contain' }}
                        />
                    </View>
                    <View style={styles.heroLogoText}>
                        <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>
                            INSPECT<Text style={styles.heroTitleAccent}>EV</Text>
                        </Text>
                        <Text style={styles.heroBadge}>BAT — Battery Analysis Technology</Text>
                    </View>
                </View>

                {/* Tagline */}
                <Text style={[styles.heroTagline, isDesktop && styles.heroTaglineDesktop]}>
                    {t('auth.heroTagline')}
                </Text>
                <Text style={[styles.heroDescription, isDesktop && styles.heroDescriptionDesktop]}>
                    {t('auth.heroDescription')}
                </Text>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <StatBadge value="30s" label={t('auth.statSpeed')} />
                    <View style={styles.statDivider} />
                    <StatBadge value="AI" label={t('auth.statRisk')} />
                    <View style={styles.statDivider} />
                    <StatBadge value="PDF" label={t('auth.statReport')} />
                </View>

                {/* Feature list (desktop only — more space) */}
                {isDesktop && (
                    <View style={styles.heroFeatures}>
                        <HeroFeature icon="shield-checkmark" text={t('auth.features.security')} />
                        <HeroFeature icon="flash" text={t('auth.features.speed')} />
                        <HeroFeature icon="analytics" text={t('auth.features.ai')} />
                        <HeroFeature icon="car-sport" text={t('auth.features.ev')} />
                    </View>
                )}
            </Animated.View>
        );
    };

    // ── AUTH PANEL (right side on desktop, bottom on mobile) ──
    const renderAuth = () => (
        <Animated.View style={[
            isDesktop ? styles.authDesktop : styles.authMobile,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}>
            <View style={styles.authCard}>
                {/* Mobile-only: small features row */}
                {!isDesktop && (
                    <View style={styles.featuresRowMobile}>
                        <MiniFeature icon="shield-checkmark" text={t('auth.features.security')} />
                        <MiniFeature icon="flash" text={t('auth.features.speed')} />
                        <MiniFeature icon="analytics" text={t('auth.features.ai')} />
                    </View>
                )}

                <Text style={styles.authTitle}>{t('auth.welcome')}</Text>
                <Text style={styles.authSubtitle}>{t('auth.subtitle')}</Text>

                {/* Google Sign-In */}
                <Pressable
                    style={({ pressed }) => [styles.btnGoogle, pressed && styles.btnPressed]}
                    onPress={() => handleLogin('google')}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.loginGoogle')}
                    accessibilityState={{ disabled: isLoading, busy: loadingProvider === 'google' }}
                >
                    {loadingProvider === 'google' ? (
                        <ActivityIndicator size="small" color="#1A1A1A" />
                    ) : (
                        <>
                            <View style={styles.googleIconWrap}>
                                <Text style={styles.googleIconG}>G</Text>
                            </View>
                            <Text style={styles.btnGoogleText}>{t('auth.loginGoogle')}</Text>
                        </>
                    )}
                </Pressable>

                {/* Apple Sign-In — web + iOS only */}
                {Platform.OS !== 'android' && (
                    <Pressable
                        style={({ pressed }) => [styles.btnApple, pressed && styles.btnPressed]}
                        onPress={() => handleLogin('apple')}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.loginApple')}
                        accessibilityState={{ disabled: isLoading, busy: loadingProvider === 'apple' }}
                    >
                        {loadingProvider === 'apple' ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="logo-apple" size={20} color="#fff" />
                                <Text style={styles.btnAppleText}>{t('auth.loginApple')}</Text>
                            </>
                        )}
                    </Pressable>
                )}

                {/* Divider */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.orEmail')}</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Email Magic Link */}
                {!showEmailInput && !magicLinkSent && (
                    <Pressable
                        style={({ pressed }) => [styles.btnEmail, pressed && styles.btnPressed]}
                        onPress={() => setShowEmailInput(true)}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel={t('auth.loginEmail')}
                    >
                        <Ionicons name="mail-outline" size={20} color={VoltColors.neonGreen} />
                        <Text style={styles.btnEmailText}>{t('auth.loginEmail')}</Text>
                    </Pressable>
                )}

                {showEmailInput && !magicLinkSent && (
                    <View style={styles.emailSection}>
                        <TextInput
                            style={[styles.emailInput, emailError ? styles.emailInputError : null]}
                            placeholder={t('auth.emailPlaceholder')}
                            placeholderTextColor={VoltColors.textTertiary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            value={email}
                            onChangeText={(text) => { setEmail(text); setEmailError(''); }}
                            editable={!isLoading}
                        />
                        {emailError ? <Text style={styles.emailErrorText}>{emailError}</Text> : null}
                        <Pressable
                            style={({ pressed }) => [styles.btnSendLink, pressed && styles.btnPressed]}
                            onPress={handleSendMagicLink}
                            disabled={isLoading}
                            accessibilityRole="button"
                            accessibilityLabel={t('auth.sendMagicLink')}
                            accessibilityState={{ disabled: isLoading, busy: loadingProvider === 'email' }}
                        >
                            {loadingProvider === 'email' ? (
                                <ActivityIndicator size="small" color={VoltColors.bgPrimary} />
                            ) : (
                                <Text style={styles.btnSendLinkText}>{t('auth.sendMagicLink')}</Text>
                            )}
                        </Pressable>
                    </View>
                )}

                {magicLinkSent && (
                    <View style={styles.magicLinkSent}>
                        <View style={styles.magicLinkIcon}>
                            <Ionicons name="checkmark-circle" size={32} color={VoltColors.neonGreen} />
                        </View>
                        <Text style={styles.magicLinkTitle}>{t('auth.magicLinkSentTitle')}</Text>
                        <Text style={styles.magicLinkDesc}>{t('auth.magicLinkSentDesc')}</Text>
                        <Pressable
                            style={({ pressed }) => [styles.btnResend, pressed && styles.btnPressed]}
                            onPress={() => { setMagicLinkSent(false); setShowEmailInput(true); }}
                        >
                            <Text style={styles.btnResendText}>{t('auth.resendLink')}</Text>
                        </Pressable>
                    </View>
                )}

                {/* Legal consent — mandatory visibility */}
                <Text style={styles.termsText}>
                    {t('auth.legalPrefix', 'Prin crearea contului și continuarea procesului, ești de acord cu')}{' '}
                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/legal/terms')}
                    >
                        {t('auth.termsLink', 'Termenii și Condițiile')}
                    </Text>
                    {' '}{t('auth.legalAnd', 'și')}{' '}
                    <Text
                        style={styles.termsLink}
                        onPress={() => router.push('/legal/privacy')}
                    >
                        {t('auth.privacyLink', 'Politica de Confidențialitate')}
                    </Text>
                    .
                </Text>

                {/* Trust badges */}
                <View style={styles.trustRow}>
                    <TrustBadge icon="lock-closed" label="SSL" />
                    <TrustBadge icon="shield-checkmark" label="GDPR" />
                    <TrustBadge icon="card" label="Stripe" />
                    <TrustBadge icon="server" label="Firebase" />
                </View>
            </View>

            {/* Version */}
            <Text style={styles.versionText}>v1.0.0 — Romania</Text>
        </Animated.View>
    );

    // ── LAYOUT ──
    if (isDesktop) {
        return (
            <View style={styles.containerDesktop}>
                {renderHero()}
                <ScrollView
                    style={styles.authScrollDesktop}
                    contentContainerStyle={styles.authScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderAuth()}
                    <VoltFooter />
                </ScrollView>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.containerMobile}
            contentContainerStyle={styles.containerMobileContent}
            showsVerticalScrollIndicator={false}
        >
            {renderHero()}
            {renderAuth()}
            <VoltFooter />
        </ScrollView>
    );
}

// ── Sub-components ──

function StatBadge({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.statBadge}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function HeroFeature({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.heroFeatureRow}>
            <View style={styles.heroFeatureIcon}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Ionicons name={icon as any} size={16} color={VoltColors.neonGreen} />
            </View>
            <Text style={styles.heroFeatureText}>{text}</Text>
        </View>
    );
}

function MiniFeature({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.miniFeature}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Ionicons name={icon as any} size={14} color={VoltColors.neonGreen} />
            <Text style={styles.miniFeatureText}>{text}</Text>
        </View>
    );
}

function TrustBadge({ icon, label }: { icon: string; label: string }) {
    return (
        <View style={styles.trustBadge}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Ionicons name={icon as any} size={12} color={VoltColors.textTertiary} />
            <Text style={styles.trustLabel}>{label}</Text>
        </View>
    );
}

// ── Styles ──

const styles = StyleSheet.create({
    // ═══ CONTAINERS ═══
    containerDesktop: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: VoltColors.bgPrimary,
    },
    containerMobile: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    containerMobileContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },

    // ═══ HERO ═══
    heroDesktop: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 64,
        paddingVertical: 48,
        overflow: 'hidden',
        // Subtle left-panel accent
        borderRightWidth: 1,
        borderRightColor: VoltColors.border,
    },
    heroMobile: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: 60,
        paddingBottom: VoltSpacing.lg,
        overflow: 'hidden',
    },
    orb1: {
        position: 'absolute',
        top: '15%',
        left: '-10%',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(0, 230, 118, 0.08)',
    },
    orb2: {
        position: 'absolute',
        bottom: '10%',
        right: '-5%',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 188, 212, 0.06)',
    },
    heroLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: VoltSpacing.xl,
    },
    heroLogoBg: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.3)',
    },
    heroLogoText: {
        marginLeft: VoltSpacing.md,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: VoltColors.textPrimary,
        letterSpacing: 2,
    },
    heroTitleDesktop: {
        fontSize: 34,
    },
    heroTitleAccent: {
        color: VoltColors.neonGreen,
    },
    heroBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: VoltColors.textTertiary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    heroTagline: {
        fontSize: 22,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        lineHeight: 30,
        marginBottom: VoltSpacing.md,
    },
    heroTaglineDesktop: {
        fontSize: 32,
        lineHeight: 42,
    },
    heroDescription: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 22,
        marginBottom: VoltSpacing.xl,
    },
    heroDescriptionDesktop: {
        fontSize: 16,
        lineHeight: 26,
        maxWidth: 480,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.xl,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    statBadge: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: VoltColors.neonGreen,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: VoltColors.border,
    },

    // Hero features (desktop)
    heroFeatures: {
        gap: VoltSpacing.md,
    },
    heroFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.md,
    },
    heroFeatureIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroFeatureText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        fontWeight: '500',
    },

    // ═══ AUTH PANEL ═══
    authDesktop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
    },
    authScrollDesktop: {
        flex: 1,
    },
    authScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
    },
    authMobile: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.sm,
    },
    authCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.xl,
        padding: VoltSpacing.xl,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },

    // Features row (mobile)
    featuresRowMobile: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: VoltSpacing.lg,
        paddingBottom: VoltSpacing.md,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
    },
    miniFeature: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    miniFeatureText: {
        fontSize: 9,
        fontWeight: '600',
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    authTitle: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.xs,
    },
    authSubtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.lg,
    },

    // ═══ BUTTONS ═══
    btnGoogle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: VoltBorderRadius.md,
        paddingVertical: 14,
        marginBottom: VoltSpacing.sm,
        gap: VoltSpacing.sm,
    },
    btnPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.985 }],
    },
    googleIconWrap: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#4285F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIconG: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    btnGoogleText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    btnApple: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        borderRadius: VoltBorderRadius.md,
        paddingVertical: 14,
        marginBottom: VoltSpacing.sm,
        gap: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    btnAppleText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: '#fff',
    },

    // Divider
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: VoltSpacing.md,
        gap: VoltSpacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: VoltColors.border,
    },
    dividerText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Email Magic Link
    btnEmail: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderRadius: VoltBorderRadius.md,
        paddingVertical: 14,
        gap: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: VoltColors.neonGreen,
    },
    btnEmailText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: VoltColors.neonGreen,
    },
    emailSection: {
        gap: VoltSpacing.sm,
    },
    emailInput: {
        backgroundColor: VoltColors.bgInput,
        borderRadius: VoltBorderRadius.md,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: 14,
        fontSize: VoltFontSize.md,
        color: VoltColors.textPrimary,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    emailInputError: {
        borderColor: VoltColors.error,
    },
    emailErrorText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.error,
    },
    btnSendLink: {
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSendLinkText: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: VoltColors.bgPrimary,
    },

    // Magic Link Sent confirmation
    magicLinkSent: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.lg,
        gap: VoltSpacing.sm,
    },
    magicLinkIcon: {
        marginBottom: VoltSpacing.xs,
    },
    magicLinkTitle: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.neonGreen,
        textAlign: 'center',
    },
    magicLinkDesc: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    btnResend: {
        paddingVertical: VoltSpacing.sm,
        paddingHorizontal: VoltSpacing.md,
    },
    btnResendText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        textDecorationLine: 'underline',
    },

    // Legal consent
    termsText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        marginTop: VoltSpacing.lg,
        lineHeight: 18,
    },
    termsLink: {
        color: VoltColors.neonGreen,
        textDecorationLine: 'underline',
    },

    // Trust badges
    trustRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: VoltSpacing.md,
        marginTop: VoltSpacing.md,
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trustLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Version
    versionText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        marginTop: VoltSpacing.lg,
    },
});
