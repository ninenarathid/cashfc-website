-- v264: the time bands' newcomers (the farm's Quality, piece 4b): twenty-four insects, twenty-four fish and four rare
-- finds, each found by its place, its band and its habit or bait. Run after v263 and with the matching site code. Safe
-- to run twice.
--
-- The newcomers never take an old one's place (lib/town/band-species):
-- - an insect keeps to haunts of its own kinds (flowers, leaves, logs, bark, litter, sand, fence posts), laid out after
--   the 94 old haunts, which keep their numbers; such a haunt has nothing so often beside its newcomers (its kind's
--   `none`), a newcomer that spans several bands weighs half outside its peak band (town.bug_weight), and nothing
--   comes back from or to one (town.comeback). The old haunts' draws are as they were, to the last roll.
-- - a fish only ever takes the place of what is no fish (town.fresh_odds, called last in town_cast): every fish keeps
--   its chance on every cast; what is no fish but a pearl or a chest comes up that much less often where a newcomer
--   fits. The newcomer small fish go on a hook as a minnow does.
-- - the mist mushroom and the queen of the night's pollen come in a quiet turn of the forest's mushrooms and flowers
--   (town.wild_holds); the dew is a sample of the mountain stream's banks from 05:00 to 07:00 (town.stream_work); the
--   bat guano falls with a plain rock of the cave broken from 18:00 to 19:00, besides what the rock left (town.mine_pay).
--
-- The catalog's items, fish, fishing, forest, insects, insect_garden, quality, stream_work, work and pouches rows are
-- written over from the code (lib/town/catalog's seedFor), and band_species is new (the guano, and every newcomer's
-- window for a museum later).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.garden_cross(text,jsonb,text,bigint)') is null or not exists (select 1 from public.town_catalog where key = 'quality' and data ? 'crosses') then raise exception 'Run v263 before v264'; end if;
-- <guards:v264>
 if md5(replace(pg_get_functiondef('town.bug_at(integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('a0ce1bea55b0d038936a1063284145f5','37b259c5fec9c6f22a6937fbb054229b') then raise exception 'Definition changed: town.bug_at(integer,bigint,jsonb,text); rebuild v264'; end if;
 if md5(replace(pg_get_functiondef('town.comeback(integer,bigint,jsonb,double precision,double precision,double precision,jsonb,text)'::regprocedure),chr(13),'')) not in ('a54d4d303c2022f1493d5297de665be7','faeb143023d73844a736068a6536abb6') then raise exception 'Definition changed: town.comeback(integer,bigint,jsonb,double precision,double precision,double precision,jsonb,text); rebuild v264'; end if;
 if md5(replace(pg_get_functiondef('town.wild_holds(integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('a0172511c2c779fd2b16cabeda840a09','040aba079d5137b5cfade6d07694c599') then raise exception 'Definition changed: town.wild_holds(integer,bigint,jsonb,text); rebuild v264'; end if;
 if md5(replace(pg_get_functiondef('town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('24e9653cd412a89c625598e73c357291','80da649d104c9bfae58efdc27cc8acf6') then raise exception 'Definition changed: town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint); rebuild v264'; end if;
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('37d8276bae0466bbe7f4e16f777e1a4e','d7abe1ec9fbbb2b028e591ff824f3e11') then raise exception 'Definition changed: town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v264'; end if;
 if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('e330aa9d72efde95d2b67ab8b5b8dc7f','3281ec040e4c3601f0f8d4952c025239') then raise exception 'Definition changed: public.town_cast(text,integer,integer,boolean,text,text); rebuild v264'; end if;
-- </guards:v264>
end $$;

-- <catalog:v264> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('band_species', $town${
    "guano": {"item":"batGuano","hours":[[18,19]],"chance":0.3,"n":1},
    "windows": [{"id":"megaloptaBee","kind":"insect","family":"pollinator","rarity":"U","bands":["beforeDawn","earlyMorning"],"peak":"beforeDawn","places":["forest"],"time":"mist","where":"petals","how":["ดักทางบิน","Wait on its flight path"],"bait":null},{"id":"ghostMantis","kind":"insect","family":"predator","rarity":"U","bands":["beforeDawn"],"peak":null,"places":["forest"],"time":"moon","where":"leaves","how":["หาเงาพราง","Look for the shape hiding as a leaf"],"bait":null},{"id":"railroadWorm","kind":"insect","family":"glower","rarity":"U","bands":["beforeDawn"],"peak":null,"places":["forest"],"time":"moon","where":"logs","how":["ตามจุดเรือง","Follow its row of lights"],"bait":null},{"id":"indianNightBee","kind":"insect","family":"pollinator","rarity":"U","bands":["earlyMorning"],"peak":null,"places":["forest"],"time":"mist","where":"petals","how":["รอเหนือดอก","Wait above the flowers"],"bait":null},{"id":"snakefly","kind":"insect","family":"predator","rarity":"R","bands":["earlyMorning","lateMorning"],"peak":"earlyMorning","places":["forest"],"time":"sun","where":"bark","how":["เข้าด้านหลัง","Come at it from behind"],"bait":null},{"id":"earwig","kind":"insect","family":"decomposer","rarity":"C","bands":["earlyMorning"],"peak":null,"places":["farm"],"time":"sun","where":"duff","how":["พลิกใบ","Turn the leaves over"],"bait":null},{"id":"masonBee","kind":"insect","family":"pollinator","rarity":"C","bands":["lateMorning","midday"],"peak":"lateMorning","places":["town"],"time":"sun","where":"petals","how":["ดักทางบิน","Wait on its flight path"],"bait":null},{"id":"tigerBeetle","kind":"insect","family":"predator","rarity":"U","bands":["lateMorning"],"peak":null,"places":["forest"],"time":"sun","where":"sand","how":["รอหยุดวิ่ง","Wait for it to stop running"],"bait":null},{"id":"roseChafer","kind":"insect","family":"decomposer","rarity":"C","bands":["lateMorning"],"peak":null,"places":["farm"],"time":"sun","where":"duff","how":["เดินตามพื้น","It walks along the ground"],"bait":null},{"id":"woolCarderBee","kind":"insect","family":"pollinator","rarity":"C","bands":["midday","afternoon"],"peak":"midday","places":["farm"],"time":"sun","where":"petals","how":["รอจุดพัก","Wait where it rests"],"bait":null},{"id":"oilBeetle","kind":"insect","family":"decomposer","rarity":"U","bands":["midday"],"peak":null,"places":["forest"],"time":"sun","where":"duff","how":["เดินตามพื้น","It walks along the ground"],"bait":null},{"id":"assassinBug","kind":"insect","family":"predator","rarity":"U","bands":["midday"],"peak":null,"places":["farm"],"time":"sun","where":"leaves","how":["เข้าด้านหลัง","Come at it from behind"],"bait":null},{"id":"blueBandedBee","kind":"insect","family":"pollinator","rarity":"U","bands":["afternoon","evening"],"peak":"afternoon","places":["town"],"time":"sun","where":"petals","how":["ดักทางบิน","Wait on its flight path"],"bait":null},{"id":"robberFly","kind":"insect","family":"predator","rarity":"C","bands":["afternoon"],"peak":null,"places":["farm"],"time":"sun","where":"posts","how":["รอจุดพัก","Wait where it rests"],"bait":null},{"id":"superworm","kind":"insect","family":"decomposer","rarity":"C","bands":["afternoon"],"peak":null,"places":["forest"],"time":"sun","where":"logs","how":["หาในเศษใบ","Search the litter"],"bait":null},{"id":"clearwingMoth","kind":"insect","family":"pollinator","rarity":"U","bands":["evening","night"],"peak":"evening","places":["town"],"time":"sun","where":"petals","how":["ดักทางบิน","Wait on its flight path"],"bait":null},{"id":"antlion","kind":"insect","family":"predator","rarity":"C","bands":["evening"],"peak":null,"places":["forest"],"time":"sun","where":"sand","how":["สังเกตหลุม","Watch the pits in the sand"],"bait":null},{"id":"bessBeetle","kind":"insect","family":"decomposer","rarity":"C","bands":["evening"],"peak":null,"places":["forest"],"time":"sun","where":"logs","how":["ของหวานล่อ","Bring it down with something sweet"],"bait":null},{"id":"yuccaMoth","kind":"insect","family":"pollinator","rarity":"U","bands":["night","lateNight"],"peak":"night","places":["town"],"time":"moon","where":"petals","how":["รอดอกพักบิน","Wait for it to settle on a flower"],"bait":null},{"id":"roveBeetle","kind":"insect","family":"predator","rarity":"C","bands":["night"],"peak":null,"places":["farm"],"time":"moon","where":"duff","how":["เดินตามพื้น","It walks along the ground"],"bait":null},{"id":"cucujoBeetle","kind":"insect","family":"glower","rarity":"U","bands":["night"],"peak":null,"places":["forest"],"time":"moon","where":"bark","how":["ตามแสงคู่","Follow the pair of lights"],"bait":null},{"id":"tobaccoHawkmoth","kind":"insect","family":"pollinator","rarity":"U","bands":["lateNight","beforeDawn"],"peak":"lateNight","places":["farm"],"time":"moon","where":"petals","how":["ดักทางบิน","Wait on its flight path"],"bait":null},{"id":"blueGhostFirefly","kind":"insect","family":"glower","rarity":"R","bands":["lateNight"],"peak":null,"places":["forest"],"time":"moon","where":"leaves","how":["ตามแสงต่ำ","Follow the light low over the brush"],"bait":null},{"id":"californiaGlowworm","kind":"insect","family":"glower","rarity":"C","bands":["lateNight"],"peak":null,"places":["forest"],"time":"moon","where":"duff","how":["หาแสงใต้ใบ","Look for the light under the leaves"],"bait":null},{"id":"pearlDanio","kind":"fish","family":"ornateFish","rarity":"V","bands":["beforeDawn","earlyMorning"],"peak":"beforeDawn","places":["town"],"time":null,"where":"town","how":null,"bait":"worm"},{"id":"peacockGudgeon","kind":"fish","family":"ornateFish","rarity":"R","bands":["beforeDawn"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"shrimpLive"},{"id":"huchen","kind":"fish","family":"largeFish","rarity":"V","bands":["beforeDawn"],"peak":null,"places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"smallFish"},{"id":"forktailBlueEye","kind":"fish","family":"smallFish","rarity":"R","bands":["earlyMorning"],"peak":null,"places":["town"],"time":null,"where":"town","how":null,"bait":"dough"},{"id":"empireGudgeon","kind":"fish","family":"mediumFish","rarity":"R","bands":["earlyMorning"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"worm"},{"id":"lenok","kind":"fish","family":"largeFish","rarity":"R","bands":["earlyMorning","lateMorning"],"peak":"earlyMorning","places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"cricket"},{"id":"zebrafish","kind":"fish","family":"smallFish","rarity":"C","bands":["lateMorning","midday"],"peak":"lateMorning","places":["town"],"time":null,"where":"town","how":null,"bait":"dough"},{"id":"europeanChub","kind":"fish","family":"mediumFish","rarity":"C","bands":["lateMorning"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"corn"},{"id":"arcticChar","kind":"fish","family":"mediumFish","rarity":"U","bands":["lateMorning"],"peak":null,"places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"cricket"},{"id":"rosyBitterling","kind":"fish","family":"smallFish","rarity":"C","bands":["midday","afternoon"],"peak":"midday","places":["town"],"time":null,"where":"town","how":null,"bait":"dough"},{"id":"pumpkinseed","kind":"fish","family":"mediumFish","rarity":"C","bands":["midday"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"worm"},{"id":"europeanGrayling","kind":"fish","family":"mediumFish","rarity":"U","bands":["midday"],"peak":null,"places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"cricket"},{"id":"leastKillifish","kind":"fish","family":"smallFish","rarity":"C","bands":["afternoon","evening"],"peak":"afternoon","places":["town"],"time":null,"where":"town","how":null,"bait":"dough"},{"id":"australianBass","kind":"fish","family":"mediumFish","rarity":"U","bands":["afternoon"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"shrimpLive"},{"id":"lakeWhitefish","kind":"fish","family":"mediumFish","rarity":"U","bands":["afternoon"],"peak":null,"places":["forest","mountain"],"time":null,"where":"pool","how":null,"bait":"worm"},{"id":"tench","kind":"fish","family":"mediumFish","rarity":"C","bands":["evening"],"peak":null,"places":["town"],"time":null,"where":"town","how":null,"bait":"corn"},{"id":"goldenDorado","kind":"fish","family":"largeFish","rarity":"V","bands":["evening","night"],"peak":"evening","places":["forest"],"time":null,"where":"creek","how":null,"bait":"smallFish"},{"id":"europeanBullhead","kind":"fish","family":"smallFish","rarity":"C","bands":["evening"],"peak":null,"places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"worm"},{"id":"glassKnifefish","kind":"fish","family":"ornateFish","rarity":"V","bands":["night","lateNight"],"peak":"night","places":["town"],"time":null,"where":"town","how":null,"bait":"worm"},{"id":"tigerShovelnose","kind":"fish","family":"largeFish","rarity":"U","bands":["night"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"smallFish"},{"id":"burbot","kind":"fish","family":"largeFish","rarity":"U","bands":["night"],"peak":null,"places":["forest","mountain"],"time":null,"where":"pool","how":null,"bait":"smallFish"},{"id":"elephantnoseFish","kind":"fish","family":"ornateFish","rarity":"R","bands":["lateNight","beforeDawn"],"peak":"lateNight","places":["town"],"time":null,"where":"town","how":null,"bait":"worm"},{"id":"freshwaterSole","kind":"fish","family":"mediumFish","rarity":"U","bands":["lateNight"],"peak":null,"places":["forest"],"time":null,"where":"creek","how":null,"bait":"shrimpLive"},{"id":"dollyVarden","kind":"fish","family":"mediumFish","rarity":"U","bands":["lateNight"],"peak":null,"places":["forest","mountain"],"time":null,"where":"headwater","how":null,"bait":"cricket"},{"id":"mistMushroom","kind":"find","family":null,"rarity":"V","bands":["beforeDawn"],"peak":null,"places":["forest"],"time":null,"where":"Under logs in the woods","how":["ใต้ขอนไม้ในป่าลึก","Under logs in the woods"],"bait":null},{"id":"queenPollen","kind":"find","family":null,"rarity":"R","bands":["lateNight"],"peak":null,"places":["forest"],"time":null,"where":"Flowers at the forest's edge","how":["ดอกไม้ชายป่า","Flowers at the forest's edge"],"bait":null},{"id":"morningDew","kind":"find","family":null,"rarity":"U","bands":["earlyMorning"],"peak":null,"places":["mountain"],"time":null,"where":"The mountain stream's banks","how":["ริมลำธารบนภูเขา","The mountain stream's banks"],"bait":null},{"id":"batGuano","kind":"find","family":null,"rarity":"U","bands":["evening"],"peak":null,"places":["cave"],"time":null,"where":"Cave rocks, 18:00–19:00, as the bats leave","how":["หินในถ้ำ 18:00–19:00 ตอนค้างคาวออกถ้ำ","Cave rocks, 18:00–19:00, as the bats leave"],"bait":null,"hours":[[18,19]]}]
  }$town$::jsonb)
  on conflict (key) do nothing;
insert into public.town_catalog (key, data) values
  ('items', $town${
    "rod": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "hoe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "can": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "pot": {"kind":"tool","tier":1,"stack":1,"pays":40},
    "pan": {"kind":"tool","tier":1,"stack":1,"pays":35},
    "grill": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "potFull": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "bucket": {"kind":"tool","tier":1,"stack":1,"pays":8},
    "waterYoke": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterYokeGreat": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterCart": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "worm": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "dough": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "rice": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "salt": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "seedKangkong": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedScallion": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedCabbage": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedCarrot": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedDaikon": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedCorn": {"kind":"seed","tier":1,"stack":10,"pays":6},
    "seedChili": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedTomato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedBasil": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedSweetPotato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedGarlic": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedPumpkin": {"kind":"seed","tier":1,"stack":10,"pays":12},
    "kangkong": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "scallion": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "cabbage": {"kind":"crop","tier":1,"stack":20,"pays":20},
    "carrot": {"kind":"crop","tier":1,"stack":40,"pays":8},
    "daikon": {"kind":"crop","tier":1,"stack":20,"pays":18},
    "corn": {"kind":"crop","tier":1,"stack":40,"pays":14},
    "chili": {"kind":"crop","tier":1,"stack":40,"pays":5},
    "tomato": {"kind":"crop","tier":1,"stack":40,"pays":8},
    "basil": {"kind":"crop","tier":1,"stack":40,"pays":4},
    "sweetPotato": {"kind":"crop","tier":1,"stack":40,"pays":12},
    "garlic": {"kind":"crop","tier":1,"stack":40,"pays":10},
    "pumpkin": {"kind":"crop","tier":1,"stack":10,"pays":110},
    "minnow": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "barb": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "tilapia": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "perch": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "catfish": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "pangasius": {"kind":"fish","tier":1,"stack":5,"pays":22},
    "snakehead": {"kind":"fish","tier":1,"stack":5,"pays":30},
    "eel": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "prawn": {"kind":"fish","tier":1,"stack":10,"pays":35},
    "featherback": {"kind":"fish","tier":1,"stack":5,"pays":40},
    "goby": {"kind":"fish","tier":1,"stack":5,"pays":60},
    "koi": {"kind":"fish","tier":1,"stack":1,"pays":300},
    "hyacinth": {"kind":"catch","tier":1,"stack":20,"pays":2},
    "boot": {"kind":"catch","tier":1,"stack":5,"pays":3},
    "fishSauce": {"kind":"goods","tier":1,"stack":10,"pays":12},
    "wearGlasses": {"kind":"goods","tier":1,"stack":5,"pays":60},
    "compost": {"kind":"goods","tier":1,"stack":20,"pays":4},
    "growFert": {"kind":"goods","tier":1,"stack":20,"pays":10},
    "guardFert": {"kind":"goods","tier":1,"stack":20,"pays":12},
    "pestCure": {"kind":"goods","tier":1,"stack":10,"pays":10},
    "basket": {"kind":"goods","tier":1,"stack":1,"pays":0},
    "riceBox": {"kind":"dish","tier":1,"stack":20,"pays":3},
    "oddDish": {"kind":"dish","tier":1,"stack":20,"pays":0},
    "friedMinnow": {"kind":"dish","tier":1,"stack":20,"pays":12},
    "grilledFish": {"kind":"dish","tier":1,"stack":20,"pays":16},
    "grilledCorn": {"kind":"dish","tier":1,"stack":20,"pays":18},
    "roastSweetPotato": {"kind":"dish","tier":1,"stack":20,"pays":16},
    "stirKangkong": {"kind":"dish","tier":1,"stack":20,"pays":12},
    "basilCatfish": {"kind":"dish","tier":1,"stack":20,"pays":18},
    "tomYum": {"kind":"dish","tier":1,"stack":20,"pays":22},
    "sourCurry": {"kind":"dish","tier":1,"stack":20,"pays":20},
    "friedPerch": {"kind":"dish","tier":1,"stack":20,"pays":22},
    "fishCake": {"kind":"dish","tier":1,"stack":20,"pays":22},
    "spicyEel": {"kind":"dish","tier":1,"stack":20,"pays":26},
    "grilledPrawn": {"kind":"dish","tier":1,"stack":20,"pays":44},
    "steamedGoby": {"kind":"dish","tier":1,"stack":20,"pays":38},
    "pumpkinSoup": {"kind":"dish","tier":1,"stack":20,"pays":30},
    "shabu": {"kind":"dish","tier":1,"stack":20,"pays":30},
    "scrollFriedMinnow": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledFish": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollPestCure": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledCorn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastSweetPotato": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollStirKangkong": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBasilCatfish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTomYum": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSourCurry": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFriedPerch": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishCake": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSpicyEel": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGrilledPrawn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSteamedGoby": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPumpkinSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollShabu": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "loach": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "mosquitofish": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "mussel": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "crayfish": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "goldfish": {"kind":"fish","tier":1,"stack":5,"pays":35},
    "carp": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "piranha": {"kind":"fish","tier":1,"stack":10,"pays":11},
    "herring": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "archerfish": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "pacu": {"kind":"fish","tier":1,"stack":5,"pays":20},
    "pike": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "nilePerch": {"kind":"fish","tier":1,"stack":5,"pays":32},
    "salmon": {"kind":"fish","tier":1,"stack":5,"pays":26},
    "wels": {"kind":"fish","tier":1,"stack":5,"pays":45},
    "gar": {"kind":"fish","tier":1,"stack":5,"pays":42},
    "arapaima": {"kind":"fish","tier":1,"stack":1,"pays":320},
    "dozyFish": {"kind":"dish","tier":1,"stack":20,"pays":2},
    "popotoFish": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rainbowFish": {"kind":"dish","tier":1,"stack":20,"pays":6},
    "moonFish": {"kind":"fish","tier":1,"stack":5,"pays":50},
    "hookScale": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "floatGlow": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "fishChips": {"kind":"dish","tier":1,"stack":20,"pays":8},
    "ukha": {"kind":"dish","tier":1,"stack":20,"pays":17},
    "thieboudienne": {"kind":"dish","tier":1,"stack":20,"pays":18},
    "piranhaSoup": {"kind":"dish","tier":1,"stack":20,"pays":16},
    "crawfishBoil": {"kind":"dish","tier":1,"stack":20,"pays":15},
    "masgouf": {"kind":"dish","tier":1,"stack":20,"pays":9},
    "salmonSteak": {"kind":"dish","tier":1,"stack":20,"pays":26},
    "arapaimaRoast": {"kind":"dish","tier":1,"stack":20,"pays":45},
    "scrollFishChips": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollUkha": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollThieboudienne": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPiranhaSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollCrawfishBoil": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMasgouf": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSalmonSteak": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollArapaimaRoast": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "twig": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "leafMould": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "pineCone": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "feather": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "resin": {"kind":"wild","tier":1,"stack":10,"pays":3},
    "vine": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "bambooCane": {"kind":"wild","tier":1,"stack":10,"pays":2},
    "wildflower": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "clay": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "shiitake": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chanterelle": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "porcini": {"kind":"wild","tier":1,"stack":20,"pays":7},
    "glowMushroom": {"kind":"wild","tier":1,"stack":10,"pays":12},
    "toadstool": {"kind":"wild","tier":1,"stack":20,"pays":0},
    "fiddlehead": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "mint": {"kind":"wild","tier":1,"stack":40,"pays":3},
    "rosemary": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chamomile": {"kind":"wild","tier":1,"stack":40,"pays":3},
    "lavender": {"kind":"wild","tier":1,"stack":40,"pays":3},
    "blueberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "raspberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "wildStrawberry": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "silkCocoon": {"kind":"wild","tier":1,"stack":10,"pays":8},
    "fourLeafClover": {"kind":"wild","tier":1,"stack":5,"pays":40},
    "bambooShoot": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "wildYam": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "truffle": {"kind":"wild","tier":1,"stack":10,"pays":45},
    "ginseng": {"kind":"wild","tier":1,"stack":5,"pays":80},
    "amber": {"kind":"wild","tier":1,"stack":5,"pays":120},
    "mandrake": {"kind":"wild","tier":1,"stack":1,"pays":200},
    "wildApple": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "chestnut": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "wildOrchid": {"kind":"wild","tier":1,"stack":5,"pays":60},
    "moonflower": {"kind":"wild","tier":1,"stack":5,"pays":70},
    "starShard": {"kind":"wild","tier":1,"stack":5,"pays":150},
    "skewer": {"kind":"tool","tier":1,"stack":1,"pays":1},
    "floatFeather": {"kind":"tool","tier":1,"stack":1,"pays":6},
    "lineSpun": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "mulch": {"kind":"goods","tier":1,"stack":20,"pays":3},
    "lavenderSachet": {"kind":"goods","tier":1,"stack":20,"pays":6},
    "mushroomSoup": {"kind":"dish","tier":1,"stack":20,"pays":11},
    "mushroomSkewer": {"kind":"dish","tier":1,"stack":20,"pays":8},
    "fishOnStick": {"kind":"dish","tier":1,"stack":20,"pays":11},
    "roastYam": {"kind":"dish","tier":1,"stack":20,"pays":12},
    "roastedApple": {"kind":"dish","tier":1,"stack":20,"pays":5},
    "mushroomRisotto": {"kind":"dish","tier":1,"stack":20,"pays":10},
    "fernSalad": {"kind":"dish","tier":1,"stack":20,"pays":16},
    "herbTea": {"kind":"dish","tier":1,"stack":20,"pays":7},
    "berryCompote": {"kind":"dish","tier":1,"stack":20,"pays":9},
    "bakedApple": {"kind":"dish","tier":1,"stack":20,"pays":7},
    "roastChestnut": {"kind":"dish","tier":1,"stack":20,"pays":11},
    "forestStew": {"kind":"dish","tier":1,"stack":20,"pays":10},
    "bambooShootStir": {"kind":"dish","tier":1,"stack":20,"pays":13},
    "rosemaryFish": {"kind":"dish","tier":1,"stack":20,"pays":16},
    "ginsengSoup": {"kind":"dish","tier":1,"stack":20,"pays":34},
    "moonTea": {"kind":"dish","tier":1,"stack":20,"pays":28},
    "truffleEggs": {"kind":"dish","tier":2,"stack":20,"pays":35},
    "mushroomOmelette": {"kind":"dish","tier":2,"stack":20,"pays":15},
    "scrollMushroomSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomSkewer": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishOnStick": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastYam": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomRisotto": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFernSalad": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollHerbTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBerryCompote": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBakedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastChestnut": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollForestStew": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBambooShootStir": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRosemaryFish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGinsengSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMoonTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTruffleEggs": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMushroomOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "bugNet": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "butterflyWhite": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "monarch": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "morpho": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "dragonfly": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "damselfly": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "glassDragonfly": {"kind":"bug","tier":1,"stack":5,"pays":60},
    "grasshopper": {"kind":"bug","tier":2,"stack":20,"pays":2},
    "mantis": {"kind":"bug","tier":1,"stack":10,"pays":7},
    "cicada": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "stickInsect": {"kind":"bug","tier":1,"stack":10,"pays":5},
    "leafInsect": {"kind":"bug","tier":1,"stack":10,"pays":6},
    "firefly": {"kind":"bug","tier":1,"stack":20,"pays":4},
    "orchidMantis": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "moth": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "lunaMoth": {"kind":"bug","tier":1,"stack":5,"pays":50},
    "hawkMoth": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "rhinoBeetle": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "stagBeetle": {"kind":"bug","tier":1,"stack":5,"pays":25},
    "jewelBeetle": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "herculesBeetle": {"kind":"bug","tier":1,"stack":5,"pays":150},
    "ladybird": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "scarab": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "caterpillar": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "rodTeak": {"kind":"tool","tier":2,"stack":1,"pays":90},
    "floatQuill": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "hookSteel": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "lineBraid": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "netSmall": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "hoeIron": {"kind":"tool","tier":2,"stack":1,"pays":75},
    "canCopper": {"kind":"tool","tier":2,"stack":1,"pays":60},
    "sickle": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "krabung": {"kind":"tool","tier":2,"stack":1,"pays":0},
    "mortar": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "steamer": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "cleaver": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "jar": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "wok": {"kind":"tool","tier":2,"stack":1,"pays":80},
    "rollingPin": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "sushiMat": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "stoneBowl": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "bowl": {"kind":"tool","tier":1,"stack":3,"pays":3},
    "bucketIron": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "apron": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "cricket": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "branBait": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "shrimpLive": {"kind":"bait","tier":2,"stack":20,"pays":3},
    "sugar": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "oil": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tamarind": {"kind":"staple","tier":2,"stack":20,"pays":2},
    "egg": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "flour": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seaweed": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tofu": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seedEggplant": {"kind":"seed","tier":2,"stack":10,"pays":8},
    "seedCucumber": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLongBean": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLemongrass": {"kind":"seed","tier":2,"stack":10,"pays":9},
    "seedGalangal": {"kind":"seed","tier":2,"stack":10,"pays":12},
    "seedLime": {"kind":"seed","tier":2,"stack":5,"pays":30},
    "seedPapaya": {"kind":"seed","tier":2,"stack":10,"pays":14},
    "eggplant": {"kind":"crop","tier":2,"stack":40,"pays":14},
    "cucumber": {"kind":"crop","tier":2,"stack":40,"pays":10},
    "longBean": {"kind":"crop","tier":2,"stack":40,"pays":9},
    "lemongrass": {"kind":"crop","tier":2,"stack":40,"pays":12},
    "galangal": {"kind":"crop","tier":2,"stack":40,"pays":22},
    "lime": {"kind":"crop","tier":2,"stack":40,"pays":10},
    "papaya": {"kind":"crop","tier":2,"stack":20,"pays":26},
    "gourami": {"kind":"fish","tier":2,"stack":10,"pays":12},
    "crab": {"kind":"fish","tier":2,"stack":10,"pays":10},
    "snail": {"kind":"fish","tier":2,"stack":20,"pays":2},
    "hampala": {"kind":"fish","tier":2,"stack":5,"pays":34},
    "sheatfish": {"kind":"fish","tier":2,"stack":5,"pays":42},
    "bagrid": {"kind":"fish","tier":2,"stack":5,"pays":36},
    "giantGourami": {"kind":"fish","tier":2,"stack":5,"pays":44},
    "frog": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "tigerfish": {"kind":"fish","tier":2,"stack":5,"pays":90},
    "wallago": {"kind":"fish","tier":2,"stack":5,"pays":110},
    "driftwood": {"kind":"catch","tier":2,"stack":10,"pays":3},
    "bottle": {"kind":"catch","tier":2,"stack":10,"pays":2},
    "driedFish": {"kind":"goods","tier":2,"stack":10,"pays":14},
    "saltedFish": {"kind":"goods","tier":2,"stack":10,"pays":18},
    "curryPaste": {"kind":"goods","tier":2,"stack":10,"pays":20},
    "pickle": {"kind":"goods","tier":2,"stack":10,"pays":16},
    "charcoal": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "rope": {"kind":"goods","tier":2,"stack":10,"pays":8},
    "manure": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "noodle": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "somTam": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "grilledEggplant": {"kind":"dish","tier":2,"stack":20,"pays":20},
    "tomKha": {"kind":"dish","tier":2,"stack":20,"pays":40},
    "friedGourami": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "crabCurry": {"kind":"dish","tier":2,"stack":20,"pays":44},
    "steamedSheatfish": {"kind":"dish","tier":2,"stack":20,"pays":46},
    "friedFrog": {"kind":"dish","tier":2,"stack":20,"pays":34},
    "laab": {"kind":"dish","tier":2,"stack":20,"pays":42},
    "omelette": {"kind":"dish","tier":2,"stack":20,"pays":14},
    "snailCurry": {"kind":"dish","tier":2,"stack":20,"pays":36},
    "candiedPumpkin": {"kind":"dish","tier":2,"stack":20,"pays":30},
    "friedRice": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "sushi": {"kind":"dish","tier":2,"stack":20,"pays":34},
    "tempura": {"kind":"dish","tier":2,"stack":20,"pays":32},
    "okonomiyaki": {"kind":"dish","tier":2,"stack":20,"pays":34},
    "kimchi": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "bibimbap": {"kind":"dish","tier":2,"stack":20,"pays":44},
    "kimbap": {"kind":"dish","tier":2,"stack":20,"pays":30},
    "pajeon": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "harGow": {"kind":"dish","tier":2,"stack":20,"pays":34},
    "springRoll": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "congee": {"kind":"dish","tier":2,"stack":20,"pays":30},
    "spaghetti": {"kind":"dish","tier":2,"stack":20,"pays":40},
    "minestrone": {"kind":"dish","tier":2,"stack":20,"pays":28},
    "samosa": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "scrollSomTam": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollGrilledEggplant": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTomKha": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedGourami": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCrabCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSteamedSheatfish": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedFrog": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollLaab": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSnailCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCandiedPumpkin": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedRice": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSushi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTempura": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollOkonomiyaki": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimchi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollBibimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollPajeon": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollHarGow": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpringRoll": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCongee": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpaghetti": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMinestrone": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSamosa": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "rodMaster": {"kind":"tool","tier":3,"stack":1,"pays":220},
    "floatBell": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "hookTwin": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "lineSilk": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "netLong": {"kind":"tool","tier":3,"stack":1,"pays":100},
    "hoeSteel": {"kind":"tool","tier":3,"stack":1,"pays":160},
    "canBrass": {"kind":"tool","tier":3,"stack":1,"pays":140},
    "shears": {"kind":"tool","tier":3,"stack":1,"pays":110},
    "yoke": {"kind":"tool","tier":3,"stack":1,"pays":0},
    "potBrass": {"kind":"tool","tier":3,"stack":1,"pays":180},
    "stoveBig": {"kind":"tool","tier":3,"stack":1,"pays":150},
    "panBrass": {"kind":"tool","tier":3,"stack":1,"pays":170},
    "steamerBamboo": {"kind":"tool","tier":3,"stack":1,"pays":130},
    "hotpot": {"kind":"tool","tier":3,"stack":1,"pays":200},
    "oven": {"kind":"tool","tier":3,"stack":1,"pays":240},
    "ladle": {"kind":"tool","tier":3,"stack":1,"pays":20},
    "tok": {"kind":"tool","tier":3,"stack":1,"pays":60},
    "antEggs": {"kind":"bait","tier":3,"stack":20,"pays":6},
    "lure": {"kind":"bait","tier":3,"stack":5,"pays":30},
    "fermentedBait": {"kind":"bait","tier":3,"stack":20,"pays":5},
    "stickyRice": {"kind":"staple","tier":3,"stack":20,"pays":3},
    "soy": {"kind":"staple","tier":3,"stack":20,"pays":5},
    "pepper": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "cheese": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "milk": {"kind":"staple","tier":3,"stack":20,"pays":4},
    "seedMango": {"kind":"seed","tier":3,"stack":5,"pays":40},
    "seedBanana": {"kind":"seed","tier":3,"stack":5,"pays":25},
    "seedCoconut": {"kind":"seed","tier":3,"stack":5,"pays":45},
    "seedGinger": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTurmeric": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTaro": {"kind":"seed","tier":3,"stack":10,"pays":18},
    "seedWatermelon": {"kind":"seed","tier":3,"stack":10,"pays":20},
    "mango": {"kind":"crop","tier":3,"stack":40,"pays":30},
    "banana": {"kind":"crop","tier":3,"stack":40,"pays":16},
    "coconut": {"kind":"crop","tier":3,"stack":20,"pays":34},
    "ginger": {"kind":"crop","tier":3,"stack":40,"pays":26},
    "turmeric": {"kind":"crop","tier":3,"stack":40,"pays":26},
    "taro": {"kind":"crop","tier":3,"stack":20,"pays":30},
    "watermelon": {"kind":"crop","tier":3,"stack":10,"pays":60},
    "croaker": {"kind":"fish","tier":3,"stack":5,"pays":70},
    "blackEar": {"kind":"fish","tier":3,"stack":5,"pays":80},
    "spinyEel": {"kind":"fish","tier":3,"stack":5,"pays":60},
    "puffer": {"kind":"fish","tier":3,"stack":10,"pays":25},
    "goldenCarp": {"kind":"fish","tier":3,"stack":5,"pays":180},
    "giantSnakehead": {"kind":"fish","tier":3,"stack":5,"pays":200},
    "royalFeatherback": {"kind":"fish","tier":3,"stack":5,"pays":190},
    "arowana": {"kind":"fish","tier":3,"stack":1,"pays":600},
    "stingray": {"kind":"fish","tier":3,"stack":1,"pays":700},
    "megaCatfish": {"kind":"fish","tier":3,"stack":1,"pays":800},
    "pearl": {"kind":"catch","tier":3,"stack":10,"pays":150},
    "chest": {"kind":"catch","tier":3,"stack":1,"pays":20},
    "coconutMilk": {"kind":"goods","tier":3,"stack":10,"pays":22},
    "fermentedFish": {"kind":"goods","tier":3,"stack":10,"pays":26},
    "shrimpPaste": {"kind":"goods","tier":3,"stack":10,"pays":28},
    "driedChili": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "riceNoodle": {"kind":"goods","tier":3,"stack":10,"pays":18},
    "bananaLeaf": {"kind":"goods","tier":3,"stack":20,"pays":2},
    "toastedRice": {"kind":"goods","tier":3,"stack":10,"pays":10},
    "greenCurry": {"kind":"dish","tier":3,"stack":20,"pays":60},
    "khanomJeen": {"kind":"dish","tier":3,"stack":20,"pays":70},
    "hoMok": {"kind":"dish","tier":3,"stack":20,"pays":56},
    "mangoStickyRice": {"kind":"dish","tier":3,"stack":20,"pays":50},
    "bananaInCoconut": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "taroPudding": {"kind":"dish","tier":3,"stack":20,"pays":44},
    "steamedCroaker": {"kind":"dish","tier":3,"stack":20,"pays":56},
    "gingerFish": {"kind":"dish","tier":3,"stack":20,"pays":54},
    "turmericFish": {"kind":"dish","tier":3,"stack":20,"pays":50},
    "jungleCurry": {"kind":"dish","tier":3,"stack":20,"pays":66},
    "megaLaab": {"kind":"dish","tier":3,"stack":20,"pays":90},
    "watermelonSlices": {"kind":"dish","tier":3,"stack":20,"pays":20},
    "khantoke": {"kind":"dish","tier":3,"stack":20,"pays":120},
    "naamPrik": {"kind":"dish","tier":3,"stack":20,"pays":36},
    "ramen": {"kind":"dish","tier":3,"stack":20,"pays":44},
    "unadon": {"kind":"dish","tier":3,"stack":20,"pays":48},
    "tteokbokki": {"kind":"dish","tier":3,"stack":20,"pays":36},
    "chowMein": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "mapoTofu": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "pizza": {"kind":"dish","tier":3,"stack":20,"pays":46},
    "risotto": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "lasagna": {"kind":"dish","tier":3,"stack":20,"pays":50},
    "fishCurry": {"kind":"dish","tier":3,"stack":20,"pays":46},
    "naan": {"kind":"dish","tier":3,"stack":20,"pays":26},
    "biryani": {"kind":"dish","tier":3,"stack":20,"pays":46},
    "lassi": {"kind":"dish","tier":3,"stack":20,"pays":24},
    "scrollGreenCurry": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollHoMok": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollKhanomJeen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMangoStickyRice": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBananaInCoconut": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTaroPudding": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollSteamedCroaker": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollGingerFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTurmericFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollJungleCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMegaLaab": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollWatermelonSlices": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollKhantoke": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaamPrik": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRamen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollUnadon": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTteokbokki": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollChowMein": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMapoTofu": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollPizza": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRisotto": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLasagna": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollFishCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaan": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBiryani": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "pick": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "axe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "stone": {"kind":"mineral","tier":1,"stack":50,"pays":0},
    "log": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "timber": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "shardCopper": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardIron": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardSilver": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "oreCopper": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreIron": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreSilver": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "chipRuby": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipSapphire": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAquamarine": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAmber": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipTopaz": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipEmerald": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipDiamond": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipOnyx": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "gemRuby": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemSapphire": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAquamarine": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAmber": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemTopaz": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemEmerald": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemDiamond": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemOnyx": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "torch": {"kind":"goods","tier":1,"stack":10,"pays":0},
    "creekDace": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "torrentBarb": {"kind":"fish","tier":2,"stack":10,"pays":18},
    "stoneLapper": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "glassGoby": {"kind":"fish","tier":2,"stack":10,"pays":17},
    "brookTrout": {"kind":"fish","tier":2,"stack":10,"pays":28},
    "caveBlindfish": {"kind":"fish","tier":3,"stack":10,"pays":32},
    "uplandEel": {"kind":"fish","tier":2,"stack":10,"pays":25},
    "springShrimp": {"kind":"fish","tier":1,"stack":10,"pays":13},
    "riverLamprey": {"kind":"fish","tier":3,"stack":10,"pays":35},
    "marbleMahseer": {"kind":"fish","tier":3,"stack":10,"pays":48},
    "torrentSleeper": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "waterfallSturgeon": {"kind":"fish","tier":3,"stack":10,"pays":75},
    "brookFillet": {"kind":"goods","tier":2,"stack":20,"pays":7},
    "smokedTrout": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "driedDace": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "springStock": {"kind":"goods","tier":3,"stack":20,"pays":14},
    "fishRoe": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "flowFloat": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "springLeader": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "torrentNet": {"kind":"tool","tier":3,"stack":1,"pays":65},
    "shadeLure": {"kind":"bait","tier":3,"stack":5,"pays":18},
    "creekBroth": {"kind":"dish","tier":3,"stack":20,"pays":25},
    "smokedBrookBowl": {"kind":"dish","tier":2,"stack":20,"pays":28},
    "torrentSkewer": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "springDumpling": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "reedMinnow": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "ribbonRasbora": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "pebbleLoach": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "willowShiner": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "sandGudgeon": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "amberChub": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "fernBarbel": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "redfinDace": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "stripedSpinyLoach": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "leafPerch": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "copperBream": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "needleHalfbeak": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "spottedCreekCatfish": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "saffronLoach": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "longfinCreekCarp": {"kind":"fish","tier":3,"stack":10,"pays":42},
    "orchidSnakehead": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "creekDragonfish": {"kind":"fish","tier":3,"stack":10,"pays":72},
    "ancientCreekBarbel": {"kind":"fish","tier":3,"stack":10,"pays":74},
    "silverSpringDace": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rockSculpin": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "mossLoach": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "swiftGrayling": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "bluefinTrout": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "mountainWhitefish": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "cascadeChar": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "graniteGoby": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "windfinMahseer": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "crimsonHillBarb": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "snowlineTrout": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "ridgePike": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "mistSalmon": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "blackstoneEel": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "cloudCrownMahseer": {"kind":"fish","tier":3,"stack":10,"pays":74},
    "thunderbackSturgeon": {"kind":"fish","tier":3,"stack":10,"pays":70},
    "poolMedaka": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "lilyGourami": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "moonspotGoby": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "mossfinPerch": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "roundtailBetta": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "duskFeatherfin": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "petalKillifish": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "caveGlassPerch": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "spottedPoolCatfish": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "ivoryKnifefish": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "jadeSleeper": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "caveRibbonEel": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "violetCaveChar": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "mirrorPoolCarp": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "starfinBichir": {"kind":"fish","tier":3,"stack":10,"pays":42},
    "moonveilArowana": {"kind":"fish","tier":3,"stack":10,"pays":70},
    "crystalCaveDragon": {"kind":"fish","tier":3,"stack":10,"pays":72},
    "reedFishCongee": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "sandbankSkillet": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "fernBarbelStew": {"kind":"dish","tier":3,"stack":20,"pays":26},
    "creekHerbGrill": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "orchidFishHotpot": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "ancientCreekFeast": {"kind":"dish","tier":3,"stack":20,"pays":38},
    "springFishCongee": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "bluefinMountainPan": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "cascadeHerbStew": {"kind":"dish","tier":3,"stack":20,"pays":26},
    "ridgeFishGrill": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "mistFishBroth": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "cloudCrownFeast": {"kind":"dish","tier":3,"stack":20,"pays":38},
    "lilyPoolCongee": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "duskFishSkillet": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "glassCaveSoup": {"kind":"dish","tier":3,"stack":20,"pays":26},
    "jadeFishGrill": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "mirrorPoolStew": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "moonveilFeast": {"kind":"dish","tier":3,"stack":20,"pays":38},
    "honeyBee": {"kind":"bug","tier":2,"stack":20,"pays":6},
    "carpenterBee": {"kind":"bug","tier":2,"stack":20,"pays":12},
    "lacewing": {"kind":"bug","tier":2,"stack":20,"pays":9},
    "hoverfly": {"kind":"bug","tier":2,"stack":20,"pays":7},
    "silkMoth": {"kind":"bug","tier":3,"stack":20,"pays":16},
    "goldenAnt": {"kind":"bug","tier":2,"stack":20,"pays":8},
    "orchardBeetle": {"kind":"bug","tier":3,"stack":20,"pays":14},
    "pollenMidge": {"kind":"bug","tier":2,"stack":20,"pays":10},
    "honeycomb": {"kind":"staple","tier":2,"stack":20,"pays":16},
    "gardenHoney": {"kind":"staple","tier":2,"stack":20,"pays":13},
    "beeswax": {"kind":"goods","tier":2,"stack":20,"pays":19},
    "silkTwist": {"kind":"goods","tier":3,"stack":20,"pays":21},
    "silkenCord": {"kind":"goods","tier":3,"stack":20,"pays":34},
    "chitinPlate": {"kind":"goods","tier":3,"stack":20,"pays":21},
    "nectarSyrup": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "routeLens": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "scentSatchel": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "nectarVial": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "releaseCage": {"kind":"tool","tier":2,"stack":1,"pays":29},
    "pollenFan": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "pestWhistle": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "nectarRice": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "honeyHerbTea": {"kind":"dish","tier":2,"stack":20,"pays":23},
    "pollenCake": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "orchardSoup": {"kind":"dish","tier":3,"stack":20,"pays":210},
    "forestLichen": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "fragrantPetal": {"kind":"wild","tier":2,"stack":20,"pays":6},
    "flowerBulb": {"kind":"wild","tier":2,"stack":20,"pays":11},
    "bambooSheath": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "fernTip": {"kind":"wild","tier":2,"stack":20,"pays":7},
    "wildMedicRoot": {"kind":"wild","tier":3,"stack":20,"pays":14},
    "berryPip": {"kind":"wild","tier":2,"stack":20,"pays":10},
    "mushroomSpores": {"kind":"wild","tier":2,"stack":20,"pays":9},
    "lichenSalt": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "petalDye": {"kind":"goods","tier":2,"stack":20,"pays":16},
    "bulbPowder": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "driedFern": {"kind":"staple","tier":2,"stack":20,"pays":17},
    "rootExtract": {"kind":"staple","tier":3,"stack":20,"pays":24},
    "berrySeedOil": {"kind":"staple","tier":2,"stack":20,"pays":22},
    "sporeCulture": {"kind":"staple","tier":2,"stack":20,"pays":23},
    "traceLens": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "pruningKnife": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "rootSpade": {"kind":"tool","tier":2,"stack":1,"pays":31},
    "seedSieve": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "specimenPress": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "forageBasket": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "fernRice": {"kind":"dish","tier":2,"stack":20,"pays":25},
    "rootStew": {"kind":"dish","tier":3,"stack":20,"pays":85},
    "petalBiscuit": {"kind":"dish","tier":2,"stack":20,"pays":27},
    "sporeNoodles": {"kind":"dish","tier":2,"stack":20,"pays":29},
    "springSample": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "rushingSample": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "riverGrit": {"kind":"mineral","tier":2,"stack":20,"pays":5},
    "mineralSand": {"kind":"mineral","tier":2,"stack":20,"pays":9},
    "mossFilter": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "wetClay": {"kind":"mineral","tier":2,"stack":20,"pays":6},
    "reedPith": {"kind":"wild","tier":2,"stack":20,"pays":7},
    "waterMint": {"kind":"wild","tier":2,"stack":20,"pays":8},
    "clearSpring": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "herbalWater": {"kind":"staple","tier":2,"stack":20,"pays":18},
    "mineralWater": {"kind":"staple","tier":2,"stack":20,"pays":21},
    "dawnBlend": {"kind":"staple","tier":3,"stack":20,"pays":25},
    "rainBlend": {"kind":"staple","tier":3,"stack":20,"pays":23},
    "moonBlend": {"kind":"staple","tier":3,"stack":20,"pays":28},
    "springSalt": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "waterSampler": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "sluiceKey": {"kind":"tool","tier":2,"stack":1,"pays":33},
    "filterFrame": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "mixingJug": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "sealedFlask": {"kind":"tool","tier":3,"stack":1,"pays":38},
    "flowGauge": {"kind":"tool","tier":2,"stack":1,"pays":29},
    "springRice": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "mintBroth": {"kind":"dish","tier":2,"stack":20,"pays":29},
    "mineralCongee": {"kind":"dish","tier":3,"stack":20,"pays":31},
    "moonTeaRice": {"kind":"dish","tier":3,"stack":20,"pays":35},
    "dicedRoot": {"kind":"staple","tier":2,"stack":20,"pays":8},
    "emberRice": {"kind":"staple","tier":2,"stack":20,"pays":9},
    "brownedOnion": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "driedZest": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "crushedHerb": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "fishStock": {"kind":"staple","tier":2,"stack":20,"pays":13},
    "roastedSeed": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "whiskedEgg": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "fragrantOil": {"kind":"staple","tier":2,"stack":20,"pays":18},
    "smokedSalt": {"kind":"staple","tier":2,"stack":20,"pays":17},
    "fermentStarter": {"kind":"staple","tier":3,"stack":20,"pays":20},
    "brightSauce": {"kind":"staple","tier":3,"stack":20,"pays":22},
    "thickBroth": {"kind":"staple","tier":3,"stack":20,"pays":22},
    "sweetGlaze": {"kind":"staple","tier":3,"stack":20,"pays":23},
    "spicePaste": {"kind":"staple","tier":3,"stack":20,"pays":24},
    "prepBoard": {"kind":"tool","tier":2,"stack":1,"pays":31},
    "tastingSpoon": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "scentLid": {"kind":"tool","tier":2,"stack":1,"pays":34},
    "heatBell": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "fermentCrock": {"kind":"tool","tier":3,"stack":1,"pays":38},
    "cookTimer": {"kind":"tool","tier":3,"stack":1,"pays":36},
    "layeredRootPot": {"kind":"dish","tier":3,"stack":20,"pays":33},
    "crispRiceSkillet": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "slowFishBroth": {"kind":"dish","tier":3,"stack":20,"pays":36},
    "glazedForestBowl": {"kind":"dish","tier":3,"stack":20,"pays":37},
    "scrollLayeredRootPot": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollCrispRiceSkillet": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollSlowFishBroth": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollGlazedForestBowl": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "trailRation": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "mintPoultice": {"kind":"goods","tier":2,"stack":20,"pays":19},
    "repairBundle": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "seedPacket": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "waterPack": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "dryTinder": {"kind":"goods","tier":2,"stack":20,"pays":16},
    "campCanvas": {"kind":"goods","tier":2,"stack":20,"pays":22},
    "signalCord": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "warmBlanket": {"kind":"goods","tier":3,"stack":20,"pays":27},
    "fieldBandage": {"kind":"goods","tier":3,"stack":20,"pays":25},
    "travelBiscuit": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "sharedTea": {"kind":"goods","tier":3,"stack":20,"pays":25},
    "soilCarePack": {"kind":"goods","tier":3,"stack":20,"pays":26},
    "toolCareOil": {"kind":"goods","tier":3,"stack":20,"pays":26},
    "trailMarker": {"kind":"goods","tier":3,"stack":20,"pays":27},
    "campKit": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "provisionChest": {"kind":"tool","tier":2,"stack":1,"pays":38},
    "fieldKettle": {"kind":"tool","tier":2,"stack":1,"pays":36},
    "campLantern": {"kind":"tool","tier":3,"stack":1,"pays":39},
    "weatherAwning": {"kind":"tool","tier":3,"stack":1,"pays":43},
    "signalPennant": {"kind":"tool","tier":3,"stack":1,"pays":41},
    "sharePorridge": {"kind":"dish","tier":3,"stack":20,"pays":31},
    "travelerSoup": {"kind":"dish","tier":3,"stack":20,"pays":33},
    "friendRice": {"kind":"dish","tier":3,"stack":20,"pays":35},
    "restTea": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "scrollSharePorridge": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollTravelerSoup": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollFriendRice": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollRestTea": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollSpringRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollMintBroth": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollMineralCongee": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollMoonTeaRice": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollFernRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollRootStew": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollPetalBiscuit": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollSporeNoodles": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollNectarRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollHoneyHerbTea": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollPollenCake": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollOrchardSoup": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "knottedWood": {"kind":"wood","tier":2,"stack":20,"pays":3},
    "straightWood": {"kind":"wood","tier":2,"stack":20,"pays":5},
    "heartwood": {"kind":"wood","tier":3,"stack":20,"pays":8},
    "pineBark": {"kind":"wood","tier":2,"stack":20,"pays":2},
    "pinePitch": {"kind":"wood","tier":2,"stack":20,"pays":4},
    "pineNut": {"kind":"wood","tier":2,"stack":20,"pays":4},
    "rootFiber": {"kind":"wood","tier":2,"stack":20,"pays":3},
    "cedarSliver": {"kind":"wood","tier":3,"stack":20,"pays":12},
    "splitPlank": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "carvingBlank": {"kind":"goods","tier":2,"stack":20,"pays":7},
    "pitchSeal": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "sapSyrup": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "pineNutFlour": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "rootTwine": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "woodOil": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "notchGauge": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "grainLens": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "fellingWedge": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "barkKnife": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "sapTap": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "braceStake": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "pineNutRice": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "cedarBroth": {"kind":"dish","tier":3,"stack":20,"pays":24},
    "pineNutCake": {"kind":"dish","tier":2,"stack":20,"pays":20},
    "sapGlazedFish": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "farmEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "silkieEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "blueEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "chocolateEgg": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "lanternEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "cloudEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "goldenEgg": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "emberEgg": {"kind":"goods","tier":3,"stack":20,"pays":10},
    "duckEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "runnerEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "cayugaEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "mandarinEgg": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "rainEgg": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "moonEgg": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "paperEgg": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "leviathanEgg": {"kind":"goods","tier":3,"stack":20,"pays":20},
    "wool": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "shetlandWool": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "jacobWool": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "valaisWool": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "dandelionWool": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "rainbowWool": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "starWool": {"kind":"goods","tier":3,"stack":20,"pays":18},
    "goldenWool": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "farmMilk": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "jerseyMilk": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "highlandMilk": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "swissMilk": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "strawberryMilk": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "cocoaMilk": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "flowerMilk": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "starMilk": {"kind":"goods","tier":3,"stack":20,"pays":20},
    "cream": {"kind":"goods","tier":2,"stack":20,"pays":27},
    "butter": {"kind":"goods","tier":2,"stack":20,"pays":73},
    "farmCheese": {"kind":"goods","tier":2,"stack":20,"pays":44},
    "yarn": {"kind":"goods","tier":2,"stack":20,"pays":32},
    "woolScarf": {"kind":"goods","tier":2,"stack":20,"pays":86},
    "rainbowScarf": {"kind":"goods","tier":3,"stack":20,"pays":92},
    "starScarf": {"kind":"goods","tier":3,"stack":20,"pays":92},
    "goldenScarf": {"kind":"goods","tier":3,"stack":20,"pays":120},
    "prism": {"kind":"goods","tier":3,"stack":20,"pays":20},
    "chickFeed": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "duckFeed": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "sheepFeed": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "cowFeed": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "chickGrow": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "duckGrow": {"kind":"goods","tier":2,"stack":20,"pays":7},
    "lambGrow": {"kind":"goods","tier":2,"stack":20,"pays":12},
    "calfGrow": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "dewGrow": {"kind":"goods","tier":3,"stack":20,"pays":15},
    "packedRation": {"kind":"goods","tier":3,"stack":20,"pays":12},
    "renameTag": {"kind":"goods","tier":2,"stack":20,"pays":0},
    "milker": {"kind":"tool","tier":1,"stack":1,"pays":90},
    "woolShears": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "eggBasket": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "churn": {"kind":"tool","tier":1,"stack":1,"pays":40},
    "cheesePress": {"kind":"tool","tier":1,"stack":1,"pays":50},
    "spindle": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "knittingNeedles": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "mistVetch": {"kind":"wild","tier":3,"stack":20,"pays":10},
    "ghostReed": {"kind":"wild","tier":3,"stack":20,"pays":10},
    "dewClover": {"kind":"wild","tier":3,"stack":20,"pays":10},
    "dawnOats": {"kind":"wild","tier":3,"stack":20,"pays":10},
    "meadowOats": {"kind":"wild","tier":2,"stack":20,"pays":3},
    "sweetTimothy": {"kind":"wild","tier":2,"stack":20,"pays":3},
    "sunAlfalfa": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "pondMillet": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "copperSedge": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "orchardPea": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "amberClover": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "reedSeed": {"kind":"wild","tier":2,"stack":20,"pays":3},
    "lanternGrass": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "velvetVetch": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "moonOats": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "nightDuckweed": {"kind":"wild","tier":2,"stack":20,"pays":4},
    "custard": {"kind":"dish","tier":3,"stack":20,"pays":18},
    "pancakes": {"kind":"dish","tier":3,"stack":20,"pays":22},
    "cheesecake": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "butterCookies": {"kind":"dish","tier":3,"stack":20,"pays":26},
    "quiche": {"kind":"dish","tier":3,"stack":20,"pays":36},
    "lanternCustard": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "cloudSouffle": {"kind":"dish","tier":3,"stack":20,"pays":44},
    "goldenOmelette": {"kind":"dish","tier":3,"stack":20,"pays":46},
    "emberBakedEggs": {"kind":"dish","tier":3,"stack":20,"pays":56},
    "rainBroth": {"kind":"dish","tier":3,"stack":20,"pays":38},
    "moonPudding": {"kind":"dish","tier":3,"stack":20,"pays":40},
    "paperFish": {"kind":"dish","tier":3,"stack":20,"pays":38},
    "leviathanEggCup": {"kind":"dish","tier":3,"stack":20,"pays":58},
    "strawberryShake": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "hotCocoa": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "flowerLatte": {"kind":"dish","tier":3,"stack":20,"pays":30},
    "starPudding": {"kind":"dish","tier":3,"stack":20,"pays":60},
    "bottleGourd": {"kind":"crop","tier":2,"stack":40,"pays":125},
    "rowBean": {"kind":"crop","tier":2,"stack":40,"pays":40},
    "trellisBerry": {"kind":"crop","tier":3,"stack":40,"pays":190},
    "blueCorn": {"kind":"crop","tier":3,"stack":40,"pays":170},
    "teaBush": {"kind":"crop","tier":3,"stack":40,"pays":45},
    "sunflowerPatch": {"kind":"crop","tier":2,"stack":40,"pays":60},
    "redOkra": {"kind":"crop","tier":2,"stack":40,"pays":42},
    "lotusRootBed": {"kind":"crop","tier":2,"stack":40,"pays":160},
    "gourdCup": {"kind":"goods","tier":2,"stack":20,"pays":145},
    "beanPaste": {"kind":"staple","tier":2,"stack":20,"pays":70},
    "berryJam": {"kind":"staple","tier":3,"stack":20,"pays":335},
    "blueCornFlour": {"kind":"staple","tier":3,"stack":20,"pays":295},
    "driedTea": {"kind":"staple","tier":3,"stack":20,"pays":80},
    "sunflowerOil": {"kind":"staple","tier":2,"stack":20,"pays":105},
    "lotusStarch": {"kind":"staple","tier":2,"stack":20,"pays":280},
    "pollenBrush": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "graftKnife": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "rootGuide": {"kind":"tool","tier":2,"stack":1,"pays":20},
    "soilScoop": {"kind":"tool","tier":2,"stack":1,"pays":23},
    "seedTray": {"kind":"tool","tier":2,"stack":1,"pays":22},
    "gardenTwine": {"kind":"tool","tier":2,"stack":1,"pays":21},
    "pollenRice": {"kind":"dish","tier":2,"stack":20,"pays":35},
    "berryTea": {"kind":"dish","tier":3,"stack":20,"pays":165},
    "blueCornCake": {"kind":"dish","tier":3,"stack":20,"pays":275},
    "lotusGardenSoup": {"kind":"dish","tier":2,"stack":20,"pays":270},
    "seedBottleGourd": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedRowBean": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedTrellisBerry": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedBlueCorn": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedTeaBush": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedSunflowerPatch": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedRedOkra": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedLotusRootBed": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "runnerBean": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "peanut": {"kind":"crop","tier":1,"stack":40,"pays":4},
    "buckwheat": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "sesame": {"kind":"crop","tier":1,"stack":40,"pays":4},
    "clover": {"kind":"crop","tier":1,"stack":40,"pays":2},
    "gardenStrawberry": {"kind":"crop","tier":1,"stack":40,"pays":4},
    "rhubarb": {"kind":"crop","tier":1,"stack":40,"pays":4},
    "watercress": {"kind":"crop","tier":1,"stack":40,"pays":2},
    "fig": {"kind":"crop","tier":1,"stack":40,"pays":6},
    "borage": {"kind":"crop","tier":1,"stack":40,"pays":2},
    "passionfruit": {"kind":"crop","tier":1,"stack":40,"pays":5},
    "milkweed": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "fennel": {"kind":"crop","tier":1,"stack":40,"pays":8},
    "marigold": {"kind":"crop","tier":1,"stack":40,"pays":2},
    "nasturtium": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "garlicChives": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "dill": {"kind":"crop","tier":1,"stack":40,"pays":3},
    "pearlNut": {"kind":"crop","tier":3,"stack":40,"pays":16},
    "silverGrain": {"kind":"crop","tier":3,"stack":40,"pays":12},
    "dewSesame": {"kind":"crop","tier":3,"stack":40,"pays":16},
    "glassFlower": {"kind":"crop","tier":3,"stack":40,"pays":8},
    "opalStalk": {"kind":"crop","tier":3,"stack":40,"pays":16},
    "crystalLeaf": {"kind":"crop","tier":3,"stack":40,"pays":8},
    "dewFig": {"kind":"crop","tier":3,"stack":40,"pays":24},
    "silkPollen": {"kind":"crop","tier":3,"stack":40,"pays":12},
    "insectHouse": {"kind":"tool","tier":2,"stack":20,"pays":30},
    "slatePowder": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "biochar": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "mineralClay": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "chitinPowder": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "forestHumus": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "silkFrass": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "woodAsh": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "lotusSilt": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "herbPowder": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "fishEmulsion": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "kitchenFerment": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "nectarLure": {"kind":"goods","tier":2,"stack":20,"pays":9},
    "sulphurPowder": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "resinWash": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "sawdustMulch": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "shellMeal": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "shreddedBark": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "boneMeal": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "guanoMeal": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "scalePowder": {"kind":"goods","tier":3,"stack":20,"pays":32},
    "beetleFrass": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "dewPollen": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "glowPowder": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "packetMist": {"kind":"goods","tier":3,"stack":20,"pays":72},
    "packetNight": {"kind":"goods","tier":3,"stack":20,"pays":75},
    "wearSmith": {"kind":"goods","tier":2,"stack":5,"pays":160},
    "wearWeaver": {"kind":"goods","tier":2,"stack":5,"pays":160},
    "wearWitch": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearBeret": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearTraveller": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearPumpkin": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearSmithGoggles": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearCopper": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearCrystal": {"kind":"goods","tier":2,"stack":5,"pays":180},
    "wearAmber": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearHexagon": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearScarf": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearLei": {"kind":"goods","tier":2,"stack":5,"pays":60},
    "wearBeads": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearTassel": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearCatEars": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearBunnyEars": {"kind":"goods","tier":2,"stack":5,"pays":80},
    "wearHorns": {"kind":"goods","tier":2,"stack":5,"pays":120},
    "wearTiara": {"kind":"goods","tier":2,"stack":5,"pays":180},
    "wearCrown": {"kind":"goods","tier":2,"stack":5,"pays":60},
    "wearMonocle": {"kind":"goods","tier":1,"stack":5,"pays":300},
    "wearSquare": {"kind":"goods","tier":1,"stack":5,"pays":75},
    "wearNecktie": {"kind":"goods","tier":1,"stack":5,"pays":120},
    "wearRibbon": {"kind":"goods","tier":1,"stack":5,"pays":45},
    "seedRunnerBean": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedPeanut": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedBuckwheat": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedSesame": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedClover": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedGardenStrawberry": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedRhubarb": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedWatercress": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedFig": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedBorage": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedPassionfruit": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedMilkweed": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedFennel": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedMarigold": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedNasturtium": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedGarlicChives": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedDill": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedPearlNut": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedSilverGrain": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedDewSesame": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedGlassFlower": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedOpalStalk": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedCrystalLeaf": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedDewFig": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedSilkPollen": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedMint": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedChamomile": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedLavender": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "scrollPollenRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollBerryTea": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollBlueCornCake": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollLotusGardenSoup": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollPineNutRice": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCedarBroth": {"kind":"scroll","tier":3,"stack":1,"pays":12},
    "scrollPineNutCake": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSapGlazedFish": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCustard": {"kind":"scroll","tier":3,"stack":1,"pays":36},
    "scrollPancakes": {"kind":"scroll","tier":3,"stack":1,"pays":44},
    "scrollCheesecake": {"kind":"scroll","tier":3,"stack":1,"pays":80},
    "scrollButterCookies": {"kind":"scroll","tier":3,"stack":1,"pays":52},
    "scrollQuiche": {"kind":"scroll","tier":3,"stack":1,"pays":72},
    "scrollLanternCustard": {"kind":"scroll","tier":3,"stack":1,"pays":80},
    "scrollCloudSouffle": {"kind":"scroll","tier":3,"stack":1,"pays":88},
    "scrollGoldenOmelette": {"kind":"scroll","tier":3,"stack":1,"pays":92},
    "scrollEmberBakedEggs": {"kind":"scroll","tier":3,"stack":1,"pays":112},
    "scrollRainBroth": {"kind":"scroll","tier":3,"stack":1,"pays":76},
    "scrollMoonPudding": {"kind":"scroll","tier":3,"stack":1,"pays":80},
    "scrollPaperFish": {"kind":"scroll","tier":3,"stack":1,"pays":76},
    "scrollLeviathanEggCup": {"kind":"scroll","tier":3,"stack":1,"pays":116},
    "scrollStrawberryShake": {"kind":"scroll","tier":3,"stack":1,"pays":60},
    "scrollHotCocoa": {"kind":"scroll","tier":3,"stack":1,"pays":60},
    "scrollFlowerLatte": {"kind":"scroll","tier":3,"stack":1,"pays":60},
    "scrollStarPudding": {"kind":"scroll","tier":3,"stack":1,"pays":120},
    "scrollBreedChickenB": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenC": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenD": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenE": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenF": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenG": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedChickenH": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckB": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckC": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckD": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckE": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckF": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckG": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedDuckH": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepB": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepC": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepD": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepE": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepF": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepG": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedSheepH": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowB": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowC": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowD": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowE": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowF": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowG": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollBreedCowH": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "slateLayer": {"kind":"mineral","tier":2,"stack":20,"pays":3},
    "clayPocket": {"kind":"mineral","tier":2,"stack":20,"pays":3},
    "quartzCore": {"kind":"mineral","tier":2,"stack":20,"pays":6},
    "pyriteCluster": {"kind":"mineral","tier":2,"stack":20,"pays":5},
    "copperNodule": {"kind":"mineral","tier":2,"stack":20,"pays":7},
    "ironNodule": {"kind":"mineral","tier":2,"stack":20,"pays":8},
    "silverNodule": {"kind":"mineral","tier":3,"stack":20,"pays":12},
    "mineralSalt": {"kind":"staple","tier":2,"stack":20,"pays":4},
    "wholeGeode": {"kind":"mineral","tier":3,"stack":20,"pays":15},
    "stoneTile": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "crystalLens": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "sparkPowder": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "copperBlank": {"kind":"goods","tier":2,"stack":20,"pays":9},
    "steelPlate": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "geodeDisplay": {"kind":"goods","tier":3,"stack":20,"pays":22},
    "echoHammer": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "cavityLens": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "crystalWrap": {"kind":"tool","tier":2,"stack":1,"pays":22},
    "oreSieve": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "seamChisel": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "surveyCord": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "minerRice": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "caveStew": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "saltRoast": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "seamCake": {"kind":"dish","tier":2,"stack":20,"pays":20},
    "scrollMinerRice": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCaveStew": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSaltRoast": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSeamCake": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCreekBroth": {"kind":"scroll","tier":3,"stack":1,"pays":12},
    "scrollSmokedBrookBowl": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollTorrentSkewer": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSpringDumpling": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollReedFishCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollSandbankSkillet": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollFernBarbelStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollCreekHerbGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollOrchidFishHotpot": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollAncientCreekFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollSpringFishCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollBluefinMountainPan": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollCascadeHerbStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollRidgeFishGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMistFishBroth": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollCloudCrownFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollLilyPoolCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollDuskFishSkillet": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollGlassCaveSoup": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollJadeFishGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMirrorPoolStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMoonveilFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "megaloptaBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "ghostMantis": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "railroadWorm": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "indianNightBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "snakefly": {"kind":"bug","tier":3,"stack":5,"pays":24},
    "earwig": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "masonBee": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "tigerBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "roseChafer": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "woolCarderBee": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "oilBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "assassinBug": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "blueBandedBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "robberFly": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "superworm": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "clearwingMoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "antlion": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "bessBeetle": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "yuccaMoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "roveBeetle": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "cucujoBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "tobaccoHawkmoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "blueGhostFirefly": {"kind":"bug","tier":3,"stack":5,"pays":24},
    "californiaGlowworm": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "pearlDanio": {"kind":"fish","tier":3,"stack":5,"pays":110},
    "peacockGudgeon": {"kind":"fish","tier":3,"stack":10,"pays":60},
    "huchen": {"kind":"fish","tier":3,"stack":5,"pays":90},
    "forktailBlueEye": {"kind":"fish","tier":3,"stack":10,"pays":30},
    "empireGudgeon": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "lenok": {"kind":"fish","tier":3,"stack":10,"pays":50},
    "zebrafish": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "europeanChub": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "arcticChar": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "rosyBitterling": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "pumpkinseed": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "europeanGrayling": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "leastKillifish": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "australianBass": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "lakeWhitefish": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "tench": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "goldenDorado": {"kind":"fish","tier":3,"stack":5,"pays":90},
    "europeanBullhead": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "glassKnifefish": {"kind":"fish","tier":3,"stack":5,"pays":110},
    "tigerShovelnose": {"kind":"fish","tier":2,"stack":10,"pays":34},
    "burbot": {"kind":"fish","tier":2,"stack":10,"pays":34},
    "elephantnoseFish": {"kind":"fish","tier":3,"stack":10,"pays":60},
    "freshwaterSole": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "dollyVarden": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "mistMushroom": {"kind":"wild","tier":3,"stack":5,"pays":60},
    "queenPollen": {"kind":"wild","tier":3,"stack":10,"pays":45},
    "morningDew": {"kind":"wild","tier":2,"stack":20,"pays":6},
    "batGuano": {"kind":"mineral","tier":2,"stack":20,"pays":8}
  }$town$::jsonb),
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[5,22]],"rain":1,"wait":[3,15],"size":[4,8],"effort":1,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,22],"effort":2,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8,"moth":1},"hours":[[7,17]],"rain":1,"wait":[5,28],"size":[18,32],"effort":2,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[5,20]],"rain":1.3,"wait":[5,25],"size":[10,18],"effort":2,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"loach":0.5,"dough":0.3,"caterpillar":1,"moth":0.3,"dragonfly":0.5,"forktailBlueEye":0.5,"zebrafish":0.5,"rosyBitterling":0.5,"leastKillifish":0.5,"europeanBullhead":0.5},"hours":[[18,24],[0,6]],"rain":2,"wait":[8,35],"size":[25,45],"effort":3,"line":1},
    "pangasius": {"tier":"uncommon","baits":{"dough":1,"corn":1,"moth":1},"hours":[[8,17]],"rain":1,"wait":[10,50],"size":[50,90],"effort":7,"line":1.3},
    "snakehead": {"tier":"uncommon","baits":{"minnow":1,"worm":0.3,"caterpillar":0.3,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[5,8],[17,20]],"rain":1.2,"wait":[13,55],"size":[35,70],"effort":7,"line":1.1},
    "eel": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[19,24],[0,5]],"rain":2.5,"wait":[13,55],"size":[40,80],"effort":6,"line":1},
    "prawn": {"tier":"uncommon","baits":{"worm":0.8,"dough":0.6,"caterpillar":0.8,"moth":0.6},"hours":[[17,24]],"rain":1,"wait":[10,45],"size":[14,28],"effort":4,"line":0.7},
    "featherback": {"tier":"rare","baits":{"minnow":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[45,85],"effort":8,"line":1.2},
    "goby": {"tier":"rare","baits":{"minnow":1,"worm":0.7,"caterpillar":0.7,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[20,24],[0,4]],"rain":1,"wait":[23,90],"size":[25,50],"effort":8,"line":1.1},
    "gourami": {"tier":"common","baits":{"branBait":1,"cricket":0.6,"grasshopper":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,20],"effort":2,"line":0.8},
    "crab": {"tier":"common","baits":{"shrimpLive":1,"branBait":0.5},"hours":[[17,24],[0,6]],"rain":1.5,"wait":[5,25],"size":[5,9],"effort":1,"line":0.5},
    "snail": {"tier":"common","baits":{"branBait":1},"hours":[[0,24]],"rain":1.2,"wait":[4,20],"size":[2,4],"effort":1,"line":0.4},
    "hampala": {"tier":"uncommon","baits":{"cricket":1,"shrimpLive":0.8,"grasshopper":1},"hours":[[5,9],[16,19]],"rain":1,"wait":[10,45],"size":[25,50],"effort":6,"line":0.9},
    "sheatfish": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[13,55],"size":[25,45],"effort":6,"line":1},
    "bagrid": {"tier":"uncommon","baits":{"cricket":1,"branBait":0.4,"grasshopper":1},"hours":[[18,24],[0,5]],"rain":2,"wait":[13,55],"size":[30,60],"effort":7,"line":1.2},
    "giantGourami": {"tier":"uncommon","baits":{"branBait":1},"hours":[[8,17]],"rain":1,"wait":[13,55],"size":[35,60],"effort":8,"line":1.4},
    "frog": {"tier":"uncommon","baits":{"cricket":1,"grasshopper":1},"hours":[[18,24],[0,6]],"rain":3,"wait":[10,45],"size":[8,14],"effort":4,"line":0.6},
    "tigerfish": {"tier":"rare","baits":{"shrimpLive":1},"hours":[[5,8],[17,20]],"rain":1,"wait":[23,90],"size":[20,40],"effort":9,"line":1.1},
    "wallago": {"tier":"rare","baits":{"shrimpLive":1,"cricket":0.5,"grasshopper":0.5},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[23,90],"size":[60,120],"effort":10,"line":1.5},
    "croaker": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[13,55],"size":[20,35],"effort":7,"line":1.1},
    "blackEar": {"tier":"uncommon","baits":{"fermentedBait":1},"hours":[[6,18]],"rain":1,"wait":[13,55],"size":[50,90],"effort":9,"line":1.5},
    "spinyEel": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":2,"wait":[13,55],"size":[25,45],"effort":6,"line":0.9},
    "puffer": {"tier":"uncommon","baits":{"antEggs":0.8,"lure":0.5},"hours":[[9,16]],"rain":1,"wait":[10,45],"size":[8,15],"effort":4,"line":0.6},
    "goldenCarp": {"tier":"rare","baits":{"fermentedBait":1},"hours":[[5,8],[16,19]],"rain":1,"wait":[23,90],"size":[50,90],"effort":10,"line":1.6},
    "giantSnakehead": {"tier":"rare","baits":{"lure":1},"hours":[[5,9],[16,20]],"rain":1.2,"wait":[23,90],"size":[60,110],"effort":11,"line":1.5},
    "royalFeatherback": {"tier":"rare","baits":{"lure":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[23,90],"size":[50,90],"effort":10,"line":1.4},
    "arowana": {"tier":"legend","baits":{"lure":1},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[50,90],"effort":13,"line":1.6},
    "stingray": {"tier":"legend","baits":{"fermentedBait":1},"hours":[[21,24],[0,4]],"rain":1,"wait":[30,120],"size":[100,220],"effort":14,"line":2},
    "megaCatfish": {"tier":"legend","baits":{"fermentedBait":0.7,"antEggs":0.5},"hours":[[4,7],[18,21]],"rain":1,"wait":[30,120],"size":[120,270],"effort":15,"line":2.2},
    "koi": {"tier":"legend","baits":{"dough":1,"corn":0.7,"moth":1},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[60,100],"effort":12,"line":1.5},
    "loach": {"tier":"common","baits":{"worm":1,"dough":0.5,"caterpillar":1,"moth":0.5},"hours":[[0,24]],"rain":3,"wait":[4,20],"size":[8,15],"effort":1,"line":0.5,"water":"bank"},
    "mosquitofish": {"tier":"common","baits":{"dough":1,"worm":0.5,"caterpillar":0.5,"moth":1},"hours":[[6,18]],"rain":1,"wait":[3,15],"size":[3,6],"effort":1,"line":0.4,"water":"bank"},
    "mussel": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[6,12],"effort":1,"line":0.4,"water":"bank"},
    "crayfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"caterpillar":1,"dragonfly":0.5,"forktailBlueEye":0.5,"zebrafish":0.5,"rosyBitterling":0.5,"leastKillifish":0.5,"europeanBullhead":0.5},"hours":[[18,24],[0,5]],"rain":1.5,"wait":[5,25],"size":[7,13],"effort":2,"line":0.6,"water":"bank"},
    "goldfish": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[8,18]],"rain":1,"wait":[5,25],"size":[6,14],"effort":1,"line":0.5,"water":"bank","needs":["weekend"]},
    "carp": {"tier":"common","baits":{"corn":1,"dough":0.7,"moth":0.7},"hours":[[6,18]],"rain":1,"wait":[6,28],"size":[25,50],"effort":3,"line":1},
    "piranha": {"tier":"common","baits":{"minnow":1,"loach":1,"worm":0.4,"caterpillar":0.4,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[9,17]],"rain":1,"wait":[4,20],"size":[15,30],"effort":2,"line":0.8,"water":"deck"},
    "herring": {"tier":"uncommon","baits":{"worm":1,"dough":0.6,"caterpillar":1,"moth":0.6},"hours":[[4,8]],"rain":1,"wait":[8,40],"size":[18,32],"effort":4,"line":0.8},
    "archerfish": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[8,18]],"rain":0,"wait":[10,45],"size":[10,20],"effort":4,"line":0.7},
    "pacu": {"tier":"uncommon","baits":{"dough":1,"corn":1,"moth":1},"hours":[[9,16]],"rain":1,"wait":[10,50],"size":[30,60],"effort":7,"line":1.2},
    "pike": {"tier":"uncommon","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[5,9],[16,19]],"rain":1,"wait":[13,55],"size":[40,90],"effort":7,"line":1.2},
    "nilePerch": {"tier":"uncommon","baits":{"loach":1,"minnow":0.6,"dragonfly":0.6,"forktailBlueEye":0.6,"zebrafish":0.6,"rosyBitterling":0.6,"leastKillifish":0.6,"europeanBullhead":0.6},"hours":[[10,16]],"rain":0,"wait":[13,55],"size":[50,110],"effort":8,"line":1.4},
    "salmon": {"tier":"uncommon","baits":{"loach":1,"worm":0.6,"caterpillar":0.6},"hours":[[0,24]],"rain":4,"wait":[10,45],"size":[45,85],"effort":7,"line":1.2,"dry":0},
    "wels": {"tier":"rare","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[21,24],[0,4]],"rain":2,"wait":[18,75],"size":[80,180],"effort":9,"line":1.5},
    "gar": {"tier":"rare","baits":{"loach":1,"minnow":0.6,"dragonfly":0.6,"forktailBlueEye":0.6,"zebrafish":0.6,"rosyBitterling":0.6,"leastKillifish":0.6,"europeanBullhead":0.6},"hours":[[17,21]],"rain":1,"wait":[18,75],"size":[70,150],"effort":9,"line":1.4},
    "arapaima": {"tier":"legend","baits":{"loach":0.3},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[120,250],"effort":13,"line":1.9},
    "dozyFish": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[4,20],"size":[12,24],"effort":1,"line":0.4,"needs":["tired"]},
    "popotoFish": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[10,20],"effort":2,"line":0.7,"needs":["crowd"]},
    "rainbowFish": {"tier":"common","baits":{"dough":1,"worm":1,"caterpillar":1,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[8,14],"effort":2,"line":0.6,"needs":["after"]},
    "moonFish": {"tier":"rare","baits":{"dough":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[20,40],"effort":7,"line":1,"needs":["full"]},
    "creekDace": {"tier":"common","baits":{"worm":1,"dough":0.5,"caterpillar":1,"moth":0.5},"hours":[[5,19]],"rain":1,"wait":[4,20],"size":[7,13],"effort":2,"line":0.6,"habitat":["creek"],"current":["eddy","shelter"]},
    "torrentBarb": {"tier":"uncommon","baits":{"corn":1,"branBait":1},"hours":[[6,17]],"rain":1.4,"wait":[8,35],"size":[18,32],"effort":5,"line":1.1,"habitat":["creek","headwater"],"current":["run"]},
    "stoneLapper": {"tier":"common","baits":{"dough":1,"worm":0.4,"caterpillar":0.4,"moth":1},"hours":[[7,20]],"rain":0.8,"wait":[5,25],"size":[12,20],"effort":3,"line":0.8,"habitat":["creek","headwater"],"current":["run","shelter"]},
    "glassGoby": {"tier":"uncommon","baits":{"worm":1,"shrimpLive":0.6,"caterpillar":1},"hours":[[18,24],[0,6]],"rain":1,"wait":[8,35],"size":[5,10],"effort":4,"line":0.8,"habitat":["pool"],"current":["shelter"]},
    "brookTrout": {"tier":"uncommon","baits":{"cricket":1,"worm":0.6,"shadeLure":0.9,"caterpillar":0.6,"grasshopper":1},"hours":[[5,10],[16,20]],"rain":1.5,"wait":[10,40],"size":[22,40],"effort":6,"line":1.2,"habitat":["headwater"],"current":["run","eddy"]},
    "caveBlindfish": {"tier":"rare","baits":{"worm":0.8,"antEggs":1,"caterpillar":0.8},"hours":[[20,24],[0,5]],"rain":2,"wait":[16,65],"size":[10,18],"effort":7,"line":1.1,"habitat":["pool"],"current":["shelter"]},
    "uplandEel": {"tier":"uncommon","baits":{"worm":1,"minnow":0.6,"caterpillar":1,"dragonfly":0.6,"forktailBlueEye":0.6,"zebrafish":0.6,"rosyBitterling":0.6,"leastKillifish":0.6,"europeanBullhead":0.6},"hours":[[18,24],[0,7]],"rain":2,"wait":[10,45],"size":[35,65],"effort":6,"line":1.2,"habitat":["headwater"],"current":["shelter"]},
    "springShrimp": {"tier":"common","baits":{"dough":1,"branBait":0.8,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[3,7],"effort":2,"line":0.5,"habitat":["pool","headwater"],"current":["eddy","shelter"]},
    "riverLamprey": {"tier":"rare","baits":{"loach":1,"shadeLure":0.8},"hours":[[19,24],[0,5]],"rain":1.8,"wait":[18,65],"size":[25,55],"effort":8,"line":1.3,"habitat":["creek"],"current":["run"]},
    "marbleMahseer": {"tier":"rare","baits":{"corn":1,"fermentedBait":0.8},"hours":[[5,8],[16,19]],"rain":1.3,"wait":[20,70],"size":[45,85],"effort":9,"line":1.5,"habitat":["headwater"],"current":["run"]},
    "torrentSleeper": {"tier":"uncommon","baits":{"shrimpLive":1,"worm":0.6,"caterpillar":0.6},"hours":[[6,18]],"rain":1.6,"wait":[12,40],"size":[15,27],"effort":5,"line":1,"habitat":["headwater"],"current":["shelter","run"]},
    "waterfallSturgeon": {"tier":"legend","baits":{"loach":0.8,"shadeLure":1},"hours":[[4,7]],"rain":1,"wait":[30,100],"size":[75,135],"effort":12,"line":1.8,"needs":["after"],"habitat":["pool"],"current":["eddy"]},
    "reedMinnow": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[0,24]],"rain":0.8,"wait":[5,24],"size":[8,18],"effort":2,"line":0.65,"habitat":["creek"],"current":["eddy","shelter"]},
    "ribbonRasbora": {"tier":"common","baits":{"dough":1,"worm":0.45,"caterpillar":0.45,"moth":1},"hours":[[0,24]],"rain":1.1,"wait":[5,24],"size":[9,20],"effort":2,"line":0.65,"habitat":["creek"],"current":["run"]},
    "pebbleLoach": {"tier":"common","baits":{"corn":1,"worm":0.45,"caterpillar":0.45},"hours":[[0,24]],"rain":1.4,"wait":[5,24],"size":[10,22],"effort":2,"line":0.65,"habitat":["creek"],"current":["shelter","run"]},
    "willowShiner": {"tier":"common","baits":{"cricket":1,"worm":0.45,"caterpillar":0.45,"grasshopper":1},"hours":[[8,17]],"rain":1.7,"wait":[5,24],"size":[11,24],"effort":2,"line":0.65,"habitat":["creek"],"current":["eddy","shelter"]},
    "sandGudgeon": {"tier":"common","baits":{"branBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[5,24],"size":[12,26],"effort":2,"line":0.65,"habitat":["creek"],"current":["run"]},
    "amberChub": {"tier":"common","baits":{"shrimpLive":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[5,24],"size":[13,28],"effort":2,"line":0.65,"habitat":["creek"],"current":["shelter","run"]},
    "fernBarbel": {"tier":"uncommon","baits":{"minnow":1,"worm":0.45,"caterpillar":0.45,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[29,55],"effort":5,"line":0.95,"habitat":["creek"],"current":["eddy","shelter"]},
    "redfinDace": {"tier":"uncommon","baits":{"antEggs":1,"worm":0.45,"caterpillar":0.45},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[23,43],"effort":5,"line":0.95,"habitat":["creek"],"current":["run"]},
    "stripedSpinyLoach": {"tier":"uncommon","baits":{"fermentedBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[10,42],"size":[25,47],"effort":5,"line":0.95,"habitat":["creek"],"current":["shelter","run"]},
    "leafPerch": {"tier":"uncommon","baits":{"shadeLure":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[10,42],"size":[26,49],"effort":5,"line":0.95,"habitat":["creek"],"current":["eddy","shelter"]},
    "copperBream": {"tier":"uncommon","baits":{"loach":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[28,53],"effort":5,"line":0.95,"habitat":["creek"],"current":["run"]},
    "needleHalfbeak": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[30,57],"effort":5,"line":0.95,"habitat":["creek"],"current":["shelter","run"]},
    "spottedCreekCatfish": {"tier":"rare","baits":{"dough":1,"moth":1},"hours":[[5,19]],"rain":0.8,"wait":[15,60],"size":[44,80],"effort":8,"line":1.25,"habitat":["creek"],"current":["eddy","shelter"]},
    "saffronLoach": {"tier":"rare","baits":{"corn":1},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[15,60],"size":[40,72],"effort":8,"line":1.25,"habitat":["creek"],"current":["run"]},
    "longfinCreekCarp": {"tier":"rare","baits":{"cricket":1,"grasshopper":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[15,60],"size":[43,78],"effort":8,"line":1.25,"habitat":["creek"],"current":["shelter","run"]},
    "orchidSnakehead": {"tier":"rare","baits":{"branBait":1},"hours":[[8,17]],"rain":1.7,"wait":[15,60],"size":[46,84],"effort":8,"line":1.25,"habitat":["creek"],"current":["eddy","shelter"]},
    "creekDragonfish": {"tier":"legend","baits":{"shrimpLive":1},"hours":[[5,19]],"rain":0.8,"wait":[20,78],"size":[60,107],"effort":11,"line":1.5499999999999998,"habitat":["creek"],"current":["run"]},
    "ancientCreekBarbel": {"tier":"legend","baits":{"minnow":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[20,78],"size":[59,105],"effort":11,"line":1.5499999999999998,"needs":["after"],"habitat":["creek"],"current":["shelter","run"]},
    "silverSpringDace": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[0,24]],"rain":0.8,"wait":[5,24],"size":[8,18],"effort":2,"line":0.65,"habitat":["headwater"],"current":["eddy","shelter"]},
    "rockSculpin": {"tier":"common","baits":{"dough":1,"worm":0.45,"caterpillar":0.45,"moth":1},"hours":[[0,24]],"rain":1.1,"wait":[5,24],"size":[12,26],"effort":2,"line":0.65,"habitat":["headwater"],"current":["run"]},
    "mossLoach": {"tier":"common","baits":{"corn":1,"worm":0.45,"caterpillar":0.45},"hours":[[0,24]],"rain":1.4,"wait":[5,24],"size":[10,22],"effort":2,"line":0.65,"habitat":["headwater"],"current":["shelter","run"]},
    "swiftGrayling": {"tier":"common","baits":{"cricket":1,"worm":0.45,"caterpillar":0.45,"grasshopper":1},"hours":[[8,17]],"rain":1.7,"wait":[5,24],"size":[9,20],"effort":2,"line":0.65,"habitat":["headwater"],"current":["eddy","shelter"]},
    "bluefinTrout": {"tier":"common","baits":{"branBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[5,24],"size":[9,20],"effort":2,"line":0.65,"habitat":["headwater"],"current":["run"]},
    "mountainWhitefish": {"tier":"common","baits":{"shrimpLive":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[5,24],"size":[11,24],"effort":2,"line":0.65,"habitat":["headwater"],"current":["shelter","run"]},
    "cascadeChar": {"tier":"uncommon","baits":{"minnow":1,"worm":0.45,"caterpillar":0.45,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[24,45],"effort":5,"line":0.95,"habitat":["headwater"],"current":["eddy","shelter"]},
    "graniteGoby": {"tier":"uncommon","baits":{"antEggs":1,"worm":0.45,"caterpillar":0.45},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[27,51],"effort":5,"line":0.95,"habitat":["headwater"],"current":["run"]},
    "windfinMahseer": {"tier":"uncommon","baits":{"fermentedBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[10,42],"size":[28,53],"effort":5,"line":0.95,"habitat":["headwater"],"current":["shelter","run"]},
    "crimsonHillBarb": {"tier":"uncommon","baits":{"shadeLure":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[10,42],"size":[28,53],"effort":5,"line":0.95,"habitat":["headwater"],"current":["eddy","shelter"]},
    "snowlineTrout": {"tier":"uncommon","baits":{"loach":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[24,45],"effort":5,"line":0.95,"habitat":["headwater"],"current":["run"]},
    "ridgePike": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[30,57],"effort":5,"line":0.95,"habitat":["headwater"],"current":["shelter","run"]},
    "mistSalmon": {"tier":"rare","baits":{"dough":1,"moth":1},"hours":[[5,19]],"rain":0.8,"wait":[15,60],"size":[39,70],"effort":8,"line":1.25,"habitat":["headwater"],"current":["eddy","shelter"]},
    "blackstoneEel": {"tier":"rare","baits":{"corn":1},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[15,60],"size":[46,84],"effort":8,"line":1.25,"habitat":["headwater"],"current":["run"]},
    "cloudCrownMahseer": {"tier":"legend","baits":{"cricket":1,"grasshopper":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[20,78],"size":[59,105],"effort":11,"line":1.5499999999999998,"habitat":["headwater"],"current":["shelter","run"]},
    "thunderbackSturgeon": {"tier":"legend","baits":{"branBait":1},"hours":[[8,17]],"rain":1.7,"wait":[20,78],"size":[60,107],"effort":11,"line":1.5499999999999998,"needs":["after"],"habitat":["headwater"],"current":["eddy","shelter"]},
    "poolMedaka": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[0,24]],"rain":0.8,"wait":[5,24],"size":[8,18],"effort":2,"line":0.65,"habitat":["pool"],"current":["eddy"]},
    "lilyGourami": {"tier":"common","baits":{"dough":1,"worm":0.45,"caterpillar":0.45,"moth":1},"hours":[[0,24]],"rain":1.1,"wait":[5,24],"size":[11,24],"effort":2,"line":0.65,"habitat":["pool"],"current":["shelter"]},
    "moonspotGoby": {"tier":"common","baits":{"corn":1,"worm":0.45,"caterpillar":0.45},"hours":[[0,24]],"rain":1.4,"wait":[5,24],"size":[12,26],"effort":2,"line":0.65,"habitat":["pool"],"current":["eddy"]},
    "mossfinPerch": {"tier":"common","baits":{"cricket":1,"worm":0.45,"caterpillar":0.45,"grasshopper":1},"hours":[[8,17]],"rain":1.7,"wait":[5,24],"size":[11,24],"effort":2,"line":0.65,"habitat":["pool"],"current":["shelter"]},
    "roundtailBetta": {"tier":"common","baits":{"branBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[5,24],"size":[13,28],"effort":2,"line":0.65,"habitat":["pool"],"current":["eddy"]},
    "duskFeatherfin": {"tier":"common","baits":{"shrimpLive":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[5,24],"size":[9,20],"effort":2,"line":0.65,"habitat":["pool"],"current":["shelter"]},
    "petalKillifish": {"tier":"uncommon","baits":{"minnow":1,"worm":0.45,"caterpillar":0.45,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[23,43],"effort":5,"line":0.95,"habitat":["pool"],"current":["eddy"]},
    "caveGlassPerch": {"tier":"uncommon","baits":{"antEggs":1,"worm":0.45,"caterpillar":0.45},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[26,49],"effort":5,"line":0.95,"habitat":["pool"],"current":["shelter"]},
    "spottedPoolCatfish": {"tier":"uncommon","baits":{"fermentedBait":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,19]],"rain":0.8,"wait":[10,42],"size":[29,55],"effort":5,"line":0.95,"habitat":["pool"],"current":["eddy"]},
    "ivoryKnifefish": {"tier":"uncommon","baits":{"shadeLure":1,"worm":0.45,"caterpillar":0.45},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[10,42],"size":[31,59],"effort":5,"line":0.95,"habitat":["pool"],"current":["shelter"]},
    "jadeSleeper": {"tier":"uncommon","baits":{"loach":1,"worm":0.45,"caterpillar":0.45},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[10,42],"size":[27,51],"effort":5,"line":0.95,"habitat":["pool"],"current":["eddy"]},
    "caveRibbonEel": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[8,17]],"rain":1.7,"wait":[10,42],"size":[31,59],"effort":5,"line":0.95,"habitat":["pool"],"current":["shelter"]},
    "violetCaveChar": {"tier":"rare","baits":{"dough":1,"moth":1},"hours":[[5,19]],"rain":0.8,"wait":[15,60],"size":[39,70],"effort":8,"line":1.25,"habitat":["pool"],"current":["eddy"]},
    "mirrorPoolCarp": {"tier":"rare","baits":{"corn":1},"hours":[[17,24],[0,6]],"rain":1.1,"wait":[15,60],"size":[43,78],"effort":8,"line":1.25,"habitat":["pool"],"current":["shelter"]},
    "starfinBichir": {"tier":"rare","baits":{"cricket":1,"grasshopper":1},"hours":[[5,9],[16,20]],"rain":1.4,"wait":[15,60],"size":[45,82],"effort":8,"line":1.25,"habitat":["pool"],"current":["eddy"]},
    "moonveilArowana": {"tier":"legend","baits":{"branBait":1},"hours":[[8,17]],"rain":1.7,"wait":[20,78],"size":[60,107],"effort":11,"line":1.5499999999999998,"habitat":["pool"],"current":["shelter"]},
    "crystalCaveDragon": {"tier":"legend","baits":{"shrimpLive":1},"hours":[[5,19]],"rain":0.8,"wait":[20,78],"size":[59,105],"effort":11,"line":1.5499999999999998,"needs":["after"],"habitat":["pool"],"current":["eddy"]},
    "pearlDanio": {"tier":"legend","baits":{"worm":1,"caterpillar":1},"hours":[[3,7]],"rain":1,"wait":[20,78],"size":[2,18],"effort":11,"line":1.38,"habitat":["town"],"fresh":0.003,"peak":[[3,5]]},
    "peacockGudgeon": {"tier":"rare","baits":{"shrimpLive":1},"hours":[[3,5]],"rain":1,"wait":[15,60],"size":[2,18],"effort":8,"line":1.08,"habitat":["creek"],"fresh":0.008},
    "huchen": {"tier":"legend","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[3,5]],"rain":1,"wait":[20,78],"size":[70,150],"effort":13,"line":1.74,"habitat":["headwater"],"fresh":0.003},
    "forktailBlueEye": {"tier":"rare","baits":{"dough":1,"moth":1},"hours":[[5,7]],"rain":1,"wait":[15,60],"size":[3,7],"effort":8,"line":1.08,"habitat":["town"],"fresh":0.008},
    "empireGudgeon": {"tier":"rare","baits":{"worm":1,"caterpillar":1},"hours":[[5,7]],"rain":1,"wait":[15,60],"size":[20,45],"effort":8,"line":1.2,"habitat":["creek"],"fresh":0.008},
    "lenok": {"tier":"rare","baits":{"cricket":1,"grasshopper":1},"hours":[[5,11]],"rain":1,"wait":[15,60],"size":[70,150],"effort":10,"line":1.44,"habitat":["headwater"],"fresh":0.008,"peak":[[5,7]]},
    "zebrafish": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[7,13]],"rain":1,"wait":[5,24],"size":[3,7],"effort":2,"line":0.48,"habitat":["town"],"fresh":0.06,"peak":[[7,11]]},
    "europeanChub": {"tier":"common","baits":{"corn":1},"hours":[[7,11]],"rain":1,"wait":[5,24],"size":[20,45],"effort":2,"line":0.6,"habitat":["creek"],"fresh":0.06},
    "arcticChar": {"tier":"uncommon","baits":{"cricket":1,"grasshopper":1},"hours":[[7,11]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["headwater"],"fresh":0.025},
    "rosyBitterling": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[11,16]],"rain":1,"wait":[5,24],"size":[3,7],"effort":2,"line":0.48,"habitat":["town"],"fresh":0.06,"peak":[[11,13]]},
    "pumpkinseed": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[11,13]],"rain":1,"wait":[5,24],"size":[20,45],"effort":2,"line":0.6,"habitat":["creek"],"fresh":0.06},
    "europeanGrayling": {"tier":"uncommon","baits":{"cricket":1,"grasshopper":1},"hours":[[11,13]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["headwater"],"fresh":0.025},
    "leastKillifish": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[13,19]],"rain":1,"wait":[5,24],"size":[3,7],"effort":2,"line":0.48,"habitat":["town"],"fresh":0.06,"peak":[[13,16]]},
    "australianBass": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[13,16]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["creek"],"fresh":0.025},
    "lakeWhitefish": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[13,16]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["pool"],"fresh":0.025},
    "tench": {"tier":"common","baits":{"corn":1},"hours":[[16,19]],"rain":1,"wait":[5,24],"size":[20,45],"effort":2,"line":0.6,"habitat":["town"],"fresh":0.06},
    "goldenDorado": {"tier":"legend","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[16,23]],"rain":1,"wait":[20,78],"size":[70,150],"effort":13,"line":1.74,"habitat":["creek"],"fresh":0.003,"peak":[[16,19]]},
    "europeanBullhead": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[16,19]],"rain":1,"wait":[5,24],"size":[3,7],"effort":2,"line":0.48,"habitat":["headwater"],"fresh":0.06},
    "glassKnifefish": {"tier":"legend","baits":{"worm":1,"caterpillar":1},"hours":[[0,3],[19,24]],"rain":1,"wait":[20,78],"size":[2,18],"effort":11,"line":1.38,"habitat":["town"],"fresh":0.003,"peak":[[19,23]]},
    "tigerShovelnose": {"tier":"uncommon","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[19,23]],"rain":1,"wait":[10,42],"size":[70,150],"effort":7,"line":1.14,"habitat":["creek"],"fresh":0.025},
    "burbot": {"tier":"uncommon","baits":{"minnow":1,"loach":1,"dragonfly":1,"forktailBlueEye":1,"zebrafish":1,"rosyBitterling":1,"leastKillifish":1,"europeanBullhead":1},"hours":[[19,23]],"rain":1,"wait":[10,42],"size":[70,150],"effort":7,"line":1.14,"habitat":["pool"],"fresh":0.025},
    "elephantnoseFish": {"tier":"rare","baits":{"worm":1,"caterpillar":1},"hours":[[0,5],[23,24]],"rain":1,"wait":[15,60],"size":[2,18],"effort":8,"line":1.08,"habitat":["town"],"fresh":0.008,"peak":[[0,3],[23,24]]},
    "freshwaterSole": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[0,3],[23,24]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["creek"],"fresh":0.025},
    "dollyVarden": {"tier":"uncommon","baits":{"cricket":1,"grasshopper":1},"hours":[[0,3],[23,24]],"rain":1,"wait":[10,42],"size":[20,45],"effort":5,"line":0.8999999999999999,"habitat":["headwater"],"fresh":0.025}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish","creekDace","torrentBarb","stoneLapper","glassGoby","brookTrout","caveBlindfish","uplandEel","springShrimp","riverLamprey","marbleMahseer","torrentSleeper","waterfallSturgeon","reedMinnow","ribbonRasbora","pebbleLoach","willowShiner","sandGudgeon","amberChub","fernBarbel","redfinDace","stripedSpinyLoach","leafPerch","copperBream","needleHalfbeak","spottedCreekCatfish","saffronLoach","longfinCreekCarp","orchidSnakehead","creekDragonfish","ancientCreekBarbel","silverSpringDace","rockSculpin","mossLoach","swiftGrayling","bluefinTrout","mountainWhitefish","cascadeChar","graniteGoby","windfinMahseer","crimsonHillBarb","snowlineTrout","ridgePike","mistSalmon","blackstoneEel","cloudCrownMahseer","thunderbackSturgeon","poolMedaka","lilyGourami","moonspotGoby","mossfinPerch","roundtailBetta","duskFeatherfin","petalKillifish","caveGlassPerch","spottedPoolCatfish","ivoryKnifefish","jadeSleeper","caveRibbonEel","violetCaveChar","mirrorPoolCarp","starfinBichir","moonveilArowana","crystalCaveDragon"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["shadeLure","worm","dough","minnow","corn","loach","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait","caterpillar","moth","dragonfly","grasshopper","forktailBlueEye","zebrafish","rosyBitterling","leastKillifish","europeanBullhead"],
    "kept": ["lure","shadeLure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "fresh": {"ids":["pearlDanio","peacockGudgeon","huchen","forktailBlueEye","empireGudgeon","lenok","zebrafish","europeanChub","arcticChar","rosyBitterling","pumpkinseed","europeanGrayling","leastKillifish","australianBass","lakeWhitefish","tench","goldenDorado","europeanBullhead","glassKnifefish","tigerShovelnose","burbot","elephantnoseFish","freshwaterSole","dollyVarden"],"junk":["hyacinth","boot","driftwood","bottle"],"take":0.5,"offPeak":0.5},
    "floats": {"flowFloat":1.3,"floatFeather":1.1,"floatGlow":1.15,"floatQuill":1.25,"floatBell":1.5},
    "nets": {"torrentNet":0.8,"netSmall":0.88,"netLong":0.76},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "signs": {"crowd":2,"lately":300,"after":30,"moon":1.5,"weekend":[0,6]},
    "pair": {"never":["legend"]},
    "orb": {"minutes":30,"night":23,"skies":["night","rain","moon"]},
    "star": {"tiers":["rare","legend"]},
    "wary": {"ups":3,"within":300,"gone":600,"tiers":["rare","legend"]},
    "bouts": {"legend":2},
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false,"21,249":true,"19,250":true,"21,250":true,"23,250":true,"35,250":true,"69,250":true,"19,251":true,"20,251":true,"21,251":true,"22,251":true,"23,251":true,"30,251":true,"31,251":true,"35,251":true,"37,251":true,"62,251":true,"63,251":true,"64,251":true,"65,251":true,"67,251":true,"68,251":true,"69,251":true,"70,251":true,"7,252":true,"18,252":true,"20,252":true,"22,252":true,"23,252":true,"24,252":true,"28,252":true,"29,252":true,"31,252":true,"35,252":true,"36,252":true,"37,252":true,"56,252":true,"57,252":true,"58,252":true,"59,252":true,"60,252":true,"61,252":true,"62,252":true,"63,252":true,"64,252":true,"65,252":true,"66,252":true,"67,252":true,"68,252":true,"69,252":true,"70,252":true,"6,253":true,"7,253":true,"8,253":true,"9,253":true,"11,253":true,"17,253":true,"18,253":true,"19,253":true,"20,253":true,"22,253":true,"24,253":true,"29,253":true,"30,253":true,"31,253":true,"36,253":true,"38,253":true,"51,253":true,"56,253":true,"57,253":true,"58,253":true,"59,253":true,"60,253":true,"61,253":true,"62,253":true,"63,253":true,"64,253":true,"65,253":true,"66,253":true,"67,253":true,"68,253":true,"70,253":true,"5,254":true,"6,254":true,"7,254":true,"8,254":true,"9,254":true,"11,254":true,"12,254":true,"16,254":true,"18,254":true,"20,254":true,"22,254":true,"23,254":true,"24,254":true,"27,254":true,"28,254":true,"29,254":true,"36,254":true,"37,254":true,"38,254":true,"52,254":true,"56,254":true,"57,254":true,"58,254":true,"59,254":true,"60,254":true,"61,254":true,"70,254":true,"4,255":true,"5,255":true,"6,255":true,"8,255":true,"9,255":true,"10,255":true,"12,255":true,"16,255":true,"19,255":true,"20,255":true,"21,255":true,"22,255":true,"23,255":true,"29,255":true,"30,255":true,"31,255":true,"34,255":true,"35,255":true,"36,255":true,"37,255":true,"50,255":true,"51,255":true,"52,255":true,"70,255":true,"4,256":true,"5,256":true,"6,256":true,"8,256":true,"10,256":true,"11,256":true,"12,256":true,"16,256":true,"17,256":true,"19,256":true,"21,256":true,"23,256":true,"28,256":true,"29,256":true,"31,256":true,"34,256":true,"36,256":true,"50,256":true,"52,256":true,"63,256":true,"64,256":true,"65,256":true,"66,256":true,"67,256":true,"68,256":true,"69,256":true,"70,256":true,"6,257":true,"7,257":true,"8,257":true,"9,257":true,"11,257":true,"12,257":true,"13,257":true,"21,257":true,"30,257":true,"31,257":true,"34,257":true,"35,257":true,"51,257":true,"52,257":true,"56,257":true,"57,257":true,"58,257":true,"59,257":true,"60,257":true,"61,257":true,"62,257":true,"63,257":true,"64,257":true,"65,257":true,"67,257":true,"68,257":true,"69,257":true,"70,257":true,"5,258":true,"7,258":true,"9,258":true,"10,258":true,"11,258":true,"12,258":true,"13,258":true,"56,258":true,"57,258":true,"58,258":true,"59,258":true,"60,258":true,"61,258":true,"62,258":true,"63,258":true,"65,258":true,"66,258":true,"67,258":true,"68,258":true,"69,258":true,"7,259":true,"11,259":true,"12,259":true,"13,259":true,"56,259":true,"57,259":true,"58,259":true,"59,259":true,"60,259":true,"61,259":true,"62,259":true,"184,130":true,"185,130":true,"186,130":true,"187,130":true,"188,130":true,"180,131":true,"182,131":true,"183,131":true,"184,131":true,"185,131":true,"186,131":true,"187,131":true,"188,131":true,"189,131":true,"190,131":true,"191,131":true,"192,131":true,"177,132":true,"179,132":true,"180,132":true,"181,132":true,"182,132":true,"183,132":true,"184,132":true,"185,132":true,"186,132":true,"187,132":true,"188,132":true,"189,132":true,"190,132":true,"191,132":true,"192,132":true,"193,132":true,"194,132":true,"173,133":true,"174,133":true,"175,133":true,"176,133":true,"177,133":true,"178,133":true,"179,133":true,"180,133":true,"181,133":true,"182,133":true,"183,133":true,"190,133":true,"191,133":true,"192,133":true,"193,133":true,"194,133":true,"195,133":true,"196,133":true,"171,134":true,"173,134":true,"174,134":true,"175,134":true,"176,134":true,"177,134":true,"178,134":true,"179,134":true,"193,134":true,"194,134":true,"195,134":true,"196,134":true,"197,134":true,"198,134":true,"199,134":true,"170,135":true,"171,135":true,"172,135":true,"173,135":true,"174,135":true,"175,135":true,"193,135":true,"194,135":true,"195,135":true,"196,135":true,"197,135":true,"198,135":true,"200,135":true,"201,135":true,"203,135":true,"204,135":true,"205,135":true,"206,135":true,"207,135":true,"208,135":true,"209,135":true,"210,135":true,"211,135":true,"212,135":true,"215,135":true,"154,136":true,"155,136":true,"156,136":true,"157,136":true,"158,136":true,"159,136":true,"169,136":true,"170,136":true,"172,136":true,"184,136":true,"185,136":true,"186,136":true,"187,136":true,"188,136":true,"189,136":true,"190,136":true,"193,136":true,"194,136":true,"197,136":true,"198,136":true,"199,136":true,"200,136":true,"201,136":true,"202,136":true,"203,136":true,"204,136":true,"206,136":true,"207,136":true,"209,136":true,"210,136":true,"211,136":true,"212,136":true,"213,136":true,"214,136":true,"215,136":true,"216,136":true,"217,136":true,"219,136":true,"149,137":true,"150,137":true,"151,137":true,"152,137":true,"153,137":true,"154,137":true,"155,137":true,"156,137":true,"158,137":true,"159,137":true,"160,137":true,"161,137":true,"162,137":true,"163,137":true,"164,137":true,"165,137":true,"166,137":true,"167,137":true,"168,137":true,"169,137":true,"170,137":true,"171,137":true,"181,137":true,"182,137":true,"183,137":true,"185,137":true,"187,137":true,"188,137":true,"190,137":true,"191,137":true,"192,137":true,"193,137":true,"194,137":true,"200,137":true,"201,137":true,"202,137":true,"203,137":true,"204,137":true,"205,137":true,"206,137":true,"207,137":true,"208,137":true,"209,137":true,"210,137":true,"211,137":true,"212,137":true,"213,137":true,"214,137":true,"215,137":true,"216,137":true,"217,137":true,"218,137":true,"219,137":true,"220,137":true,"221,137":true,"145,138":true,"146,138":true,"147,138":true,"148,138":true,"149,138":true,"151,138":true,"152,138":true,"153,138":true,"154,138":true,"155,138":true,"156,138":true,"157,138":true,"158,138":true,"159,138":true,"161,138":true,"162,138":true,"163,138":true,"164,138":true,"166,138":true,"168,138":true,"169,138":true,"180,138":true,"181,138":true,"182,138":true,"183,138":true,"184,138":true,"185,138":true,"186,138":true,"187,138":true,"188,138":true,"189,138":true,"190,138":true,"191,138":true,"192,138":true,"193,138":true,"194,138":true,"195,138":true,"196,138":true,"213,138":true,"214,138":true,"216,138":true,"217,138":true,"218,138":true,"219,138":true,"220,138":true,"221,138":true,"222,138":true,"223,138":true,"224,138":true,"225,138":true,"226,138":true,"146,139":true,"148,139":true,"149,139":true,"150,139":true,"151,139":true,"152,139":true,"153,139":true,"160,139":true,"161,139":true,"162,139":true,"163,139":true,"164,139":true,"165,139":true,"166,139":true,"167,139":true,"179,139":true,"180,139":true,"181,139":true,"182,139":true,"183,139":true,"191,139":true,"192,139":true,"193,139":true,"194,139":true,"195,139":true,"196,139":true,"197,139":true,"198,139":true,"199,139":true,"213,139":true,"214,139":true,"220,139":true,"221,139":true,"222,139":true,"223,139":true,"225,139":true,"226,139":true,"227,139":true,"228,139":true,"229,139":true,"233,139":true,"234,139":true,"145,140":true,"146,140":true,"147,140":true,"148,140":true,"161,140":true,"162,140":true,"178,140":true,"179,140":true,"180,140":true,"181,140":true,"194,140":true,"195,140":true,"197,140":true,"198,140":true,"199,140":true,"200,140":true,"201,140":true,"202,140":true,"203,140":true,"204,140":true,"213,140":true,"214,140":true,"222,140":true,"223,140":true,"224,140":true,"225,140":true,"226,140":true,"227,140":true,"235,140":true,"161,141":true,"162,141":true,"176,141":true,"177,141":true,"178,141":true,"179,141":true,"180,141":true,"197,141":true,"198,141":true,"199,141":true,"200,141":true,"201,141":true,"203,141":true,"205,141":true,"206,141":true,"207,141":true,"208,141":true,"209,141":true,"210,141":true,"211,141":true,"212,141":true,"213,141":true,"214,141":true,"215,141":true,"226,141":true,"154,142":true,"155,142":true,"156,142":true,"157,142":true,"158,142":true,"159,142":true,"160,142":true,"161,142":true,"162,142":true,"163,142":true,"164,142":true,"165,142":true,"166,142":true,"175,142":true,"176,142":true,"178,142":true,"179,142":true,"200,142":true,"201,142":true,"202,142":true,"203,142":true,"204,142":true,"205,142":true,"206,142":true,"207,142":true,"208,142":true,"209,142":true,"210,142":true,"211,142":true,"212,142":true,"213,142":true,"215,142":true,"216,142":true,"217,142":true,"218,142":true,"219,142":true,"145,143":true,"147,143":true,"148,143":true,"149,143":true,"150,143":true,"151,143":true,"152,143":true,"154,143":true,"155,143":true,"156,143":true,"157,143":true,"159,143":true,"160,143":true,"161,143":true,"162,143":true,"163,143":true,"164,143":true,"165,143":true,"167,143":true,"168,143":true,"169,143":true,"170,143":true,"171,143":true,"172,143":true,"173,143":true,"174,143":true,"176,143":true,"177,143":true,"178,143":true,"205,143":true,"207,143":true,"209,143":true,"211,143":true,"212,143":true,"213,143":true,"214,143":true,"215,143":true,"216,143":true,"217,143":true,"218,143":true,"219,143":true,"220,143":true,"221,143":true,"222,143":true,"145,144":true,"146,144":true,"147,144":true,"148,144":true,"150,144":true,"152,144":true,"153,144":true,"154,144":true,"155,144":true,"156,144":true,"157,144":true,"158,144":true,"159,144":true,"160,144":true,"163,144":true,"164,144":true,"165,144":true,"166,144":true,"167,144":true,"168,144":true,"169,144":true,"170,144":true,"171,144":true,"173,144":true,"174,144":true,"175,144":true,"176,144":true,"217,144":true,"218,144":true,"219,144":true,"220,144":true,"221,144":true,"222,144":true,"223,144":true,"224,144":true,"225,144":true,"226,144":true,"146,145":true,"147,145":true,"148,145":true,"149,145":true,"150,145":true,"151,145":true,"152,145":true,"153,145":true,"167,145":true,"169,145":true,"170,145":true,"171,145":true,"172,145":true,"173,145":true,"174,145":true,"220,145":true,"221,145":true,"223,145":true,"225,145":true,"226,145":true,"227,145":true,"235,145":true,"146,146":true,"223,146":true,"224,146":true,"225,146":true,"226,146":true,"227,146":true,"228,146":true,"234,146":true,"235,146":true,"226,147":true,"227,147":true,"228,147":true,"229,147":true,"230,147":true,"231,147":true,"232,147":true,"234,147":true,"235,147":true,"227,148":true,"228,148":true,"229,148":true,"230,148":true,"231,148":true,"232,148":true,"233,148":true,"234,148":true,"235,148":true,"229,149":true,"230,149":true,"231,149":true,"233,149":true},
    "waters": {"184,130":{"habitat":"creek","current":"shelter"},"185,130":{"habitat":"creek","current":"shelter"},"186,130":{"habitat":"creek","current":"shelter"},"187,130":{"habitat":"creek","current":"shelter"},"188,130":{"habitat":"creek","current":"shelter"},"180,131":{"habitat":"creek","current":"shelter"},"182,131":{"habitat":"creek","current":"shelter"},"183,131":{"habitat":"creek","current":"shelter"},"184,131":{"habitat":"creek","current":"shelter"},"185,131":{"habitat":"creek","current":"shelter"},"186,131":{"habitat":"creek","current":"shelter"},"187,131":{"habitat":"creek","current":"shelter"},"188,131":{"habitat":"creek","current":"shelter"},"189,131":{"habitat":"creek","current":"shelter"},"190,131":{"habitat":"creek","current":"shelter"},"191,131":{"habitat":"creek","current":"shelter"},"192,131":{"habitat":"creek","current":"shelter"},"177,132":{"habitat":"creek","current":"eddy"},"179,132":{"habitat":"creek","current":"shelter"},"180,132":{"habitat":"creek","current":"shelter"},"181,132":{"habitat":"creek","current":"shelter"},"182,132":{"habitat":"creek","current":"shelter"},"183,132":{"habitat":"creek","current":"shelter"},"184,132":{"habitat":"creek","current":"shelter"},"185,132":{"habitat":"creek","current":"shelter"},"186,132":{"habitat":"creek","current":"shelter"},"187,132":{"habitat":"creek","current":"shelter"},"188,132":{"habitat":"creek","current":"shelter"},"189,132":{"habitat":"creek","current":"shelter"},"190,132":{"habitat":"creek","current":"shelter"},"191,132":{"habitat":"creek","current":"shelter"},"192,132":{"habitat":"creek","current":"shelter"},"193,132":{"habitat":"creek","current":"shelter"},"194,132":{"habitat":"creek","current":"shelter"},"173,133":{"habitat":"creek","current":"eddy"},"174,133":{"habitat":"creek","current":"eddy"},"175,133":{"habitat":"creek","current":"eddy"},"176,133":{"habitat":"creek","current":"eddy"},"177,133":{"habitat":"creek","current":"eddy"},"178,133":{"habitat":"creek","current":"shelter"},"179,133":{"habitat":"creek","current":"shelter"},"180,133":{"habitat":"creek","current":"shelter"},"181,133":{"habitat":"creek","current":"shelter"},"182,133":{"habitat":"creek","current":"shelter"},"183,133":{"habitat":"creek","current":"shelter"},"190,133":{"habitat":"creek","current":"shelter"},"191,133":{"habitat":"creek","current":"shelter"},"192,133":{"habitat":"creek","current":"shelter"},"193,133":{"habitat":"creek","current":"shelter"},"194,133":{"habitat":"creek","current":"run"},"195,133":{"habitat":"creek","current":"shelter"},"196,133":{"habitat":"creek","current":"shelter"},"171,134":{"habitat":"creek","current":"eddy"},"173,134":{"habitat":"creek","current":"eddy"},"174,134":{"habitat":"creek","current":"eddy"},"175,134":{"habitat":"creek","current":"eddy"},"176,134":{"habitat":"creek","current":"eddy"},"177,134":{"habitat":"creek","current":"eddy"},"178,134":{"habitat":"creek","current":"shelter"},"179,134":{"habitat":"creek","current":"shelter"},"193,134":{"habitat":"creek","current":"shelter"},"194,134":{"habitat":"creek","current":"shelter"},"195,134":{"habitat":"creek","current":"shelter"},"196,134":{"habitat":"creek","current":"shelter"},"197,134":{"habitat":"creek","current":"shelter"},"198,134":{"habitat":"creek","current":"shelter"},"199,134":{"habitat":"creek","current":"shelter"},"170,135":{"habitat":"creek","current":"eddy"},"171,135":{"habitat":"creek","current":"eddy"},"172,135":{"habitat":"creek","current":"eddy"},"173,135":{"habitat":"creek","current":"eddy"},"174,135":{"habitat":"creek","current":"eddy"},"175,135":{"habitat":"creek","current":"eddy"},"193,135":{"habitat":"creek","current":"run"},"194,135":{"habitat":"creek","current":"run"},"195,135":{"habitat":"creek","current":"shelter"},"196,135":{"habitat":"creek","current":"shelter"},"197,135":{"habitat":"creek","current":"shelter"},"198,135":{"habitat":"creek","current":"shelter"},"200,135":{"habitat":"creek","current":"shelter"},"201,135":{"habitat":"creek","current":"shelter"},"203,135":{"habitat":"creek","current":"shelter"},"204,135":{"habitat":"creek","current":"shelter"},"205,135":{"habitat":"creek","current":"shelter"},"206,135":{"habitat":"headwater","current":"shelter"},"207,135":{"habitat":"headwater","current":"shelter"},"208,135":{"habitat":"headwater","current":"shelter"},"209,135":{"habitat":"headwater","current":"shelter"},"210,135":{"habitat":"headwater","current":"shelter"},"211,135":{"habitat":"headwater","current":"shelter"},"212,135":{"habitat":"headwater","current":"shelter"},"215,135":{"habitat":"headwater","current":"shelter"},"154,136":{"habitat":"creek","current":"shelter"},"155,136":{"habitat":"creek","current":"shelter"},"156,136":{"habitat":"creek","current":"shelter"},"157,136":{"habitat":"creek","current":"shelter"},"158,136":{"habitat":"creek","current":"shelter"},"159,136":{"habitat":"creek","current":"shelter"},"169,136":{"habitat":"creek","current":"eddy"},"170,136":{"habitat":"creek","current":"eddy"},"172,136":{"habitat":"creek","current":"eddy"},"184,136":{"habitat":"creek","current":"shelter"},"185,136":{"habitat":"creek","current":"shelter"},"186,136":{"habitat":"creek","current":"shelter"},"187,136":{"habitat":"creek","current":"shelter"},"188,136":{"habitat":"creek","current":"shelter"},"189,136":{"habitat":"creek","current":"shelter"},"190,136":{"habitat":"creek","current":"shelter"},"193,136":{"habitat":"creek","current":"shelter"},"194,136":{"habitat":"creek","current":"run"},"197,136":{"habitat":"creek","current":"shelter"},"198,136":{"habitat":"creek","current":"shelter"},"199,136":{"habitat":"creek","current":"shelter"},"200,136":{"habitat":"creek","current":"shelter"},"201,136":{"habitat":"creek","current":"shelter"},"202,136":{"habitat":"creek","current":"shelter"},"203,136":{"habitat":"creek","current":"shelter"},"204,136":{"habitat":"creek","current":"shelter"},"206,136":{"habitat":"headwater","current":"shelter"},"207,136":{"habitat":"headwater","current":"shelter"},"209,136":{"habitat":"headwater","current":"shelter"},"210,136":{"habitat":"headwater","current":"shelter"},"211,136":{"habitat":"headwater","current":"shelter"},"212,136":{"habitat":"headwater","current":"shelter"},"213,136":{"habitat":"headwater","current":"shelter"},"214,136":{"habitat":"headwater","current":"shelter"},"215,136":{"habitat":"headwater","current":"shelter"},"216,136":{"habitat":"headwater","current":"shelter"},"217,136":{"habitat":"headwater","current":"shelter"},"219,136":{"habitat":"headwater","current":"shelter"},"149,137":{"habitat":"creek","current":"shelter"},"150,137":{"habitat":"creek","current":"shelter"},"151,137":{"habitat":"creek","current":"shelter"},"152,137":{"habitat":"creek","current":"shelter"},"153,137":{"habitat":"creek","current":"shelter"},"154,137":{"habitat":"creek","current":"shelter"},"155,137":{"habitat":"creek","current":"shelter"},"156,137":{"habitat":"creek","current":"shelter"},"158,137":{"habitat":"creek","current":"shelter"},"159,137":{"habitat":"creek","current":"shelter"},"160,137":{"habitat":"creek","current":"shelter"},"161,137":{"habitat":"creek","current":"shelter"},"162,137":{"habitat":"creek","current":"shelter"},"163,137":{"habitat":"creek","current":"shelter"},"164,137":{"habitat":"creek","current":"shelter"},"165,137":{"habitat":"creek","current":"shelter"},"166,137":{"habitat":"creek","current":"shelter"},"167,137":{"habitat":"creek","current":"shelter"},"168,137":{"habitat":"creek","current":"shelter"},"169,137":{"habitat":"creek","current":"shelter"},"170,137":{"habitat":"creek","current":"eddy"},"171,137":{"habitat":"creek","current":"eddy"},"181,137":{"habitat":"creek","current":"shelter"},"182,137":{"habitat":"creek","current":"shelter"},"183,137":{"habitat":"creek","current":"shelter"},"185,137":{"habitat":"creek","current":"shelter"},"187,137":{"habitat":"creek","current":"shelter"},"188,137":{"habitat":"creek","current":"shelter"},"190,137":{"habitat":"creek","current":"shelter"},"191,137":{"habitat":"creek","current":"shelter"},"192,137":{"habitat":"creek","current":"shelter"},"193,137":{"habitat":"creek","current":"shelter"},"194,137":{"habitat":"creek","current":"shelter"},"200,137":{"habitat":"creek","current":"shelter"},"201,137":{"habitat":"creek","current":"shelter"},"202,137":{"habitat":"creek","current":"shelter"},"203,137":{"habitat":"creek","current":"shelter"},"204,137":{"habitat":"creek","current":"shelter"},"205,137":{"habitat":"creek","current":"shelter"},"206,137":{"habitat":"headwater","current":"shelter"},"207,137":{"habitat":"headwater","current":"shelter"},"208,137":{"habitat":"headwater","current":"shelter"},"209,137":{"habitat":"headwater","current":"shelter"},"210,137":{"habitat":"headwater","current":"shelter"},"211,137":{"habitat":"headwater","current":"shelter"},"212,137":{"habitat":"headwater","current":"shelter"},"213,137":{"habitat":"headwater","current":"shelter"},"214,137":{"habitat":"headwater","current":"shelter"},"215,137":{"habitat":"headwater","current":"shelter"},"216,137":{"habitat":"headwater","current":"shelter"},"217,137":{"habitat":"headwater","current":"shelter"},"218,137":{"habitat":"headwater","current":"shelter"},"219,137":{"habitat":"headwater","current":"shelter"},"220,137":{"habitat":"headwater","current":"shelter"},"221,137":{"habitat":"headwater","current":"shelter"},"145,138":{"habitat":"creek","current":"shelter"},"146,138":{"habitat":"creek","current":"shelter"},"147,138":{"habitat":"creek","current":"shelter"},"148,138":{"habitat":"creek","current":"shelter"},"149,138":{"habitat":"creek","current":"shelter"},"151,138":{"habitat":"creek","current":"shelter"},"152,138":{"habitat":"creek","current":"shelter"},"153,138":{"habitat":"creek","current":"shelter"},"154,138":{"habitat":"creek","current":"shelter"},"155,138":{"habitat":"creek","current":"shelter"},"156,138":{"habitat":"creek","current":"shelter"},"157,138":{"habitat":"creek","current":"shelter"},"158,138":{"habitat":"creek","current":"shelter"},"159,138":{"habitat":"creek","current":"shelter"},"161,138":{"habitat":"creek","current":"shelter"},"162,138":{"habitat":"creek","current":"shelter"},"163,138":{"habitat":"creek","current":"shelter"},"164,138":{"habitat":"creek","current":"shelter"},"166,138":{"habitat":"creek","current":"shelter"},"168,138":{"habitat":"creek","current":"shelter"},"169,138":{"habitat":"creek","current":"shelter"},"180,138":{"habitat":"creek","current":"shelter"},"181,138":{"habitat":"creek","current":"shelter"},"182,138":{"habitat":"creek","current":"shelter"},"183,138":{"habitat":"creek","current":"shelter"},"184,138":{"habitat":"creek","current":"shelter"},"185,138":{"habitat":"creek","current":"shelter"},"186,138":{"habitat":"creek","current":"shelter"},"187,138":{"habitat":"creek","current":"shelter"},"188,138":{"habitat":"creek","current":"shelter"},"189,138":{"habitat":"creek","current":"shelter"},"190,138":{"habitat":"creek","current":"shelter"},"191,138":{"habitat":"creek","current":"shelter"},"192,138":{"habitat":"creek","current":"shelter"},"193,138":{"habitat":"creek","current":"run"},"194,138":{"habitat":"creek","current":"shelter"},"195,138":{"habitat":"creek","current":"shelter"},"196,138":{"habitat":"creek","current":"shelter"},"213,138":{"habitat":"headwater","current":"shelter"},"214,138":{"habitat":"headwater","current":"shelter"},"216,138":{"habitat":"headwater","current":"shelter"},"217,138":{"habitat":"headwater","current":"shelter"},"218,138":{"habitat":"headwater","current":"shelter"},"219,138":{"habitat":"headwater","current":"shelter"},"220,138":{"habitat":"headwater","current":"shelter"},"221,138":{"habitat":"headwater","current":"shelter"},"222,138":{"habitat":"headwater","current":"shelter"},"223,138":{"habitat":"headwater","current":"shelter"},"224,138":{"habitat":"headwater","current":"shelter"},"225,138":{"habitat":"headwater","current":"shelter"},"226,138":{"habitat":"pool","current":"eddy"},"146,139":{"habitat":"creek","current":"shelter"},"148,139":{"habitat":"creek","current":"shelter"},"149,139":{"habitat":"creek","current":"shelter"},"150,139":{"habitat":"creek","current":"shelter"},"151,139":{"habitat":"creek","current":"shelter"},"152,139":{"habitat":"creek","current":"shelter"},"153,139":{"habitat":"creek","current":"shelter"},"160,139":{"habitat":"creek","current":"shelter"},"161,139":{"habitat":"creek","current":"run"},"162,139":{"habitat":"creek","current":"shelter"},"163,139":{"habitat":"creek","current":"shelter"},"164,139":{"habitat":"creek","current":"shelter"},"165,139":{"habitat":"creek","current":"shelter"},"166,139":{"habitat":"creek","current":"shelter"},"167,139":{"habitat":"creek","current":"shelter"},"179,139":{"habitat":"creek","current":"shelter"},"180,139":{"habitat":"creek","current":"shelter"},"181,139":{"habitat":"creek","current":"shelter"},"182,139":{"habitat":"creek","current":"shelter"},"183,139":{"habitat":"creek","current":"shelter"},"191,139":{"habitat":"creek","current":"shelter"},"192,139":{"habitat":"creek","current":"shelter"},"193,139":{"habitat":"creek","current":"shelter"},"194,139":{"habitat":"creek","current":"shelter"},"195,139":{"habitat":"creek","current":"shelter"},"196,139":{"habitat":"creek","current":"shelter"},"197,139":{"habitat":"creek","current":"shelter"},"198,139":{"habitat":"creek","current":"shelter"},"199,139":{"habitat":"creek","current":"shelter"},"213,139":{"habitat":"headwater","current":"run"},"214,139":{"habitat":"headwater","current":"run"},"220,139":{"habitat":"headwater","current":"shelter"},"221,139":{"habitat":"headwater","current":"shelter"},"222,139":{"habitat":"headwater","current":"shelter"},"223,139":{"habitat":"headwater","current":"shelter"},"225,139":{"habitat":"headwater","current":"shelter"},"226,139":{"habitat":"pool","current":"eddy"},"227,139":{"habitat":"pool","current":"eddy"},"228,139":{"habitat":"pool","current":"eddy"},"229,139":{"habitat":"pool","current":"eddy"},"233,139":{"habitat":"pool","current":"eddy"},"234,139":{"habitat":"pool","current":"eddy"},"145,140":{"habitat":"creek","current":"shelter"},"146,140":{"habitat":"creek","current":"shelter"},"147,140":{"habitat":"creek","current":"shelter"},"148,140":{"habitat":"creek","current":"shelter"},"161,140":{"habitat":"creek","current":"run"},"162,140":{"habitat":"creek","current":"run"},"178,140":{"habitat":"creek","current":"eddy"},"179,140":{"habitat":"creek","current":"shelter"},"180,140":{"habitat":"creek","current":"shelter"},"181,140":{"habitat":"creek","current":"shelter"},"194,140":{"habitat":"creek","current":"shelter"},"195,140":{"habitat":"creek","current":"shelter"},"197,140":{"habitat":"creek","current":"shelter"},"198,140":{"habitat":"creek","current":"shelter"},"199,140":{"habitat":"creek","current":"shelter"},"200,140":{"habitat":"creek","current":"shelter"},"201,140":{"habitat":"creek","current":"shelter"},"202,140":{"habitat":"creek","current":"shelter"},"203,140":{"habitat":"creek","current":"shelter"},"204,140":{"habitat":"creek","current":"shelter"},"213,140":{"habitat":"headwater","current":"shelter"},"214,140":{"habitat":"headwater","current":"run"},"222,140":{"habitat":"headwater","current":"shelter"},"223,140":{"habitat":"headwater","current":"shelter"},"224,140":{"habitat":"headwater","current":"shelter"},"225,140":{"habitat":"headwater","current":"shelter"},"226,140":{"habitat":"headwater","current":"shelter"},"227,140":{"habitat":"pool","current":"eddy"},"235,140":{"habitat":"pool","current":"eddy"},"161,141":{"habitat":"creek","current":"shelter"},"162,141":{"habitat":"creek","current":"run"},"176,141":{"habitat":"creek","current":"eddy"},"177,141":{"habitat":"creek","current":"eddy"},"178,141":{"habitat":"creek","current":"eddy"},"179,141":{"habitat":"creek","current":"eddy"},"180,141":{"habitat":"creek","current":"shelter"},"197,141":{"habitat":"creek","current":"shelter"},"198,141":{"habitat":"creek","current":"shelter"},"199,141":{"habitat":"creek","current":"shelter"},"200,141":{"habitat":"creek","current":"shelter"},"201,141":{"habitat":"creek","current":"shelter"},"203,141":{"habitat":"creek","current":"shelter"},"205,141":{"habitat":"creek","current":"shelter"},"206,141":{"habitat":"headwater","current":"shelter"},"207,141":{"habitat":"headwater","current":"shelter"},"208,141":{"habitat":"headwater","current":"shelter"},"209,141":{"habitat":"headwater","current":"shelter"},"210,141":{"habitat":"headwater","current":"shelter"},"211,141":{"habitat":"headwater","current":"shelter"},"212,141":{"habitat":"headwater","current":"shelter"},"213,141":{"habitat":"headwater","current":"shelter"},"214,141":{"habitat":"headwater","current":"shelter"},"215,141":{"habitat":"headwater","current":"shelter"},"226,141":{"habitat":"headwater","current":"shelter"},"154,142":{"habitat":"creek","current":"shelter"},"155,142":{"habitat":"creek","current":"shelter"},"156,142":{"habitat":"creek","current":"shelter"},"157,142":{"habitat":"creek","current":"shelter"},"158,142":{"habitat":"creek","current":"shelter"},"159,142":{"habitat":"creek","current":"shelter"},"160,142":{"habitat":"creek","current":"shelter"},"161,142":{"habitat":"creek","current":"shelter"},"162,142":{"habitat":"creek","current":"shelter"},"163,142":{"habitat":"creek","current":"shelter"},"164,142":{"habitat":"creek","current":"shelter"},"165,142":{"habitat":"creek","current":"shelter"},"166,142":{"habitat":"creek","current":"shelter"},"175,142":{"habitat":"creek","current":"eddy"},"176,142":{"habitat":"creek","current":"eddy"},"178,142":{"habitat":"creek","current":"eddy"},"179,142":{"habitat":"creek","current":"eddy"},"200,142":{"habitat":"creek","current":"shelter"},"201,142":{"habitat":"creek","current":"shelter"},"202,142":{"habitat":"creek","current":"shelter"},"203,142":{"habitat":"creek","current":"shelter"},"204,142":{"habitat":"creek","current":"shelter"},"205,142":{"habitat":"creek","current":"shelter"},"206,142":{"habitat":"headwater","current":"shelter"},"207,142":{"habitat":"headwater","current":"shelter"},"208,142":{"habitat":"headwater","current":"shelter"},"209,142":{"habitat":"headwater","current":"shelter"},"210,142":{"habitat":"headwater","current":"shelter"},"211,142":{"habitat":"headwater","current":"shelter"},"212,142":{"habitat":"headwater","current":"shelter"},"213,142":{"habitat":"headwater","current":"shelter"},"215,142":{"habitat":"headwater","current":"shelter"},"216,142":{"habitat":"headwater","current":"shelter"},"217,142":{"habitat":"headwater","current":"shelter"},"218,142":{"habitat":"headwater","current":"shelter"},"219,142":{"habitat":"headwater","current":"shelter"},"145,143":{"habitat":"creek","current":"shelter"},"147,143":{"habitat":"creek","current":"shelter"},"148,143":{"habitat":"creek","current":"shelter"},"149,143":{"habitat":"creek","current":"shelter"},"150,143":{"habitat":"creek","current":"shelter"},"151,143":{"habitat":"creek","current":"shelter"},"152,143":{"habitat":"creek","current":"shelter"},"154,143":{"habitat":"creek","current":"shelter"},"155,143":{"habitat":"creek","current":"shelter"},"156,143":{"habitat":"creek","current":"shelter"},"157,143":{"habitat":"creek","current":"shelter"},"159,143":{"habitat":"creek","current":"shelter"},"160,143":{"habitat":"creek","current":"shelter"},"161,143":{"habitat":"creek","current":"shelter"},"162,143":{"habitat":"creek","current":"shelter"},"163,143":{"habitat":"creek","current":"shelter"},"164,143":{"habitat":"creek","current":"shelter"},"165,143":{"habitat":"creek","current":"shelter"},"167,143":{"habitat":"creek","current":"shelter"},"168,143":{"habitat":"creek","current":"shelter"},"169,143":{"habitat":"creek","current":"shelter"},"170,143":{"habitat":"creek","current":"eddy"},"171,143":{"habitat":"creek","current":"eddy"},"172,143":{"habitat":"creek","current":"eddy"},"173,143":{"habitat":"creek","current":"eddy"},"174,143":{"habitat":"creek","current":"eddy"},"176,143":{"habitat":"creek","current":"eddy"},"177,143":{"habitat":"creek","current":"eddy"},"178,143":{"habitat":"creek","current":"eddy"},"205,143":{"habitat":"creek","current":"shelter"},"207,143":{"habitat":"headwater","current":"shelter"},"209,143":{"habitat":"headwater","current":"shelter"},"211,143":{"habitat":"headwater","current":"shelter"},"212,143":{"habitat":"headwater","current":"shelter"},"213,143":{"habitat":"headwater","current":"shelter"},"214,143":{"habitat":"headwater","current":"shelter"},"215,143":{"habitat":"headwater","current":"shelter"},"216,143":{"habitat":"headwater","current":"shelter"},"217,143":{"habitat":"headwater","current":"shelter"},"218,143":{"habitat":"headwater","current":"shelter"},"219,143":{"habitat":"headwater","current":"shelter"},"220,143":{"habitat":"headwater","current":"shelter"},"221,143":{"habitat":"headwater","current":"shelter"},"222,143":{"habitat":"headwater","current":"shelter"},"145,144":{"habitat":"creek","current":"shelter"},"146,144":{"habitat":"creek","current":"shelter"},"147,144":{"habitat":"creek","current":"shelter"},"148,144":{"habitat":"creek","current":"shelter"},"150,144":{"habitat":"creek","current":"shelter"},"152,144":{"habitat":"creek","current":"shelter"},"153,144":{"habitat":"creek","current":"shelter"},"154,144":{"habitat":"creek","current":"shelter"},"155,144":{"habitat":"creek","current":"shelter"},"156,144":{"habitat":"creek","current":"shelter"},"157,144":{"habitat":"creek","current":"shelter"},"158,144":{"habitat":"creek","current":"shelter"},"159,144":{"habitat":"creek","current":"shelter"},"160,144":{"habitat":"creek","current":"shelter"},"163,144":{"habitat":"creek","current":"shelter"},"164,144":{"habitat":"creek","current":"shelter"},"165,144":{"habitat":"creek","current":"shelter"},"166,144":{"habitat":"creek","current":"shelter"},"167,144":{"habitat":"creek","current":"shelter"},"168,144":{"habitat":"creek","current":"shelter"},"169,144":{"habitat":"creek","current":"shelter"},"170,144":{"habitat":"creek","current":"eddy"},"171,144":{"habitat":"creek","current":"eddy"},"173,144":{"habitat":"creek","current":"eddy"},"174,144":{"habitat":"creek","current":"eddy"},"175,144":{"habitat":"creek","current":"eddy"},"176,144":{"habitat":"creek","current":"eddy"},"217,144":{"habitat":"headwater","current":"shelter"},"218,144":{"habitat":"headwater","current":"shelter"},"219,144":{"habitat":"headwater","current":"shelter"},"220,144":{"habitat":"headwater","current":"shelter"},"221,144":{"habitat":"headwater","current":"shelter"},"222,144":{"habitat":"headwater","current":"shelter"},"223,144":{"habitat":"headwater","current":"shelter"},"224,144":{"habitat":"headwater","current":"shelter"},"225,144":{"habitat":"headwater","current":"shelter"},"226,144":{"habitat":"headwater","current":"shelter"},"146,145":{"habitat":"creek","current":"shelter"},"147,145":{"habitat":"creek","current":"shelter"},"148,145":{"habitat":"creek","current":"shelter"},"149,145":{"habitat":"creek","current":"shelter"},"150,145":{"habitat":"creek","current":"shelter"},"151,145":{"habitat":"creek","current":"shelter"},"152,145":{"habitat":"creek","current":"shelter"},"153,145":{"habitat":"creek","current":"shelter"},"167,145":{"habitat":"creek","current":"shelter"},"169,145":{"habitat":"creek","current":"shelter"},"170,145":{"habitat":"creek","current":"eddy"},"171,145":{"habitat":"creek","current":"eddy"},"172,145":{"habitat":"creek","current":"eddy"},"173,145":{"habitat":"creek","current":"eddy"},"174,145":{"habitat":"creek","current":"eddy"},"220,145":{"habitat":"headwater","current":"shelter"},"221,145":{"habitat":"headwater","current":"shelter"},"223,145":{"habitat":"headwater","current":"shelter"},"225,145":{"habitat":"headwater","current":"shelter"},"226,145":{"habitat":"headwater","current":"shelter"},"227,145":{"habitat":"pool","current":"eddy"},"235,145":{"habitat":"pool","current":"eddy"},"146,146":{"habitat":"creek","current":"shelter"},"223,146":{"habitat":"headwater","current":"shelter"},"224,146":{"habitat":"headwater","current":"shelter"},"225,146":{"habitat":"headwater","current":"shelter"},"226,146":{"habitat":"pool","current":"eddy"},"227,146":{"habitat":"pool","current":"eddy"},"228,146":{"habitat":"pool","current":"eddy"},"234,146":{"habitat":"pool","current":"eddy"},"235,146":{"habitat":"pool","current":"eddy"},"226,147":{"habitat":"pool","current":"eddy"},"227,147":{"habitat":"pool","current":"eddy"},"228,147":{"habitat":"pool","current":"eddy"},"229,147":{"habitat":"pool","current":"eddy"},"230,147":{"habitat":"pool","current":"eddy"},"231,147":{"habitat":"pool","current":"eddy"},"232,147":{"habitat":"pool","current":"eddy"},"234,147":{"habitat":"pool","current":"eddy"},"235,147":{"habitat":"pool","current":"eddy"},"227,148":{"habitat":"pool","current":"eddy"},"228,148":{"habitat":"pool","current":"eddy"},"229,148":{"habitat":"pool","current":"eddy"},"230,148":{"habitat":"pool","current":"eddy"},"231,148":{"habitat":"pool","current":"eddy"},"232,148":{"habitat":"pool","current":"eddy"},"233,148":{"habitat":"pool","current":"eddy"},"234,148":{"habitat":"pool","current":"eddy"},"235,148":{"habitat":"pool","current":"eddy"},"229,149":{"habitat":"pool","current":"eddy"},"230,149":{"habitat":"pool","current":"eddy"},"231,149":{"habitat":"pool","current":"eddy"},"233,149":{"habitat":"pool","current":"eddy"},"21,249":{"habitat":"pool","current":"eddy"},"19,250":{"habitat":"pool","current":"eddy"},"21,250":{"habitat":"pool","current":"eddy"},"23,250":{"habitat":"pool","current":"eddy"},"35,250":{"habitat":"headwater","current":"shelter"},"69,250":{"habitat":"headwater","current":"shelter"},"19,251":{"habitat":"pool","current":"eddy"},"20,251":{"habitat":"pool","current":"eddy"},"21,251":{"habitat":"pool","current":"eddy"},"22,251":{"habitat":"pool","current":"eddy"},"23,251":{"habitat":"pool","current":"eddy"},"30,251":{"habitat":"headwater","current":"shelter"},"31,251":{"habitat":"headwater","current":"run"},"35,251":{"habitat":"headwater","current":"shelter"},"37,251":{"habitat":"headwater","current":"shelter"},"62,251":{"habitat":"headwater","current":"shelter"},"63,251":{"habitat":"headwater","current":"shelter"},"64,251":{"habitat":"headwater","current":"shelter"},"65,251":{"habitat":"headwater","current":"shelter"},"67,251":{"habitat":"headwater","current":"shelter"},"68,251":{"habitat":"headwater","current":"shelter"},"69,251":{"habitat":"headwater","current":"shelter"},"70,251":{"habitat":"headwater","current":"shelter"},"7,252":{"habitat":"headwater","current":"shelter"},"18,252":{"habitat":"pool","current":"eddy"},"20,252":{"habitat":"pool","current":"eddy"},"22,252":{"habitat":"pool","current":"eddy"},"23,252":{"habitat":"pool","current":"eddy"},"24,252":{"habitat":"pool","current":"eddy"},"28,252":{"habitat":"headwater","current":"run"},"29,252":{"habitat":"headwater","current":"run"},"31,252":{"habitat":"headwater","current":"shelter"},"35,252":{"habitat":"headwater","current":"shelter"},"36,252":{"habitat":"headwater","current":"shelter"},"37,252":{"habitat":"headwater","current":"run"},"56,252":{"habitat":"headwater","current":"shelter"},"57,252":{"habitat":"headwater","current":"shelter"},"58,252":{"habitat":"headwater","current":"shelter"},"59,252":{"habitat":"headwater","current":"shelter"},"60,252":{"habitat":"headwater","current":"shelter"},"61,252":{"habitat":"headwater","current":"shelter"},"62,252":{"habitat":"headwater","current":"shelter"},"63,252":{"habitat":"headwater","current":"shelter"},"64,252":{"habitat":"headwater","current":"shelter"},"65,252":{"habitat":"headwater","current":"shelter"},"66,252":{"habitat":"headwater","current":"shelter"},"67,252":{"habitat":"headwater","current":"shelter"},"68,252":{"habitat":"headwater","current":"shelter"},"69,252":{"habitat":"headwater","current":"shelter"},"70,252":{"habitat":"headwater","current":"shelter"},"6,253":{"habitat":"headwater","current":"shelter"},"7,253":{"habitat":"headwater","current":"shelter"},"8,253":{"habitat":"headwater","current":"shelter"},"9,253":{"habitat":"headwater","current":"shelter"},"11,253":{"habitat":"headwater","current":"shelter"},"17,253":{"habitat":"headwater","current":"shelter"},"18,253":{"habitat":"pool","current":"eddy"},"19,253":{"habitat":"pool","current":"eddy"},"20,253":{"habitat":"pool","current":"eddy"},"22,253":{"habitat":"pool","current":"eddy"},"24,253":{"habitat":"pool","current":"eddy"},"29,253":{"habitat":"headwater","current":"run"},"30,253":{"habitat":"headwater","current":"run"},"31,253":{"habitat":"headwater","current":"run"},"36,253":{"habitat":"headwater","current":"run"},"38,253":{"habitat":"headwater","current":"run"},"51,253":{"habitat":"headwater","current":"shelter"},"56,253":{"habitat":"headwater","current":"shelter"},"57,253":{"habitat":"headwater","current":"shelter"},"58,253":{"habitat":"headwater","current":"shelter"},"59,253":{"habitat":"headwater","current":"shelter"},"60,253":{"habitat":"headwater","current":"shelter"},"61,253":{"habitat":"headwater","current":"shelter"},"62,253":{"habitat":"headwater","current":"shelter"},"63,253":{"habitat":"headwater","current":"shelter"},"64,253":{"habitat":"headwater","current":"shelter"},"65,253":{"habitat":"headwater","current":"shelter"},"66,253":{"habitat":"headwater","current":"shelter"},"67,253":{"habitat":"headwater","current":"shelter"},"68,253":{"habitat":"headwater","current":"shelter"},"70,253":{"habitat":"headwater","current":"shelter"},"5,254":{"habitat":"headwater","current":"run"},"6,254":{"habitat":"headwater","current":"shelter"},"7,254":{"habitat":"headwater","current":"shelter"},"8,254":{"habitat":"headwater","current":"shelter"},"9,254":{"habitat":"headwater","current":"run"},"11,254":{"habitat":"headwater","current":"run"},"12,254":{"habitat":"headwater","current":"shelter"},"16,254":{"habitat":"headwater","current":"shelter"},"18,254":{"habitat":"pool","current":"eddy"},"20,254":{"habitat":"pool","current":"eddy"},"22,254":{"habitat":"pool","current":"eddy"},"23,254":{"habitat":"pool","current":"eddy"},"24,254":{"habitat":"pool","current":"eddy"},"27,254":{"habitat":"headwater","current":"run"},"28,254":{"habitat":"headwater","current":"run"},"29,254":{"habitat":"headwater","current":"run"},"36,254":{"habitat":"headwater","current":"run"},"37,254":{"habitat":"headwater","current":"run"},"38,254":{"habitat":"headwater","current":"run"},"52,254":{"habitat":"headwater","current":"shelter"},"56,254":{"habitat":"headwater","current":"shelter"},"57,254":{"habitat":"headwater","current":"shelter"},"58,254":{"habitat":"headwater","current":"shelter"},"59,254":{"habitat":"headwater","current":"shelter"},"60,254":{"habitat":"headwater","current":"shelter"},"61,254":{"habitat":"headwater","current":"shelter"},"70,254":{"habitat":"headwater","current":"run"},"4,255":{"habitat":"headwater","current":"run"},"5,255":{"habitat":"headwater","current":"run"},"6,255":{"habitat":"headwater","current":"run"},"8,255":{"habitat":"headwater","current":"run"},"9,255":{"habitat":"headwater","current":"shelter"},"10,255":{"habitat":"headwater","current":"shelter"},"12,255":{"habitat":"headwater","current":"shelter"},"16,255":{"habitat":"headwater","current":"shelter"},"19,255":{"habitat":"pool","current":"eddy"},"20,255":{"habitat":"pool","current":"eddy"},"21,255":{"habitat":"pool","current":"eddy"},"22,255":{"habitat":"pool","current":"eddy"},"23,255":{"habitat":"pool","current":"eddy"},"29,255":{"habitat":"headwater","current":"shelter"},"30,255":{"habitat":"headwater","current":"shelter"},"31,255":{"habitat":"headwater","current":"shelter"},"34,255":{"habitat":"headwater","current":"shelter"},"35,255":{"habitat":"headwater","current":"shelter"},"36,255":{"habitat":"headwater","current":"shelter"},"37,255":{"habitat":"headwater","current":"run"},"50,255":{"habitat":"headwater","current":"shelter"},"51,255":{"habitat":"headwater","current":"shelter"},"52,255":{"habitat":"headwater","current":"shelter"},"70,255":{"habitat":"headwater","current":"shelter"},"4,256":{"habitat":"headwater","current":"shelter"},"5,256":{"habitat":"headwater","current":"shelter"},"6,256":{"habitat":"headwater","current":"shelter"},"8,256":{"habitat":"headwater","current":"run"},"10,256":{"habitat":"headwater","current":"shelter"},"11,256":{"habitat":"headwater","current":"shelter"},"12,256":{"habitat":"headwater","current":"run"},"16,256":{"habitat":"headwater","current":"run"},"17,256":{"habitat":"headwater","current":"shelter"},"19,256":{"habitat":"pool","current":"eddy"},"21,256":{"habitat":"pool","current":"eddy"},"23,256":{"habitat":"pool","current":"eddy"},"28,256":{"habitat":"headwater","current":"shelter"},"29,256":{"habitat":"headwater","current":"shelter"},"31,256":{"habitat":"headwater","current":"shelter"},"34,256":{"habitat":"headwater","current":"shelter"},"36,256":{"habitat":"headwater","current":"shelter"},"50,256":{"habitat":"headwater","current":"run"},"52,256":{"habitat":"headwater","current":"run"},"63,256":{"habitat":"headwater","current":"shelter"},"64,256":{"habitat":"headwater","current":"shelter"},"65,256":{"habitat":"headwater","current":"shelter"},"66,256":{"habitat":"headwater","current":"shelter"},"67,256":{"habitat":"headwater","current":"shelter"},"68,256":{"habitat":"headwater","current":"shelter"},"69,256":{"habitat":"headwater","current":"shelter"},"70,256":{"habitat":"headwater","current":"shelter"},"6,257":{"habitat":"headwater","current":"shelter"},"7,257":{"habitat":"headwater","current":"shelter"},"8,257":{"habitat":"headwater","current":"shelter"},"9,257":{"habitat":"headwater","current":"run"},"11,257":{"habitat":"headwater","current":"shelter"},"12,257":{"habitat":"headwater","current":"shelter"},"13,257":{"habitat":"headwater","current":"shelter"},"21,257":{"habitat":"pool","current":"eddy"},"30,257":{"habitat":"headwater","current":"shelter"},"31,257":{"habitat":"headwater","current":"shelter"},"34,257":{"habitat":"headwater","current":"shelter"},"35,257":{"habitat":"headwater","current":"shelter"},"51,257":{"habitat":"headwater","current":"run"},"52,257":{"habitat":"headwater","current":"shelter"},"56,257":{"habitat":"headwater","current":"shelter"},"57,257":{"habitat":"headwater","current":"shelter"},"58,257":{"habitat":"headwater","current":"shelter"},"59,257":{"habitat":"headwater","current":"shelter"},"60,257":{"habitat":"headwater","current":"shelter"},"61,257":{"habitat":"headwater","current":"shelter"},"62,257":{"habitat":"headwater","current":"shelter"},"63,257":{"habitat":"headwater","current":"shelter"},"64,257":{"habitat":"headwater","current":"shelter"},"65,257":{"habitat":"headwater","current":"shelter"},"67,257":{"habitat":"headwater","current":"shelter"},"68,257":{"habitat":"headwater","current":"shelter"},"69,257":{"habitat":"headwater","current":"shelter"},"70,257":{"habitat":"headwater","current":"shelter"},"5,258":{"habitat":"headwater","current":"shelter"},"7,258":{"habitat":"headwater","current":"shelter"},"9,258":{"habitat":"headwater","current":"shelter"},"10,258":{"habitat":"headwater","current":"shelter"},"11,258":{"habitat":"headwater","current":"shelter"},"12,258":{"habitat":"headwater","current":"shelter"},"13,258":{"habitat":"headwater","current":"shelter"},"56,258":{"habitat":"headwater","current":"shelter"},"57,258":{"habitat":"headwater","current":"shelter"},"58,258":{"habitat":"headwater","current":"shelter"},"59,258":{"habitat":"headwater","current":"shelter"},"60,258":{"habitat":"headwater","current":"shelter"},"61,258":{"habitat":"headwater","current":"shelter"},"62,258":{"habitat":"headwater","current":"shelter"},"63,258":{"habitat":"headwater","current":"shelter"},"65,258":{"habitat":"headwater","current":"shelter"},"66,258":{"habitat":"headwater","current":"shelter"},"67,258":{"habitat":"headwater","current":"shelter"},"68,258":{"habitat":"headwater","current":"shelter"},"69,258":{"habitat":"headwater","current":"shelter"},"7,259":{"habitat":"headwater","current":"shelter"},"11,259":{"habitat":"headwater","current":"shelter"},"12,259":{"habitat":"headwater","current":"shelter"},"13,259":{"habitat":"headwater","current":"shelter"},"56,259":{"habitat":"headwater","current":"shelter"},"57,259":{"habitat":"headwater","current":"shelter"},"58,259":{"habitat":"headwater","current":"shelter"},"59,259":{"habitat":"headwater","current":"shelter"},"60,259":{"habitat":"headwater","current":"shelter"},"61,259":{"habitat":"headwater","current":"shelter"},"62,259":{"habitat":"headwater","current":"shelter"}}
  }$town$::jsonb),
  ('forest', $town${
    "kinds": {"sticks":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"twig","weight":60,"n":[1,2]},{"item":"pineCone","weight":25,"n":[1,2]},{"item":"feather","weight":8,"n":[1,1]},{"item":"resin","weight":7,"n":[1,1],"zones":["woods","deep"]}]},"leaves":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"leafMould","weight":75,"n":[1,2]},{"item":"vine","weight":25,"n":[1,2],"zones":["woods","deep","bamboo"]}]},"flowers":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"wildflower","weight":100,"n":[1,2]},{"item":"fourLeafClover","weight":2,"n":[1,1],"zones":["edge"]},{"item":"wildOrchid","weight":40,"n":[1,1],"zones":["deep","bamboo"],"day":0.25},{"item":"moonflower","weight":400,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"moon":true},{"item":"queenPollen","weight":5,"n":[1,1],"zones":["edge"],"hours":[[0,3],[23,24]],"quiet":true}]},"bamboo":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"bambooCane","weight":1,"n":[1,2]}]},"clay":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"clay","weight":1,"n":[1,3]}]},"mushrooms":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"shiitake","weight":60,"n":[1,2]},{"item":"chanterelle","weight":50,"n":[1,2],"rain":6},{"item":"porcini","weight":35,"n":[1,2],"rain":6,"zones":["deep"]},{"item":"glowMushroom","weight":80,"n":[1,2],"zones":["deep"],"hours":[[19,24],[0,5]]},{"item":"mistMushroom","weight":3,"n":[1,1],"zones":["woods","deep"],"hours":[[3,5]],"quiet":true}]},"greens":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"fiddlehead","weight":100,"n":[1,2],"zones":["stream"]},{"item":"mint","weight":60,"n":[1,2],"zones":["edge","stream"]},{"item":"rosemary","weight":100,"n":[1,2],"zones":["rise"]},{"item":"chamomile","weight":60,"n":[1,2],"zones":["edge"],"hours":[[5,12]]},{"item":"lavender","weight":50,"n":[1,2],"zones":["edge"]}]},"berries":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"blueberry","weight":100,"n":[2,3],"zones":["edge","woods"]},{"item":"raspberry","weight":100,"n":[2,3],"zones":["woods","rise"]},{"item":"wildStrawberry","weight":40,"n":[1,2],"zones":["edge"]}]},"nook":{"how":"pick","every":120,"chance":0.5,"shares":2,"cost":1,"finds":[{"item":"silkCocoon","weight":40,"n":[1,1],"zones":["bamboo","woods"]},{"item":"feather","weight":20,"n":[1,2]}]},"mound":{"how":"dig","every":30,"chance":0.6,"shares":2,"cost":3,"finds":[{"item":"bambooShoot","weight":100,"n":[1,2],"zones":["bamboo"],"hours":[[4,12]]},{"item":"wildYam","weight":60,"n":[1,2],"zones":["woods","rise","edge","deep"]},{"item":"worm","weight":50,"n":[1,3]},{"item":"truffle","weight":40,"n":[1,1],"zones":["deep"],"day":0.25},{"item":"ginseng","weight":3,"n":[1,1],"zones":["deep"]},{"item":"amber","weight":3,"n":[1,1],"zones":["rise"]},{"item":"mandrake","weight":2,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"rain":2}]},"fruit":{"how":"shake","every":60,"chance":0.7,"shares":3,"cost":2,"finds":[{"item":"wildApple","weight":100,"n":[2,3],"zones":["edge"]},{"item":"chestnut","weight":100,"n":[1,3],"zones":["woods","deep","rise","stream","bamboo"]}]},"glint":{"how":"pick","every":720,"chance":1,"shares":5,"cost":1,"finds":[{"item":"starShard","weight":1,"n":[1,1],"hours":[[19,24],[0,5]],"day":0.2}]}},
    "spots": [["fruit",153,184,"edge"],["fruit",157,186,"edge"],["fruit",173,175,"edge"],["fruit",183,184,"edge"],["fruit",198,179,"edge"],["fruit",181,186,"edge"],["fruit",218,183,"edge"],["fruit",207,124,"deep"],["fruit",182,140,"woods"],["fruit",186,156,"woods"],["fruit",233,125,"deep"],["fruit",177,118,"deep"],["fruit",172,134,"deep"],["fruit",184,121,"deep"],["sticks",176,147,"woods"],["sticks",221,160,"rise"],["sticks",196,143,"woods"],["sticks",169,132,"deep"],["sticks",177,124,"deep"],["sticks",162,131,"deep"],["sticks",155,129,"deep"],["sticks",175,130,"deep"],["sticks",229,121,"deep"],["sticks",180,121,"deep"],["sticks",216,163,"rise"],["sticks",183,125,"deep"],["sticks",232,115,"deep"],["sticks",226,134,"deep"],["sticks",219,167,"rise"],["sticks",217,146,"rise"],["sticks",173,153,"bamboo"],["sticks",163,157,"bamboo"],["sticks",198,126,"deep"],["sticks",177,172,"woods"],["sticks",168,122,"deep"],["sticks",211,171,"rise"],["sticks",168,146,"bamboo"],["sticks",187,142,"woods"],["sticks",226,127,"deep"],["sticks",154,150,"bamboo"],["sticks",202,147,"woods"],["sticks",212,148,"rise"],["sticks",217,136,"stream"],["sticks",165,145,"bamboo"],["leaves",212,127,"deep"],["leaves",155,157,"bamboo"],["leaves",196,124,"deep"],["leaves",151,150,"bamboo"],["leaves",214,124,"deep"],["leaves",189,124,"deep"],["leaves",152,114,"deep"],["leaves",186,151,"woods"],["leaves",176,167,"woods"],["leaves",160,167,"bamboo"],["leaves",186,163,"woods"],["leaves",148,151,"bamboo"],["leaves",154,161,"bamboo"],["leaves",202,124,"deep"],["leaves",190,148,"woods"],["leaves",159,170,"bamboo"],["leaves",209,127,"deep"],["leaves",220,129,"deep"],["leaves",176,158,"woods"],["leaves",176,155,"woods"],["leaves",188,114,"deep"],["leaves",196,174,"woods"],["leaves",196,164,"woods"],["leaves",197,115,"deep"],["flowers",148,177,"edge"],["flowers",162,180,"edge"],["flowers",185,177,"edge"],["flowers",189,183,"edge"],["flowers",169,178,"edge"],["flowers",214,184,"edge"],["flowers",227,182,"edge"],["flowers",224,176,"edge"],["flowers",178,177,"edge"],["flowers",223,181,"edge"],["flowers",156,181,"edge"],["flowers",181,180,"edge"],["flowers",196,154,"camp"],["flowers",190,161,"camp"],["flowers",220,122,"deep"],["flowers",191,164,"camp"],["flowers",155,169,"bamboo"],["flowers",191,153,"camp"],["flowers",188,159,"camp"],["bamboo",157,155,"bamboo"],["bamboo",148,166,"bamboo"],["bamboo",160,152,"bamboo"],["bamboo",157,162,"bamboo"],["bamboo",165,169,"bamboo"],["bamboo",146,149,"bamboo"],["bamboo",152,168,"bamboo"],["bamboo",167,149,"bamboo"],["bamboo",155,164,"bamboo"],["bamboo",158,173,"bamboo"],["clay",231,147,"stream"],["clay",220,143,"stream"],["clay",194,137,"stream"],["clay",188,136,"stream"],["clay",226,141,"stream"],["clay",220,139,"stream"],["clay",161,140,"stream"],["clay",166,142,"stream"],["mushrooms",207,147,"woods"],["mushrooms",179,147,"woods"],["mushrooms",206,170,"woods"],["mushrooms",186,173,"woods"],["mushrooms",193,169,"woods"],["mushrooms",209,152,"woods"],["mushrooms",196,150,"woods"],["mushrooms",200,175,"woods"],["mushrooms",183,154,"woods"],["mushrooms",167,128,"deep"],["mushrooms",149,122,"deep"],["mushrooms",184,116,"deep"],["mushrooms",210,120,"deep"],["mushrooms",153,133,"deep"],["mushrooms",203,117,"deep"],["mushrooms",174,123,"deep"],["mushrooms",159,116,"deep"],["mushrooms",210,131,"deep"],["mushrooms",159,120,"deep"],["mushrooms",234,118,"deep"],["mushrooms",164,116,"deep"],["mushrooms",224,132,"deep"],["mushrooms",226,137,"deep"],["mushrooms",147,125,"deep"],["mushrooms",195,131,"deep"],["mushrooms",227,119,"deep"],["greens",176,180,"edge"],["greens",164,182,"edge"],["greens",228,177,"edge"],["greens",200,182,"edge"],["greens",188,178,"edge"],["greens",231,183,"edge"],["greens",172,179,"edge"],["greens",163,176,"edge"],["greens",197,135,"stream"],["greens",173,144,"stream"],["greens",157,144,"stream"],["greens",177,141,"stream"],["greens",235,147,"stream"],["greens",148,144,"stream"],["greens",183,131,"stream"],["greens",204,137,"stream"],["greens",237,167,"rise"],["greens",237,158,"rise"],["greens",211,161,"rise"],["greens",220,154,"rise"],["greens",235,172,"rise"],["greens",229,154,"rise"],["berries",154,179,"edge"],["berries",168,182,"edge"],["berries",208,177,"edge"],["berries",150,183,"edge"],["berries",207,181,"edge"],["berries",211,175,"edge"],["berries",194,184,"edge"],["berries",179,166,"woods"],["berries",198,168,"woods"],["berries",204,143,"woods"],["berries",180,157,"woods"],["berries",185,167,"woods"],["berries",188,169,"woods"],["berries",223,166,"rise"],["berries",224,156,"rise"],["berries",237,153,"rise"],["berries",210,144,"rise"],["berries",235,175,"rise"],["nook",219,177,"edge"],["nook",148,160,"bamboo"],["nook",148,147,"bamboo"],["nook",202,169,"woods"],["nook",172,168,"bamboo"],["nook",204,153,"woods"],["nook",160,183,"edge"],["nook",150,162,"bamboo"],["nook",160,158,"bamboo"],["nook",163,171,"bamboo"],["mound",166,161,"bamboo"],["mound",159,146,"bamboo"],["mound",152,171,"bamboo"],["mound",157,150,"bamboo"],["mound",172,163,"bamboo"],["mound",161,163,"bamboo"],["mound",163,148,"bamboo"],["mound",169,166,"bamboo"],["mound",201,156,"woods"],["mound",203,150,"woods"],["mound",183,149,"woods"],["mound",217,160,"rise"],["mound",152,176,"edge"],["mound",233,163,"rise"],["mound",182,177,"edge"],["mound",211,183,"edge"],["mound",223,135,"deep"],["mound",154,118,"deep"],["mound",236,127,"deep"],["mound",151,118,"deep"],["mound",170,127,"deep"],["mound",208,116,"deep"],["mound",199,121,"deep"],["mound",175,115,"deep"],["glint",217,122,"deep"],["glint",219,119,"deep"],["glint",193,120,"deep"],["glint",189,118,"deep"],["glint",193,123,"deep"]],
    "reach": 1,
    "decoy": "toadstool",
    "decoys": 2,
    "hoes": ["hoe","hoeIron","hoeSteel"],
    "misses": 30,
    "quiet": {"none":100},
    "squirrel": 2,
    "stag": 2,
    "secret": {"kinds":{"ring":{"how":"choose","then":"dig","every":240,"chance":0.5,"shares":3,"cost":4,"finds":[{"item":"porcini","weight":40,"n":[2,3]},{"item":"truffle","weight":30,"n":[1,2]},{"item":"ginseng","weight":14,"n":[1,1]},{"item":"glowMushroom","weight":50,"n":[2,3],"hours":[[19,24],[0,5]]},{"item":"mandrake","weight":6,"n":[1,1],"hours":[[19,24],[0,5]]}]},"bough":{"how":"shake","then":"choose","every":240,"chance":0.5,"shares":3,"cost":4,"finds":[{"item":"silkCocoon","weight":40,"n":[1,2]},{"item":"wildOrchid","weight":30,"n":[1,2]},{"item":"amber","weight":10,"n":[1,1]},{"item":"starShard","weight":8,"n":[1,1],"hours":[[19,24],[0,5]]},{"item":"moonflower","weight":60,"n":[1,1],"hours":[[19,24],[0,5]],"moon":true}]}},"spots":[["bough",221,133,"deep"],["bough",156,125,"deep"],["bough",160,136,"deep"],["ring",173,127,"deep"],["ring",189,128,"deep"],["ring",168,117,"deep"]]},
    "hunt": {"sites":[[232,151],[148,129],[205,174],[193,147],[229,151],[177,121],[230,159],[180,152],[172,183],[214,136],[181,129],[226,153],[196,139],[216,181],[187,122],[211,124],[199,159],[153,123],[217,172],[196,170],[201,153],[165,174],[184,145],[231,130],[168,138],[233,180],[173,150],[216,130],[230,173],[164,163],[204,127],[167,134],[157,135],[154,145],[227,158],[223,149],[204,183],[191,179],[152,158],[175,161],[191,143],[149,173],[147,135],[206,132],[218,133],[218,150],[217,157],[185,180],[201,164],[223,139],[230,163],[148,185],[148,139],[170,152],[227,164],[169,162],[179,169],[177,132],[192,150],[236,122],[205,177],[200,144],[204,114],[205,120],[183,158],[198,118],[172,117],[215,117],[233,121],[146,153],[187,145],[235,165],[153,155],[235,115],[226,171],[163,167],[156,121],[148,169],[234,156],[213,180],[165,178],[217,175],[208,163],[228,125],[147,117],[166,157],[228,132],[200,129],[229,117],[182,173],[207,154],[199,141],[194,116],[146,157],[157,166],[213,133],[223,146],[213,114],[220,147],[160,176],[151,127],[209,149],[155,115],[214,146],[161,123],[190,132],[202,172],[223,128],[213,143],[229,169],[205,162],[224,122],[164,120],[174,171],[195,179],[215,154],[188,153],[235,132],[192,139],[152,181],[219,126],[237,150],[197,146],[199,133],[178,129],[206,158],[220,136],[201,119],[154,136],[224,119],[223,116],[151,131],[209,166],[179,114],[182,166],[210,134],[164,136],[222,174],[150,136],[207,137],[160,149],[170,114],[228,129],[228,114],[171,173],[182,163],[155,176],[234,168],[204,167],[161,114],[220,180],[172,157],[172,131],[212,154],[223,170],[235,161],[212,166],[162,128],[213,177],[231,176],[226,150],[219,114],[197,129],[214,174],[212,158],[159,132],[168,169],[223,125],[224,161],[237,170],[174,165],[201,179],[237,119],[176,183],[236,181],[186,139],[147,182],[146,121],[207,129],[213,151]],"off":5,"radius":8,"bands":[0,1,3,6,10],"rare":0.5,"pair":100,"rares":[["wildOrchid",0.25],["truffle",0.25],["starShard",0.2]],"scrolls":["scrollReedFishCongee","scrollSandbankSkillet","scrollSpringFishCongee","scrollBluefinMountainPan","scrollLilyPoolCongee","scrollDuskFishSkillet","scrollPineNutRice","scrollPineNutCake","scrollSapGlazedFish","scrollNectarRice","scrollHoneyHerbTea","scrollPollenCake","scrollFernRice","scrollPetalBiscuit","scrollSporeNoodles","scrollSpringRice","scrollMintBroth","scrollPollenRice","scrollLotusGardenSoup","scrollMinerRice","scrollCaveStew","scrollSaltRoast","scrollSeamCake","scrollSmokedBrookBowl","scrollTorrentSkewer","scrollSpringDumpling","scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea","scrollTruffleEggs","scrollMushroomOmelette"]}
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar","honeyBee","carpenterBee","lacewing","hoverfly","silkMoth","goldenAnt","orchardBeetle","pollenMidge","megaloptaBee","ghostMantis","railroadWorm","indianNightBee","snakefly","earwig","masonBee","tigerBeetle","roseChafer","woolCarderBee","oilBeetle","assassinBug","blueBandedBee","robberFly","superworm","clearwingMoth","antlion","bessBeetle","yuccaMoth","roveBeetle","cucujoBeetle","tobaccoHawkmoth","blueGhostFirefly","californiaGlowworm"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":50,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]},"honeyBee":{"habit":"path","at":["blooms","field"],"hours":[[6,17]],"dry":true,"weight":8,"n":[1,1],"cost":3},"carpenterBee":{"habit":"behind","at":["tree","glade"],"hours":[[8,17]],"dry":true,"weight":5,"n":[1,1],"cost":5},"lacewing":{"habit":"lamp","at":["lamp","blooms"],"hours":[[18,24],[0,5]],"weight":8,"n":[1,1],"cost":4},"hoverfly":{"habit":"spot","at":["blooms","field"],"hours":[[7,18]],"dry":true,"weight":8,"n":[1,1],"cost":4},"silkMoth":{"habit":"lamp","at":["tree","lamp"],"hours":[[19,24],[0,4]],"day":0.5,"weight":4,"n":[1,1],"cost":6},"goldenAnt":{"habit":"crawl","at":["litter","field"],"hours":[[6,19]],"weight":8,"n":[1,2],"cost":5},"orchardBeetle":{"habit":"lure","at":["tree","glade"],"hours":[[6,18]],"weight":5,"n":[1,1],"cost":6},"pollenMidge":{"habit":"spot","at":["blooms","water"],"hours":[[5,10],[16,19]],"dry":true,"weight":6,"n":[1,2],"cost":6},"megaloptaBee":{"habit":"path","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"zones":["edge"],"hours":[[3,7]],"peak":[[3,5]]},"ghostMantis":{"habit":"look","at":["leaves"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"hours":[[3,5]]},"railroadWorm":{"habit":"look","at":["logs"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"hours":[[3,5]]},"indianNightBee":{"habit":"spot","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"zones":["edge"],"hours":[[5,7]]},"snakefly":{"habit":"behind","at":["bark"],"weight":6,"n":[1,1],"cost":3,"places":["forest"],"hours":[[5,11]],"peak":[[5,7]]},"earwig":{"habit":"look","at":["duff"],"weight":60,"n":[1,1],"cost":1,"places":["farm"],"hours":[[5,7]]},"masonBee":{"habit":"path","at":["petals"],"weight":60,"n":[1,1],"cost":1,"places":["town"],"hours":[[7,13]],"peak":[[7,11]]},"tigerBeetle":{"habit":"crawl","at":["sand"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"hours":[[7,11]]},"roseChafer":{"habit":"crawl","at":["duff"],"weight":60,"n":[1,1],"cost":1,"places":["farm"],"hours":[[7,11]]},"woolCarderBee":{"habit":"spot","at":["petals"],"weight":60,"n":[1,1],"cost":1,"places":["farm"],"hours":[[11,16]],"peak":[[11,13]]},"oilBeetle":{"habit":"crawl","at":["duff"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"hours":[[11,13]]},"assassinBug":{"habit":"behind","at":["leaves"],"weight":20,"n":[1,1],"cost":2,"places":["farm"],"hours":[[11,13]]},"blueBandedBee":{"habit":"path","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["town"],"hours":[[13,19]],"peak":[[13,16]]},"robberFly":{"habit":"spot","at":["posts"],"weight":60,"n":[1,1],"cost":1,"places":["farm"],"hours":[[13,16]]},"superworm":{"habit":"look","at":["logs"],"weight":60,"n":[1,1],"cost":1,"places":["forest"],"hours":[[13,16]]},"clearwingMoth":{"habit":"path","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["town"],"hours":[[16,23]],"peak":[[16,19]]},"antlion":{"habit":"look","at":["sand"],"weight":60,"n":[1,1],"cost":1,"places":["forest"],"hours":[[16,19]]},"bessBeetle":{"habit":"lure","at":["logs"],"weight":60,"n":[1,1],"cost":1,"places":["forest"],"hours":[[16,19]]},"yuccaMoth":{"habit":"spot","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["town"],"hours":[[0,3],[19,24]],"peak":[[19,23]]},"roveBeetle":{"habit":"crawl","at":["duff"],"weight":60,"n":[1,1],"cost":1,"places":["farm"],"hours":[[19,23]]},"cucujoBeetle":{"habit":"look","at":["bark"],"weight":20,"n":[1,1],"cost":2,"places":["forest"],"hours":[[19,23]]},"tobaccoHawkmoth":{"habit":"path","at":["petals"],"weight":20,"n":[1,1],"cost":2,"places":["farm"],"hours":[[0,5],[23,24]],"peak":[[0,3],[23,24]]},"blueGhostFirefly":{"habit":"look","at":["leaves"],"weight":6,"n":[1,1],"cost":3,"places":["forest"],"hours":[[0,3],[23,24]]},"californiaGlowworm":{"habit":"look","at":["duff"],"weight":60,"n":[1,1],"cost":1,"places":["forest"],"hours":[[0,3],[23,24]]}},
    "kinds": {"blooms":{"every":7,"chance":0.77,"shares":1},"water":{"every":7,"chance":0.7,"shares":1},"field":{"every":7,"chance":0.77,"shares":1},"lamp":{"every":7,"chance":0.84,"shares":1},"tree":{"every":14,"chance":0.7,"shares":1},"litter":{"every":14,"chance":0.7,"shares":1},"glade":{"every":30,"chance":0.25,"shares":1},"falls":{"every":15,"chance":0.3,"shares":1},"petals":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"leaves":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"logs":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"bark":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"duff":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"sand":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"posts":{"every":10,"chance":0.8,"shares":1,"alone":true,"none":100},"garden":{"every":30,"chance":0.25,"shares":1,"alone":true}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]],["petals","town",null,[[19.13,15.48],[20.15,15.46],[20.71,18.38],[19.18,18.24],[18.55,19.08]]],["petals","town",null,[[26.13,11.65],[27.81,11.37],[28.25,12.44],[26.34,13.72],[24.7,12.8]]],["petals","town",null,[[62.4,36.4],[63.7,37.83],[61.89,39.26],[61.76,38.19],[60.37,37.5]]],["petals","farm",null,[[166.8,29.02],[169.15,28.48],[169.9,30.45],[169.03,31.17],[168.27,30.34]]],["petals","farm",null,[[147.3,40.31],[147.65,38.54],[150.26,40.51],[148.93,41.5],[147.83,42.74]]],["petals","farm",null,[[184.8,7.56],[185.41,8.93],[186.25,11.14],[184.15,11.12],[182.76,9.75]]],["petals","forest","edge",[[150.45,177],[152.56,177.62],[151.82,178.98],[152,180.12],[150.26,179.37]]],["petals","forest","edge",[[191.29,183.93],[192.24,183.27],[195.51,183.84],[193.81,186.03],[191.47,185.69]]],["petals","forest","edge",[[185.52,183.26],[187.22,181.78],[188.65,181.86],[188.52,183.63],[186.06,184.73]]],["leaves","forest","deep",[[224.69,134.21],[225.73,133.96],[226.42,132.19],[227.92,132.84],[227.46,136.62]]],["leaves","forest","deep",[[194.6,116.25],[195.55,115.49],[197.06,114.56],[197.24,117.96],[195.95,117.42]]],["leaves","forest","woods",[[180.66,163.2],[180.32,161.55],[182.28,162.2],[182.66,163.55],[181.03,164.18]]],["leaves","farm",null,[[138.14,26.34],[139.72,26.33],[141.4,27.45],[140.58,28.8],[137.54,28.56]]],["leaves","farm",null,[[183.8,25.26],[185.85,25.85],[186.03,27.37],[184.14,27.61],[182.98,27.59]]],["logs","forest","rise",[[214.6,151.37],[215.98,151.4],[217.53,151.24],[216.92,153.05],[214.64,152.53]]],["logs","forest","deep",[[215.32,132.05],[217.09,131.04],[219.43,131.14],[218.25,132.06],[216.4,133.77]]],["logs","forest","bamboo",[[166.4,156.26],[168.21,157.46],[166.14,159.55],[165.76,158.18],[164.57,157.81]]],["bark","forest","deep",[[185.54,122.62],[188.39,122.83],[187.37,123.24],[187.1,125.74],[186.4,124.77]]],["bark","forest","edge",[[227.46,185.46],[228.39,184.87],[229.47,184.32],[229.22,185.54],[230.37,185.16]]],["bark","forest","woods",[[179.12,154.44],[179.8,153.05],[182.12,153.76],[181.1,155.54],[180.24,156.62]]],["duff","farm",null,[[154.27,16.86],[156.59,16.47],[156.01,18.42],[154.78,18.68],[153.82,17.98]]],["duff","farm",null,[[162.95,2.44],[163.87,2.84],[165.58,2.91],[164.24,5.12],[162.97,3.99]]],["duff","farm",null,[[154.74,29.21],[154.24,28.16],[155.96,28.42],[157.01,29.72],[156.94,31.03]]],["duff","forest","bamboo",[[169.83,147.63],[170.84,148.36],[171.54,150.49],[169.01,150.82],[169.17,149.83]]],["duff","forest","deep",[[150.39,120.52],[151.14,119.58],[153.78,120.49],[154.32,121.47],[152.3,122.68]]],["duff","forest","bamboo",[[173.21,158.48],[174.19,159.8],[175.38,160.68],[174.75,161.57],[173.28,161.39]]],["sand","forest","stream",[[175.54,142],[176.32,143.01],[175.56,143.9],[174.8,145.88],[173.67,143.75]]],["sand","forest","stream",[[183.36,131.91],[184.08,131.2],[185.31,130.89],[186.67,132.91],[183.4,133.14]]],["sand","forest","stream",[[219.31,142.73],[221.89,143.43],[222.43,144.32],[221.67,145.03],[219.7,144.58]]],["posts","farm",null,[[128.07,15.36],[128.61,16.5],[130.05,16.14],[129.29,17.25],[129.43,18.8]]],["posts","farm",null,[[128.33,27.3],[128.98,28.77],[130.64,28.55],[129.26,29.82],[128.37,31.27]]],["garden","farm",null,[[133.5,5.5],[135.5,5],[137.5,5.5],[138,7.5],[137.5,9.5],[135.5,10],[133.5,9.5],[133,7.5]]],["garden","farm",null,[[141.5,5.5],[143.5,5],[145.5,5.5],[146,7.5],[145.5,9.5],[143.5,10],[141.5,9.5],[141,7.5]]],["garden","farm",null,[[149.5,5.5],[151.5,5],[153.5,5.5],[154,7.5],[153.5,9.5],[151.5,10],[149.5,9.5],[149,7.5]]],["garden","farm",null,[[162.5,5.5],[164.5,5],[166.5,5.5],[167,7.5],[166.5,9.5],[164.5,10],[162.5,9.5],[162,7.5]]],["garden","farm",null,[[170.5,5.5],[172.5,5],[174.5,5.5],[175,7.5],[174.5,9.5],[172.5,10],[170.5,9.5],[170,7.5]]],["garden","farm",null,[[178.5,5.5],[180.5,5],[182.5,5.5],[183,7.5],[182.5,9.5],[180.5,10],[178.5,9.5],[178,7.5]]],["garden","farm",null,[[133.5,13.5],[135.5,13],[137.5,13.5],[138,15.5],[137.5,17.5],[135.5,18],[133.5,17.5],[133,15.5]]],["garden","farm",null,[[141.5,13.5],[143.5,13],[145.5,13.5],[146,15.5],[145.5,17.5],[143.5,18],[141.5,17.5],[141,15.5]]],["garden","farm",null,[[149.5,13.5],[151.5,13],[153.5,13.5],[154,15.5],[153.5,17.5],[151.5,18],[149.5,17.5],[149,15.5]]],["garden","farm",null,[[162.5,13.5],[164.5,13],[166.5,13.5],[167,15.5],[166.5,17.5],[164.5,18],[162.5,17.5],[162,15.5]]],["garden","farm",null,[[170.5,13.5],[172.5,13],[174.5,13.5],[175,15.5],[174.5,17.5],[172.5,18],[170.5,17.5],[170,15.5]]],["garden","farm",null,[[178.5,13.5],[180.5,13],[182.5,13.5],[183,15.5],[182.5,17.5],[180.5,18],[178.5,17.5],[178,15.5]]],["garden","farm",null,[[133.5,26.5],[135.5,26],[137.5,26.5],[138,28.5],[137.5,30.5],[135.5,31],[133.5,30.5],[133,28.5]]],["garden","farm",null,[[141.5,26.5],[143.5,26],[145.5,26.5],[146,28.5],[145.5,30.5],[143.5,31],[141.5,30.5],[141,28.5]]],["garden","farm",null,[[149.5,26.5],[151.5,26],[153.5,26.5],[154,28.5],[153.5,30.5],[151.5,31],[149.5,30.5],[149,28.5]]],["garden","farm",null,[[162.5,26.5],[164.5,26],[166.5,26.5],[167,28.5],[166.5,30.5],[164.5,31],[162.5,30.5],[162,28.5]]],["garden","farm",null,[[170.5,26.5],[172.5,26],[174.5,26.5],[175,28.5],[174.5,30.5],[172.5,31],[170.5,30.5],[170,28.5]]],["garden","farm",null,[[178.5,26.5],[180.5,26],[182.5,26.5],[183,28.5],[182.5,30.5],[180.5,31],[178.5,30.5],[178,28.5]]],["garden","farm",null,[[133.5,34.5],[135.5,34],[137.5,34.5],[138,36.5],[137.5,38.5],[135.5,39],[133.5,38.5],[133,36.5]]],["garden","farm",null,[[141.5,34.5],[143.5,34],[145.5,34.5],[146,36.5],[145.5,38.5],[143.5,39],[141.5,38.5],[141,36.5]]],["garden","farm",null,[[149.5,34.5],[151.5,34],[153.5,34.5],[154,36.5],[153.5,38.5],[151.5,39],[149.5,38.5],[149,36.5]]],["garden","farm",null,[[162.5,34.5],[164.5,34],[166.5,34.5],[167,36.5],[166.5,38.5],[164.5,39],[162.5,38.5],[162,36.5]]],["garden","farm",null,[[170.5,34.5],[172.5,34],[174.5,34.5],[175,36.5],[174.5,38.5],[172.5,39],[170.5,38.5],[170,36.5]]],["garden","farm",null,[[178.5,34.5],[180.5,34],[182.5,34.5],[183,36.5],[182.5,38.5],[180.5,39],[178.5,38.5],[178,36.5]]],["garden","farm",null,[[133.5,47.5],[135.5,47],[137.5,47.5],[138,49.5],[137.5,51.5],[135.5,52],[133.5,51.5],[133,49.5]]],["garden","farm",null,[[141.5,47.5],[143.5,47],[145.5,47.5],[146,49.5],[145.5,51.5],[143.5,52],[141.5,51.5],[141,49.5]]],["garden","farm",null,[[149.5,47.5],[151.5,47],[153.5,47.5],[154,49.5],[153.5,51.5],[151.5,52],[149.5,51.5],[149,49.5]]],["garden","farm",null,[[162.5,47.5],[164.5,47],[166.5,47.5],[167,49.5],[166.5,51.5],[164.5,52],[162.5,51.5],[162,49.5]]],["garden","farm",null,[[170.5,47.5],[172.5,47],[174.5,47.5],[175,49.5],[174.5,51.5],[172.5,52],[170.5,51.5],[170,49.5]]],["garden","farm",null,[[178.5,47.5],[180.5,47],[182.5,47.5],[183,49.5],[182.5,51.5],[180.5,52],[178.5,51.5],[178,49.5]]],["garden","farm",null,[[133.5,55.5],[135.5,55],[137.5,55.5],[138,57.5],[137.5,59.5],[135.5,60],[133.5,59.5],[133,57.5]]],["garden","farm",null,[[141.5,55.5],[143.5,55],[145.5,55.5],[146,57.5],[145.5,59.5],[143.5,60],[141.5,59.5],[141,57.5]]],["garden","farm",null,[[149.5,55.5],[151.5,55],[153.5,55.5],[154,57.5],[153.5,59.5],[151.5,60],[149.5,59.5],[149,57.5]]],["garden","farm",null,[[162.5,55.5],[164.5,55],[166.5,55.5],[167,57.5],[166.5,59.5],[164.5,60],[162.5,59.5],[162,57.5]]],["garden","farm",null,[[170.5,55.5],[172.5,55],[174.5,55.5],[175,57.5],[174.5,59.5],[172.5,60],[170.5,59.5],[170,57.5]]],["garden","farm",null,[[178.5,55.5],[180.5,55],[182.5,55.5],[183,57.5],[182.5,59.5],[180.5,60],[178.5,59.5],[178,57.5]]],["garden","farm",null,[[133.5,68.5],[135.5,68],[137.5,68.5],[138,70.5],[137.5,72.5],[135.5,73],[133.5,72.5],[133,70.5]]],["garden","farm",null,[[141.5,68.5],[143.5,68],[145.5,68.5],[146,70.5],[145.5,72.5],[143.5,73],[141.5,72.5],[141,70.5]]],["garden","farm",null,[[149.5,68.5],[151.5,68],[153.5,68.5],[154,70.5],[153.5,72.5],[151.5,73],[149.5,72.5],[149,70.5]]],["garden","farm",null,[[162.5,68.5],[164.5,68],[166.5,68.5],[167,70.5],[166.5,72.5],[164.5,73],[162.5,72.5],[162,70.5]]],["garden","farm",null,[[170.5,68.5],[172.5,68],[174.5,68.5],[175,70.5],[174.5,72.5],[172.5,73],[170.5,72.5],[170,70.5]]],["garden","farm",null,[[178.5,68.5],[180.5,68],[182.5,68.5],[183,70.5],[182.5,72.5],[180.5,73],[178.5,72.5],[178,70.5]]],["garden","farm",null,[[133.5,76.5],[135.5,76],[137.5,76.5],[138,78.5],[137.5,80.5],[135.5,81],[133.5,80.5],[133,78.5]]],["garden","farm",null,[[141.5,76.5],[143.5,76],[145.5,76.5],[146,78.5],[145.5,80.5],[143.5,81],[141.5,80.5],[141,78.5]]],["garden","farm",null,[[149.5,76.5],[151.5,76],[153.5,76.5],[154,78.5],[153.5,80.5],[151.5,81],[149.5,80.5],[149,78.5]]],["garden","farm",null,[[162.5,76.5],[164.5,76],[166.5,76.5],[167,78.5],[166.5,80.5],[164.5,81],[162.5,80.5],[162,78.5]]],["garden","farm",null,[[170.5,76.5],[172.5,76],[174.5,76.5],[175,78.5],[174.5,80.5],[172.5,81],[170.5,80.5],[170,78.5]]],["garden","farm",null,[[178.5,76.5],[180.5,76],[182.5,76.5],[183,78.5],[182.5,80.5],[180.5,81],[178.5,80.5],[178,78.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple","nectarVial"],
    "rare": ["morpho","glassDragonfly","orchidMantis","lunaMoth","hawkMoth","stagBeetle","jewelBeetle","herculesBeetle","snakefly","blueGhostFirefly"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20},
    "garden": {"least":3,"draws":{"morpho":1,"lunaMoth":1,"hawkMoth":1,"honeyBee":3,"carpenterBee":3,"hoverfly":3,"silkMoth":3,"orchardBeetle":3,"pollenMidge":3,"megaloptaBee":3,"indianNightBee":3,"blueBandedBee":3,"clearwingMoth":3,"yuccaMoth":3,"tobaccoHawkmoth":3},"milkweed":["monarch",3]},
    "nectar": {"within":10,"soon":3,"stays":120,"at":["blooms","water","field","lamp","litter"],"maps":[["town",0,0,64,80],["farm",128,0,112,86],["forest",144,112,96,80]]},
    "pair": {"slack":2500},
    "quiet": {"offPeak":0.5}
  }$town$::jsonb),
  ('insect_garden', $town${
    "visitors": ["honeyBee","carpenterBee","lacewing","hoverfly","silkMoth","goldenAnt","orchardBeetle","pollenMidge","megaloptaBee","ghostMantis","railroadWorm","indianNightBee","snakefly","earwig","masonBee","tigerBeetle","roseChafer","woolCarderBee","oilBeetle","assassinBug","blueBandedBee","robberFly","superworm","clearwingMoth","antlion","bessBeetle","yuccaMoth","roveBeetle","cucujoBeetle","tobaccoHawkmoth","blueGhostFirefly","californiaGlowworm"],
    "boost": 1800000,
    "fanBoost": 2700000,
    "pollenMinutes": 60,
    "cageMinutes": 90,
    "guardMinutes": 120,
    "satchel": 0.85,
    "pollinators": ["honeyBee","carpenterBee","hoverfly","pollenMidge","silkMoth","orchardBeetle","butterflyWhite","monarch","morpho","moth","lunaMoth","hawkMoth","megaloptaBee","indianNightBee","masonBee","woolCarderBee","blueBandedBee","clearwingMoth","yuccaMoth","tobaccoHawkmoth"],
    "predators": ["lacewing","goldenAnt","mantis","ladybird","orchidMantis","ghostMantis","snakefly","tigerBeetle","assassinBug","robberFly","antlion","roveBeetle"]
  }$town$::jsonb),
  ('quality', $town${
    "bar": 25,
    "spread": 30,
    "narrowest": 20,
    "narrow": 10,
    "fennel": 10,
    "launch": 1791997200000,
    "hand": {"costs":{"compost":1,"brush":2,"fert":1},"water":93600000,"afterRain":43200000,"level":0.5},
    "encore": 0.5,
    "companions": {"runnerBean":{"role":"soil","shape":"plus"},"peanut":{"role":"soil","shape":"plus"},"buckwheat":{"role":"soil","shape":"ring"},"sesame":{"role":"soil","shape":"line"},"clover":{"role":"soil","shape":"x"},"gardenStrawberry":{"role":"water","shape":"plus"},"rhubarb":{"role":"water","shape":"ring"},"watercress":{"role":"water","shape":"line"},"fig":{"role":"water","shape":"ring"},"chamomile":{"role":"water","shape":"x"},"borage":{"role":"pollen","shape":"line"},"lavender":{"role":"pollen","shape":"ring"},"passionfruit":{"role":"pollen","shape":"line"},"milkweed":{"role":"pollen","shape":"plus"},"fennel":{"role":"pollen","shape":"x"},"marigold":{"role":"guard","shape":"ring"},"nasturtium":{"role":"guard","shape":"x"},"garlicChives":{"role":"guard","shape":"line"},"mint":{"role":"guard","shape":"plus"},"dill":{"role":"guard","shape":"plus"},"pearlNut":{"role":"soil","shape":"plus"},"silverGrain":{"role":"soil","shape":"ring"},"dewSesame":{"role":"soil","shape":"line"},"glassFlower":{"role":"soil","shape":"x"},"opalStalk":{"role":"water","shape":"ring"},"crystalLeaf":{"role":"water","shape":"line"},"dewFig":{"role":"water","shape":"ring"},"silkPollen":{"role":"water","shape":"x"}},
    "partners": {"kangkong":"watercress","scallion":"carrot","cabbage":"dill","carrot":"scallion","daikon":"nasturtium","corn":"runnerBean","chili":"basil","tomato":"basil","basil":"tomato","sweetPotato":"peanut","garlic":"chamomile","pumpkin":"runnerBean","eggplant":"marigold","cucumber":"dill","longBean":"sesame","lemongrass":"mint","galangal":"rhubarb","lime":"lavender","papaya":"passionfruit","mango":"buckwheat","banana":"sweetPotato","coconut":"peanut","ginger":"watercress","turmeric":"chamomile","taro":"watercress","watermelon":"nasturtium","bottleGourd":"borage","rowBean":"corn","trellisBerry":"borage","blueCorn":"runnerBean","teaBush":"clover","sunflowerPatch":"milkweed","redOkra":"garlicChives","lotusRootBed":"kangkong","runnerBean":"corn"},
    "crosses": [["corn","longBean","peanut","lavender","pearlNut"],["cabbage","carrot","buckwheat","passionfruit","silverGrain"],["corn","chili","sesame","milkweed","dewSesame"],["basil","cabbage","clover","fennel","glassFlower"],["gardenStrawberry","tomato","rhubarb","nasturtium","opalStalk"],["kangkong","scallion","watercress","garlicChives","crystalLeaf"],["pumpkin","tomato","fig","mint","dewFig"],["borage","lemongrass","chamomile","dill","silkPollen"]],
    "skies": {"honeyBee":"sun","carpenterBee":"sun","hoverfly":"sun","pollenMidge":"sun","orchardBeetle":"sun","butterflyWhite":"sun","monarch":"sun","morpho":"sun","silkMoth":"moon","moth":"moon","lunaMoth":"moon","hawkMoth":"moon","megaloptaBee":"mist","indianNightBee":"mist","masonBee":"sun","woolCarderBee":"sun","blueBandedBee":"sun","clearwingMoth":"sun","yuccaMoth":"moon","tobaccoHawkmoth":"moon"},
    "house": {"reach":2,"hours":48,"rareHours":72,"favHours":24,"level":0.5,"rooms":2,"rarePays":20,"costs":{"set":1,"room":1,"lift":1},"keep":0.7,"keeps":{"ladybird":0.5,"mantis":0.7,"robberFly":0.5,"antlion":0.5,"roveBeetle":0.5},"favourites":{"honeyBee":"clover","carpenterBee":"runnerBean","hoverfly":"dill","pollenMidge":"watercress","silkMoth":"buckwheat","orchardBeetle":"fig","butterflyWhite":"nasturtium","monarch":"marigold","morpho":"gardenStrawberry","moth":"mint","lunaMoth":"rhubarb","hawkMoth":"sesame","lacewing":"buckwheat","goldenAnt":"peanut","mantis":"fennel","ladybird":"chamomile","orchidMantis":"passionfruit","megaloptaBee":"chamomile","indianNightBee":"mint","masonBee":"gardenStrawberry","woolCarderBee":"sesame","blueBandedBee":"watercress","clearwingMoth":"nasturtium","yuccaMoth":"peanut","tobaccoHawkmoth":"garlicChives","ghostMantis":"lavender","snakefly":"borage","tigerBeetle":"clover","assassinBug":"milkweed","robberFly":"buckwheat","antlion":"peanut","roveBeetle":"rhubarb","earwig":"marigold","roseChafer":"borage","oilBeetle":"dill","superworm":"rhubarb","bessBeetle":"fig"},"soilWorkers":["earwig","roseChafer","oilBeetle","superworm","bessBeetle"]},
    "ferts": {"slatePowder":{"slot":"base","bars":{"soil":1}},"biochar":{"slot":"base","bars":{"water":1}},"mineralClay":{"slot":"base","bars":{"water":1}},"chitinPowder":{"slot":"base","bars":{"guard":1}},"forestHumus":{"slot":"base","bars":{"soil":0.5,"water":0.5}},"silkFrass":{"slot":"base","bars":{"soil":0.5,"pollen":0.5}},"woodAsh":{"slot":"base","bars":{"soil":0.5,"guard":0.5}},"lotusSilt":{"slot":"base","bars":{"water":0.5,"pollen":0.5}},"mulch":{"slot":"base","bars":{"water":0.5,"guard":0.5}},"herbPowder":{"slot":"base","bars":{"pollen":0.5,"guard":0.5}},"fishEmulsion":{"slot":"top","bars":{"soil":1},"hours":12},"kitchenFerment":{"slot":"top","bars":{"soil":1},"hours":12},"mineralWater":{"slot":"top","bars":{"water":1},"hours":24},"nectarLure":{"slot":"top","bars":{"pollen":1},"hours":24},"sulphurPowder":{"slot":"top","bars":{"guard":1},"hours":24},"resinWash":{"slot":"top","bars":{"guard":1},"hours":24},"sawdustMulch":{"slot":"top","bars":{"soil":0.5,"water":0.5},"hours":48},"shellMeal":{"slot":"top","bars":{"soil":0.5,"guard":0.5},"hours":24},"shreddedBark":{"slot":"top","bars":{"water":0.5,"guard":0.5},"hours":48},"boneMeal":{"slot":"base","bars":{"soil":1}},"guanoMeal":{"slot":"base","bars":{"pollen":1}},"scalePowder":{"slot":"base","bars":{"soil":1}},"beetleFrass":{"slot":"top","bars":{"soil":0.5,"pollen":0.5},"hours":24},"dewPollen":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":12},"glowPowder":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":12},"packetMist":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":72,"narrows":true},"packetNight":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":72,"narrows":true}}
  }$town$::jsonb),
  ('stream_work', $town${
    "sites": [{"id":"upper","x":21,"y":252,"items":["springSample","riverGrit","mossFilter","wetClay","morningDew"]},{"id":"lower","x":42,"y":254,"items":["rushingSample","mineralSand","reedPith","waterMint","morningDew"]}],
    "hours": {"morningDew":[[5,7]]},
    "reach": 2,
    "cost": 3,
    "every": 900000,
    "gateMinutes": 15,
    "gateCooldown": 30000,
    "nature": {"clearSpring":"rain","herbalWater":"moon","mineralWater":"dawn","dawnBlend":"dawn","rainBlend":"rain","moonBlend":"moon"},
    "recipes": {"clearSpring":{"needs":[["springSample",2],["charcoal",1]],"in":["jar"],"gives":2},"herbalWater":{"needs":[["clearSpring",1],["waterMint",2]],"in":["pot"],"gives":2},"mineralWater":{"needs":[["rushingSample",2],["mineralSand",1]],"in":["pot"],"gives":2},"dawnBlend":{"needs":[["mineralWater",1],["herbalWater",1]],"in":["jar"],"gives":1},"rainBlend":{"needs":[["clearSpring",1],["herbalWater",1]],"in":["jar"],"gives":1},"moonBlend":{"needs":[["dawnBlend",1],["clearSpring",1],["lichenSalt",1]],"in":["jar"],"gives":1},"springSalt":{"needs":[["mineralSand",2],["clearSpring",1]],"in":["pan"],"gives":2}}
  }$town$::jsonb),
  ('work', $town${
    "ids": ["kitchen","well","helpers","fishing","forest","insects","farming","felling","mining","animals"],
    "ranks": 10,
    "past": 0.25,
    "first": 10,
    "experienceVersion": 2,
    "harvestBankDays": 7,
    "marks": {"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000],"felling":[50,150,350,700,1300,2200,3600,5500,8000,12000],"mining":[50,150,350,700,1300,2200,3600,5500,8000,12000],"animals":[50,150,350,700,1300,2200,3600,5500,8000,12000]},
    "day": {"kitchen":150,"well":375,"helpers":375,"fishing":150,"forest":150,"insects":150,"farming":150,"felling":150,"mining":150,"animals":150},
    "kitchen": {"ladled":1,"pots":3,"ladling":9,"pot":{"nectarRice":4,"honeyHerbTea":4,"pollenCake":4,"orchardSoup":4,"fernRice":4,"rootStew":5,"petalBiscuit":4,"sporeNoodles":6,"springRice":5,"mintBroth":5,"mineralCongee":5,"moonTeaRice":4,"layeredRootPot":6,"crispRiceSkillet":7,"slowFishBroth":6,"glazedForestBowl":5,"sharePorridge":7,"travelerSoup":7,"friendRice":7,"restTea":7,"pineNutRice":3,"cedarBroth":6,"pineNutCake":5,"sapGlazedFish":3,"custard":3,"pancakes":5,"cheesecake":9,"butterCookies":8,"quiche":7,"lanternCustard":3,"cloudSouffle":3,"goldenOmelette":3,"emberBakedEggs":5,"rainBroth":3,"moonPudding":4,"paperFish":2,"leviathanEggCup":4,"strawberryShake":3,"hotCocoa":3,"flowerLatte":3,"starPudding":5,"pollenRice":4,"berryTea":5,"blueCornCake":5,"lotusGardenSoup":4,"minerRice":3,"caveStew":3,"saltRoast":3,"seamCake":3,"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":5,"tomYum":5,"sourCurry":5,"friedPerch":2,"fishCake":5,"spicyEel":4,"grilledPrawn":2,"steamedGoby":4,"pumpkinSoup":5,"shabu":14,"somTam":6,"grilledEggplant":3,"tomKha":6,"friedGourami":2,"crabCurry":7,"steamedSheatfish":4,"friedFrog":2,"laab":7,"omelette":2,"snailCurry":6,"candiedPumpkin":5,"friedRice":4,"greenCurry":9,"khanomJeen":10,"hoMok":8,"mangoStickyRice":7,"bananaInCoconut":5,"taroPudding":9,"steamedCroaker":4,"gingerFish":5,"turmericFish":4,"jungleCurry":10,"megaLaab":24,"watermelonSlices":6,"khantoke":24,"naamPrik":7,"sushi":6,"ramen":7,"tempura":3,"unadon":3,"okonomiyaki":5,"kimchi":6,"bibimbap":8,"tteokbokki":5,"kimbap":5,"pajeon":3,"harGow":5,"chowMein":6,"springRoll":6,"congee":5,"mapoTofu":5,"pizza":8,"spaghetti":7,"risotto":5,"lasagna":9,"minestrone":8,"fishCurry":8,"naan":5,"biryani":7,"samosa":6,"lassi":3,"fishChips":4,"ukha":5,"thieboudienne":6,"piranhaSoup":3,"crawfishBoil":10,"masgouf":3,"salmonSteak":2,"arapaimaRoast":12,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":5,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":8,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":5,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"creekBroth":7,"smokedBrookBowl":5,"torrentSkewer":2,"springDumpling":3,"reedFishCongee":5,"sandbankSkillet":5,"fernBarbelStew":6,"creekHerbGrill":6,"orchidFishHotpot":7,"ancientCreekFeast":7,"springFishCongee":4,"bluefinMountainPan":5,"cascadeHerbStew":6,"ridgeFishGrill":5,"mistFishBroth":7,"cloudCrownFeast":7,"lilyPoolCongee":4,"duskFishSkillet":5,"glassCaveSoup":6,"jadeFishGrill":6,"mirrorPoolStew":7,"moonveilFeast":7,"slatePowder":1,"biochar":1,"mineralClay":1,"chitinPowder":2,"forestHumus":3,"silkFrass":1,"woodAsh":1,"lotusSilt":1,"herbPowder":1,"fishEmulsion":3,"kitchenFerment":2,"nectarLure":2,"sulphurPowder":3,"resinWash":1,"sawdustMulch":1,"shellMeal":1,"shreddedBark":1,"boneMeal":1,"guanoMeal":3,"scalePowder":3,"beetleFrass":2,"dewPollen":2,"glowPowder":2,"packetMist":3,"packetNight":3,"splitPlank":1,"carvingBlank":3,"pitchSeal":3,"sapSyrup":2,"pineNutFlour":1,"rootTwine":1,"woodOil":3,"cream":1,"butter":2,"farmCheese":2,"yarn":1,"woolScarf":2,"rainbowScarf":3,"starScarf":3,"goldenScarf":3,"prism":3,"dewGrow":2,"packedRation":3,"honeycomb":2,"gardenHoney":2,"beeswax":3,"silkTwist":2,"silkenCord":2,"chitinPlate":3,"nectarSyrup":3,"lichenSalt":2,"petalDye":2,"bulbPowder":1,"driedFern":2,"rootExtract":2,"berrySeedOil":1,"sporeCulture":2,"clearSpring":3,"herbalWater":3,"mineralWater":2,"dawnBlend":4,"rainBlend":4,"moonBlend":5,"springSalt":3,"dicedRoot":2,"emberRice":2,"brownedOnion":1,"driedZest":1,"crushedHerb":1,"fishStock":3,"roastedSeed":1,"whiskedEgg":1,"fragrantOil":4,"smokedSalt":4,"fermentStarter":3,"brightSauce":4,"thickBroth":4,"sweetGlaze":3,"spicePaste":5,"gourdCup":1,"beanPaste":1,"berryJam":2,"blueCornFlour":1,"driedTea":1,"sunflowerOil":1,"lotusStarch":1,"stoneTile":2,"crystalLens":1,"sparkPowder":1,"copperBlank":3,"steelPlate":3,"geodeDisplay":4,"fishSauce":2,"compost":1,"growFert":3,"guardFert":4,"pestCure":3,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":2,"lineSpun":1,"mulch":1,"lavenderSachet":2,"bugNet":2,"torch":2,"driedFish":2,"saltedFish":2,"curryPaste":3,"pickle":2,"charcoal":1,"rope":1,"krabung":3,"noodle":2,"coconutMilk":1,"fermentedFish":4,"shrimpPaste":2,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":5,"brookFillet":1,"smokedTrout":3,"driedDace":2,"springStock":3,"fishRoe":1,"flowFloat":3,"springLeader":3,"torrentNet":3,"shadeLure":4}},
    "helpers": {"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3,"dust":2,"bellows":2},
    "fishing": {"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":2,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":2,"popotoFish":2,"rainbowFish":2,"moonFish":9,"creekDace":1,"torrentBarb":3,"stoneLapper":1,"glassGoby":3,"brookTrout":3,"caveBlindfish":8,"uplandEel":3,"springShrimp":1,"riverLamprey":8,"marbleMahseer":8,"torrentSleeper":3,"waterfallSturgeon":31,"reedMinnow":1,"ribbonRasbora":1,"pebbleLoach":1,"willowShiner":1,"sandGudgeon":1,"amberChub":1,"fernBarbel":3,"redfinDace":3,"stripedSpinyLoach":3,"leafPerch":3,"copperBream":3,"needleHalfbeak":3,"spottedCreekCatfish":8,"saffronLoach":8,"longfinCreekCarp":8,"orchidSnakehead":8,"creekDragonfish":30,"ancientCreekBarbel":31,"silverSpringDace":1,"rockSculpin":1,"mossLoach":1,"swiftGrayling":1,"bluefinTrout":1,"mountainWhitefish":1,"cascadeChar":3,"graniteGoby":3,"windfinMahseer":3,"crimsonHillBarb":3,"snowlineTrout":3,"ridgePike":3,"mistSalmon":8,"blackstoneEel":8,"cloudCrownMahseer":30,"thunderbackSturgeon":31,"poolMedaka":1,"lilyGourami":1,"moonspotGoby":1,"mossfinPerch":1,"roundtailBetta":1,"duskFeatherfin":1,"petalKillifish":3,"caveGlassPerch":3,"spottedPoolCatfish":3,"ivoryKnifefish":3,"jadeSleeper":3,"caveRibbonEel":3,"violetCaveChar":8,"mirrorPoolCarp":8,"starfinBichir":8,"moonveilArowana":30,"crystalCaveDragon":31,"pearlDanio":30,"peacockGudgeon":8,"huchen":30,"forktailBlueEye":8,"empireGudgeon":8,"lenok":8,"zebrafish":1,"europeanChub":1,"arcticChar":3,"rosyBitterling":1,"pumpkinseed":1,"europeanGrayling":3,"leastKillifish":1,"australianBass":3,"lakeWhitefish":3,"tench":1,"goldenDorado":30,"europeanBullhead":1,"glassKnifefish":30,"tigerShovelnose":3,"burbot":3,"elephantnoseFish":8,"freshwaterSole":3,"dollyVarden":3},
    "forest": {"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"],"kinds":{"ring":5,"bough":4},"parts":["bambooSheath","berryPip","fernTip","flowerBulb","forestLichen","fragrantPetal","mushroomSpores","wildMedicRoot"],"part":2},
    "insects": {"butterflyWhite":1,"monarch":8,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":8,"scarab":1,"caterpillar":1,"honeyBee":8,"carpenterBee":8,"lacewing":8,"hoverfly":8,"silkMoth":8,"goldenAnt":8,"orchardBeetle":8,"pollenMidge":8,"megaloptaBee":3,"ghostMantis":3,"railroadWorm":3,"indianNightBee":3,"snakefly":8,"earwig":3,"masonBee":1,"tigerBeetle":3,"roseChafer":1,"woolCarderBee":3,"oilBeetle":3,"assassinBug":3,"blueBandedBee":3,"robberFly":3,"superworm":3,"clearwingMoth":3,"antlion":3,"bessBeetle":8,"yuccaMoth":3,"roveBeetle":1,"cucujoBeetle":3,"tobaccoHawkmoth":3,"blueGhostFirefly":8,"californiaGlowworm":3},
    "farming": {"bottleGourd":6,"rowBean":5,"trellisBerry":16,"blueCorn":10,"teaBush":14,"sunflowerPatch":6,"redOkra":6,"lotusRootBed":10,"runnerBean":4,"peanut":6,"buckwheat":4,"sesame":5,"clover":3,"gardenStrawberry":4,"rhubarb":6,"watercress":2,"fig":10,"chamomile":4,"borage":3,"lavender":6,"passionfruit":8,"milkweed":4,"fennel":6,"marigold":3,"nasturtium":4,"garlicChives":3,"mint":3,"dill":4,"pearlNut":6,"silverGrain":4,"dewSesame":5,"glassFlower":3,"opalStalk":6,"crystalLeaf":2,"dewFig":10,"silkPollen":4,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":4,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12},
    "farmingAgain": {"bottleGourd":4,"rowBean":2,"trellisBerry":6,"blueCorn":11,"teaBush":6,"sunflowerPatch":7,"redOkra":3,"lotusRootBed":11,"runnerBean":2,"peanut":7,"buckwheat":4,"sesame":5,"clover":2,"gardenStrawberry":2,"rhubarb":4,"watercress":2,"fig":5,"chamomile":2,"borage":2,"lavender":4,"passionfruit":4,"milkweed":2,"fennel":4,"marigold":2,"nasturtium":2,"garlicChives":2,"mint":2,"dill":2,"pearlNut":7,"silverGrain":4,"dewSesame":5,"glassFlower":2,"opalStalk":4,"crystalLeaf":2,"dewFig":5,"silkPollen":2,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":2,"tomato":4,"basil":2,"sweetPotato":7,"garlic":5,"pumpkin":14,"eggplant":3,"cucumber":2,"longBean":2,"lemongrass":4,"galangal":9,"lime":6,"papaya":6,"mango":7,"banana":6,"coconut":8,"ginger":11,"turmeric":11,"taro":16,"watermelon":14},
    "farmingCells": {"bottleGourd":1,"rowBean":1,"trellisBerry":1,"blueCorn":1,"teaBush":1,"sunflowerPatch":1,"redOkra":1,"lotusRootBed":1,"runnerBean":1,"peanut":1,"buckwheat":1,"sesame":1,"clover":1,"gardenStrawberry":1,"rhubarb":1,"watercress":1,"fig":1,"chamomile":1,"borage":1,"lavender":1,"passionfruit":1,"milkweed":1,"fennel":1,"marigold":1,"nasturtium":1,"garlicChives":1,"mint":1,"dill":1,"pearlNut":1,"silverGrain":1,"dewSesame":1,"glassFlower":1,"opalStalk":1,"crystalLeaf":1,"dewFig":1,"silkPollen":1,"kangkong":1,"scallion":1,"cabbage":1,"carrot":1,"daikon":1,"corn":1,"chili":1,"tomato":1,"basil":1,"sweetPotato":1,"garlic":1,"pumpkin":1,"eggplant":1,"cucumber":1,"longBean":1,"lemongrass":1,"galangal":1,"lime":1,"papaya":1,"mango":1,"banana":1,"coconut":1,"ginger":1,"turmeric":1,"taro":1,"watermelon":1},
    "farmingCare": 2,
    "farmingGiantCells": 4,
    "well": {"bucket":1},
    "fellingGirth": [0,1,2],
    "fellingPerfect": 1,
    "miningDepth": [1,2,3],
    "miningPerfect": 2,
    "felling": {"pine":2,"ironwood":4,"moonwood":6,"elder":12},
    "braced": 1,
    "mining": {"rock":1,"vein":3,"way":5,"crystal":10,"lent":1,"lending":1}
  }$town$::jsonb),
  ('pouches', $town$[{"gift":"thingCreel","slots":5,"holds":["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish","creekDace","torrentBarb","stoneLapper","glassGoby","brookTrout","caveBlindfish","uplandEel","springShrimp","riverLamprey","marbleMahseer","torrentSleeper","waterfallSturgeon","reedMinnow","ribbonRasbora","pebbleLoach","willowShiner","sandGudgeon","amberChub","fernBarbel","redfinDace","stripedSpinyLoach","leafPerch","copperBream","needleHalfbeak","spottedCreekCatfish","saffronLoach","longfinCreekCarp","orchidSnakehead","creekDragonfish","ancientCreekBarbel","silverSpringDace","rockSculpin","mossLoach","swiftGrayling","bluefinTrout","mountainWhitefish","cascadeChar","graniteGoby","windfinMahseer","crimsonHillBarb","snowlineTrout","ridgePike","mistSalmon","blackstoneEel","cloudCrownMahseer","thunderbackSturgeon","poolMedaka","lilyGourami","moonspotGoby","mossfinPerch","roundtailBetta","duskFeatherfin","petalKillifish","caveGlassPerch","spottedPoolCatfish","ivoryKnifefish","jadeSleeper","caveRibbonEel","violetCaveChar","mirrorPoolCarp","starfinBichir","moonveilArowana","crystalCaveDragon","pearlDanio","peacockGudgeon","huchen","forktailBlueEye","empireGudgeon","lenok","zebrafish","europeanChub","arcticChar","rosyBitterling","pumpkinseed","europeanGrayling","leastKillifish","australianBass","lakeWhitefish","tench","goldenDorado","europeanBullhead","glassKnifefish","tigerShovelnose","burbot","elephantnoseFish","freshwaterSole","dollyVarden"]},{"gift":"thingSack","slots":5,"holds":["stone","shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx","oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx","slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","mineralSalt","wholeGeode"]},{"gift":"thingBundle","slots":3,"holds":["log","timber","knottedWood","straightWood","heartwood","cedarSliver","pineBark","pinePitch","pineNut","rootFiber"]},{"gift":"thingPouch","slots":30,"holds":["bottleGourd","rowBean","trellisBerry","blueCorn","teaBush","sunflowerPatch","redOkra","lotusRootBed","runnerBean","peanut","buckwheat","sesame","clover","gardenStrawberry","rhubarb","watercress","fig","chamomile","borage","lavender","passionfruit","milkweed","fennel","marigold","nasturtium","garlicChives","mint","dill","pearlNut","silverGrain","dewSesame","glassFlower","opalStalk","crystalLeaf","dewFig","silkPollen","kangkong","scallion","cabbage","carrot","daikon","corn","chili","tomato","basil","sweetPotato","garlic","pumpkin","eggplant","cucumber","longBean","lemongrass","galangal","lime","papaya","mango","banana","coconut","ginger","turmeric","taro","watermelon","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedDaikon","seedCorn","seedChili","seedTomato","seedBasil","seedSweetPotato","seedGarlic","seedPumpkin","seedEggplant","seedCucumber","seedLongBean","seedLemongrass","seedGalangal","seedLime","seedPapaya","seedMango","seedBanana","seedCoconut","seedGinger","seedTurmeric","seedTaro","seedWatermelon","seedBottleGourd","seedRowBean","seedTrellisBerry","seedBlueCorn","seedTeaBush","seedSunflowerPatch","seedRedOkra","seedLotusRootBed","seedRunnerBean","seedPeanut","seedBuckwheat","seedSesame","seedClover","seedGardenStrawberry","seedRhubarb","seedWatercress","seedFig","seedBorage","seedPassionfruit","seedMilkweed","seedFennel","seedMarigold","seedNasturtium","seedGarlicChives","seedDill","seedPearlNut","seedSilverGrain","seedDewSesame","seedGlassFlower","seedOpalStalk","seedCrystalLeaf","seedDewFig","seedSilkPollen","seedMint","seedChamomile","seedLavender"]}]$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v264>

-- <functions:v264>
-- What an insect weighs at an hour: its weight, or (a newcomer of the time bands outside its peak band) the catalog's
-- insects.quiet.offPeak of it (lib/town/insects' weightAt).
CREATE OR REPLACE FUNCTION town.bug_weight(p_bug jsonb, p_hour double precision, p_ins jsonb)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select (p_bug->>'weight')::double precision * case when p_bug ? 'peak' and not exists (select 1 from jsonb_array_elements(p_bug->'peak') r
    where p_hour >= (r->>0)::double precision and p_hour < (r->>1)::double precision) then coalesce((p_ins->'quiet'->>'offPeak')::double precision, 1) else 1::double precision end
$function$;

-- The time bands' newcomer fish on a cast (lib/town/fishing's freshOdds): every fish keeps its chance; each newcomer that
-- takes this bait in this water at this hour has its own share of the cast (half outside its peak band), all of them
-- never more than `take` of what is no fish but a pearl or a chest, which comes up that much less often.
CREATE OR REPLACE FUNCTION town.fresh_odds(p_odds jsonb, p_bait text, p_hour integer, p_habitat text, p_shallow boolean, p_never text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  fr jsonb := town.cat('fishing')->'fresh';
  fish jsonb := town.cat('fish');
  h integer := ((p_hour % 24) + 24) % 24;
  ids text[] := '{}';
  ss double precision[] := '{}';
  id text;
  f jsonb;
  o jsonb;
  junk double precision := 0;
  want double precision := 0;
  scale double precision;
  taken double precision;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  if fr is null or p_odds is null then return p_odds; end if;
  for id in select jsonb_array_elements_text(fr->'ids') loop
    f := fish->id;
    continue when f is null or coalesce((f->'baits'->>p_bait)::double precision, 0) <= 0;
    continue when not (coalesce(f->'habitat', '["town"]'::jsonb) ? p_habitat);
    continue when not exists (select 1 from jsonb_array_elements(f->'hours') x where h >= (x->>0)::int and h < (x->>1)::int);
    continue when f->>'tier' = any(coalesce(p_never, '{}'::text[]));
    continue when p_shallow and f->>'tier' <> 'common';
    ids := ids || id;
    ss := ss || ((f->>'fresh')::double precision * case when f ? 'peak' and not exists (select 1 from jsonb_array_elements(f->'peak') x where h >= (x->>0)::int and h < (x->>1)::int)
      then (fr->>'offPeak')::double precision else 1::double precision end);
  end loop;
  for o in select x from jsonb_array_elements(p_odds) with ordinality a(x, ord) order by ord loop
    if fr->'junk' ? (o->>'what') then junk := junk + (o->>'p')::double precision; end if;
  end loop;
  if coalesce(array_length(ids, 1), 0) = 0 or not (junk > 0) then return p_odds; end if;
  for i in 1..array_length(ss, 1) loop want := want + ss[i]; end loop;
  scale := least(1::double precision, (junk * (fr->>'take')::double precision) / want);
  taken := want * scale;
  for o in select x from jsonb_array_elements(p_odds) with ordinality a(x, ord) order by ord loop
    out_ := out_ || jsonb_build_array(case when fr->'junk' ? (o->>'what') then jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision * (1 - taken / junk)) else o end);
  end loop;
  for i in 1..array_length(ids, 1) loop out_ := out_ || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ss[i] * scale)); end loop;
  return out_;
end
$function$;

-- The bat guano (lib/town/mining's guanoOf): each plain rock of the cave a go broke in the guano's hour lets some fall
-- by its own chance, rolled after everything the rock held; into the bag (or a pouch) only where there is room.
CREATE OR REPLACE FUNCTION town.guano_of(p_did jsonb, p_go jsonb, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  g jsonb := town.cat('band_species')->'guano';
  floor_ integer := (p_go->>'floor')::integer;
  h double precision;
  turn_ bigint;
  n integer := 0;
  e jsonb;
  stowed jsonb;
begin
  if p_did->'ok' <> 'true'::jsonb or p_did->'done' <> 'true'::jsonb or g is null or coalesce(floor_, 0) <= 0 then return p_did; end if;
  h := town.hour_at((p_go->>'now')::bigint);
  if not exists (select 1 from jsonb_array_elements(g->'hours') r where h >= (r->>0)::double precision and h < (r->>1)::double precision) then return p_did; end if;
  turn_ := town.mine_turn((p_go->>'now')::bigint);
  for e in select x from jsonb_array_elements(coalesce(p_did->'each', '[]'::jsonb)) with ordinality a(x, ord) order by ord loop
    if e->>'kind' = 'stone' and town.roll(p_word || ':guano', floor_, (e->>'rock')::integer, turn_) < (g->>'chance')::double precision then n := n + (g->>'n')::integer; end if;
  end loop;
  if n <= 0 then return p_did; end if;
  stowed := town.stow_all(p_did->'purse', jsonb_build_array(jsonb_build_array(g->>'item', n)));
  if stowed is null then return p_did; end if;
  return p_did || jsonb_build_object('purse', stowed, 'got', town.mine_add(p_did->'got', g->>'item', n));
end
$function$;

CREATE OR REPLACE FUNCTION town.bug_at(p_haunt integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  ids jsonb := ins->'order';
  bug jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick text := null;
  i integer;
  lo integer;
  hi integer;
  w double precision;
  -- v264: what a newcomers' haunt has of nothing beside them (its kind's `none`; none at the old ones), and the hour
  none_ double precision := coalesce((kind->>'none')::double precision, 0);
  h_ double precision;
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  h_ := town.hour_at(at_);
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>i, h->>1, h->>2, at_, word));
    if fits[i + 1] then total := total + town.bug_weight(bug, h_, ins); end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * (total + none_);
  for i in 0..jsonb_array_length(ids) - 1 loop
    if fits[i + 1] then
      pick := ids->>i;
      left_ := left_ - town.bug_weight(ins->'bugs'->pick, h_, ins);
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null or (none_ > 0 and left_ >= 0) then return null; end if;
  -- hunted, it is out less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is as the turn begins. Nothing takes its place.
  w := town.bug_weight(ins->'bugs'->pick, h_, ins);
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase);
end;
$function$;

CREATE OR REPLACE FUNCTION town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  whence jsonb := ins->'haunts'->p_haunt;
  at_ bigint := p_now + (ins->'comeback'->>'after')::bigint * 1000;
  least_ bigint := (ins->'comeback'->>'least')::bigint * 1000;
  ids jsonb := ins->'order';
  backs jsonb := coalesce(p_backs, '[]'::jsonb);
  free integer[] := '{}';
  turns bigint[] := '{}';
  begins bigint[] := '{}';
  h jsonb;
  kind jsonb;
  bug jsonb;
  every bigint;
  phase bigint;
  turn bigint;
  began bigint;
  some_ boolean;
  n integer;
  nth integer;
  i integer;
  j integer;
  total double precision := 0;
  left_ double precision;
  pick text := null;
  lo integer;
  hi integer;
  w double precision;
  -- ── the older tools (v174): what the row it is handed says of the kinds it names as rare (nothing: every weight as it is) ──
  rarer_ double precision := (ins->>'rarer')::double precision;
begin
  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  -- v264: a newcomers' haunt of the time bands neither sends one back nor takes one (lib/town/insects' comeback)
  if coalesce((ins->'kinds'->(whence->>0)->>'alone')::boolean, false) then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    continue when coalesce((kind->>'alone')::boolean, false);
    every := (kind->>'every')::bigint * 60000;
    phase := floor(town.roll('bugphase', i) * (kind->>'every')::double precision)::bigint * 60000;
    turn := floor((at_ + phase)::numeric / every)::bigint;
    began := turn * every - phase;
    continue when began + every - at_ < least_;
    continue when town.bug_at(i, at_, ins, word) is not null;
    continue when exists (select 1 from jsonb_array_elements(backs) x where (x->>'haunt')::int = i and (x->>'turn')::bigint = turn);
    some_ := false;
    for j in 0..jsonb_array_length(ids) - 1 loop
      bug := ins->'bugs'->(ids->>j);
      if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, began, word) then some_ := true; exit; end if;
    end loop;
    continue when not some_;
    free := free || i;
    turns := turns || turn;
    begins := begins || began;
  end loop;
  n := coalesce(array_length(free, 1), 0);
  if n = 0 then return null; end if;
  nth := least(n - 1, greatest(0, floor(coalesce(p_r1, 0) * n)::int)) + 1;
  i := free[nth];
  h := ins->'haunts'->i;
  -- the insect: by that haunt's own weights, as its own turn would roll it
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    -- ── the older tools (v174): a weight, as the row handed says it ──
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? (ids->>j), false) then rarer_ else 1::double precision end; end if;
  end loop;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * total;
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then
      pick := ids->>j;
      -- ── the older tools (v174): the same weight ──
      left_ := left_ - (bug->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? (ids->>j), false) then rarer_ else 1::double precision end;
      exit when left_ < 0;
    end if;
  end loop;
  -- hunted, it is back less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is at the catch. Nothing takes its place.
  -- ── the older tools (v174): the same weight ──
  w := (ins->'bugs'->pick->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? pick, false) then rarer_ else 1::double precision end;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, p_now, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('haunt', i, 'turn', turns[nth], 'bug', pick,
    'n', lo + least(hi - lo, greatest(0, floor(coalesce(p_r3, 0) * (hi - lo + 1))::int)), 'from', at_);
end;
$function$;

CREATE OR REPLACE FUNCTION town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := coalesce(f->'spots'->p_spot, f->'secret'->'spots'->(p_spot - jsonb_array_length(f->'spots')));
  kind jsonb := coalesce(f->'kinds'->(spot->>0), f->'secret'->'kinds'->(spot->>0));
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
  -- v264: the time bands' rare finds (`quiet`): only in a turn that had nothing of the place's other finds
  quiet_ boolean[] := '{}';
  qtotal double precision := 0;
begin
  if exists(select 1 from public.town_forest_rest r where r.spot=p_spot and r.begins<=p_now and p_now<r.ends) then return null; end if;
  if p_spot is null or p_spot < 0 or spot is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('phase', p_spot) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    quiet_ := quiet_ || coalesce((finds->i->>'quiet')::boolean, false);
    fits := fits || (not quiet_[i + 1] and town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word));
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision or not (true = any(fits)) then
    -- a quiet turn: one of the time bands' rare finds by its weight against nothing (lib/town/forest's holds)
    for i in 0..jsonb_array_length(finds) - 1 loop
      fits[i + 1] := quiet_[i + 1] and town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
      if fits[i + 1] then qtotal := qtotal + (finds->i->>'weight')::double precision; end if;
    end loop;
    if qtotal <= 0 then return null; end if;
    left_ := town.roll(word || ':quiet', p_spot, turn) * (qtotal + coalesce((f->'quiet'->>'none')::double precision, 0));
    for i in 0..jsonb_array_length(finds) - 1 loop
      if fits[i + 1] then
        left_ := left_ - (finds->i->>'weight')::double precision;
        if left_ < 0 then pick := finds->i; exit; end if;
      end if;
    end loop;
    if pick is null then return null; end if;
    lo := (pick->'n'->>0)::int;
    hi := (pick->'n'->>1)::int;
    return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
      'until', (turn + 1) * every - phase);
  end if;
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

