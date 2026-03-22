# VoltCheck — Master Improvement Plan
# ⚡ ACEST FIȘIER ESTE SURSA DE ADEVĂR PENTRU PLANUL DE ÎMBUNĂTĂȚIRI
# Actualizat: 2026-03-22T17:05:00+02:00
# Status: APROBAT — Pas 1 ✅ Pas 2 ✅ Pas 3 ✅ Pas 7 ✅ Pas 4 ✅ Pas 5 ✅ | Următorul: Pas 6

---

## Status Curent per Pas

| Pas | Descriere | Status | Fișiere cheie |
|-----|-----------|--------|---------------|
| 1 | Rescrie `payment.tsx` + mock isolation + badge-uri securitate | ✅ DONE | `payment.tsx`, `cloudFunctions.ts` |
| 2 | Mapping paymentId → reportId pe client | ✅ DONE | `cloudFunctions.ts`, `report/[id].tsx` |
| 3 | Idempotență webhook Stripe | ✅ DONE | `handleStripeWebhook.ts` |
| 4 | Confidence & Data Coverage în riskEngine | ✅ DONE | `riskEngine.ts`, `reportPipeline.ts` |
| 5 | Assessment Type Labels | ✅ DONE | `reportPipeline.ts`, `report/[id].tsx` |
| 6 | Surse exacte în PDF și UI | ⬜ NOT STARTED | `reportPipeline.ts`, `report/[id].tsx` |
| 7 | Structured Logging | ✅ DONE | `pipelineLogger.ts` (NEW), `reportPipeline.ts` |
| 8 | Test Matrix | ⬜ NOT STARTED | `functions/src/__tests__/*.test.ts` (NEW) |

**Legendă:** ⬜ NOT STARTED | 🔄 IN PROGRESS | ✅ DONE

---

## Conflict Matrix (Fișiere × Pași)

| Fișier | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `app/payment.tsx` | ✏️ | — | — | — | — | — | — | — |
| `services/cloudFunctions.ts` | ✏️ | ✏️ | — | — | — | — | — | — |
| `app/report/[id].tsx` | — | ✏️ | — | ✏️ | ✏️ | ✏️ | — | — |
| `functions/src/payment/handleStripeWebhook.ts` | — | — | ✏️ | — | — | — | ✏️ | — |
| `functions/src/report/reportPipeline.ts` | — | — | — | ✏️ | ✏️ | ✏️ | ✏️ | — |
| `functions/src/utils/riskEngine.ts` | — | — | — | ✏️ | — | — | — | ✏️ |
| `utils/riskEngine.ts` | — | — | — | ✏️ | — | — | — | ✏️ |

---

## Dependențe între Pași

- Pas 1 → Pas 2 (Pas 2 depinde de flow-ul real din Pas 1)
- Pas 4 → Pas 5 → Pas 6 (lanț secvențial)
- Pas 3 este independent (poate rula paralel cu Pas 1)
- Pas 7 este independent (poate rula paralel cu Pas 4)
- Pas 8 vine la final (depinde de toate celelalte)

### Ordine de execuție recomandată
```
Pas 1 ✅ → Pas 2 ✅ → Pas 3 ✅ → Pas 7 ✅ → Pas 4 ✅ → Pas 5 ✅ → Pas 6 ⬜ → Pas 8 ⬜
```
**De ce Pas 7 înainte de Pas 4:** Structured logging e esențial înainte de modificările
complexe din pipeline (4→5→6). Fără correlation IDs și logging bun,
debugging-ul Stripe + Firestore + report pipeline e mult mai dificil.

---

## User Actions Required

| Pas | Ce trebuie de la user |
|-----|----------------------|
| 1 | Confirmare: Stripe publishable key? SDK nativ sau web? |
| 8 | Testare manuală E2E pe device |
| Rest | Nimic — tot codul e autonom |

---

## Detalii per Pas

### Pas 1 — Rescrie `payment.tsx` + Mock Isolation (include fosta Pas 0)
**Timp estimat:** 4-6h

**Schimbări:**
1. `USE_MOCK_DATA = true` → `process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true'`
2. Badge-uri securitate: "AES-256" → "Secure Processing", "Device ID" → "Session Protected"
3. `payment.tsx` apelează `createPaymentIntentRemote()` real
4. Badge vizibil `🧪 Demo Mode` când mock e activ
5. Flow: plata OK → listener pe `payments/` → obține `reportId` → navighează la raport

**De ce Pas 0 s-a unit cu Pas 1:** Ambele modificau `payment.tsx`. Pas 0 ar fi schimbat 2 linii, apoi Pas 1 ar fi rescris tot fișierul. Mai eficient combinat.

---

### Pas 2 — Mapping paymentId → reportId pe client
**Timp estimat:** 2-3h

**Schimbări:**
1. Funcție nouă `subscribeToPaymentStatus()` în `cloudFunctions.ts`
2. `report/[id].tsx` — fetch real din Firestore, eliminare `MOCK_REPORT` hardcodat
3. Eliminare `demo_report_001` de peste tot

---

### Pas 3 — Idempotență Webhook Stripe
**Timp estimat:** 2h

**Schimbări:**
1. Check `payments/{paymentIntentId}.status === 'completed'` → early return
2. Firestore transaction pentru creare report
3. Salvare `event.id` + `processedAt` pe documentul payment

---

### Pas 4 — Confidence & Data Coverage
**Timp estimat:** 3-4h

**Schimbări:**
1. Extindere `RiskOutput` cu `confidence` + `dataCoverage`
2. Calcul automat: NHTSA +30%, Provider1 +25%, Provider2 +25%, Recalls +10%, Live +10%
3. Propagare din `reportPipeline.ts` → Firestore → UI

---

### Pas 5 — Assessment Type Labels
**Timp estimat:** 2h

**Schimbări:**
1. Câmp `assessmentType`: `risk_assessment` / `battery_estimated` / `battery_verified`
2. Auto-detectare bazat pe datele disponibile
3. UI badge pe ecranul de raport

---

### Pas 6 — Surse în PDF și UI
**Timp estimat:** 3h

**Schimbări:**
1. Footer per secțiune PDF: "Sursă: NHTSA | Actualizat: timestamp | Tip: Date publice"
2. Indicare "estimat" vs "măsurat"
3. Reflectare și în UI

---

### Pas 7 — Structured Logging
**Timp estimat:** 2h

**Schimbări:**
1. Fișier nou: `functions/src/utils/pipelineLogger.ts`
2. Format JSON cu: `scanSessionId`, `paymentIntentId`, `reportId`, provider timings, failure category

---

### Pas 8 — Test Matrix
**Timp estimat:** 4-6h

**Fișiere noi:**
- `functions/jest.config.ts`
- `functions/src/__tests__/riskEngine.test.ts`
- `functions/src/__tests__/handleStripeWebhook.test.ts`
- `functions/src/__tests__/reportPipeline.test.ts`

**Scenarii testate:**
- Webhook idempotent (Stripe retrimis)
- riskEngine scoruri corecte (edge cases)
- Pipeline fail-safe (NHTSA offline)
- VIN invalid / malformat

---

## Total: ~22-28h estimat
