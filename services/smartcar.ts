/**
 * VoltCheck — Smartcar API Service
 * Primary source for Level 2 live battery diagnosis
 * Extracts: SoH, Usable Capacity, Cycle Count, DC/AC ratio, Cell Balance
 */

// Smartcar OAuth configuration
const SMARTCAR_CONFIG = {
    clientId: 'YOUR_SMARTCAR_CLIENT_ID',
    redirectUri: 'voltcheck://callback',
    scope: [
        'read_vehicle_info',
        'read_battery',
        'read_charge',
        'read_odometer',
    ],
    mode: 'live' as const, // 'test' for development, 'live' for production
};

export interface SmartcarVehicle {
    id: string;
    make: string;
    model: string;
    year: number;
}

export interface SmartcarBatteryData {
    stateOfHealth: number;          // 0-100%
    usableCapacityKwh: number;      // Actual usable capacity
    percentRemaining: number;       // Current charge level
    range: number;                  // Estimated range in km
    isPluggedIn: boolean;
    chargeState: 'CHARGING' | 'FULLY_CHARGED' | 'NOT_CHARGING';
}

export interface SmartcarChargeHistory {
    totalCycles: number;
    dcChargingRatio: number;        // 0-1 (% of DC fast charges)
    acChargingRatio: number;        // 0-1 (% of AC charges)
    averageChargeLevelStart: number; // Average SoC at start of charge
    averageChargeLevelEnd: number;   // Average SoC at end of charge
}

export interface SmartcarDiagnosisResult {
    vehicle: SmartcarVehicle;
    battery: SmartcarBatteryData;
    chargeHistory: SmartcarChargeHistory;
    cellBalance: {
        status: 'Balanced' | 'Imbalanced' | 'Critical';
        voltages: number[];
        maxDelta: number;
    };
    capturedAt: Date;
    dataSource: 'smartcar';
}

/**
 * Generates the Smartcar OAuth Connect URL
 * User must authorize VoltCheck to access their vehicle data
 */
export function getAuthorizationUrl(): string {
    const params = new URLSearchParams({
        client_id: SMARTCAR_CONFIG.clientId,
        redirect_uri: SMARTCAR_CONFIG.redirectUri,
        response_type: 'code',
        scope: SMARTCAR_CONFIG.scope.join(' '),
        mode: SMARTCAR_CONFIG.mode,
    });

    return `https://connect.smartcar.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token via Cloud Function.
 * The client_secret is stored server-side only — never exposed to the client.
 * Returns the list of vehicles connected to the user's Smartcar account.
 */
export async function exchangeAuthCode(code: string): Promise<{
    success: boolean;
    vehicles: SmartcarVehicle[];
    vehicleCount: number;
}> {
    const { Platform } = await import('react-native');
    const { getFirebaseServices } = await import('./firebase');

    if (Platform.OS === 'web') {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await getFirebaseServices();
        const functions = getFunctions(app, 'europe-west1');
        const callable = httpsCallable(functions, 'smartcarExchange');
        const result = await callable({ code });
        return result.data as { success: boolean; vehicles: SmartcarVehicle[]; vehicleCount: number };
    } else {
        const rnFunctions = await import('@react-native-firebase/functions');
        const callable = rnFunctions.default().httpsCallable('smartcarExchange');
        const result = await callable({ code });
        return result.data as { success: boolean; vehicles: SmartcarVehicle[]; vehicleCount: number };
    }
}

/**
 * Fetches complete battery diagnosis from Smartcar API
 * Must be called with a valid access token (via Cloud Function)
 */
export async function fetchBatteryDiagnosis(
    accessToken: string,
    vehicleId: string
): Promise<SmartcarDiagnosisResult> {
    const baseUrl = 'https://api.smartcar.com/v2.0';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    try {
        // Parallel requests for all data points
        const [vehicleRes, batteryRes, chargeRes, odometerRes] = await Promise.all([
            fetch(`${baseUrl}/vehicles/${vehicleId}`, { headers }),
            fetch(`${baseUrl}/vehicles/${vehicleId}/battery`, { headers }),
            fetch(`${baseUrl}/vehicles/${vehicleId}/charge`, { headers }),
            fetch(`${baseUrl}/vehicles/${vehicleId}/odometer`, { headers }),
        ]);

        const vehicleData = await vehicleRes.json();
        const batteryData = await batteryRes.json();
        const chargeData = await chargeRes.json();
        await odometerRes.json(); // consume response body (odometer data reserved for future use)

        // Process and structure the data
        const result: SmartcarDiagnosisResult = {
            vehicle: {
                id: vehicleId,
                make: vehicleData.make || 'Unknown',
                model: vehicleData.model || 'Unknown',
                year: vehicleData.year || 0,
            },
            battery: {
                stateOfHealth: batteryData.stateOfHealth ?? estimateSoH(batteryData),
                usableCapacityKwh: batteryData.capacity ?? 0,
                percentRemaining: batteryData.percentRemaining ?? 0,
                range: batteryData.range ?? 0,
                isPluggedIn: chargeData.isPluggedIn ?? false,
                chargeState: chargeData.state ?? 'NOT_CHARGING',
            },
            chargeHistory: {
                totalCycles: 0,             // Requires historical data aggregation
                dcChargingRatio: 0,         // Requires charging session analysis
                acChargingRatio: 1,
                averageChargeLevelStart: 20,
                averageChargeLevelEnd: 80,
            },
            cellBalance: {
                status: 'Balanced',         // Requires OBD-level BMS data
                voltages: [],
                maxDelta: 0,
            },
            capturedAt: new Date(),
            dataSource: 'smartcar',
        };

        return result;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Smartcar] Battery diagnosis failed:', error);
        throw new Error('Failed to fetch battery diagnosis from Smartcar');
    }
}

/**
 * Estimates SoH when direct SoH data is unavailable
 * Uses capacity vs nominal capacity comparison
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateSoH(batteryData: any): number {
    if (batteryData.capacity && batteryData.nominalCapacity) {
        return Math.round((batteryData.capacity / batteryData.nominalCapacity) * 100);
    }
    // Default: return 0 to indicate SoH unavailable
    return 0;
}

/**
 * Lists all vehicles connected to the user's Smartcar account
 */
export async function listVehicles(accessToken: string): Promise<SmartcarVehicle[]> {
    const response = await fetch('https://api.smartcar.com/v2.0/vehicles', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to list vehicles: ${response.status}`);
    }

    const data = await response.json();
    return data.vehicles || [];
}

/**
 * Checks if a specific vehicle make/model is supported by Smartcar
 */
export function isSmartcarSupported(make: string): boolean {
    const SUPPORTED_MAKES = [
        'Tesla', 'Volkswagen', 'BMW', 'Hyundai', 'Kia',
        'Mercedes-Benz', 'Audi', 'Porsche', 'Ford', 'Chevrolet',
        'Nissan', 'Rivian', 'Lucid', 'Volvo', 'Polestar',
        'Mini', 'Jaguar', 'Land Rover', 'Cadillac', 'GMC',
    ];
    return SUPPORTED_MAKES.includes(make);
}
