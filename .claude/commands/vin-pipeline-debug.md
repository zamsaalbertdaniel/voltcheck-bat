# vin-pipeline-debug

Debug complet al pipeline-ului pentru un VIN specific — de la decodare până la raport final.
Folosește Firebase MCP pentru a inspecta date live din producție.

## Input
Primești un VIN (17 caractere) ca argument: `/vin-pipeline-debug <VIN>`

## Pași

### 1. Validare VIN
- Verifică: exact 17 caractere, fără I/O/Q, conform standardului ISO 3779
- Extrage: WMI (primele 3), VDS (4-9), VIS (10-17)
- Identifică producătorul și anul model din coduri

### 2. Verificare Cache Firestore (via Firebase MCP)
```
firestore_query_collection: colecție "vin_cache", filtru pe câmpul "vin" = <VIN>
```
- Dacă există: afișează data cache, providerii folosiți, scorul de confidență, data expirării
- Dacă nu există: "VIN necacheuit — va fi apelat provider extern"

### 3. Verificare Rapoarte Existente
```
firestore_query_collection: colecție "reports", filtru "vin" = <VIN> (ultimele 5)
```
- Listează rapoartele: ID, status, nivel, data, userId (mascat), scor risc

### 4. Verificare Recall-uri NHTSA Live
```bash
curl -s "https://api.nhtsa.gov/recalls/recallsByVehicle?make=<make>&model=<model>&modelYear=<year>" | head -100
```
- Afișează numărul de recall-uri active și cele critice (componenta "FUEL SYSTEM", "BRAKES", "STEERING")

### 5. Analiză Logs Functions (via Firebase MCP)
```
functions_get_logs: funcția "generateReport" sau "reportPipeline", ultimele 50 linii filtrate pe VIN
```
- Identifică erori, timeout-uri, provideri care au eșuat pentru acest VIN

### 6. Simulare Risk Score
Citește `functions/src/utils/riskEngine.ts` și calculează manual scorul estimat bazat pe:
- Vârsta vehiculului
- Număr recall-uri active
- Provideri disponibili pentru acest WMI

### 7. Raport Final
Prezintă:
- **Status pipeline:** OK / ERORI IDENTIFICATE
- **Cache:** HIT/MISS + vârstă date
- **Recall-uri:** N recall-uri (X critice)
- **Risk score estimat:** X/100
- **Probleme detectate:** lista cu severitate
- **Recomandare:** ce acțiune este necesară
