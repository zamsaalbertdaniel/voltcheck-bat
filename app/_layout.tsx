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

const WebScrollbarCSS = `
  /* Custom Scrollbar for Web */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: #0A0E17;
  }
  ::-webkit-scrollbar-thumb {
    background: #00E676; 
    border-radius: 5px;
    border: 2px solid #0A0E17;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #00C853; 
  }
`;

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
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Inject Web scrollbar CSS directly inside standard return
  return (
    <VoltErrorBoundary>
      {Platform.OS === 'web' && <style>{WebScrollbarCSS}</style>}
      <ToastProvider>
        <ThemeProvider value={VoltCheckTheme}>
          <StatusBar barStyle="light-content" backgroundColor={VoltColors.bgPrimary} />

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
