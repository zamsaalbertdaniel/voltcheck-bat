/**
 * InspectEV — Public Landing Page (Route: /)
 * Hero with oversized VIN input + Know-How Bento Box + Global Footer
 * Accessible without authentication.
 */

import BatteryWireframeSVG from '@/components/landing/BatteryWireframeSVG';
import BentoBox from '@/components/landing/BentoBox';
import CompatibleModelsCTA from '@/components/landing/CompatibleModelsCTA';
import HeroVinInput from '@/components/landing/HeroVinInput';
import LandingFAQ, { getFaqJsonLd } from '@/components/landing/LandingFAQ';
import VoltFooter from '@/components/layout/VoltFooter';
import { GrainOverlay, HudLabel } from '@/components/design';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltLetterSpacing,
    VoltSpacing,
} from '@/constants/Theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;

export default function LandingPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    // ?focusVin=true declanșează auto-focus pe VIN input (ex. din /modele-compatibile CTA).
    const { focusVin } = useLocalSearchParams<{ focusVin?: string }>();
    const shouldFocusVin = focusVin === 'true';

    // Animated green glow
    const glowPulse = useRef(new Animated.Value(0.15)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 0.4, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
                Animated.timing(glowPulse, { toValue: 0.15, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ])
        );
        glowLoop.start();
        return () => glowLoop.stop();
    }, [fadeIn, glowPulse]);

    const handleVinSubmit = (vin: string) => {
        if (isAuthenticated) {
            router.push({ pathname: '/(dashboard)', params: { vin } });
        } else {
            // Free preview — no login required. Shows make/model/year (NHTSA)
            // + locked teaser cards with signup CTA for the full report.
            router.push({ pathname: '/preview/[vin]', params: { vin } } as never);
        }
    };

    const glowStyle = Platform.OS === 'web'
        ? {
            background: `radial-gradient(ellipse 720px 420px at 28% 50%, rgba(0, 255, 136, 0.14) 0%, transparent 70%)`,
        }
        : {};

    // FAQPage JSON-LD schema — rebuilt when language changes so RO/EN
    // both get indexed correctly on Rich Snippets.
    const faqJsonLd = useMemo(() => JSON.stringify(getFaqJsonLd(t)), [t]);

    return (
        <>
            <Head>
                {Platform.OS === 'web' && (
                    <script
                        type="application/ld+json"
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
                    />
                )}
            </Head>
            <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
            {/* Top Navigation Bar */}
            <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
                <View style={styles.topBarLogo}>
                    <Image source={require('@/assets/images/logo-small.png')} style={styles.topBarLogoIcon} />
                    {isDesktop && (
                        <Text style={styles.topBarLogoText}>
                            INSPECT<Text style={{ color: VoltColors.neonGreen }}>EV</Text>
                        </Text>
                    )}
                </View>
                {isAuthenticated ? (
                    <Pressable
                        style={styles.topBarBtn}
                        onPress={() => router.push('/(dashboard)' as never)}
                    >
                        <Ionicons name="grid-outline" size={18} color={VoltColors.neonGreen} />
                        <Text style={styles.topBarBtnText}>
                            {t('landing.dashboard', 'Dashboard')}
                        </Text>
                    </Pressable>
                ) : (
                    <Pressable
                        style={styles.topBarBtn}
                        onPress={() => router.push({ pathname: '/login', params: { mode: 'signup' } })}
                        accessibilityRole="button"
                        accessibilityLabel={t('landing.signup', 'Creează cont')}
                    >
                        <Ionicons name="person-add-outline" size={18} color={VoltColors.neonGreen} />
                        <Text style={styles.topBarBtnText}>
                            {t('landing.signup', 'Creează cont')}
                        </Text>
                    </Pressable>
                )}
            </View>

            {/* Hero Section — Cockpit Edition (E2) */}
            <Animated.View style={[styles.hero, isDesktop && styles.heroDesktop, { opacity: fadeIn }]}>
                {/* Ambient neon glow + film grain atmosphere */}
                {Platform.OS === 'web' && (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <View style={[styles.glowOrb, glowStyle as any]} pointerEvents="none" />
                )}
                <GrainOverlay opacity={0.05} />

                <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
                    {/* ── LEFT COLUMN: editorial text + VIN panel ──────────── */}
                    <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
                        {/* HUD intro marker */}
                        <View style={styles.hudRow}>
                            <HudLabel dot color={VoltColors.neonGreen}>
                                {t('landing.hud.live', 'LIVE · EV DIAGNOSTIC GRID')}
                            </HudLabel>
                        </View>

                        <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>
                            <Text style={styles.heroTitleAccent}>INSPECT</Text>
                            <Text style={styles.heroTitleWhite}>EV</Text>
                        </Text>

                        <Text style={[styles.heroSubtitle, isDesktop && styles.heroSubtitleDesktop]}>
                            {t('landing.subtitle', 'Cumperi un EV second-hand?\nVerifică bateria înainte.')}
                        </Text>

                        <Text style={styles.heroDesc}>
                            {t('landing.desc', 'Raport AI complet cu scor de risc, analiză baterie și istoric vehicul. În 30 de secunde.')}
                        </Text>

                        <View style={styles.heroInputContainer}>
                            <HeroVinInput onSubmit={handleVinSubmit} autoFocus={shouldFocusVin} />
                        </View>

                        {/* Trust row — restyled to mono HUD */}
                        <View style={[styles.trustRow, isDesktop && styles.trustRowDesktop]}>
                            {[
                                { icon: 'timer-sand' as const, label: '30s', sub: t('landing.trust_instant', 'RAPORT INSTANT') },
                                { icon: 'robot-outline' as const, label: 'AI', sub: t('landing.trust_risk', 'SCOR DE RISC') },
                                { icon: 'file-document-outline' as const, label: 'PDF', sub: t('landing.trust_pdf', 'RAPORT OFICIAL') },
                            ].map((badge) => (
                                <View key={badge.label} style={styles.trustBadge}>
                                    <MaterialCommunityIcons name={badge.icon} size={18} color={VoltColors.neonGreen} />
                                    <Text style={styles.trustLabel}>{badge.label}</Text>
                                    <Text style={styles.trustSub}>{badge.sub}</Text>
                                </View>
                            ))}
                        </View>

                        <CompatibleModelsCTA source="landing_hero" />

                        {!isAuthenticated && (
                            <Pressable
                                style={styles.loginPrompt}
                                onPress={() => router.push('/login')}
                            >
                                <Text style={styles.loginPromptText}>
                                    {t('landing.loginPrompt', 'Ai deja cont?')}{' '}
                                    <Text style={styles.loginPromptLink}>
                                        {t('landing.loginPromptCta', 'Loghează-te cu Google sau Apple →')}
                                    </Text>
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {/* ── RIGHT COLUMN: battery wireframe visual (desktop only inline) ── */}
                    {isDesktop && (
                        <View style={styles.heroRight}>
                            <View style={styles.wireframeFrame}>
                                <HudLabel
                                    dot
                                    color={VoltColors.neonGreen}
                                    style={styles.wireframeCaption}
                                >
                                    {t('landing.hud.scanning', 'BAT·PACK · SCANNING')}
                                </HudLabel>
                                <BatteryWireframeSVG size={460} />
                                <View style={styles.wireframeFooter}>
                                    <HudLabel size={VoltFontSize.xs} color={VoltColors.textTertiary}>
                                        {t('landing.hud.celltopology', '20 CELL · ISO·VIEW')}
                                    </HudLabel>
                                    <HudLabel size={VoltFontSize.xs} color={VoltColors.neonGreen}>
                                        {t('landing.hud.integrity', 'INTEGRITY 98.4%')}
                                    </HudLabel>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Know-How Bento Box Section */}
            <BentoBox />

            {/* FAQ Section — public, accessible without auth */}
            <LandingFAQ />

            {/* Footer */}
            <VoltFooter />
        </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    scrollContent: {
        flexGrow: 1,
    },
    // Top Bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: Platform.OS === 'web' ? VoltSpacing.md : VoltSpacing.xxl,
        paddingBottom: VoltSpacing.sm,
    },
    topBarDesktop: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: VoltSpacing.xl,
    },
    topBarLogo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    topBarLogoIcon: {
        width: 26,
        height: 26,
        resizeMode: 'contain',
    },
    topBarLogoText: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: 1.5,
    },
    topBarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        backgroundColor: VoltColors.neonGreenMuted,
        borderRadius: VoltBorderRadius.full,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: VoltColors.neonGreenHairline,
    },
    topBarBtnText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.neonGreen,
    },
    // Login prompt
    loginPrompt: {
        marginTop: VoltSpacing.lg,
        alignItems: 'center',
    },
    loginPromptText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        textAlign: 'center',
    },
    loginPromptLink: {
        color: VoltColors.neonGreen,
        fontFamily: VoltFontFamily.semiBold,
    },
    hero: {
        position: 'relative',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxxl + VoltSpacing.md,
        paddingBottom: VoltSpacing.xxl,
        overflow: 'hidden',
        minHeight: 560,
    },
    heroDesktop: {
        paddingTop: VoltSpacing.xxxl + VoltSpacing.xl,
        paddingHorizontal: VoltSpacing.xl,
    },
    glowOrb: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    heroContent: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        zIndex: 1,
    },
    heroContentDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xxl,
    },
    heroLeft: {
        width: '100%',
        alignItems: 'flex-start',
    },
    heroLeftDesktop: {
        flex: 1.1,
        maxWidth: 640,
    },
    heroRight: {
        flex: 0.9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wireframeFrame: {
        position: 'relative',
        width: 500,
        maxWidth: '100%',
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.lg,
    },
    wireframeCaption: {
        position: 'absolute',
        top: 0,
        left: VoltSpacing.md,
        zIndex: 2,
    },
    wireframeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.xs,
        marginTop: VoltSpacing.sm,
    },
    hudRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: VoltSpacing.md,
    },
    heroTitle: {
        fontSize: VoltFontSize.xxxl + 8,
        fontFamily: VoltFontFamily.display,
        marginBottom: VoltSpacing.sm,
        letterSpacing: VoltLetterSpacing.tight,
    },
    heroTitleDesktop: {
        fontSize: VoltFontSize.mega,
    },
    heroTitleAccent: {
        color: VoltColors.neonGreen,
    },
    heroTitleWhite: {
        color: VoltColors.textPrimary,
    },
    heroSubtitle: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.sm,
        lineHeight: 30,
    },
    heroSubtitleDesktop: {
        fontSize: VoltFontSize.xxl,
        lineHeight: 38,
    },
    heroDesc: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.xl,
        maxWidth: 560,
        lineHeight: 24,
    },
    heroInputContainer: {
        width: '100%',
        marginBottom: VoltSpacing.xl,
    },
    trustRow: {
        flexDirection: 'row',
        gap: VoltSpacing.xl,
        marginBottom: VoltSpacing.lg,
        flexWrap: 'wrap',
    },
    trustRowDesktop: {
        gap: VoltSpacing.xxl,
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        paddingVertical: VoltSpacing.xs,
        paddingHorizontal: VoltSpacing.sm,
        borderLeftWidth: 1,
        borderLeftColor: VoltColors.neonGreenHairline,
    },
    trustLabel: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
    },
    trustSub: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.textTertiary,
        letterSpacing: VoltLetterSpacing.wide,
    },
});
