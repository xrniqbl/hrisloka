# Go-Live Runbook A — Multi-Tenant RLS

Jalankan di **Supabase Dashboard → SQL → New query**.  
Jangan pakai meta-command psql (`\echo`, `\i`).

## Urutan wajib (stop jika error, perbaiki dulu)

| # | File | Tujuan |
|---|------|--------|
| 1 | `supabase/migrations/fix_employees_rls_super_admin_leak.sql` | Tutup leak `super_admin` global di `employees` |
| 2 | `supabase/migrations/harden_notifications_company_settings_rls.sql` | RLS notifications + company_settings + payroll_config |
| 3 | `supabase/migrations/harden_tenant_rls_bcd_2026.sql` | RLS core tables (attendance via `employee_id` jika tak ada `company_id`) |
| 4 | `scripts/rls-audit.sql` | Verifikasi |
| 5 | `scripts/smoke-test-two-companies.sql` | Smoke isolasi A/B (opsional tapi disarankan) |

## Cara jalankan tiap file

1. Buka file di editor lokal.
2. Copy **seluruh** isi.
3. Paste di SQL Editor → **Run**.
4. Pastikan status sukses (hijau), bukan error merah.
5. Lanjut file berikutnya.

## Interpretasi `rls-audit.sql`

Supabase menampilkan **beberapa result set** (satu per query).

### Query 1 — Tables without RLS
- **OK:** tabel util/legacy tanpa data sensitif tenant.
- **Perlu perhatian:** jika `employees`, `attendance`, `leave_requests`, `companies`, `notifications` muncul di sini → RLS belum aktif.

### Query 2 — super_admin tanpa company scope (**KRITIS**)
- **Target: 0 baris.**
- Ada baris = policy masih bocor lintas tenant → jangan go-live; re-run fix employees + harden BCD.

### Query 3 — Core tables
Untuk setiap tabel core:
- `rls_enabled = true`
- `has_policy = true`

### Query 4 — Helper functions
Harus ada minimal:
- `get_my_company_id` (`security_definer = true`)
- `get_my_role`
- Ideal: `get_my_employee_id`, `is_founder`

### Query 5 — employees policies
`USING` / `qual` harus memakai `get_my_company_id()`, **bukan**:
```sql
company_id = get_my_company_id() OR get_my_role() = 'super_admin'
```

## Error umum & fix

| Error | Arti | Fix |
|-------|------|-----|
| `syntax error at "\echo"` | Meta psql | Pakai `scripts/rls-audit.sql` terbaru |
| `policy "…" already exists` | Re-run tanpa DROP target | File sudah idempotent; pastikan copy versi repo terbaru, atau `DROP POLICY IF EXISTS "…" ON table;` |
| `column "company_id" does not exist` | Schema child table tanpa company_id | Pakai `harden_tenant_rls_bcd_2026.sql` terbaru (scope via `employee_id`) |
| `relation "…" does not exist` | Tabel belum ada | Skip / buat tabel dulu (`scripts/create_missing_tables.sql`) |

## Gate lulus (A selesai)

- [ ] File 1–3 run tanpa error
- [ ] Audit query 2 = **0 rows**
- [ ] Core tables query 3: RLS + policy
- [ ] (Opsional) smoke two companies NOTICE pass

**Lanjut ke B** hanya setelah gate di atas hijau.

## Paste balik ke agent

Salin hasil (screenshot teks) query **2** dan **3** dari audit, atau error lengkap jika gagal.
