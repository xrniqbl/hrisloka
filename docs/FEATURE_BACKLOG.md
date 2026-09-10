# Feature Backlog — Hasil Audit 2026-09

Fitur inti sudah lengkap (100+ route: HR admin desktop, Employee PWA 40+ halaman, Founder portal, Midtrans, push/email/WhatsApp). Daftar ini adalah **gap yang tersisa** menurut audit `feature/theme-payment-align`, diurutkan dari yang paling berdampak. Tidak diimplementasi pada saat audit — butuh keputusan produk.

---

## 1. WhatsApp Business API (keputusan provider)
- **Status:** env `VITE_WA_BUSINESS_TOKEN` + `VITE_WA_PHONE_ID` disiapkan di `.env.example` tapi **tidak ada kode yang memakainya** (ditandai DEPRECATED/DEAD saat audit). Provider aktif = Fonnte (`FONNTE_TOKEN`), 500 pesan/bulan gratis.
- **Gap:** Fonnte cocok untuk skala kecil; untuk volume besar / template pesan resmi / nomor bisnis terverifikasi → perlu Meta WhatsApp Business API atau provider komersial (Wablas, Qontak).
- **Aksi:** putuskan apakah tetap Fonnte (hapus env mati permanen) atau bangun adapter provider ganda di `api/send-whatsapp.js`.

## 2. Integration Hub sebagian hanya display
- **Status:** `src/pages/IntegrationHub.jsx` hanya menandai WhatsApp (test connection) dan Email (status config) sebagai "production-ready". Kartu lain display/toggle tanpa integrasi nyata.
- **Gap:** pengguna tidak bisa membedakan integrasi nyata vs mockup → risiko ekspektasi salah.
- **Aksi:** pilih — implementasi nyata (Google Calendar? Slack? OKTA/SSO?) atau tandai kartu "Coming soon" secara eksplisit dengan badge visual.

## 3. Blog statis hardcoded
- **Status:** `src/pages/Blog.jsx` memakai array `ARTICLES` hardcoded (tanpa CMS/DB).
- **Gap:** tiap artikel baru butuh deploy ulang. SEO landing halaman blog tidak bisa diupdate tim konten.
- **Aksi:** pindahkan ke tabel `blog_posts` di Supabase + halaman founder untuk mengelola konten, jika konten akan rutin diperbarui.

## 4. Test coverage tipis
- **Status:** 11 file test vs 106 halaman. Yang sudah tercakup: auth-flow, demoGuard, featureFlags, payment + webhook, safePath, tenantGuard, xss, 3 service. Total 70 test.
- **Gap (prioritas test berikutnya):**
  1. `src/lib/payrollEngine.js` — kalkulasi PPh21/JP/BPJS (UU HPP 7/2021) adalah kode paling sensitif finansial; salah hitung = salah gaji.
  2. `src/lib/rbac.js` — route permission per role.
  3. `api/attendance/clock-in.js` — verifikasi JWT baru + pinning employee_id (unit test dengan mock fetch).
  4. Edge function `midtrans-webhook` — signature + amount mismatch (sebagian ada di payment-webhook.test, perlu diperluas).

## 5. Pembersihan schema legacy (migrasi berikutnya)
- `divisions` — tabel didefinisikan di schema.sql, tidak pernah di-query frontend (employees pakai kolom teks `division`).
- `face_descriptors` — RLS di-enable di phase4b tapi tabel tidak pernah dibuat/dipakai (frontend pakai `employee_faces`).
- `contracts` (legacy) — RLS enabled tapi tidak pernah dibuat; sudah digantikan `employee_contracts`.
- Dual helper generation: `my_employee_id()` (bigint, schema.sql) vs `get_my_employee_id()` (integer, harden_bcd) — samakan ke satu fungsi.
- Aksi: satu migrasi cleanup + `scripts/rls-audit.sql` re-run. Jangan dihapus sebelum dicek live DB tidak ada data.

## 6. Perbaikan kecil lain (nice-to-have)
- `onboarding_profiles.company_name` bisa null → `ensureAdminEmployee` membuat employee tanpa company; OwnerSetupWizard sudah menutup sebagian besar kasus — pertimbangkan monitoring webhook (item #5 MULTI_TENANT_AUDIT).
- Uniqueness global kolom `email` di `employees` lintas tenant (item #4 MULTI_TENANT_AUDIT) — perlu keputusan: employee dua company dengan email sama harus bisa, atau unik global?
- Vendor lock demo: `vapid-keys.json` lama masih di git history — rotasi key sudah dijadwalkan di `docs/POST_AUDIT_CHECKLIST.md`.
