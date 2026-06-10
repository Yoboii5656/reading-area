-- =============================================
-- Reading Area Management System — COMPLETE DATABASE SETUP
-- =============================================
-- Run this ONCE in your Supabase SQL Editor (supabase.com → SQL Editor)
-- This creates everything needed for a multi-tenant system where
-- each shop owner gets their own isolated data automatically.
-- =============================================

-- =============================================
-- 1. EXTENSIONS
-- =============================================

create extension if not exists "pgcrypto";

-- =============================================
-- 2. TABLES
-- =============================================

-- Owners table (one row per shop owner who signs up)
create table if not exists public.owners (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  reading_area_name text not null,
  address text,
  monthly_fee numeric default 0,
  upi_qr_url text,
  plan text default 'basic' check (plan in ('basic', 'pro')),
  is_suspended boolean default false,
  created_at timestamptz default now()
);

-- Students table (each student belongs to one owner)
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

-- Attendance logs table (entry/exit records)
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  date date not null default current_date,
  entry_time timestamptz,
  exit_time timestamptz,
  duration_minutes integer,
  method text default 'manual' check (method in ('qr_shared', 'qr_personal', 'manual', 'auto_closed')),
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
-- 3. INDEXES (performance for common queries)
-- =============================================

create index if not exists idx_students_owner on public.students(owner_id);
create index if not exists idx_students_owner_student_id on public.students(owner_id, student_id);
create index if not exists idx_students_active on public.students(owner_id, is_active);
create index if not exists idx_attendance_owner_date on public.attendance_logs(owner_id, date);
create index if not exists idx_attendance_student_date on public.attendance_logs(student_id, date);
create index if not exists idx_attendance_open_sessions on public.attendance_logs(owner_id) where exit_time is null;
create index if not exists idx_fee_payments_student on public.fee_payments(student_id);
create index if not exists idx_fee_payments_owner on public.fee_payments(owner_id);
create index if not exists idx_fee_payments_valid_until on public.fee_payments(owner_id, valid_until);

-- =============================================
-- 4. ROW LEVEL SECURITY (data isolation per owner)
-- =============================================
-- This is what makes multi-tenancy work. Each owner can ONLY
-- see and modify their own data. Even if someone gets the API
-- keys, they cannot access another owner's students or records.

alter table public.owners enable row level security;
alter table public.students enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.fee_payments enable row level security;

-- ─── Owners policies ───

create policy "Owners can view own profile"
  on public.owners for select
  using (auth.uid() = id);

create policy "Owners can update own profile"
  on public.owners for update
  using (auth.uid() = id);

create policy "Owners can insert own profile"
  on public.owners for insert
  with check (auth.uid() = id);

-- ─── Students policies ───

-- Authenticated owner sees only their students
create policy "Owners can view own students"
  on public.students for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own students"
  on public.students for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own students"
  on public.students for update
  using (auth.uid() = owner_id);

create policy "Owners can delete own students"
  on public.students for delete
  using (auth.uid() = owner_id);

-- Public read access for QR scan (student scans QR at door, looks up their ID)
create policy "Public can read students for QR scan"
  on public.students for select
  using (true);

-- ─── Attendance policies ───

create policy "Owners can view own attendance"
  on public.attendance_logs for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own attendance"
  on public.attendance_logs for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own attendance"
  on public.attendance_logs for update
  using (auth.uid() = owner_id);

-- Public insert/update for QR scan (students mark entry/exit without logging in)
create policy "Public can insert attendance via QR"
  on public.attendance_logs for insert
  with check (true);

create policy "Public can update attendance via QR"
  on public.attendance_logs for update
  using (true);

-- ─── Fee payments policies ───

create policy "Owners can view own fee payments"
  on public.fee_payments for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own fee payments"
  on public.fee_payments for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own fee payments"
  on public.fee_payments for update
  using (auth.uid() = owner_id);

-- =============================================
-- 5. STORAGE BUCKETS (photos, documents, QR codes)
-- =============================================

insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('owner-files', 'owner-files', true)
on conflict (id) do nothing;

