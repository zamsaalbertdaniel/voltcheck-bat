# VoltCheck — Deployment Guide

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)
- Vercel CLI (`npm i -g vercel`) — optional, can use dashboard
- GitHub account with repository access
- Stripe account (test mode)

---

## 1. GitHub Repository Setup

```bash
# Initialize (if not done)
git init
git remote add origin https://github.com/YOUR_ORG/voltcheck.git

# Verify .gitignore blocks sensitive files
git status   # should NOT show .env, service-account files

# Initial commit
git add .
git commit -m "feat: VoltCheck Phase 1+2 — Foundation + Cloud Functions"
git push -u origin main
```

> ⚠️ **CRITICAL**: Before pushing, verify no `.env`, `serviceAccount*.json`, or API keys appear in `git status`.

---

## 2. Environment Variables

### Vercel Dashboard (Web Build)

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project Settings → Web app | All |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | All |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID | All |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | All |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase console → Cloud Messaging | All |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase console → Project Settings | All |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (Stripe Dashboard) | All |
| `EXPO_PUBLIC_FUNCTIONS_REGION` | `europe-west1` | All |

### Firebase Functions (Server-Side Secrets)

```bash
# Set in Firebase Console → Functions → Environment Variables
# OR via CLI:
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set CARVERTICAL_API_KEY
firebase functions:secrets:set AUTODNA_API_KEY
firebase functions:secrets:set EPICVIN_API_KEY
```

---

## 3. Firebase Setup

```bash
# Login
firebase login

# Select project
firebase use YOUR_PROJECT_ID

# Deploy Firestore rules + Storage rules
firebase deploy --only firestore:rules,storage

# Deploy Cloud Functions
firebase deploy --only functions

# Verify functions deployed
firebase functions:list
```

### Authorized Domains (Firebase Auth)

Add to **Firebase Console → Authentication → Settings → Authorized domains**:

- `localhost`
- `your-project.vercel.app`
- `voltcheck.app` (production domain)

---

## 4. Stripe Webhook Configuration

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Add endpoint: `https://REGION-PROJECT_ID.cloudfunctions.net/handleStripeWebhook`
3. Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` in Firebase

---

## 5. Vercel Deployment

```bash
# Option A: Via Vercel Dashboard
# 1. Import GitHub repo at vercel.com/new
# 2. Framework: Other
# 3. Build command: npx expo export --platform web
# 4. Output directory: dist
# 5. Add environment variables from table above
# 6. Deploy

# Option B: Via CLI
vercel --prod
```

---

## 6. Post-Deploy Checklist

- [ ] Web app loads at `your-project.vercel.app`
- [ ] Dark mode renders correctly
- [ ] Firebase Auth sign-in works
- [ ] Tab navigation functional (4 tabs)
- [ ] BAT Insight content loads (RO/EN)
- [ ] Stripe test payment completes
- [ ] Cloud Function logs show pipeline execution
- [ ] PDF appears in Firebase Storage
