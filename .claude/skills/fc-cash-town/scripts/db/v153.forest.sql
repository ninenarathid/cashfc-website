-- v153, the forest's part: the gifts of the forest line's second to sixth ranks (lib/town/gifts, lib/town/forest).
-- Run after v153.shared.sql. Safe to run twice. Every function that was there before is written whole, from its
-- text as the database has it after v152, with as few lines changed as the gift needs.

-- ── the squirrel (rank 2): it fetches what lies on the ground as its member walks past ──────────────────────────
-- Whether a squirrel fetches a kind of place's thing for somebody (lib/town/forest's fetches): what is picked up
-- with no game, while it follows them.
create or replace function town.wild_fetches(p_purse jsonb, p_how text)
returns boolean language sql stable
as $$ select coalesce(p_how = 'pick' and town.gift_works(p_purse, 'famSquirrel'), false) $$;

-- How far somebody reaches a kind of place from, in tiles (lib/town/forest's reachOf): a tile; or as far as their
-- squirrel fetches.
create or replace function town.wild_reach(p_purse jsonb, p_how text)
returns integer language sql stable
as $$
  select case when town.wild_fetches(p_purse, p_how) then (town.cat('forest')->>'squirrel')::integer
    else (town.cat('forest')->>'reach')::integer end
$$;

-- The stamina a gathering of a kind of place costs somebody (lib/town/forest's costFor): its own; none of theirs
-- when the squirrel fetches it.
create or replace function town.wild_cost(p_purse jsonb, p_kind jsonb)
returns double precision language sql stable
as $$ select case when town.wild_fetches(p_purse, p_kind->>'how') then 0 else (p_kind->>'cost')::double precision end $$;

-- ── the truffle piglet (rank 3): no hoe, one more from every hole, so many holes to a meal's hours ─────────────
-- Whether a truffle piglet may dig for somebody now (lib/town/forest's pigletDigs): it follows them and has a hole
-- left of its count to these hours.
create or replace function town.piglet_digs(p_purse jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select town.gift_works(p_purse, 'famPiglet')
     and town.used_of(p_purse, 'famPiglet', p_now) < (town.cat('gifts')->'uses'->'famPiglet'->>'n')::integer
$$;

-- ── the firefly lantern (rank 4): what every place holds, and the secret places of the deep woods ──────────────
-- The secret places are in the catalog's forest row beside the places everybody has (`secret`: their kinds and the
-- places themselves), and their numbers go on from the last of `spots`: so `town_takes` keeps who took from them as
-- it does of every place, and what one holds is rolled by the same rule from the same word.
-- A place of a number, one everybody has or a secret one (lib/town/forest's placeAt); null for what is no place's.
create or replace function town.wild_place(p_f jsonb, p_spot integer)
returns jsonb language sql immutable
as $$
  select case when p_spot is null or p_spot < 0 then null
    when p_spot < jsonb_array_length(p_f->'spots') then p_f->'spots'->p_spot
    else p_f->'secret'->'spots'->(p_spot - jsonb_array_length(p_f->'spots')) end
$$;

-- What a kind of place is, as rules (lib/town/forest's ruleOf): a kind everybody has, or a secret place's.
create or replace function town.wild_rule(p_f jsonb, p_kind text)
returns jsonb language sql immutable
as $$ select coalesce(p_f->'kinds'->p_kind, p_f->'secret'->'kinds'->p_kind) $$;

-- Whether a place's number is a secret place's (lib/town/forest's isSecret).
create or replace function town.wild_secret(p_f jsonb, p_spot integer)
returns boolean language sql immutable
as $$
  select coalesce(p_spot >= jsonb_array_length(p_f->'spots')
    and p_spot < jsonb_array_length(p_f->'spots') + jsonb_array_length(coalesce(p_f->'secret'->'spots', '[]'::jsonb)), false)
$$;

-- town.wild_holds: v125's. Changed: the place and its kind are looked up among the secret places too (two lines).
CREATE OR REPLACE FUNCTION town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := town.wild_place(f, p_spot);
  kind jsonb := town.wild_rule(f, spot->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  finds jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick jsonb := null;
  i integer;
  lo integer;
  hi integer;
begin
  if p_spot is null or p_spot < 0 or spot is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('phase', p_spot) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision then return null; end if;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    fits := fits || town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':what', p_spot, turn) * total;
  for i in 0..jsonb_array_length(finds) - 1 loop
    if fits[i + 1] then
      pick := finds->i;
      left_ := left_ - (pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  lo := (pick->'n'->>0)::int;
  hi := (pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
    'until', (turn + 1) * every - phase);
end;
$function$;

-- town.gather: v125's, with two arguments more at its end (`p_with`: the gift a gathering is asked to be done with,
-- none for the plain way; `p_lost`: a secret place's games were left), so the function of eleven arguments goes and
-- this one answers its calls too.
-- Changed: the place and its kind are looked up among the secret places too (two lines); how far one reaches (a
-- line); what it costs (a line); asked of the piglet, what is dug takes no hoe, is one of the piglet's holes, and
-- gives one more (three declarations, the hoe's line grown into a block, a line for how many, and the purse the
-- stamina is spent from); and a secret place is there only for whoever wears the lantern (in the first line of the
-- body), gives all it has when both its games were won and is written in the purse's record, and otherwise spends
-- the turn with nothing got (two declarations and a block after the reach).
drop function if exists town.gather(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, double precision, bigint);
drop function if exists town.gather(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, double precision, bigint, text);
CREATE OR REPLACE FUNCTION town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_with text DEFAULT NULL::text, p_lost boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('forest');
  spot jsonb := town.wild_place(f, p_spot);
  kind jsonb := town.wild_rule(f, spot->>0);
  bag jsonb := p_purse->'bag';
  item text := p_has->>'item';
  n integer;
  wrong integer := 0;
  piglet boolean := coalesce(kind->>'how' = 'dig' and p_with = 'famPiglet', false);
  mine jsonb := p_purse;
  used jsonb;
  secret boolean := town.wild_secret(f, p_spot);
  found jsonb := case when jsonb_typeof(p_purse->'forest'->'secrets') = 'array' then p_purse->'forest'->'secrets' else '[]'::jsonb end;
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null or (secret and not town.wearing(p_purse, 'charmFirefly')) then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > town.wild_reach(p_purse, kind->>'how') then return town.no('far'); end if;
  if secret then
    if coalesce(p_lost, false) or floor(coalesce(p_misses, 0)) > 0 or floor(coalesce(p_wrong, 0)) > 0 then
      return jsonb_build_object('ok', true, 'lost', true, 'got', '[]'::jsonb, 'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now));
    end if;
    n := (p_has->>'n')::int;
    if town.room(bag, item) < n then return town.no('full'); end if;
    if not found @> to_jsonb(p_spot) then
      select jsonb_agg(e.v order by e.v) into found from (select x.v::int as v from jsonb_array_elements_text(found) x(v) union select p_spot) e;
    end if;
    return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(item, n)),
      'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now) || jsonb_build_object('bag', town.put(bag, item, n),
        'forest', case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end || jsonb_build_object('secrets', found)));
  end if;
  if piglet then
    used := town.gift_use(p_purse, 'famPiglet', p_now);
    if not (used->>'ok')::boolean then return used; end if;
    mine := used->'purse';
  elsif kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int)
    + case when piglet then (town.cat('gifts')->'gifts'->'famPiglet'->>'by')::int else 0 end;
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(mine, town.wild_cost(p_purse, kind), p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$function$;

-- public.town_gather: v125's. Changed: what the gathering is asked to be done with, and whether a secret place's
-- games were left, are read from `p_went` and handed on (two declarations, and the call's last arguments); a place
-- may be a secret one (the guard, the place's line, and the kind's way in the deed); a secret place lost is written
-- down as `slip` and not as a gathering (the deed's line grown into a block); and the deed says when it was the
-- squirrel that fetched the thing or the piglet that dug it, and when the place was a secret one (two lines).
CREATE OR REPLACE FUNCTION public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  with_ text := case when jsonb_typeof(went->'with') = 'string' then went->>'with' end;
  lost_ boolean := coalesce(case when jsonb_typeof(went->'lost') = 'boolean' then (went->>'lost')::boolean end, false);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', town.wild_rule(f, spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, town.wild_rule(f, spot->>0)->>'how') then jsonb_build_object('by', 'famSquirrel')
              when with_ = 'famPiglet' and town.wild_rule(f, spot->>0)->>'how' = 'dig' and not town.wild_secret(f, p_spot) then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end
      || case when town.wild_secret(f, p_spot) then jsonb_build_object('secret', true) else '{}'::jsonb end);
    end if;
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$;

-- ── a sprite's treasure map (rank 5): a hunt for a chest, hot and cold ──────────────────────────────────────────
-- The catalog's forest row has `hunt`: the dig sites, how far a map's ring may lie off the chest and how wide it is,
-- how near a dig is for each warmth, and what a chest may hold. A hunt is kept in the purse (`forest.hunt`: the day
-- it is of, which of that day's maps, the digs that missed); the tile is never kept and never told: it is rolled
-- from the word no browser reads, whose hunt it is, the day and the map.
-- The hunt somebody is on now (lib/town/hunt's huntOf): the one kept, if it is of today; null with none.
create or replace function town.hunt_of(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(h.h) = 'object' and jsonb_typeof(h.h->'k') = 'number' and jsonb_typeof(h.h->'n') = 'number'
      and (h.h->>'k')::numeric = town.stretch_at(town.cat('gifts')->'uses'->'thingMap', p_now)
    then jsonb_build_object('k', h.h->'k', 'n', floor((h.h->>'n')::numeric),
      'digs', case when jsonb_typeof(h.h->'digs') = 'number' and (h.h->>'digs')::numeric > 0 then floor((h.h->>'digs')::numeric) else 0 end) end
    from (select p_purse->'forest'->'hunt' as h) h
$$;

-- The tile a hunt's chest is buried at (lib/town/hunt's huntSite), as [x, y].
create or replace function town.hunt_site(p_word text, p_me text, p_hunt jsonb)
returns jsonb language sql stable
as $$
  select s.sites->least(jsonb_array_length(s.sites) - 1,
      floor(town.roll(p_word || ':hunt:' || p_me, (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * jsonb_array_length(s.sites))::integer)
    from (select town.cat('forest')->'hunt'->'sites' as sites) s
$$;

-- The ring a hunt's map draws (lib/town/hunt's huntArea): its middle off the chest by rolls of its own.
create or replace function town.hunt_area(p_word text, p_me text, p_hunt jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
      'x', (s.site->>0)::integer + floor(town.roll(p_word || ':hunt:' || p_me || ':dx', (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * (2 * s.off + 1))::integer - s.off,
      'y', (s.site->>1)::integer + floor(town.roll(p_word || ':hunt:' || p_me || ':dy', (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * (2 * s.off + 1))::integer - s.off,
      'r', s.radius)
    from (select town.hunt_site(p_word, p_me, p_hunt) as site, (town.cat('forest')->'hunt'->>'off')::integer as off, (town.cat('forest')->'hunt'->'radius') as radius) s
$$;

-- A hunt as its owner is told it (lib/town/hunt's huntTold): which map of the day, the digs so far, and the ring.
create or replace function town.hunt_told(p_purse jsonb, p_word text, p_me text, p_now bigint)
returns jsonb language sql stable
as $$
  select case when h.hunt is not null then jsonb_build_object('n', h.hunt->'n', 'digs', h.hunt->'digs', 'area', town.hunt_area(p_word, p_me, h.hunt)) end
    from (select town.hunt_of(p_purse, p_now) as hunt) h
$$;

-- How warm a dig is (lib/town/hunt's warmthOf): 0 on the chest, then by the catalog's bands, and one past them, cold.
create or replace function town.hunt_warm(p_site jsonb, p_x integer, p_y integer)
returns integer language sql stable
as $$
  select coalesce((select min(b.ord)::integer - 1 from jsonb_array_elements_text(town.cat('forest')->'hunt'->'bands') with ordinality b(v, ord)
                    where greatest(abs(p_x - (p_site->>0)::integer), abs(p_y - (p_site->>1)::integer)) <= b.v::numeric),
                  jsonb_array_length(town.cat('forest')->'hunt'->'bands'))
$$;

-- What a chest holds, by two rolls (lib/town/hunt's chestOf), as [thing, how many]: a rare thing of the forest whose
-- day it is (two of one worth little), or a scroll.
create or replace function town.chest_of(p_word text, p_now bigint, p_r0 double precision, p_r1 double precision)
returns jsonb language plpgsql stable
as $$
declare
  h jsonb := town.cat('forest')->'hunt';
  rares jsonb;
  many integer;
  item text;
begin
  select coalesce(jsonb_agg(r.v->>0 order by r.ord), '[]'::jsonb) into rares
    from jsonb_array_elements(h->'rares') with ordinality r(v, ord)
   where town.roll(p_word || ':day:' || (r.v->>0), town.day_of(p_now)::bigint) < (r.v->>1)::double precision;
  many := jsonb_array_length(rares);
  if many > 0 and p_r0 < (h->>'rare')::double precision then
    item := rares->>least(many - 1, greatest(0, floor(p_r1 * many)::integer));
    return jsonb_build_array(item, case when (town.cat('items')->item->>'pays')::numeric < (h->>'pair')::numeric then 2 else 1 end);
  end if;
  many := jsonb_array_length(h->'scrolls');
  return jsonb_build_array(h->'scrolls'->>least(many - 1, greatest(0, floor(p_r1 * many)::integer)), 1);
end;
$$;

-- Use a map (lib/town/hunt's mapUse): one of the day's, and a hunt begins. Refused with a hunt on already.
create or replace function town.map_use(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  used jsonb;
begin
  if town.hunt_of(p_purse, p_now) is not null then return town.no('had'); end if;
  used := town.gift_use(p_purse, 'thingMap', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return jsonb_build_object('ok', true, 'left', used->'left', 'purse', (used->'purse') || jsonb_build_object('forest',
    case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end
      || jsonb_build_object('hunt', jsonb_build_object('k', town.stretch_at(town.cat('gifts')->'uses'->'thingMap', p_now), 'n', town.used_of(used->'purse', 'thingMap', p_now), 'digs', 0))));
end;
$$;

-- Dig for the chest from a tile (lib/town/hunt's mapDig): off it, how warm it was, and the dig is counted; on it, the
-- chest is up, what it holds is in the bag, the hunt is over and it is one more chest found.
create or replace function town.map_dig(p_purse jsonb, p_word text, p_me text, p_x integer, p_y integer, p_now bigint, p_r0 double precision, p_r1 double precision)
returns jsonb language plpgsql stable
as $$
declare
  hunt jsonb := town.hunt_of(p_purse, p_now);
  mine jsonb := case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end;
  warm integer;
  digs integer;
  chest jsonb;
  n integer;
  chests integer;
begin
  if hunt is null then return town.no('none'); end if;
  warm := town.hunt_warm(town.hunt_site(p_word, p_me, hunt), p_x, p_y);
  digs := (hunt->>'digs')::integer + 1;
  if warm > 0 then
    return jsonb_build_object('ok', true, 'found', false, 'warm', warm, 'digs', digs, 'got', '[]'::jsonb,
      'purse', p_purse || jsonb_build_object('forest', mine || jsonb_build_object('hunt', hunt || jsonb_build_object('digs', digs))));
  end if;
  chest := town.chest_of(p_word, p_now, p_r0, p_r1);
  n := (chest->>1)::integer;
  if town.room(p_purse->'bag', chest->>0) < n then return town.no('full'); end if;
  chests := case when jsonb_typeof(mine->'chests') = 'number' and (mine->>'chests')::numeric > 0 then floor((mine->>'chests')::numeric)::integer else 0 end;
  return jsonb_build_object('ok', true, 'found', true, 'warm', 0, 'digs', digs, 'got', jsonb_build_array(chest),
    'purse', p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', chest->>0, n), 'forest', mine || jsonb_build_object('hunt', null, 'chests', chests + 1)));
end;
$$;

-- A member uses a map: one of the day's three, and a hunt begins.
create or replace function public.town_map_use()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.map_use(town.purse_of(me, true), now_);
  told jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'map_use', 'thingMap', 1, 0, jsonb_build_object('map', did->'purse'->'forest'->'hunt'->'n', 'left', did->'left'));
  end if;
  told := town.answer(me, did);
  return told || jsonb_build_object('hunt', town.hunt_told(told->'purse', town.word(), me::text, now_));
end;
$$;

-- A member digs for the chest of the hunt they are on, from the tile they stand on.
create or replace function public.town_map_dig(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  told jsonb;
begin
  if p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  did := town.map_dig(purse, town.word(), me::text, p_x, p_y, now_, random(), random());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'found')::boolean then
      perform town.note(me, 'chest', did->'got'->0->>0, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
        'map', town.hunt_of(purse, now_)->'n', 'digs', did->'digs', 'tile', jsonb_build_array(p_x, p_y)));
    else
      perform town.note(me, 'map_dig', null, 0, 0, jsonb_build_object(
        'map', town.hunt_of(purse, now_)->'n', 'digs', did->'digs', 'warm', did->'warm', 'tile', jsonb_build_array(p_x, p_y)));
    end if;
  end if;
  told := town.answer(me, did);
  return told || jsonb_build_object('hunt', town.hunt_told(told->'purse', town.word(), me::text, now_));
end;
$$;

-- public.town_wild: v125's. Changed: whoever wears the firefly lantern is told what lies buried, and the secret
-- places with the rest (a declaration; the loop's bound; the kind's line; and the line that says what a place has);
-- and the hunt a member is on is told with the forest (the last line).
CREATE OR REPLACE FUNCTION public.town_wild()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  word text := town.word();
  took jsonb;
  has jsonb;
  t jsonb;
  kind jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
  lit boolean := coalesce((select town.wearing(p.doc, 'charmFirefly') from public.town_purses p where p.member_id = me), false);
begin
  -- (what has been taken of late, in one look: no turn is longer than half a day)
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'spot' and tk.at > now() - interval '13 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(f->'spots') - 1 + case when lit then jsonb_array_length(coalesce(f->'secret'->'spots', '[]'::jsonb)) else 0 end loop
    has := town.wild_holds(i, now_, f, word);
    continue when has is null;
    kind := town.wild_rule(f, town.wild_place(f, i)->>0);
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (kind->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, case when kind->>'how' = 'dig' and not lit then null else has->>'item' end, (has->>'n')::int, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'wild', out_, 'hunt', town.hunt_told((select p.doc from public.town_purses p where p.member_id = me), word, me::text, now_));
end;
$function$;

revoke execute on function public.town_gather(integer, integer, integer, jsonb) from public, anon;
grant execute on function public.town_gather(integer, integer, integer, jsonb) to authenticated;
revoke execute on function public.town_wild() from public, anon;
grant execute on function public.town_wild() to authenticated;
revoke execute on function public.town_map_use() from public, anon;
grant execute on function public.town_map_use() to authenticated;
revoke execute on function public.town_map_dig(integer, integer) from public, anon;
grant execute on function public.town_map_dig(integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
