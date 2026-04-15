/**
 * InspectEV — Public VIN Preview (Route: /preview/[vin])
 *
 * Free, unauthenticated preview powered by NHTSA VPIC (public API, no key).
 * Shows basic vehicle identity (Make / Model / Year / Fuel type) to build trust,
 * then presents locked teaser cards for the premium report (battery, damage,
 * risk score) with a clear signup CTA.
 *
 * Conversion funnel:
 *   Landing VIN input  →  /preview/[vin]  →  /login?mode=signup&vin=XXX  →  Dashboard paywall
 */

import VoltFooter from '@/components/layout/VoltFooter';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { decodeVIN, isValidVIN } from '@/utils/vinDecoder';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface NhtsaResult {
    make?: string;
    model?: string;
    modelYear?: string;
    fuelTypePrimary?: string;
    electrificationLevel?: string;
    bodyClass?: string;
    manufacturer?: string;
    driveType?: string;
}

async function decodeNhtsa(vin: string, signal?: AbortSignal): Promise<NhtsaResult> {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`NHTSA ${res.status}`);
    const json = (await res.json()) as { Results?: { Variable: string; Value: string | null }[] };

    const pick = (label: string) =>
        json.Results?.find((r) => r.Variable === label)?.Value || undefined;

    return {
        make: pick('Make') || undefined,
        model: pick('Model') || undefined,
        modelYear: pick('Model Year') || undefined,
        fuelTypePrimary: pick('Fuel Type - Primary') || undefined,
        electrificationLevel: pick('Electrification Level') || undefined,
        bodyClass: pick('Body Class') || undefined,
        manufacturer: pick('Manufacturer Name') || undefined,
        driveType: pick('Drive Type') || undefined,
    };
}

