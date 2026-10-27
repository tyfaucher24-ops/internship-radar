-- Intern Index V16 Phase 3: optional accounts + cloud sync. Free tier only.
-- Every table has Row Level Security on. A signed-in user can only read and write their own rows.
-- The browser uses the public anon key only; nothing here needs or exposes the service-role key.

-- 1) Synced user data. One row per item (a tracker row, a saved filter, a contact ...) or per whole setting
--    (item_id '_'), so conflicts resolve last-write-wins per row using updated_at.
create table if not exists public.user_items (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  coll       text        not null check (coll ~ '^[A-Za-z][A-Za-z0-9_]{0,39}$'),
  item_id    text        not null check (length(item_id) between 1 and 80),
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, item_id),
  constraint user_items_size check (pg_column_size(data) <= 102400)   -- 100 KB per row
);
alter table public.user_items enable row level security;
alter table public.user_items force row level security;

drop policy if exists "own rows: select" on public.user_items;
drop policy if exists "own rows: insert" on public.user_items;
drop policy if exists "own rows: update" on public.user_items;
drop policy if exists "own rows: delete" on public.user_items;
create policy "own rows: select" on public.user_items for select to authenticated using (user_id = auth.uid());
create policy "own rows: insert" on public.user_items for insert to authenticated with check (user_id = auth.uid());
create policy "own rows: update" on public.user_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows: delete" on public.user_items for delete to authenticated using (user_id = auth.uid());

revoke all on public.user_items from anon, public;
grant select, insert, update, delete on public.user_items to authenticated;

-- Abuse guard: at most 5,000 rows per account; updated_at can't be set into the future (keeps last-write-wins honest).
create or replace function public.user_items_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.updated_at > now() + interval '5 minutes' then new.updated_at := now(); end if;
  if tg_op = 'INSERT' and (select count(*) from public.user_items where user_id = new.user_id) >= 5000 then
    raise exception 'row limit reached (5000 per account)' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists user_items_guard on public.user_items;
create trigger user_items_guard before insert or update on public.user_items for each row execute function public.user_items_guard();

-- 2) Admin role. Nobody can add themselves: there are no insert/update/delete policies, so only the
--    SQL editor in the Supabase dashboard (or the service role, never used by the site) can grant it.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.admins enable row level security;
alter table public.admins force row level security;
drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated using (user_id = auth.uid());
revoke all on public.admins from anon, authenticated, public;
grant select on public.admins to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 3) Admin working copy (listings + config edits). Admins only.
create table if not exists public.admin_state (
  key        text primary key check (key in ('adminListings','adminConfig')),
  data       jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.admin_state enable row level security;
alter table public.admin_state force row level security;
drop policy if exists "admins only" on public.admin_state;
create policy "admins only" on public.admin_state for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.admin_state from anon, public;
grant select, insert, update, delete on public.admin_state to authenticated;

-- 4) Delete my account: removes the auth user; user_items and admins rows go with it (on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
