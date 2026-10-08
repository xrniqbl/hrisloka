# ---------------------------------------------------------------
# KiniKerja � Environment Variables Checklist
# ---------------------------------------------------------------

## REQUIRED (Production)
VITE_SUPABASE_URL=                    # From Supabase project settings
VITE_SUPABASE_ANON_KEY=               # From Supabase project settings
VITE_FOUNDER_EMAIL=                   # Founder portal access (no fallback!)

## OPTIONAL (Features)
VITE_DEMO_EMAIL=demo@kinikerja.com     # Demo mode account
VITE_VAPID_PUBLIC_KEY=                # Push notifications
# WhatsApp + Email + AI + Bank — SERVER ONLY (tanpa prefix VITE_).
# Set FONNTE_TOKEN / BREVO_API_KEY+FROM_EMAIL / GEMINI_API_KEY /
# BANK_VALIDATION_API_KEY di Vercel/Supabase env (lihat .env.example).
# JANGAN pernah pakai VITE_FONNTE_TOKEN / VITE_FROM_EMAIL — ter-bundle ke browser!
VITE_SENTRY_DSN=                      # Error tracking

## VERIFICATION COMMAND
# Cek field publik spesifik saja (jangan dump seluruh import.meta.env):
# localStorage.getItem('hrisync_demo_mode'); document.querySelector('meta[name="description"]')

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
