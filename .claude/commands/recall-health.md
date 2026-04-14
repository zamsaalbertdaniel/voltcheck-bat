# recall-health

Verifică sănătatea integrării NHTSA recall și calitatea datelor RecallMap.

## Pași

### 1. Test API NHTSA Live
```bash
# Test cu un vehicul EV popular (Tesla Model 3, 2022)
curl -s -m 10 "https://api.nhtsa.gov/recalls/recallsByVehicle?make=TESLA&model=MODEL%203&modelYear=2022" | head -200

# Test cu format VIN
curl -s -m 10 "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=TESLA&model=MODEL%203&modelYear=2022" | head -100
```
Verifică: API răspunde? Format JSON corect? Câmpurile `NHTSACampaignNumber`, `Component`, `Summary` prezente?

### 2. Audit RecallClassifier
Citește `utils/recallClassifier.ts`:
- Categoriile de severitate sunt up-to-date cu categoriile NHTSA curente?
- Componentele critice acoperite? (FUEL SYSTEM, BRAKES, STEERING, AIR BAGS)
- Logica de scoring recall integrată corect în `riskEngine.ts`?

### 3. Audit RecallMap Component
Citește `components/RecallMap.tsx`:
- Datele sunt afișate corect pe hartă?
- Gestionează vehicule fără recall-uri (array gol)?
- Gestionează erori API (timeout, 404)?
- Recall-urile critice sunt evidențiate vizual?

### 4. Verificare Cache Recall în Firestore (Firebase MCP)
```
firestore_query_collection: "vin_cache" unde recallData exists (primele 5)
```
- Recall-urile sunt cacheuite? 
- Data ultimului refresh? (recall-urile se schimbă rar, cache de 7 zile e OK)

### 5. Raport
- **API NHTSA:** ✓/✗ (latență: Xms)
- **Recall classifier:** N categorii, acoperire critice ✓/✗
- **Cache:** N VIN-uri cu recall data cacheuit
- **Probleme:** lista
- **Recomandare:** actualizare necesară sau totul OK
