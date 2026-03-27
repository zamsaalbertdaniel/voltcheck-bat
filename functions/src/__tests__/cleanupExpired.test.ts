/**
 * Tests for TTL Cleanup Scheduler
 *
 * Strategy: mock firebase-functions pubsub chain so the handler function
 * is returned directly, then test it against a fully mocked Firestore.
 */

// ── Firebase mocks ────────────────────────────────────────────────────────────
const mockBatch = {
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
};

const mockCollectionRef = {
    add: jest.fn().mockResolvedValue(undefined),
};

const mockSubcollectionGet = jest.fn().mockResolvedValue({ docs: [] });

const mockDocRef = {
    collection: jest.fn().mockReturnValue({ get: mockSubcollectionGet }),
    update: jest.fn(),
};

const mockWhere2 = {
    limit: jest.fn(),
};
const mockWhere1 = {
    where: jest.fn().mockReturnValue(mockWhere2),
};
const mockCollection = {
    where: jest.fn().mockReturnValue(mockWhere1),
    add: jest.fn().mockResolvedValue(undefined),
    doc: jest.fn().mockReturnValue(mockDocRef),
};

const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
    batch: jest.fn().mockReturnValue(mockBatch),
};

const mockStorageFile = {
    delete: jest.fn().mockResolvedValue(undefined),
};
const mockBucket = {
    file: jest.fn().mockReturnValue(mockStorageFile),
};
const mockStorage = {
    bucket: jest.fn().mockReturnValue(mockBucket),
};

jest.mock('firebase-admin', () => ({
    apps: [],
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn().mockReturnValue(mockDb), {
        FieldValue: {
            serverTimestamp: jest.fn().mockReturnValue('__SERVER_TS__'),
        },
    }),
    storage: jest.fn().mockReturnValue(mockStorage),
}));

let capturedHandler: (() => Promise<void>) | null = null;

jest.mock('firebase-functions', () => ({
    pubsub: {
        schedule: jest.fn().mockReturnValue({
            timeZone: jest.fn().mockReturnValue({
                onRun: jest.fn().mockImplementation((handler: () => Promise<void>) => {
                    capturedHandler = handler;
                    return handler;
                }),
            }),
        }),
    },
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import * as functions from 'firebase-functions';

describe('cleanupExpired — TTL Scheduler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        capturedHandler = null;
    });

    it('should register the pubsub scheduler on module load', async () => {
        await import('../scheduler/cleanupExpired');
        expect(functions.pubsub.schedule).toHaveBeenCalledWith('0 3 * * *');
        expect(capturedHandler).toBeTruthy();
    });

    it('should log and return early when no expired reports found', async () => {
        mockWhere2.limit.mockReturnValueOnce({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
        });

        await import('../scheduler/cleanupExpired');
        expect(capturedHandler).toBeTruthy();

        await capturedHandler!();

        expect(functions.logger.info).toHaveBeenCalledWith(
            expect.stringContaining('No expired reports')
        );
        expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should mark and delete expired reports in two phases', async () => {
        const mockDoc = {
            id: 'rpt_001',
            ref: mockDocRef,
            data: jest.fn().mockReturnValue({
                status: 'completed',
                storagePath: 'reports/rpt_001.pdf',
                paymentId: 'pi_test_001',
            }),
        };

        mockWhere2.limit.mockReturnValueOnce({
            get: jest.fn().mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockDoc],
            }),
        });

        await import('../scheduler/cleanupExpired');
        await capturedHandler!();

        // Phase 1: should update status to 'expired'
        expect(mockBatch.update).toHaveBeenCalledWith(
            mockDocRef,
            expect.objectContaining({ status: 'expired' })
        );

        // Phase 2: should delete the report doc
        expect(mockBatch.delete).toHaveBeenCalledWith(mockDocRef);

        // Should attempt to delete storage file
        expect(mockBucket.file).toHaveBeenCalledWith('reports/rpt_001.pdf');
        expect(mockStorageFile.delete).toHaveBeenCalled();

        // Should log summary
        expect(functions.logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Deleted 1 reports')
        );
    });

    it('should handle storage delete failures gracefully', async () => {
        mockStorageFile.delete.mockRejectedValueOnce(new Error('Storage not found'));

        const mockDoc = {
            id: 'rpt_no_storage',
            ref: mockDocRef,
            data: jest.fn().mockReturnValue({
                status: 'completed',
                storagePath: 'reports/missing.pdf',
                paymentId: null,
            }),
        };

        mockWhere2.limit.mockReturnValueOnce({
            get: jest.fn().mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockDoc],
            }),
        });

        await import('../scheduler/cleanupExpired');

        // Should NOT throw — storage errors are swallowed with a warn
        await expect(capturedHandler!()).resolves.toBeUndefined();
        expect(functions.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Storage delete failed'),
            expect.any(Error)
        );
    });

    it('should skip storage deletion when storagePath is missing', async () => {
        const mockDoc = {
            id: 'rpt_no_path',
            ref: mockDocRef,
            data: jest.fn().mockReturnValue({
                status: 'completed',
                storagePath: null,
                paymentId: null,
            }),
        };

        mockWhere2.limit.mockReturnValueOnce({
            get: jest.fn().mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockDoc],
            }),
        });

        await import('../scheduler/cleanupExpired');
        await capturedHandler!();

        expect(mockBucket.file).not.toHaveBeenCalled();
    });
});
