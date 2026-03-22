import { calculateRiskScore, RiskInput } from '../utils/riskEngine';

describe('Risk Engine (AI Core)', () => {
    
    // Default baseline for tests
    const getBaseInput = (): RiskInput => ({
        make: 'Tesla',
        model: 'Model 3',
        year: new Date().getFullYear() - 2, // 2 years old
        batteryType: 'NCA',
        nominalCapacityKwh: 75,
        market: 'US',
        mileageKm: 80000,
        accidentCount: 0,
        ownerCount: 1,
        titleStatus: 'Clean',
        mileageDiscrepancy: false,
        recallCount: 0,
        hasNhtsaDecode: false,
        hasRecallsData: false,
        providerSuccessCount: 0,
        hasLiveBatterySignals: false
    });

    describe('A. Baseline / Chemistry', () => {
        it('should score NCA_MILD_DEGRADATION_LOW_RISK', () => {
            const input = getBaseInput();
            input.dcChargingRatio = 0.3; // Low DC charging

            const result = calculateRiskScore(input);
            expect(result.score).toBeLessThan(30);
            expect(result.category).toBe('LOW');
            // Ensure no critical factors
            expect(result.factors.some(f => f.severity === 'critical')).toBe(false);
        });

        it('should prove LFP_RESILIENCE_VS_NCA_VS_NMC', () => {
            // Older vehicle to trigger degradation factor
            const olderYear = new Date().getFullYear() - 8; 
            
            const baseInput = getBaseInput();
            baseInput.year = olderYear;

            // Compute LFP
            const lfpInput = { ...baseInput, batteryType: 'LFP' };
            const lfpResult = calculateRiskScore(lfpInput);
            
            // Compute NCA
            const ncaInput = { ...baseInput, batteryType: 'NCA' };
            const ncaResult = calculateRiskScore(ncaInput);

            // Compute NMC
            const nmcInput = { ...baseInput, batteryType: 'NMC' };
            const nmcResult = calculateRiskScore(nmcInput);

            // LFP degrades at 1.2%/yr, NCA at 2.2%/yr, NMC at 2.5%/yr
            expect(lfpResult.score).toBeLessThanOrEqual(ncaResult.score);
            expect(ncaResult.score).toBeLessThanOrEqual(nmcResult.score);
        });
    });

    describe('B. Recalls / penalties', () => {
        it('should respect RECALL_CAP_IS_RESPECTED', () => {
            const input1 = getBaseInput();
            input1.recallCount = 1;
            const res1 = calculateRiskScore(input1);
            const recallFactor1 = res1.factors.find(f => f.id === 'active_recalls');
            expect(recallFactor1?.weight).toBe(5);

            const input10 = getBaseInput();
            input10.recallCount = 10;
            const res10 = calculateRiskScore(input10);
            const recallFactor10 = res10.factors.find(f => f.id === 'active_recalls');
            expect(recallFactor10?.weight).toBe(15); // capped at 15
        });

        it('should RECALLS_INCREASE_RISK_BUT_DO_NOT_OVERRIDE_TO_CRITICAL_YET', () => {
            const input = getBaseInput();
            const baselineScore = calculateRiskScore(input).score;

            input.recallCount = 5;
            const resWithRecalls = calculateRiskScore(input);

            // It increases risk
            expect(resWithRecalls.score).toBeGreaterThan(baselineScore);
            // It doesn't force it to critical purely based on recals right now (unless score jumps > 70 combined)
            expect(resWithRecalls.factors.some(f => f.id === 'active_recalls' && f.severity === 'critical')).toBe(false);
        });

        it.todo('overrides to CRITICAL when critical recall semantic exists');
    });

    describe('C. Charging abuse', () => {
        it('should flag ABUSIVE_CHARGING_HIGH_OR_CRITICAL_SIGNAL', () => {
            const input = getBaseInput();
            
            // Just above 0.6
            input.dcChargingRatio = 0.61;
            let res = calculateRiskScore(input);
            let factor = res.factors.find(f => f.id === 'dc_fast_charge_abuse');
            expect(factor).toBeDefined();
            expect(factor?.severity).toBe('medium');

            // High abuse
            input.dcChargingRatio = 0.85;
            res = calculateRiskScore(input);
            factor = res.factors.find(f => f.id === 'dc_fast_charge_abuse');
            expect(factor?.severity).toBe('high');
        });
    });

    describe('D. Core risk factors', () => {
        it('SALVAGE_OR_FLOOD_TITLE_IS_CRITICAL', () => {
            const input = getBaseInput();
            input.titleStatus = 'Salvage';
            let res = calculateRiskScore(input);
            let factor = res.factors.find(f => f.id === 'salvage_title');
            expect(factor?.weight).toBe(35);
            expect(factor?.severity).toBe('critical');

            input.titleStatus = 'Flood';
            res = calculateRiskScore(input);
            factor = res.factors.find(f => f.id === 'salvage_title');
            expect(factor?.weight).toBe(35);
            expect(factor?.severity).toBe('critical');
        });

        it('MILEAGE_DISCREPANCY_IS_CRITICAL', () => {
            const input = getBaseInput();
            input.mileageDiscrepancy = true;
            const res = calculateRiskScore(input);
            const factor = res.factors.find(f => f.id === 'mileage_rollback');
            expect(factor?.weight).toBe(30);
            expect(factor?.severity).toBe('critical');
        });

        it('MANY_ACCIDENTS_SCALE_UP_WITH_CAP', () => {
            const input = getBaseInput();
            
            // 2 accidents -> 16 weight
            input.accidentCount = 2;
            let res = calculateRiskScore(input);
            // Note: in riskEngine totalWeight for accidents = Math.min(count * 8, 25)
            // But the weight on the factor is 'accidentWeight'
            expect(res.factors.find(f => f.id === 'accident_history')?.weight).toBe(16);

            // 5 accidents -> capped at 25
            input.accidentCount = 5;
            res = calculateRiskScore(input);
            expect(res.factors.find(f => f.id === 'accident_history')?.weight).toBe(25);
        });
    });

    describe('E. Confidence / Coverage', () => {
        it('CONFIDENCE_NHTSA_ONLY', () => {
            const input = getBaseInput();
            input.hasNhtsaDecode = true;
            const res = calculateRiskScore(input);

            expect(res.confidence).toBe(30);
            expect(res.dataCoverage).toContain('nhtsa_decode');
            expect(res.confidenceBreakdown.nhtsaDecode).toBe(30);
        });

        it('CONFIDENCE_NHTSA_PLUS_RECALLS', () => {
            const input = getBaseInput();
            input.hasNhtsaDecode = true;
            input.hasRecallsData = true;
            const res = calculateRiskScore(input);

            expect(res.confidence).toBe(40);
            expect(res.dataCoverage).toContain('nhtsa_decode');
            expect(res.dataCoverage).toContain('nhtsa_recalls');
            expect(res.confidenceBreakdown.recalls).toBe(10);
        });

        it('CONFIDENCE_PROVIDER_CAP_AT_50', () => {
            const input = getBaseInput();
            
            input.providerSuccessCount = 1;
            expect(calculateRiskScore(input).confidenceBreakdown.providers).toBe(25);

            input.providerSuccessCount = 2;
            expect(calculateRiskScore(input).confidenceBreakdown.providers).toBe(50);

            input.providerSuccessCount = 5; // Capped
            expect(calculateRiskScore(input).confidenceBreakdown.providers).toBe(50);
        });

        it('CONFIDENCE_FULL_STACK_REACHES_100', () => {
            const input = getBaseInput();
            input.hasNhtsaDecode = true;
            input.hasRecallsData = true;
            input.providerSuccessCount = 2; // +50
            input.hasLiveBatterySignals = true; // +10

            const res = calculateRiskScore(input);
            expect(res.confidence).toBe(100);
            expect(res.dataCoverage.length).toBe(4);
            expect(res.dataCoverage).toContain('nhtsa_decode');
            expect(res.dataCoverage).toContain('nhtsa_recalls');
            expect(res.dataCoverage).toContain('provider_history');
            expect(res.dataCoverage).toContain('live_battery_telematics');
        });
    });
});
