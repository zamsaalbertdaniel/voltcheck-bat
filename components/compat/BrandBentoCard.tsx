/**
 * InspectEV — Brand Bento Card (pentru /modele-compatibile)
 * Glassmorphism card care afișează:
 *   - Logo textual al brandului (tipografie minimalistă, tracking crescut)
 *   - Listă de modele cu bifă ✅ (Ionicons checkmark-circle pentru consistență cross-platform)
 *   - Halo subtil în culoarea accentului brandului
 *
 * Poate primi o listă filtrată de modele (ex. când Smart Search a returnat doar
 * un subset de modele ce se potrivesc cu query-ul).
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import type { BrandInfo, CarModel } from '@/types/brands';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface BrandBentoCardProps {
    brand: BrandInfo;
    /** Opțional — dacă e furnizat, card-ul afișează doar aceste modele (subset al brand.models). */
    models?: CarModel[];
}

export default function BrandBentoCard({ brand, models }: BrandBentoCardProps) {
    const visibleModels = models ?? brand.models;

    return (
        <View
            style={[
                styles.card,
                // Halo în culoarea brandului pe web (pe native shadow-ul e suficient)
                Platform.OS === 'web' &&
                    ({
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: `0 0 32px 0 ${brand.glowColor}, inset 0 1px 0 0 rgba(255, 255, 255, 0.04)`,
                    } as object),
            ]}
            accessible
            accessibilityLabel={`${brand.name} — ${visibleModels.length} modele compatibile`}
        >
            {/* Accent line sus, în culoarea brandului */}
            <View style={[styles.accentLine, { backgroundColor: brand.accentColor }]} />

            {/* Logo textual */}
            <View style={styles.header}>
                <Text style={[styles.brandName, { color: brand.accentColor }]}>
                    {brand.name.toUpperCase()}
                </Text>
                <Text style={styles.modelCount}>
                    {visibleModels.length} {visibleModels.length === 1 ? 'model' : 'modele'}
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Lista de modele */}
            <View style={styles.modelsList}>
                {visibleModels.map((model) => (
                    <View key={model.name} style={styles.modelRow}>
                        <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={VoltColors.neonGreen}
                            style={styles.checkIcon}
                        />
                        <Text style={styles.modelName} numberOfLines={1}>
                            {model.name}
                        </Text>
                        {model.yearStart && (
                            <Text style={styles.modelYear}>
                                {model.yearEnd
                                    ? `${model.yearStart}–${model.yearEnd}`
                                    : `${model.yearStart}+`}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        padding: VoltSpacing.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    accentLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: VoltSpacing.md,
    },
    brandName: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        letterSpacing: 2,
    },
    modelCount: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textTertiary,
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: VoltColors.divider,
        marginBottom: VoltSpacing.md,
    },
    modelsList: {
        gap: VoltSpacing.xs + 2,
    },
    modelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    checkIcon: {
        flexShrink: 0,
    },
    modelName: {
        flex: 1,
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textPrimary,
    },
    modelYear: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.textTertiary,
    },
});
