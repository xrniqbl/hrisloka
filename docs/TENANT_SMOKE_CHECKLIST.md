# Multi-tenant smoke checklist (HRD ↔ PWA)

## Prerequisites

Run in Supabase SQL Editor (order):

1. `supabase/migrations/fix_employees_rls_super_admin_leak.sql`
2. `supabase/migrations/harden_notifications_company_settings_rls.sql`
3. `scripts/smoke-test-two-companies.sql` (creates TEST-A / TEST-B rows)

## Manual UI test (30 min)

### Setup

| | Company A | Company B |
|---|-----------|-----------|
| Owner | Register → checkout → activate | Register → checkout → activate |
| Company code | Settings → copy code | Settings → copy code |
| Employee | `/app/register` + code A | `/app/register` + code B |
| Approve | HRD A approves emp A | HRD B approves emp B |

### Isolation checks

| # | Action | Expected |
|---|--------|----------|
| 1 | HRD A → Employees list | Only A employees |
| 2 | HRD B → Employees list | Only B employees |
| 3 | Emp A clock-in | Attendance under A only |
| 4 | HRD A attendance report | No B rows |
| 5 | Emp A directory | Only A colleagues |
| 6 | HRD A company code screen | Code A, not B |
| 7 | Emp A login via `/app/login` | Stays in PWA `/app/*` |
| 8 | HRD A login via `/app/login` | Redirected to `/dashboard` |
| 9 | Broadcast announcement A | Only A employees receive |
| 10 | Push broadcast (if configured) | Requires `companyId`; no global blast |

### Payment (sandbox)

| # | Action | Expected |
|---|--------|----------|
| 1 | Checkout Starter Rp 149.000 | Snap opens |
| 2 | Pay success | `payment_orders.status=paid` |
| 3 | Webhook | `subscriptions.status=active` |
| 4 | Dashboard access | SubscriptionGuard allows |

## Cleanup test companies

```sql
DELETE FROM employees WHERE email LIKE 'emp-%@test.local';
DELETE FROM companies WHERE company_code LIKE 'TEST-%';
```

## Pass criteria

- Zero cross-company rows in any HR list for A vs B  
- PWA employee never sees other company directory/payslips  
- Super_admin of A cannot SELECT employees of B (after RLS fix)  
