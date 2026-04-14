/**
 * InspectEV — Firebase Configuration (Web + Native compatible)
 *
 * Uses EXPO_PUBLIC_* environment variables for config
 * Supports both @react-native-firebase (native) and firebase/app (web)
 *
 * IMPORTANT: Always consume Firebase via `getFirebaseServices()` — it's
 * the only safe accessor. There is intentionally NO default export
 * because the underlying app/db/auth handles are created asynchronously.
 */

import { Platform } from 'react-native';

// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Warn if critical Firebase config is missing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    // eslint-disable-next-line no-console
    console.error(
        '[Firebase] Missing required config. Set EXPO_PUBLIC_FIREBASE_API_KEY, ' +
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID, and EXPO_PUBLIC_FIREBASE_APP_ID environment variables.',
    );
}

let app: any;
let db: any;
let auth: any;

/**
 * Initialize Firebase depending on platform
 * Web uses modular firebase SDK
 * Native uses @react-native-firebase
 */
async function initFirebase() {
    if (Platform.OS === 'web') {
        // Web SDK (modular)
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');
        const { getAuth } = await import('firebase/auth');

        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);

        // Initialize App Check (reCAPTCHA Enterprise) — web only
        // IMPORTANT: If reCAPTCHA Enterprise script is unreachable (503 / broken keys),
        // we MUST NOT call initializeAppCheck — once initialized with a broken provider,
        // it silently blocks ALL Firebase Auth operations that require App Check tokens.
        // Strategy: pre-flight check the script, only init if it actually loaded.
        const recaptchaKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
        if (recaptchaKey) {
            try {
                // In development, use debug token
                if (process.env.NODE_ENV === 'development' || process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true') {
                    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
                }

                // Pre-flight: verify reCAPTCHA Enterprise script is accessible
                const scriptOk = await new Promise<boolean>((resolve) => {
                    const script = document.createElement('script');
                    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${recaptchaKey}`;
                    script.onload = () => { resolve(true); };
                    script.onerror = () => { resolve(false); };
                    // 5s timeout — if script doesn't load, skip App Check
                    const timer = setTimeout(() => resolve(false), 5000);
                    script.addEventListener('load', () => clearTimeout(timer));
                    script.addEventListener('error', () => clearTimeout(timer));
                    document.head.appendChild(script);
                });

                if (scriptOk) {
                    const appCheckMod = await import('firebase/app-check');
                    appCheckMod.initializeAppCheck(app, {
                        provider: new appCheckMod.ReCaptchaEnterpriseProvider(recaptchaKey),
                        isTokenAutoRefreshEnabled: true,
                    });
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(
                        '[Firebase] reCAPTCHA Enterprise script unreachable (503 or timeout). ' +
                        'App Check skipped — fix reCAPTCHA keys in Google Cloud Console.'
                    );
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('[Firebase] App Check init failed:', e);
            }
        }
    } else {
        // Native SDK (@react-native-firebase)
        // Config comes from google-services.json (Android) and GoogleService-Info.plist (iOS)
        // The default app is auto-initialized by the native SDK plugin
        const rnFirebase = await import('@react-native-firebase/app');
        const rnFirestore = await import('@react-native-firebase/firestore');
        const rnAuth = await import('@react-native-firebase/auth');

        app = rnFirebase.getApp(); // default app from native config files
        db = rnFirestore.default();
        auth = rnAuth.default();
    }

    return { app, db, auth };
}

// Singleton promise
let initPromise: Promise<{ app: any; db: any; auth: any }> | null = null;

export function getFirebaseServices() {
    if (!initPromise) {
        initPromise = initFirebase();
    }
    return initPromise;
}

export { firebaseConfig };
