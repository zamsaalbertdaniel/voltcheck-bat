/**
 * InspectEV — Cloud Function: Delete User Account
 * Server-side account deletion (GDPR compliant).
 * Deletes all user data from Firestore + Firebase Auth.
 *
 * Called from client via httpsCallable('deleteUserAccount').
 * Runs with Admin SDK — bypasses Firestore rules.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { checkRateLimit, RATE_LIMITS } from '../utils/rateLimiter';

const db = admin.firestore();
const auth = admin.auth();

/**
 * Collections where user data is stored, keyed by `userId`.
 * Add new collections here as the schema grows.
 */
const USER_DATA_COLLECTIONS = [
    'reports',
    'payments',
    'report_deliveries',
    'vehicles',
    'smartcar_tokens',
];

export const deleteUserAccount = onCall(
    {
        region: 'europe-west1',
        enforceAppCheck: false, // TODO: enable after native App Check providers are configured
    },
    async (request) => {
        // Must be authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to delete account.');
        }

        const uid = request.auth.uid;

        // Rate limiting — 2 per hour (destructive action)
        await checkRateLimit(uid, 'deleteAccount', RATE_LIMITS.deleteAccount);

        try {
            const batch = db.batch();
            let deletedDocs = 0;

            // Delete documents from each collection where userId == uid
            for (const collectionName of USER_DATA_COLLECTIONS) {
                const snap = await db
                    .collection(collectionName)
                    .where('userId', '==', uid)
                    .get();

                for (const doc of snap.docs) {
                    batch.delete(doc.ref);
                    deletedDocs++;
                }
            }

            // Delete user profile doc (keyed by uid, not userId field)
            const userDoc = db.collection('users').doc(uid);
            const userSnap = await userDoc.get();
            if (userSnap.exists) {
                batch.delete(userDoc);
                deletedDocs++;
            }

            // Commit all Firestore deletions
            await batch.commit();

            // Delete Firebase Auth user last (point of no return)
            await auth.deleteUser(uid);

            return { success: true, deletedDocs };
        } catch (err: any) {
            logger.error(`[deleteUserAccount] Failed for uid=${uid}:`, err);
            throw new HttpsError('internal', 'Account deletion failed. Please try again or contact support.');
        }
    }
);
