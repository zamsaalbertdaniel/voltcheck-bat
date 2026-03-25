/**
 * VoltCheck — Shared PDF Generator
 * Single source of truth for PDF generation (Level 1 & Level 2 reports).
 *
 * Used by:
 *   - generateReport.ts  (onCall — manual invocation)
 *   - reportPipeline.ts  (Firestore trigger — automatic pipeline)
 */

import PDFDocument from 'pdfkit';
import { AssessmentType, SourceTraceability } from '../types/firestore';

export interface PDFInput {
    reportId: string;
    vin: string;
    vehicle: {
        make: string;
        model: string;
        year: number;
        market: string;
        batteryType: string;
    };
    level: number;
    riskScore: number;
    riskCategory: string;
    riskFactors: Array<{
        id?: string;
        label: string;
        severity: string;
        weight: number;
        description: string;
    }>;
    recommendation: string;
    // Pipeline-supplied (optional)
    recalls?: any[];
    confidence?: number;
    assessmentType?: AssessmentType;
    sourceTraceability?: SourceTraceability[];
    // Level 2 battery data (optional)
    batteryHealth?: {
        stateOfHealth: number;
        usableCapacityKwh: number;
        nominalCapacityKwh: number;
        cycleCount: number;
        dcChargingRatio: number;
        cellBalanceStatus: string;
    };
}

const RO_TRANSLATIONS: Record<string, string> = {
    'report.sources.nhtsaDecode': 'Decodare Publică',
    'report.sources.nhtsaRecalls': 'Registrul Rechemări',
    'report.sources.providerHistory': 'Istoric Parteneri',
    'report.sources.liveBatteryTelematics': 'Telemetrie Live',
    'official_public_data': 'Oficial',
    'partner_database': 'Partener',
    'live_telemetry': 'Live',
    'battery_verified': 'Baterie Verificată',
    'battery_estimated': 'Estimare Statistică',
    'risk_assessment': 'Evaluare Istoric',
};

export function getRiskColorHex(score: number): string {
    if (score <= 25) return '#00E676';
    if (score <= 50) return '#FFD600';
    if (score <= 75) return '#FF6D00';
    return '#FF1744';
}

/**
 * Generates a PDF buffer from report data.
 * Renders: header, vehicle info, risk score, risk factors,
 * optional recalls, optional battery health (Level 2),
 * optional source traceability, recommendation, footer.
 */
export function generatePDFBuffer(data: PDFInput): Promise<Buffer> {
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

        // ── Header ──
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

        const levelText = data.level === 1 ? '🔍 The Detective' : '🔬 The Surgeon';
        doc.fontSize(12).fillColor('#00E676').text(levelText, 350, 35, { align: 'right' });

        // ── Vehicle Info ──
        doc.fillColor('#1A2332').rect(50, 125, 495, 70).fill();
        doc.fontSize(18).fillColor('#F0F4F8').text(
            `${data.vehicle.make} ${data.vehicle.model} (${data.vehicle.year})`,
            70, 138
        );
        doc.fontSize(11).fillColor('#8896AB').text(
            `VIN: ${data.vin}  •  Piață: ${data.vehicle.market}  •  Baterie: ${data.vehicle.batteryType}`,
            70, 163
        );

        // Risk score circle
        const riskColor = getRiskColorHex(data.riskScore);
        doc.circle(480, 158, 28).fillAndStroke(riskColor, riskColor);
        doc.fontSize(22).fillColor('#0A0E17').text(
            data.riskScore.toString(),
            460, 147, { width: 40, align: 'center' }
        );

        doc.fontSize(14).fillColor(riskColor).text(
            `Categoria: ${data.riskCategory}`,
            50, 215
        );

        // ── Risk Factors ──
        doc.fontSize(14).fillColor('#F0F4F8').text('🚨 Factori de Risc Detectați', 50, 250);
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

        // ── Recalls (pipeline) ──
        if (data.recalls && data.recalls.length > 0) {
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

        // ── Battery Health (Level 2) ──
        if (data.level === 2 && data.batteryHealth) {
            yPos += 20;
            if (yPos > 600) { doc.addPage(); yPos = 50; }

            doc.fontSize(14).fillColor('#00E676').text(
                '🔋 Stare Baterie — Diagnoză Live', 50, yPos
            );
            yPos += 25;

            const bh = data.batteryHealth;
            const metrics: [string, string][] = [
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

        // ── Recommendation ──
        yPos += 20;
        if (yPos > 650) { doc.addPage(); yPos = 50; }
        doc.fillColor('#0D2818').rect(50, yPos, 495, 60).fill();
        doc.fontSize(12).fillColor('#00E676').text('💡 Recomandare', 70, yPos + 10);
        doc.fontSize(10).fillColor('#B2DFDB').text(data.recommendation, 70, yPos + 28, {
            width: 450,
        });

        // ── Source Traceability (pipeline) ──
        if (data.sourceTraceability && data.sourceTraceability.length > 0 && data.assessmentType) {
            yPos += 70;
            if (yPos > 650) { doc.addPage(); yPos = 50; }
            doc.fillColor('#1A2332').rect(50, yPos, 495, 80).fill();
            doc.fontSize(12).fillColor('#00E676').text('Traceabilitate Date & Surse', 70, yPos + 10);

            const aLabel = RO_TRANSLATIONS[data.assessmentType] || data.assessmentType;
            doc.fontSize(10).fillColor('#F0F4F8').text(`Tip Evaluare: ${aLabel}`, 70, yPos + 30);
            if (data.confidence !== undefined) {
                doc.text(`Încredere Date (Completitudine): ${data.confidence}/100`, 70, yPos + 45);
            }

            const sourceNames = data.sourceTraceability.map((s) => {
                const srcLabel = RO_TRANSLATIONS[s.labelKey] || s.tag;
                const typeLabel = RO_TRANSLATIONS[s.sourceType] || s.sourceType;
                return `${srcLabel} (${typeLabel})`;
            }).join(' • ');

            doc.fontSize(8).fillColor('#8896AB').text(
                `Surse confirmate: ${sourceNames}`, 70, yPos + 60, { width: 450 }
            );
        }

        // ── Footer ──
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
