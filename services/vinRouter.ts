/**
 * VoltCheck — Global VIN Router Service
 * Waterfall/parallel logic for querying multiple VIN history providers
 * Based on market detection (EU / US / ASIA)
 */

import { decodeVIN, VINDecodeResult } from '../utils/vinDecoder';

export interface VINRouterResult {
    vin: string;
    decoded: VINDecodeResult;
    providers: ProviderResult[];
    aggregated: AggregatedHistory;
    discrepancies: Discrepancy[];
    hasDiscrepancy: boolean;
}

export interface ProviderResult {
    provider: string;
    market: string;
    status: 'success' | 'error' | 'timeout' | 'not_applicable';
    data: any;
    responseTimeMs: number;
}

export interface AggregatedHistory {
    titleStatus: 'Clean' | 'Salvage' | 'Rebuilt' | 'Flood';
    mileageKm: number;
    accidentCount: number;
    ownerCount: number;
    recallCount: number;
    mileageRecords: { date: string; km: number; source: string }[];
    accidents: { date: string; severity: string; source: string }[];
    recalls: { id: string; description: string; status: string }[];
}

export interface Discrepancy {
    type: 'mileage' | 'accident' | 'title' | 'ownership';
    severity: 'warning' | 'critical';
    description: string;
    sources: string[];
}

/**
 * Routes VIN queries to the appropriate providers based on market
 * Uses Promise.allSettled for parallel execution
 */
export async function routeVINQuery(vin: string): Promise<VINRouterResult> {
    const decoded = decodeVIN(vin);

    if (!decoded.isValid) {
        throw new Error(`Invalid VIN: ${vin}`);
    }

    // Determine which providers to query based on market
    const providerCalls = getProvidersForMarket(decoded.market);

    // Execute all providers in parallel
    const startTime = Date.now();
    const results = await Promise.allSettled(
        providerCalls.map(provider => executeProvider(provider, vin, decoded.market))
    );

    // Aggregate results
    const providerResults: ProviderResult[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            provider: providerCalls[index],
            market: decoded.market,
            status: 'error' as const,
            data: { error: (result.reason as Error)?.message },
            responseTimeMs: Date.now() - startTime,
        };
    });

    // Aggregate data from all successful providers
    const aggregated = aggregateProviderData(providerResults);

    // Check for discrepancies
    const discrepancies = detectDiscrepancies(providerResults, aggregated);

    return {
        vin,
        decoded,
        providers: providerResults,
        aggregated,
        discrepancies,
        hasDiscrepancy: discrepancies.length > 0,
    };
}

/**
 * Returns provider names based on detected market
 */
function getProvidersForMarket(market: string): string[] {
    switch (market) {
        case 'EU':
            return ['carVertical', 'autoDNA', 'nhtsa_recalls'];
        case 'US':
            return ['nmvtis_epicvin', 'carVertical', 'nhtsa_recalls'];
        case 'ASIA':
            return ['carVertical', 'nhtsa_recalls'];
        default:
            return ['carVertical', 'nhtsa_recalls'];
    }
}

/**
 * Executes a single provider query
 * In production, these call the actual APIs via Cloud Functions
 */
async function executeProvider(
    provider: string,
    vin: string,
    market: string
): Promise<ProviderResult> {
    const startTime = Date.now();

    // TODO: Replace with actual API calls via Cloud Functions
    // These are mock implementations for the MVP structure

    switch (provider) {
        case 'carVertical':
            return {
                provider: 'carVertical',
                market,
                status: 'success',
                data: {
                    source: 'carVertical',
                    note: 'Integration pending — API key required',
                },
                responseTimeMs: Date.now() - startTime,
            };

        case 'autoDNA':
            return {
                provider: 'autoDNA',
                market,
                status: 'success',
                data: {
                    source: 'autoDNA',
                    note: 'Integration pending — API key required',
                },
                responseTimeMs: Date.now() - startTime,
            };

        case 'nmvtis_epicvin':
            return {
                provider: 'nmvtis_epicvin',
                market,
                status: market === 'US' ? 'success' : 'not_applicable',
                data: {
                    source: 'NMVTIS via EpicVIN',
                    note: 'Integration pending — API key required',
                },
                responseTimeMs: Date.now() - startTime,
            };

        case 'nhtsa_recalls':
            // NHTSA is free and always available
            return {
                provider: 'nhtsa_recalls',
                market: 'GLOBAL',
                status: 'success',
                data: {
                    source: 'NHTSA',
                    note: 'Free API — will query api.nhtsa.gov',
                },
                responseTimeMs: Date.now() - startTime,
            };

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Aggregates data from multiple providers into a unified view
 */
function aggregateProviderData(results: ProviderResult[]): AggregatedHistory {
    // TODO: Implement real aggregation logic when APIs are connected
    return {
        titleStatus: 'Clean',
        mileageKm: 0,
        accidentCount: 0,
        ownerCount: 1,
        recallCount: 0,
        mileageRecords: [],
        accidents: [],
        recalls: [],
    };
}

/**
 * Detects discrepancies between provider data
 * Triggers Critical Discrepancy Alert if mileage differs >5%
 */
function detectDiscrepancies(
    results: ProviderResult[],
    aggregated: AggregatedHistory
): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Extract mileage from each provider
    const mileages: { source: string; km: number }[] = [];
    for (const result of results) {
        if (result.status === 'success' && result.data?.mileageKm) {
            mileages.push({ source: result.provider, km: result.data.mileageKm });
        }
    }

    // Check for mileage discrepancy (>5% difference)
    if (mileages.length >= 2) {
        const sorted = mileages.sort((a, b) => a.km - b.km);
        const min = sorted[0].km;
        const max = sorted[sorted.length - 1].km;
        const diff = max > 0 ? ((max - min) / max) * 100 : 0;

        if (diff > 5) {
            discrepancies.push({
                type: 'mileage',
                severity: diff > 15 ? 'critical' : 'warning',
                description: `Mileage discrepancy of ${diff.toFixed(1)}% detected between ${sorted[0].source} (${sorted[0].km.toLocaleString()} km) and ${sorted[sorted.length - 1].source} (${sorted[sorted.length - 1].km.toLocaleString()} km).`,
                sources: mileages.map(m => m.source),
            });
        }
    }

    // Check for conflicting title statuses
    const titleStatuses: { source: string; status: string }[] = [];
    for (const result of results) {
        if (result.status === 'success' && result.data?.titleStatus) {
            titleStatuses.push({ source: result.provider, status: result.data.titleStatus });
        }
    }

    if (titleStatuses.length >= 2) {
        const uniqueStatuses = new Set(titleStatuses.map(t => t.status));
        if (uniqueStatuses.size > 1) {
            discrepancies.push({
                type: 'title',
                severity: 'critical',
                description: `Title status conflict: ${titleStatuses.map(t => `${t.source} reports "${t.status}"`).join(', ')}`,
                sources: titleStatuses.map(t => t.source),
            });
        }
    }

    return discrepancies;
}
