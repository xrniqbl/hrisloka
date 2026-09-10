# ---------------------------------------------------------------
# HRIS Loka � Environment Variables Checklist
# ---------------------------------------------------------------

## REQUIRED (Production)
VITE_SUPABASE_URL=                    # From Supabase project settings
VITE_SUPABASE_ANON_KEY=               # From Supabase project settings
VITE_FOUNDER_EMAIL=                   # Founder portal access (no fallback!)

## OPTIONAL (Features)
VITE_DEMO_EMAIL=demo@hrisloka.com     # Demo mode account
VITE_VAPID_PUBLIC_KEY=                # Push notifications
VITE_FONNTE_TOKEN=                    # WhatsApp notifications
VITE_FONNTE_TOKEN_DEV=                # WhatsApp dev mode
# Email — server only (see BREVO_API_KEY in .env.example, not VITE_)
VITE_FROM_EMAIL=noreply@hrisloka.com  # Email sender
VITE_SENTRY_DSN=                      # Error tracking

## VERIFICATION COMMAND
# Run in browser console after login:
# console.log(import.meta.env)

## SECURITY NOTES
# - Never commit .env file to git
# - VITE_FOUNDER_EMAIL must match exactly (case-insensitive)
# - VAPID keys must match server-side keys for push to work
# - All VITE_* variables are exposed to browser (client-side)

## RATE LIMITING — LIMITASI (audit 2026-09)
# Rate limit di api/*.js adalah in-memory (Map per proses).
# - Vercel serverless: TIDAK efektif (tiap instance punya Map sendiri, cold start reset).
#   Dianggap lapisan kosmetik; keamanan tetap bergantung pada verifikasi JWT + RLS.
# - VPS (server/index.js, PM2 single node): efektif sebagai throttle dasar.
# Jika butuh limit ketat lintas-instance (mis. brute force), pakai penyimpanan
# bersama (Upstash Redis / Supabase table + RPC) — belum diimplementasi.
