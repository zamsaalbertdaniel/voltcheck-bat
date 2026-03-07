/**
 * VoltCheck — Report Detail Screen
 * Full report view: risk score gauge, vehicle info, alerts, battery data
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
    getRiskCategory,
    getRiskColor,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Mock report for demo
const MOCK_REPORT = {
    reportId: 'rpt_001',
    vin: '5YJ3E1EA1NF123456',
    make: 'Tesla',
    model: 'Model 3 Long Range',
    year: 2022,
    market: 'US',
    batteryType: 'NCA',
    level: 2,
    riskScore: 32,
    riskCategory: 'MEDIUM' as const,
    createdAt: '2026-02-10',
    expiresAt: '2027-02-10',
    // Level 1 data
    titleStatus: 'Clean',
    mileageKm: 45200,
    accidentCount: 0,
    ownerCount: 2,
    recallCount: 1,
    mileageDiscrepancy: false,
    // Level 2 data
    stateOfHealth: 91.4,
    usableCapacityKwh: 72.8,
    nominalCapacityKwh: 82,
    cycleCount: 380,
    dcChargingRatio: 0.35,
    acChargingRatio: 0.65,
    cellBalanceStatus: 'Balanced',
    // Risk factors
    riskFactors: [
        {
            id: 'above_average_mileage',
            label: 'Above Average Mileage',
            severity: 'medium',
            weight: 8,
            description: '45,200 km is above average for a 4-year-old EV.',
        },
        {
            id: 'predicted_degradation_moderate',
            label: 'Moderate Degradation Expected',
            severity: 'medium',
            weight: 6,
            description: 'NCA battery at 4 years — predicted SoH ~91%.',
        },
        {
            id: 'active_recalls',
            label: '1 Active Recall',
            severity: 'medium',
            weight: 5,
            description: 'Vehicle has 1 unresolved manufacturer recall.',
        },
    ],
    recommendation:
        'Stare acceptabilă cu observații. Verificați condițiile de garanție și istoricul service.',
};

export default function ReportScreen() {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams();
    const report = MOCK_REPORT; // TODO: fetch from Firestore

    const gaugeAnim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(gaugeAnim, {
                toValue: report.riskScore / 100,
                duration: 1500,
                useNativeDriver: false,
            }),
            Animated.timing(fadeIn, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const riskColor = getRiskColor(report.riskScore);
    const riskCat = getRiskCategory(report.riskScore);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Risk Score Hero */}
            <Animated.View style={[styles.heroSection, { opacity: fadeIn }]}>
                <View style={styles.gaugeContainer}>
                    <Animated.View
                        style={[
                            styles.gaugeRing,
                            {
                                borderColor: riskColor,
                                transform: [{
                                    rotate: gaugeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                }],
                            },
                        ]}
                    />
                    <View style={[styles.gaugeInner, { borderColor: riskColor }]}>
                        <Text style={[styles.gaugeScore, { color: riskColor }]}>
                            {report.riskScore}
                        </Text>
                        <Text style={styles.gaugeLabel}>/100</Text>
                    </View>
                </View>
                <Text style={[styles.riskCategoryText, { color: riskColor }]}>
                    {t(`report.riskCategories.${riskCat}`)}
                </Text>
                <Text style={styles.riskTitle}>{t('report.riskScore')}</Text>
            </Animated.View>

            {/* Vehicle Info Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="car-electric" size={22} color={VoltColors.neonGreen} />
                    <Text style={styles.cardTitle}>{t('report.sections.vehicleInfo')}</Text>
                </View>
                <View style={styles.infoGrid}>
                    <InfoRow label="Producător" value={`${report.make} ${report.model}`} />
                    <InfoRow label="An" value={report.year.toString()} />
                    <InfoRow label="Piață" value={report.market} />
                    <InfoRow label="Baterie" value={`${report.batteryType} • ${report.nominalCapacityKwh} kWh`} />
                    <InfoRow label="Kilometraj" value={`${report.mileageKm.toLocaleString()} km`} />
                    <InfoRow label="Title Status" value={report.titleStatus} valueColor={report.titleStatus === 'Clean' ? VoltColors.success : VoltColors.error} />
                    <InfoRow label="Proprietari" value={report.ownerCount.toString()} />
                    <InfoRow label="Accidente" value={report.accidentCount.toString()} valueColor={report.accidentCount === 0 ? VoltColors.success : VoltColors.error} />
                </View>
            </View>

            {/* Battery Health Card (Level 2) */}
            {report.level === 2 && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="battery-heart" size={22} color={VoltColors.neonGreen} />
                        <Text style={styles.cardTitle}>{t('report.sections.batteryHealth')}</Text>
                        <View style={styles.liveBadge}>
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    {/* SoH gauge */}
                    <View style={styles.sohSection}>
                        <View style={styles.sohBarBg}>
                            <View style={[styles.sohBarFill, {
                                width: `${report.stateOfHealth}%`,
                                backgroundColor: report.stateOfHealth > 80 ? VoltColors.success : report.stateOfHealth > 70 ? VoltColors.warning : VoltColors.error,
                            }]} />
                        </View>
                        <View style={styles.sohLabels}>
                            <Text style={styles.sohLabel}>{t('report.battery.soh')}</Text>
                            <Text style={[styles.sohValue, {
                                color: report.stateOfHealth > 80 ? VoltColors.success : VoltColors.warning,
                            }]}>
                                {report.stateOfHealth}%
                            </Text>
                        </View>
                    </View>

                    <View style={styles.batteryGrid}>
                        <BatteryMetric
                            icon="lightning-bolt"
                            label={t('report.battery.capacity')}
                            value={`${report.usableCapacityKwh} kWh`}
                            subValue={`din ${report.nominalCapacityKwh} kWh`}
                        />
                        <BatteryMetric
                            icon="sync"
                            label={t('report.battery.cycles')}
                            value={report.cycleCount.toString()}
                            subValue="cicluri complete"
                        />
                        <BatteryMetric
                            icon="flash"
                            label={t('report.battery.dcRatio')}
                            value={`${(report.dcChargingRatio * 100).toFixed(0)}%`}
                            subValue={report.dcChargingRatio > 0.6 ? '⚠️ Peste limită' : '✅ Normal'}
                        />
                        <BatteryMetric
                            icon="tune"
                            label={t('report.battery.cellBalance')}
                            value={t(`report.cellStatus.${report.cellBalanceStatus}`)}
                            subValue=""
                        />
                    </View>
                </View>
            )}

            {/* Detected Alerts Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="warning" size={22} color={VoltColors.warning} />
                    <Text style={styles.cardTitle}>{t('report.sections.alerts')}</Text>
                    <View style={styles.alertCount}>
                        <Text style={styles.alertCountText}>{report.riskFactors.length}</Text>
                    </View>
                </View>

                {report.riskFactors.map((factor, index) => (
                    <View key={factor.id} style={[
                        styles.alertItem,
                        index === report.riskFactors.length - 1 && styles.alertItemLast,
                    ]}>
                        <View style={[styles.alertDot, {
                            backgroundColor:
                                factor.severity === 'critical' ? VoltColors.error :
                                    factor.severity === 'high' ? VoltColors.riskHigh :
                                        factor.severity === 'medium' ? VoltColors.warning :
                                            VoltColors.success,
                        }]} />
                        <View style={styles.alertInfo}>
                            <Text style={styles.alertLabel}>{factor.label}</Text>
                            <Text style={styles.alertDesc}>{factor.description}</Text>
                        </View>
                        <View style={styles.alertWeight}>
                            <Text style={styles.alertWeightText}>+{factor.weight}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Recommendation Card */}
            <View style={[styles.card, styles.recommendationCard]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="bulb" size={22} color={VoltColors.neonGreen} />
                    <Text style={styles.cardTitle}>{t('report.sections.recommendation')}</Text>
                </View>
                <Text style={styles.recommendationText}>{report.recommendation}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="download" size={20} color={VoltColors.neonGreen} />
                    <Text style={styles.actionText}>{t('report.downloadPdf')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-social" size={20} color={VoltColors.neonGreen} />
                    <Text style={styles.actionText}>{t('report.shareReport')}</Text>
                </TouchableOpacity>
            </View>

            {/* Report metadata */}
            <View style={styles.metadata}>
                <Text style={styles.metaText}>Report ID: {report.reportId}</Text>
                <Text style={styles.metaText}>Generat: {report.createdAt}</Text>
                <Text style={styles.metaText}>Expiră: {report.expiresAt}</Text>
            </View>
        </ScrollView>
    );
}

