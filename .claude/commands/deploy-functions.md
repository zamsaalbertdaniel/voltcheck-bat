# deploy-functions

Compilează și deployează Firebase Cloud Functions la producție, cu verificări pre-deploy.

## Pași

1. **Verifică tipurile** — rulează `cd /c/Users/Albert/Desktop/VoltCheck/functions && npx tsc --noEmit` și oprește dacă există erori TypeScript.

2. **Rulează testele** — rulează `cd /c/Users/Albert/Desktop/VoltCheck/functions && npm test -- --passWithNoTests 2>&1 | tail -20` și oprește dacă există teste eșuate.

3. **Verifică console.log** — rulează `grep -rn "console\.log\|console\.error\|console\.warn" /c/Users/Albert/Desktop/VoltCheck/functions/src --include=*.ts` și raportează orice `console.log` găsit (ar trebui să fie `pipelineLogger`). Continuă oricum dar avertizează.

4. **Build** — rulează `cd /c/Users/Albert/Desktop/VoltCheck/functions && npm run build 2>&1 | tail -10`.

5. **Confirmă deploy** — întreabă utilizatorul explicit: "Deployezi la PRODUCȚIE Firebase Functions. Ești sigur? (da/nu)"

6. **Deploy** — dacă confirmat, rulează `cd /c/Users/Albert/Desktop/VoltCheck && firebase deploy --only functions 2>&1 | tail -30`.

7. **Verificare post-deploy** — raportează ultima versiune deployată și linkul Firebase Console.

Dacă oricare dintre pașii 1-4 eșuează, oprește-te și raportează problema clar.
