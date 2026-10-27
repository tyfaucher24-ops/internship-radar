-- V16 Phase 5: cookie-free usage counts, in-app problem/broken-link reports, a tiny error log, and admin stats.
-- Nothing here stores names, emails, resume text or IP addresses. Reports and errors keep only a one-way hash of
-- (signed-in user id or network address) so repeat spam can be capped and distinct reporters counted.
-- Run once in the Supabase SQL editor after 0001 and 0002. Safe to re-run.

-- shared: who is calling, as an irreversible short hash (no raw IP is ever stored)
create or replace function public._caller_hash() returns text
language sql stable security definer set search_path = public as $$
  select left(md5('idr-v16:' || coalesce(auth.uid()::text,
    split_part(coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for', 'unknown'), ',', 1))), 16);
$$;
revoke all on function public._caller_hash() from public, anon, authenticated;

-- 1) usage counts: one row per (day, event); only a whitelist of event names, no payload at all
create table if not exists public.usage_daily (
  day   date not null default (now() at time zone 'utc')::date,
  event text not null check (event in ('pageview','signup','save','apply_click','resume_upload','feedback_view','report')),
  n     bigint not null default 0,
  primary key (day, event)
);
alter table public.usage_daily enable row level security;
alter table public.usage_daily force row level security;
revoke all on public.usage_daily from public, anon, authenticated;
drop policy if exists "admins read usage" on public.usage_daily;
create policy "admins read usage" on public.usage_daily for select to authenticated using (public.is_admin());
grant select on public.usage_daily to authenticated;

create or replace function public.track(events text[]) returns void
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  if events is null or array_length(events, 1) > 20 then return; end if;
  foreach e in array events loop
    if e in ('pageview','signup','save','apply_click','resume_upload','feedback_view','report') then
      insert into public.usage_daily(day, event, n) values ((now() at time zone 'utc')::date, e, 1)
      on conflict (day, event) do update set n = least(public.usage_daily.n + 1, 10000000);
    end if;
  end loop;
end $$;
revoke all on function public.track(text[]) from public;
grant execute on function public.track(text[]) to anon, authenticated;

-- 2) reports: "Report a problem" and per-listing "broken link / closed / wrong info"
create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('closed','wrong','broken','problem')),
  listing_id text check (listing_id is null or length(listing_id) <= 120),
  note       text check (note is null or length(note) <= 1000),
  page       text check (page is null or length(page) <= 40),
  reporter   text not null,
  status     text not null default 'open' check (status in ('open','done','ignored'))
);
create index if not exists reports_listing on public.reports(listing_id) where listing_id is not null;
alter table public.reports enable row level security;
alter table public.reports force row level security;
revoke all on public.reports from public, anon, authenticated;
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports for select to authenticated using (public.is_admin());
drop policy if exists "admins update reports" on public.reports;
create policy "admins update reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update (status) on public.reports to authenticated;

create or replace function public.submit_report(p_kind text, p_listing_id text, p_note text, p_page text) returns boolean
language plpgsql security definer set search_path = public as $$
declare who text := public._caller_hash();
begin
  if p_kind not in ('closed','wrong','broken','problem') then return false; end if;
  -- abuse caps: 20 reports per reporter per day, 2,000 per day overall, one per listing+kind per reporter
  if (select count(*) from public.reports where reporter = who and created_at > now() - interval '1 day') >= 20 then return false; end if;
  if (select count(*) from public.reports where created_at > now() - interval '1 day') >= 2000 then return false; end if;
  if p_listing_id is not null and exists (select 1 from public.reports where reporter = who and listing_id = p_listing_id and kind = p_kind) then return true; end if;
  insert into public.reports(kind, listing_id, note, page, reporter)
  values (p_kind, left(p_listing_id, 120), left(p_note, 1000), left(p_page, 40), who);
  return true;
end $$;
revoke all on function public.submit_report(text, text, text, text) from public;
grant execute on function public.submit_report(text, text, text, text) to anon, authenticated;

-- public, aggregated: distinct reporters per listing for 'closed'/'broken'/'wrong' (open reports only).
-- The sync pipeline reads this with the publishable key to queue re-checks; no notes or reporter hashes leave.
create or replace function public.report_counts() returns table(listing_id text, kind text, reporters bigint)
language sql stable security definer set search_path = public as $$
  select listing_id, kind, count(distinct reporter) from public.reports
  where listing_id is not null and status = 'open' and kind in ('closed','wrong','broken')
  group by listing_id, kind;
$$;
revoke all on function public.report_counts() from public;
grant execute on function public.report_counts() to anon, authenticated;

-- 3) client error log (scrubbed in the browser; capped here)
create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  msg        text not null check (length(msg) <= 300),
  src        text check (src is null or length(src) <= 200),
  build      text check (build is null or length(build) <= 20),
  reporter   text not null
);
alter table public.client_errors enable row level security;
alter table public.client_errors force row level security;
revoke all on public.client_errors from public, anon, authenticated;
drop policy if exists "admins read errors" on public.client_errors;
create policy "admins read errors" on public.client_errors for select to authenticated using (public.is_admin());
grant select on public.client_errors to authenticated;

create or replace function public.log_error(p_msg text, p_src text, p_build text) returns void
language plpgsql security definer set search_path = public as $$
declare who text := public._caller_hash();
begin
  if p_msg is null or length(p_msg) = 0 then return; end if;
  if (select count(*) from public.client_errors where reporter = who and created_at > now() - interval '1 hour') >= 10 then return; end if;
  if (select count(*) from public.client_errors where created_at > now() - interval '1 day') >= 5000 then return; end if;
  insert into public.client_errors(msg, src, build, reporter) values (left(p_msg, 300), left(p_src, 200), left(p_build, 20), who);
  -- keep 30 days
  delete from public.client_errors where created_at < now() - interval '30 days';
end $$;
revoke all on function public.log_error(text, text, text) from public;
grant execute on function public.log_error(text, text, text) to anon, authenticated;

-- 4) admin dashboard numbers (admins only)
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not an admin' using errcode = '42501'; end if;
  return json_build_object(
    'users', (select count(*) from auth.users),
    'signups_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups_by_day', (select coalesce(json_agg(x order by x.day), '[]') from (select created_at::date as day, count(*) n from auth.users where created_at > now() - interval '30 days' group by 1) x),
    'usage_7d', (select coalesce(json_object_agg(event, n), '{}') from (select event, sum(n) n from public.usage_daily where day > (now() - interval '7 days')::date group by event) u),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'reports_recent', (select coalesce(json_agg(r order by r.created_at desc), '[]') from (select id, created_at, kind, listing_id, note, page, status from public.reports order by created_at desc limit 50) r),
    'errors_24h', (select count(*) from public.client_errors where created_at > now() - interval '1 day'),
    'errors_recent', (select coalesce(json_agg(e order by e.n desc), '[]') from (select msg, count(*) n, max(created_at) last from public.client_errors where created_at > now() - interval '7 days' group by msg order by count(*) desc limit 20) e)
  );
end $$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
