/**
 * InspectEV — Web Vitals Reporter
 * Captures Core Web Vitals (LCP, CLS, INP, FCP, TTFB) and pipes them
 * to Sentry as custom measurements + breadcrumbs.
 *
 * Web-only module — no-op on native platforms.
 * Uses the `web-vitals` library (included as transitive dependency via @sentry/react).
 */

import { Platform } from 'react-native';

// Type for web-vitals metric (avoids importing types on native)
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Initialize Web Vitals tracking.
 * Call once at app boot — only activates on web platform.
 * Metrics are sent to Sentry as measurements on the active transaction.
 */
export function initWebVitals(): void {
  if (Platform.OS !== 'web') return;

  // Dynamic import — web-vitals is not bundled on native
  import('web-vitals')
    .then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
      const reportToSentry = (metric: WebVitalMetric): void => {
        import('@sentry/react')
          .then((Sentry) => {
            // Determine the unit based on metric type
            // CLS is unitless (layout shift score), others are milliseconds
            const unit = metric.name === 'CLS' ? '' : 'millisecond';

            // Send as Sentry measurement — appears in Performance → Web Vitals
            Sentry.setMeasurement(metric.name, metric.value, unit);

            // Add breadcrumb for additional context in error reports
            Sentry.addBreadcrumb({
              category: 'web-vital',
              message: `${metric.name}: ${Math.round(metric.value * 100) / 100} (${metric.rating})`,
              level: 'info',
              data: {
                name: metric.name,
                value: metric.value,
                rating: metric.rating,
                delta: metric.delta,
                id: metric.id,
              },
            });
          })
          .catch(() => {
            // Sentry not available — silent fail
          });
      };

      // Register all Core Web Vitals observers
      onLCP(reportToSentry);   // Largest Contentful Paint (loading)
      onCLS(reportToSentry);   // Cumulative Layout Shift (stability)
      onINP(reportToSentry);   // Interaction to Next Paint (responsiveness)
      onFCP(reportToSentry);   // First Contentful Paint (initial render)
      onTTFB(reportToSentry);  // Time to First Byte (server response)
    })
    .catch(() => {
      // web-vitals not available — silent fail
      // This can happen if the library is not installed or tree-shaken
    });
}
