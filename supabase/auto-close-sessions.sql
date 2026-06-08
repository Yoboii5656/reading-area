-- =============================================
-- Auto-Close Open Sessions at Midnight
-- Run this in your Supabase SQL Editor
-- =============================================

-- Step 1: Create the function that closes all open sessions
create or replace function public.auto_close_open_sessions()
returns void
language plpgsql
security definer
as $$
declare
  closed_count integer;
begin
  -- Close all attendance logs where exit_time is null
  -- Set exit_time to 11:59 PM of the entry date
  -- Mark method as 'auto_closed' so owners can identify these
  update public.attendance_logs
  set
    exit_time = date_trunc('day', entry_time) + interval '23 hours 59 minutes',
    duration_minutes = extract(epoch from (
      (date_trunc('day', entry_time) + interval '23 hours 59 minutes') - entry_time
    )) / 60,
    method = 'auto_closed'
  where
    exit_time is null
    and date < current_date;  -- Only close sessions from previous days

  get diagnostics closed_count = row_count;

  -- Log to postgres for debugging (optional)
  raise notice 'Auto-closed % open sessions', closed_count;
end;
$$;

-- Step 2: Enable the pg_cron extension (requires Supabase Pro plan or manual enable)
-- If you're on the free plan, you'll use the client-side fallback instead.
-- Uncomment below if pg_cron is available:

-- create extension if not exists pg_cron;

-- Schedule the function to run every day at 11:59 PM (IST = UTC+5:30, so 18:29 UTC)
-- select cron.schedule(
--   'auto-close-sessions',
--   '29 18 * * *',  -- 18:29 UTC = 11:59 PM IST
--   'select public.auto_close_open_sessions()'
-- );

-- Step 3: Update the method check constraint to allow 'auto_closed'
-- First drop the existing constraint, then re-add it
alter table public.attendance_logs
  drop constraint if exists attendance_logs_method_check;

alter table public.attendance_logs
  add constraint attendance_logs_method_check
  check (method in ('qr_shared', 'qr_personal', 'manual', 'auto_closed'));

-- Step 4: Grant execute permission
grant execute on function public.auto_close_open_sessions() to authenticated;
grant execute on function public.auto_close_open_sessions() to anon;
