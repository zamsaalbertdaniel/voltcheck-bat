/**
 * InspectEV — Auth State Store (Zustand)
 * Global authentication state accessible from any component
 */

import { create } from 'zustand';

interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: user !== null,
            isLoading: false,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    logout: () =>
        set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        }),
}));
