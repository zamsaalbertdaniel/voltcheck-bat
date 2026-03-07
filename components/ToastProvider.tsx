/**
 * VoltCheck — Toast Notification System
 * Lightweight toast for success, error, and info messages
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text
} from 'react-native';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
});

export const useToast = () => useContext(ToastContext);

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string }> = {
    success: {
        icon: 'checkmark-circle',
        color: VoltColors.neonGreen,
        bg: 'rgba(0, 230, 118, 0.15)',
    },
    error: {
        icon: 'close-circle',
        color: VoltColors.error,
        bg: 'rgba(255, 23, 68, 0.15)',
    },
    warning: {
        icon: 'warning',
        color: VoltColors.warning,
        bg: 'rgba(255, 214, 0, 0.15)',
    },
    info: {
        icon: 'information-circle',
        color: VoltColors.info,
        bg: 'rgba(41, 121, 255, 0.15)',
    },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<Toast | null>(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const id = Date.now().toString();
        setToast({ id, type, message, duration });

        // Slide in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss
        timeoutRef.current = setTimeout(() => {
            dismissToast();
        }, duration);
    }, []);

    const dismissToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setToast(null);
        });
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const config = toast ? TOAST_CONFIG[toast.type] : null;

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && config && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            backgroundColor: config.bg,
                            borderLeftColor: config.color,
                            transform: [{ translateY: slideAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    <Ionicons name={config.icon as any} size={22} color={config.color} />
                    <Text style={styles.toastMessage} numberOfLines={2}>
                        {toast.message}
                    </Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: VoltSpacing.lg,
        right: VoltSpacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: VoltSpacing.md,
        paddingHorizontal: VoltSpacing.lg,
        borderRadius: VoltBorderRadius.md,
        borderLeftWidth: 4,
        gap: VoltSpacing.md,
        zIndex: 9999,
        ...VoltShadow.lg,
    },
    toastMessage: {
        flex: 1,
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
        color: VoltColors.textPrimary,
        lineHeight: 20,
    },
});
