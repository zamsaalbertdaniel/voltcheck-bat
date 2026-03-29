/**
 * VoltCheck — Settings Screen (formerly Profile)
 * User profile, settings, language toggle, and app info
 * FAZA 1 — Renamed from Profil to Setări
 */

import { 
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { setNotificationPreference, registerForPushNotifications, unregisterPushNotifications } from '@/services/notifications';
import { getFirebaseServices } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
    Platform,
 } from 'react-native';

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState(true);
    const { user } = useAuthStore();
    const isRo = i18n.language === 'ro';

    const toggleLanguage = () => {
        i18n.changeLanguage(isRo ? 'en' : 'ro');
    };

    const handleLogout = useCallback(async () => {
        Alert.alert(
            t('settings.logout') || 'Deconectare',
            t('settings.logoutConfirm') || 'Ești sigur că vrei să te deconectezi?',
            [
                { text: t('common.cancel') || 'Anulează', style: 'cancel' },
                {
                    text: t('settings.logout') || 'Deconectare',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Unregister push notifications
                            if (user?.uid) {
                                await unregisterPushNotifications(user.uid).catch(() => {});
                            }

                            // Sign out from Firebase
                            const { auth } = await getFirebaseServices();
                            if (Platform.OS === 'web') {
                                const { signOut } = await import('firebase/auth');
                                await signOut(auth);
                            } else {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                await (auth as any).signOut();
                            }

                            // Auth listener will auto-redirect to (auth)
                        } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error('[Settings] Logout failed:', err);
                            Alert.alert('Eroare', 'Deconectarea a eșuat. Încearcă din nou.');
                        }
                    },
                },
            ],
        );
    }, [user, t]);

    const handleNotificationToggle = useCallback(async (enabled: boolean) => {
        setNotifications(enabled);
        const userId = user?.uid;
        if (!userId) return;

        try {
            await setNotificationPreference(userId, enabled);
            if (enabled) {
                const token = await registerForPushNotifications(userId);
                if (!token) {
                    Alert.alert(
                        t('settings.notifications'),
                        t('settings.notificationPermissionDenied') || 'Permisiunea pentru notificari a fost refuzata. Activeaz-o din Setarile telefonului.',
                    );
                    setNotifications(false);
                }
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[Settings] Notification toggle failed:', err);
        }
    }, [user, t]);

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
                    onValueChange={handleNotificationToggle}
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
                    <Text style={styles.userName}>
                        {user?.displayName || 'VoltCheck User'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {user?.email || 'Cont anonim'}
                    </Text>
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
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
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
