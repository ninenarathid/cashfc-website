-- v273: the farming line's first and sixth ranks as the owner had them changed (2026-10-16).
-- Run after v271 (v272 touches nothing of the farm), with the matching site code: lib/town/farm's movePlant and atTop,
-- components/town/TownMovePlant (a page out before this offers a move the database does not know). Safe to run twice.
--
-- The owner: "อยากปรับเครื่องรางของสาย ปลูกผัก / ใน lv ต้นๆ อยากให้เพิ่ม effect ที่สามารถ ย้ายตำแหน่งผักในแปลงตัวเองได้ /
-- เครื่องราง lv 6 อยากให้เปลี่ยน effect ให้ OP มากกว่านี้", and what he chose of Claude's and Codex's proposals:
--   * The enchanted hoe (rank 1) keeps its row, and moves plants: worn, at a living unripe plant of mine on one plot of my
--     own bed, the plant goes to a tilled empty plot of the bed or changes places with another such plant of mine; ten a
--     Bangkok day (a swap is one), no stamina, nothing to fail, no points (public.town_move, town.move_plant). The plant
--     keeps everything it has, its Quality round settled to the moment under what the bed gave it where it stood; then
--     each plot is emptied and each plant set in its new place, so that town.quality_keep (v270) works out the bed's
--     gifts for both plots as for a plant dug out and one sown. A moved plant remembers the plot it was sown at (`home`):
--     its yield, its pests and its fruits' Quality are rolled by that plot (town.home_of in town.yield_of, town.pest_at,
--     town.quality_harvest), so moving rolls nothing again ("keeping its growth, coverage and identity (no reroll of
--     coordinate rolls)", his design of 2026-10-15). Who helped it (town_plot_help) goes with it.
--   * The mandrake sprout (rank 6): while it follows me, every fruit of every picking of my own plants lands at the top of
--     the plant's Quality range (the range itself as the bars, the ceiling and the narrowing make it): by hand, the
--     crescent sickle's row and its one more, the garden twine's fruit, a giant; always, nothing counted (town.pick and
--     town.garden_harvest told it, town.row_tend). Its song of before, a bearing more seven times a day, is sung no
--     more; a plant it sang to keeps its bearing more (town.more_of, as it was). Somebody else's plant is rolled as ever.
--   * The catalog's gifts row: the hoe's ten moves a day counted, the mandrake's seven songs no longer.
-- What each does is the code's, to the digit (v273.test.mjs: moves, pickings, sweeps and the trigger against lib/town's).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' and p.proname='shared_read_data' and p.prosrc like '%v271%') then raise exception 'Run v271 before v273'; end if;
-- <guards:v273>
 if md5(replace(pg_get_functiondef('town.yield_of(text,jsonb,text)'::regprocedure),chr(13),'')) not in ('f6ea0cb77147112b5c1f32774f35bcae','900a9b5ba4aa6f908f5ad3eb577dda0b') then raise exception 'Definition changed: town.yield_of(text,jsonb,text); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('859a5c0cd94e71659a9736e4c61a63de','853fa7e45dc5329be946cd83889ef384') then raise exception 'Definition changed: town.pest_at(text,jsonb,bigint); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.quality_harvest(text,jsonb,integer,bigint,text,integer)'::regprocedure),chr(13),'')) not in ('50f0e9da1fb28b830024c98ab0f6c97e','685682fbd638e679ac25004aeccec3d8') then raise exception 'Definition changed: town.quality_harvest(text,jsonb,integer,bigint,text,integer); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint)'::regprocedure),chr(13),'')) not in ('80e8495aa4e147d32e78f482b7e1bc5f','41434887f544d87dbb2c8e2991ce13a8') then raise exception 'Definition changed: town.pick(text,jsonb,jsonb,boolean,text,bigint); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('0d2a7cb3e48de505bc51d469bf33dee1','a8627c9e58f1b156bf5bddaa2790f63b') then raise exception 'Definition changed: town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)'::regprocedure),chr(13),'')) not in ('ca0684b7c9bd9566a9f4bf7cc3ca250c','7175a8be62b7eb47c1c7ea51b0f9ccf3') then raise exception 'Definition changed: town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean); rebuild v273'; end if;
 if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('bcda3d8440ec0b755decea5bccf44ec1','2d257be26507b4f98d4564dcea210775') then raise exception 'Definition changed: town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb); rebuild v273'; end if;
-- </guards:v273>
end $$;

