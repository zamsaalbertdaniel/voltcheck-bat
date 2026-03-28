/**
 * VoltCheck — Cloud Function: Report Pipeline Orchestrator
 *
 * Triggered by Firestore `onCreate` on reports collection
 * Orchestrates the full pipeline:
 *   1. Fetch VIN data (NHTSA + providers)
 *   2. Calculate AI Risk Score (server-side)
 *   3. Generate PDF (PDFKit)
 *   4. Upload to Firebase Storage
 *   5. Update report doc with results
 *
 * REAL-TIME STATUS: Updates `statusDetails` field progressively
 * so the client UI can show radar/progress animation.
 *
 * FAIL-SAFE: If all VIN APIs fail → status: 'manual_review_needed'
 * Payment is NOT marked as consumed.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { calculateRiskScore, RiskInput } from '../utils/riskEngine';
import { deriveAssessmentType, deriveSourceTraceability } from '../utils/reportDerivations';
import { PipelineLogger } from '../utils/pipelineLogger';
// AssessmentType and SourceTraceability used via reportDerivations

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// ── Pipeline Status Steps ──
const STATUS = {
    STARTED: 'pipeline_started',
    DECODING_VIN: 'decoding_vin',
    SEARCHING_EU: 'searching_eu_databases',
    SEARCHING_GLOBAL: 'searching_global_databases',
    CALCULATING_RISK: 'calculating_risk_score',
    GENERATING_PDF: 'generating_pdf',
    UPLOADING: 'uploading_report',
    COMPLETED: 'completed',
    FAILED: 'failed',
    MANUAL_REVIEW: 'manual_review_needed',
} as const;

/**
 * Updates the report status in real-time for UI progress tracking
 */
async function updateStatus(
    reportId: string,
    statusDetails: string,
    logger: PipelineLogger,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra: Record<string, any> = {}
): Promise<void> {
    await db.collection('reports').doc(reportId).update({
        statusDetails,
        statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extra,
    });
    
    logger.step(statusDetails, extra);
}

// ── NHTSA helpers (inline to avoid circular deps with decodeVin) ──
const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchNHTSADecode(vin: string): Promise<any> {
    const url = `${NHTSA_BASE}/DecodeVinValues/${vin}?format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NHTSA HTTP ${response.status}`);
    const data = await response.json();
    return data.Results?.[0] || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchNHTSARecalls(vin: string): Promise<{ success: boolean; recalls: any[] }> {
    try {
        const url = `https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`;
        const response = await fetch(url);
        if (!response.ok) return { success: false, recalls: [] };
        const data = await response.json();
        return {
            success: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recalls: (data.results || []).slice(0, 10).map((r: any) => ({
                campaignNumber: r.NHTSACampaignNumber || '',
                component: r.Component || '',
                summary: r.Summary || '',
                date: r.ReportReceivedDate || '',
            }))
        };
    } catch { return { success: false, recalls: [] }; }
}

/**
 * Main Pipeline — triggered when a report doc is created with status 'processing'
 */
