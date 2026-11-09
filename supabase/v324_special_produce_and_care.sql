-- v324 — special produce of the bred breeds, and care that raises Quality
--
-- Run this once in the Supabase SQL editor, after v323. Running it again is safe and changes nothing more. Its code goes
-- out first (a page built before cannot draw the 28 new things in a bag; pages open since before should be loaded again).
--
-- The owner, 2026-11-09: "สัตว์ที่ผสมพันธ์เป็น แบบพิเศษมีโอกาสให้ผลผลิตแบบพิเศษ … ที่เลี้ยงมาดี จะให้ผลผลิต quality สูงด้วย … น่าค้นหา";
-- of the idea patch laid before him, "นอกนั้นเห็นด้วยกับ claude" and Codex's chances, then "ทำทั้งหมดได้เลย". This is its
-- second stage (lib/town/specials, lib/town/animals' CARE, lib/town/roam are the page's twins, number for number):
--
--   * Every bred breed (B to H, 28 of them) has one special; the starters have none. At a collection each round
--     collected in the coop, the milking or the shearing may turn ONE unit of the produce into the breed's special, of
--     that unit's grade: never more units, and it fetches from the uncle what the unit would (its `pays` is the
--     produce's, it carries a grade, the catalog's `animals.graded`, and the uncle prices it at its produce's price of
--     the round and counts it among its produce's sales: town.price_as). Eggs laid out on the meadow roll none.
--   * A round's chance at full care is a day's share by the species' cycle (Codex: 0.20 / 0.28 / 0.40 a day for real,
--     fantasy and legend breeds, every species alike: a hen's round 5 / 7 / 10 %, a sheep's 20 / 28 / 40 %), times
--     (0.5 + 0.5 x care / 10), twice when the round met the breed's habit, half as much again for a gold coat, 50 % at most.
--   * The habit is of six kinds (when it was out, where it went, what was put in its trough, rain or strong wind, a
--     friend's animal out with it or a friend's care, a full heart), the same for every animal of a breed. A round is
--     the stretch since the last collection; its weather, places and company are looked at over 72 hours at most.
--     town.special_strip writes what the round had (the page's round strip: lib/town/specials' stripOf), kept on the
--     animal, its last three.
--   * The care score (0 to 10: the body's size, 0 / 2 / 3 / 5, and the days in a row it was fed through, five at most)
--     lifts the floor of the produce's Quality with the graded feed, the two together 25 at most where the feed alone
--     was and stays 20 (town.animal_range); the star collar's ceiling is as it was.
--   * The book: a member's count of each breed's special found (`animalSpecials` in the purse; three tell that member
--     the habit) and the village's first finder of each (`town_pasture.specials`, told with the breeds' first breeders).
--   * And a fix: the coop's eggs are fewer on a miss and never none (town.animal_units: Codex found it could give 0).
--
-- What it writes: the catalog's `animals` row gains `specials` and a longer `graded` (no other key of it: the farm switch
-- of v323 keeps its egg spots and wagon stop there); the 28 things are merged into `items` entry by entry; a column of
-- `town_pasture`; fifteen new rules (town.roam_*, town.animal_care_score, town.special_*, town.price_as); town.animal_range,
-- town.animal_units, town.animal_world, town.factor_of (stable now: it reads the catalog), town.market_count and
-- town.prices_told written again whole; public.town_animals, town.animal_settle (a day that closes with a full heart is
-- its round's) and public.town_leave_quote from their live text but for the
-- lines below (each must be there exactly once, or the file stops and changes nothing).

begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

do $guard$ begin
  if to_regprocedure('public.town_animals(jsonb,text)') is null or to_regprocedure('town.animal_range(jsonb,jsonb)') is null
     or to_regprocedure('town.animal_units(text,integer,jsonb,integer)') is null or to_regprocedure('town.animal_world(uuid)') is null
     or to_regprocedure('town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)') is null
     or to_regclass('public.town_pasture') is null or to_regclass('public.town_weather') is null
    then raise exception 'v324: run v291 (the pasture) and v118 (the weather) first'; end if;
  if to_regprocedure('public.town_leave_quote(integer,integer,text,integer,integer,numeric)') is null or to_regprocedure('town.market_demand(text,integer)') is null
    then raise exception 'v324: run v253 (the market''s quotes) first'; end if;
  if to_regclass('public.town_farm_switch') is null then raise exception 'v324: run v323 first'; end if;
end $guard$;

-- ── 1. The catalog: the specials, the care score and the 28 things ──────────────────────────────────────────────────
update public.town_catalog set data = data || jsonb_build_object(
    'specials', $v324${"knobs":{"perDay":{"real":0.2,"fantasy":0.28,"legend":0.4},"cap":0.5,"habit":2,"gold":1.5,"lookBack":72,"reveal":3,"strips":3,"wind":30},"care":{"size":[0,2,3,5],"fed":5,"most":10,"lift":25},"steps":{"cow":[1,1.4,1.9,2.5],"sheep":[1,1.5,2.1,2.8],"chicken":[1,1.6,2.2,3],"duck":[1,1.6,2.2,3]},"breeds":{"silkie":{"item":"silkieTwinEgg","habit":{"kind":"heart"}},"araucana":{"item":"dawnBlueEgg","habit":{"kind":"time","band":1}},"marans":{"item":"cocoaShellEgg","habit":{"kind":"food","item":"meadowOats"}},"lanternHen":{"item":"fireflyEgg","habit":{"kind":"time","band":6}},"cloudHen":{"item":"swirlCloudEgg","habit":{"kind":"weather","sky":"wind"}},"goldenHen":{"item":"luckySevenEgg","habit":{"kind":"company"}},"pocketPhoenix":{"item":"rebirthFlameEgg","habit":{"kind":"time","band":0}},"runner":{"item":"windRunnerEgg","habit":{"kind":"place","place":"garden"}},"cayuga":{"item":"emeraldShellEgg","habit":{"kind":"weather","sky":"rain"}},"mandarin":{"item":"brushPaintedEgg","habit":{"kind":"company"}},"raindropDuck":{"item":"firstRainEgg","habit":{"kind":"food","item":"nightDuckweed"}},"moonDuck":{"item":"moonShadowEgg","habit":{"kind":"time","band":7}},"paperboatDuck":{"item":"blankRecipePaper","habit":{"kind":"food","item":"ghostReed"}},"littleLeviathan":{"item":"blackDeepPearlEgg","habit":{"kind":"place","place":"pond"}},"shetland":{"item":"rareShadeLock","habit":{"kind":"food","item":"sweetTimothy"}},"jacob":{"item":"spiralShedHorn","habit":{"kind":"company"}},"valais":{"item":"cloudFluffTuft","habit":{"kind":"heart"}},"dandelionLamb":{"item":"goldenDandelionSeed","habit":{"kind":"weather","sky":"wind"}},"rainbowSheep":{"item":"rainbowArcLock","habit":{"kind":"weather","sky":"rain"}},"starFleece":{"item":"shootingStarLock","habit":{"kind":"time","band":6}},"goldenFleece":{"item":"wholeGoldenFleece","habit":{"kind":"heart"}},"jersey":{"item":"goldenCreamTop","habit":{"kind":"food","item":"sunAlfalfa"}},"highland":{"item":"warmShaggyMilk","habit":{"kind":"place","place":"meadow"}},"brownSwiss":{"item":"agedCheeseStarter","habit":{"kind":"place","place":"barn"}},"strawberryCow":{"item":"wildBerryCream","habit":{"kind":"food","item":"mistVetch"}},"cocoaCow":{"item":"cocoaCreamTop","habit":{"kind":"time","band":5}},"flowerCow":{"item":"pollenCream","habit":{"kind":"place","place":"garden"}},"milkyWayCow":{"item":"cometMilkCrystal","habit":{"kind":"time","band":7}}},"priceAs":{"silkieTwinEgg":"silkieEgg","dawnBlueEgg":"blueEgg","cocoaShellEgg":"chocolateEgg","fireflyEgg":"lanternEgg","swirlCloudEgg":"cloudEgg","luckySevenEgg":"goldenEgg","rebirthFlameEgg":"emberEgg","windRunnerEgg":"runnerEgg","emeraldShellEgg":"cayugaEgg","brushPaintedEgg":"mandarinEgg","firstRainEgg":"rainEgg","moonShadowEgg":"moonEgg","blankRecipePaper":"paperEgg","blackDeepPearlEgg":"leviathanEgg","rareShadeLock":"shetlandWool","spiralShedHorn":"jacobWool","cloudFluffTuft":"valaisWool","goldenDandelionSeed":"dandelionWool","rainbowArcLock":"rainbowWool","shootingStarLock":"starWool","wholeGoldenFleece":"goldenWool","goldenCreamTop":"jerseyMilk","warmShaggyMilk":"highlandMilk","agedCheeseStarter":"swissMilk","wildBerryCream":"strawberryMilk","cocoaCreamTop":"cocoaMilk","pollenCream":"flowerMilk","cometMilkCrystal":"starMilk"}}$v324$::jsonb,
    'graded', $v324$["farmEgg","silkieEgg","blueEgg","chocolateEgg","lanternEgg","cloudEgg","goldenEgg","emberEgg","duckEgg","runnerEgg","cayugaEgg","mandarinEgg","rainEgg","moonEgg","paperEgg","leviathanEgg","wool","shetlandWool","jacobWool","valaisWool","dandelionWool","rainbowWool","starWool","goldenWool","farmMilk","jerseyMilk","highlandMilk","swissMilk","strawberryMilk","cocoaMilk","flowerMilk","starMilk","cream","butter","farmCheese","yarn","woolScarf","rainbowScarf","starScarf","goldenScarf","silkieTwinEgg","dawnBlueEgg","cocoaShellEgg","fireflyEgg","swirlCloudEgg","luckySevenEgg","rebirthFlameEgg","windRunnerEgg","emeraldShellEgg","brushPaintedEgg","firstRainEgg","moonShadowEgg","blankRecipePaper","blackDeepPearlEgg","rareShadeLock","spiralShedHorn","cloudFluffTuft","goldenDandelionSeed","rainbowArcLock","shootingStarLock","wholeGoldenFleece","goldenCreamTop","warmShaggyMilk","agedCheeseStarter","wildBerryCream","cocoaCreamTop","pollenCream","cometMilkCrystal"]$v324$::jsonb), updated_at = now()
  where key = 'animals';
update public.town_catalog set data = data || $v324${
    "silkieTwinEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "dawnBlueEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "cocoaShellEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "fireflyEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "swirlCloudEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "luckySevenEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "rebirthFlameEgg": {"kind":"goods","tier":3,"stack":20,"pays":10},
    "windRunnerEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "emeraldShellEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "brushPaintedEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "firstRainEgg": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "moonShadowEgg": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "blankRecipePaper": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "blackDeepPearlEgg": {"kind":"goods","tier":3,"stack":20,"pays":20},
    "rareShadeLock": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "spiralShedHorn": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "cloudFluffTuft": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "goldenDandelionSeed": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "rainbowArcLock": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "shootingStarLock": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "wholeGoldenFleece": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "goldenCreamTop": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "warmShaggyMilk": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "agedCheeseStarter": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "wildBerryCream": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "cocoaCreamTop": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "pollenCream": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "cometMilkCrystal": {"kind":"goods","tier":3,"stack":20,"pays":20}
  }$v324$::jsonb, updated_at = now()
  where key = 'items';

-- ── 2. The village's first finder of each special ───────────────────────────────────────────────────────────────────
alter table public.town_pasture add column if not exists specials jsonb not null default '{}'::jsonb;

-- ── 3. Where an animal out goes: lib/town/roam's hashStr, mix and patchKind, in 32-bit steps as the page's ──────────────
-- (two numbers below 2^32 multiplied, the low 32 bits, as Math.imul; split so that no product passes 2^48)
create or replace function town.roam_imul(p_a bigint, p_b bigint) returns bigint language sql immutable set search_path = '' as $$
  select ((p_a * (p_b & 65535)) + (((p_a * (p_b >> 16)) & 65535) << 16)) & 4294967295
$$;
create or replace function town.roam_hash(p_s text) returns bigint language plpgsql immutable set search_path = '' as $$
declare h bigint := 2166136261; i integer;
begin
  for i in 1..coalesce(length(p_s), 0) loop h := town.roam_imul(h # ascii(substr(p_s, i, 1)), 16777619); end loop;
  return h;
end $$;
create or replace function town.roam_mix(variadic p_n bigint[]) returns double precision language plpgsql immutable set search_path = '' as $$
declare h bigint := 2654435769; k bigint;
begin
  foreach k in array p_n loop
    h := h # ((k + 2135587861 + ((h << 6) & 4294967295) + (h >> 2)) & 4294967295);
    h := town.roam_imul(h # (h >> 15), 2246822507);
  end loop;
  return h / 4294967296.0::double precision;
end $$;
create or replace function town.roam_kind(p_seed bigint, p_species text, p_k bigint) returns text language sql immutable set search_path = '' as $$
  select case when p_species = 'duck' and town.roam_mix(p_seed, p_k, 21) < 0.3 then 'pond'
    when town.roam_mix(p_seed, p_k, 22) < 0.55 then 'garden' else 'meadow' end
$$;

-- ── 4. The care score, and the Quality range with it: lib/town/animals' careScore and rangeOf ───────────────────────
create or replace function town.animal_care_score(p_a jsonb, p_k jsonb) returns integer language plpgsql stable set search_path = '' as $$
declare c jsonb := p_k->'specials'->'care'; steps jsonb := p_k->'specials'->'steps'->(p_a->>'species'); g integer := 0; body double precision; i integer;
begin
  if steps is not null and jsonb_typeof(p_a->'body') = 'number' then
    body := (p_a->>'body')::double precision;
    for i in 1..jsonb_array_length(steps) - 1 loop if body >= (steps->>i)::double precision - 0.005 then g := i; end if; end loop;
  end if;
  return least((c->>'most')::integer, case when steps is null then 0 else (c->'size'->>g)::integer end
    + least((c->>'fed')::integer, greatest(0, floor(coalesce(case when jsonb_typeof(p_a->'streak') = 'number' then (p_a->>'streak')::double precision end, 0))::integer)));
end $$;
create or replace function town.animal_range(p_a jsonb, p_k jsonb) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('floor', greatest(0, c - (q->>'spread')::integer
      + least(coalesce((p_k->'specials'->'care'->>'lift')::integer, (q->>'narrowest')::integer),
        least((q->>'narrowest')::integer, coalesce((p_a->>'narrow')::integer, 0)) + town.animal_care_score(p_a, p_k))), 'ceiling', c)
    from (select p_k->'knobs'->'quality' as q) qq,
    lateral (select least(100, (q->>'base')::integer + (q->>'perHeart')::integer
      * least((p_k->'knobs'->>'hearts')::integer, floor((p_a->>'hearts')::double precision / (p_k->'knobs'->>'perHeart')::double precision)::integer)) as c) cc
$$;
-- (the coop's eggs: fewer on a miss, never none)
create or replace function town.animal_units(p_game text, p_banked integer, p_play jsonb, p_cracked integer) returns jsonb language sql immutable set search_path = '' as $$
  select case when p_banked <= 0 then jsonb_build_object('units', 0, 'whole', false)
    when p_game = 'eggs' then jsonb_build_object('units', greatest(1, p_banked - greatest(0, least(p_banked, coalesce(p_cracked, 0)))), 'whole', false)
    when p_game = 'shear' then jsonb_build_object('units', 3 + town.js_round(2 * sc) + case when sc >= 0.95 then 2 else 0 end, 'whole', sc >= 0.95)
    else jsonb_build_object('units', p_banked * (2 + town.js_round(3 * sc)), 'whole', false) end
    from (select case when coalesce((p_play->>'hits')::double precision, 0) + coalesce((p_play->>'misses')::double precision, 0) > 0
      then greatest(0, least(1, (p_play->>'hits')::double precision / ((p_play->>'hits')::double precision + (p_play->>'misses')::double precision))) else 0 end as sc) x
$$;

-- ── 5. A round: lib/town/specials' notes, strip, habit and chance ───────────────────────────────────────────────────
-- (a round's notes with a thing put in its trough: the last eight, each once)
create or replace function town.special_ate(p_round jsonb, p_item text) returns jsonb language sql immutable set search_path = '' as $$
  select r || jsonb_build_object('ate', case when ate ? p_item then ate
      else (select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(ate || to_jsonb(p_item)) with ordinality e(x, o) where o > jsonb_array_length(ate) + 1 - 8) end)
    from (select coalesce(case when jsonb_typeof(p_round) = 'object' then p_round end, '{}'::jsonb) r) rr,
    lateral (select coalesce(case when jsonb_typeof(r->'ate') = 'array' then r->'ate' end, '[]'::jsonb) ate) aa
$$;
-- (ten hearts, and a pet and a treat today)
create or replace function town.special_full_heart(p_a jsonb, p_k jsonb) returns boolean language sql immutable set search_path = '' as $$
  select floor((p_a->>'hearts')::double precision / (p_k->'knobs'->>'perHeart')::double precision) >= (p_k->'knobs'->>'hearts')::integer
    and coalesce((p_a->'today'->>'pet')::boolean, false) and coalesce((p_a->'today'->>'treat')::boolean, false)
$$;
-- (an animal after a care: a friend's is company, a heart full today the round's)
create or replace function town.special_cared(p_a jsonb, p_k jsonb, p_friend boolean) returns jsonb language sql immutable set search_path = '' as $$
  select case when p_friend or full_ then p_a || jsonb_build_object('round', coalesce(case when jsonb_typeof(p_a->'round') = 'object' then p_a->'round' end, '{}'::jsonb)
      || case when p_friend then '{"friend": true}'::jsonb else '{}'::jsonb end || case when full_ then '{"heart": true}'::jsonb else '{}'::jsonb end)
    else p_a end
    from (select town.special_full_heart(p_a, p_k) full_) f
$$;
-- (some rain, and some strong wind (its speed and half its gusts, or a storm), in a stretch of the town's weather)
create or replace function town.special_sky(p_from double precision, p_to double precision, p_wind double precision) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('rain', coalesce(bool_or(w.sky in ('drizzle', 'rain', 'storm')), false),
    'wind', coalesce(bool_or(w.sky = 'storm' or w.wind + w.gust / 2 >= p_wind), false))
    from public.town_weather w where w.slot between floor(p_from / 900000)::bigint and floor(p_to / 900000)::bigint
$$;
-- (where it went while out, by kind: each stretch of ten minutes its door stood open in the span, but those of the night
-- (19:00 to 05:00 Bangkok) past the first of an outing, where it lies down; never out: the barn)
create or replace function town.special_places(p_a jsonb, p_door jsonb, p_from double precision, p_to double precision, p_bands integer) returns jsonb language plpgsql immutable set search_path = '' as $$
declare seed bigint; off bigint; d jsonb; x double precision; y double precision; k bigint; k0 bigint; k1 bigint; kinds text[] := '{}'; kind text; hr integer;
begin
  if coalesce(p_bands, 0) = 0 then return '["barn"]'::jsonb; end if;
  seed := town.roam_hash(p_a->>'id'); off := seed % 600000;
  for d in select e from jsonb_array_elements(coalesce(p_door, '[]'::jsonb)) e loop
    x := greatest((d->>0)::double precision, p_from); y := least(coalesce((d->>1)::double precision, p_to), p_to);
    continue when y <= x;
    k0 := floor((x + off) / 600000); k1 := floor((y - 1 + off) / 600000);
    k := k0;
    while k <= k1 and coalesce(array_length(kinds, 1), 0) < 3 loop
      hr := ((floor(greatest(x, k * 600000 - off))::bigint + 25200000) % 86400000) / 3600000;
      if k = k0 or not (hr >= 19 or hr < 5) then
        kind := town.roam_kind(seed, p_a->>'species', k);
        if not kind = any(kinds) then kinds := kinds || kind; end if;
      end if;
      k := k + 1;
    end loop;
  end loop;
  return (select coalesce(jsonb_agg(p order by o), '[]'::jsonb) from unnest(array['garden', 'meadow', 'pond', 'barn']) with ordinality u(p, o) where p = any(kinds));
end $$;
-- (whether another member's animal of its kind, of any age, was out while it was: their door and mine open at once in
-- the span; a kept growth is no measure of what another's animal is now)
create or replace function town.special_together(p_a jsonb, p_door jsonb, p_from double precision, p_to double precision, p_now double precision, p_k jsonb) returns boolean language sql stable set search_path = '' as $$
  with mine as (
    select greatest((e->>0)::double precision, p_from) x, least(coalesce((e->>1)::double precision, p_to), p_to) y from jsonb_array_elements(coalesce(p_door, '[]'::jsonb)) e
  )
  select exists (
    select 1 from public.town_herds h
     where h.owner::text <> p_a->>'owner'
       and exists (select 1 from public.town_animals t where t.owner = h.owner and t.a->>'species' = p_a->>'species' and coalesce(t.a->>'home', 'barn') <> 'pen'
         and (t.a->>'born')::double precision <= p_now)
       and exists (select 1 from jsonb_array_elements(coalesce(h.h->'door', '[]'::jsonb)) e, mine m
         where m.y > m.x and greatest(m.x, (e->>0)::double precision) < least(m.y, coalesce((e->>1)::double precision, p_to), p_to)))
$$;
-- (a round's strip as it stands at its collection, the special not yet rolled)
create or replace function town.special_strip(p_a jsonb, p_door jsonb, p_now double precision, p_k jsonb) returns jsonb language plpgsql stable set search_path = '' as $$
declare kn jsonb := p_k->'specials'->'knobs'; from_ double precision; bands integer := coalesce((p_a->>'outBands')::integer, 0); sky jsonb;
begin
  from_ := greatest(coalesce((p_a->'round'->>'since')::double precision, (p_a->>'born')::double precision), p_now - (kn->>'lookBack')::double precision * 3600000);
  sky := town.special_sky(from_, p_now, (kn->>'wind')::double precision);
  return jsonb_build_object('at', p_now, 'bands', bands, 'places', town.special_places(p_a, p_door, from_, p_now, bands),
    'ate', coalesce(case when jsonb_typeof(p_a->'round'->'ate') = 'array' then p_a->'round'->'ate' end, '[]'::jsonb),
    'rain', sky->'rain', 'wind', sky->'wind',
    'company', coalesce((p_a->'round'->>'friend')::boolean, false) or (bands <> 0 and town.special_together(p_a, p_door, from_, p_now, p_now, p_k)),
    'heart', coalesce((p_a->'round'->>'heart')::boolean, false) or town.special_full_heart(p_a, p_k),
    'special', null, 'n', 0);
end $$;
-- (whether a round's strip meets a habit)
create or replace function town.special_met(p_habit jsonb, p_strip jsonb) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(case p_habit->>'kind'
    when 'time' then ((p_strip->>'bands')::integer & (1 << (p_habit->>'band')::integer)) <> 0
    when 'place' then p_strip->'places' ? (p_habit->>'place')
    when 'food' then p_strip->'ate' ? (p_habit->>'item')
    when 'weather' then (p_strip->>(case when p_habit->>'sky' = 'rain' then 'rain' else 'wind' end))::boolean
    when 'company' then (p_strip->>'company')::boolean
    when 'heart' then (p_strip->>'heart')::boolean end, false)
$$;
-- (a round's chance of its special: a day's share by its cycle, the care, the habit, a gold coat; at most the cap)
create or replace function town.special_chance(p_a jsonb, p_k jsonb, p_met boolean) returns double precision language sql stable set search_path = '' as $$
  select case when p_k->'specials'->'breeds'->(p_a->>'breed') is null then 0::double precision else
    least((kn->>'cap')::double precision,
      (kn->'perDay'->>(p_k->'breeds'->(p_a->>'breed')->>'tier'))::double precision * (p_k->'species'->(p_a->>'species')->>'cycle')::double precision / 24
      * (0.5 + (0.5 * town.animal_care_score(p_a, p_k)) / (p_k->'specials'->'care'->>'most')::double precision)
      * case when p_met then (kn->>'habit')::double precision else 1 end
      * case when coalesce((p_a->>'gold')::boolean, false) then (kn->>'gold')::double precision else 1 end) end
    from (select p_k->'specials'->'knobs' kn) x
$$;
-- (the strips an animal keeps, one more, the newest last)
create or replace function town.special_strips(p_strips jsonb, p_strip jsonb, p_k jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(coalesce(case when jsonb_typeof(p_strips) = 'array' then p_strips end, '[]'::jsonb) || jsonb_build_array(p_strip)) with ordinality e(x, o)
   where o > jsonb_array_length(coalesce(case when jsonb_typeof(p_strips) = 'array' then p_strips end, '[]'::jsonb)) + 1 - (p_k->'specials'->'knobs'->>'strips')::integer
$$;

-- ── 6. A special at the uncle's: its produce's price, and its sales counted as its produce's (one counter) ────────────
-- (lib/town/specials' priceAs and lib/town/market's factorOf, counted and pricesTold: what it fetches is what the unit it
-- replaced would, whatever the round; town.factor_of was immutable and reads the catalog now)
create or replace function town.price_as(p_item text) returns text language sql stable set search_path = '' as $$
  select coalesce(town.cat('animals')->'specials'->'priceAs'->>p_item, p_item)
$$;
create or replace function town.factor_of(p_market jsonb, p_item text) returns integer language sql stable set search_path = '' as $$
  select coalesce((p_market->'at'->town.price_as(p_item)->>'f')::int, 100)
$$;
create or replace function town.market_count(p_item text, p_n integer) returns void language plpgsql set search_path to 'public' as $$
declare
  market jsonb; id_ text := town.price_as(p_item);
begin
  perform town.market_now();
  select t.doc into market from public.town_things t where t.key = 'market' for update;
  perform town.keep_thing('market', market || jsonb_build_object('sold',
    market->'sold' || jsonb_build_object(id_, greatest(0, coalesce((market->'sold'->>id_)::int, 0) + coalesce(p_n, 0)))));
end;
$$;
create or replace function town.prices_told(p_me uuid) returns jsonb language plpgsql set search_path to 'public' as $$
-- v253: selling or holding with buyer interest and truthful history. (v324: a special told its produce's: h.p)
declare
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  purse jsonb := town.purse_kept(p_me, false);
  told jsonb;
begin
  select coalesce(jsonb_object_agg(h.id, jsonb_build_object(
      'f', town.factor_of(market, h.id), 'floor', (things->h.p->>1)::int, 'ceil', (things->h.p->>2)::int,
      'base', (things->h.p->>4)::numeric, 'demand', town.market_demand(h.p, cur),
      'demandTrend', sign(town.market_demand(h.p, cur)-town.market_demand(h.p, cur-1))::int,
      'was', coalesce((select jsonb_agg(jsonb_build_array(l.round, coalesce((l.doc->h.p->>0)::int, 100), coalesce((l.doc->h.p->>1)::numeric, 0), l.doc->h.p->2) order by l.round)
                         from public.town_market_log l where l.round >= cur - (k->>'lately')::int and l.round < cur), '[]'::jsonb))), '{}'::jsonb)
    into told
    from (select distinct x.id, town.price_as(x.id) as p from (
            select s.v->>'item' as id from jsonb_array_elements(coalesce(purse->'bag', '[]'::jsonb)) s(v) where s.v <> 'null'::jsonb
            union all
            select l.v->>'item' from jsonb_array_elements(coalesce(purse->'left', '[]'::jsonb)) l(v)) x
           where things ? town.price_as(x.id)) h;
  return jsonb_build_object('round', cur, 'things', told);
end;
$$;

-- ── 7. The world told with the specials' first finders ──────────────────────────────────────────────────────────────
create or replace function town.animal_world(p_me uuid) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'animals', coalesce((select jsonb_agg(a.a order by a.id) from public.town_animals a), '[]'::jsonb),
    'herds', coalesce((select jsonb_agg(town.animal_herd_told(h.h, h.owner, p_me)) from public.town_herds h), '[]'::jsonb),
    'found', p.found, 'specials', p.specials, 'spells', p.spells, 'wagons', p.wagons,
    'offers', town.animal_mine(p.offers, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'offerHours')::double precision),
    'asks', town.animal_mine(p.asks, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'askHours')::double precision), 'whole', true)
    from public.town_pasture p where p.one
$$;

-- ── 8. public.town_animals, town.animal_settle and public.town_leave_quote: their live text, but for these ──────────────
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '  rear_ jsonb := case when jsonb_typeof(p_a->''rearing'') = ''object'' then p_a->''rearing'' end; fin_ jsonb := ''{}''::jsonb;',
     '  rear_ jsonb := case when jsonb_typeof(p_a->''rearing'') = ''object'' then p_a->''rearing'' end; fin_ jsonb := ''{}''::jsonb;
  heart_day boolean := false;  -- (v324: a day that closed with its heart full)'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '      if p_a->''body'' is null then rear_ := town.animal_rear_day(rear_, today, grown, food); end if;
      today := jsonb_build_object(''day'', town.day_of(floor(t)::bigint));',
     '      if p_a->''body'' is null then rear_ := town.animal_rear_day(rear_, today, grown, food); end if;
      if hearts >= most and coalesce((today->>''pet'')::boolean, false) and coalesce((today->>''treat'')::boolean, false) then heart_day := true; end if;
      today := jsonb_build_object(''day'', town.day_of(floor(t)::bigint));'],
    ['town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)', '''streak'', streak, ''outBands'', bands, ''today'', today) || fin_;',
     '''streak'', streak, ''outBands'', bands, ''today'', today) || fin_
    || case when heart_day then jsonb_build_object(''round'', coalesce(case when jsonb_typeof(p_a->''round'') = ''object'' then p_a->''round'' end, ''{}''::jsonb) || ''{"heart": true}''::jsonb) else ''{}''::jsonb end;'],
    ['public.town_animals(jsonb,text)', '  ans jsonb;
begin',
     '  ans jsonb;
  -- (v324: a round''s special and its strip)
  spc jsonb; strip_ jsonb; sn integer; chance_ double precision; ograd jsonb; obyg integer[]; first_sp boolean := false; found_sp jsonb;
begin'],
    ['public.town_animals(jsonb,text)', '      grades := ''[]''::jsonb; byg := array[0, 0, 0, 0];
      for i in 1..units loop q := town.animal_roll(r, collar); grades := grades || to_jsonb(q); byg[town.animal_grade(q) + 1] := byg[town.animal_grade(q) + 1] + 1; end loop;
      purse := town.spend(purse, (kn->''stamina''->>(sp->>''game''))::double precision, now_::bigint);
      bag := purse->''bag'';
      for i in 0..3 loop
        if byg[i + 1] > 0 and town.room_g(bag, breed->>''produce'', i) < byg[i + 1] then return town.answer(me, town.no(''room'')); end if;
        if byg[i + 1] > 0 then bag := town.put_g(bag, breed->>''produce'', byg[i + 1], i); end if;
      end loop;
      if not coalesce((an->''today''->>''manure'')::boolean, false) and town.room_g(bag, ''manure'', 0) > 0 then bag := town.put_g(bag, ''manure'', 1, 0); end if;
      find := town.animal_find(an->>''species'', coalesce((an->>''outBands'')::integer, 0), k);
      if find is not null and town.room_g(bag, find, 0) > 0 then bag := town.put_g(bag, find, 1, 0); end if;
      purse := purse || jsonb_build_object(''bag'', bag);
      an := an || jsonb_build_object(''banked'', 0, ''narrow'', 0, ''outside'', outside, ''outBands'', 0, ''today'', (an->''today'') || ''{"manure": true}''::jsonb);
      herd := herd || jsonb_build_object(''lastCare'', now_);
      got := jsonb_build_object(''item'', breed->>''produce'', ''n'', units, ''grades'', grades, ''whole'', whole_, ''find'', find);
      notes := notes || jsonb_build_array(jsonb_build_array(''animal_collect'', units, ''animals'', units * (kn->''points''->>''unit'')::integer,
        jsonb_build_object(''id'', id_, ''breed'', an->>''breed'', ''item'', breed->>''produce'', ''grades'', to_jsonb(byg), ''whole'', whole_), 0));',
     '      -- (v324: a bred breed''s special, lib/town/specials: each round collected here may turn one unit into it, of that unit''s
      -- grade; the rounds laid out on the meadow roll none. Its round''s strip is kept on it, and the round begins anew)
      spc := k->''specials''->''breeds''->(an->>''breed''); strip_ := null; sn := 0;
      if spc is not null then
        strip_ := town.special_strip(an, herd->''door'', now_, k);
        chance_ := town.special_chance(an, k, town.special_met(spc->''habit'', strip_));
        for i in 1..banked loop if random() < chance_ then sn := sn + 1; end if; end loop;
        sn := least(sn, units);
        strip_ := strip_ || jsonb_build_object(''special'', case when sn > 0 then spc->>''item'' end, ''n'', sn);
      end if;
      grades := ''[]''::jsonb; byg := array[0, 0, 0, 0]; ograd := ''[]''::jsonb; obyg := array[0, 0, 0, 0];
      for i in 1..units loop
        q := town.animal_roll(r, collar);
        if i > units - sn then ograd := ograd || to_jsonb(q); obyg[town.animal_grade(q) + 1] := obyg[town.animal_grade(q) + 1] + 1;
        else grades := grades || to_jsonb(q); byg[town.animal_grade(q) + 1] := byg[town.animal_grade(q) + 1] + 1; end if;
      end loop;
      purse := town.spend(purse, (kn->''stamina''->>(sp->>''game''))::double precision, now_::bigint);
      bag := purse->''bag'';
      -- (room asked as if every unit were its produce, before a special takes a place: a bag too full for the collection is
      -- refused whatever the special''s roll, so that a retry cannot fish for one)
      for i in 0..3 loop
        if byg[i + 1] + obyg[i + 1] > 0 and town.room_g(bag, breed->>''produce'', i) < byg[i + 1] + obyg[i + 1] then return town.answer(me, town.no(''room'')); end if;
      end loop;
      for i in 0..3 loop
        if byg[i + 1] > 0 and town.room_g(bag, breed->>''produce'', i) < byg[i + 1] then return town.answer(me, town.no(''room'')); end if;
        if byg[i + 1] > 0 then bag := town.put_g(bag, breed->>''produce'', byg[i + 1], i); end if;
      end loop;
      for i in 0..3 loop
        if obyg[i + 1] > 0 and town.room_g(bag, spc->>''item'', i) < obyg[i + 1] then return town.answer(me, town.no(''room'')); end if;
        if obyg[i + 1] > 0 then bag := town.put_g(bag, spc->>''item'', obyg[i + 1], i); end if;
      end loop;
      if not coalesce((an->''today''->>''manure'')::boolean, false) and town.room_g(bag, ''manure'', 0) > 0 then bag := town.put_g(bag, ''manure'', 1, 0); end if;
      find := town.animal_find(an->>''species'', coalesce((an->>''outBands'')::integer, 0), k);
      if find is not null and town.room_g(bag, find, 0) > 0 then bag := town.put_g(bag, find, 1, 0); end if;
      purse := purse || jsonb_build_object(''bag'', bag);
      -- (the book: my count of the breed''s special found, and the village''s first finder)
      if sn > 0 then
        found_sp := case when jsonb_typeof(purse->''animalSpecials'') = ''object'' then purse->''animalSpecials'' else ''{}''::jsonb end;
        purse := purse || jsonb_build_object(''animalSpecials'', found_sp || jsonb_build_object(an->>''breed'', coalesce((found_sp->>(an->>''breed''))::integer, 0) + 1));
        if not (coalesce(pas.specials, ''{}''::jsonb) ? (an->>''breed'')) then
          first_sp := true;
          update public.town_pasture p set specials = coalesce(p.specials, ''{}''::jsonb) || jsonb_build_object(an->>''breed'', jsonb_build_object(''by'', me::text, ''at'', now_)), changed = now_::bigint where p.one;
        end if;
      end if;
      an := an || jsonb_build_object(''banked'', 0, ''narrow'', 0, ''outside'', outside, ''outBands'', 0, ''today'', (an->''today'') || ''{"manure": true}''::jsonb, ''round'', jsonb_build_object(''since'', now_))
        || case when strip_ is not null then jsonb_build_object(''strips'', town.special_strips(an->''strips'', strip_, k)) else ''{}''::jsonb end;
      herd := herd || jsonb_build_object(''lastCare'', now_);
      got := jsonb_build_object(''item'', breed->>''produce'', ''n'', units - sn, ''grades'', grades, ''whole'', whole_, ''find'', find,
        ''special'', case when sn > 0 then jsonb_build_object(''item'', spc->>''item'', ''n'', sn, ''grades'', ograd) end, ''strip'', strip_, ''firstSpecial'', first_sp);
      notes := notes || jsonb_build_array(jsonb_build_array(''animal_collect'', units, ''animals'', units * (kn->''points''->>''unit'')::integer,
        jsonb_build_object(''id'', id_, ''breed'', an->>''breed'', ''item'', breed->>''produce'', ''grades'', to_jsonb(byg), ''whole'', whole_)
          || case when sn > 0 then jsonb_build_object(''special'', spc->>''item'', ''sn'', sn, ''sgrades'', to_jsonb(obyg)) else ''{}''::jsonb end, 0));'],
    ['public.town_animals(jsonb,text)', '        an := an || jsonb_build_object(''food'', (an->>''food'')::double precision + hours,
          ''narrow'', greatest(coalesce((an->>''narrow'')::integer, 0), coalesce((kn->''quality''->''narrowBy''->>grade_)::integer, 0)));',
     '        an := an || jsonb_build_object(''food'', (an->>''food'')::double precision + hours,
          ''narrow'', greatest(coalesce((an->>''narrow'')::integer, 0), coalesce((kn->''quality''->''narrowBy''->>grade_)::integer, 0)));
        -- (v324: what went into its trough is its round''s to tell, and a friend''s food is company)
        an := an || jsonb_build_object(''round'', town.special_ate(an->''round'', item) || case when helper then ''{"friend": true}''::jsonb else ''{}''::jsonb end);'],
    ['public.town_animals(jsonb,text)', '      an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>act)::double precision, k), ''today'', (an->''today'') || jsonb_build_object(act, true));',
     '      an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>act)::double precision, k), ''today'', (an->''today'') || jsonb_build_object(act, true));
      -- (v324: a friend''s care is company, and a heart full today is its round''s)
      an := town.special_cared(an, k, helper);'],
    ['public.town_animals(jsonb,text)', '        an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>''pet'')::double precision, k), ''today'', (an->''today'') || ''{"pet": true}''::jsonb);',
     '        an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>''pet'')::double precision, k), ''today'', (an->''today'') || ''{"pet": true}''::jsonb);
        an := town.special_cared(an, k, false);'],
    ['public.town_animals(jsonb,text)', '      ''found'', pas.found, ''spells'', pas.spells, ''wagons'', pas.wagons,',
     '      ''found'', pas.found, ''specials'', pas.specials, ''spells'', pas.spells, ''wagons'', pas.wagons,'],
    ['public.town_leave_quote(integer,integer,text,integer,integer,numeric)', 'coalesce(market->''sold'',''{}''::jsonb)||jsonb_build_object(item_,
    greatest(0,coalesce((market->''sold''->>item_)::integer,0)+p_n))));',
     'coalesce(market->''sold'',''{}''::jsonb)||jsonb_build_object(town.price_as(item_),
    greatest(0,coalesce((market->''sold''->>town.price_as(item_))::integer,0)+p_n))));']
  ] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v324: % has % of [%], not 1: rebuild v324', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

-- ── 9. Who may call what: the rules are no browser's ─────────────────────────────────────────────────────────────────
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_animals(jsonb, text) from public, anon;
grant execute on function public.town_animals(jsonb, text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select jsonb_typeof(data->'specials') as specials, jsonb_array_length(data->'graded') as graded,
--          (select count(*) from jsonb_object_keys(data->'specials'->'breeds')) as breeds
--     from public.town_catalog where key = 'animals';
--   -- object | 68 | 28
--
--   select count(*) filter (where data ? k) as things from public.town_catalog,
--          unnest(array['silkieTwinEgg', 'dawnBlueEgg', 'cocoaShellEgg', 'fireflyEgg', 'swirlCloudEgg', 'luckySevenEgg', 'rebirthFlameEgg', 'windRunnerEgg', 'emeraldShellEgg', 'brushPaintedEgg', 'firstRainEgg', 'moonShadowEgg', 'blankRecipePaper', 'blackDeepPearlEgg', 'rareShadeLock', 'spiralShedHorn', 'cloudFluffTuft', 'goldenDandelionSeed', 'rainbowArcLock', 'shootingStarLock', 'wholeGoldenFleece', 'goldenCreamTop', 'warmShaggyMilk', 'agedCheeseStarter', 'wildBerryCream', 'cocoaCreamTop', 'pollenCream', 'cometMilkCrystal']) k where key = 'items';
--   -- 28
--
--   select column_name, data_type, column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'town_pasture' and column_name = 'specials';
--   -- specials | jsonb | '{}'::jsonb
--
--   select town.animal_units('eggs', 2, null, 2) as eggs, town.roam_kind(town.roam_hash('a'), 'duck', 1) as kind,
--          town.special_chance('{"breed": "goldenFleece", "species": "sheep", "body": 2.9, "streak": 9, "gold": true}'::jsonb, town.cat('animals'), true) as cap;
--   -- {"units": 1, "whole": false} | meadow | 0.5
--
--   select has_function_privilege('authenticated', 'public.town_animals(jsonb, text)', 'execute') as member,
--          has_function_privilege('anon', 'public.town_animals(jsonb, text)', 'execute') as anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- specials found, by the day and the breed
--   select date_trunc('day', d.at) as day, d.doc->>'special' as special, sum((d.doc->>'sn')::integer) as n, count(distinct d.member_id) as members
--     from public.town_deeds d where d.what = 'animal_collect' and d.doc ? 'special' group by 1, 2 order by 1 desc, 3 desc;
--
--   -- each special's first finder
--   select e.key as breed, p.character_name, to_timestamp((e.value->>'at')::double precision / 1000) as at
--     from public.town_pasture t, jsonb_each(t.specials) e left join public.profiles p on p.id = (e.value->>'by')::uuid where t.one order by at;
