# innovation-proposal

Generează o propunere structurată pentru o funcționalitate nouă InspectEV.
Analizează fezabilitatea, impactul, efortul și alinierea cu arhitectura existentă.

## Input
Descrie ideea de funcționalitate: `/innovation-proposal <descriere idee>`

## Pași

### 1. Analiză Idee
- Reformulează ideea în 2-3 propoziții clare
- Identifică: problema rezolvată, utilizatorul țintă, valoarea adăugată

### 2. Aliniere cu Arhitectura Existentă
Citește structura proiectului și evaluează:
- Ce componente existente pot fi reutilizate?
- Ce servicii externe sunt deja integrate (Stripe, Smartcar, NHTSA, Firebase)?
- Există conflicte cu funcționalități existente?
- Impact pe `reportPipeline.ts`, `riskEngine.ts`, `firestore.rules`?

### 3. Fezabilitate Tehnică
Evaluează:
- **Frontend:** Ce ecrane/componente noi? Expo Router pages? Zustand store nou?
- **Backend:** Cloud Functions noi? Modificări Firestore schema? Indexuri noi?
- **Externe:** API nou necesar? Cost estimat?
- **i18n:** Traduceri noi necesare în RO/EN?
- **Securitate:** Reguli Firestore noi? Validare input?

### 4. Estimate Efort
| Componentă | Efort (S/M/L) | Note |
|---|---|---|
| UI (Expo) | | |
| Functions | | |
| Firestore schema | | |
| Tests | | |
| i18n | | |
| Deploy | | |
**Total estimat:** XS / S / M / L / XL

### 5. Riscuri
- Riscuri tehnice (complexitate, dependențe)
- Riscuri de produs (UX, adoption)
- Riscuri de securitate / GDPR
- Riscuri financiare (cost API, Firebase usage)

### 6. Plan Implementare (dacă fezabil)
Propune ordinea pașilor:
1. Schema Firestore + tipuri TypeScript
2. Cloud Functions
3. Services client-side
4. UI components
5. Ecran Expo Router
6. i18n keys
7. Tests
8. Firestore rules update
9. Deploy

### 7. Verdict
**RECOMANDARE:** IMPLEMENTEAZĂ / AMÂNĂ / RESPINGE
**Motivație:** 2-3 propoziții
**Prioritate față de backlog existent:** Înaltă / Medie / Joasă

---

## Idei de Inovație Posibile pentru InspectEV (referință)
- **Battery Health Score** bazat pe date Smartcar live (State of Health %)
- **Price Estimator** — valoare piață EV bazată pe scor risc + km + vârstă
- **Recall Alerts Push** — notificări automate când NHTSA emite recall pentru vehiculele din garaj
- **Comparator EV** — compară 2 VIN-uri side-by-side
- **History Timeline** — evoluție scor risc în timp (multiple rapoarte pe același VIN)
- **Shared Report QR** — QR code pentru raport public (pentru vânzători)
- **Fleet Dashboard** — view pentru dealeri cu multiple vehicule
- **AI Chat pe Raport** — întreabă Claude despre raportul tău specific
- **Carbon Footprint Tracker** — emisii evitate față de ICE echivalent
- **Insurance Integration** — export raport pentru asigurători
