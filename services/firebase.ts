/**
 * VoltCheck — Firebase Configuration (Web + Native compatible)
 *
 * Uses EXPO_PUBLIC_* environment variables for config
 * Supports both @react-native-firebase (native) and firebase/app (web)
 */

import { Platform } from 'react-native';

// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'voltcheck-app.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'voltcheck-app',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'voltcheck-app.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

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
    } else {
        // Native SDK (@react-native-firebase)
        const rnFirebase = await import('@react-native-firebase/app');
        const rnFirestore = await import('@react-native-firebase/firestore');
        const rnAuth = await import('@react-native-firebase/auth');

        app = !rnFirebase.getApps().length
            ? rnFirebase.initializeApp(firebaseConfig)
            : rnFirebase.getApp();
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
export default app;
