# payment-flow-audit

Audit complet al fluxului de plată Stripe — cod, date live, securitate.
Identifică breșe, race conditions, cazuri neacoperite.

## Pași

### 1. Audit Cod Client
Citește `app/payment.tsx`, `services/stripeService.ts`, `services/stripeService.web.ts`, `services/cloudFunctions.ts`:
- Fluxul `paymentIntentId → reportId` mapare corectă?
- Mock mode (`EXPO_PUBLIC_USE_MOCK_DATA`) izolat complet? Nu poate fi activat în prod?
- Error handling pentru: card declined, network error, webhook timeout
- Loading states și prevenire double-submit

### 2. Audit Cod Server (Functions)
Citește `functions/src/payment/createPaymentIntent.ts` și `handleStripeWebhook.ts`:
- Idempotency key prezent pe toate operațiunile Stripe?
- Webhook signature verificată (`stripe.webhooks.constructEvent`)?
- Toate event types gestionate? (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`)
- Race condition între webhook și polling client?
- Cleanup dacă raportul eșuează după plata confirmată?

### 3. Verificare Date Live (Firebase MCP)
```
firestore_query_collection: "payments" unde status="pending" mai vechi de 1 oră
firestore_query_collection: "payments" unde status="completed" fără reportId asociat
```
- Plăți blocate în "pending" → bani luați, raport negenerat
- Plăți "completed" fără raport → eroare pipeline

### 4. Logs Functions (Firebase MCP)
```
functions_get_logs: funcția "handleStripeWebhook" ultimele 100 entries
functions_get_logs: funcția "createPaymentIntent" ultimele 50 entries
```
Identifică erori, retry-uri, webhook-uri duplicate.

### 5. Verificare Firestore Rules pentru Payment
Verifică în `firestore.rules`:
- `payments/{paymentId}` — clientul poate citi doar propriile plăți?
- Clientul nu poate scrie/modifica payments?
- Server (admin SDK) poate scrie fără restricții?

### 6. Raport Securitate Plăți
Prezintă:
- **Plăți blocate:** N (risc financiar!)
- **Plăți orfane:** N (raport negenerat)
- **Webhook securitate:** ✓/✗ signature verificată
- **Idempotency:** ✓/✗ implementat
- **Mock isolation:** ✓/✗ nu scapă în prod
- **Vulnerabilități identificate:** lista cu severitate CRITICĂ/ÎNALTĂ/MEDIE
- **Fix-uri recomandate:** în ordine de prioritate
