/**
 * BatteryWireframeSVG — isometric EV battery pack, animated cockpit wireframe.
 *
 * Web: inline SVG (GPU-cheap, crisp at any resolution, <3KB over the wire).
 * Native: styled RN View composition — rectangles with neon borders that mimic
 *         the same isometric grid. Falls back gracefully without react-native-svg.
 *
 * Animation language:
 *   - 4×5 cell grid, each cell breathes on its own phase (staggered)
 *   - Horizontal scan line sweeps across the pack every ~6s
 *   - Voltage readouts on the right update on a slow ticker
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import {
  VoltColors,
  VoltFontFamily,
  VoltLetterSpacing,
  VoltMotion,
} from '@/constants/Theme';

type Props = {
  size?: number;
  /** Static voltage readouts (decorative — will be shuffled on a slow ticker). */
  readouts?: Array<{ label: string; value: string }>;
};

const DEFAULT_READOUTS = [
  { label: 'V·NOM', value: '3.82' },
  { label: 'V·MAX', value: '4.11' },
  { label: 'V·MIN', value: '3.74' },
  { label: 'ΔV', value: '0.037' },
  { label: 'T·AVG', value: '24.6°' },
  { label: 'CYC', value: '418' },
];

export default function BatteryWireframeSVG({ size = 460, readouts = DEFAULT_READOUTS }: Props) {
  if (Platform.OS === 'web') {
    return <BatteryWireframeWeb size={size} readouts={readouts} />;
  }
  return <BatteryWireframeNative size={size} readouts={readouts} />;
}

// ──────────────────────────────────────────────────────────────────────────────
//  WEB (inline SVG + CSS keyframes)
// ──────────────────────────────────────────────────────────────────────────────

