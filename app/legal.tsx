/**
 * InspectEV — Legal Screen (Privacy Policy / Terms of Service)
 * Rendered as modal from Settings.
 * Content conforms to GDPR, Apple App Store & Google Play Store requirements.
 */

import {
    VoltBorderRadius,
    VoltColors,
    VoltFontSize,
    VoltSpacing,
} from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BlurView } from 'expo-blur';

// ─── Privacy Policy Content ───────────────────────────────────────────
const privacyRO = `Ultima actualizare: 30 martie 2026

1. INTRODUCERE
InspectEV ("noi", "aplicația") este un serviciu operat de InspectEV SRL, cu sediul în România. Respectăm confidențialitatea utilizatorilor noștri și ne angajăm să protejăm datele personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR - UE 2016/679).

2. DATE COLECTATE
• Informații de autentificare: nume, email, avatar (furnizate de Google/Apple Sign-In)
• Date despre vehicul: numărul VIN introdus de utilizator
• Date de plată: procesate exclusiv prin Stripe. Nu stocăm datele cardului.
• Date tehnice: tip dispozitiv, versiune OS, adresă IP (pentru securitate)
• Token notificări push (opțional, cu consimțământ)

3. SCOPUL PRELUCRĂRII
• Furnizarea serviciului de generare rapoarte VIN
• Procesarea plăților
• Notificări despre rapoartele finalizate
• Îmbunătățirea serviciului (analize anonimizate)

4. BAZA LEGALĂ (Art. 6 GDPR)
• Executarea contractului (furnizarea serviciului)
• Consimțământul utilizatorului (notificări)
• Interes legitim (securitate, prevenire fraudă)

5. PARTAJARE DATE
• Stripe Inc. — procesare plăți
• Google Cloud Platform — infrastructură cloud
• NHTSA / furnizori de date auto — interogări VIN (doar VIN-ul, fără date personale)
Nu vindem și nu partajăm datele personale cu terți în scopuri publicitare.

6. STOCARE ȘI SECURITATE
Datele sunt stocate pe servere Google Cloud (regiune: europe-west1).
Folosim criptare în tranzit (TLS 1.3) și în repaus (AES-256).
Rapoartele Level 1 sunt șterse automat după 30 de zile.
Rapoartele Level 2 sunt șterse automat după 365 de zile.

7. DREPTURILE DUMNEAVOASTRĂ (GDPR)
Aveți dreptul la:
• Acces — vizualizați datele stocate
• Rectificare — corectați date incorecte
• Ștergere — ștergeți contul și toate datele (din Setări → Șterge contul)
• Portabilitate — export date în format standard
• Opoziție — vă puteți opune prelucrării
• Retragere consimțământ — dezactivare notificări din Setări

8. RETENȚIE DATE
• Cont utilizator: până la ștergerea contului
• Rapoarte Level 1: 30 zile
• Rapoarte Level 2: 365 zile
• Loguri de securitate: 90 zile

9. COPII
InspectEV nu este destinat persoanelor sub 16 ani. Nu colectăm cu bună știință date de la minori.

10. CONTACT
Pentru orice solicitare legată de datele personale:
Email: privacy@inspectev.app
InspectEV SRL, România`;

