---
description: VoltCheck improvement plan status and implementation workflow
---

# VoltCheck Improvement Plan Workflow

## Overview
This workflow tracks the 8-step improvement plan for VoltCheck approved on 2026-03-19.
The master plan is stored in `IMPROVEMENT_PLAN.md` at the project root.

## Ultima sesiune: 2026-03-22

### Ce s-a rezolvat:
- ✅ **Pas 1** — Rescrie `payment.tsx` + mock isolation + badge-uri securitate
- ✅ **Pas 2** — Mapping `paymentId → reportId` pe client
- ✅ **Pas 3** — Idempotență webhook Stripe (3-layer protection)

### Ce urmează (de la Pas 4):
- ⬜ **Pas 4** — Confidence & Data Coverage în riskEngine (~3-4h)
- ⬜ **Pas 5** — Assessment Type Labels (~2h, depinde de Pas 4)
- ⬜ **Pas 6** — Surse exacte în PDF și UI (~3h, depinde de Pas 5)
- ⬜ **Pas 7** — Structured Logging (~2h, independent)
- ⬜ **Pas 8** — Test Matrix (~4-6h, depinde de toate)

### Fișiere modificate la Pas 1 & 2:
| Fișier | Ce s-a schimbat |
|--------|----------------|
| `services/cloudFunctions.ts` | `USE_MOCK_DATA` → env var + export, `subscribeToPaymentStatus()` nouă |
| `app/payment.tsx` | Rescriere completă: Stripe Payment Sheet, badges corecte, two-step flow |
| `app/report/[id].tsx` | Rescriere completă: fetch real Firestore, loading/processing/error states |
| `functions/src/payment/handleStripeWebhook.ts` | Salvează `reportId` pe payment doc |
| `.env.example` | `EXPO_PUBLIC_USE_MOCK_DATA=true` |
| `app.json` | Plugin `@stripe/stripe-react-native` |

### Fișiere modificate la Pas 3:
| Fișier | Ce s-a schimbat |
|--------|----------------|
| `functions/src/payment/handleStripeWebhook.ts` | Idempotency guard (pre-check + transaction re-check), atomic write, `stripeEventId` tracking |
| `types/firestore.ts` | `PaymentDoc` + `stripeEventId`, `processedAt`, `completedAt` |

## Protocol per Pas

### Înainte de a începe
1. Read `IMPROVEMENT_PLAN.md` for current status of all steps
2. Briefing detaliat: ce se modifică, impact pe alte fișiere, ce acțiuni trebuie de la user
3. Check the "Conflict Matrix" to ensure no file conflicts
4. Check "Dependențe între Pași" to ensure prerequisites are completed
5. Cere aprobarea userului înainte de a începe

### După ce termini
1. Verifică TypeScript: `npx tsc --noEmit`
2. Update `IMPROVEMENT_PLAN.md`: status → ✅ DONE
3. Raport cu ce s-a făcut, stadiu curent, ce urmează
4. Așteaptă aprobarea userului pentru pasul următor

## Key Files Reference
- Plan: `IMPROVEMENT_PLAN.md`
- Payment flow (client): `app/payment.tsx`
- Cloud functions service (client): `services/cloudFunctions.ts`
- Report screen: `app/report/[id].tsx`
- Stripe webhook: `functions/src/payment/handleStripeWebhook.ts`
- Report pipeline: `functions/src/report/reportPipeline.ts`
- Risk engine (server): `functions/src/utils/riskEngine.ts`
- Risk engine (client): `utils/riskEngine.ts`
- Security placeholders: `utils/encryption.ts`, `utils/fingerprint.ts`

## Step Order & Dependencies
```
Pas 1 ✅ → Pas 2 ✅ (secvențial)
Pas 3 ✅ (independent)
Pas 4 ⬜ → Pas 5 ⬜ → Pas 6 ⬜ (lanț secvențial)
Pas 7 ⬜ (independent, paralel cu 4-6)
Pas 8 ⬜ (final, depinde de toate)
```
