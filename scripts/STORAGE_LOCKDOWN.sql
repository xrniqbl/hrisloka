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
DROP POLICY IF EXISTS "documents_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_auth_all" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_owner" ON storage.objects;
DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_auth_delete" ON storage.objects;

-- documents (private): owner-prefix scoped; anon ditolak
-- object path must start with auth.uid(): (storage.foldername(name))[1] = auth.uid()::text
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

-- receipts (private): owner-prefix scoped; anon ditolak
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

-- resumes: baca hanya authenticated; PublicApplyForm publik tetap bisa upload
-- via anon, so keep INSERT TO anon,authenticated (do NOT add owner-prefix check here).
-- H8: batasi ekstensi ke pdf/doc/docx. Kolom storage.objects.metadata TIDAK
-- terverifikasi dari repo ini (skema storage milik Supabase, tidak ada di
-- supabase/migrations maupun scripts), jadi WITH CHECK metadata (mimetype/size)
-- TIDAK dipakai — kondisi coalesce yang fail-closed berisiko memblokir upload
-- legit bila metadata NULL/berbeda versi. Ini mitigasi parsial: nama file bisa
-- dipalsukan dan ukuran tidak dibatasi di server. Validasi penuh (MIME sniff +
-- batas 10 MB yang tepercaya) butuh Edge Function sebelum upload. Client
-- (PublicApplyForm.jsx) sudah menegakkan 10 MB + allowlist MIME/ekstensi.
CREATE POLICY "resumes_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_auth_write" ON storage.objects;
CREATE POLICY "resumes_auth_write" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes' AND name ~* '\.(pdf|doc|docx)$');

-- profile_photos / avatars: baca hanya authenticated; tulis owner-prefix scoped
CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars'));

CREATE POLICY "profile_photos_auth_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('profile_photos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

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
--        → documents/receipts SELECT/INSERT/UPDATE/DELETE + profile_photos
--          INSERT/UPDATE/DELETE each carry the
--          (storage.foldername(name))[1] = auth.uid()::text prefix check
--   3. Upload anon via REST harus 400 (bukan 200):
--        POST {SUPABASE_URL}/storage/v1/object/documents/x.txt
--        headers: apikey+Authorization = anon key  →  HARUS GAGAL
-- ============================================================================
