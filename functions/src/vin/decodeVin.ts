/**
 * InspectEV — Cloud Function: VIN Decode Endpoint
 * 
 * SECURITY: onCall (authenticated only) + Rate Limited + VIN Validated
 * OPTIMIZATION: 24h cache deduplication for paid providers
 * FAIL-SAFE: manual_review_needed if all providers fail
 *
 * Waterfall Priority (per market):
 *   EU:   NHTSA (free) → carVertical → AutoDNA
 *   US:   NHTSA (free) → EpicVIN/NMVTIS → carVertical
 *   ASIA: NHTSA (free) → carVertical
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { checkRateLimit, RATE_LIMITS } from '../utils/rateLimiter';
import { sanitizeVIN, validateVIN } from '../utils/vinValidator';
import { maskVin } from '../utils/pipelineLogger';
import {
    PROVIDER_URLS,
    PROVIDER_TIMEOUT_MS,
    TOTAL_TIMEOUT_MS,
    CACHE_TTL_MS,
} from '../config/providers';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ── Constants (from config) ──
const NHTSA_BASE = PROVIDER_URLS.nhtsaDecode;

// ── Types ──
interface ProviderResponse {
    provider: string;
    status: 'success' | 'error' | 'timeout' | 'cached' | 'skipped';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    responseTimeMs: number;
    fromCache?: boolean;
}

interface DecodeResult {
    vin: string;
    source: 'cache' | 'live';
    nhtsa: NHTSAData | null;
    providers: ProviderResponse[];
    recalls: NHTSARecall[];
    complaints: number;
    decodedAt: string;
    allProvidersFailed: boolean;
}

interface NHTSAData {
    make: string;
    model: string;
    year: number;
    fuelType: string;
    bodyClass: string;
    plantCountry: string;
    manufacturer: string;
}

interface NHTSARecall {
    campaignNumber: string;
    component: string;
    summary: string;
    date: string;
}

// ── Provider Priority Map ──
function getProviderChain(market: string): string[] {
    switch (market) {
        case 'EU': return ['carVertical', 'autoDNA'];
        case 'US': return ['epicVIN', 'carVertical'];
        case 'ASIA': return ['carVertical'];
        default: return ['carVertical'];
    }
}

/**
 * Detect market from WMI (first 1-3 chars of VIN)
 */
