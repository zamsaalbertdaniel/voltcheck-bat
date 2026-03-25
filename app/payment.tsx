/**
 * VoltCheck — Payment Screen
 * Stripe Payment Sheet integration with order summary
 *
 * Pas 1: Real payment flow + mock isolation + security badges fix
 */

import OrderSummary from '@/components/payment/OrderSummary';
import PaymentStatusOverlay from '@/components/payment/PaymentStatusOverlay';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import {
    createPaymentIntentRemote,
    subscribeToPaymentStatus,
    subscribeToReportStatus,
    USE_MOCK_DATA,
} from '@/services/cloudFunctions';
import { Ionicons } from '@expo/vector-icons';
import { initializeStripePayment, presentStripePayment } from '@/services/stripeService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
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
    const priceLabel = level === 1 ? '15 RON' : '99 RON';
    const levelName = level === 1 ? t('levels.level1.name') : t('levels.level2.name');

    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [error, setError] = useState<PaymentError | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const progressAnim = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const unsubPaymentRef = useRef<(() => void) | null>(null);
    const unsubReportRef = useRef<(() => void) | null>(null);

    // Cleanup listeners on unmount
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

        Animated.timing(progressAnim, { toValue: 0.5, duration: 1500, useNativeDriver: false }).start();
        await new Promise(resolve => setTimeout(resolve, 1500));

        Animated.timing(progressAnim, { toValue: 0.8, duration: 500, useNativeDriver: false }).start();
        setStatus('generating');
        setStatusMessage('Se generează raportul demo...');

        await new Promise(resolve => setTimeout(resolve, 1500));

        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        setStatus('success');
        Animated.spring(checkmarkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start();

        setTimeout(() => {
            router.replace({ pathname: '/report/[id]', params: { id: 'demo_report_001' } });
        }, 2000);
    }, [progressAnim, checkmarkScale, router]);

    // ═══════════════════════════════════════════
    // REAL STRIPE PAYMENT FLOW
    // ═══════════════════════════════════════════
    const handleRealPayment = useCallback(async () => {
        setStatus('processing');
        setError(null);
        setStatusMessage('Se creează sesiunea de plată...');

        Animated.timing(progressAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }).start();

        try {
            const { clientSecret, paymentIntentId } = await createPaymentIntentRemote({
                level,
                vin: params.vin || '',
                vehicleMake: params.make,
                vehicleModel: params.model,
            });

            const { error: initError } = await initializeStripePayment(clientSecret);
            if (initError) throw new Error(initError.message || 'Nu s-a putut inițializa plata');

            Animated.timing(progressAnim, { toValue: 0.5, duration: 300, useNativeDriver: false }).start();

            setStatus('confirming');
            setStatusMessage('Confirmă plata...');

            const { error: presentError } = await presentStripePayment();
            if (presentError) {
                if (presentError.code === 'Canceled') {
                    setStatus('idle');
                    progressAnim.setValue(0);
                    return;
                }
                throw new Error(presentError.message || 'Plata a eșuat');
            }

            Animated.timing(progressAnim, { toValue: 0.7, duration: 500, useNativeDriver: false }).start();
            setStatus('generating');
            setStatusMessage('Se așteaptă confirmarea plății...');

            unsubPaymentRef.current = subscribeToPaymentStatus(
                paymentIntentId,
                (paymentUpdate) => {
                    if (paymentUpdate.paymentStatus === 'completed' && paymentUpdate.reportId) {
                        unsubPaymentRef.current?.();
                        setStatusMessage('Se generează raportul...');
                        Animated.timing(progressAnim, { toValue: 0.8, duration: 500, useNativeDriver: false }).start();

                        unsubReportRef.current = subscribeToReportStatus(
                            paymentUpdate.reportId,
                            (reportStatus) => {
                                if (reportStatus.status === 'completed') {
                                    Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
                                    setStatus('success');
                                    Animated.spring(checkmarkScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }).start();
                                    setTimeout(() => {
                                        router.replace({ pathname: '/report/[id]', params: { id: paymentUpdate.reportId! } });
                                    }, 2000);
                                } else if (reportStatus.status === 'failed') {
                                    setError({ message: reportStatus.failureReason || 'Generarea raportului a eșuat' });
                                    setStatus('failed');
                                    progressAnim.setValue(0);
                                } else {
                                    setStatusMessage(getStatusLabel(reportStatus.statusDetails));
                                }
                            },
                            (err) => {
                                setError({ message: err.message || 'Eroare la monitorizarea raportului' });
                                setStatus('failed');
                                progressAnim.setValue(0);
                            }
                        );
                    } else if (paymentUpdate.paymentStatus === 'failed') {
                        setError({ message: paymentUpdate.failureReason || 'Plata a eșuat' });
                        setStatus('failed');
                        progressAnim.setValue(0);
                    }
                },
                (err) => {
                    setError({ message: err.message || 'Eroare la monitorizarea plății' });
                    setStatus('failed');
                    progressAnim.setValue(0);
                }
            );
        } catch (err: any) {
            setError({ message: err.message || 'A apărut o eroare neașteptată', code: err.code });
            setStatus('failed');
            Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
        }
    }, [level, params, progressAnim, checkmarkScale, router]);

    const handlePayment = useCallback(() => {
        if (USE_MOCK_DATA) handleMockPayment();
        else handleRealPayment();
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

            <OrderSummary
                level={level}
                vin={params.vin || 'WVWZZZE3ZWE123456'}
                make={params.make || 'Tesla'}
                model={params.model || 'Model 3'}
                priceLabel={priceLabel}
                levelName={levelName}
            />

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

            <PaymentStatusOverlay
                status={status}
                statusMessage={statusMessage}
                priceLabel={priceLabel}
                error={error}
                progressAnim={progressAnim}
                checkmarkScale={checkmarkScale}
                onPay={handlePayment}
                onRetry={handleRetry}
            />

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
