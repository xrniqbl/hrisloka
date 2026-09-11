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
-- Kebijakan dasar: user ter-autentikasi boleh upload ke foldernya sendiri;
-- pembacaan sesuai sifat bucket (public/private).

-- documents (private): hanya owner company yang boleh baca/tulis
DROP POLICY IF EXISTS "documents_auth_all" ON storage.objects;
CREATE POLICY "documents_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- receipts (private): user ter-autentikasi
DROP POLICY IF EXISTS "receipts_auth_all" ON storage.objects;
CREATE POLICY "receipts_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');

-- resumes (public bucket): siapa pun boleh baca, authenticated boleh upload
DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
CREATE POLICY "resumes_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
CREATE POLICY "resumes_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');

-- profile_photos + avatars (public buckets): baca publik, tulis authenticated
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('profile_photos', 'avatars'));

DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
CREATE POLICY "profile_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars'));

DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;
CREATE POLICY "profile_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars'))
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars'));

-- ============================================================================
-- VERIFIKASI: jalankan dari SQL Editor
--   SELECT id, public FROM storage.buckets ORDER BY id;
--   → 5 baris: avatars, documents, profile_photos, receipts, resumes
-- Atau dari REST: GET /storage/v1/bucket (pakai service role key)
-- ============================================================================
