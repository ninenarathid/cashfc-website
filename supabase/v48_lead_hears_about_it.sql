-- v48 — the lead hears their own party fill and empty
--
-- Run this once in the Supabase SQL editor, after v47.
--
-- The board already tells a lead when somebody asks to join, and tells the
-- person invited that they have been invited. Between those two it went quiet.
-- A lead who asked four people about D4 and went to make dinner came back to a
-- party that had changed twice with nothing anywhere to say so, and had to
-- count the seats to find out. Worse the other way: somebody dropping out at
-- ten to eight is the one thing a lead has to act on that night, and it was
-- the one thing nothing told them.
--
-- Two more kinds, both to the owner and to nobody else:
--
--   party_in    somebody said yes, or took a seat they had not had
--   party_out   somebody left, turned it down, or withdrew their request
--
-- Never to themselves. A lead who lets somebody in, or takes somebody out, did
-- it on purpose a second ago and does not need telling.
--
-- The seat rides along in body, where there is one. "Rothe Happer left" and
-- "Rothe Happer left H2" are different amounts of bad news, and which it was
-- decides whether the lead has to do anything before eight.

/* ── somebody said yes ───────────────────────────────────────────────────── */

/**
 * The moment an unanswered row becomes an answered one.
 *
 * On the column rather than on the row, so editing a job or a flex does not
 * announce itself: this is about the one transition that changes who is in the
 * party, and confirmed_at is where that is written.
 */
create or replace function public.notify_party_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lead uuid;
begin
  if new.confirmed_at is null or old.confirmed_at is not null then
    return new;
  end if;

  select owner into lead
    from public.party_posts
   where id = new.party_id and deleted_at is null;

  -- No party any more, or the lead did this themselves — letting somebody in
  -- is the lead's own click, and a bell for it is a bell for your own hand.
  if lead is null or lead = auth.uid() then
    return new;
  end if;

  insert into public.notifications (recipient, kind, actor, actor_name, party_id, body)
  values (lead, 'party_in', auth.uid(), new.name, new.party_id, new.seat);
  return new;
end;
$$;

/* ── somebody left ───────────────────────────────────────────────────────── */

/**
 * A seat given back.
 *
 * Turning an invitation down, withdrawing a request and leaving a party you
 * were in are one row deleted — v39 made a dropped seat a real delete rather
 * than a tombstone — so they are one notification. Which of the three it was
 * is not worth three kinds: the lead's next move is the same either way.
 *
 * A party being deleted takes its members with it. That is a cascade, the post
 * is gone by the time this runs, and the select finds nothing — so nobody is
 * told twenty times that their own deleted party has emptied.
 */
create or replace function public.notify_party_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lead uuid;
begin
  select owner into lead
    from public.party_posts
   where id = old.party_id and deleted_at is null;

  if lead is null or lead = auth.uid() then
    return old;
  end if;

  insert into public.notifications (recipient, kind, actor, actor_name, party_id, body)
  values (lead, 'party_out', auth.uid(), old.name, old.party_id, old.seat);
  return old;
end;
$$;

/* ── hooked up ───────────────────────────────────────────────────────────── */

drop trigger if exists party_members_in on public.party_members;
create trigger party_members_in
  after update of confirmed_at on public.party_members
  for each row execute function public.notify_party_in();

drop trigger if exists party_members_out on public.party_members;
create trigger party_members_out
  after delete on public.party_members
  for each row execute function public.notify_party_out();
