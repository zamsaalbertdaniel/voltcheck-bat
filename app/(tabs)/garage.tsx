/**
 * VoltCheck — Garage Screen (Reports Vault)
 * Shows stored reports with TTL badges and risk indicators
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
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
 } from 'react-native';

// Mock data for development
const MOCK_REPORTS = [
  {
    reportId: 'rpt_001',
    vin: '5YJ3E1EA1NF123456',
    make: 'Tesla',
    model: 'Model 3',
    year: 2022,
    level: 2 as const,
    riskScore: 18,
    status: 'completed' as const,
    createdAt: new Date('2026-02-01'),
    expiresAt: new Date('2027-02-01'),
  },
  {
    reportId: 'rpt_002',
    vin: 'WVWZZZE3ZWE654321',
    make: 'Volkswagen',
    model: 'ID.4',
    year: 2023,
    level: 1 as const,
    riskScore: 42,
    status: 'completed' as const,
    createdAt: new Date('2026-01-28'),
    expiresAt: new Date('2026-02-27'),
  },
  {
    reportId: 'rpt_003',
    vin: 'KNAB351ABNA789012',
    make: 'Hyundai',
    model: 'Ioniq 5',
    year: 2021,
    level: 1 as const,
    riskScore: 67,
    status: 'completed' as const,
    createdAt: new Date('2026-01-15'),
    expiresAt: new Date('2026-02-14'),
  },
];

type ReportItem = typeof MOCK_REPORTS[0];

function getDaysLeft(expiresAt: Date): number {
  const diff = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const ReportCard = memo(function ReportCard({ item, onViewReport }: { item: ReportItem; onViewReport: (id: string) => void }) {
  const { t } = useTranslation();
  const daysLeft = getDaysLeft(item.expiresAt);
  const isExpired = daysLeft <= 0;
  const riskColor = getRiskColor(item.riskScore);
  const riskCat = getRiskCategory(item.riskScore);

  return (
    <TouchableOpacity
      style={[styles.card, isExpired && styles.cardExpired]}
      activeOpacity={0.8}
      onPress={() => onViewReport(item.reportId)}
    >
      <View style={[styles.levelBadge, item.level === 2 ? styles.levelBadgePremium : null]}>
        <Text style={styles.levelBadgeText}>
          {item.level === 1 ? t('garage.level1Badge') : t('garage.level2Badge')}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <MaterialCommunityIcons
            name="car-electric"
            size={36}
            color={isExpired ? VoltColors.textTertiary : VoltColors.neonGreen}
          />
        </View>

        <View style={styles.cardCenter}>
          <Text style={[styles.carName, isExpired && styles.textExpired]}>
            {item.make} {item.model}
          </Text>
          <Text style={styles.carYear}>{item.year}</Text>
          <Text style={styles.vinText}>{item.vin}</Text>
          <Text style={styles.dateText}>{item.createdAt.toLocaleDateString('ro-RO')}</Text>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.riskCircle, { borderColor: riskColor }]}>
            <Text style={[styles.riskScore, { color: riskColor }]}>{item.riskScore}</Text>
          </View>
          <Text style={[styles.riskLabel, { color: riskColor }]}>
            {t(`report.riskCategories.${riskCat}`)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.expiryContainer}>
          <Ionicons
            name="time-outline"
            size={14}
            color={isExpired ? VoltColors.error : VoltColors.textTertiary}
          />
          <Text style={[styles.expiryText, isExpired && styles.expiryExpired]}>
            {isExpired ? t('garage.expired') : t('report.expiresIn', { days: daysLeft })}
          </Text>
        </View>
        <TouchableOpacity style={styles.viewButton} onPress={() => onViewReport(item.reportId)}>
          <Text style={styles.viewButtonText}>{t('garage.viewReport')}</Text>
          <Ionicons name="arrow-forward" size={14} color={VoltColors.neonGreen} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function GarageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [reports] = useState(MOCK_REPORTS);

  const handleViewReport = useCallback((reportId: string) => {
    router.push(`/report/${reportId}`);
  }, [router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="garage-variant"
        size={80}
        color={VoltColors.textTertiary}
      />
      <Text style={styles.emptyTitle}>{t('garage.empty')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('garage.title')}</Text>
        <Text style={styles.subtitle}>{t('garage.subtitle')}</Text>
      </View>

      {/* Reports list */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.reportId}
        renderItem={({ item }) => <ReportCard item={item} onViewReport={handleViewReport} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VoltColors.bgPrimary,
  },
  header: {
    paddingHorizontal: VoltSpacing.lg,
    paddingTop: VoltSpacing.xxl,
    paddingBottom: VoltSpacing.md,
  },
  title: {
    fontSize: VoltFontSize.xxl,
    fontWeight: '700',
    color: VoltColors.textPrimary,
  },
  subtitle: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textSecondary,
    marginTop: VoltSpacing.xs,
  },
  listContent: {
    paddingHorizontal: VoltSpacing.lg,
    paddingBottom: 120, // Account for glass tab bar
  },

  // Card
  card: {
    backgroundColor: VoltColors.bgSecondary,
    borderRadius: VoltBorderRadius.lg,
    padding: VoltSpacing.lg,
    marginBottom: VoltSpacing.md,
    borderWidth: 1,
    borderColor: VoltColors.border,
    ...VoltShadow.md,
  },
  cardExpired: {
    opacity: 0.6,
    borderColor: VoltColors.divider,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: {
    marginRight: VoltSpacing.md,
  },
  cardCenter: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'center',
  },
  carName: {
    fontSize: VoltFontSize.lg,
    fontWeight: '700',
    color: VoltColors.textPrimary,
  },
  textExpired: {
    color: VoltColors.textTertiary,
  },
  carYear: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textSecondary,
  },
  vinText: {
    fontSize: VoltFontSize.xs,
    color: VoltColors.textTertiary,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  dateText: {
    fontSize: VoltFontSize.xs,
    color: VoltColors.textTertiary,
    marginTop: 2,
  },

  // Risk circle
  riskCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VoltColors.bgPrimary,
  },
  riskScore: {
    fontSize: VoltFontSize.lg,
    fontWeight: '800',
  },
  riskLabel: {
    fontSize: VoltFontSize.xs,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Level badge
  levelBadge: {
    position: 'absolute',
    top: VoltSpacing.sm,
    right: VoltSpacing.sm,
    backgroundColor: VoltColors.neonGreenMuted,
    paddingHorizontal: VoltSpacing.sm,
    paddingVertical: 2,
    borderRadius: VoltBorderRadius.sm,
  },
  levelBadgePremium: {
    backgroundColor: VoltColors.neonGreenGlow,
  },
  levelBadgeText: {
    fontSize: VoltFontSize.xs,
    fontWeight: '700',
    color: VoltColors.neonGreen,
    textTransform: 'uppercase',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: VoltSpacing.md,
    paddingTop: VoltSpacing.md,
    borderTopWidth: 1,
    borderTopColor: VoltColors.divider,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: VoltSpacing.xs,
  },
  expiryText: {
    fontSize: VoltFontSize.xs,
    color: VoltColors.textTertiary,
  },
  expiryExpired: {
    color: VoltColors.error,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: VoltSpacing.xs,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  viewButtonText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.neonGreen,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: VoltSpacing.xxxl,
  },
  emptyTitle: {
    fontSize: VoltFontSize.md,
    color: VoltColors.textTertiary,
    marginTop: VoltSpacing.md,
    textAlign: 'center',
  },
});
