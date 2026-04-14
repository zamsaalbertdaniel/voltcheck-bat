# type-check

Verificare completă TypeScript pe întregul proiect (Expo + Functions).

## Pași

1. **Check Expo (root):**
   ```
   cd /c/Users/Albert/Desktop/VoltCheck && npx tsc --noEmit 2>&1
   ```

2. **Check Functions:**
   ```
   cd /c/Users/Albert/Desktop/VoltCheck/functions && npx tsc --noEmit 2>&1
   ```

3. Prezintă rezultatele:
   - Dacă 0 erori: "✓ TypeScript OK — root și functions fără erori"
   - Dacă există erori: listează **fișier:linie — mesaj eroare**, grupate pe root vs functions
   - Prioritizează erorile din `functions/src/` față de erori din `node_modules/`

4. Ignoră erorile din `functions/lib/`, `node_modules/`, `.expo/`.
