# Deploy KiniKerja di VPS (tanpa Vercel)

Aplikasi ini bisa jalan full di **VPS** (Node.js + Nginx + PM2).  
Frontend (static `dist/`) dan backend (`/api/*`) dilayani oleh `server/index.js`.

## Arsitektur

```
Internet → Nginx (:80/:443) → Node server/index.js (:3000)
                                  ├─ /api/*     → handler di folder api/
                                  ├─ /*         → SPA dari dist/
                                  └─ cron harian → cek subscription
```

Data tetap di **Supabase** (Auth, Postgres, Storage, Realtime, Edge Functions Midtrans).

## Prasyarat VPS

- Ubuntu 22.04+ (atau sejenis)
- Node.js **20+**
- Nginx
- PM2 (`npm i -g pm2`)
- Domain mengarah ke IP VPS
- Akun Supabase + (opsional) Midtrans, Brevo, Fonnte

## 1. Clone & build

```bash
cd /var/www
git clone <repo-url> kinikerja
cd kinikerja
cp .env.example .env
# edit .env — lihat section Env di bawah
npm ci
npm run build
```

## 2. Environment variables (`.env` di root project)

**Wajib (frontend + server):**

| Key | Keterangan |
|-----|------------|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_FOUNDER_EMAIL` | Email akses Founder Portal |
| `VITE_MIDTRANS_CLIENT_KEY` | Snap client key |
| `VITE_MIDTRANS_IS_PRODUCTION` | `true` / `false` |
| `VITE_VAPID_PUBLIC_KEY` | Push public key |

**Wajib (server Node — API):**

| Key | Keterangan |
|-----|------------|
| `SUPABASE_URL` | Sama dengan URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (rahasia) |
| `PORT` | Default `3000` |
| `SITE_URL` | `https://domain-anda.com` (CORS) |
| `ALLOWED_ORIGINS` | Opsional, CSV origin tambahan |
| `CRON_SECRET` | Secret cron internal |
| `BREVO_API_KEY` / `FROM_EMAIL` | Email (Brevo) |
| `FONNTE_TOKEN` | WhatsApp |
| `GEMINI_API_KEY` | AI review |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push |
| `PUSH_API_SECRET` | Auth endpoint push |
| `BANK_VALIDATION_API_KEY` | Opsional |
| `MIDTRANS_SERVER_KEY` | Rekonsiliasi order pending di cron (`api/cron-check-subscriptions`) |
| `MIDTRANS_IS_PRODUCTION` | `true` / `false` — pilih endpoint Midtrans sandbox/production |

> `VITE_*` di-bake saat `npm run build`. Setelah ubah `VITE_*`, **build ulang**.

## 3. Jalankan dengan PM2

```bash
npm i -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Health check:

```bash
curl http://127.0.0.1:3000/health
```

## 4. Nginx

```bash
sudo cp deploy/nginx.kinikerja.conf /etc/nginx/sites-available/kinikerja
# edit server_name
sudo ln -sf /etc/nginx/sites-available/kinikerja /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 5. Cron subscription

Sudah built-in di `server/index.js` (jadwal default `0 0 * * *`).

Opsional cron OS (jika `ENABLE_CRON=false`):

```bash
# crontab -e
0 0 * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" http://127.0.0.1:3000/api/cron-check-subscriptions
```

## 6. Midtrans (Edge Function tetap di Supabase)

Payment webhook **tetap di Supabase Edge Functions** (Deno), bukan di VPS:

```bash
supabase functions deploy create-payment
supabase functions deploy midtrans-webhook
```

Set secrets di Supabase Dashboard: `MIDTRANS_SERVER_KEY`, `SITE_URL`, dll.  
Pastikan `SITE_URL` = domain VPS Anda.

## 7. Update rilis

```bash
cd /var/www/kinikerja
git pull
npm ci
npm run build
pm2 restart kinikerja
```

## 8. Security checklist VPS

- [ ] Firewall: buka hanya 22, 80, 443
- [ ] `.env` permission `600`, bukan di git
- [ ] `SUPABASE_SERVICE_ROLE_KEY` hanya di server
- [ ] HTTPS via Let's Encrypt
- [ ] RLS Supabase aktif (jalankan `scripts/rls-audit.sql`)
- [ ] CSP/headers bisa ditambah di Nginx jika perlu

## 9. Dev lokal (API + Vite)

Terminal 1 — API + (opsional) static:

```bash
npm run start:server
```

Terminal 2 — Vite HMR (proxy `/api` → :3000):

```bash
npm run dev
```

## Troubleshooting

| Gejala | Cek |
|--------|-----|
| API 401 | `SUPABASE_SERVICE_ROLE_KEY`, JWT user, `PUSH_API_SECRET` |
| CORS error | `SITE_URL` / `ALLOWED_ORIGINS` cocok domain |
| Blank page | `npm run build` & `dist/index.html` ada |
| Push gagal | Pasangan VAPID public/private sama |
| Email/WA gagal | `BREVO_API_KEY` / `FONNTE_TOKEN` di `.env` server |
| Cron diam | `CRON_SECRET`, log `pm2 logs kinikerja` |
