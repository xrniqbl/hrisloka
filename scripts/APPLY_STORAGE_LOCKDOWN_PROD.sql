-- ============================================================
-- KiniKerja — Storage lockdown (PROD, via SQL Editor as owner)
-- ============================================================
-- WAJIB dijalankan di Dashboard → SQL Editor (sebagai postgres owner),
-- karena Supabase CLI login-role BUKAN owner storage.objects
-- (ALTER/CREATE POLICY di storage.objects gagal via CLI: 42501).
--
-- Kondisi aktual prod saat file ini dibuat:
--   RLS storage.objects = ON (relrowsecurity=true)
--   Buckets: avatars(public), documents(private), profile_photos(public),
--            receipts(private), resumes(private)
--   Policy yang ada: "Members can read resumes" (SELECT, authenticated),
--                    "Public can upload resumes" (INSERT, anon+authenticated)
--   → documents/receipts/avatars/profile_photos TANPA policy = deny total
--     (aman tapi upload dokumen & foto profil MATI sampai file ini jalan).
--
-- Idempoten — aman di-rerun (DROP IF EXISTS + CREATE).
-- ============================================================

-- ── 1. Bereskan policy resumes yang ada ───────────────────────
DROP POLICY IF EXISTS "Members can read resumes" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;

-- resumes: baca authenticated-only; upload anon+authenticated (PublicApplyForm)
-- dengan batas ekstensi pdf/doc/docx (mitigasi parsial H8 — validasi MIME
-- penuh butuh Edge Function). UPDATE/DELETE tidak diberikan.
CREATE POLICY "resumes_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');

CREATE POLICY "resumes_insert_limited" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes' AND name ~* '\.(pdf|doc|docx)$');

-- ── 2. documents (private): owner-prefix scoped ───────────────
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

-- ── 3. receipts (private): owner-prefix scoped ────────────────
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

-- ── 4. profile_photos + avatars: baca authenticated, tulis owner ──
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_delete" ON storage.objects;

CREATE POLICY "profile_photos_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars'));

CREATE POLICY "profile_photos_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- VERIFIKASI (jalankan terpisah setelah file ini):
--   SELECT policyname, cmd, roles::text
--   FROM pg_policies
--   WHERE schemaname='storage' AND tablename='objects'
--   ORDER BY 1;
-- Harus ada 14 baris:
--   documents_*_owner (4), receipts_*_owner (4),
--   profile_photos_* (4: select_auth + insert/update/delete_owner),
--   resumes_select_auth + resumes_insert_limited (2).
-- Dan TIDAK ADA policy dengan roles {anon} kecuali
-- resumes_insert_limited (INSERT saja).
-- ============================================================
