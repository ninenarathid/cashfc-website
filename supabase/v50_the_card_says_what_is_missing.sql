-- v50 — a link preview says which seats are short
--
-- Run this once in the Supabase SQL editor, after v49.
--
-- A member asked for it after using the board for a day: the card Discord
-- draws says "4/8", and the board says "short 2 tanks, 1 healer, 3 DPS". The
-- second one is the sentence somebody reads and knows whether it is them —
-- and it was the one the link could not say, so people were typing it
-- underneath, which is the Discord scrollback problem the board exists to fix,
-- reappearing in the message used to escape it.
--
-- Working out which seats are short is not arithmetic. Somebody flexing across
-- MT and D2 covers whichever of the two is still open, and a party of eight
-- with four floaters has a resolution rather than a count — that logic lives in
-- resolveParty in lib/party.ts and is the same code the board runs. So this
-- returns the parts rather than the answer: the members and the three fields
-- the resolver reads, and the card works it out with the function the board
-- already uses. A second implementation in SQL would be a second thing to
-- disagree with.
--
-- And a fix carried along with it. The seat count was a CASE over three shapes
-- and there are four now: a FATE farm and a treasure night are eight seats
-- with no roles, and both were reporting a total of nothing — so their cards
-- said "3 coming" as though they had no limit, which is the one fact the
-- picture is for.

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
  members          jsonb
)
language sql
stable
security definer
set search_path = public
as $$
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
      -- Eight people and no composition. Added in the patch that gave a FATE
      -- farm and a treasure night a real size instead of "however many".
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
    -- Everybody in it, answered or not, which is what the board draws from.
    -- A seat somebody has been invited to is not a seat the party is short of.
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
    ), '[]'::jsonb)
  from public.party_posts p
  left join public.profiles o on o.id = p.owner
  where p.id = p_id and p.deleted_at is null;
$$;

grant execute on function public.party_card(bigint) to anon, authenticated;
