/**
 * VoltCheck — Cloud Function: Smart Report Share Link
 * 
 * Serves an HTML page with OG meta tags for WhatsApp/Telegram/iMessage
 * preview. When share link is opened:
 *   - Messaging apps see: Title, description, image preview
 *   - Browsers redirect to: App download or web viewer
 *
 * URL: /share/{reportId}
 * Reports are only shareable while they are not expired.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generates a share page with Open Graph metadata for rich previews
 */
export const shareReport = functions.https.onRequest(
    async (req, res) => {
        const reportId = req.path.split('/').pop();

        if (!reportId || req.method !== 'GET') {
            res.status(404).send('Report not found');
            return;
        }

        try {
            // Fetch report data
            const reportDoc = await db.collection('reports').doc(reportId).get();

            if (!reportDoc.exists) {
                res.status(404).send(generateErrorPage('Raport inexistent'));
                return;
            }

            const report = reportDoc.data()!;

            // Check expiry
            const expiresAt = report.expiresAt?.toDate?.() || new Date(report.expiresAt);
            if (expiresAt < new Date()) {
                res.status(410).send(generateErrorPage('Acest raport a expirat'));
                return;
            }

            // Build OG metadata
            const vehicle = report.vehicle || {};
            const vehicleName = `${vehicle.make || 'EV'} ${vehicle.model || ''} (${vehicle.year || ''})`.trim();
            const riskScore = report.riskScore ?? '—';
            const riskCategory = report.riskCategory || 'PENDING';
            const levelText = report.level === 1 ? 'The Detective' : 'The Surgeon';

            // Risk emoji for visual appeal in previews
            const riskEmoji = riskCategory === 'LOW' ? '🟢'
                : riskCategory === 'MEDIUM' ? '🟡'
                    : riskCategory === 'HIGH' ? '🟠'
                        : '🔴';

            const ogTitle = `⚡ VoltCheck: ${vehicleName}`;
            const ogDescription =
                `${riskEmoji} Scor de Risc: ${riskScore}/100 (${riskCategory})\n` +
                `🔋 Raport ${levelText} • VIN: ${report.vin?.slice(0, 8)}...****\n` +
                `Verificat de Probabilistic AI`;

            // Generate share page HTML with OG tags
            const html = `<!DOCTYPE html>
<html lang="ro" prefix="og: http://ogp.me/ns#">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${ogTitle}</title>

    <!-- Open Graph for WhatsApp / Telegram / iMessage -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:image" content="https://voltcheck.app/og-preview.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="https://voltcheck.app/share/${reportId}">
    <meta property="og:site_name" content="VoltCheck by Probabilistic AI">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
    <meta name="twitter:image" content="https://voltcheck.app/og-preview.png">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0A0E17;
            color: #F0F4F8;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card {
            background: #111827;
            border: 1px solid #1E293B;
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            text-align: center;
        }
        .logo { font-size: 48px; margin-bottom: 16px; }
        .title { font-size: 24px; font-weight: 800; color: #00E676; margin-bottom: 8px; }
        .vehicle { font-size: 18px; color: #F0F4F8; margin-bottom: 16px; }
        .score {
            font-size: 48px;
            font-weight: 800;
            color: ${getRiskColorCSS(riskScore as number)};
            margin: 16px 0;
        }
        .category {
            font-size: 14px;
            color: ${getRiskColorCSS(riskScore as number)};
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 24px;
        }
        .cta {
            display: inline-block;
            background: #00E676;
            color: #0A0E17;
            font-weight: 700;
            padding: 12px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-size: 16px;
        }
        .footer {
            margin-top: 24px;
            font-size: 12px;
            color: #64748B;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">⚡</div>
        <div class="title">VoltCheck</div>
        <div class="vehicle">${escapeHtml(vehicleName)}</div>
        <div class="score">${riskScore}</div>
        <div class="category">${riskEmoji} ${riskCategory}</div>
        <a class="cta" href="https://voltcheck.app/download">
            Descarcă VoltCheck
        </a>
        <div class="footer">
            Powered by Probabilistic AI<br>
            Raport ${levelText} • Verificat automat
        </div>
    </div>
</body>
</html>`;

            // Track share
            await db.collection('reports').doc(reportId).update({
                sharedVia: admin.firestore.FieldValue.arrayUnion(
                    `link_${new Date().toISOString()}`
                ),
            });

            res.status(200).set('Content-Type', 'text/html').send(html);

        } catch (error) {
            functions.logger.error(`[Share] Error for ${reportId}:`, error);
            res.status(500).send(generateErrorPage('Eroare la încărcarea raportului'));
        }
    }
);

// ── Helpers ──

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getRiskColorCSS(score: number): string {
    if (score <= 25) return '#00E676';
    if (score <= 50) return '#FFD600';
    if (score <= 75) return '#FF6D00';
    return '#FF1744';
}

function generateErrorPage(message: string): string {
    return `<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="utf-8">
    <title>VoltCheck</title>
    <style>
        body {
            font-family: -apple-system, sans-serif;
            background: #0A0E17; color: #F0F4F8;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh;
        }
        .msg { text-align: center; }
        .msg h1 { font-size: 48px; margin-bottom: 16px; }
        .msg p { color: #8896AB; font-size: 18px; }
    </style>
</head>
<body>
    <div class="msg">
        <h1>⚡</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}
