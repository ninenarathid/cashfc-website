-- v101 — a town for the admins
--
-- Run this once in the Supabase SQL editor. Running it again is safe. It needs
-- only is_admin() (schema.sql).
--
-- Cash Town, the town a member proposed in feedback #12, starts as a prototype
-- for the admins: walk around, turn the microphone on, talk to whoever is
-- close (/town, linked from /admin). Its live state travels over Supabase
-- Realtime and is never stored: who is in the room and where they are walking
-- (presence), and the messages that introduce two microphones to each other
-- (broadcast).
--
-- Those introductions say more than they look like they do. Connecting two
-- browsers for voice swaps their network addresses, so the room is closed to
-- everybody but the admins, twice over:
--
--  · its channel is private, and the policies below let only admins receive
--    or send on it;
--  · its name is a secret that only admins are told. Supabase only promises
--    that private channels are enforced when public access is switched off
--    for the whole project, and this project cannot switch it off: the party
--    board and the bell use public channels. A name nobody else knows is a
--    room nobody else can find.
--
-- To let members in later, change who town_topic() answers and who the two
-- policies admit. To lock out whoever might have learned the name, give the
-- room a new one:
--   update public.town_rooms set topic = 'town:' || replace(gen_random_uuid()::text, '-', '') where id = 'main';

/* ── the room's secret name ──────────────────────────────────────────────── */

create table if not exists public.town_rooms (
  id         text primary key,
  topic      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.town_rooms enable row level security;
-- No policies on purpose: nobody reads this table directly. The functions
-- below are the only way in.
revoke all on public.town_rooms from anon, authenticated;

insert into public.town_rooms (id, topic)
values ('main', 'town:' || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

/*
 * The room's name, for an admin; nothing for anybody else. security definer
 * because nobody can read town_rooms; the check is the admin flag itself.
 */
create or replace function public.town_topic(p_room text default 'main')
returns text
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce((select public.is_admin()), false) then
    return null;
  end if;
  return (select topic from public.town_rooms where id = p_room);
end;
$$;

revoke execute on function public.town_topic(text) from public, anon;
grant execute on function public.town_topic(text) to authenticated;

/* Whether a Realtime topic is one of the town's rooms. For the policies. */
create or replace function public.is_town_topic(p_topic text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.town_rooms where topic = p_topic);
$$;

revoke execute on function public.is_town_topic(text) from public, anon;
grant execute on function public.is_town_topic(text) to authenticated;

/* ── who may be in the room ──────────────────────────────────────────────── */

-- Realtime asks these when somebody joins a private channel: select to
-- receive, insert to send, for broadcast and for presence. Only private
-- channels consult them, so the site's public channels are untouched.
drop policy if exists town_admins_receive on realtime.messages;
create policy town_admins_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.is_town_topic((select realtime.topic())))
    and (select public.is_admin())
  );

drop policy if exists town_admins_send on realtime.messages;
create policy town_admins_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select public.is_town_topic((select realtime.topic())))
    and (select public.is_admin())
  );

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select id, left(topic, 5) as starts from public.town_rooms;
--   -- main | town:          (the rest of the name is the secret)
--
--   select policyname, cmd from pg_policies
--    where schemaname = 'realtime' and tablename = 'messages'
--      and policyname like 'town_%' order by 1;
--   -- town_admins_receive SELECT, town_admins_send INSERT
--
--   select has_function_privilege('anon', 'public.town_topic(text)', 'execute');
--   -- false
