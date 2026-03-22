/**
 * VoltCheck — Payment Screen
 * Stripe Payment Sheet integration with order summary
 *
 * Pas 1: Real payment flow + mock isolation + security badges fix
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import {
    createPaymentIntentRemote,
    subscribeToPaymentStatus,
    subscribeToReportStatus,
    USE_MOCK_DATA,
} from '@/services/cloudFunctions';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    initPaymentSheet,
    presentPaymentSheet,
} from '@stripe/stripe-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type PaymentStatus = 'idle' | 'processing' | 'confirming' | 'generating' | 'success' | 'failed';

interface PaymentError {
    message: string;
    code?: string;
}

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

    const level = parseInt(params.level || '1') as 1 | 2;
    const price = level === 1 ? '15.00' : '99.00';
    const priceLabel = level === 1 ? '15 RON' : '99 RON';
    const levelName = level === 1 ? t('levels.level1.name') : t('levels.level2.name');

    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [error, setError] = useState<PaymentError | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const progressAnim = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const unsubPaymentRef = useRef<(() => void) | null>(null);
    const unsubReportRef = useRef<(() => void) | null>(null);

    // Cleanup listener on unmount
    useEffect(() => {
        return () => {
            unsubPaymentRef.current?.();
            unsubReportRef.current?.();
        };
    }, []);

    // ═══════════════════════════════════════════
    // MOCK PAYMENT FLOW
    // ═══════════════════════════════════════════
    const handleMockPayment = useCallback(async () => {
        setStatus('processing');
        setError(null);

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
            useNativeDriver: true,
        }).start();

        setTimeout(() => {
            router.replace({
                pathname: '/report/[id]',
                params: { id: 'demo_report_001' },
            });
        }, 2000);
    }, [progressAnim, checkmarkScale, router]);

    // ═══════════════════════════════════════════
    // REAL STRIPE PAYMENT FLOW
    // ═══════════════════════════════════════════
    const handleRealPayment = useCallback(async () => {
        setStatus('processing');
        setError(null);
        setStatusMessage('Se creează sesiunea de plată...');

        Animated.timing(progressAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
        }).start();

        try {
            // Step 1: Create Payment Intent via Cloud Function
            const { clientSecret, paymentIntentId } = await createPaymentIntentRemote({
                level,
                vin: params.vin || '',
                vehicleMake: params.make,
                vehicleModel: params.model,
            });

            // Step 2: Initialize Stripe Payment Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'VoltCheck',
                style: 'alwaysDark',
                returnURL: 'voltcheck://payment-return',
            });

            if (initError) {
                throw new Error(initError.message || 'Nu s-a putut inițializa plata');
            }

            Animated.timing(progressAnim, {
                toValue: 0.5,
                duration: 300,
                useNativeDriver: false,
            }).start();

            // Step 3: Present Payment Sheet
            setStatus('confirming');
            setStatusMessage('Confirmă plata...');

            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                // User cancelled or payment failed
                if (presentError.code === 'Canceled') {
                    setStatus('idle');
                    progressAnim.setValue(0);
                    return;
                }
                throw new Error(presentError.message || 'Plata a eșuat');
            }

            // Step 4: Payment confirmed — listen for report generation
            Animated.timing(progressAnim, {
                toValue: 0.7,
                duration: 500,
                useNativeDriver: false,
            }).start();

            setStatus('generating');
            setStatusMessage('Se așteaptă confirmarea plății...');

            // Step 4a: Listen for payment completion → discover reportId
            unsubPaymentRef.current = subscribeToPaymentStatus(
                paymentIntentId,
                (paymentUpdate) => {
                    if (paymentUpdate.paymentStatus === 'completed' && paymentUpdate.reportId) {
                        // Payment confirmed, reportId discovered — now track report pipeline
                        unsubPaymentRef.current?.();
                        setStatusMessage('Se generează raportul...');

                        Animated.timing(progressAnim, {
                            toValue: 0.8,
                            duration: 500,
                            useNativeDriver: false,
                        }).start();

                        // Step 4b: Listen for report status updates
                        unsubReportRef.current = subscribeToReportStatus(
                            paymentUpdate.reportId,
                            (reportStatus) => {
                                if (reportStatus.status === 'completed') {
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
                                        useNativeDriver: true,
                                    }).start();

                                    // Navigate to report
                                    setTimeout(() => {
                                        router.replace({
                                            pathname: '/report/[id]',
                                            params: { id: paymentUpdate.reportId! },
                                        });
                                    }, 2000);
                                } else if (reportStatus.status === 'failed') {
                                    setError({
                                        message: reportStatus.failureReason || 'Generarea raportului a eșuat',
                                    });
                                    setStatus('failed');
                                    progressAnim.setValue(0);
                                } else {
                                    setStatusMessage(
                                        getStatusLabel(reportStatus.statusDetails)
                                    );
                                }
                            },
                            (err) => {
                                setError({
                                    message: err.message || 'Eroare la monitorizarea raportului',
                                });
                                setStatus('failed');
                                progressAnim.setValue(0);
                            }
                        );
                    } else if (paymentUpdate.paymentStatus === 'failed') {
                        setError({
                            message: paymentUpdate.failureReason || 'Plata a eșuat',
                        });
                        setStatus('failed');
                        progressAnim.setValue(0);
                    }
                },
                (err) => {
                    setError({
                        message: err.message || 'Eroare la monitorizarea plății',
                    });
                    setStatus('failed');
                    progressAnim.setValue(0);
                }
            );
        } catch (err: any) {
            setError({
                message: err.message || 'A apărut o eroare neașteptată',
                code: err.code,
            });
            setStatus('failed');
            Animated.timing(progressAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [level, params, progressAnim, checkmarkScale, router]);

    // ═══════════════════════════════════════════
    // PAYMENT HANDLER (routes to mock or real)
    // ═══════════════════════════════════════════
    const handlePayment = useCallback(() => {
        if (USE_MOCK_DATA) {
            handleMockPayment();
        } else {
            handleRealPayment();
        }
    }, [handleMockPayment, handleRealPayment]);

    const handleRetry = useCallback(() => {
        setStatus('idle');
        setError(null);
        setStatusMessage('');
        progressAnim.setValue(0);
        checkmarkScale.setValue(0);
        unsubPaymentRef.current?.();
        unsubReportRef.current?.();
    }, [progressAnim, checkmarkScale]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            bounces={false}
        >
            {/* Demo Mode Banner */}
            {USE_MOCK_DATA && (
                <View style={styles.demoBanner}>
                    <Text style={styles.demoBannerText}>🧪 Demo Mode</Text>
                    <Text style={styles.demoBannerSubtext}>
                        Plățile sunt simulate. Setează EXPO_PUBLIC_USE_MOCK_DATA=false pentru mod real.
                    </Text>
                </View>
            )}

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
                    <Text style={styles.securityText}>Secure Processing</Text>
                </View>
                <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Stripe Secure</Text>
                </View>
                <View style={styles.securityBadge}>
                    <Ionicons name="finger-print" size={14} color={VoltColors.neonGreen} />
                    <Text style={styles.securityText}>Session Protected</Text>
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

            {(status === 'processing' || status === 'confirming' || status === 'generating') && (
                <View style={styles.processingSection}>
                    <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                    <Text style={styles.processingText}>
                        {statusMessage || t('payment.processing')}
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
                    {status === 'generating' && (
                        <Text style={styles.statusHint}>
                            Acest proces durează ~30 secunde
                        </Text>
                    )}
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
                    <Text style={styles.redirectText}>Se deschide raportul...</Text>
                </View>
            )}

            {status === 'failed' && (
                <View style={styles.failedSection}>
                    <View style={styles.failedCircle}>
                        <Ionicons name="close" size={48} color={VoltColors.white} />
                    </View>
                    <Text style={styles.failedText}>{t('payment.failed')}</Text>
                    {error && (
                        <Text style={styles.errorDetail}>{error.message}</Text>
                    )}
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
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
        </ScrollView>
    );
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/** Map pipeline statusDetails to human-readable labels */
function getStatusLabel(statusDetails: string): string {
    const labels: Record<string, string> = {
        payment_confirmed: 'Plată confirmată',
        decoding_vin: 'Se decodifică VIN-ul...',
        searching_eu_databases: 'Se caută în bazele de date EU...',
        searching_global_databases: 'Se caută în bazele de date globale...',
        calculating_risk_score: 'Se calculează scorul de risc...',
        generating_pdf: 'Se generează PDF-ul...',
        uploading_report: 'Se finalizează raportul...',
    };
    return labels[statusDetails] || 'Se procesează...';
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

    // Demo banner
    demoBanner: {
        backgroundColor: 'rgba(255, 179, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 179, 0, 0.3)',
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.md,
        alignItems: 'center',
    },
    demoBannerText: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: VoltColors.warning,
    },
    demoBannerSubtext: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        marginTop: 4,
        textAlign: 'center',
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
    statusHint: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontStyle: 'italic',
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
    errorDetail: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: VoltSpacing.lg,
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
        marginTop: VoltSpacing.xl,
        paddingBottom: VoltSpacing.md,
    },
    stripeText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
});
