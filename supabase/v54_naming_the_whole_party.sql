-- v54 — naming the whole party
--
-- Run this once in the Supabase SQL editor, after v53.
--
-- "@everyone we are starting in ten minutes" is the message a lead actually
-- needs to send, and naming eight people one at a time is not it. Naming
-- somebody already rings through — v53 — and this is the same thing addressed
-- to the room.
--
-- A column rather than a sentinel in the mentions array. That array is
-- character ids, and there is no character whose id means "all of them";
-- writing a nought in there would be a number that looks like a person until
-- somebody looks it up.
--
-- Everybody in the party, and only them. This does not reach the FC — there is
-- no party-wide shout on this board that leaves the party, and a notification
-- that could be sent to five hundred people by typing two words is a
-- notification somebody eventually sends to five hundred people.

alter table public.party_comments
  add column if not exists mentions_all boolean not null default false;

comment on column public.party_comments.mentions_all is
  'The message named the whole party rather than particular people. Everybody '
  'in it is told, under the mention rule rather than the quieter one.';

/* ── who hears about a message ───────────────────────────────────────────── */

/**
 * One notification each, and the specific one wins.
 *
 * Three groups now, in order of how directly the message is addressed to them:
 * people named by name, everybody if the message named the room, and then the
 * rest of the party under the quiet rule — one unread "somebody spoke" per
 * party at a time. Each person falls in the first of those that applies, so
 * nobody hears about one line twice.
 *
 * Naming the room is not held to the quiet rule either. It is the message a
 * lead sends when the evening is starting, and swallowing it because somebody
 * has an unread line from an hour ago is swallowing the one that mattered.
 */
create or replace function public.notify_party_talk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  named uuid[];
begin
  if new.mentions_all then
    -- The room. Everybody in it however they got there, and whoever put it up.
    select coalesce(array_agg(distinct w.pid), '{}')
      into named
      from (
        select p.id as pid
          from public.party_members m
          join public.profiles p
            on p.character_id = m.character_id
           and p.character_verified_at is not null
         where m.party_id = new.party_id
        union
        select x.owner from public.party_posts x where x.id = new.party_id
      ) w
     where w.pid is not null
       and w.pid is distinct from new.author;
  else
    -- The accounts behind the characters named. Verified only, which is the
    -- same rule every other notification on this board follows: an unverified
    -- claim to a name is somebody's typing.
    select coalesce(array_agg(distinct p.id), '{}')
      into named
      from public.profiles p
     where p.character_id = any (coalesce(new.mentions, '{}'::bigint[]))
       and p.character_verified_at is not null
       and p.id is distinct from new.author;
  end if;

  if array_length(named, 1) is not null then
    insert into public.notifications
      (recipient, kind, actor, actor_name, party_id, body)
    select n, 'party_mention', new.author, public.actor_name(),
           new.party_id, left(new.body, 140)
      from unnest(named) as n;
  end if;

  insert into public.notifications
    (recipient, kind, actor, actor_name, party_id, body)
  select distinct w.pid, 'party_talk', new.author, public.actor_name(),
         new.party_id, left(new.body, 140)
  from (
    -- Everybody in it, however they got there.
    select p.id as pid
      from public.party_members m
      join public.profiles p
        on p.character_id = m.character_id
       and p.character_verified_at is not null
     where m.party_id = new.party_id
    union
    -- And whoever put it up, who may not have taken a seat in their own party.
    select x.owner from public.party_posts x where x.id = new.party_id
  ) w
  where w.pid is not null
    and w.pid is distinct from new.author
    -- Named already, by this very message.
    and not (w.pid = any (named))
    and not exists (
      select 1 from public.notifications n
       where n.recipient = w.pid
         and n.kind = 'party_talk'
         and n.party_id = new.party_id
         and n.read_at is null
         and n.cleared_at is null
    );
  return null;
end;
$$;

drop trigger if exists party_comments_notify on public.party_comments;
create trigger party_comments_notify
  after insert on public.party_comments
  for each row execute function public.notify_party_talk();
