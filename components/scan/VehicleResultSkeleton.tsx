import Skeleton from '@/components/ui/Skeleton';
import { VoltBorderRadius, VoltColors, VoltShadow, VoltSpacing } from '@/constants/Theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function VehicleResultSkeleton() {
    return (
        <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <View style={styles.vehicleInfo}>
                    <Skeleton width="70%" height={24} style={{ marginBottom: 6 }} />
                    <Skeleton width="40%" height={16} />
                </View>
                <Skeleton width={60} height={24} borderRadius={4} />
            </View>

            <View style={styles.providerRow}>
                <Skeleton width={80} height={20} borderRadius={4} />
                <Skeleton width={90} height={20} borderRadius={4} />
                <Skeleton width={70} height={20} borderRadius={4} />
            </View>

            <View style={styles.recallBanner}>
                <Skeleton width="100%" height={24} borderRadius={4} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    vehicleCard: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        marginTop: VoltSpacing.md,
        marginBottom: VoltSpacing.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...VoltShadow.md,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehicleInfo: {
        flex: 1,
        marginLeft: VoltSpacing.md,
    },
    providerRow: {
        flexDirection: 'row',
        marginTop: VoltSpacing.xl,
        gap: VoltSpacing.sm,
    },
    recallBanner: {
        marginTop: VoltSpacing.lg,
    },
});
