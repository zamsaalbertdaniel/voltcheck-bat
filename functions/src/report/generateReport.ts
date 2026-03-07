/**
 * VoltCheck — Cloud Function: PDF Report Generator
 * Uses PDFKit to generate diagnostic report PDFs
 * Uploads to Firebase Storage and returns download URL
 *
 * Called internally after payment confirmation
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import PDFDocument from 'pdfkit';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

interface ReportData {
    reportId: string;
    userId: string;
    vin: string;
    level: 1 | 2;
    vehicle: {
        make: string;
        model: string;
        year: number;
        market: string;
        batteryType: string;
    };
    riskScore: number;
    riskCategory: string;
    riskFactors: Array<{
        label: string;
        severity: string;
        weight: number;
        description: string;
    }>;
    recommendation: string;
    // Level 2 data
    batteryHealth?: {
        stateOfHealth: number;
        usableCapacityKwh: number;
        nominalCapacityKwh: number;
        cycleCount: number;
        dcChargingRatio: number;
        cellBalanceStatus: string;
    };
}

/**
 * Generates a PDF report and stores it in Firebase Storage
 */
export const generateReport = functions.https.onCall(
    async (request) => {
        // Verify authentication
        if (!request.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'Authentication required'
            );
        }

        const data = request.data as ReportData;
        const userId = request.auth.uid;

        try {
            functions.logger.info(`[PDF] Generating report ${data.reportId} for ${userId}`);
            const startTime = Date.now();

            // Generate PDF buffer
            const pdfBuffer = await createPDF(data);

            // Upload to Firebase Storage
            const bucket = storage.bucket();
            const filePath = `reports/${userId}/${data.reportId}.pdf`;
            const file = bucket.file(filePath);

            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    metadata: {
                        reportId: data.reportId,
                        vin: data.vin,
                        level: data.level.toString(),
                        generatedAt: new Date().toISOString(),
                    },
                },
            });

            // Get signed download URL (valid 7 days)
            const [downloadUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            // Update report document with PDF URL
            const ttlDays = data.level === 1 ? 30 : 365;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + ttlDays);

            await db.collection('reports').doc(data.reportId).set({
                userId,
                vin: data.vin,
                level: data.level,
                status: 'completed',
                riskScore: data.riskScore,
                riskCategory: data.riskCategory,
                pdfUrl: downloadUrl,
                storagePath: filePath,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt,
                vehicle: data.vehicle,
            });

            const duration = Date.now() - startTime;
            functions.logger.info(`[PDF] Generated in ${duration}ms`);

            return {
                success: true,
                reportId: data.reportId,
                pdfUrl: downloadUrl,
                generationTimeMs: duration,
            };
        } catch (error) {
            functions.logger.error('[PDF] Generation failed:', error);
            throw new functions.https.HttpsError('internal', 'PDF generation failed');
        }
    }
);

/**
 * Creates a PDF document using PDFKit
 * Target: ~200ms generation time
 */
