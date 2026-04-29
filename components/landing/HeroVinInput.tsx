/**
 * InspectEV — Hero VIN Input (Cockpit Edition, Stage E2)
 *
 * Mono-terminal VIN entry with neon accent, corner brackets, live character
 * progress track and a "TRANSMIT" primary CTA. API unchanged:
 *   - onSubmit(vin) fires with a validated 17-char VIN
 *   - autoFocus focuses the input after ~300ms (used by /modele-compatibile CTA)
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltLetterSpacing,
    VoltMotion,
    VoltSpacing,
} from '@/constants/Theme';
import CornerMarks from '@/components/design/CornerMarks';
import HudLabel from '@/components/design/HudLabel';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

const DESKTOP_BREAKPOINT = 900;
const VIN_LENGTH = 17;

interface HeroVinInputProps {
    onSubmit: (vin: string) => void;
    autoFocus?: boolean;
}

function cleanVin(raw: string): string {
    return raw.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, VIN_LENGTH);
}

export default function HeroVinInput({ onSubmit, autoFocus }: HeroVinInputProps) {
    const { t } = useTranslation();
    const [vin, setVin] = useState('');
    const [focused, setFocused] = useState(false);
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const isValid = vin.length === VIN_LENGTH;
    const inputRef = useRef<TextInput>(null);

    // Focus border glow
    const glow = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(glow, {
            toValue: focused || isValid ? 1 : 0,
            duration: VoltMotion.duration.base,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [focused, isValid, glow]);

    // Blinking caret when input is empty + focused
    const caretOpacity = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!focused || vin.length > 0) {
            caretOpacity.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(caretOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(caretOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [focused, vin.length, caretOpacity]);

    useEffect(() => {
        if (autoFocus) {
            const timer = setTimeout(() => inputRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const handleChangeText = (text: string) => setVin(cleanVin(text));

    const progress = vin.length / VIN_LENGTH;

    return (
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
            {/* VIN Panel ───────────────────────────────────────────── */}
            <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
                <CornerMarks
                    color={VoltColors.neonGreenHairline}
                    size={12}
                    thickness={1.2}
                    inset={6}
                />

                {/* Panel header: HUD label + status dot */}
                <View style={styles.panelHeader}>
                    <HudLabel dot>
                        {t('landing.vinPanel.header', 'VIN · INPUT STREAM')}
                    </HudLabel>
                    <HudLabel color={isValid ? VoltColors.neonGreen : VoltColors.textTertiary}>
                        {isValid
                            ? t('landing.vinPanel.ready', 'READY')
                            : t('landing.vinPanel.awaiting', 'AWAITING')}
                    </HudLabel>
                </View>

                {/* The input row */}
                <Animated.View
                    style={[
                        styles.inputWrapper,
                        {
                            borderColor: glow.interpolate({
                                inputRange: [0, 1],
                                outputRange: [VoltColors.border, VoltColors.neonGreen],
                            }),
                        },
                        Platform.OS === 'web'
                            ? ({
                                  boxShadow: focused || isValid
                                      ? `0 0 0 1px ${VoltColors.neonGreenHairline}, 0 0 32px rgba(0,255,136,0.18)`
                                      : 'none',
                                  transition: `box-shadow ${VoltMotion.duration.base}ms ${VoltMotion.easing.standard}`,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS (boxShadow/transition) not in RN ViewStyle
                              } as any)
                            : null,
                    ]}
                >
                    <Text style={styles.prompt}>{'>'}_</Text>

                    <TextInput
                        ref={inputRef}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        style={[styles.input, isDesktop && styles.inputDesktop] as any}
                        value={vin}
                        onChangeText={handleChangeText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder={t('landing.vinPlaceholder', 'VFXXXXXXXXXXXXXXX')}
                        placeholderTextColor={VoltColors.textTertiary}
                        maxLength={VIN_LENGTH}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={() => isValid && onSubmit(vin)}
                    />

                    {/* Blinking caret shown only when input is empty + focused */}
                    {focused && vin.length === 0 && (
                        <Animated.Text style={[styles.caret, { opacity: caretOpacity }]}>
                            ▌
                        </Animated.Text>
                    )}

                    <View style={styles.counterBox}>
                        <Text style={[styles.counter, isValid && styles.counterReady]}>
                            {String(vin.length).padStart(2, '0')}
                        </Text>
                        <Text style={styles.counterDivider}>/</Text>
                        <Text style={styles.counter}>{VIN_LENGTH}</Text>
                    </View>
                </Animated.View>

                {/* Progress track — 17 segmented cells */}
                <View style={styles.track}>
                    {Array.from({ length: VIN_LENGTH }).map((_, i) => {
                        const filled = i < vin.length;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.trackCell,
                                    filled && styles.trackCellFilled,
                                    filled && i === vin.length - 1 && styles.trackCellActive,
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Footer micro-caption */}
                <View style={styles.panelFooter}>
                    <HudLabel size={VoltFontSize.xs} color={VoltColors.textTertiary}>
                        {t('landing.vinPanel.protocol', 'PROTO · BAT v2.0')}
                    </HudLabel>
                    <HudLabel
                        size={VoltFontSize.xs}
                        color={isValid ? VoltColors.neonGreen : VoltColors.textTertiary}
                    >
                        {Math.round(progress * 100).toString().padStart(3, '0')}%
                    </HudLabel>
                </View>
            </View>

            {/* TRANSMIT CTA ───────────────────────────────────────── */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    isDesktop && styles.buttonDesktop,
                    !isValid && styles.buttonDisabled,
                    pressed && isValid && styles.buttonPressed,
                ]}
                onPress={() => isValid && onSubmit(vin)}
                disabled={!isValid}
                accessibilityRole="button"
                accessibilityLabel={t('landing.cta', 'Verifică Mașina')}
            >
                <Ionicons
                    name={isValid ? 'flash' : 'shield-checkmark'}
                    size={22}
                    color={isValid ? VoltColors.textOnGreen : VoltColors.textTertiary}
                />
                <Text
                    style={[
                        styles.buttonText,
                        !isValid && { color: VoltColors.textTertiary },
                    ]}
                >
                    {t('landing.cta', 'Verifică Mașina')}
                </Text>
                {isValid && (
                    <Text style={styles.buttonArrow}>→</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: VoltSpacing.md,
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
    },
    containerDesktop: {
        gap: VoltSpacing.md,
    },

    // ── Panel ────────────────────────────────────────────
    panel: {
        position: 'relative',
        backgroundColor: VoltColors.bgPanel,
        borderWidth: 1,
        borderColor: VoltColors.borderStrong,
        borderRadius: VoltBorderRadius.md,
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.md,
        gap: VoltSpacing.sm,
        overflow: 'hidden',
    },
    panelDesktop: {
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.lg,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    panelFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },

    // ── Input row ────────────────────────────────────────
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgCockpit,
        borderRadius: VoltBorderRadius.sm,
        borderWidth: 1,
        paddingHorizontal: VoltSpacing.md,
        height: 64,
    },
    prompt: {
        fontFamily: VoltFontFamily.mono,
        fontSize: VoltFontSize.lg,
        color: VoltColors.neonGreen,
        marginRight: VoltSpacing.sm,
        opacity: 0.85,
    },
    input: {
        flex: 1,
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.textPrimary,
        letterSpacing: 3,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    inputDesktop: {
        fontSize: VoltFontSize.xxl,
    },
    caret: {
        fontFamily: VoltFontFamily.mono,
        fontSize: VoltFontSize.xl,
        color: VoltColors.neonGreen,
        marginLeft: -10,
        marginRight: 4,
    },
    counterBox: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginLeft: VoltSpacing.sm,
    },
    counter: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontFamily: VoltFontFamily.mono,
        letterSpacing: 1,
    },
    counterReady: {
        color: VoltColors.neonGreen,
    },
    counterDivider: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontFamily: VoltFontFamily.mono,
        marginHorizontal: 2,
    },

    // ── Progress track ───────────────────────────────────
    track: {
        flexDirection: 'row',
        gap: 3,
        height: 3,
        marginTop: VoltSpacing.xs,
    },
    trackCell: {
        flex: 1,
        height: 3,
        backgroundColor: VoltColors.border,
        borderRadius: 1,
    },
    trackCellFilled: {
        backgroundColor: VoltColors.neonGreenDark,
    },
    trackCellActive: {
        backgroundColor: VoltColors.neonGreen,
        ...(Platform.OS === 'web'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS boxShadow not in RN ViewStyle
            ? ({ boxShadow: `0 0 8px ${VoltColors.neonGreen}` } as any)
            : {
                  shadowColor: VoltColors.neonGreen,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 4,
              }),
    },

    // ── Button ───────────────────────────────────────────
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        height: 60,
        paddingHorizontal: VoltSpacing.xl,
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
        elevation: 10,
        ...(Platform.OS === 'web'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS transition not in RN ViewStyle
            ? ({ transition: `transform 180ms ${VoltMotion.easing.standard}, background 180ms ease` } as any)
            : null),
    },
    buttonDesktop: {
        height: 68,
    },
    buttonDisabled: {
        backgroundColor: VoltColors.bgTertiary,
        shadowOpacity: 0,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    buttonPressed: {
        backgroundColor: VoltColors.neonGreenDark,
        transform: [{ scale: 0.97 }],
    },
    buttonText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
        letterSpacing: VoltLetterSpacing.wide,
        textTransform: 'uppercase',
    },
    buttonArrow: {
        fontSize: VoltFontSize.xl,
        color: VoltColors.textOnGreen,
        fontFamily: VoltFontFamily.mono,
        marginLeft: 4,
    },
});
