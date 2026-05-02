/**
 * InspectEV — Sentry Monitoring Service
 * Platform-aware initialization for error tracking + performance monitoring.
 *
 * Web  → @sentry/react  (Browser SDK with Web Vitals)
 * Native → @sentry/react-native (Mobile Vitals + native crash handling)
 *
 * DSN is loaded from EXPO_PUBLIC_SENTRY_DSN environment variable.
 * If no DSN is configured, monitoring is gracefully disabled.
 */

import { Platform } from 'react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const IS_DEV = __DEV__;
const APP_VERSION = '1.0.0';

/** Whether Sentry has been initialized */
let _initialized = false;

/**
 * Initialize Sentry for the current platform.
 * Call once at app boot (before any UI renders).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initSentry(): Promise<void> {
  if (_initialized) return;
  if (!SENTRY_DSN) {
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] No DSN configured — monitoring disabled');
    }
    return;
  }

  try {
    if (Platform.OS === 'web') {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: IS_DEV ? 'development' : 'production',
        release: `inspectev@${APP_VERSION}`,

        // Performance: 20% in prod for stability, 100% in dev
        tracesSampleRate: IS_DEV ? 1.0 : 0.2,

        // Browser tracing integration — captures pageload + navigation
        integrations: [
          Sentry.browserTracingIntegration(),
        ],

        // Noise reduction: filter known non-actionable errors
        beforeSend(event) {
          // Chunk load failures (user network issues, deploy race conditions)
          const exType = event.exception?.values?.[0]?.type;
          if (exType === 'ChunkLoadError') return null;

          // Browser extension noise
          const exValue = event.exception?.values?.[0]?.value || '';
          if (exValue.includes('extension://')) return null;

          // ResizeObserver loop — benign browser quirk
          if (exValue.includes('ResizeObserver loop')) return null;

          return event;
        },

        // Scrub sensitive data from breadcrumbs
        beforeBreadcrumb(breadcrumb) {
          // Mask VIN numbers in URLs (last 4 visible only)
          if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
            breadcrumb.data.url = breadcrumb.data.url.replace(
              /[A-HJ-NPR-Z0-9]{13}([A-HJ-NPR-Z0-9]{4})/gi,
              '****$1'
            );
          }
          return breadcrumb;
        },
      });
      _initialized = true;
    } else {
      // Native (iOS / Android)
      const SentryNative = await import('@sentry/react-native');
      SentryNative.init({
        dsn: SENTRY_DSN,
        environment: IS_DEV ? 'development' : 'production',
        release: `inspectev@${APP_VERSION}`,

        // Performance: 20% in prod for stability
        tracesSampleRate: IS_DEV ? 1.0 : 0.2,

        // Enable native crash handling (ANR, native exceptions)
        enableAutoSessionTracking: true,
        enableNativeCrashHandling: true,

        // Scrub VIN data from breadcrumbs
        beforeBreadcrumb(breadcrumb) {
          if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
            breadcrumb.data.url = breadcrumb.data.url.replace(
              /[A-HJ-NPR-Z0-9]{13}([A-HJ-NPR-Z0-9]{4})/gi,
              '****$1'
            );
          }
          return breadcrumb;
        },
      });
      _initialized = true;
    }
  } catch (err) {
    // Sentry init failure should never crash the app
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.error('[Sentry] Initialization failed:', err);
    }
  }
}

/**
 * Capture an exception with optional context.
 * Safe to call even if Sentry is not initialized (no-op).
 */
export async function captureError(
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  if (!_initialized) return;

  try {
    if (Platform.OS === 'web') {
      const Sentry = await import('@sentry/react');
      if (context) {
        Sentry.setContext('inspectev', context);
      }
      Sentry.captureException(error);
    } else {
      const SentryNative = await import('@sentry/react-native');
      if (context) {
        SentryNative.setContext('inspectev', context);
      }
      SentryNative.captureException(error);
    }
  } catch {
    // Silent fail — monitoring should never break the app
  }
}

/**
 * Set user context for Sentry (call after auth).
 * Pass null to clear user context on logout.
 */
export async function setSentryUser(
  user: { id: string; email?: string } | null
): Promise<void> {
  if (!_initialized) return;

  try {
    if (Platform.OS === 'web') {
      const Sentry = await import('@sentry/react');
      Sentry.setUser(user);
    } else {
      const SentryNative = await import('@sentry/react-native');
      SentryNative.setUser(user);
    }
  } catch {
    // Silent fail
  }
}

/**
 * Add a breadcrumb for debugging context.
 */
export async function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!_initialized) return;

  try {
    if (Platform.OS === 'web') {
      const Sentry = await import('@sentry/react');
      Sentry.addBreadcrumb({ category, message, data, level: 'info' });
    } else {
      const SentryNative = await import('@sentry/react-native');
      SentryNative.addBreadcrumb({ category, message, data, level: 'info' });
    }
  } catch {
    // Silent fail
  }
}
