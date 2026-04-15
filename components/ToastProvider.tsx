/**
 * InspectEV — Toast Shim over react-native-toast-message
 *
 * Păstrează API-ul original (`ToastProvider`, `useToast`, `showToast`) ca să nu
 * forțeze modificări în cele 6 ecrane consumatoare. Intern deleagă către
 * `Toast.show()` cu config Deep-Tech definit în `ToastConfig.tsx`.
 *
 * API:
 *   const { showToast } = useToast();
 *   showToast('success', 'Plată reușită');
 *   showToast('error', 'Eroare VIN', 4000);
 */

import React, { useCallback, useMemo } from 'react';
import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
    showToast: (type: ToastType, message: string, duration?: number) => void;
}

/**
 * Ecrane existente importă `useToast` direct. Returnăm o instanță stabilă —
 * nu avem nevoie de React Context fiindcă `Toast.show()` e un singleton global
 * ancorat în `<Toast />` din root layout.
 */
export function useToast(): ToastContextValue {
    const showToast = useCallback(
        (type: ToastType, message: string, duration = 3000) => {
            Toast.show({
                type,
                text1: message,
                visibilityTime: duration,
                position: 'top',
                topOffset: 60,
            });
        },
        [],
    );

    return useMemo(() => ({ showToast }), [showToast]);
}

/**
 * Wrapper legacy — devine pass-through. `<Toast />` e deja montat în root
 * layout; păstrăm componenta doar pentru compatibilitate cu codul existent.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
