# InspectEV — CLAUDE.md

## Project Identity
**InspectEV** (fost VoltCheck) — aplicație cross-platform pentru inspecție EV (iOS/Android/Web).
Domeniu live: `inspect-ev.app` | Piață primară: România | Limbi: RO + EN

---

## Stack Rapid
| Layer | Tehnologie |
|---|---|
| Framework | Expo 54 + React Native 0.81 + React 19 |
| Routing | Expo Router 6 (file-based, `app/`) |
| Backend | Firebase (Firestore, Auth, Functions Node 20, Storage) |
| Payment | Stripe native (@stripe/stripe-react-native 0.58) + web (@stripe/stripe-js 5.0) |
| State | Zustand 5 |
| i18n | i18next (RO/EN, fișiere în `locales/`) |
| EV Telemetry | Smartcar OAuth |
| Deploy Web | Vercel (CSP headers în `vercel.json`) |
| Deploy Native | EAS Build (iOS TestFlight + Android) |
| TypeScript | Strict mode, path alias `@/*` → root |

---

## Hartă Directoare (Critice)

```
app/                    → Ecrane (Expo Router file-based)
  (auth)/login.tsx      → Firebase Auth UI
  (tabs)/               → 4 tab-uri principale
  payment.tsx           → Flux Stripe (mock isolation via EXPO_PUBLIC_USE_MOCK_DATA)
  report/[id].tsx       → Raport dinamic
  camera-scan.tsx       → Scanare VIN cu cameră

components/
  payment/              → OrderSummary, PaymentStatusOverlay
  scan/                 → VinInputCard, VehicleResultCard, LevelSelector
  RecallMap.tsx         → Vizualizare recall-uri NHTSA
  ReportRadar.tsx       → Grafic radar risc

functions/src/          → Firebase Cloud Functions (Node 20, TypeScript → lib/)
  reportPipeline.ts     → Pipeline central ML/scoring ← CORE
  riskEngine.ts         → Logică scoring și confidență ← CORE
  handleStripeWebhook.ts→ Webhook idempotent Stripe ← PAYMENT CRITICAL
  pipelineLogger.ts     → Logging structurat cu correlation IDs ← USE THIS, not console.log
  types/firestore.ts    → Schema Firestore (sursa de adevăr pentru tipuri)

services/               → Wrappers API client-side
  cloudFunctions.ts     → paymentId→reportId mapping
  firebase.ts           → Inițializare Firebase
  stripeService.ts      → Stripe nativ (iOS/Android)
  stripeService.web.ts  → Stripe.js web

store/                  → Zustand stores
  useAuthStore.ts
  useReportStore.ts
  useVehicleStore.ts

utils/
  riskEngine.ts         → Client-side risk scoring (trebuie să se potrivească cu backend)
  vinDecoder.ts
  encryption.ts

types/firestore.ts      → Tipuri Firestore shared (client+server)
```

---

## Reguli Critice — RESPECTĂ ÎNTOTDEAUNA

### Securitate
- **NU** adăuga `console.log` în `functions/src/` — folosește `pipelineLogger.ts` cu correlation ID
- **NU** expune chei API în cod client — doar `EXPO_PUBLIC_*` în `.env`
- **NU** modifica `firestore.rules` fără să verifici că RLS rămâne corect
- **NU** scrie date în colecțiile `reports/`, `payments/`, `vin_cache/` din client — server-only
- VIN-urile trebuie mascate în logs: afișează doar ultimele 4 caractere (`****XXXX`)

### Arhitectură
- `utils/riskEngine.ts` (client) și `functions/src/utils/riskEngine.ts` (server) **trebuie să rămână sincronizate**
- Mock mode: `EXPO_PUBLIC_USE_MOCK_DATA=true` izolează Stripe — nu schimba logica de mock fără a actualiza ambele `stripeService.ts` și `stripeService.web.ts`
- Stripe: `stripeService.ts` = nativ iOS/Android, `stripeService.web.ts` = web (rezoluție automată prin Metro)

### TypeScript
- **Strict mode** pentru tot — nu folosi `any` fără comentariu justificativ
- Path alias: folosește `@/components/...` nu `../../components/...`
- Functions au `tsconfig` separat (target ES2020, CommonJS) față de Expo (ESNext)

### i18n
- Orice text vizibil utilizatorului → folosește `useTranslation()` hook
- Adaugă cheile în **ambele** `locales/ro.json` și `locales/en.json`

---

## Workflows de Dezvoltare

### Start Dev
```bash
# Terminal 1 — Expo dev server
npm start

# Terminal 2 — Firebase emulator (local backend)
cd functions && npm run serve

# Terminal 3 — Functions watch (dacă modifici functions)
cd functions && npm run build:watch
```

### Variabile de Mediu
Copiază `.env.example` → `.env.local`. Variabilele critice:
- `EXPO_PUBLIC_FIREBASE_*` — configurare Firebase
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe web
- `EXPO_PUBLIC_USE_MOCK_DATA=true` — activează mock mode (nu apelează Stripe real)

### Firebase Emulator
```bash
firebase emulators:start
# UI la http://localhost:4000
# Firestore la http://localhost:8080
# Functions la http://localhost:5001
# Auth la http://localhost:9099
```

---

## Testare

### Jest (Functions)
```bash
cd functions && npm test                    # Rulează toate testele
cd functions && npm test -- --watch        # Watch mode
cd functions && npm test -- --coverage     # Coverage report
```
Teste se află în `functions/src/__tests__/`

### TypeScript Check
```bash
npx tsc --noEmit                           # Root (Expo)
cd functions && npx tsc --noEmit           # Functions
```

