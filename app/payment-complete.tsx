/**
 * InspectEV — Payment Complete Screen (Web)
 * Redirect target for Stripe Checkout
 */

import { VoltColors, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import { subscribeToPaymentStatus } from '@/services/cloudFunctions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function PaymentCompleteScreen() {
    const { session_id } = useLocalSearchParams<{ session_id: string }>();
    const router = useRouter();
    const [message, setMessage] = useState('Verificăm statusul plății...');
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!session_id) {
            setMessage('Eroare: Sesiune de plată lipsă.');
            setTimeout(() => router.replace('/'), 3000);
            return;
        }

        unsubRef.current = subscribeToPaymentStatus(
            session_id,
            (update) => {
                if (update.paymentStatus === 'completed' && update.reportId) {
                    setMessage('Plată confirmată! Redirecționare...');
                    unsubRef.current?.();
                    setTimeout(() => {
                        router.replace({ pathname: '/report/[id]', params: { id: update.reportId! } });
                    }, 1000);
                } else if (update.paymentStatus === 'failed') {
                    setMessage('Plata a eșuat sau a fost anulată.');
                    unsubRef.current?.();
                    setTimeout(() => router.replace('/'), 3000);
                }
            },
            (err) => {
                setMessage('Eroare la verificarea plății.');
                console.error(err);
            }
        );

        return () => unsubRef.current?.();
    }, [session_id, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={VoltColors.neonGreen} />
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        padding: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    text: {
        color: VoltColors.textPrimary,
        fontSize: VoltFontSize.md,
        textAlign: 'center',
    },
});
