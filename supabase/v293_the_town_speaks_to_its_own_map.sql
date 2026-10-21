-- v293 — the town speaks to its own map
--
-- Run once in the Supabase SQL editor. Running it again is safe.
-- Needs v102's town_topic(text); independent of pending gameplay migrations.
--
-- The owner asked to reduce Realtime costs (2026-10-21). Keep the original
-- room for global presence and voice/chat-room status, and the existing private
-- letterboxes for conversations between two people. Ordinary chat, movement
-- and cosmetic actions have one broadcast-only channel per map. No table or
-- saved game data changes. Refresh existing game clients after deployment so
-- everybody receives map chat; old clients only listen to the original room.
--
-- The capability RPC is also the feature switch: new clients use map channels
-- only after this transaction has committed. Before that they use the room.
-- Do not enable RLS or change ownership on realtime.messages: Supabase owns it.

begin;

create or replace function public.town_zone_topic(p_zone text)
returns text
language sql stable security invoker set search_path = ''
as $$
  select case when p_zone in ('town', 'farm', 'forest', 'mountain', 'cave')
    then public.town_topic('main') || ':z:' || p_zone
    else null end;
$$;
revoke execute on function public.town_zone_topic(text) from public, anon;
grant execute on function public.town_zone_topic(text) to authenticated;

-- Exact matching matters: a map suffix must never grant access to somebody
-- else's letterbox, a casino room, a private area, or an arbitrary prefix.
drop policy if exists town_maps_receive on realtime.messages;
create policy town_maps_receive on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and (select realtime.topic()) in (
      select (select public.town_topic('main')) || ':z:' || zone
        from unnest(array['town','farm','forest','mountain','cave']) as zones(zone)
    )
  );

drop policy if exists town_maps_send on realtime.messages;
create policy town_maps_send on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and (select realtime.topic()) in (
      select (select public.town_topic('main')) || ':z:' || zone
        from unnest(array['town','farm','forest','mountain','cave']) as zones(zone)
    )
  );

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards:
-- select count(*) = 2 as map_policies from pg_policies
--  where schemaname='realtime' and tablename='messages'
--    and policyname in ('town_maps_receive','town_maps_send');
-- -- true
-- select has_function_privilege('authenticated','public.town_zone_topic(text)','execute')
--    and not has_function_privilege('anon','public.town_zone_topic(text)','execute')
--    as capability_permissions;
-- -- true
