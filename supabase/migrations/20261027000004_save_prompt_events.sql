-- V16.1: allow three more cookie-free usage counters for the "Sign in to save" nudge.
-- Same rules as 0003: event names only, no ids, no payload. Run after 0003. Safe to run twice.
alter table public.usage_daily drop constraint if exists usage_daily_event_check;
alter table public.usage_daily add constraint usage_daily_event_check check (event in
  ('pageview','signup','save','apply_click','resume_upload','feedback_view','report','save_prompt_shown','save_prompt_clicked','save_prompt_signed_in'));

create or replace function public.track(events text[]) returns void
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  if events is null or array_length(events, 1) > 20 then return; end if;
  foreach e in array events loop
    if e in ('pageview','signup','save','apply_click','resume_upload','feedback_view','report','save_prompt_shown','save_prompt_clicked','save_prompt_signed_in') then
      insert into public.usage_daily(day, event, n) values ((now() at time zone 'utc')::date, e, 1)
      on conflict (day, event) do update set n = least(public.usage_daily.n + 1, 10000000);
    end if;
  end loop;
end $$;
revoke all on function public.track(text[]) from public;
grant execute on function public.track(text[]) to anon, authenticated;
