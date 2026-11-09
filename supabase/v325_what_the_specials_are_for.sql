-- v325 — what the specials are for: ten dishes, five buffs, the legend feast, and the wool, the paper and the rain
--
-- Run this once in the Supabase SQL editor, after v324 (the specials). Running it again is safe: it changes nothing more.
--
-- The idea patch's stage 3 (the owner, 2026-11-09: "นอกนั้นเห็นด้วยกับ claude", "ทำทั้งหมดได้เลย"; the rule that every new thing
-- has a real use). What the 28 specials of v324 are for, as lib/town/special-uses and lib/town/special-dishes have it:
--
--   * Ten dishes (the catalog's dishes, items, scrolls, cooking and work rows, entry by entry): seven with a fantasy breed's
--     special as their secret, last thing (fireflyCustard, cloudPancake, luckyFriedRice, moonSesamePudding, berryCreamScones,
--     cocoaMousse, pollenTart; two want specials of two animals), and the legend feast's three (phoenixBake, pearlBroth,
--     milkyWayCake: four cooks, twenty helpings). Their scrolls are written only, on a blank recipe paper.
--   * Five buffs (the stamina row's steps): gentle (a pet or a treat, +20 to +80% hearts: public.town_animals), aroma and
--     featherlight and moon sight (the page's own games and walking), lucky match (a breeding's odds +5 to +20 points, never
--     past three times the breed's own nor the cap: town.matched_odds, public.town_animals).
--   * The real breeds' specials stand in for an egg or milk (the animals row's family) and carry their breed's second buff
--     into a recipe's pot (town.carry_of, town.cook_v205), one a pot, to whoever eats of it at the feast table: a meal's buff
--     (town.chew).
--   * The legend feast eaten together: a helping of a legend pot begun at the table is written down (public.town_feast_began);
--     at its end, three or more who began a helping of it within five minutes of each other each have its buff a level more
--     (town.eaten_together, town.chew).
--   * The wool at the feast table (town_things 'feast_dress'): cushions (24 h; a companion more for whoever eats there), the
--     golden tablecloth (24 h; every pot on the table a meal's hours more, the one before kept beside it for its pots
--     when it is laid after that one had gone; the whole town is told: town.announce, a kind
--     'cloth' more in the announcements' check), a star-wool cover over a
--     pot (a meal's hours more): public.town_feast_dress, public.town_pot_cover, town.table_ends, town.pots_tidy.
--   * At Granny Twilla's the three wools take a piece's price down by what that wool would fetch (public.town_tailor_buy with
--     p_wool); the first-rain egg thrown onto the farm waters the nine plots about it once (public.town_rain_egg); a blank recipe
--     paper is written with a dish its cook has made, for the ink (the coins its scroll fetches over the paper's own, none
--     for about half) (public.town_write_scroll); the golden dandelion is a crop of its seed and
--     a rare page of the village's farm book (town.garden_harvest).
--   * public.town_uses_read(): whether the specials have their uses, and what is laid on the feast table.
--
-- What it writes: the catalog's 'uses' row whole, and in eleven rows only the entries above; a table (town_feast_began, closed); one kind more
-- ('cloth') in town_announcements' kind check;
-- town.pot_marks, town.feast_eat, town.pots_tidy, public.town_feast_eat and the two-word public.town_tailor_buy written again
-- whole; town.chew, town.cook_v205, town.garden_harvest, public.town_animals, public.town_kitchen and town.deed_th from their
-- live text but for the lines below; new rules and calls as listed. A page from before v325 is told nothing new and offers
-- nothing of it; a page with the code and a database without the file asks town_uses_read, is answered nothing, and offers
-- nothing either.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

do $guard$ begin
  if to_regprocedure('town.special_chance(jsonb,jsonb,boolean)') is null or to_regprocedure('town.price_as(text)') is null
    then raise exception 'v325: run v324 (the specials) first'; end if;
  if to_regprocedure('public.town_feast_eat(bigint,integer,integer,boolean)') is null or to_regprocedure('town.pots_tidy(bigint)') is null
     or to_regprocedure('public.town_tailor_buy(text,uuid)') is null or to_regprocedure('public.town_ditch(integer,integer)') is null
    then raise exception 'v325: the feast table (v159), the tailor (v297) and the ditch (v130) must be there'; end if;
end $guard$;

-- ── 1. The catalog: the 'uses' row, and what v325 adds to the others ───────────────────────────────────────────────
insert into public.town_catalog (key, data) values ('uses', $v325${"together":{"within":300000,"people":3,"levels":1,"keep":86400000},"rain":{"item":"firstRainEgg","reach":1},"paper":"blankRecipePaper","cushion":{"item":"cloudFluffTuft","hours":24,"company":1},"cover":{"item":"shootingStarLock","meals":1},"cloth":{"item":"wholeGoldenFleece","hours":24,"meals":1},"tailor":["rareShadeLock","spiralShedHorn","rainbowArcLock"],"night":[19,5],"carry":{"silkieTwinEgg":"gentle","dawnBlueEgg":"keen","cocoaShellEgg":"hearty","windRunnerEgg":"featherlight","emeraldShellEgg":"current","brushPaintedEgg":"lucky","goldenCreamTop":"calm","warmShaggyMilk":"green","agedCheeseStarter":"aroma"},"legend":["phoenixBake","pearlBroth","milkyWayCake"],"rareFlowers":["goldenDandelion"],"paperPays":15}$v325$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
update public.town_catalog set data = data || $v325${"fireflyCustard":{"kind":"dish","tier":3,"stack":20,"pays":40},"cloudPancake":{"kind":"dish","tier":3,"stack":20,"pays":44},"luckyFriedRice":{"kind":"dish","tier":3,"stack":20,"pays":44},"moonSesamePudding":{"kind":"dish","tier":3,"stack":20,"pays":44},"berryCreamScones":{"kind":"dish","tier":3,"stack":20,"pays":38},"cocoaMousse":{"kind":"dish","tier":3,"stack":20,"pays":42},"pollenTart":{"kind":"dish","tier":3,"stack":20,"pays":38},"phoenixBake":{"kind":"dish","tier":3,"stack":20,"pays":70},"pearlBroth":{"kind":"dish","tier":3,"stack":20,"pays":80},"milkyWayCake":{"kind":"dish","tier":3,"stack":20,"pays":90},"scrollFireflyCustard":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollCloudPancake":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollLuckyFriedRice":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollMoonSesamePudding":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollBerryCreamScones":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollCocoaMousse":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollPollenTart":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollPhoenixBake":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollPearlBroth":{"kind":"scroll","tier":3,"stack":1,"pays":15},"scrollMilkyWayCake":{"kind":"scroll","tier":3,"stack":1,"pays":15},"goldenDandelion":{"kind":"crop","tier":3,"stack":20,"pays":30}}$v325$::jsonb, updated_at = now() where key = 'items';
update public.town_catalog set data = data || $v325${"fireflyCustard":{"stamina":36,"buff":"moonSight","recipe":{"needs":[["milk",1],["sugar",1],["fireflyEgg",1]],"in":["steamer"],"serves":3,"cooks":1}},"cloudPancake":{"stamina":38,"buff":"featherlight","recipe":{"needs":[["flour",1],["milk",1],["butter",1],["swirlCloudEgg",1]],"in":["panBrass"],"serves":3,"cooks":1}},"luckyFriedRice":{"stamina":40,"buff":"lucky","recipe":{"needs":[["rice",3],["chili",1],["oil",1],["luckySevenEgg",1]],"in":["wok"],"serves":3,"cooks":1}},"moonSesamePudding":{"stamina":38,"buff":"luckyMatch","recipe":{"needs":[["sesame",2],["cream",1],["sugar",1],["moonShadowEgg",1]],"in":["steamer"],"serves":3,"cooks":1}},"berryCreamScones":{"stamina":36,"buff":"gentle","recipe":{"needs":[["flour",2],["butter",1],["sugar",1],["wildBerryCream",1]],"in":["rollingPin","oven"],"serves":6,"cooks":2}},"cocoaMousse":{"stamina":36,"buff":"aroma","recipe":{"needs":[["swirlCloudEgg",1],["sugar",1],["cocoaCreamTop",1]],"in":["pot","stoneBowl"],"serves":4,"cooks":2}},"pollenTart":{"stamina":36,"buff":"scent","recipe":{"needs":[["flour",1],["butter",1],["gardenHoney",1],["pollenCream",1]],"in":["rollingPin","oven"],"serves":6,"cooks":2}},"phoenixBake":{"stamina":48,"buff":"hearty","recipe":{"needs":[["egg",6],["cream",2],["chili",2],["rebirthFlameEgg",1]],"in":["oven","cleaver","panBrass","pot"],"serves":20,"cooks":4}},"pearlBroth":{"stamina":48,"buff":"lucky","recipe":{"needs":[["fishStock",2],["seaweed",3],["prawn",2],["ginger",1],["blackDeepPearlEgg",1]],"in":["hotpot","cleaver","mortar","steamer"],"serves":20,"cooks":4}},"milkyWayCake":{"stamina":50,"buff":"featherlight","recipe":{"needs":[["flour",3],["butter",2],["sugar",2],["moonShadowEgg",2],["cometMilkCrystal",1]],"in":["oven","stoneBowl","rollingPin","pot"],"serves":20,"cooks":4}}}$v325$::jsonb, updated_at = now() where key = 'dishes';
update public.town_catalog set data = data || $v325${"scrollFireflyCustard":"fireflyCustard","scrollCloudPancake":"cloudPancake","scrollLuckyFriedRice":"luckyFriedRice","scrollMoonSesamePudding":"moonSesamePudding","scrollBerryCreamScones":"berryCreamScones","scrollCocoaMousse":"cocoaMousse","scrollPollenTart":"pollenTart","scrollPhoenixBake":"phoenixBake","scrollPearlBroth":"pearlBroth","scrollMilkyWayCake":"milkyWayCake"}$v325$::jsonb, updated_at = now() where key = 'scrolls';
update public.town_catalog set data = data || $v325${"goldenDandelion":{"seed":"goldenDandelionSeed","hours":48,"yield":[1,2],"again":null,"picks":1}}$v325$::jsonb, updated_at = now() where key = 'crops';
update public.town_catalog set data = jsonb_set(data, '{family}', coalesce(data #> '{family}', '{}'::jsonb) || $v325${"silkieTwinEgg":"egg","dawnBlueEgg":"egg","cocoaShellEgg":"egg","windRunnerEgg":"egg","emeraldShellEgg":"egg","brushPaintedEgg":"egg","goldenCreamTop":"milk","warmShaggyMilk":"milk","agedCheeseStarter":"milk"}$v325$::jsonb), updated_at = now() where key = 'animals';
update public.town_catalog set data = jsonb_set(data, '{farmFamily}', coalesce(data #> '{farmFamily}', '{}'::jsonb) || $v325${"goldenCreamTop":"farmMilk","warmShaggyMilk":"farmMilk","agedCheeseStarter":"farmMilk"}$v325$::jsonb), updated_at = now() where key = 'animals';
update public.town_catalog set data = jsonb_set(data, '{needs}', coalesce(data #> '{needs}', '{}'::jsonb) || $v325${"fireflyCustard":{"fireflyEgg":1,"milk":1,"sugar":1},"cloudPancake":{"butter":1,"flour":1,"milk":1,"swirlCloudEgg":1},"luckyFriedRice":{"chili":1,"luckySevenEgg":1,"oil":1,"rice":3},"moonSesamePudding":{"cream":1,"moonShadowEgg":1,"sesame":2,"sugar":1},"berryCreamScones":{"butter":1,"flour":2,"sugar":1,"wildBerryCream":1},"cocoaMousse":{"cocoaCreamTop":1,"sugar":1,"swirlCloudEgg":1},"pollenTart":{"butter":1,"flour":1,"gardenHoney":1,"pollenCream":1},"phoenixBake":{"chili":2,"cream":2,"egg":6,"rebirthFlameEgg":1},"pearlBroth":{"blackDeepPearlEgg":1,"fishStock":2,"ginger":1,"prawn":2,"seaweed":3},"milkyWayCake":{"butter":2,"cometMilkCrystal":1,"flour":3,"moonShadowEgg":2,"sugar":2}}$v325$::jsonb), updated_at = now() where key = 'cooking';
update public.town_catalog set data = jsonb_set(data, '{seeds}', coalesce(data #> '{seeds}', '{}'::jsonb) || $v325${"goldenDandelionSeed":"goldenDandelion"}$v325$::jsonb), updated_at = now() where key = 'farming';
update public.town_catalog set data = jsonb_set(data, '{tools}', coalesce(data #> '{tools}', '{}'::jsonb) || $v325${"goldenDandelionSeed":"seed"}$v325$::jsonb), updated_at = now() where key = 'farming';
update public.town_catalog set data = jsonb_set(data, '{partners}', coalesce(data #> '{partners}', '{}'::jsonb) || $v325${"goldenDandelion":"marigold"}$v325$::jsonb), updated_at = now() where key = 'quality';
update public.town_catalog set data = jsonb_set(data, '{buffs}', coalesce(data #> '{buffs}', '{}'::jsonb) || $v325${"gentle":0.2,"aroma":0.3,"featherlight":0.05,"moonSight":1,"luckyMatch":5}$v325$::jsonb), updated_at = now() where key = 'stamina';
update public.town_catalog set data = jsonb_set(data, '{steps}', coalesce(data #> '{steps}', '{}'::jsonb) || $v325${"gentle":[0.2,0.4,0.6,0.8],"aroma":[0.3,0.5,0.7,1],"featherlight":[0.05,0.1,0.15,0.2],"moonSight":[1,2,3,4],"luckyMatch":[5,10,15,20]}$v325$::jsonb), updated_at = now() where key = 'stamina';
update public.town_catalog set data = jsonb_set(data, '{farming}', coalesce(data #> '{farming}', '{}'::jsonb) || $v325${"goldenDandelion":4}$v325$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(data, '{farmingAgain}', coalesce(data #> '{farmingAgain}', '{}'::jsonb) || $v325${"goldenDandelion":4}$v325$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(data, '{farmingCells}', coalesce(data #> '{farmingCells}', '{}'::jsonb) || $v325${"goldenDandelion":1}$v325$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(data, '{kitchen,pot}', coalesce(data #> '{kitchen,pot}', '{}'::jsonb) || $v325${"fireflyCustard":3,"cloudPancake":5,"luckyFriedRice":4,"moonSesamePudding":5,"berryCreamScones":9,"cocoaMousse":5,"pollenTart":10,"phoenixBake":24,"pearlBroth":24,"milkyWayCake":24}$v325$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(data, '{bowled}', coalesce(data #> '{bowled}', '[]'::jsonb)
    || coalesce((select jsonb_agg(n.v order by n.o) from jsonb_array_elements_text($v325$["fireflyCustard","cloudPancake","luckyFriedRice","moonSesamePudding","berryCreamScones","cocoaMousse","pollenTart","phoenixBake","pearlBroth","milkyWayCake"]$v325$::jsonb) with ordinality n(v, o) where not coalesce(data #> '{bowled}', '[]'::jsonb) ? n.v), '[]'::jsonb)), updated_at = now()
  where key = 'cooking';
update public.town_catalog set data = jsonb_set(data, '{recipes}', coalesce(data #> '{recipes}', '[]'::jsonb)
    || coalesce((select jsonb_agg(n.v order by n.o) from jsonb_array_elements_text($v325$["fireflyCustard","cloudPancake","luckyFriedRice","moonSesamePudding","berryCreamScones","cocoaMousse","pollenTart","phoenixBake","pearlBroth","milkyWayCake"]$v325$::jsonb) with ordinality n(v, o) where not coalesce(data #> '{recipes}', '[]'::jsonb) ? n.v), '[]'::jsonb)), updated_at = now()
  where key = 'cooking';
-- (the farm's pouch holds the golden dandelion too: the pouch whose gift is thingPouch)
update public.town_catalog c set data = jsonb_set(c.data, array[e.i::text, 'holds'], (c.data->e.i->'holds') || '"goldenDandelion"'::jsonb), updated_at = now()
  from (select (x.o - 1)::int as i from public.town_catalog p, jsonb_array_elements(p.data) with ordinality x(v, o)
         where p.key = 'pouches' and x.v->>'gift' = 'thingPouch' and not (x.v->'holds') ? 'goldenDandelion') e
 where c.key = 'pouches';

-- ── 2. The beginnings of helpings of the legend's pots, to tell whether they were eaten together ────────────────────
create table if not exists public.town_feast_began (
  pot text not null,
  member_id uuid not null,
  at bigint not null
);
create index if not exists town_feast_began_pot on public.town_feast_began (pot, at);
alter table public.town_feast_began enable row level security;
revoke all on public.town_feast_began from public, anon, authenticated;
insert into public.town_things (key, doc) values ('feast_dress', '{}'::jsonb) on conflict (key) do nothing;
-- The golden tablecloth is told to the whole town as its other news is (town.announce: the banner and the chat's line): one
-- kind more for the announcements, the kinds already allowed read from the check as it stands, so none is lost.
do $kinds$
declare d text; kinds text[];
begin
  select pg_get_constraintdef(c.oid) into d from pg_constraint c
   where c.conrelid = 'public.town_announcements'::regclass and c.conname = 'town_announcements_kind_check';
  if d is null then raise exception 'v325: the announcements have no kind check to add the golden cloth to'; end if;
  if d like '%''cloth''%' then return; end if;
  select array_agg(m[1] order by n) into kinds from regexp_matches(d, '''([a-z_]+)''', 'g') with ordinality as r(m, n);
  if kinds is null or not ('forge' = any (kinds)) or not ('casino' = any (kinds)) then
    raise exception 'v325: the announcements kind check reads %, not as v299 left it', d; end if;
  alter table public.town_announcements drop constraint town_announcements_kind_check;
  -- (written as an array of quoted words, as it was, so that a run again reads it the same way)
  execute format('alter table public.town_announcements add constraint town_announcements_kind_check check (kind = any (array[%s]))',
                 (select string_agg(quote_literal(k), ', ' order by n) from unnest(array_append(kinds, 'cloth')) with ordinality as u(k, n)));
end $kinds$;

-- ── 3. The rules (lib/town/special-uses) ──────────────────────────────────────────────────────────────────────────────
-- The second buff a recipe's pot carries: the first real breed's special in it by its id, never the dish's own; none else.
create or replace function town.carry_of(p_things jsonb, p_dish text) returns jsonb language plpgsql stable set search_path = '' as $$
declare u jsonb := town.cat('uses'); own text := town.cat('dishes')->p_dish->>'buff'; x text;
begin
  for x in select t->>0 from jsonb_array_elements(p_things) t order by (t->>0) collate "C" loop
    if coalesce(u->'carry' ? x, false) and (u->'carry'->>x) is distinct from own then return jsonb_build_object('carry', u->'carry'->>x); end if;
  end loop;
  return '{}'::jsonb;
end $$;
-- A breeding's odds with so many points of lucky match: never past three times the breed's own nor the cap, never less than without.
create or replace function town.matched_odds(p_base integer, p_dawn integer, p_points double precision, p_cap integer) returns integer
language sql immutable set search_path = '' as $$
  select case when coalesce(p_points, 0) > 0
    then greatest(least(p_cap, p_base + p_dawn), least(p_cap, 3 * p_base, p_base + p_dawn + round(p_points)::integer))
    else least(p_cap, p_base + p_dawn) end
$$;
-- What is laid on the feast table now (the cushions, the golden tablecloth), and whether one lies there at a moment.
create or replace function town.dress_now() returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select t.doc from public.town_things t where t.key = 'feast_dress'), '{}'::jsonb)
$$;
-- (the golden cloth laid before the one on the table now, when that one came after it had gone, still counts for the
-- moments it lay: the pots whose time fell then keep their meal's hours. lib/town/special-uses' laid)
create or replace function town.dress_laid(p_dress jsonb, p_kind text, p_at bigint) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(p_dress->p_kind) = 'object' and (p_dress->p_kind->>'at')::bigint <= p_at and p_at < (p_dress->p_kind->>'until')::bigint, false)
      or (p_kind = 'cloth' and coalesce(jsonb_typeof(p_dress->'clothWas') = 'object' and (p_dress->'clothWas'->>'at')::bigint <= p_at
          and p_at < (p_dress->'clothWas'->>'until')::bigint, false))
$$;
-- When a pot that came to the table at a moment is cleared: a meal's hours more for its cover, one more if the golden cloth lies there then.
create or replace function town.table_ends(p_from bigint, p_cover boolean, p_dress jsonb) returns bigint language plpgsql stable set search_path = '' as $$
declare u jsonb := town.cat('uses'); end_ bigint := town.feast_ends(p_from); n integer;
begin
  n := case when coalesce(p_cover, false) then (u->'cover'->>'meals')::integer else 0 end
     + case when town.dress_laid(p_dress, 'cloth', end_) then (u->'cloth'->>'meals')::integer else 0 end;
  for i in 1..n loop end_ := town.next_meal_at(end_); end loop;
  return end_;
end $$;
create or replace function town.pot_now(p_feast boolean, p_dish text, p_set bigint, p_now bigint, p_cover boolean, p_dress jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare ck jsonb := town.cat('cooking'); moved bigint; end_ bigint;
begin
  if p_feast then
    end_ := town.table_ends(p_set, p_cover, p_dress);
    if p_now < end_ then return jsonb_build_object('feast', true, 'from', p_set, 'until', end_); end if;
    return null;
  end if;
  moved := p_set + (ck->'feast'->>'ground')::bigint * 60000;
  if p_now < moved then return jsonb_build_object('feast', false, 'from', p_set, 'until', moved); end if;
  end_ := town.table_ends(moved, p_cover, p_dress);
  if p_dish <> ck->>'oddDish' and p_now < end_ then return jsonb_build_object('feast', true, 'from', moved, 'until', end_); end if;
  return null;
end $$;
-- Whether a helping of a legend pot begun at a moment was eaten together: some five minutes hold its beginning and the
-- beginnings of helpings of the same pot by so many members in all (each once), its own among them.
create or replace function town.eaten_together(p_pot text, p_from bigint) returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.town_feast_began w, (select town.cat('uses')->'together' as k) c
     where w.pot = p_pot and w.at <= p_from and p_from - w.at <= (c.k->>'within')::bigint
       and (select count(distinct b.member_id) from public.town_feast_began b
             where b.pot = p_pot and b.at >= w.at and b.at <= w.at + (c.k->>'within')::bigint) >= (c.k->>'people')::integer)
$$;
-- The first-rain egg held, thrown onto a plot: every plant of the nine plots about it a can could water now, with plain water; the egg gone.
create or replace function town.rain_egg(p_purse jsonb, p_plots jsonb, p_x integer, p_y integer, p_now bigint) returns jsonb
language plpgsql stable as $$
declare
  f jsonb := town.cat('farming');
  u jsonb := town.cat('uses');
  r integer := (u->'rain'->>'reach')::integer;
  keys text[];
  k text;
  p jsonb;
  plots jsonb := '{}'::jsonb;
begin
  if town.hand_of(p_purse) is distinct from u->'rain'->>'item' then return town.no('hand'); end if;
  select array_agg(e.key order by t.y, t.x) into keys
    from jsonb_each(p_plots) e, lateral (select split_part(e.key, ',', 1)::int as x, split_part(e.key, ',', 2)::int as y) t
   where abs(t.x - p_x) <= r and abs(t.y - p_y) <= r and town.deed_for(e.key, e.value, 'can', '', p_now, null) = 'water';
  if keys is null then
    return town.no(case when exists (
      select 1 from jsonb_each(p_plots) e, lateral (select split_part(e.key, ',', 1)::int as x, split_part(e.key, ',', 2)::int as y) t,
             lateral (select town.see(e.key, e.value, p_now) as s) z
       where abs(t.x - p_x) <= r and abs(t.y - p_y) <= r
         and coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (z.s->>'dead')::boolean and (z.s->>'wet')::boolean) then 'wet' else 'soil' end);
  end if;
  foreach k in array keys loop
    p := p_plots->k->'plant';
    plots := plots || jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + (f->'water'->>'adds')::double precision * 60000::double precision)));
  end loop;
  return jsonb_build_object('ok', true, 'watered', to_jsonb(keys), 'plots', plots,
    'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', u->'rain'->>'item', 1)));
end $$;

-- What a pot carries, as it is kept on a pot and on a slot alike (v261's, and v325's carried buff and star-wool cover).
create or replace function town.pot_marks(p_from jsonb) returns jsonb language sql immutable set search_path to '' as $$
 select case when jsonb_typeof(p_from->'warm')='number' and (p_from->>'warm')::numeric>0 then jsonb_build_object('warm',p_from->'warm') else '{}'::jsonb end
 ||case when jsonb_typeof(p_from->'scent')='number' and (p_from->>'scent')::numeric>0 then jsonb_build_object('scent',p_from->'scent') else '{}'::jsonb end
 ||case when p_from->>'secondary' in ('green','calm','keen') then jsonb_build_object('secondary',p_from->'secondary') else '{}'::jsonb end
 ||case when p_from->>'cookedBy' is not null and p_from->>'cookId' is not null then jsonb_build_object('cookedBy',p_from->'cookedBy','cookId',p_from->'cookId') else '{}'::jsonb end
 -- v261: the grade of what is in it
 ||case when p_from->'grade' in ('1'::jsonb,'2'::jsonb,'3'::jsonb) then jsonb_build_object('grade',p_from->'grade') else '{}'::jsonb end
 -- v325: the second buff a real breed's special carried in, and a star-wool cover over it
 ||case when p_from->>'carry' in ('gentle', 'keen', 'hearty', 'featherlight', 'current', 'lucky', 'calm', 'green', 'aroma') then jsonb_build_object('carry',p_from->'carry') else '{}'::jsonb end
 ||case when p_from->'cover' = 'true'::jsonb then '{"cover": true}'::jsonb else '{}'::jsonb end
$$;
-- A helping eaten at the feast table (v159's): with what the pot carries but its cover, which pot of a legend's it is, and
-- whether the cushions lie there.
create or replace function town.feast_eat(p_purse jsonb, p_pot jsonb, p_seated boolean, p_now bigint) returns jsonb language plpgsql stable as $$
declare
  left_ numeric := (p_pot->>'left')::numeric;
  meal jsonb;
begin
  if not coalesce((p_pot->>'feast')::boolean, false) or left_ < 1 then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (town.bowls_today(p_purse, p_now)->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  meal := town.begun(p_purse, p_pot->>'dish', p_now);
  return jsonb_build_object('ok', true, 'dish', p_pot->'dish',
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || meal || jsonb_build_object('eating', (meal->'eating') || '{"lent": true}'::jsonb
      -- ── the older tools (v174): with what the pot carries from its cookware ──
      || (town.pot_marks(p_pot) - 'cover')
      -- v325: a legend pot's helping knows its pot; the cushions on the table are a companion more
      || case when coalesce(town.cat('uses')->'legend', '[]'::jsonb) ? (p_pot->>'dish') then jsonb_build_object('pot', p_pot->>'id') else '{}'::jsonb end
      || case when town.dress_laid(town.dress_now(), 'cushions', p_now) then '{"cushion": true}'::jsonb else '{}'::jsonb end));
end $$;
-- The pots as they stand (v159's): cleared at their time, which a cover and the golden cloth put off a meal's hours each.
create or replace function town.pots_tidy(p_now bigint) returns void language plpgsql set search_path to 'public' as $$
declare
  ck jsonb := town.cat('cooking');
  tile jsonb := ck->'feast'->'tile';
  ground bigint := (ck->'feast'->>'ground')::bigint * 60000;
  dress_ jsonb := town.dress_now();
  o record;
begin
  for o in delete from public.town_pots p where town.pot_now(p.feast, p.dish, p.set_at, p_now, coalesce((p.marks->>'cover')::boolean, false), dress_) is null
           returning p.id, p.member_id, p.dish, p.helpings, p.feast loop
    perform town.note(o.member_id, 'pot_gone', o.dish, o.helpings, 0,
      jsonb_build_object('pot', o.id, 'from', case when o.feast then 'table' else 'ground' end));
  end loop;
  update public.town_pots p set feast = true, tok = false, set_at = p.set_at + ground, x = (tile->>0)::smallint, y = (tile->>1)::smallint
   where not p.feast and p_now >= p.set_at + ground;
end $$;

-- ── 4. The calls ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- A helping eaten at the feast table (v159's), and of a legend's pot its beginning written down.
create or replace function public.town_feast_eat(p_id bigint, p_x integer, p_y integer, p_seated boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  pot jsonb;
  did jsonb;
begin
  perform town.pots_tidy(now_);
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.feast_eat(purse, pot, p_seated, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  -- (v325: of a legend's pot, the beginning written down; a day's are kept)
  if coalesce(town.cat('uses')->'legend', '[]'::jsonb) ? (pot->>'dish') then
    insert into public.town_feast_began (pot, member_id, at) values (p_id::text, me, now_);
    delete from public.town_feast_began b where b.at < now_ - (town.cat('uses')->'together'->>'keep')::bigint;
  end if;
  perform town.note(me, 'ladle', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id, 'bowl', 'table') || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  perform town.note(me, 'eat', pot->>'dish', 1, 0, jsonb_build_object('pot', p_id, 'bowl', 'table'));
  return town.answer(me, did);
end $$;

-- Lay cushions or the golden tablecloth on the feast table from my bag, standing on the yard's floor.
create or replace function public.town_feast_dress(p_kind text, p_x integer, p_y integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  u jsonb := town.cat('uses');
  item text;
  hours numeric;
  dress_ jsonb;
  was jsonb;
  until_ bigint;
  at_ bigint;
begin
  if p_kind is null or p_kind not in ('cushions', 'cloth') then return town.answer(me, town.no('none')); end if;
  if p_x is null or p_y is null or not town.on_yard(p_x, p_y) then return town.answer(me, town.no('none')); end if;
  item := case when p_kind = 'cushions' then u->'cushion'->>'item' else u->'cloth'->>'item' end;
  hours := case when p_kind = 'cushions' then (u->'cushion'->>'hours')::numeric else (u->'cloth'->>'hours')::numeric end;
  if town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('none')); end if;
  insert into public.town_things (key, doc) values ('feast_dress', '{}'::jsonb) on conflict (key) do nothing;
  select t.doc into dress_ from public.town_things t where t.key = 'feast_dress' for update;
  dress_ := coalesce(dress_, '{}'::jsonb);
  was := case when jsonb_typeof(dress_->p_kind) = 'object' and (dress_->p_kind->>'until')::bigint > now_ then dress_->p_kind end;
  -- (a cloth laid after the last had gone: that one is kept beside it, for the pots whose time fell while it lay)
  if p_kind = 'cloth' and was is null and jsonb_typeof(dress_->'cloth') = 'object' then
    dress_ := dress_ || jsonb_build_object('clothWas', dress_->'cloth');
  end if;
  until_ := greatest(now_ + (hours * 3600000)::bigint, coalesce((was->>'until')::bigint, 0));
  at_ := coalesce((was->>'at')::bigint, now_);
  dress_ := dress_ || jsonb_build_object(p_kind, jsonb_build_object('at', at_, 'until', until_,
    'by', coalesce((select coalesce(nullif(p.character_name, ''), nullif(p.display_name, ''), nullif(p.discord_username, ''), '')
                    from public.profiles p where p.id = me), '')));
  update public.town_things t set doc = dress_, updated_at = now() where t.key = 'feast_dress';
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1)));
  perform town.note(me, 'feast_dress', item, 1, 0, jsonb_build_object('kind', p_kind, 'until', until_));
  -- (the golden tablecloth, each laying, is the whole town's news; its subject is a page's words for it from before v325)
  if p_kind = 'cloth' then
    perform town.announce(me, 'cloth', 'ปูผ้าทองคำบนโต๊ะเลี้ยง ทุกหม้อบนโต๊ะอยู่ได้อีกหนึ่งมื้อ!', 0, 'cloth:' || me::text || ':' || now_::text, false);
  end if;
  return town.answer(me, jsonb_build_object('ok', true, 'dress', dress_));
end $$;

-- Put a star-wool cover over a pot on the feast table (anybody's): a meal's hours more there; once a pot.
create or replace function public.town_pot_cover(p_id bigint, p_x integer, p_y integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  item text := town.cat('uses')->'cover'->>'item';
  pot jsonb;
begin
  perform town.pots_tidy(now_);
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not coalesce((pot->>'feast')::boolean, false) or p_x is null or p_y is null or not town.on_yard(p_x, p_y) then return town.answer(me, town.no('none')); end if;
  if coalesce((pot->>'cover')::boolean, false) then return town.answer(me, town.no('taken')); end if;
  if town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('tool')); end if;
  update public.town_pots o set marks = coalesce(o.marks, '{}'::jsonb) || '{"cover": true}'::jsonb where o.id = p_id;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1)));
  perform town.note(me, 'pot_cover', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id) || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  return town.answer(me, jsonb_build_object('ok', true, 'pot', town.pot_doc(p_id)));
end $$;

-- Write a recipe I have made onto a blank recipe paper of my bag: its scroll, for its ink.
create or replace function public.town_write_scroll(p_id text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  paper text := town.cat('uses')->>'paper';
  scroll text;
  bag jsonb;
  items jsonb := town.cat('items');
  ink integer;
begin
  if p_id is null or p_id !~ '^[A-Za-z]{1,40}$' then return town.answer(me, town.no('none')); end if;
  if town.held(purse->'bag', paper) < 1 then return town.answer(me, town.no('none')); end if;
  select s.key into scroll from jsonb_each_text(town.cat('scrolls')) s where s.value = p_id order by s.key limit 1;
  if scroll is null or not coalesce(purse->'made', '[]'::jsonb) ? p_id then return town.answer(me, town.no('known')); end if;
  -- (the ink: what the scroll fetches over the paper, none where no more; writing never makes coins: special-uses' inkOf)
  ink := greatest(0, coalesce((items->scroll->>'pays')::integer, 0) - coalesce((items->paper->>'pays')::integer, 0));
  if coalesce((purse->>'coins')::numeric, 0) < ink then return town.answer(me, town.no('coins')); end if;
  bag := town.take(purse->'bag', paper, 1);
  if town.room_g(bag, scroll, 0) < 1 then return town.answer(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put_g(bag, scroll, 1, 0), 'coins', (purse->>'coins')::numeric - ink));
  perform town.note(me, 'paper_write', scroll, 1, -ink, jsonb_build_object('of', p_id) || case when ink > 0 then jsonb_build_object('ink', ink) else '{}'::jsonb end);
  return town.answer(me, jsonb_build_object('ok', true, 'scroll', scroll));
end $$;

-- Throw the first-rain egg in my hand onto a plot of the farm: the nine plots about it watered once.
create or replace function public.town_rain_egg(p_x integer, p_y integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  r integer := (town.cat('uses')->'rain'->>'reach')::integer;
  b integer;
  plots jsonb;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
  was jsonb;
begin
  if p_x is null or p_y is null or town.bed_of(p_x, p_y) < 0 then return town.answer(me, town.no('none')); end if;
  -- (one at a time in a bed, as every deed there: each bed the nine plots are in, in order)
  for b in select distinct town.bed_of(p_x + dx, p_y + dy) as n from generate_series(-r, r) dx, generate_series(-r, r) dy order by 1 loop
    continue when b < 0;
    perform pg_advisory_xact_lock(hashtext('town.bed'), b);
  end loop;
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into plots from public.town_plots p where p.x between p_x - r and p_x + r and p.y between p_y - r and p_y + r;
  did := town.rain_egg(purse, plots, p_x, p_y, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  for k in select jsonb_array_elements_text(did->'watered') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    was := plots->k->'plant';
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
    perform town.note(me, 'rain_egg', was->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'at', jsonb_build_array(p_x, p_y))
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
  end loop;
  return town.answer(me, did - 'plots');
end $$;

-- Whether the specials have their uses, and what is laid on the feast table.
create or replace function public.town_uses_read() returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare me uuid := town.member();
begin
  return town.answer(me, jsonb_build_object('ok', true, 'uses', jsonb_build_object('dress', town.dress_now())));
end $$;

-- Buy a piece at Granny Twilla's (v297's), with the special wool of my bag she takes towards it (slots, each kind once):
-- so much off, what that wool would fetch at its grade.
create or replace function public.town_tailor_buy(p_wearable text, p_request uuid, p_wool jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  price integer;
  off_ integer := 0;
  purse jsonb;
  bag jsonb;
  u jsonb := town.cat('uses');
  kinds text[] := '{}';
  s jsonb;
  x jsonb;
  i integer;
  it text;
  receipt town.tailor_receipts%rowtype;
begin
  if p_wearable is null or p_wearable !~ '^[a-z]{1,24}$' or p_request is null then return town.answer(me, town.no('none')); end if;
  if p_wool is null or jsonb_typeof(p_wool) <> 'array' or jsonb_array_length(p_wool) > 3 then return town.answer(me, town.no('none')); end if;
  -- purse_of makes a new member's purse when there is none; the row is held before anything is read of it
  perform town.purse_of(me, true);
  perform 1 from public.town_purses p where p.member_id = me for update;
  select * into receipt from town.tailor_receipts r where r.member_id = me and r.request = p_request;
  if found then
    if receipt.wearable is distinct from p_wearable then return town.answer(me, town.no('none')); end if;
    return town.answer(me, jsonb_build_object('ok', true, 'wearable', receipt.wearable, 'price', receipt.price, 'repeated', true, 'dressed', town.dressed_of(me)));
  end if;
  price := town.tailor_price(p_wearable, now());
  if price is null then return town.answer(me, town.no(case when town.cat('tailor') ? p_wearable then 'season' else 'none' end)); end if;
  if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = p_wearable) then return town.answer(me, town.no('known')); end if;
  purse := town.purse_of(me, true);
  bag := purse->'bag';
  for x in select v from jsonb_array_elements(p_wool) v loop
    if jsonb_typeof(x) <> 'number' or (x::text)::numeric <> floor((x::text)::numeric) then return town.answer(me, town.no('none')); end if;
    i := (x::text)::integer;
    s := case when i >= 0 and i < jsonb_array_length(bag) then bag->i end;
    it := s->>'item';
    if s is null or s = 'null'::jsonb or it is null or not coalesce(u->'tailor' ? it, false) or it = any(kinds) then return town.answer(me, town.no('none')); end if;
    kinds := kinds || it;
    off_ := off_ + round((town.cat('items')->it->>'pays')::numeric * town.grade_pays(it, coalesce((s->>'grade')::integer, 0)))::integer;
    bag := jsonb_set(bag, array[i::text], case when (s->>'n')::integer > 1 then s || jsonb_build_object('n', (s->>'n')::integer - 1) else 'null'::jsonb end);
  end loop;
  off_ := least(off_, price);
  if (purse->>'coins')::numeric < price - off_ then return town.answer(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', bag, 'coins', (purse->>'coins')::numeric - (price - off_)));
  insert into public.town_dressed (member_id, wearable, how) values (me, p_wearable, 'shop') on conflict (member_id, wearable) do nothing;
  insert into town.tailor_receipts (member_id, request, wearable, price) values (me, p_request, p_wearable, price - off_);
  perform town.note(me, 'tailor', p_wearable, 1, -(price - off_), case when off_ > 0 then jsonb_build_object('wool', to_jsonb(kinds), 'off', off_) else '{}'::jsonb end);
  return town.answer(me, jsonb_build_object('ok', true, 'wearable', p_wearable, 'price', price - off_, 'dressed', town.dressed_of(me)));
end $$;
-- (the two-word call, as every page from before asks it: no wool)
create or replace function public.town_tailor_buy(p_wearable text, p_request uuid) returns jsonb
language sql security definer set search_path to '' as $$ select public.town_tailor_buy(p_wearable, p_request, '[]'::jsonb) $$;

-- ── 5. town.chew, town.cook_v205, town.garden_harvest, public.town_animals, public.town_kitchen and town.deed_th: their live
--       text, but for these ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.chew(jsonb,double precision,bigint)', 'least((st->>''company'')::int, greatest(0, floor(p_company)::int)));',
     'least((st->>''company'')::int, greatest(0, floor(p_company)::int)
      -- v325: the feast table''s cushions, a companion more (lib/town/special-uses)
      + case when coalesce((e->>''cushion'')::boolean, false) then (town.cat(''uses'')->''cushion''->>''company'')::int else 0 end));'],
    ['town.chew(jsonb,double precision,bigint)', '  -- ── the older tools (v174): its end ──
  if done then after:=town.reward_food_finished(after,e,p_now);end if;',
     '  -- v325: a legend pot eaten together (three who begin a helping of it within five minutes), its buff a level more; and the
  -- second buff a real breed''s special carried into the pot, as a meal''s (lib/town/special-uses)
  if done and coalesce(dish->''buff'', ''null''::jsonb) <> ''null''::jsonb and e ? ''pot'' and coalesce(town.cat(''uses'')->''legend'', ''[]''::jsonb) ? (e->>''dish'')
     and town.eaten_together(e->>''pot'', (e->>''from'')::bigint) then
    after := after || town.raised_to(after, dish->>''buff'', p_now, 0);
  end if;
  if done and e->>''carry'' is not null and coalesce(town.cat(''stamina'')->''steps'' ? (e->>''carry''), false) and (e->>''carry'') is distinct from (dish->>''buff'') then
    after := after || town.raised_to(after, e->>''carry'', p_now, 0);
  end if;
  -- ── the older tools (v174): its end ──
  if done then after:=town.reward_food_finished(after,e,p_now);end if;'],
    ['town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint)', '          || case when grade_ > 0 then jsonb_build_object(''grade'', grade_) else ''{}''::jsonb end)))',
     '          || case when grade_ > 0 then jsonb_build_object(''grade'', grade_) else ''{}''::jsonb end
          -- v325: a real breed''s special in a recipe''s pot carries its breed''s second buff, one a pot (lib/town/special-uses)
          || case when made is not null then town.carry_of(alls, dish) else ''{}''::jsonb end)))'],
    ['town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean)', ' if child is not null then
  book:=coalesce(after_->''gardenBook'',''[]''::jsonb);',
     ' -- v325: a rare flower grown (the golden dandelion) is in the village''s farm book as a crossing''s child is
 if coalesce(town.cat(''uses'')->''rareFlowers'', ''[]''::jsonb) ? (p->>''crop'') and not coalesce(after_->''gardenBook'', ''[]''::jsonb) ? (p->>''crop'') then
  after_:=after_ || jsonb_build_object(''gardenBook'', coalesce(after_->''gardenBook'', ''[]''::jsonb) || to_jsonb(p->>''crop''));
 end if;
 if child is not null then
  book:=coalesce(after_->''gardenBook'',''[]''::jsonb);'],
    ['public.town_animals(jsonb,text)', 'an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>act)::double precision, k), ''today'', (an->''today'') || jsonb_build_object(act, true));',
     'an := an || jsonb_build_object(''hearts'', town.animal_hearts_plus(an, (kn->''heart''->>act)::double precision
        * (1 + town.buff_by(purse, now_::bigint, ''gentle'')), k), ''today'', (an->''today'') || jsonb_build_object(act, true));  -- (v325: and more under the carer''s gentle buff)'],
    ['public.town_animals(jsonb,text)', 'odds := case when right_ then least((kn->>''oddsCap'')::integer, (kn->''odds''->>(k->''breeds''->target->>''tier''))::integer + case when dawn is not null then (kn->>''dawnBoost'')::integer else 0 end) else 0 end;',
     '-- (v325: with the breeder''s lucky match, so many points more, never past three times the breed''s own odds nor the cap)
    odds := case when right_ then town.matched_odds((kn->''odds''->>(k->''breeds''->target->>''tier''))::integer, case when dawn is not null then (kn->>''dawnBoost'')::integer else 0 end,
      town.buff_by(purse, now_::bigint, ''luckyMatch''), (kn->>''oddsCap'')::integer) else 0 end;'],
    ['public.town_kitchen()', '''feast'', (town.cat(''cooking'')->''feast'') - ''floor'',',
     '''feast'', (town.cat(''cooking'')->''feast'') - ''floor'',
    -- v325: and what is laid on the feast table (the cushions, the golden tablecloth)
    ''uses'', jsonb_build_object(''dress'', town.dress_now()),'],
    ['town.deed_th(text)', 'when ''pack_take'' then ''หยิบของจากกระเป๋าแกะ'' else p_what end',
     'when ''pack_take'' then ''หยิบของจากกระเป๋าแกะ''
    -- (v325) the specials'' uses
    when ''feast_dress'' then ''ปูผ้าหรือวางเบาะที่โต๊ะเลี้ยง'' when ''pot_cover'' then ''คลุมหม้อบนโต๊ะเลี้ยง'' when ''paper_write'' then ''เขียนสูตรลงกระดาษเปล่า'' when ''rain_egg'' then ''โยนไข่ฝนแรกรดแปลง'' else p_what end']
  ] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v325: % has % of [%], not 1: rebuild v325', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

-- ── 6. Who may call what: the rules are no browser's ─────────────────────────────────────────────────────────────────
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_feast_eat(bigint, integer, integer, boolean), public.town_feast_dress(text, integer, integer),
  public.town_pot_cover(bigint, integer, integer), public.town_write_scroll(text), public.town_rain_egg(integer, integer), public.town_uses_read(),
  public.town_tailor_buy(text, uuid, jsonb), public.town_tailor_buy(text, uuid) from public, anon;
grant execute on function public.town_feast_eat(bigint, integer, integer, boolean), public.town_feast_dress(text, integer, integer),
  public.town_pot_cover(bigint, integer, integer), public.town_write_scroll(text), public.town_rain_egg(integer, integer), public.town_uses_read(),
  public.town_tailor_buy(text, uuid, jsonb), public.town_tailor_buy(text, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select (select count(*) from jsonb_object_keys(data->'carry')) as carry, jsonb_array_length(data->'legend') as legend
--     from public.town_catalog where key = 'uses';
--   -- 9 | 3
--
--   select count(*) filter (where data ? k) as dishes from public.town_catalog,
--          unnest(array['fireflyCustard', 'cloudPancake', 'luckyFriedRice', 'moonSesamePudding', 'berryCreamScones', 'cocoaMousse', 'pollenTart', 'phoenixBake', 'pearlBroth', 'milkyWayCake']) k where key = 'dishes';
--   -- 10
--
--   select town.matched_odds(10, 10, 20, 70) as legend, town.matched_odds(60, 0, 20, 70) as capped,
--          town.carry_of('[["milk",1],["silkieTwinEgg",2],["sugar",1]]'::jsonb, 'custard') as carry;
--   -- 30 | 70 | {"carry": "gentle"}
--
--   select has_function_privilege('authenticated', 'public.town_write_scroll(text)', 'execute') as member,
--          has_function_privilege('anon', 'public.town_write_scroll(text)', 'execute') as anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | 0
--
--   select pg_get_constraintdef(c.oid) like '%''cloth''%' as cloth_told from pg_constraint c
--    where c.conrelid = 'public.town_announcements'::regclass and c.conname = 'town_announcements_kind_check';
--   -- true
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the specials' dishes cooked, and who first
--   select d.thing, count(*) as pots, min(d.at) as first from public.town_deeds d
--    where d.what = 'cook' and d.thing in ('fireflyCustard', 'cloudPancake', 'luckyFriedRice', 'moonSesamePudding', 'berryCreamScones', 'cocoaMousse', 'pollenTart', 'phoenixBake', 'pearlBroth', 'milkyWayCake') group by 1 order by 2 desc;
--
--   -- legend pots eaten together (helpings begun within five minutes of two others)
--   select b.pot, count(distinct b.member_id) as eaters, min(to_timestamp(b.at / 1000.0)) as from_ from public.town_feast_began b group by 1;
--
--   -- the wool, the paper and the rain egg used
--   select d.what, d.thing, count(*) from public.town_deeds d where d.what in ('feast_dress', 'pot_cover', 'paper_write', 'rain_egg') group by 1, 2;
