/**
 * VoltCheck — Settings Screen (formerly Profile)
 * User profile, settings, language toggle, and app info
 * FAZA 1 — Renamed from Profil to Setări
 */

import { Platform, 
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
 } from 'react-native';

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState(true);
    const isRo = i18n.language === 'ro';

    const toggleLanguage = () => {
        i18n.changeLanguage(isRo ? 'en' : 'ro');
    };

    const menuItems = [
        {
            icon: 'language' as const,
            iconComponent: Ionicons,
            label: t('settings.language'),
            rightComponent: (
                <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
                    <View style={[styles.langOption, isRo && styles.langOptionActive]}>
                        <Text style={[styles.langText, isRo && styles.langTextActive]}>RO</Text>
                    </View>
                    <View style={[styles.langOption, !isRo && styles.langOptionActive]}>
                        <Text style={[styles.langText, !isRo && styles.langTextActive]}>EN</Text>
                    </View>
                </TouchableOpacity>
            ),
        },
        {
            icon: 'notifications-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.notifications'),
            rightComponent: (
                <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    trackColor={{ false: VoltColors.bgTertiary, true: VoltColors.neonGreenMuted }}
                    thumbColor={notifications ? VoltColors.neonGreen : VoltColors.textTertiary}
                />
            ),
        },
        {
            icon: 'shield-checkmark-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.privacy'),
            showArrow: true,
        },
        {
            icon: 'document-text-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.terms'),
            showArrow: true,
        },
        {
            icon: 'information-circle-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.about'),
            showArrow: true,
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{t('settings.title')}</Text>
            </View>

            {/* User card */}
            <View style={styles.userCard}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={32} color={VoltColors.neonGreen} />
                    </View>
                    <View style={styles.avatarGlow} />
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>VoltCheck User</Text>
                    <Text style={styles.userEmail}>user@example.com</Text>
                </View>
                <View style={styles.statsBadge}>
                    <Text style={styles.statsNumber}>3</Text>
                    <Text style={styles.statsLabel}>Rapoarte</Text>
                </View>
            </View>

            {/* Menu items */}
            <View style={styles.menuSection}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.menuItem,
                            index === menuItems.length - 1 && styles.menuItemLast,
                        ]}
                        activeOpacity={0.7}
                    >
                        <item.iconComponent
                            name={item.icon}
                            size={22}
                            color={VoltColors.textSecondary}
                        />
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <View style={styles.menuRight}>
                            {item.rightComponent || null}
                            {item.showArrow && (
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color={VoltColors.textTertiary}
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Logout button */}
            <TouchableOpacity style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color={VoltColors.error} />
                <Text style={styles.logoutText}>{t('settings.logout')}</Text>
            </TouchableOpacity>

            {/* Version */}
            <View style={styles.versionContainer}>
                <MaterialCommunityIcons
                    name="battery-charging-high"
                    size={20}
                    color={VoltColors.textTertiary}
                />
                <Text style={styles.versionText}>
                    VoltCheck {t('settings.version')} 1.0.0
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    content: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: 120, // Account for glass tab bar
    },
    header: {
        marginBottom: VoltSpacing.lg,
    },
    title: {
        fontSize: VoltFontSize.xxl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },

    // User card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginBottom: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.md,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
    },
    avatarGlow: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: VoltColors.neonGreenGlow,
        opacity: 0.3,
    },
    userInfo: {
        flex: 1,
        marginLeft: VoltSpacing.md,
    },
    userName: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    userEmail: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginTop: 2,
    },
    statsBadge: {
        alignItems: 'center',
        backgroundColor: VoltColors.bgInput,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.md,
    },
    statsNumber: {
        fontSize: VoltFontSize.xl,
        fontWeight: '800',
        color: VoltColors.neonGreen,
    },
    statsLabel: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
    },

    // Menu
    menuSection: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        overflow: 'hidden',
        marginBottom: VoltSpacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: VoltSpacing.md,
        paddingHorizontal: VoltSpacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.divider,
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuLabel: {
        flex: 1,
        fontSize: VoltFontSize.md,
        color: VoltColors.textPrimary,
        marginLeft: VoltSpacing.md,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Language toggle
    langToggle: {
        flexDirection: 'row',
        backgroundColor: VoltColors.bgInput,
        borderRadius: VoltBorderRadius.sm,
        overflow: 'hidden',
    },
    langOption: {
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
    },
    langOptionActive: {
        backgroundColor: VoltColors.neonGreen,
    },
    langText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '700',
        color: VoltColors.textTertiary,
    },
    langTextActive: {
        color: VoltColors.textOnGreen,
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: VoltSpacing.md,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 23, 68, 0.2)',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.lg,
    },
    logoutText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: VoltColors.error,
    },

    // Version
    versionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.xs,
        paddingVertical: VoltSpacing.md,
    },
    versionText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
});
