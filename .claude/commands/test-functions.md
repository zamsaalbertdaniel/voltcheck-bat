# test-functions

Rulează suita completă de teste Jest pentru Firebase Functions și prezintă un raport clar.

## Pași

1. Rulează `cd /c/Users/Albert/Desktop/VoltCheck/functions && npm test -- --coverage --verbose 2>&1`.

2. Parsează output-ul și prezintă:
   - **Teste trecute** ✓ (număr)
   - **Teste eșuate** ✗ (număr + numele testelor + mesajul de eroare)
   - **Coverage sumar** — linii, branch-uri, funcții, statements (%)
   - **Fișiere testate** — lista

3. Dacă există teste eșuate, analizează cauza probabilă și sugerează fix-ul.

4. Dacă coverage < 60% pe fișierele critice (`reportPipeline.ts`, `riskEngine.ts`, `handleStripeWebhook.ts`), semnalează ca risc.
