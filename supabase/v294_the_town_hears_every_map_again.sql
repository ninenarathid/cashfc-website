-- v294 — the town hears every map again
--
-- Run once in the Supabase SQL editor. Running it again is safe, and keeps
-- whatever the switch was set to. Needs nothing newer than v256.
--
-- After v293 chat reached only the speaker's map, and members missed the
-- town talking together (the owner, 2026-10-22). The site now sends each line
-- to the whole town again, while steps and everything else stay on each map.
-- This is the switch for it: 'town' (the default) or 'map'. An admin flips it
-- with `/townchat town` or `/townchat map` in the town's chat; every browser
-- reads it on joining and every five minutes. Before this file runs, browsers
-- find no switch and send lines to the whole town.
--
-- Chat itself is still never stored. This table holds one row: the setting.

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create table if not exists public.town_chat_switch (
  one boolean primary key default true check (one),
  reach text not null default 'town' check (reach in ('town', 'map')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.town_chat_switch enable row level security;
-- No policies: read and written only through the two functions below.
revoke all on public.town_chat_switch from public, anon, authenticated;
insert into public.town_chat_switch (one, reach) values (true, 'town') on conflict (one) do nothing;

create or replace function public.town_chat_reach()
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.reach from public.town_chat_switch s where s.one), 'town');
$$;
revoke all on function public.town_chat_reach() from public, anon;
grant execute on function public.town_chat_reach() to authenticated;

create or replace function public.town_set_chat_reach(p_reach text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.profiles p where p.id = me and p.is_admin) then
    return jsonb_build_object('ok', false, 'why', 'forbidden');
  end if;
  if p_reach is null or p_reach not in ('town', 'map') then
    return jsonb_build_object('ok', false, 'why', 'reach');
  end if;
  insert into public.town_chat_switch (one, reach, changed_by, changed_at) values (true, p_reach, me, now())
  on conflict (one) do update set reach = excluded.reach, changed_by = excluded.changed_by, changed_at = excluded.changed_at;
  return jsonb_build_object('ok', true, 'reach', p_reach);
end $$;
revoke all on function public.town_set_chat_reach(text) from public, anon;
grant execute on function public.town_set_chat_reach(text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards:
-- select public.town_chat_reach();
-- -- town
-- select has_function_privilege('authenticated','public.town_set_chat_reach(text)','execute')
--    and not has_function_privilege('anon','public.town_set_chat_reach(text)','execute')
--    and not has_table_privilege('authenticated','public.town_chat_switch','select') as permissions;
-- -- true
