/**
 * Tests for reportPipeline Cloud Function
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockSubSet = jest.fn().mockResolvedValue(undefined);
const mockSubDoc = jest.fn().mockReturnValue({ set: mockSubSet });
const mockSubCollection = jest.fn().mockReturnValue({ doc: mockSubDoc });

const mockDocRef = {
    update: mockUpdate,
    collection: mockSubCollection,
};
const mockCacheGet = jest.fn().mockResolvedValue({ exists: false });
const mockCacheDoc = jest.fn().mockReturnValue({ get: mockCacheGet });

const mockDoc = jest.fn().mockReturnValue(mockDocRef);
const mockCollection = jest.fn().mockImplementation((name: string) => {
    if (name === 'vin_cache') {
        return { doc: mockCacheDoc };
    }
    return { doc: mockDoc };
});
const mockDb = { collection: mockCollection };

const mockFileSave = jest.fn().mockResolvedValue(undefined);
const mockGetSignedUrl = jest.fn().mockResolvedValue(['https://storage.example.com/report.pdf']);
const mockFile = jest.fn().mockReturnValue({ save: mockFileSave, getSignedUrl: mockGetSignedUrl });
const mockBucket = jest.fn().mockReturnValue({ file: mockFile });
const mockStorage = { bucket: mockBucket };

jest.mock('firebase-admin', () => ({
    apps: [{}],
    initializeApp: jest.fn(),
    firestore: Object.assign(jest.fn().mockReturnValue(mockDb), {
        FieldValue: {
            serverTimestamp: jest.fn().mockReturnValue('__SERVER_TS__'),
            increment: jest.fn().mockReturnValue('__INCREMENT__'),
        },
    }),
    storage: jest.fn().mockReturnValue(mockStorage),
}));

let capturedOnCreate: ((snap: any, context: any) => Promise<void>) | null = null;

jest.mock('firebase-functions', () => ({
    runWith: jest.fn().mockReturnValue({
        firestore: {
            document: jest.fn().mockReturnValue({
                onCreate: jest.fn().mockImplementation((handler: any) => {
                    capturedOnCreate = handler;
                    return handler;
                }),
            }),
        },
    }),
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../utils/riskEngine', () => ({
    calculateRiskScore: jest.fn().mockReturnValue({
        score: 35,
        category: 'Low',
        confidence: 72,
        recommendation: 'Vehicle appears to be in good condition.',
        factors: [
            { id: 'f1', label: 'No recalls', severity: 'low', weight: 0.1, description: 'Clean recall history' },
        ],
        dataCoverage: ['nhtsa_decode', 'nhtsa_recalls'],
        confidenceBreakdown: { nhtsaDecode: 25, recalls: 15, providers: 0, battery: 0 },
    }),
}));

jest.mock('../utils/reportDerivations', () => ({
    deriveAssessmentType: jest.fn().mockReturnValue('STANDARD'),
    deriveSourceTraceability: jest.fn().mockReturnValue([
        { source: 'NHTSA', status: 'success', dataPoints: 5 },
    ]),
}));

jest.mock('../utils/pipelineLogger', () => ({
    PipelineLogger: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        step: jest.fn(),
        error: jest.fn(),
        fail: jest.fn(),
        complete: jest.fn(),
    })),
    maskVin: jest.fn((vin: string) => `${vin.slice(0, 3)}***`),
}));

jest.mock('../report/pdfGenerator', () => ({
    generatePDFBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
}));

// Mock global fetch for NHTSA calls
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Import triggers module-level code
import '../report/reportPipeline';
import { calculateRiskScore } from '../utils/riskEngine';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('reportPipeline', () => {
    const handler = capturedOnCreate!;

    beforeEach(() => {
        jest.clearAllMocks();

        // Restore default risk engine mock
        (calculateRiskScore as jest.Mock).mockReturnValue({
            score: 35,
            category: 'Low',
            confidence: 72,
            recommendation: 'Vehicle appears to be in good condition.',
            factors: [
                { id: 'f1', label: 'No recalls', severity: 'low', weight: 0.1, description: 'Clean recall history' },
            ],
            dataCoverage: ['nhtsa_decode', 'nhtsa_recalls'],
            confidenceBreakdown: { nhtsaDecode: 25, recalls: 15, providers: 0, battery: 0 },
        });

        // Default: NHTSA succeeds
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('DecodeVinValues')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        Results: [{
                            Make: 'Volkswagen',
                            Model: 'ID.4',
                            ModelYear: '2023',
                        }],
                    }),
                });
            }
            if (url.includes('recallsByVin')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ results: [] }),
                });
            }
            return Promise.reject(new Error(`Unexpected fetch: ${url}`));
        });

        // Default: VIN cache miss
        mockCacheGet.mockResolvedValue({ exists: false });
    });

    function makeSnap(data: Record<string, any>) {
        return { data: () => data };
    }

    it('should register Firestore onCreate handler', () => {
        expect(handler).toBeTruthy();
        expect(typeof handler).toBe('function');
    });

    it('should skip reports not in processing status', async () => {
        await handler(
            makeSnap({ status: 'completed', vin: 'X', userId: 'u1' }),
            { params: { reportId: 'rpt_skip' } }
        );

        // Should not call NHTSA or update report
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should run full pipeline for a valid report', async () => {
        await handler(
            makeSnap({
                status: 'processing',
                vin: 'WVWZZZE3ZWE654321',
                userId: 'user1',
                level: 1,
                vehicleId: 'v1',
                paymentId: 'pi_test',
            }),
            { params: { reportId: 'rpt_full' } }
        );

        // Should have called NHTSA decode
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('DecodeVinValues/WVWZZZE3ZWE654321')
        );

        // Should have generated PDF
        const { generatePDFBuffer } = require('../report/pdfGenerator');
        expect(generatePDFBuffer).toHaveBeenCalledWith(
            expect.objectContaining({
                vin: 'WVWZZZE3ZWE654321',
                level: 1,
                riskScore: 35,
            })
        );

        // Should have uploaded to Storage
        expect(mockFileSave).toHaveBeenCalled();

        // Should have finalized report
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                riskScore: 35,
                riskCategory: 'Low',
            })
        );
    });

    it('should go to manual_review when NHTSA fails and no cache', async () => {
        mockFetch.mockImplementation((url: string) => {
            if (url.includes('DecodeVinValues')) {
                return Promise.reject(new Error('NHTSA down'));
            }
            if (url.includes('recallsByVin')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ results: [] }),
                });
            }
            return Promise.reject(new Error('Unexpected'));
        });

        await handler(
            makeSnap({
                status: 'processing',
                vin: 'WVWZZZE3ZWE654321',
                userId: 'user2',
                level: 1,
                paymentId: 'pi_fail',
            }),
            { params: { reportId: 'rpt_manual' } }
        );

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'manual_review_needed',
            })
        );
    });

    it('should handle pipeline errors gracefully', async () => {
        (calculateRiskScore as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Risk engine crash');
        });

        await handler(
            makeSnap({
                status: 'processing',
                vin: 'WVWZZZE3ZWE654321',
                userId: 'user3',
                level: 1,
                paymentId: 'pi_err',
            }),
            { params: { reportId: 'rpt_error' } }
        );

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'failed',
                failureReason: expect.stringContaining('Risk engine crash'),
            })
        );
    });
});
