-- v45 — a party's conversation reaches the party
--
-- Run this once in the Supabase SQL editor, after v44.
--
-- Replies under a party were visible only to whoever happened to open it. So
-- "can I come at half past?" sat there unread, and the person who wrote it went
-- and asked in Discord — which is the scrollback the board exists to replace,
-- reappearing underneath the thing that replaced it.
--
-- Everybody in the party is told: seated, floating, invited and not yet
-- answered, waiting to be let in, and whoever put it up. Somebody who has not
-- confirmed their seat is exactly the person a message about the evening is for.
--
-- Not the author, obviously.
--
-- One notice per party until it is read. A party of eight having a twenty
-- message conversation would otherwise be a hundred and forty notifications
-- about a thread that says one thing: there is talk on this party. The next one
-- arrives once they have been and looked.

create or replace function public.notify_party_talk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