async function createPDF(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: `VoltCheck Report - ${data.vin}`,
                Author: 'VoltCheck',
                Subject: `Battery Health Diagnostic - VIN ${data.vin}`,
            },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // — Page 1: Header + Risk Score —

        // Dark header bar
        doc.rect(0, 0, 595, 100).fill('#0A0E17');
        doc.fontSize(28).fillColor('#00E676').text('⚡ VoltCheck', 50, 30);
        doc.fontSize(10).fillColor('#8896AB').text(
            `Raport Diagnostic Baterie EV — ${new Date().toLocaleDateString('ro-RO')}`,
            50, 65
        );

        // Level badge
        const levelText = data.level === 1 ? '🔍 Detectivul' : '🔬 Chirurgul';
        const levelPrice = data.level === 1 ? '15 RON' : '99 RON';
        doc.fontSize(12).fillColor('#00E676').text(
            `${levelText} • ${levelPrice}`,
            350, 35, { align: 'right' }
        );

        // Vehicle info section
        doc.fillColor('#1A2332').rect(50, 120, 495, 80).fill();
        doc.fontSize(18).fillColor('#F0F4F8').text(
            `${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})`,
            70, 135
        );
        doc.fontSize(11).fillColor('#8896AB').text(
            `VIN: ${data.vin}  •  Piață: ${data.vehicle.market}  •  Baterie: ${data.vehicle.batteryType}`,
            70, 165
        );

        // Risk Score circle
        const riskColor = getRiskColorHex(data.riskScore);
        doc.circle(480, 155, 30).fillAndStroke(riskColor, riskColor);
        doc.fontSize(24).fillColor('#0A0E17').text(
            data.riskScore.toString(),
            460, 142, { width: 40, align: 'center' }
        );

        // Risk category
        doc.fontSize(14).fillColor(riskColor).text(
            data.riskCategory.toUpperCase(),
            50, 220, { align: 'center' }
        );

        // Risk factors table
        doc.fontSize(14).fillColor('#F0F4F8').text(
            '🚨 Factori de Risc Detectați',
            50, 260
        );
        doc.moveTo(50, 280).lineTo(545, 280).strokeColor('#1E293B').stroke();

        let yPos = 290;
        for (const factor of data.riskFactors) {
            if (yPos > 700) { doc.addPage(); yPos = 50; }

            const sevColor = factor.severity === 'critical' ? '#FF1744'
                : factor.severity === 'high' ? '#FF6D00'
                    : factor.severity === 'medium' ? '#FFD600'
                        : '#00E676';

            doc.circle(60, yPos + 6, 4).fill(sevColor);
            doc.fontSize(11).fillColor('#F0F4F8').text(factor.label, 75, yPos);
            doc.fontSize(9).fillColor('#8896AB').text(factor.description, 75, yPos + 15, {
                width: 400,
            });
            doc.fontSize(10).fillColor(sevColor).text(
                `+${factor.weight}`, 500, yPos, { align: 'right' }
            );

            yPos += 40;
        }

        // Level 2: Battery health section
        if (data.level === 2 && data.batteryHealth) {
            yPos += 20;
            if (yPos > 600) { doc.addPage(); yPos = 50; }

            doc.fontSize(14).fillColor('#00E676').text(
                '🔋 Stare Baterie — Diagnoză Live',
                50, yPos
            );
            yPos += 25;

            const bh = data.batteryHealth;
            const metrics = [
                ['State of Health (SoH)', `${bh.stateOfHealth}%`],
                ['Capacitate Utilizabilă', `${bh.usableCapacityKwh} kWh / ${bh.nominalCapacityKwh} kWh`],
                ['Cicluri Încărcare', bh.cycleCount.toString()],
                ['Raport DC/AC', `${(bh.dcChargingRatio * 100).toFixed(0)}% DC / ${((1 - bh.dcChargingRatio) * 100).toFixed(0)}% AC`],
                ['Echilibru Celule', bh.cellBalanceStatus],
            ];

            for (const [label, value] of metrics) {
                doc.fillColor('#1A2332').rect(50, yPos, 495, 25).fill();
                doc.fontSize(10).fillColor('#8896AB').text(label, 60, yPos + 7);
                doc.fontSize(10).fillColor('#F0F4F8').text(value, 350, yPos + 7, {
                    align: 'right', width: 180,
                });
                yPos += 30;
            }
        }

        // Recommendation
        yPos += 20;
        if (yPos > 650) { doc.addPage(); yPos = 50; }

        doc.fillColor('#0D2818').rect(50, yPos, 495, 60).fill();
        doc.fontSize(12).fillColor('#00E676').text('💡 Recomandare', 70, yPos + 10);
        doc.fontSize(10).fillColor('#B2DFDB').text(data.recommendation, 70, yPos + 28, {
            width: 450,
        });

        // Footer
        const footerY = 780;
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#1E293B').stroke();
        doc.fontSize(8).fillColor('#8896AB').text(
            `VoltCheck — Diagnostic Baterie EV © ${new Date().getFullYear()} | Report ID: ${data.reportId}`,
            50, footerY + 5, { align: 'center' }
        );
        doc.text(
            'Acest raport este generat automat. Rezultatele sunt orientative și nu constituie garanție.',
            50, footerY + 15, { align: 'center' }
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
