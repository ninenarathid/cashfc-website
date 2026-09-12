-- v59 — a request is not a seat, and does not hold one
--
-- Run this once in the Supabase SQL editor, after v58.
--
-- Pressing join drew somebody into the party immediately: their face in the
-- chair, the headcount one higher, the seat no longer advertised — all before
-- the lead had seen the request, let alone answered it. Which is the one thing
-- the board exists not to do. A party of one with seven requests read as a
-- party of eight, so the people it was actually looking for scrolled past it,
-- and the lead was left approving a queue for a party nobody could see was
-- empty.
--
-- The board now keeps them apart: requests are their own list, drawn only in
-- the lead's panel where they are answered and on the asker's own line where
-- they are withdrawn. Nothing that describes the party reads them.
--
-- Which leaves the half that has to happen in here. A request naming one seat
-- wrote itself into that seat, and one seat holds one row —
-- party_members_one_per_seat, from v39 — so the first person to ask about D4
-- was the only person who could: everybody after them collided with the
-- constraint and was told they were already in the party. That is exactly the
-- problem v47 solved for invitations, and the answer is the same one. The seat
-- is named in the flex and claimed at the moment somebody says yes.
--
-- So: the seat moves out of the requests already sitting in the table, and
-- there is a function for the lead to answer one with, which confirms and
-- claims the chair in a single statement so that two people let in at once
-- cannot both be handed it.

/* ── the rows already written ───────────────────────────────────────────── */

-- Their seat becomes the seat they are asking about. The flex is null on every
-- one of these — a request naming one seat sent no flex at all, which is the
-- shape this replaces — so there is nothing here to overwrite.
update public.party_members
   set flex = jsonb_build_object('seats', jsonb_build_array(seat)),
       seat = null
 where asked_by = 'self'
   and confirmed_at is null
   and seat is not null;

/* ── answering one ──────────────────────────────────────────────────────── */

/**
 * Let somebody in, and seat them where they asked to sit.
 *
 * The mirror of party_accept: that one is somebody saying yes to the lead and
 * this is the lead saying yes to somebody, and both have the same two halves
 * to do at once. One statement, so the unique index decides the race rather
 * than the order two clicks happened to arrive in.
 *
 * Only where the flex names exactly one seat. "MT or D2" and "anywhere you
 * need me" are offers rather than requests for a chair, and picking one of
 * them here would be the database deciding something the resolver exists to
 * work out from the seats actually free when the party is next drawn.
 *
 * Whoever cannot be seated is let in anyway, without a chair. Being beaten to
 * a seat is not a reason to be kept out of an evening, and the lead pressing
 * this has already said they are welcome.
 */
create or replace function public.party_let_in(p_member bigint)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.party_members;
  want text;
begin
  select * into m from public.party_members where id = p_member;
  if m.id is null then return 'gone'; end if;

  -- A security definer function sees past every policy, so the question the
  -- policies would have asked is asked plainly here: this is the lead's own
  -- party, or the caller is an admin clearing up after a lead who has gone
  -- quiet.
  if not exists (
    select 1 from public.party_posts x
     where x.id = m.party_id and x.owner = auth.uid()
  ) and not public.is_admin() then
    raise exception 'that request is not yours to answer';
  end if;

  -- One seat named, with nothing offered alongside it.
  if m.flex ? 'seats'
     and jsonb_array_length(m.flex -> 'seats') = 1
     and coalesce((m.flex ->> 'all')::boolean, false) = false
     and coalesce(jsonb_array_length(m.flex -> 'roles'), 0) = 0
  then
    want := m.flex -> 'seats' ->> 0;
  end if;

  if want is not null then
    begin
      update public.party_members
         set seat = want, flex = null,
             confirmed_at = coalesce(confirmed_at, now())
       where id = p_member;
      return 'seat';
    exception when unique_violation then
      -- Somebody sat down in it between the read and the write. They are still
      -- coming; they are just coming without a chair of their own.
      null;
    end;
  end if;

  update public.party_members
     set confirmed_at = coalesce(confirmed_at, now())
   where id = p_member;
  return 'flex';
end;
$fn$;

revoke all on function public.party_let_in(bigint) from anon;
grant execute on function public.party_let_in(bigint) to authenticated;

/* ── and the link preview ───────────────────────────────────────────────── */

/**
 * The card says what the board says.
 *
 * v50's function with one line added to the roster it hands back: an
 * unanswered request is left out of it, for the reason the whole migration
 * exists. The card works out what a party is short of by running the site's
 * own resolver over these members, so a request left in here would have the
 * preview in Discord announcing a full raid that has nobody in it — the exact
 * sentence the board has stopped saying.
 *
 * seats_taken already counted only the answered ones, and is untouched.
 */
create or replace function public.party_card(p_id bigint)
returns table (
  content_key      text,
  note             text,
  shape            text,
  starts_at        timestamptz,
  length_minutes   integer,
  length_unit      text,
  runs             integer,
  roulettes        text[],
  owner_name       text,
  seats_total      integer,
  seats_taken      integer,
  progress         jsonb,
  loot             jsonb,
  spot             jsonb,
  maps             jsonb,
  rules            jsonb,
  closed           text[],
  one_of_each_job  boolean,
  members          jsonb
)
language sql
stable
security definer
set search_path = public
as $card$
  select
    p.content_key,
    p.note,
    p.shape,
    p.starts_at,
    p.length_minutes,
    p.length_unit,
    p.runs,
    p.roulettes,
    coalesce(o.character_name, o.display_name, o.discord_username),
    case p.shape
      when 'light' then 4
      when 'full' then 8
      when 'eight' then 8
      when 'alliance' then 24
      -- A hunt train holds everybody, so "n of nothing" is the honest answer
      -- and the card says how many are coming instead of how full it is.
      else 0
    end,
    (select count(*)::int from public.party_members m
      where m.party_id = p.id and m.confirmed_at is not null),
    p.progress,
    p.loot,
    p.spot,
    p.maps,
    p.rules,
    p.closed,
    p.one_of_each_job,
    -- Everybody in it. An invitation is in the party — the lead put them there
    -- and the seat grid draws them — and an unanswered request is not.
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'seat', m.seat,
               'character_id', m.character_id,
               'name', m.name,
               'avatar', m.avatar,
               'job', m.job,
               'flex', m.flex,
               'confirmed_at', m.confirmed_at)
             order by m.id)
        from public.party_members m
       where m.party_id = p.id
         -- Coalesced, because asked_by is null on every row written before the
         -- column existed and those are all the lead's own doing. Left bare,
         -- the whole condition goes null for them and the roster comes back
         -- missing exactly the parties that predate joining.
         and not (coalesce(m.asked_by, 'owner') = 'self'
                  and m.confirmed_at is null)
    ), '[]'::jsonb)
  from public.party_posts p
  left join public.profiles o on o.id = p.owner
  where p.id = p_id and p.deleted_at is null;
$card$;

grant execute on function public.party_card(bigint) to anon, authenticated;
