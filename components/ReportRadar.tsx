/**
 * VoltCheck — Report Radar UI Component
 *
 * Real-time animated display of report pipeline status.
 * Subscribes to Firestore `statusDetails` and shows a radar-like
 * scanning animation with progressive step completion.
 *
 * Steps: payment_confirmed → decoding_vin → searching_eu_databases →
 *        searching_global_databases → calculating_risk_score →
 *        generating_pdf → uploading_report → completed
 *
 * Design: Dark Mode Tech — pulsing neon green radar rings
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import {
    ReportStatus,
    subscribeToReportStatus,
} from '@/services/cloudFunctions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

// ── Step Definitions ──
interface PipelineStep {
    key: string;
    labelKey: string;
    icon: string;
    iconSet: 'ionicons' | 'material';
}

const PIPELINE_STEPS: PipelineStep[] = [
    { key: 'payment_confirmed', labelKey: 'radar.paymentConfirmed', icon: 'card-outline', iconSet: 'ionicons' },
    { key: 'decoding_vin', labelKey: 'radar.decodingVin', icon: 'barcode-outline', iconSet: 'ionicons' },
    { key: 'searching_eu_databases', labelKey: 'radar.searchingEU', icon: 'earth-outline', iconSet: 'ionicons' },
    { key: 'searching_global_databases', labelKey: 'radar.searchingGlobal', icon: 'globe-outline', iconSet: 'ionicons' },
    { key: 'calculating_risk_score', labelKey: 'radar.calculatingRisk', icon: 'analytics-outline', iconSet: 'ionicons' },
    { key: 'generating_pdf', labelKey: 'radar.generatingPdf', icon: 'document-text-outline', iconSet: 'ionicons' },
    { key: 'uploading_report', labelKey: 'radar.uploading', icon: 'cloud-upload-outline', iconSet: 'ionicons' },
    { key: 'completed', labelKey: 'radar.completed', icon: 'checkmark-circle', iconSet: 'ionicons' },
];

const FAILURE_STEPS = ['failed', 'manual_review_needed'];

// ── Props ──
interface ReportRadarProps {
    reportId: string;
    onComplete: (status: ReportStatus) => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

export default function ReportRadar({
    reportId,
    onComplete,
    onError,
    onCancel,
}: ReportRadarProps) {
    const { t } = useTranslation();
    const [currentStatus, setCurrentStatus] = useState<ReportStatus | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isFailed, setIsFailed] = useState(false);

    // Animations
    const radarSpin = useRef(new Animated.Value(0)).current;
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const completePulse = useRef(new Animated.Value(0)).current;

    // ── Radar Spin Animation ──
    useEffect(() => {
        const spin = Animated.loop(
            Animated.timing(radarSpin, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        spin.start();
        return () => spin.stop();
    }, []);

    // ── Pulsing Rings ──
    useEffect(() => {
        const ringPulse = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: false }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
                ])
            );
        const p1 = ringPulse(ring1, 0);
        const p2 = ringPulse(ring2, 600);
        const p3 = ringPulse(ring3, 1200);
        p1.start(); p2.start(); p3.start();
        return () => { p1.stop(); p2.stop(); p3.stop(); };
    }, []);

    // ── Subscribe to Report Status ──
    useEffect(() => {
        const unsubscribe = subscribeToReportStatus(
            reportId,
            (status) => {
                setCurrentStatus(status);

                // Find step index
                const stepIdx = PIPELINE_STEPS.findIndex(
                    s => s.key === status.statusDetails
                );
                if (stepIdx >= 0) {
                    // Haptic tap on each step transition (native only)
                    if (stepIdx > currentStepIndex && Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setCurrentStepIndex(stepIdx);
                    Animated.timing(progressAnim, {
                        toValue: (stepIdx + 1) / PIPELINE_STEPS.length,
                        duration: 600,
                        useNativeDriver: false,
                    }).start();
                }

                // Handle completion
                if (status.status === 'completed') {
                    if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    Animated.spring(completePulse, {
                        toValue: 1,
                        tension: 30,
                        friction: 5,
                        useNativeDriver: true,
                    }).start();
                    setTimeout(() => onComplete(status), 1500);
                }

                // Handle failures
                if (FAILURE_STEPS.includes(status.status)) {
                    if (Platform.OS !== 'web') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                    setIsFailed(true);
                    onError(
                        status.status === 'manual_review_needed'
                            ? t('radar.manualReview')
                            : status.failureReason || t('radar.failed')
                    );
                }
            },
            (error) => {
                onError(error.message);
            }
        );

        return unsubscribe;
    }, [reportId]);

    // ── Interpolations ──
    const spinRotation = radarSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const ringScale = (anim: Animated.Value) => ({
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
    });

    const completeScale = completePulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.15],
    });

    return (
        <View style={styles.container}>
            {/* ── Radar Animation ── */}
            <Animated.View style={[styles.radarContainer, { transform: [{ scale: completeScale }] }]}>
                {/* Pulsing rings */}
                {!isFailed && currentStatus?.status !== 'completed' && (
                    <>
                        <Animated.View style={[styles.ring, ringScale(ring1)]} />
                        <Animated.View style={[styles.ring, ringScale(ring2)]} />
                        <Animated.View style={[styles.ring, ringScale(ring3)]} />
                    </>
                )}

                {/* Radar center */}
                <View style={[
                    styles.radarCenter,
                    isFailed && styles.radarCenterFailed,
                    currentStatus?.status === 'completed' && styles.radarCenterComplete,
                ]}>
                    {currentStatus?.status === 'completed' ? (
                        <Ionicons name="checkmark-circle" size={48} color={VoltColors.neonGreen} />
                    ) : isFailed ? (
                        <Ionicons name="alert-circle" size={48} color={VoltColors.error} />
                    ) : (
                        <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                            <MaterialCommunityIcons name="radar" size={48} color={VoltColors.neonGreen} />
                        </Animated.View>
                    )}
                </View>
            </Animated.View>

            {/* ── Status Label ── */}
            <Text style={[
                styles.statusLabel,
                isFailed && styles.statusLabelFailed,
                currentStatus?.status === 'completed' && styles.statusLabelComplete,
            ]}>
                {currentStatus?.status === 'completed'
                    ? t('radar.reportReady')
                    : isFailed
                        ? t('radar.errorOccurred')
                        : t(`radar.${currentStatus?.statusDetails || 'initializing'}`, { defaultValue: t('radar.initializing') })
                }
            </Text>

            {/* ── Risk Score (on complete) ── */}
            {currentStatus?.status === 'completed' && currentStatus.riskScore !== undefined && (
                <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>{t('radar.riskScore')}</Text>
                    <Text style={[
                        styles.scoreValue,
                        { color: getRiskColor(currentStatus.riskScore) },
                    ]}>
                        {currentStatus.riskScore}
                    </Text>
                    <Text style={[
                        styles.scoreCategory,
                        { color: getRiskColor(currentStatus.riskScore) },
                    ]}>
                        {currentStatus.riskCategory}
                    </Text>
                </View>
            )}

            {/* ── Step Timeline ── */}
            <View style={styles.timeline}>
                {PIPELINE_STEPS.map((step, index) => {
                    const isComplete = index < currentStepIndex;
                    const isActive = index === currentStepIndex && !isFailed;
                    const isPending = index > currentStepIndex;

                    return (
                        <View key={step.key} style={styles.timelineRow}>
                            {/* Connector line */}
                            {index > 0 && (
                                <View style={[
                                    styles.connector,
                                    isComplete && styles.connectorComplete,
                                ]} />
                            )}

                            {/* Step dot */}
                            <View style={[
                                styles.stepDot,
                                isComplete && styles.stepDotComplete,
                                isActive && styles.stepDotActive,
                            ]}>
                                {isComplete ? (
                                    <Ionicons name="checkmark" size={12} color={VoltColors.bgPrimary} />
                                ) : (
                                    <Ionicons
                                        name={step.icon as any}
                                        size={12}
                                        color={isActive ? VoltColors.neonGreen : VoltColors.textTertiary}
                                    />
                                )}
                            </View>

                            {/* Step label */}
                            <Text style={[
                                styles.stepLabel,
                                isComplete && styles.stepLabelComplete,
                                isActive && styles.stepLabelActive,
                                isPending && styles.stepLabelPending,
                            ]}>
                                {t(step.labelKey)}
                            </Text>

                            {/* Active spinner */}
                            {isActive && !isFailed && currentStatus?.status !== 'completed' && (
                                <View style={styles.activeSpinner} />
                            )}
                        </View>
                    );
                })}
            </View>

            {/* ── Progress Bar ── */}
            <View style={styles.progressContainer}>
                <Animated.View
                    style={[
                        styles.progressBar,
                        isFailed && styles.progressBarFailed,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
            </View>

            {/* ── Cancel Button ── */}
            {onCancel && !isFailed && currentStatus?.status !== 'completed' && (
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelText}>{t('radar.cancel')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ── Helpers ──
function getRiskColor(score: number): string {
    if (score <= 25) return VoltColors.neonGreen;
    if (score <= 50) return '#FFD600';
    if (score <= 75) return '#FF6D00';
    return VoltColors.error;
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
    },

    // Radar
    radarContainer: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: VoltSpacing.lg,
    },
    ring: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
    },
    radarCenter: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: VoltColors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
        ...VoltShadow.glow,
    },
    radarCenterFailed: {
        borderColor: VoltColors.error,
    },
    radarCenterComplete: {
        borderColor: VoltColors.neonGreen,
        backgroundColor: VoltColors.neonGreenMuted,
    },

    // Status
    statusLabel: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.neonGreen,
        textAlign: 'center',
        marginBottom: VoltSpacing.lg,
    },
    statusLabelFailed: {
        color: VoltColors.error,
    },
    statusLabelComplete: {
        color: VoltColors.neonGreen,
    },

    // Score card
    scoreCard: {
        alignItems: 'center',
        marginBottom: VoltSpacing.lg,
        padding: VoltSpacing.md,
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        minWidth: 180,
    },
    scoreLabel: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: 52,
        fontWeight: '900',
        marginVertical: VoltSpacing.xs,
    },
    scoreCategory: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },

    // Timeline
    timeline: {
        width: '100%',
        paddingHorizontal: VoltSpacing.md,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        position: 'relative',
    },
    connector: {
        position: 'absolute',
        left: 11,
        top: -6,
        width: 2,
        height: 12,
        backgroundColor: VoltColors.bgTertiary,
    },
    connectorComplete: {
        backgroundColor: VoltColors.neonGreen,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: VoltColors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: VoltSpacing.sm,
    },
    stepDotComplete: {
        backgroundColor: VoltColors.neonGreen,
    },
    stepDotActive: {
        backgroundColor: VoltColors.bgSecondary,
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
    },
    stepLabel: {
        flex: 1,
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
    },
    stepLabelComplete: {
        color: VoltColors.textPrimary,
    },
    stepLabelActive: {
        color: VoltColors.neonGreen,
        fontWeight: '600',
    },
    stepLabelPending: {
        color: VoltColors.textTertiary,
    },
    activeSpinner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: VoltColors.neonGreen,
        borderTopColor: 'transparent',
    },

    // Progress bar
    progressContainer: {
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
    progressBarFailed: {
        backgroundColor: VoltColors.error,
    },

    // Cancel
    cancelButton: {
        marginTop: VoltSpacing.lg,
        paddingVertical: VoltSpacing.sm,
        paddingHorizontal: VoltSpacing.lg,
    },
    cancelText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontWeight: '500',
    },
});
