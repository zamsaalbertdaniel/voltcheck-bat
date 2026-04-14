/**
 * InspectEV — Custom HTML Template
 * Injects SEO meta tags, Open Graph, and Twitter Card
 * into the static HTML shell for social sharing & crawlers.
 */

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="ro">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

                {/* SEO */}
                <title>InspectEV — Verifică Bateria EV-ului Second-Hand</title>
                <meta
                    name="description"
                    content="Raport AI complet cu scor de risc, analiză baterie și istoric vehicul electric. Verificare VIN în 30 de secunde. Standard 99 RON / Premium 120 RON."
                />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://www.inspect-ev.app" />

                {/* Open Graph */}
                <meta property="og:title" content="InspectEV — Verifică Bateria EV-ului Second-Hand" />
                <meta property="og:description" content="Cumperi un EV second-hand? Verifică sănătatea bateriei înainte. Raport AI complet în 30 de secunde." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.inspect-ev.app" />
                <meta property="og:image" content="https://www.inspect-ev.app/assets/og-image.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:site_name" content="InspectEV" />
                <meta property="og:locale" content="ro_RO" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="InspectEV — Verifică Bateria EV-ului Second-Hand" />
                <meta name="twitter:description" content="Raport AI de sănătate baterie EV. Scor de risc, analiză BMS, predicție degradare. În 30 de secunde." />
                <meta name="twitter:image" content="https://www.inspect-ev.app/assets/og-image.png" />

                {/* Theme */}
                <meta name="theme-color" content="#0A0E17" />

                {/* Prevent body scroll on web */}
                <ScrollViewStyleReset />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
