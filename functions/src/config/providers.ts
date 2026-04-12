/**
 * InspectEV — Provider URL Configuration
 *
 * All external API endpoints are defined here so they can be
 * overridden via environment variables (useful for staging/testing).
 *
 * Pattern: env var > fallback default
 */

export const PROVIDER_URLS = {
    // ── NHTSA (free, public) ──
    nhtsaDecode: process.env.NHTSA_DECODE_URL
        || 'https://vpic.nhtsa.dot.gov/api/vehicles',

    nhtsaRecalls: process.env.NHTSA_RECALLS_URL
        || 'https://api.nhtsa.gov/recalls/recallsByVin',

    nhtsaComplaints: process.env.NHTSA_COMPLAINTS_URL
        || 'https://api.nhtsa.gov/complaints/complaintsByVehicle',

    // ── Paid providers ──
    carVertical: process.env.CARVERTICAL_API_URL
        || 'https://api.carvertical.com/v1/reports',

    autoDna: process.env.AUTODNA_API_URL
        || 'https://api.autodna.com/v1/vin',

    epicVin: process.env.EPICVIN_API_URL
        || 'https://api.epicvin.com/v1/vehicle-history',
} as const;

/** Provider timeout in milliseconds */
export const PROVIDER_TIMEOUT_MS = parseInt(process.env.PROVIDER_TIMEOUT_MS || '8000', 10);

/** Total pipeline timeout in milliseconds */
export const TOTAL_TIMEOUT_MS = parseInt(process.env.TOTAL_TIMEOUT_MS || '20000', 10);

/** VIN cache TTL in milliseconds (default 24h) */
export const CACHE_TTL_MS = parseInt(process.env.VIN_CACHE_TTL_MS || '86400000', 10);
