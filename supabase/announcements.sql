-- Announcements table for HRISync
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow admins to manage announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to announcements"
    ON announcements
    FOR ALL
    USING (is_admin());

-- Employees can read announcements
CREATE POLICY "Employees can read announcements"
    ON announcements
    FOR SELECT
    USING (true);
