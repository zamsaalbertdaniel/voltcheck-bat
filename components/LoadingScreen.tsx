/**
 * InspectEV — Loading Screen Component
 * Full-screen loading with animated InspectEV branding
 * Used during app initialization, data fetching, and transitions
 */

import {
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface LoadingScreenProps {
    message?: string;
    subtitle?: string;
}

export default function LoadingScreen({ message, subtitle }: LoadingScreenProps) {
    const pulseAnim = useRef(new Animated.Value(0.6)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.6,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Slow rotation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.iconContainer,
                {
                    opacity: pulseAnim,
                    transform: [{ rotate: spin }],
                },
            ]}>
                <MaterialCommunityIcons
                    name="battery-charging-high"
                    size={64}
                    color={VoltColors.neonGreen}
                />
            </Animated.View>

            <Text style={styles.brand}>InspectEV</Text>

            {message && <Text style={styles.message}>{message}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <ActivityIndicator
                size="small"
                color={VoltColors.neonGreen}
                style={styles.spinner}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: VoltSpacing.xl,
    },
    iconContainer: {
        marginBottom: VoltSpacing.lg,
    },
    brand: {
        fontSize: VoltFontSize.xxl,
        fontWeight: '800',
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.sm,
    },
    message: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        textAlign: 'center',
        marginTop: VoltSpacing.xs,
    },
    spinner: {
        marginTop: VoltSpacing.xl,
    },
});
