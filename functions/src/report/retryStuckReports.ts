import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { sendEmailAlert } from '../utils/alerting';
import { defineSecret } from 'firebase-functions/params';

const smtpUser = defineSecret('SMTP_USER');
const smtpPass = defineSecret('SMTP_PASS');

/**
 * InspectEV — Cloud Function: Retry Stuck Reports
 * 
 * Rulază la fiecare 10 minute pentru a prinde și reporni
 * rapoartele care au rămas blocate cu statusul 'processing'.
 */
export const retryStuckReports = onSchedule(
    {
        schedule: 'every 10 minutes',
        timeZone: 'Europe/Bucharest',
        secrets: [smtpUser, smtpPass],
        region: 'europe-west1',
    },
    async (event) => {
        logger.info('[RetrySystem] Pornire verificare rapoarte blocate...');

        if (!admin.apps.length) {
            admin.initializeApp();
        }
        const db = admin.firestore();

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        try {
            // Caută toate rapoartele care sunt processing și au fost create acu 10+ minute
            // Va trebui index pe (status, createdAt) dacă volumul crește
            const stuckSnapshot = await db.collection('reports')
                .where('status', '==', 'processing')
                .where('createdAt', '<', tenMinutesAgo)
                .get();

            if (stuckSnapshot.empty) {
                logger.info('[RetrySystem] Niciun raport blocat găsit. Sistem OK.');
                return;
            }

            logger.warn(`[RetrySystem] S-au găsit ${stuckSnapshot.size} rapoarte blocate. Începere repornire...`);

            const batch = db.batch();
            let retryCount = 0;

            for (const doc of stuckSnapshot.docs) {
                const data = doc.data();
                
                // Track retry attempts
                const currentRetries = data.retryCount || 0;
                
                if (currentRetries >= 3) {
                    logger.error(`[RetrySystem] Raportul ${doc.id} a eșuat de 3 ori complet. Marcat ca 'failed'.`);
                    batch.update(doc.ref, {
                        status: 'failed',
                        statusDetails: 'max_retries_exceeded',
                        failedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    
                    // Alertă email
                    await sendEmailAlert(
                        `Raport Eșuat Definitiv: ${doc.id}`,
                        `Raportul ${doc.id} (VIN: ${data.vin}) a eșuat de 3 ori în timpul procesării (stuck in processing).`
                    );
                } else {
                    logger.info(`[RetrySystem] Repornire raport ${doc.id} (Incercarea: ${currentRetries + 1})`);
                    
                    // Repornirea e un trick în Firestore: ștergem documentul temporar și îl recreăm 
                    // SAU pur și simplu rescriem createdAt pentru a-l percepe ca nou, dar 
                    // logica noastră e pe onDocumentCreated, deci modificarea lui nu îl trigeruieste.
                    // SOLUȚIA SIMPLĂ: Rescriem status-ul 'restarting' apoi instant înapoi 'processing' ?
                    // Nu, `onDocumentCreated` rulează DOAR LA CREARE. 
                    // Trebuie folosit `onDocumentWritten` în reportPipeline sau mutat codul intern apelabil.
                    // Alternativa (ușor Hacky dar sigur Firebase): Clonează și creează din nou, șterge.
                    // SAU: vom modifica reportPipeline pe viitor să fie `onDocumentWritten`.
                    // Momentan facem o clonare directă pentru a reporni onDocumentCreated.
                    
                    const clonedData = {
                        ...data,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        retryCount: currentRetries + 1,
                        previousReportId: doc.id,
                        isRetry: true
                    };
                    
                    // Nou referință
                    const newRef = db.collection('reports').doc(`rpt_${Date.now()}_retry`);
                    batch.set(newRef, clonedData);
                    
                    // Ștergem vechiul (ca un înlocuitor atomic)
                    batch.delete(doc.ref);
                    
                    retryCount++;
                }
            }

            await batch.commit();

            if (retryCount > 0) {
                await sendEmailAlert(
                    `Auto-Vindecare Executată`,
                    `RetrySystem a preluat și restabilit ${retryCount} rapoarte blocate din sistem cu succes.`
                );
            }

        } catch (error) {
            logger.error('[RetrySystem] Eroare critică în procesul de retry:', error);
        }
    }
);
