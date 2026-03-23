import { PipelineLogger, maskVin } from '../utils/pipelineLogger';
import * as functions from 'firebase-functions';

// Mock the firebase-functions logger to intercept output
jest.mock('firebase-functions', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

describe('PipelineLogger (Observability & Privacy)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Use fake timers to test step timing predictably
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const mockContext = {
        reportId: 'rep_123',
        userId: 'usr_456',
        level: 2,
        vin: 'WVWZZZ123ABCDEF'
    };

    it('should VIN_MASKING_MATCHES_REAL_CONTRACT', () => {
        const masked = maskVin(mockContext.vin);
        expect(masked).toBe('WVW***CDEF');
    });

    it('should LOGGER_START_EMITS_STRUCTURED_JSON', () => {
        const logger = new PipelineLogger(mockContext);
        logger.start();

        // Check if `functions.logger.info` was called precisely
        expect(functions.logger.info).toHaveBeenCalledTimes(1);
        
        const loggedPayload = (functions.logger.info as jest.Mock).mock.calls[0][0];

        expect(loggedPayload).toMatchObject({
            event: 'pipeline_started',
            vinMasked: 'WVW***CDEF',
            reportId: 'rep_123',
            userId: 'usr_456',
            level: 2,
            // paymentId is undefined in our context, that's fine
        });
    });

    it('should LOGGER_STEP_TRACKS_TIMING', () => {
        const logger = new PipelineLogger(mockContext);
        
        // Start Pipeline
        logger.start(); 
        expect(functions.logger.info).toHaveBeenCalledTimes(1);

        // Advance 1500 MS
        jest.advanceTimersByTime(1500);

        logger.step('DECODE_VIN');
        expect(functions.logger.info).toHaveBeenCalledTimes(2);
        
        const firstStepPayload = (functions.logger.info as jest.Mock).mock.calls[1][0];
        expect(firstStepPayload.event).toBe('pipeline_step');
        expect(firstStepPayload.step).toBe('DECODE_VIN');
        expect(firstStepPayload.previousStep).toBeNull();
        expect(firstStepPayload.stepDurationMs).toBe(1500);
        expect(firstStepPayload.elapsedMs).toBe(1500);

        // Advance another 3000 MS
        jest.advanceTimersByTime(3000);

        logger.step('FETCH_RECALLS');
        expect(functions.logger.info).toHaveBeenCalledTimes(3);

        const secondStepPayload = (functions.logger.info as jest.Mock).mock.calls[2][0];
        expect(secondStepPayload.event).toBe('pipeline_step');
        expect(secondStepPayload.step).toBe('FETCH_RECALLS');
        expect(secondStepPayload.previousStep).toBe('DECODE_VIN');
        expect(secondStepPayload.stepDurationMs).toBe(3000);
        expect(secondStepPayload.elapsedMs).toBe(4500); // Total time
    });

    it('should LOGGER_FAIL_SAFE_DOES_NOT_THROW', () => {
        // Force the internal logger to throw
        (functions.logger.info as jest.Mock).mockImplementationOnce(() => {
            throw new Error('GCP Logging Error: Resource Exhausted');
        });

        const logger = new PipelineLogger(mockContext);
        
        // Calling start() uses .info which we just rigged to throw
        // This should not bubble up and crash the process!
        expect(() => {
            logger.start();
        }).not.toThrow();

        // The fallback error logger should have caught it
        expect(functions.logger.error).toHaveBeenCalledTimes(1);
        const fallbackCall = (functions.logger.error as jest.Mock).mock.calls[0];
        expect(fallbackCall[0]).toBe('[PipelineLogger] Internal logger failure');
        expect(fallbackCall[1]).toContain('GCP Logging Error');
    });

});
