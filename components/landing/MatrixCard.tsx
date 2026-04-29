/**
 * MatrixCard — single tile inside the Data Discovery Matrix.
 *
 * Glassmorphism panel with hairline border that lights up on hover (web) or
 * first-in-view (mobile). Description plays a brief scramble/decode reveal
 * via useScrambleText.
 *
 * The "live" variant (BMS sector) renders a stronger ambient neon glow and a
 * pulsing dot in the corner, signalling that data is extracted live.
 */

import CornerMarks from '@/components/design/CornerMarks';
import HudLabel from '@/components/design/HudLabel';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltMotion,
    VoltSpacing,
} from '@/constants/Theme';
import useScrambleText from '@/hooks/useScrambleText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export type MatrixCardVariant = 'live' | 'history';

export interface MatrixCardProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    description: string;
    /** "live" = BMS extraction (stronger glow), "history" = global registries (subtle) */
    variant: MatrixCardVariant;
    /** Optional HUD tag rendered above the title (e.g. "01", "02"). */
    tag?: string;
}

/**
 * Web hook to detect hover via onMouseEnter/Leave. On native we keep the
 * "decoded" state by triggering once when the card becomes visible.
 *
 * For the first sprint we trigger on press (Pressable handles both web hover
 * and native press). This keeps the API uniform and the bundle small —
 * IntersectionObserver-based auto-trigger can come in a follow-up if desired.
 */
export default function MatrixCard({
    icon,
    title,
    description,
    variant,
    tag,
}: MatrixCardProps) {
    const isLive = variant === 'live';
    const [hovered, setHovered] = useState(false);

    // On web, the first hover plays the decode; subsequent hovers replay it.
    // On native, decode is permanently "on" so the user sees the final text
    // (no hover events on native — pressing replays).
    const scrambleTrigger = Platform.OS === 'web' ? hovered : false;
    const { displayText } = useScrambleText(description, {
        trigger: scrambleTrigger,
        duration: 480,
        tickMs: 28,
    });

    // Icon scale on hover (web only — native press handled by Pressable's pressed state)
    const iconScale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.timing(iconScale, {
            toValue: hovered ? 1.06 : 1,
            duration: VoltMotion.duration.fast,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [hovered, iconScale]);

    // LIVE variant: subtle dot pulse
    const livePulse = useRef(new Animated.Value(0.55)).current;
    useEffect(() => {
        if (!isLive) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(livePulse, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(livePulse, {
                    toValue: 0.55,
                    duration: 1100,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [isLive, livePulse]);

    const baseBorder = hovered ? VoltColors.neonGreen : VoltColors.borderStrong;
    const borderColorWeb = hovered ? VoltColors.neonGreen : VoltColors.border;

    // Web-only glassmorphism: backdrop-filter + transparent panel.
    const webGlass =
        Platform.OS === 'web'
            ? ({
                  backdropFilter: 'blur(14px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                  backgroundColor: hovered
                      ? 'rgba(13, 20, 32, 0.78)'
                      : 'rgba(13, 20, 32, 0.55)',
                  transition: `background-color 220ms ${VoltMotion.easing.standard}, border-color 220ms ${VoltMotion.easing.standard}, box-shadow 220ms ${VoltMotion.easing.standard}, transform 220ms ${VoltMotion.easing.standard}`,
                  boxShadow: hovered
                      ? `0 0 0 1px ${VoltColors.neonGreenHairline}, 0 0 36px rgba(0, 255, 136, ${isLive ? 0.22 : 0.14})`
                      : isLive
                        ? `0 0 24px rgba(0, 255, 136, 0.10)`
                        : 'none',
                  transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                  borderColor: borderColorWeb,
              } as object)
            : null;

    return (
        <Pressable
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            onPressIn={() => setHovered(true)}
            onPressOut={() => setHovered(false)}
            accessibilityRole="text"
            accessibilityLabel={`${title}. ${description}`}
            style={({ pressed }) => [
                styles.card,
                isLive && styles.cardLive,
                { borderColor: baseBorder },
                pressed && styles.cardPressed,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS keys merged into RN style array
                webGlass as any,
            ]}
        >
            {/* HUD frame */}
            <CornerMarks
                color={hovered ? VoltColors.neonGreen : VoltColors.neonGreenHairline}
                size={10}
                thickness={1}
                inset={5}
            />

            {/* Top row: tag + live dot */}
            <View style={styles.topRow}>
                {tag ? (
                    <HudLabel size={VoltFontSize.xs} color={VoltColors.textTertiary}>
                        {tag}
                    </HudLabel>
                ) : (
                    <View />
                )}
                {isLive && (
                    <View style={styles.liveBadge}>
                        <Animated.View
                            style={[
                                styles.liveDot,
                                { opacity: livePulse, transform: [{ scale: livePulse }] },
                            ]}
                        />
                        <HudLabel size={VoltFontSize.xs} color={VoltColors.neonGreen}>
                            LIVE
                        </HudLabel>
                    </View>
                )}
            </View>

            {/* Icon */}
            <Animated.View
                style={[
                    styles.iconWrap,
                    isLive && styles.iconWrapLive,
                    { transform: [{ scale: iconScale }] },
                ]}
            >
                <MaterialCommunityIcons
                    name={icon}
                    size={28}
                    color={isLive ? VoltColors.neonGreen : VoltColors.textPrimary}
                />
            </Animated.View>

            {/* Title — never scrambled (SEO + a11y) */}
            <Text style={styles.title}>{title}</Text>

            {/* Description — scrambles on hover (web). Native shows static. */}
            <Text style={styles.desc}>
                {Platform.OS === 'web' ? displayText : description}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        width: '100%',
        borderWidth: 1,
        borderRadius: VoltBorderRadius.lg,
        backgroundColor: VoltColors.bgPanel,
        paddingHorizontal: VoltSpacing.lg,
        paddingVertical: VoltSpacing.lg,
        gap: VoltSpacing.sm,
        overflow: 'hidden',
        minHeight: 196,
    },
    cardLive: {
        backgroundColor: VoltColors.bgPanelBright,
    },
    cardPressed: {
        opacity: 0.92,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: VoltColors.neonGreen,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: VoltBorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.bgCockpit,
        borderWidth: 1,
        borderColor: VoltColors.border,
        marginTop: VoltSpacing.xs,
    },
    iconWrapLive: {
        borderColor: VoltColors.neonGreenHairline,
        backgroundColor: 'rgba(0, 255, 136, 0.06)',
    },
    title: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        letterSpacing: -0.2,
        marginTop: VoltSpacing.xs,
    },
    desc: {
        fontSize: VoltFontSize.sm,
        fontFamily: VoltFontFamily.regular,
        color: VoltColors.textSecondary,
        lineHeight: 21,
        // Mono on web during scramble would jump width — keep regular but use
        // a tabular-style letter-spacing so scramble glyphs don't shift.
        letterSpacing: 0.1,
    },
});
