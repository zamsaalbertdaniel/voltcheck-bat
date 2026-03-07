/**
 * VoltCheck — Tab Layout
 * Dark Mode Tech navigation with 4 tabs: Scanare, BAT Insight, Garaj, Setări
 * FAZA 1 — Updated tab structure
 */

import { VoltColors, VoltFontSize } from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: VoltColors.neonGreen,
        tabBarInactiveTintColor: VoltColors.textTertiary,
        tabBarStyle: {
          backgroundColor: VoltColors.bgSecondary,
          borderTopColor: VoltColors.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: VoltFontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scanare',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify-scan" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insight"
        options={{
          title: 'BAT Insight',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bulb-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garaj',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="garage" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Setări',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
