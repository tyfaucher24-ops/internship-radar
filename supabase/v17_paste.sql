-- V17 paste file: open Supabase -> SQL Editor -> New query, paste all of this, Run.
-- Same as migrations/20261028000005_email_alerts.sql. Safe to re-run.
-- Then, in a separate query, set the job key (pick a long random value; put the same value in the EMAIL_JOB_KEY GitHub secret):
--   select public.set_email_job_key('<long random value>');

-- V17: deadline alert emails + founder analytics. Run in the Supabase SQL editor after 0001-0004. Safe to re-run.
-- RLS on everywhere. No service_role key is used anywhere: the hourly email job calls the key-checked functions below
-- with the public anon key plus a long random job key (GitHub secret EMAIL_JOB_KEY); only its sha256 lives here.

-- 0) job key (Ty sets it once: select public.set_email_job_key('<same value as the EMAIL_JOB_KEY secret>'); )
create table if not exists public.email_job_key (id int primary key default 1 check (id = 1), key_hash text not null);
alter table public.email_job_key enable row level security;
alter table public.email_job_key force row level security;
revoke all on public.email_job_key from public, anon, authenticated;
create or replace function public._job_ok(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_key is not null and length(p_key) >= 32 and exists (select 1 from public.email_job_key
    where key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex'));
$$;
revoke all on function public._job_ok(text) from public, anon, authenticated;
create or replace function public.set_email_job_key(p_key text) returns void
language sql security definer set search_path = public as $$
  insert into public.email_job_key(id, key_hash) values (1, encode(sha256(convert_to(p_key, 'UTF8')), 'hex'))
  on conflict (id) do update set key_hash = excluded.key_hash;
$$;
revoke all on function public.set_email_job_key(text) from public, anon, authenticated;  -- SQL editor (postgres) only

-- 1) per-user email settings (A1/A4)
create table if not exists public.email_prefs (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  opted_in    boolean not null default false,
  digest      boolean not null default true,
  reminders   boolean not null default true,
  matches     boolean not null default true,
  digest_dow  smallint not null default 0 check (digest_dow between 0 and 6),   -- 0 = Sunday
  digest_hour smallint not null default 18 check (digest_hour between 0 and 23),
  tz          text not null default 'America/New_York' check (length(tz) <= 64),
  unsub_token text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  opted_in_at timestamptz,
  updated_at  timestamptz not null default now()
);
alter table public.email_prefs enable row level security;
alter table public.email_prefs force row level security;
revoke all on public.email_prefs from public, anon, authenticated;
drop policy if exists "own prefs: select" on public.email_prefs;
drop policy if exists "own prefs: insert" on public.email_prefs;
drop policy if exists "own prefs: update" on public.email_prefs;
create policy "own prefs: select" on public.email_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs: insert" on public.email_prefs for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs: update" on public.email_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select (user_id, opted_in, digest, reminders, matches, digest_dow, digest_hour, tz, updated_at) on public.email_prefs to authenticated;
grant insert (opted_in, digest, reminders, matches, digest_dow, digest_hour, tz), update (opted_in, digest, reminders, matches, digest_dow, digest_hour, tz) on public.email_prefs to authenticated;

create or replace function public.save_email_prefs(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); r public.email_prefs;
begin
  if u is null then raise exception 'signed out' using errcode = '42501'; end if;
  insert into public.email_prefs(user_id) values (u) on conflict (user_id) do nothing;
  update public.email_prefs set
    opted_in = coalesce((p->>'opted_in')::boolean, opted_in),
    digest = coalesce((p->>'digest')::boolean, digest),
    reminders = coalesce((p->>'reminders')::boolean, reminders),
    matches = coalesce((p->>'matches')::boolean, matches),
    digest_dow = coalesce((p->>'digest_dow')::smallint, digest_dow),
    digest_hour = coalesce((p->>'digest_hour')::smallint, digest_hour),
    tz = coalesce(left(p->>'tz', 64), tz),
    opted_in_at = case when (p->>'opted_in')::boolean and not opted_in then now() else opted_in_at end,
    updated_at = now()
  where user_id = u returning * into r;
  return json_build_object('opted_in', r.opted_in, 'digest', r.digest, 'reminders', r.reminders, 'matches', r.matches,
    'digest_dow', r.digest_dow, 'digest_hour', r.digest_hour, 'tz', r.tz);
end $$;
revoke all on function public.save_email_prefs(jsonb) from public, anon;
grant execute on function public.save_email_prefs(jsonb) to authenticated;

-- 2) what was sent (dedupe). No user access at all.
create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('reminder','digest','test')),
  listing_ids text[] not null default '{}',
  windows     text[] not null default '{}',          -- e.g. '{8581f8d10a:7,abc:2}' = listing:window, for reminder dedupe
  sent_at     timestamptz not null default now(),
  status      text not null check (status in ('sent','failed','dry_run','deferred')),
  error       text check (error is null or length(error) <= 300)
);
create index if not exists email_log_user on public.email_log(user_id, sent_at desc);
alter table public.email_log enable row level security;
alter table public.email_log force row level security;
revoke all on public.email_log from public, anon, authenticated;

