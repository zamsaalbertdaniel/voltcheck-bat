/**
 * VoltCheck — Payment Screen (WEB OVERRIDE)
 * Prevents Vercel/Expo Web build crashes caused by @stripe/stripe-react-native
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import {
    USE_MOCK_DATA,
} from '@/services/cloudFunctions';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type PaymentStatus = 'idle' | 'processing' | 'generating' | 'success' | 'failed';

export default function PaymentScreenWeb() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{
        level: string;
        vin: string;
        make: string;
        model: string;
        year: string;
    }>();

    const level = parseInt(params.level || '1') as 1 | 2;
    const priceLabel = level === 1 ? '15 RON' : '99 RON';
    const levelName = level === 1 ? t('levels.level1.name') : t('levels.level2.name');

    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const progressAnim = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;

    // ═══════════════════════════════════════════
    // WEB FALLBACK MOCK FLOW
    // ═══════════════════════════════════════════
    const handleWebPayment = useCallback(async () => {
        if (!USE_MOCK_DATA) {
            // In a real scenario, Web might require @stripe/stripe-js Elements here.
            // For now, if real mode is forced on Web, warn the user.
            alert('Plata reală este disponibilă doar în aplicația mobilă iOS/Android.');
            return;
        }

        setStatus('processing');
        setStatusMessage('Se simulează plata (Web)...');

        Animated.timing(progressAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: false,
        }).start();

        await new Promise(resolve => setTimeout(resolve, 1500));

        Animated.timing(progressAnim, {
            toValue: 0.8,
            duration: 500,
            useNativeDriver: false,
        }).start();

        setStatus('generating');
        setStatusMessage('Se generează raportul demo...');

        await new Promise(resolve => setTimeout(resolve, 1500));

        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();

        setStatus('success');
        Animated.spring(checkmarkScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: false, // Web doesn't always support native driver spring completely
        }).start();

        setTimeout(() => {
            router.replace({
                pathname: '/report/[id]',
                params: { id: 'demo_report_001' },
            });
        }, 2000);
    }, [progressAnim, checkmarkScale, router]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            bounces={false}
        >
            <View style={styles.demoBanner}>
                <Text style={styles.demoBannerText}>🌐 Web Platform Demo</Text>
                <Text style={styles.demoBannerSubtext}>
                    Integrarea Stripe nativă este dezactivată pe Web pentru a preveni erorile de compilare. Vă rugăm să utilizați iOS/Android pentru mod Real.
                </Text>
            </View>

            {/* Order Summary Card */}
            <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Sumar Comandă</Text>

                <View style={styles.vehicleRow}>
                    <MaterialCommunityIcons name="car-electric" size={32} color={VoltColors.neonGreen} />
                    <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>
                            {params.make || 'Tesla'} {params.model || 'Model 3'}
                        </Text>
                        <Text style={styles.vehicleVin}>
                            VIN: {params.vin || 'WVWZZZE3ZWE123456'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Service details */}
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

                {/* Price */}
                <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Total</Text>
                    <Text style={styles.priceAmount}>{priceLabel}</Text>
                </View>
            </View>

            {/* Security badges */}
            <View style={styles.securityRow}>
                <View style={styles.securityBadge}>
                    <Ionicons name="lock-closed" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Secure Processing</Text>
                </View>
                <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Stripe Secure</Text>
                </View>
            </View>

            {/* Payment states */}
            {status === 'idle' && (
                <TouchableOpacity
                    style={styles.payButton}
                    onPress={handleWebPayment}
                    activeOpacity={0.8}
                >
                    <Ionicons name="card" size={22} color={VoltColors.textOnGreen} />
                    <Text style={styles.payButtonText}>Simulează Plata (Web)</Text>
                </TouchableOpacity>
            )}

            {(status === 'processing' || status === 'generating') && (
                <View style={styles.processingSection}>
                    <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                    <Text style={styles.processingText}>
                        {statusMessage}
                    </Text>
                    <View style={styles.progressBarContainer}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                </View>
            )}

            {status === 'success' && (
                <View style={styles.successSection}>
                    <Animated.View style={[
                        styles.checkmarkCircle,
                        { transform: [{ scale: checkmarkScale }] },
                    ]}>
                        <Ionicons name="checkmark" size={48} color={VoltColors.textOnGreen} />
                    </Animated.View>
                    <Text style={styles.successText}>{t('payment.success')}</Text>
                    <Text style={styles.redirectText}>Se deschide raportul demo...</Text>
                </View>
            )}

            {status === 'failed' && (
                <View style={styles.failedSection}>
                    <Text style={styles.failedText}>{t('payment.failed')}</Text>
                </View>
            )}
        </ScrollView>
    );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    contentContainer: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.lg,
        paddingBottom: VoltSpacing.xxxl,
    },
    demoBanner: {
        backgroundColor: 'rgba(0, 230, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 255, 0.3)',
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.md,
        alignItems: 'center',
    },
    demoBannerText: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: '#00E6FF',
    },
    demoBannerSubtext: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        marginTop: 4,
        textAlign: 'center',
    },
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
    securityRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: VoltSpacing.md,
        marginVertical: VoltSpacing.lg,
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: VoltSpacing.xs,
        borderRadius: VoltBorderRadius.full,
        gap: 4,
    },
    securityText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.neonGreen,
        fontWeight: '600',
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 230, 255, 0.08)',
        borderWidth: 1.5,
        borderColor: '#00E6FF',
        borderRadius: 8,
        paddingVertical: 18,
        gap: VoltSpacing.md,
        shadowColor: '#00E6FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 8,
    },
    payButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#00E6FF',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    processingSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    processingText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
        height: 4,
        backgroundColor: VoltColors.bgTertiary,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: VoltColors.neonGreen,
        borderRadius: 2,
    },
    successSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    checkmarkCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: VoltColors.neonGreen,
        alignItems: 'center',
        justifyContent: 'center',
        ...VoltShadow.glow,
    },
    successText: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.neonGreen,
    },
    redirectText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
    failedSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    failedText: {
        fontSize: VoltFontSize.lg,
        fontWeight: '600',
        color: VoltColors.error,
    },
});
