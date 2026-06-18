-- Migration: Add profile_setup_done column to employees table
-- Run this in Supabase SQL Editor

-- 1. Add the column (safe to run multiple times)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS profile_setup_done BOOLEAN DEFAULT FALSE;

-- 2. Mark existing employees with complete data as done
--    (employees who already have NIK + bank_account + emergency_contact filled)
UPDATE employees
SET profile_setup_done = TRUE
WHERE
  profile_setup_done = FALSE
  AND nip IS NOT NULL AND nip != ''
  AND bank_account IS NOT NULL AND bank_account != '{}'::jsonb
  AND emergency_contact IS NOT NULL AND emergency_contact != '{}'::jsonb;

-- 3. Verify
SELECT
  COUNT(*) FILTER (WHERE profile_setup_done = TRUE)  AS setup_done,
  COUNT(*) FILTER (WHERE profile_setup_done = FALSE) AS setup_pending,
  COUNT(*)                                            AS total
FROM employees;
