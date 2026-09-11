# Checklist Pasca-Audit (WAJIB sebelum go-live)

Hasil audit branch `feature/theme-payment-align` menemukan sejumlah temuan yang **tidak bisa diperbaiki dari kode saja** — butuh eksekusi di Supabase production dan rotasi kunci. Ikuti urutan ini.

## STATUS EKSEKUSI (update 2026-09)

| Item | Status |
|---|---|
| 1. SQL gabungan (`RUN_AFTER_AUDIT.sql`) dijalankan di production | ✅ SELESAI (2 iterasi — script di-hardening untuk drift tipe int/uuid) |
| 2. Verifikasi anon REST: `billing_info` 200, `onboarding` 200, `employees` `[]` (terkunci), `notifications` `[]` | ✅ LOLOS |
| 3. Smoke test dua company (manual, perlu 2 akun) | ⏳ Belum |
| 4. Rotasi VAPID private key | ⏳ **Masih wajib** — key lama ada di git history |
| 5. Deploy edge functions (CORS allowlist baru) | ⚠️ Sebagian — `create-payment` & `midtrans-webhook` deployed; **`activate-free-subscription` 404 = BELUM** (wajib: Free plan/100% voucher). `supabase functions deploy activate-free-subscription` |
| 6. Deploy klien + API bersamaan (clock-in JWT) | ⏳ Belum |
| 7. Smoke test pembayaran Midtrans sandbox | ⚠️ Temuan: key di env adalah **production key** tapi `MIDTRANS_IS_PRODUCTION` tidak di-set server-side → 401. Sudah diperbaiki di `.env` lokal (`MIDTRANS_IS_PRODUCTION=true`); pastikan sama di VPS & Edge secrets |
| 8. Buat storage buckets (temuan baru: semua bucket kosong) | ✅ SELESAI — 5 bucket terverifikasi |
| 9. Aktifkan RLS storage.objects (temuan: upload anonim lolos) | ⏳ **Wajib** — jalankan `scripts/STORAGE_LOCKDOWN.sql` |
| 10. Rotasi VAPID — kunci baru sudah digenerate | ⏳ Kunci baru di `.vapid-rotation/vapid-new.json` (di-gitignore); update env VPS + Edge secrets lalu deploy |

---

## 1. Jalankan SQL gabungan di Supabase production

1. Backup database (Supabase Dashboard → Database → Backups).
2. Buka **Supabase Dashboard → SQL Editor**.
3. Copy seluruh isi `scripts/RUN_AFTER_AUDIT.sql` → **Run**.
4. Pastikan sukses (hijau). Script ini idempoten — boleh diulang.

> ⚠️ `/setup` (OwnerSetupWizard) membutuhkan insert `companies` + `employees` saat pertama kali login owner — pastikan BAGIAN 3 & 4 sukses penuh sebelum menguji alur checkout baru.

## 2. Verifikasi isolasi tenant (0 baris = lolos)

Jalankan di SQL Editor (query dari `scripts/rls-audit.sql`, ringkasan di bawah):

```sql
-- KRITIS: policy yang menyebut super_admin tanpa company scope = bocor.
-- Target: 0 baris. (Sama dengan query 2 di scripts/rls-audit.sql)
SELECT tablename, policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual::text ILIKE '%super_admin%' AND qual::text NOT ILIKE '%get_my_company_id%')
    OR (with_check::text ILIKE '%super_admin%' AND with_check::text NOT ILIKE '%get_my_company_id%')
  )
ORDER BY tablename, policyname;
```

```sql
-- Semua tabel core harus RLS aktif.
-- Target: 0 baris pada daftar tabel core.
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('employees','attendance','leave_requests','payroll_records',
                    'notifications','companies','billing_info','onboarding')
  and not c.relrowsecurity;
```

```sql
-- billing_info harus ada dan RLS aktif (target: 1 baris, rls = t)
select relname, relrowsecurity from pg_class
where relname = 'billing_info' and relnamespace = 'public'::regnamespace;
```

```sql
-- onboarding.company_id harus ada (target: ada baris)
select column_name, data_type from information_schema.columns
where table_name = 'onboarding' and column_name = 'company_id';
```

## 3. Smoke test dua company (disarankan)

Ikuti `docs/TENANT_SMOKE_CHECKLIST.md` / `docs/SMOKE_TWO_COMPANY.md`: dua akun dari dua company berbeda tidak boleh melihat data satu sama lain di `/employees`, `/attendance`, `/payroll`.

## 4. Rotasi VAPID private key (WAJIB)

`vapid-keys.json` yang berisi **private key push notification pernah ter-commit ke git** — artinya key ada di history repo dan harus dianggap bocor. Kunci baru wajib dipasang.

```bash
npx web-push generate-vapid-keys
```

Lalu update env (Vercel + VPS):

| Env var lama | Env var baru |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` / `VAPID_PUBLIC_KEY` | public key baru (client + server sama) |
| `VAPID_PRIVATE_KEY` | private key baru (server saja) |

Setelah deploy dengan key baru: semua subscription push lama akan gagal (endpoint tetap valid, tapi aplikasi yang sudah terpasang memakai public key lama). Pengguna perlu **re-subscribe push** — `api/send-push.js` sudah otomatis menghapus endpoint 404/410.

Terakhir, hapus file dari history secara opsional (`git filter-repo` / BFG) bila repo akan dipublikasikan; untuk repo privat, rotasi key di atas sudah memadai.

## 5. Deploy edge functions yang berubah

CORS edge function diubah ke allowlist — **wajib redeploy** agar tidak berbeda dengan repo:

```bash
bash scripts/deploy-payment-functions.sh
```

Fungsi yang berubah: `create-payment`, `activate-free-subscription` (`midtrans-webhook` tidak memakai CORS).

## 6. Deploy API (Vercel / VPS)

- `api/attendance/clock-in.js` kini **mewajibkan JWT valid** + employee_id milik sesi.
- Klien (`src/lib/backgroundSync.js`, `public/sw.js`) mengirim token saat replay antrean offline.
- Deploy klien + API **bersamaan**; versi PWA lama yang menyimpan antrean tanpa token akan gagal replay → item dihapus otomatis setelah max retry (5). Dampak maksimal: absensi offline yang diantrekan sebelum update tidak tersinkron — karyawan dapat clock-in ulang.

## 7. Tandai dokumen audit

Setelah semua di atas sukses, update `docs/MULTI_TENANT_AUDIT.md`:
- Item #1 (RLS leak) → FIXED (prod applied, tanggal).
- Item #3 (tenant scope services) → FIXED (prod applied).
- Centang gate di `docs/GO_LIVE_RLS_RUNBOOK.md`.