-- 3) the job: who is opted in, their email, settings, saved tracker rows, profile, and what they were already sent
create or replace function public.email_jobs(p_key text) returns json
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public._job_ok(p_key) then raise exception 'bad job key' using errcode = '42501'; end if;
  return (select coalesce(json_agg(j), '[]') from (
    select p.user_id, u.email, p.digest, p.reminders, p.matches, p.digest_dow, p.digest_hour, p.tz, p.unsub_token,
      (select coalesce(json_agg(i.data), '[]') from public.user_items i where i.user_id = p.user_id and i.coll = 'tracker' and not i.deleted) as tracker,
      (select i.data from public.user_items i where i.user_id = p.user_id and i.coll = 'profile' and not i.deleted order by i.updated_at desc limit 1) as profile,
      (select coalesce(json_agg(json_build_object('type', l.type, 'listing_ids', l.listing_ids, 'windows', l.windows, 'sent_at', l.sent_at)), '[]')
         from public.email_log l where l.user_id = p.user_id and l.status = 'sent' and l.sent_at > now() - interval '60 days') as sent
    from public.email_prefs p join auth.users u on u.id = p.user_id
    where p.opted_in and (p.digest or p.reminders or p.matches) and u.email is not null) j);
end $$;
revoke all on function public.email_jobs(text) from public;
grant execute on function public.email_jobs(text) to anon;

create or replace function public.email_log_add(p_key text, p_user uuid, p_type text, p_ids text[], p_windows text[], p_status text, p_error text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public._job_ok(p_key) then raise exception 'bad job key' using errcode = '42501'; end if;
  insert into public.email_log(user_id, type, listing_ids, windows, status, error)
  values (p_user, p_type, coalesce(p_ids, '{}'), coalesce(p_windows, '{}'), p_status, left(p_error, 300));
  if p_status = 'sent' then insert into public.events(event, user_id) values ('email_sent', p_user); end if;
end $$;
revoke all on function public.email_log_add(text, uuid, text, text[], text[], text, text) from public;
grant execute on function public.email_log_add(text, uuid, text, text[], text[], text, text) to anon;

-- 4) one-click unsubscribe (no login): token from the email; p_type = 'all' | 'digest' | 'reminders' | 'matches'
create or replace function public.email_unsubscribe(p_token text, p_type text) returns boolean
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if p_token is null or length(p_token) < 40 or p_type not in ('all','digest','reminders','matches') then return false; end if;
  update public.email_prefs set
    opted_in = case when p_type = 'all' then false else opted_in end,
    digest = case when p_type = 'digest' then false else digest end,
    reminders = case when p_type = 'reminders' then false else reminders end,
    matches = case when p_type = 'matches' then false else matches end,
    updated_at = now()
  where unsub_token = p_token returning user_id into u;
  if u is null then return false; end if;
  insert into public.events(event, user_id, ref) values ('unsubscribe', u, p_type);
  return true;
end $$;
revoke all on function public.email_unsubscribe(text, text) from public;
grant execute on function public.email_unsubscribe(text, text) to anon, authenticated;

-- 5) analytics events (B1). Insert-only through track_events(); select only via admin functions.
create table if not exists public.events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  day     date not null default (now() at time zone 'utc')::date,
  event   text not null check (event in ('visit','signup','sign_in','profile_built','resume_uploaded','save','unsave','apply_click',
            'tracker_status_change','email_click','unsubscribe','email_sent')),
  user_id uuid references auth.users(id) on delete set null,
  anon_id text check (anon_id is null or anon_id ~ '^[a-z0-9]{8,32}$'),   -- random per browser session per day; not a cookie
  ref     text check (ref is null or length(ref) <= 40),
  caller  text
);
create index if not exists events_day on public.events(day, event);
create index if not exists events_user on public.events(user_id, at) where user_id is not null;
alter table public.events enable row level security;
alter table public.events force row level security;
revoke all on public.events from public, anon, authenticated;

