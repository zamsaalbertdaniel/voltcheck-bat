/**
 * Jest global setup — sets env vars before any module is imported.
 * This ensures module-level `process.env` checks in Cloud Functions pass.
 */
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake_secret_for_testing_only';