### Lint + Format
```bash
npm run lint                               # ESLint strict (0 warnings)
npm run format                             # Prettier
```

### Pre-commit (automat via Husky)
Husky rulează `lint-staged` la fiecare commit: ESLint fix + Prettier pe `*.ts`, `*.tsx`, `*.json`, `*.md`

---

## Deployment

### Web (Vercel)
```bash
npx expo export --platform web            # Build → dist/
# Vercel deploy automat din GitHub main branch
```
Headers CSP configurate în `vercel.json`.

### Firebase Functions
```bash
cd functions && npm run build              # Compilare TypeScript → lib/
firebase deploy --only functions           # Deploy la Firebase
firebase deploy --only firestore:rules     # Deploy Firestore rules
firebase deploy --only storage             # Deploy Storage rules
```

### Native (EAS)
```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas submit --platform ios                  # Submit TestFlight
```

---

## Firestore Schema (Colecții Principale)

| Colecție | Acces Client | Note |
|---|---|---|
| `users/{userId}` | Read/Write (own) | Nu modifica `stripeCustomerId`, `createdAt` din client |
| `vehicles/{vehicleId}` | Read/Write (own) | VIN trebuie să fie exact 17 caractere |
| `reports/{reportId}` | Read (own) | Server-only write |
| `payments/{paymentId}` | Read (own) | Server-only write |
| `vin_cache/{vinId}` | Server-only | Cache provideri VIN |
| `rate_limits/{docId}` | Server-only | Nu citi din client |

---

## Provideri Date VIN
Configurați în `functions/src/config/providers.ts`:
- **CarVertical** — primar
- **AutoDNA** — fallback
- **EpicVIN** — fallback secundar
- **NHTSA VPIC** — gratuit, pentru recalls + date de bază

---

## Convenții Commit
```
feat(scope): descriere
fix(scope): descriere
refactor(scope): descriere
docs(scope): descriere
test(scope): descriere
chore(scope): descriere
```
Scopes utile: `payment`, `report`, `auth`, `vin`, `functions`, `ui`, `security`

---

## MCP Servers Active
- **Vercel** `mcp__c46a5615-...` — deploy, runtime logs, build status, documentație
- **Firebase** `mcp__plugin_firebase_firebase__*` — Firestore live, Functions logs, Auth, Security Rules, Remote Config
- **Claude Preview** — preview web la `localhost`
- **Supabase** `mcp__5f0e810b-...` — disponibil dar nefolosit (proiectul folosește Firebase)

Firebase MCP — operații **auto-aprobate** (read-only): `get_project`, `list_apps`, `get_security_rules`, `validate_security_rules`, `firestore_query_collection`, `firestore_get_document`, `functions_get_logs`, `auth_get_users`, `remoteconfig_get_template`
Firebase MCP — operații **cu confirmare** (write): `firestore_update_document`, `firestore_add_document`, `auth_update_user`, `remoteconfig_update_template`
Firebase MCP — operații **blocate** (destructive): `firestore_delete_database`, `firebase_create_project`

---

## Comenzi Slash Disponibile (`/comandă`)

### Calitate & Siguranță
| Comandă | Scop |
|---|---|
| `/full-check` | TS + ESLint + Jest + Security — raport complet pre-commit |
| `/type-check` | TypeScript strict check pe root + functions |
| `/audit-security` | Scanare chei hardcodate, console.log, VIN unmasked, TODO/FIXME |
| `/check-env` | Validează `.env.local` fără a expune valori |

### Testing & Debug
| Comandă | Scop |
|---|---|
| `/test-functions` | Jest cu coverage + analiză eșecuri |
| `/vin-pipeline-debug <VIN>` | Debug complet pipeline VIN în producție |
| `/payment-flow-audit` | Audit flux Stripe: cod + date live + securitate |
| `/smartcar-debug` | Debug OAuth Smartcar + telemetrie + webhook |
| `/functions-health` | Sănătate Cloud Functions via Firebase MCP |
| `/recall-health` | Test integrare NHTSA + calitate date RecallMap |

### Deploy & Infrastructură
| Comandă | Scop |
|---|---|
| `/deploy-functions` | Build → test → deploy Firebase Functions cu confirmare |
| `/vercel-deploy-web` | Build Expo web → deploy Vercel cu smoke test |
| `/emulator` | Instrucțiuni + verificări Firebase Emulator Suite |

### Sincronizare & Consistență
| Comandă | Scop |
|---|---|
| `/sync-risk-engine` | Compară riskEngine client vs server (trebuie identice) |
| `/schema-sync` | Sincronizează tipuri Firestore client ↔ server |
| `/i18n-sync` | Audit traduceri RO/EN, texte hardcodate, chei lipsă |
| `/bundle-check` | Analiză bundle web: dimensiune, lazy loading, imports Firebase |

### Inovație
| Comandă | Scop |
|---|---|
| `/innovation-proposal <idee>` | Propunere structurată: fezabilitate, efort, plan implementare |
| `/firestore-live-audit` | Audit complet Firestore producție: date, indexuri, rules |

---

## Fișiere Sensibile — NU MODIFICA FĂRĂ CONFIRMARE
- `firestore.rules` — RLS pentru toată baza de date
- `storage.rules` — acces fișiere PDF/assets
- `functions/src/handleStripeWebhook.ts` — logică financiară critică
- `functions/src/reportPipeline.ts` — pipeline central scoring
- `.env` / `.env.local` — nu commita niciodată
- `google-services.json` / `GoogleService-Info.plist` — nu commita (în .gitignore)
