-- ================================================
-- TAMBAHAN: Temporary public read access untuk demo mode
-- Jalankan di Supabase SQL Editor
-- (Nanti bisa dihapus setelah auth user di-link)
-- ================================================

-- Employees: semua bisa baca (untuk demo)
CREATE POLICY "employees_public_read" ON employees
  FOR SELECT USING (true);

-- Employees: semua bisa update (untuk demo)
CREATE POLICY "employees_public_update" ON employees
  FOR UPDATE USING (true);

-- Attendance: semua bisa baca dan insert (untuk demo)
CREATE POLICY "attendance_public_read" ON attendance
  FOR SELECT USING (true);

CREATE POLICY "attendance_public_insert" ON attendance
  FOR INSERT WITH CHECK (true);

-- Leave: semua bisa akses (untuk demo)
CREATE POLICY "leave_public_all" ON leave_requests
  FOR ALL USING (true);

-- Tickets: semua bisa akses (untuk demo)
CREATE POLICY "tickets_public_all" ON tickets
  FOR ALL USING (true);

-- Reimbursements: semua bisa akses (untuk demo)
CREATE POLICY "reimburse_public_all" ON reimbursements
  FOR ALL USING (true);
