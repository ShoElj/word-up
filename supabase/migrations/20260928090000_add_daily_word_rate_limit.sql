-- =============================================================================
-- Migration: add_daily_word_rate_limit
-- Purpose:   The daily-word Edge Function has no rate limiting today. Its anon
--            key is necessarily public (shipped in the app bundle), so anyone
--            can script repeated calls to it. There's nothing sensitive to
--            leak and writes are already idempotent, so the only real risk is
--            wasted Supabase compute/DB cost from a spam script — this adds a
--            simple per-client-key fixed-window counter the Edge Function can
--            check before doing any real work.
--
-- Design: one row per client key (not per window), so the table never grows
-- unbounded — check_and_increment_rate_limit resets the row's window and
-- count in place once the window has expired, all inside a single atomic
-- UPSERT (safe under concurrent requests from the same client).
--
-- Access: identical belt-and-suspenders pattern to every other table here —
-- RLS enabled, all access revoked from anon/authenticated. The function
-- itself is SECURITY DEFINER (so it can read/write the table despite RLS)
-- but execution is revoked from PUBLIC and granted only to service_role,
-- which is the only role the Edge Function ever authenticates as.
-- =============================================================================

create table if not exists public.daily_word_rate_limit (
  client_key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 1
);

alter table public.daily_word_rate_limit enable row level security;
revoke all on table public.daily_word_rate_limit from anon;
revoke all on table public.daily_word_rate_limit from authenticated;

create or replace function public.check_and_increment_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.daily_word_rate_limit (client_key, window_start, request_count)
  values (p_key, now(), 1)
  on conflict (client_key) do update
    set request_count = case
          when public.daily_word_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.daily_word_rate_limit.request_count + 1
        end,
        window_start = case
          when public.daily_word_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.daily_word_rate_limit.window_start
        end
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.check_and_increment_rate_limit(text, integer, integer) from public;
grant execute on function public.check_and_increment_rate_limit(text, integer, integer) to service_role;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration.
-- =============================================================================

-- 1. Confirm the table and RLS lockdown exist.
select relrowsecurity
from pg_class
where oid = 'public.daily_word_rate_limit'::regclass;
-- Expected: t (true)

-- 2. Exercise the function directly: first 3 calls with max_requests=3 should
--    all return true, the 4th should return false.
select public.check_and_increment_rate_limit('verify-test-key', 3, 600) as call_1;
select public.check_and_increment_rate_limit('verify-test-key', 3, 600) as call_2;
select public.check_and_increment_rate_limit('verify-test-key', 3, 600) as call_3;
select public.check_and_increment_rate_limit('verify-test-key', 3, 600) as call_4;
-- Expected: call_1=t, call_2=t, call_3=t, call_4=f

-- 3. Clean up the test row.
delete from public.daily_word_rate_limit where client_key = 'verify-test-key';
