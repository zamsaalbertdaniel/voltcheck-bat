/**
 * InspectEV — Modele Compatibile (Ruta /modele-compatibile)
 * Pagină publică, statică, optimizată SEO: prezintă brandurile și modelele
 * EV acoperite integral de pachetul Premium + CTA către landing pentru
 * cazurile neacoperite direct (pachet Standard).
 */

import BrandBentoCard from '@/components/compat/BrandBentoCard';
import VoltFooter from '@/components/layout/VoltFooter';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { BRANDS } from '@/data/brands';
import { useAuthStore } from '@/store/useAuthStore';
import { searchBrands } from '@/utils/brandSearch';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const DESKTOP_BREAKPOINT = 900;
const TABLET_BREAKPOINT = 600;

export default function ModeleCompatibilePage() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { width } = useWindowDimensions();
    const [query, setQuery] = useState('');
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const isTablet = Platform.OS === 'web' && width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
    const columns = isDesktop ? 3 : isTablet ? 2 : 1;
    const cardWidthPercent = `${100 / columns}%` as const;

    const results = useMemo(() => searchBrands(query, BRANDS), [query]);

    const handleCtaPress = () => {
        router.push({ pathname: '/', params: { focusVin: 'true' } });
    };

    const glowStyle =
        Platform.OS === 'web'
            ? {
                  background:
                      'radial-gradient(ellipse 800px 500px at center, rgba(0, 230, 118, 0.15) 0%, transparent 70%)',
              }
            : {};

    const isRo = i18n.language === 'ro';
    const seoTitle = isRo
        ? 'Modele Auto Compatibile | InspectEV'
        : 'Compatible Car Models | InspectEV';
    const seoDescription = isRo
        ? 'Descoperă toate brandurile și modelele de mașini electrice acoperite de InspectEV. Tesla, Volkswagen, BMW, Hyundai, Kia, Mercedes-Benz și alte 9 branduri premium cu diagnoză live baterie.'
        : 'Discover all electric car brands and models covered by InspectEV. Tesla, Volkswagen, BMW, Hyundai, Kia, Mercedes-Benz and 9 other premium brands with live battery diagnostics.';

    return (
        <>
            <Head>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDescription} />
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDescription} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.inspect-ev.app/modele-compatibile" />
                <link rel="canonical" href="https://www.inspect-ev.app/modele-compatibile" />
            </Head>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                {/* Top Nav */}
                <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
                    <Pressable
                        style={styles.topBarLogo}
                        onPress={() => router.push('/')}
                        accessibilityRole="link"
                        accessibilityLabel={t('compat.backHome', 'Înapoi la pagina principală')}
                    >
                        <Image
                            source={require('@/assets/images/logo-small.png')}
                            style={styles.topBarLogoIcon}
                        />
                        {isDesktop && (
                            <Text style={styles.topBarLogoText}>
                                INSPECT<Text style={{ color: VoltColors.neonGreen }}>EV</Text>
                            </Text>
                        )}
                    </Pressable>
                    <Pressable
                        style={styles.topBarBtn}
                        onPress={() =>
                            isAuthenticated
                                ? router.push('/(dashboard)' as never)
                                : router.push('/login')
                        }
                    >
                        <Ionicons
                            name={isAuthenticated ? 'grid-outline' : 'log-in-outline'}
                            size={18}
                            color={VoltColors.neonGreen}
                        />
                        <Text style={styles.topBarBtnText}>
                            {isAuthenticated
                                ? t('landing.dashboard', 'Dashboard')
                                : t('compat.login', 'Conectează-te')}
                        </Text>
                    </Pressable>
                </View>

                {/* Hero Section */}
                <View style={styles.hero}>
                    {Platform.OS === 'web' && (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <View style={[styles.glowOrb, glowStyle as any]} pointerEvents="none" />
                    )}

                    <View style={styles.heroContent}>
                        <Animated.View
                            entering={FadeInDown.duration(500)}
                            style={styles.badge}
                        >
                            <MaterialCommunityIcons
                                name="shield-star"
                                size={16}
                                color={VoltColors.neonGreen}
                            />
                            <Text style={styles.badgeText}>
                                {t('compat.badge', 'PACHET PREMIUM')}
                            </Text>
                        </Animated.View>

                        <Animated.Text
                            entering={FadeInDown.duration(600).delay(100)}
                            style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}
                        >
                            {t('compat.title', 'Modele Compatibile')}
                        </Animated.Text>

                        <Animated.Text
                            entering={FadeInDown.duration(600).delay(200)}
                            style={styles.heroSubtitle}
                        >
                            {t(
                                'compat.subtitle',
                                'Peste 50 de modele EV acoperite integral cu diagnoză live a bateriei și scor de risc AI.'
                            )}
                        </Animated.Text>

                        {/* Smart Search */}
                        <Animated.View
                            entering={FadeIn.duration(500).delay(300)}
                            style={styles.searchWrapper}
                        >
                            <Ionicons
                                name="search"
                                size={20}
                                color={VoltColors.textTertiary}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                value={query}
                                onChangeText={setQuery}
                                placeholder={t(
                                    'compat.searchPlaceholder',
                                    'Caută brand sau model (ex. Tesla, Ioniq, ID.4)'
                                )}
                                placeholderTextColor={VoltColors.textTertiary}
                                autoCorrect={false}
                                returnKeyType="search"
                                accessibilityLabel={t(
                                    'compat.searchA11y',
                                    'Caută brand sau model EV'
                                )}
                            />
                            {query.length > 0 && (
                                <Pressable
                                    onPress={() => setQuery('')}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('compat.clearSearch', 'Șterge căutarea')}
                                    style={styles.clearBtn}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={18}
                                        color={VoltColors.textTertiary}
                                    />
                                </Pressable>
                            )}
                        </Animated.View>

                        <Text
                            style={styles.resultsCount}
                            accessibilityLiveRegion="polite"
                            accessibilityRole="text"
                        >
                            {results.length === 0
                                ? t('compat.noResults', 'Niciun brand nu corespunde căutării')
                                : t('compat.resultsCount', '{{count}} branduri afișate', {
                                      count: results.length,
                                  })}
                        </Text>
                    </View>
                </View>

                {/* Results Grid */}
                <View style={[styles.gridWrapper, isDesktop && styles.gridWrapperDesktop]}>
                    <View style={styles.grid}>
                        {results.map((result, idx) => (
                            <View
                                key={result.brand.id}
                                style={[styles.gridItem, { width: cardWidthPercent }]}
                            >
                                <BrandBentoCard
                                    brand={result.brand}
                                    models={result.matchedModels}
                                    index={idx}
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* FAQ + CTA Fallback */}
                <View style={[styles.faqWrapper, isDesktop && styles.faqWrapperDesktop]}>
                    <Animated.View
                        entering={FadeInDown.duration(600).delay(200)}
                        style={styles.faqCard}
                    >
                        <View style={styles.faqIcon}>
                            <MaterialCommunityIcons
                                name="help-circle-outline"
                                size={32}
                                color={VoltColors.neonGreen}
                            />
                        </View>
                        <Text style={styles.faqTitle}>
                            {t('compat.faqTitle', 'Mașina ta nu e în listă?')}
                        </Text>
                        <Text style={styles.faqBody}>
                            {t(
                                'compat.faqBody',
                                'Acoperim complet (Premium) brandurile de mai sus cu diagnoză live a bateriei și SoH certificat. Pentru orice alt vehicul electric, pachetul Standard oferă oricum: decodare VIN completă, scor de risc AI, istoric accidente, rechemări (recalls) și raport PDF — fără Smartcar live, dar complet pentru o evaluare pre-cumpărare.'
                            )}
                        </Text>

                        <Pressable
                            style={({ pressed }) => [
                                styles.ctaBtn,
                                pressed && styles.ctaBtnPressed,
                            ]}
                            onPress={handleCtaPress}
                            accessibilityRole="button"
                            accessibilityLabel={t(
                                'compat.ctaA11y',
                                'Verifică acum un VIN — pachet Standard'
                            )}
                        >
                            <Ionicons
                                name="flash"
                                size={20}
                                color={VoltColors.textOnGreen}
                            />
                            <Text style={styles.ctaBtnText}>
                                {t('compat.cta', 'Verifică acum un VIN')}
                            </Text>
                            <Ionicons
                                name="arrow-forward"
                                size={20}
                                color={VoltColors.textOnGreen}
                            />
                        </Pressable>
                    </Animated.View>
                </View>

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
        borderColor: 'rgba(0, 230, 118, 0.25)',
    },
    topBarBtnText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.neonGreen,
    },
    // Hero
    hero: {
        position: 'relative',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xl,
        paddingBottom: VoltSpacing.xl,
        alignItems: 'center',
        overflow: 'hidden',
    },
    glowOrb: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    heroContent: {
        alignItems: 'center',
        maxWidth: 800,
        width: '100%',
        zIndex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        backgroundColor: VoltColors.neonGreenMuted,
        borderRadius: VoltBorderRadius.full,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs + 2,
        marginBottom: VoltSpacing.lg,
    },
    badgeText: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.neonGreen,
        letterSpacing: 1.5,
    },
    heroTitle: {
        fontSize: VoltFontSize.xxxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.md,
    },
    heroTitleDesktop: {
        fontSize: VoltFontSize.display,
    },
    heroSubtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        marginBottom: VoltSpacing.xl,
        maxWidth: 600,
        lineHeight: 22,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgInput,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        paddingHorizontal: VoltSpacing.md,
        height: 56,
        width: '100%',
        maxWidth: 600,
        marginBottom: VoltSpacing.md,
    },
    searchIcon: {
        marginRight: VoltSpacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textPrimary,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    } as object,
    clearBtn: {
        padding: VoltSpacing.xs,
    },
    resultsCount: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontFamily: VoltFontFamily.medium,
        letterSpacing: 0.5,
    },
    // Grid
    gridWrapper: {
        paddingHorizontal: VoltSpacing.md,
        paddingBottom: VoltSpacing.xxl,
    },
    gridWrapperDesktop: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: VoltSpacing.xl,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -(VoltSpacing.sm),
    },
    gridItem: {
        padding: VoltSpacing.sm,
    },
    // FAQ + CTA
    faqWrapper: {
        paddingHorizontal: VoltSpacing.lg,
        paddingBottom: VoltSpacing.xxxl,
    },
    faqWrapperDesktop: {
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%',
    },
    faqCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.xl,
        borderWidth: 1,
        borderColor: VoltColors.border,
        padding: VoltSpacing.xl,
        alignItems: 'center',
    },
    faqIcon: {
        marginBottom: VoltSpacing.md,
    },
    faqTitle: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.md,
    },
    faqBody: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 700,
        marginBottom: VoltSpacing.xl,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.lg,
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.md,
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaBtnPressed: {
        backgroundColor: VoltColors.neonGreenDark,
        transform: [{ scale: 0.97 }],
    },
    ctaBtnText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
        letterSpacing: 0.5,
    },
});
