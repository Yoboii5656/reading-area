-- =============================================
-- RESET ALL DATA - Makes database completely fresh
-- Run this in your Supabase SQL Editor
-- =============================================

-- Delete in order (child tables first to respect foreign keys)
DELETE FROM public.fee_payments;
DELETE FROM public.attendance_logs;
DELETE FROM public.students;
DELETE FROM public.owners;

-- NOTE: To clear uploaded files (photos etc.), go to
-- Supabase Dashboard → Storage → student-files / owner-files
-- and delete files manually from there.
-- Direct SQL deletion from storage.objects is not allowed by Supabase.
