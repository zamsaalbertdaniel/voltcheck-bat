/**
 * InspectEV — Lightweight analytics wrapper
 *
 * Thin stub that logs to console in development only. Designed to be
 * forwarded to Firebase Analytics (@react-native-firebase/analytics),
 * GA4, or another privacy-respecting provider with a single edit.
 *
 * Usage:
 *   import { trackEvent } from '@/utils/analytics';
 *   trackEvent('clicked_compatible_models_cta', { source: 'landing_hero' });
 *
 * Why a wrapper:
 *   - Single seam to swap providers later (no rewrites in call sites).
 *   - Safe default: dev logs only, zero runtime overhead in production
 *     until we actively wire a provider.
 */

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
    if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[analytics]', eventName, params ?? {});
    }
    // TODO: Forward to Firebase Analytics / GA4 when production wiring is enabled.
    //   Example (once @react-native-firebase/analytics is installed):
    //     import analytics from '@react-native-firebase/analytics';
    //     void analytics().logEvent(eventName, params);
}
