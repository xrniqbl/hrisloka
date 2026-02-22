-- Add gender column to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender text;
