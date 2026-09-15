-- v78 — one draw notice a day
--
-- Run this once in the Supabase SQL editor. It does not depend on v77.
--
-- The Evercold notice ("today's entry is yours — N") is written by the page,
-- and the page checks for today's notice before writing one. Several potatoes
-- given inside a second — sent back down the bell — each checked before any of
-- them had written, and each wrote: nine extra notices in the first week, to
-- three members, every one with the right number. The page now takes its calls
-- one at a time. This is for the race a page cannot see, two tabs, and it makes
-- one a day the database's rule rather than the page's good intention.
--
-- The index cannot be built while the extra copies are there, so they go first.
--
--   1. Run the select in section 1 on its own, and read what it lists: every
--      notice on a day that already had an earlier one. On 2026-09-16 that was
--      nine rows — #2444, #3041, #3042, #3043, #3224, #3225, #3490, #3847 and
--      #3848 — each a copy, same member, same day, same number.
--   2. Then run section 2. It deletes exactly what section 1 listed, keeping
--      each day's first notice, and builds the index, in one transaction.

/* ── 1. what will go ─────────────────────────────────────────────────────── */

select n.id, n.recipient, n.created_at, n.body
  from public.notifications n
 where n.kind = 'evercold'
   and exists (
     select 1
       from public.notifications earlier
      where earlier.kind = 'evercold'
        and earlier.recipient = n.recipient
        and (earlier.created_at at time zone 'Asia/Bangkok')::date
          = (n.created_at at time zone 'Asia/Bangkok')::date
        and earlier.id < n.id)
 order by n.id;

/* ── 2. remove them, and keep it so ─────────────────────────────────────── */

/*
 * One transaction: if the index cannot be built, the delete is undone with it,
 * and running this section again tries both again.
 */
begin;

delete from public.notifications n
 where n.kind = 'evercold'
   and exists (
     select 1
       from public.notifications earlier
      where earlier.kind = 'evercold'
        and earlier.recipient = n.recipient
        and (earlier.created_at at time zone 'Asia/Bangkok')::date
          = (n.created_at at time zone 'Asia/Bangkok')::date
        and earlier.id < n.id);

/*
 * A Bangkok day, because that is the day the draw counts and the day the notice
 * is about. AT TIME ZONE with a named zone gives the index a fixed answer; a
 * plain ::date of a timestamptz depends on the session's zone, and an index may
 * not.
 *
 * Only the entry notice. A correction (evercold_fix) is a different sentence
 * and not bound by it.
 */
create unique index if not exists notifications_one_evercold_a_day
  on public.notifications (recipient, ((created_at at time zone 'Asia/Bangkok')::date))
  where kind = 'evercold';

commit;
