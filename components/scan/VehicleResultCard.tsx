/**
 * VoltCheck — Vehicle Result Card
 * Extracted from ScanScreen (index.tsx).
 * Shows decoded vehicle info: make/model/year, provider statuses, recall banner.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { VINDecodeResponse } from '@/services/cloudFunctions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VehicleResultCardProps {
    decodedData: VINDecodeResponse;
}

export default function VehicleResultCard({ decodedData }: VehicleResultCardProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
                <MaterialCommunityIcons
                    name="car-electric"
                    size={28}
                    color={VoltColors.neonGreen}
                />
                <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>
                        {decodedData.nhtsa?.make} {decodedData.nhtsa?.model} ({decodedData.nhtsa?.year})
                    </Text>
                    <Text style={styles.vehicleVin}>{decodedData.vin}</Text>
                </View>
                <View style={styles.sourceBadge}>
                    <Text style={styles.sourceText}>
                        {decodedData.source === 'mock'
                            ? '🧪 MOCK'
                            : decodedData.source === 'cache'
                                ? '⚡ CACHE'
                                : '🔴 LIVE'}
                    </Text>
                </View>
            </View>

            {decodedData.providers.length > 0 && (
                <View style={styles.providerRow}>
                    {decodedData.providers.map((p, i) => (
                        <View key={i} style={styles.providerChip}>
                            <View style={[
                                styles.providerDot,
                                { backgroundColor: p.status === 'success' ? VoltColors.neonGreen : VoltColors.error },
                            ]} />
                            <Text style={styles.providerName}>{p.provider}</Text>
                        </View>
                    ))}
                </View>
            )}

            {decodedData.recalls.length > 0 && (
                <View style={styles.recallBanner}>
                    <Ionicons name="warning" size={16} color="#FFD600" />
                    <Text style={styles.recallText}>
                        {t('scan.recallsActive', { count: decodedData.recalls.length })}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    vehicleCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginBottom: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.md,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehicleInfo: {
        flex: 1,
        marginLeft: VoltSpacing.md,
    },
    vehicleName: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    vehicleVin: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontFamily: 'SpaceMono',
        marginTop: 2,
    },
    sourceBadge: {
        backgroundColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: VoltSpacing.xs,
        borderRadius: VoltBorderRadius.sm,
    },
    sourceText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.neonGreen,
    },
    providerRow: {
        flexDirection: 'row',
        marginTop: VoltSpacing.md,
        gap: VoltSpacing.sm,
    },
    providerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgTertiary,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 4,
        borderRadius: VoltBorderRadius.sm,
        gap: 4,
    },
    providerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    providerName: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
    },
    recallBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 214, 0, 0.1)',
        borderRadius: VoltBorderRadius.sm,
        padding: VoltSpacing.sm,
        marginTop: VoltSpacing.md,
        gap: VoltSpacing.xs,
    },
    recallText: {
        fontSize: VoltFontSize.sm,
        color: '#FFD600',
        fontWeight: '600',
    },
});
