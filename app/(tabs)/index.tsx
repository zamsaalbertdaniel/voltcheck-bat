/**
 * InspectEV — Scan Screen (Main Tab)
 * VIN input → Cloud Function decode → Level selection → Payment → Radar Pipeline
 *
 * FLOW:
 *   1. User enters VIN (17 chars, validated)
 *   2. "Verifică" calls decodeVinRemote (Cloud Function / Mock)
 *   3. Vehicle card shown, select Level 1 or 2
 *   4. Payment (mock: instant success | live: Stripe Sheet)
 *   5. ReportRadar component shows real-time pipeline status
 *   6. On complete → navigate to Garage or show risk score
 *
 * Design: Dark Mode Tech with Neon Green (#00E676) accents
 */

import LevelSelector from '@/components/scan/LevelSelector';
import VehicleResultCard from '@/components/scan/VehicleResultCard';
import VehicleResultSkeleton from '@/components/scan/VehicleResultSkeleton';
import VinInputCard from '@/components/scan/VinInputCard';
import ReportRadar from '@/components/ReportRadar';
import {
  VoltColors,
  VoltFontSize,
  VoltSpacing,
} from '@/constants/Theme';
import {
  checkEligibilityRemote,
  createPaymentIntentRemote,
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ── Screen States ──
type ScreenState =
  | 'input'           // VIN entry
  | 'decoding'        // Calling decodeVin Cloud Function
  | 'level_select'    // Showing vehicle card + level cards
  | 'paying'          // Stripe payment processing
  | 'pipeline'        // ReportRadar showing real-time status
  | 'complete';       // Report ready

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scannedVin } = useLocalSearchParams<{ scannedVin?: string }>();

  // State
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | null>(null);
  const [decodedData, setDecodedData] = useState<VINDecodeResponse | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;
  const decodeSpinner = useRef(new Animated.Value(0)).current;

  // Holds the unsubscribe handle for the payment-status Firestore listener
  // so we can clean it up on unmount, reset, or when the report arrives.
  const paymentUnsubRef = useRef<(() => void) | null>(null);

  // Glow animation (with proper cleanup to avoid leak)
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

  // Handle returning from camera scan
  useEffect(() => {
    if (scannedVin) {
      setVin(scannedVin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''));
      setVinError('');
      setErrorMessage('');
    }
  }, [scannedVin]);

  // ── VIN Input Handler ──
  const handleVinChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    setVin(cleaned);
    setVinError('');
    setErrorMessage('');
  };

  // ── Decode VIN (Cloud Function) ──
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
      setScreenState('level_select');

      // Check Level 2 eligibility in background (non-blocking)
      setEligibilityLoading(true);
      checkEligibilityRemote(vin)
        .then((eligResult) => {
          setEligibility(eligResult);
        })
        .catch(() => {
          // Fail gracefully — don't block user
          setEligibility({ vin, compatible: false, reason: 'eligibility_check_failed' });
        })
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

  // ── Start Payment + Pipeline ──
  const handleStartScan = useCallback(async (level: 1 | 2) => {
    setSelectedLevel(level);
    setScreenState('paying');
    setErrorMessage('');

    // Defensive: tear down any previous payment listener before starting a new one
    if (paymentUnsubRef.current) {
      paymentUnsubRef.current();
      paymentUnsubRef.current = null;
    }

    try {
      const intent = await createPaymentIntentRemote({
        level,
        vin,
        vehicleMake: decodedData?.nhtsa?.make,
        vehicleModel: decodedData?.nhtsa?.model,
      });

      // The Stripe webhook on the server creates the report doc and writes
      // its id back onto payments/{paymentIntentId}. We listen for that
      // update — the real reportId is the one ReportRadar will subscribe to.
      paymentUnsubRef.current = subscribeToPaymentStatus(
        intent.paymentIntentId,
        (update) => {
          if (update.paymentStatus === 'failed') {
            setErrorMessage(update.failureReason || t('errors.paymentFailed'));
            setScreenState('level_select');
            paymentUnsubRef.current?.();
            paymentUnsubRef.current = null;
            return;
          }
          if (update.paymentStatus === 'completed' && update.reportId) {
            setReportId(update.reportId);
            setScreenState('pipeline');
            // We've got what we needed — stop listening to the payment doc.
            paymentUnsubRef.current?.();
            paymentUnsubRef.current = null;
          }
        },
        (err) => {
          setErrorMessage(err.message || t('errors.paymentFailed'));
          setScreenState('level_select');
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
          : t('errors.paymentFailed')
      );
      setScreenState('level_select');
    }
  }, [vin, decodedData, t]);

  // ── Reset ──
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

  // Make sure the payment listener is detached if the user navigates away
  // before the webhook fires.
  useEffect(() => {
    return () => {
      if (paymentUnsubRef.current) {
        paymentUnsubRef.current();
        paymentUnsubRef.current = null;
      }
    };
  }, []);

  // ── Pipeline Complete ──
  const handlePipelineComplete = useCallback((status: ReportStatus) => {
    setScreenState('complete');
    Alert.alert(
      '⚡ InspectEV',
      `${t('scan.reportCompleted')}\n${t('scan.riskScoreLabel')}: ${status.riskScore}/100 (${status.riskCategory})`,
      [
        {
          text: t('scan.viewReport') || 'Vezi Raport',
          onPress: () => {
            const currentReportId = reportId;
            handleReset();
            // Navigate directly to the report detail screen
            if (currentReportId) {
              router.push(`/report/${currentReportId}`);
            } else {
              router.push('/(tabs)/garage');
            }
          },
        },
        { text: t('scan.newScan') || 'Scanare Nouă', onPress: handleReset },
      ]
    );
  }, [router, reportId, handleReset, t]);

  // ── Pipeline Error ──
  const handlePipelineError = useCallback((error: string) => {
    Alert.alert(`⚠️ ${t('scan.errorTitle')}`, error, [
      { text: 'OK', onPress: () => setScreenState('level_select') },
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
          <MaterialCommunityIcons
            name="battery-charging-high"
            size={48}
            color={VoltColors.neonGreen}
          />
          <Text style={styles.title}>{t('scan.title')}</Text>
          <Text style={styles.subtitle}>{t('scan.subtitle')}</Text>
        </View>

        {/* ══════ PIPELINE RADAR ══════ */}
        {screenState === 'pipeline' && reportId && (
          <ReportRadar
            reportId={reportId}
            onComplete={handlePipelineComplete}
            onError={handlePipelineError}
            onCancel={() => setScreenState('level_select')}
          />
        )}

        {/* ══════ VIN INPUT (input | decoding) ══════ */}
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

        {/* ══════ VEHICLE CARD + LEVEL SELECT ══════ */}
        {screenState === 'decoding' && <VehicleResultSkeleton />}
        
        {(screenState === 'level_select' || screenState === 'paying') && decodedData && (
          <>
            <VehicleResultCard decodedData={decodedData} />
            <LevelSelector
              selectedLevel={selectedLevel}
              isPaying={screenState === 'paying'}
              spinRotation={spinRotation}
              errorMessage={errorMessage}
              onSelect={handleStartScan}
              level2Eligible={eligibility?.compatible ?? null}
              level2EligibilityReason={eligibility?.reason}
              level2EligibilityLoading={eligibilityLoading}
            />
          </>
        )}

        {/* Footer branding */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 {t('payment.secure')}
          </Text>
        </View>
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
    paddingTop: VoltSpacing.xxl,
    paddingBottom: 120,
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
  footer: {
    alignItems: 'center',
    marginTop: VoltSpacing.xl,
  },
  footerText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textTertiary,
  },
});
