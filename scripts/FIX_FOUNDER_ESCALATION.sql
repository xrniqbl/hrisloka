-- ============================================================
-- FIX C1: Founder escalation hardening (SQL-level enforcement)
-- ============================================================
-- Kerentanan: is_founder() lama hanya cek get_my_role()='founder'
-- (kolom employees.role), dan policy employees_admin_insert tidak
-- membatasi nilai role. Akibatnya super_admin tenant bisa:
--   1. UPDATE/INSERT employees SET role='founder' untuk dirinya,
--   2. lolos is_founder() lama,
--   3. membaca semua tabel billing via policy founder-only.
-- Guard client-side hanya UX — RLS di sini adalah enforcement nyata.
--
-- Model baru:
--   - Sumber kebenaran founder = tabel platform_founders (user_id),
--     BUKAN kolom employees.role.
--   - employees.role='founder' tidak memberi hak apa pun kecuali
--     user_id pemanggil terdaftar di platform_founders.
--   - Trigger prevent_founder_self_grant memblokir GRANT role founder
--     oleh non-founder di level baris (menutup semua varian nama
--     policy INSERT/UPDATE yang ada di DB).
--
-- Idempoten: aman di-rerun di Supabase SQL Editor (CREATE OR REPLACE,
-- CREATE TABLE IF NOT EXISTS, DROP IF EXISTS).
-- Urutan jalan TIDAK penting vs scripts/FIX_FOUNDER_PORTAL_RLS.sql:
-- definisi platform_founders + is_founder() di kedua file IDENTIK
-- (CREATE OR REPLACE), tiap file tetap mandiri.
--
-- Urutan disarankan:
--   1. Jalankan file ini.
--   2. Bootstrap 1x sebagai operator (lihat BLOK BOOTSTRAP di bawah).
--   3. Jalankan scripts/FIX_FOUNDER_PORTAL_RLS.sql (atau sebaliknya).
-- ============================================================

-- ── 0. Helpers (idempoten, guard CREATE OR REPLACE) ──────────
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── 1. platform_founders: sumber kebenaran founder ───────────
-- RLS ENABLE tanpa policy untuk anon/authenticated = deny default.
-- Hanya operator SQL langsung / service_role yang bisa tulis.
CREATE TABLE IF NOT EXISTS platform_founders (
  user_id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_founders ENABLE ROW LEVEL SECURITY;

-- Sengaja TANPA CREATE POLICY: deny default untuk anon/authenticated.
-- Jangan tambahkan policy baca/tulis untuk role authenticated.

-- ── BLOK BOOTSTRAP (operator only, 1x) ───────────────────────
-- Cara pakai:
--   1. Ganti '<FOUNDER_EMAIL>' dengan email founder sebenarnya.
--   2. Uncomment 4 baris INSERT di bawah, jalankan file ini sekali.
--   3. Comment kembali / biarkan tercomment setelah founder terdaftar.
-- Dibutuhkan service_role atau SQL Editor sebagai owner (bypass RLS).
-- INSERT INTO platform_founders (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = '<FOUNDER_EMAIL>'
-- ON CONFLICT (user_id) DO NOTHING;

-- ── 2. is_founder() kanonis (identik di FIX_FOUNDER_PORTAL_RLS.sql) ──
CREATE OR REPLACE FUNCTION is_founder()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_founders WHERE user_id = auth.uid());
$$;

-- ── 3. Trigger: blokir GRANT role founder oleh non-founder ───
-- auth.uid() NULL = operator SQL langsung / service_role → lolos
-- (diperlukan untuk bootstrap & perbaikan manual oleh owner).
CREATE OR REPLACE FUNCTION prevent_founder_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $trig$
BEGIN
  IF COALESCE(NEW.role, '') = 'founder'
     AND auth.uid() IS NOT NULL
     AND NOT is_founder() THEN
    RAISE EXCEPTION 'forbidden: founder role grant';
  END IF;
  RETURN NEW;
END;
$trig$;

DROP TRIGGER IF EXISTS prevent_founder_self_grant ON employees;

CREATE TRIGGER prevent_founder_self_grant
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION prevent_founder_self_grant();

-- ── 4. Perkuat policy employees (defense-in-depth) ───────────
-- Catatan quoting: di WITH CHECK, kolom merujuk new row langsung
-- (tulis `role`, BUKAN `NEW.role` — NEW hanya valid di trigger).
-- Backstop utama tetap trigger di atas (menutup semua varian nama
-- policy INSERT/UPDATE lain yang mungkin ada di DB live).

-- 4a. employees_admin_insert (definisi dari RUN_ALL_RLS_HARDENING.sql
--     / 20261009002200_fix_employees_rls_leak.sql + guard founder)
DROP POLICY IF EXISTS "employees_admin_insert" ON employees;
CREATE POLICY "employees_admin_insert" ON employees
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND get_my_role() IN ('hr_admin', 'super_admin', 'manager')
    AND (role IS DISTINCT FROM 'founder' OR is_founder())
  );

-- 4b. employees_own_record_update (WITH CHECK + guard founder;
--     USING tidak berubah agar karyawan tetap bisa edit profil sendiri)
DROP POLICY IF EXISTS "employees_own_record_update" ON employees;
CREATE POLICY "employees_own_record_update" ON employees
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND (role IS DISTINCT FROM 'founder' OR is_founder())
  );

-- 4c. employees_update_company_admin (definisi dari
--     scripts/FIX_EMPLOYEES_POLICIES_FROM_AUDIT.sql + guard founder)
DROP POLICY IF EXISTS "employees_update_company_admin" ON employees;
CREATE POLICY "employees_update_company_admin" ON employees
  FOR UPDATE
  USING (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND get_my_role() IN ('super_admin', 'hr_admin', 'manager')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND company_id = get_my_company_id()
    AND (role IS DISTINCT FROM 'founder' OR is_founder())
  );

-- ============================================================
-- VERIFY (optional, uncomment untuk cek):
-- ============================================================
-- -- is_founder harus membaca platform_founders, bukan employees.role:
-- SELECT pg_get_functiondef(oid) FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace AND proname = 'is_founder';
--
-- -- trigger terpasang:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'prevent_founder_self_grant';
--
-- -- platform_founders deny default (0 policy untuk anon/authenticated):
-- SELECT policyname, roles FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'platform_founders';
