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

import ReportRadar from '@/components/ReportRadar';
import {
  VoltBorderRadius,
  VoltColors,
  VoltFontSize,
  VoltShadow,
  VoltSpacing
} from '@/constants/Theme';
import {
  createPaymentIntentRemote,
  decodeVinRemote,
  parseCloudError,
  ReportStatus,
  VINDecodeResponse,
} from '@/services/cloudFunctions';
import { isValidVIN } from '@/utils/vinDecoder';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  TextInput,
  TouchableOpacity,
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

    // Spinner animation
    Animated.loop(
      Animated.timing(decodeSpinner, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
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
      // Create payment intent (mock or Stripe)
      const paymentResult = await createPaymentIntentRemote({
        level,
        vin,
        vehicleMake: decodedData?.nhtsa?.make,
        vehicleModel: decodedData?.nhtsa?.model,
      });

      // In mock mode, payment is instant. In production, show Stripe Sheet.
      // For now, simulate payment success and start pipeline
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
      `Raport finalizat!\nScor de Risc: ${status.riskScore}/100 (${status.riskCategory})`,
      [
        {
          text: 'Vezi Raportul',
          onPress: () => {
            // TODO: Navigate to Garage / Report viewer
            handleReset();
          },
        },
        {
          text: 'Scanare Nouă',
          onPress: handleReset,
        },
      ]
    );
  }, []);

  // ── Pipeline Error ──
  const handlePipelineError = useCallback((error: string) => {
    Alert.alert('⚠️ Eroare', error, [
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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const spinRotation = decodeSpinner.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
          <>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('scan.vinLabel')}</Text>
              <View style={[styles.inputContainer, vinError ? styles.inputError : null]}>
                <Ionicons
                  name="car-sport"
                  size={22}
                  color={vin.length === 17 ? VoltColors.neonGreen : VoltColors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={vin}
                  onChangeText={handleVinChange}
                  placeholder={t('scan.vinPlaceholder')}
                  placeholderTextColor={VoltColors.textTertiary}
                  maxLength={17}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={screenState === 'input'}
                />
                <Text style={[
                  styles.charCount,
                  vin.length === 17 ? styles.charCountValid : null,
                ]}>
                  {vin.length}/17
                </Text>
              </View>
              {vinError ? <Text style={styles.errorText}>{vinError}</Text> : null}

              {/* Camera shortcut */}
              <TouchableOpacity
                style={styles.cameraButton}
                disabled={screenState === 'decoding'}
              >
                <Ionicons name="camera" size={20} color={VoltColors.neonGreen} />
                <Text style={styles.cameraText}>{t('scan.scanCamera')}</Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={VoltColors.error} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Decode Button */}
            {screenState === 'input' && (
              <TouchableOpacity
                style={[
                  styles.decodeButton,
                  vin.length !== 17 ? styles.buttonDisabled : null,
                ]}
                onPress={handleDecode}
                disabled={vin.length !== 17}
              >
                <FontAwesome name="search" size={18} color={VoltColors.textOnGreen} />
                <Text style={styles.decodeButtonText}>{t('scan.startScan')}</Text>
              </TouchableOpacity>
            )}

            {/* Decoding Spinner */}
            {screenState === 'decoding' && (
              <View style={styles.decodingContainer}>
                <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                  <MaterialCommunityIcons name="radar" size={40} color={VoltColors.neonGreen} />
                </Animated.View>
                <Text style={styles.decodingText}>{t('scan.scanning')}</Text>
              </View>
            )}
          </>
        )}

        {/* ══════ VEHICLE CARD + LEVEL SELECT ══════ */}
        {(screenState === 'level_select' || screenState === 'paying') && decodedData && (
          <>
            {/* Vehicle Card */}
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <MaterialCommunityIcons
                  name="car-electric"
                  size={28}
                  color={VoltColors.neonGreen}
                />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {decodedData.nhtsa?.make} {decodedData.nhtsa?.model} ({decodedData.nhtsa?.year})
                  </Text>
                  <Text style={styles.vehicleVin}>{decodedData.vin}</Text>
                </View>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceText}>
                    {decodedData.source === 'mock' ? '🧪 MOCK' : decodedData.source === 'cache' ? '⚡ CACHE' : '🔴 LIVE'}
                  </Text>
                </View>
              </View>

              {/* Provider Summary */}
              {decodedData.providers.length > 0 && (
                <View style={styles.providerRow}>
                  {decodedData.providers.map((p, i) => (
                    <View key={i} style={styles.providerChip}>
                      <View style={[
                        styles.providerDot,
                        { backgroundColor: p.status === 'success' ? VoltColors.neonGreen : VoltColors.error },
                      ]} />
                      <Text style={styles.providerName}>{p.provider}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Recalls */}
              {decodedData.recalls.length > 0 && (
                <View style={styles.recallBanner}>
                  <Ionicons name="warning" size={16} color="#FFD600" />
                  <Text style={styles.recallText}>
                    {decodedData.recalls.length} recall(s) active
                  </Text>
                </View>
              )}
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={VoltColors.error} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Level Selection */}
            <View style={styles.levelsSection}>
              <Text style={styles.levelsTitle}>{t('levels.select')}</Text>

              {/* Level 1 — The Detective */}
              <TouchableOpacity
                style={[
                  styles.levelCard,
                  selectedLevel === 1 ? styles.levelCardSelected : null,
                ]}
                onPress={() => handleStartScan(1)}
                disabled={screenState === 'paying'}
              >
                <View style={styles.levelHeader}>
                  <View style={styles.levelIconContainer}>
                    <FontAwesome name="search" size={24} color={VoltColors.neonGreen} />
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>{t('levels.level1.name')}</Text>
                    <Text style={styles.levelDesc}>{t('levels.level1.description')}</Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{t('levels.level1.price')}</Text>
                  </View>
                </View>
                <View style={styles.featuresList}>
                  {(t('levels.level1.features', { returnObjects: true }) as string[]).map(
                    (feature: string, i: number) => (
                      <View key={i} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color={VoltColors.neonGreen} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    )
                  )}
                </View>
              </TouchableOpacity>

              {/* Level 2 — The Surgeon */}
              <TouchableOpacity
                style={[
                  styles.levelCard,
                  styles.levelCardPremium,
                  selectedLevel === 2 ? styles.levelCardSelected : null,
                ]}
                onPress={() => handleStartScan(2)}
                disabled={screenState === 'paying'}
              >
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>⚡ RECOMANDARE</Text>
                </View>
                <View style={styles.levelHeader}>
                  <View style={[styles.levelIconContainer, styles.levelIconPremium]}>
                    <MaterialCommunityIcons name="stethoscope" size={24} color={VoltColors.neonGreen} />
                  </View>
                  <View style={styles.levelInfo}>
                    <Text style={styles.levelName}>{t('levels.level2.name')}</Text>
                    <Text style={styles.levelDesc}>{t('levels.level2.description')}</Text>
                  </View>
                  <View style={[styles.priceTag, styles.priceTagPremium]}>
                    <Text style={styles.priceText}>{t('levels.level2.price')}</Text>
                  </View>
                </View>
                <View style={styles.featuresList}>
                  {(t('levels.level2.features', { returnObjects: true }) as string[]).map(
                    (feature: string, i: number) => (
                      <View key={i} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color={VoltColors.neonGreen} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    )
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Paying indicator */}
            {screenState === 'paying' && (
              <View style={styles.decodingContainer}>
                <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                  <Ionicons name="card" size={32} color={VoltColors.neonGreen} />
                </Animated.View>
                <Text style={styles.decodingText}>{t('payment.secure')}</Text>
              </View>
            )}
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

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
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
    paddingBottom: 120, // Increased to account for absolute glass tab bar
  },

  // Header
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

  // VIN Input
  inputSection: {
    marginBottom: VoltSpacing.lg,
  },
  inputLabel: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
    marginBottom: VoltSpacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VoltColors.bgInput,
    borderRadius: VoltBorderRadius.md,
    borderWidth: 1.5,
    borderColor: VoltColors.border,
    paddingHorizontal: VoltSpacing.md,
    height: 56,
  },
  inputError: {
    borderColor: VoltColors.error,
  },
  inputIcon: {
    marginRight: VoltSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: VoltFontSize.lg,
    color: VoltColors.textPrimary,
    fontFamily: 'SpaceMono',
    letterSpacing: 2,
  },
  charCount: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textTertiary,
    fontFamily: 'SpaceMono',
  },
  charCountValid: {
    color: VoltColors.neonGreen,
  },
  errorText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.error,
    marginTop: VoltSpacing.xs,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: VoltSpacing.md,
    paddingVertical: VoltSpacing.sm,
  },
  cameraText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.neonGreen,
    marginLeft: VoltSpacing.xs,
    fontWeight: '500',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    borderRadius: VoltBorderRadius.md,
    padding: VoltSpacing.md,
    marginBottom: VoltSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    gap: VoltSpacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: VoltFontSize.sm,
    color: VoltColors.error,
  },

  // Decode button (FUTURISTIC)
  decodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1.5,
    borderColor: VoltColors.neonGreen,
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: VoltSpacing.lg,
    gap: VoltSpacing.md,
    // Cyberpunk Glow
    shadowColor: VoltColors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  decodeButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: VoltColors.neonGreen,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: VoltColors.border,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Decoding spinner
  decodingContainer: {
    alignItems: 'center',
    paddingVertical: VoltSpacing.xl,
    gap: VoltSpacing.md,
  },
  decodingText: {
    fontSize: VoltFontSize.md,
    color: VoltColors.neonGreen,
    fontWeight: '600',
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: VoltColors.bgSecondary,
    borderRadius: VoltBorderRadius.lg,
    padding: VoltSpacing.lg,
    marginBottom: VoltSpacing.lg,
    borderWidth: 1,
    borderColor: VoltColors.border,
    ...VoltShadow.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: VoltSpacing.md,
  },
  vehicleName: {
    fontSize: VoltFontSize.lg,
    fontWeight: '700',
    color: VoltColors.textPrimary,
  },
  vehicleVin: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textTertiary,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  sourceBadge: {
    backgroundColor: VoltColors.neonGreenMuted,
    paddingHorizontal: VoltSpacing.sm,
    paddingVertical: VoltSpacing.xs,
    borderRadius: VoltBorderRadius.sm,
  },
  sourceText: {
    fontSize: VoltFontSize.xs,
    fontWeight: '700',
    color: VoltColors.neonGreen,
  },
  providerRow: {
    flexDirection: 'row',
    marginTop: VoltSpacing.md,
    gap: VoltSpacing.sm,
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VoltColors.bgTertiary,
    paddingHorizontal: VoltSpacing.sm,
    paddingVertical: 4,
    borderRadius: VoltBorderRadius.sm,
    gap: 4,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  providerName: {
    fontSize: VoltFontSize.xs,
    color: VoltColors.textSecondary,
  },
  recallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderRadius: VoltBorderRadius.sm,
    padding: VoltSpacing.sm,
    marginTop: VoltSpacing.md,
    gap: VoltSpacing.xs,
  },
  recallText: {
    fontSize: VoltFontSize.sm,
    color: '#FFD600',
    fontWeight: '600',
  },

  // Level Selection
  levelsSection: {
    marginBottom: VoltSpacing.lg,
  },
  levelsTitle: {
    fontSize: VoltFontSize.xl,
    fontWeight: '700',
    color: VoltColors.textPrimary,
    marginBottom: VoltSpacing.md,
  },
  levelCard: {
    backgroundColor: VoltColors.bgSecondary,
    borderRadius: VoltBorderRadius.lg,
    padding: VoltSpacing.lg,
    marginBottom: VoltSpacing.md,
    borderWidth: 1.5,
    borderColor: VoltColors.border,
    ...VoltShadow.md,
  },
  levelCardPremium: {
    borderColor: VoltColors.neonGreenMuted,
    backgroundColor: VoltColors.bgTertiary,
  },
  levelCardSelected: {
    borderColor: VoltColors.neonGreen,
  },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: VoltSpacing.md,
    backgroundColor: VoltColors.neonGreen,
    paddingHorizontal: VoltSpacing.sm,
    paddingVertical: 3,
    borderRadius: VoltBorderRadius.sm,
  },
  premiumText: {
    fontSize: VoltFontSize.xs,
    fontWeight: '800',
    color: VoltColors.textOnGreen,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: VoltSpacing.md,
  },
  levelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: VoltBorderRadius.md,
    backgroundColor: VoltColors.neonGreenMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconPremium: {
    backgroundColor: VoltColors.neonGreenGlow,
  },
  levelInfo: {
    flex: 1,
    marginLeft: VoltSpacing.md,
  },
  levelName: {
    fontSize: VoltFontSize.lg,
    fontWeight: '700',
    color: VoltColors.textPrimary,
  },
  levelDesc: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: VoltColors.bgInput,
    paddingHorizontal: VoltSpacing.md,
    paddingVertical: VoltSpacing.sm,
    borderRadius: VoltBorderRadius.sm,
  },
  priceTagPremium: {
    backgroundColor: VoltColors.neonGreenMuted,
  },
  priceText: {
    fontSize: VoltFontSize.md,
    fontWeight: '800',
    color: VoltColors.neonGreen,
  },
  featuresList: {
    gap: VoltSpacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: VoltSpacing.sm,
  },
  featureText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: VoltSpacing.xl,
  },
  footerText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textTertiary,
  },
});
