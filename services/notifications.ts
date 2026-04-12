/**
 * InspectEV — Push Notifications Service
 * Handles FCM token registration, permission requests, and notification display.
 *
 * Platform strategy:
 *   - Native (iOS/Android): @react-native-firebase/messaging
 *   - Web: firebase/messaging (via getFirebaseServices)
 *
 * Token lifecycle:
 *   1. Request permission on first login / when user enables toggle
 *   2. Get FCM token
 *   3. Store token in Firestore users/{uid}.fcmTokens[]
 *   4. Refresh on token change (listener)
 *   5. Remove on logout
 */

import { Platform } from 'react-native';
import { getFirebaseServices } from './firebase';

// ── Token Registration ──────────────────────────────────────────────────────

/**
 * Requests notification permission and registers the FCM token in Firestore.
 * Safe to call multiple times — idempotent.
 * @returns The FCM token string, or null if permission denied / unavailable.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            return await registerWeb(userId);
        } else {
            return await registerNative(userId);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Registration failed:', err);
        return null;
    }
}

/**
 * Removes the current device's FCM token from Firestore.
 * Call on logout to stop receiving notifications.
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            await unregisterWeb(userId);
        } else {
            await unregisterNative(userId);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Unregister failed:', err);
    }
}

/**
 * Updates the notificationsEnabled preference in Firestore.
 */
export async function setNotificationPreference(userId: string, enabled: boolean): Promise<void> {
    try {
        const { db } = await getFirebaseServices();

        if (Platform.OS === 'web') {
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'users', userId), { notificationsEnabled: enabled });
        } else {
            const rnFirestore = await import('@react-native-firebase/firestore');
            await rnFirestore.default().collection('users').doc(userId).update({
                notificationsEnabled: enabled,
            });
        }

        // If enabling, also ensure we have a token registered
        if (enabled) {
            await registerForPushNotifications(userId);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Preference update failed:', err);
    }
}

// ── Web Implementation ──────────────────────────────────────────────────────

async function registerWeb(userId: string): Promise<string | null> {
    // Check browser support
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Web push not supported in this browser');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Web notification permission denied');
        return null;
    }

    const { app } = await getFirebaseServices();
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(app);

    // VAPID key would be configured in environment
    const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey: vapidKey || undefined });

    if (token) {
        await saveTokenToFirestore(userId, token);
    }

    return token;
}

async function unregisterWeb(userId: string): Promise<void> {
    try {
        const { app } = await getFirebaseServices();
        const { getMessaging, getToken, deleteToken } = await import('firebase/messaging');
        const messaging = getMessaging(app);
        const token = await getToken(messaging);
        if (token) {
            await removeTokenFromFirestore(userId, token);
            await deleteToken(messaging);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Notifications] Web unregister error:', err);
    }
}

// ── Native Implementation ───────────────────────────────────────────────────

async function registerNative(userId: string): Promise<string | null> {
    try {
        const messaging = (await import('@react-native-firebase/messaging')).default;

        // Request permission (iOS requires explicit request; Android grants by default)
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            // eslint-disable-next-line no-console
            console.warn('[Notifications] Native permission denied');
            return null;
        }

        // Get the FCM token
        const token = await messaging().getToken();

        if (token) {
            await saveTokenToFirestore(userId, token);

            // Listen for token refresh
            messaging().onTokenRefresh(async (newToken) => {
                // eslint-disable-next-line no-console
                console.log('[Notifications] Token refreshed');
                await saveTokenToFirestore(userId, newToken);
            });
        }

        return token;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (err.message?.includes('Cannot find module')) {
            // eslint-disable-next-line no-console
            console.warn('[Notifications] @react-native-firebase/messaging not installed');
            return null;
        }
        throw err;
    }
}

async function unregisterNative(userId: string): Promise<void> {
    try {
        const messaging = (await import('@react-native-firebase/messaging')).default;
        const token = await messaging().getToken();
        if (token) {
            await removeTokenFromFirestore(userId, token);
            await messaging().deleteToken();
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        if (!err.message?.includes('Cannot find module')) {
            // eslint-disable-next-line no-console
            console.warn('[Notifications] Native unregister error:', err);
        }
    }
}

// ── Firestore Token Management ──────────────────────────────────────────────

async function saveTokenToFirestore(userId: string, token: string): Promise<void> {
    const { db } = await getFirebaseServices();

    if (Platform.OS === 'web') {
        const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', userId), {
            fcmTokens: arrayUnion(token),
        });
    } else {
        const rnFirestore = await import('@react-native-firebase/firestore');
        await rnFirestore.default().collection('users').doc(userId).update({
            fcmTokens: rnFirestore.default.FieldValue.arrayUnion(token),
        });
    }
}

async function removeTokenFromFirestore(userId: string, token: string): Promise<void> {
    const { db } = await getFirebaseServices();

    if (Platform.OS === 'web') {
        const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', userId), {
            fcmTokens: arrayRemove(token),
        });
    } else {
        const rnFirestore = await import('@react-native-firebase/firestore');
        await rnFirestore.default().collection('users').doc(userId).update({
            fcmTokens: rnFirestore.default.FieldValue.arrayRemove(token),
        });
    }
}
