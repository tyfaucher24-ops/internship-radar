-- V20.1: "on the site right now". A cookie-free heartbeat, stored as one row per person,
-- plus an admins-only reader for the separate stats site. Safe to run twice.
-- Same identity rule as public._caller_hash() (signed-in user id, else hashed first forwarding IP):
-- no cookie, no new id, nothing that survives the row expiring.

create table if not exists public.live (
  who    text primary key,
  at     timestamptz not null default now(),
  page   text check (page is null or page ~ '^[a-z]{1,20}$'),
  signed boolean not null default false
);
create index if not exists live_at on public.live(at);
alter table public.live enable row level security;
alter table public.live force row level security;
revoke all on public.live from public, anon, authenticated;

-- One call per page view or tab focus. Upserts, so a person who moves around stays one row.
create or replace function public.heartbeat(p_page text default null) returns void
language plpgsql security definer set search_path = public as $$
-- NOTE: the local variables are v_who / v_pg, not who / pg: `who` is also a column of public.live,
-- so naming a variable `who` makes the ON CONFLICT clause fail with 42702 (ambiguous column reference).
declare v_who text := public._caller_hash(); v_pg text := lower(coalesce(p_page, ''));
begin
  if v_who is null then return; end if;
  if v_pg !~ '^[a-z]{1,20}$' then v_pg := null; end if;
  -- backstop: if the table ever gets flooded, stop writing rather than grow without limit
  if (select count(*) from public.live) > 20000 then return; end if;
  insert into public.live as l (who, at, page, signed)
  values (v_who, now(), v_pg, auth.uid() is not null)
  on conflict (who) do update set at = now(), page = coalesce(excluded.page, l.page), signed = excluded.signed;
  -- housekeeping, cheap because it only runs on a heartbeat
  if random() < 0.02 then delete from public.live where at < now() - interval '1 day'; end if;
end $$;
revoke all on function public.heartbeat(text) from public;
grant execute on function public.heartbeat(text) to anon, authenticated;

-- Admins only. Counts only; no ids, no pages per person leave the database.
create or replace function public.admin_live() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not found' using errcode = '42501'; end if;
  return json_build_object(
    'now',      (select count(*) from public.live where at > now() - interval '90 seconds'),
    'five_min', (select count(*) from public.live where at > now() - interval '5 minutes'),
    'signed_in',(select count(*) from public.live where at > now() - interval '90 seconds' and signed),
    'anon',     (select count(*) from public.live where at > now() - interval '90 seconds' and not signed),
    'by_page',  (select coalesce(json_agg(x order by x.n desc), '[]') from (
                   select page, count(*) as n from public.live
                   where at > now() - interval '90 seconds' and page is not null
                   group by page) x),
    'last_seen',(select max(at) from public.live)
  );
end $$;
revoke all on function public.admin_live() from public, anon;
grant execute on function public.admin_live() to authenticated;
