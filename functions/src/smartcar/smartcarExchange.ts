/**
 * VoltCheck — Cloud Function: Smartcar OAuth Token Exchange
 *
 * Handles the server-side OAuth token exchange for Smartcar Connect.
 * The client sends the authorization code, and this function:
 *   1. Exchanges the code for access + refresh tokens (using client_secret)
 *   2. Fetches the list of vehicles from the user's Smartcar account
 *   3. Stores tokens securely in Firestore (encrypted at rest)
 *   4. Returns the vehicle list to the client
 *
 * Also provides a token refresh endpoint and a battery data fetch endpoint.
 *
 * Security:
 *   - Client NEVER sees the client_secret
 *   - Tokens stored server-side only
 *   - All endpoints require Firebase Auth
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// Declare secrets so Firebase injects them at runtime
const smartcarClientId = defineSecret('SMARTCAR_CLIENT_ID');
const smartcarClientSecret = defineSecret('SMARTCAR_CLIENT_SECRET');
const smartcarRedirectUri = defineSecret('SMARTCAR_REDIRECT_URI');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Smartcar API configuration from environment/secrets
const SMARTCAR_CLIENT_ID = process.env.SMARTCAR_CLIENT_ID || '';
const SMARTCAR_CLIENT_SECRET = process.env.SMARTCAR_CLIENT_SECRET || '';
const SMARTCAR_REDIRECT_URI = process.env.SMARTCAR_REDIRECT_URI || 'inspectev://callback';
const SMARTCAR_API_BASE = 'https://api.smartcar.com/v2.0';
const SMARTCAR_AUTH_BASE = 'https://auth.smartcar.com/oauth/token';

// ═══════════════════════════════════════════
// 1. Token Exchange (Authorization Code → Access Token)
// ═══════════════════════════════════════════

export const smartcarExchange = onCall(
    {
        region: 'europe-west1',
        enforceAppCheck: false,
        secrets: [smartcarClientId, smartcarClientSecret, smartcarRedirectUri],
    },
    async (request) => {
        // Require authentication
        if (!request.auth?.uid) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const { code } = request.data;
        if (!code || typeof code !== 'string') {
            throw new HttpsError('invalid-argument', 'Authorization code is required');
        }

        if (!SMARTCAR_CLIENT_ID || !SMARTCAR_CLIENT_SECRET) {
            logger.error('[Smartcar] Missing client credentials in environment');
            throw new HttpsError('failed-precondition', 'Smartcar integration not configured');
        }

        const userId = request.auth.uid;

        try {
            // Exchange authorization code for tokens
            const tokenResponse = await fetch(SMARTCAR_AUTH_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${SMARTCAR_CLIENT_ID}:${SMARTCAR_CLIENT_SECRET}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: SMARTCAR_REDIRECT_URI,
                }).toString(),
            });

            if (!tokenResponse.ok) {
                const errorBody = await tokenResponse.text();
                logger.error(`[Smartcar] Token exchange failed: ${tokenResponse.status}`, errorBody);
                throw new HttpsError('internal', 'Failed to exchange authorization code');
            }

            const tokens = await tokenResponse.json();

            // Store tokens securely in Firestore
            await db.collection('smartcar_tokens').doc(userId).set({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                scope: tokens.scope,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Fetch user's vehicles
            const vehiclesResponse = await fetch(`${SMARTCAR_API_BASE}/vehicles`, {
                headers: { 'Authorization': `Bearer ${tokens.access_token}` },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let vehicles: any[] = [];
            if (vehiclesResponse.ok) {
                const vehiclesData = await vehiclesResponse.json();
                const vehicleIds: string[] = vehiclesData.vehicles || [];

                // Fetch details for each vehicle
                vehicles = await Promise.all(
                    vehicleIds.map(async (vehicleId: string) => {
                        try {
                            const res = await fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}`, {
                                headers: { 'Authorization': `Bearer ${tokens.access_token}` },
                            });
                            if (res.ok) {
                                const data = await res.json();
                                return {
                                    id: vehicleId,
                                    make: data.make || 'Unknown',
                                    model: data.model || 'Unknown',
                                    year: data.year || 0,
                                };
                            }
                        } catch (err) {
                            logger.warn(`[Smartcar] Failed to fetch vehicle ${vehicleId}:`, err);
                        }
                        return { id: vehicleId, make: 'Unknown', model: 'Unknown', year: 0 };
                    })
                );
            }

            logger.info(`[Smartcar] Token exchange successful for user ${userId}, ${vehicles.length} vehicles found`);

            return {
                success: true,
                vehicles,
                vehicleCount: vehicles.length,
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[Smartcar] Exchange failed:', error);
            throw new HttpsError('internal', 'Smartcar connection failed');
        }
    }
);

// ═══════════════════════════════════════════
// 2. Fetch Battery Data (using stored tokens)
// ═══════════════════════════════════════════

export const smartcarBatteryData = onCall(
    {
        region: 'europe-west1',
        enforceAppCheck: false,
        secrets: [smartcarClientId, smartcarClientSecret],
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const { vehicleId, vehicleMake, nominalCapacityKwh } = request.data;
        if (!vehicleId || typeof vehicleId !== 'string') {
            throw new HttpsError('invalid-argument', 'Vehicle ID is required');
        }

        const userId = request.auth.uid;

        try {
            // Get stored tokens
            const accessToken = await getValidAccessToken(userId);

            // Fetch battery + vehicle data in parallel
            const headers = { 'Authorization': `Bearer ${accessToken}` };

            const [batteryRes, chargeRes, odometerRes, vehicleInfoRes] = await Promise.allSettled([
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/battery`, { headers }),
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/charge`, { headers }),
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/odometer`, { headers }),
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}`, { headers }),
            ]);

            const batteryData = batteryRes.status === 'fulfilled' && batteryRes.value.ok
                ? await batteryRes.value.json()
                : null;

            const chargeData = chargeRes.status === 'fulfilled' && chargeRes.value.ok
                ? await chargeRes.value.json()
                : null;

            const odometerData = odometerRes.status === 'fulfilled' && odometerRes.value.ok
                ? await odometerRes.value.json()
                : null;

            const vehicleInfo = vehicleInfoRes.status === 'fulfilled' && vehicleInfoRes.value.ok
                ? await vehicleInfoRes.value.json()
                : null;

            // ═══════════════════════════════════════════
            // PLAN A: Instant SoH Extraction
            // Try to get SoH directly from API or estimate from range/capacity
            // ═══════════════════════════════════════════

            let stateOfHealth: number | null = null;
            let sohSource: 'direct_bms' | 'range_estimate' | 'capacity_estimate' | 'unavailable' = 'unavailable';
            let usableCapacityKwh: number | null = null;

            // Method 1: Direct BMS SoH (Tesla, Rivian, Lucid expose this)
            if (batteryData?.stateOfHealth != null && batteryData.stateOfHealth > 0) {
                stateOfHealth = batteryData.stateOfHealth;
                sohSource = 'direct_bms';
                logger.info(`[Smartcar] Plan A — Direct BMS SoH: ${stateOfHealth}%`);
            }

            // Method 2: Capacity-based estimation
            // If API returns current usable capacity and we know nominal
            if (stateOfHealth === null && batteryData?.capacity != null && batteryData.capacity > 0) {
                usableCapacityKwh = batteryData.capacity;
                const nominal = nominalCapacityKwh || getNominalCapacity(vehicleMake || vehicleInfo?.make, vehicleInfo?.model);
                if (nominal > 0) {
                    stateOfHealth = Math.round((usableCapacityKwh! / nominal) * 100 * 10) / 10;
                    sohSource = 'capacity_estimate';
                    logger.info(`[Smartcar] Plan A — Capacity estimate: ${usableCapacityKwh}/${nominal} kWh = ${stateOfHealth}%`);
                }
            }

            // Method 3: Range-based estimation
            // Compare current 100% range vs factory range
            if (stateOfHealth === null && batteryData?.range != null && batteryData.range > 0) {
                const factoryRange = getFactoryRange(vehicleMake || vehicleInfo?.make, vehicleInfo?.model);
                if (factoryRange > 0 && batteryData.percentRemaining != null && batteryData.percentRemaining > 10) {
                    // Extrapolate to 100% range
                    const estimatedFullRange = (batteryData.range / batteryData.percentRemaining) * 100;
                    stateOfHealth = Math.round((estimatedFullRange / factoryRange) * 100 * 10) / 10;
                    // Clamp to reasonable range (50-100%)
                    stateOfHealth = Math.max(50, Math.min(100, stateOfHealth));
                    sohSource = 'range_estimate';
                    logger.info(`[Smartcar] Plan A — Range estimate: ${estimatedFullRange.toFixed(0)}/${factoryRange} km = ${stateOfHealth}%`);
                }
            }

            // Determine Plan A success
            const planA = stateOfHealth !== null;

            const result = {
                vehicleId,
                planA,
                sohSource,
                needsChargeScan: !planA, // If Plan A failed, UI should offer Plan B
                battery: {
                    percentRemaining: batteryData?.percentRemaining ?? 0,
                    range: batteryData?.range ?? 0,
                    capacity: batteryData?.capacity ?? 0,
                    stateOfHealth,
                    usableCapacityKwh: usableCapacityKwh ?? batteryData?.capacity ?? null,
                },
                charge: chargeData ? {
                    isPluggedIn: chargeData.isPluggedIn ?? false,
                    state: chargeData.state ?? 'NOT_CHARGING',
                } : null,
                odometer: odometerData ? {
                    distance: odometerData.distance ?? 0,
                } : null,
                vehicle: vehicleInfo ? {
                    make: vehicleInfo.make ?? vehicleMake ?? 'Unknown',
                    model: vehicleInfo.model ?? 'Unknown',
                    year: vehicleInfo.year ?? 0,
                } : null,
                capturedAt: new Date().toISOString(),
            };

            logger.info(
                `[Smartcar] Battery data fetched for vehicle ${vehicleId}. ` +
                `Plan A: ${planA ? 'SUCCESS' : 'FAILED'}, SoH source: ${sohSource}, ` +
                `SoH: ${stateOfHealth ?? 'N/A'}%`
            );

            return { success: true, data: result };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[Smartcar] Battery fetch failed:', error);
            throw new HttpsError('internal', 'Failed to fetch battery data');
        }
    }
);

// ═══════════════════════════════════════════
// Vehicle Reference Data (factory specs)
// ═══════════════════════════════════════════

/** Nominal battery capacity in kWh by make/model (common EVs) */
function getNominalCapacity(make?: string, model?: string): number {
    if (!make) return 0;
    const key = `${make.toUpperCase()} ${(model || '').toUpperCase()}`;

    const CAPACITIES: Record<string, number> = {
        'TESLA MODEL 3': 60,     // Standard Range+
        'TESLA MODEL 3 LONG RANGE': 82,
        'TESLA MODEL Y': 60,
        'TESLA MODEL Y LONG RANGE': 82,
        'TESLA MODEL S': 100,
        'TESLA MODEL X': 100,
        'BMW IX3': 80,
        'BMW I4': 83.9,
        'BMW IX': 111.5,
        'VOLKSWAGEN ID.3': 62,
        'VOLKSWAGEN ID.4': 82,
        'VOLKSWAGEN ID.5': 82,
        'HYUNDAI IONIQ 5': 77.4,
        'HYUNDAI IONIQ 6': 77.4,
        'HYUNDAI KONA ELECTRIC': 64,
        'KIA EV6': 77.4,
        'KIA NIRO EV': 64.8,
        'NISSAN LEAF': 40,
        'NISSAN ARIYA': 87,
        'FORD MUSTANG MACH-E': 75.7,
        'MERCEDES-BENZ EQA': 66.5,
        'MERCEDES-BENZ EQB': 66.5,
        'MERCEDES-BENZ EQC': 80,
        'MERCEDES-BENZ EQS': 107.8,
        'AUDI Q4 E-TRON': 82,
        'AUDI E-TRON': 95,
        'PORSCHE TAYCAN': 93.4,
        'VOLVO XC40 RECHARGE': 78,
        'POLESTAR 2': 78,
        'RIVIAN R1T': 135,
        'RIVIAN R1S': 135,
        'LUCID AIR': 118,
        'DACIA SPRING': 26.8,
        'RENAULT ZOE': 52,
        'RENAULT MEGANE E-TECH': 60,
        'SKODA ENYAQ': 82,
        'CUPRA BORN': 62,
        'OPEL CORSA-E': 50,
        'PEUGEOT E-208': 50,
        'FIAT 500E': 42,
    };

    // Try exact match first, then partial (make only)
    if (CAPACITIES[key]) return CAPACITIES[key];

    // Try just make + first word of model
    for (const [k, v] of Object.entries(CAPACITIES)) {
        if (k.startsWith(make.toUpperCase()) && model && k.includes(model.split(' ')[0].toUpperCase())) {
            return v;
        }
    }

    return 0;
}

