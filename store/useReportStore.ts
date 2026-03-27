/**
 * VoltCheck — Report State Store (Zustand)
 * Manages active report generation pipeline state + report history
 */

import { create } from 'zustand';

interface ReportSummary {
    id: string;
    vin: string;
    level: 1 | 2;
    status: 'processing' | 'completed' | 'completed_partial' | 'failed' | 'manual_review_needed';
    riskScore?: number;
    riskCategory?: string;
    pdfUrl?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    createdAt: number;  // Unix timestamp
    expiresAt?: number;
}

interface ActivePipeline {
    reportId: string;
    vin: string;
    level: 1 | 2;
    statusDetails: string;
    startedAt: number;
}

interface ReportState {
    // Active pipeline (current report being generated)
    activePipeline: ActivePipeline | null;
    setActivePipeline: (pipeline: ActivePipeline | null) => void;
    updatePipelineStatus: (statusDetails: string) => void;

    // Report history (user's garage)
    reports: ReportSummary[];
    setReports: (reports: ReportSummary[]) => void;
    addReport: (report: ReportSummary) => void;
    updateReport: (id: string, updates: Partial<ReportSummary>) => void;
    removeReport: (id: string) => void;

    // Loading states
    isLoadingReports: boolean;
    setLoadingReports: (loading: boolean) => void;
}

export const useReportStore = create<ReportState>((set) => ({
    activePipeline: null,
    setActivePipeline: (pipeline) => set({ activePipeline: pipeline }),
    updatePipelineStatus: (statusDetails) =>
        set((state) => ({
            activePipeline: state.activePipeline
                ? { ...state.activePipeline, statusDetails }
                : null,
        })),

    reports: [],
    setReports: (reports) => set({ reports }),
    addReport: (report) =>
        set((state) => ({
            reports: [report, ...state.reports],
        })),
    updateReport: (id, updates) =>
        set((state) => ({
            reports: state.reports.map((r) =>
                r.id === id ? { ...r, ...updates } : r
            ),
        })),
    removeReport: (id) =>
        set((state) => ({
            reports: state.reports.filter((r) => r.id !== id),
        })),

    isLoadingReports: false,
    setLoadingReports: (isLoadingReports) => set({ isLoadingReports }),
}));
