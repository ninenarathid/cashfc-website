-- v56 — a party ends when the lead says it ends
--
-- Run this once in the Supabase SQL editor, after v55.
--
-- Until now a party was over when the arithmetic said so: start time plus
-- however long somebody guessed it would take. That guess is the one number on
-- a listing nobody can be expected to get right — a farm party billed as five
-- runs finishes in three, a prog night gives up at eleven, and a party that was
-- called off before it started sat on the board all evening saying "in
-- progress" to everybody scrolling past.
--
-- So the lead can say. One column: when it actually finished. Null means it is
-- still running on its estimate, which is what every party ever written is.
--
-- Not a delete. The party happened, or was called off, and either way it keeps
-- its conversation and the people who were in it — the board simply stops
-- offering it as something to join.

alter table public.party_posts
  add column if not exists ended_at timestamptz;

comment on column public.party_posts.ended_at is
  'When the lead declared the party over, early or late. Null means it ends on '
  'its own estimate: starts_at + length_minutes. Set by the owner; the read '
  'policy is untouched, so an ended party stays readable.';

/* ── and it stops being called ───────────────────────────────────────────── */

-- The hour-before reminder wakes everybody in a party that is about to start.
-- A party called off on Tuesday for a Friday night would still have gone out
-- on the Friday: the job only asked whether the start time was coming, and for
-- a party that has been ended the answer no longer matters.
create or replace function public.party_remind()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  with due as (
    update public.party_posts p
       set reminded_at = now()
     where p.deleted_at is null
       and p.ended_at is null
       and p.reminded_at is null
       and p.starts_at > now()
       and p.starts_at <= now() + interval '65 minutes'
    returning p.id
  ),
  told as (
    -- No actor: nothing was done to anybody and nobody did it, the clock came
    -- round. The column is nullable and the event notifications already leave
    -- it empty for the same reason.
    insert into public.notifications (recipient, kind, party_id)
    select pr.id, 'party_soon', d.id
      from due d
      join public.party_members m on m.party_id = d.id
      -- The account behind the character, which is who a notification reaches.
      join public.profiles pr on pr.character_id = m.character_id
     group by pr.id, d.id
    returning 1
  )
  select count(*) into n from told;
  return n;
end;
$$;

revoke all on function public.party_remind() from anon, authenticated;