function BatteryWireframeWeb({ size, readouts }: Required<Pick<Props, 'size'>> & { readouts: NonNullable<Props['readouts']> }) {
  const neon = VoltColors.neonGreen;
  const neonDim = 'rgba(0, 255, 136, 0.25)';
  const neonFaint = 'rgba(0, 255, 136, 0.08)';
  const grid = 'rgba(0, 255, 136, 0.12)';

  // Grid: 5 columns × 4 rows, rendered in isometric projection
  const cells: Array<{ col: number; row: number; delay: number; intensity: number }> = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push({
        col: c,
        row: r,
        delay: (c * 0.15 + r * 0.22) % 1.6,
        intensity: 0.55 + ((c + r) % 3) * 0.15,
      });
    }
  }

  const cellW = 46;
  const cellH = 22;
  const cellDepth = 18;
  const gap = 6;
  const originX = 90;
  const originY = 120;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        maxWidth: '100%',
        aspectRatio: '1 / 1',
      } as React.CSSProperties}
    >
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @keyframes inspectev-cell-pulse {
          0%, 100% { opacity: 0.35; filter: drop-shadow(0 0 0 rgba(0,255,136,0)); }
          50%      { opacity: 1;    filter: drop-shadow(0 0 6px rgba(0,255,136,0.85)); }
        }
        @keyframes inspectev-scan-sweep {
          0%   { transform: translateX(-60px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(500px); opacity: 0; }
        }
        @keyframes inspectev-grid-breathe {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.75; }
        }
        @keyframes inspectev-readout-tick {
          0%, 90%, 100% { opacity: 1; }
          95%           { opacity: 0.35; }
        }
        .inspectev-cell { animation: inspectev-cell-pulse 3.4s ease-in-out infinite; }
        .inspectev-grid { animation: inspectev-grid-breathe 6s ease-in-out infinite; }
        .inspectev-scan { animation: inspectev-scan-sweep 5.2s ${VoltMotion.easing.emphasized} infinite; }
      `}</style>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <svg
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CSS "inset" shorthand on SVG; web only
        style={{ position: 'absolute', inset: 0 } as any}
      >
        <defs>
          <linearGradient id="cell-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={neon} stopOpacity="0.9" />
            <stop offset="100%" stopColor={neon} stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="chassis-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F1624" stopOpacity="1" />
            <stop offset="100%" stopColor="#060A12" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="halo-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={neon} stopOpacity="0.22" />
            <stop offset="70%" stopColor={neon} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient halo */}
        <rect x="0" y="0" width="500" height="500" fill="url(#halo-grad)" />

        {/* Background grid — subtle graph paper */}
        <g className="inspectev-grid" stroke={grid} strokeWidth="0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <g key={`g${i}`}>
              <line x1="0" y1={i * 25} x2="500" y2={i * 25} />
              <line x1={i * 25} y1="0" x2={i * 25} y2="500" />
            </g>
          ))}
        </g>

        {/* Chassis — isometric outer frame */}
        <g>
          {/* Back panel */}
          <polygon
            points="78,108 370,108 398,82 106,82"
            fill="url(#chassis-grad)"
            stroke={neonDim}
            strokeWidth="1"
          />
          {/* Top panel (between cells and back) */}
          <polygon
            points="78,108 370,108 398,82 106,82"
            fill="none"
            stroke={neon}
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
          {/* Main pack shell */}
          <rect
            x="78"
            y="108"
            width="292"
            height="220"
            fill="url(#chassis-grad)"
            stroke={neon}
            strokeWidth="1.4"
          />
          {/* Right bevel */}
          <polygon
            points="370,108 398,82 398,302 370,328"
            fill="#070B14"
            stroke={neon}
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* Faint inner hairlines along top/bottom */}
          <line x1="78" y1="120" x2="370" y2="120" stroke={neonFaint} strokeWidth="1" />
          <line x1="78" y1="316" x2="370" y2="316" stroke={neonFaint} strokeWidth="1" />
        </g>

        {/* Cell grid */}
        <g>
          {cells.map((cell, i) => {
            const x = originX + cell.col * (cellW + gap);
            const y = originY + cell.row * (cellH + gap);
            return (
              <g key={i}>
                {/* cell body */}
                <rect
                  className="inspectev-cell"
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx="2"
                  fill="url(#cell-grad)"
                  stroke={neon}
                  strokeWidth="0.8"
                  opacity={cell.intensity}
                  style={{ animationDelay: `${cell.delay}s` }}
                />
                {/* cell top edge (iso) */}
                <polygon
                  points={`${x},${y} ${x + cellW},${y} ${x + cellW + cellDepth * 0.6},${y - cellDepth * 0.45} ${x + cellDepth * 0.6},${y - cellDepth * 0.45}`}
                  fill="#0A111C"
                  stroke={neon}
                  strokeWidth="0.6"
                  strokeOpacity="0.5"
                />
              </g>
            );
          })}
        </g>

        {/* Terminal labels on left */}
        <g
          fontFamily="SpaceMono, monospace"
          fontSize="9"
          fill={VoltColors.textMono}
          letterSpacing="1.8"
        >
          <text x="28" y="124">+</text>
          <text x="28" y="214">M</text>
          <text x="28" y="304">−</text>
        </g>

        {/* Corner marks — cockpit framing */}
        <g stroke={neon} strokeWidth="1.2" fill="none" opacity="0.75">
          <path d="M10,10 L28,10 M10,10 L10,28" />
          <path d="M490,10 L472,10 M490,10 L490,28" />
          <path d="M10,490 L28,490 M10,490 L10,472" />
          <path d="M490,490 L472,490 M490,490 L490,472" />
        </g>

        {/* HUD crosshair center marker */}
        <g stroke={neonDim} strokeWidth="0.8">
          <line x1="250" y1="440" x2="250" y2="460" />
          <line x1="240" y1="450" x2="260" y2="450" />
        </g>

        {/* Scan line — animated bar sweeping over the pack */}
        <g className="inspectev-scan" opacity="0.85">
          <rect x="0" y="108" width="60" height="220" fill="url(#cell-grad)" opacity="0.35" />
          <line x1="60" y1="108" x2="60" y2="328" stroke={neon} strokeWidth="1.8" />
        </g>

        {/* Readout pins on the right — connector lines to corner badges */}
        <g stroke={neonDim} strokeWidth="0.8" strokeDasharray="2 3">
          <line x1="398" y1="148" x2="470" y2="118" />
          <line x1="398" y1="220" x2="470" y2="220" />
          <line x1="398" y1="288" x2="470" y2="320" />
        </g>
      </svg>

      {/* Readout badges overlaid as real HTML (for crisp text) */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          right: '2%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 14px',
          fontFamily: VoltFontFamily.mono,
          fontSize: 11,
          color: VoltColors.textMono,
          letterSpacing: VoltLetterSpacing.hud,
        } as React.CSSProperties}
      >
        {readouts.map((r) => (
          <div
            key={r.label}
            className="inspectev-readout"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              padding: '4px 8px',
              background: 'rgba(5, 7, 11, 0.72)',
              border: `1px solid ${neonDim}`,
              borderRadius: 4,
              minWidth: 78,
            } as React.CSSProperties}
          >
            <span style={{ opacity: 0.55, fontSize: 9 }}>{r.label}</span>
            <span style={{ color: neon, fontSize: 13, letterSpacing: 1 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
//  NATIVE (RN View composition — simpler but matches aesthetic)
// ──────────────────────────────────────────────────────────────────────────────

function BatteryWireframeNative({ size, readouts }: Required<Pick<Props, 'size'>> & { readouts: NonNullable<Props['readouts']> }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={[nativeStyles.container, { width: size, height: size }]}>
      <View style={nativeStyles.pack}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              nativeStyles.cell,
              {
                opacity,
                backgroundColor: i % 3 === 0 ? VoltColors.neonGreenMuted : 'transparent',
              },
            ]}
          />
        ))}
      </View>
      <View style={nativeStyles.readouts}>
        {readouts.slice(0, 4).map((r) => (
          <View key={r.label} style={nativeStyles.readoutItem}>
            <Text style={nativeStyles.readoutLabel}>{r.label}</Text>
            <Text style={nativeStyles.readoutValue}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const nativeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  pack: {
    width: '85%',
    aspectRatio: 1.3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 12,
    borderWidth: 1.2,
    borderColor: VoltColors.neonGreenHairline,
    borderRadius: 8,
    backgroundColor: VoltColors.bgCockpit,
  },
  cell: {
    width: '18%',
    height: '22%',
    borderWidth: 0.8,
    borderColor: VoltColors.neonGreenHairline,
    borderRadius: 2,
  },
  readouts: {
    position: 'absolute',
    right: 8,
    top: 16,
    gap: 4,
  },
  readoutItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: VoltColors.neonGreenHairline,
    borderRadius: 4,
    backgroundColor: VoltColors.bgPanel,
  },
  readoutLabel: {
    fontSize: 9,
    color: VoltColors.textSecondary,
    fontFamily: VoltFontFamily.mono,
    letterSpacing: 1.5,
  },
  readoutValue: {
    fontSize: 12,
    color: VoltColors.neonGreen,
    fontFamily: VoltFontFamily.mono,
  },
});
