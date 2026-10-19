-- v283: picking for one stamina, the farm's pouch of thirty slots, and every crop's price told at the farm (2026-10-19).
-- Run after v281 (v282, the teak rod, writes only the forge row: either order), with the matching site code:
-- lib/town/farm (FARMING.costs.pick), lib/town/pouches (thingPouch's slots), lib/town/keeper (farmPrices),
-- components/town/TownQuality and TownTrade. Safe to run twice.
--
-- Members, 2026-10-19: "ราคาพืชผักใน cash town ตกต่ำมาก", "ไม่มีที่เก็บ", "เช็คราคาก่อนเก็บไม่ได้", "แค่เก็บผักตอนเช้า stamina
-- ก็หมดแล้ว". The owner, the same morning: "แสดงราคาที่ฟาร์ม ให้เห็นราคาตอนนี้ ราคาของแต่ละเกรด", "ลด stamina ตอนเก็บผัก
-- จาก 2 เป็น 1 ทำอันนี้ด้วย", "กระเป๋าฟาร์ม แก้เป็น 30 ช่องไปเลย".
--   * The catalog's `farming` row: a picking costs 1 stamina, where it cost 2. Every picking reads the number there
--     (town.pick, town.row_tend, town.garden_harvest): no function changes.
--   * The catalog's `pouches` row: the spellbound seed pouch (thingPouch, the farming line's third rank) has 30 slots,
--     where it had 6. town.pouches_of reads the number; what is in the first six stays where it is.
--   * public.town_farm_prices(), new, read only: every crop's price this round, as town.prices_told tells the price of
--     a thing one holds, without the seven days gone by (`was` is empty), for the plant inspector and the seed card.
--     For members only, as every other asking of the town.
begin;

