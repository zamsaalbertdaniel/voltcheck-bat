/**
 * InspectEV — Recall Classifier
 *
 * Maps raw NHTSA component strings (free-text, e.g. "ELECTRICAL SYSTEM:BATTERY")
 * to a finite set of EV zones for the Recall Map visualization.
 *
 * Each zone carries a severity multiplier used to colorize the map.
 */

export type RecallZone =
    | 'battery'        // HV battery, BMS, charging
    | 'motor'          // Drive motor, power train, inverter
    | 'brakes'         // Service brakes, ABS, parking
    | 'airbags'        // SRS, seat belts, restraints
    | 'steering'       // Steering column, EPS
    | 'suspension'     // Suspension, tires, wheels
    | 'electrical'     // 12V electrical, wiring, fuses
    | 'lights'         // Head/tail lights, visibility
    | 'software'       // Software, firmware, ECU
    | 'structure'      // Body, frame, latches, doors
    | 'hvac'           // Climate, heater, AC
    | 'other';         // Anything not matched

export interface ClassifiedRecall {
    campaignNumber: string;
    component: string;
    summary: string;
    date: string;
    zone: RecallZone;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Recall {
    campaignNumber: string;
    component: string;
    summary: string;
    date: string;
}

/**
 * Ordered keyword table — first match wins. Ordering matters:
 * most specific keywords first, generic last.
 */
const ZONE_KEYWORDS: Array<{ zone: RecallZone; severity: ClassifiedRecall['severity']; keywords: string[] }> = [
    // HV battery is the single highest-risk zone for an EV
    { zone: 'battery', severity: 'critical', keywords: [
        'HIGH VOLTAGE BATTERY', 'TRACTION BATTERY', 'HV BATTERY',
        'LITHIUM', 'BATTERY PACK', 'BATTERY MODULE', 'BATTERY CELL',
        'BMS', 'CHARGING SYSTEM', 'CHARGE PORT', 'ONBOARD CHARGER',
    ] },
    // Airbags / SRS
    { zone: 'airbags', severity: 'critical', keywords: [
        'AIR BAGS', 'AIRBAG', 'SRS', 'SEAT BELT', 'RESTRAINT', 'PRETENSIONER',
    ] },
    // Brakes
    { zone: 'brakes', severity: 'high', keywords: [
        'SERVICE BRAKE', 'BRAKES', 'ABS', 'PARKING BRAKE', 'BRAKE PEDAL',
        'BRAKE LINE', 'BRAKE FLUID',
    ] },
    // Motor / powertrain
    { zone: 'motor', severity: 'high', keywords: [
        'POWER TRAIN', 'POWERTRAIN', 'DRIVE MOTOR', 'ELECTRIC MOTOR',
        'INVERTER', 'GEARBOX', 'TRANSMISSION', 'HALF SHAFT', 'AXLE',
    ] },
    // Steering
    { zone: 'steering', severity: 'high', keywords: [
        'STEERING', 'TIE ROD', 'RACK AND PINION',
    ] },
    // Software / firmware
    { zone: 'software', severity: 'medium', keywords: [
        'SOFTWARE', 'FIRMWARE', 'CONTROL MODULE', 'ECU', 'BCM',
        'VEHICLE SPEED CONTROL', 'ENGINE CONTROL',
    ] },
    // Suspension / tires / wheels
    { zone: 'suspension', severity: 'medium', keywords: [
        'SUSPENSION', 'TIRES', 'TIRE', 'WHEEL', 'CONTROL ARM', 'STRUT',
    ] },
    // Generic electrical (12V, wiring, fuses)
    { zone: 'electrical', severity: 'medium', keywords: [
        'ELECTRICAL SYSTEM', 'ELECTRICAL', 'WIRING', 'FUSE', '12V', '12 VOLT',
    ] },
    // Lighting / visibility
    { zone: 'lights', severity: 'medium', keywords: [
        'EXTERIOR LIGHTING', 'HEADLAMP', 'HEADLIGHT', 'TAIL LAMP', 'TAILLIGHT',
        'LAMP', 'LIGHTING', 'VISIBILITY', 'WINDSHIELD WIPER', 'DEFROSTER',
    ] },
    // Structure / body / latches
    { zone: 'structure', severity: 'medium', keywords: [
        'STRUCTURE', 'LATCH', 'DOOR', 'HOOD', 'HATCH', 'LIFTGATE',
        'EXTERIOR', 'BUMPER', 'BODY',
    ] },
    // HVAC / climate
    { zone: 'hvac', severity: 'low', keywords: [
        'AIR CONDITION', 'HEATER', 'HVAC', 'CLIMATE', 'COOLING', 'COOLANT',
    ] },
];

/**
 * Classify a raw NHTSA component string into a known EV zone.
 * Falls back to 'other' if nothing matches.
 */
export function classifyRecall(recall: Recall): ClassifiedRecall {
    const haystack = `${recall.component || ''} ${recall.summary || ''}`.toUpperCase();

    for (const { zone, severity, keywords } of ZONE_KEYWORDS) {
        for (const kw of keywords) {
            if (haystack.includes(kw)) {
                return { ...recall, zone, severity };
            }
        }
    }

    return { ...recall, zone: 'other', severity: 'low' };
}

/**
 * Classify an array of recalls and build a per-zone summary.
 */
export interface ZoneSummary {
    zone: RecallZone;
    count: number;
    maxSeverity: ClassifiedRecall['severity'];
    recalls: ClassifiedRecall[];
}

export function buildZoneSummary(recalls: Recall[]): {
    classified: ClassifiedRecall[];
    byZone: Record<RecallZone, ZoneSummary>;
    affectedZones: RecallZone[];
    overallSeverity: ClassifiedRecall['severity'];
} {
    const classified = recalls.map(classifyRecall);

    const byZone = {} as Record<RecallZone, ZoneSummary>;
    const severityRank: Record<ClassifiedRecall['severity'], number> = {
        low: 1, medium: 2, high: 3, critical: 4,
    };

    for (const r of classified) {
        if (!byZone[r.zone]) {
            byZone[r.zone] = { zone: r.zone, count: 0, maxSeverity: 'low', recalls: [] };
        }
        byZone[r.zone].count += 1;
        byZone[r.zone].recalls.push(r);
        if (severityRank[r.severity] > severityRank[byZone[r.zone].maxSeverity]) {
            byZone[r.zone].maxSeverity = r.severity;
        }
    }

    const affectedZones = Object.keys(byZone) as RecallZone[];

    let overallSeverity: ClassifiedRecall['severity'] = 'low';
    for (const z of affectedZones) {
        if (severityRank[byZone[z].maxSeverity] > severityRank[overallSeverity]) {
            overallSeverity = byZone[z].maxSeverity;
        }
    }

    return { classified, byZone, affectedZones, overallSeverity };
}