export const reportPipeline = onDocumentCreated(
    {
        document: 'reports/{reportId}',
        region: 'europe-west1',
        timeoutSeconds: 120,
        memory: '512MiB',
    },
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const reportId = event.params.reportId;
        const reportData = snap.data();

        // Only process reports with 'processing' status
        if (reportData.status !== 'processing') {
            logger.info(`[Pipeline] Skipping ${reportId} — status: ${reportData.status}`);
            return;
        }

        const { vin, userId, level, paymentId } = reportData;
        const pipelineStart = Date.now();

        const pLog = new PipelineLogger({
            reportId,
            userId,
            level: level || 1,
            vin: vin || '',
            paymentId,
        });

        pLog.start();

        try {
            // ── Step 1: Decoding VIN ──
            await updateStatus(reportId, STATUS.DECODING_VIN, pLog);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let nhtsaResult: any = null;
            let nhtsaFailed = false;

            try {
                nhtsaResult = await fetchNHTSADecode(vin);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                nhtsaFailed = true;
                pLog.error('nhtsa_decode', err);
            }

            // ── Step 2: Search Databases ──
            await updateStatus(reportId, STATUS.SEARCHING_EU, pLog);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let recalls: any[] = [];
            let recallsQuerySucceeded = false;
            try {
                const recallResult = await fetchNHTSARecalls(vin);
                recalls = recallResult.recalls;
                recallsQuerySucceeded = recallResult.success;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                pLog.error('nhtsa_recalls', err);
            }

            await updateStatus(reportId, STATUS.SEARCHING_GLOBAL, pLog);

            // Check VIN cache for paid provider data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let providerData: any = null;
            const cacheDoc = await db.collection('vin_cache').doc(vin).get();
            if (cacheDoc.exists) {
                const cached = cacheDoc.data();
                providerData = cached?.decodedData?.providers || null;
            }

            // ── FAIL-SAFE: If NHTSA failed AND no cached provider data ──
            if (nhtsaFailed && !providerData) {
                pLog.fail(STATUS.SEARCHING_GLOBAL, new Error('All VIN data providers failed'), {
                    manualReview: true,
                    retryable: true,
                });

                await updateStatus(reportId, STATUS.MANUAL_REVIEW, pLog, {
                    status: 'manual_review_needed',
                    failureReason: 'All VIN data providers failed. Manual review required.',
                    pipelineDurationMs: Date.now() - pipelineStart,
                });

                // Do NOT update payment as consumed — user can retry
                return;
            }

            // ── Step 3: Calculate AI Risk Score ──
            await updateStatus(reportId, STATUS.CALCULATING_RISK, pLog);

            // Determine data success/coverage flags
            let providerSuccessCount = 0;
            let hasLiveBatterySignals = false;

            if (providerData && Array.isArray(providerData)) {
                // If a provider returned success or has valid data
                providerSuccessCount = providerData.filter(p => p.success !== false).length;
                hasLiveBatterySignals = providerData.some(p => p.data?.stateOfHealth !== undefined || p.data?.cellBalanceStatus !== undefined);
            }

            const vehicle = {
                make: nhtsaResult?.Make || 'Unknown',
                model: nhtsaResult?.Model || 'Unknown',
                year: parseInt(nhtsaResult?.ModelYear) || 0,
                market: detectMarketFromVIN(vin),
                batteryType: guessBatteryType(nhtsaResult?.Make),
            };

            const riskInput: RiskInput = {
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                batteryType: vehicle.batteryType,
                nominalCapacityKwh: 75, // Default, refined by Level 2
                market: vehicle.market,
                mileageKm: 0,  // From paid providers
                accidentCount: 0,
                ownerCount: 1,
                titleStatus: 'Clean',
                mileageDiscrepancy: false,
                recallCount: recalls.length,

                // Metadata for Confidence Calculation
                hasNhtsaDecode: !nhtsaFailed,
                hasRecallsData: recallsQuerySucceeded,
                providerSuccessCount,
                hasLiveBatterySignals,
            };

            // Enrich from provider data if available
            if (providerData && Array.isArray(providerData)) {
                for (const p of providerData) {
                    if (p.data?.mileageKm) riskInput.mileageKm = p.data.mileageKm;
                    if (p.data?.accidentCount) riskInput.accidentCount = p.data.accidentCount;
                    if (p.data?.ownerCount) riskInput.ownerCount = p.data.ownerCount;
                    if (p.data?.titleStatus) riskInput.titleStatus = p.data.titleStatus;
                }
            }

            const riskResult = calculateRiskScore(riskInput);

            // ── Step 4: Calculate Assessment and Traceability ──
            const derivationInput = {
                hasNhtsaDecode: !nhtsaFailed,
                hasRecallsData: recallsQuerySucceeded,
                providerSuccessCount,
                hasLiveBatterySignals,
            };

            const assessmentType = deriveAssessmentType(derivationInput);
            const sourceTraceability = deriveSourceTraceability(derivationInput);

            // ── Step 5: Generate PDF ──
            await updateStatus(reportId, STATUS.GENERATING_PDF, pLog);

            const pdfBuffer = await generatePDFBuffer({
                reportId,
                vin,
                vehicle,
                level,
                riskScore: riskResult.score,
                riskCategory: riskResult.category,
                riskFactors: riskResult.factors,
                recommendation: riskResult.recommendation,
                recalls,
                confidence: riskResult.confidence,
                assessmentType,
                sourceTraceability,
            });

            // ── Step 6: Upload to Storage ──
            await updateStatus(reportId, STATUS.UPLOADING, pLog);

            const bucket = storage.bucket();
            const filePath = `reports/${userId}/${reportId}.pdf`;
            const file = bucket.file(filePath);

            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    metadata: {
                        reportId,
                        vin,
                        level: level.toString(),
                        generatedAt: new Date().toISOString(),
                    },
                },
            });

            // Signed URL with TTL aligned to report expiry
            const ttlDays = level === 1 ? 30 : 365;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + ttlDays);

            const [downloadUrl] = await file.getSignedUrl({
                action: 'read',
                expires: expiresAt.getTime(),
            });

            // ── Step 7: Finalize ──
            const pipelineDuration = Date.now() - pipelineStart;

            const isPartial = riskResult.dataCoverage.length <= 1 || riskResult.confidence < 60;
            const finalStatus = isPartial ? 'completed_partial' : 'completed';

            await db.collection('reports').doc(reportId).update({
                status: finalStatus,
                statusDetails: STATUS.COMPLETED,
                riskScore: riskResult.score,
                riskCategory: riskResult.category,
                discrepancyAlerts: riskResult.factors
                    .filter(f => f.severity === 'critical' || f.severity === 'high')
                    .map(f => f.label),
                confidence: riskResult.confidence,
                dataCoverage: riskResult.dataCoverage,
                confidenceBreakdown: riskResult.confidenceBreakdown,
                assessmentType,
                sourceTraceability,
                pdfUrl: downloadUrl,
                storagePath: filePath,
                expiresAt,
                vehicle,
                pipelineDurationMs: pipelineDuration,
                statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Store Level 1 data subcollection
            await db.collection('reports').doc(reportId)
                .collection('level1_data').doc('analysis').set({
                    riskInput,
                    riskOutput: riskResult,
                    recalls,
                    providerData,
                    nhtsaResult,
                    analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

            // Update payment as consumed
            if (paymentId) {
                await db.collection('payments').doc(paymentId).update({
                    status: 'completed',
                    reportId,
                    expiresAt,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // Increment user's report counter
            await db.collection('users').doc(userId).update({
                totalReports: admin.firestore.FieldValue.increment(1),
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // ── Send Push Notification ──
            await sendReportReadyNotification(userId, reportId, vehicle, riskResult.score, riskResult.category);

            pLog.complete({
                pipelineDurationMs: pipelineDuration,
                riskScore: riskResult.score,
                riskCategory: riskResult.category,
                pdfUrl: downloadUrl,
            });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            pLog.fail('unknown_step', error, {
                retryable: false,
                pipelineDurationMs: Date.now() - pipelineStart,
            });

            await db.collection('reports').doc(reportId).update({
                status: 'failed',
                statusDetails: STATUS.FAILED,
                failureReason: error.message || 'Pipeline execution failed',
                pipelineDurationMs: Date.now() - pipelineStart,
                statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function detectMarketFromVIN(vin: string): 'EU' | 'US' | 'ASIA' | 'UNKNOWN' {
    const c1 = vin.charAt(0);
    if ('12345'.includes(c1)) return 'US';
    if ('JKL'.includes(c1)) return 'ASIA';
    if ('WVSTYXZ'.includes(c1)) return 'EU';
    return 'UNKNOWN';
}

function guessBatteryType(make: string | undefined): string {
    if (!make) return 'NMC';
    const m = make.toLowerCase();
    if (m.includes('tesla')) return 'NCA';
    if (m.includes('byd')) return 'LFP';
    return 'NMC'; // Most common for EU EVs
}

import { generatePDFBuffer } from './pdfGenerator';

/**
 * Sends a push notification to the user when their report is ready.
 * Fetches FCM tokens from the user doc and sends via Firebase Admin Messaging.
 * Failures are logged but never block the pipeline.
 */
async function sendReportReadyNotification(
    userId: string,
    reportId: string,
    vehicle: { make?: string; model?: string },
    riskScore: number,
    riskCategory: string,
): Promise<void> {
    try {
        const userSnap = await db.collection('users').doc(userId).get();
        const userData = userSnap.data();

        if (!userData?.fcmTokens?.length) {
            logger.info(`[FCM] No tokens for user ${userId}, skipping notification`);
            return;
        }

        if (userData.notificationsEnabled === false) {
            logger.info(`[FCM] Notifications disabled for user ${userId}`);
            return;
        }

        const vehicleName = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'vehiculul tău';

        const message: admin.messaging.MulticastMessage = {
            tokens: userData.fcmTokens,
            notification: {
                title: '⚡ Raportul tău VoltCheck este gata!',
                body: `${vehicleName} — Risk Score: ${riskScore}/100 (${riskCategory})`,
            },
            data: {
                reportId,
                type: 'report_ready',
                riskScore: String(riskScore),
                riskCategory,
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'voltcheck_reports',
                    icon: 'ic_notification',
                    color: '#00E676',
                },
            },
            apns: {
                payload: {
                    aps: {
                        badge: 1,
                        sound: 'default',
                    },
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const code = resp.error?.code;
                    if (
                        code === 'messaging/invalid-registration-token' ||
                        code === 'messaging/registration-token-not-registered'
                    ) {
                        invalidTokens.push(userData.fcmTokens[idx]);
                    }
                }
            });

            if (invalidTokens.length > 0) {
                await db.collection('users').doc(userId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
                });
                logger.info(`[FCM] Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
            }
        }

        logger.info(
            `[FCM] Sent to ${response.successCount}/${userData.fcmTokens.length} devices for report ${reportId}`
        );
    } catch (err) {
        // Never let notification failures break the pipeline
        logger.warn('[FCM] Failed to send notification:', err);
    }
}

