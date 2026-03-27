/**
 * VoltCheck — Cloud Functions Client Service
 *
 * Connects the frontend to Cloud Functions (onCall + Firestore listeners)
 * Handles: VIN decode, payment intents, report status subscriptions
 *
 * MOCK MODE: Uses simulated data when Cloud Functions are not deployed
 * Toggle via USE_MOCK_DATA flag for testing
 */

import { Platform } from 'react-native';
import { getFirebaseServices } from './firebase';
import { cacheGet, cacheSet, vinCacheKey } from './offlineCache';

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════

/** Toggle mock mode for testing without Cloud Functions */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

const FUNCTIONS_REGION = process.env.EXPO_PUBLIC_FUNCTIONS_REGION || 'europe-west1';

// ── Types ──
export interface VINDecodeResponse {
    vin: string;
    source: 'cache' | 'live' | 'mock';
    nhtsa: {
        make: string;
        model: string;
        year: number;
        fuelType: string;
        bodyClass: string;
        manufacturer: string;
    } | null;
    providers: Array<{
        provider: string;
        status: string;
        data: any;
    }>;
    recalls: Array<{
        campaignNumber: string;
        component: string;
        summary: string;
    }>;
    complaints: number;
    allProvidersFailed: boolean;
}

export interface PaymentIntentResponse {
    clientSecret: string;
    paymentIntentId: string;
    customerId: string;
}

export interface ReportStatus {
    status: 'processing' | 'completed' | 'failed' | 'manual_review_needed';
    statusDetails: string;
    riskScore?: number;
    riskCategory?: string;
    pdfUrl?: string;
    failureReason?: string;
}

export interface PaymentStatusUpdate {
    paymentStatus: 'pending' | 'completed' | 'failed';
    reportId?: string;
    failureReason?: string;
}

// ═══════════════════════════════════════════
// MOCK DATA (for testing without Cloud Functions)
// ═══════════════════════════════════════════

const MOCK_VIN_RESPONSE: VINDecodeResponse = {
    vin: '',
    source: 'mock',
    nhtsa: {
        make: 'Tesla',
        model: 'Model 3',
        year: 2022,
        fuelType: 'Electric',
        bodyClass: 'Sedan',
        manufacturer: 'Tesla, Inc.',
    },
    providers: [
        { provider: 'carVertical', status: 'success', data: { mileageKm: 45000, accidentCount: 0, ownerCount: 2, titleStatus: 'Clean' } },
        { provider: 'autoDNA', status: 'success', data: { mileageKm: 44800, accidentCount: 0, ownerCount: 2, titleStatus: 'Clean' } },
    ],
    recalls: [
        { campaignNumber: '22V-456', component: 'Power Train', summary: 'Software update for battery management' },
    ],
    complaints: 3,
    allProvidersFailed: false,
};

const MOCK_PIPELINE_STEPS = [
    { statusDetails: 'payment_confirmed', delay: 500 },
    { statusDetails: 'decoding_vin', delay: 2000 },
    { statusDetails: 'searching_eu_databases', delay: 3000 },
    { statusDetails: 'searching_global_databases', delay: 2500 },
    { statusDetails: 'calculating_risk_score', delay: 2000 },
    { statusDetails: 'generating_pdf', delay: 3000 },
    { statusDetails: 'uploading_report', delay: 1500 },
    { statusDetails: 'completed', delay: 0 },
];

// ═══════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Decode VIN via Cloud Function (or mock)
 */
