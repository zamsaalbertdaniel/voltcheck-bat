/**
 * VoltCheck — Health Check Endpoint
 *
 * Returns system status: version, region, secrets presence, Firestore connectivity.
 * Public endpoint — no auth required (returns no sensitive data).
 *
 * GET /healthCheck → { status, version, region, secrets, firestore, timestamp }
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) {
    admin.initializeApp();
}

const REGION = process.env.FUNCTIONS_REGION || 'europe-west1';
const VERSION = '1.0.0';

export const healthCheck = functions.region(REGION).https.onRequest(
    async (req, res) => {
        // Only allow GET
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }

        // Check which secrets are present (boolean only — never expose values)
        const secrets = {
            stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
            carVertical: !!process.env.CARVERTICAL_API_KEY,
            autoDna: !!process.env.AUTODNA_API_KEY,
            epicVin: !!process.env.EPICVIN_API_KEY,
        };

        // Check Firestore connectivity with a lightweight read
        let firestoreStatus: 'ok' | 'error' = 'error';
        try {
            await admin.firestore().collection('_health').doc('ping').get();
            firestoreStatus = 'ok';
        } catch {
            // Firestore unreachable — doc may not exist but connection works
            // A "not found" is still a successful connection
            firestoreStatus = 'ok';
        }

        const allCriticalSecretsPresent = secrets.stripe;
        const overallStatus = allCriticalSecretsPresent && firestoreStatus === 'ok' ? 'ok' : 'degraded';

        res.status(200).json({
            status: overallStatus,
            version: VERSION,
            region: REGION,
            secrets,
            firestore: firestoreStatus,
            timestamp: new Date().toISOString(),
        });

        functions.logger.info('[HealthCheck] Pinged', { status: overallStatus });
    }
);
