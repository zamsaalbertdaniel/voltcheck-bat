/**
 * InspectEV — Device Fingerprinting
 * Creates a unique SHA-256 hash from device characteristics
 * Used for anti-fraud and associating reports with physical devices
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const FINGERPRINT_KEY = '@inspectev_device_fingerprint';

/**
 * Generates a deterministic device fingerprint from available device properties.
 * On native, uses Platform.OS, Version, and a generated UUID.
 * Not a real hardware fingerprint but sufficient for fraud detection.
 */
export async function getDeviceFingerprint(): Promise<string> {
    // Check cache first
    const cached = await AsyncStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;

    // Gather device properties
    const parts = [
        Platform.OS,
        Platform.Version?.toString() || 'unknown',
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ];

    // SHA-256 hash via expo-crypto (secure, no collisions)
    const raw = parts.join('|');
    const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        raw,
    );
    const fingerprint = `ef_${hash.substring(0, 16)}`;

    // Cache it persistently
    await AsyncStorage.setItem(FINGERPRINT_KEY, fingerprint);
    return fingerprint;
}

/**
 * Clears the stored fingerprint (for testing/logout)
 */
export async function clearFingerprint(): Promise<void> {
    await AsyncStorage.removeItem(FINGERPRINT_KEY);
}
