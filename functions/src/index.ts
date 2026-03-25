/**
 * VoltCheck — Cloud Functions Entry Point
 * Exports all Cloud Functions for Firebase deployment
 *
 * FAZA 2 — Full pipeline with:
 *   - VIN Decode (authenticated, rate-limited, waterfall providers)
 *   - Report Pipeline (Firestore trigger → VIN → Risk → PDF → Storage)
 *   - Payment (Stripe intents + webhooks)
 *   - Share (WhatsApp OG metadata)
 *   - Scheduler (TTL cleanup)
 */

// ── Startup Secrets Validation ──
import * as functions from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-west1' });

// Critical secrets — functions MUST NOT start without these
const CRITICAL_SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

for (const secret of CRITICAL_SECRETS) {
    if (!process.env[secret]) {
        throw new Error(`[FATAL] Missing critical secret: ${secret}. Deploy will not proceed.`);
    }
}

// Optional provider secrets — features degrade gracefully without these
const OPTIONAL_SECRETS = ['CARVERTICAL_API_KEY', 'AUTODNA_API_KEY', 'EPICVIN_API_KEY'];

for (const secret of OPTIONAL_SECRETS) {
    if (!process.env[secret]) {
        functions.logger.warn(`[Startup] Missing optional secret: ${secret} — provider will be skipped.`);
    }
}

// ── VIN Router ──
export { decodeVin } from './vin/decodeVin';

// ── Report Pipeline + PDF Generator ──
export { generateReport } from './report/generateReport';
export { reportPipeline } from './report/reportPipeline';

// ── Payment ──
export { createPaymentIntent } from './payment/createPaymentIntent';
export { handleStripeWebhook } from './payment/handleStripeWebhook';

// ── Share ──
export { shareReport } from './share/reportShare';

// ── Scheduler ──
export { cleanupExpiredReports } from './scheduler/cleanupExpired';

// ── Health Check ──
export { healthCheck } from './health/healthCheck';
