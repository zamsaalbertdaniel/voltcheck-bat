/**
 * Smart Search pentru pagina /modele-compatibile.
 * Algoritm local, case-insensitive, care prinde dintr-un singur câmp
 * atât numele brandului ("Hyundai", "VW") cât și numele modelului ("Ioniq", "ID.4").
 *
 * Comportament:
 *  - Query gol → returnează toate brandurile, cu toate modelele vizibile
 *  - Match pe brand → returnează brand-ul cu TOATE modelele vizibile
 *  - Match doar pe model → returnează brand-ul cu DOAR modelele care se potrivesc
 *  - Diacritice normalizate (ex. "Skoda" prinde "Škoda")
 */

import type { BrandInfo, CarModel } from '@/types/brands';

export type MatchType = 'brand' | 'model' | 'both';

export interface BrandSearchResult {
    brand: BrandInfo;
    /** Modelele care trebuie afișate pe card (poate fi un subset al brand.models) */
    matchedModels: CarModel[];
    matchType: MatchType;
}

/** Normalizează un string pentru comparație: lowercase + fără diacritice + trimmed. */
function normalize(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export function searchBrands(query: string, brands: BrandInfo[]): BrandSearchResult[] {
    const q = normalize(query);

    if (!q) {
        return brands.map((brand) => ({
            brand,
            matchedModels: brand.models,
            matchType: 'brand',
        }));
    }

    const results: BrandSearchResult[] = [];

    for (const brand of brands) {
        const brandMatch =
            normalize(brand.name).includes(q) || normalize(brand.id).includes(q);

        const modelMatches = brand.models.filter((m) => normalize(m.name).includes(q));

        if (brandMatch) {
            results.push({
                brand,
                matchedModels: brand.models,
                matchType: modelMatches.length > 0 ? 'both' : 'brand',
            });
        } else if (modelMatches.length > 0) {
            results.push({
                brand,
                matchedModels: modelMatches,
                matchType: 'model',
            });
        }
    }

    return results;
}
