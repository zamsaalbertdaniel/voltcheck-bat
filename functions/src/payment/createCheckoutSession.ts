/**
 * InspectEV — Cloud Function: Stripe Checkout Session
 * Creates a Stripe Checkout Session for Web payments
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

export const createCheckoutSession = onCall({
    region: 'europe-west1',
    memory: '256MiB',
    maxInstances: 10,
    secrets: [stripeSecretKey],
}, async (request) => {
    // Auth check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;
    await checkRateLimit(userId, 'payment', RATE_LIMITS.payment);

    const { level, vin, vehicleMake, vehicleModel, vehicleId, returnUrl } = request.data || {};

    if (!vin) throw new HttpsError('invalid-argument', 'VIN is required');
    if (!returnUrl) throw new HttpsError('invalid-argument', 'returnUrl is required');
    if (level !== 1 && level !== 2) throw new HttpsError('invalid-argument', 'Level must be 1 or 2');

    const vinCheck = validateVIN(vin);
    if (!vinCheck.valid) {
        throw new HttpsError('invalid-argument', vinCheck.error || 'Invalid VIN', { validationCode: vinCheck.code });
    }

    const cleanVin = vin.toUpperCase().trim();
    const amount = PRICES[level];

    // Duplicate guard logic...
    const existingPayments = await db.collection('payments')
        .where('userId', '==', userId)
        .where('vin', '==', cleanVin)
        .where('level', '==', level)
        .where('status', 'in', ['succeeded', 'pending'])
        .limit(1)
        .get();

    if (!existingPayments.empty) {
        const existing = existingPayments.docs[0].data();
        if (existing.status === 'pending') {
            const createdAt = existing.createdAt?.toDate?.() || new Date(0);
            const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
            if (ageMinutes < 30) {
                throw new HttpsError('already-exists', 'A payment for this VIN and level is already in progress.');
            }
        } else {
            throw new HttpsError('already-exists', 'You have already purchased this report level for this VIN.');
        }
    }

    try {
        let customerId: string;
        const userDoc = await db.collection('users').doc(userId).get();

        if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
            customerId = userDoc.data()!.stripeCustomerId;
        } else {
            const customer = await getStripe().customers.create({
                metadata: { firebaseUserId: userId },
            });
            customerId = customer.id;
            await db.collection('users').doc(userId).set({ stripeCustomerId: customerId }, { merge: true });
        }

        const idempotencyKey = createHash('sha256')
            .update(`cs_${userId}_${cleanVin}_${level}`)
            .digest('hex')
            .substring(0, 48);

        const metadata = {
            userId,
            vin: cleanVin,
            level: level.toString(),
            vehicleMake: vehicleMake || '',
            vehicleModel: vehicleModel || '',
            vehicleId: vehicleId || '',
        };

        const session = await getStripe().checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'ron',
                    product_data: {
                        name: `InspectEV - Raport Nivel ${level}`,
                        description: `Raport complet pentru ${vehicleMake || 'vehicul'} ${vehicleModel || ''} (${cleanVin})`,
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: returnUrl,
            payment_intent_data: { metadata }, // IMPORTANT: This triggers payment_intent.succeeded with metadata!
            metadata,
        }, { idempotencyKey });

        const ttlDays = level === 1 ? 30 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);

        // Keep track in payments collection using the payment_intent string if available,
        // or just track the session ID. To be safe, we track the session id as the document.
        await db.collection('payments').doc(session.id).set({
            userId,
            vin: cleanVin,
            level,
            vehicleId: vehicleId || null,
            amount,
            currency: 'ron',
            status: 'pending',
            stripeSessionId: session.id,
            expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`[Checkout] Session ${session.id} created — User:${userId} Level:${level}`);

        return {
            url: session.url,
            sessionId: session.id,
        };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof HttpsError) throw error;
        logger.error('[Checkout] Session creation failed:', error);
        throw new HttpsError('internal', 'Checkout setup failed. Please try again.');
    }
});