const privacyEN = `Last updated: March 30, 2026

1. INTRODUCTION
InspectEV ("we", "the app") is a service operated by InspectEV SRL, based in Romania. We respect our users' privacy and are committed to protecting personal data in accordance with the General Data Protection Regulation (GDPR - EU 2016/679).

2. DATA COLLECTED
• Authentication info: name, email, avatar (provided by Google/Apple Sign-In)
• Vehicle data: VIN number entered by the user
• Payment data: processed exclusively through Stripe. We do not store card data.
• Technical data: device type, OS version, IP address (for security)
• Push notification token (optional, with consent)

3. PURPOSE OF PROCESSING
• Providing the VIN report generation service
• Payment processing
• Notifications about completed reports
• Service improvement (anonymized analytics)

4. LEGAL BASIS (Art. 6 GDPR)
• Contract performance (service delivery)
• User consent (notifications)
• Legitimate interest (security, fraud prevention)

5. DATA SHARING
• Stripe Inc. — payment processing
• Google Cloud Platform — cloud infrastructure
• NHTSA / vehicle data providers — VIN queries (only VIN, no personal data)
We do not sell or share personal data with third parties for advertising purposes.

6. STORAGE & SECURITY
Data is stored on Google Cloud servers (region: europe-west1).
We use encryption in transit (TLS 1.3) and at rest (AES-256).
Level 1 reports are automatically deleted after 30 days.
Level 2 reports are automatically deleted after 365 days.

7. YOUR RIGHTS (GDPR)
You have the right to:
• Access — view your stored data
• Rectification — correct inaccurate data
• Erasure — delete your account and all data (Settings → Delete Account)
• Portability — export data in standard format
• Objection — object to processing
• Withdraw consent — disable notifications from Settings

8. DATA RETENTION
• User account: until account deletion
• Level 1 reports: 30 days
• Level 2 reports: 365 days
• Security logs: 90 days

9. CHILDREN
InspectEV is not intended for persons under 16. We do not knowingly collect data from minors.

10. CONTACT
For any personal data requests:
Email: privacy@inspectev.app
InspectEV SRL, Romania`;

// ─── Terms of Service Content ─────────────────────────────────────────
const termsRO = `Ultima actualizare: 30 martie 2026

1. ACCEPTAREA TERMENILOR
Prin utilizarea aplicației InspectEV, acceptați acești Termeni și Condiții. Dacă nu sunteți de acord, vă rugăm să nu utilizați serviciul.

2. DESCRIEREA SERVICIULUI
InspectEV oferă rapoarte de evaluare a riscului pentru vehicule electrice (EV), bazate pe:
• Decodare VIN din surse publice oficiale (NHTSA)
• Algoritm proprietar de evaluare a riscului bazat pe AI
• Diagnoză live baterie (Level 2, prin Smartcar)

3. NIVELURI DE SERVICIU
• Level 1 ("The Detective") — 15 RON: raport istoric + AI Risk Score, valabil 30 zile
• Level 2 ("The Surgeon") — 99 RON: tot ce include Level 1 + diagnoză live baterie + certificat SoH, valabil 365 zile

4. DISCLAIMER IMPORTANT
⚠️ InspectEV NU este un substitut pentru o inspecție mecanică profesională.
• Scorul de risc AI este o estimare probabilistică, NU o garanție
• Datele live ale bateriei depind de compatibilitatea vehiculului cu Smartcar
• InspectEV nu își asumă responsabilitatea pentru decizii de achiziție bazate exclusiv pe rapoartele noastre
• Recomandăm întotdeauna o inspecție fizică suplimentară pentru tranzacții de valoare mare

5. PLĂȚI ȘI RAMBURSĂRI
• Plățile sunt procesate securizat prin Stripe
• Raportul este generat automat după confirmarea plății
• Rambursări: dacă raportul nu poate fi generat din motive tehnice, plata este returnată integral
• Nu oferim rambursări pentru rapoarte generate cu succes

6. PROPRIETATE INTELECTUALĂ
• Algoritmul de evaluare a riscului și metodologia BAT sunt proprietatea InspectEV SRL
• Rapoartele generate sunt licențiate utilizatorului pentru uz personal
• Redistribuirea comercială a rapoartelor este interzisă

7. UTILIZARE ACCEPTABILĂ
Nu este permis:
• Accesul automat / scraping al serviciului
• Utilizarea în scopuri ilegale
• Tentativa de a perturba sau compromite serviciul
• Crearea de conturi multiple cu scopul de a eluda restricțiile

8. LIMITAREA RESPONSABILITĂȚII
InspectEV SRL nu este responsabilă pentru:
• Pierderi financiare rezultate din decizii de achiziție
• Inexactități în datele furnizate de terți (NHTSA, furnizori auto)
• Întreruperi temporare ale serviciului

9. MODIFICĂRI ALE TERMENILOR
Ne rezervăm dreptul de a modifica acești termeni. Utilizatorii activi vor fi notificați prin email sau notificare push cu cel puțin 14 zile înainte de intrarea în vigoare a modificărilor.

10. LEGISLAȚIA APLICABILĂ
Acești termeni sunt guvernați de legislația din România. Orice dispută va fi soluționată de instanțele competente din România.

11. CONTACT
Email: legal@inspectev.app
InspectEV SRL, România`;