create or replace function public.track_events(p_events jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb; who text := public._caller_hash(); u uuid := auth.uid(); n int := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 25 then return; end if;
  -- rate limits: 300 events per caller per hour, 200k per day overall
  if (select count(*) from public.events where caller = who and at > now() - interval '1 hour') >= 300 then return; end if;
  if (select count(*) from public.events where day = (now() at time zone 'utc')::date) >= 200000 then return; end if;
  for e in select * from jsonb_array_elements(p_events) loop
    n := n + 1;
    if e->>'e' in ('visit','signup','sign_in','profile_built','resume_uploaded','save','unsave','apply_click','tracker_status_change','email_click') then
      if e->>'e' = 'visit' and exists (select 1 from public.events where event = 'visit' and day = (now() at time zone 'utc')::date
           and ((u is not null and user_id = u) or (u is null and anon_id = e->>'a'))) then continue; end if;
      if e->>'e' in ('signup','profile_built') and u is not null and exists (select 1 from public.events where event = e->>'e' and user_id = u) then continue; end if;
      insert into public.events(event, user_id, anon_id, ref, caller)
      values (e->>'e', u, case when (e->>'a') ~ '^[a-z0-9]{8,32}$' then e->>'a' end, left(nullif(e->>'r', ''), 40), who);
    end if;
  end loop;
end $$;
revoke all on function public.track_events(jsonb) from public;
grant execute on function public.track_events(jsonb) to anon, authenticated;

-- 6) founder dashboard numbers (B2), admins only. Aggregates only; raw rows never leave the database.
create or replace function public.admin_stats_v17(p_from date default null, p_to date default null) returns json
language plpgsql stable security definer set search_path = public, auth as $$
declare f date := coalesce(p_from, current_date - 89); t date := coalesce(p_to, current_date);
begin
  if not public.is_admin() then raise exception 'not found' using errcode = '42501'; end if;
  return json_build_object(
    'range', json_build_object('from', f, 'to', t),
    'users', (select count(*) from auth.users),
    'signups_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'signups_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'dau', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where at > now() - interval '1 day'),
    'wau', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where at > now() - interval '7 days'),
    'mau', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where at > now() - interval '30 days'),
    'saves_7d', (select count(*) from public.events where event = 'save' and at > now() - interval '7 days'),
    'apply_clicks_7d', (select count(*) from public.events where event = 'apply_click' and at > now() - interval '7 days'),
    'email_subscribers', (select count(*) from public.email_prefs where opted_in),
    'daily', (select coalesce(json_agg(d order by d.day), '[]') from (
        select g::date as day,
          (select count(*) from auth.users where created_at::date = g::date) as signups,
          (select count(distinct coalesce(user_id::text, anon_id)) from public.events where day = g::date) as active
        from generate_series(f, t, interval '1 day') g) d),
    'funnel', json_build_object(
        'visit', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where event = 'visit' and day between f and t),
        'profile_built', (select count(distinct coalesce(user_id::text, anon_id)) from public.events where event = 'profile_built' and day between f and t),
        'signup', (select count(*) from auth.users where created_at::date between f and t),
        'first_save', (select count(distinct user_id) from public.events where event = 'save' and user_id is not null and day between f and t),
        'first_apply', (select count(distinct user_id) from public.events where event = 'apply_click' and user_id is not null and day between f and t)),
    'cohorts', (select coalesce(json_agg(c order by c.week), '[]') from (
        select g.week, g.size,
          (select json_agg(json_build_object('w', w, 'n', (select count(distinct e.user_id) from public.events e join auth.users u2 on u2.id = e.user_id
               where date_trunc('week', u2.created_at)::date = g.week
                 and e.at >= g.week + (w || ' weeks')::interval
                 and e.at <  g.week + ((w + 1) || ' weeks')::interval)) order by w)
             from generate_series(1, 8) w) as weeks
        from (select date_trunc('week', u.created_at)::date as week, count(distinct u.id) as size
              from auth.users u where u.created_at > now() - interval '9 weeks' group by 1) g) c),
    'top_companies', (select coalesce(json_agg(x), '[]') from (select i.data->'listing'->>'company' as name, count(distinct i.user_id) as n
        from public.user_items i where i.coll = 'tracker' and not i.deleted and coalesce(i.data->'listing'->>'company', '') <> ''
        group by 1 order by 2 desc, 1 limit 20) x),
    'top_roles', (select coalesce(json_agg(x), '[]') from (select i.data->'listing'->>'title' as name, count(distinct i.user_id) as n
        from public.user_items i where i.coll = 'tracker' and not i.deleted and coalesce(i.data->'listing'->>'title', '') <> ''
        group by 1 order by 2 desc, 1 limit 20) x),
    'top_schools', (select coalesce(json_agg(x), '[]') from (select i.data->>'school' as name, count(distinct i.user_id) as n
        from public.user_items i where i.coll = 'profile' and not i.deleted and coalesce(i.data->>'school', '') <> ''
        group by 1 having count(distinct i.user_id) >= 5 order by 2 desc, 1 limit 20) x),
    'email', json_build_object(
        'sent', (select count(*) from public.email_log where status = 'sent' and sent_at::date between f and t),
        'clicks', (select count(*) from public.events where event = 'email_click' and day between f and t),
        'unsub_by_type', (select coalesce(json_object_agg(ref, n), '{}') from (select ref, count(*) n from public.events where event = 'unsubscribe' and day between f and t group by ref) z))
  );
end $$;
revoke all on function public.admin_stats_v17(date, date) from public, anon;
grant execute on function public.admin_stats_v17(date, date) to authenticated;
