/**
 * InspectEV — Bento Box Know-How Section
 * 3 glassmorphism cards explaining SoH calculation methodology.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;

interface BentoCard {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    titleKey: string;
    titleFallback: string;
    descKey: string;
    descFallback: string;
    accent: string;
}

const CARDS: BentoCard[] = [
    {
        icon: 'chip',
        titleKey: 'landing.bms_title',
        titleFallback: 'Analiza BMS',
        descKey: 'landing.bms_desc',
        descFallback: 'Extragem datele oficiale direct din Battery Management System — creierul electronic al bateriei. Temperatura, cicluri de încărcare, tensiune celulară.',
        accent: VoltColors.neonGreen,
    },
    {
        icon: 'lightning-bolt',
        titleKey: 'landing.stress_title',
        titleFallback: 'Factorul de Stres',
        descKey: 'landing.stress_desc',
        descFallback: 'Cum influențează încărcările Fast-Charge DC degradarea chimică a celulelor. Analizăm frecvența, temperatura și pattern-urile de încărcare rapidă.',
        accent: VoltColors.warning,
    },
    {
        icon: 'brain',
        titleKey: 'landing.ai_title',
        titleFallback: 'Probabilistic AI',
        descKey: 'landing.ai_desc',
        descFallback: 'Comparăm datele vehiculului tău cu mii de mașini similare din flota noastră. Algoritmul AI calculează un scor de risc personalizat și o predicție de viață utilă.',
        accent: VoltColors.info,
    },
];

export default function BentoBox() {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>
                {t('landing.knowhow_title', 'Cum Calculăm Sănătatea Bateriei (SoH)')}
            </Text>
            <Text style={styles.sectionSubtitle}>
                {t('landing.knowhow_subtitle', 'Tehnologia din spatele scorului InspectEV')}
            </Text>

            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
                {CARDS.map((card) => (
                    <View key={card.titleKey} style={[styles.card, isDesktop && styles.cardDesktop]}>
                        <View style={[styles.iconCircle, { backgroundColor: card.accent + '20' }]}>
                            <MaterialCommunityIcons
                                name={card.icon}
                                size={32}
                                color={card.accent}
                            />
                        </View>
                        <Text style={styles.cardTitle}>
                            {t(card.titleKey, card.titleFallback)}
                        </Text>
                        <Text style={styles.cardDesc}>
                            {t(card.descKey, card.descFallback)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.xxl,
    },
    sectionTitle: {
        fontSize: VoltFontSize.xxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.sm,
    },
    sectionSubtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        marginBottom: VoltSpacing.xl,
    },
    grid: {
        gap: VoltSpacing.md,
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
    },
    gridDesktop: {
        flexDirection: 'row',
    },
    card: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.7)',
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.12)',
        padding: VoltSpacing.lg,
        gap: VoltSpacing.md,
        // Glassmorphism
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
            : {}),
    },
    cardDesktop: {
        padding: VoltSpacing.xl,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
    },
    cardDesc: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 22,
    },
});
