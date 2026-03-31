/**
 * VoltCheck — Cloud Function: Check Cloud Eligibility
 *
 * "Zero Țepe" Gate — verifies if a vehicle supports cloud-based
 * Level 2 battery diagnosis BEFORE the user pays 99 RON.
 *
 * Uses the Smartcar Compatibility API to check if the specific
 * VIN (not just the make) supports the required scopes.
 *
 * If Smartcar doesn't support the vehicle, the Level 2 button
 * is disabled in the UI, protecting the user's money.
 *
 * Cost: ~0 (metadata query, not a data pull)
 */

import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const smartcarClientId = defineSecret('SMARTCAR_CLIENT_ID');

export interface EligibilityResult {
    vin: string;
    compatible: boolean;
    reason: string;
    make?: string;
    model?: string;
    year?: number;
}

// Known EV makes that Smartcar supports (fallback if API call fails)
const SMARTCAR_SUPPORTED_MAKES = new Set([
    'TESLA', 'BMW', 'VOLKSWAGEN', 'AUDI', 'PORSCHE',
    'MERCEDES-BENZ', 'HYUNDAI', 'KIA', 'FORD', 'CHEVROLET',
    'NISSAN', 'RIVIAN', 'LUCID', 'VOLVO', 'POLESTAR',
    'MINI', 'JAGUAR', 'LAND ROVER', 'CADILLAC', 'GMC',
    'TOYOTA', 'LEXUS', 'HONDA', 'ACURA', 'SUBARU',
    'MAZDA', 'CHRYSLER', 'DODGE', 'JEEP', 'RAM',
    'LINCOLN', 'BUICK', 'GENESIS', 'INFINITI',
]);

// Minimum year for connected car support (most EVs before 2018 lack telemetry)
const MIN_SUPPORTED_YEAR = 2018;

export const checkCloudEligibility = onCall(
    {
        region: 'europe-west1',
        enforceAppCheck: false,
        secrets: [smartcarClientId],
    },
    async (request): Promise<EligibilityResult> => {
        // Auth is optional for eligibility check (can be used pre-login)
        const { vin } = request.data;

        if (!vin || typeof vin !== 'string' || vin.length !== 17) {
            throw new HttpsError('invalid-argument', 'A valid 17-character VIN is required');
        }

        const clientId = process.env.SMARTCAR_CLIENT_ID || '';

        try {
            // ── Step 1: Try Smartcar Compatibility API ──
            if (clientId) {
                const compatResult = await checkSmartcarCompatibility(vin, clientId);
                if (compatResult !== null) {
                    return compatResult;
                }
            }

            // ── Step 2: Fallback — NHTSA decode + known makes list ──
            logger.info(`[Eligibility] Smartcar API unavailable, falling back to NHTSA + known makes for VIN ${vin}`);
            return await fallbackEligibilityCheck(vin);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[Eligibility] Check failed:', error);
            // On error, fail open — don't block users unnecessarily
            // But mark as uncertain so UI can show a warning
            return {
                vin,
                compatible: false,
                reason: 'eligibility_check_failed',
            };
        }
    }
);

/**
 * Check compatibility via Smartcar API
 * Returns null if API is unavailable (triggers fallback)
 */
async function checkSmartcarCompatibility(
    vin: string,
    clientId: string
): Promise<EligibilityResult | null> {
    const url = new URL('https://api.smartcar.com/v2.0/compatibility');
    url.searchParams.set('vin', vin);
    url.searchParams.set('scope', 'read_battery read_charge read_odometer read_vehicle_info');
    url.searchParams.set('country', 'RO'); // Romania as primary market

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:`).toString('base64')}`,
            },
        });

        if (!response.ok) {
            logger.warn(`[Eligibility] Smartcar API returned ${response.status}`);
            return null; // Trigger fallback
        }

        const data = await response.json();

        logger.info(`[Eligibility] Smartcar result for ${vin}: compatible=${data.compatible}`);

        if (data.compatible) {
            return {
                vin,
                compatible: true,
                reason: 'smartcar_supported',
                make: data.make,
                model: data.model,
                year: data.year,
            };
        } else {
            return {
                vin,
                compatible: false,
                reason: data.reason || 'smartcar_not_supported',
                make: data.make,
                model: data.model,
                year: data.year,
            };
        }
    } catch (err) {
        logger.warn('[Eligibility] Smartcar API call failed:', err);
        return null; // Trigger fallback
    }
}

/**
 * Fallback: Decode VIN via NHTSA (free) and check against known makes + year
 */
async function fallbackEligibilityCheck(vin: string): Promise<EligibilityResult> {
    try {
        const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;
        const response = await fetch(nhtsaUrl);

        if (!response.ok) {
            return {
                vin,
                compatible: false,
                reason: 'nhtsa_decode_failed',
            };
        }

        const data = await response.json();
        const results = data.Results || [];

        // Extract key vehicle info
        const getValue = (variableId: number): string => {
            const item = results.find((r: { VariableId: number }) => r.VariableId === variableId);
            return item?.Value?.trim() || '';
        };

        const make = getValue(26);       // Make
        const model = getValue(28);      // Model
        const yearStr = getValue(29);    // Model Year
        const fuelType = getValue(24);   // Fuel Type - Primary
        const year = parseInt(yearStr, 10) || 0;

        // Check 1: Is it an EV?
        const isEV = fuelType.toLowerCase().includes('electric')
            || fuelType.toLowerCase().includes('battery');

        if (!isEV) {
            return {
                vin,
                compatible: false,
                reason: 'not_electric_vehicle',
                make,
                model,
                year,
            };
        }

        // Check 2: Is the make supported?
        const makeUpper = make.toUpperCase();
        const makeSupported = SMARTCAR_SUPPORTED_MAKES.has(makeUpper);

        if (!makeSupported) {
            return {
                vin,
                compatible: false,
                reason: 'make_not_supported',
                make,
                model,
                year,
            };
        }

        // Check 3: Is the year recent enough for cloud telemetry?
        if (year > 0 && year < MIN_SUPPORTED_YEAR) {
            return {
                vin,
                compatible: false,
                reason: 'year_too_old',
                make,
                model,
                year,
            };
        }

        // All checks passed with fallback
        return {
            vin,
            compatible: true,
            reason: 'fallback_compatible',
            make,
            model,
            year,
        };
    } catch (err) {
        logger.warn('[Eligibility] NHTSA fallback failed:', err);
        return {
            vin,
            compatible: false,
            reason: 'eligibility_check_failed',
        };
    }
}
