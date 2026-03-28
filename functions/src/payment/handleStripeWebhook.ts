/**
 * VoltCheck — Cloud Function: Stripe Webhook Handler
 * Processes payment events and triggers report pipeline
 *
 * FLOW: payment_intent.succeeded → Create report doc (status: processing)
 *       → Firestore trigger in reportPipeline.ts handles the rest
 *
 * FAIL-SAFE: Failed payments are logged, report is NOT created
 *
 * IDEMPOTENCY (Pas 3):
 *   - Pre-check: skip if payment already completed
 *   - Transaction: atomic payment update + report creation
 *   - Re-check inside transaction for race conditions
 *   - Tracks stripeEventId + processedAt for debugging
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
import { maskVin } from '../utils/pipelineLogger';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Lazy initialization — secrets aren't available at deploy-time analysis
let stripe: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('[FATAL] STRIPE_SECRET_KEY is not configured.');
        stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
    return stripe;
}
function getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('[FATAL] STRIPE_WEBHOOK_SECRET is not configured.');
    return secret;
}

/**
 * Handles Stripe webhook events
 */
export const handleStripeWebhook = onRequest(
    { region: 'europe-west1', secrets: [stripeSecretKey, stripeWebhookSecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const sig = req.headers['stripe-signature'] as string;
        let event: Stripe.Event;

        try {
            event = getStripe().webhooks.constructEvent(
                req.rawBody,
                sig,
                getWebhookSecret()
            );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            logger.error('[Webhook] Signature verification failed:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        logger.info(`[Webhook] Event: ${event.type} (id: ${event.id})`);

        try {
            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    await handlePaymentSuccess(paymentIntent, event.id);
                    break;
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    await handlePaymentFailure(paymentIntent);
                    break;
                }

                default:
                    logger.info(`[Webhook] Unhandled: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error) {
            logger.error('[Webhook] Processing error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
);

/**
 * Payment succeeded → Idempotent report creation via Firestore transaction
 *
 * Protection layers:
 *   1. Pre-check: read payment doc, skip if already completed (fast path)
 *   2. Transaction re-check: prevents race conditions from concurrent webhooks
 *   3. Atomic write: payment update + report creation in single transaction
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent, stripeEventId: string) {
    const { userId, vin, level, vehicleMake, vehicleModel, vehicleYear, vehicleId } = paymentIntent.metadata;
    const paymentRef = db.collection('payments').doc(paymentIntent.id);

    // ── Layer 1: Pre-check (fast path, avoids transaction overhead) ──
    const existingPayment = await paymentRef.get();
    if (existingPayment.exists && existingPayment.data()?.status === 'completed') {
        logger.warn(
            `[Webhook] Idempotent skip — ${paymentIntent.id} already completed ` +
            `(event: ${stripeEventId})`
        );
        return;
    }

    logger.info(
        `[Payment ✅] User:${userId} VIN:${maskVin(vin)} Level:${level} Amount:${paymentIntent.amount}`
    );

    const parsedLevel = parseInt(level) as 1 | 2;
    const ttlDays = parsedLevel === 1 ? 30 : 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const reportId = `rpt_${Date.now()}_${userId.slice(0, 6)}`;

    // ── Layer 2 & 3: Atomic transaction with race condition re-check ──
    await db.runTransaction(async (tx) => {
        // Re-check inside transaction (handles concurrent webhook deliveries)
        const freshPayment = await tx.get(paymentRef);
        if (freshPayment.exists && freshPayment.data()?.status === 'completed') {
            logger.warn(
                `[Webhook] Idempotent skip (in-tx) — ${paymentIntent.id} ` +
                `(event: ${stripeEventId})`
            );
            return;
        }

        // Update payment doc → completed + reportId + event tracking
        tx.update(paymentRef, {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            reportId,
            stripeEventId,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            receiptUrl: paymentIntent.latest_charge
                ? `https://dashboard.stripe.com/payments/${paymentIntent.latest_charge}`
                : null,
        });

        // Create report doc — triggers reportPipeline via Firestore onCreate
        const reportRef = db.collection('reports').doc(reportId);
        tx.set(reportRef, {
            // Core
            userId,
            vin,
            level: parsedLevel,
            vehicleId: vehicleId || null,

            // Status — triggers reportPipeline.ts
            status: 'processing',
            statusDetails: 'payment_confirmed',

            // Payment link
            paymentId: paymentIntent.id,

            // TTL
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),

            // Vehicle context (from payment metadata)
            vehicleMeta: {
                make: vehicleMake || null,
                model: vehicleModel || null,
                year: vehicleYear ? parseInt(vehicleYear) : null,
            },

            // Share tracking (empty initially)
            sharedVia: [],
        });
    });

    logger.info(
        `[Payment → Pipeline] Report ${reportId} created (atomic) → pipeline will trigger ` +
        `(event: ${stripeEventId})`
    );
}

/**
 * Payment failed → Log and notify
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    logger.warn(
        `[Payment ❌] ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`
    );

    await db.collection('payments').doc(paymentIntent.id).update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
    });

    // Do NOT create a report doc — no pipeline trigger
}