-- <catalog:v273> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "uses": {"charmEchoAxe":{"n":5,"per":"day"},"thingBeetleRing":{"n":5,"per":"day"},"charmWaykeeper":{"n":2,"per":"day"},"thingCampFlag":{"n":2,"per":"day"},"famGardenMender":{"n":10,"per":"day"},"thingReviveSeed":{"n":3,"per":"day"},"thingSkyBean":{"n":1,"per":"day"},"thingGiantSeeds":{"n":1,"per":"day"},"thingCrossBrush":{"n":3,"per":"day"},"thingPollenSeal":{"n":7,"per":"day"},"charmChefFlame":{"n":3,"per":"day"},"thingFlavorBook":{"n":3,"per":"day"},"thingDragonPot":{"n":1,"per":"day"},"thingWingCrown":{"n":1,"per":"day"},"thingMoonLantern":{"n":1,"per":"day"},"famRiverDragon":{"n":1,"per":"day"},"thingOreCompass":{"n":5,"per":"day"},"thingForesterKnife":{"n":5,"per":"day"},"thingPocketSawmill":{"n":3,"per":"day"},"famDwarf":{"n":3,"per":"day"},"thingForestRing":{"n":2,"per":"day"},"thingStarBottle":{"n":1,"per":"day"},"thingTreeHive":{"n":1,"per":"day"},"thingCrystalRepair":{"n":3,"per":"day"},"charmGemColor":{"n":3,"per":"day"},"thingSchoolBell":{"n":2,"per":"day"},"thingPocketLift":{"n":6,"per":"day"},"charmBranchVein":{"n":3,"per":"day"},"famForestGuardian":{"n":5,"per":"day"},"charmListening":{"n":5,"per":"day"},"thingCoreSpade":{"n":1,"per":"day"},"charmDomino":{"n":3,"per":"day"},"famWaterRelay":{"n":3,"per":"day"},"thingSpringStone":{"n":1,"per":"day"},"thingCloudJar":{"n":1,"per":"day"},"thingTinyForest":{"n":1,"per":"day"},"charmTreePact":{"n":3,"per":"day"},"famBeaver":{"n":1,"per":"day"},"thingSpoon":{"n":3,"per":"day"},"famSprite":{"n":3,"per":"meal"},"thingSpice":{"n":1,"per":"day"},"thingFlame":{"n":3,"per":"day"},"charmRing":{"n":3,"per":"day"},"thingDust":{"n":5,"per":"day"},"famOtter":{"n":10,"per":"meal"},"thingOrb":{"n":1,"per":"day"},"thingBait":{"n":3,"per":"day"},"famSquirrel":{"n":20,"per":"meal"},"famPiglet":{"n":10,"per":"meal"},"thingMap":{"n":3,"per":"day"},"thingNectar":{"n":10,"per":"day"},"thingFlute":{"n":1,"per":"span","ms":300000},"thingHourglass":{"n":1,"per":"day"},"charmHoe":{"n":10,"per":"day"}},
    "harder": {"from":4,"by":0.08},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":0.5},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":90},"thingBasket":{"kind":"thing","line":"kitchen","rank":2,"by":12},"thingSpoon":{"kind":"thing","line":"kitchen","rank":3,"by":1},"famSprite":{"kind":"familiar","line":"kitchen","rank":4,"by":1},"thingSpice":{"kind":"thing","line":"kitchen","rank":5,"by":4},"thingFlame":{"kind":"thing","line":"kitchen","rank":6,"by":1},"charmAnklet":{"kind":"charm","line":"helpers","rank":2,"by":2},"charmBell":{"kind":"charm","line":"helpers","rank":3,"by":2},"charmRing":{"kind":"charm","line":"helpers","rank":4,"by":30},"thingDust":{"kind":"thing","line":"helpers","rank":5,"by":12},"charmGuard":{"kind":"charm","line":"helpers","rank":6,"by":2},"famOtter":{"kind":"familiar","line":"fishing","rank":2,"by":1},"thingCreel":{"kind":"thing","line":"fishing","rank":1,"by":5},"thingRod":{"kind":"thing","line":"fishing","rank":3,"by":0.75},"charmLine":{"kind":"charm","line":"fishing","rank":4,"by":3},"thingOrb":{"kind":"thing","line":"fishing","rank":5,"by":2},"thingBait":{"kind":"thing","line":"fishing","rank":6,"by":1},"famPiglet":{"kind":"familiar","line":"forest","rank":3,"by":1},"charmFirefly":{"kind":"charm","line":"forest","rank":4,"by":1},"thingMap":{"kind":"thing","line":"forest","rank":5,"by":1},"famStag":{"kind":"familiar","line":"forest","rank":6,"by":2},"thingNectar":{"kind":"thing","line":"insects","rank":3,"by":1},"charmWind":{"kind":"charm","line":"insects","rank":4,"by":1},"thingFlute":{"kind":"thing","line":"insects","rank":5,"by":15},"charmCloak":{"kind":"charm","line":"insects","rank":6,"by":3},"thingPouch":{"kind":"thing","line":"farming","rank":3,"by":5},"charmSickle":{"kind":"charm","line":"farming","rank":4,"by":1},"thingHourglass":{"kind":"thing","line":"farming","rank":5,"by":3},"famMandrake":{"kind":"familiar","line":"farming","rank":6,"by":1},"thingFlask":{"kind":"thing","line":"well","rank":4,"by":30},"famFrog":{"kind":"familiar","line":"well","rank":5,"by":45},"thingMoon":{"kind":"thing","line":"well","rank":6,"by":3},"charmEchoAxe":{"kind":"charm","line":"felling","rank":1,"by":2},"famWoodpecker":{"kind":"familiar","line":"felling","rank":2,"by":1},"thingBundle":{"kind":"thing","line":"felling","rank":3,"by":3},"charmMinerLamp":{"kind":"charm","line":"mining","rank":1,"by":4},"famBat":{"kind":"familiar","line":"mining","rank":2,"by":1},"thingSack":{"kind":"thing","line":"mining","rank":3,"by":5},"charmWaykeeper":{"kind":"charm","line":"helpers","rank":10,"by":1},"thingCampFlag":{"kind":"thing","line":"helpers","rank":8,"by":1},"famGardenMender":{"kind":"familiar","line":"helpers","rank":7,"by":1},"thingReviveSeed":{"kind":"thing","line":"helpers","rank":9,"by":1},"thingSkyBean":{"kind":"thing","line":"farming","rank":10,"by":1},"thingGiantSeeds":{"kind":"thing","line":"farming","rank":7,"by":1},"thingCrossBrush":{"kind":"thing","line":"farming","rank":8,"by":1},"thingPollenSeal":{"kind":"thing","line":"farming","rank":9,"by":1},"charmChefFlame":{"kind":"charm","line":"kitchen","rank":8,"by":1},"thingFlavorBook":{"kind":"thing","line":"kitchen","rank":9,"by":1},"thingDragonPot":{"kind":"thing","line":"kitchen","rank":10,"by":1},"thingPicnicCloth":{"kind":"thing","line":"kitchen","rank":7,"by":1},"thingWingCrown":{"kind":"thing","line":"insects","rank":10,"by":1},"charmPollenGuardian":{"kind":"charm","line":"insects","rank":9,"by":1},"thingMoonLantern":{"kind":"thing","line":"insects","rank":8,"by":1},"thingBeetleRing":{"kind":"thing","line":"insects","rank":7,"by":1},"famRiverDragon":{"kind":"familiar","line":"fishing","rank":10,"by":1},"thingLotusBoat":{"kind":"thing","line":"fishing","rank":8,"by":1},"charmLunarReel":{"kind":"charm","line":"fishing","rank":9,"by":1},"thingOreCompass":{"kind":"thing","line":"mining","rank":4,"by":1},"thingForesterKnife":{"kind":"thing","line":"felling","rank":4,"by":1},"thingPocketSawmill":{"kind":"thing","line":"felling","rank":6,"by":1},"famDwarf":{"kind":"familiar","line":"mining","rank":6,"by":1},"thingForestRing":{"kind":"thing","line":"forest","rank":7,"by":1},"thingStarBottle":{"kind":"thing","line":"forest","rank":9,"by":1},"thingTreeHive":{"kind":"thing","line":"forest","rank":8,"by":1},"thingCrystalRepair":{"kind":"thing","line":"mining","rank":5,"by":1},"charmGemColor":{"kind":"charm","line":"mining","rank":9,"by":1},"thingSchoolBell":{"kind":"thing","line":"fishing","rank":7,"by":1},"thingPocketLift":{"kind":"thing","line":"mining","rank":7,"by":1},"charmBranchVein":{"kind":"charm","line":"mining","rank":8,"by":1},"famForestGuardian":{"kind":"familiar","line":"forest","rank":10,"by":1},"charmListening":{"kind":"charm","line":"felling","rank":8,"by":1},"thingCoreSpade":{"kind":"thing","line":"mining","rank":10,"by":1},"charmDomino":{"kind":"charm","line":"felling","rank":5,"by":1},"famWaterRelay":{"kind":"familiar","line":"well","rank":7,"by":1},"thingRiverHorn":{"kind":"thing","line":"well","rank":8,"by":1},"thingSpringStone":{"kind":"thing","line":"well","rank":9,"by":1},"thingCloudJar":{"kind":"thing","line":"well","rank":10,"by":1},"thingTinyForest":{"kind":"thing","line":"felling","rank":10,"by":1},"charmTreePact":{"kind":"charm","line":"felling","rank":9,"by":1},"famBeaver":{"kind":"familiar","line":"felling","rank":7,"by":1}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v273>