export async function decodeVinRemote(vin: string, level: number = 1): Promise<VINDecodeResponse> {
    if (USE_MOCK_DATA) {
        await simulateDelay(1500);
        return { ...MOCK_VIN_RESPONSE, vin };
    }

    // Check offline cache first
    const cacheKey = vinCacheKey(vin);
    const cached = await cacheGet<VINDecodeResponse>(cacheKey);
    if (cached) {
        return { ...cached, source: 'cache' };
    }

    try {
        const { app } = await getFirebaseServices();
        let result: VINDecodeResponse;

        if (Platform.OS === 'web') {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions(app, FUNCTIONS_REGION);
            const decodeVin = httpsCallable<{ vin: string; level: number }, VINDecodeResponse>(
                functions, 'decodeVin'
            );
            result = (await decodeVin({ vin, level })).data;
        } else {
            const rnFunctions = (await import('@react-native-firebase/app')) as any;
            const functionsModule = rnFunctions.default.functions();
            const decodeVin = (functionsModule as any).httpsCallable('decodeVin');
            result = (await decodeVin({ vin, level })).data as VINDecodeResponse;
        }

        // Cache successful results for 24h
        await cacheSet(cacheKey, result, { ttlMs: 24 * 60 * 60 * 1000 });
        return result;
    } catch (err: any) {
        // On network error, try cache (even expired would be better than nothing)
        const parsed = parseCloudError(err);
        if (parsed.isNetworkError && cached) {
            return { ...cached, source: 'cache' };
        }
        throw err;
    }
}

/**
 * Create Stripe Payment Intent via Cloud Function (or mock)
 */
export async function createPaymentIntentRemote(params: {
    level: 1 | 2;
    vin: string;
    vehicleMake?: string;
    vehicleModel?: string;
}): Promise<PaymentIntentResponse> {
    if (USE_MOCK_DATA) {
        await simulateDelay(800);
        return {
            clientSecret: 'pi_mock_secret_' + Date.now(),
            paymentIntentId: 'pi_mock_' + Date.now(),
            customerId: 'cus_mock_' + Date.now(),
        };
    }

    const { app } = await getFirebaseServices();

    if (Platform.OS === 'web') {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(app, FUNCTIONS_REGION);
        const createIntent = httpsCallable<typeof params, PaymentIntentResponse>(
            functions, 'createPaymentIntent'
        );
        const result = await createIntent(params);
        return result.data;
    } else {
        // Native: use @react-native-firebase/functions
        const rnFunctions = (await import('@react-native-firebase/app')) as any;
        const functionsModule = rnFunctions.default.functions();
        const createIntent = (functionsModule as any).httpsCallable('createPaymentIntent');
        const result = await createIntent(params);
        return result.data as PaymentIntentResponse;
    }
}

/**
 * Subscribe to report status updates in real-time
 * Returns an unsubscribe function
 */
export function subscribeToReportStatus(
    reportId: string,
    onUpdate: (status: ReportStatus) => void,
    onError?: (error: Error) => void
): () => void {
    if (USE_MOCK_DATA) {
        return simulateMockPipeline(onUpdate);
    }

    // Real Firestore listener
    let unsubscribe: (() => void) | null = null;

    (async () => {
        try {
            const { db } = await getFirebaseServices();

            if (Platform.OS === 'web') {
                const { doc, onSnapshot } = await import('firebase/firestore');
                const reportRef = doc(db, 'reports', reportId);
                unsubscribe = onSnapshot(reportRef, (snap: any) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        onUpdate({
                            status: data.status,
                            statusDetails: data.statusDetails || data.status,
                            riskScore: data.riskScore,
                            riskCategory: data.riskCategory,
                            pdfUrl: data.pdfUrl,
                            failureReason: data.failureReason,
                        });
                    }
                }, (err: Error) => {
                    onError?.(err);
                });
            } else {
                // @react-native-firebase
                const rnFirestore = await import('@react-native-firebase/firestore');
                unsubscribe = rnFirestore.default()
                    .collection('reports')
                    .doc(reportId)
                    .onSnapshot((snap: any) => {
                        if (snap.exists) {
                            const data = snap.data();
                            onUpdate({
                                status: data.status,
                                statusDetails: data.statusDetails || data.status,
                                riskScore: data.riskScore,
                                riskCategory: data.riskCategory,
                                pdfUrl: data.pdfUrl,
                                failureReason: data.failureReason,
                            });
                        }
                    }, (err: Error) => {
                        onError?.(err);
                    });
            }
        } catch (err: any) {
            onError?.(err);
        }
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
}

/**
 * Subscribe to payment status to discover the reportId
 * The webhook creates the report and saves reportId on the payment doc.
 * This function listens for that update and returns the reportId.
 */
