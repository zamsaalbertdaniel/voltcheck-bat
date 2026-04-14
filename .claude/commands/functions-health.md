# functions-health

Verificare sănătate completă a Firebase Cloud Functions — live, via Firebase MCP.

## Pași

### 1. Lista Funcțiilor Deploy-uite
```
functions_list_functions → toate funcțiile active în producție
```
Compară cu funcțiile exportate în `functions/src/index.ts`:
- Funcții în producție dar neexistente în cod → zombie functions (șterge!)
- Funcții în cod dar nedeployate → lipsă din producție

### 2. Logs Erori Recente (ultimele 24h)
```
functions_get_logs: severity="ERROR" → ultimele 50
functions_get_logs: severity="WARNING" → ultimele 20
```
Grupează erorile pe funcție și tip, identifică pattern-uri:
- Timeout-uri frecvente → funcție prea lentă
- Memory exceeded → leak sau date prea mari
- Unhandled promise → bug async
- Provider API errors → CarVertical/AutoDNA down?

### 3. Verificare Funcție Health Check
```
functions_get_logs: funcția "healthCheck" → ultimele 10 intrări
```
Confirmă că startup validation (din `index.ts`) trece cu succes.

### 4. Verificare Webhook Stripe
```
functions_get_logs: funcția "handleStripeWebhook" → ultimele 20
```
- Webhook-uri procesate cu succes? 
- Event-uri duplicate? (idempotency key funcționează?)
- Signature verification failures? (posibil atac sau configurare greșită)

### 5. Cleanup Scheduler
```
functions_get_logs: funcția "cleanupExpired" → ultimele 5 rulări
```
- Rulează conform schedule?
- Câte documente curăță per rulare?

### 6. Report
Prezintă tabel:
| Funcție | Status | Erori 24h | Ultimul apel | Note |
|---|---|---|---|---|
| generateReport | ✓/✗ | N | timestamp | |
| handleStripeWebhook | ✓/✗ | N | timestamp | |
| healthCheck | ✓/✗ | N | timestamp | |
| cleanupExpired | ✓/✗ | N | timestamp | |
| ... | | | | |

**Funcții care necesită atenție:** lista + recomandare
