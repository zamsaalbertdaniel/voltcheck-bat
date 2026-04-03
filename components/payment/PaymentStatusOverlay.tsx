/**
 * VoltCheck — Payment Status Overlay
 * Extracted from PaymentScreen (payment.tsx).
 * Renders: idle pay button, processing spinner+bar, success checkmark, failed error.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BlurView } from 'expo-blur';

type PaymentStatus = 'idle' | 'processing' | 'confirming' | 'generating' | 'success' | 'failed';

interface PaymentStatusOverlayProps {
    status: PaymentStatus;
    statusMessage: string;
    priceLabel: string;
    error: { message: string; code?: string } | null;
    progressAnim: Animated.Value;
    checkmarkScale: Animated.Value;
    onPay: () => void;
    onRetry: () => void;
}

export default function PaymentStatusOverlay({
    status,
    statusMessage,
    priceLabel,
    error,
    progressAnim,
    checkmarkScale,
    onPay,
    onRetry,
}: PaymentStatusOverlayProps) {
    const { t } = useTranslation();

    return (
        <>
            {status === 'idle' && (
                <TouchableOpacity style={styles.payButton} onPress={onPay} activeOpacity={0.8}>
                    <Ionicons name="card" size={22} color={VoltColors.textOnGreen} />
                    <Text style={styles.payButtonText}>Plătește {priceLabel}</Text>
                </TouchableOpacity>
            )}

            {(status === 'processing' || status === 'confirming' || status === 'generating') && (
                <BlurView intensity={Platform.OS === 'web' ? 20 : 40} tint="dark" style={styles.blurOverlay}>
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
                            <Text style={styles.statusHint}>Acest proces durează ~30 secunde</Text>
                        )}
                    </View>
                </BlurView>
            )}

            {status === 'success' && (
                <BlurView intensity={Platform.OS === 'web' ? 20 : 40} tint="dark" style={styles.blurOverlay}>
                    <View style={styles.successSection}>
                        <Animated.View style={[styles.checkmarkCircle, { transform: [{ scale: checkmarkScale }] }]}>
                            <Ionicons name="checkmark" size={48} color={VoltColors.textOnGreen} />
                        </Animated.View>
                        <Text style={styles.successText}>{t('payment.success')}</Text>
                        <Text style={styles.redirectText}>Se deschide raportul...</Text>
                    </View>
                </BlurView>
            )}

            {status === 'failed' && (
                <BlurView intensity={Platform.OS === 'web' ? 20 : 40} tint="dark" style={styles.blurOverlay}>
                    <View style={styles.failedSection}>
                        <View style={styles.failedCircle}>
                            <Ionicons name="close" size={48} color={VoltColors.white} />
                        </View>
                        <Text style={styles.failedText}>{t('payment.failed')}</Text>
                        {error && <Text style={styles.errorDetail}>{error.message}</Text>}
                        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                            <Text style={styles.retryText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    blurOverlay: {
        borderRadius: VoltBorderRadius.lg,
        overflow: 'hidden',
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 230, 118, 0.08)',
        borderWidth: 1.5,
        borderColor: VoltColors.neonGreen,
        borderRadius: 8,
        paddingVertical: 18,
        gap: VoltSpacing.md,
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 8,
    },
    payButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: VoltColors.neonGreen,
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
    statusHint: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontStyle: 'italic',
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
});
