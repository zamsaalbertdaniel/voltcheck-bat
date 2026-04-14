/**
 * InspectEV — 404 Not Found Screen
 * Friendly dark-themed page with branding and CTA back to home.
 */

import VoltFooter from '@/components/layout/VoltFooter';
import { VoltBorderRadius, VoltColors, VoltFontFamily, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
    const { t } = useTranslation();

    return (
        <>
            <Stack.Screen options={{ title: t('notFound.title', 'Pagină negăsită'), headerShown: false }} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                <View style={styles.container}>
                    {/* Logo */}
                    <Image
                        source={require('@/assets/images/logo-small.png')}
                        style={styles.logoImage}
                    />

                    {/* Broken circuit icon */}
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="lightning-bolt-circle" size={64} color={VoltColors.warning} />
                    </View>

                    <Text style={styles.code}>404</Text>

                    <Text style={styles.title}>
                        {t('notFound.headline', 'Curent întrerupt!')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('notFound.message', 'Pagina pe care o cauți nu există sau a fost mutată.')}
                    </Text>

                    <Link href="/" asChild>
                        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="home-lightning-bolt" size={20} color={VoltColors.textOnGreen} />
                            <Text style={styles.buttonText}>
                                {t('notFound.backHome', 'Înapoi la InspectEV')}
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <VoltFooter />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    scrollContent: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: VoltSpacing.xl,
        minHeight: 500,
    },
    logoImage: {
        width: 48,
        height: 48,
        resizeMode: 'contain',
        marginBottom: VoltSpacing.xxl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 171, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: VoltSpacing.lg,
    },
    code: {
        fontSize: 72,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: 4,
    },
    title: {
        fontSize: VoltFontSize.xxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.neonGreen,
        marginTop: VoltSpacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginTop: VoltSpacing.sm,
        marginBottom: VoltSpacing.xl,
        textAlign: 'center',
        maxWidth: 400,
        lineHeight: 22,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.md,
        // Glow
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
});
