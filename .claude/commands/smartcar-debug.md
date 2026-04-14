# smartcar-debug

Debug complet al integrării Smartcar OAuth — flux token, date telemetrie EV, webhook-uri.

## Pași

### 1. Audit Cod OAuth Flow
Citește `services/smartcar.ts` și `functions/src/smartcar/smartcarExchange.ts`:
- URL de redirect configurat corect (`inspectev://smartcar-connect`)?
- Token exchange securizat pe server (nu expune client_secret în frontend)?
- Refresh token gestionat? Expiră după 60 zile dacă vehiculul nu e conectat.
- Scope-urile OAuth cerute sunt minime necesare? (`read_vehicle_info`, `read_battery`, `read_charge`)

### 2. Audit Webhook Smartcar
Citește `functions/src/smartcar/smartcarWebhook.ts`:
- Signature verification implementată? (`SC-Signature` header)
- Webhook secret stocat sigur (nu în cod)?
- Event types gestionate: `schedule` (periodic telemetry), `event:battery:low`?
- Date stocate corect în `smartcar_snapshots/{vehicleId}` cu timestamp?

### 3. Verificare Date Live Firestore (Firebase MCP)
```
firestore_list_collections → caută colecțiile smartcar_*
firestore_list_documents: "smartcar_tokens" (primele 3, fără a afișa token-urile)
firestore_list_documents: "smartcar_snapshots" (primele 5)
```
Verifică:
- Token-urile sunt criptate în Firestore? (nu stocate plaintext)
- Snapshot-urile au timestamp corect?
- Colecția `smartcar_alerts` are date recente?

### 4. Verificare Ecran Connect
Citește `app/smartcar-connect.tsx`:
- Loading states corecte?
- Error handling pentru: user deny, vehicle incompatibil, timeout?
- Deep link `inspectev://smartcar-connect?code=...` gestionat?

### 5. Verificare Eligibility Check
Citește `functions/src/smartcar/checkEligibility.ts`:
- Lista de vehicule compatibile actualizată?
- Vehiculele non-EV sunt blocate corect?

### 6. Raport
- **OAuth flow:** ✓/✗ (server-side exchange)
- **Webhook security:** ✓/✗ (signature verificată)
- **Token storage:** ✓/✗ (criptat)
- **Active connections:** N vehicule conectate
- **Probleme:** lista cu severitate
