-- v76 — a static is not an evening
--
-- Run this once in the Supabase SQL editor, after v75.
--
-- Party 83 was never a party. Garnet Rebel was looking for one more person to
-- join a group that plays Dancing Mad together, the same eight, every week,
-- until it is cleared — and the board read that as an evening seven weeks out
-- with nobody in it, refused the date the next time anybody touched it, and
-- then closed it because the room was empty. Every one of those rules was
-- right about a party and wrong about a static.
--
-- So a listing can say it is a static, and the rules that are about a single
-- evening stop applying to it:
--
--   * no ten-day limit on its start: a static forming for next month is
--     exactly what somebody puts up now
--   * no automatic fail a day after its first session: it runs until it
--     clears, and the lead or an admin closes it
--   * not closed when nobody on the board is in it: a static's roster is the
--     group, most of whom are not on this site, and the listing is how it
--     finds the one it is missing
--
-- Savage and Ultimate only, because those are the fights a group progresses
-- together; the check below holds that where the form already does.

alter table public.party_posts
  add column if not exists is_static boolean not null default false;

alter table public.party_posts
  drop constraint if exists party_posts_static_fights;
alter table public.party_posts
  add constraint party_posts_static_fights check (
    not is_static
    or content_key like 'sav:%'
    or content_key like 'ult:%'
  );

create index if not exists party_posts_statics
  on public.party_posts (created_at)
  where is_static and deleted_at is null and ended_at is null;

/* ── the ten days ────────────────────────────────────────────────────────── */

/**
 * No start more than ten days from now — for a party.
 *
 * As v73 left it, skipping statics, and now also checked when a listing stops
 * being one: a static set for next month, turned back into an ordinary party,
 * would otherwise keep a date no party could have been given.
 */
create or replace function public.party_not_too_far()
returns trigger
language plpgsql
as $fn$
begin
  if new.is_static then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.starts_at is not distinct from old.starts_at
     and new.is_static is not distinct from old.is_static then
    return new;
  end if;
  if new.starts_at > now() + interval '10 days' + interval '1 hour' then
    raise exception 'A party can be put up at most 10 days ahead'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$fn$;

drop trigger if exists party_posts_not_too_far on public.party_posts;
create trigger party_posts_not_too_far
  before insert or update of starts_at, is_static on public.party_posts
  for each row execute function public.party_not_too_far();

/* ── the automatic fail ──────────────────────────────────────────────────── */

/** As v74 left it, not for statics. */
create or replace function public.party_fail_expired()
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.party_posts x
     set outcome = 'fail'
   where x.outcome is null
     and x.deleted_at is null
     and not x.is_static
     and x.created_at >= public.party_outcomes_since()
     and least(
           coalesce(x.ended_at, 'infinity'::timestamptz),
           x.starts_at + make_interval(mins => coalesce(x.length_minutes, 0))
         ) + interval '1 day' < now();
$fn$;

revoke execute on function public.party_fail_expired() from public;
revoke execute on function public.party_fail_expired() from anon, authenticated;

/* ── the empty room ──────────────────────────────────────────────────────── */

/** As v74 left it, not for statics. */
create or replace function public.party_close_when_empty()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if old.confirmed_at is null then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and new.confirmed_at is not null
     and new.party_id = old.party_id then
    return null;
  end if;

  update public.party_posts x
     set ended_at = now()
   where x.id = old.party_id
     and x.ended_at is null
     and x.deleted_at is null
     and not x.is_static
     -- Any party, old or new: closing an emptied room is not a verdict, so it
     -- does not wait for outcomes to have started being recorded.
     and not exists (
       select 1 from public.party_members m
        where m.party_id = x.id
          and m.confirmed_at is not null
     );

  return null;
end;
$fn$;

/* ── party 83 ────────────────────────────────────────────────────────────── */

-- What it always was. Reopened as well: it was closed by v73's sweep of empty
-- rooms, not by anybody, and that rule no longer applies to it.
update public.party_posts
   set is_static = true,
       ended_at = null
 where id = 83
   and content_key like 'ult:%'
   and outcome is null;
