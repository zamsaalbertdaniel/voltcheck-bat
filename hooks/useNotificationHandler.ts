/**
 * InspectEV — Notification Deep Link Handler
 * Handles push notification taps and navigates to the relevant screen.
 *
 * When a user taps a notification with { type: 'report_ready', reportId: '...' },
 * this hook navigates them directly to /report/{reportId}.
 *
 * Platform strategy:
 *   - Native: @react-native-firebase/messaging (onNotificationOpenedApp + getInitialNotification)
 *   - Web: firebase/messaging onMessage (foreground only)
 */

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, Platform } from "react-native";

/**
 * Call this hook once in the root layout.
 * It sets up listeners for notification taps (background + quit state).
 */
export function useNotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") {
      setupWebHandler(router);
    } else {
      setupNativeHandler(router);
    }
  }, [router]);
}

// ── Types ───────────────────────────────────────────────────────────────────

interface NotificationData {
  type?: string;
  reportId?: string;
  riskScore?: string;
  riskCategory?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Router = any; // expo-router's Router type is complex, using any for simplicity

// ── Navigation Helper ───────────────────────────────────────────────────────

function handleNotificationNavigation(
  router: Router,
  data: NotificationData | undefined,
) {
  if (!data?.reportId) return;

  if (data.type === "report_ready") {
    // Small delay to ensure navigation is ready
    setTimeout(() => {
      router.push(`/report/${data.reportId}`);
    }, 500);
  }
}

// ── Native Handler ──────────────────────────────────────────────────────────

async function setupNativeHandler(router: Router) {
  try {
    const messaging = (
      await import("@react-native-firebase/messaging")
    ).default;

    // 1. App opened from background (notification tapped while app was in background)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      const data = remoteMessage.data as NotificationData | undefined;
      handleNotificationNavigation(router, data);
    });

    // 2. App opened from quit state (notification tapped while app was killed)
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      const data = initialNotification.data as NotificationData | undefined;
      handleNotificationNavigation(router, data);
    }

    // 3. Foreground notification (app is open — show an in-app alert)
    messaging().onMessage(async (remoteMessage) => {
      const title =
        remoteMessage.notification?.title || "InspectEV Notification";
      const body = remoteMessage.notification?.body || "";
      const data = remoteMessage.data as NotificationData | undefined;

      Alert.alert(title, body, [
        { text: "OK", style: "cancel" },
        ...(data?.reportId
          ? [
              {
                text: "Vezi Raport",
                onPress: () => handleNotificationNavigation(router, data),
              },
            ]
          : []),
      ]);
    });
  } catch {
    // @react-native-firebase/messaging not installed — skip silently
  }
}

// ── Web Handler ─────────────────────────────────────────────────────────────

async function setupWebHandler(router: Router) {
  try {
    const { getFirebaseServices } = await import("@/services/firebase");
    const { app } = await getFirebaseServices();
    const { getMessaging, onMessage } = await import("firebase/messaging");
    const messaging = getMessaging(app);

    // Web only gets foreground messages (background handled by service worker)
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "InspectEV Notification";
      const body = payload.notification?.body || "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = payload.data as any as NotificationData | undefined;

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, { body });
        notification.onclick = () => {
          handleNotificationNavigation(router, data);
          notification.close();
        };
      }
    });
  } catch {
    // Firebase messaging not available on web — skip silently
  }
}
