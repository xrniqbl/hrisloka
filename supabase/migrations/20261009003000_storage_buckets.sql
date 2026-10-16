-- ============================================================
-- Storage buckets bootstrap (idempotent).
-- 00500 created 'resumes' (private). This creates the rest:
-- documents, receipts (private) + profile_photos, avatars (public).
-- RLS/prefix policies come from scripts/STORAGE_BUCKETS_SETUP.sql
-- + scripts/STORAGE_LOCKDOWN.sql (run once via SQL Editor or
-- include in a later migration).
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents',      'documents',      false),
  ('receipts',       'receipts',       false),
  ('profile_photos', 'profile_photos', true),
  ('avatars',        'avatars',        true)
ON CONFLICT (id) DO NOTHING;
