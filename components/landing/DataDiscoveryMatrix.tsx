/**
 * DataDiscoveryMatrix — landing-page data discovery section.
 *
 * Two-sector cockpit grid:
 *   - SECTOR 01 · LIVE      (BMS-extracted data — 4 cards, brighter glow)
 *   - SECTOR 02 · HISTORY   (Global registries — 2 cards, subdued)
 *
 * Layout
 *   - Mobile (<600px):   one column, LIVE stacked above HISTORY.
 *   - Tablet (600-899):  two columns within each sector.
 *   - Desktop (≥900):    sectors side-by-side (LIVE left, HISTORY right),
 *                        each with its own internal 2-col grid.
 *
 * Typography & motion follow Stage E2 cockpit primitives. Hover/press on a
 * card triggers a brief scramble/decode reveal of the description (web only;
 * native shows static text).
 */

import CornerMarks from '@/components/design/CornerMarks';
import { type LiveTickerSpec } from '@/components/landing/LiveTicker';
import MatrixCard, { type MatrixCardVariant } from '@/components/landing/MatrixCard';
import SectorHeader from '@/components/landing/SectorHeader';
import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltLetterSpacing,
    VoltSpacing,
} from '@/constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

const TABLET_BREAKPOINT = 600;
const DESKTOP_BREAKPOINT = 900;

type Card = {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    titleKey: string;
    titleFallback: string;
    descKey: string;
    descFallback: string;
    tag: string;
    /** Simulated live-data ticker spec — only on LIVE cards. */
    liveMetric?: LiveTickerSpec;
};

const LIVE_CARDS: Card[] = [
    {
        icon: 'battery-heart-variant',
        titleKey: 'landing.matrix.live.soh.title',
        titleFallback: 'Sănătatea Bateriei (SoH)',
        descKey: 'landing.matrix.live.soh.desc',
        descFallback:
            'Procentul real de viață rămasă în celulele chimice, extras direct din creierul mașinii.',
        tag: '01',
        liveMetric: { label: 'SoH', base: 89.4, jitter: 0.12, decimals: 1, unit: '%' },
    },
    {
        icon: 'battery-charging-medium',
        titleKey: 'landing.matrix.live.capacity.title',
        titleFallback: 'Capacitate Degradată',
        descKey: 'landing.matrix.live.capacity.desc',
        descFallback:
            'Câți kWh mai poate reține bateria fizic, comparativ cu ziua ieșirii din fabrică.',
        tag: '02',
        liveMetric: { label: 'kWh', base: 78.2, jitter: 0.08, decimals: 1, unit: '/82' },
    },
    {
        icon: 'speedometer',
        titleKey: 'landing.matrix.live.odometer.title',
        titleFallback: 'Kilometraj Securizat',
        descKey: 'landing.matrix.live.odometer.desc',
        descFallback:
            'Rulajul intern criptat în computerul motorului, imposibil de manipulat vizual.',
        tag: '03',
        liveMetric: { label: 'BMS·km', base: 47218, jitter: 0, decimals: 0, unit: '', intervalMs: 2400 },
    },
    {
        icon: 'lightning-bolt-circle',
        titleKey: 'landing.matrix.live.stress.title',
        titleFallback: 'Stres & Încărcare',
        descKey: 'landing.matrix.live.stress.desc',
        descFallback:
            'Tiparul de utilizare — raportul dintre încărcările lente sănătoase și DC Fast-Charge.',
        tag: '04',
        liveMetric: { label: 'DC·ratio', base: 14.0, jitter: 0.4, decimals: 1, unit: '%' },
    },
];

const HISTORY_CARDS: Card[] = [
    {
        icon: 'car-wrench',
        titleKey: 'landing.matrix.history.damage.title',
        titleFallback: 'Daune & Accidente',
        descKey: 'landing.matrix.history.damage.desc',
        descFallback:
            'Rapoarte internaționale despre coliziuni, reparații ascunse și costuri estimate.',
        tag: '05',
    },
    {
        icon: 'shield-alert-outline',
        titleKey: 'landing.matrix.history.legal.title',
        titleFallback: 'Alerte de Legalitate',
        descKey: 'landing.matrix.history.legal.desc',
        descFallback:
            'Verificări instantanee în registrele poliției — mașina nu este raportată furată.',
        tag: '06',
    },
];

