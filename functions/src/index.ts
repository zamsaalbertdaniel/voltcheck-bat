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
