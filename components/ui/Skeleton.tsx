import { VoltColors } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
    const translateX = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(translateX, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        ).start();
    }, [translateX]);

    const translateXInterpolate = translateX.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-100%', '100%'],
    });

    return (
        <View style={[
            styles.container,
            { width, height, borderRadius },
            style
        ]}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateX: translateXInterpolate as any }] }
                ]}
            >
                <LinearGradient
                    colors={[
                        'transparent',
                        'rgba(255, 255, 255, 0.05)',
                        'transparent'
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: VoltColors.bgInput,
        overflow: 'hidden',
    },
});
