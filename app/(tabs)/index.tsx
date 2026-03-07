/**
 * VoltCheck — Scan Screen (Main Tab)
 * VIN input, camera scanner placeholder, level selection, and scanning animation
 * Design: Dark Mode Tech with Neon Green (#00E676) accents
 */

import {
  VoltBorderRadius,
  VoltColors,
  VoltFontSize,
  VoltShadow,
  VoltSpacing
} from '@/constants/Theme';
import { decodeVIN, isValidVIN } from '@/utils/vinDecoder';
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

const SCAN_STEPS = [
  'scanProgress.decoding',
  'scanProgress.searchingEU',
  'scanProgress.searchingGlobal',
  'scanProgress.crossReferencing',
  'scanProgress.analyzingRisk',
  'scanProgress.generatingReport',
  'scanProgress.complete',
];

export default function ScanScreen() {
  const { t } = useTranslation();
  const [vin, setVin] = useState('');
  const [vinError, setVinError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | null>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [decodedInfo, setDecodedInfo] = useState<any>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for the scan button
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Glow animation
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handleVinChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    setVin(cleaned);
    setVinError('');
    if (showLevels) setShowLevels(false);
  };

  const handleDecode = () => {
    if (!isValidVIN(vin)) {
      setVinError(t('scan.invalidVin'));
      return;
    }

    const decoded = decodeVIN(vin);
    setDecodedInfo(decoded);
    setShowLevels(true);
    startPulse();
  };

  const handleStartScan = async (level: 1 | 2) => {
    setSelectedLevel(level);
    setIsScanning(true);
    setCurrentStep(0);

    // Simulate scanning animation through steps
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setCurrentStep(i);
      Animated.timing(progressAnim, {
        toValue: (i + 1) / SCAN_STEPS.length,
        duration: 3000,
        useNativeDriver: false,
      }).start();
      await new Promise(resolve => setTimeout(resolve, 3500));
    }

    // TODO: Connect to real VIN Router + Stripe payment
    setIsScanning(false);
    Alert.alert(
      'VoltCheck',
      level === 1
        ? 'Demo: Level 1 report would be generated here after Stripe payment.'
        : 'Demo: Level 2 diagnosis would require Smartcar OAuth login.',
    );
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* VIN Input */}
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
              editable={!isScanning}
            />
            <Text style={[
              styles.charCount,
              vin.length === 17 ? styles.charCountValid : null,
            ]}>
              {vin.length}/17
            </Text>
          </View>
          {vinError ? <Text style={styles.errorText}>{vinError}</Text> : null}

          {/* Camera scan shortcut */}
          <TouchableOpacity style={styles.cameraButton} disabled={isScanning}>
            <Ionicons name="camera" size={20} color={VoltColors.neonGreen} />
            <Text style={styles.cameraText}>{t('scan.scanCamera')}</Text>
          </TouchableOpacity>
        </View>

        {/* Decode Button */}
        {!showLevels && !isScanning && (
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

        {/* Decoded Vehicle Info Card */}
        {decodedInfo && showLevels && !isScanning && (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <MaterialCommunityIcons
                name="car-electric"
                size={28}
                color={VoltColors.neonGreen}
              />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>
                  {decodedInfo.manufacturer} {decodedInfo.year || ''}
                </Text>
                <Text style={styles.vehicleVin}>{decodedInfo.vin}</Text>
              </View>
              <View style={styles.marketBadge}>
                <Text style={styles.marketText}>{decodedInfo.market}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Level Selection */}
        {showLevels && !isScanning && (
          <View style={styles.levelsSection}>
            <Text style={styles.levelsTitle}>{t('levels.select')}</Text>

            {/* Level 1 — The Detective */}
            <TouchableOpacity
              style={[
                styles.levelCard,
                selectedLevel === 1 ? styles.levelCardSelected : null,
              ]}
              onPress={() => handleStartScan(1)}
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
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={VoltColors.neonGreen}
                      />
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
            >
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>⚡ RECOMANDARE</Text>
              </View>
              <View style={styles.levelHeader}>
                <View style={[styles.levelIconContainer, styles.levelIconPremium]}>
                  <MaterialCommunityIcons
                    name="stethoscope"
                    size={24}
                    color={VoltColors.neonGreen}
                  />
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
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={VoltColors.neonGreen}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  )
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Scanning Animation */}
        {isScanning && (
          <View style={styles.scanningSection}>
            <View style={styles.scanningHeader}>
              <MaterialCommunityIcons
                name="radar"
                size={64}
                color={VoltColors.neonGreen}
              />
              <Text style={styles.scanningTitle}>{t('scan.scanning')}</Text>
            </View>

            {/* Progress Steps */}
            {SCAN_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[
                  styles.stepDot,
                  index < currentStep
                    ? styles.stepDotComplete
                    : index === currentStep
                      ? styles.stepDotActive
                      : styles.stepDotInactive,
                ]} />
                <Text style={[
                  styles.stepText,
                  index <= currentStep ? styles.stepTextActive : null,
                ]}>
                  {t(`scan.${step}`)}
                </Text>
                {index === currentStep && (
                  <View style={styles.stepSpinner} />
                )}
              </View>
            ))}

            {/* Progress bar */}
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
    paddingBottom: VoltSpacing.xxxl,
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

  // Decode button
  decodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VoltColors.neonGreen,
    borderRadius: VoltBorderRadius.md,
    paddingVertical: VoltSpacing.md,
    marginBottom: VoltSpacing.lg,
    gap: VoltSpacing.sm,
    ...VoltShadow.glow,
  },
  decodeButtonText: {
    fontSize: VoltFontSize.lg,
    fontWeight: '700',
    color: VoltColors.textOnGreen,
  },
  buttonDisabled: {
    backgroundColor: VoltColors.bgTertiary,
    shadowOpacity: 0,
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
  marketBadge: {
    backgroundColor: VoltColors.neonGreenMuted,
    paddingHorizontal: VoltSpacing.sm,
    paddingVertical: VoltSpacing.xs,
    borderRadius: VoltBorderRadius.sm,
  },
  marketText: {
    fontSize: VoltFontSize.xs,
    fontWeight: '700',
    color: VoltColors.neonGreen,
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

  // Scanning animation
  scanningSection: {
    alignItems: 'center',
    paddingVertical: VoltSpacing.xl,
  },
  scanningHeader: {
    alignItems: 'center',
    marginBottom: VoltSpacing.xl,
  },
  scanningTitle: {
    fontSize: VoltFontSize.xl,
    fontWeight: '700',
    color: VoltColors.neonGreen,
    marginTop: VoltSpacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: VoltSpacing.sm,
    gap: VoltSpacing.md,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepDotComplete: {
    backgroundColor: VoltColors.neonGreen,
  },
  stepDotActive: {
    backgroundColor: VoltColors.neonGreen,
    ...VoltShadow.glow,
  },
  stepDotInactive: {
    backgroundColor: VoltColors.bgTertiary,
  },
  stepText: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textTertiary,
    flex: 1,
  },
  stepTextActive: {
    color: VoltColors.textPrimary,
  },
  stepSpinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: VoltColors.neonGreen,
    borderTopColor: VoltColors.transparent,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: VoltColors.bgTertiary,
    borderRadius: 2,
    marginTop: VoltSpacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: VoltColors.neonGreen,
    borderRadius: 2,
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
