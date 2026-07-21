# Go-Live Runbook B — Payment + Owner Setup Smoke

Prasyarat: **Runbook A (RLS) lulus**.

Canonical prices: `src/lib/plans.js` (Starter 149K / Pro 299K, yearly −15%).

## B0. Deploy & config

### Edge Functions
```bash
# dari root repo, supabase CLI logged in
supabase functions deploy create-payment
supabase functions deploy midtrans-webhook
# atau: bash scripts/deploy-payment-functions.sh
```

### Supabase secrets (Dashboard → Edge Functions → Secrets)
| Secret | Contoh |
|--------|--------|
| `MIDTRANS_SERVER_KEY` | Mid-server-… |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) |
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `SITE_URL` | https://your-domain.com |
| `BREVO_API_KEY` / `FROM_EMAIL` | opsional email aktivasi |

### Midtrans Dashboard
- Payment Notification URL:  
  `https://<PROJECT_REF>.supabase.co/functions/v1/midtrans-webhook`
- Enable: settlement, capture, deny, cancel, expire, pending

### Frontend / VPS env
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MIDTRANS_CLIENT_KEY=Mid-client-...
VITE_MIDTRANS_IS_PRODUCTION=false
SITE_URL=https://your-domain.com
```

### DB plan prices (sekali)
```sql
-- file: supabase/migrations/sync_plan_prices_149k_299k.sql
```

## B1. Smoke Midtrans sandbox

| # | Langkah | Expected |
|---|---------|----------|
| 1 | Register / login user baru | Session OK |
| 2 | Buka `/checkout` | Plans load (Starter/Pro) |
| 3 | Pilih **Starter** monthly → Bayar Midtrans | Snap popup terbuka |
| 4 | Selesaikan bayar sandbox | Step 3 “Menunggu / Aktif” |
| 5 | Cek `payment_orders` | `status = paid` |
| 6 | Cek `subscriptions` | `status` active / computed active, `expires_at` ~+30 hari |
| 7 | Poll / refresh | Redirect `/setup` |
| 8 | Selesaikan owner setup | `employees.company_id` **NOT NULL**, role `super_admin` |
| 9 | Buka `/dashboard` | SubscriptionGuard lolos |

### SQL verifikasi cepat
```sql
-- ganti email tester
SELECT id, email, role, company_id, account_status
FROM employees
WHERE email = 'tester@example.com';

SELECT order_id, status, amount, plan_slug, created_at
FROM payment_orders
ORDER BY created_at DESC
LIMIT 5;

SELECT user_id, plan_slug, status, company_id, starts_at, expires_at, price_paid
FROM subscriptions
ORDER BY updated_at DESC NULLS LAST
LIMIT 5;
```

## B2. Kasus tambahan

| Kasus | Expected |
|-------|----------|
| Pending VA (bank) | Step pending → webhook settle → active |
| Voucher 100% | `activateSubscription` client → active + company shell |
| Yearly | amount ≈ monthly × 12 × 0.85 |
| Gagal create-payment (function belum deploy) | UI error merah di checkout (bukan silent) |
| Tanpa VITE_MIDTRANS_CLIENT_KEY | Error “belum dikonfigurasi” |

## B3. Integrasi opsional (setelah payment hijau)

| Integrasi | Env | Uji |
|-----------|-----|-----|
| Email | `BREVO_API_KEY`, `FROM_EMAIL` | Approve cuti → email |
| WhatsApp | `FONNTE_TOKEN` + session JWT | Integration Hub → Test |
| Push | VAPID pair + `PUSH_API_SECRET` | Subscribe di PWA settings |
| AI | `GEMINI_API_KEY` | AI review page |
| Cron | `CRON_SECRET`, `ENABLE_CRON` | Hit `/api/cron-check-subscriptions?secret=…` |

## Gate lulus (B selesai)

- [ ] Snap sandbox paid → webhook → subscription active
- [ ] Owner `/setup` → `company_id` terisi
- [ ] Dashboard HR terbuka
- [ ] (Opsional) voucher full + yearly amount benar

**Lanjut ke C** (commit/PR) setelah B hijau atau jika ingin commit kode dulu sambil smoke manual.
