-- ============================================================================
-- STORAGE_BUCKETS_SETUP.sql — Bootstrap storage buckets (Supabase SQL Editor)
-- ============================================================================
-- Hasil audit 2026-09: endpoint /storage/v1/bucket (anon) mengembalikan []
-- — bucket yang dipakai aplikasi belum ada di production. Tanpa bucket ini,
-- fitur berikut GAGAL saat dijalankan:
--   documents      → src/pages/Documents.jsx, EmpDocuments (KTP, ijazah, kontrak)
--   receipts       → ExpenseOCR / EmpExpenseOCR (upload struk OCR)
--   resumes        → PublicApplyForm (lamaran kerja, public URL)
--   profile_photos → AvatarPicker / companyService (foto profil; fallback 'avatars')
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents',      'documents',      false),  -- dokumen sensitif: private, akses via signed URL
  ('receipts',       'receipts',       false),  -- struk pengeluaran: private
  ('resumes',        'resumes',        true),   -- CV pelamar: public URL dipakai di form lamaran
  ('profile_photos', 'profile_photos', true),   -- foto profil karyawan: public URL
  ('avatars',        'avatars',        true)    -- fallback foto profil (employeeService)
ON CONFLICT (id) DO NOTHING;

-- ── RLS / policies storage ─────────────────────────────────────────────────
-- Scoped by owner prefix: object path must start with auth.uid()
-- (storage.foldername(name))[1] = auth.uid()::text. No cross-user read/write
-- inside private buckets. Anon gets nothing on private buckets.

-- documents (private): owner-prefix scoped, 4 policies
DROP POLICY IF EXISTS "documents_auth_all" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_owner" ON storage.objects;
CREATE POLICY "documents_select_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- receipts (private): owner-prefix scoped, 4 policies
DROP POLICY IF EXISTS "receipts_auth_all" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_owner" ON storage.objects;
CREATE POLICY "receipts_select_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "receipts_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- resumes (public bucket): public read; public apply form uploads via anon,
-- so keep INSERT TO anon,authenticated (do NOT restrict to owner prefix here)
DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
CREATE POLICY "resumes_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
CREATE POLICY "resumes_auth_write" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

-- profile_photos + avatars (public buckets): public read; write owner-prefix scoped
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('profile_photos', 'avatars'));

DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
CREATE POLICY "profile_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;
CREATE POLICY "profile_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "profile_photos_auth_delete" ON storage.objects;
CREATE POLICY "profile_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- VERIFIKASI: jalankan dari SQL Editor
--   SELECT id, public FROM storage.buckets ORDER BY id;
--   → 5 baris: avatars, documents, profile_photos, receipts, resumes
--   SELECT policyname, cmd, roles FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects' ORDER BY 1;
--   → documents/receipts SELECT/INSERT/UPDATE/DELETE each carry the
--     (storage.foldername(name))[1] = auth.uid()::text prefix check
-- Atau dari REST: GET /storage/v1/bucket (pakai service role key)
-- ============================================================================
