-- V16 Phase 3: server-side last-write-wins. An upsert carrying an older updated_at than the stored row is ignored,
-- so two devices racing can't overwrite a newer edit with an older one.
create or replace function public.user_items_lww() returns trigger language plpgsql as $$
begin
  if new.updated_at < old.updated_at then return old; end if;
  return new;
end $$;
drop trigger if exists user_items_lww on public.user_items;
create trigger user_items_lww before update on public.user_items for each row execute function public.user_items_lww();
