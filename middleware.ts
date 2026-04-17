export const config = {
    // Interceptează paginile și API-urile, exclude resursele statice Expo
    matcher: ['/((?!_expo|favicon.ico|_next|static).*)'],
};

// Map în-memorie pentru izolarea curentă din Edge
// (Vercel le curăță periodic, deci este un limitator Rolling Window simplu, dar eficient)
const ipMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minut fereastră
const MAX_REQUESTS_PER_WINDOW = 60; // maxim 60 requesturi/min per IP pentru pagini. Foarte iertător, dar blochează boții agresivi

// Geo-blocking: Țări sancționate sau cu risc mare de boți și atacuri cibernetice
const BLOCKED_COUNTRIES = new Set(['RU', 'CN', 'KP', 'IR', 'SY', 'CU']);

export default function middleware(request: Request) {
    // Citește regiunea de la marginea rețelei (Vercel)
    const country = request.headers.get('x-vercel-ip-country') || 'RO';

    // Firewall Edge: Blocare imediată a traficului din țările sancționate
    if (BLOCKED_COUNTRIES.has(country)) {
        return new Response(
            JSON.stringify({
                error: 'Access forbidden from this region.',
                code: 'REGION_BLOCKED'
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    const now = Date.now();
    const record = ipMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
        // Resetează la fiecare minut
        record.count = 1;
        record.lastReset = now;
    } else {
        record.count += 1;
    }

    ipMap.set(ip, record);

    // Măsură de siguranță pentru a preveni memory-leak-uri în Edge instance (max ~50 MB RAM per izolare)
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

    // Permite accesul către aplicație dar injectează Set-Cookie

    return new Response(null, {
        headers: {
            'x-middleware-next': '1',
            'Set-Cookie': `vercel_country=${country}; Path=/; Max-Age=2592000; SameSite=Lax`
        }
    });
}
