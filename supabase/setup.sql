-- =============================================
-- Reading Area Management System - Database Setup
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- =============================================
-- TABLES
-- =============================================

-- Owners table
create table if not exists public.owners (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  reading_area_name text not null,
  address text,
  monthly_fee numeric default 0,
  upi_qr_url text,
  plan text default 'basic' check (plan in ('basic', 'pro')),
  created_at timestamptz default now()
);

-- Students table
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  student_id text not null,
  name text not null,
  phone text not null,
  address text,
  aadhaar_number text,
  photo_url text,
  aadhaar_front_url text,
  aadhaar_back_url text,
  seat_preference text,
  joined_at date default current_date,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(owner_id, student_id)
);

-- Attendance logs table
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  date date not null default current_date,
  entry_time timestamptz,
  exit_time timestamptz,
  duration_minutes integer,
  method text default 'manual' check (method in ('qr_shared', 'qr_personal', 'manual')),
  created_at timestamptz default now()
);

-- Fee payments table
create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  amount numeric not null,
  paid_on date not null default current_date,
  valid_until date not null,
  payment_method text default 'cash' check (payment_method in ('cash', 'upi')),
  note text,
  recorded_by uuid references public.owners(id),
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES (for performance)
-- =============================================

create index if not exists idx_students_owner on public.students(owner_id);
create index if not exists idx_students_student_id on public.students(owner_id, student_id);
create index if not exists idx_attendance_owner_date on public.attendance_logs(owner_id, date);
create index if not exists idx_attendance_student_date on public.attendance_logs(student_id, date);
create index if not exists idx_fee_payments_student on public.fee_payments(student_id);
create index if not exists idx_fee_payments_owner on public.fee_payments(owner_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.owners enable row level security;
alter table public.students enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.fee_payments enable row level security;

-- Owners: can only see/edit their own row
create policy "Owners can view own profile" on public.owners
  for select using (auth.uid() = id);

create policy "Owners can update own profile" on public.owners
  for update using (auth.uid() = id);

create policy "Owners can insert own profile" on public.owners
  for insert with check (auth.uid() = id);

-- Students: owners can manage their own students
create policy "Owners can view own students" on public.students
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own students" on public.students
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own students" on public.students
  for update using (auth.uid() = owner_id);

create policy "Owners can delete own students" on public.students
  for delete using (auth.uid() = owner_id);

-- Attendance: owners can manage their own logs; allow public insert for QR scan
create policy "Owners can view own attendance" on public.attendance_logs
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own attendance" on public.attendance_logs
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own attendance" on public.attendance_logs
  for update using (auth.uid() = owner_id);

-- Public attendance access (for student QR scan - no auth required)
-- We use a service role key or a separate anon policy
create policy "Public can insert attendance via QR" on public.attendance_logs
  for insert with check (true);

create policy "Public can update attendance via QR" on public.attendance_logs
  for update using (true);

-- Public read for students table (needed for QR scan to look up student)
create policy "Public can read students by owner and student_id" on public.students
  for select using (true);

-- Fee payments: owners manage their own
create policy "Owners can view own fee payments" on public.fee_payments
  for select using (auth.uid() = owner_id);

create policy "Owners can insert own fee payments" on public.fee_payments
  for insert with check (auth.uid() = owner_id);

create policy "Owners can update own fee payments" on public.fee_payments
  for update using (auth.uid() = owner_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets (run these separately if needed)
insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('owner-files', 'owner-files', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Owners can upload student files" on storage.objects
  for insert with check (
    bucket_id = 'student-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public can view student files" on storage.objects
  for select using (bucket_id = 'student-files');

create policy "Owners can upload own files" on storage.objects
  for insert with check (
    bucket_id = 'owner-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public can view owner files" on storage.objects
  for select using (bucket_id = 'owner-files');
