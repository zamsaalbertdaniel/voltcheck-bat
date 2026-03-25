/**
 * VoltCheck — Level Selector
 * Extracted from ScanScreen (index.tsx).
 * Shows Level 1 (Detective) and Level 2 (Surgeon) cards with features + price.
 * Also renders the "paying" spinner overlay.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface LevelSelectorProps {
    selectedLevel: 1 | 2 | null;
    isPaying: boolean;
    spinRotation: Animated.AnimatedInterpolation<string>;
    errorMessage: string;
    onSelect: (level: 1 | 2) => void;
}

export default function LevelSelector({
    selectedLevel,
    isPaying,
    spinRotation,
    errorMessage,
    onSelect,
}: LevelSelectorProps) {
    const { t } = useTranslation();

    return (
        <>
            {errorMessage ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={VoltColors.error} />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
            ) : null}

            <View style={styles.levelsSection}>
                <Text style={styles.levelsTitle}>{t('levels.select')}</Text>

                {/* Level 1 — The Detective */}
                <TouchableOpacity
                    style={[
                        styles.levelCard,
                        selectedLevel === 1 ? styles.levelCardSelected : null,
                    ]}
                    onPress={() => onSelect(1)}
                    disabled={isPaying}
                >
                    <View style={styles.levelHeader}>
                        <View style={styles.levelIconContainer}>
                            <FontAwesome name="search" size={24} color={VoltColors.neonGreen} />
                        </View>
                        <View style={styles.levelInfo}>
                            <Text style={styles.levelName}>{t('levels.level1.name')}</Text>
                            <Text style={styles.levelDesc}>{t('levels.level1.description')}</Text>
                        </View>
                        <View style={styles.priceTag}>
                            <Text style={styles.priceText}>{t('levels.level1.price')}</Text>
                        </View>
                    </View>
                    <View style={styles.featuresList}>
                        {(t('levels.level1.features', { returnObjects: true }) as string[]).map(
                            (feature: string, i: number) => (
                                <View key={i} style={styles.featureItem}>
                                    <Ionicons name="checkmark-circle" size={16} color={VoltColors.neonGreen} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            )
                        )}
                    </View>
                </TouchableOpacity>

                {/* Level 2 — The Surgeon */}
                <TouchableOpacity
                    style={[
                        styles.levelCard,
                        styles.levelCardPremium,
                        selectedLevel === 2 ? styles.levelCardSelected : null,
                    ]}
                    onPress={() => onSelect(2)}
                    disabled={isPaying}
                >
                    <View style={styles.premiumBadge}>
                        <Text style={styles.premiumText}>⚡ {t('scan.recommendation')}</Text>
                    </View>
                    <View style={styles.levelHeader}>
                        <View style={[styles.levelIconContainer, styles.levelIconPremium]}>
                            <MaterialCommunityIcons name="stethoscope" size={24} color={VoltColors.neonGreen} />
                        </View>
                        <View style={styles.levelInfo}>
                            <Text style={styles.levelName}>{t('levels.level2.name')}</Text>
                            <Text style={styles.levelDesc}>{t('levels.level2.description')}</Text>
                        </View>
                        <View style={[styles.priceTag, styles.priceTagPremium]}>
                            <Text style={styles.priceText}>{t('levels.level2.price')}</Text>
                        </View>
                    </View>
                    <View style={styles.featuresList}>
                        {(t('levels.level2.features', { returnObjects: true }) as string[]).map(
                            (feature: string, i: number) => (
                                <View key={i} style={styles.featureItem}>
                                    <Ionicons name="checkmark-circle" size={16} color={VoltColors.neonGreen} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            )
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {isPaying && (
                <View style={styles.decodingContainer}>
                    <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                        <Ionicons name="card" size={32} color={VoltColors.neonGreen} />
                    </Animated.View>
                    <Text style={styles.decodingText}>{t('payment.secure')}</Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 23, 68, 0.1)',
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 23, 68, 0.3)',
        gap: VoltSpacing.sm,
    },
    errorBannerText: {
        flex: 1,
        fontSize: VoltFontSize.sm,
        color: VoltColors.error,
    },
    levelsSection: {
        marginBottom: VoltSpacing.lg,
    },
    levelsTitle: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.md,
    },
    levelCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginBottom: VoltSpacing.md,
        borderWidth: 1.5,
        borderColor: VoltColors.border,
        ...VoltShadow.md,
    },
    levelCardPremium: {
        borderColor: VoltColors.neonGreenMuted,
        backgroundColor: VoltColors.bgTertiary,
    },
    levelCardSelected: {
        borderColor: VoltColors.neonGreen,
    },
    premiumBadge: {
        position: 'absolute',
        top: -10,
        right: VoltSpacing.md,
        backgroundColor: VoltColors.neonGreen,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 3,
        borderRadius: VoltBorderRadius.sm,
    },
    premiumText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '800',
        color: VoltColors.textOnGreen,
    },
    levelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: VoltSpacing.md,
    },
    levelIconContainer: {
        width: 48,
        height: 48,
        borderRadius: VoltBorderRadius.md,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelIconPremium: {
        backgroundColor: VoltColors.neonGreenGlow,
    },
    levelInfo: {
        flex: 1,
        marginLeft: VoltSpacing.md,
    },
    levelName: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    levelDesc: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginTop: 2,
    },
    priceTag: {
        backgroundColor: VoltColors.bgInput,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.sm,
    },
    priceTagPremium: {
        backgroundColor: VoltColors.neonGreenMuted,
    },
    priceText: {
        fontSize: VoltFontSize.md,
        fontWeight: '800',
        color: VoltColors.neonGreen,
    },
    featuresList: {
        gap: VoltSpacing.sm,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    featureText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
    },
    decodingContainer: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    decodingText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.neonGreen,
        fontWeight: '600',
    },
});
