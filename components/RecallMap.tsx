/**
 * InspectEV — Recall Map
 *
 * Visual top-down car schematic that highlights which components are affected
 * by open manufacturer recalls. Each zone pulses softly when affected.
 *
 * Layout (top-down view, car facing up):
 *
 *              ┌─── front ───┐
 *              │   airbags   │
 *   lights ─┐  │   steering  │  ┌─ lights
 *           │  ├─────────────┤  │
 *   wheel   │  │             │  │  wheel
 *    (FL)   │  │   BATTERY   │  │   (FR)
 *           │  │   (center)  │  │
 *           │  │             │  │
 *   wheel   │  ├─────────────┤  │  wheel
 *    (RL)   │  │    motor    │  │   (RR)
 *           │  │   software  │  │
 *              │   hvac      │
 *              └─── rear ────┘
 *
 * Zones are absolutely positioned View rectangles. When affected,
 * a zone glows with the severity color and shows a small count badge.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { VoltBorderRadius, VoltColors, VoltFontSize, VoltSpacing } from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buildZoneSummary, Recall, RecallZone } from '@/utils/recallClassifier';

// ═══════════════════════════════════════════
// Types & constants
// ═══════════════════════════════════════════

interface RecallMapProps {
    recalls: Recall[];
}

const SEVERITY_COLORS = {
    low: VoltColors.neonGreen,
    medium: VoltColors.riskMedium,
    high: VoltColors.riskHigh,
    critical: VoltColors.riskCritical,
} as const;

/** Icon assignment per zone for the legend + list rows */
const ZONE_ICONS: Record<RecallZone, { lib: 'mci' | 'ion'; name: string }> = {
    battery:    { lib: 'mci', name: 'car-battery' },
    motor:      { lib: 'mci', name: 'engine' },
    brakes:     { lib: 'mci', name: 'car-brake-abs' },
    airbags:    { lib: 'mci', name: 'airbag' },
    steering:   { lib: 'mci', name: 'steering' },
    suspension: { lib: 'mci', name: 'car-traction-control' },
    electrical: { lib: 'mci', name: 'flash' },
    lights:     { lib: 'mci', name: 'car-light-high' },
    software:   { lib: 'mci', name: 'chip' },
    structure:  { lib: 'mci', name: 'car-door' },
    hvac:       { lib: 'mci', name: 'air-conditioner' },
    other:      { lib: 'ion', name: 'help-circle' },
};

// ═══════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════

