-- v95 — the lead moves people, and the people moved are told
--
-- Run this once in the Supabase SQL editor, after v94.
--
-- A party sorts itself out in the last ten minutes: "you go MT, I'll take ST",
-- the healers swap sides, the one flexing goes in D3 because that is what is
-- left. The board could draw every one of those arrangements and let nobody
-- make them but the person sitting in the seat — so the lead said it in
-- Discord, waited for four people to each press their own chair, and the board
-- was wrong until the last of them had.
--
-- So the lead moves people. Into a free seat; into a taken one, which swaps
-- the two; or out of a seat into Flex. Nobody is asked: the seats are the
-- lead's to arrange, the same as they are in the game. What the person moved
-- is owed is to know about it, so they are told — a notification with nothing
-- on it to answer.
--
-- Two pieces:
--
--   party_move            the move itself, in one statement, so a swap cannot
--                         be left half done and two moves at once cannot put
--                         two people in one chair
--   notify_party_moved    the notification, from a trigger on the seat column:
--                         whichever function changed somebody else's chair,
--                         the person in it hears about it

/* ── the move ───────────────────────────────────────────────────────────── */

/**
 * Move somebody who is in the party to another seat, or to Flex.
 *
 * p_seat is the seat, or null for Flex. p_with is who the lead saw holding it
 * — null for a seat they saw empty — so a board that is a minute out of date
 * cannot swap somebody with a person the lead never meant. If the seat has
 * changed hands since, nothing moves and the answer is 'changed'.
 *
 * The jobs go with them unless the caller says otherwise. Which job can play
 * which seat is a fact about the game, and those live beside the job icons in
 * the front end rather than in here (see openTo in lib/party.ts) — so the page
 * decides whether a Paladin moved to H1 is still a Paladin, and says so with
 * the two flags. A job that cannot play the new seat is cleared, and its owner
 * picks again from their own seat.
 *
 * Returns
 *   'moved'    into a free seat, or to Flex
 *   'swapped'  into a taken seat; whoever held it now has the mover's place
 *   'same'     already there
 *   'changed'  the seat is not as the lead last saw it
 *   'gone'     the row, or the party, is not there any more
 */
