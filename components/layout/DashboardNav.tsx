/**
 * InspectEV — Dashboard Top Navigation
 * Verificare Nouă | Rapoartele Mele | Setări + user avatar
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;

interface NavItem {
    label: string;
    route: string;
    icon: string;
}

export default function DashboardNav() {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuthStore();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const navItems: NavItem[] = [
        { label: t('dashboard.nav.newScan', 'Verificare Nouă'), route: '/(dashboard)', icon: 'magnify-scan' },
        { label: t('dashboard.nav.reports', 'Rapoartele Mele'), route: '/(dashboard)/reports', icon: 'file-document-multiple-outline' },
        { label: t('dashboard.nav.settings', 'Setări'), route: '/(dashboard)/settings', icon: 'cog-outline' },
    ];

    const isActive = (route: string) => {
        if (route === '/(dashboard)') return pathname === '/(dashboard)' || pathname === '/';
        return pathname.startsWith(route);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
                {/* Logo */}
                <Pressable style={styles.logo} onPress={() => router.push('/')}>
                    <Image source={require('@/assets/images/logo-small.png')} style={styles.logoIcon} />
                    {isDesktop && (
                        <Text style={styles.logoText}>
                            INSPECT<Text style={styles.logoAccent}>EV</Text>
                        </Text>
                    )}
                </Pressable>

                {/* Nav Items */}
                <View style={styles.navRow}>
                    {navItems.map((item) => {
                        const active = isActive(item.route);
                        return (
                            <Pressable
                                key={item.route}
                                style={[styles.navItem, active && styles.navItemActive]}
                                onPress={() => router.push(item.route as never)}
                            >
                                <MaterialCommunityIcons
                                    name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={20}
                                    color={active ? VoltColors.neonGreen : VoltColors.textTertiary}
                                />
                                {isDesktop && (
                                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                                        {item.label}
                                    </Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* User avatar */}
                <View style={styles.userSection}>
                    {user?.displayName && isDesktop && (
                        <Text style={styles.userName} numberOfLines={1}>
                            {user.displayName.split(' ')[0]}
                        </Text>
                    )}
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={18} color={VoltColors.textSecondary} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: VoltColors.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
        paddingTop: Platform.OS === 'web' ? VoltSpacing.md : VoltSpacing.xxl,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        height: 56,
    },
    innerDesktop: {
        paddingHorizontal: VoltSpacing.xl,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    logoIcon: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    logoText: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: 1.5,
    },
    logoAccent: {
        color: VoltColors.neonGreen,
    },
    navRow: {
        flexDirection: 'row',
        gap: VoltSpacing.xs,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.xs,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.sm,
    },
    navItemActive: {
        backgroundColor: VoltColors.neonGreenMuted,
    },
    navLabel: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textTertiary,
    },
    navLabelActive: {
        color: VoltColors.neonGreen,
        fontFamily: VoltFontFamily.semiBold,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
    },
    userName: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        maxWidth: 120,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: VoltColors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
});
