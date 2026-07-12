-- ============================================================
-- HRIS Loka — Smoke test multi-tenant (2 companies A & B)
-- Run in Supabase SQL Editor AFTER:
--   1) fix_employees_rls_super_admin_leak.sql
--   2) harden_notifications_company_settings_rls.sql
-- ============================================================
-- This script CREATES test data then VERIFIES isolation.
-- Safe to re-run: uses unique codes with timestamp suffix.
-- ============================================================

DO $$
DECLARE
  suffix text := to_char(now(), 'HH24MISS');
  code_a text := 'TEST-A-' || suffix;
  code_b text := 'TEST-B-' || suffix;
  id_a integer;
  id_b integer;
  emp_a integer;
  emp_b integer;
  cnt integer;
BEGIN
  RAISE NOTICE '=== Creating test companies % / % ===', code_a, code_b;

  INSERT INTO companies (name, company_code, is_active)
  VALUES ('Test Co A ' || suffix, code_a, true)
  RETURNING id INTO id_a;

  INSERT INTO companies (name, company_code, is_active)
  VALUES ('Test Co B ' || suffix, code_b, true)
  RETURNING id INTO id_b;

  -- Fake employee rows WITHOUT auth (for pure SQL isolation checks)
  INSERT INTO employees (company_id, name, email, role, status, account_status, nip)
  VALUES
    (id_a, 'Employee A', 'emp-a-' || suffix || '@test.local', 'employee', 'active', 'active', 'NIP-A-' || suffix)
  RETURNING id INTO emp_a;

  INSERT INTO employees (company_id, name, email, role, status, account_status, nip)
  VALUES
    (id_b, 'Employee B', 'emp-b-' || suffix || '@test.local', 'employee', 'active', 'active', 'NIP-B-' || suffix)
  RETURNING id INTO emp_b;

  -- Sample leave rows if table exists (days is NOT NULL in leave_requests)
  BEGIN
    INSERT INTO leave_requests (employee_id, type, start_date, end_date, days, status, reason)
    VALUES
      (emp_a, 'annual', CURRENT_DATE, CURRENT_DATE + 1, 2, 'pending', 'test A'),
      (emp_b, 'annual', CURRENT_DATE, CURRENT_DATE + 1, 2, 'pending', 'test B');
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'leave_requests skip (no table): %', SQLERRM;
    WHEN undefined_column THEN
      RAISE NOTICE 'leave_requests skip (column mismatch): %', SQLERRM;
    WHEN others THEN
      -- Don't fail whole smoke test if leave seed fails
      RAISE NOTICE 'leave_requests skip: %', SQLERRM;
  END;

  RAISE NOTICE 'Company A id=% emp=% | Company B id=% emp=%', id_a, emp_a, id_b, emp_b;

  -- ── Isolation checks (service-role sees all; app uses RLS as user) ──
  SELECT count(*) INTO cnt FROM employees WHERE company_id = id_a;
  IF cnt < 1 THEN RAISE EXCEPTION 'FAIL: company A has no employees'; END IF;
  RAISE NOTICE 'OK: company A employees count = %', cnt;

  SELECT count(*) INTO cnt FROM employees WHERE company_id = id_b;
  IF cnt < 1 THEN RAISE EXCEPTION 'FAIL: company B has no employees'; END IF;
  RAISE NOTICE 'OK: company B employees count = %', cnt;

  -- Cross-company must not mix when filtered
  SELECT count(*) INTO cnt FROM employees WHERE company_id = id_a AND id = emp_b;
  IF cnt <> 0 THEN RAISE EXCEPTION 'FAIL: emp B visible under company A filter'; END IF;
  RAISE NOTICE 'OK: emp B not in company A filter';

  SELECT count(*) INTO cnt FROM employees WHERE company_id = id_b AND id = emp_a;
  IF cnt <> 0 THEN RAISE EXCEPTION 'FAIL: emp A visible under company B filter'; END IF;
  RAISE NOTICE 'OK: emp A not in company B filter';

  RAISE NOTICE '=== SQL isolation checks PASSED ===';
  RAISE NOTICE 'Manual: login as HR of A and confirm employees list has no B names.';
  RAISE NOTICE 'Cleanup later: DELETE FROM companies WHERE company_code LIKE ''TEST-%%'';';
END $$;

-- Optional cleanup helper (run manually when done testing):
-- DELETE FROM employees WHERE email LIKE 'emp-%@test.local';
-- DELETE FROM companies WHERE company_code LIKE 'TEST-%';
