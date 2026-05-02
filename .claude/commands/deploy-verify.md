# deploy-verify

End-to-end deploy + verify pentru web pe Vercel. Înlocuiește pattern-ul repetat: push → list deployments → curl smoke → status.

## Când folosești
După ce ai code modificări staged + commit pregătit (sau deja commit-uite local) și vrei să le push-uiești pe `main` și să confirmi că deploy-ul live e OK.

## Pași

### 1. Pre-flight verificări
Rulează în paralel:
```bash
cd /c/Users/Albert/Desktop/VoltCheck && npx tsc --noEmit 2>&1 | tail -5
cd /c/Users/Albert/Desktop/VoltCheck && git log origin/main..HEAD --oneline
cd /c/Users/Albert/Desktop/VoltCheck && git status --short
```

Dacă există erori TS sau working tree e dirty pe fișiere relevante: oprește, raportează, cere instrucțiuni.

### 2. Push pe main
Dacă local main e fast-forward peste origin/main:
```bash
cd /c/Users/Albert/Desktop/VoltCheck && git push origin main 2>&1 | tail -5
```

Notează SHA-ul push-uit.

### 3. Programează wakeup
```
ScheduleWakeup({
  delaySeconds: 150,
  reason: "wait for vercel build of <commit-sha>",
  prompt: "verifica deploy <commit-sha> si raporteaza scurt"
})
```

### 4. La wakeup — verifică deploy
```
mcp__c46a5615-..__list_deployments({ projectId: "prj_CsILTLrMwJb7gd9zPksT60JyUhRd", teamId: "team_suOIr1VZ0NE2zwp9hSkv2q2a" })
```

Identifică deployment-ul cu commit SHA-ul push-uit. Verifică `state`:
- `READY` → continuă la 5
- `BUILDING` → mai aștepți 60s (sau cere user să aștepte)
- `ERROR` → fetch build logs și raportează cauza:
  ```
  mcp__c46a5615-..__get_deployment_build_logs({ idOrUrl: "<id>", teamId: "..." })
  ```

### 5. Smoke test live
```bash
curl -sI https://www.inspect-ev.app/ 2>&1 | head -3
curl -sI https://www.inspect-ev.app/legal/privacy 2>&1 | head -3
curl -s --compressed https://www.inspect-ev.app/ 2>&1 | grep -oE "<title>[^<]+</title>" | head -1
```

Valorile așteptate:
- HTTP 200 OK pe toate
- Title corect (`InspectEV — Verifică Bateria EV-ului Second-Hand`)
- Header `Content-Encoding: br` activ

### 6. Raport scurt
Format:
```
✅ Deploy LIVE
- Commit: <sha>
- Deploy ID: <dpl_xxx>
- HTTP: 200 + br
- Aliasuri: inspect-ev.app + www
[Dacă există issues neașteptate, listează-le]
```

## Notă despre verificare vizuală
Pentru confirmare vizuală (e.g. componente nou-adăugate), folosește Claude in Chrome MCP după ce HTTP smoke a trecut:
```
mcp__Claude_in_Chrome__list_connected_browsers + select_browser + navigate la URL critic
```
NU rula vizual înainte de smoke HTTP — te ajuți inutil dacă deploy a eșuat la build.

## Rute critice de verificat
| Rută | Ce verifici |
|---|---|
| `/` | Hero + Data Discovery Matrix + FAQ |
| `/legal/privacy` | ReturnToBase apare bottom-right |
| `/modele-compatibile` | Lista de branduri + CTA |
| `/preview/[VIN]` | NHTSA fetch funcțional (test cu un VIN real) |
