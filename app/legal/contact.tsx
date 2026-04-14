/**
 * InspectEV — Contact Page
 */

import VoltFooter from '@/components/layout/VoltFooter';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ContactPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const contacts = [
        {
            icon: 'email-outline' as const,
            label: t('contact.general', 'Întrebări generale'),
            value: 'contact@inspectev.app',
            onPress: () => Linking.openURL('mailto:contact@inspectev.app'),
        },
        {
            icon: 'shield-lock-outline' as const,
            label: t('contact.privacy', 'Protecția datelor (GDPR)'),
            value: 'privacy@inspectev.app',
            onPress: () => Linking.openURL('mailto:privacy@inspectev.app'),
        },
        {
            icon: 'cash-refund' as const,
            label: t('contact.refund', 'Rambursări'),
            value: 'refund@inspectev.app',
            onPress: () => Linking.openURL('mailto:refund@inspectev.app'),
        },
        {
            icon: 'scale-balance' as const,
            label: t('contact.legal', 'Juridic'),
            value: 'legal@inspectev.app',
            onPress: () => Linking.openURL('mailto:legal@inspectev.app'),
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={VoltColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('contact.title', 'Contact')}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                <Text style={styles.subtitle}>
                    {t('contact.subtitle', 'Suntem aici să te ajutăm. Alege departamentul potrivit.')}
                </Text>

                <View style={styles.cardsContainer}>
                    {contacts.map((item) => (
                        <Pressable
                            key={item.value}
                            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                            onPress={item.onPress}
                        >
                            <MaterialCommunityIcons
                                name={item.icon}
                                size={28}
                                color={VoltColors.neonGreen}
                            />
                            <View style={styles.cardText}>
                                <Text style={styles.cardLabel}>{item.label}</Text>
                                <Text style={styles.cardValue}>{item.value}</Text>
                            </View>
                            <Ionicons name="open-outline" size={18} color={VoltColors.textTertiary} />
                        </Pressable>
                    ))}
                </View>

                <View style={styles.businessInfo}>
                    <Text style={styles.businessTitle}>InspectEV SRL</Text>
                    <Text style={styles.businessText}>
                        {t('contact.response', 'Timp de răspuns: maxim 48 de ore lucrătoare')}
                    </Text>
                    <Text style={styles.businessText}>România</Text>
                </View>

                <VoltFooter />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: VoltSpacing.md,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: VoltBorderRadius.full,
        backgroundColor: VoltColors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    headerSpacer: { width: 40 },
    scrollView: { flex: 1 },
    scrollContent: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xl,
        paddingBottom: VoltSpacing.xxl,
    },
    subtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.xl,
        lineHeight: 22,
    },
    cardsContainer: {
        gap: VoltSpacing.md,
        marginBottom: VoltSpacing.xxl,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.md,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    cardPressed: {
        backgroundColor: VoltColors.bgTertiary,
    },
    cardText: {
        flex: 1,
    },
    cardLabel: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
        marginBottom: 2,
    },
    cardValue: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.neonGreen,
    },
    businessInfo: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.xs,
    },
    businessTitle: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
    },
    businessText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
});
