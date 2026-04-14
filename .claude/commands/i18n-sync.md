# i18n-sync

Sincronizează și auditează traducerile RO/EN. Găsește chei lipsă, texte hardcodate, inconsistențe.

## Pași

### 1. Citește fișierele de traducere
- `locales/ro.json` — sursa primară (română)
- `locales/en.json` — traducere engleză

### 2. Audit chei
Compară structura JSON și raportează:
- **Chei în RO dar lipsă în EN** → trebuie traduse
- **Chei în EN dar lipsă în RO** → probabil adăugate doar în EN, verifică
- **Valori identice în RO și EN** → posibil netraduse (ex: termeni tehnici OK, altele NU)
- **Valori goale** (`""`) în oricare fișier

### 3. Scan texte hardcodate în cod
```bash
grep -rn "\"[A-Z][a-z].*\"" /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/components \
  --include=*.tsx | grep -v "t(\|useTranslation\|import\|//\|testID\|className\|style\|key=" | head -30
```
Identifică string-uri UI care nu folosesc `t('...')`.

### 4. Verifică chei folosite dar nedefinite
```bash
grep -rohn "t('[^']*')" /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/components --include=*.tsx \
  | sed "s/.*t('\([^']*\)'.*/\1/" | sort -u
```
Compară lista cu cheile din `ro.json` și raportează ce lipsește.

### 5. Raport + Fix automat
- Prezintă toate problemele găsite
- Dacă există chei lipsă în EN: generează traducerile EN pentru cheile RO lipsă și propune patch-ul pentru `locales/en.json`
- Dacă există texte hardcodate: sugerează cheia de traducere și valoarea

**Nu modifica fișierele automat** — prezintă diff-ul și așteaptă confirmare.
