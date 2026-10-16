-- ============================================================
-- Security audit follow-up (2026-10-11, part 2)
-- Closes: advisor auth_users_exposed + security_definer_view flags,
-- preserves legitimate self-service flows.
--
-- 1. audit_logs_view: SECURITY DEFINER + join auth.users with grants to
--    anon/authenticated = any login reads every user's email. Rebuild as
--    SECURITY INVOKER with NO auth.users join (email comes from employees
--    row only), revoke anon/authenticated, grant to service_role only.
--    Frontend getAuditLogs() already falls back to the raw audit_trails
--    table scoped by company_id — no UX break.
-- 2. subscription_status_view: rebuilt SECURITY INVOKER (same definition).
--    No anon/authenticated grants found — revoke is belt-and-braces.
-- 3. pending_employee_registrations: not referenced in code; revoke public
--    grants (keep view for owner/service_role use).
-- 4. employees self-service INSERT: companyService.selfRegisterEmployee
--    inserts role='employee'/pending_verification bound to its own
--    auth_user_id. The role-gated policy (hr_admin+) would break public
--    registration, so add a narrow self-register policy:
--    auth_user_id = auth.uid(), role IN ('employee'), safe statuses only.
--    Trigger prevent_founder_self_grant still blocks role='founder'.
--
-- Idempotent: OR REPLACE / DROP IF EXISTS / REVOKE IF EXISTS-safe.
-- ============================================================

-- ── 1. audit_logs_view: invoker, no auth.users, owner-only ────
DROP VIEW IF EXISTS public.audit_logs_view;
CREATE VIEW public.audit_logs_view
WITH (security_invoker = true)
AS
  SELECT at.id,
     at.user_id,
     at.company_id,
     at.action,
     at.target_table,
     at.target_id,
     at.old_value,
     at.new_value,
     at.ip_address,
     at.created_at,
     e.name AS user_name,
     e.email AS user_email
    FROM public.audit_trails at
      LEFT JOIN public.employees e ON e.auth_user_id = at.user_id
    ORDER BY at.created_at DESC;

REVOKE ALL ON public.audit_logs_view FROM anon, authenticated;
GRANT SELECT ON public.audit_logs_view TO service_role;

-- ── 2. subscription_status_view: invoker (same definition) ────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'subscription_status_view'
  ) THEN
    EXECUTE 'ALTER VIEW public.subscription_status_view SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.subscription_status_view FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.subscription_status_view TO service_role';
  END IF;
END $$;

-- ── 3. pending_employee_registrations: revoke public grants ───
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'pending_employee_registrations'
  ) THEN
    EXECUTE 'REVOKE ALL ON public.pending_employee_registrations FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.pending_employee_registrations TO service_role';
  END IF;
END $$;

-- ── 4. employees self-register INSERT (public signup flow) ────
-- Narrow: own auth_user_id only, role forced to 'employee', and only
-- pre-employment statuses. HR/admin inserts still use
-- employees_insert_role_gated. Founder-grant trigger remains backstop.
DROP POLICY IF EXISTS "employees_self_register" ON public.employees;
CREATE POLICY "employees_self_register" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND role = 'employee'
    AND (status IS NULL OR status IN ('contract', 'pending', 'pending_verification'))
  );
