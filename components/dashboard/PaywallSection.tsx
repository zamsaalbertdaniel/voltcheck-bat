/**
 * InspectEV — Paywall Section
 * Standard (99 RON) vs Premium (120 RON) pricing cards.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;

interface PaywallSectionProps {
    isPaying: boolean;
    errorMessage: string;
    onSelect: (level: 1 | 2) => void;
    level2Eligible: boolean | null;
}

export default function PaywallSection({ isPaying, errorMessage, onSelect, level2Eligible }: PaywallSectionProps) {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>
                {t('paywall.title', 'Alege pachetul potrivit')}
            </Text>

            {errorMessage ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={VoltColors.error} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            ) : null}

            <View style={[styles.cardsRow, isDesktop && styles.cardsRowDesktop]}>
                {/* Standard Package */}
                <Pressable
                    style={({ pressed }) => [
                        styles.card,
                        pressed && styles.cardPressed,
                    ]}
                    onPress={() => onSelect(1)}
                    disabled={isPaying}
                >
                    {isPaying && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={VoltColors.neonGreen} />
                        </View>
                    )}
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="shield-search" size={28} color={VoltColors.neonGreen} />
                        <Text style={styles.cardLabel}>
                            {t('paywall.standard', 'STANDARD')}
                        </Text>
                    </View>
                    <Text style={styles.price}>99 <Text style={styles.currency}>RON</Text></Text>
                    <Text style={styles.cardSubtitle}>
                        {t('paywall.standard_desc', 'Baterie (SoH) + AI Risk Score')}
                    </Text>
                    <View style={styles.featureList}>
                        <Feature text={t('paywall.feat_vin', 'Decodare VIN completă')} />
                        <Feature text={t('paywall.feat_soh', 'Scor sănătate baterie (SoH)')} />
                        <Feature text={t('paywall.feat_ai', 'AI Risk Score')} />
                        <Feature text={t('paywall.feat_recalls', 'Rechemări producător')} />
                        <Feature text={t('paywall.feat_pdf', 'Raport PDF descărcabil')} />
                    </View>
                    <View style={styles.ctaButton}>
                        <Text style={styles.ctaText}>{t('paywall.select', 'Selectează')}</Text>
                    </View>
                </Pressable>

                {/* Premium Package */}
                <Pressable
                    style={({ pressed }) => [
                        styles.card,
                        styles.cardPremium,
                        pressed && styles.cardPressed,
                    ]}
                    onPress={() => onSelect(2)}
                    disabled={isPaying || level2Eligible === false}
                >
                    {isPaying && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={VoltColors.neonGreen} />
                        </View>
                    )}
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>
                            {t('paywall.popular', 'RECOMANDAT')}
                        </Text>
                    </View>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="shield-star" size={28} color={VoltColors.neonGreen} />
                        <Text style={styles.cardLabel}>
                            {t('paywall.premium', 'PREMIUM')}
                        </Text>
                    </View>
                    <Text style={styles.price}>120 <Text style={styles.currency}>RON</Text></Text>
                    <Text style={styles.cardSubtitle}>
                        {t('paywall.premium_desc', 'Baterie + Daune CarVertical + Certificat')}
                    </Text>
                    <View style={styles.featureList}>
                        <Feature text={t('paywall.feat_all_standard', 'Tot din pachetul Standard')} included />
                        <Feature text={t('paywall.feat_damage', 'Istoric daune CarVertical')} premium />
                        <Feature text={t('paywall.feat_mileage', 'Verificare kilometraj')} premium />
                        <Feature text={t('paywall.feat_theft', 'Verificare furt')} premium />
                        <Feature text={t('paywall.feat_cert', 'Certificat complet InspectEV')} premium />
                    </View>
                    <View style={[styles.ctaButton, styles.ctaPremium]}>
                        <Text style={styles.ctaTextPremium}>{t('paywall.select', 'Selectează')}</Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

function Feature({ text, included, premium }: { text: string; included?: boolean; premium?: boolean }) {
    return (
        <View style={featureStyles.row}>
            <Ionicons
                name={premium ? 'star' : 'checkmark-circle'}
                size={16}
                color={premium ? VoltColors.warning : VoltColors.neonGreen}
            />
            <Text style={[featureStyles.text, included && featureStyles.textMuted]}>{text}</Text>
        </View>
    );
}

const featureStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        paddingVertical: 3,
    },
    text: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        flex: 1,
    },
    textMuted: {
        color: VoltColors.textTertiary,
    },
});

const styles = StyleSheet.create({
    container: {
        marginTop: VoltSpacing.xl,
    },
    sectionTitle: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.lg,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: 'rgba(255, 23, 68, 0.1)',
        borderRadius: VoltBorderRadius.sm,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.md,
    },
    errorText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.error,
        flex: 1,
    },
    cardsRow: {
        gap: VoltSpacing.md,
    },
    cardsRowDesktop: {
        flexDirection: 'row',
    },
    card: {
        flex: 1,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        position: 'relative',
        overflow: 'hidden',
    },
    cardPremium: {
        borderColor: VoltColors.neonGreen,
        borderWidth: 2,
        ...VoltShadow.glow,
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 14, 23, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: VoltBorderRadius.lg,
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: VoltColors.neonGreen,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderBottomLeftRadius: VoltBorderRadius.sm,
        borderTopRightRadius: VoltBorderRadius.lg - 2,
    },
    popularText: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
        letterSpacing: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.sm,
    },
    cardLabel: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textTertiary,
        letterSpacing: 2,
    },
    price: {
        fontSize: VoltFontSize.xxxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.xs,
    },
    currency: {
        fontSize: VoltFontSize.lg,
        color: VoltColors.textSecondary,
    },
    cardSubtitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.md,
    },
    featureList: {
        marginBottom: VoltSpacing.lg,
    },
    ctaButton: {
        backgroundColor: VoltColors.bgTertiary,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: VoltSpacing.md,
        alignItems: 'center',
    },
    ctaPremium: {
        backgroundColor: VoltColors.neonGreen,
    },
    ctaText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
    },
    ctaTextPremium: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
});
