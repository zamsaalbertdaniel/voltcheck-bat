# full-check

Verificare completă pre-commit/pre-deploy: TypeScript + ESLint + Teste + Securitate.
Rulează TOATE verificările și prezintă un raport consolidat.

## Pași (în ordine, paralel unde posibil)

### Pas 1 — TypeScript (ambele proiecte simultan)
```bash
# Root
cd /c/Users/Albert/Desktop/VoltCheck && npx tsc --noEmit 2>&1 | grep -v "^$" | head -30

# Functions  
cd /c/Users/Albert/Desktop/VoltCheck/functions && npx tsc --noEmit 2>&1 | grep -v "^$" | head -30
```

### Pas 2 — ESLint
```bash
cd /c/Users/Albert/Desktop/VoltCheck && npm run lint 2>&1 | tail -20
```

### Pas 3 — Jest Tests
```bash
cd /c/Users/Albert/Desktop/VoltCheck/functions && npm test -- --passWithNoTests 2>&1 | tail -15
```

### Pas 4 — Chei hardcodate (rapid)
```bash
grep -rn "sk_live\|pk_live\|AIza[A-Za-z0-9_-]\{30\}" \
  /c/Users/Albert/Desktop/VoltCheck/app \
  /c/Users/Albert/Desktop/VoltCheck/functions/src \
  /c/Users/Albert/Desktop/VoltCheck/services \
  --include=*.ts --include=*.tsx 2>/dev/null
```

### Pas 5 — Console.log în Functions
```bash
grep -rn "console\.log" /c/Users/Albert/Desktop/VoltCheck/functions/src --include=*.ts 2>/dev/null | head -10
```

## Raport Final

Prezintă un tabel sumar:

| Verificare | Status | Detalii |
|---|---|---|
| TypeScript Root | ✓/✗ | Nr erori |
| TypeScript Functions | ✓/✗ | Nr erori |
| ESLint | ✓/✗ | Nr warnings/errors |
| Jest Tests | ✓/✗ | Passed/Failed/Total |
| Chei Hardcodate | ✓/✗ | Găsite/Nu |
| Console.log | ✓/⚠ | Nr instanțe |

**Verdict:** GATA DE COMMIT / PROBLEME DE REZOLVAT

Dacă există probleme, listează-le în ordine de prioritate și sugerează fix-urile.
