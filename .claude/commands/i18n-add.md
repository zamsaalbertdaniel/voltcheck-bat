# i18n-add

Adaugă chei i18n simultan în `locales/ro.json` și `locales/en.json`, cu validare structurală (același set de chei în ambele fișiere).

## Argumente
`/i18n-add <namespace> <key1>=<RO>|<EN> [<key2>=<RO>|<EN> ...]`

Sau, dacă userul oferă un dict de chei structurat în prompt, parsează direct.

## Convenții
- Namespace e calea cu `.` ca separator (ex. `landing.matrix.live.soh`)
- Pe RO se acceptă diacritice
- Pe EN: titluri cu Title Case, descrieri în propoziție
- NU se rescriu chei existente fără confirmare

## Pași

### 1. Citește ambele fișiere
```
Read locales/ro.json
Read locales/en.json
```

### 2. Verifică structura sincronă
Înainte de orice modificare, validează că ambele fișiere au exact același set de chei (same shape). Folosește:
```bash
cd /c/Users/Albert/Desktop/VoltCheck && python -c "
import json
ro = json.load(open('locales/ro.json'))
en = json.load(open('locales/en.json'))

def keys(d, prefix=''):
    for k, v in d.items():
        path = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            yield from keys(v, path)
        else:
            yield path

ro_keys = set(keys(ro))
en_keys = set(keys(en))
diff = ro_keys ^ en_keys
if diff:
    print('DESYNC:', diff)
else:
    print('OK: synced')
" 2>&1
```

Dacă există desync, raportează cheile lipsă din fiecare fișier înainte de a continua.

### 3. Detectează conflicte
Dacă vreuna din cheile cerute există deja, listează-le și cere confirmare pentru overwrite (nu overwrite-uiește implicit).

### 4. Adaugă cheile
Folosește Edit tool pentru a adăuga la namespace-ul țintă în ambele fișiere. Păstrează:
- Indent-ul existent (2 spaces în ro, 4 în en — verifică)
- Ordinea alfabetică în namespace-ul țintă (dacă există convenție vizibilă)
- Escape pentru caractere speciale: `"`, `\n`, `\\`

### 5. Validează după edit
```bash
cd /c/Users/Albert/Desktop/VoltCheck && python -c "import json; json.load(open('locales/ro.json')); json.load(open('locales/en.json')); print('OK')"
```
Re-rulează verificarea de keys-set sincronizat (pasul 2).

### 6. Raport scurt
```
✅ Adăugat <N> chei în namespace `<namespace>`:
  - <key1>: RO="..." / EN="..."
  - ...
Sincronizare: OK (<total> chei comune)
```

## Greșeli de evitat
- **NU** șterge chei existente
- **NU** modifica structura JSON (schimbarea de la string la object într-o cheie existentă)
- **NU** uita escape pe `"` în valorile RO (a fost cauză de Metro bundler bug)

## Pattern-uri comune
- Eyebrow + heading + lead pe section nouă: `<ns>.eyebrow`, `<ns>.heading`, `<ns>.lead`
- Card cu title + desc: `<ns>.<card>.title` + `<ns>.<card>.desc`
- HUD label: cheie scurtă + UPPERCASE valoare
