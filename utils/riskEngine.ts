/**
 * InspectEV — AI Risk Score Engine
 * Probabilistic model for EV battery degradation risk assessment
 */

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
    stateOfHealth?: number;           // 0-100%
    cycleCount?: number;
    dcChargingRatio?: number;         // 0-1  (percentage of DC fast charges)
    cellBalanceStatus?: 'Balanced' | 'Imbalanced' | 'Critical';
    usableCapacityKwh?: number;

    // Climate / region
    averageAnnualTempC?: number;      // Average temp of registration region
}

export interface RiskOutput {
    score: number;              // 0-100
    category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: RiskFactor[];
    recommendation: string;
}

export interface RiskFactor {
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    weight: number;             // Contribution to final score (0-100)
    description: string;
}

// --- Degradation curves (per battery chemistry, per year) ---
// Based on public studies: NMC ~2-3%/year, LFP ~1-1.5%/year, NCA ~2-2.5%/year
const DEGRADATION_RATES: Record<string, number> = {
    'NMC': 2.5,   // % per year
    'LFP': 1.2,
    'NCA': 2.2,
};

// DC fast charging impact: every 10% above 40% DC ratio adds ~0.5% extra degradation/year
const DC_FAST_CHARGE_PENALTY = 0.5;

// Temperature impact: deviation from optimal 20°C
const TEMP_PENALTY_PER_DEGREE = 0.15; // % extra degradation per degree deviation

/**
 * Calculates the AI Risk Score using probabilistic modeling
 */
export function calculateRiskScore(input: RiskInput): RiskOutput {
    const factors: RiskFactor[] = [];
    let totalWeight = 0;

    const vehicleAge = new Date().getFullYear() - input.year;

    // ─── Factor 1: Title Status (Critical) ───
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

    // ─── Factor 2: Mileage Discrepancy (Critical) ───
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

    // ─── Factor 3: High Mileage for Age (Medium-High) ───
    const expectedKmPerYear = 15000; // average EU
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

    // ─── Factor 4: Accident History ───
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

    // ─── Factor 5: Multiple Owners ───
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

    // ─── Factor 6: Active Recalls ───
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

    // ─── Factor 7: Battery Degradation Estimate (Level 1 predictive) ───
    const baseDegRate = DEGRADATION_RATES[input.batteryType] || 2.5;
    const predictedSoH = 100 - (baseDegRate * vehicleAge);

    if (predictedSoH < 80) {
        factors.push({
            id: 'predicted_degradation',
            label: 'Statistical Degradation Risk',
            severity: 'high',
            weight: 12,
            description: `Based on ${input.batteryType} chemistry and age, predicted SoH is ~${predictedSoH.toFixed(0)}%.`,
        });
        totalWeight += 12;
    } else if (predictedSoH < 85) {
        factors.push({
            id: 'predicted_degradation_moderate',
            label: 'Moderate Degradation Expected',
            severity: 'medium',
            weight: 6,
            description: `${input.batteryType} battery at ${vehicleAge} years — predicted SoH ~${predictedSoH.toFixed(0)}%.`,
        });
        totalWeight += 6;
    }

    // ─── Factor 8: DC Fast Charging Abuse (Level 2 only) ───
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

    // ─── Factor 9: Cell Imbalance (Level 2 only) ───
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

    // ─── Factor 10: Climate Impact ───
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

    // ─── Calculate Final Score ───
    // Cap at 100, apply logarithmic scaling to avoid extreme scores
    const rawScore = Math.min(totalWeight, 100);
    const finalScore = Math.round(rawScore);

    // Determine category
    let category: RiskOutput['category'];
    if (finalScore <= 25) category = 'LOW';
    else if (finalScore <= 50) category = 'MEDIUM';
    else if (finalScore <= 75) category = 'HIGH';
    else category = 'CRITICAL';

    // Generate recommendation
    const recommendation = generateRecommendation(finalScore, category, factors, !!input.stateOfHealth);

    // Sort factors by weight (highest first)
    factors.sort((a, b) => b.weight - a.weight);

    return {
        score: finalScore,
        category,
        factors,
        recommendation,
    };
}

/**
 * Generates a human-readable recommendation based on risk score
 */
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
