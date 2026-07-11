# Multi-Tenant + HRD Web ↔ Employee PWA Audit

**Date:** 2026-07-12  
**Canonical pricing:** `src/lib/plans.js` (Starter 149K / Pro 299K)

---

## Architecture (how the two apps connect)

| Surface | Path | Users | Data scope |
|---------|------|-------|------------|
| Marketing | `/`, `/landing`, `/harga` | Public | — |
| HRD Web | `/dashboard/*` | `super_admin`, `hr_admin`, `manager` | `company_id` of logged-in employee |
| Employee PWA | `/app/*` | `employee` (+ pending/rejected) | Own record + same `company_id` |
| Founder | `/founder/*` | Founder email only | Platform-wide (service/founder policies) |

**Shared backend:** one Supabase project. Isolation is by:

1. **App routing** (`App.jsx` AuthRedirect + SubscriptionGuard + EmployeeLayout)
2. **Service filters** (`guardCompanyId` + `.eq('company_id', …)` in most services)
3. **Postgres RLS** (`get_my_company_id()` / `get_my_role()`)

**Employee join path:**

```
HR creates company + code
  → Employee registers at /app/register with company_code
  → employees row: company_id + account_status=pending_verification
  → HR approves in web
  → Employee logs in /app/login → /app/home
  → Attendance, leave, payslip, etc. scoped via company_id / employee_id
```

HR and employee **do share the same company data** by design (same `company_id`).  
They must **not** see other companies.

---

## What already works well

| Area | Status |
|------|--------|
| Role split (HR desktop vs employee PWA) | ✅ AuthRedirect |
| Subscription gate for HR portal | ✅ SubscriptionGuard |
| Employee self-register with company code | ✅ `validateCompanyCode` + `selfRegisterEmployee` |
| Service-layer `guardCompanyId` | ✅ ~28/38 services |
| Branch scoping for managers | ✅ BranchContext |
| Payment → subscription activate | ✅ Webhook (after deploy) |
| Feature flags (founder) | ✅ FeatureFlagContext |

---

## Critical / high issues

### 1. CRITICAL — RLS leak for `super_admin` (fixed in migration)

**File:** `migration_phase3_rls_isolation.sql`

```sql
-- BAD: any super_admin could SELECT all employees
company_id = get_my_company_id() OR get_my_role() = 'super_admin'
```

**Fix migration (run in Supabase SQL Editor):**  
`supabase/migrations/fix_employees_rls_super_admin_leak.sql`

Until this is applied in production, **service-layer filters still protect most UI**, but direct REST/API access with a super_admin JWT could cross tenants.

### 2. HIGH — `getOrCreateCompanyCode` used first company in DB

**Was:** `order('id').limit(1)` → wrong tenant.  
**Fixed in:** `src/services/companyService.js` (current user’s `company_id` only).

### 3. MEDIUM — Some services still weak on tenant scope

| Service | Risk |
|---------|------|
| `notificationService.js` | No `company_id` filter |
| `companySettingsService.js` | No `company_id` |
| `billingService.js` | Mostly user-scoped; verify |

Prefer always passing `employee.company_id` from AuthContext into services.

### 4. MEDIUM — Email global uniqueness

Employee lookup often uses `email`. If emails are globally unique in `employees`, OK.  
If two companies ever share one email, data could collide. Enforce unique `(email)` or `(company_id, email)` intentionally.

### 5. MEDIUM — Webhook company creation

Payment webhook creates company + super_admin best-effort. Incomplete onboarding can leave `company_id` null → isolation breaks for that user until fixed.

### 6. LOW — Demo mode

Demo bypasses real session; keep disabled in production (`VITE_DEMO_*` unset).

---

## HRD ↔ PWA: collision check

| Scenario | Expected | Status |
|----------|----------|--------|
| Company A HR sees only A employees | Filtered by `company_id` | ✅ service + (after fix) RLS |
| Company B employee cannot open A data | RLS + own `employee_id` | ✅ if RLS applied |
| Employee of A clocks in → A attendance only | `employee_id` + company via join | ✅ if service uses company |
| HR A approves leave of B | Blocked by company filter | ✅ |
| Same person HR + employee roles | One role per employee row | ⚠️ use separate accounts |
| Employee logs into `/app` as `hr_admin` | Should go to `/dashboard` | ✅ fixed in EmpLogin |

---

## Feature completeness (honest)

| Module | HRD Web | Employee PWA | Notes |
|--------|---------|--------------|-------|
| Employees / org | ✅ | Directory ✅ | |
| Attendance / geofence | ✅ | Absen ✅ | Needs face models / GPS permission |
| Leave / OT / shifts | ✅ | ✅ | Approval flow HR |
| Payroll / payslip | ✅ | View ✅ | Config-sensitive |
| Reimburse / OCR | ✅ | ✅ | Feature flag OCR |
| Recruitment | ✅ | Public careers ✅ | |
| Contracts | ✅ | View/sign ✅ | |
| Assets / training / KPI | ✅ | ✅ | |
| Multi-branch | ✅ | — | Super_admin |
| Subscription / billing | ✅ | — | Midtrans |
| Founder portal | ✅ | — | Separate |

**Not “broken” by design, but needs ops care:**

- Face attendance models must be deployed under `/models`
- Push VAPID keys for notifications
- RLS migrations must be **actually run** on the live DB
- Edge functions must be **deployed** for payments

---

## Recommended next actions (priority)

1. **Run** `fix_employees_rls_super_admin_leak.sql` on production Supabase.  
2. **Run** `harden_notifications_company_settings_rls.sql` (notifications + company_settings + payroll_config).  
3. **Run** `scripts/rls-audit.sql` and fix any table with `rowsecurity = false`.  
4. **Deploy** payment functions (if not yet).  
5. Smoke test two companies (A/B) in sandbox:
   - Create Co A + Co B  
   - Employee A / Employee B  
   - Confirm no cross-list in employees, attendance, leave  
6. Ensure every new `super_admin` after payment has non-null `company_id`.

### Code hardening done (app layer)

- `src/lib/tenantGuard.js` — `resolveMyCompanyId`, `assertSameCompany`, `assertEmployeeInCompany`
- `notificationService.js` — always verifies employee ∈ company before read/write
- `companySettingsService.js` — company_code verified against caller company; HR-only writes
- `billingService.js` — cannot read/write another user's billing
- `NotificationCenter.jsx` — mark read scoped to `employee_id`; realtime filter per employee

---

## Bottom line

| Question | Answer |
|----------|--------|
| Apakah fitur sudah “semua jalan”? | **Sebagian besar ya di kode**; production butuh RLS SQL + deploy payment + env. |
| HRD web ↔ PWA tersambung? | **Ya** — satu database, digabung lewat `company_id` + role. |
| Bisa tabrakan antar perusahaan? | **Harusnya tidak** jika RLS fix dijalankan + service selalu filter `company_id`. Ada 1 bug RLS super_admin yang **sudah dibuatkan patch**. |
| Perlu ditambah? | Hardening notifikasi/settings multi-tenant, monitoring webhook, test A/B company, CI RLS checks. |
