/**
 * BetaBanner — global beta-mode warning bar pinned to the top of the viewport.
 *
 * Why
 *   Site is live in production but core features (EV database, Stripe,
 *   PDF generation, payments) are still in development. We need to set
 *   user expectations clearly so accidental visitors aren't surprised
 *   when a checkout or report fails.
 *
 * Behavior
 *   - Always visible — no dismiss button (intentional; this is a status
 *     advisory, not a notification). When core features ship we delete
 *     the component import in app/_layout.tsx.
 *   - Web: portal to document.body via react-dom createPortal so a
 *     transformed ancestor (Stack/ThemeProvider) can't break the
 *     position:fixed anchor — same trick as ReturnToBase.
 *   - Native: absolute-positioned bar with safe-area padding, sits above
 *     the route stack. Native apps aren't shipped yet but we keep the
 *     component cross-platform-safe to avoid surprises during EAS builds.
 *
 * Design
 *   Cockpit warning bar — amber tint background (12% opacity over panel),
 *   amber hairline bottom border, alert icon, mono uppercase HUD-style
 *   message. Single line on desktop, wraps gracefully on mobile.
 *
 * Removal checklist (when core features go live)
 *   1. Remove <BetaBanner /> mount from app/_layout.tsx
 *   2. Remove import of BetaBanner from app/_layout.tsx
 *   3. (Optional) Delete this file + the betaBanner.* keys in locales/
 */

import { VoltColors, VoltSpacing, VoltZ } from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

const createPortalWeb =
    Platform.OS === 'web'
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports
          (require('react-dom') as { createPortal: (n: React.ReactNode, c: Element) => React.ReactNode }).createPortal
        : null;

export default function BetaBanner(): React.ReactElement | null {
    const { t } = useTranslation();

    const message = t('betaBanner.message');
    const tag = t('betaBanner.tag');

    const banner = (
        <View
            // accessible status role so screen readers announce the warning
            accessibilityRole={Platform.OS === 'web' ? ('status' as 'none') : 'alert'}
            accessibilityLiveRegion="polite"
            style={[styles.bar, Platform.OS === 'web' ? (webBar as object) : null]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS keys not in RN ViewStyle
            {...({} as any)}
        >
            <MaterialCommunityIcons
                name="alert-octagon-outline"
                size={14}
                color={VoltColors.warning}
                style={styles.icon}
            />
            <Text style={styles.tag} numberOfLines={1}>
                {tag}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
                {message}
            </Text>
        </View>
    );

    if (Platform.OS === 'web' && createPortalWeb && typeof document !== 'undefined') {
        return createPortalWeb(banner, document.body) as React.ReactElement;
    }

    return banner;
}

// Web-only fixed positioning + subtle backdrop blur for legibility over hero gradients.
const webBar = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: VoltZ.hud, // above modals/toasts so it's always visible
};

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: VoltSpacing.xs,
        paddingVertical: 8,
        paddingHorizontal: VoltSpacing.md,
        backgroundColor: 'rgba(255, 179, 0, 0.12)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255, 179, 0, 0.55)',
        // Native fallback z-index when we mount it directly in the tree
        zIndex: VoltZ.hud,
        ...(Platform.OS !== 'web'
            ? {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  paddingTop: 36, // safe-area approximation for status bar
              }
            : null),
    },
    icon: {
        marginRight: 4,
    },
    tag: {
        fontFamily: Platform.select({ web: 'SpaceMono, ui-monospace, monospace', default: 'SpaceMono' }),
        fontSize: 11,
        letterSpacing: 1.4,
        color: VoltColors.warning,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    message: {
        fontFamily: Platform.select({
            web: 'Inter, system-ui, -apple-system, sans-serif',
            default: 'Inter_500Medium',
        }),
        fontSize: 12,
        lineHeight: 16,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        flexShrink: 1,
    },
});
