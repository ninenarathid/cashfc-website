-- v74 — an admin can call a party a fail
--
-- Run this once in the Supabase SQL editor, after v73.
--
-- Three things v73 left.
--
-- The automatic fail came an hour after a party's time was up. It is a day:
-- long enough for a lead who finished late and went to bed to come back the
-- next evening and say it went well, before the board has already said it did
-- not. And one rule for both automatic routes — a party whose time ran out and
-- a party whose room emptied both close at once and become a fail a day after
-- closing, rather than the emptied one being judged on the spot.
--
-- Fail was only ever automatic, which is right for parties from now on and
-- leaves the old ones — every party from before outcomes were recorded — with
-- no way to be marked a fail at all. An admin filling in the history needs all
-- three words, so an admin may now say fail by hand. A lead still may not: for
-- a lead, fail is what happens when nobody says success, and a lead pressing it
-- on their own party would only ever be a misclick or a sulk.
--
-- And party_fail_expired could be called by anybody, signed in or not. v73
-- revoked it from anon and authenticated, but a function is executable by
-- PUBLIC unless that is revoked too, and both roles inherit from PUBLIC. It
-- only does what the schedule does anyway, so nothing could be done with it
-- that would not have happened within ten minutes — but a function nobody is
-- meant to call should not be callable.

/**
 * Test is an admin's word, in both directions. Fail by hand is an admin's too.
 *
 * "By hand" is told apart by who is running the statement. A request from the
 * site runs as the authenticated role; the two automatic writers — the
 * schedule, and the trigger that closes an emptied room — are SECURITY DEFINER
 * functions and run as their owner, which is not a role any client can be. The
 * trigger in particular runs while a member is signed in, so asking auth.uid()
 * would have refused the room closing itself as that member left.
 */
create or replace function public.party_outcome_guard()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if new.outcome is distinct from old.outcome
     and (new.outcome = 'test' or old.outcome = 'test')
     and not public.is_admin() then
    raise exception 'only an admin can mark a party as a test'
      using errcode = 'insufficient_privilege';
  end if;
  if new.outcome is distinct from old.outcome
     and new.outcome = 'fail'
     and current_user in ('authenticated', 'anon')
     and not public.is_admin() then
    raise exception 'a party becomes a fail by itself; only an admin can say so by hand'
      using errcode = 'insufficient_privilege';
  end if;
  if new.outcome is distinct from old.outcome then
    new.outcome_at := case when new.outcome is null then null else now() end;
  end if;
  return new;
end;
$fn$;


/**
 * Fail, a day after the party closed, where nobody has said otherwise.
 *
 * Closed is the earlier of the two ways a party finishes: the moment somebody
 * ended it — the lead, or the room emptying — or the end of its listed time.
 */
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
     and x.created_at >= public.party_outcomes_since()
     and least(
           coalesce(x.ended_at, 'infinity'::timestamptz),
           x.starts_at + make_interval(mins => coalesce(x.length_minutes, 0))
         ) + interval '1 day' < now();
$fn$;

revoke execute on function public.party_fail_expired() from public;
revoke execute on function public.party_fail_expired() from anon, authenticated;

/**
 * The last person out closes the party — and only closes it.
 *
 * As v73 left it, without writing the fail and without the age limit: the
 * emptied room waits its day like every other closed party, so a lead whose
 * last member dropped out after a good evening can still say so, and whether
 * it becomes a fail at all is the schedule's question, which does keep to it.
 */
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