function detectMarket(vin: string): 'EU' | 'US' | 'ASIA' | 'UNKNOWN' {
    const c1 = vin.charAt(0);
    const c2 = vin.substring(0, 2);

    // US/Canada/Mexico
    if ('12345'.includes(c1)) return 'US';
    // Japan/Korea/China
    if ('JKL'.includes(c1)) return 'ASIA';
    // Germany
    if (c1 === 'W') return 'EU';
    // France
    if (c2 === 'VF' || c2 === 'VR') return 'EU';
    // UK
    if (c2 === 'SA' || c2 === 'SJ') return 'EU';
    // Italy
    if (c2 === 'ZA' || c2 === 'ZF') return 'EU';
    // Sweden
    if (c2 === 'YV' || c2 === 'YS') return 'EU';
    // Czech
    if (c2 === 'TM') return 'EU';
    // Spain
    if (c2 === 'VS') return 'EU';
    // Netherlands
    if (c2 === 'XL') return 'EU';

    return 'UNKNOWN';
}

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${ms}ms`)),
            ms
        );
        promise
            .then((val) => { clearTimeout(timer); resolve(val); })
            .catch((err) => { clearTimeout(timer); reject(err); });
    });
}

// ═══════════════════════════════════════════
// MAIN CLOUD FUNCTION
// ═══════════════════════════════════════════

export const decodeVin = onCall({
    region: 'europe-west1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    // ── 1. Auth Check ──
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Authentication required to decode VIN'
        );
    }

    const uid = request.auth.uid;

    // ── 2. Rate Limiting ──
    await checkRateLimit(uid, 'vinDecode', RATE_LIMITS.vinDecode);

    // ── 3. Input Validation ──
    const rawVin = request.data?.vin;
    if (!rawVin) {
        throw new HttpsError('invalid-argument', 'VIN is required');
    }

    const validation = validateVIN(rawVin);
    if (!validation.valid) {
        throw new HttpsError(
            'invalid-argument',
            validation.error || 'Invalid VIN',
            { validationCode: validation.code }
        );
    }

        const vin = sanitizeVIN(rawVin);
        const level: number = request.data?.level || 1;

        logger.info(`[VIN Decode] UID:${uid} VIN:${maskVin(vin)} Level:${level}`);

        try {
            const pipelineStart = Date.now();

            // ── 4. Check FULL cache (all providers) ──
            const cacheRef = db.collection('vin_cache').doc(vin);
            const cached = await cacheRef.get();

            if (cached.exists) {
                const cacheData = cached.data()!;
                const cacheAge = Date.now() - (cacheData.cachedAt?.toDate?.()?.getTime() || 0);

                if (cacheAge < CACHE_TTL_MS) {
                    logger.info(`[VIN Cache] HIT for ${vin} (age: ${Math.round(cacheAge / 60000)}min)`);
                    return {
                        ...cacheData.decodedData,
                        source: 'cache',
                    } as DecodeResult;
                }
            }

            // ── 5. NHTSA (always free, always runs first) ──
            let nhtsaData: NHTSAData | null = null;
            let recalls: NHTSARecall[] = [];
            let complaints = 0;
            let nhtsaFailed = false;

            try {
                nhtsaData = await withTimeout(
                    decodeViaNHTSA(vin),
                    PROVIDER_TIMEOUT_MS,
                    'NHTSA Decode'
                );
                recalls = await withTimeout(
                    fetchNHTSARecalls(vin),
                    PROVIDER_TIMEOUT_MS,
                    'NHTSA Recalls'
                );
                if (nhtsaData) {
                    complaints = await withTimeout(
                        fetchNHTSAComplaints(nhtsaData.make, nhtsaData.model, nhtsaData.year),
                        PROVIDER_TIMEOUT_MS,
                        'NHTSA Complaints'
                    );
                }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                nhtsaFailed = true;
                logger.warn(`[NHTSA] Failed: ${err.message}`);
            }

            // ── 6. Detect market & get paid provider chain ──
            const market = detectMarket(vin);
            const providerChain = getProviderChain(market);

            // ── 7. API Deduplication: check if we have cached paid data ──
            const paidProviderResults: ProviderResponse[] = [];
            let hasCachedPaidData = false;

            if (cached.exists) {
                const cacheData = cached.data()!;
                const providers = cacheData.decodedData?.providers;
                if (providers && Array.isArray(providers)) {
                    const validCached = providers.filter(
                        (p: ProviderResponse) => p.status === 'success'
                    );
                    if (validCached.length > 0) {
                        // Reuse cached paid provider data — don't re-query
                        hasCachedPaidData = true;
                        for (const p of validCached) {
                            paidProviderResults.push({
                                ...p,
                                status: 'cached',
                                fromCache: true,
                            });
                        }
                        logger.info(
                            `[API Deduplication] Reusing ${validCached.length} cached provider(s) for ${vin}`
                        );
                    }
                }
            }

            // ── 8. Fetch paid providers (only if not cached) ──
            if (!hasCachedPaidData && level >= 1) {
                const remainingTimeout = TOTAL_TIMEOUT_MS - (Date.now() - pipelineStart);

                for (const provider of providerChain) {
                    if (Date.now() - pipelineStart > TOTAL_TIMEOUT_MS) {
                        paidProviderResults.push({
                            provider,
                            status: 'timeout',
                            data: { reason: 'Total pipeline timeout exceeded' },
                            responseTimeMs: Date.now() - pipelineStart,
                        });
                        continue;
                    }

                    const providerStart = Date.now();
                    try {
                        const result = await withTimeout(
                            fetchPaidProvider(provider, vin),
                            Math.min(PROVIDER_TIMEOUT_MS, remainingTimeout),
                            provider
                        );
                        paidProviderResults.push({
                            provider,
                            status: 'success',
                            data: result,
                            responseTimeMs: Date.now() - providerStart,
                        });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (err: any) {
                        const isTimeout = err.message?.includes('timed out');
                        paidProviderResults.push({
                            provider,
                            status: isTimeout ? 'timeout' : 'error',
                            data: { error: err.message },
                            responseTimeMs: Date.now() - providerStart,
                        });
                        logger.warn(`[${provider}] Failed: ${err.message}`);
                    }
                }
            }

            // ── 9. FAIL-SAFE: Check if ALL providers failed ──
            const anyProviderSucceeded =
                !nhtsaFailed ||
                paidProviderResults.some(p => p.status === 'success' || p.status === 'cached');

            const allProvidersFailed = nhtsaFailed &&
                paidProviderResults.every(p => p.status !== 'success' && p.status !== 'cached');

            if (allProvidersFailed) {
                logger.error(
                    `[FAIL-SAFE] All providers failed for VIN ${vin}. Marking for manual review.`
                );
            }

            // ── 10. Build result ──
            const result: DecodeResult = {
                vin,
                source: 'live',
                nhtsa: nhtsaData,
                providers: paidProviderResults,
                recalls,
                complaints,
                decodedAt: new Date().toISOString(),
                allProvidersFailed,
            };

            // ── 11. Cache the result (even partial — dedup benefit) ──
            if (anyProviderSucceeded) {
                await cacheRef.set({
                    vin,
                    decodedData: result,
                    market,
                    cachedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
                });
            }

            const totalTime = Date.now() - pipelineStart;
            logger.info(
                `[VIN Decode] Complete for ${vin} in ${totalTime}ms — ` +
                `NHTSA:${nhtsaFailed ? 'FAIL' : 'OK'} ` +
                `Providers:${paidProviderResults.map(p => `${p.provider}:${p.status}`).join(',')}`
            );

            return result;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof HttpsError) throw error;
        
        // Check for specific error types that might be thrown by libraries
        if (error.code && typeof error.code === 'string') {
             // If it looks like an HttpsError but instance check failed
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             throw new HttpsError(error.code as any, error.message);
        }

        logger.error('[VIN Decode] Unexpected error:', error);
        throw new HttpsError('internal', error.message || 'VIN decode failed');
    }
});

// ═══════════════════════════════════════════
// NHTSA API (FREE)
// ═══════════════════════════════════════════

async function decodeViaNHTSA(vin: string): Promise<NHTSAData> {
    const url = `${NHTSA_BASE}/DecodeVinValues/${vin}?format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NHTSA HTTP ${response.status}`);

    const data = await response.json();
    const result = data.Results?.[0];
    if (!result) throw new Error('NHTSA returned no results');

    return {
        make: result.Make || 'Unknown',
        model: result.Model || 'Unknown',
        year: parseInt(result.ModelYear) || 0,
        fuelType: result.FuelTypePrimary || 'Unknown',
        bodyClass: result.BodyClass || 'Unknown',
        plantCountry: result.PlantCountry || 'Unknown',
        manufacturer: result.Manufacturer || 'Unknown',
    };
}

async function fetchNHTSARecalls(vin: string): Promise<NHTSARecall[]> {
    try {
        const url = `${PROVIDER_URLS.nhtsaRecalls}?vin=${vin}`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.results) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.results.slice(0, 10).map((r: any) => ({
            campaignNumber: r.NHTSACampaignNumber || '',
            component: r.Component || '',
            summary: r.Summary || '',
            date: r.ReportReceivedDate || '',
        }));
    } catch {
        return [];
    }
}

async function fetchNHTSAComplaints(make: string, model: string, year: number): Promise<number> {
    try {
        const url =
            `${PROVIDER_URLS.nhtsaComplaints}?` +
            `make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
        const response = await fetch(url);
        if (!response.ok) return 0;

        const data = await response.json();
        return data.count || 0;
    } catch {
        return 0;
    }
}

