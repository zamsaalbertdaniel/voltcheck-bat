// functions/src/vin/ocrVin.ts

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import * as vision from '@google-cloud/vision';

// Initialize the Vision client
const client = new vision.ImageAnnotatorClient();

/**
 * Cloud Function to extract a VIN from a base64 encoded image using Google Cloud Vision API.
 * The request should contain a base64 string under `imagePayload`.
 */
export const ocrVin = onCall({ maxInstances: 10 }, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in to use OCR.');
    }

    const { imagePayload } = request.data as { imagePayload?: string };

    if (!imagePayload) {
        throw new HttpsError('invalid-argument', 'Image payload (base64 string) is required.');
    }

    // Strip prefix if the string contains "data:image/jpeg;base64,"
    const base64Data = imagePayload.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    try {
        // 2. Call Cloud Vision API for TEXT_DETECTION or DOCUMENT_TEXT_DETECTION
        const [result] = await client.textDetection({
            image: { content: base64Data },
        });

        const detections = result.textAnnotations;
        if (!detections || detections.length === 0) {
            return {
                success: false,
                message: 'No text found in the image.',
                vin: null,
            };
        }

        // The first element typically contains all the text detected.
        const fullText = detections[0].description || '';
        
        // 3. Extract VIN using Regex
        // A VIN is exactly 17 characters, no I, O, Q, and generally alphanumeric.
        // We look for any word that matches this pattern in the detected text block.
        // Many times spaces might be accidentally inserted, but we'll try strict first.
        const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
        
        // Let's normalize the text to uppercase and remove some weird characters but keep spaces
        const normalizedText = fullText.toUpperCase();
        const matches = normalizedText.match(vinRegex);

        let detectedVin = null;
        if (matches && matches.length > 0) {
            // Pick the first match that looks like a valid VIN
            detectedVin = matches[0];
        } else {
            // Also attempt to find a VIN where spaces might have been inserted inside a block
            // e.g. "WBA 8B9C 50JK 12345" then stripped of spaces
            const strippedText = normalizedText.replace(/[\s-]/g, '');
            const strippedMatches = strippedText.match(/[A-HJ-NPR-Z0-9]{17}/g);
            if (strippedMatches && strippedMatches.length > 0) {
                detectedVin = strippedMatches[0];
            }
        }

        if (detectedVin) {
            return {
                success: true,
                vin: detectedVin,
                rawTextLength: fullText.length,
            };
        }

        // Return failure but allow user to see what was read maybe?
        return {
            success: false,
            message: 'No valid 17-character VIN found in the detected text.',
            vin: null,
            // Only send back a snippet of text for debugging in Cloud Logs, not to client, 
            // except we might send it back if requested.
        };

    } catch (error: any) {
        logger.error('[ocrVin] Vision API error:', error);
        throw new HttpsError('internal', `OCR processing failed: ${error.message || 'Unknown error'}`);
    }
});
