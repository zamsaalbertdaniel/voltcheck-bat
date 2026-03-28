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
import { logger } from 'firebase-functions/v2';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-west1' });

// ── Secrets Validation ──
// NOTE: Secrets are NOT available at deploy-time (Firebase analyzes exports
// by loading the module *before* injecting secrets). We validate at runtime
// instead — each function that needs a secret checks on first invocation.
//
// This helper is exported so individual functions can call it.
const CRITICAL_SECRETS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const OPTIONAL_SECRETS = ['CARVERTICAL_API_KEY', 'AUTODNA_API_KEY', 'EPICVIN_API_KEY'];

/**
 * Call at the start of any function that requires critical secrets.
 * Throws HttpsError so the caller gets a clear message.
 */
export function assertCriticalSecrets(): void {
    for (const secret of CRITICAL_SECRETS) {
        if (!process.env[secret]) {
            throw new Error(`[FATAL] Missing critical secret: ${secret}. Function cannot execute.`);
        }
    }
}

// Log optional secret warnings (only at runtime, not during deploy analysis)
if (process.env.K_SERVICE || process.env.FUNCTIONS_EMULATOR) {
    for (const secret of OPTIONAL_SECRETS) {
        if (!process.env[secret]) {
            logger.warn(`[Startup] Missing optional secret: ${secret} — provider will be skipped.`);
        }
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

// ── Smartcar (Level 2 — OAuth + Battery Data) ──
export { smartcarExchange, smartcarBatteryData, smartcarDisconnect } from './smartcar/smartcarExchange';