/**
 * SectorStrand — decorative "connection" link between the SectorHeader and
 * the card grid. Desktop/tablet only; hidden on mobile to keep the small
 * viewport uncluttered. Visual: a short vertical hairline with a glowing
 * neon node in the middle and a dotted continuation.
 */
function SectorStrand({ variant }: { variant: MatrixCardVariant }) {
    const isLive = variant === 'live';
    const accent = isLive ? VoltColors.neonGreen : VoltColors.borderStrong;
    return (
        <View pointerEvents="none" style={strandStyles.wrap}>
            <View style={[strandStyles.line, { backgroundColor: isLive ? VoltColors.neonGreenHairline : VoltColors.border }]} />
            <View style={[strandStyles.node, { backgroundColor: accent, borderColor: accent }]} />
            <View
                style={[
                    strandStyles.line,
                    {
                        backgroundColor: isLive ? VoltColors.neonGreenHairline : VoltColors.border,
                    },
                ]}
            />
        </View>
    );
}

const strandStyles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        marginVertical: 2,
        gap: 3,
    },
    line: {
        width: 1,
        height: 8,
    },
    node: {
        width: 6,
        height: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
});

/**
 * Sector — frames a group of cards with HUD corner marks. The "live" variant
 * also breathes a subtle ambient glow (4s loop) to draw the eye first on
 * the reading-direction (left on desktop, top on mobile).
 */
function Sector({
    variant,
    children,
}: {
    variant: MatrixCardVariant;
    children: React.ReactNode;
}) {
    const isLive = variant === 'live';
    const ambient = useRef(new Animated.Value(isLive ? 0.35 : 0)).current;

    useEffect(() => {
        if (!isLive) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(ambient, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: false,
                }),
                Animated.timing(ambient, {
                    toValue: 0.35,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: false,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [isLive, ambient]);

    // Web-only ambient glow via box-shadow opacity interpolation
    const shadowOpacity = ambient.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.18],
    });

    return (
        <Animated.View
            style={[
                styles.sector,
                isLive && styles.sectorLive,
                isLive && Platform.OS !== 'web'
                    ? {
                          shadowColor: VoltColors.neonGreen,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity,
                          shadowRadius: 24,
                      }
                    : null,
                isLive && Platform.OS === 'web'
                    ? // Static glow on web — animated box-shadow on every frame is expensive.
                      // The pulsing dots in SectorHeader + LIVE badge already convey motion.
                      ({
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- web-only CSS not in RN ViewStyle
                          boxShadow: `0 0 0 1px ${VoltColors.neonGreenHairline}, 0 0 48px rgba(0, 255, 136, 0.10)`,
                      } as unknown as object)
                    : null,
            ]}
        >
            <CornerMarks
                color={isLive ? VoltColors.neonGreenHairline : VoltColors.border}
                size={14}
                thickness={1.2}
                inset={8}
            />
            {children}
        </Animated.View>
    );
}

