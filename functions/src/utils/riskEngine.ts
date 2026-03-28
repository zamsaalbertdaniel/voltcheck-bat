/**
 * VoltCheck — Server-side AI Risk Score Engine
 * Probabilistic model for EV battery degradation risk assessment
 * RUNS ON CLOUD FUNCTIONS — not exposed to client manipulation
 *
 * Mirrors the logic from client utils/riskEngine.ts but is the
 * authoritative source of truth for scoring.
 */

import { DataCoverageTag, ConfidenceBreakdown } from '../types/firestore';

export interface RiskInput {
    // Vehicle data
    make: string;
    model: string;
    year: number;
    batteryType: 'NMC' | 'LFP' | 'NCA' | string;
    nominalCapacityKwh: number;
    market: 'EU' | 'US' | 'ASIA' | 'UNKNOWN';

    // Level 1 data (VIN History)
    mileageKm: number;
    accidentCount: number;
    ownerCount: number;
    titleStatus: 'Clean' | 'Salvage' | 'Rebuilt' | 'Flood' | string;
    mileageDiscrepancy: boolean;
    recallCount: number;

    // Level 2 data (optional — Smartcar/Enode)
    stateOfHealth?: number;
    cycleCount?: number;
    dcChargingRatio?: number;
    cellBalanceStatus?: 'Balanced' | 'Imbalanced' | 'Critical';
    usableCapacityKwh?: number;

    // Climate / region
    averageAnnualTempC?: number;

    // Metadata for Confidence Calculation
    hasNhtsaDecode: boolean;
    hasRecallsData: boolean;
    providerSuccessCount: number;
    hasLiveBatterySignals: boolean;
}

export interface RiskOutput {
    score: number;
    category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: RiskFactor[];
    recommendation: string;
    confidence: number;
    dataCoverage: DataCoverageTag[];
    confidenceBreakdown: ConfidenceBreakdown;
}

export interface RiskFactor {
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    weight: number;
    description: string;
}

/**
 * Non-linear battery degradation model
 *
 * Uses exponential decay: SoH = 100 × e^(-λ × age)
 * where λ (lambda) is the chemistry-specific decay constant.
 *
 * This is more realistic than linear because:
 *   - Early years show minimal degradation (calendar aging plateau)
 *   - Degradation accelerates after ~5-7 years (knee point)
 *   - Temperature extremes multiply the decay rate
 *
 * Lambda values calibrated from industry studies:
 *   NMC: λ = 0.028 → ~87% SoH at 5y, ~76% at 10y
 *   LFP: λ = 0.014 → ~93% SoH at 5y, ~87% at 10y (most durable)
 *   NCA: λ = 0.025 → ~88% SoH at 5y, ~78% at 10y
 */
const DEGRADATION_LAMBDA: Record<string, number> = {
    'NMC': 0.028,
    'LFP': 0.014,
    'NCA': 0.025,
};

/**
 * Temperature multiplier for degradation.
 * Optimal battery temp is ~20°C. Extreme heat/cold accelerate aging.
 *   < 5°C or > 35°C → 1.3× faster degradation
 *   < -5°C or > 40°C → 1.6× faster degradation
 */
function temperatureMultiplier(avgTempC?: number): number {
    if (avgTempC === undefined) return 1.0;
    const deviation = Math.abs(avgTempC - 20);
    if (deviation > 25) return 1.6;  // Extreme (< -5°C or > 45°C)
    if (deviation > 15) return 1.3;  // Significant (< 5°C or > 35°C)
    if (deviation > 10) return 1.1;  // Mild
    return 1.0;                       // Optimal range
}

/**
 * Predicts State-of-Health using exponential decay.
 * SoH = 100 × e^(-λ × tempMultiplier × age)
 */
function predictSoH(batteryType: string, vehicleAge: number, avgTempC?: number): number {
    const lambda = DEGRADATION_LAMBDA[batteryType] || 0.028;
    const tempMult = temperatureMultiplier(avgTempC);
    return 100 * Math.exp(-lambda * tempMult * vehicleAge);
}

/**
 * Calculates the AI Risk Score (server-side authoritative)
 */
