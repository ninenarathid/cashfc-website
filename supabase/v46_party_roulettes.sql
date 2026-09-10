-- v46 — which roulettes a roulette night is running
--
-- Run this once in the Supabase SQL editor, after v45.
--
-- The one thing that listing is about. "Expert and Alliance" and "Leveling with
-- the new person" are different evenings and the same content key, so without
-- this the board would show eleven identical rows called Duty Roulette.
--
-- A text[] of the game's own short names, not ids: the names are what the
-- listing renders and what somebody searches for, and ContentRoulette row 17
-- is Normal Raids for reasons that have nothing to do with anything.
alter table public.party_posts
  add column if not exists roulettes text[];

-- The link preview needs it too, for the same reason the map plan did: the card
-- should say which roulettes rather than the word "Roulette" eleven ways.
--
-- Dropped rather than replaced, because Postgres will not change the shape of a
-- function's return table in place.
drop function if exists public.party_card(bigint);

create function public.party_card(p_id bigint)
returns table (
  content_key    text,
  note           text,
  shape          text,
  starts_at      timestamptz,
  length_minutes integer,
  length_unit    text,
  runs           integer,
  roulettes      text[],
  owner_name     text,
  seats_total    integer,
  seats_taken    integer,
  progress       jsonb,
  loot           jsonb,
  spot           jsonb,
  maps           jsonb
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
    p.maps
  from public.party_posts p
  left join public.profiles o on o.id = p.owner
  where p.id = p_id and p.deleted_at is null;
$$;

grant execute on function public.party_card(bigint) to anon, authenticated;