export default function DataDiscoveryMatrix() {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
    const isTablet = Platform.OS === 'web' && width >= TABLET_BREAKPOINT;

    const renderCard = (card: Card, variant: MatrixCardVariant) => (
        <View
            key={card.tag}
            style={[
                styles.gridItem,
                isTablet && styles.gridItemTablet,
            ]}
        >
            <MatrixCard
                icon={card.icon}
                title={t(card.titleKey, card.titleFallback)}
                description={t(card.descKey, card.descFallback)}
                variant={variant}
                tag={card.tag}
                liveMetric={card.liveMetric}
            />
        </View>
    );

    return (
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
            {/* Section heading */}
            <View style={styles.headWrap}>
                <Text style={styles.eyebrow}>
                    {t('landing.matrix.eyebrow', 'DATA DISCOVERY MATRIX')}
                </Text>
                <Text style={styles.heading}>
                    {t(
                        'landing.matrix.heading',
                        'Ce poți afla — în date, nu în vorbe.',
                    )}
                </Text>
                <Text style={styles.lead}>
                    {t(
                        'landing.matrix.lead',
                        'Două surse, un singur raport: extragere live direct din computerul mașinii și verificări încrucișate în registrele globale.',
                    )}
                </Text>
            </View>

            <View style={[styles.matrix, isDesktop && styles.matrixDesktop]}>
                {/* SECTOR 01 — LIVE (stânga pe desktop / sus pe mobile) */}
                <Sector variant="live">
                    <SectorHeader
                        label={t('landing.matrix.live.label', 'SECTOR 01 · LIVE')}
                        title={t(
                            'landing.matrix.live.title',
                            'Extragere LIVE din BMS',
                        )}
                        subtitle={t(
                            'landing.matrix.live.subtitle',
                            'Battery Management System · OAuth Smartcar',
                        )}
                        variant="live"
                    />
                    {isTablet ? <SectorStrand variant="live" /> : null}
                    <View style={[styles.grid, isTablet && styles.gridTablet]}>
                        {LIVE_CARDS.map((c) => renderCard(c, 'live'))}
                    </View>
                </Sector>

                {/* SECTOR 02 — HISTORY (dreapta pe desktop / jos pe mobile) */}
                <Sector variant="history">
                    <SectorHeader
                        label={t(
                            'landing.matrix.history.label',
                            'SECTOR 02 · HISTORY',
                        )}
                        title={t(
                            'landing.matrix.history.title',
                            'Istoric Global verificat',
                        )}
                        subtitle={t(
                            'landing.matrix.history.subtitle',
                            'Registre internaționale · NHTSA · Poliție',
                        )}
                        variant="history"
                    />
                    {isTablet ? <SectorStrand variant="history" /> : null}
                    <View style={[styles.grid, isTablet && styles.gridTablet]}>
                        {HISTORY_CARDS.map((c) => renderCard(c, 'history'))}
                    </View>
                </Sector>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: VoltSpacing.xxl,
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
    },
    sectionDesktop: {
        paddingHorizontal: VoltSpacing.xl,
        paddingTop: VoltSpacing.xxxl,
    },
    headWrap: {
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.xl,
        maxWidth: 760,
    },
    eyebrow: {
        fontSize: VoltFontSize.xs,
        fontFamily: VoltFontFamily.mono,
        color: VoltColors.neonGreen,
        letterSpacing: VoltLetterSpacing.hud,
        textTransform: 'uppercase',
    },
    heading: {
        fontSize: VoltFontSize.xxl,
        fontFamily: VoltFontFamily.display,
        color: VoltColors.textPrimary,
        letterSpacing: VoltLetterSpacing.tight,
        lineHeight: 38,
    },
    lead: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
    },
    matrix: {
        gap: VoltSpacing.xl,
    },
    matrixDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: VoltSpacing.xl,
    },
    sector: {
        flex: 1,
        minWidth: 0,
        position: 'relative',
        padding: VoltSpacing.lg,
        borderRadius: VoltBorderRadius.xl,
        borderWidth: 1,
        borderColor: VoltColors.border,
        backgroundColor: 'rgba(7, 10, 17, 0.4)',
    },
    sectorLive: {
        borderColor: VoltColors.neonGreenHairline,
        backgroundColor: 'rgba(0, 255, 136, 0.025)',
    },
    sectorDesktop: {
        flex: 1,
    },
    grid: {
        gap: VoltSpacing.md,
    },
    gridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VoltSpacing.md,
    },
    gridItem: {
        width: '100%',
    },
    gridItemTablet: {
        // Two cols within a sector, leaving room for the 16px gap.
        flexBasis: '48%',
        flexGrow: 1,
        minWidth: 240,
    },
});
