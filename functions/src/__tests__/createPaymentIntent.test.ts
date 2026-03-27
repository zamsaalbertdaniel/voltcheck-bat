/**
 * Tests for createPaymentIntent Cloud Function
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ get: mockGet, set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockDb = { collection: mockCollection };

jest.mock('firebase-admin', () => ({
    apps: [{}],
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn().mockReturnValue(mockDb), {
        FieldValue: {
            serverTimestamp: jest.fn().mockReturnValue('__SERVER_TS__'),
        },
    }),
}));

const mockPaymentIntentsCreate = jest.fn();
const mockCustomersCreate = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: { create: mockPaymentIntentsCreate },
        customers: { create: mockCustomersCreate },
    }));
});

let capturedHandler: ((request: any) => Promise<any>) | null = null;

jest.mock('firebase-functions/v2/https', () => ({
    onCall: jest.fn().mockImplementation((_opts: any, handler: any) => {
        capturedHandler = handler;
        return handler;
    }),
    HttpsError: class HttpsError extends Error {
        code: string;
        details: any;
        constructor(code: string, message: string, details?: any) {
            super(message);
            this.code = code;
            this.details = details;
        }
    },
}));

jest.mock('firebase-functions', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/rateLimiter', () => ({
    checkRateLimit: jest.fn().mockResolvedValue(undefined),
    RATE_LIMITS: { payment: { maxRequests: 10, windowSeconds: 60 } },
}));

jest.mock('../utils/vinValidator', () => ({
    validateVIN: jest.fn().mockReturnValue({ valid: true }),
}));

// Import triggers module-level code that calls onCall → captures handler
import '../payment/createPaymentIntent';
import { validateVIN } from '../utils/vinValidator';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createPaymentIntent', () => {
    const handler = capturedHandler!;

    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default mock for validateVIN
        (validateVIN as jest.Mock).mockReturnValue({ valid: true });
    });

    it('should register onCall handler on module load', () => {
        expect(handler).toBeTruthy();
        expect(typeof handler).toBe('function');
    });

    it('should reject unauthenticated requests', async () => {
        await expect(handler({ auth: null, data: {} } as any))
            .rejects.toThrow('Authentication required');
    });

    it('should reject missing VIN', async () => {
        await expect(handler({
            auth: { uid: 'user1' },
            data: { level: 1 },
        } as any)).rejects.toThrow('VIN is required');
    });

    it('should reject invalid level', async () => {
        await expect(handler({
            auth: { uid: 'user1' },
            data: { level: 3, vin: 'WVWZZZE3ZWE654321' },
        } as any)).rejects.toThrow('Level must be 1 or 2');
    });

    it('should reject invalid VIN via server-side validation', async () => {
        (validateVIN as jest.Mock).mockReturnValueOnce({
            valid: false,
            error: 'VIN contains I',
            code: 'FORBIDDEN_CHARS',
        });

        await expect(handler({
            auth: { uid: 'user1' },
            data: { level: 1, vin: 'WVWZZZE3IWE654321' },
        } as any)).rejects.toThrow('VIN contains I');
    });

    it('should create a new Stripe customer if none exists', async () => {
        mockGet.mockResolvedValueOnce({ exists: false, data: () => null });
        mockCustomersCreate.mockResolvedValueOnce({ id: 'cus_new' });
        mockPaymentIntentsCreate.mockResolvedValueOnce({
            id: 'pi_test',
            client_secret: 'cs_secret',
        });

        const result = await handler({
            auth: { uid: 'user1' },
            data: { level: 1, vin: 'WVWZZZE3ZWE654321' },
        } as any);

        expect(mockCustomersCreate).toHaveBeenCalled();
        expect(result.clientSecret).toBe('cs_secret');
        expect(result.customerId).toBe('cus_new');
    });

    it('should reuse existing Stripe customer', async () => {
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ stripeCustomerId: 'cus_existing' }),
        });
        mockPaymentIntentsCreate.mockResolvedValueOnce({
            id: 'pi_test2',
            client_secret: 'cs_secret2',
        });

        const result = await handler({
            auth: { uid: 'user2' },
            data: { level: 2, vin: 'WVWZZZE3ZWE654321' },
        } as any);

        expect(mockCustomersCreate).not.toHaveBeenCalled();
        expect(result.clientSecret).toBe('cs_secret2');
        expect(result.customerId).toBe('cus_existing');
    });

    it('should create payment doc in Firestore with correct amount', async () => {
        mockGet.mockResolvedValueOnce({ exists: false, data: () => null });
        mockCustomersCreate.mockResolvedValueOnce({ id: 'cus_x' });
        mockPaymentIntentsCreate.mockResolvedValueOnce({
            id: 'pi_amount_test',
            client_secret: 'cs_x',
        });

        await handler({
            auth: { uid: 'user3' },
            data: { level: 2, vin: 'WVWZZZE3ZWE654321' },
        } as any);

        expect(mockCollection).toHaveBeenCalledWith('payments');
        expect(mockDoc).toHaveBeenCalledWith('pi_amount_test');
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 9900,
                currency: 'ron',
                level: 2,
                status: 'pending',
            })
        );
    });
});
