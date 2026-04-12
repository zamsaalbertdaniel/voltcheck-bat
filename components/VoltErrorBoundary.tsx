/**
 * InspectEV — Error Boundary Component
 * Catches React rendering errors and displays recovery UI
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, { Component, ReactNode } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class VoltErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[InspectEV Error]', error, info.componentStack);

        if (Platform.OS !== 'web') {
            // Dynamic import — crashlytics is native-only, not available on web
            import('@react-native-firebase/crashlytics')
                .then((mod) => {
                    const cr = mod.default;
                    cr().recordError(error);
                    cr().log(`ComponentStack: ${info.componentStack ?? 'N/A'}`);
                })
                .catch(() => {
                    // Crashlytics not installed — ignore silently
                });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="warning" size={48} color={VoltColors.warning} />
                    </View>

                    <Text style={styles.title}>Oops! Ceva nu a mers bine</Text>
                    <Text style={styles.message}>
                        A apărut o eroare neașteptată. Te rugăm să încerci din nou.
                    </Text>

                    {__DEV__ && this.state.error && (
                        <View style={styles.debugBox}>
                            <Text style={styles.debugTitle}>Debug Info:</Text>
                            <Text style={styles.debugText}>
                                {this.state.error.message}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.handleRetry}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={20} color={VoltColors.textOnGreen} />
                        <Text style={styles.retryText}>Încearcă din nou</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: VoltSpacing.xl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 214, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: VoltSpacing.lg,
    },
    title: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.sm,
    },
    message: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: VoltSpacing.lg,
    },
    debugBox: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        marginBottom: VoltSpacing.lg,
        width: '100%',
        borderWidth: 1,
        borderColor: VoltColors.error,
    },
    debugTitle: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.error,
        marginBottom: VoltSpacing.xs,
    },
    debugText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
        fontFamily: 'SpaceMono',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.neonGreen,
        borderRadius: VoltBorderRadius.md,
        paddingHorizontal: VoltSpacing.xl,
        paddingVertical: VoltSpacing.md,
        gap: VoltSpacing.sm,
    },
    retryText: {
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: VoltColors.textOnGreen,
    },
});