export default function VinPreviewScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { vin: vinParam } = useLocalSearchParams<{ vin: string }>();
    const vin = (vinParam || '').toUpperCase().trim();

    const [nhtsa, setNhtsa] = useState<NhtsaResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!vin || !isValidVIN(vin)) {
            setError(t('preview.invalidVin', 'VIN invalid. Verifică că are exact 17 caractere.'));
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        (async () => {
            try {
                const result = await decodeNhtsa(vin, controller.signal);
                setNhtsa(result);
                Animated.timing(fadeIn, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }).start();
            } catch (e) {
                if ((e as Error).name !== 'AbortError') {
                    // Fallback to local decode — still useful (manufacturer + year)
                    const local = decodeVIN(vin);
                    setNhtsa({
                        make: local.manufacturer !== 'Unknown' ? local.manufacturer : undefined,
                        modelYear: local.year ? String(local.year) : undefined,
                    });
                    Animated.timing(fadeIn, {
                        toValue: 1,
                        duration: 500,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }).start();
                }
            } finally {
                setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [vin, t, fadeIn]);

    const handleSignup = () => {
        router.push({ pathname: '/login', params: { mode: 'signup', vin } });
    };

    const handleBack = () => {
        router.replace('/');
    };

    const localDecode = vin && isValidVIN(vin) ? decodeVIN(vin) : null;
    const displayMake = nhtsa?.make || localDecode?.manufacturer;
    const displayModel = nhtsa?.model;
    const displayYear = nhtsa?.modelYear || (localDecode?.year ? String(localDecode.year) : undefined);
    const isEV =
        nhtsa?.electrificationLevel &&
        !/^\s*$/.test(nhtsa.electrificationLevel) &&
        !/not applicable/i.test(nhtsa.electrificationLevel);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
            {/* Top bar */}
            <View style={styles.topBar}>
                <Pressable style={styles.backBtn} onPress={handleBack} accessibilityRole="button" accessibilityLabel={t('common.back', 'Înapoi')}>
                    <Ionicons name="chevron-back" size={22} color={VoltColors.textPrimary} />
                    <Text style={styles.backText}>{t('common.back', 'Înapoi')}</Text>
                </Pressable>
                <Image
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    source={require('@/assets/images/logo-small.png')}
                    style={styles.logo}
                />
            </View>

            {/* VIN header */}
            <View style={styles.header}>
                <Text style={styles.label}>{t('preview.vinLabel', 'VIN analizat')}</Text>
                <Text style={styles.vinText}>{vin}</Text>
            </View>

            {loading && (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                    <Text style={styles.loadingText}>
                        {t('preview.decoding', 'Decodăm VIN-ul...')}
                    </Text>
                </View>
            )}

            {!loading && error && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={48} color={VoltColors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.ctaSecondary} onPress={handleBack}>
                        <Text style={styles.ctaSecondaryText}>
                            {t('preview.tryAnother', 'Încearcă alt VIN')}
                        </Text>
                    </Pressable>
                </View>
            )}

            {!loading && !error && nhtsa && (
                <Animated.View style={{ opacity: fadeIn }}>
                    {/* Free vehicle identity card */}
                    <View style={styles.vehicleCard}>
                        <View style={styles.vehicleHeader}>
                            <MaterialCommunityIcons
                                name={isEV ? 'car-electric' : 'car'}
                                size={28}
                                color={VoltColors.neonGreen}
                            />
                            <View style={styles.freeBadge}>
                                <Text style={styles.freeBadgeText}>{t('preview.freeBadge', 'GRATUIT')}</Text>
                            </View>
                        </View>

                        <Text style={styles.vehicleTitle}>
                            {displayMake || '—'}
                            {displayModel ? ` ${displayModel}` : ''}
                        </Text>
                        <Text style={styles.vehicleYear}>
                            {displayYear || t('preview.unknownYear', 'An necunoscut')}
                        </Text>

                        <View style={styles.vehicleMeta}>
                            {nhtsa.fuelTypePrimary && (
                                <View style={styles.metaChip}>
                                    <MaterialCommunityIcons
                                        name="gas-station"
                                        size={14}
                                        color={VoltColors.textSecondary}
                                    />
                                    <Text style={styles.metaChipText}>{nhtsa.fuelTypePrimary}</Text>
                                </View>
                            )}
                            {isEV && nhtsa.electrificationLevel && (
                                <View style={styles.metaChip}>
                                    <MaterialCommunityIcons
                                        name="flash"
                                        size={14}
                                        color={VoltColors.neonGreen}
                                    />
                                    <Text style={[styles.metaChipText, { color: VoltColors.neonGreen }]}>
                                        {nhtsa.electrificationLevel}
                                    </Text>
                                </View>
                            )}
                            {nhtsa.bodyClass && (
                                <View style={styles.metaChip}>
                                    <MaterialCommunityIcons
                                        name="car-side"
                                        size={14}
                                        color={VoltColors.textSecondary}
                                    />
                                    <Text style={styles.metaChipText}>{nhtsa.bodyClass}</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.sourceNote}>
                            {t('preview.sourceNote', 'Date publice NHTSA VPIC')}
                        </Text>
                    </View>

                    {/* Locked teaser section */}
                    <Text style={styles.sectionTitle}>
                        {t('preview.lockedTitle', 'Deblochează raportul complet')}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        {t('preview.lockedSubtitle', 'Pentru analiză baterie, istoric daune și scor AI de risc — creează cont.')}
                    </Text>

                    {[
                        {
                            icon: 'battery-heart-variant' as const,
                            title: t('preview.lock_battery_title', 'Sănătatea bateriei'),
                            desc: t('preview.lock_battery_desc', 'SoH %, degradare, pierdere capacitate estimată'),
                        },
                        {
                            icon: 'car-wrench' as const,
                            title: t('preview.lock_damage_title', 'Istoric daune și recall-uri'),
                            desc: t('preview.lock_damage_desc', 'Accidente declarate, recall-uri NHTSA active, kilometraj'),
                        },
                        {
                            icon: 'shield-star' as const,
                            title: t('preview.lock_risk_title', 'Scor de risc AI'),
                            desc: t('preview.lock_risk_desc', 'Evaluare probabilistică 0-100 cu explicații pe factori'),
                        },
                    ].map((card) => (
                        <View key={card.title} style={styles.lockedCard}>
                            <MaterialCommunityIcons
                                name={card.icon}
                                size={22}
                                color={VoltColors.textTertiary}
                            />
                            <View style={styles.lockedContent}>
                                <Text style={styles.lockedTitle}>{card.title}</Text>
                                <Text style={styles.lockedDesc}>{card.desc}</Text>
                            </View>
                            <Ionicons name="lock-closed" size={18} color={VoltColors.textTertiary} />
                        </View>
                    ))}

                    {/* Primary CTA */}
                    <Pressable
                        style={styles.ctaPrimary}
                        onPress={handleSignup}
                        accessibilityRole="button"
                        accessibilityLabel={t('preview.ctaSignup', 'Creează cont gratuit')}
                    >
                        <MaterialCommunityIcons name="rocket-launch" size={20} color={VoltColors.textOnGreen} />
                        <Text style={styles.ctaPrimaryText}>
                            {t('preview.ctaSignup', 'Creează cont gratuit')}
                        </Text>
                    </Pressable>

                    <Text style={styles.pricingHint}>
                        {t('preview.pricingHint', 'Standard 99 RON · Premium 120 RON / raport')}
                    </Text>

                    <Pressable
                        style={styles.ctaSecondary}
                        onPress={() => router.push({ pathname: '/login', params: { vin } })}
                        accessibilityRole="button"
                        accessibilityLabel={t('preview.ctaLogin', 'Ai cont? Loghează-te')}
                    >
                        <Text style={styles.ctaSecondaryText}>
                            {t('preview.ctaLogin', 'Ai cont? Loghează-te →')}
                        </Text>
                    </Pressable>
                </Animated.View>
            )}

            <VoltFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    scrollContent: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: Platform.OS === 'web' ? VoltSpacing.md : VoltSpacing.xxl,
        paddingBottom: VoltSpacing.xxl,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: VoltSpacing.lg,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        paddingVertical: VoltSpacing.xs,
    },
    backText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textPrimary,
        fontFamily: VoltFontFamily.medium,
    },
    logo: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    header: {
        marginBottom: VoltSpacing.xl,
    },
    label: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        letterSpacing: 1.5,
        fontFamily: VoltFontFamily.semiBold,
        marginBottom: VoltSpacing.xs,
    },
    vinText: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: 1,
    },
    loadingBox: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xxxl,
        gap: VoltSpacing.md,
    },
    loadingText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
    },
    errorBox: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xxl,
        gap: VoltSpacing.md,
    },
    errorText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        maxWidth: 320,
    },
    vehicleCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        marginBottom: VoltSpacing.xl,
        ...VoltShadow.md,
    },
    vehicleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: VoltSpacing.md,
    },
    freeBadge: {
        backgroundColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 4,
        borderRadius: VoltBorderRadius.full,
    },
    freeBadgeText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.neonGreen,
        fontFamily: VoltFontFamily.bold,
        letterSpacing: 1,
    },
    vehicleTitle: {
        fontSize: VoltFontSize.xxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.xs,
    },
    vehicleYear: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.md,
    },
    vehicleMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.sm,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: VoltColors.bgInput,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 6,
        borderRadius: VoltBorderRadius.full,
    },
    metaChipText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
        fontFamily: VoltFontFamily.medium,
    },
    sourceNote: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        marginTop: VoltSpacing.sm,
    },
    sectionTitle: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.xs,
    },
    sectionSubtitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.lg,
        lineHeight: 20,
    },
    lockedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.md,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        borderWidth: 1,
        borderColor: VoltColors.border,
        marginBottom: VoltSpacing.sm,
        opacity: 0.75,
    },
    lockedContent: {
        flex: 1,
    },
    lockedTitle: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
        marginBottom: 2,
    },
    lockedDesc: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        lineHeight: 16,
    },
    ctaPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.lg,
        paddingVertical: VoltSpacing.md,
        marginTop: VoltSpacing.lg,
    },
    ctaPrimaryText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
    pricingHint: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        marginTop: VoltSpacing.sm,
    },
    ctaSecondary: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.md,
        marginTop: VoltSpacing.sm,
    },
    ctaSecondaryText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.neonGreen,
        fontFamily: VoltFontFamily.semiBold,
    },
});