export default function RecallMap({ recalls }: RecallMapProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const summary = useMemo(() => buildZoneSummary(recalls || []), [recalls]);
    const { byZone, affectedZones, overallSeverity, classified } = summary;

    // Pulsing animation shared across all affected zones
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (affectedZones.length === 0) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
                Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [affectedZones.length, pulse]);

    // No recalls → render a compact "all clear" card
    if (!recalls || recalls.length === 0) {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="shield-check" size={22} color={VoltColors.success} />
                    <Text style={styles.cardTitle}>{t('report.recallMap.title')}</Text>
                </View>
                <View style={styles.clearState}>
                    <MaterialCommunityIcons name="check-circle" size={32} color={VoltColors.success} />
                    <Text style={styles.clearText}>{t('report.recallMap.noRecalls')}</Text>
                </View>
            </View>
        );
    }

    const overallColor = SEVERITY_COLORS[overallSeverity];

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="map-marker-radius" size={22} color={overallColor} />
                <Text style={styles.cardTitle}>{t('report.recallMap.title')}</Text>
                <View style={[styles.countBadge, { backgroundColor: overallColor + '22', borderColor: overallColor }]}>
                    <Text style={[styles.countBadgeText, { color: overallColor }]}>{recalls.length}</Text>
                </View>
            </View>

            <Text style={styles.subtitle}>
                {t('report.recallMap.subtitle', { count: affectedZones.length })}
            </Text>

            {/* Car schematic */}
            <View style={styles.diagramWrapper}>
                <CarDiagram byZone={byZone} pulse={pulse} />
            </View>

            {/* Legend (zones affected only) */}
            <View style={styles.legendGrid}>
                {affectedZones.map((zone) => {
                    const z = byZone[zone];
                    const color = SEVERITY_COLORS[z.maxSeverity];
                    const icon = ZONE_ICONS[zone];
                    return (
                        <View key={zone} style={[styles.legendChip, { borderColor: color }]}>
                            {icon.lib === 'mci' ? (
                                <MaterialCommunityIcons name={icon.name as any} size={14} color={color} />
                            ) : (
                                <Ionicons name={icon.name as any} size={14} color={color} />
                            )}
                            <Text style={[styles.legendLabel, { color }]}>
                                {t(`report.recallMap.zones.${zone}`)}
                            </Text>
                            <Text style={[styles.legendCount, { color }]}>×{z.count}</Text>
                        </View>
                    );
                })}
            </View>

            {/* Expand / collapse */}
            <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpanded((e) => !e)}
                activeOpacity={0.7}
            >
                <Text style={styles.expandText}>
                    {expanded ? t('report.recallMap.collapse') : t('report.recallMap.expand')}
                </Text>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={VoltColors.neonGreen}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.recallList}>
                    {classified.map((r, idx) => {
                        const color = SEVERITY_COLORS[r.severity];
                        const icon = ZONE_ICONS[r.zone];
                        return (
                            <View key={`${r.campaignNumber}-${idx}`} style={styles.recallRow}>
                                <View style={[styles.recallIcon, { borderColor: color }]}>
                                    {icon.lib === 'mci' ? (
                                        <MaterialCommunityIcons name={icon.name as any} size={16} color={color} />
                                    ) : (
                                        <Ionicons name={icon.name as any} size={16} color={color} />
                                    )}
                                </View>
                                <View style={styles.recallBody}>
                                    <Text style={styles.recallComponent}>{r.component || t('report.recallMap.unknownComponent')}</Text>
                                    {!!r.summary && (
                                        <Text style={styles.recallSummary} numberOfLines={3}>
                                            {r.summary}
                                        </Text>
                                    )}
                                    <View style={styles.recallMeta}>
                                        {!!r.campaignNumber && (
                                            <Text style={styles.recallMetaText}>#{r.campaignNumber}</Text>
                                        )}
                                        {!!r.date && (
                                            <Text style={styles.recallMetaText}>{r.date}</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

// ═══════════════════════════════════════════
// Car diagram (absolute-positioned zones)
// ═══════════════════════════════════════════

/** All dimensions in the same coordinate space — kept simple so it scales. */
const DIAGRAM_W = 220;
const DIAGRAM_H = 340;
const BODY_X = 30;
const BODY_W = DIAGRAM_W - BODY_X * 2;   // 160
const BODY_Y = 10;
const BODY_H = DIAGRAM_H - BODY_Y * 2;   // 320

interface CarDiagramProps {
    byZone: Record<RecallZone, { zone: RecallZone; count: number; maxSeverity: 'low' | 'medium' | 'high' | 'critical' }>;
    pulse: Animated.Value;
}

function CarDiagram({ byZone, pulse }: CarDiagramProps) {
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

    return (
        <View style={[diagramStyles.wrap, { width: DIAGRAM_W, height: DIAGRAM_H }]}>
            {/* Car body silhouette */}
            <LinearGradient
                colors={['#1A2332', '#0A0E17']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    position: 'absolute',
                    left: BODY_X,
                    top: BODY_Y,
                    width: BODY_W,
                    height: BODY_H,
                    borderRadius: 50,
                    borderWidth: 1,
                    borderColor: VoltColors.border,
                }}
            />
            {/* Windshield hint (front glass) */}
            <View style={{
                position: 'absolute',
                left: BODY_X + 14,
                top: BODY_Y + 48,
                width: BODY_W - 28,
                height: 34,
                borderRadius: 20,
                backgroundColor: 'rgba(41, 182, 246, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(41, 182, 246, 0.25)',
            }} />
            {/* Rear glass hint */}
            <View style={{
                position: 'absolute',
                left: BODY_X + 14,
                top: DIAGRAM_H - BODY_Y - 82,
                width: BODY_W - 28,
                height: 34,
                borderRadius: 20,
                backgroundColor: 'rgba(41, 182, 246, 0.05)',
                borderWidth: 1,
                borderColor: 'rgba(41, 182, 246, 0.18)',
            }} />

            {/* Wheels */}
            <Wheel top={60} left={BODY_X - 12} />
            <Wheel top={60} left={DIAGRAM_W - BODY_X - 10} />
            <Wheel top={DIAGRAM_H - 60 - 28} left={BODY_X - 12} />
            <Wheel top={DIAGRAM_H - 60 - 28} left={DIAGRAM_W - BODY_X - 10} />

            {/* Front headlights */}
            <Zone
                top={BODY_Y + 4}
                left={BODY_X + 10}
                width={40}
                height={16}
                zone="lights"
                byZone={byZone}
                pulseOpacity={opacity}
            />
            <Zone
                top={BODY_Y + 4}
                left={BODY_X + BODY_W - 50}
                width={40}
                height={16}
                zone="lights"
                byZone={byZone}
                pulseOpacity={opacity}
                suppressDuplicate
            />

            {/* Airbags / steering — front seats area */}
            <Zone
                top={BODY_Y + 86}
                left={BODY_X + 16}
                width={BODY_W - 32}
                height={36}
                zone="airbags"
                byZone={byZone}
                pulseOpacity={opacity}
                label="SRS"
            />

            {/* Battery — center (largest zone for EV) */}
            <Zone
                top={BODY_Y + 130}
                left={BODY_X + 14}
                width={BODY_W - 28}
                height={90}
                zone="battery"
                byZone={byZone}
                pulseOpacity={opacity}
                label="HV"
            />

            {/* Motor / software — rear */}
            <Zone
                top={BODY_Y + 228}
                left={BODY_X + 16}
                width={BODY_W - 32}
                height={42}
                zone="motor"
                byZone={byZone}
                pulseOpacity={opacity}
                label="MOT"
            />

            {/* Rear lights */}
            <Zone
                top={DIAGRAM_H - BODY_Y - 20}
                left={BODY_X + 10}
                width={40}
                height={14}
                zone="lights"
                byZone={byZone}
                pulseOpacity={opacity}
                suppressDuplicate
            />
            <Zone
                top={DIAGRAM_H - BODY_Y - 20}
                left={BODY_X + BODY_W - 50}
                width={40}
                height={14}
                zone="lights"
                byZone={byZone}
                pulseOpacity={opacity}
                suppressDuplicate
            />

            {/* Suspension markers on wheels (overlay on wheel positions) */}
            <ZoneDot top={70} left={BODY_X - 4} zone="suspension" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={70} left={DIAGRAM_W - BODY_X - 4} zone="suspension" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={DIAGRAM_H - 60 - 20} left={BODY_X - 4} zone="brakes" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={DIAGRAM_H - 60 - 20} left={DIAGRAM_W - BODY_X - 4} zone="brakes" byZone={byZone} pulseOpacity={opacity} />

            {/* HVAC + electrical + structure + steering — we don't own dedicated
                rectangles for these so they show as small corner markers */}
            <ZoneDot top={BODY_Y + 44} left={BODY_X + 6} zone="steering" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={BODY_Y + 44} left={BODY_X + BODY_W - 18} zone="electrical" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={BODY_Y + 276} left={BODY_X + 6} zone="software" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={BODY_Y + 276} left={BODY_X + BODY_W - 18} zone="hvac" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={BODY_Y + 176} left={BODY_X + 4} zone="structure" byZone={byZone} pulseOpacity={opacity} />
            <ZoneDot top={BODY_Y + 176} left={BODY_X + BODY_W - 16} zone="other" byZone={byZone} pulseOpacity={opacity} />
        </View>
    );
}

// ─── Zone (rectangle) ───

interface ZoneProps {
    top: number;
    left: number;
    width: number;
    height: number;
    zone: RecallZone;
    byZone: Record<RecallZone, { count: number; maxSeverity: 'low' | 'medium' | 'high' | 'critical' }>;
    pulseOpacity: Animated.AnimatedInterpolation<number>;
    label?: string;
    /** If true, don't draw the count badge (used when a zone is drawn multiple times) */
    suppressDuplicate?: boolean;
}

function Zone({ top, left, width, height, zone, byZone, pulseOpacity, label, suppressDuplicate }: ZoneProps) {
    const affected = byZone[zone];
    const color = affected ? SEVERITY_COLORS[affected.maxSeverity] : VoltColors.border;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top,
                left,
                width,
                height,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: affected ? color : VoltColors.border,
                backgroundColor: affected ? color + '22' : 'rgba(148,163,184,0.04)',
                opacity: affected ? pulseOpacity : 1,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {label && (
                <Text style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: affected ? color : VoltColors.textTertiary,
                    letterSpacing: 0.5,
                }}>
                    {label}
                </Text>
            )}
            {affected && !suppressDuplicate && (
                <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: VoltColors.bgPrimary }}>
                        {affected.count}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

// ─── Zone dot (small indicator for sub-zones sharing no rectangle) ───

interface ZoneDotProps {
    top: number;
    left: number;
    zone: RecallZone;
    byZone: Record<RecallZone, { count: number; maxSeverity: 'low' | 'medium' | 'high' | 'critical' }>;
    pulseOpacity: Animated.AnimatedInterpolation<number>;
}

function ZoneDot({ top, left, zone, byZone, pulseOpacity }: ZoneDotProps) {
    const affected = byZone[zone];
    if (!affected) return null;
    const color = SEVERITY_COLORS[affected.maxSeverity];

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top,
                left,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: color,
                borderWidth: 2,
                borderColor: VoltColors.bgPrimary,
                opacity: pulseOpacity,
            }}
        />
    );
}

// ─── Wheel ───

function Wheel({ top, left }: { top: number; left: number }) {
    return (
        <View style={{
            position: 'absolute',
            top,
            left,
            width: 22,
            height: 36,
            borderRadius: 6,
            backgroundColor: '#0A0E17',
            borderWidth: 1,
            borderColor: VoltColors.border,
        }} />
    );
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
    card: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginBottom: VoltSpacing.md,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.sm,
    },
    cardTitle: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        flex: 1,
    },
    countBadge: {
        minWidth: 28,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    countBadgeText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        marginBottom: VoltSpacing.md,
    },
    diagramWrapper: {
        alignItems: 'center',
        marginVertical: VoltSpacing.md,
    },
    legendGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VoltSpacing.sm,
        marginTop: VoltSpacing.sm,
    },
    legendChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: VoltBorderRadius.full,
        borderWidth: 1,
        backgroundColor: VoltColors.bgTertiary,
    },
    legendLabel: {
        fontSize: VoltFontSize.xs,
        fontWeight: '600',
    },
    legendCount: {
        fontSize: VoltFontSize.xs,
        fontWeight: '800',
    },
    expandButton: {
        marginTop: VoltSpacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: VoltSpacing.sm,
        borderRadius: VoltBorderRadius.md,
        backgroundColor: VoltColors.bgTertiary,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    expandText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.neonGreen,
        fontWeight: '600',
    },
    recallList: {
        marginTop: VoltSpacing.md,
        gap: VoltSpacing.sm,
    },
    recallRow: {
        flexDirection: 'row',
        gap: VoltSpacing.sm,
        padding: VoltSpacing.sm,
        backgroundColor: VoltColors.bgTertiary,
        borderRadius: VoltBorderRadius.md,
        borderWidth: 1,
        borderColor: VoltColors.border,
    },
    recallIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.bgSecondary,
    },
    recallBody: {
        flex: 1,
        gap: 2,
    },
    recallComponent: {
        fontSize: VoltFontSize.sm,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    recallSummary: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
        lineHeight: 16,
    },
    recallMeta: {
        flexDirection: 'row',
        gap: VoltSpacing.md,
        marginTop: 2,
    },
    recallMetaText: {
        fontSize: 10,
        color: VoltColors.textTertiary,
        fontFamily: 'SpaceMono',
    },
    clearState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: VoltSpacing.lg,
        gap: VoltSpacing.sm,
    },
    clearText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
    },
});

const diagramStyles = StyleSheet.create({
    wrap: {
        position: 'relative',
    },
});
