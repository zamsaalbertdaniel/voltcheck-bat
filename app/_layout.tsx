/**
 * VoltCheck — Root Layout
 * Dark theme, i18n, font loading, Dual Splash Sequence,
 * Toast + Error Boundary wrappers
 * FAZA 1 — BAT (Battery Analysis Technology)
 */

import SplashSequence from '@/components/SplashSequence';
import { ToastProvider } from '@/components/ToastProvider';
import VoltErrorBoundary from '@/components/VoltErrorBoundary';
import { VoltColors } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import 'react-native-reanimated';

// Initialize i18n
import '../utils/i18n';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const VoltCheckTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: VoltColors.neonGreen,
    background: VoltColors.bgPrimary,
    card: VoltColors.bgSecondary,
    text: VoltColors.textPrimary,
    border: VoltColors.border,
    notification: VoltColors.neonGreen,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      // Hide the native splash screen once fonts are ready
      // Our custom SplashSequence takes over from here
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <VoltErrorBoundary>
      <ToastProvider>
        <ThemeProvider value={VoltCheckTheme}>
          <StatusBar barStyle="light-content" backgroundColor={VoltColors.bgPrimary} />

          {/* Dual Splash Sequence (Probabilistic AI → BAT) */}
          {!splashComplete && (
            <SplashSequence onComplete={() => setSplashComplete(true)} />
          )}

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="report/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Raport VoltCheck',
                headerStyle: { backgroundColor: VoltColors.bgSecondary },
                headerTintColor: VoltColors.textPrimary,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="payment"
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Plată',
                headerStyle: { backgroundColor: VoltColors.bgSecondary },
                headerTintColor: VoltColors.textPrimary,
              }}
            />
          </Stack>
        </ThemeProvider>
      </ToastProvider>
    </VoltErrorBoundary>
  );
}
