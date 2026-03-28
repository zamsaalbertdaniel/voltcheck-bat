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
const SMARTCAR_REDIRECT_URI = process.env.SMARTCAR_REDIRECT_URI || 'voltcheck://callback';
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

        const { vehicleId } = request.data;
        if (!vehicleId || typeof vehicleId !== 'string') {
            throw new HttpsError('invalid-argument', 'Vehicle ID is required');
        }

        const userId = request.auth.uid;

        try {
            // Get stored tokens
            const accessToken = await getValidAccessToken(userId);

            // Fetch battery data in parallel
            const headers = { 'Authorization': `Bearer ${accessToken}` };

            const [batteryRes, chargeRes, odometerRes] = await Promise.allSettled([
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/battery`, { headers }),
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/charge`, { headers }),
                fetch(`${SMARTCAR_API_BASE}/vehicles/${vehicleId}/odometer`, { headers }),
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

            const result = {
                vehicleId,
                battery: batteryData ? {
                    percentRemaining: batteryData.percentRemaining ?? 0,
                    range: batteryData.range ?? 0,
                    capacity: batteryData.capacity ?? 0,
                    stateOfHealth: batteryData.stateOfHealth ?? null,
                } : null,
                charge: chargeData ? {
                    isPluggedIn: chargeData.isPluggedIn ?? false,
                    state: chargeData.state ?? 'NOT_CHARGING',
                } : null,
                odometer: odometerData ? {
                    distance: odometerData.distance ?? 0,
                } : null,
                capturedAt: new Date().toISOString(),
            };

            logger.info(`[Smartcar] Battery data fetched for vehicle ${vehicleId}`);
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
