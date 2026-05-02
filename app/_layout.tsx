/**
 * InspectEV — Root Layout
 * Dark theme, i18n, font loading, Dual Splash Sequence,
 * Auth listener + route guard, Toast + Error Boundary wrappers
 * FAZA 1 — BAT (Battery Analysis Technology)
 */

import BetaBanner from '@/components/layout/BetaBanner';
import CookieConsent from '@/components/layout/CookieConsent';
import RegionSelectorModal from '@/components/layout/RegionSelectorModal';
import ReturnToBase from '@/components/layout/ReturnToBase';
import SplashSequence from '@/components/SplashSequence';
import { toastConfig } from '@/components/ToastConfig';
import { ToastProvider } from '@/components/ToastProvider';
import VoltErrorBoundary from '@/components/VoltErrorBoundary';
import Toast from 'react-native-toast-message';
import { VoltColors, VoltWebFontCSS } from '@/constants/Theme';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useNotificationHandler } from '@/hooks/useNotificationHandler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';
import 'react-native-reanimated';

// Initialize i18n
import '../utils/i18n';

// Initialize Sentry error monitoring + performance tracking
import { initSentry } from '@/services/sentry';
import { initWebVitals } from '@/services/webVitals';
initSentry();
initWebVitals();

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const InspectEVTheme = {
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

const WebScrollbarCSS = `
  /* Cockpit scrollbar — thin neon rail */
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
    display: block;
  }
  *::-webkit-scrollbar-track {
    background: ${VoltColors.bgPrimary};
  }
  *::-webkit-scrollbar-thumb {
    background: ${VoltColors.neonGreenDark};
    border-radius: 4px;
    border: 2px solid ${VoltColors.bgPrimary};
  }
  *::-webkit-scrollbar-thumb:hover {
    background: ${VoltColors.neonGreen};
  }
  body::-webkit-scrollbar { width: 8px; }
`;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [splashComplete, setSplashComplete] = useState(false);

  // Auth state listener + route guard (login ↔ tabs)
  const { isReady: authReady } = useAuthListener();

  // Handle push notification deep links
  useNotificationHandler();

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Show loading while Firebase Auth initializes
  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: VoltColors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={VoltColors.neonGreen} />
      </View>
    );
  }

  // Inject Web scrollbar CSS directly inside standard return
  return (
    <VoltErrorBoundary>
      {Platform.OS === 'web' && (
        <>
          <style>{VoltWebFontCSS}</style>
          <style>{WebScrollbarCSS}</style>
        </>
      )}
      <ToastProvider>
        <ThemeProvider value={InspectEVTheme}>
          <StatusBar barStyle="light-content" backgroundColor={VoltColors.bgPrimary} />

          {!splashComplete && (
            <SplashSequence onComplete={() => setSplashComplete(true)} />
          )}

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(dashboard)" />
            <Stack.Screen
              name="report/[id]"
              options={{
                headerShown: true,
                headerTitle: 'Raport InspectEV',
                headerStyle: { backgroundColor: VoltColors.bgSecondary },
                headerTintColor: VoltColors.textPrimary,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="preview/[vin]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="smartcar-connect"
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Smartcar Connect',
                headerStyle: { backgroundColor: VoltColors.bgSecondary },
                headerTintColor: VoltColors.textPrimary,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="legal"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="camera-scan"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>

          {/* Floating "Return to Base" home button — hidden on landing */}
          <ReturnToBase />

          {/* Beta-mode warning bar — pinned top, advises users that core features
              (DB, Stripe, PDF, payments) are under construction. Remove this
              mount + the import once core features ship. */}
          <BetaBanner />

          {/* GDPR Cookie Consent — web only, first visit */}
          <CookieConsent />

          {/* Geolocation Region Selector */}
          <RegionSelectorModal />
        </ThemeProvider>
      </ToastProvider>
      {/* Global toast renderer — stil Deep-Tech via toastConfig */}
      <Toast config={toastConfig} />
    </VoltErrorBoundary>
  );
}