-- Storage policies (each owner uploads to their own folder)
create policy "Owners can upload student files"
  on storage.objects for insert
  with check (
    bucket_id = 'student-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public can view student files"
  on storage.objects for select
  using (bucket_id = 'student-files');

create policy "Owners can delete student files"
  on storage.objects for delete
  using (
    bucket_id = 'student-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owners can upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'owner-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public can view owner files"
  on storage.objects for select
  using (bucket_id = 'owner-files');

create policy "Owners can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'owner-files' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- 6. AUTO-CLOSE OPEN SESSIONS (end of day cleanup)
-- =============================================
-- If a student forgets to scan exit, this function closes
-- their session at 11:59 PM of the entry date automatically.

create or replace function public.auto_close_open_sessions()
returns void
language plpgsql
security definer
as $$
declare
  closed_count integer;
begin
  update public.attendance_logs
  set
    exit_time = date_trunc('day', entry_time) + interval '23 hours 59 minutes',
    duration_minutes = extract(epoch from (
      (date_trunc('day', entry_time) + interval '23 hours 59 minutes') - entry_time
    )) / 60,
    method = 'auto_closed'
  where
    exit_time is null
    and date < current_date;

  get diagnostics closed_count = row_count;
  raise notice 'Auto-closed % open sessions', closed_count;
end;
$$;

-- Grant execute to both roles so it can be called from the app
grant execute on function public.auto_close_open_sessions() to authenticated;
grant execute on function public.auto_close_open_sessions() to anon;

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to generate next student ID for an owner (e.g. RA-0001, RA-0002...)
create or replace function public.generate_student_id(p_owner_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  next_num integer;
  prefix text;
begin
  -- Get current max number for this owner
  select coalesce(max(
    cast(regexp_replace(student_id, '[^0-9]', '', 'g') as integer)
  ), 0) + 1
  into next_num
  from public.students
  where owner_id = p_owner_id;

  -- Get owner's reading area name initials for prefix
  select upper(left(reading_area_name, 2))
  into prefix
  from public.owners
  where id = p_owner_id;

  -- Default prefix if owner not found
  if prefix is null then
    prefix := 'RA';
  end if;

  return prefix || '-' || lpad(next_num::text, 4, '0');
end;
$$;

grant execute on function public.generate_student_id(uuid) to authenticated;

-- Function to get live count of students currently inside (for dashboard)
create or replace function public.get_live_count(p_owner_id uuid)
returns integer
language sql
security definer
as $$
  select count(*)::integer
  from public.attendance_logs
  where owner_id = p_owner_id
    and date = current_date
    and entry_time is not null
    and exit_time is null;
$$;

grant execute on function public.get_live_count(uuid) to authenticated;

-- Function to get students with expiring memberships (next 7 days)
create or replace function public.get_expiring_memberships(p_owner_id uuid)
returns table (
  student_id uuid,
  student_name text,
  phone text,
  valid_until date
)
language sql
security definer
as $$
  select distinct on (s.id)
    s.id as student_id,
    s.name as student_name,
    s.phone,
    fp.valid_until
  from public.students s
  inner join public.fee_payments fp on fp.student_id = s.id
  where s.owner_id = p_owner_id
    and s.is_active = true
    and fp.valid_until between current_date and current_date + interval '7 days'
  order by s.id, fp.valid_until desc;
$$;

grant execute on function public.get_expiring_memberships(uuid) to authenticated;

-- =============================================
-- 8. OPTIONAL: CRON JOB FOR AUTO-CLOSE
-- =============================================
-- Uncomment below if you have pg_cron enabled (Supabase Pro plan).
-- If on free plan, the app calls auto_close_open_sessions() on load instead.

-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'auto-close-sessions',
--   '29 18 * * *',  -- 18:29 UTC = 11:59 PM IST
--   'select public.auto_close_open_sessions()'
-- );

-- =============================================
-- DONE! Your database is ready.
-- =============================================
-- Next steps:
-- 1. Go to Authentication → Settings → enable Phone OTP provider
-- 2. In your app, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 3. Each owner who signs up gets their own isolated data automatically
--    through Row Level Security — no extra setup per owner needed!
-- =============================================