-- The plot a plant's rolls are rolled by: the one it was sown at, once the enchanted hoe has moved it (lib/town/farm's homeOf).
CREATE OR REPLACE FUNCTION town.home_of(p_key text, p_plant jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select case when jsonb_typeof(p_plant->'home') = 'string' and p_plant->>'home' <> '' then p_plant->>'home' else p_key end
$function$;

CREATE OR REPLACE FUNCTION town.yield_of(p_key text, p_plant jsonb, p_hand text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- v273: rolled by the plot it was sown at, should the enchanted hoe have moved it (town.home_of)
  select (((c.crop->'yield'->>0)::int
    + floor(town.roll(town.home_of(p_key, p_plant), (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint)
        * ((c.crop->'yield'->>1)::int - (c.crop->'yield'->>0)::int + 1)::double precision)::int)
    -- v269: a plant sown over several plots before they became one-plot plants gives for each of them (a giant is
    -- counted where it is picked)
    * case when p_plant->'giant' is distinct from 'true'::jsonb and jsonb_typeof(p_plant->'footprint') = 'array'
        then greatest(1, jsonb_array_length(p_plant->'footprint')) else 1 end
    + case when p_hand is not null
            and p_hand = c.f->'blades'->>(case when (c.crop->>'picks')::int >= (c.f->>'tree')::int then 'tree' else 'plant' end) then 1 else 0 end)::integer
    from (select town.cat('crops')->(p_plant->>'crop') as crop, town.cat('farming') as f) c
$function$;

CREATE OR REPLACE FUNCTION town.pest_at(p_key text, p_plant jsonb, p_now bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
  -- (whether an hourglass was ever turned over it: its term is asked for only then)
  quick boolean := coalesce(jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0, false);
  -- (the bearing more of a plant the mandrake sang to, and the hours it waits for it)
  wing_used boolean:=coalesce((p_plant->>'cured')::bigint>(p_plant->>'sown')::bigint,false);
  more integer := town.more_of(p_plant);
  -- v273: the plot it was sown at, should the enchanted hoe have moved it (town.home_of): its pests are that plot's
  home_ text := town.home_of(p_key, p_plant);
  encore double precision := coalesce((c->>'again')::double precision, (c->>'hours')::double precision * (f->'gifted'->>'encore')::double precision);
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks + more then false
        when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore
        when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every
          + case when quick then town.quick_ms(p_plant, sown, t) else 0::double precision end) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(home_, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then if not wing_used and t<(p_plant->>'wingGuard')::bigint then wing_used:=true;else return t;end if;end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION town.quality_harvest(p_key text, p_plant jsonb, p_n integer, p_now bigint, p_salt text, p_from integer, p_top boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 q jsonb := town.quality_settled(p_plant, p_now); qc jsonb := town.cat('quality'); bars integer[] := '{}'; k integer; ceiling_ integer := 0;
 nar double precision := 0; span_ double precision := (q->>'span')::double precision; brushed boolean; lo integer; hi integer;
 vals integer[] := '{}'; counts integer[] := array[0,0,0,0]; v integer; i integer; g integer; groups jsonb := '[]'::jsonb;
begin
 for k in 0..3 loop
  bars := bars || case when span_ > 0 then greatest(0, least((qc->>'bar')::integer, floor((qc->>'bar')::double precision * (q->'area'->>k)::double precision / span_ + 1e-9)::integer)) else 0 end;
 end loop;
 ceiling_ := least(100, bars[1] + bars[2] + bars[3] + bars[4]);
 brushed := jsonb_typeof(p_plant->'brushed') = 'number' and (p_plant->>'brushed')::bigint >= town.quality_round_start(p_plant);
 for k in 0..2 loop
  nar := nar + (qc->>'narrow')::double precision * least(1, greatest(0, case when span_ > 0 then (q->'nar'->>k)::double precision / span_ else 0 end));
 end loop;
 if brushed then nar := nar + (qc->>'narrow')::double precision; end if;
 hi := greatest(0, least(100, ceiling_));
 lo := greatest(0, hi - ((qc->>'spread')::integer - least((qc->>'narrowest')::integer, floor(nar + 1e-9)::integer)));
 for i in 0..p_n - 1 loop
  -- v273: drawn by the plot it was sown at (town.home_of); and at the range's top with no draw, of my own plant with the
  -- mandrake at heel (`p_top`, lib/town/farm's atTop)
  v := case when coalesce(p_top, false) then hi
   else lo + least(hi - lo, floor(town.quality_draw(p_salt, town.home_of(p_key, p_plant), (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint, (p_from + i)::bigint) * (hi - lo + 1))::integer) end;
  vals := vals || v;
  g := case when v >= 95 then 3 when v >= 70 then 2 when v >= 40 then 1 else 0 end;
  counts[g + 1] := counts[g + 1] + 1;
 end loop;
 for g in 0..3 loop
  if counts[g + 1] > 0 then groups := groups || jsonb_build_array(jsonb_build_array(g, counts[g + 1])); end if;
 end loop;
 return jsonb_build_object('range', jsonb_build_object('lo', lo, 'hi', hi), 'values', to_jsonb(vals), 'groups', groups);
end $function$;

CREATE OR REPLACE FUNCTION town.quality_harvest(p_key text, p_plant jsonb, p_n integer, p_now bigint, p_salt text, p_from integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 -- v273: as the seven-argument one, with no mandrake's top
 select town.quality_harvest(p_key, p_plant, p_n, p_now, p_salt, p_from, false)
$function$;

CREATE OR REPLACE FUNCTION town.garden_harvest(p_key text, p_before jsonb, p_plot jsonb, p_plots jsonb, p_done jsonb, p_now bigint, p_top boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 p jsonb:=p_plot->'plant'; after_ jsonb:=p_done->'purse'; updated jsonb:=p_done->'plot'; extras jsonb:='[]'::jsonb;
 child text:=town.garden_cross(p_key,p_plots,p->>'by',p_now); book jsonb; stowed jsonb; twine jsonb; g jsonb;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return p_done; end if;
 -- v260: the twine's fruit is of the plant's own crop: rolled for its Quality as the fruits after the pick's (v273: at the top
 -- of its range with the mandrake at heel, `p_top`)
 if p->>'root' is not null and town.held(town.carried_bag(p_before),'gardenTwine')>0 then
  twine:=town.quality_harvest(p_key,p,(town.cat('gardening')->>'extra')::integer,p_now,(select s.salt from town.quality_salt s where s.one),coalesce((p_done->'got'->0->>1)::integer,0),coalesce(p_top,false));
  for g in select e.v from jsonb_array_elements(twine->'groups') e(v) loop
   if town.room_g(after_->'bag',p->>'crop',(g->>0)::integer)<(g->>1)::integer then return town.no('full'); end if;
   after_:=after_ || jsonb_build_object('bag',town.put_g(after_->'bag',p->>'crop',(g->>1)::integer,(g->>0)::integer));
  end loop;
 end if;
 if updated->'plant'='null'::jsonb and p->>'root' is not null and town.held(town.carried_bag(p_before),'seedTray')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->(p->>'crop')->>'seed',1)); end if;
 if child is not null then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->child->>'seed',case when town.held(town.carried_bag(p_before),'graftKnife')>0 or p->'insectCrossRound'=p->'picked' then 2 else 1 end)); end if;
 stowed:=town.stow_all(after_,extras);
 if stowed is null then return town.no('full'); end if;
 after_:=stowed;
 if child is not null then
  book:=coalesce(after_->'gardenBook','[]'::jsonb);
  if not book ? child then book:=book || to_jsonb(child); end if;
  after_:=after_ || jsonb_build_object('gardenBook',book);
  if updated->'plant'<>'null'::jsonb then updated:=jsonb_set(updated,'{plant,crossed}','true'::jsonb); end if;
 end if;
 return p_done || jsonb_build_object('purse',after_,'plot',updated,'got',p_done->'got' || case when twine is null then '[]'::jsonb else jsonb_build_array(jsonb_build_array(p->>'crop',(town.cat('gardening')->>'extra')::integer)) end || extras) || case when child is not null then jsonb_build_object('cross',child) else '{}'::jsonb end;
end $function$;

CREATE OR REPLACE FUNCTION town.garden_harvest(p_key text, p_before jsonb, p_plot jsonb, p_plots jsonb, p_done jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 -- v273: as the seven-argument one, with no mandrake's top
 select town.garden_harvest(p_key, p_before, p_plot, p_plots, p_done, p_now, false)
$function$;

CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint, p_me text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  top_ boolean;
  fruits jsonb;
  g jsonb;
  room_ jsonb;
begin
  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if p->'giant'='true'::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;
  -- v273: the mandrake that follows whoever picks puts every fruit of a plant they sowed at the top of its range (lib/town/farm's atTop)
  top_ := coalesce(p_me <> '' and p->>'by' = p_me and town.gift_works(p_purse, 'famMandrake'), false);
  -- ── v260: each fruit's Quality; the bag must hold every grade the pick gives, before anything is done ──
  fruits := town.quality_harvest(p_key, p, n, p_now, (select s.salt from town.quality_salt s where s.one), 0, top_);
  room_ := p_purse->'bag';
  for g in select e.v from jsonb_array_elements(fruits->'groups') e(v) loop
    if town.room_g(room_, p->>'crop', (g->>0)::integer) < (g->>1)::integer then return town.no('full'); end if;
    room_ := town.put_g(room_, p->>'crop', (g->>1)::integer, (g->>0)::integer);
  end loop;
  picked := (p->>'picked')::int + 1;
  -- (v273: the mandrake sings no more; a plant it sang to before has its bearing more still, town.more_of)
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  room_ := p_purse->'bag';
  for g in select e.v from jsonb_array_elements(fruits->'groups') e(v) loop
    room_ := town.put_g(room_, p->>'crop', (g->>1)::integer, (g->>0)::integer);
  end loop;
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'fruits', jsonb_build_object('range', fruits->'range', 'values', fruits->'values'),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)) end,
    'purse', town.spend(p_purse, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', room_)),p_now,top_);
end;
$function$;

CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
 -- v273: as the seven-argument one, told of nobody who picks (so no mandrake's top), and with no song
 select town.pick(p_key, p_purse, p_plot, p_may, p_hand, p_now, null::text)
$function$;

CREATE OR REPLACE FUNCTION town.tend_v205(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
  theirs boolean;
  rung jsonb;
  -- ── the older tools (v174): the forged hoe or can in the hand, and the deed's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  -- ── the older tools (v174): the forged hoe or can in the hand, read once (no other thing held is looked at); and lib/town/farm's mayTwice, where deedFor is told of it ──
  if (hand = 'hoe' or hand = 'can') and town.bag_forged(p_purse->'bag', hand) then
    tool_ := town.hand_stack(p_purse);
    if not town.forged(tool_) then tool_ := null; end if;
  end if;
  if tool_ is not null and hand = 'can' and town.may_power(p_purse, tool_, 'cnTwice', p_now) and town.twice_wanted(p_key, p_plot, p_now) then deed := 'water'; end if;
  -- ── the older tools (v174): its end ──
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    -- (v273: told who picks, for the mandrake's top)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now, p_me) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  theirs := (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me);
  -- (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the watering so many times over)
  rung := jsonb_build_object('purse', case when theirs then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end, 'times', 1);
  if deed = 'water' and theirs then rung := town.chime(rung->'purse', p_now); end if;
  -- ── the older tools (v174): what the forged tool pays and counts, the plot as it leaves it, and what came of it ──
  if tool_ is not null and deed in ('clear', 'till', 'water') then
    more_ := town.tend_with(p_key, deed, p_purse, rung->'purse', did->'plot', coalesce(did->'got', '[]'::jsonb), tool_, p_now);
    rung := rung || jsonb_build_object('purse', more_->'purse');
    did := did || jsonb_build_object('plot', more_->'plot', 'got', more_->'got');
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', rung->'purse',
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end
    || case when (rung->>'times')::numeric > 1 then jsonb_build_object('times', rung->'times') else '{}'::jsonb end;
end;
$function$;

CREATE OR REPLACE FUNCTION town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
  cell_ text;
  extras_ jsonb:='[]'::jsonb;
  got_ jsonb;
  cut_ jsonb;
  g_ jsonb;
  top_ boolean;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    -- v260: its fruits are rolled for their Quality as the fruits after the pick's and the twine's
    if well then
      -- (v273: at the top of the range, of my own plant with the mandrake at heel: lib/town/farm's atTop)
      top_ := coalesce(p_me <> '' and plot->'plant'->>'by' = p_me and town.gift_works(p_purse, 'famMandrake'), false);
      cut_ := mine->'bag';
      for g_ in select e.v from jsonb_array_elements((town.quality_harvest(key, plot->'plant', more, p_now, (select s.salt from town.quality_salt s where s.one),
          (select coalesce(sum((e.v->>1)::integer), 0)::integer from jsonb_array_elements(did->'got') e(v) where e.v->>0 = crop), top_))->'groups') e(v) loop
        if cut_ is not null and town.room_g(cut_, crop, (g_->>0)::integer) >= (g_->>1)::integer then cut_ := town.put_g(cut_, crop, (g_->>1)::integer, (g_->>0)::integer); else cut_ := null; end if;
      end loop;
      if cut_ is not null then
        mine := mine || jsonb_build_object('bag', cut_);
        n := n + more;
      end if;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  mine:=town.remember_garden_misses(mine,found->'plots',found->>'deed',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  mine:=town.combo_row_checkpoint(p_purse,mine,p_at,found->'plots',(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),found->>'deed',plots||state,town.owner_of(p_bed,false,p_now),marks,p_me,p_now);
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', coalesce(got_,'[]'::jsonb))
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$function$;

-- ── the enchanted hoe's move (lib/town/farm's movable, movePlant) ──

-- Whether the plant in a plot is one I may move: mine, on that one plot (no giant, none sown over several), living, not ripe (lib/town/farm's movable).
CREATE OR REPLACE FUNCTION town.movable(p_key text, p_plot jsonb, p_me text, p_now bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb := coalesce(p_plot->'plant', 'null'::jsonb); seen jsonb;
begin
 if jsonb_typeof(p) is distinct from 'object' or p->>'by' is distinct from p_me or p->'giant' = 'true'::jsonb or jsonb_typeof(p_plot->'house') = 'object' then return false; end if;
 if (p ? 'root' and p->>'root' is distinct from p_key)
    or (p ? 'footprint' and not (jsonb_typeof(p->'footprint') = 'array' and jsonb_array_length(p->'footprint') = 1 and p->'footprint'->>0 = p_key)) then return false; end if;
 seen := town.see(p_key, p_plot, p_now);
 return not (seen->>'dead')::boolean and not (seen->>'ripe')::boolean;
end $function$;

-- Whether a plot is one a plant may be moved onto: tilled, empty, no insect house on it.
CREATE OR REPLACE FUNCTION town.open_plot(p_plot jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(p_plot->>'soil' = 'tilled' and coalesce(p_plot->'plant', 'null'::jsonb) = 'null'::jsonb and jsonb_typeof(p_plot->'house') is distinct from 'object', false)
$function$;

-- A plant as it goes from one plot to another (lib/town/farm's movedTo): its round settled to the moment under what the bed
-- gave it where it stood (one with no round yet given its first, with that, as town.quality_keep gives one), the plot it
-- was sown at remembered, and a root and a footprint of one plot set to its new plot. `p_plots`: the bed as it stood.
CREATE OR REPLACE FUNCTION town.moved_to(p_from text, p_to text, p_plots jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb := p_plots->p_from->'plant'; gift jsonb; q jsonb;
begin
 if jsonb_typeof(p->'q') = 'object' then q := town.quality_settled(p, p_now);
 else
  gift := town.quality_bed_gift(p_from, p_plots);
  q := town.quality_settled(p || jsonb_build_object('q', town.quality_fresh(greatest((town.cat('quality')->>'launch')::bigint, town.quality_round_start(p)))
    || case when gift is null then '{}'::jsonb else jsonb_build_object('bed', gift) end), p_now);
 end if;
 return p || jsonb_build_object('q', q, 'home', town.home_of(p_from, p))
  || case when p ? 'root' then jsonb_build_object('root', p_to) else '{}'::jsonb end
  || case when p ? 'footprint' then jsonb_build_object('footprint', jsonb_build_array(p_to)) else '{}'::jsonb end;
end $function$;

-- Move it (lib/town/farm's movePlant): the purse with the day's move counted, the two plots as the move leaves them, whether
-- it was a swap and how many moves the day has left. Refused without the charm worn (none), with the day's ten used (spent),
-- off a bed or onto another (soil), in a bed or of a plant not mine (theirs), for a plant that may not move or a plot it may
-- not go to (soil). `p_plots`: the bed's plots that are kept, each with its house; `p_owner`: whose the bed is now.
CREATE OR REPLACE FUNCTION town.move_plant(p_from text, p_to text, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
 bed_ integer; used jsonb; here jsonb; there jsonb;
begin
 if not town.gift_works(p_purse, 'charmHoe') then return town.no('none'); end if;
 used := town.gift_use(p_purse, 'charmHoe', p_now);
 if not (used->>'ok')::boolean then return town.no('spent'); end if;
 if p_from !~ '^-?[0-9]+,-?[0-9]+$' or p_to !~ '^-?[0-9]+,-?[0-9]+$' then return town.no('soil'); end if;
 bed_ := town.bed_of(split_part(p_from, ',', 1)::integer, split_part(p_from, ',', 2)::integer);
 if bed_ < 0 or town.bed_of(split_part(p_to, ',', 1)::integer, split_part(p_to, ',', 2)::integer) <> bed_ or p_from = p_to then return town.no('soil'); end if;
 here := nullif(coalesce(plots->p_from->'plant', 'null'::jsonb), 'null'::jsonb);
 there := nullif(coalesce(plots->p_to->'plant', 'null'::jsonb), 'null'::jsonb);
 if p_owner is distinct from p_me or (here is not null and here->>'by' is distinct from p_me) or (there is not null and there->>'by' is distinct from p_me) then return town.no('theirs'); end if;
 if not town.movable(p_from, plots->p_from, p_me, p_now)
    or (case when there is not null then not town.movable(p_to, plots->p_to, p_me, p_now) else not town.open_plot(plots->p_to) end) then return town.no('soil'); end if;
 return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', used->'left', 'swap', there is not null, 'plots', jsonb_build_object(
   p_from, case when there is not null then jsonb_build_object('soil', 'tilled', 'plant', town.moved_to(p_to, p_from, plots, p_now)) else '{"soil": "tilled", "plant": null}'::jsonb end,
   p_to, jsonb_build_object('soil', 'tilled', 'plant', town.moved_to(p_from, p_to, plots, p_now))));
end $function$;

-- The member's move: the plant at (p_from_x, p_from_y) to (p_to_x, p_to_y), in one bed of theirs.
CREATE OR REPLACE FUNCTION public.town_move(p_from_x integer, p_from_y integer, p_to_x integer, p_to_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  fx integer := coalesce(p_from_x, -1);
  fy integer := coalesce(p_from_y, -1);
  tx integer := coalesce(p_to_x, -1);
  ty integer := coalesce(p_to_y, -1);
  from_ text := fx::text || ',' || fy::text;
  to_ text := tx::text || ',' || ty::text;
  bed_n integer := town.bed_of(fx, fy);
  plots jsonb;
  owner text;
  did jsonb;
  swap_ boolean;
  help jsonb;
begin
  if bed_n < 0 then return town.answer(me, town.no('soil')); end if;
  -- one at a time in a bed, as every deed there (town_tend)
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))
           || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
    into plots from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.move_plant(from_, to_, plots, purse, me::text, now_, owner);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  swap_ := (did->>'swap')::boolean;
  perform town.keep_purse(me, did->'purse');
  -- each plot emptied, then each plant set in its new place: every write a change of the bed for town.quality_keep (v270),
  -- as for a plant dug out and one sown (lib/town/quality-plant's syncMove lays it the same way). Emptied first, so that a
  -- plant set where another of the same sowing stood (two sown at one moment from the seed pouch) is never taken for it.
  update public.town_plots p set soil = 'tilled', plant = null, damp = false, changed = now_ where p.x = fx and p.y = fy;
  if swap_ then
    update public.town_plots p set soil = 'tilled', plant = null, damp = false, changed = now_ where p.x = tx and p.y = ty;
    update public.town_plots p set plant = did->'plots'->from_->'plant', changed = now_ where p.x = fx and p.y = fy;
  end if;
  update public.town_plots p set soil = 'tilled', plant = did->'plots'->to_->'plant', damp = false, changed = now_ where p.x = tx and p.y = ty;
  -- who helped each plant goes with it (whom its picking thanks: town.helpers_of); what helped the plant that was there
  -- before, on an empty plot, is forgotten, as a sowing forgets it
  select coalesce(jsonb_agg(jsonb_build_object('x', h.x, 'y', h.y, 'helper', h.helper, 'owner', h.owner, 'water', h.water, 'carry', h.carry)), '[]'::jsonb) into help
    from public.town_plot_help h where (h.x = fx and h.y = fy) or (h.x = tx and h.y = ty);
  delete from public.town_plot_help h where (h.x = fx and h.y = fy) or (h.x = tx and h.y = ty);
  insert into public.town_plot_help (x, y, helper, owner, water, carry)
    select case when (e->>'x')::integer = fx and (e->>'y')::integer = fy then tx else fx end,
           case when (e->>'x')::integer = fx and (e->>'y')::integer = fy then ty else fy end,
           (e->>'helper')::uuid, (e->>'owner')::uuid, coalesce((e->>'water')::integer, 0), coalesce((e->>'carry')::integer, 0)
      from jsonb_array_elements(help) e where swap_ or ((e->>'x')::integer = fx and (e->>'y')::integer = fy);
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  -- (written down, and on no line: a move earns nothing)
  perform town.note(me, 'move', did->'plots'->to_->'plant'->>'crop', 1, 0,
    jsonb_build_object('from', jsonb_build_array(fx, fy), 'to', jsonb_build_array(tx, ty), 'bed', bed_n)
      || case when swap_ then jsonb_build_object('swap', did->'plots'->from_->'plant'->>'crop') else '{}'::jsonb end);
  -- the answer brings every plot of the bed as it is kept now, each plant settled with what the bed gives it
  return town.answer(me, did - 'plots') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))
             || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n));
end $function$;

revoke all on function town.home_of(text,jsonb), town.movable(text,jsonb,text,bigint), town.open_plot(jsonb), town.moved_to(text,text,jsonb,bigint),
 town.move_plant(text,text,jsonb,jsonb,text,bigint,text), town.quality_harvest(text,jsonb,integer,bigint,text,integer,boolean),
 town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean), town.pick(text,jsonb,jsonb,boolean,text,bigint,text) from public, anon, authenticated;
revoke all on function public.town_move(integer,integer,integer,integer) from public, anon;
grant execute on function public.town_move(integer,integer,integer,integer) to authenticated;
-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select data->'uses'->'charmHoe' hoe, data->'uses'->'famMandrake' mandrake from public.town_catalog where key = 'gifts';
--     -- {"n": 10, "per": "day"} | null
--   select has_function_privilege('authenticated', 'public.town_move(integer,integer,integer,integer)', 'EXECUTE') member,
--          has_function_privilege('anon', 'public.town_move(integer,integer,integer,integer)', 'EXECUTE') stranger;  -- true | false
--   select prosrc like '%home_of%' from pg_proc where oid = 'town.pest_at(text,jsonb,bigint)'::regprocedure;     -- true
