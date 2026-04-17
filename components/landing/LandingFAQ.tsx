/**
 * InspectEV — Landing FAQ Section
 *
 * 6 questions in an accordion (one open at a time), rendered on the public
 * landing page. Visible to all visitors (no auth required).
 *
 * Features:
 *   - i18n RO/EN via flat keys landing.faq.q{1..6} / landing.faq.a{1..6}
 *   - Inline internal links in answers via [[label|href]] syntax.
 *     Example: "Pachetul [[Premium|/modele-compatibile]] adaugă..."
 *   - Exports getFaqJsonLd() — FAQPage schema for SEO Rich Snippets.
 *   - Reduce-motion friendly: minimal entrance animation (200ms fade).
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontFamily,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const DESKTOP_BREAKPOINT = 900;
const FAQ_COUNT = 6;

interface Segment {
    text: string;
    href?: string;
}

/** Parse `[[label|href]]` markers into alternating plain/link segments. */
function parseSegments(raw: string): Segment[] {
    const regex = /\[\[([^|]+)\|([^\]]+)\]\]/g;
    const out: Segment[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
        if (m.index > last) out.push({ text: raw.slice(last, m.index) });
        out.push({ text: m[1], href: m[2] });
        last = m.index + m[0].length;
    }
    if (last < raw.length) out.push({ text: raw.slice(last) });
    return out.length > 0 ? out : [{ text: raw }];
}

/** Strip link markers to plain text — used for JSON-LD Answer.text. */
function stripMarkers(raw: string): string {
    return raw.replace(/\[\[([^|]+)\|[^\]]+\]\]/g, '$1');
}

/**
 * Build the FAQPage JSON-LD schema from the active i18n translations.
 * Inject into <Head> on the landing page so crawlers (Google, ChatGPT,
 * Perplexity) can surface our answers as Rich Snippets / direct answers.
 */
export function getFaqJsonLd(t: TFunction): object {
    const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
        '@type': 'Question',
        name: t(`landing.faq.q${i + 1}`),
        acceptedAnswer: {
            '@type': 'Answer',
            text: stripMarkers(t(`landing.faq.a${i + 1}`)),
        },
    }));
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items,
    };
}

export default function LandingFAQ() {
    const { t } = useTranslation();
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

    const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
        id: i + 1,
        q: t(`landing.faq.q${i + 1}`),
        a: t(`landing.faq.a${i + 1}`),
    }));

    return (
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
            <Text style={styles.title} accessibilityRole="header">
                {t('landing.faq.title', 'Întrebări frecvente')}
            </Text>
            <Text style={styles.subtitle}>
                {t('landing.faq.subtitle', 'Răspunsuri rapide înainte să cumperi.')}
            </Text>

            <View style={styles.list}>
                {items.map((it, idx) => (
                    <FaqItem
                        key={it.id}
                        question={it.q}
                        answerRaw={it.a}
                        isOpen={openIdx === idx}
                        onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
                    />
                ))}
            </View>
        </View>
    );
}

interface FaqItemProps {
    question: string;
    answerRaw: string;
    isOpen: boolean;
    onToggle: () => void;
}

function FaqItem({ question, answerRaw, isOpen, onToggle }: FaqItemProps) {
    const router = useRouter();
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
    }, [isOpen, rotation]);

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value * 180}deg` }],
    }));

    const segments = parseSegments(answerRaw);

    return (
        <View style={[styles.card, isOpen && styles.cardOpen]}>
            <Pressable
                onPress={onToggle}
                style={styles.header}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={question}
            >
                <Text style={styles.question}>{question}</Text>
                <Animated.View style={chevronStyle}>
                    <Ionicons
                        name="chevron-down"
                        size={22}
                        color={isOpen ? VoltColors.neonGreen : VoltColors.textSecondary}
                    />
                </Animated.View>
            </Pressable>

            {isOpen && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.answerContainer}
                >
                    <Text style={styles.answer}>
                        {segments.map((seg, i) =>
                            seg.href ? (
                                <Text
                                    key={i}
                                    style={styles.link}
                                    onPress={() => router.push(seg.href as never)}
                                    accessibilityRole="link"
                                >
                                    {seg.text}
                                </Text>
                            ) : (
                                <Text key={i}>{seg.text}</Text>
                            )
                        )}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: VoltSpacing.xxl,
        width: '100%',
        alignSelf: 'center',
    },
    sectionDesktop: {
        maxWidth: 900,
        paddingHorizontal: VoltSpacing.xl,
    },
    title: {
        fontSize: VoltFontSize.xxl,
        fontFamily: VoltFontFamily.bold,
        color: VoltColors.textPrimary,
        textAlign: 'center',
        marginBottom: VoltSpacing.sm,
    },
    subtitle: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        textAlign: 'center',
        marginBottom: VoltSpacing.xl,
    },
    list: {
        gap: VoltSpacing.sm,
    },
    card: {
        backgroundColor: VoltColors.bgSecondary,
        borderRadius: VoltBorderRadius.lg,
        borderWidth: 1,
        borderColor: VoltColors.border,
        overflow: 'hidden',
    },
    cardOpen: {
        borderColor: 'rgba(0, 230, 118, 0.35)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: VoltSpacing.lg,
        gap: VoltSpacing.md,
    },
    question: {
        flex: 1,
        fontSize: VoltFontSize.md,
        fontFamily: VoltFontFamily.semiBold,
        color: VoltColors.textPrimary,
        lineHeight: 22,
    },
    answerContainer: {
        paddingHorizontal: VoltSpacing.lg,
        paddingBottom: VoltSpacing.lg,
    },
    answer: {
        fontSize: VoltFontSize.sm,
        color: VoltColors.textSecondary,
        lineHeight: 22,
    },
    link: {
        color: VoltColors.neonGreen,
        fontFamily: VoltFontFamily.semiBold,
        textDecorationLine: 'underline',
    },
});
