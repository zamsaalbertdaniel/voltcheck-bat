# emulator

Pornește Firebase Emulator Suite pentru development local complet (fără Firebase real).

## Pași

1. Verifică dacă emulatorul rulează deja:
   ```bash
   curl -s -m 3 http://localhost:4000/ 2>/dev/null && echo "RULEAZĂ" || echo "OPRIT"
   ```

2. Dacă rulează deja, afișează URL-urile active și oprește-te.

3. Dacă nu rulează, explică utilizatorului că trebuie să pornești emulatorul manual în terminal:
   ```bash
   cd /c/Users/Albert/Desktop/VoltCheck
   firebase emulators:start
   ```
   
   Și afișează URL-urile după pornire:
   - **Firebase UI:** http://localhost:4000
   - **Firestore:** http://localhost:8080
   - **Functions:** http://localhost:5001
   - **Auth:** http://localhost:9099
   - **Storage:** http://localhost:9199

4. Amintește că în `.env.local` trebuie setat:
   ```
   EXPO_PUBLIC_USE_EMULATOR=true  (dacă există flag-ul)
   EXPO_PUBLIC_USE_MOCK_DATA=true  (pentru Stripe mock)
   ```

5. Verifică că `functions/lib/` există (build necesar pentru emulator):
   ```bash
   ls /c/Users/Albert/Desktop/VoltCheck/functions/lib/index.js 2>/dev/null && echo "Build OK" || echo "LIPSĂ — rulează: cd functions && npm run build"
   ```
