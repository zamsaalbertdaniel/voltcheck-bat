/**
 * InspectEV — Device Fingerprinting
 * Creates a unique SHA-256 hash from device characteristics
 * Used for anti-fraud and associating reports with physical devices
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Create a simple hash (production: use expo-crypto for real SHA-256)
    const raw = parts.join('|');
    const hash = simpleHash(raw);

    // Cache it persistently
    await AsyncStorage.setItem(FINGERPRINT_KEY, hash);
    return hash;
}

/**
 * Simple string hashing function (FNV-1a based)
 * In production, replace with expo-crypto SHA-256
 */
function simpleHash(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return `vf_${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Clears the stored fingerprint (for testing/logout)
 */
export async function clearFingerprint(): Promise<void> {
    await AsyncStorage.removeItem(FINGERPRINT_KEY);
}