// ═══════════════════════════════════════════
// PAID PROVIDERS (requires API keys)
// ═══════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPaidProvider(provider: string, vin: string): Promise<any> {
    switch (provider) {
        case 'carVertical':
            return fetchCarVertical(vin);
        case 'autoDNA':
            return fetchAutoDNA(vin);
        case 'epicVIN':
            return fetchEpicVIN(vin);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCarVertical(vin: string): Promise<any> {
    const apiKey = process.env.CARVERTICAL_API_KEY;
    if (!apiKey) {
        return { status: 'no_api_key', note: 'carVertical API key not configured' };
    }

    const response = await fetch(PROVIDER_URLS.carVertical, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin }),
    });

    if (!response.ok) throw new Error(`carVertical HTTP ${response.status}`);
    return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAutoDNA(vin: string): Promise<any> {
    const apiKey = process.env.AUTODNA_API_KEY;
    if (!apiKey) {
        return { status: 'no_api_key', note: 'AutoDNA API key not configured' };
    }

    const response = await fetch(`${PROVIDER_URLS.autoDna}/${vin}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error(`AutoDNA HTTP ${response.status}`);
    return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchEpicVIN(vin: string): Promise<any> {
    const apiKey = process.env.EPICVIN_API_KEY;
    if (!apiKey) {
        return { status: 'no_api_key', note: 'EpicVIN API key not configured' };
    }

    const response = await fetch(
        `${PROVIDER_URLS.epicVin}?vin=${vin}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!response.ok) throw new Error(`EpicVIN HTTP ${response.status}`);
    return response.json();
}
