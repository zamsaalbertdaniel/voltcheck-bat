# schema-sync

Sincronizează tipurile TypeScript Firestore între client (`types/firestore.ts`) și server (`functions/src/types/firestore.ts`).
Acestea trebuie să fie identice — divergența cauzează bug-uri silent la runtime.

## Pași

### 1. Citește ambele fișiere complet
- `types/firestore.ts` (client-side, folosit în app/ și services/)
- `functions/src/types/firestore.ts` (server-side, folosit în Cloud Functions)

### 2. Compară structura
Pentru fiecare interfață/tip exportat:
- **Prezent în ambele?** → OK dacă identic, PROBLEMĂ dacă diferit
- **Prezent doar în client?** → tipul nu e folosit în functions (poate fi OK pentru tipuri UI-only)
- **Prezent doar în server?** → funcțiile returnează câmpuri pe care clientul nu le cunoaște

### 3. Detectează divergențe câmp cu câmp
Pentru interfețele comune (ex: `Report`, `Vehicle`, `Payment`, `UserProfile`):
```
Câmp X: client = string | null, server = string  → INCOMPATIBIL
Câmp Y: prezent server, absent client             → CLIENT ORB LA DATE
Câmp Z: tipuri identice                            → OK
```

### 4. Verificare cu date reale (Firebase MCP)
```
firestore_get_document: "reports/<un_id_real>" → structura reală din producție
```
Compară cu interfața TypeScript — câmpuri în producție dar nedeclarate în tipuri?

### 5. Propune Fix
Dacă există divergențe, propune versiunea unificată și întreabă:
- Actualizăm clientul după server (sursa de adevăr = functions)?
- Sau creăm un pachet shared tipuri (ex: `types/shared.ts` importat în ambele)?

**Nu modifica automat** — prezintă diff și așteaptă confirmare.

### 6. Verificare Import Paths
Confirmă că după orice modificare:
```bash
cd /c/Users/Albert/Desktop/VoltCheck && npx tsc --noEmit 2>&1 | grep "types/firestore" | head -20
cd /c/Users/Albert/Desktop/VoltCheck/functions && npx tsc --noEmit 2>&1 | grep "types/firestore" | head -20
```
