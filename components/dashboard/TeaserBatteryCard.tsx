/**
 * InspectEV — Battery Teaser Card (Glassmorphism)
 * Shows Smartcar compatibility badge + AI prediction preview (blurred/locked).
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface TeaserBatteryCardProps {
    isCompatible: boolean;
    loading: boolean;
}

export default function TeaserBatteryCard({ isCompatible, loading }: TeaserBatteryCardProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="battery-heart-variant" size={24} color={VoltColors.neonGreen} />
                <Text style={styles.title}>
                    {t('teaser.battery_title', 'Analiză Baterie & SoH')}
                </Text>
            </View>

            {/* Smartcar compatibility badge */}
            <View style={[styles.badge, isCompatible ? styles.badgeGreen : styles.badgeGray]}>
                {loading ? (
                    <ActivityIndicator size="small" color={VoltColors.textSecondary} />
                ) : (
                    <>
                        <Ionicons
                            name={isCompatible ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={isCompatible ? VoltColors.neonGreen : VoltColors.textTertiary}
                        />
                        <Text style={[styles.badgeText, isCompatible && styles.badgeTextGreen]}>
                            {isCompatible
                                ? t('teaser.smartcar_compatible', 'Compatibil Smartcar')
                                : t('teaser.smartcar_incompatible', 'Incompatibil Smartcar')}
                        </Text>
                    </>
                )}
            </View>

            {/* Blurred AI prediction preview */}
            <View style={styles.previewContainer}>
                <View style={styles.barRow}>
                    {[88, 65, 92, 78, 85].map((val, i) => (
                        <View key={i} style={styles.barCol}>
                            <View style={[styles.bar, { height: val * 0.6 }]} />
                        </View>
                    ))}
                </View>
                <View style={styles.blurOverlay}>
                    <Ionicons name="lock-closed" size={24} color={VoltColors.neonGreen} />
                    <Text style={styles.blurText}>
                        {t('teaser.unlock', 'Deblochează raportul complet')}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(17, 24, 39, 0.7)',
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.15)',
        padding: VoltSpacing.lg,
        marginTop: VoltSpacing.md,
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
            : {}),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.md,
    },
    title: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        alignSelf: 'flex-start',
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderRadius: VoltBorderRadius.full,
        marginBottom: VoltSpacing.md,
    },
    badgeGreen: {
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
    },
    badgeGray: {
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
    },
    badgeText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textTertiary,
    },
    badgeTextGreen: {
        color: VoltColors.neonGreen,
    },
    previewContainer: {
        position: 'relative',
        height: 100,
        overflow: 'hidden',
        borderRadius: VoltBorderRadius.sm,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: '100%',
        paddingHorizontal: VoltSpacing.md,
    },
    barCol: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 24,
        borderRadius: 4,
        backgroundColor: VoltColors.neonGreenMuted,
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 14, 23, 0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.xs,
        borderRadius: VoltBorderRadius.sm,
    },
    blurText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textSecondary,
    },
});
