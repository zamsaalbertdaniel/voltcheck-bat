/**
 * VoltCheck — Scan Screen (Main Tab)
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
import VinInputCard from '@/components/scan/VinInputCard';
import ReportRadar from '@/components/ReportRadar';
import {
  VoltBorderRadius,
  VoltColors,
  VoltFontSize,
  VoltSpacing,
} from '@/constants/Theme';
import {
  createPaymentIntentRemote,
  decodeVinRemote,
  parseCloudError,
  ReportStatus,
  VINDecodeResponse,
} from '@/services/cloudFunctions';
import { isValidVIN } from '@/utils/vinDecoder';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
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

  // State
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | null>(null);
  const [decodedData, setDecodedData] = useState<VINDecodeResponse | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;
  const decodeSpinner = useRef(new Animated.Value(0)).current;

  // Glow animation
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

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
      const result = await decodeVinRemote(vin, 1);
      setDecodedData(result);
      setScreenState('level_select');
    } catch (error: any) {
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
  }, [vin, t]);

  // ── Start Payment + Pipeline ──
  const handleStartScan = useCallback(async (level: 1 | 2) => {
    setSelectedLevel(level);
    setScreenState('paying');
    setErrorMessage('');

    try {
      await createPaymentIntentRemote({
        level,
        vin,
        vehicleMake: decodedData?.nhtsa?.make,
        vehicleModel: decodedData?.nhtsa?.model,
      });

      const mockReportId = `rpt_${Date.now()}_mock`;
      setReportId(mockReportId);
      setScreenState('pipeline');
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

  // ── Pipeline Complete ──
  const handlePipelineComplete = useCallback((status: ReportStatus) => {
    setScreenState('complete');
    Alert.alert(
      '⚡ VoltCheck',
      `${t('scan.reportCompleted')}\n${t('scan.riskScoreLabel')}: ${status.riskScore}/100 (${status.riskCategory})`,
      [
        { text: t('scan.viewReport'), onPress: handleReset },
        { text: t('scan.newScan'), onPress: handleReset },
      ]
    );
  }, []);

  // ── Pipeline Error ──
  const handlePipelineError = useCallback((error: string) => {
    Alert.alert(`⚠️ ${t('scan.errorTitle')}`, error, [
      { text: 'OK', onPress: () => setScreenState('level_select') },
    ]);
  }, []);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setScreenState('input');
    setVin('');
    setDecodedData(null);
    setSelectedLevel(null);
    setReportId(null);
    setErrorMessage('');
  }, []);

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
        {(screenState === 'level_select' || screenState === 'paying') && decodedData && (
          <>
            <VehicleResultCard decodedData={decodedData} />
            <LevelSelector
              selectedLevel={selectedLevel}
              isPaying={screenState === 'paying'}
              spinRotation={spinRotation}
              errorMessage={errorMessage}
              onSelect={handleStartScan}
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
