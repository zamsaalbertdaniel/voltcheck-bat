/**
 * InspectEV — Hero VIN Input
 * Oversized VIN input with neon green glow for the landing page hero section.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
    /** Auto-focus input la mount (folosit la navigare din /modele-compatibile cu ?focusVin=true). */
    autoFocus?: boolean;
}

export default function HeroVinInput({ onSubmit, autoFocus }: HeroVinInputProps) {
    const { t } = useTranslation();
    const [vin, setVin] = useState('');
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const isValid = vin.replace(/[^A-HJ-NPR-Z0-9]/gi, '').length === VIN_LENGTH;
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (autoFocus) {
            // Delay pentru a lăsa animațiile landing-ului să pornească înainte de focus.
            const timer = setTimeout(() => inputRef.current?.focus(), 300);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const handleChangeText = (text: string) => {
        // Only allow valid VIN chars, auto-uppercase
        setVin(text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, VIN_LENGTH));
    };

    return (
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
            <View style={[styles.inputWrapper, isDesktop && styles.inputWrapperDesktop]}>
                <Ionicons
                    name="search"
                    size={isDesktop ? 28 : 22}
                    color={VoltColors.textTertiary}
                    style={styles.icon}
                />
                <TextInput
                    ref={inputRef}
                    style={[styles.input, isDesktop && styles.inputDesktop] as any}
                    value={vin}
                    onChangeText={handleChangeText}
                    placeholder={t('landing.vinPlaceholder', 'Introdu seria VIN (17 caractere)')}
                    placeholderTextColor={VoltColors.textTertiary}
                    maxLength={VIN_LENGTH}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={() => isValid && onSubmit(vin)}
                />
                <Text style={styles.counter}>{vin.length}/{VIN_LENGTH}</Text>
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    isDesktop && styles.buttonDesktop,
                    !isValid && styles.buttonDisabled,
                    pressed && isValid && styles.buttonPressed,
                ]}
                onPress={() => isValid && onSubmit(vin)}
                disabled={!isValid}
            >
                <Ionicons name="shield-checkmark" size={22} color={VoltColors.textOnGreen} />
                <Text style={styles.buttonText}>
                    {t('landing.cta', 'Verifică Mașina')}
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: VoltSpacing.md,
        width: '100%',
        maxWidth: 700,
        alignSelf: 'center',
    },
    containerDesktop: {
        flexDirection: 'row',
        gap: VoltSpacing.md,
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VoltColors.bgInput,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 2,
        borderColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.lg,
        height: 64,
    },
    inputWrapperDesktop: {
        height: 72,
    },
    icon: {
        marginRight: VoltSpacing.sm,
    },
    input: {
        flex: 1,
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.textPrimary,
        letterSpacing: 2,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    inputDesktop: {
        fontSize: VoltFontSize.xl,
    },
    counter: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontFamily: VoltFontFamily.mono,
        marginLeft: VoltSpacing.sm,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VoltSpacing.sm,
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.lg,
        height: 64,
        paddingHorizontal: VoltSpacing.xl,
        // Glow effect
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    buttonDesktop: {
        height: 72,
        paddingHorizontal: VoltSpacing.xxl,
    },
    buttonDisabled: {
        backgroundColor: VoltColors.bgTertiary,
        shadowOpacity: 0,
    },
    buttonPressed: {
        backgroundColor: VoltColors.neonGreenDark,
        transform: [{ scale: 0.97 }],
    },
    buttonText: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
});
