# firestore-live-audit

Audit complet al bazei de date Firestore live folosind Firebase MCP.
Verifică integritate date, respectare reguli, indexuri, performanță.

## Pași

### 1. Schema vs Realitate
Via Firebase MCP:
```
firestore_list_collections → listează toate colecțiile existente
```
Compară cu schema din `types/firestore.ts` și `functions/src/types/firestore.ts`:
- Colecții în producție dar nedocumentate în tipuri → posibil date orfane
- Colecții în tipuri dar inexistente în producție → OK (pot fi goale)

### 2. Audit Reguli Securitate
```
firebase_get_security_rules → citește regulile Firestore live
firebase_validate_security_rules → validare sintaxă și logică
```
Compară cu `firestore.rules` din repo — sunt în sync?

### 3. Sample Date Critice
```
firestore_list_documents: "users" (primele 5, fără date personale)
firestore_list_documents: "reports" (primele 5)
firestore_query_collection: "payments" status="failed" (ultimele 10)
```
Verifică:
- Structura documentelor respectă schema TypeScript
- Câmpuri `createdAt`, `updatedAt` prezente
- Nicio cheie API sau secret în documente

### 4. Indexuri
```
firestore_list_indexes → toate indexurile active
```
Compară cu `firestore.indexes.json`:
- Indexuri în producție dar nu în repo → risc de drift
- Indexuri în repo dar nu în producție → interogări lente posibile

### 5. Anomalii Date
```
firestore_query_collection: "rate_limits" (toate documentele)
firestore_query_collection: "system_logs" (ultimele 20, filtru severity="error")
```
Identifică rate limiting activ, erori recente în sistem.

### 6. Raport Final
Prezintă:
- **Schema sync:** ✓/✗
- **Rules sync:** ✓/✗  
- **Indexuri sync:** ✓/✗ (N lipsă)
- **Erori recente:** N erori în ultimele 24h
- **Rate limits active:** N useri limitați
- **Anomalii date:** lista probleme
- **Recomandări:** prioritizate
