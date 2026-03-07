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
import * as functions from 'firebase-functions';
import { calculateRiskScore, RiskInput } from '../utils/riskEngine';

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
    extra: Record<string, any> = {}
): Promise<void> {
    await db.collection('reports').doc(reportId).update({
        statusDetails,
        statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...extra,
    });
    functions.logger.info(`[Pipeline] ${reportId}: ${statusDetails}`);
}

// ── NHTSA helpers (inline to avoid circular deps with decodeVin) ──
const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

async function fetchNHTSADecode(vin: string): Promise<any> {
    const url = `${NHTSA_BASE}/DecodeVinValues/${vin}?format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NHTSA HTTP ${response.status}`);
    const data = await response.json();
    return data.Results?.[0] || null;
}

async function fetchNHTSARecalls(vin: string): Promise<any[]> {
    try {
        const url = `https://api.nhtsa.gov/recalls/recallsByVin?vin=${vin}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.results || []).slice(0, 10).map((r: any) => ({
            campaignNumber: r.NHTSACampaignNumber || '',
            component: r.Component || '',
            summary: r.Summary || '',
            date: r.ReportReceivedDate || '',
        }));
    } catch { return []; }
}

/**
 * Main Pipeline — triggered when a report doc is created with status 'processing'
 */
export const reportPipeline = functions
    .runWith({ timeoutSeconds: 120, memory: '512MB' })
    .firestore.document('reports/{reportId}')
    .onCreate(async (snap, context) => {
        const reportId = context.params.reportId;
        const reportData = snap.data();

        // Only process reports with 'processing' status
        if (reportData.status !== 'processing') {
            functions.logger.info(`[Pipeline] Skipping ${reportId} — status: ${reportData.status}`);
            return;
        }

        const { vin, userId, level, vehicleId, paymentId } = reportData;
        const pipelineStart = Date.now();

        functions.logger.info(
            `[Pipeline] Starting for ${reportId} — VIN:${vin} Level:${level} User:${userId}`
        );

        try {
            // ── Step 1: Decoding VIN ──
            await updateStatus(reportId, STATUS.DECODING_VIN);

            let nhtsaResult: any = null;
            let nhtsaFailed = false;

            try {
                nhtsaResult = await fetchNHTSADecode(vin);
            } catch (err: any) {
                nhtsaFailed = true;
                functions.logger.warn(`[Pipeline] NHTSA decode failed: ${err.message}`);
            }

            // ── Step 2: Search Databases ──
            await updateStatus(reportId, STATUS.SEARCHING_EU);

            let recalls: any[] = [];
            try {
                recalls = await fetchNHTSARecalls(vin);
            } catch { /* non-critical */ }

            await updateStatus(reportId, STATUS.SEARCHING_GLOBAL);

            // Check VIN cache for paid provider data
            let providerData: any = null;
            const cacheDoc = await db.collection('vin_cache').doc(vin).get();
            if (cacheDoc.exists) {
                const cached = cacheDoc.data();
                providerData = cached?.decodedData?.providers || null;
            }

            // ── FAIL-SAFE: If NHTSA failed AND no cached provider data ──
            if (nhtsaFailed && !providerData) {
                functions.logger.error(
                    `[Pipeline FAIL-SAFE] All providers failed for ${reportId}. ` +
                    `Marking as manual_review_needed. Payment NOT consumed.`
                );

                await updateStatus(reportId, STATUS.MANUAL_REVIEW, {
                    status: 'manual_review_needed',
                    failureReason: 'All VIN data providers failed. Manual review required.',
                    pipelineDurationMs: Date.now() - pipelineStart,
                });

                // Do NOT update payment as consumed — user can retry
                return;
            }

            // ── Step 3: Calculate AI Risk Score ──
            await updateStatus(reportId, STATUS.CALCULATING_RISK);

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

            // ── Step 4: Generate PDF ──
            await updateStatus(reportId, STATUS.GENERATING_PDF);

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
            });

            // ── Step 5: Upload to Storage ──
            await updateStatus(reportId, STATUS.UPLOADING);

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

            // ── Step 6: Finalize ──
            const pipelineDuration = Date.now() - pipelineStart;

            await db.collection('reports').doc(reportId).update({
                status: 'completed',
                statusDetails: STATUS.COMPLETED,
                riskScore: riskResult.score,
                riskCategory: riskResult.category,
                discrepancyAlerts: riskResult.factors
                    .filter(f => f.severity === 'critical' || f.severity === 'high')
                    .map(f => f.label),
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
                    status: 'succeeded',
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

            functions.logger.info(
                `[Pipeline] ✅ Complete for ${reportId} in ${pipelineDuration}ms — ` +
                `Risk: ${riskResult.score} (${riskResult.category})`
            );

        } catch (error: any) {
            functions.logger.error(`[Pipeline] ❌ Failed for ${reportId}:`, error);

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

// ── Inline PDF Generation ──
import PDFDocument from 'pdfkit';

interface PDFInput {
    reportId: string;
    vin: string;
    vehicle: { make: string; model: string; year: number; market: string; batteryType: string };
    level: number;
    riskScore: number;
    riskCategory: string;
    riskFactors: Array<{ id: string; label: string; severity: string; weight: number; description: string }>;
    recommendation: string;
    recalls: any[];
}

async function generatePDFBuffer(data: PDFInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: `VoltCheck Report - ${data.vin}`,
                Author: 'VoltCheck by Probabilistic AI',
                Subject: `Battery Health Diagnostic - VIN ${data.vin}`,
            },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // — Header ─
        doc.rect(0, 0, 595, 105).fill('#0A0E17');
        doc.fontSize(28).fillColor('#00E676').text('⚡ VoltCheck', 50, 25);
        doc.fontSize(9).fillColor('#64748B').text(
            'Powered by Probabilistic AI — Battery Analysis Technology',
            50, 58
        );
        doc.fontSize(10).fillColor('#8896AB').text(
            `Raport generat: ${new Date().toLocaleDateString('ro-RO')} • ID: ${data.reportId}`,
            50, 78
        );

        // Level badge
        const levelText = data.level === 1 ? '🔍 The Detective' : '🔬 The Surgeon';
        doc.fontSize(12).fillColor('#00E676').text(
            levelText, 350, 35, { align: 'right' }
        );

        // — Vehicle Info ─
        doc.fillColor('#1A2332').rect(50, 125, 495, 70).fill();
        doc.fontSize(18).fillColor('#F0F4F8').text(
            `${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})`,
            70, 138
        );
        doc.fontSize(11).fillColor('#8896AB').text(
            `VIN: ${data.vin}  •  Piață: ${data.vehicle.market}  •  Baterie: ${data.vehicle.batteryType}`,
            70, 163
        );

        // Risk Score circle
        const riskColor = getRiskColorHex(data.riskScore);
        doc.circle(480, 158, 28).fillAndStroke(riskColor, riskColor);
        doc.fontSize(22).fillColor('#0A0E17').text(
            data.riskScore.toString(),
            460, 147, { width: 40, align: 'center' }
        );

        // Risk category
        doc.fontSize(14).fillColor(riskColor).text(
            `Categoria: ${data.riskCategory}`,
            50, 215
        );

        // — Risk Factors ─
        doc.fontSize(14).fillColor('#F0F4F8').text(
            '🚨 Factori de Risc Detectați', 50, 250
        );
        doc.moveTo(50, 270).lineTo(545, 270).strokeColor('#1E293B').stroke();

        let yPos = 280;
        for (const factor of data.riskFactors) {
            if (yPos > 700) { doc.addPage(); yPos = 50; }

            const sevColor = factor.severity === 'critical' ? '#FF1744'
                : factor.severity === 'high' ? '#FF6D00'
                    : factor.severity === 'medium' ? '#FFD600'
                        : '#00E676';

            doc.circle(60, yPos + 6, 4).fill(sevColor);
            doc.fontSize(11).fillColor('#F0F4F8').text(factor.label, 75, yPos);
            doc.fontSize(9).fillColor('#8896AB').text(
                factor.description, 75, yPos + 15, { width: 400 }
            );
            doc.fontSize(10).fillColor(sevColor).text(
                `+${factor.weight}`, 500, yPos, { align: 'right' }
            );
            yPos += 40;
        }

        // — Recalls ─
        if (data.recalls.length > 0) {
            yPos += 10;
            if (yPos > 650) { doc.addPage(); yPos = 50; }
            doc.fontSize(14).fillColor('#FFD600').text(
                `⚠️ ${data.recalls.length} Recall(s) Active`, 50, yPos
            );
            yPos += 20;
            for (const recall of data.recalls.slice(0, 5)) {
                if (yPos > 720) { doc.addPage(); yPos = 50; }
                doc.fontSize(9).fillColor('#8896AB').text(
                    `• ${recall.component}: ${recall.summary}`, 60, yPos, { width: 480 }
                );
                yPos += 18;
            }
        }

        // — Recommendation ─
        yPos += 20;
        if (yPos > 650) { doc.addPage(); yPos = 50; }
        doc.fillColor('#0D2818').rect(50, yPos, 495, 60).fill();
        doc.fontSize(12).fillColor('#00E676').text('💡 Recomandare', 70, yPos + 10);
        doc.fontSize(10).fillColor('#B2DFDB').text(
            data.recommendation, 70, yPos + 28, { width: 450 }
        );

        // — Footer ─
        const footerY = 770;
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#1E293B').stroke();
        doc.fontSize(8).fillColor('#64748B').text(
            `VoltCheck — Probabilistic AI © ${new Date().getFullYear()} | ${data.reportId}`,
            50, footerY + 5, { align: 'center' }
        );
        doc.fontSize(7).fillColor('#475569').text(
            'Acest raport este generat automat. Rezultatele sunt orientative și nu constituie garanție.',
            50, footerY + 16, { align: 'center' }
        );

        doc.end();
    });
}

function getRiskColorHex(score: number): string {
    if (score <= 25) return '#00E676';
    if (score <= 50) return '#FFD600';
    if (score <= 75) return '#FF6D00';
    return '#FF1744';
}
