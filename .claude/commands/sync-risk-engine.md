# sync-risk-engine

Verifică și sincronizează `utils/riskEngine.ts` (client) cu `functions/src/utils/riskEngine.ts` (server).
Aceste două fișiere trebuie să producă rezultate identice pentru aceleași input-uri.

## Pași

1. **Citește ambele fișiere** complet.

2. **Compară:**
   - Funcțiile exportate (nume identice?)
   - Logica de scoring (formule, ponderi, praguri)
   - Tipurile de input/output
   - Constantele folosite

3. **Identifică divergențele:**
   - Funcții prezente în unul dar nu în celălalt
   - Formule diferite pentru același calcul
   - Tipuri incompatibile

4. **Raportează** divergențele găsite cu referințe exacte la linie.

5. Dacă există divergențe, întreabă care versiune este "sursa de adevăr" (client sau server) și propune patch-ul pentru a le sincroniza.

**Notă:** Nu modifica automat — prezintă diff-ul propus și așteaptă confirmare.
