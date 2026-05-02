/**
 * InspectEV — Vercel Edge Middleware
 *
 * Three security layers run on every request (before origin):
 *   1. Geo-Firewall   — blocks traffic from sanctioned countries
 *   2. Rate Limiter   — rolling-window per IP, prevents brute-force / bot floods
 *   3. Security Headers — strict CSP, Permissions-Policy, X-Frame-Options, etc.
 *
 * NOTE ON CSP STRATEGY (2026-05):
 * InspectEV is a static Expo Web export (SPA). Vercel Edge Middleware CANNOT
 * modify the HTML body of static files, therefore nonce-based CSP is impossible
 * without migrating to SSR. We use a domain-allowlist approach instead:
 *   - script-src: 'self' + explicit third-party domains. NO 'unsafe-inline'.
 *   - style-src:  'self' + 'unsafe-inline' (required by React Native Web CSS-in-JS).
 * This eliminates the primary XSS vector (script injection) while accommodating
 * the framework's runtime style generation.
 */

export const config = {
    // Interceptează paginile și API-urile, exclude resursele statice Expo
    matcher: ['/((?!_expo|favicon.ico|_next|static).*)'],
};

// ── Rate Limiter — in-memory rolling window ─────────────────────────────────
const ipMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minut fereastră
const MAX_REQUESTS_PER_WINDOW = 60;

// ── Geo-Firewall — sanctioned / high-risk countries ─────────────────────────
const BLOCKED_COUNTRIES = new Set(['RU', 'CN', 'KP', 'IR', 'SY', 'CU']);

// ── Content Security Policy ─────────────────────────────────────────────────
// STRICT: 'unsafe-inline' ELIMINAT din script-src.
// Fiecare domeniu third-party este explicit whitelistat cu justificare.
const CSP_DIRECTIVES = [
    // Fallback: doar resurse de pe propriul domeniu
    "default-src 'self'",

    // ── SCRIPTURI ────────────────────────────────────────────────────────────
    // 'self'                        → bundle-ul Expo Metro (/_expo/static/js/*)
    // apis.google.com               → Firebase Auth popup (gapi.load)
    // www.google.com                → reCAPTCHA v3 runtime
    // www.gstatic.com               → reCAPTCHA v3 + Firebase UI assets
    // www.googletagmanager.com      → GTM (rezervat — nu e activ încă)
    // js.stripe.com                 → Stripe.js injectat de @stripe/stripe-js loadStripe()
    "script-src 'self' https://apis.google.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://js.stripe.com",

    // ── STILURI ──────────────────────────────────────────────────────────────
    // 'unsafe-inline' NECESAR: React Native Web generează <style> tags dinamic
    // prin StyleSheet.create() la runtime. Conținutul se schimbă per-build,
    // deci hash-uri statice sunt imposibile. Compromis acceptat — XSS prin CSS
    // injection este un vector de risc semnificativ mai mic decât script injection.
    // api.fontshare.com             → @import url() pentru Satoshi font (din Theme.ts)
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com",

    // ── IMAGINI ──────────────────────────────────────────────────────────────
    "img-src 'self' https: data:",

    // ── FONTURI ──────────────────────────────────────────────────────────────
    // api.fontshare.com    → CSS descriptor fetch
    // cdn.fontshare.com    → actual .woff2 font files
    "font-src 'self' https://api.fontshare.com https://cdn.fontshare.com",

    // ── CONEXIUNI API / DATA ─────────────────────────────────────────────────
    [
        "connect-src 'self'",
        'https://*.googleapis.com',         // Firestore, Auth, Cloud Functions
        'https://*.firebaseio.com',         // Firebase Realtime (fallback)
        'https://*.cloudfunctions.net',     // Cloud Functions direct
        'https://*.stripe.com',             // Stripe API calls
        'https://accounts.google.com',      // Google OAuth token exchange
        'https://oauth2.googleapis.com',    // OAuth2 token endpoint
        'https://securetoken.googleapis.com', // Firebase Auth token refresh
        'https://identitytoolkit.googleapis.com', // Firebase Auth REST API
        'https://recaptchaenterprise.googleapis.com', // reCAPTCHA scoring
        'https://www.google.com',           // reCAPTCHA v3 beacon
        'https://appleid.apple.com',        // Apple Sign-In token validation
        'https://*.ingest.sentry.io',       // Sentry event ingestion
        'https://*.sentry.io',              // Sentry API
        'https://api.fontshare.com',        // Font CSS fetch
    ].join(' '),

    // ── IFRAMES ──────────────────────────────────────────────────────────────
    [
        "frame-src 'self'",
        'https://voltcheck-d89f4.firebaseapp.com', // Firebase Auth redirect handler
        'https://accounts.google.com',      // Google Sign-In popup
        'https://appleid.apple.com',        // Apple Sign-In popup
        'https://*.stripe.com',             // Stripe Checkout / Payment Element iframe
        'https://www.google.com',           // reCAPTCHA v3 invisible iframe
        'https://recaptchaenterprise.googleapis.com', // reCAPTCHA Enterprise fallback
    ].join(' '),

    // ── RESTRICȚII SUPLIMENTARE ──────────────────────────────────────────────
    "frame-ancestors 'none'",               // Nimeni nu poate embed-ui site-ul nostru
    "object-src 'none'",                    // Blochează Flash/Java/plugins — vector XSS legacy
    "base-uri 'self'",                      // Previne <base> tag hijacking
    "form-action 'self'",                   // Previne form action injection
    'upgrade-insecure-requests',            // Forțează HTTPS pe toate sub-resursele
].join('; ');

// ── Security Headers Bundle ──────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
    'Content-Security-Policy': CSP_DIRECTIVES,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // X-XSS-Protection setat la 0 conform recomandării OWASP (2023+):
    // XSS Auditor-ul browserelor vechi avea bug-uri exploatabile.
    // Chrome l-a eliminat complet din 2019. CSP este protecția reală.
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions-Policy: dezactivăm API-uri browser nefolosite
    // camera=(self)  → permis doar pe domeniul nostru (VIN barcode scanner)
    // payment=(self) → Stripe Payment Request API
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(self), interest-cohort=()',
};

export default function middleware(request: Request) {
    // ── Layer 1: Geo-Firewall ─────────────────────────────────────────────
    const country = request.headers.get('x-vercel-ip-country') || 'RO';

    if (BLOCKED_COUNTRIES.has(country)) {
        return new Response(
            JSON.stringify({
                error: 'Access forbidden from this region.',
                code: 'REGION_BLOCKED'
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // ── Layer 2: Rate Limiter ─────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const record = ipMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
        record.count = 1;
        record.lastReset = now;
    } else {
        record.count += 1;
    }

    ipMap.set(ip, record);

    // Măsură de siguranță pentru a preveni memory-leak-uri în Edge instance
    if (ipMap.size > 5000) {
        const timeThreshold = now - RATE_LIMIT_WINDOW_MS;
        ipMap.forEach((val, key) => {
            if (val.lastReset < timeThreshold) {
                ipMap.delete(key);
            }
        });
    }

    if (record.count > MAX_REQUESTS_PER_WINDOW) {
        return new Response(
            JSON.stringify({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMITED'
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '60',
                },
            }
        );
    }

    // ── Layer 3: Security Headers + Pass-through ──────────────────────────
    const headers = new Headers();
    headers.set('x-middleware-next', '1');
    headers.set(
        'Set-Cookie',
        `vercel_country=${country}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );

    // Inject all security headers into the response
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        headers.set(key, value);
    }

    return new Response(null, { headers });
}