-- <catalog:v283> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":1},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "rids": {"ladybird":0.5,"mantis":0.7},
    "cures": {"pestCure":24},
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6,"swarm":{"some":1,"many":4,"adds":[0.01,0.02]}},
    "swings": {"clear":3,"till":3},
    "pulled": "compost",
    "stages": [0,0.1,0.3,0.6,1],
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","mosquitofish":"guard","herring":"feed","archerfish":"cure","lavenderSachet":"guard","butterflyWhite":"feed","monarch":"feed","mantis":"guard","ladybird":"guard","scarab":"feed","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed","seedBottleGourd":"seed","seedRowBean":"seed","seedTrellisBerry":"seed","seedBlueCorn":"seed","seedTeaBush":"seed","seedSunflowerPatch":"seed","seedRedOkra":"seed","seedLotusRootBed":"seed","seedRunnerBean":"seed","seedPeanut":"seed","seedBuckwheat":"seed","seedSesame":"seed","seedClover":"seed","seedGardenStrawberry":"seed","seedRhubarb":"seed","seedWatercress":"seed","seedFig":"seed","seedBorage":"seed","seedPassionfruit":"seed","seedMilkweed":"seed","seedFennel":"seed","seedMarigold":"seed","seedNasturtium":"seed","seedGarlicChives":"seed","seedDill":"seed","seedPearlNut":"seed","seedSilverGrain":"seed","seedDewSesame":"seed","seedGlassFlower":"seed","seedOpalStalk":"seed","seedCrystalLeaf":"seed","seedDewFig":"seed","seedSilkPollen":"seed","seedMint":"seed","seedChamomile":"seed","seedLavender":"seed"},
    "seeds": {"seedBottleGourd":"bottleGourd","seedRowBean":"rowBean","seedTrellisBerry":"trellisBerry","seedBlueCorn":"blueCorn","seedTeaBush":"teaBush","seedSunflowerPatch":"sunflowerPatch","seedRedOkra":"redOkra","seedLotusRootBed":"lotusRootBed","seedRunnerBean":"runnerBean","seedPeanut":"peanut","seedBuckwheat":"buckwheat","seedSesame":"sesame","seedClover":"clover","seedGardenStrawberry":"gardenStrawberry","seedRhubarb":"rhubarb","seedWatercress":"watercress","seedFig":"fig","seedChamomile":"chamomile","seedBorage":"borage","seedLavender":"lavender","seedPassionfruit":"passionfruit","seedMilkweed":"milkweed","seedFennel":"fennel","seedMarigold":"marigold","seedNasturtium":"nasturtium","seedGarlicChives":"garlicChives","seedMint":"mint","seedDill":"dill","seedPearlNut":"pearlNut","seedSilverGrain":"silverGrain","seedDewSesame":"dewSesame","seedGlassFlower":"glassFlower","seedOpalStalk":"opalStalk","seedCrystalLeaf":"crystalLeaf","seedDewFig":"dewFig","seedSilkPollen":"silkPollen","seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2,"waterYoke":2,"waterYokeGreat":4,"waterCart":6},
    "well": 100,
    "fill": 2,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30,
    "gifted": {"glass":{"hours":3,"kept":40},"encore":0.5},
    "helping": {"most":3,"anklet":{"run":20,"gap":45,"top":3,"long":12},"bell":{"within":10,"back":2,"plants":25},"ring":{"part":0.5,"reach":3},"dust":{"kept":12},"told":8}
  }$town$::jsonb),
  ('pouches', $town$[{"gift":"thingCreel","slots":5,"holds":["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish","creekDace","torrentBarb","stoneLapper","glassGoby","brookTrout","caveBlindfish","uplandEel","springShrimp","riverLamprey","marbleMahseer","torrentSleeper","waterfallSturgeon","reedMinnow","ribbonRasbora","pebbleLoach","willowShiner","sandGudgeon","amberChub","fernBarbel","redfinDace","stripedSpinyLoach","leafPerch","copperBream","needleHalfbeak","spottedCreekCatfish","saffronLoach","longfinCreekCarp","orchidSnakehead","creekDragonfish","ancientCreekBarbel","silverSpringDace","rockSculpin","mossLoach","swiftGrayling","bluefinTrout","mountainWhitefish","cascadeChar","graniteGoby","windfinMahseer","crimsonHillBarb","snowlineTrout","ridgePike","mistSalmon","blackstoneEel","cloudCrownMahseer","thunderbackSturgeon","poolMedaka","lilyGourami","moonspotGoby","mossfinPerch","roundtailBetta","duskFeatherfin","petalKillifish","caveGlassPerch","spottedPoolCatfish","ivoryKnifefish","jadeSleeper","caveRibbonEel","violetCaveChar","mirrorPoolCarp","starfinBichir","moonveilArowana","crystalCaveDragon","pearlDanio","peacockGudgeon","huchen","forktailBlueEye","empireGudgeon","lenok","zebrafish","europeanChub","arcticChar","rosyBitterling","pumpkinseed","europeanGrayling","leastKillifish","australianBass","lakeWhitefish","tench","goldenDorado","europeanBullhead","glassKnifefish","tigerShovelnose","burbot","elephantnoseFish","freshwaterSole","dollyVarden"]},{"gift":"thingSack","slots":5,"holds":["stone","shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx","oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx","slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","mineralSalt","wholeGeode"]},{"gift":"thingBundle","slots":3,"holds":["log","timber","knottedWood","straightWood","heartwood","cedarSliver","pineBark","pinePitch","pineNut","rootFiber"]},{"gift":"thingPouch","slots":30,"holds":["bottleGourd","rowBean","trellisBerry","blueCorn","teaBush","sunflowerPatch","redOkra","lotusRootBed","runnerBean","peanut","buckwheat","sesame","clover","gardenStrawberry","rhubarb","watercress","fig","chamomile","borage","lavender","passionfruit","milkweed","fennel","marigold","nasturtium","garlicChives","mint","dill","pearlNut","silverGrain","dewSesame","glassFlower","opalStalk","crystalLeaf","dewFig","silkPollen","kangkong","scallion","cabbage","carrot","daikon","corn","chili","tomato","basil","sweetPotato","garlic","pumpkin","eggplant","cucumber","longBean","lemongrass","galangal","lime","papaya","mango","banana","coconut","ginger","turmeric","taro","watermelon","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedDaikon","seedCorn","seedChili","seedTomato","seedBasil","seedSweetPotato","seedGarlic","seedPumpkin","seedEggplant","seedCucumber","seedLongBean","seedLemongrass","seedGalangal","seedLime","seedPapaya","seedMango","seedBanana","seedCoconut","seedGinger","seedTurmeric","seedTaro","seedWatermelon","seedBottleGourd","seedRowBean","seedTrellisBerry","seedBlueCorn","seedTeaBush","seedSunflowerPatch","seedRedOkra","seedLotusRootBed","seedRunnerBean","seedPeanut","seedBuckwheat","seedSesame","seedClover","seedGardenStrawberry","seedRhubarb","seedWatercress","seedFig","seedBorage","seedPassionfruit","seedMilkweed","seedFennel","seedMarigold","seedNasturtium","seedGarlicChives","seedDill","seedPearlNut","seedSilverGrain","seedDewSesame","seedGlassFlower","seedOpalStalk","seedCrystalLeaf","seedDewFig","seedSilkPollen","seedMint","seedChamomile","seedLavender"]}]$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v283>

create or replace function public.town_farm_prices()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
-- v283: every crop's price this round, for the farm (the owner, 2026-10-19). Read only; the market is brought to the
-- round as town.prices_told brings it.
declare
  me uuid := town.member();
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  items jsonb := town.cat('items');
  told jsonb;
begin
  select coalesce(jsonb_object_agg(t.id, jsonb_build_object(
      'f', town.factor_of(market, t.id), 'floor', (things->t.id->>1)::int, 'ceil', (things->t.id->>2)::int,
      'base', (things->t.id->>4)::numeric, 'demand', town.market_demand(t.id, cur),
      'demandTrend', sign(town.market_demand(t.id, cur) - town.market_demand(t.id, cur - 1))::int,
      'was', '[]'::jsonb)), '{}'::jsonb)
    into told
    from jsonb_object_keys(things) t(id)
   where items->t.id->>'kind' = 'crop';
  return jsonb_build_object('farmPrices', jsonb_build_object('round', cur, 'things', told));
end;
$function$;
revoke all on function public.town_farm_prices() from public, anon;
grant execute on function public.town_farm_prices() to authenticated;

commit;

-- What it should say afterwards:
--   select data->'costs'->>'pick' from public.town_catalog where key = 'farming';                                   -- 1
--   select e->>'slots' from public.town_catalog c, jsonb_array_elements(c.data) e where c.key = 'pouches' and e->>'gift' = 'thingPouch';  -- 30
--   select count(*) from jsonb_object_keys((public.town_farm_prices())->'farmPrices'->'things');  -- every crop whose price moves (as a member)
