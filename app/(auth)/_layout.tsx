/**
 * VoltCheck — Auth Layout
 * Redirects authenticated users to tabs, shows login for unauthenticated
 */

import { VoltColors } from '@/constants/Theme';
import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: VoltColors.bgPrimary },
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}
