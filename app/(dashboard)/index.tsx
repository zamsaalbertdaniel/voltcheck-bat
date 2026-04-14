/**
 * InspectEV — Dashboard Main (Verificare Nouă)
 * VIN input → Decode → Teaser Cards → Paywall → Payment → Radar Pipeline
 */

import LevelSelector from '@/components/scan/LevelSelector';
import VehicleResultCard from '@/components/scan/VehicleResultCard';
import VehicleResultSkeleton from '@/components/scan/VehicleResultSkeleton';
import VinInputCard from '@/components/scan/VinInputCard';
import ReportRadar from '@/components/ReportRadar';
import VoltFooter from '@/components/layout/VoltFooter';
import TeaserBatteryCard from '@/components/dashboard/TeaserBatteryCard';
import TeaserDamageCard from '@/components/dashboard/TeaserDamageCard';
import PaywallSection from '@/components/dashboard/PaywallSection';
import {
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import {
    checkEligibilityRemote,
    createPaymentIntentRemote,
    createCheckoutSessionRemote,
    decodeVinRemote,
    EligibilityResponse,
    parseCloudError,
    ReportStatus,
    subscribeToPaymentStatus,
    VINDecodeResponse,
} from '@/services/cloudFunctions';
import { isValidVIN } from '@/utils/vinDecoder';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type ScreenState =
    | 'input'
    | 'decoding'
    | 'teaser'        // Show teaser cards + paywall
    | 'paying'
    | 'pipeline'
    | 'complete';

export default function DashboardIndex() {
    const { t } = useTranslation();
    const router = useRouter();
    const { vin: vinParam, scannedVin } = useLocalSearchParams<{ vin?: string; scannedVin?: string }>();

    const [vin, setVin] = useState('');
    const [vinError, setVinError] = useState('');
    const [screenState, setScreenState] = useState<ScreenState>('input');
    const [selectedLevel, setSelectedLevel] = useState<1 | 2 | null>(null);
    const [decodedData, setDecodedData] = useState<VINDecodeResponse | null>(null);
    const [reportId, setReportId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [eligibilityLoading, setEligibilityLoading] = useState(false);

    const glowAnim = useRef(new Animated.Value(0)).current;
    const decodeSpinner = useRef(new Animated.Value(0)).current;
    const paymentUnsubRef = useRef<(() => void) | null>(null);

    // Glow animation
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [glowAnim]);

    // Handle VIN from landing page or camera scan — auto-populate
    const autoDecodeVin = useRef<string | null>(null);
    useEffect(() => {
        const incoming = scannedVin || vinParam;
        if (incoming) {
            const cleaned = incoming.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
            setVin(cleaned);
            setVinError('');
            setErrorMessage('');

            // Mark for auto-decode if VIN is valid
            if (isValidVIN(cleaned)) {
                autoDecodeVin.current = cleaned;
            }
        }
    }, [scannedVin, vinParam]);

    const handleVinChange = (text: string) => {
        setVin(text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''));
        setVinError('');
        setErrorMessage('');
    };

    const handleDecode = useCallback(async () => {
        if (!isValidVIN(vin)) {
            setVinError(t('scan.invalidVin'));
            return;
        }

        setScreenState('decoding');
        setErrorMessage('');

        Animated.loop(
            Animated.timing(decodeSpinner, { toValue: 1, duration: 1000, useNativeDriver: true })
        ).start();

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await decodeVinRemote(vin, 1);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setDecodedData(result);
            setScreenState('teaser');

            // Check Level 2 eligibility in background
            setEligibilityLoading(true);
            checkEligibilityRemote(vin)
                .then((eligResult) => setEligibility(eligResult))
                .catch(() => setEligibility({ vin, compatible: false, reason: 'eligibility_check_failed' }))
                .finally(() => setEligibilityLoading(false));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const parsed = parseCloudError(error);

            if (parsed.isRateLimit) {
                setErrorMessage(t('errors.rateLimit', { seconds: parsed.retryAfterSeconds || 60 }));
            } else if (parsed.isAuthError) {
                setErrorMessage(t('errors.authRequired'));
            } else if (parsed.isNetworkError) {
                setErrorMessage(t('errors.networkError'));
            } else if (parsed.validationCode) {
                setErrorMessage(t(`errors.vin_${parsed.validationCode.toLowerCase()}`, { defaultValue: parsed.message }));
            } else {
                setErrorMessage(parsed.message || t('errors.unknownError'));
            }

            setScreenState('input');
        }
    }, [vin, t, decodeSpinner]);

    // Auto-decode VIN that came from landing page passthrough
    useEffect(() => {
        if (autoDecodeVin.current && screenState === 'input' && vin === autoDecodeVin.current) {
            autoDecodeVin.current = null;
            handleDecode();
        }
    }, [vin, screenState, handleDecode]);

    const handleStartScan = useCallback(async (level: 1 | 2) => {
        setSelectedLevel(level);
        setScreenState('paying');
        setErrorMessage('');

        if (paymentUnsubRef.current) {
            paymentUnsubRef.current();
            paymentUnsubRef.current = null;
        }

        try {
            if (Platform.OS === 'web') {
                const { url } = await createCheckoutSessionRemote({
                    level,
                    vin,
                    vehicleMake: decodedData?.nhtsa?.make,
                    vehicleModel: decodedData?.nhtsa?.model,
                    returnUrl: window.location.origin + '/payment-complete',
                });
                // Redirect to Hosted Checkout
                window.location.href = url;
                return;
            }

            const intent = await createPaymentIntentRemote({
                level,
                vin,
                vehicleMake: decodedData?.nhtsa?.make,
                vehicleModel: decodedData?.nhtsa?.model,
            });

            const { initializeStripePayment, presentStripePayment } = await import('@/services/stripeService');
            
            const { error: initError } = await initializeStripePayment(intent.clientSecret);
            if (initError) throw new Error(initError.message || t('errors.paymentFailed'));

            const { error: presentError } = await presentStripePayment();
            if (presentError) {
                if (presentError.code === 'Canceled') {
                    setScreenState('teaser');
                    return;
                }
                throw new Error(presentError.message || t('errors.paymentFailed'));
            }

            setScreenState('pipeline');

            paymentUnsubRef.current = subscribeToPaymentStatus(
                intent.paymentIntentId,
                (update) => {
                    if (update.paymentStatus === 'failed') {
                        setErrorMessage(update.failureReason || t('errors.paymentFailed'));
                        setScreenState('teaser');
                        paymentUnsubRef.current?.();
                        paymentUnsubRef.current = null;
                        return;
                    }
                    if (update.paymentStatus === 'completed' && update.reportId) {
                        setReportId(update.reportId);
                        // Make sure screenState is pipeline
                        setScreenState('pipeline');
                        paymentUnsubRef.current?.();
                        paymentUnsubRef.current = null;
                    }
                },
                (err) => {
                    setErrorMessage(err.message || t('errors.paymentFailed'));
                    setScreenState('teaser');
                    paymentUnsubRef.current?.();
                    paymentUnsubRef.current = null;
                }
            );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const parsed = parseCloudError(error);
            setErrorMessage(
                parsed.isRateLimit
                    ? t('errors.rateLimit', { seconds: parsed.retryAfterSeconds || 60 })
                    : (error.message || t('errors.paymentFailed'))
            );
            setScreenState('teaser');
        }
    }, [vin, decodedData, t]);

    const handleReset = useCallback(() => {
        if (paymentUnsubRef.current) {
            paymentUnsubRef.current();
            paymentUnsubRef.current = null;
        }
        setScreenState('input');
        setVin('');
        setDecodedData(null);
        setSelectedLevel(null);
        setReportId(null);
        setErrorMessage('');
        setEligibility(null);
        setEligibilityLoading(false);
    }, []);

    useEffect(() => {
        return () => {
            if (paymentUnsubRef.current) {
                paymentUnsubRef.current();
                paymentUnsubRef.current = null;
            }
        };
    }, []);

    const handlePipelineComplete = useCallback((status: ReportStatus) => {
        setScreenState('complete');
        Alert.alert(
            'InspectEV',
            `${t('scan.reportCompleted')}\n${t('scan.riskScoreLabel')}: ${status.riskScore}/100 (${status.riskCategory})`,
            [
                {
                    text: t('scan.viewReport') || 'Vezi Raport',
                    onPress: () => {
                        const currentReportId = reportId;
                        handleReset();
                        if (currentReportId) {
                            router.push(`/report/${currentReportId}`);
                        } else {
                            router.push('/(dashboard)/reports');
                        }
                    },
                },
                { text: t('scan.newScan') || 'Scanare Nouă', onPress: handleReset },
            ]
        );
    }, [router, reportId, handleReset, t]);

    const handlePipelineError = useCallback((error: string) => {
        Alert.alert(`${t('scan.errorTitle')}`, error, [
            { text: 'OK', onPress: () => setScreenState('teaser') },
        ]);
    }, [t]);

    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
    const spinRotation = decodeSpinner.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
                    <Image
                        source={require('@/assets/images/logo-small.png')}
                        style={styles.headerLogo}
                    />
                    <Text style={styles.title}>{t('scan.title')}</Text>
                    <Text style={styles.subtitle}>{t('scan.subtitle')}</Text>
                </View>

                {/* Pipeline Radar */}
                {screenState === 'pipeline' && reportId && (
                    <ReportRadar
                        reportId={reportId}
                        onComplete={handlePipelineComplete}
                        onError={handlePipelineError}
                        onCancel={() => setScreenState('teaser')}
                    />
                )}

                {/* VIN Input */}
                {(screenState === 'input' || screenState === 'decoding') && (
                    <VinInputCard
                        vin={vin}
                        vinError={vinError}
                        errorMessage={errorMessage}
                        isDecoding={screenState === 'decoding'}
                        spinRotation={spinRotation}
                        onVinChange={handleVinChange}
                        onDecode={handleDecode}
                    />
                )}

                {/* Decoding skeleton */}
                {screenState === 'decoding' && <VehicleResultSkeleton />}

                {/* Teaser + Paywall */}
                {(screenState === 'teaser' || screenState === 'paying') && decodedData && (
                    <>
                        <VehicleResultCard decodedData={decodedData} />

                        {/* Glassmorphism teaser cards */}
                        <TeaserBatteryCard
                            isCompatible={eligibility?.compatible ?? false}
                            loading={eligibilityLoading}
                        />
                        <TeaserDamageCard />

                        {/* Paywall — Standard vs Premium */}
                        <PaywallSection
                            isPaying={screenState === 'paying'}
                            errorMessage={errorMessage}
                            onSelect={handleStartScan}
                            level2Eligible={eligibility?.compatible ?? null}
                        />
                    </>
                )}

                <VoltFooter />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xl,
        paddingBottom: 80,
    },
    header: {
        alignItems: 'center',
        marginBottom: VoltSpacing.xl,
    },
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: VoltColors.neonGreenGlow,
        top: -36,
    },
    headerLogo: {
        width: 56,
        height: 56,
        resizeMode: 'contain',
    },
    title: {
        fontSize: VoltFontSize.xxl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        marginTop: VoltSpacing.md,
    },
    subtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        marginTop: VoltSpacing.xs,
        textAlign: 'center',
    },
});
