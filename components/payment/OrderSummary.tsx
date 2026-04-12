/**
 * InspectEV — Order Summary Card
 * Extracted from PaymentScreen (payment.tsx).
 * Shows vehicle info, service level, and total price.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface OrderSummaryProps {
    level: 1 | 2;
    vin: string;
    make: string;
    model: string;
    priceLabel: string;
    levelName: string;
}

export default function OrderSummary({
    level,
    vin,
    make,
    model,
    priceLabel,
    levelName,
}: OrderSummaryProps) {
    const { t } = useTranslation();

    return (
        <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Sumar Comandă</Text>

            <View style={styles.vehicleRow}>
                <MaterialCommunityIcons name="car-electric" size={32} color={VoltColors.neonGreen} />
                <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>{make} {model}</Text>
                    <Text style={styles.vehicleVin}>VIN: {vin}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.serviceRow}>
                <View style={styles.serviceBadge}>
                    {level === 1 ? (
                        <FontAwesome name="search" size={16} color={VoltColors.neonGreen} />
                    ) : (
                        <MaterialCommunityIcons name="stethoscope" size={16} color={VoltColors.neonGreen} />
                    )}
                </View>
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{levelName}</Text>
                    <Text style={styles.serviceDesc}>
                        {level === 1 ? t('levels.level1.description') : t('levels.level2.description')}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total</Text>
                <Text style={styles.priceAmount}>{priceLabel}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.md,
    },
    sectionTitle: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: VoltSpacing.md,
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.md,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleName: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    vehicleVin: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontFamily: 'SpaceMono',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: VoltColors.divider,
        marginVertical: VoltSpacing.md,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.md,
    },
    serviceBadge: {
        width: 36,
        height: 36,
        borderRadius: VoltBorderRadius.sm,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    serviceDesc: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginTop: 2,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: VoltFontSize.lg,
        fontWeight: '600',
        color: VoltColors.textPrimary,
    },
    priceAmount: {
        fontSize: VoltFontSize.xxl,
        fontWeight: '800',
        color: VoltColors.neonGreen,
    },
});