create or replace function public.party_move(
  p_member bigint,
  p_seat text,
  p_with bigint default null,
  p_keep_job boolean default true,
  p_keep_their_job boolean default true
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m     public.party_members;
  o     public.party_members;
  p     public.party_posts;
  seats text[];
  was   text;
begin
  select * into m from public.party_members where id = p_member for update;
  if m.id is null then return 'gone'; end if;

  select * into p from public.party_posts
   where id = m.party_id and deleted_at is null;
  if p.id is null then return 'gone'; end if;

  -- A security definer function sees past every policy, so the questions the
  -- policies would have asked are asked plainly: the party's lead, holding the
  -- proved character v85 asks of anybody who writes, or an admin standing in
  -- for a lead — the same pair party_let_in lets answer a request.
  if not ((p.owner = auth.uid() and public.verified_character())
          or public.is_admin()) then
    raise exception 'only the lead can move people in a party';
  end if;
  if p.ended_at is not null then
    raise exception 'that party is over';
  end if;
  -- In the party, and answered. A request is the lead's to let in and an
  -- invitation is the other person's to answer; neither holds a place to be
  -- moved out of.
  if m.confirmed_at is null then
    raise exception 'only somebody in the party can be moved';
  end if;

  -- The seats this party has: slotsOf in lib/party.ts, said again. A board
  -- opened before the shape changed can still ask for MT in what is now a
  -- light party, and somebody written into a chair the grid has no square for
  -- would vanish from the grid while still counting in the party.
  seats := case p.shape
    when 'light' then array['Tank', 'Heal', 'D1', 'D2']
    when 'four'  then array['1', '2', '3', '4']
    when 'full'  then array['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4']
    when 'eight' then array['1', '2', '3', '4', '5', '6', '7', '8']
    when 'alliance' then array(
      select w.x || '-' || s.x
        from unnest(array['A', 'B', 'C']) with ordinality as w(x, i),
             unnest(array['MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4'])
               with ordinality as s(x, i)
       order by w.i, s.i)
    else array[]::text[]
  end;
  -- A hunt train has no chairs, and everybody in it is already where Flex is.
  if cardinality(seats) = 0 then
    raise exception 'this party has no seats to move anybody between';
  end if;
  if p_seat is not null then
    if not (p_seat = any(seats)) then
      raise exception 'this party has no seat called %', p_seat;
    end if;
    -- Shut is the lead saying nobody sits there. Moving somebody in would say
    -- both things about one chair at once; open it first.
    if p_seat = any(coalesce(p.closed, '{}'::text[])) then
      raise exception 'seat % is shut', p_seat;
    end if;
  end if;

  was := m.seat;
  if p_seat is not distinct from was then return 'same'; end if;

  if p_seat is not null then
    select * into o from public.party_members
     where party_id = m.party_id and seat = p_seat
     for update;
  end if;
  if o.id is distinct from p_with then return 'changed'; end if;

  begin
    if o.id is null then
      -- A free seat, or Flex. Somebody put in a chair is settled in it, the
      -- same as when they take one themselves (party_take_seat). Somebody sent
      -- to Flex keeps what they said they could play: that offer is the only
      -- thing the board has left to seat them by.
      update public.party_members
         set seat = p_seat,
             flex = case when p_seat is null then flex end,
             job  = case when p_keep_job then job end
       where id = m.id;
      return 'moved';
    end if;

    -- A swap. One seat holds one person (party_members_one_per_seat), and
    -- Postgres checks that row by row, so the two cannot trade places in one
    -- update: the mover stands up for a moment so the other can sit. That
    -- moment is nobody's news, and the trigger below is told to let it pass.
    if was is not null then
      perform set_config('app.party_moving', 'on', true);
      update public.party_members set seat = null where id = m.id;
      perform set_config('app.party_moving', 'off', true);
    end if;

    -- Whoever held the seat takes the mover's place: their chair, or Flex
    -- when the mover was flexing, carrying their own offer with them there.
    update public.party_members
       set seat = was,
           flex = case when was is null then flex end,
           job  = case when p_keep_their_job then job end
     where id = o.id;

    update public.party_members
       set seat = p_seat,
           flex = null,
           job  = case when p_keep_job then job end
     where id = m.id;
    return 'swapped';
  exception when unique_violation then
    -- Somebody sat down in one of the two between the read and the write.
    -- Everything inside this block is undone, so nobody has moved at all.
    return 'changed';
  end;
end;
$fn$;

revoke all on function public.party_move(bigint, text, bigint, boolean, boolean)
  from public, anon;
grant execute on function public.party_move(bigint, text, bigint, boolean, boolean)
  to authenticated;

/* ── the person moved is told ───────────────────────────────────────────── */

/**
 * Somebody else changed your seat, and this says where you are now.
 *
 * On the seat column rather than inside party_move, so it holds however the
 * chair was changed — the lead's move, the lead seating somebody through
 * party_take_seat, somebody who offered to move being moved along when the
 * lead lets a request into their chair. A rule that depends on every call site
 * remembering is already broken somewhere (v19).
 *
 * Only a hand that is not theirs, and only the lead's or an admin's: that is
 * what being moved means. A member taking a free chair moved themselves. And
 * only somebody who was already in the party before the change — a request let
 * in or an invitation accepted gets its seat in the same statement as its yes,
 * and is told as that (party_ok, party_in), not as a move.
 *
 * One unread notice per party. A lead trying three arrangements in a minute is
 * one piece of news, where you are now, and the older notices would each name
 * a seat that is not yours any more — so an unread one is replaced rather than
 * added to. One already read stays: it was true when it was read.
 *
 * The body is the seat, or nothing for Flex. The bell says it in the sentence.
 */
create or replace function public.notify_party_moved()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  lead   uuid;
  target uuid;
begin
  if new.seat is not distinct from old.seat then return null; end if;
  -- The middle of a swap. See party_move.
  if current_setting('app.party_moving', true) = 'on' then return null; end if;
  if old.confirmed_at is null or new.confirmed_at is null then return null; end if;
  -- A scheduled job has nobody at the keyboard, and nobody moved anybody.
  if auth.uid() is null then return null; end if;

  select owner into lead
    from public.party_posts
   where id = new.party_id and deleted_at is null;
  if lead is null then return null; end if;
  if lead is distinct from auth.uid() and not public.is_admin() then
    return null;
  end if;

  select id into target
    from public.profiles
   where character_id = new.character_id
     and character_verified_at is not null
   limit 1;
  -- Somebody not on this site, or the lead moving their own chair.
  if target is null or target = auth.uid() then return null; end if;

  delete from public.notifications
   where recipient = target
     and kind = 'party_moved'
     and party_id = new.party_id
     and read_at is null;

  insert into public.notifications (recipient, kind, actor, actor_name, party_id, body)
  values (target, 'party_moved', auth.uid(), public.actor_name(),
          new.party_id, new.seat);
  return null;
end;
$fn$;

drop trigger if exists party_members_moved on public.party_members;
create trigger party_members_moved
  after update of seat on public.party_members
  for each row execute function public.notify_party_moved();

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select proname from pg_proc
 *    where proname in ('party_move', 'notify_party_moved');
 *   -- two rows
 *
 *   select tgname from pg_trigger where tgname = 'party_members_moved';
 *   -- one row
 */
