# Smoke: isolasi 2 company (setelah employees RLS fix)

## SQL seed (opsional)
```sql
-- scripts/smoke-test-two-companies.sql
```

## Browser checklist

### Setup
1. Company A: owner/HR login → pastikan `employees.company_id` terisi
2. Company B: akun terpisah (register/checkout beda) → company_id beda
3. Di A: buat 1 karyawan test (atau approve pending)
4. Di B: buat 1 karyawan test

### Harus lulus
| # | Aksi | Expected |
|---|------|----------|
| 1 | HR A → Employees list | Hanya company A |
| 2 | HR B → Employees list | Hanya company B, tidak ada nama A |
| 3 | HR A buka URL profile employee B (jika tahu UUID) | Kosong / error / tidak tampil data B |
| 4 | PWA karyawan A login | Data sendiri + company A saja |
| 5 | HR A → Leave/Attendance list | Tidak ada row company B |
| 6 | Founder login (opsional) | Boleh lihat lintas company (by design) |

### SQL spot-check (sebagai service_role di SQL Editor — bukan anon)
```sql
-- Hitung per company
SELECT company_id, count(*) FROM employees
WHERE company_id IS NOT NULL
GROUP BY company_id
ORDER BY count(*) DESC
LIMIT 20;
```

Isolasi user diuji lewat **browser JWT** (login A/B), bukan service_role.

## Lulus gate
- [ ] A tidak melihat employees B di UI
- [ ] B tidak melihat employees A
- [ ] Self-register masih jalan (pending → approve)

Lanjut: `docs/PAYMENT_SMOKE_RUNBOOK.md`
