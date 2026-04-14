# vercel-deploy-web

Build și deploy complet al versiunii web InspectEV pe Vercel, cu verificări.

## Pași

### 1. Pre-deploy Checks
Rulează rapid (în paralel):
```bash
# TypeScript check
cd /c/Users/Albert/Desktop/VoltCheck && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Lint check
cd /c/Users/Albert/Desktop/VoltCheck && npm run lint 2>&1 | tail -5

# Chei hardcodate
grep -rn "sk_live\|pk_live" /c/Users/Albert/Desktop/VoltCheck/app /c/Users/Albert/Desktop/VoltCheck/services --include=*.ts --include=*.tsx 2>/dev/null
```
Dacă există erori TypeScript sau chei hardcodate → OPREȘTE și raportează.

### 2. Verificare Deployment Curent (Vercel MCP)
```
list_deployments → ultimul deployment pe main
get_deployment_build_logs → status curent
```

### 3. Build Web
```bash
cd /c/Users/Albert/Desktop/VoltCheck && npx expo export --platform web 2>&1 | tail -20
```
Verifică că `dist/` a fost generat corect.

### 4. Verificare Bundle Size
```bash
du -sh /c/Users/Albert/Desktop/VoltCheck/dist/
find /c/Users/Albert/Desktop/VoltCheck/dist -name "*.js" | xargs ls -lh | sort -k5 -rh | head -10
```
Raportează dacă vreun chunk depășește 500KB (risc performanță).

### 5. Deploy pe Vercel
```
deploy_to_vercel → deployează dist/ pe proiectul InspectEV
```

### 6. Verificare Post-Deploy
```
get_deployment → status deployment nou
get_deployment_build_logs → confirmă success
web_fetch_vercel_url → testează URL-ul live
```

### 7. Smoke Test Pagini Critice
Via `web_fetch_vercel_url`:
- `/` — homepage încarcă?
- `/login` — auth page disponibilă?

Raportează URL-ul live și status final.
