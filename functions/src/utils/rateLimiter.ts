/**
 * InspectEV — Server-side Rate Limiter
 * Per-UID throttling using Firestore as state store
 * Prevents abusive API queries
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';

// Lazy init — db is accessed only inside functions, after initializeApp()
function getDb() {
    return admin.firestore();
}

interface RateLimitConfig {
    /** Max requests allowed in the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
    /** Collection to store rate limit state */
    collection?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: 10,
    windowSeconds: 60,
    collection: 'rate_limits',
};

/**
 * Checks if a UID has exceeded the rate limit.
 * Returns true if allowed, throws HttpsError if blocked.
 *
 * Uses Firestore transactions to atomically check + increment.
 */
export async function checkRateLimit(
    uid: string,
    endpoint: string,
    config: Partial<RateLimitConfig> = {}
): Promise<void> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const docId = `${endpoint}_${uid}`;
    const ref = getDb().collection(cfg.collection!).doc(docId);

    await getDb().runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const now = Date.now();
        const windowMs = cfg.windowSeconds * 1000;

        if (!doc.exists) {
            // First request — create entry
            tx.set(ref, {
                uid,
                endpoint,
                requests: [now],
                firstRequestAt: now,
            });
            return;
        }

        const data = doc.data()!;
        const requests: number[] = data.requests || [];

        // Filter out requests outside the window
        const recentRequests = requests.filter(
            (timestamp: number) => now - timestamp < windowMs
        );

        if (recentRequests.length >= cfg.maxRequests) {
            const oldestInWindow = Math.min(...recentRequests);
            const retryAfterMs = windowMs - (now - oldestInWindow);
            const retryAfterSec = Math.ceil(retryAfterMs / 1000);

            logger.warn(
                `[RateLimit] UID ${uid} exceeded ${cfg.maxRequests}/${cfg.windowSeconds}s on ${endpoint}`
            );

            throw new HttpsError(
                'resource-exhausted',
                `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
                { retryAfterSeconds: retryAfterSec }
            );
        }

        // Add current request
        recentRequests.push(now);
        tx.update(ref, {
            requests: recentRequests,
            lastRequestAt: now,
        });
    });
}

/**
 * Rate limit presets for different endpoints
 */
export const RATE_LIMITS = {
    /** VIN decode: 10 requests per minute */
    vinDecode: { maxRequests: 10, windowSeconds: 60 },
    /** Payment: 5 per minute */
    payment: { maxRequests: 5, windowSeconds: 60 },
    /** Report generation: 3 per 5 minutes */
    report: { maxRequests: 3, windowSeconds: 300 },
    /** OCR VIN scan: 8 per minute (Cloud Vision API is billed per call) */
    ocrVin: { maxRequests: 8, windowSeconds: 60 },
} as const;
