#!/usr/bin/env bash
# Deploy Midtrans payment edge functions to Supabase.
# Prerequisites: supabase CLI installed & logged in (`supabase login`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Checking supabase CLI..."
if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "==> Deploy create-payment..."
supabase functions deploy create-payment

echo "==> Deploy midtrans-webhook..."
supabase functions deploy midtrans-webhook

echo "==> Deploy activate-free-subscription..."
supabase functions deploy activate-free-subscription

echo ""
echo "==> Done."
echo "Next:"
echo "  1. Set Edge Function secrets (MIDTRANS_SERVER_KEY, SITE_URL, ...)"
echo "  2. Set Midtrans Payment Notification URL to:"
echo "     https://<PROJECT_REF>.supabase.co/functions/v1/midtrans-webhook"
echo "  3. Run SQL: supabase/migrations/sync_plan_prices_149k_299k.sql"
echo "  4. Run SQL: scripts/FIX_FOUNDER_PORTAL_RLS.sql (billing RLS hardening)"
echo "  5. Smoke-test sandbox checkout (see docs/PAYMENT_DEPLOY.md)"
