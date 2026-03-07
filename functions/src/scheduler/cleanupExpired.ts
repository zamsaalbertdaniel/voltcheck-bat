/**
 * VoltCheck — Cloud Function: TTL Scheduler
 * Runs daily at 3:00 AM EET to expire and clean up old reports
 *
 * Flow:
 *   1. Mark expired reports as 'expired' (audit trail)
 *   2. Wait batch window for user notification
 *   3. Delete Firestore docs + Storage PDFs + subcollections
 *   4. Update associated payment docs
 *   5. Log cleanup summary
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Daily cleanup at 3:00 AM EET
 */
export const cleanupExpiredReports = functions.pubsub
    .schedule('0 3 * * *')
    .timeZone('Europe/Bucharest')
    .onRun(async () => {
        const now = new Date();
        functions.logger.info(`[TTL Cleanup] Starting at ${now.toISOString()}`);

        try {
            // Query expired reports (completed only — don't touch failed/manual_review)
            const expiredSnapshot = await db
                .collection('reports')
                .where('expiresAt', '<', now)
                .where('status', 'in', ['completed', 'expired'])
                .limit(500)
                .get();

            if (expiredSnapshot.empty) {
                functions.logger.info('[TTL Cleanup] No expired reports');
                return;
            }

            functions.logger.info(
                `[TTL Cleanup] Found ${expiredSnapshot.size} expired reports`
            );

            // Phase 1: Mark as expired (audit trail — before deletion)
            const markBatch = db.batch();
            const toDelete: admin.firestore.QueryDocumentSnapshot[] = [];

            for (const doc of expiredSnapshot.docs) {
                const data = doc.data();
                if (data.status !== 'expired') {
                    markBatch.update(doc.ref, {
                        status: 'expired',
                        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                toDelete.push(doc);
            }
            await markBatch.commit();

            // Phase 2: Delete documents + storage + subcollections
            const deleteBatch = db.batch();
            const storageDeletePromises: Promise<void>[] = [];
            let deletedCount = 0;
            let storageDeletedCount = 0;

            for (const doc of toDelete) {
                const data = doc.data();

                // Delete Firestore document
                deleteBatch.delete(doc.ref);
                deletedCount++;

                // Delete PDF from Storage
                if (data.storagePath) {
                    storageDeletePromises.push(
                        storage.bucket().file(data.storagePath).delete()
                            .then(() => { storageDeletedCount++; })
                            .catch((err) => {
                                functions.logger.warn(
                                    `[TTL] Storage delete failed: ${data.storagePath}`,
                                    err
                                );
                            })
                    );
                }

                // Delete subcollections
                for (const subcol of ['level1_data', 'level2_data']) {
                    const subDocs = await doc.ref.collection(subcol).get();
                    for (const subDoc of subDocs.docs) {
                        deleteBatch.delete(subDoc.ref);
                    }
                }

                // Update associated payment doc
                if (data.paymentId) {
                    const paymentRef = db.collection('payments').doc(data.paymentId);
                    deleteBatch.update(paymentRef, {
                        reportExpired: true,
                        reportExpiredAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }

            await deleteBatch.commit();
            await Promise.allSettled(storageDeletePromises);

            // Log cleanup
            await db.collection('system_logs').add({
                type: 'ttl_cleanup',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                summary: {
                    expiredFound: expiredSnapshot.size,
                    documentsDeleted: deletedCount,
                    storageFilesDeleted: storageDeletedCount,
                },
            });

            functions.logger.info(
                `[TTL Cleanup] ✅ Deleted ${deletedCount} reports, ${storageDeletedCount} files`
            );
        } catch (error) {
            functions.logger.error('[TTL Cleanup] ❌ Failed:', error);
            throw error;
        }
    });
