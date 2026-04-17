import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const REGION_DISMISSED_KEY = 'inspectev_region_dismissed';

export default function RegionSelectorModal() {
    const { t, i18n } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        try {
            const dismissed = window.localStorage.getItem(REGION_DISMISSED_KEY);
            if (dismissed) return;

            // Simple cookie parsing
            const cookies = document.cookie.split(';');
            let country = 'RO';
            for (const c of cookies) {
                const [key, val] = c.trim().split('=');
                if (key === 'vercel_country') {
                    country = val;
                    break;
                }
            }

            const currentLang = i18n.language; // 'ro' or 'en'
            
            // Logic: if not from RO and language is RO -> suggest EN
            // Or if from RO and language is EN -> suggest RO
            if (country !== 'RO' && currentLang === 'ro') {
                setDetectedCountry(country);
                setVisible(true);
            } else if (country === 'RO' && currentLang === 'en') {
                setDetectedCountry('RO');
                setVisible(true);
            }
        } catch (error) {
            // Error parsing / localStorage access
            console.error('Region parsing error:', error);
        }
    }, [i18n.language]);

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, fadeAnim]);

    const closeAndSave = useCallback(() => {
        try {
            window.localStorage.setItem(REGION_DISMISSED_KEY, 'true');
        } catch (e) {
            console.error(e);
        }
        
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    }, [fadeAnim]);

    const handleSwitch = useCallback(async () => {
        const targetLang = i18n.language === 'ro' ? 'en' : 'ro';
        await i18n.changeLanguage(targetLang);
        closeAndSave();
    }, [i18n, closeAndSave]);

    const handleStay = useCallback(() => {
        closeAndSave();
    }, [closeAndSave]);

    if (Platform.OS !== 'web' || !visible) return null;

    const suggestsEnglish = i18n.language === 'ro';

    return (
        <Modal transparent visible={visible} animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <View style={[styles.container, isDesktop && styles.containerDesktop]}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="globe-outline" size={24} color={VoltColors.neonGreen} />
                        </View>
                        <Pressable onPress={handleStay} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={VoltColors.textSecondary} />
                        </Pressable>
                    </View>

                    <Text style={styles.title}>
                        {t('region.mismatch_title', 'Interfață Localizată')}
                    </Text>
                    <Text style={styles.description}>
                        {t('region.mismatch_desc', {
                            country: detectedCountry || '...',
                            defaultValue: `Se pare că ne vizitezi din ${detectedCountry || '...'}. Vrei să actualizăm setările pentru a-ți oferi conținut adaptat?`
                        })}
                    </Text>

                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
                            onPress={handleStay}
                        >
                            <Text style={styles.btnSecondaryText}>
                                {suggestsEnglish 
                                    ? t('region.stay_home', 'Rămâi pe România (RO)')
                                    : t('region.stay_home', 'Keep Rest of the World (EN)')}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
                            onPress={handleSwitch}
                        >
                            <Text style={styles.btnPrimaryText}>
                                {suggestsEnglish 
                                    ? t('region.switch_global', 'Schimbă pe Restul Lumii (EN)')
                                    : t('region.switch_global', 'Switch to Romania (RO)')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 7, 10, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: VoltSpacing.lg,
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
            : {}),
    },
    container: {
        backgroundColor: VoltColors.bgSecondary,
        padding: VoltSpacing.xl,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        width: '100%',
        maxWidth: 400,
        gap: VoltSpacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
    },
    containerDesktop: {
        maxWidth: 480,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: VoltSpacing.xs,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(215, 255, 33, 0.1)', // neonGreen with opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: {
        padding: VoltSpacing.xs,
    },
    title: {
        fontSize: VoltFontSize.xl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
    },
    description: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
        fontFamily: VoltFontFamily.regular,
        marginBottom: VoltSpacing.sm,
    },
    actions: {
        gap: VoltSpacing.md,
        flexDirection: 'column',
    },
    btnPrimary: {
        backgroundColor: VoltColors.neonGreen,
        paddingVertical: 14,
        borderRadius: VoltBorderRadius.md,
        alignItems: 'center',
    },
    btnPrimaryText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textOnGreen,
    },
    btnSecondary: {
        backgroundColor: 'transparent',
        paddingVertical: 14,
        borderRadius: VoltBorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    btnSecondaryText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.medium,
        color: VoltColors.textSecondary,
    },
    btnPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
