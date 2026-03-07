/**
 * VoltCheck — Payment Screen
 * Stripe Payment Sheet integration with order summary
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export default function PaymentScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{
        level: string;
        vin: string;
        make: string;
        model: string;
        year: string;
    }>();

    const level = parseInt(params.level || '1');
    const price = level === 1 ? '15.00' : '99.00';
    const priceLabel = level === 1 ? '15 RON' : '99 RON';
    const levelName = level === 1 ? t('levels.level1.name') : t('levels.level2.name');

    const [status, setStatus] = useState<PaymentStatus>('idle');
    const progressAnim = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;

    const handlePayment = async () => {
        setStatus('processing');

        // Animate progress
        Animated.timing(progressAnim, {
            toValue: 0.8,
            duration: 2000,
            useNativeDriver: false,
        }).start();

        try {
            // TODO: Initialize Stripe Payment Sheet
            // 1. Call Cloud Function /api/payment/create-intent { level, vin }
            // 2. Receive clientSecret from Stripe PaymentIntent
            // 3. Present Stripe Payment Sheet
            // 4. On success → trigger report generation

            // Simulate payment for demo
            await new Promise(resolve => setTimeout(resolve, 2500));

            // Complete progress and show success
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();

            setStatus('success');

            // Animate checkmark
            Animated.spring(checkmarkScale, {
                toValue: 1,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }).start();

            // Navigate to report after delay
            setTimeout(() => {
                router.replace({
                    pathname: '/report/[id]',
                    params: { id: 'demo_report_001' },
                });
            }, 2000);
        } catch (error) {
            setStatus('failed');
            Animated.timing(progressAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

    return (
        <View style={styles.container}>
            {/* Order Summary Card */}
            <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Sumar Comandă</Text>

                <View style={styles.vehicleRow}>
                    <MaterialCommunityIcons
                        name="car-electric"
                        size={32}
                        color={VoltColors.neonGreen}
                    />
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
                    <Text style={styles.securityText}>AES-256</Text>
                </View>
                <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Stripe Secure</Text>
                </View>
                <View style={styles.securityBadge}>
                    <Ionicons name="finger-print" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Device ID</Text>
                </View>
            </View>

            {/* Payment states */}
            {status === 'idle' && (
                <TouchableOpacity
                    style={styles.payButton}
                    onPress={handlePayment}
                    activeOpacity={0.8}
                >
                    <Ionicons name="card" size={22} color={VoltColors.textOnGreen} />
                    <Text style={styles.payButtonText}>Plătește {priceLabel}</Text>
                </TouchableOpacity>
            )}

            {status === 'processing' && (
                <View style={styles.processingSection}>
                    <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                    <Text style={styles.processingText}>{t('payment.processing')}</Text>
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
                    <Text style={styles.redirectText}>Se generează raportul...</Text>
                </View>
            )}

            {status === 'failed' && (
                <View style={styles.failedSection}>
                    <View style={styles.failedCircle}>
                        <Ionicons name="close" size={48} color={VoltColors.white} />
                    </View>
                    <Text style={styles.failedText}>{t('payment.failed')}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => setStatus('idle')}
                    >
                        <Text style={styles.retryText}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Stripe branding */}
            <View style={styles.stripeBranding}>
                <Text style={styles.stripeText}>Powered by </Text>
                <Text style={[styles.stripeText, { color: VoltColors.stripePurple, fontWeight: '700' }]}>
                    Stripe
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.lg,
    },

    // Summary card
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

    // Security badges
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

    // Pay button
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: VoltSpacing.lg,
        gap: VoltSpacing.sm,
        ...VoltShadow.glow,
    },
    payButtonText: {
        fontSize: VoltFontSize.xl,
        fontWeight: '800',
        color: VoltColors.textOnGreen,
    },

    // Processing
    processingSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    processingText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
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

    // Success
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

    // Failed
    failedSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    failedCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: VoltColors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    failedText: {
        fontSize: VoltFontSize.lg,
        fontWeight: '600',
        color: VoltColors.error,
    },
    retryButton: {
        borderWidth: 1,
        borderColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.md,
    },
    retryText: {
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: VoltColors.neonGreen,
    },

    // Stripe
    stripeBranding: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: VoltSpacing.xl,
        left: 0,
        right: 0,
    },
    stripeText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
});
