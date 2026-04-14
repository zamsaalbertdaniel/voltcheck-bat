/**
 * InspectEV — Refund Policy Page
 */

import LegalPageTemplate from '@/components/layout/LegalPageTemplate';
import React from 'react';
import { useTranslation } from 'react-i18next';

const refundRO = `Ultima actualizare: 30 martie 2026

POLITICA DE RAMBURSARE — InspectEV

1. DREPTUL LA RAMBURSARE
InspectEV oferă rambursare integrală în următoarele situații:
• Raportul nu a putut fi generat din motive tehnice (eroare de sistem, indisponibilitate furnizor date)
• Plata a fost procesată, dar serviciul nu a fost livrat în termen de 24 de ore
• Erori dovedibile în datele raportului care afectează semnificativ concluziile

2. SITUAȚII NEELIGIBILE PENTRU RAMBURSARE
Nu oferim rambursări în următoarele cazuri:
• Raportul a fost generat cu succes și livrat
• Utilizatorul a introdus un VIN greșit (validarea este responsabilitatea utilizatorului)
• Vehiculul nu este compatibil cu Smartcar (pentru Level 2) — aceasta este verificată înainte de plată
• Nemulțumirea subiectivă față de scorul de risc (acesta este o estimare probabilistică)

3. PROCEDURA DE RAMBURSARE
• Contactați-ne la refund@inspectev.app în termen de 14 zile de la achiziție
• Includeți ID-ul raportului și motivul solicitării
• Rambursările sunt procesate prin Stripe în contul original de plată
• Timpul de procesare: 5-10 zile lucrătoare

4. DREPTUL DE RETRAGERE (OUG 34/2014)
Conform legislației române privind comerțul electronic:
• Aveți dreptul de retragere în 14 zile de la achiziție
• Prin plasarea comenzii și generarea imediată a raportului, consimțiți la executarea serviciului înainte de expirarea termenului de retragere
• Dacă raportul a fost deja generat, dreptul de retragere nu mai poate fi exercitat

5. CONTACT
Email: refund@inspectev.app
Timp de răspuns: maxim 48 de ore lucrătoare
InspectEV SRL, România`;

const refundEN = `Last updated: March 30, 2026

REFUND POLICY — InspectEV

1. RIGHT TO REFUND
InspectEV offers a full refund in the following situations:
• The report could not be generated for technical reasons (system error, data provider unavailability)
• Payment was processed but the service was not delivered within 24 hours
• Provable errors in report data that significantly affect the conclusions

2. SITUATIONS NOT ELIGIBLE FOR REFUND
We do not offer refunds in the following cases:
• The report was successfully generated and delivered
• The user entered an incorrect VIN (validation is the user's responsibility)
• The vehicle is not Smartcar-compatible (for Level 2) — this is checked before payment
• Subjective dissatisfaction with the risk score (this is a probabilistic estimate)

3. REFUND PROCEDURE
• Contact us at refund@inspectev.app within 14 days of purchase
• Include the report ID and the reason for the request
• Refunds are processed through Stripe to the original payment account
• Processing time: 5-10 business days

4. RIGHT OF WITHDRAWAL (OUG 34/2014)
Under Romanian e-commerce law:
• You have the right of withdrawal within 14 days of purchase
• By placing the order and the immediate generation of the report, you consent to the execution of the service before the withdrawal period expires
• If the report has already been generated, the right of withdrawal can no longer be exercised

5. CONTACT
Email: refund@inspectev.app
Response time: maximum 48 business hours
InspectEV SRL, Romania`;

export default function RefundPage() {
    const { i18n } = useTranslation();
    const isRo = i18n.language === 'ro';

    return (
        <LegalPageTemplate
            title={isRo ? 'Politica de Rambursare' : 'Refund Policy'}
            content={isRo ? refundRO : refundEN}
        />
    );
}
