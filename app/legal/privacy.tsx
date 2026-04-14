/**
 * InspectEV — Privacy Policy Page
 * GDPR-compliant privacy policy content.
 */

import LegalPageTemplate from '@/components/layout/LegalPageTemplate';
import React from 'react';
import { useTranslation } from 'react-i18next';

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

export default function PrivacyPage() {
    const { i18n } = useTranslation();
    const isRo = i18n.language === 'ro';

    return (
        <LegalPageTemplate
            title={isRo ? 'Politica de Confidențialitate' : 'Privacy Policy'}
            content={isRo ? privacyRO : privacyEN}
        />
    );
}
