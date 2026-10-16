-- ══════════════════════════════════════════════════════════════════
-- KINIKERJA — CREATE FOUNDER / SUPERADMIN USER (FIXED)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
--
-- ⚠️  KEAMANAN: Ganti v_email dan v_password di bawah SEBELUM menjalankan.
--     JANGAN commit password asli ke git. Setelah akun dibuat, ganti
--     password lewat Dashboard > Authentication, lalu hapus jejaknya.
-- ══════════════════════════════════════════════════════════════════

-- ══ STEP 1: Buat auth user (jika belum ada) ══════════════════════
DO $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
  v_email text      := 'CHANGE_ME_founder@yourdomain.com';  -- ← GANTI
  v_password text   := 'CHANGE_ME_USE_A_STRONG_PASSWORD';   -- ← GANTI
BEGIN
  -- Cek apakah sudah ada
  SELECT id INTO v_existing_id FROM auth.users WHERE email = v_email;

  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE '✓ User sudah ada dengan ID: %', v_existing_id;
    v_user_id := v_existing_id;

    -- Update password jika perlu
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;
    RAISE NOTICE '✓ Password diupdate';

  ELSE
    -- Buat user baru
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"KiniKerja Founder"}',
      FALSE,
      'authenticated',
      'authenticated'
    );

    -- Buat identity record
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data,
      provider, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_email,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', NOW(), NOW(), NOW()
    );

    RAISE NOTICE '✓ Auth user baru dibuat dengan ID: %', v_user_id;
  END IF;

  -- ══ STEP 2: Upsert employee record (hanya kolom yang pasti ada) ══
  -- Cek apakah employee sudah ada
  IF EXISTS (SELECT 1 FROM employees WHERE email = v_email) THEN
    UPDATE employees
    SET
      auth_user_id = v_user_id,
      role = 'founder',
      status = 'active'
    WHERE email = v_email;
    RAISE NOTICE '✓ Employee record diupdate (founder)';
  ELSE
    INSERT INTO employees (auth_user_id, email, name, nip, role, status)
    VALUES (v_user_id, v_email, 'KiniKerja', 'FOUNDER-001', 'founder', 'active');
    RAISE NOTICE '✓ Employee record founder dibuat';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ SELESAI — Akun siap digunakan';
  RAISE NOTICE '📧 Email    : %', v_email;
  RAISE NOTICE '🔑 Password : (gunakan yang Anda set di atas, lalu ganti via Dashboard)';
  RAISE NOTICE '👑 Role     : founder';
  RAISE NOTICE '🌐 Login    : https://your-domain/login';
  RAISE NOTICE '══════════════════════════════════════';
END $$;

-- ══ STEP 3: Verifikasi hasil ══════════════════════════════════════
-- Ganti email di bawah sesuai v_email yang Anda set di atas.
SELECT
  u.id        AS user_id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_verified,
  e.name,
  e.role,
  e.status
FROM auth.users u
LEFT JOIN employees e ON e.email = u.email
WHERE u.email = 'CHANGE_ME_founder@yourdomain.com';
