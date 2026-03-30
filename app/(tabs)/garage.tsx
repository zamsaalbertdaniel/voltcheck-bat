/**
 * VoltCheck — Garage Screen (Reports Vault)
 * Shows stored reports with TTL badges and risk indicators
 * Fetches real data from Firestore, filtered by authenticated user
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  VoltBorderRadius,
  VoltColors,
  VoltFontSize,
  VoltShadow,
  VoltSpacing,
  getRiskCategory,
  getRiskColor,
} from '@/constants/Theme';
import { getFirebaseServices } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ReportItem {
  reportId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  level: 1 | 2;
  riskScore: number;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}

function getDaysLeft(expiresAt: Date): number {
  const diff = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Convert Firestore timestamp (or Date, or {seconds}) to JS Date */
function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

const ReportCard = memo(function ReportCard({
  item,
  onViewReport,
}: {
  item: ReportItem;
  onViewReport: (id: string) => void;
}) {
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
      <View
        style={[
          styles.levelBadge,
          item.level === 2 ? styles.levelBadgePremium : null,
        ]}
      >
        <Text style={styles.levelBadgeText}>
          {item.level === 1
            ? t('garage.level1Badge')
            : t('garage.level2Badge')}
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
          <Text style={styles.dateText}>
            {item.createdAt.toLocaleDateString('ro-RO')}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.riskCircle, { borderColor: riskColor }]}>
            <Text style={[styles.riskScore, { color: riskColor }]}>
              {item.riskScore}
            </Text>
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
          <Text
            style={[styles.expiryText, isExpired && styles.expiryExpired]}
          >
            {isExpired
              ? t('garage.expired')
              : t('report.expiresIn', { days: daysLeft })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onViewReport(item.reportId)}
        >
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
  const { user } = useAuthStore();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch reports from Firestore ──────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const { db } = await getFirebaseServices();

        if (Platform.OS === 'web') {
          const { collection, query, where, orderBy, onSnapshot } =
            await import('firebase/firestore');

          const q = query(
            collection(db, 'reports'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
          );

          unsubscribe = onSnapshot(q, (snapshot) => {
            const items: ReportItem[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                reportId: doc.id,
                vin: d.vin || '',
                make: d.vehicleMeta?.make || d.make || '',
                model: d.vehicleMeta?.model || d.model || '',
                year: d.vehicleMeta?.year || d.year || 0,
                level: d.level || 1,
                riskScore: d.riskScore ?? 0,
                status: d.status || 'processing',
                createdAt: toDate(d.createdAt),
                expiresAt: toDate(d.expiresAt),
              };
            });
            setReports(items);
            setIsLoading(false);
            setError(null);
          }, (err) => {
            // eslint-disable-next-line no-console
            console.error('[Garage] Firestore listen error:', err);
            setError(t('errors.generic') || 'Eroare la încărcarea rapoartelor.');
            setIsLoading(false);
          });
        } else {
          // Native: @react-native-firebase/firestore
          unsubscribe = (db as any)
            .collection('reports')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(
              (snapshot: any) => {
                const items: ReportItem[] = snapshot.docs.map((doc: any) => {
                  const d = doc.data();
                  return {
                    reportId: doc.id,
                    vin: d.vin || '',
                    make: d.vehicleMeta?.make || d.make || '',
                    model: d.vehicleMeta?.model || d.model || '',
                    year: d.vehicleMeta?.year || d.year || 0,
                    level: d.level || 1,
                    riskScore: d.riskScore ?? 0,
                    status: d.status || 'processing',
                    createdAt: toDate(d.createdAt),
                    expiresAt: toDate(d.expiresAt),
                  };
                });
                setReports(items);
                setIsLoading(false);
                setError(null);
              },
              (err: any) => {
                // eslint-disable-next-line no-console
                console.error('[Garage] Firestore listen error:', err);
                setError(t('errors.generic') || 'Eroare la încărcarea rapoartelor.');
                setIsLoading(false);
              },
            );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Garage] Init error:', err);
        setError(t('errors.generic') || 'Eroare la încărcarea rapoartelor.');
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewReport = useCallback(
    (reportId: string) => {
      router.push(`/report/${reportId}`);
    },
    [router],
  );

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

      {/* Loading */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={VoltColors.neonGreen} />
          <Text style={styles.loadingText}>
            {t('common.loading') || 'Se încarcă...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={VoltColors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.reportId}
          renderItem={({ item }) => (
            <ReportCard item={item} onViewReport={handleViewReport} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          ListEmptyComponent={renderEmpty}
        />
      )}
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
    paddingBottom: 120,
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
    zIndex: 1,
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
  loadingText: {
    fontSize: VoltFontSize.sm,
    color: VoltColors.textTertiary,
    marginTop: VoltSpacing.md,
  },
  errorText: {
    fontSize: VoltFontSize.md,
    color: VoltColors.error,
    marginTop: VoltSpacing.md,
    textAlign: 'center',
  },
});
