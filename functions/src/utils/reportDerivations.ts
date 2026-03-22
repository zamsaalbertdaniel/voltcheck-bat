import { AssessmentType, SourceTraceability } from '../../../types/firestore';

export interface DerivationInput {
    hasNhtsaDecode: boolean;
    hasRecallsData: boolean;
    providerSuccessCount: number;
    hasLiveBatterySignals: boolean;
}

export function deriveAssessmentType(input: DerivationInput): AssessmentType {
    if (input.hasLiveBatterySignals) {
        return 'battery_verified';
    } 
    if (input.providerSuccessCount > 0) {
        return 'battery_estimated';
    }
    return 'risk_assessment';
}

export function deriveSourceTraceability(input: DerivationInput): SourceTraceability[] {
    const sources: SourceTraceability[] = [];
    
    if (input.hasNhtsaDecode) {
        sources.push({ tag: 'nhtsa_decode', labelKey: 'report.sources.nhtsaDecode', contribution: 30, sourceType: 'official_public_data' });
    }
    if (input.hasRecallsData) {
        sources.push({ tag: 'nhtsa_recalls', labelKey: 'report.sources.nhtsaRecalls', contribution: 10, sourceType: 'official_public_data' });
    }
    if (input.providerSuccessCount > 0) {
        const pContrib = Math.min(input.providerSuccessCount * 25, 50);
        sources.push({ tag: 'provider_history', labelKey: 'report.sources.providerHistory', contribution: pContrib, sourceType: 'partner_database' });
    }
    if (input.hasLiveBatterySignals) {
        sources.push({ tag: 'live_battery_telematics', labelKey: 'report.sources.liveBatteryTelematics', contribution: 10, sourceType: 'live_telemetry' });
    }
    
    return sources;
}
