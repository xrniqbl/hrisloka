# KiniKerja — Deployment Guide

> **Deploy target: VPS-only** (Node + Nginx + PM2).
> Full steps: **[docs/VPS_DEPLOY.md](./docs/VPS_DEPLOY.md)**
> Vercel has been fully removed — do not deploy there.

## Prerequisites

### 1. Account Requirements
- [ ] VPS / server (Ubuntu 22.04+ recommended)
- [ ] Supabase account (database, auth, storage, Midtrans Edge Functions)
- [ ] Midtrans account (payment gateway)
- [ ] Brevo account (email notifications)
- [ ] Fonnte account (WhatsApp notifications)
- [ ] Google AI Studio account (Gemini AI)

### 2. Local Development
```bash
npm install
cp .env.example .env
# Isi env (lihat .env.example + docs/VPS_DEPLOY.md)

# Frontend only (Vite HMR)
npm run dev

# API server lokal (port 3000) — proxy dari Vite via /api
npm run start:server
```

---

## 🔐 Environment Variables Setup

### VPS server `.env` (Node + frontend build)
Set these in the VPS `.env` file (see `.env.example` + `docs/VPS_DEPLOY.md`):

#### Required (Client-Side)
``bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MIDTRANS_CLIENT_KEY=Mid-client-xxxxx
VITE_MIDTRANS_IS_PRODUCTION=false
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_FOUNDER_EMAIL=founder@yourdomain.com
VITE_DEMO_EMAIL=demo@kinikerja.com
```
<!-- NOTE: VITE_FROM_EMAIL is intentionally NOT listed here — it was a stray.
FROM_EMAIL is server-only (listed below); a VITE_ prefix would bundle it to the browser. -->

#### Required (Server-Side Only - NO VITE_ prefix!)
``bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MIDTRANS_SERVER_KEY=Mid-server-xxxxx
MIDTRANS_IS_PRODUCTION=false
BREVO_API_KEY=xkeysib-xxxxx
FROM_EMAIL=noreply@yourdomain.com
FONNTE_TOKEN=your-fonnte-token
GEMINI_API_KEY=your-gemini-api-key
BANK_VALIDATION_API_KEY=your-api-co-id-key
VAPID_PUBLIC_KEY=same-as-VITE_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:you@yourdomain.com
PUSH_API_SECRET=your-push-api-secret
CRON_SECRET=your-random-secret-string
SITE_URL=https://kinikerja.com
``

### Supabase (Database & Edge Functions)
Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

``bash
MIDTRANS_SERVER_KEY=Mid-server-xxxxx
MIDTRANS_IS_PRODUCTION=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BREVO_API_KEY=xkeysib-xxxxx
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://kinikerja.com
``

---

## 🗄️ Database Migrations

Run these migrations in **Supabase SQL Editor** in order:

``bash
# 1. Core schema
supabase/schema.sql

# 2. Migrations (in order)
supabase/migrations/add_billing_cycle_and_update_plans.sql
supabase/migrations/add_candidate_fields.sql
supabase/migrations/add_profile_setup_done.sql
supabase/migrations/migration_company_isolation.sql
supabase/migrations/migration_onboarding_payments.sql
supabase/migrations/migration_phase2_settings.sql
supabase/migrations/migration_phase3_rls_isolation.sql
supabase/migrations/migration_phase4_security_complete.sql
supabase/migrations/migration_phase4b_rls_complete.sql
supabase/migrations/migration_phase5_backup_system.sql
supabase/migrations/migration_subscription_precision.sql
supabase/migrations/20260516_platform_settings.sql
``

---

## 🔧 Supabase Edge Functions Deployment

### Install Supabase CLI
``bash
npm install -g supabase
``

### Login & Link Project
``bash
supabase login
supabase link --project-ref your-project-ref
``

### Deploy Edge Functions
``bash
# Deploy payment functions
supabase functions deploy create-payment
supabase functions deploy midtrans-webhook

# Set secrets
supabase secrets set \
  MIDTRANS_SERVER_KEY=Mid-server-xxxxx \
  MIDTRANS_IS_PRODUCTION=false \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  BREVO_API_KEY=xkeysib-xxxxx \
  FROM_EMAIL=noreply@yourdomain.com \
  SITE_URL=https://kinikerja.com
``

---

## 💳 Midtrans Configuration

### 1. Dashboard Setup
- Login to [Midtrans Dashboard](https://dashboard.sandbox.midtrans.com) (sandbox) or [Production](https://dashboard.midtrans.com)
- Go to **Settings → Configuration**

### 2. Webhook URL
Set **Payment Notification URL** to:
``
https://your-project-ref.supabase.co/functions/v1/midtrans-webhook
``

### 3. Redirect URLs
- **Finish Redirect URL**: https://kinikerja.com/checkout?status=success
- **Error Redirect URL**: https://kinikerja.com/checkout?status=error
- **Unfinish Redirect URL**: https://kinikerja.com/checkout?status=pending

### 4. Get API Keys
- **Client Key**: Set as VITE_MIDTRANS_CLIENT_KEY in the VPS `.env` (rebuild after change)
- **Server Key**: Set as MIDTRANS_SERVER_KEY in Supabase Edge secrets

---

## 📧 Brevo Configuration (Email)

1. Signup at [app.brevo.com](https://app.brevo.com)
2. Verify sender domain (kinikerja.id or kinikerja.com) under Senders & IPs
3. Create API key: SMTP & API → API keys (use `xkeysib-...`)
4. Set env on VPS `.env` / Supabase Edge secrets:
   - `BREVO_API_KEY=xkeysib-...`
   - `FROM_EMAIL=noreply@kinikerja.id` (must match verified sender)
   - `FROM_NAME=KiniKerja` (optional)
5. Redeploy so `/api/send-email` picks up the key

---

## 📱 Fonnte Configuration (WhatsApp)

1. Signup at [fonnte.com](https://fonnte.com) (500 messages/month free)
2. Register your WhatsApp number
3. Get API token from Dashboard
4. Set as FONNTE_TOKEN in VPS `.env` & Supabase secrets

---

## 🤖 Gemini AI Configuration

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create API key
3. Set as GEMINI_API_KEY in VPS `.env` & Supabase secrets
4. Free tier: 60 requests/minute, 1500 requests/day

---

## 🔔 Push Notifications Setup

### Generate VAPID Keys
``bash
npx web-push generate-vapid-keys
``

### Set in VPS `.env`
- VITE_VAPID_PUBLIC_KEY = public key (client-side)
- VAPID_PUBLIC_KEY = same public key (server-side)
- VAPID_PRIVATE_KEY = private key (server-side only!)
- VAPID_EMAIL = mailto:you@yourdomain.com
- PUSH_API_SECRET = random string for API auth

---

## ⏰ Cron Job Configuration (VPS node-cron)

Canonical scheduler is the built-in node-cron job in `server/index.js`
(`CRON_SCHEDULE`, default `0 0 * * *`, localhost-only route). No external
cron provider is used.

Set CRON_SECRET in the VPS `.env` (generate with openssl rand -hex 32).

---

## 🚀 Deployment Steps

### 1. Push to GitHub
``bash
git add .
git commit -m "feat: complete KiniKerja with security fixes"
git push origin main
``

### 2. Deploy to VPS
- Follow **[docs/VPS_DEPLOY.md](./docs/VPS_DEPLOY.md)**: build, PM2, Nginx, HTTPS
- Set environment variables from `.env.example`
- No Vercel project is used

### 3. Configure Domain (Nginx + DNS)

### 4. Update Supabase Auth
- Go to Supabase Dashboard → Authentication → URL Configuration
- Set **Site URL**: https://kinikerja.com
- Add **Redirect URLs**: https://kinikerja.com/**

### 5. Test Payment Flow
- Create test account
- Try checkout with Midtrans sandbox
- Verify webhook receives notifications
- Check subscription activates correctly

### 6. Monitor Logs
- VPS: `pm2 logs kinikerja`
- Supabase: Dashboard → Logs → Edge Functions
- Midtrans: Dashboard → Transactions

---


---

## Database Performance Indexes

After running migrations, execute the performance indexes migration:
File: supabase/migrations/migration_performance_indexes.sql

This adds indexes to:
- employees(company_id, account_status) - Fast pending employee lookups
- attendance(employee_id, date) - Fast attendance queries
- leave_requests(status, created_at) - Fast pending leave queries
- payment_orders(user_id, status) - Fast payment status checks
- subscriptions(status, expires_at) - Fast expiry checks
- And 25+ more indexes for all major tables

---
## ✅ Pre-Launch Checklist

- [ ] All environment variables set in VPS `.env` & Supabase secrets
- [ ] Database migrations completed
- [ ] Edge functions deployed and tested
- [ ] Midtrans webhook URL configured and tested
- [ ] Email notifications working (Brevo)
- [ ] WhatsApp notifications working (Fonnte)
- [ ] Push notifications working (VAPID)
- [ ] Cron job running daily
- [ ] Custom domain configured with HTTPS
- [ ] RLS policies verified on all tables
- [ ] Security audit passed (no API keys in client bundle)
- [ ] Production build successful (
pm run build)
- [ ] Midtrans switched to production mode (VITE_MIDTRANS_IS_PRODUCTION=true)

---

## 🔒 Security Best Practices

### DO:
- ✅ Use server-side environment variables (no VITE_ prefix) for API keys
- ✅ Enable RLS on all Supabase tables
- ✅ Verify Midtrans webhook signatures
- ✅ Use rate limiting on all API endpoints
- ✅ Sanitize user input (DOMPurify for HTML)
- ✅ Use HTTPS everywhere
- ✅ Rotate API keys periodically

### DON'T:
- ❌ Commit .env file to git
- ❌ Use VITE_ prefix for sensitive API keys
- ❌ Expose Supabase service role key to client
- ❌ Trust client-side subscription activation
- ❌ Use dangerouslySetInnerHTML without sanitization
- ❌ Store passwords in client bundle

---

## 🐛 Troubleshooting

### Payment Not Activating
1. Check Midtrans webhook URL is accessible
2. Verify MIDTRANS_SERVER_KEY is correct
3. Check Supabase Edge Function logs
4. Verify payment_orders table has the order

### Email Not Sending
1. Verify BREVO_API_KEY is set in VPS `.env`
2. Check sender domain is verified in Brevo dashboard
3. Check /api/send-email logs

### WhatsApp Not Sending
1. Verify FONNTE_TOKEN is set
2. Check phone number format (must start with 62)
3. Check /api/send-whatsapp logs

### Push Notifications Not Working
1. Verify VAPID keys are generated and set
2. Check PUSH_API_SECRET is set
3. Verify service worker is registered (/sw.js)
4. Check browser permissions

---


### Error Monitoring (Recommended)
Add Sentry CDN to index.html for production error tracking.
ErrorBoundary.jsx is already configured to send errors to Sentry.
Free tier: 5000 errors/month at sentry.io
## 📞 Support

- **Midtrans**: [support.midtrans.com](https://support.midtrans.com)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Brevo**: [developers.brevo.com](https://developers.brevo.com/docs)
- **Fonnte**: [fonnte.com/help](https://fonnte.com/help)
- **Nginx**: [nginx.org/en/docs](https://nginx.org/en/docs)

---

**Last Updated**: 2026-07-06  
**Version**: 1.0.0