function InfoRow({ label, value, valueColor }: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
                {value}
            </Text>
        </View>
    );
}

function BatteryMetric({ icon, label, value, subValue }: {
    icon: string;
    label: string;
    value: string;
    subValue: string;
}) {
    return (
        <View style={styles.batteryMetric}>
            <MaterialCommunityIcons name={icon as any} size={24} color={VoltColors.neonGreen} />
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            {subValue ? <Text style={styles.metricSub}>{subValue}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    content: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.lg,
        paddingBottom: VoltSpacing.xxxl,
    },

    // Hero
    heroSection: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.xl,
    },
    gaugeContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 6,
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
    },
    gaugeInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 3,
        backgroundColor: VoltColors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gaugeScore: {
        fontSize: VoltFontSize.xxxl,
        fontWeight: '800',
    },
    gaugeLabel: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        marginTop: -4,
    },
    riskCategoryText: {
        fontSize: VoltFontSize.lg,
        fontWeight: '800',
        marginTop: VoltSpacing.md,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    riskTitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        marginTop: VoltSpacing.xs,
    },

    // Cards
    card: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginBottom: VoltSpacing.md,
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.sm,
    },
    recommendationCard: {
        borderColor: VoltColors.neonGreenMuted,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.md,
    },
    cardTitle: {
        flex: 1,
        fontSize: VoltFontSize.md,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Vehicle info grid
    infoGrid: {},
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: VoltSpacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.divider,
    },
    infoLabel: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
    },
    infoValue: {
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
        color: VoltColors.textPrimary,
    },

    // SoH bar
    sohSection: {
        marginBottom: VoltSpacing.lg,
    },
    sohBarBg: {
        height: 12,
        backgroundColor: VoltColors.bgInput,
        borderRadius: 6,
        overflow: 'hidden',
    },
    sohBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    sohLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: VoltSpacing.xs,
    },
    sohLabel: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
    },
    sohValue: {
        fontSize: VoltFontSize.lg,
        fontWeight: '800',
    },

    // Battery grid
    batteryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VoltSpacing.md,
    },
    batteryMetric: {
        width: '47%',
        backgroundColor: VoltColors.bgPrimary,
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.md,
        alignItems: 'center',
        gap: VoltSpacing.xs,
    },
    metricValue: {
        fontSize: VoltFontSize.xl,
        fontWeight: '800',
        color: VoltColors.textPrimary,
    },
    metricLabel: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
        textAlign: 'center',
    },
    metricSub: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
    },

    // Live badge
    liveBadge: {
        backgroundColor: VoltColors.error,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 2,
        borderRadius: VoltBorderRadius.full,
    },
    liveText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '800',
        color: VoltColors.white,
    },

    // Alerts
    alertCount: {
        backgroundColor: VoltColors.warning,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertCountText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '800',
        color: VoltColors.textOnGreen,
    },
    alertItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: VoltSpacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.divider,
        gap: VoltSpacing.md,
    },
    alertItemLast: {
        borderBottomWidth: 0,
    },
    alertDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    alertInfo: {
        flex: 1,
    },
    alertLabel: {
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
        color: VoltColors.textPrimary,
    },
    alertDesc: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    alertWeight: {
        backgroundColor: VoltColors.bgInput,
        paddingHorizontal: VoltSpacing.sm,
        paddingVertical: 2,
        borderRadius: VoltBorderRadius.sm,
    },
    alertWeightText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.warning,
    },

    // Recommendation
    recommendationText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 22,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: VoltSpacing.md,
        marginVertical: VoltSpacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.md,
        paddingVertical: VoltSpacing.md,
        gap: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: VoltColors.neonGreenMuted,
    },
    actionText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
        color: VoltColors.neonGreen,
    },

    // Metadata
    metadata: {
        alignItems: 'center',
        paddingVertical: VoltSpacing.lg,
        gap: VoltSpacing.xs,
    },
    metaText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
        fontFamily: 'SpaceMono',
    },
});
