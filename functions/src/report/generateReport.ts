/**
 * VoltCheck — Cloud Function: PDF Report Generator
 * Uses PDFKit to generate diagnostic report PDFs
 * Uploads to Firebase Storage and returns download URL
 *
 * Called internally after payment confirmation
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { generatePDFBuffer } from './pdfGenerator';

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
export const generateReport = onCall({
    region: 'europe-west1',
    memory: '512MiB',
    maxInstances: 5,
}, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Authentication required'
        );
    }

        const data = request.data as ReportData;
        const userId = request.auth.uid;

        try {
            logger.info(`[PDF] Generating report ${data.reportId} for ${userId}`);
            const startTime = Date.now();

            // Generate PDF buffer
            const pdfBuffer = await generatePDFBuffer({
                ...data,
                recalls: [],
            });

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
            logger.info(`[PDF] Generated in ${duration}ms`);

            return {
                success: true,
                reportId: data.reportId,
                pdfUrl: downloadUrl,
                generationTimeMs: duration,
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            logger.error('[PDF] Generation failed:', error);
            throw new HttpsError('internal', error.message || 'PDF generation failed');
        }
    }
);

