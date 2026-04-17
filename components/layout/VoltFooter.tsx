/**
 * InspectEV — Global Footer
 * Rendered on all main pages (landing, login, dashboard, report)
 * Links to Privacy, Terms, Refund, Contact
 */

import {
    VoltColors,
    VoltFontSize,
    VoltSpacing,
    VoltBorderRadius,
    VoltFontFamily,
} from '@/constants/Theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;

export default function VoltFooter() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const links = [
        { label: t('footer.privacy', 'Politica de Confidențialitate'), route: '/legal/privacy' as const },
        { label: t('footer.terms', 'Termeni și Condiții'), route: '/legal/terms' as const },
        { label: t('footer.refund', 'Politica de Refund'), route: '/legal/refund' as const },
        { label: t('footer.contact', 'Contact'), route: '/legal/contact' as const },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.divider} />
            <View style={[styles.content, isDesktop && styles.contentDesktop]}>
                <View style={[styles.linksRow, isDesktop && styles.linksRowDesktop]}>
                    {links.map((link, i) => (
                        <Pressable
                            key={link.route}
                            onPress={() => router.push(link.route)}
                            style={({ pressed }) => [
                                styles.link,
                                pressed && styles.linkPressed,
                            ]}
                        >
                            <Text style={styles.linkText}>{link.label}</Text>
                            {i < links.length - 1 && isDesktop && (
                                <Text style={styles.separator}>{'  ·  '}</Text>
                            )}
                        </Pressable>
                    ))}
                </View>
                <View style={[styles.bottomRow, isDesktop && styles.bottomRowDesktop]}>
                    <Text style={styles.copyright}>
                        © 2026 InspectEV SRL. All rights reserved.
                    </Text>
                    
                    <Pressable 
                        onPress={() => i18n.changeLanguage(i18n.language === 'ro' ? 'en' : 'ro')}
                        style={({ pressed }) => [styles.langToggle, pressed && styles.linkPressed]}
                    >
                        <Text style={styles.langToggleText}>
                            {i18n.language === 'ro' ? '🌍 România (RO)' : '🌍 Global (EN)'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: VoltSpacing.lg,
        paddingBottom: VoltSpacing.xl,
        paddingTop: VoltSpacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: VoltColors.border,
        marginBottom: VoltSpacing.lg,
    },
    content: {
        alignItems: 'center',
        gap: VoltSpacing.md,
    },
    contentDesktop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    linksRow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    linksRowDesktop: {
        flexDirection: 'row',
        gap: 0,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: VoltSpacing.xs,
    },
    linkPressed: {
        opacity: 0.6,
    },
    linkText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
    separator: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
    copyright: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        opacity: 0.7,
    },
    bottomRow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: VoltSpacing.md,
        marginTop: VoltSpacing.sm,
    },
    bottomRowDesktop: {
        flexDirection: 'row',
        gap: VoltSpacing.lg,
        marginTop: 0,
    },
    langToggle: {
        paddingVertical: VoltSpacing.xs,
        paddingHorizontal: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: VoltColors.border,
        borderRadius: VoltBorderRadius.sm,
    },
    langToggleText: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textSecondary,
    },
});