CREATE OR REPLACE FUNCTION town.stream_work(p_purse jsonb, p_action text, p_choice text, p_x integer, p_y integer, p_gate jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 k jsonb:=town.cat('stream_work');site jsonb;route_ text:=case when (p_gate->>'until')::numeric>p_now then p_gate->>'route' else 'pool' end;
 turn_ bigint;key_ text;recipe jsonb;bag jsonb:=p_purse->'bag';need jsonb;got jsonb;out_ jsonb;book jsonb;
 nature_ text;times_ double precision;well_ jsonb:=town.cat('farming')->'wellAt';
begin
 select s.v into site from jsonb_array_elements(k->'sites') s(v) where p_x is not null and p_y is not null
   and greatest(abs((s.v->>'x')::numeric-p_x),abs((s.v->>'y')::numeric-p_y))<=(k->>'reach')::numeric limit 1;
 if p_action='pour' then
   if p_x is null or p_y is null or greatest(abs(p_x-(well_->>0)::integer),abs(p_y-(well_->>1)::integer))<>1 then return town.no('far');end if;
 elsif site is null then return town.no('far');end if;
 if p_action='gate' then
   if p_choice not in ('pool','reed') or p_choice is null then return town.no('none');end if;
   if town.held(bag,'sluiceKey')<1 then return town.no('tool');end if;
   if (p_gate->>'until')::numeric>p_now and (p_gate->>'route'=p_choice or (p_gate->>'until')::numeric-(k->>'gateMinutes')::numeric*60000+(k->>'gateCooldown')::numeric>p_now) then return town.no('spent');end if;
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,(k->>'cost')::double precision,p_now),'gate',jsonb_build_object('route',p_choice,'until',p_now+(k->>'gateMinutes')::bigint*60000,'by',p_me));
 elsif p_action='sample' then
   if p_choice is null or not (site->'items' ? p_choice) then return town.no('none');end if;
   -- v264: the dew, a bank's sample in the early morning only (lib/town/stream-work's sampleOut)
   if k->'hours' ? p_choice and not exists(select 1 from jsonb_array_elements(k->'hours'->p_choice) r where town.hour_at(p_now)>=(r->>0)::double precision and town.hour_at(p_now)<(r->>1)::double precision) then return town.no('none');end if;
   if p_choice='springSample' and route_<>'pool' or p_choice='rushingSample' and route_<>'reed' then return town.no('none');end if;
   if p_choice in ('springSample','rushingSample') and town.held(bag,'waterSampler')<1
     and not exists(select 1 from jsonb_array_elements(bag) s where town.cat('farming')->'buckets' ? (s->>'item') and (s->>'n')::numeric>0) then return town.no('tool');end if;
   turn_:=floor(p_now::numeric/(k->>'every')::numeric)::bigint;key_:=site->>'id'||':'||p_choice;
   if p_purse->'streamTaken'->>key_=turn_::text then return town.no('spent');end if;
   if town.room(bag,p_choice)<1 then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,1));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,1),'streamTaken',coalesce(p_purse->'streamTaken','{}'::jsonb)||jsonb_build_object(key_,turn_));
 elsif p_action='prepare' then
   recipe:=k->'recipes'->p_choice;if recipe is null then return town.no('none');end if;
   if town.held(bag,case when p_choice like '%Blend' then 'mixingJug' else 'filterFrame' end)<1 then return town.no('tool');end if;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop
     if town.held(bag,need->>0)<(need->>1)::numeric then return town.no('none');end if;
   end loop;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
   if town.room(bag,p_choice)<(recipe->>'gives')::numeric then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,(recipe->>'gives')::integer));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,(recipe->>'gives')::integer));
 elsif p_action='pour' then
   nature_:=k->'nature'->>p_choice;if nature_ is null or town.held(bag,p_choice)<1 then return town.no('none');end if;
   times_:=greatest(1::double precision,case when town.held(town.carried_bag(p_purse),'sealedFlask')>0 then 2::double precision else 1::double precision end,town.buff_by(p_purse,p_now,'waterProperty'));
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,1::double precision,p_now)||jsonb_build_object('bag',town.take(bag,p_choice,1)),'nature',nature_,'times',times_);
 else return town.no('none');end if;
 book:=coalesce(p_purse->'streamBook','[]'::jsonb);if not book ? p_choice then book:=book||jsonb_build_array(p_choice);end if;
 return jsonb_build_object('ok',true,'got',got,'purse',out_||jsonb_build_object('streamBook',book));
