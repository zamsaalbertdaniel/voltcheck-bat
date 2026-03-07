/**
 * VoltCheck — Firebase Configuration
 * Uses @react-native-firebase for native performance
 */

import { getApp, getApps, initializeApp } from '@react-native-firebase/app';

// Firebase config — replace with your actual project config
const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'voltcheck-app.firebaseapp.com',
    projectId: 'voltcheck-app',
    storageBucket: 'voltcheck-app.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export default app;
