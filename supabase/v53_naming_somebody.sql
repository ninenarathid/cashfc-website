-- v53 — naming somebody in a message, and replying to one
--
-- Run this once in the Supabase SQL editor, after v52.
--
-- Two things a conversation under a party turns out to need once more than
-- three people are in it.
--
-- Naming somebody. "@Aqua can you bring food" is addressed to one person in a
-- thread everybody can see, and until now the only thing that reached them was
-- the ordinary "somebody spoke in a party you are in" — which is the same
-- notification they get for every other line, and says nothing about being
-- asked a question.
--
-- Replying to a particular line. Three exchanges deep, "no, the other one" is
-- unreadable without knowing which message it answers.
--
-- The one rule worth stating: somebody named in a party they are already in
-- gets one notification, not two. Being named is the more specific fact, so it
-- wins, and the general one skips anybody the same message named.

alter table public.party_comments
  add column if not exists mentions bigint[],
  add column if not exists reply_to bigint references public.party_comments(id)
    on delete set null;

comment on column public.party_comments.mentions is
  'Character ids named in the body with @. Recorded when the message is sent '
  'rather than parsed here, because which names are real is a question about '
  'the roster and the roster lives in the application.';

comment on column public.party_comments.reply_to is
  'The message this one answers. Null on delete rather than cascading: a reply '
  'to something since deleted is still a reply, and the tombstone it points at '
  'is what keeps the thread readable.';

/* ── who hears about a message ───────────────────────────────────────────── */

/**
 * One notification each, and the specific one wins.
 *
 * Mentions first and unconditionally: being named is a question addressed to
 * you, and "you already have an unread one from this party" is not a reason to
 * swallow it — that rule exists so a chatty evening does not ring twenty times,
 * and being asked something directly is exactly the case it should not apply
 * to. Somebody named who is not in the party is told as well; that is what
 * naming them is for.
 *
 * Then everybody else in the party, under the rule that was already here: one
 * unread "somebody spoke" per party at a time. Minus whoever this same message
 * named, so nobody gets told twice about one line.
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
  -- The accounts behind the characters named. Verified only, which is the same
  -- rule every other notification on this board follows: an unverified claim to
  -- a name is somebody's typing.
  select coalesce(array_agg(distinct p.id), '{}')
    into named
    from public.profiles p
   where p.character_id = any (coalesce(new.mentions, '{}'::bigint[]))
     and p.character_verified_at is not null
     and p.id is distinct from new.author;

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

-- The trigger itself is unchanged and already points at this function; it is
-- restated so running this file on a database that somehow lacks it is enough.
drop trigger if exists party_comments_notify on public.party_comments;
create trigger party_comments_notify
  after insert on public.party_comments
  for each row execute function public.notify_party_talk();