end $function$;

CREATE OR REPLACE FUNCTION town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$declare did jsonb;v jsonb;begin
  did:=town.mine_pay_v214(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb and coalesce(did->'vein','null'::jsonb)<>'null'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_vein_site(did->'purse',p_purse,did->'vein',p_go->'at',(p_go->>'day')::integer));end if;
  -- v264: the bat guano a rock of the cave lets fall in its hour (lib/town/mining's guanoOf)
  did:=town.guano_of(did,p_go,p_word);
  return did;end $function$;

CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;dragon_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star or pair, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  -- ── v264: the time bands' newcomer fish, last of all: only in what is no fish's place (lib/town/fishing's freshOdds) ──
  if not star then
    odds := town.fresh_odds(odds, p_bait, (under->>'hour')::integer, habitat, not deep::boolean,
      case when pair then array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never')) else '{}'::text[] end
      || case when town.is_wary(purse, now_) then array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')) else '{}'::text[] end);
  end if;
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$;

revoke all on function town.bug_weight(jsonb,double precision,jsonb) from public, anon, authenticated;
revoke all on function town.fresh_odds(jsonb,text,integer,text,boolean,text[]) from public, anon, authenticated;
revoke all on function town.guano_of(jsonb,jsonb,text) from public, anon, authenticated;
-- (the functions written over keep the grants they had)
-- </functions:v264>

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select jsonb_array_length(town.cat('insects')->'haunts'), town.cat('items') ? 'megaloptaBee', town.cat('fishing')->'fresh'->'take';  -- 125, true, 0.5
--   select town.cat('band_species')->'guano'->'hours';                                                                                   -- [[18, 19]]