/** Factory range in km (WLTP) by make/model */
function getFactoryRange(make?: string, model?: string): number {
    if (!make) return 0;
    const key = `${make.toUpperCase()} ${(model || '').toUpperCase()}`;

    const RANGES: Record<string, number> = {
        'TESLA MODEL 3': 491,
        'TESLA MODEL 3 LONG RANGE': 602,
        'TESLA MODEL Y': 455,
        'TESLA MODEL Y LONG RANGE': 533,
        'TESLA MODEL S': 634,
        'TESLA MODEL X': 543,
        'BMW IX3': 460,
        'BMW I4': 590,
        'BMW IX': 630,
        'VOLKSWAGEN ID.3': 426,
        'VOLKSWAGEN ID.4': 520,
        'VOLKSWAGEN ID.5': 520,
        'HYUNDAI IONIQ 5': 481,
        'HYUNDAI IONIQ 6': 614,
        'HYUNDAI KONA ELECTRIC': 484,
        'KIA EV6': 528,
        'KIA NIRO EV': 460,
        'NISSAN LEAF': 270,
        'NISSAN ARIYA': 533,
        'FORD MUSTANG MACH-E': 440,
        'MERCEDES-BENZ EQA': 426,
        'MERCEDES-BENZ EQS': 770,
        'AUDI Q4 E-TRON': 520,
        'AUDI E-TRON': 436,
        'PORSCHE TAYCAN': 484,
        'VOLVO XC40 RECHARGE': 418,
        'POLESTAR 2': 478,
        'DACIA SPRING': 230,
        'RENAULT ZOE': 395,
        'SKODA ENYAQ': 534,
    };

    if (RANGES[key]) return RANGES[key];

    for (const [k, v] of Object.entries(RANGES)) {
        if (k.startsWith(make.toUpperCase()) && model && k.includes(model.split(' ')[0].toUpperCase())) {
            return v;
        }
    }

    return 0;
}