const termsEN = `Last updated: March 30, 2026

1. ACCEPTANCE OF TERMS
By using the InspectEV application, you accept these Terms and Conditions. If you do not agree, please do not use the service.

2. SERVICE DESCRIPTION
InspectEV provides risk assessment reports for electric vehicles (EV), based on:
• VIN decoding from official public sources (NHTSA)
• Proprietary AI-based risk evaluation algorithm
• Live battery diagnosis (Level 2, via Smartcar)

3. SERVICE LEVELS
• Level 1 ("The Detective") — 15 RON: history report + AI Risk Score, valid for 30 days
• Level 2 ("The Surgeon") — 99 RON: everything in Level 1 + live battery diagnosis + SoH certificate, valid for 365 days

4. IMPORTANT DISCLAIMER
⚠️ InspectEV is NOT a substitute for a professional mechanical inspection.
• The AI risk score is a probabilistic estimate, NOT a guarantee
• Live battery data depends on the vehicle's compatibility with Smartcar
• InspectEV does not assume responsibility for purchase decisions based solely on our reports
• We always recommend an additional physical inspection for high-value transactions

5. PAYMENTS & REFUNDS
• Payments are securely processed through Stripe
• The report is automatically generated after payment confirmation
• Refunds: if the report cannot be generated for technical reasons, the payment is fully refunded
• We do not offer refunds for successfully generated reports

6. INTELLECTUAL PROPERTY
• The risk evaluation algorithm and BAT methodology are the property of InspectEV SRL
• Generated reports are licensed to the user for personal use
• Commercial redistribution of reports is prohibited

7. ACCEPTABLE USE
The following are not permitted:
• Automated access / scraping of the service
• Use for illegal purposes
• Attempting to disrupt or compromise the service
• Creating multiple accounts to circumvent restrictions

8. LIMITATION OF LIABILITY
InspectEV SRL is not liable for:
• Financial losses resulting from purchase decisions
• Inaccuracies in data provided by third parties (NHTSA, auto providers)
• Temporary service interruptions

9. CHANGES TO TERMS
We reserve the right to modify these terms. Active users will be notified via email or push notification at least 14 days before changes take effect.

10. GOVERNING LAW
These terms are governed by Romanian law. Any disputes will be resolved by competent courts in Romania.

11. CONTACT
Email: legal@inspectev.app
InspectEV SRL, Romania`;

export default function LegalScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams<{ type?: string }>();
    const isPrivacy = params.type === 'privacy';
    const isRo = i18n.language === 'ro';

    const title = isPrivacy ? t('settings.privacy') : t('settings.terms');
    const content = isPrivacy
        ? (isRo ? privacyRO : privacyEN)
        : (isRo ? termsRO : termsEN);

    return (
        <View style={styles.container}>
            {/* Header with glassmorphism */}
            <BlurView intensity={Platform.OS === 'web' ? 20 : 60} tint="dark" style={styles.headerBlur}>
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
            </BlurView>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={Platform.OS === 'web'}
            >
                <Text style={styles.legalText}>{content}</Text>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2026 InspectEV SRL. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: VoltColors.bgPrimary,
    },
    headerBlur: {
        borderBottomWidth: 1,
        borderBottomColor: VoltColors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: VoltSpacing.lg,
        paddingTop: VoltSpacing.xxl,
        paddingBottom: VoltSpacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        paddingBottom: 120,
    },
    legalText: {
        fontSize: VoltFontSize.md,
        color: VoltColors.textSecondary,
        lineHeight: 24,
    },
    footer: {
        marginTop: VoltSpacing.xl,
        paddingTop: VoltSpacing.lg,
        borderTopWidth: 1,
        borderTopColor: VoltColors.border,
        alignItems: 'center',
    },
    footerText: {
        fontSize: VoltFontSize.xs,
        color: VoltColors.textTertiary,
    },
});
