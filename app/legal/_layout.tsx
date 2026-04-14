/**
 * InspectEV — Legal Pages Layout
 */

import { VoltColors } from '@/constants/Theme';
import { Stack } from 'expo-router';

export default function LegalLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: VoltColors.bgPrimary },
            }}
        />
    );
}
