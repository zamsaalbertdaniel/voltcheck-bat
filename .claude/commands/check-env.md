# check-env

Validează că toate variabilele de mediu necesare sunt configurate corect în `.env.local`.

## Pași

1. **Citește `.env.example`** pentru lista completă de variabile necesare.

2. **Verifică existența `.env.local`:**
   ```bash
   ls /c/Users/Albert/Desktop/VoltCheck/.env.local 2>/dev/null && echo "EXISTĂ" || echo "LIPSĂ"
   ```

3. Dacă `.env.local` există, verifică că fiecare variabilă din `.env.example` are o valoare (nu goală) în `.env.local`. 
   **NU afișa valorile reale** — afișează doar `[SET]` sau `[LIPSĂ]` pentru fiecare.

4. Grupează rezultatele:
   - **Firebase** (`EXPO_PUBLIC_FIREBASE_*`)
   - **Stripe** (`EXPO_PUBLIC_STRIPE_*`)
   - **Auth** (`EXPO_PUBLIC_GOOGLE_*`)
   - **Features** (`EXPO_PUBLIC_USE_*`, `EXPO_PUBLIC_FUNCTIONS_REGION`)
   - **Smartcar** (`EXPO_PUBLIC_SMARTCAR_*`)

5. Raportează variabilele lipsă și impactul lor (ce funcționalitate nu va merge).

**Securitate:** Nu afișa, nu loga, nu trimite nicăieri valorile din `.env.local`.
