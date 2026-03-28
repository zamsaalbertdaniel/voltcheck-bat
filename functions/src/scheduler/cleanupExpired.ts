/**
 * VoltCheck — Cloud Function: TTL Scheduler
 * Runs daily at 3:00 AM EET to expire and clean up old reports
 *
 * Flow (with pagination — handles up to 5000 reports per run):
 *   1. Query expired reports in batches of 500
 *   2. Mark expired reports as 'expired' (audit trail)
 *   3. Delete Firestore docs + Storage PDFs + subcollections
 *   4. Update associated payment docs
 *   5. Log cleanup summary
 *   6. Repeat until no more expired reports or 5000 limit reached
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/** Max reports to process per execution (safety limit) */
const MAX_PER_EXECUTION = 5000;
/** Batch size per Firestore query */
const BATCH_SIZE = 500;

/**
 * Daily cleanup at 3:00 AM EET — with pagination
 */
export const cleanupExpiredReports = onSchedule(
    {
        schedule: '0 3 * * *',
        timeZone: 'Europe/Bucharest',
        region: 'europe-west1',
        timeoutSeconds: 300,
        memory: '512MiB',
    },
    async () => {
        const now = new Date();
        logger.info(`[TTL Cleanup] Starting at ${now.toISOString()}`);

        let totalDeleted = 0;
        let totalStorageDeleted = 0;
        let pagesProcessed = 0;

        try {
            let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
            let hasMore = true;

            while (hasMore && totalDeleted < MAX_PER_EXECUTION) {
                // Build paginated query
                let query = db
                    .collection('reports')
                    .where('expiresAt', '<', now)
                    .where('status', 'in', ['completed', 'completed_partial', 'expired'])
                    .orderBy('expiresAt')
                    .limit(BATCH_SIZE);

                if (lastDoc) {
                    query = query.startAfter(lastDoc);
                }

                const expiredSnapshot = await query.get();

                if (expiredSnapshot.empty) {
                    if (pagesProcessed === 0) {
                        logger.info('[TTL Cleanup] No expired reports');
                    }
                    hasMore = false;
                    break;
                }

                pagesProcessed++;
                logger.info(
                    `[TTL Cleanup] Page ${pagesProcessed}: ${expiredSnapshot.size} expired reports`
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
                // Firestore batches are limited to 500 writes — split if needed
                let deleteBatch = db.batch();
                let batchWriteCount = 0;
                const storageDeletePromises: Promise<void>[] = [];

                for (const doc of toDelete) {
                    const data = doc.data();

                    // Delete Firestore document
                    deleteBatch.delete(doc.ref);
                    batchWriteCount++;
                    totalDeleted++;

                    // Delete PDF from Storage
                    if (data.storagePath) {
                        storageDeletePromises.push(
                            storage.bucket().file(data.storagePath).delete()
                                .then(() => { totalStorageDeleted++; })
                                .catch((err) => {
                                    logger.warn(
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
                            batchWriteCount++;

                            // Commit intermediate batch if approaching limit
                            if (batchWriteCount >= 490) {
                                await deleteBatch.commit();
                                deleteBatch = db.batch();
                                batchWriteCount = 0;
                            }
                        }
                    }

                    // Update associated payment doc
                    if (data.paymentId) {
                        const paymentRef = db.collection('payments').doc(data.paymentId);
                        deleteBatch.update(paymentRef, {
                            reportExpired: true,
                            reportExpiredAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        batchWriteCount++;
                    }

                    // Commit intermediate batch if approaching limit
                    if (batchWriteCount >= 490) {
                        await deleteBatch.commit();
                        deleteBatch = db.batch();
                        batchWriteCount = 0;
                    }
                }

                // Commit remaining writes
                if (batchWriteCount > 0) {
                    await deleteBatch.commit();
                }
                await Promise.allSettled(storageDeletePromises);

                // Track last document for pagination
                lastDoc = expiredSnapshot.docs[expiredSnapshot.docs.length - 1];

                // If we got fewer than BATCH_SIZE, there are no more
                if (expiredSnapshot.size < BATCH_SIZE) {
                    hasMore = false;
                }
            }

            // Log cleanup summary
            await db.collection('system_logs').add({
                type: 'ttl_cleanup',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                summary: {
                    pagesProcessed,
                    documentsDeleted: totalDeleted,
                    storageFilesDeleted: totalStorageDeleted,
                    reachedLimit: totalDeleted >= MAX_PER_EXECUTION,
                },
            });

            logger.info(
                `[TTL Cleanup] Deleted ${totalDeleted} reports, ${totalStorageDeleted} files (${pagesProcessed} pages)`
            );
        } catch (error) {
            logger.error('[TTL Cleanup] Failed:', error);
            throw error;
        }
    }
);
