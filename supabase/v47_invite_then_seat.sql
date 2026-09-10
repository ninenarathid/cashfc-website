-- v47 — an invitation is not a reservation
--
-- Run this once in the Supabase SQL editor, after v46.
--
-- Inviting somebody wrote them into the seat, unanswered. One seat holds one
-- person — party_members_one_per_seat, from v39, and rightly so — which meant a
-- lead who wanted three people asked for D4 could ask exactly one of them, and
-- then wait. Ask the wrong one and the evening is spent waiting on somebody who
-- is asleep, while two people who would have said yes were never asked.
--
-- So an invitation is now somebody in the party who has not sat down: no seat,
-- and a flex naming the seat they were suggested for. Three of those can exist
-- for D4 at once. The seat grid already draws people hovering over the seats
-- they could take — that machinery is from v39 too — so an invitation shows up
-- exactly where it belongs without anything new being drawn.
--
-- The seat is claimed when somebody accepts, and the index decides who got it.
-- Whoever loses that race is in the party anyway, without a seat, and is told
-- what happened rather than being bounced.

/* ── accepting ──────────────────────────────────────────────────────────── */

/**
 * Take the seat you were suggested for, or come in without one.
 *
 * One statement so two people accepting the same seat in the same second
 * cannot both have it. The index is what actually decides; this catches the
 * loser's error and puts them in the party as a floater instead of failing
 * their acceptance, because "somebody beat you to D4" is not a reason to keep
 * a willing player out of an evening.
 *
 * Returns 'seat' if they got the one they were asked about, 'flex' if it had
 * gone, and 'gone' if the invitation itself has been withdrawn.
 */
create or replace function public.party_accept(p_member bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.party_members;
  want text;
begin
  select * into m from public.party_members where id = p_member;
  if m.id is null then return 'gone'; end if;

  -- Only the person invited may accept it. A security definer function sees
  -- past every policy, so the check the policies would have made is made here.
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.character_id is not distinct from m.character_id
       and p.character_verified_at is not null
  ) then
    raise exception 'that invitation is not yours';
  end if;

  -- The seat they were suggested for, which lives in the flex because that is
  -- what "I could take D4" already means everywhere else on this board.
  want := m.flex -> 'seats' ->> 0;

  if want is not null then
    begin
      update public.party_members
         set seat = want, flex = null, confirmed_at = now()
       where id = p_member;
      return 'seat';
    exception when unique_violation then
      -- Somebody else sat down first, between the read and the write.
      null;
    end;
  end if;

  update public.party_members set confirmed_at = now() where id = p_member;
  return 'flex';
end;
$$;

grant execute on function public.party_accept(bigint) to authenticated;

/**
 * Take a free seat once you are already in.
 *
 * The other half of the same idea: you say yes first and choose where you are
 * standing afterwards, which is the order people actually decide in. Same race,
 * same index, same answer — 'seat' or 'taken'.
 */
create or replace function public.party_take_seat(p_member bigint, p_seat text)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
  ) then
    raise exception 'that seat is not yours to take';
  end if;

  begin
    update public.party_members
       set seat = p_seat, flex = null,
           confirmed_at = coalesce(confirmed_at, now())
     where id = p_member;
    return 'seat';
  exception when unique_violation then
    return 'taken';
  end;
end;
$$;

grant execute on function public.party_take_seat(bigint, text) to authenticated;

/* ── telling the others ─────────────────────────────────────────────────── */

/**
 * The seat you were asked about has gone.
 *
 * Only to the people who were still deciding, and only about the seat they
 * were actually asked for. They are still invited and the party still wants
 * them — the line says which seat went so that saying yes is an informed yes
 * rather than a surprise on the way in.
 */
create or replace function public.notify_seat_taken()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only when a seat is newly held by somebody.
  if new.seat is null or new.seat is not distinct from old.seat then
    return null;
  end if;

  insert into public.notifications
    (recipient, kind, actor, actor_name, party_id, body)
  select p.id, 'party_seat_gone', auth.uid(), public.actor_name(),
         new.party_id, new.seat
    from public.party_members m
    join public.profiles p
      on p.character_id = m.character_id
     and p.character_verified_at is not null
   where m.party_id = new.party_id
     and m.id <> new.id
     and m.seat is null
     and m.confirmed_at is null
     and m.flex -> 'seats' ->> 0 = new.seat
     and p.id is distinct from auth.uid();
  return null;
end;
$$;

drop trigger if exists party_members_seat_taken on public.party_members;
create trigger party_members_seat_taken
  after update of seat on public.party_members
  for each row execute function public.notify_seat_taken();
