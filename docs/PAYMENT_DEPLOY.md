# Payment & Subscription Deploy Checklist

Canonical prices (see `src/lib/plans.js`):

| Plan | Monthly | Yearly (−15%) | Max employees |
|------|---------|---------------|---------------|
| Starter | Rp 149.000 | Rp 1.519.800 | 25 |
| Pro | Rp 299.000 | Rp 3.049.800 | 100 |
| Enterprise | Custom | Custom | Unlimited |

## 1. Supabase Edge Functions

```bash
# From repo root, with supabase CLI logged in
supabase functions deploy create-payment
supabase functions deploy midtrans-webhook
supabase functions deploy activate-free-subscription
```

> **Prerequisite (RLS):** run `scripts/FIX_FOUNDER_PORTAL_RLS.sql` in the SQL
> Editor **before** deploying the functions below. It removes the blanket
> `authenticated` policies from `migration_founder_portal.sql` and locks
> billing tables to founder/service writes. Free & voucher activations now go
> through the `activate-free-subscription` Edge Function (service_role), so
> the client no longer writes to `subscriptions` directly.

### Secrets (Dashboard → Edge Functions → Secrets)

| Secret | Notes |
|--------|--------|
| `MIDTRANS_SERVER_KEY` | Server key (sandbox or prod) |
| `MIDTRANS_IS_PRODUCTION` | `true` or `false` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (never expose to browser) |
| `SITE_URL` | Canonical: `https://kinikerja.id` (do NOT use kinikerja.com) |
| `BREVO_API_KEY` | Optional activation emails (Brevo) |
| `FROM_EMAIL` | e.g. `noreply@kinikerja.id` |

## 2. Midtrans Dashboard

1. **Settings → Configuration → Payment Notification URL**
   ```
   https://<PROJECT_REF>.supabase.co/functions/v1/midtrans-webhook
   ```
2. Enable notifications for: settlement, capture, deny, cancel, expire, pending.
3. Use **sandbox** keys while `VITE_MIDTRANS_IS_PRODUCTION=false`.

## 3. Frontend env (`.env` / host)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MIDTRANS_CLIENT_KEY=Mid-client-...
VITE_MIDTRANS_IS_PRODUCTION=false
SITE_URL=https://kinikerja.id
```

## 4. Database plan prices

Run once in SQL Editor:

```sql
-- File: supabase/migrations/sync_plan_prices_149k_299k.sql
```

## 5. Smoke test (sandbox)

1. Register / login → complete onboarding if required.
2. Open `/checkout` → select **Starter** monthly → pay via Snap sandbox.
3. Complete payment; confirm:
   - `payment_orders.status` → `paid`
   - `subscriptions.status` → `active`
   - `employees.role` → `super_admin` (webhook)
4. Checkout step 3 polls `payment_orders` until paid → redirects `/dashboard`.
   Poll behavior (`src/pages/CheckoutPage.jsx` StepConfirmation): 4s interval,
   max ~45 attempts (**~3 min timeout**), then shows a timeout state with a
   "Coba Lagi" retry button (polling resumes; a settled payment still
   activates via webhook).
5. Test **pending** (bank VA) → screen shows waiting → settles via webhook.
6. Test **100% voucher** → Edge Function `activate-free-subscription` (no Snap).
7. Test **yearly** pricing: amount must match `monthly × 12 × 0.85`.
8. Test **early renewal**: pay/renew while the subscription is still active →
   `expires_at` must extend from the previous expiry, not reset to today.

## 6. Cron (expiry reminders + payment reconciliation)

> **Canonical scheduler = VPS `server/index.js` node-cron** (localhost-only
> route, secret injected server-side via header). The route is fail-closed:
> external callers without the `CRON_SECRET` header get `401`/`403` — do NOT
> weaken the check (e.g. by adding a `?secret=` query fallback).

- Scheduler: VPS node-cron calling `api/cron-check-subscriptions.js` in-process
- Auth: header `x-cron-secret: <CRON_SECRET>` ONLY (header-only; no query fallback)
- Marks `active` past `expires_at` as `expired`; sends WA reminders if Fonnte configured.
- Reconciles `payment_orders` stuck `pending` > 2h against the Midtrans status
  API and replays settled/failed results into `midtrans-webhook`.
  Requires on the **VPS** server env: `MIDTRANS_SERVER_KEY`,
  `MIDTRANS_IS_PRODUCTION` (`true`/`false`).

## 7. Security notes

- **Never** activate subscription only from Midtrans Snap `onSuccess` (UI can fake it).
- Webhook verifies SHA-512 signature with server key **and** compares the
  notification `gross_amount` against the stored order amount (mismatch → order
  flagged `failed`, no activation).
- `create-payment` re-validates amount + voucher server-side.
- Free/voucher activation is server-side (`activate-free-subscription`) and
  rejects anything that does not price to exactly zero.
- Idempotent: repeated `paid` notifications for same order are safe.
- Early renewal: webhook and free activation extend `expires_at` from the
  current expiry when the subscription is still active (no lost days).

## Quick deploy script

```bash
bash scripts/deploy-payment-functions.sh
```
