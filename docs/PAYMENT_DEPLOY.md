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
```

### Secrets (Dashboard → Edge Functions → Secrets)

| Secret | Notes |
|--------|--------|
| `MIDTRANS_SERVER_KEY` | Server key (sandbox or prod) |
| `MIDTRANS_IS_PRODUCTION` | `true` or `false` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (never expose to browser) |
| `SITE_URL` | e.g. `https://hrisloka.com` |
| `RESEND_API_KEY` | Optional activation emails |
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
6. Test **100% voucher** → client `activateSubscription` (no Snap).
7. Test **yearly** pricing: amount must match `monthly × 12 × 0.85`.

## 6. Cron (expiry reminders)

- Vercel/VPS: `api/cron-check-subscriptions.js`
- Header/query: `CRON_SECRET`
- Marks `active` past `expires_at` as `expired`; sends WA reminders if Fonnte configured.

## 7. Security notes

- **Never** activate subscription only from Midtrans Snap `onSuccess` (UI can fake it).
- Webhook verifies SHA-512 signature with server key.
- `create-payment` re-validates amount + voucher server-side.
- Idempotent: repeated `paid` notifications for same order are safe.

## Quick deploy script

```bash
bash scripts/deploy-payment-functions.sh
```
