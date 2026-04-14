# InspectEV — Plugin-uri MCP: Status & Recomandări

## Plugin-uri ACTIVE ✓

### 1. Vercel MCP (`mcp__c46a5615-8f26-41ea-bc60-f6442fd71470`)
**Ce face:** Deploy web, monitoring deployments, runtime logs, fetch URL-uri preview.
**Folosit în:** `/vercel-deploy-web`, verificare post-deploy, smoke tests.
**Status:** Complet configurat.

### 2. Firebase MCP (`mcp__plugin_firebase_firebase__*`)
**Ce face:** Acces direct Firestore, Functions logs, Auth users, Security Rules, Remote Config.
**Folosit în:** `/firestore-live-audit`, `/vin-pipeline-debug`, `/payment-flow-audit`, `/functions-health`.
**Status:** Complet configurat cu permisiuni granulare (read auto-aprobat, write cu confirmare, delete blocat).

### 3. Claude Preview MCP
**Ce face:** Preview web local cu screenshot, DOM inspection, console logs, network requests.
**Folosit în:** Verificare UI după modificări, debug web preview.
**Status:** Activ.

---

## Plugin-uri RECOMANDATE — Prioritate ÎNALTĂ

### 4. GitHub MCP ⚡ PRIORITATE 1
**De ce:** Automatizare completă PR workflow, issue tracking, CI/CD status — fără să părăsești Claude.
**Ce ar permite:**
- Creare automată PR după fiecare feature/fix
- Citire comments + reviews pe PR-uri deschise
- Verificare status GitHub Actions (CI passes?)
- Link issues la commit-uri
- `/create-pr` skill → push + PR complet automatic

**Cum se instalează:**
```bash
# În Claude Code Settings → MCP Servers → Add
# GitHub Official MCP: https://github.com/github/github-mcp-server
# Necesită GitHub Personal Access Token (repo + pull_request scope)
```
**Risc de securitate:** Scăzut dacă token are permisiuni minime (repo read + PR write).

---

### 5. Stripe MCP ⚡ PRIORITATE 2
**De ce:** Proiectul are Stripe ca infrastructură financiară critică. Debugging plăți direct din Claude.
**Ce ar permite:**
- Vizualizare PaymentIntents blocate sau eșuate
- Test webhook-uri fără a le retrimite manual din dashboard
- Verificare produse/prețuri configurate corect
- Identificare card declines, dispute-uri active
- `/payment-flow-audit` ar deveni mult mai puternic

**Cum se instalează:**
```bash
# Stripe MCP oficial: https://github.com/stripe/agent-toolkit
# Necesită Stripe Restricted Key (read-only pe PaymentIntents, Customers)
# NU folosi Secret Key complet — creează un Restricted Key în Stripe Dashboard
```
**Risc de securitate:** Mediu — folosește obligatoriu Restricted Key cu permisiuni minime.

---

### 6. Sentry MCP ⚡ PRIORITATE 3
**De ce:** Error monitoring în producție — acum nu ai vizibilitate la crash-uri din app.
**Ce ar permite:**
- Citire erori din producție direct în Claude
- Identificare erori noi după deploy
- Corelarea erorilor Sentry cu codul sursă (stack trace → fișier:linie)
- `/functions-health` extins cu erori client-side
- Alertă automată: dacă deploy generează spike de erori → rollback

**Cum se instalează:**
```bash
# Sentry MCP: https://github.com/getsentry/sentry-mcp
# Necesită Sentry Auth Token (project:read scope)
```
**Risc de securitate:** Scăzut (read-only pe date erori, fără PII dacă Sentry e configurat corect).

---

## Plugin-uri OPȚIONALE — Prioritate MEDIE

### 7. Expo/EAS MCP (dacă apare oficial)
**De ce:** Build status, submit to stores, manage channels — direct din Claude.
**Status:** Nu există MCP oficial Expo încă. Alternativă: wrapper custom peste EAS CLI.

### 8. Google Analytics / Firebase Performance MCP
**De ce:** Metrics utilizatori, funnel conversie plăți, performance screens.
**Status:** Nu există MCP oficial. Firebase MCP existent nu acoperă Analytics.

---

## Plugin-uri DE EVITAT

### ❌ Supabase MCP (deja prezent dar nefolosit)
**De ce nu:** Proiectul folosește Firebase exclusiv. Supabase MCP consumă tokeni fără valoare.
**Recomandare:** Dezactivează din Claude Code Settings dacă nu planifici migrare.

---

## Setare Recomandată Permisiuni per Plugin

| Plugin | Auto-aprobat | Cu confirmare | Blocat |
|---|---|---|---|
| Firebase | Read, List, Query, Validate | Update, Add document, Auth update | Delete DB, Create project |
| Vercel | List, Get, Fetch URL, Logs | Deploy to production | Delete project |
| GitHub (viitor) | List PRs, Read issues, Status CI | Create PR, Merge, Close issue | Delete branch, Force push |
| Stripe (viitor) | List payments, Get intent | Refund (manual) | Delete customer, Void |
| Sentry (viitor) | List errors, Get details | Resolve issue | Delete project |

---

## Securitate MCP — Reguli Generale InspectEV

1. **Niciun MCP cu acces write nelimitat la producție** — mereu granular
2. **Chei API pentru MCP**: restricted/read-only unde posibil, rotite la 90 zile
3. **Firebase MCP**: admin SDK access → `firestore_delete_document` blocat în settings.local.json
4. **Stripe MCP (viitor)**: Restricted Key, niciodată Secret Key complet
5. **GitHub MCP (viitor)**: token fără `admin:org` și fără `delete_repo`
6. **Orice MCP nou**: adaugă permisiunile explicit în `settings.local.json` înainte de prima utilizare
