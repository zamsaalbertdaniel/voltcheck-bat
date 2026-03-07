/**
 * VoltCheck — Server-side VIN Validator
 * Strict ISO 3779 validation for Cloud Functions
 * Mirrors the client-side validation from types/firestore.ts
 */

/**
 * Validates a VIN string with strict rules:
 * - Exactly 17 characters
 * - Only alphanumeric (A-Z, 0-9)
 * - No I, O, Q (per ISO 3779)
 * - No special characters or whitespace
 */
export function validateVIN(vin: string): { valid: boolean; error?: string } {
    if (!vin || typeof vin !== 'string') {
        return { valid: false, error: 'VIN is required' };
    }

    const trimmed = vin.trim().toUpperCase();

    if (trimmed.length !== 17) {
        return { valid: false, error: `VIN must be exactly 17 characters (got ${trimmed.length})` };
    }

    if (/[^A-Z0-9]/.test(trimmed)) {
        return { valid: false, error: 'VIN must contain only letters and numbers' };
    }

    if (/[IOQ]/.test(trimmed)) {
        return { valid: false, error: 'VIN cannot contain letters I, O, or Q (ISO 3779)' };
    }

    return { valid: true };
}

/**
 * Sanitizes and normalizes VIN input
 */
export function sanitizeVIN(input: string): string {
    return input.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}
