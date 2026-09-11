-- ============================================================================
-- STORAGE_LOCKDOWN.sql — Aktifkan RLS storage.objects (Supabase SQL Editor)
-- ============================================================================
-- TEMUAN (2026-09, bukti empiris): upload ANONIM ke bucket private
-- `documents` BERHASIL (200) dengan anon key saja. Pola ini muncul ketika
-- RLS pada storage.objects TIDAK AKTIF — storage lalu hanya menahan DELETE
-- via ownership check, tapi INSERT dibiarkan lolos untuk JWT apa pun.
--
-- Dampak jika dibiarkan: siapa pun bisa menyimpan file arbitrer di server
-- (storage abuse). Script ini mengaktifkan RLS + memastikan policy yang
-- benar (anon tidak bisa apa-apa; authenticated sesuai kebutuhan aplikasi).
--
-- Idempoten — aman dijalankan berulang.
-- ============================================================================

-- ── 1. Aktifkan RLS pada storage.objects (inti perbaikan) ──────────────────
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ── 2. DIAGNOSTIK: lihat policy yang ada saat ini (jalankan dulu jika ingin
--       tahu sebelumnya — hasilnya ditampilkan setelah seluruh script jalan)
-- SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- ── 3. Policy aplikasi (menggantikan versi awal, sekarang eksplisit per
--       bucket; anon TIDAK mendapat policy apa pun = ditolak total) ─────────

-- Hapus policy lama dari STORAGE_BUCKETS_SETUP.sql agar tidak dobel
DROP POLICY IF EXISTS "documents_auth_all" ON storage.objects;
DROP POLICY IF EXISTS "receipts_auth_all" ON storage.objects;
DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;

-- documents (private): authenticated all; anon ditolak
CREATE POLICY "documents_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- receipts (private): authenticated all; anon ditolak
CREATE POLICY "receipts_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');

-- resumes (public): siapa pun baca; hanya authenticated upload
CREATE POLICY "resumes_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'resumes');

CREATE POLICY "resumes_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes');

-- profile_photos / avatars (public): baca publik; tulis authenticated
CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('profile_photos', 'avatars'));

CREATE POLICY "profile_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars'));

CREATE POLICY "profile_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars'))
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars'));

-- ── 4. Cleanup file probe dari pengujian anonim tadi ──────────────────────
DELETE FROM storage.objects
WHERE bucket_id = 'documents' AND name = '__anon_test__.txt';

-- ============================================================================
-- VERIFIKASI setelah script jalan:
--   1. Cek RLS aktif:
--        SELECT relrowsecurity FROM pg_class WHERE relname='objects'
--          AND relnamespace = 'storage'::regnamespace;   -- harus t
--   2. Cek policy:
--        SELECT policyname, cmd, roles FROM pg_policies
--         WHERE schemaname='storage' AND tablename='objects' ORDER BY 1;
--   3. Upload anon via REST harus 400 (bukan 200):
--        POST {SUPABASE_URL}/storage/v1/object/documents/x.txt
--        headers: apikey+Authorization = anon key  →  HARUS GAGAL
-- ============================================================================
