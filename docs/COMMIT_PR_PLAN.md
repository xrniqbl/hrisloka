# Phase C — Commit / PR plan

Branch: `feature/theme-payment-align` (sudah ahead remote).  
Working tree besar (theme UI + security). **Jangan satu commit raksasa.**

## Slice yang disarankan

### Commit 1 — Security / payment / RLS tooling (prioritas)
API auth, subscription harden, checkout UX, migrations idempotent, runbooks.

Contoh paths:
- `api/send-whatsapp.js`
- `src/services/{whatsapp,email,subscription}Service.js`
- `src/pages/CheckoutPage.jsx`
- `src/pages/AnalyticsReportBuilder.jsx`
- `src/components/SubscriptionStatus.jsx`
- `src/layouts/EmployeeLayout.jsx`
- `src/lib/{safePath,faceRecognition,i18n}.*`
- `eslint.config.js`, `.env.example`
- `scripts/rls-audit.sql`
- `supabase/migrations/harden_*.sql`
- `docs/GO_LIVE_RLS_RUNBOOK.md`, `docs/PAYMENT_SMOKE_RUNBOOK.md`
- related small lint/test fixes

### Commit 2 — Theme / Astryx UI (terpisah)
Sidebar, dashboard cards, palette, CSS migration, dll.

### Commit 3 — ESLint hook deps cleanup (phase D)
Hanya file yang disentuh di D.

## PR ke `main`
- Title: `fix: tenant RLS tooling, WA auth, checkout errors, subscription company_id`
- Body: ringkas gate A/B, file migration, cara smoke
- Jangan campur rebrand besar + security di satu PR jika review sulit

## Jangan commit
- `.env` secrets
- `node_modules`, zip production, screenshot besar tidak relevan
- `.agents/` / skill lock kecuali memang ingin di-track
