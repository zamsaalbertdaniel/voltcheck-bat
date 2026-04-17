/**
 * InspectEV — Terms & Conditions Page
 */

import LegalPageTemplate from '@/components/layout/LegalPageTemplate';
import React from 'react';
import { useTranslation } from 'react-i18next';

const termsRO = `Ultima actualizare: 30 martie 2026

1. ACCEPTAREA TERMENILOR
Prin utilizarea aplicației InspectEV, acceptați acești Termeni și Condiții. Dacă nu sunteți de acord, vă rugăm să nu utilizați serviciul.

2. DESCRIEREA SERVICIULUI
InspectEV oferă rapoarte de evaluare a riscului pentru vehicule electrice (EV), bazate pe:
• Decodare VIN din surse publice oficiale (NHTSA)
• Algoritm proprietar de evaluare a riscului bazat pe AI
• Diagnoză live baterie (Level 2, prin Smartcar)

3. NIVELURI DE SERVICIU
• Pachet Standard — 99 RON: raport istoric + AI Risk Score + analiză baterie SoH
• Pachet Premium — 120 RON: tot ce include Standard + raport complet de daune + certificat complet

4. DISCLAIMER IMPORTANT
InspectEV NU este un substitut pentru o inspecție mecanică profesională.
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
• Standard Package — 99 RON: history report + AI Risk Score + battery SoH analysis
• Premium Package — 120 RON: everything in Standard + complete damage report + complete certificate

4. IMPORTANT DISCLAIMER
InspectEV is NOT a substitute for a professional mechanical inspection.
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

export default function TermsPage() {
    const { i18n } = useTranslation();
    const isRo = i18n.language === 'ro';

    return (
        <LegalPageTemplate
            title={isRo ? 'Termeni și Condiții' : 'Terms & Conditions'}
            content={isRo ? termsRO : termsEN}
        />
    );
}
