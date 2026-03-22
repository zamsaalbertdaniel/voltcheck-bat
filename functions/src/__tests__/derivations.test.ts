import { deriveAssessmentType, deriveSourceTraceability, DerivationInput } from '../utils/reportDerivations';

describe('Report Derivations', () => {

    const getBaseInput = (): DerivationInput => ({
        hasNhtsaDecode: false,
        hasRecallsData: false,
        providerSuccessCount: 0,
        hasLiveBatterySignals: false,
    });

    describe('deriveAssessmentType', () => {
        it('should yield RISK_ASSESSMENT for pure public data', () => {
            const input = getBaseInput();
            input.hasNhtsaDecode = true;
            input.hasRecallsData = true;
            expect(deriveAssessmentType(input)).toBe('risk_assessment');
        });

        it('should yield BATTERY_ESTIMATED when partner data is present', () => {
            const input = getBaseInput();
            input.providerSuccessCount = 1; // Partner DB hit
            expect(deriveAssessmentType(input)).toBe('battery_estimated');
        });

        it('should yield BATTERY_VERIFIED when live telematics are present', () => {
            const input = getBaseInput();
            
            // Even if a partner gave info, LIVE rules above them
            input.providerSuccessCount = 2; 
            input.hasLiveBatterySignals = true;
            
            expect(deriveAssessmentType(input)).toBe('battery_verified');
        });
    });

    describe('deriveSourceTraceability', () => {
        it('should include NHTSA decode', () => {
            const input = getBaseInput();
            input.hasNhtsaDecode = true;
            const res = deriveSourceTraceability(input);
            expect(res.some(s => s.tag === 'nhtsa_decode')).toBe(true);
            expect(res.find(s => s.tag === 'nhtsa_decode')?.contribution).toBe(30);
        });

        it('should include Recalls', () => {
            const input = getBaseInput();
            input.hasRecallsData = true;
            const res = deriveSourceTraceability(input);
            expect(res.some(s => s.tag === 'nhtsa_recalls')).toBe(true);
            expect(res.find(s => s.tag === 'nhtsa_recalls')?.contribution).toBe(10);
        });

        it('should cap Provider Contribution at 50', () => {
            const input = getBaseInput();
            input.providerSuccessCount = 1;
            
            let res = deriveSourceTraceability(input);
            let prov = res.find(s => s.tag === 'provider_history');
            expect(prov?.contribution).toBe(25);

            input.providerSuccessCount = 2;
            res = deriveSourceTraceability(input);
            prov = res.find(s => s.tag === 'provider_history');
            expect(prov?.contribution).toBe(50); // 2 providers -> 50

            input.providerSuccessCount = 4;
            res = deriveSourceTraceability(input);
            prov = res.find(s => s.tag === 'provider_history');
            expect(prov?.contribution).toBe(50); // CAPPED
        });

        it('should structure all data correctly', () => {
            const input = getBaseInput();
            input.hasLiveBatterySignals = true;
            input.hasNhtsaDecode = true;
            
            const res = deriveSourceTraceability(input);
            
            expect(res).toHaveLength(2);
            
            const telematics = res.find(s => s.tag === 'live_battery_telematics');
            expect(telematics?.sourceType).toBe('live_telemetry');
            expect(telematics?.labelKey).toBe('report.sources.liveBatteryTelematics');
        });
    });

});
