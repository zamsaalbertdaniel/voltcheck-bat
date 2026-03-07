/**
 * VoltCheck — Cloud Function: Stripe Webhook Handler
 * Processes payment events and triggers report pipeline
 *
 * FLOW: payment_intent.succeeded → Create report doc (status: processing)
 *       → Firestore trigger in reportPipeline.ts handles the rest
 *
 * FAIL-SAFE: Failed payments are logged, report is NOT created
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    { apiVersion: '2023-10-16' }
);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

/**
 * Handles Stripe webhook events
 */
export const handleStripeWebhook = functions.https.onRequest(
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const sig = req.headers['stripe-signature'] as string;
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                WEBHOOK_SECRET
            );
        } catch (err: any) {
            functions.logger.error('[Webhook] Signature verification failed:', err.message);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        functions.logger.info(`[Webhook] Event: ${event.type}`);

        try {
            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    await handlePaymentSuccess(paymentIntent);
                    break;
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    await handlePaymentFailure(paymentIntent);
                    break;
                }

                default:
                    functions.logger.info(`[Webhook] Unhandled: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error) {
            functions.logger.error('[Webhook] Processing error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
);

/**
 * Payment succeeded → Full report doc creation → Triggers reportPipeline
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { userId, vin, level, vehicleMake, vehicleModel, vehicleId } = paymentIntent.metadata;

    functions.logger.info(
        `[Payment ✅] User:${userId} VIN:${vin} Level:${level} Amount:${paymentIntent.amount}`
    );

    // 1. Update payment doc
    await db.collection('payments').doc(paymentIntent.id).update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        receiptUrl: paymentIntent.latest_charge
            ? `https://dashboard.stripe.com/payments/${paymentIntent.latest_charge}`
            : null,
    });

    // 2. Create complete report doc — this triggers reportPipeline via Firestore onCreate
    const parsedLevel = parseInt(level) as 1 | 2;
    const ttlDays = parsedLevel === 1 ? 30 : 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const reportId = `rpt_${Date.now()}_${userId.slice(0, 6)}`;

    await db.collection('reports').doc(reportId).set({
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
        },

        // Share tracking (empty initially)
        sharedVia: [],
    });

    functions.logger.info(`[Payment → Pipeline] Report ${reportId} created → pipeline will trigger`);
}

/**
 * Payment failed → Log and notify
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    functions.logger.warn(
        `[Payment ❌] ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`
    );

    await db.collection('payments').doc(paymentIntent.id).update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
    });

    // Do NOT create a report doc — no pipeline trigger
}
