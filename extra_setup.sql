-- ================================================
-- HRISync — Extra Setup for Advanced Features
-- ================================================

-- 1. Create Tables First
-- ------------------------------------------------

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id),
  type VARCHAR(50) NOT NULL, -- 'KTP', 'Sick Note', 'Certificate', 'Receipt', etc.
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trails Table
CREATE TABLE IF NOT EXISTS audit_trails (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS and Policies
-- ------------------------------------------------

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Documents: Owners can manage, Admins (HR) can manage all
CREATE POLICY "documents_own_access" ON documents
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_all_documents" ON documents
  FOR ALL USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- Audit Trails: Only Admins can read
CREATE POLICY "admin_audit_trails" ON audit_trails
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- Announcements: Everyone can read
CREATE POLICY "announcements_read_all" ON announcements FOR SELECT USING (true);

-- 3. Enable Realtime (Supabase Publications)
-- ------------------------------------------------

-- This allows frontend to use .subscribe() on these tables
-- Note: Replace 'attendance_logs' with 'attendance' which is the correct table name
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE reimbursements;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- 4. Instructions for Storage
-- ------------------------------------------------
-- Silakan buat bucket 'employee_docs' di Supabase Storage dengan kebijakan:
-- - Authenticated users can upload
-- - Owners and Admins can read
