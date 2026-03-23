import * as functions from 'firebase-functions';

export interface PipelineLoggerContext {
    reportId: string;
    userId: string;
    level: number;
    vin: string;
    paymentId?: string;
}

export function maskVin(vin: string): string {
    if (!vin || vin.length < 8) return '***';
    return `${vin.substring(0, 3)}***${vin.substring(vin.length - 4)}`;
}

/**
 * VoltCheck — Structured JSON Logger for Report Pipeline
 * 
 * Features:
 * - Emits JSON objects for easy GCP Log Explorer parsing
 * - Tracks execution time between steps (`stepDurationMs`, `elapsedMs`)
 * - Masks VIN for privacy (e.g. `WVW***3456`)
 * - FAILS SAFE: logging errors will never crash the pipeline
 */
export class PipelineLogger {
    private context: PipelineLoggerContext;
    private startTime: number;
    private lastStepTime: number;
    private previousStep: string | null = null;
    private maskedVin: string;

    constructor(context: PipelineLoggerContext) {
        this.context = { ...context };
        this.startTime = Date.now();
        this.lastStepTime = this.startTime;
        this.maskedVin = maskVin(context.vin);
    }

    /**
     * Helper to safely execute logging without throwing exceptions
     */
    private safeLog(level: 'info' | 'warn' | 'error', payload: any) {
        try {
            const entry = {
                ...payload,
                reportId: this.context.reportId,
                userId: this.context.userId,
                level: this.context.level,
                paymentId: this.context.paymentId,
            };

            // Firebase functions.logger standard output is structured JSON in GCP
            functions.logger[level](entry);
        } catch (err: any) {
            // Ultimate fallback (should practically never happen)
            functions.logger.error('[PipelineLogger] Internal logger failure', err.message);
        }
    }



    start() {
        this.safeLog('info', {
            event: 'pipeline_started',
            vinMasked: this.maskedVin,
        });
    }

    step(currentStep: string, extra: Record<string, any> = {}) {
        const now = Date.now();
        const stepDurationMs = now - this.lastStepTime;
        const elapsedMs = now - this.startTime;

        this.safeLog('info', {
            event: 'pipeline_step',
            step: currentStep,
            previousStep: this.previousStep,
            stepDurationMs,
            elapsedMs,
            ...extra,
        });

        this.lastStepTime = now;
        this.previousStep = currentStep;
    }

    complete(finalMetrics: {
        pipelineDurationMs: number;
        riskScore: number;
        riskCategory: string;
        pdfUrl?: string;
    }) {
        this.safeLog('info', {
            event: 'pipeline_completed',
            outcome: 'success',
            pdfGenerated: !!finalMetrics.pdfUrl,
            ...finalMetrics,
        });
    }

    error(step: string, error: any, extra: Record<string, any> = {}) {
        this.safeLog('warn', {
            event: 'pipeline_error',
            step,
            error: {
                message: error?.message || 'Unknown error',
                stack: error?.stack,
                code: error?.code,
            },
            ...extra,
        });
    }

    fail(step: string, error: any, extra: Record<string, any> = {}) {
        const now = Date.now();
        const elapsedMs = now - this.startTime;

        this.safeLog('error', {
            event: 'pipeline_failed',
            outcome: 'failure',
            failedAtStep: step,
            elapsedMs,
            error: {
                message: error?.message || 'Unknown error',
                stack: error?.stack,
                code: error?.code,
            },
            ...extra,
        });
    }
}
