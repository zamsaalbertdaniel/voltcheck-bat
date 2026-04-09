/**
 * InspectEV — Cloud Function: Smartcar Webhook Receiver
 *
 * Smartcar pushes vehicle data to this endpoint on a schedule (or on event)
 * so we can keep Level 2 battery snapshots fresh without the user opening
 * the app.
 *
 * SUPPORTED EVENTS:
 *   - verify          → respond with HMAC-SHA256(challenge, MAT) for
 *                       webhook endpoint verification
 *   - schedule        → Smartcar delivers battery/charge/odometer data
 *                       on the cadence set in the dashboard
 *   - vehicle         → one-off vehicle event push
 *
 * SECURITY:
 *   - All requests must carry a valid `sc-signature` header
 *     = hex(HMAC_SHA256(rawBody, SMARTCAR_MAT))
 *   - MAT = Management API Token (set once in Smartcar dashboard →
 *     Webhooks → select webhook → "Management API Token")
 *
 * STORAGE:
 *   - Latest snapshot per vehicle is written to
 *     `smartcar_snapshots/{vehicleId}`
 *   - Also appended to `smartcar_history/{vehicleId}/events/{timestamp}`
 *     for trend analysis (degradation curve)
 *
 * Configure webhook in Smartcar dashboard:
 *   URL:    https://europe-west1-<project>.cloudfunctions.net/smartcarWebhook
 *   Secret: the MAT you generate in the dashboard (store as
 *           SMARTCAR_MAT in Firebase Secrets)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

// Declare the secret — set via:
//   firebase functions:secrets:set SMARTCAR_MAT
const smartcarMat = defineSecret('SMARTCAR_MAT');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ─── Helpers ───

function computeSignature(rawBody: Buffer, mat: string): string {
    return crypto.createHmac('sha256', mat).update(rawBody).digest('hex');
}

function verifySignature(rawBody: Buffer, mat: string, headerSig: string): boolean {
    if (!headerSig) return false;
    const expected = computeSignature(rawBody, mat);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(headerSig, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Parse a single Smartcar data path result (path="/battery", body={...})
 * into a normalized field map we can write into Firestore.
 */
function extractSnapshot(vehicleData: any[]): {
    battery?: any;
    charge?: any;
    odometer?: any;
    stateOfHealth?: number | null;
    percentRemaining?: number | null;
    rangeKm?: number | null;
    capacityKwh?: number | null;
    capturedAt: string;
} {
    const snap: any = { capturedAt: new Date().toISOString() };

    for (const entry of vehicleData || []) {
        if (entry.code && entry.code >= 400) continue;
        switch (entry.path) {
            case '/battery':
                snap.battery = entry.body;
                snap.percentRemaining = entry.body?.percentRemaining ?? null;
                snap.rangeKm = entry.body?.range ?? null;
                snap.capacityKwh = entry.body?.capacity ?? null;
                snap.stateOfHealth = entry.body?.stateOfHealth ?? null;
                break;
            case '/charge':
                snap.charge = entry.body;
                break;
            case '/odometer':
                snap.odometer = entry.body;
                break;
        }
    }

    return snap;
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

export const smartcarWebhook = onRequest(
    {
        region: 'europe-west1',
        secrets: [smartcarMat],
        memory: '256MiB',
        maxInstances: 5,
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const mat = process.env.SMARTCAR_MAT;
        if (!mat) {
            logger.error('[SmartcarWebhook] SMARTCAR_MAT not configured');
            res.status(500).send('Webhook not configured');
            return;
        }

        // Smartcar header is lowercase in Node HTTP; accept both variants.
        const signature =
            (req.headers['sc-signature'] as string) ||
            (req.headers['SC-Signature'] as string) ||
            '';

        if (!verifySignature(req.rawBody, mat, signature)) {
            logger.warn('[SmartcarWebhook] Invalid signature — rejecting request');
            res.status(401).send('Invalid signature');
            return;
        }

        const body = req.body as any;
        const eventName: string = body?.eventName || '';
        const version: string = body?.version || 'unknown';

        logger.info(`[SmartcarWebhook] event=${eventName} version=${version}`);

        // ─── 1. Verification handshake ───
        //
        // On first save in the Smartcar dashboard, Smartcar POSTs:
        //   { version, webhookId, eventName: "verify",
        //     payload: { challenge: "<random>" } }
        //
        // We must respond with:
        //   { challenge: hex(HMAC_SHA256(challenge, MAT)) }
        if (eventName === 'verify') {
            const challenge: string = body?.payload?.challenge || '';
            if (!challenge) {
                res.status(400).send('Missing challenge');
                return;
            }
            const response = crypto
                .createHmac('sha256', mat)
                .update(challenge)
                .digest('hex');
            logger.info('[SmartcarWebhook] Verification challenge answered');
            res.status(200).json({ challenge: response });
            return;
        }

        // ─── 2. Normal data event (schedule / vehicle) ───
        try {
            const vehicles: any[] = body?.payload?.vehicles || [];

            if (vehicles.length === 0) {
                logger.info('[SmartcarWebhook] Empty payload — ack');
                res.status(200).send('OK');
                return;
            }

            const writes: Promise<any>[] = [];

            for (const v of vehicles) {
                const vehicleId: string = v?.vehicleId || v?.id;
                if (!vehicleId) continue;

                // Smartcar `userId` is our internal user ID only if we stored
                // it previously at OAuth connect time; otherwise we fall back
                // to looking up by vehicleId in smartcar_tokens.
                const smartcarUserId: string | null = v?.userId || null;

                const snapshot = extractSnapshot(v?.data || []);

                // 2a. Write latest snapshot
                writes.push(
                    db.collection('smartcar_snapshots').doc(vehicleId).set({
                        ...snapshot,
                        vehicleId,
                        smartcarUserId,
                        eventName,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true })
                );

                // 2b. Append to history
                writes.push(
                    db.collection('smartcar_history')
                        .doc(vehicleId)
                        .collection('events')
                        .add({
                            ...snapshot,
                            eventName,
                            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                        })
                );

                // 2c. If SoH dropped below a critical threshold, flag for alert
                if (typeof snapshot.stateOfHealth === 'number' && snapshot.stateOfHealth > 0 && snapshot.stateOfHealth < 75) {
                    writes.push(
                        db.collection('smartcar_alerts').add({
                            vehicleId,
                            type: 'low_soh',
                            stateOfHealth: snapshot.stateOfHealth,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            acknowledged: false,
                        })
                    );
                }
            }

            await Promise.all(writes);
            logger.info(
                `[SmartcarWebhook] Processed ${vehicles.length} vehicle(s) for event ${eventName}`
            );
            res.status(200).send('OK');
        } catch (err: any) {
            logger.error('[SmartcarWebhook] Handler failed:', err);
            // Return 200 so Smartcar doesn't retry endlessly on malformed
            // payloads — the error is already logged.
            res.status(200).send('Handled with errors');
        }
    }
);
