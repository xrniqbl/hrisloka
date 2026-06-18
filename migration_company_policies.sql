-- Migration: company_policies table for HRIS Loka
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS company_policies (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sop', 'regulation', 'policy', 'guideline', 'template')),
  version TEXT DEFAULT '1.0',
  effective_date DATE,
  description TEXT,
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  is_mandatory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE company_policies ENABLE ROW LEVEL SECURITY;

-- Policy: all authenticated users can read active policies
CREATE POLICY "Employees can read active policies"
  ON company_policies FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Policy: admins can manage policies (based on employee role)
CREATE POLICY "Admins can manage policies"
  ON company_policies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('admin', 'hr', 'founder')
    )
  );

-- Insert default sample policies
INSERT INTO company_policies (title, category, version, effective_date, description, status, is_mandatory) VALUES
  ('SOP Absensi & Kehadiran', 'sop', '2.1', '2026-01-01', 'Prosedur standar absensi harian, izin, dan keterlambatan.', 'active', true),
  ('Peraturan Perusahaan 2026', 'regulation', '1.0', '2026-01-01', 'Peraturan perusahaan yang berlaku untuk seluruh karyawan.', 'active', true),
  ('Kebijakan Cuti & Izin', 'policy', '3.0', '2026-01-01', 'Ketentuan jenis cuti, kuota, dan prosedur pengajuan.', 'active', true),
  ('Kebijakan Work From Home', 'policy', '1.2', '2026-03-01', 'Ketentuan dan persyaratan bekerja dari rumah.', 'active', false),
  ('Panduan Onboarding Karyawan Baru', 'guideline', '2.0', '2025-08-01', 'Langkah-langkah onboarding dari hari pertama sampai 90 hari.', 'active', true),
  ('SOP Reimbursement', 'sop', '1.5', '2025-10-01', 'Prosedur pengajuan dan approval reimbursement.', 'active', false),
  ('Kode Etik Karyawan', 'regulation', '1.0', '2025-01-01', 'Standar perilaku dan etika yang harus dipatuhi seluruh karyawan.', 'active', true)
ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_policies_updated_at
  BEFORE UPDATE ON company_policies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