// ═══════════════════════════════════════════
// 3. Disconnect Smartcar (revoke tokens)
// ═══════════════════════════════════════════

export const smartcarDisconnect = onCall(
    {
        region: 'europe-west1',
        enforceAppCheck: false,
    },
    async (request) => {
        if (!request.auth?.uid) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const userId = request.auth.uid;

        try {
            const tokenDoc = await db.collection('smartcar_tokens').doc(userId).get();
            const tokenData = tokenDoc.data();

            if (tokenData?.accessToken) {
                // Revoke token at Smartcar
                await fetch('https://api.smartcar.com/v2.0/management/connections', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${tokenData.accessToken}`,
                    },
                });
            }

            // Delete stored tokens
            await db.collection('smartcar_tokens').doc(userId).delete();

            logger.info(`[Smartcar] Disconnected for user ${userId}`);
            return { success: true };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[Smartcar] Disconnect failed:', error);
            throw new HttpsError('internal', 'Failed to disconnect Smartcar');
        }
    }
);

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/**
 * Gets a valid access token, refreshing if expired.
 */
async function getValidAccessToken(userId: string): Promise<string> {
    const tokenDoc = await db.collection('smartcar_tokens').doc(userId).get();
    const tokenData = tokenDoc.data();

    if (!tokenData) {
        throw new HttpsError(
            'failed-precondition',
            'No Smartcar connection found. Please connect your vehicle first.'
        );
    }

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);
    const isExpired = expiresAt.getTime() < Date.now() + 60_000; // 1 min buffer

    if (!isExpired) {
        return tokenData.accessToken;
    }

    // Refresh the token
    if (!tokenData.refreshToken) {
        throw new HttpsError('failed-precondition', 'Smartcar session expired. Please reconnect.');
    }

    const refreshResponse = await fetch(SMARTCAR_AUTH_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${SMARTCAR_CLIENT_ID}:${SMARTCAR_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokenData.refreshToken,
        }).toString(),
    });

    if (!refreshResponse.ok) {
        // Refresh failed — user needs to reconnect
        await db.collection('smartcar_tokens').doc(userId).delete();
        throw new HttpsError('failed-precondition', 'Smartcar session expired. Please reconnect.');
    }

    const newTokens = await refreshResponse.json();

    // Update stored tokens
    await db.collection('smartcar_tokens').doc(userId).set({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || tokenData.refreshToken,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        scope: newTokens.scope || tokenData.scope,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`[Smartcar] Token refreshed for user ${userId}`);
    return newTokens.access_token;
}
