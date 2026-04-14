/**
 * InspectEV — Dashboard Layout
 * Authenticated area with top navigation.
 */

import DashboardNav from '@/components/layout/DashboardNav';
import { VoltColors } from '@/constants/Theme';
import { Stack } from 'expo-router';
import React from 'react';

export default function DashboardLayout() {
    return (
        <Stack
            screenOptions={{
                header: () => <DashboardNav />,
                contentStyle: { backgroundColor: VoltColors.bgPrimary },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="settings" />
        </Stack>
    );
}
