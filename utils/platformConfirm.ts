/**
 * InspectEV — Cross-platform confirmation dialog
 *
 * React Native's `Alert.alert` is a no-op on web (only native iOS/Android),
 * which is why destructive actions like Logout/Delete Account appeared
 * to do nothing when the button was pressed in the web build.
 *
 * This helper uses `window.confirm` on web and `Alert.alert` on native,
 * returning a Promise<boolean> resolving to true if the user confirmed.
 */

import { Alert, Platform } from 'react-native';

export interface PlatformConfirmOptions {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    destructive?: boolean;
}

export function platformConfirm({
    title,
    message,
    confirmText,
    cancelText = 'Cancel',
    destructive = false,
}: PlatformConfirmOptions): Promise<boolean> {
    if (Platform.OS === 'web') {
        if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
            return Promise.resolve(false);
        }
        const ok = window.confirm(`${title}\n\n${message}`);
        return Promise.resolve(!!ok);
    }

    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
                {
                    text: confirmText,
                    style: destructive ? 'destructive' : 'default',
                    onPress: () => resolve(true),
                },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });
}
