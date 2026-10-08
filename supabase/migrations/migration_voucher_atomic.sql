-- ══════════════════════════════════════════════════════════
-- Migration: atomic voucher increment (cegah race / double-spend)
-- Jalankan di Supabase SQL Editor SETELAH tabel vouchers ada.
-- Dipakai oleh edge functions activate-free-subscription & midtrans-webhook.
-- ══════════════════════════════════════════════════════════

-- RPC atomik: increment hanya bila di bawah max_uses (atau max_uses NULL).
-- Return TRUE bila berhasil diklaim, FALSE bila habis / tidak ditemukan.
CREATE OR REPLACE FUNCTION claim_voucher(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  -- Kunci baris agar dua request bersamaan tidak double-spend
  SELECT id INTO v_id
  FROM vouchers
  WHERE code = UPPER(TRIM(p_code))
    AND is_active = true
    AND (valid_until IS NULL OR valid_until >= NOW())
    AND (max_uses IS NULL OR COALESCE(used_count, current_uses, 0) < max_uses)
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Dukung dua varian skema (used_count baru / current_uses lama)
  UPDATE vouchers
  SET
    used_count = CASE
      WHEN used_count IS NOT NULL THEN used_count + 1
      ELSE used_count
    END,
    current_uses = CASE
      WHEN used_count IS NOT NULL THEN current_uses
      ELSE COALESCE(current_uses, 0) + 1
    END
  WHERE id = v_id;

  RETURN TRUE;
END;
$$;

-- Hanya service_role (edge functions) yang boleh eksekusi; anon/authenticated tidak.
REVOKE ALL ON FUNCTION claim_voucher(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_voucher(TEXT) TO service_role;
