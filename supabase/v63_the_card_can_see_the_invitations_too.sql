-- v63 — the card sees what the board sees
--
-- Run this once in the Supabase SQL editor, after v62.
--
-- A seat somebody has been asked to sit in is not a seat the party has shut,
-- and the site has read it that way since the invitation fix: The Epic of
-- Alexander has D3 and D4 marked "not looking" with four invitations out to
-- them, and every window that can see both agrees they are open.
--
-- The card drawn for Discord is the one window that cannot. v61 took the
-- unanswered members out of party_card, rightly -- six maybes do not make a
-- party of four into a party of ten -- and with them went the only trace of
-- which seats had been asked about. So the picture inside the message worked
-- from six seats while the message around it worked from eight, and announced
-- a raid that wanted four people as wanting two.
--
-- So the seats that have been asked about come back on their own, as seats
-- rather than as people. Nobody is added to the roster and no count moves; the
-- card subtracts them from `closed` exactly as the site does, and the two
-- agree again.

/**
 * The card's party, plus the seats somebody has been asked about.
 *
 * v61's function with one column added. `asked_seats` is the seats named in
 * the flex of members who have not answered -- which is where an invitation
 * keeps the seat it suggested, because a held seat is the one thing an
 * invitation must not be. Distinct, because a lead may ask three people about
 * D4 and that is one seat, not three.
 *
 * Dropped first: a returns-table signature cannot be replaced in place once
 * its columns change.
 */
drop function if exists public.party_card(bigint);

create function public.party_card(p_id bigint)
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
  members          jsonb,
  asked_seats      text[]
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
      when 'four' then 4
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
         and m.confirmed_at is not null
    ), '[]'::jsonb),
    coalesce((
      select array_agg(distinct s.seat)
        from public.party_members m
        cross join lateral jsonb_array_elements_text(
          coalesce(m.flex -> 'seats', '[]'::jsonb)) as s(seat)
       where m.party_id = p.id
         and m.confirmed_at is null
         and m.seat is null
    ), '{}'::text[])
  from public.party_posts p
  left join public.profiles o on o.id = p.owner
  where p.id = p_id and p.deleted_at is null;
$card$;

grant execute on function public.party_card(bigint) to anon, authenticated;
