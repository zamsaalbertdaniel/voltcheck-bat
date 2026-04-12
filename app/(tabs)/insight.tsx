/**
 * InspectEV — BAT Insight Screen
 * Educational "Know-How" module with:
 * 1. Paradoxul Bateriei (The Battery Paradox) — Athlete Analogy
 * 2. Comparison Table (50k vs 100k km)
 * 3. FAQ Section with expandable answers
 *
 * Design: Dark Mode Tech — Carbon, Neon Green, Cyan accents
 * FAZA 1 — BAT (Battery Analysis Technology)
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltShadow,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── FAQ Item Component ──
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => !prev);
        Animated.spring(rotateAnim, {
            toValue: expanded ? 0 : 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [expanded, rotateAnim]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <TouchableOpacity
            style={[styles.faqItem, expanded && styles.faqItemExpanded]}
            onPress={toggle}
            activeOpacity={0.7}
        >
            <View style={styles.faqHeader}>
                <View style={styles.faqNumberBadge}>
                    <Text style={styles.faqNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.faqQuestion}>{question}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={expanded ? VoltColors.neonGreen : VoltColors.textTertiary}
                    />
                </Animated.View>
            </View>
            {expanded && (
                <View style={styles.faqAnswerContainer}>
                    <View style={styles.faqDivider} />
                    <Text style={styles.faqAnswer}>{answer}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ── Comparison Table Component ──
function ComparisonTable({
    headers,
    rows,
}: {
    headers: string[];
    rows: string[][];
}) {
    return (
        <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
                {headers.map((header, i) => (
                    <View
                        key={i}
                        style={[
                            styles.tableCell,
                            styles.tableHeaderCell,
                            i === 0 && styles.tableCellFirst,
                        ]}
                    >
                        <Text style={styles.tableHeaderText}>{header}</Text>
                    </View>
                ))}
            </View>

            {/* Table Body */}
            {rows.map((row, rowIndex) => (
                <View
                    key={rowIndex}
                    style={[
                        styles.tableRow,
                        rowIndex === rows.length - 1 && styles.tableRowLast,
                        rowIndex % 2 === 1 && styles.tableRowAlt,
                    ]}
                >
                    {row.map((cell, cellIndex) => (
                        <View
                            key={cellIndex}
                            style={[
                                styles.tableCell,
                                cellIndex === 0 && styles.tableCellFirst,
                                // Highlight verdict row
                                rowIndex === rows.length - 1 && cellIndex > 0 && styles.tableCellVerdict,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tableCellText,
                                    cellIndex === 0 && styles.tableCellLabel,
                                    rowIndex === rows.length - 1 && styles.tableCellVerdictText,
                                ]}
                            >
                                {cell}
                            </Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

// ── Main BAT Insight Screen ──
export default function InsightScreen() {
    const { t } = useTranslation();
    const scrollRef = useRef<ScrollView>(null);

    // Animation for header glow
    const glowAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.5],
    });

    // Get table data from i18n
    const headers = t('insight.paradox.headers', { returnObjects: true }) as string[];
    const rows = t('insight.paradox.rows', { returnObjects: true }) as string[][];
    const faqItems = t('insight.faq.items', { returnObjects: true }) as {
        question: string;
        answer: string;
    }[];

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Animated.View style={[styles.headerGlow, { opacity: glowOpacity }]} />
                    <View style={styles.headerIconRow}>
                        <MaterialCommunityIcons
                            name="lightbulb-on"
                            size={40}
                            color={VoltColors.neonGreen}
                        />
                    </View>
                    <Text style={styles.headerTitle}>{t('insight.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('insight.subtitle')}</Text>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>KNOW-HOW</Text>
                    </View>
                </View>

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 1: Paradoxul Bateriei              */}
                {/* ═══════════════════════════════════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('insight.paradox.sectionTitle')}
                    </Text>

                    {/* Analogy Card */}
                    <View style={styles.analogyCard}>
                        <View style={styles.analogyHeader}>
                            <Text style={styles.analogyIcon}>🏃</Text>
                            <Text style={styles.analogyTitle}>
                                {t('insight.paradox.analogyTitle')}
                            </Text>
                        </View>

                        <Text style={styles.analogyNarrative}>
                            {t('insight.paradox.narrative')}
                        </Text>

                        {/* Conclusion callout */}
                        <View style={styles.conclusionBox}>
                            <MaterialCommunityIcons
                                name="lightning-bolt"
                                size={22}
                                color={VoltColors.neonGreen}
                            />
                            <Text style={styles.conclusionText}>
                                {t('insight.paradox.conclusion')}
                            </Text>
                        </View>
                    </View>

                    {/* Comparison Table */}
                    <Text style={styles.tableTitle}>
                        {t('insight.paradox.tableTitle')}
                    </Text>
                    <ComparisonTable headers={headers} rows={rows} />
                </View>

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 2: FAQ                             */}
                {/* ═══════════════════════════════════════════ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('insight.faq.sectionTitle')}
                    </Text>

                    {faqItems.map((item, index) => (
                        <FAQItem
                            key={index}
                            question={item.question}
                            answer={item.answer}
                            index={index}
                        />
                    ))}
                </View>

                {/* ── Footer Branding ── */}
                <View style={styles.footer}>
                    <View style={styles.footerDivider} />
                    <View style={styles.footerBrand}>
                        <Text style={styles.footerBrandIcon}>⚡</Text>
                        <Text style={styles.footerBrandText}>
                            {t('insight.poweredBy')}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: 120, // Account for glass tab bar
    },

    // ── Header ──
    header: {
        alignItems: 'center',
        marginBottom: VoltSpacing.xl,
        paddingBottom: VoltSpacing.lg,
    },
    headerGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: VoltColors.neonGreenGlow,
        top: -40,
    },
    headerIconRow: {
        marginBottom: VoltSpacing.sm,
    },
    headerTitle: {
        fontSize: VoltFontSize.xxl,
        fontWeight: '800',
        color: VoltColors.textPrimary,
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        fontStyle: 'italic',
        marginTop: VoltSpacing.xs,
    },
    headerBadge: {
        marginTop: VoltSpacing.md,
        backgroundColor: VoltColors.neonGreenMuted,
        paddingHorizontal: VoltSpacing.md,
        paddingVertical: VoltSpacing.xs,
        borderRadius: 16,
    },
    headerBadgeText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '800',
        color: VoltColors.neonGreen,
        letterSpacing: 2,
    },

    // ── Sections ──
    section: {
        marginBottom: VoltSpacing.xl,
    },
    sectionTitle: {
        fontSize: VoltFontSize.xl,
        fontWeight: '700',
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.md,
    },

    // ── Analogy Card ──
    analogyCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        marginBottom: VoltSpacing.lg,
        ...VoltShadow.md,
    },
    analogyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: VoltSpacing.md,
    },
    analogyIcon: {
        fontSize: 28,
        marginRight: VoltSpacing.sm,
    },
    analogyTitle: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.neonGreen,
    },
    analogyNarrative: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
        marginBottom: VoltSpacing.md,
    },

    // ── Conclusion Box (Futuristic) ──
    conclusionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 230, 118, 0.08)',
        borderRadius: 8,
        padding: VoltSpacing.lg,
        borderLeftWidth: 3,
        borderLeftColor: VoltColors.neonGreen,
        borderColor: 'rgba(0, 230, 118, 0.3)',
        borderWidth: 1,
        // Neon Glow
        shadowColor: VoltColors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    conclusionText: {
        fontSize: 15,
        fontWeight: '800',
        color: VoltColors.neonGreen,
        marginLeft: VoltSpacing.md,
        flex: 1,
        letterSpacing: 0.5,
    },

    // ── Comparison Table ──
    tableTitle: {
        fontSize: VoltFontSize.lg,
        fontWeight: '600',
        color: VoltColors.textPrimary,
        marginBottom: VoltSpacing.md,
    },
    tableContainer: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.sm,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: VoltColors.bgTertiary,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.divider,
    },
    tableRowLast: {
        borderBottomWidth: 0,
    },
    tableRowAlt: {
        backgroundColor: 'rgba(26, 35, 50, 0.5)',
    },
    tableCell: {
        flex: 1,
        paddingVertical: VoltSpacing.sm + 2,
        paddingHorizontal: VoltSpacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableHeaderCell: {
        paddingVertical: VoltSpacing.md,
    },
    tableCellFirst: {
        flex: 1.3,
        alignItems: 'flex-start',
        paddingLeft: VoltSpacing.md,
    },
    tableCellVerdict: {
        backgroundColor: 'rgba(0, 230, 118, 0.05)',
    },
    tableHeaderText: {
        fontSize: VoltFontSize.xs,
        fontWeight: '700',
        color: VoltColors.neonGreen,
        textAlign: 'center',
    },
    tableCellText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        textAlign: 'center',
    },
    tableCellLabel: {
        fontWeight: '600',
        color: VoltColors.textPrimary,
        textAlign: 'left',
    },
    tableCellVerdictText: {
        fontWeight: '800',
        fontSize: VoltFontSize.sm,
    },

    // ── FAQ Items ──
    faqItem: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.md,
        marginBottom: VoltSpacing.sm,
        borderWidth: 1,
        borderColor: VoltColors.border,
        overflow: 'hidden',
    },
    faqItemExpanded: {
        borderColor: VoltColors.neonGreenMuted,
        ...VoltShadow.sm,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: VoltSpacing.md,
    },
    faqNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: VoltColors.neonGreenMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: VoltSpacing.sm,
    },
    faqNumber: {
        fontSize: VoltFontSize.sm,
        fontWeight: '800',
        color: VoltColors.neonGreen,
    },
    faqQuestion: {
        flex: 1,
        fontSize: VoltFontSize.md,
        fontWeight: '600',
        color: VoltColors.textPrimary,
        marginRight: VoltSpacing.sm,
    },
    faqAnswerContainer: {
        paddingHorizontal: VoltSpacing.md,
        paddingBottom: VoltSpacing.md,
    },
    faqDivider: {
        height: 1,
        backgroundColor: VoltColors.divider,
        marginBottom: VoltSpacing.md,
    },
    faqAnswer: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
    },

    // ── Footer ──
    footer: {
        alignItems: 'center',
        marginTop: VoltSpacing.lg,
        paddingTop: VoltSpacing.lg,
    },
    footerDivider: {
        width: 60,
        height: 2,
        backgroundColor: VoltColors.border,
        marginBottom: VoltSpacing.lg,
        borderRadius: 1,
    },
    footerBrand: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerBrandIcon: {
        fontSize: 18,
        marginRight: VoltSpacing.xs,
    },
    footerBrandText: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textTertiary,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});
