/**
 * InspectEV — VIN Input Card
 * Extracted from ScanScreen (index.tsx) for better modularity.
 * Handles: VIN text input, camera shortcut, decode button, spinner.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface VinInputCardProps {
    vin: string;
    vinError: string;
    errorMessage: string;
    isDecoding: boolean;
    spinRotation: Animated.AnimatedInterpolation<string>;
    onVinChange: (text: string) => void;
    onDecode: () => void;
}

export default function VinInputCard({
    vin,
    vinError,
    errorMessage,
    isDecoding,
    spinRotation,
    onVinChange,
    onDecode,
}: VinInputCardProps) {
    const { t } = useTranslation();
    const router = useRouter();

    return (
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
                        onChangeText={onVinChange}
                        placeholder={t('scan.vinPlaceholder')}
                        placeholderTextColor={VoltColors.textTertiary}
                        maxLength={17}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isDecoding}
                    />
                    <Text style={[styles.charCount, vin.length === 17 ? styles.charCountValid : null]}>
                        {vin.length}/17
                    </Text>
                </View>
                {vinError ? <Text style={styles.errorText}>{vinError}</Text> : null}

                <TouchableOpacity 
                    style={styles.cameraButton} 
                    disabled={isDecoding}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onPress={() => router.push('/camera-scan' as any)}
                >
                    <Ionicons name="camera" size={20} color={VoltColors.neonGreen} />
                    <Text style={styles.cameraText}>{t('scan.scanCamera')}</Text>
                </TouchableOpacity>

                <Text style={styles.vinHint}>{t('scan.vinHint')}</Text>
            </View>

            {errorMessage ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={VoltColors.error} />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
            ) : null}

            {!isDecoding && (
                <TouchableOpacity
                    style={[styles.decodeButton, vin.length !== 17 ? styles.buttonDisabled : null]}
                    onPress={onDecode}
                    disabled={vin.length !== 17}
                >
                    <FontAwesome name="search" size={18} color={VoltColors.textOnGreen} />
                    <Text style={styles.decodeButtonText}>{t('scan.startScan')}</Text>
                </TouchableOpacity>
            )}

        </>
    );
}

const styles = StyleSheet.create({
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
    vinHint: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        marginTop: VoltSpacing.sm,
        lineHeight: 16,
        fontStyle: 'italic',
    },
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
});
