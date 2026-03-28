/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for handleStripeWebhook Cloud Function
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockTxGet = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxSet = jest.fn();

const mockGet = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDocRef = { get: mockGet, update: mockUpdate };
const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

const mockRunTransaction = jest.fn().mockImplementation(async (cb: any) => {
    return cb({
        get: mockTxGet,
        update: mockTxUpdate,
        set: mockTxSet,
    });
});

const mockDb = {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
};

jest.mock('firebase-admin', () => ({
    apps: [{}],
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn().mockReturnValue(mockDb), {
        FieldValue: {
            serverTimestamp: jest.fn().mockReturnValue('__SERVER_TS__'),
            increment: jest.fn().mockReturnValue('__INCREMENT__'),
        },
    }),
}));

const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        webhooks: { constructEvent: mockConstructEvent },
    }));
});

let capturedHandler: ((req: any, res: any) => Promise<void>) | null = null;

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

jest.mock('firebase-functions/v2', () => ({
    logger: mockLogger,
}));

jest.mock('firebase-functions/v2/https', () => ({
    onRequest: jest.fn().mockImplementation((_opts: any, handler: any) => {
        capturedHandler = handler;
        return handler;
    }),
}));

jest.mock('../utils/pipelineLogger', () => ({
    maskVin: jest.fn((vin: string) => `${vin.slice(0, 3)}***`),
}));

// Import triggers module-level code
import '../payment/handleStripeWebhook';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('handleStripeWebhook', () => {
    const handler = capturedHandler!;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should register onRequest handler on module load', () => {
        expect(handler).toBeTruthy();
    });

    it('should reject non-POST requests', async () => {
        const res = mockRes();
        await handler({ method: 'GET' } as any, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should reject invalid signature', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const res = mockRes();
        await handler({
            method: 'POST',
            headers: { 'stripe-signature': 'bad_sig' },
            rawBody: 'payload',
        } as any, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Invalid signature'));
    });

    it('should handle payment_intent.succeeded and create report', async () => {
        const fakeEvent = {
            id: 'evt_123',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_success',
                    amount: 1500,
                    metadata: {
                        userId: 'u1',
                        vin: 'WVWZZZE3ZWE654321',
                        level: '1',
                        vehicleMake: 'VW',
                        vehicleModel: 'ID.4',
                        vehicleYear: '2023',
                        vehicleId: 'v1',
                    },
                    latest_charge: 'ch_123',
                },
            },
        };

        mockConstructEvent.mockReturnValue(fakeEvent);

        // Pre-check: payment not yet completed
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ status: 'pending' }),
        });

        // Transaction re-check
        mockTxGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ status: 'pending' }),
        });

        const res = mockRes();
        await handler({
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            rawBody: 'payload',
        } as any, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
        expect(mockRunTransaction).toHaveBeenCalled();
        expect(mockTxUpdate).toHaveBeenCalled();
        expect(mockTxSet).toHaveBeenCalled();
    });

    it('should skip already-completed payments (idempotent)', async () => {
        const fakeEvent = {
            id: 'evt_dup',
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_already_done',
                    amount: 1500,
                    metadata: {
                        userId: 'u2',
                        vin: 'WVWZZZE3ZWE654321',
                        level: '1',
                    },
                },
            },
        };

        mockConstructEvent.mockReturnValue(fakeEvent);

        // Pre-check: already completed → skip
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({ status: 'completed' }),
        });

        const res = mockRes();
        await handler({
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            rawBody: 'payload',
        } as any, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
        expect(mockRunTransaction).not.toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed', async () => {
        const fakeEvent = {
            id: 'evt_fail',
            type: 'payment_intent.payment_failed',
            data: {
                object: {
                    id: 'pi_failed',
                    last_payment_error: { message: 'Card declined' },
                },
            },
        };

        mockConstructEvent.mockReturnValue(fakeEvent);

        const res = mockRes();
        await handler({
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            rawBody: 'payload',
        } as any, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'failed',
                failureReason: 'Card declined',
            })
        );
    });

    it('should acknowledge unhandled event types', async () => {
        mockConstructEvent.mockReturnValue({
            id: 'evt_other',
            type: 'charge.refunded',
            data: { object: {} },
        });

        const res = mockRes();
        await handler({
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            rawBody: 'payload',
        } as any, res);

        expect(res.json).toHaveBeenCalledWith({ received: true });
    });
});
