/**
 * VoltCheck — Cloud Functions Monitoring Utilities
 * Structured logging helpers for custom metrics and performance tracking
 */

import * as functions from 'firebase-functions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FunctionMetric {
    functionName: string;
    durationMs: number;
    success: boolean;
    errorCode?: string;
    metadata?: Record<string, string | number | boolean>;
}

export interface PipelineMetric {
    reportId: string;
    level: 1 | 2;
    totalDurationMs: number;
    stepDurations: Record<string, number>;
    providersUsed: number;
    success: boolean;
}

// ── Timer ─────────────────────────────────────────────────────────────────────

/**
 * Creates a simple timer for measuring execution duration.
 * Usage:
 *   const timer = startTimer();
 *   // ... do work ...
 *   const ms = timer.elapsedMs();
 */
export function startTimer(): { elapsedMs: () => number } {
    const start = Date.now();
    return {
        elapsedMs: () => Date.now() - start,
    };
}

// ── Metric Loggers ────────────────────────────────────────────────────────────

/**
 * Logs a Cloud Function execution metric as a structured JSON event.
 * These can be queried via Cloud Logging / Log-based Metrics in GCP.
 */
export function logFunctionMetric(metric: FunctionMetric): void {
    try {
        if (metric.success) {
            functions.logger.info({
                event: 'function_execution',
                ...metric,
            });
        } else {
            functions.logger.warn({
                event: 'function_execution_failed',
                ...metric,
            });
        }
    } catch {
        // Monitoring must never crash the main function
    }
}

/**
 * Logs a full pipeline execution metric (report generation).
 * Includes per-step durations for performance analysis.
 */
export function logPipelineMetric(metric: PipelineMetric): void {
    try {
        const level = metric.success ? functions.logger.info : functions.logger.warn;
        level({
            event: 'pipeline_execution',
            ...metric,
        });
    } catch {
        // Monitoring must never crash the main function
    }
}

/**
 * Wraps an async function and automatically logs execution time + success/failure.
 *
 * Usage:
 *   const result = await withMetrics('createPaymentIntent', userId, async () => {
 *       return await stripe.paymentIntents.create(...);
 *   });
 */
export async function withMetrics<T>(
    functionName: string,
    metadata: Record<string, string | number | boolean> = {},
    fn: () => Promise<T>
): Promise<T> {
    const timer = startTimer();
    try {
        const result = await fn();
        logFunctionMetric({
            functionName,
            durationMs: timer.elapsedMs(),
            success: true,
            metadata,
        });
        return result;
    } catch (err: any) {
        logFunctionMetric({
            functionName,
            durationMs: timer.elapsedMs(),
            success: false,
            errorCode: err.code || err.errorInfo?.code || 'unknown',
            metadata,
        });
        throw err;
    }
}
