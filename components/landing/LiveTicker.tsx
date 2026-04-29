/**
 * LiveTicker — small mono read-out that simulates live data jitter.
 *
 * Ticks a base value with tiny random deltas every ~1.8s to convey
 * "data is being read" without being obnoxious. Honors prefers-reduced-motion
 * (web) and Platform.OS (native: animations are still cheap, no opt-out).
 *
 * Visual style: SpaceMono caption, neon accent on the value, hairline frame.
 */

import {
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltLetterSpacing,
    VoltSpacing,
} from '@/constants/Theme';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export type LiveTickerSpec = {
    /** Short uppercase label, e.g. "SoH" or "kWh" */
    label: string;
    /** Starting numeric value */
    base: number;
    /** Maximum +/- jitter applied each tick */
    jitter: number;
    /** Decimal places to render. Default 1. */
    decimals?: number;
    /** Suffix appended to the value (e.g. "%", "kWh", "°C"). */
    unit?: string;
    /** Tick interval in ms. Default 1800. */
    intervalMs?: number;
};

function prefersReducedMotion(): boolean {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function format(value: number, decimals: number): string {
    return value.toFixed(decimals);
}

export default function LiveTicker({
    label,
    base,
    jitter,
    decimals = 1,
    unit = '',
    intervalMs = 1800,
}: LiveTickerSpec) {
    const baseRef = useRef(base);
    const [value, setValue] = useState(base);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (prefersReducedMotion()) {
            setValue(base);
            return;
        }
        const id = setInterval(() => {
            // Symmetric jitter, biased to gently revert toward base.
            const drift = (Math.random() - 0.5) * 2 * jitter;
            const reverted = baseRef.current + drift * 0.85;
            setValue(reverted);
            setPulse(true);
            // small flash window — unset after the next tick
            const t = setTimeout(() => setPulse(false), 220);
            return () => clearTimeout(t);
        }, intervalMs);
        return () => clearInterval(id);
    }, [base, jitter, intervalMs]);

    return (
        <View style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <Text style={[styles.value, pulse && styles.valuePulse]}>
                {format(value, decimals)}
                {unit ? <Text style={styles.unit}>{unit}</Text> : null}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: VoltSpacing.xs,
        paddingHorizontal: 8,
        paddingBottom: 4,
        borderTopWidth: 1,
        borderTopColor: VoltColors.neonGreenHairline,
        marginTop: VoltSpacing.xs,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 999,
        backgroundColor: VoltColors.neonGreen,
        opacity: 0.85,
    },
    label: {
        fontFamily: VoltFontFamily.mono,
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        letterSpacing: VoltLetterSpacing.wide,
    },
    value: {
        fontFamily: VoltFontFamily.mono,
        fontSize: VoltFontSize.sm,
        color: VoltColors.textMono,
        letterSpacing: 0.4,
        marginLeft: 'auto',
    },
    valuePulse: {
        color: VoltColors.neonGreen,
    },
    unit: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        marginLeft: 2,
    },
});
