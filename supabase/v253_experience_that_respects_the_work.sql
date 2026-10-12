-- v253: profession XP pays for occupied space, real harvest cycles and harder work.
-- Run AFTER v251 and the matching site deploy. v252 prices are independent.
-- Safe to run twice. Existing earned XP, rank thresholds, gifts, prices and real-water statistics are preserved.
-- Harvest full-XP allowance: 150/day, saved up to 7 days. Helpers/well: 375/day then 25%.
-- Root metadata comes from locked server plots. Only actual carrier increments award well XP.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $guard$ begin
 perform 1 from public.town_catalog where key='work' for update;
 if town.cat('work') is null or town.cat('work')->'ids' is distinct from '["kitchen","well","helpers","fishing","forest","insects","farming","felling","mining"]'::jsonb then raise exception 'Unexpected profession catalog: review v253';end if;
 if md5(replace(pg_get_functiondef('town.work_count(jsonb,jsonb,integer)'::regprocedure),chr(13),'')) not in ('a230d299e736b6ce99179fddc781597f','c9ce00323dca45659246caf2e0ee2abc') then raise exception 'Definition changed: town.work_count(jsonb,jsonb,integer); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.work_told(uuid,bigint)'::regprocedure),chr(13),'')) not in ('89efc256ea26159036fd6798553b48b8','396ed9a513996ae69a602d3c13697f0c') then raise exception 'Definition changed: town.work_told(uuid,bigint); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure),chr(13),'')) not in ('db20b680ffd5aa49cc512ccac747cb23','aae30c6dcbedb5f552dbcc60248f237b') then raise exception 'Definition changed: town.work_counts_of(jsonb,text); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('public.town_tend(integer,integer,jsonb,boolean)'::regprocedure),chr(13),'')) not in ('4c686cbc8c6db2d24d1c7354a5df9013','58bbe4a2660d4feba14cba88341f609a') then raise exception 'Definition changed: public.town_tend(integer,integer,jsonb,boolean); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('public.town_row(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('135e9a8bd54f501d321b4b20b603957d','e0a2291de5fd2c6d91e1cd7e670dc7d5') then raise exception 'Definition changed: public.town_row(integer,integer,jsonb,jsonb); rebuild v253 on current text';end if;
end $guard$;
-- Freeze carrier deltas and XP writes during the one-time conversion; no earned action can fall in a backfill gap.
lock table public.town_carriers,public.town_work in share row exclusive mode;

-- Exactly once: carry forward earned XP and real-water ranks, never replay old deeds.
do $initialise$ declare d integer:=town.day_of(town.now_ms());begin
 if coalesce((town.cat('work')->>'experienceVersion')::integer,1)<2 then
  insert into public.town_work(member_id,line,kept)
   select c.member_id,'well',town.work_new()||jsonb_build_object('points',c.buckets,'day',d,'earned',0) from public.town_carriers c
   on conflict(member_id,line) do update set kept=public.town_work.kept||jsonb_build_object('points',greatest((public.town_work.kept->>'points')::numeric,(excluded.kept->>'points')::numeric),'day',d,'today',0,'held','{}'::jsonb,'earned',0);
  update public.town_work set kept=kept||jsonb_build_object('earned',case when (kept->>'day')::integer=d then town.work_counted_on('helpers',0,(kept->>'today')::double precision) else 0 end) where line='helpers';
  insert into public.town_work(member_id,line,kept)
   select b.member_id,'farming',town.work_new()||jsonb_build_object('day',d,'reserve',least(1050,150*greatest(1,d-town.day_of(min((p.plant->>'sown')::bigint))+1)),'earned',0)
   from public.town_beds b join public.town_plots p on p.bed=b.bed and p.plant->>'by'=b.member_id::text
   where p.plant is not null group by b.member_id on conflict(member_id,line) do nothing;
  -- Use the old last-action day once when converting a previously earned harvest allowance.
  update public.town_work set kept=kept||jsonb_build_object('reserve',case when (kept->>'day')::integer<0 then 150 else least(1050,greatest(0,150-(kept->>'today')::double precision)+greatest(0,d-(kept->>'day')::integer)*150) end,'day',d,
   'today',case when (kept->>'day')::integer=d then (kept->>'today')::double precision else 0 end,
   'held',case when (kept->>'day')::integer=d then kept->'held' else '{}'::jsonb end,
   'earned',case when (kept->>'day')::integer=d then town.work_counted_on('farming',0,(kept->>'today')::double precision) else 0 end)
   where line='farming' and not kept ? 'reserve';
 end if;
end $initialise$;

update public.town_catalog set data=data||$experience${"ids":["kitchen","well","helpers","fishing","forest","insects","farming","felling","mining"],"ranks":10,"past":0.25,"first":10,"experienceVersion":2,"harvestBankDays":7,"marks":{"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000],"felling":[50,150,350,700,1300,2200,3600,5500,8000,12000],"mining":[50,150,350,700,1300,2200,3600,5500,8000,12000]},"day":{"kitchen":150,"well":375,"helpers":375,"fishing":150,"forest":150,"insects":150,"farming":150,"felling":150,"mining":150},"kitchen":{"ladled":1,"pots":3,"ladling":9,"pot":{"nectarRice":4,"honeyHerbTea":4,"pollenCake":4,"orchardSoup":4,"fernRice":4,"rootStew":5,"petalBiscuit":4,"sporeNoodles":6,"springRice":5,"mintBroth":5,"mineralCongee":5,"moonTeaRice":4,"layeredRootPot":6,"crispRiceSkillet":7,"slowFishBroth":6,"glazedForestBowl":5,"sharePorridge":7,"travelerSoup":7,"friendRice":7,"restTea":7,"pineNutRice":3,"cedarBroth":6,"pineNutCake":5,"sapGlazedFish":3,"pollenRice":4,"berryTea":5,"blueCornCake":5,"lotusGardenSoup":4,"minerRice":3,"caveStew":3,"saltRoast":3,"seamCake":3,"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":5,"tomYum":5,"sourCurry":5,"friedPerch":2,"fishCake":5,"spicyEel":4,"grilledPrawn":2,"steamedGoby":4,"pumpkinSoup":5,"shabu":14,"somTam":6,"grilledEggplant":3,"tomKha":6,"friedGourami":2,"crabCurry":7,"steamedSheatfish":4,"friedFrog":2,"laab":7,"omelette":2,"snailCurry":6,"candiedPumpkin":5,"friedRice":4,"greenCurry":9,"khanomJeen":10,"hoMok":8,"mangoStickyRice":7,"bananaInCoconut":5,"taroPudding":9,"steamedCroaker":4,"gingerFish":5,"turmericFish":4,"jungleCurry":10,"megaLaab":24,"watermelonSlices":6,"khantoke":24,"naamPrik":7,"sushi":6,"ramen":7,"tempura":3,"unadon":3,"okonomiyaki":5,"kimchi":6,"bibimbap":8,"tteokbokki":5,"kimbap":5,"pajeon":3,"harGow":5,"chowMein":6,"springRoll":6,"congee":5,"mapoTofu":5,"pizza":8,"spaghetti":7,"risotto":5,"lasagna":9,"minestrone":8,"fishCurry":8,"naan":5,"biryani":7,"samosa":6,"lassi":3,"fishChips":4,"ukha":5,"thieboudienne":6,"piranhaSoup":3,"crawfishBoil":10,"masgouf":3,"salmonSteak":2,"arapaimaRoast":12,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":5,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":8,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":5,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"creekBroth":7,"smokedBrookBowl":5,"torrentSkewer":2,"springDumpling":3,"reedFishCongee":5,"sandbankSkillet":5,"fernBarbelStew":6,"creekHerbGrill":6,"orchidFishHotpot":7,"ancientCreekFeast":7,"springFishCongee":4,"bluefinMountainPan":5,"cascadeHerbStew":6,"ridgeFishGrill":5,"mistFishBroth":7,"cloudCrownFeast":7,"lilyPoolCongee":4,"duskFishSkillet":5,"glassCaveSoup":6,"jadeFishGrill":6,"mirrorPoolStew":7,"moonveilFeast":7,"splitPlank":1,"carvingBlank":3,"pitchSeal":3,"sapSyrup":2,"pineNutFlour":1,"rootTwine":1,"woodOil":3,"honeycomb":2,"gardenHoney":2,"beeswax":3,"silkTwist":2,"silkenCord":2,"chitinPlate":3,"nectarSyrup":3,"lichenSalt":2,"petalDye":2,"bulbPowder":1,"driedFern":2,"rootExtract":2,"berrySeedOil":1,"sporeCulture":2,"clearSpring":3,"herbalWater":3,"mineralWater":2,"dawnBlend":4,"rainBlend":4,"moonBlend":5,"springSalt":3,"dicedRoot":2,"emberRice":2,"brownedOnion":1,"driedZest":1,"crushedHerb":1,"fishStock":3,"roastedSeed":1,"whiskedEgg":1,"fragrantOil":4,"smokedSalt":4,"fermentStarter":3,"brightSauce":4,"thickBroth":4,"sweetGlaze":3,"spicePaste":5,"gourdCup":1,"beanPaste":1,"berryJam":2,"blueCornFlour":1,"driedTea":1,"sunflowerOil":1,"lotusStarch":1,"stoneTile":2,"crystalLens":1,"sparkPowder":1,"copperBlank":3,"steelPlate":3,"geodeDisplay":4,"fishSauce":2,"compost":1,"growFert":3,"guardFert":4,"pestCure":3,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":2,"lineSpun":1,"mulch":1,"lavenderSachet":2,"bugNet":2,"torch":2,"driedFish":2,"saltedFish":2,"curryPaste":3,"pickle":2,"charcoal":1,"rope":1,"krabung":3,"noodle":2,"coconutMilk":1,"fermentedFish":4,"shrimpPaste":2,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":5,"brookFillet":1,"smokedTrout":3,"driedDace":2,"springStock":3,"fishRoe":1,"flowFloat":3,"springLeader":3,"torrentNet":3,"shadeLure":4}},"helpers":{"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3,"dust":2,"bellows":2},"fishing":{"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":2,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":2,"popotoFish":2,"rainbowFish":2,"moonFish":9,"creekDace":1,"torrentBarb":3,"stoneLapper":1,"glassGoby":3,"brookTrout":3,"caveBlindfish":8,"uplandEel":3,"springShrimp":1,"riverLamprey":8,"marbleMahseer":8,"torrentSleeper":3,"waterfallSturgeon":31,"reedMinnow":1,"ribbonRasbora":1,"pebbleLoach":1,"willowShiner":1,"sandGudgeon":1,"amberChub":1,"fernBarbel":3,"redfinDace":3,"stripedSpinyLoach":3,"leafPerch":3,"copperBream":3,"needleHalfbeak":3,"spottedCreekCatfish":8,"saffronLoach":8,"longfinCreekCarp":8,"orchidSnakehead":8,"creekDragonfish":30,"ancientCreekBarbel":31,"silverSpringDace":1,"rockSculpin":1,"mossLoach":1,"swiftGrayling":1,"bluefinTrout":1,"mountainWhitefish":1,"cascadeChar":3,"graniteGoby":3,"windfinMahseer":3,"crimsonHillBarb":3,"snowlineTrout":3,"ridgePike":3,"mistSalmon":8,"blackstoneEel":8,"cloudCrownMahseer":30,"thunderbackSturgeon":31,"poolMedaka":1,"lilyGourami":1,"moonspotGoby":1,"mossfinPerch":1,"roundtailBetta":1,"duskFeatherfin":1,"petalKillifish":3,"caveGlassPerch":3,"spottedPoolCatfish":3,"ivoryKnifefish":3,"jadeSleeper":3,"caveRibbonEel":3,"violetCaveChar":8,"mirrorPoolCarp":8,"starfinBichir":8,"moonveilArowana":30,"crystalCaveDragon":31},"forest":{"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"],"kinds":{"ring":5,"bough":4},"parts":["bambooSheath","berryPip","fernTip","flowerBulb","forestLichen","fragrantPetal","mushroomSpores","wildMedicRoot"],"part":2},"insects":{"butterflyWhite":1,"monarch":8,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":8,"scarab":1,"caterpillar":1,"honeyBee":8,"carpenterBee":8,"lacewing":8,"hoverfly":8,"silkMoth":8,"goldenAnt":8,"orchardBeetle":8,"pollenMidge":8},"farming":{"bottleGourd":18,"rowBean":10,"trellisBerry":48,"blueCorn":30,"teaBush":28,"sunflowerPatch":18,"redOkra":12,"lotusRootBed":30,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":4,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12},"farmingAgain":{"bottleGourd":12,"rowBean":4,"trellisBerry":18,"blueCorn":33,"teaBush":12,"sunflowerPatch":21,"redOkra":6,"lotusRootBed":33,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":2,"tomato":4,"basil":2,"sweetPotato":7,"garlic":5,"pumpkin":14,"eggplant":3,"cucumber":2,"longBean":2,"lemongrass":4,"galangal":9,"lime":6,"papaya":6,"mango":7,"banana":6,"coconut":8,"ginger":11,"turmeric":11,"taro":16,"watermelon":14},"farmingCells":{"bottleGourd":3,"rowBean":2,"trellisBerry":3,"blueCorn":3,"teaBush":2,"sunflowerPatch":3,"redOkra":2,"lotusRootBed":3,"kangkong":1,"scallion":1,"cabbage":1,"carrot":1,"daikon":1,"corn":1,"chili":1,"tomato":1,"basil":1,"sweetPotato":1,"garlic":1,"pumpkin":1,"eggplant":1,"cucumber":1,"longBean":1,"lemongrass":1,"galangal":1,"lime":1,"papaya":1,"mango":1,"banana":1,"coconut":1,"ginger":1,"turmeric":1,"taro":1,"watermelon":1},"farmingCare":2,"farmingGiantCells":4,"well":{"bucket":1},"fellingGirth":[0,1,2],"fellingPerfect":1,"miningDepth":[1,2,3],"miningPerfect":2,"felling":{"pine":2,"ironwood":4,"moonwood":6,"elder":12},"braced":1,"mining":{"rock":1,"vein":3,"way":5,"crystal":10,"lent":1,"lending":1}}$experience$::jsonb,updated_at=now() where key='work';

-- Read only trusted pre-harvest root state; callers cannot supply these fields.
create or replace function town.harvest_work(p jsonb) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('picked',coalesce((p->>'picked')::integer,0),'giant',coalesce(p->'giant'='true'::jsonb,false),
  'started',town.day_of((p->>'sown')::bigint),'care',case when coalesce((p->>'watered')::bigint,0)>coalesce((p->>'pickedAt')::bigint,0) then 1 else 0 end + case when coalesce((p->>'fed')::bigint,0)>coalesce((p->>'pickedAt')::bigint,0) then 1 else 0 end)
$$;
create or replace function town.work_depth(doc jsonb) returns integer language sql immutable set search_path='' as $$
 select case when jsonb_typeof(doc->'floor')='number' and (doc->>'floor')::numeric=floor((doc->>'floor')::numeric)
  then case when (doc->>'floor')::numeric>=21 then 3 when (doc->>'floor')::numeric>=11 then 2 else 1 end else 1 end
$$;
create or replace function town.work_reserve(k jsonb,d integer,started integer default null) returns double precision language sql stable set search_path='' as $$
 select least(daily*days,case when coalesce((k->>'day')::integer,-1)<0 then daily*case when started is null then 1 else greatest(1,d-started+1) end
  else case when jsonb_typeof(k->'reserve')='number' then greatest(0,(k->>'reserve')::double precision) else greatest(0,daily-coalesce((k->>'today')::double precision,0)) end
   + greatest(0,d-(k->>'day')::integer)*daily end)
 from (select (town.cat('work')->'day'->>'farming')::double precision daily,(town.cat('work')->>'harvestBankDays')::integer days) c
$$;
create or replace function town.work_earned(line_ text,k jsonb,d integer) returns double precision language sql stable set search_path='' as $$
 select case when (k->>'day')::integer is distinct from d then 0 when k ? 'earned' then (k->>'earned')::double precision
  when line_='well' then (k->>'today')::double precision
  when line_='helpers' then least(200,greatest(0,(k->>'today')::double precision))+greatest(0,(k->>'today')::double precision-200)*(town.cat('work')->>'past')::double precision
  else town.work_counted_on(line_,0,(k->>'today')::double precision) end
$$;
revoke all on function town.harvest_work(jsonb),town.work_depth(jsonb),town.work_reserve(jsonb,integer,integer),town.work_earned(text,jsonb,integer) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.work_count(p_kept jsonb, p_c jsonb, p_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 first_ double precision:=(town.cat('work')->>'first')::double precision;
 on_ jsonb:=case when (p_kept->>'day')::integer=p_day then p_kept else p_kept||jsonb_build_object('day',p_day,'today',0,'held','{}'::jsonb)||case when p_kept ? 'earned' then '{"earned":0}'::jsonb else '{}'::jsonb end end;
 raw double precision:=greatest(0,(p_c->>'raw')::double precision);
 held jsonb:=on_->'held'; firsts jsonb:=on_->'firsts'; key_ text; had integer; reserve_ double precision; full_ double precision; gain double precision;
begin
 if jsonb_typeof(p_c->'held')='object' then
  key_:=p_c->'held'->>'key';had:=coalesce((held->>key_)::integer,0);
  if had>=(p_c->'held'->>'most')::integer then raw:=0;else held:=held||jsonb_build_object(key_,had+1);end if;
 end if;
 if jsonb_typeof(p_c->'first')='string' and not firsts ? (p_c->>'first') then raw:=raw+first_;firsts:=firsts||jsonb_build_array(p_c->>'first');end if;
 if p_c->>'line'='farming' then
  reserve_:=town.work_reserve(p_kept,p_day,(p_c->>'started')::integer);full_:=least(raw,reserve_);gain:=full_+(raw-full_)*(town.cat('work')->>'past')::double precision;
  return jsonb_build_object('points',(on_->>'points')::double precision+gain,'day',p_day,'today',(on_->>'today')::double precision+raw,'held',held,'firsts',firsts,
   'reserve',reserve_-full_,'earned',case when (p_kept->>'day')::integer=p_day then coalesce((p_kept->>'earned')::double precision,town.work_counted_on('farming',0,(p_kept->>'today')::double precision)) else 0 end+gain);
 end if;
 if raw<=0 then return on_||jsonb_build_object('held',held,'firsts',firsts);end if;
 gain:=town.work_counted_on(p_c->>'line',(on_->>'today')::double precision,raw);
 return jsonb_build_object('points',(on_->>'points')::double precision+gain,
  'day',p_day,'today',(on_->>'today')::double precision+raw,'held',held,'firsts',firsts)
  ||case when p_c->>'line' in ('helpers','well') then jsonb_build_object('earned',town.work_earned(p_c->>'line',p_kept,p_day)+gain) else '{}'::jsonb end;
end $function$
;
CREATE OR REPLACE FUNCTION town.work_told(p_member uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_object_agg(i.id,jsonb_build_object('points',coalesce((k.kept->>'points')::double precision,case when i.id='well' then (select c.buckets from public.town_carriers c where c.member_id=p_member) else 0 end,0),
  'today',daily.raw,'earned',town.work_earned(i.id,coalesce(k.kept,town.work_new()),town.day_of(p_now)),
  'bound',(town.cat('work')->'day'->>i.id)::double precision,
  'full',case when i.id='farming' then town.work_reserve(coalesce(k.kept,town.work_new()),town.day_of(p_now),null) else greatest(0,(town.cat('work')->'day'->>i.id)::double precision-daily.raw) end))
 from jsonb_array_elements_text(town.cat('work')->'ids') i(id)
 left join public.town_work k on k.member_id=p_member and k.line=i.id
 cross join lateral (select case when (k.kept->>'day')::integer=town.day_of(p_now) then coalesce((k.kept->>'today')::double precision,0) else 0 end raw) daily
$function$
;
CREATE OR REPLACE FUNCTION town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  -- v197: an experiment counts like a cooked preparation; a camp only credits help to another member.
  if what = 'prepare' and l->'kitchen'->'pot' ? thing then
    return jsonb_build_array(jsonb_build_object('to',null,'line','kitchen','raw',l->'kitchen'->'pot'->thing,'first','kitchen:'||thing,'held',jsonb_build_object('key','pot:'||thing,'most',l->'kitchen'->'pots')));
  end if;
  if what = 'camp_prepare' then
    if jsonb_typeof(doc->'owner')='string' and doc->>'owner'<>p_doer then
      return jsonb_build_array(jsonb_build_object('to',doc->>'owner','line','helpers','raw',l->'helpers'->'water','held',jsonb_build_object('key','camp:'||p_doer,'most',3)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'sow' then
    return case when other is null or other='' or other=p_doer then jsonb_build_array(jsonb_build_object('to',null,'line','farming','raw',0)) else '[]'::jsonb end;
  end if;
  if what = 'carry' then
    return case when coalesce((p_done->>'n')::numeric,0)>0 then jsonb_build_array(jsonb_build_object('to',null,'line','well','raw',floor((p_done->>'n')::numeric))) else '[]'::jsonb end;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      -- ── the older tools (v174): what a watering's deed says of a forged can, never more than the option's own number ──
      if what = 'water' and jsonb_typeof(doc->'kind') = 'number' and (doc->>'kind')::numeric > 0 then
        return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw',
          (l->'helpers'->>what)::numeric + least(coalesce((town.cat('forge')->'options'->'of'->'cnKind'->'six'->'n'->>'points')::numeric, town.opt_n('cnKind', 'points')::numeric), floor((doc->>'kind')::numeric))));
      end if;
      -- ── the older tools (v174): its end ──
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := coalesce((l->'forest'->'kinds'->>(doc->>'kind'))::double precision,(l->'forest'->'how'->>(doc->>'how'))::double precision) + case when l->'forest'->'parts' ? thing then (l->'forest'->>'part')::double precision else 0 end + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', to_jsonb((l->'felling'->>thing)::numeric + case when jsonb_typeof(doc->'girth')='number' and (doc->>'girth')::numeric=floor((doc->>'girth')::numeric) then greatest(0,least(2,(doc->>'girth')::numeric)) else 0 end + case when doc->'misses'='0'::jsonb then (l->>'fellingPerfect')::numeric else 0 end), 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', town.work_depth(doc)::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') or coalesce((p_done->>'n')::numeric,1)<=0 then '0'::jsonb else to_jsonb((l->'mining'->>'vein')::numeric+town.work_depth(doc)-1 + case when jsonb_typeof(doc->'of')='number' and (doc->>'of')::numeric>0 and doc->'passed'=doc->'of' then (l->>'miningPerfect')::numeric else 0 end) end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', to_jsonb((l->'mining'->>'crystal')::numeric+town.work_depth(doc)-1))
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──
  if what = 'bellows' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the blacksmith (v174): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '' or other=p_doer) then
      raw:=case when jsonb_typeof(doc->'picked')='number' and (doc->>'picked')::numeric>0 then (l->'farmingAgain'->>thing)::double precision else (l->'farming'->>thing)::double precision end;
      if doc->'giant'='true'::jsonb then raw:=raw/(l->'farmingCells'->>thing)::double precision*(l->>'farmingGiantCells')::double precision;end if;
      if jsonb_typeof(doc->'care')='number' then raw:=raw+least((l->>'farmingCare')::double precision,greatest(0,floor((doc->>'care')::double precision)));end if;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', raw, 'first', 'farming:' || thing)
        || case when jsonb_typeof(doc->'started')='number' and (doc->>'started')::numeric=floor((doc->>'started')::numeric) then jsonb_build_object('started',doc->'started') else '{}'::jsonb end);
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_tend(p_x integer, p_y integer, p_timing jsonb DEFAULT NULL::jsonb, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
  -- ── the older tools (v174): the plots of the row as they stood, what the deed did beside its own plot, those plots as they are kept, and one of them ──
  row_ jsonb;
  more_ jsonb;
  also_ jsonb;
  k_ text;
  beside_ jsonb;
  garden_ jsonb;
  cells_ jsonb;
  rotation_ integer := 0;
  crop_ text;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): the plot with its `damp`, where it has one ──
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  garden_ := town.garden_plots(key);
  crop_ := town.cat('farming')->'seeds'->>town.hand_of(purse);
  if coalesce(plot->'plant','null'::jsonb)='null'::jsonb and town.cat('gardening')->'shapes' ? crop_ then
    if p_timing ? 'rotation' and not coalesce(jsonb_typeof(p_timing->'rotation')='number' and (p_timing->>'rotation')::numeric between 0 and 3 and (p_timing->>'rotation')::numeric=floor((p_timing->>'rotation')::numeric),false) then return town.answer(me,town.no('none')); end if;
    rotation_ := coalesce((p_timing->>'rotation')::integer,0);
    cells_ := town.garden_room(key,crop_,garden_,rotation_);
    if cells_ is null then return town.answer(me,town.no('soil')); end if;
  end if;
  if plot->'plant'->>'root'=key then others:=greatest(0,others-jsonb_array_length(plot->'plant'->'footprint')+1); end if;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  if did->>'deed'='sow' and cells_ is not null then did:=town.garden_sown(key,purse,did,cells_,rotation_); end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when did->>'deed'='pick' then town.harvest_work(plot->'plant') else '{}'::jsonb end
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- ── the older tools (v174): what the lines of work read of a forged can (nothing, of any other) ──
        || town.kind_doc(purse, did->>'deed', plot, me::text)
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
  end if;
  -- ── the older tools (v174): what a deed done with a forged hoe or can does to the plots beside its own: plots of this row of this bed, which is held whole above; each is kept as the deed's own was, and none is a deed of its own ──
  if did->>'deed' in ('clear', 'till', 'water') and purse->>'hand' in ('hoe', 'can') and town.bag_forged(purse->'bag', purse->>'hand') and town.forged(town.hand_stack(purse)) then
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into row_
      from public.town_plots p where p.bed = bed_n and (p.y = p_y or town.tool_has(town.hand_stack(purse), 'cnRain'));
    more_ := town.beside(key, case when town.tool_has(town.hand_stack(purse), 'cnRain') then town.bed_keys(p_x, p_y) else town.row_keys(p_x, p_y) end, row_ || jsonb_build_object(key, plot), did->>'deed', purse, after, me::text, now_,
      town.owner_of(keeping, others > 0 or coalesce(plot->'plant', 'null'::jsonb) <> 'null'::jsonb, now_));
    after := more_->'purse';
    for k_ in select o.key from jsonb_each(more_->'plots') o order by split_part(o.key, ',', 1)::integer loop
      beside_ := more_->'plots'->k_;
      if did->>'deed' = 'water' and row_ ? k_ then
        beside_ := town.poured_as(row_->k_, beside_, now_, town.hot(now_), town.well_kind(now_), me::text, 1, wears);
      end if;
      insert into public.town_plots (x, y, bed, soil, plant, changed)
        values (split_part(k_, ',', 1)::integer, split_part(k_, ',', 2)::integer, bed_n, beside_->>'soil', nullif(beside_->'plant', 'null'::jsonb), now_)
        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
      also_ := coalesce(also_, '{}'::jsonb) || jsonb_build_object(k_, beside_);
    end loop;
  end if;
  -- ── the older tools (v174): its end ──
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then
    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;
  end if;
  -- ── the older tools (v174): its end ──
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  if cells_ is not null or plot->'plant' ? 'footprint' then
    select coalesce(jsonb_object_agg(p.x::text||','||p.y::text,jsonb_build_object('soil',p.soil,'plant',coalesce(p.plant,'null'::jsonb))),'{}'::jsonb) || coalesce(also_,'{}'::jsonb) into also_
      from public.town_plots p where p.bed=bed_n and p.x::text||','||p.y::text <> key and coalesce(cells_,plot->'plant'->'footprint') ? (p.x::text||','||p.y::text);
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses)
    -- ── the older tools (v174): the plots beside it that the deed changed, by their keys and as they are kept ──
    || case when also_ is not null then jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_row(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): each plot with its `damp`, where it has one ──
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when did->>'deed'='pick' then town.harvest_work(plots->(e->>'key')->'plant') else '{}'::jsonb end
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
    -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then
      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;
    end if;
    -- ── the older tools (v174): its end ──
  end loop;
  perform town.keep_purse(me, did->'purse');
  if n > 0 then
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$function$
;

-- One actual carrier increment, including each distinct relay participant, is credited once.
create or replace function town.work_carried() returns trigger language plpgsql set search_path='' as $$
declare delta_ numeric;
begin
 delta_:=new.buckets-case when tg_op='INSERT' then 0 else old.buckets end;
 if delta_>0 then perform town.work_counted(new.member_id,jsonb_build_object('from','deed','what','carry','thing',null,'n',delta_,'doc','{}'::jsonb),town.now_ms());end if;
 return new;
end $$;
revoke all on function town.work_carried() from public,anon,authenticated;
drop trigger if exists town_carriers_experience on public.town_carriers;
create trigger town_carriers_experience after insert or update of buckets on public.town_carriers for each row execute function town.work_carried();

revoke all on function town.work_count(jsonb,jsonb,integer),town.work_told(uuid,bigint),town.work_counts_of(jsonb,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: version 2, 9 professions, 7 harvest-bank days and 375 for both community lines.
select data->>'experienceVersion' as experience_version,jsonb_array_length(data->'ids') as professions,
 data->>'harvestBankDays' as harvest_bank_days,data#>>'{day,helpers}' as helper_full_xp,data#>>'{day,well}' as well_full_xp
from public.town_catalog where key='work';
