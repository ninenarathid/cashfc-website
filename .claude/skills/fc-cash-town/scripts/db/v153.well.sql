-- v153, the well's part: what the fourth to the sixth rank of the water carriers' line give (the rules are
-- lib/town/well-gifts.ts again). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
-- Its numbers are the catalog's: `gifts` (each gift's own: the flask's thirty) and `well` (written over by v153: what
-- else these three go by).

-- ── the flask of living water (rank 4, thingFlask): a drink for a friend ──

-- A tile as it is told, if it is one: two whole numbers (lib/town/well-gifts' tileOf).
create or replace function town.is_tile(p_at jsonb)
returns boolean language plpgsql immutable
as $$
begin
  if p_at is null or jsonb_typeof(p_at) <> 'array' then return false; end if;
  if jsonb_array_length(p_at) <> 2 then return false; end if;
  if jsonb_typeof(p_at->0) <> 'number' or jsonb_typeof(p_at->1) <> 'number' then return false; end if;
  return (p_at->>0)::numeric = trunc((p_at->>0)::numeric) and (p_at->>1)::numeric = trunc((p_at->>1)::numeric);
end;
$$;

-- The drink somebody holds out, as it is kept, if it is kept soundly: to whom, from which tile, until when
-- (toastOf). Lapsed or not: town.drink_take says which.
create or replace function town.toast_of(p_purse jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  t jsonb := p_purse->'toast';
begin
  if t is null or jsonb_typeof(t) <> 'object' then return null; end if;
  if jsonb_typeof(t->'to') is distinct from 'string' or jsonb_typeof(t->'till') is distinct from 'number' then return null; end if;
  if t->>'to' = '' or not town.is_tile(t->'at') then return null; end if;
  return jsonb_build_object('to', t->'to', 'at', t->'at', 'till', t->'till');
end;
$$;

-- Whether somebody has been given a drink in the meal's hours a moment is in (hasDrunk).
create or replace function town.has_drunk(p_purse jsonb, p_now bigint)
returns boolean language plpgsql stable
as $$
declare
  d jsonb := p_purse->'drunk';
begin
  if d is null or jsonb_typeof(d) <> 'object' then return false; end if;
  if jsonb_typeof(d->'k') is distinct from 'number' then return false; end if;
  return (d->>'k')::numeric = town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now);
end;
$$;

-- Hold a drink out to somebody, from the tile one stands on (p_to null: put it away). One at a time (drinkOffer).
create or replace function town.drink_offer(p_purse jsonb, p_me text, p_to text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  till bigint;
begin
  if not town.gift_works(p_purse, 'thingFlask') then return town.no('none'); end if;
  if p_to is null then return jsonb_build_object('ok', true, 'till', null, 'purse', p_purse - 'toast'); end if;
  if p_to = '' or p_to = p_me then return town.no('none'); end if;
  if not town.is_tile(p_at) then return town.no('none'); end if;
  till := p_now + round((town.cat('well')->'drink'->>'waits')::numeric * 1000)::bigint;
  return jsonb_build_object('ok', true, 'till', till,
    'purse', (p_purse - 'toast') || jsonb_build_object('toast', jsonb_build_object('to', p_to, 'at', p_at, 'till', till)));
end;
$$;

-- Drink what somebody holds out to one, from the tile one stands on: both purses as they are afterwards, what the
-- drinker had of it and what its giver had for the giving (drinkTake). Once in a meal's hours for whoever drinks;
-- never above a full gauge; nothing for a gauge that is full.
create or replace function town.drink_take(p_giver jsonb, p_drinker jsonb, p_from text, p_me text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('well')->'drink';
  top double precision := (town.cat('stamina')->>'max')::double precision;
  gives double precision := (town.cat('gifts')->'gifts'->'thingFlask'->>'by')::double precision;
  held jsonb := town.toast_of(p_giver);
  day_ integer := town.day_of(p_now);
  mine double precision;
  theirs double precision;
  left_ double precision;
  after_ double precision;
begin
  if p_from = p_me or held is null or not town.gift_works(p_giver, 'thingFlask') then return town.no('none'); end if;
  if held->>'to' <> p_me then return town.no('none'); end if;
  if not ((held->>'till')::numeric > p_now) then return town.no('late'); end if;
  if not town.is_tile(p_at) then return town.no('far'); end if;
  if greatest(abs((p_at->>0)::numeric - (held->'at'->>0)::numeric), abs((p_at->>1)::numeric - (held->'at'->>1)::numeric)) > (k->>'reach')::numeric then return town.no('far'); end if;
  if town.has_drunk(p_drinker, p_now) then return town.no('drunk'); end if;
  mine := town.stamina_of(p_drinker, p_now);
  if mine >= top then return town.no('sated'); end if;
  theirs := town.stamina_of(p_giver, p_now);
  left_ := least(top, mine + gives);
  after_ := least(top, theirs + (k->>'back')::double precision);
  return jsonb_build_object('ok', true, 'got', left_ - mine, 'back', after_ - theirs,
    'giver', (p_giver - 'toast') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', after_)),
    'drinker', p_drinker || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_),
      'drunk', jsonb_build_object('k', town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now), 'by', p_from)));
end;
$$;

-- What a member calls: a drink held out to somebody of the town, from the tile they stand on (p_to null: put away).
create or replace function public.town_drink_offer(p_to uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  -- (somebody who is of the town: a proved character, or an admin)
  if p_to is not null and not town.is_member(p_to) then return town.answer(me, town.no('none')); end if;
  did := town.drink_offer(purse, me::text, p_to::text, jsonb_build_array(p_x, p_y), town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if p_to is not null then
      perform town.note(me, 'drink_offer', 'thingFlask', 1, 0, jsonb_build_object('to', p_to, 'at', jsonb_build_array(p_x, p_y)));
    end if;
  end if;
  return town.answer(me, did);
end;
$$;

-- …and the friend drinking it, from the tile they stand on: both purses judged and kept in this one call, and a line
-- written down for each of the two.
create or replace function public.town_drink_take(p_from uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there)
  if p_from is null or p_from = me or not town.is_member(p_from)
     or not exists (select 1 from public.town_purses pp where pp.member_id = p_from) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who drink to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_from then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_from, true);
  else
    theirs := town.purse_of(p_from, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.drink_take(theirs, mine, p_from::text, me::text, jsonb_build_array(p_x, p_y), now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_from, did->'giver');
    perform town.keep_purse(me, did->'drinker');
    perform town.note(me, 'drink', 'thingFlask', (did->>'got')::numeric, 0, jsonb_build_object('from', p_from, 'at', jsonb_build_array(p_x, p_y)));
    perform town.note(p_from, 'drink_gave', 'thingFlask', (did->>'back')::numeric, 0, jsonb_build_object('to', me));
  end if;
  return town.answer(me, did - 'giver' - 'drinker');
end;
$$;

revoke execute on function public.town_drink_offer(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_offer(uuid, integer, integer) to authenticated;
revoke execute on function public.town_drink_take(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_take(uuid, integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
