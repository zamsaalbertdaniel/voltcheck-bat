/**
 * VoltCheck — Vehicle State Store (Zustand)
 * Manages decoded vehicle data during scan flow
 */

import { create } from 'zustand';

interface VehicleInfo {
    vin: string;
    make: string;
    model: string;
    year: number;
    fuelType?: string;
    bodyClass?: string;
    manufacturer?: string;
}

interface ProviderResult {
    provider: string;
    status: string;
    data: any;
}

interface RecallInfo {
    campaignNumber: string;
    component: string;
    summary: string;
}

interface VehicleState {
    // Current vehicle being scanned
    currentVehicle: VehicleInfo | null;
    providers: ProviderResult[];
    recalls: RecallInfo[];
    complaints: number;
    source: 'cache' | 'live' | 'mock' | null;

    // Selected level for payment
    selectedLevel: 1 | 2 | null;

    // Actions
    setDecodedVehicle: (params: {
        vehicle: VehicleInfo;
        providers: ProviderResult[];
        recalls: RecallInfo[];
        complaints: number;
        source: 'cache' | 'live' | 'mock';
    }) => void;
    setSelectedLevel: (level: 1 | 2 | null) => void;
    clearVehicle: () => void;
}

export const useVehicleStore = create<VehicleState>((set) => ({
    currentVehicle: null,
    providers: [],
    recalls: [],
    complaints: 0,
    source: null,
    selectedLevel: null,

    setDecodedVehicle: ({ vehicle, providers, recalls, complaints, source }) =>
        set({
            currentVehicle: vehicle,
            providers,
            recalls,
            complaints,
            source,
        }),

    setSelectedLevel: (selectedLevel) => set({ selectedLevel }),

    clearVehicle: () =>
        set({
            currentVehicle: null,
            providers: [],
            recalls: [],
            complaints: 0,
            source: null,
            selectedLevel: null,
        }),
}));