export function subscribeToPaymentStatus(
    paymentIntentId: string,
    onUpdate: (update: PaymentStatusUpdate) => void,
    onError?: (error: Error) => void
): () => void {
    if (USE_MOCK_DATA) {
        let cancelled = false;
        // Simulate: payment processing → completed with mock reportId
        setTimeout(() => {
            if (!cancelled) {
                onUpdate({
                    paymentStatus: 'completed',
                    reportId: 'demo_report_001',
                });
            }
        }, 1500);
        return () => { cancelled = true; };
    }

    // Real Firestore listener on payments/{paymentIntentId}
    let unsubscribe: (() => void) | null = null;

    (async () => {
        try {
            const { db } = await getFirebaseServices();

            if (Platform.OS === 'web') {
                const { doc, onSnapshot } = await import('firebase/firestore');
                const paymentRef = doc(db, 'payments', paymentIntentId);
                unsubscribe = onSnapshot(paymentRef, (snap: any) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        onUpdate({
                            paymentStatus: data.status || 'pending',
                            reportId: data.reportId || undefined,
                            failureReason: data.failureReason || undefined,
                        });
                    }
                }, (err: Error) => {
                    onError?.(err);
                });
            } else {
                // @react-native-firebase
                const rnFirestore = await import('@react-native-firebase/firestore');
                unsubscribe = rnFirestore.default()
                    .collection('payments')
                    .doc(paymentIntentId)
                    .onSnapshot((snap: any) => {
                        if (snap.exists) {
                            const data = snap.data();
                            onUpdate({
                                paymentStatus: data.status || 'pending',
                                reportId: data.reportId || undefined,
                                failureReason: data.failureReason || undefined,
                            });
                        }
                    }, (err: Error) => {
                        onError?.(err);
                    });
            }
        } catch (err: any) {
            onError?.(err);
        }
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
}

// ═══════════════════════════════════════════
// ERROR HANDLING UTILITIES
// ═══════════════════════════════════════════

export interface CloudFunctionError {
    code: string;
    message: string;
    isRateLimit: boolean;
    isAuthError: boolean;
    isNetworkError: boolean;
    retryAfterSeconds?: number;
    validationCode?: string;
}

/**
 * Parse Cloud Function errors into user-friendly format
 */
export function parseCloudError(error: any): CloudFunctionError {
    // Firebase HttpsError contains code and message
    // Mobile SDKs might wrap this differently than Web SDK
    const code = error?.code || error?.details?.code || 'unknown';
    let message = error?.message || 'An unexpected error occurred';

    // Cleanup generic Firebase prefix if present
    if (message.includes('] ')) {
        message = message.split('] ').pop() || message;
    }

    return {
        code,
        message,
        isRateLimit: code === 'resource-exhausted' || code === 'functions/resource-exhausted',
        isAuthError: ['unauthenticated', 'permission-denied', 'functions/unauthenticated', 'functions/permission-denied'].includes(code),
        isNetworkError: ['unavailable', 'deadline-exceeded', 'functions/unavailable'].includes(code) || message.toLowerCase().includes('network'),
        retryAfterSeconds: error?.details?.retryAfterSeconds,
        validationCode: error?.details?.validationCode,
    };
}

// ── Helpers ──
function simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function simulateMockPipeline(onUpdate: (status: ReportStatus) => void): () => void {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    (async () => {
        for (const step of MOCK_PIPELINE_STEPS) {
            if (cancelled) return;

            onUpdate({
                status: step.statusDetails === 'completed' ? 'completed' : 'processing',
                statusDetails: step.statusDetails,
                riskScore: step.statusDetails === 'completed' ? 23 : undefined,
                riskCategory: step.statusDetails === 'completed' ? 'LOW' : undefined,
                pdfUrl: step.statusDetails === 'completed' ? 'https://mock.voltcheck.app/report.pdf' : undefined,
            });

            if (step.delay > 0) {
                await new Promise<void>(resolve => {
                    timeoutId = setTimeout(resolve, step.delay);
                });
            }
        }
    })();

    return () => {
        cancelled = true;
        clearTimeout(timeoutId);
    };
}
