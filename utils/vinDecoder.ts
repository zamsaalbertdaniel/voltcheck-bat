/**
 * InspectEV — VIN Validator & Decoder
 * Validates format and extracts market/manufacturer from WMI
 */

/** VIN format regex: 17 alphanumeric chars, excluding I, O, Q */
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

/** World Manufacturer Identifier (first 3 characters) → Country mapping */
const WMI_COUNTRY_MAP: Record<string, string> = {
    // Germany
    'W': 'EU', 'WBA': 'EU', 'WBS': 'EU', 'WVW': 'EU', 'WF0': 'EU',
    // France
    'VF': 'EU', 'VR': 'EU',
    // UK
    'SA': 'EU', 'SJ': 'EU',
    // Italy
    'ZA': 'EU', 'ZF': 'EU',
    // Sweden
    'YV': 'EU', 'YS': 'EU',
    // Netherlands
    'XL': 'EU',
    // Czech Republic
    'TM': 'EU',
    // Spain
    'VS': 'EU',
    // USA
    '1': 'US', '4': 'US', '5': 'US',
    // Canada
    '2': 'US',
    // Mexico
    '3': 'US',
    // Japan
    'J': 'ASIA',
    // Korea
    'K': 'ASIA', 'KN': 'ASIA',
    // China
    'L': 'ASIA',
};

/** Known EV Manufacturers → Battery type mapping */
const EV_BATTERY_MAP: Record<string, { batteryType: string; nominalCapacityKwh: number }> = {
    'Tesla Model 3 SR': { batteryType: 'LFP', nominalCapacityKwh: 60 },
    'Tesla Model 3 LR': { batteryType: 'NCA', nominalCapacityKwh: 82 },
    'Tesla Model Y': { batteryType: 'NCA', nominalCapacityKwh: 75 },
    'Tesla Model S': { batteryType: 'NCA', nominalCapacityKwh: 100 },
    'VW ID.3': { batteryType: 'NMC', nominalCapacityKwh: 58 },
    'VW ID.4': { batteryType: 'NMC', nominalCapacityKwh: 77 },
    'BMW iX3': { batteryType: 'NMC', nominalCapacityKwh: 74 },
    'BMW i4': { batteryType: 'NMC', nominalCapacityKwh: 83.9 },
    'Hyundai Ioniq 5': { batteryType: 'NMC', nominalCapacityKwh: 72.6 },
    'Hyundai Kona EV': { batteryType: 'NMC', nominalCapacityKwh: 64 },
    'Kia EV6': { batteryType: 'NMC', nominalCapacityKwh: 77.4 },
    'Renault Zoe': { batteryType: 'NMC', nominalCapacityKwh: 52 },
    'Nissan Leaf': { batteryType: 'NMC', nominalCapacityKwh: 40 },
    'Peugeot e-208': { batteryType: 'NMC', nominalCapacityKwh: 50 },
    'Skoda Enyaq': { batteryType: 'NMC', nominalCapacityKwh: 77 },
};

/** Known WMI → Manufacturer mapping for popular EV brands */
const WMI_MANUFACTURER_MAP: Record<string, string> = {
    '5YJ': 'Tesla',
    '7SA': 'Tesla',
    'LRW': 'Tesla',
    'XP7': 'Tesla',
    'WVW': 'Volkswagen',
    'WBA': 'BMW',
    'WBS': 'BMW',
    'WBY': 'BMW',
    'KNA': 'Kia',
    'KNM': 'Kia',
    'KMH': 'Hyundai',
    'TMB': 'Skoda',
    'VF1': 'Renault',
    'VR1': 'Peugeot',
    'VF7': 'Citroën',
    'SJN': 'Nissan',
    'VF3': 'Peugeot',
    'W1K': 'Mercedes-Benz',
    'WDD': 'Mercedes-Benz',
    'WDC': 'Mercedes-Benz',
    'WAU': 'Audi',
    'YV1': 'Volvo',
    'YS2': 'Volvo',
};

export interface VINDecodeResult {
    isValid: boolean;
    vin: string;
    market: 'EU' | 'US' | 'ASIA' | 'UNKNOWN';
    manufacturer: string;
    wmi: string;
    vds: string;
    vis: string;
    year: number | null;
}

/** Year code mapping (position 10 of VIN) */
const YEAR_CODES: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030,
};

/**
 * Validates a VIN string
 */
export function isValidVIN(vin: string): boolean {
    return VIN_REGEX.test(vin.toUpperCase().trim());
}

/**
 * Detects the market (EU/US/ASIA) from the first characters of the VIN
 */
export function detectMarket(vin: string): 'EU' | 'US' | 'ASIA' | 'UNKNOWN' {
    const upper = vin.toUpperCase();
    const wmi3 = upper.substring(0, 3);
    const wmi2 = upper.substring(0, 2);
    const wmi1 = upper.substring(0, 1);

    // Try 3-char, then 2-char, then 1-char match
    if (WMI_COUNTRY_MAP[wmi3]) return WMI_COUNTRY_MAP[wmi3] as any;
    if (WMI_COUNTRY_MAP[wmi2]) return WMI_COUNTRY_MAP[wmi2] as any;
    if (WMI_COUNTRY_MAP[wmi1]) return WMI_COUNTRY_MAP[wmi1] as any;

    return 'UNKNOWN';
}

/**
 * Detects the manufacturer from the WMI (first 3 chars)
 */
export function detectManufacturer(vin: string): string {
    const wmi = vin.toUpperCase().substring(0, 3);
    return WMI_MANUFACTURER_MAP[wmi] || 'Unknown';
}

/**
 * Extracts the model year from position 10
 */
export function extractYear(vin: string): number | null {
    const yearChar = vin.toUpperCase().charAt(9);
    return YEAR_CODES[yearChar] || null;
}

/**
 * Full VIN decode — validates and extracts all available data
 */
export function decodeVIN(vinInput: string): VINDecodeResult {
    const vin = vinInput.toUpperCase().trim();

    return {
        isValid: isValidVIN(vin),
        vin,
        market: detectMarket(vin),
        manufacturer: detectManufacturer(vin),
        wmi: vin.substring(0, 3),   // World Manufacturer Identifier
        vds: vin.substring(3, 9),   // Vehicle Descriptor Section
        vis: vin.substring(9, 17),  // Vehicle Identifier Section
        year: extractYear(vin),
    };
}

export { EV_BATTERY_MAP };
