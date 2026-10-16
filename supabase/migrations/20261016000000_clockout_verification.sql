-- Clock-out verification evidence: same anti-fraud proof as clock-in.
-- attendanceService.clockOut() writes these columns; older rows stay NULL
-- (treated as "no evidence", never as failure).
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS clock_out_latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_longitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_in_radius BOOLEAN,
  ADD COLUMN IF NOT EXISTS clock_out_face_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_out_face_distance FLOAT,
  ADD COLUMN IF NOT EXISTS clock_out_face_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS clock_out_trust_score INTEGER,
  ADD COLUMN IF NOT EXISTS clock_out_trust_level VARCHAR(20);
