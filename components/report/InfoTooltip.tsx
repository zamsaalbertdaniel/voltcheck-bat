/**
 * InspectEV — Info Tooltip
 * Small (?) icon that shows an explanatory popover on press.
 * Used in report page next to scores and verdicts.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface InfoTooltipProps {
    title: string;
    explanation: string;
}

export default function InfoTooltip({ title, explanation }: InfoTooltipProps) {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <Pressable
                onPress={() => setVisible(true)}
                hitSlop={8}
                style={styles.trigger}
            >
                <Ionicons name="information-circle-outline" size={18} color={VoltColors.textTertiary} />
            </Pressable>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
                    <View style={styles.popup}>
                        <View style={styles.header}>
                            <Ionicons name="information-circle" size={22} color={VoltColors.neonGreen} />
                            <Text style={styles.title}>{title}</Text>
                        </View>
                        <Text style={styles.explanation}>{explanation}</Text>
                        <Pressable style={styles.closeBtn} onPress={() => setVisible(false)}>
                            <Text style={styles.closeBtnText}>OK</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        padding: 2,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: VoltSpacing.xl,
    },
    popup: {
        backgroundColor: VoltColors.bgTertiary,
        borderRadius: VoltBorderRadius.lg,
        padding: VoltSpacing.lg,
        maxWidth: 400,
        width: '100%',
        borderWidth: 1,
        borderColor: VoltColors.border,
        ...(Platform.OS === 'web'
            ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
            : {}),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: VoltSpacing.sm,
        marginBottom: VoltSpacing.md,
    },
    title: {
        fontSize: VoltFontSize.lg,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
        flex: 1,
    },
    explanation: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 22,
        marginBottom: VoltSpacing.lg,
    },
    closeBtn: {
        backgroundColor: VoltColors.neonGreenMuted,
        borderRadius: VoltBorderRadius.sm,
        paddingVertical: VoltSpacing.sm,
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.neonGreen,
    },
});
