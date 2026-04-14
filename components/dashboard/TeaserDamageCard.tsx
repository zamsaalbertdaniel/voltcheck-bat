/**
 * InspectEV — Damage Teaser Card (Glassmorphism)
 * Shows CarVertical damage warning preview.
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
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function TeaserDamageCard() {
    const { t } = useTranslation();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="car-wrench" size={24} color={VoltColors.warning} />
                <Text style={styles.title}>
                    {t('teaser.damage_title', 'Istoric Daune & Accidente')}
                </Text>
            </View>

            <View style={styles.warningBadge}>
                <Ionicons name="warning" size={18} color={VoltColors.riskHigh} />
                <Text style={styles.warningText}>
                    {t('teaser.damage_found', 'S-au găsit înregistrări de daune')}
                </Text>
            </View>

            <Text style={styles.desc}>
                {t('teaser.damage_desc', 'Raportul CarVertical include: istoric daune, kilometraj, schimbări de proprietar, înmatriculări în alte țări și verificare furt.')}
            </Text>

            <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={16} color={VoltColors.neonGreen} />
                <Text style={styles.lockText}>
                    {t('teaser.damage_unlock', 'Disponibil în Pachetul Premium')}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(17, 24, 39, 0.7)',
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 109, 0, 0.2)',
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
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        backgroundColor: 'rgba(255, 109, 0, 0.1)',
        alignSelf: 'flex-start',
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderRadius: VoltBorderRadius.full,
        marginBottom: VoltSpacing.md,
    },
    warningText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.riskHigh,
    },
    desc: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        lineHeight: 20,
        marginBottom: VoltSpacing.md,
    },
    lockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
    },
    lockText: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.neonGreen,
    },
});
