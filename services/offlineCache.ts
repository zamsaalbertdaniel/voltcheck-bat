/**
 * InspectEV — Offline Cache Service
 * AsyncStorage wrapper with TTL expiry and type-safe get/set
 *
 * Used for:
 *   - Caching VIN decode results (24h TTL)
 *   - Caching report summaries (until expiry)
 *   - Storing last-known vehicle data for offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T;
    expiresAt: number;  // Unix timestamp (ms)
    cachedAt: number;
}

interface CacheOptions {
    /** TTL in milliseconds. Default: 24 hours */
    ttlMs?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_PREFIX = '@inspectev_cache:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Store a value in cache with TTL
 */
export async function cacheSet<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
    const entry: CacheEntry<T> = {
        data,
        expiresAt: Date.now() + ttl,
        cachedAt: Date.now(),
    };

    try {
        await AsyncStorage.setItem(
            CACHE_PREFIX + key,
            JSON.stringify(entry)
        );
    } catch (err) {
        console.warn('[OfflineCache] Failed to write:', key, err);
    }
}

/**
 * Get a value from cache. Returns null if expired or not found.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);

        if (Date.now() > entry.expiresAt) {
            // Expired — clean up async, return null
            AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => {});
            return null;
        }

        return entry.data;
    } catch (err) {
        console.warn('[OfflineCache] Failed to read:', key, err);
        return null;
    }
}

/**
 * Remove a specific cache entry
 */
export async function cacheRemove(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (err) {
        console.warn('[OfflineCache] Failed to remove:', key, err);
    }
}

/**
 * Clear all InspectEV cache entries
 */
export async function cacheClearAll(): Promise<void> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (err) {
        console.warn('[OfflineCache] Failed to clear all:', err);
    }
}

/**
 * Purge expired entries from cache (run periodically)
 */
export async function cachePurgeExpired(): Promise<number> {
    let purgedCount = 0;
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));

        const entries = await AsyncStorage.multiGet(cacheKeys);
        const expiredKeys: string[] = [];

        for (const [key, value] of entries) {
            if (!value) continue;
            try {
                const entry = JSON.parse(value);
                if (Date.now() > entry.expiresAt) {
                    expiredKeys.push(key);
                }
            } catch {
                expiredKeys.push(key); // corrupted entry
            }
        }

        if (expiredKeys.length > 0) {
            await AsyncStorage.multiRemove(expiredKeys);
            purgedCount = expiredKeys.length;
        }
    } catch (err) {
        console.warn('[OfflineCache] Purge failed:', err);
    }
    return purgedCount;
}

// ── InspectEV-specific cache keys ────────────────────────────────────────────

/** Cache key for VIN decode result */
export const vinCacheKey = (vin: string) => `vin:${vin.toUpperCase()}`;

/** Cache key for report summary */
export const reportCacheKey = (reportId: string) => `report:${reportId}`;

/** Cache key for user's garage (list of reports) */
export const garageCacheKey = (userId: string) => `garage:${userId}`;
