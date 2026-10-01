-- v102 — the town opens to members
--
-- Run this once in the Supabase SQL editor, after v101. Running it again is
-- safe. It needs verified_character() (v85).
--
-- Cash Town (v101) was for the admins. Now every member with a verified
-- character may come in, so the FC can find out how many one room holds;
-- the bar is the same one as for writing anything else on the site (v85).
--
-- There is still one room, and everybody in it hears everybody.
--
-- It also gives everybody a letterbox. That is not a room anybody can be in:
-- it is plumbing, a mailbox for the couple of messages that connect one
-- person's microphone to another's, which nobody sees. Until now those went
-- out to the whole room and each browser threw away the ones that were not
-- for it. Supabase counts every delivery against the project's realtime limit
-- (500 a second on this plan, shared with the party board and the bell), so
-- with thirty people in the town one introduction would cost thirty
-- deliveries. A letterbox is a private channel per person, named after the
-- room plus `:u:` plus their id: anybody in the town may post into it, and
-- only its owner may read from it. One message, one delivery.
--
-- What the room's channel and the letterboxes carry is still never stored.

/* ── who counts as somebody in the town ──────────────────────────────────── */

-- A member with a proved character, or an admin.
create or replace function public.town_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select public.verified_character()), false)
      or coalesce((select public.is_admin()), false);
$$;

revoke execute on function public.town_member() from public, anon;
grant execute on function public.town_member() to authenticated;

-- The room's name, now for any member of the town.
create or replace function public.town_topic(p_room text default 'main')
returns text
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (select public.town_member()) then
    return null;
  end if;
  return (select topic from public.town_rooms where id = p_room);
end;
$$;

revoke execute on function public.town_topic(text) from public, anon;
grant execute on function public.town_topic(text) to authenticated;

/* ── what each member may hear, and where they may speak ─────────────────── */

-- Hear: the room, and your own letterbox. Nobody else's.
create or replace function public.town_can_receive(p_topic text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.town_member())
     and exists (
       select 1 from public.town_rooms r
        where p_topic = r.topic
           or p_topic = r.topic || ':u:' || (select auth.uid())::text
     );
$$;

-- Speak: in the room, and into anybody's letterbox.
create or replace function public.town_can_send(p_topic text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.town_member())
     and exists (
       select 1 from public.town_rooms r
        where p_topic = r.topic
           or starts_with(p_topic, r.topic || ':u:')
     );
$$;

revoke execute on function public.town_can_receive(text) from public, anon;
revoke execute on function public.town_can_send(text) from public, anon;
grant execute on function public.town_can_receive(text) to authenticated;
grant execute on function public.town_can_send(text) to authenticated;

-- The admin-only policies of v101 give way to these.
drop policy if exists town_admins_receive on realtime.messages;
drop policy if exists town_admins_send on realtime.messages;

drop policy if exists town_members_receive on realtime.messages;
create policy town_members_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.town_can_receive((select realtime.topic())))
  );

drop policy if exists town_members_send on realtime.messages;
create policy town_members_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.town_can_send((select realtime.topic())))
  );

-- Only v101's policies used this.
drop function if exists public.is_town_topic(text);

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select policyname, cmd from pg_policies
--    where schemaname = 'realtime' and tablename = 'messages'
--      and policyname like 'town_%' order by 1;
--   -- town_members_receive SELECT, town_members_send INSERT
--
--   select has_function_privilege('anon', 'public.town_topic(text)', 'execute');
--   -- false
