/**
 * InspectEV — Settings Screen (formerly Profile)
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
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { platformConfirm } from '@/utils/platformConfirm';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Platform,
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
    const { user } = useAuthStore();
    const { showToast } = useToast();
    const router = useRouter();
    const isRo = i18n.language === 'ro';

    const toggleLanguage = () => {
        i18n.changeLanguage(isRo ? 'en' : 'ro');
    };

    const handleLogout = useCallback(async () => {
        const confirmed = await platformConfirm({
            title: t('settings.logout') || 'Deconectare',
            message: t('settings.logoutConfirm') || 'Ești sigur că vrei să te deconectezi?',
            confirmText: t('settings.logout') || 'Deconectare',
            cancelText: t('common.cancel') || 'Anulează',
            destructive: true,
        });
        if (!confirmed) return;

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
            showToast('error', t('settings.logoutFailed') || 'Deconectarea a eșuat. Încearcă din nou.');
        }
    }, [user, t, showToast]);

    const handleDeleteAccount = useCallback(async () => {
        const confirmed = await platformConfirm({
            title: t('settings.deleteAccount'),
            message: t('settings.deleteAccountConfirm'),
            confirmText: t('settings.deleteAccount'),
            cancelText: t('common.cancel'),
            destructive: true,
        });
        if (!confirmed) return;

        try {
            // Server-side deletion via Cloud Function (bypasses Firestore rules)
            if (Platform.OS === 'web') {
                const { getFirebaseServices } = await import('@/services/firebase');
                const { app } = await getFirebaseServices();
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const functions = getFunctions(app, 'europe-west1');
                const deleteAccount = httpsCallable(functions, 'deleteUserAccount');
                await deleteAccount();
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rnFunctions = (await import('@react-native-firebase/app')) as any;
                const functions = rnFunctions.default.functions('europe-west1');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const deleteAccount = (functions as any).httpsCallable('deleteUserAccount');
                await deleteAccount();
            }

            showToast('success', t('settings.deleteAccountSuccess'));
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[Settings] Delete account failed:', err);
            showToast('error', t('settings.deleteAccountError'));
        }
    }, [t, showToast]);

    const handleNotificationToggle = useCallback(async (enabled: boolean) => {
        setNotifications(enabled);
        const userId = user?.uid;
        if (!userId) return;

        try {
            await setNotificationPreference(userId, enabled);
            if (enabled) {
                const token = await registerForPushNotifications(userId);
                if (!token) {
                    showToast(
                        'warning',
                        t('settings.notificationPermissionDenied') || 'Permisiunea pentru notificari a fost refuzata. Activeaz-o din Setarile telefonului.',
                        4000,
                    );
                    setNotifications(false);
                }
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[Settings] Notification toggle failed:', err);
        }
    }, [user, t, showToast]);

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
            icon: 'car-connected' as const,
            iconComponent: MaterialCommunityIcons,
            label: t('settings.smartcarConnect', 'Conectare Smartcar'),
            showArrow: true,
            onPress: () => router.push('/smartcar-connect' as never),
        },
        {
            icon: 'shield-checkmark-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.privacy'),
            showArrow: true,
            onPress: () => router.push('/legal/privacy' as never),
        },
        {
            icon: 'document-text-outline' as const,
            iconComponent: Ionicons,
            label: t('settings.terms'),
            showArrow: true,
            onPress: () => router.push('/legal/terms' as never),
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
                    {user?.photoURL ? (
                        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={32} color={VoltColors.neonGreen} />
                        </View>
                    )}
                    <View style={styles.avatarGlow} />
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                        {user?.displayName || 'InspectEV User'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {user?.email || t('common.anonymousAccount') || 'Cont anonim'}
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
                        onPress={item.onPress}
                    >
                        <item.iconComponent
                            name={item.icon as never}
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

            {/* Delete account */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color={VoltColors.error} />
                <Text style={styles.deleteText}>{t('settings.deleteAccount')}</Text>
            </TouchableOpacity>

            {/* Version */}
            <View style={styles.versionContainer}>
                <Image
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    source={require('@/assets/images/logo-small.png')}
                    style={{ width: 22, height: 22, resizeMode: 'contain', opacity: 0.5 }}
                />
                <Text style={styles.versionText}>
                    InspectEV {t('settings.version')} 1.0.0
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
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
    },
    avatarPlaceholder: {
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
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

    // Delete
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: VoltSpacing.md,
        backgroundColor: 'transparent',
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 23, 68, 0.15)',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.lg,
    },
    deleteText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '500',
        color: VoltColors.textTertiary,
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
