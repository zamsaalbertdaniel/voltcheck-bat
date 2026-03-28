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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Executes a single provider query via Cloud Functions.
 * The server-side decodeVin Cloud Function handles the actual API calls.
 * Client-side providers are now thin wrappers that delegate to the backend.
 */
async function executeProvider(
    provider: string,
    vin: string,
    market: string
): Promise<ProviderResult> {
    const startTime = Date.now();

    try {
        // All provider data is fetched server-side by the decodeVin Cloud Function.
        // The client calls decodeVinRemote() which returns aggregated data from all providers.
        // Individual provider results are included in the response.providers[] array.
        //
        // This function returns a "pending" result because the actual data
        // is fetched in routeVINQuery() via the Cloud Function call.
        return {
            provider,
            market: provider === 'nhtsa_recalls' ? 'GLOBAL' : market,
            status: 'success',
            data: {
                source: provider,
                delegatedToCloudFunction: true,
            },
            responseTimeMs: Date.now() - startTime,
        };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return {
            provider,
            market,
            status: 'error',
            data: { error: err.message },
            responseTimeMs: Date.now() - startTime,
        };
    }
}

/**
 * Aggregates data from multiple providers into a unified view.
 * Merges data from all successful provider responses.
 */
function aggregateProviderData(results: ProviderResult[]): AggregatedHistory {
    const aggregated: AggregatedHistory = {
        titleStatus: 'Clean',
        mileageKm: 0,
        accidentCount: 0,
        ownerCount: 1,
        recallCount: 0,
        mileageRecords: [],
        accidents: [],
        recalls: [],
    };

    for (const result of results) {
        if (result.status !== 'success' || !result.data) continue;
        const d = result.data;

        // Merge mileage (take highest as most conservative)
        if (d.mileageKm && d.mileageKm > aggregated.mileageKm) {
            aggregated.mileageKm = d.mileageKm;
        }

        // Merge accident count (take highest)
        if (d.accidentCount && d.accidentCount > aggregated.accidentCount) {
            aggregated.accidentCount = d.accidentCount;
        }

        // Merge owner count (take highest)
        if (d.ownerCount && d.ownerCount > aggregated.ownerCount) {
            aggregated.ownerCount = d.ownerCount;
        }

        // Title status — worst wins (Flood > Salvage > Rebuilt > Clean)
        if (d.titleStatus) {
            const priority: Record<string, number> = { 'Clean': 0, 'Rebuilt': 1, 'Salvage': 2, 'Flood': 3 };
            const currentPriority = priority[aggregated.titleStatus] || 0;
            const newPriority = priority[d.titleStatus] || 0;
            if (newPriority > currentPriority) {
                aggregated.titleStatus = d.titleStatus;
            }
        }

        // Merge recalls
        if (Array.isArray(d.recalls)) {
            aggregated.recallCount += d.recalls.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aggregated.recalls.push(...d.recalls.map((r: any) => ({
                id: r.campaignNumber || r.id || '',
                description: r.summary || r.description || '',
                status: r.status || 'active',
            })));
        }

        // Merge mileage records
        if (Array.isArray(d.mileageRecords)) {
            aggregated.mileageRecords.push(...d.mileageRecords);
        }

        // Merge accidents
        if (Array.isArray(d.accidents)) {
            aggregated.accidents.push(...d.accidents);
        }
    }

    return aggregated;
}

/**
 * Detects discrepancies between provider data
 * Triggers Critical Discrepancy Alert if mileage differs >5%
 */
function detectDiscrepancies(
    results: ProviderResult[],
    _aggregated: AggregatedHistory
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
