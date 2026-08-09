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
> Editor first. It removes the blanket `authenticated` policies from
> `migration_founder_portal.sql` and locks billing tables to founder/service
> writes. Free & voucher activations now go through the
> `activate-free-subscription` Edge Function (service_role), so the client no
> longer writes to `subscriptions` directly.

### Secrets (Dashboard → Edge Functions → Secrets)

| Secret | Notes |
|--------|--------|
| `MIDTRANS_SERVER_KEY` | Server key (sandbox or prod) |
| `MIDTRANS_IS_PRODUCTION` | `true` or `false` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (never expose to browser) |
| `SITE_URL` | e.g. `https://hrisloka.com` |
| `BREVO_API_KEY` | Optional activation emails (Brevo) |
| `FROM_EMAIL` | e.g. `noreply@hrisloka.id` |

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
SITE_URL=https://hrisloka.com
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
4. Checkout step 3 polls until paid → redirects `/dashboard`.
5. Test **pending** (bank VA) → screen shows waiting → settles via webhook.
6. Test **100% voucher** → Edge Function `activate-free-subscription` (no Snap).
7. Test **yearly** pricing: amount must match `monthly × 12 × 0.85`.

## 6. Cron (expiry reminders + payment reconciliation)

- Vercel/VPS: `api/cron-check-subscriptions.js`
- Header/query: `CRON_SECRET`
- Marks `active` past `expires_at` as `expired`; sends WA reminders if Fonnte configured.
- Reconciles `payment_orders` stuck `pending` > 2h against the Midtrans status
  API and replays settled/failed results into `midtrans-webhook`.
  Requires on the **Vercel** project: `MIDTRANS_SERVER_KEY`,
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

## Quick deploy script

```bash
bash scripts/deploy-payment-functions.sh
```
