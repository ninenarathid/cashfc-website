-- v51 — everybody in the party is told an hour before
--
-- Run this once in the Supabase SQL editor, after v50.
--
-- The board already knows what "soon" means — it is the hour before a party
-- starts, and the row turns amber and says so. But a board only tells somebody
-- who is looking at it, and the whole point of arranging a raid four days
-- ahead is that nobody is looking at it on the night. So the hour the row
-- starts shouting is the hour everybody in the party gets told.
--
-- To everybody in it, seated or not, answered or not. A floater who never
-- picked a seat is coming; somebody still deciding on an invitation is exactly
-- who an hour's warning is for. The lead is in it too — they are in their own
-- party, and a lead who forgot is the worst version of this.
--
-- Once. A column on the listing rather than a row per person: the question is
-- "has this party been called yet", and that is one fact about the party.
-- Moving the start time clears it, so a party pushed from eight to ten is
-- called again at nine — which is the case a reminder is most needed for and
-- the one a "notified" flag would have got wrong.

alter table public.party_posts
  add column if not exists reminded_at timestamptz;

comment on column public.party_posts.reminded_at is
  'When the hour-before reminder went out. Cleared by the trigger below when '
  'the start time moves, so a rescheduled party is called again.';

/* ── a party that moves has not been called ──────────────────────────────── */

create or replace function public.party_reschedule() returns trigger
language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists party_posts_reschedule on public.party_posts;
create trigger party_posts_reschedule before update on public.party_posts
  for each row execute function public.party_reschedule();

/* ── the call itself ─────────────────────────────────────────────────────── */

/**
 * Tell everybody in every party that is about to start.
 *
 * Sixty-five minutes rather than sixty, so a job that runs every ten cannot
 * miss the window between two ticks. Claiming the row first — the update is
 * the lock — means two overlapping runs cannot both send it: the second finds
 * nothing left to claim.
 *
 * Only parties that have not started. A job that was asleep for three hours
 * should not wake up and announce four evenings that are already over.
 *
 * Returns how many were called, which is what a cron job's history is worth
 * reading for.
 */
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
      -- Somebody in a party without a login on this site simply is not told
      -- here, which is what "outside the FC" has always meant on this board.
      join public.profiles pr on pr.character_id = m.character_id
     group by pr.id, d.id
    returning 1
  )
  select count(*) into n from told;
  return n;
end;
$$;

revoke all on function public.party_remind() from anon, authenticated;

/* ── every ten minutes ───────────────────────────────────────────────────── */

-- pg_cron is an extension rather than a given. If this create fails, enable it
-- once from Database → Extensions in the dashboard and run the file again.
create extension if not exists pg_cron with schema extensions;

-- Unscheduled first so re-running this file does not stack a second copy.
select cron.unschedule('party-remind')
 where exists (select 1 from cron.job where jobname = 'party-remind');

select cron.schedule('party-remind', '*/10 * * * *', 'select public.party_remind()');
