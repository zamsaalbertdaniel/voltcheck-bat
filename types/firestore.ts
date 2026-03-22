/**
 * VoltCheck — Firestore Type Definitions
 * TypeScript interfaces matching the Firestore schema
 * Updated: FAZA 1 — BAT (Battery Analysis Technology)
 */

import { Timestamp } from '@react-native-firebase/firestore';

// ─── Users Collection ───
export interface UserDoc {
    uid: string;
    email: string;
    displayName: string;
    authProvider: 'google' | 'apple';
    deviceFingerprint: string;
    locale: 'ro' | 'en';
    createdAt: Timestamp;
    lastActiveAt: Timestamp;
    // ── Faza 1 additions ──
    stripeCustomerId?: string;         // Legătura cu Stripe Customer
    subscriptionTier: 'free' | 'pro';  // Tier curent (extensibil)
    totalReports: number;              // Counter cache — rapoarte generate
    photoURL?: string;                 // Avatar din Google/Apple Sign-In
}

// ─── Vehicles Collection ───
export interface VehicleDoc {
    vehicleId: string;                 // ID-ul documentului Firestore
    userId: string;                    // Owner-ul vehiculului
    vin: string;
    make: string;
    model: string;
    year: number;
    market: 'EU' | 'US' | 'ASIA' | 'UNKNOWN';
    batteryType: 'NMC' | 'LFP' | 'NCA' | string;
    nominalCapacityKwh: number;
    decodedAt: Timestamp;
    // ── Faza 1 additions ──
    nickname?: string;                 // Denumire user-defined ("Mașina roșie")
    lastReportId?: string;             // Quick access la ultimul raport
    savedInGarage: boolean;            // Vizibil în Garaj sau ascuns
}

// ─── Reports Collection ───
export interface ReportDoc {
    reportId: string;
    vin: string;
    userId: string;
    vehicleId: string;                 // Legătura cu VehicleDoc
    level: 1 | 2;
    status: 'pending_payment' | 'processing' | 'completed' | 'failed' | 'expired';
    riskScore: number;
    riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    discrepancyAlerts: string[];
    createdAt: Timestamp;
    expiresAt: Timestamp;              // Level 1: +30 zile | Level 2: +365 zile
    // ── Faza 1 additions ──
    paymentId?: string;                // Legătura cu PaymentDoc
    pdfUrl?: string;                   // URL-ul PDF-ului generat
    sharedVia?: ('whatsapp' | 'email')[];  // Tracking share channels
}

// ─── Level 1 Subcollection ───
export interface Level1Data {
    vinHistory: Record<string, any>;
    accidentHistory: AccidentRecord[];
    mileageRecords: MileageRecord[];
    recallNotices: RecallNotice[];
    titleStatus: 'Clean' | 'Salvage' | 'Rebuilt' | 'Flood';
    marketOrigin: string;
    riskFactors: RiskFactorRecord[];
}

export interface AccidentRecord {
    date: string;
    severity: 'minor' | 'moderate' | 'severe';
    description: string;
    source: string;
}

export interface MileageRecord {
    date: string;
    mileageKm: number;
    source: string;
}

export interface RecallNotice {
    id: string;
    date: string;
    description: string;
    status: 'open' | 'completed';
    manufacturer: string;
}

export interface RiskFactorRecord {
    id: string;
    label: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    weight: number;
    description: string;
}

// ─── Level 2 Subcollection ───
export interface Level2Data {
    stateOfHealth: number;
    usableCapacityKwh: number;
    cycleCount: number;
    dcChargingRatio: number;
    acChargingRatio: number;
    cellBalanceStatus: 'Balanced' | 'Imbalanced' | 'Critical';
    cellVoltages: number[];
    thermalHistory: {
        averageTempC: number;
        maxTempC: number;
        minTempC: number;
        highTempEvents: number;
    };
    smartcarVehicleId: string;
    dataSource: 'smartcar' | 'enode';
    capturedAt: Timestamp;
}

// ─── Payments Collection ───
export interface PaymentDoc {
    paymentId: string;
    userId: string;
    reportId: string;
    stripePaymentIntentId: string;
    amountRON: number;                 // in bani (cents) — e.g. 1500 = 15 RON
    currency: 'RON';
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    createdAt: Timestamp;
    // ── Faza 1 additions ──
    expiresAt: Timestamp;              // TTL sincronizat cu raportul
    receiptUrl?: string;               // Link către receipt Stripe
    // ── Pas 3: Idempotency tracking ──
    stripeEventId?: string;            // Stripe event ID — tracks which webhook processed this
    processedAt?: Timestamp;           // Când a fost procesat webhook-ul cu succes
    completedAt?: Timestamp;           // Când a fost completată plata
}

// ─── Report Deliveries Collection ───
export interface ReportDeliveryDoc {
    deliveryId: string;
    reportId: string;
    userId: string;
    channel: 'email' | 'in_app' | 'whatsapp';  // Adăugat whatsapp
    sendgridMessageId: string;
    pdfUrl: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    sentAt: Timestamp;
}

// ─── VIN Cache Collection ───
export interface VINCacheDoc {
    vin: string;
    providers: Record<string, any>;
    expiresAt: Timestamp;
}

// ─── VIN Validation Utility Type ───
/** Strict VIN: exactly 17 alphanumeric characters, excluding I, O, Q */
export type ValidVIN = string & { readonly __brand: 'ValidVIN' };

/**
 * Validates a VIN string with strict rules:
 * - Exactly 17 characters
 * - Only alphanumeric (A-Z, 0-9)
 * - No I, O, Q (per ISO 3779)
 * - No special characters or whitespace
 */
export function validateVIN(vin: string): { valid: boolean; error?: string } {
    if (!vin || typeof vin !== 'string') {
        return { valid: false, error: 'VIN is required' };
    }

    const trimmed = vin.trim().toUpperCase();

    if (trimmed.length !== 17) {
        return { valid: false, error: `VIN must be exactly 17 characters (got ${trimmed.length})` };
    }

    if (/[^A-Z0-9]/.test(trimmed)) {
        return { valid: false, error: 'VIN must contain only letters and numbers (no special characters)' };
    }

    if (/[IOQ]/.test(trimmed)) {
        return { valid: false, error: 'VIN cannot contain letters I, O, or Q' };
    }

    return { valid: true };
}

/**
 * Sanitizes VIN input: uppercase, strip non-alphanumeric, remove I/O/Q
 */
export function sanitizeVINInput(input: string): string {
    return input.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}
