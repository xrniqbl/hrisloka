-- ============================================================
-- Migration: platform_settings table
-- Digunakan untuk Maintenance Mode (MaintenanceGuard di App.jsx
-- dan FounderSettings.jsx)
-- Jalankan di Supabase SQL Editor
-- ============================================================

create table if not exists public.platform_settings (
  key   text primary key,
  value text not null default '',
  updated_at timestamptz default now()
);

-- Seed default values
insert into public.platform_settings (key, value) values
  ('is_maintenance',     'false'),
  ('maintenance_message','Platform sedang dalam pemeliharaan. Kami akan kembali sebentar lagi.'),
  ('maintenance_duration','')
on conflict (key) do nothing;

-- RLS: anyone can read (needed for MaintenanceGuard before auth)
alter table public.platform_settings enable row level security;

create policy "public_read_platform_settings"
  on public.platform_settings for select
  using (true);

-- Only service_role (Supabase admin) or authenticated users can write
-- In practice, only Founder (via FounderSettings.jsx) calls upsert
create policy "authenticated_write_platform_settings"
  on public.platform_settings for all
  using (auth.role() = 'authenticated');
