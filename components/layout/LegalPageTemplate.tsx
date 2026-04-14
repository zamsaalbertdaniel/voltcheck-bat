/**
 * InspectEV — Legal Page Template
 * Shared template for privacy, terms, refund, and contact pages.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import VoltFooter from './VoltFooter';

interface LegalPageTemplateProps {
    title: string;
    content: string;
}

export default function LegalPageTemplate({ title, content }: LegalPageTemplateProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={VoltColors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                <Text style={styles.legalText}>{content}</Text>
                <VoltFooter />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: VoltSpacing.md,
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: VoltBorderRadius.full,
        backgroundColor: VoltColors.bgSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: VoltFontSize.lg,
        fontWeight: '700',
        color: VoltColors.textPrimary,
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.lg,
        paddingBottom: VoltSpacing.xxl,
    },
    legalText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
        marginBottom: VoltSpacing.xl,
    },
});
