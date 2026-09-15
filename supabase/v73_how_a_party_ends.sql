-- v73 — how a party ends, and who may run one
--
-- Run this once in the Supabase SQL editor, after v72. It needs pg_cron, which
-- v51 already enabled for the hour-before reminder.
--
-- Four things, all about the end of a party and who holds the controls.
--
--   1. A party ends one of three ways, and says which: success (the lead or an
--      admin says so, with a group photo if they have one), fail (nobody said
--      so, and the time ran out — or the room emptied), or test (an admin
--      marking a listing that only ever existed to try the board out).
--   2. A party with nobody in it is over.
--   3. A party can be put up at most ten days ahead.
--   4. An admin can do everything a lead can, including answering an
--      invitation on the invited person's behalf.
--
-- Parties that exist before this runs keep no outcome at all. Which of those
-- went well is for a person to fill in afterwards, not for a rule to guess.

/* ── 1. the outcome ──────────────────────────────────────────────────────── */

alter table public.party_posts
  add column if not exists outcome text
    check (outcome in ('success', 'fail', 'test')),
  add column if not exists outcome_photo text,
  add column if not exists outcome_at timestamptz;

/**
 * When outcomes started being recorded.
 *
 * Written into the function body as a literal when this migration runs, so
 * "before this existed" is a fixed moment rather than whatever now() says the
 * next time it is asked. The two automatic rules below — time ran out, room
 * emptied — only ever apply to parties created after it, which is what keeps
 * the old ones empty for somebody to fill in by hand.
 */
do $do$
begin
  execute format($f$
    create or replace function public.party_outcomes_since()
    returns timestamptz
    language sql immutable
    as $b$ select %L::timestamptz $b$;
  $f$, now());
end;
$do$;

/**
 * Test is an admin's word, in both directions.
 *
 * A lead cannot call their own party a test — that would be a way to take a
 * failed evening off the record — and cannot take the word back off a party an
 * admin put it on. Everything else about the outcome is covered by the update
 * policy already: only the lead or an admin may write this row at all.
 *
 * Automatic writes come from functions that never set test, so they pass.
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
  if new.outcome is distinct from old.outcome then
    new.outcome_at := case when new.outcome is null then null else now() end;
  end if;
  return new;
end;
$fn$;

drop trigger if exists party_posts_outcome_guard on public.party_posts;
create trigger party_posts_outcome_guard
  before update of outcome on public.party_posts
  for each row execute function public.party_outcome_guard();

/**
 * Fail, once the time is up and nobody has said otherwise.
 *
 * An hour after the listed end rather than on it. That hour is the one the
 * board already calls "just ended", and it is when a lead gets home and marks
 * the evening a success — being marked a failure at 23:01 and then corrected
 * at 23:20 would put a notification-worthy change on a party that did fine.
 * A lead who is later still can mark it a success over the fail.
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
     and x.starts_at
         + make_interval(mins => coalesce(x.length_minutes, 0))
         + interval '1 hour' < now();
$fn$;

revoke all on function public.party_fail_expired() from anon, authenticated;

select cron.unschedule('party-fail')
 where exists (select 1 from cron.job where jobname = 'party-fail');
select cron.schedule('party-fail', '*/10 * * * *', 'select public.party_fail_expired()');

/* ── 2. closing when the room empties ────────────────────────────────────── */

/**
 * The last person out closes the party, as a fail.
 *
 * Only somebody who was in it: a declined request or a withdrawn invitation
 * was never in the room, so taking one away cannot empty it. Fired on a delete
 * and on confirmed_at or party_id changing, which are the three ways a row
 * stops counting.
 *
 * Every name inside the subquery is qualified. v65 was a policy whose
 * unqualified column quietly bound to the inner table and compared a row with
 * itself; this is the same shape of statement and gets the same care.
 *
 * SECURITY DEFINER because the person leaving is usually not the lead, and
 * ending a party is otherwise the lead's write.
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
     set ended_at = now(),
         outcome = coalesce(x.outcome, 'fail')
   where x.id = old.party_id
     and x.ended_at is null
     and x.deleted_at is null
     and x.created_at >= public.party_outcomes_since()
     and not exists (
       select 1 from public.party_members m
        where m.party_id = x.id
          and m.confirmed_at is not null
     );

  return null;
end;
$fn$;

drop trigger if exists party_members_close_when_empty on public.party_members;
create trigger party_members_close_when_empty
  after delete or update of confirmed_at, party_id on public.party_members
  for each row execute function public.party_close_when_empty();

-- The ones already empty: closed, and left without an outcome like every other
-- party from before today. Only those still to come or under way — one that
-- finished days ago is not on the board, and stamping it now would bring it
-- back as "just ended" for an hour.
update public.party_posts x
   set ended_at = now()
 where x.ended_at is null
   and x.deleted_at is null
   and x.starts_at > now() - interval '12 hours'
   and not exists (
     select 1 from public.party_members m
      where m.party_id = x.id
        and m.confirmed_at is not null
   );

/* ── 3. ten days ahead at most ───────────────────────────────────────────── */

