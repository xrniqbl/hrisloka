-- ============================================================
-- HRIS Loka — Production smoke: tables + company-scoped flow
-- Jalankan di Supabase SQL Editor
-- ============================================================
-- Prasyarat: create_missing_tables.sql + announcements_company_id.sql
-- Skema: companies.id = SERIAL/INT, employees.id = SERIAL/BIGINT
-- ============================================================

-- 1) Critical tables exist
SELECT
  t.table_name,
  CASE WHEN c.table_name IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM (
  VALUES
    ('companies'),
    ('employees'),
    ('leave_requests'),
    ('overtime_requests'),
    ('reimbursements'),
    ('attendance'),
    ('office_locations'),
    ('employee_faces'),
    ('announcements'),
    ('notifications'),
    ('shifts'),
    ('shift_assignments'),
    ('payroll_records'),
    ('timesheets'),
    ('tickets'),
    ('employee_documents'),
    ('onboarding_tasks'),
    ('holidays'),
    ('loans'),
    ('trainings')
) AS t(table_name)
LEFT JOIN information_schema.tables c
  ON c.table_schema = 'public' AND c.table_name = t.table_name
ORDER BY status DESC, t.table_name;

-- 2) Multi-tenant columns present
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'announcements' AND column_name = 'company_id')
    OR (table_name = 'office_locations' AND column_name = 'company_id')
    OR (table_name = 'employees' AND column_name IN ('company_id', 'account_status', 'auth_user_id'))
    OR (table_name = 'payroll_records' AND column_name IN ('period', 'base_salary', 'take_home_pay', 'status'))
    OR (table_name = 'employee_faces' AND column_name IN ('descriptor', 'is_active'))
    OR (table_name = 'notifications' AND column_name IN ('employee_id', 'title', 'body', 'read', 'message'))
  )
ORDER BY table_name, column_name;

-- 3) Optional: end-to-end data path for one company (safe re-run)
--    types match migration_company_register.sql (INT/SERIAL ids)
DO $$
DECLARE
  cid integer;
  emp_id bigint;
  leave_id bigint;
  n_count int;
  has_office_company boolean;
BEGIN
  -- Pick first active company (id = integer/serial)
  SELECT id INTO cid
  FROM companies
  WHERE COALESCE(is_active, true) = true
  ORDER BY id
  LIMIT 1;

  IF cid IS NULL THEN
    RAISE NOTICE 'SKIP flow seed: no companies row';
    RETURN;
  END IF;

  -- Pick first employee in that company
  SELECT id INTO emp_id
  FROM employees
  WHERE company_id = cid
  ORDER BY id
  LIMIT 1;

  IF emp_id IS NULL THEN
    RAISE NOTICE 'SKIP flow seed: no employees for company %', cid;
    RETURN;
  END IF;

  RAISE NOTICE 'Using company_id=% employee_id=%', cid, emp_id;

  -- Ensure office location for absen geofence
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'office_locations'
      AND column_name = 'company_id'
  ) INTO has_office_company;

  IF has_office_company THEN
    IF NOT EXISTS (SELECT 1 FROM office_locations WHERE company_id = cid) THEN
      BEGIN
        INSERT INTO office_locations (name, latitude, longitude, radius_meters, company_id)
        VALUES ('HQ Smoke', -6.200000, 106.816666, 200, cid);
        RAISE NOTICE 'Inserted office_locations for company %', cid;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'office_locations insert skipped: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'office_locations already exists for company %', cid;
    END IF;
  ELSE
    -- table without company_id column
    IF NOT EXISTS (SELECT 1 FROM office_locations LIMIT 1) THEN
      BEGIN
        INSERT INTO office_locations (name, latitude, longitude, radius_meters)
        VALUES ('HQ Smoke', -6.200000, 106.816666, 200);
        RAISE NOTICE 'Inserted office_locations (no company_id col)';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'office_locations insert skipped: %', SQLERRM;
      END;
    END IF;
  END IF;

  -- Pending leave sample
  BEGIN
    INSERT INTO leave_requests (employee_id, type, start_date, end_date, days, reason, status)
    VALUES (emp_id, 'Cuti Smoke', CURRENT_DATE + 7, CURRENT_DATE + 8, 2, 'smoke test', 'pending')
    RETURNING id INTO leave_id;
    RAISE NOTICE 'Inserted leave_requests id=%', leave_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'leave_requests insert skipped: %', SQLERRM;
  END;

  -- Notification sample (body and/or message column)
  BEGIN
    INSERT INTO notifications (employee_id, type, title, body, read)
    VALUES (emp_id, 'system', 'Smoke notifikasi', 'Notifikasi production smoke OK', false);
    GET DIAGNOSTICS n_count = ROW_COUNT;
    RAISE NOTICE 'Inserted notifications rows=%', n_count;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO notifications (employee_id, type, title, message, read)
      VALUES (emp_id, 'system', 'Smoke notifikasi', 'Notifikasi production smoke OK', false);
      RAISE NOTICE 'Inserted notifications (message col)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'notifications insert skipped: %', SQLERRM;
    END;
  END;

  -- Announcement sample (company_id = integer, same as companies.id)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'announcements'
        AND column_name = 'company_id'
    ) THEN
      INSERT INTO announcements (title, message, company_id)
      VALUES ('Smoke pengumuman', 'HR → PWA company-scoped OK', cid);
      RAISE NOTICE 'Inserted announcement for company %', cid;
    ELSE
      INSERT INTO announcements (title, message)
      VALUES ('Smoke pengumuman', 'HR → PWA OK (no company_id col yet)');
      RAISE NOTICE 'Inserted announcement without company_id';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'announcements insert skipped: %', SQLERRM;
  END;

  RAISE NOTICE '=== Smoke seed done for company=% employee=% ===', cid, emp_id;
END $$;

-- 4) Counts by company (spot multi-tenant data)
SELECT
  c.id,
  c.name AS company,
  c.company_code,
  (SELECT count(*) FROM employees e WHERE e.company_id = c.id) AS employees,
  (SELECT count(*) FROM announcements a
     WHERE EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='announcements' AND column_name='company_id'
     ) AND a.company_id = c.id
  ) AS announcements
FROM companies c
ORDER BY c.id DESC
LIMIT 20;
