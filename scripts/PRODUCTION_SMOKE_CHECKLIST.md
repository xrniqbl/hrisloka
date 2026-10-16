# Production smoke checklist — KiniKerja

Gunakan setelah migrasi SQL. Centang manual di browser + Supabase.

## 0. Database (SQL Editor)

1. [ ] Jalankan `scripts/create_missing_tables.sql`
2. [ ] Jalankan `supabase/migrations/announcements_company_id.sql`
3. [ ] Jalankan `scripts/smoke-production-flow.sql` — tabel = OK, seed tanpa error fatal
4. [ ] Storage buckets: `profile_photos`, `employee-documents` (public/read sesuai RLS)

## 1. Register → HR → PWA

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | PWA `/app/register` + kode perusahaan valid | 5 step submit OK |
| 2 | HR Web Employees → pending | Karyawan muncul `pending_verification` |
| 3 | Accept & aktifkan | Status `active`, notifikasi/WA jika konfigurasi ada |
| 4 | Login PWA email/password | Masuk `/app/home` (bukan pending) |
| 5 | Karyawan pending lain | Hanya `/app/pending` |

## 2. Absensi + Face ID

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | HR Geofence: set lat/lng/radius company | Row `office_locations.company_id` |
| 2 | PWA Profil → Face ID daftar 3 sudut | Row `employee_faces` `is_active=true` |
| 3 | Absen: GPS → Face → Confirm clock-in | Row `attendance` hari ini |
| 4 | Clock-out | `clock_out` terisi |
| 5 | Double clock-in | Error “Sudah clock-in” |

## 3. Pengajuan HR ↔ PWA

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | PWA Pengajuan cuti | `leave_requests` pending |
| 2 | HR Leave / Approvals approve | status approved + notif PWA |
| 3 | PWA lembur / reimburse | row pending → approve HR |
| 4 | Company B tidak melihat request A | filter company |

## 4. Pengumuman, shift, libur

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | HR Announcements kirim | `announcements.company_id` set |
| 2 | PWA Home max 3 + halaman pengumuman | hanya company sendiri |
| 3 | HR Shift assign Senin–Jumat | PWA Shift menampilkan jadwal |
| 4 | HR Holidays | PWA Kalender menampilkan libur |

## 5. Payroll → Payslip PWA

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | HR Payroll pilih bulan | hitung gaji di layar |
| 2 | **Publikasi ke PWA** | `payroll_records` period YYYY-MM |
| 3 | PWA `/app/payslip` | angka base/allowance/net muncul |
| 4 | Status paid (opsional) | badge “Sudah dibayar” |

## 6. Helpdesk, dokumen, timesheet

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | PWA Helpdesk buat tiket | `tickets` open |
| 2 | HR status → resolved | notif PWA |
| 3 | PWA upload dokumen | `employee_documents` pending |
| 4 | PWA Timesheet catat jam | `timesheets` row |
| 5 | HR Timesheets | list company-scoped |

## 7. Isolasi 2 tenant

| # | Langkah | Hasil diharapkan |
|---|---------|------------------|
| 1 | Jalankan `scripts/smoke-test-two-companies.sql` | NOTICE pass |
| 2 | Login karyawan A | data hanya company A |
| 3 | Login HR B | tidak melihat employees A |

## 8. Push / env production

| # | Item |
|---|------|
| 1 | `VITE_SUPABASE_URL` + anon key production |
| 2 | VAPID keys + `SUPABASE_SERVICE_ROLE_KEY` di server API |
| 3 | PWA subscribe push setelah login |

---

## Cepat: urutan migrasi disarankan

```
1. scripts/create_missing_tables.sql
2. supabase/migrations/announcements_company_id.sql
3. supabase/migrations/migration_company_isolation.sql (jika belum)
4. scripts/smoke-production-flow.sql
5. scripts/smoke-test-two-companies.sql
```