/**
 * No start more than ten days from now.
 *
 * Checked when the start is written, not whenever the row is: a party already
 * further out before this rule existed can still be edited, closed or deleted
 * without being forced to move. An hour of slack, so a form filled in against
 * a clock that runs a little fast is not refused for a limit it kept to.
 */
create or replace function public.party_not_too_far()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'UPDATE' and new.starts_at is not distinct from old.starts_at then
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
  before insert or update of starts_at on public.party_posts
  for each row execute function public.party_not_too_far();

/* ── 4. an admin holds the lead's controls ───────────────────────────────── */

-- The lead's three writes on the roster — adding somebody, changing their
-- row, taking them out — each also allowed to an admin. Deleting and editing
-- the listing itself, and letting somebody in, already were (party_posts_edit,
-- party_retire, v67's party_let_in).

drop policy if exists party_members_write on public.party_members;
create policy party_members_write on public.party_members
  for insert to authenticated with check (
    exists (select 1 from public.party_posts x
            where x.id = party_members.party_id and x.owner = auth.uid())
    or party_members.character_id = (
         select p.character_id from public.profiles p
          where p.id = auth.uid() and p.character_verified_at is not null)
    or public.is_admin()
  );

drop policy if exists party_members_edit on public.party_members;
create policy party_members_edit on public.party_members
  for update to authenticated using (
    exists (select 1 from public.party_posts x
            where x.id = party_members.party_id and x.owner = auth.uid())
    or party_members.character_id = (
         select p.character_id from public.profiles p where p.id = auth.uid())
    or public.is_admin()
  );

drop policy if exists party_members_leave on public.party_members;
create policy party_members_leave on public.party_members
  for delete to authenticated using (
    exists (select 1 from public.party_posts x
            where x.id = party_members.party_id and x.owner = auth.uid())
    or party_members.character_id = (
         select p.character_id from public.profiles p where p.id = auth.uid())
    or public.is_admin()
  );

/**
 * Seating somebody already in the party: themselves, the lead, or an admin.
 *
 * As v62 left it, with the admin added.
 */
create or replace function public.party_take_seat(p_member bigint, p_seat text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.party_members;
begin
  select * into m from public.party_members where id = p_member;
  if m.id is null then return 'gone'; end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.character_id is not distinct from m.character_id
       and p.character_verified_at is not null
  ) and not exists (
    -- The lead may seat somebody who is already in the party, which is how a
    -- party sorts itself out five minutes before it starts.
    select 1 from public.party_posts x
     where x.id = m.party_id and x.owner = auth.uid()
  ) and not public.is_admin() then
    raise exception 'that seat is not yours to take';
  end if;

  begin
    if not public.party_make_room(m.party_id, p_seat, p_member) then
      return 'taken';
    end if;
    update public.party_members
       set seat = p_seat, flex = null,
           confirmed_at = coalesce(confirmed_at, now())
     where id = p_member;
    return 'seat';
  exception when unique_violation then
    return 'taken';
  end;
end;
$fn$;

grant execute on function public.party_take_seat(bigint, text) to authenticated;

/**
 * Saying yes to an invitation: the person invited, or an admin for them.
 *
 * As v62 left it, with the admin added. An admin answering is the other half
 * of the lead's controls — the lead's side is letting somebody in, which
 * party_let_in already allows — and it is for the evening somebody said yes
 * in Discord and never pressed the button.
 */
create or replace function public.party_accept(p_member bigint)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.party_members;
  p public.party_posts;
  want text;
  room integer;
  taken integer;
begin
  select * into m from public.party_members where id = p_member;
  if m.id is null then return 'gone'; end if;

  if not exists (
    select 1 from public.profiles f
     where f.id = auth.uid()
       and f.character_id is not distinct from m.character_id
       and f.character_verified_at is not null
  ) and not public.is_admin() then
    raise exception 'that invitation is not yours';
  end if;

  -- Answering twice is a button that has not redrawn yet, not a thing to fail.
  if m.confirmed_at is not null then return 'seat'; end if;

  select * into p from public.party_posts where id = m.party_id;
  if p.id is null then return 'gone'; end if;

  room := case p.shape
            when 'light' then 4
            when 'four' then 4
            when 'full' then 8
            when 'eight' then 8
            when 'alliance' then 24
            else 0
          end - coalesce(array_length(p.closed, 1), 0);

  if room > 0 then
    select count(*) into taken
      from public.party_members x
     where x.party_id = m.party_id and x.confirmed_at is not null;
    if taken >= room then
      return 'full';
    end if;
  end if;

  want := m.flex -> 'seats' ->> 0;

  if want is not null then
    begin
      if public.party_make_room(m.party_id, want, p_member) then
        update public.party_members
           set seat = want, flex = null, confirmed_at = now()
         where id = p_member;
        return 'seat';
      end if;
    exception when unique_violation then
      -- Somebody else sat down first, between the read and the write.
      null;
    end;
  end if;

  update public.party_members set confirmed_at = now() where id = p_member;
  return 'flex';
end;
$fn$;

grant execute on function public.party_accept(bigint) to authenticated;
