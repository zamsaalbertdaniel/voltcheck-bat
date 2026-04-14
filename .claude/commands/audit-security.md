# audit-security

Scanare completă de securitate a codului sursă InspectEV. Identifică vulnerabilități, date hardcodate și probleme GDPR.

## Verificări

### 1. Chei hardcodate / Secrete
```bash
grep -rn "sk_live\|pk_live\|AIza\|AAAA[A-Za-z0-9_-]\{140\}\|-----BEGIN" \
  /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/functions/src \
  /c/Users/Albert/Desktop/VoltCheck/services \
  --include=*.ts --include=*.tsx
```

### 2. Console.log în Functions (date sensibile pot fi loggate)
```bash
grep -rn "console\.log\|console\.error" \
  /c/Users/Albert/Desktop/VoltCheck/functions/src \
  --include=*.ts
```

### 3. VIN-uri nemasked în logs
```bash
grep -rn "vin\|VIN" /c/Users/Albert/Desktop/VoltCheck/functions/src --include=*.ts \
  | grep -i "log\|print\|console"
```

### 4. Operații Firestore din client fără verificare auth
Citește fișierele din `services/` și `app/` și identifică orice `setDoc`, `addDoc`, `updateDoc` pe colecțiile `reports`, `payments`, `vin_cache` — acestea trebuie să fie **server-only**.

### 5. EXPO_PUBLIC_* folosit pentru secrete
```bash
grep -rn "EXPO_PUBLIC_" /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/services \
  /c/Users/Albert/Desktop/VoltCheck/utils \
  --include=*.ts --include=*.tsx \
  | grep -iv "firebase\|stripe_publishable\|google_web\|smartcar_client\|recaptcha_site\|mock\|functions_region"
```

### 6. Verifică .gitignore (protejează fișierele sensibile)
```bash
cat /c/Users/Albert/Desktop/VoltCheck/.gitignore | grep -E "\.env|google-services|GoogleService|\.plist|\.jks|serviceAccount"
```

### 7. TODO/FIXME/SECURITY în cod
```bash
grep -rn "TODO\|FIXME\|SECURITY\|HACK\|XXX" \
  /c/Users/Albert/Desktop/VoltCheck/functions/src \
  /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/services \
  --include=*.ts --include=*.tsx
```

## Raport

Prezintă rezultatele grupate pe categorii de risc:
- **CRITIC** — chei reale expuse, write client pe colecții server-only
- **AVERTISMENT** — console.log în functions, VIN nemascat
- **INFO** — TODO-uri, potențiale îmbunătățiri