export function calculateRiskScore(input: RiskInput): RiskOutput {
    const factors: RiskFactor[] = [];
    let totalWeight = 0;
    const vehicleAge = new Date().getFullYear() - input.year;

    // --- Confidence Calculation ---
    let confidence = 0;
    const dataCoverage: DataCoverageTag[] = [];
    const confidenceBreakdown: ConfidenceBreakdown = {
        nhtsaDecode: 0,
        providers: 0,
        recalls: 0,
        liveBattery: 0
    };

    if (input.hasNhtsaDecode) {
        confidence += 30;
        confidenceBreakdown.nhtsaDecode = 30;
        dataCoverage.push('nhtsa_decode');
    }

    if (input.hasRecallsData) {
        confidence += 10;
        confidenceBreakdown.recalls = 10;
        dataCoverage.push('nhtsa_recalls');
    }

    if (input.providerSuccessCount > 0) {
        const provConf = Math.min(input.providerSuccessCount * 25, 50);
        confidence += provConf;
        confidenceBreakdown.providers = provConf;
        dataCoverage.push('provider_history');
    }

    if (input.hasLiveBatterySignals) {
        confidence += 10;
        confidenceBreakdown.liveBattery = 10;
        dataCoverage.push('live_battery_telematics');
    }
    // ------------------------------

    // Factor 1: Title Status
    if (input.titleStatus === 'Salvage' || input.titleStatus === 'Flood') {
        factors.push({
            id: 'salvage_title',
            label: input.titleStatus === 'Flood' ? 'Flood Damage Title' : 'Salvage Title',
            severity: 'critical',
            weight: 35,
            description: `Vehicle has a ${input.titleStatus} title — declared total loss or flood damage.`,
        });
        totalWeight += 35;
    } else if (input.titleStatus === 'Rebuilt') {
        factors.push({
            id: 'rebuilt_title',
            label: 'Rebuilt Title',
            severity: 'high',
            weight: 20,
            description: 'Vehicle was rebuilt after being declared a total loss.',
        });
        totalWeight += 20;
    }

    // Factor 2: Mileage Discrepancy
    if (input.mileageDiscrepancy) {
        factors.push({
            id: 'mileage_rollback',
            label: 'Mileage Discrepancy Detected',
            severity: 'critical',
            weight: 30,
            description: 'Cross-referenced mileage records show inconsistencies — possible odometer tampering.',
        });
        totalWeight += 30;
    }

    // Factor 3: High Mileage for Age
    const expectedKmPerYear = 15000;
    const expectedKm = vehicleAge * expectedKmPerYear;
    const mileageRatio = input.mileageKm / Math.max(expectedKm, 1);

    if (mileageRatio > 2.0) {
        factors.push({
            id: 'high_mileage',
            label: 'Extremely High Mileage',
            severity: 'high',
            weight: 15,
            description: `${input.mileageKm.toLocaleString()} km is ${(mileageRatio * 100).toFixed(0)}% of expected for vehicle age.`,
        });
        totalWeight += 15;
    } else if (mileageRatio > 1.5) {
        factors.push({
            id: 'above_average_mileage',
            label: 'Above Average Mileage',
            severity: 'medium',
            weight: 8,
            description: `${input.mileageKm.toLocaleString()} km is above average for ${vehicleAge}-year-old EV.`,
        });
        totalWeight += 8;
    }

    // Factor 4: Accident History
    if (input.accidentCount > 0) {
        const accidentWeight = Math.min(input.accidentCount * 8, 25);
        factors.push({
            id: 'accident_history',
            label: `${input.accidentCount} Accident(s) Recorded`,
            severity: input.accidentCount >= 3 ? 'high' : 'medium',
            weight: accidentWeight,
            description: `Vehicle has ${input.accidentCount} recorded accident(s) — potential structural or HV battery damage.`,
        });
        totalWeight += accidentWeight;
    }

    // Factor 5: Multiple Owners
    if (input.ownerCount > 3) {
        factors.push({
            id: 'many_owners',
            label: `${input.ownerCount} Previous Owners`,
            severity: 'medium',
            weight: 5,
            description: 'Multiple ownership changes may indicate undisclosed issues.',
        });
        totalWeight += 5;
    }

    // Factor 6: Active Recalls
    if (input.recallCount > 0) {
        factors.push({
            id: 'active_recalls',
            label: `${input.recallCount} Active Recall(s)`,
            severity: input.recallCount >= 2 ? 'high' : 'medium',
            weight: Math.min(input.recallCount * 5, 15),
            description: `Vehicle has ${input.recallCount} unresolved manufacturer recall(s).`,
        });
        totalWeight += Math.min(input.recallCount * 5, 15);
    }

    // Factor 7: Battery Degradation Estimate (non-linear exponential model)
    const predictedSoH = predictSoH(input.batteryType, vehicleAge, input.averageAnnualTempC);

    if (predictedSoH < 70) {
        factors.push({
            id: 'predicted_degradation',
            label: 'Severe Statistical Degradation',
            severity: 'critical',
            weight: 20,
            description: `Exponential model predicts ~${predictedSoH.toFixed(0)}% SoH for ${input.batteryType} at ${vehicleAge} years — replacement likely needed.`,
        });
        totalWeight += 20;
    } else if (predictedSoH < 80) {
        factors.push({
            id: 'predicted_degradation',
            label: 'Statistical Degradation Risk',
            severity: 'high',
            weight: 12,
            description: `Exponential model predicts ~${predictedSoH.toFixed(0)}% SoH for ${input.batteryType} at ${vehicleAge} years.`,
        });
        totalWeight += 12;
    } else if (predictedSoH < 88) {
        factors.push({
            id: 'predicted_degradation_moderate',
            label: 'Moderate Degradation Expected',
            severity: 'medium',
            weight: 6,
            description: `${input.batteryType} battery at ${vehicleAge} years — predicted SoH ~${predictedSoH.toFixed(0)}%.`,
        });
        totalWeight += 6;
    }

    // Factor 8: DC Fast Charging Abuse (Level 2 only)
    if (input.dcChargingRatio !== undefined && input.dcChargingRatio > 0.6) {
        const dcWeight = Math.round((input.dcChargingRatio - 0.4) * 30);
        factors.push({
            id: 'dc_fast_charge_abuse',
            label: 'High DC Fast Charging Usage',
            severity: input.dcChargingRatio > 0.8 ? 'high' : 'medium',
            weight: dcWeight,
            description: `${(input.dcChargingRatio * 100).toFixed(0)}% of charges were DC fast — accelerates battery degradation.`,
        });
        totalWeight += dcWeight;
    }

    // Factor 9: Cell Imbalance (Level 2 only)
    if (input.cellBalanceStatus === 'Imbalanced') {
        factors.push({
            id: 'cell_imbalance',
            label: 'Battery Cell Imbalance',
            severity: 'high',
            weight: 15,
            description: 'Cell voltage imbalance detected — one or more cells are degrading faster.',
        });
        totalWeight += 15;
    } else if (input.cellBalanceStatus === 'Critical') {
        factors.push({
            id: 'cell_critical',
            label: 'Critical Cell Imbalance',
            severity: 'critical',
            weight: 25,
            description: 'Critical cell voltage divergence — battery module replacement may be needed.',
        });
        totalWeight += 25;
    }

    // Factor 10: Climate Impact
    if (input.averageAnnualTempC !== undefined) {
        const tempDeviation = Math.abs(input.averageAnnualTempC - 20);
        if (tempDeviation > 15) {
            factors.push({
                id: 'climate_extreme',
                label: 'Extreme Climate Exposure',
                severity: 'medium',
                weight: 8,
                description: `Average regional temperature (${input.averageAnnualTempC}°C) deviates significantly from optimal.`,
            });
            totalWeight += 8;
        }
    }

    // Calculate Final Score
    const rawScore = Math.min(totalWeight, 100);
    const finalScore = Math.round(rawScore);

    let category: RiskOutput['category'];
    if (finalScore <= 25) category = 'LOW';
    else if (finalScore <= 50) category = 'MEDIUM';
    else if (finalScore <= 75) category = 'HIGH';
    else category = 'CRITICAL';

    const recommendation = generateRecommendation(finalScore, category, factors, !!input.stateOfHealth);

    factors.sort((a, b) => b.weight - a.weight);

    return { 
        score: finalScore, 
        category, 
        factors, 
        recommendation, 
        confidence, 
        dataCoverage, 
        confidenceBreakdown 
    };
}

function generateRecommendation(
    score: number,
    category: string,
    factors: RiskFactor[],
    hasLevel2: boolean
): string {
    const hasCritical = factors.some(f => f.severity === 'critical');

    if (hasCritical) {
        return 'ATENȚIE: Au fost detectate riscuri CRITICE. Recomandăm OPRIȚI negocierile până la o inspecție fizică profesionistă.';
    }
    if (category === 'HIGH') {
        if (!hasLevel2) {
            return 'Riscuri semnificative detectate. Recomandăm puternic o scanare Nivel 2 (The Surgeon) pentru certitudine chimică a bateriei.';
        }
        return 'Riscuri semnificative confirmate. Recomandăm negocierea unui preț redus sau solicitarea garanției bateriei.';
    }
    if (category === 'MEDIUM') {
        if (!hasLevel2) {
            return 'Riscuri moderate detectate. O scanare Nivel 2 (The Surgeon) ar oferi claritate asupra stării reale a bateriei.';
        }
        return 'Stare acceptabilă cu observații. Verificați condițiile de garanție și istoricul service.';
    }
    return 'Profil de risc scăzut. Vehiculul pare într-o stare bună bazat pe datele disponibile.';
}
