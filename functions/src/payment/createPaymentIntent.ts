/**
 * InspectEV — Cloud Function: Stripe Payment Intent
 * Creates a PaymentIntent for Level 1 (15 RON) or Level 2 (99 RON)
 *
 * SECURITY: onCall (authenticated) + Rate Limited + VIN Validated
 * + idempotencyKey + duplicate payment guard
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { createHash } from 'crypto';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
import { checkRateLimit, RATE_LIMITS } from '../utils/rateLimiter';
import { validateVIN } from '../utils/vinValidator';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Stripe is initialized lazily — secrets aren't available at deploy-time analysis
let stripe: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('[FATAL] STRIPE_SECRET_KEY is not configured.');
        }
        stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
    }
    return stripe;
}

// Prices in RON (bani = smallest unit)
const PRICES: Record<number, number> = {
    1: 1500,  // 15.00 RON
    2: 9900,  // 99.00 RON
};

/**
 * Creates a Stripe PaymentIntent
 */
export const createPaymentIntent = onCall({
    region: 'europe-west1',
    memory: '256MiB',
    maxInstances: 10,
    secrets: [stripeSecretKey],
}, async (request) => {
    // Auth check
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Authentication required'
        );
    }

        const userId = request.auth.uid;

        // Rate limiting
        await checkRateLimit(userId, 'payment', RATE_LIMITS.payment);

        const { level, vin, vehicleMake, vehicleModel, vehicleId } = request.data || {};

        if (!vin) {
            throw new HttpsError('invalid-argument', 'VIN is required');
        }

        // Validate level
        if (level !== 1 && level !== 2) {
            throw new HttpsError(
                'invalid-argument',
                'Level must be 1 or 2'
            );
        }

        // Server-side VIN validation (ISO 3779)
        const vinCheck = validateVIN(vin);
        if (!vinCheck.valid) {
            throw new HttpsError(
                'invalid-argument',
                vinCheck.error || 'Invalid VIN',
                { validationCode: vinCheck.code }
            );
        }

        const cleanVin = vin.toUpperCase().trim();
        const amount = PRICES[level];

        // ── A4: Duplicate payment guard per VIN/user/level ──
        const existingPayments = await db.collection('payments')
            .where('userId', '==', userId)
            .where('vin', '==', cleanVin)
            .where('level', '==', level)
            .where('status', 'in', ['succeeded', 'pending'])
            .limit(1)
            .get();

        if (!existingPayments.empty) {
            const existing = existingPayments.docs[0].data();
            // Allow if the pending payment is older than 30 minutes (abandoned)
            if (existing.status === 'pending') {
                const createdAt = existing.createdAt?.toDate?.() || new Date(0);
                const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
                if (ageMinutes < 30) {
                    throw new HttpsError(
                        'already-exists',
                        'A payment for this VIN and level is already in progress.'
                    );
                }
            } else {
                // status === 'succeeded'
                throw new HttpsError(
                    'already-exists',
                    'You have already purchased this report level for this VIN.'
                );
            }
        }

        // TTL for payment + report
        const ttlDays = level === 1 ? 30 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);

        try {
            // Create or retrieve Stripe customer
            let customerId: string;
            const userDoc = await db.collection('users').doc(userId).get();

            if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
                customerId = userDoc.data()!.stripeCustomerId;
            } else {
                const customer = await getStripe().customers.create({
                    metadata: { firebaseUserId: userId },
                });
                customerId = customer.id;

                await db.collection('users').doc(userId).set(
                    { stripeCustomerId: customerId },
                    { merge: true }
                );
            }

            // A3: Generate idempotencyKey to prevent duplicate PaymentIntents on network retry
            const idempotencyKey = createHash('sha256')
                .update(`${userId}_${cleanVin}_${level}`)
                .digest('hex')
                .substring(0, 48);

            // Create PaymentIntent with full metadata
            const paymentIntent = await getStripe().paymentIntents.create({
                amount,
                currency: 'ron',
                customer: customerId,
                metadata: {
                    userId,
                    vin: cleanVin,
                    level: level.toString(),
                    vehicleMake: vehicleMake || '',
                    vehicleModel: vehicleModel || '',
                    vehicleId: vehicleId || '',
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            }, {
                idempotencyKey,
            });

            // Create payment record with expiry
            await db.collection('payments').doc(paymentIntent.id).set({
                userId,
                vin: cleanVin,
                level,
                vehicleId: vehicleId || null,
                amount,
                currency: 'ron',
                status: 'pending',
                stripePaymentIntentId: paymentIntent.id,
                expiresAt,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(
                `[Payment] Intent ${paymentIntent.id} — User:${userId} Level:${level} ${amount} bani`
            );

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                ephemeralKey: '',
                customerId,
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[Payment] Intent creation failed:', error);
            throw new HttpsError('internal', 'Payment setup failed. Please try again.');
        }
    }
);
