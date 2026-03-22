/**
 * VoltCheck — Report Detail Screen
 * Full report view: risk score gauge, vehicle info, alerts, battery data
 *
 * Pas 2: Real Firestore fetch + loading/error states
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
import { subscribeToReportStatus, USE_MOCK_DATA } from '@/services/cloudFunctions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ═══════════════════════════════════════════
// MOCK DATA (used only when USE_MOCK_DATA is true)
// ═══════════════════════════════════════════
const MOCK_REPORT = {
    reportId: 'rpt_001',
    vin: '5YJ3E1EA1NF123456',
    vehicleMeta: { make: 'Tesla', model: 'Model 3 Long Range' },
    year: 2022,
    market: 'US',
    batteryType: 'NCA',
    level: 2,
    riskScore: 32,
    riskCategory: 'MEDIUM' as const,
    status: 'completed' as const,
    statusDetails: 'completed',
    createdAt: '2026-02-10',
    expiresAt: '2027-02-10',
    // Level 1 data
    titleStatus: 'Clean',
    assessmentType: 'risk_assessment',
    confidence: 85,
    sourceTraceability: [
        { tag: 'nhtsa_decode', labelKey: 'report.sources.nhtsaDecode', contribution: 30, sourceType: 'official_public_data' },
        { tag: 'provider_history', labelKey: 'report.sources.providerHistory', contribution: 45, sourceType: 'partner_database' },
        { tag: 'live_battery_telematics', labelKey: 'report.sources.liveBatteryTelematics', contribution: 10, sourceType: 'live_telemetry' }
    ],
    mileageKm: 45200,
    accidentCount: 0,
    ownerCount: 2,
    recallCount: 1,
    mileageDiscrepancy: false,
    nominalCapacityKwh: 82,
    // Level 2 data
    stateOfHealth: 91.4,
    usableCapacityKwh: 72.8,
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
    pdfUrl: null as string | null,
};

type ReportData = typeof MOCK_REPORT;
type ScreenState = 'loading' | 'processing' | 'ready' | 'error';

export default function ReportScreen() {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [screenState, setScreenState] = useState<ScreenState>('loading');
    const [report, setReport] = useState<ReportData | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [pipelineStep, setPipelineStep] = useState('');

    const gaugeAnim = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    // ═══════════════════════════════════════════
    // DATA FETCHING
    // ═══════════════════════════════════════════
    useEffect(() => {
        if (!id) {
            setScreenState('error');
            setErrorMessage('ID raport lipsă');
            return;
        }

        // Mock mode: use static data
        if (USE_MOCK_DATA) {
            setReport({ ...MOCK_REPORT, reportId: id });
            setScreenState('ready');
            return;
        }

        // Real mode: subscribe to Firestore report doc
        const unsubscribe = subscribeToReportStatus(
            id,
            (status) => {
                if (status.status === 'completed') {
                    // Report is ready — fetch full document from Firestore
                    fetchReportDoc(id);
                } else if (status.status === 'failed') {
                    setScreenState('error');
                    setErrorMessage(status.failureReason || 'Generarea raportului a eșuat');
                } else if (status.status === 'manual_review_needed') {
                    setScreenState('error');
                    setErrorMessage(
                        'Raportul necesită verificare manuală. ' +
                        'Datele VIN nu au putut fi obținute automat. ' +
                        'Echipa noastră va reveni cu un răspuns în cel mai scurt timp.'
                    );
                } else {
                    // Still processing
                    setScreenState('processing');
                    setPipelineStep(getStatusLabel(status.statusDetails));
                }
            },
            (err) => {
                setScreenState('error');
                setErrorMessage(err.message || 'Eroare la încărcarea raportului');
            }
        );

        return () => unsubscribe();
    }, [id]);

    // Fetch the full report document from Firestore
    async function fetchReportDoc(reportId: string) {
        try {
            const { Platform } = await import('react-native');
            const { getFirebaseServices } = await import('@/services/firebase');
            const { db } = await getFirebaseServices();

            let data: any;

            if (Platform.OS === 'web') {
                const { doc, getDoc } = await import('firebase/firestore');
                const snap = await getDoc(doc(db, 'reports', reportId));
                if (!snap.exists()) {
                    throw new Error('Raportul nu a fost găsit');
                }
                data = snap.data();
            } else {
                const rnFirestore = await import('@react-native-firebase/firestore');
                const snap = await rnFirestore.default()
                    .collection('reports')
                    .doc(reportId)
                    .get();
                if (!snap.exists) {
                    throw new Error('Raportul nu a fost găsit');
                }
                data = snap.data();
            }

            // Map Firestore data to report shape
            setReport({
                reportId: data.reportId || reportId,
                vin: data.vin || '',
                vehicleMeta: data.vehicleMeta || { make: '', model: '' },
                year: data.vehicle?.year || data.vehicleMeta?.year || 0,
                market: data.market || 'EU',
                batteryType: data.batteryType || 'Unknown',
                level: data.level || 1,
                riskScore: data.riskScore || 0,
                riskCategory: data.riskCategory || 'LOW',
                status: data.status,
                statusDetails: data.statusDetails || '',
                createdAt: data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
                expiresAt: data.expiresAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
                titleStatus: data.titleStatus || 'Unknown',
                mileageKm: data.mileageKm || 0,
                accidentCount: data.accidentCount || 0,
                ownerCount: data.ownerCount || 0,
                recallCount: data.recallCount || 0,
                mileageDiscrepancy: data.mileageDiscrepancy || false,
                nominalCapacityKwh: data.nominalCapacityKwh || 0,
                stateOfHealth: data.stateOfHealth || 0,
                usableCapacityKwh: data.usableCapacityKwh || 0,
                cycleCount: data.cycleCount || 0,
                dcChargingRatio: data.dcChargingRatio || 0,
                acChargingRatio: data.acChargingRatio || 0,
                cellBalanceStatus: data.cellBalanceStatus || 'Unknown',
                riskFactors: data.riskFactors || [],
                recommendation: data.recommendation || '',
                assessmentType: data.assessmentType || 'risk_assessment',
                confidence: data.confidence || 0,
                sourceTraceability: data.sourceTraceability || [],
                pdfUrl: data.pdfUrl || null,
            });
            setScreenState('ready');
        } catch (err: any) {
            setScreenState('error');
            setErrorMessage(err.message || 'Eroare la încărcarea raportului');
        }
    }

    // ═══════════════════════════════════════════
    // ANIMATIONS (when report is ready)
    // ═══════════════════════════════════════════
    useEffect(() => {
        if (screenState === 'ready' && report) {
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
        }
    }, [screenState, report]);

    // ═══════════════════════════════════════════
    // LOADING STATE
    // ═══════════════════════════════════════════
    if (screenState === 'loading') {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                <Text style={styles.loadingText}>Se încarcă raportul...</Text>
            </View>
        );
    }

    // ═══════════════════════════════════════════
    // PROCESSING STATE (pipeline running)
    // ═══════════════════════════════════════════
    if (screenState === 'processing') {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color={VoltColors.neonGreen} />
                <Text style={styles.processingTitle}>Se generează raportul</Text>
                <Text style={styles.processingStep}>{pipelineStep}</Text>
                <Text style={styles.processingHint}>Durează ~30 secunde</Text>
            </View>
        );
    }

    // ═══════════════════════════════════════════
    // ERROR STATE
    // ═══════════════════════════════════════════
    if (screenState === 'error' || !report) {
        return (
            <View style={styles.centeredContainer}>
                <Ionicons name="alert-circle" size={64} color={VoltColors.error} />
                <Text style={styles.errorTitle}>Eroare</Text>
                <Text style={styles.errorMessage}>{errorMessage || 'Raportul nu a putut fi încărcat'}</Text>
            </View>
        );
    }

    // ═══════════════════════════════════════════
    // REPORT READY — FULL UI
    // ═══════════════════════════════════════════
    const riskColor = getRiskColor(report.riskScore);
    const riskCat = getRiskCategory(report.riskScore);
    const make = report.vehicleMeta?.make || '';
    const model = report.vehicleMeta?.model || '';

    function getAssessmentBadge(type: string) {
        switch (type) {
            case 'battery_verified': return { label: t('report.assessment.batteryVerified'), bg: '#0D2818', text: VoltColors.success };
            case 'battery_estimated': return { label: t('report.assessment.batteryEstimated'), bg: '#1A2332', text: VoltColors.warning };
            default: return { label: t('report.assessment.riskAssessment'), bg: '#1E293B', text: VoltColors.textSecondary };
        }
    }
    const badge = getAssessmentBadge(report.assessmentType || 'risk_assessment');

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Demo Mode Banner */}
            {USE_MOCK_DATA && (
                <View style={styles.demoBanner}>
                    <Text style={styles.demoBannerText}>🧪 Date Demo</Text>
                </View>
            )}

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

                <View style={[styles.assessmentBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.assessmentBadgeText, { color: badge.text }]}>
                        {badge.label}
                    </Text>
                </View>
            </Animated.View>

            {/* Vehicle Info Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="car-electric" size={22} color={VoltColors.neonGreen} />
                    <Text style={styles.cardTitle}>{t('report.sections.vehicleInfo')}</Text>
                </View>
                <View style={styles.infoGrid}>
                    <InfoRow label="Producător" value={`${make} ${model}`} />
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
                        {report.assessmentType === 'battery_verified' && (
                            <View style={styles.liveBadge}>
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
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
            {report.riskFactors.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="warning" size={22} color={VoltColors.warning} />
                        <Text style={styles.cardTitle}>{t('report.sections.alerts')}</Text>
                        <View style={styles.alertCount}>
                            <Text style={styles.alertCountText}>{report.riskFactors.length}</Text>
                        </View>
                    </View>

                    {report.riskFactors.map((factor: any, index: number) => (
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
            )}

            {/* Recommendation Card */}
            {report.recommendation && (
                <View style={[styles.card, styles.recommendationCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="bulb" size={22} color={VoltColors.neonGreen} />
                        <Text style={styles.cardTitle}>{t('report.sections.recommendation')}</Text>
                    </View>
                    <Text style={styles.recommendationText}>{report.recommendation}</Text>
                </View>
            )}

            {/* Traceability Card */}
            {(report.sourceTraceability && report.sourceTraceability.length > 0) && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="shield-check" size={22} color={VoltColors.neonGreen} />
                        <Text style={styles.cardTitle}>{t('report.sections.dataSources')}</Text>
                    </View>

                    <View style={styles.confidenceRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.confidenceLabel}>{t('report.assessmentTypeLabel')}:</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.confidenceLabel}>{t('report.completeness')}:</Text>
                        </View>
                    </View>
                    <View style={[styles.confidenceRow, { paddingTop: 0, marginTop: -VoltSpacing.md }]}>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.assessmentBadge, { backgroundColor: badge.bg, marginTop: 4, alignSelf: 'flex-start' }]}>
                                <Text style={[styles.assessmentBadgeText, { color: badge.text }]}>
                                    {badge.label}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={styles.confidenceValue}>{report.confidence} / 100</Text>
                        </View>
                    </View>
                    
                    <View style={styles.traceGrid}>
                        {report.sourceTraceability.map((src: any) => (
                            <View key={src.tag} style={styles.traceChip}>
                                <View style={styles.traceInfo}>
                                    <Text style={styles.traceLabel}>{t(src.labelKey)}</Text>
                                    <View style={styles.sourceTypeBadge}>
                                        <Text style={styles.sourceTypeText}>{t(`report.sourceTypes.${src.sourceType}`)}</Text>
                                    </View>
                                </View>
                                <Text style={styles.traceContrib}>+{src.contribution}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

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

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getStatusLabel(statusDetails: string): string {
    const labels: Record<string, string> = {
        payment_confirmed: 'Plată confirmată',
        decoding_vin: 'Se decodifică VIN-ul...',
        searching_eu_databases: 'Se caută în bazele de date EU...',
        searching_global_databases: 'Se caută în bazele de date globale...',
        calculating_risk_score: 'Se calculează scorul de risc...',
        generating_pdf: 'Se generează PDF-ul...',
        uploading_report: 'Se finalizează raportul...',
    };
    return labels[statusDetails] || 'Se procesează...';
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

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

    // Centered states (loading, processing, error)
    centeredContainer: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: VoltSpacing.xl,
        gap: VoltSpacing.md,
    },
    loadingText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
    },
    processingTitle: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    processingStep: {
        fontSize: VoltFontSize.md,
        color: VoltColors.neonGreen,
        textAlign: 'center',
    },
    processingHint: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontStyle: 'italic',
    },
    errorTitle: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.error,
    },
    errorMessage: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        textAlign: 'center',
    },

    // Demo banner
    demoBanner: {
        backgroundColor: 'rgba(255, 179, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 179, 0, 0.3)',
        borderRadius: VoltBorderRadius.md,
        padding: VoltSpacing.sm,
        marginBottom: VoltSpacing.md,
        alignItems: 'center',
    },
    demoBannerText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '700',
        color: VoltColors.warning,
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
    
    // Assessment Badge
    assessmentBadge: {
        marginTop: VoltSpacing.md,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: 6,
        borderRadius: VoltBorderRadius.full,
    },
    assessmentBadgeText: {
        fontSize: VoltFontSize.sm,
        fontWeight: '600',
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

    // Traceability
    confidenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0D1623',
        padding: VoltSpacing.md,
        borderRadius: VoltBorderRadius.sm,
        marginBottom: VoltSpacing.md,
    },
    confidenceLabel: {
        fontSize: VoltFontSize.sm,
        fontWeight: '500',
        color: VoltColors.textSecondary,
    },
    confidenceValue: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.success,
    },
    traceGrid: {
        gap: VoltSpacing.sm,
    },
    traceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: VoltColors.bgSecondary,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: 12,
        borderRadius: VoltBorderRadius.sm,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    traceInfo: {
        flex: 1,
        gap: 6,
    },
    sourceTypeBadge: {
        backgroundColor: '#1E293B',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: VoltBorderRadius.sm,
    },
    sourceTypeText: {
        fontSize: 10,
        color: VoltColors.textTertiary,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    traceLabel: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textPrimary,
    },
    traceContrib: {
        fontSize: VoltFontSize.sm,
        fontWeight: '700',
        color: VoltColors.neonGreen,
        marginLeft: VoltSpacing.sm,
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
