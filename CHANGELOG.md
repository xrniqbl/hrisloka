# Changelog

All notable changes to KiniKerja will be documented in this file.

## [Unreleased] - 2026-07-06

### Security Fixes

#### Critical - Payment Security
- **CheckoutPage.jsx**: Removed handleActivate from Midtrans Snap onSuccess callback
  - Frontend was activating subscription immediately after user clicked Finish on Midtrans Snap
  - Users could get premium access without actual payment (especially for async payment methods like bank transfer)
  - Subscription activation now 100% handled by backend webhook (supabase/functions/midtrans-webhook)
  - Files: src/pages/CheckoutPage.jsx

#### Critical - API Keys Exposure
- **Service files**: Removed all VITE_ prefix API keys from client bundle
  - Removed VITE_GEMINI_API_KEY from src/services/aiService.js
  - Removed VITE_RESEND_API_KEY from src/services/emailService.js
  - Removed VITE_FONNTE_TOKEN from src/services/whatsappService.js
  - Removed dev fallback functions (callGeminiDirect, sendDirectResend, sendDirectFonnte)
  - All API calls now go through serverless functions only
  - Files: src/services/aiService.js, src/services/emailService.js, src/services/whatsappService.js

#### Critical - XSS Protection
- **BlogPost.jsx**: Added DOMPurify sanitization
  - dangerouslySetInnerHTML without sanitization
  - Imported DOMPurify and wrapped content
  - Files: src/pages/BlogPost.jsx

#### Medium - Demo Password Exposure
- **demoGuard.js**: Removed VITE_DEMO_PASSWORD from client bundle
  - Demo login now only checks email (password verified server-side)
  - Replaced innerHTML with DOM methods (createElement, textContent)
  - Files: src/lib/demoGuard.js, src/pages/AuthPage.jsx, src/pages/employee/EmpLogin.jsx

### Features Added

#### Subscription Management (Founder Portal)
- **FounderSubscribers.jsx**: Implemented Cancel and Extend subscription features
  - Cancel: Founder can cancel subscription with reason prompt
  - Extend: Founder can extend subscription by X days
  - Added loading states and error handling
  - Files: src/pages/founder/FounderSubscribers.jsx

#### Payment Status Polling
- **CheckoutPage.jsx**: Added real-time payment status polling
  - Polls payment_orders table every 5 seconds
  - Shows Memeriksa... status during check
  - Auto-updates to Aktif when payment confirmed
  - Shows Dibatalkan, Gagal, or Kedaluwarsa for failed payments
  - Files: src/pages/CheckoutPage.jsx

#### Email Notifications
- **midtrans-webhook**: Added subscription activation email
  - Sends email via Resend when subscription is activated
  - Includes plan details, expiry date, and login link
  - Graceful fallback if RESEND_API_KEY not set
  - Files: supabase/functions/midtrans-webhook/index.ts

#### IntegrationHub Cleanup
- **IntegrationHub.jsx**: Hidden coming soon integrations
  - Slack Webhook and Accounting Software hidden from UI
  - Only Email SMTP and WhatsApp API visible
  - Files: src/pages/IntegrationHub.jsx

### Bug Fixes

#### Database Field Consistency
- **FounderSubscribers.jsx**: Fixed field names to match database schema
  - start_date to starts_at
  - end_date to expires_at
  - amount to price_paid
  - employee_count to onboarding_profiles.employee_count (via join)
  - Files: src/pages/founder/FounderSubscribers.jsx, src/services/founderService.js

#### Non-existent Columns
- **founderService.js**: Removed references to non-existent columns
  - Removed cancelled_at and notes from cancelSubscription
  - Removed notes from handleExtendSubscription
  - Files: src/services/founderService.js, src/pages/founder/FounderSubscribers.jsx

### Documentation

- **DEPLOYMENT_GUIDE.md**: Complete deployment guide
  - Prerequisites and account setup
  - Environment variables configuration
  - Database migrations
  - Supabase Edge Functions deployment
  - Midtrans, Resend, Fonnte, Gemini setup
  - Pre-launch checklist
  - Security best practices
  - Troubleshooting guide

### Cleanup

- Removed 47 development utility scripts (fix_*.py, fix_*.ps1)
  - Scripts were used during development and no longer needed
  - Not referenced in production code
  - Reduces repository clutter

### Build and Verification

- All changes tested with npm run build
- 4573 modules transformed successfully
- 0 errors, 0 warnings
- Production bundle ready
