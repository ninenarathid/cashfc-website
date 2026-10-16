-- v274: the farming line's own pouch, and the farm's produce stacked twice as high (2026-10-16).
-- Run after v273, with the matching site code: lib/town/pouches (the farm's pouch, grades kept), lib/town/items (the
-- stacks), components/town/TownPouches. Safe to run twice.
--
-- The owner: "ช่วยทำให้ เครื่องรางบางชิ้นในสาย ปลูกพืช มี กระเป๋าเก็บของสำหรับสายนี้โดยเฉพาะ สำหรับ เก็บพืช เมล็ด ได้ ให้slot
-- มากกว่าสายอื่นเล็กน้อย / เพิ่ม stack ต่อ slot ให้กับพืชด้วย มีคนบอกว่าตอนนี้น้อยไป และเปลืองช่อง", settled with Codex:
--   * The spellbound seed pouch (thingPouch, the farming line's third rank) is a pouch too: six slots (the creel's and
--     the sack's are five) for everything the farm grows (the three helper plants that are wild things too among them)
--     and every seed: the catalog's `pouches` row.
--   * A pouch keeps a stack's grade, one grade to a slot as in the bag (town.pouches_of, town.room_in_g,
--     town.stow_away_g, town.stow_all_v207 taking a grade third, town.pouch_to_bag, town.bag_to_pouch); a thing of no
--     grade is as it was.
--   * What a picking gives goes into the pouch first, then the bag, with the same refusal when neither has the room:
--     by hand and the giants (town.pick), the crescent sickle's row and its one more (town.row_tend), the garden
--     twine's fruit (town.garden_harvest; the seeds it gives back went through town.stow_all already).
--   * A seed sown is taken from the pouch first, then the bag, whose is the one in the hand (town.use_up in town.sow);
--     the seed pouch's row counts the pouch's seeds (town.row_for), and a seed it spares goes back where it was taken.
--   * The catalog's `items` row: every crop, and the wild helper plants, stack twice as high (10, 20, 40); seeds as
--     they were.
--   * town.deed_th has words for v273's `move`.
-- What each does is the code's, to the digit (v274.test.mjs against lib/town's).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.move_plant(text,text,jsonb,jsonb,text,bigint,text)') is null then raise exception 'Run v273 before v274'; end if;
-- <guards:v274>
 if md5(replace(pg_get_functiondef('town.pouches_of(jsonb)'::regprocedure),chr(13),'')) not in ('0a3f1ae051a43fbabc9f8329955e6e74','6c9e89f671638e8b182ac91c38d06e5d') then raise exception 'Definition changed: town.pouches_of(jsonb); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.room_in(jsonb,text)'::regprocedure),chr(13),'')) not in ('665c2b581167f6117d53e7185a258a71','1ba36f906ef119f3d4da22d1aebebecd') then raise exception 'Definition changed: town.room_in(jsonb,text); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.stow_away(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('95d1615119957881b24da9e29d075933','499554d1a3154606f98509845d673aa4') then raise exception 'Definition changed: town.stow_away(jsonb,text,integer); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.stow_all_v207(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('de4360361dd86eb4329a0b78ab34a0b2','3576f45844b08bf1249fbfe58f9eb1d8') then raise exception 'Definition changed: town.stow_all_v207(jsonb,jsonb); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.pouch_to_bag(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('5b382b5ee173d478c53a92d0fdf501f2','c8b11c4a54c201c11d3354ea72d7350b') then raise exception 'Definition changed: town.pouch_to_bag(jsonb,text,integer); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.bag_to_pouch(jsonb,integer)'::regprocedure),chr(13),'')) not in ('6cf8fd7e8809c43723e9ff2f00457a2b','bbce557e1e6055cdf8628c3d7d0a56b8') then raise exception 'Definition changed: town.bag_to_pouch(jsonb,integer); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.sow(jsonb,jsonb,text,text,bigint)'::regprocedure),chr(13),'')) not in ('fbba7d8d741c441408c4d4a00cff508b','eec503ed5bb53b19fb8e8226cbe5c5b9') then raise exception 'Definition changed: town.sow(jsonb,jsonb,text,text,bigint); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)'::regprocedure),chr(13),'')) not in ('87c33397a2228724c01130624303937d','e70cfe2871bd8a8dd48ef170033fbf8f') then raise exception 'Definition changed: town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure),chr(13),'')) not in ('bceb973971a538b6cb8a9670e222e6ae','6961d699b312a63158fbfc47576e9dce') then raise exception 'Definition changed: town.pick(text,jsonb,jsonb,boolean,text,bigint,text); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean)'::regprocedure),chr(13),'')) not in ('c92cde725b2d49357a030216099ce778','4149655412eca259b35aa2db3517c521') then raise exception 'Definition changed: town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint,boolean); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('2d257be26507b4f98d4564dcea210775','994a387f12459689703295b979341e64') then raise exception 'Definition changed: town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb); rebuild v274'; end if;
 if md5(replace(pg_get_functiondef('town.deed_th(text)'::regprocedure),chr(13),'')) not in ('5ca4d5bdc0290e9987b3dce8b94292fb','33255cdd54fa6431ffe69a3bcebe7989') then raise exception 'Definition changed: town.deed_th(text); rebuild v274'; end if;
-- </guards:v274>
end $$;

-- <catalog:v274> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
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
    "compost": {"kind":"goods","tier":1,"stack":20,"pays":4},
    "growFert": {"kind":"goods","tier":1,"stack":20,"pays":10},
    "guardFert": {"kind":"goods","tier":1,"stack":20,"pays":12},
    "pestCure": {"kind":"goods","tier":1,"stack":10,"pays":10},
    "basket": {"kind":"goods","tier":1,"stack":1,"pays":0},
    "riceBox": {"kind":"dish","tier":1,"stack":5,"pays":3},
    "oddDish": {"kind":"dish","tier":1,"stack":5,"pays":0},
    "friedMinnow": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "grilledFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "grilledCorn": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "roastSweetPotato": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "stirKangkong": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "basilCatfish": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "tomYum": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "sourCurry": {"kind":"dish","tier":1,"stack":5,"pays":20},
    "friedPerch": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "fishCake": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "spicyEel": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "grilledPrawn": {"kind":"dish","tier":1,"stack":5,"pays":44},
    "steamedGoby": {"kind":"dish","tier":1,"stack":5,"pays":38},
    "pumpkinSoup": {"kind":"dish","tier":1,"stack":5,"pays":30},
    "shabu": {"kind":"dish","tier":1,"stack":10,"pays":30},
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
    "dozyFish": {"kind":"dish","tier":1,"stack":5,"pays":2},
    "popotoFish": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rainbowFish": {"kind":"dish","tier":1,"stack":5,"pays":6},
    "moonFish": {"kind":"fish","tier":1,"stack":5,"pays":50},
    "hookScale": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "floatGlow": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "fishChips": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "ukha": {"kind":"dish","tier":1,"stack":5,"pays":17},
    "thieboudienne": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "piranhaSoup": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "crawfishBoil": {"kind":"dish","tier":1,"stack":10,"pays":15},
    "masgouf": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "salmonSteak": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "arapaimaRoast": {"kind":"dish","tier":1,"stack":10,"pays":45},
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
    "mushroomSoup": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "mushroomSkewer": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "fishOnStick": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "roastYam": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "roastedApple": {"kind":"dish","tier":1,"stack":5,"pays":5},
    "mushroomRisotto": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "fernSalad": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "herbTea": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "berryCompote": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "bakedApple": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "roastChestnut": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "forestStew": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "bambooShootStir": {"kind":"dish","tier":1,"stack":5,"pays":13},
    "rosemaryFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "ginsengSoup": {"kind":"dish","tier":1,"stack":5,"pays":34},
    "moonTea": {"kind":"dish","tier":1,"stack":5,"pays":28},
    "truffleEggs": {"kind":"dish","tier":2,"stack":5,"pays":35},
    "mushroomOmelette": {"kind":"dish","tier":2,"stack":5,"pays":15},
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
    "somTam": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "grilledEggplant": {"kind":"dish","tier":2,"stack":5,"pays":20},
    "tomKha": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "friedGourami": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "crabCurry": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "steamedSheatfish": {"kind":"dish","tier":2,"stack":5,"pays":46},
    "friedFrog": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "laab": {"kind":"dish","tier":2,"stack":5,"pays":42},
    "omelette": {"kind":"dish","tier":2,"stack":5,"pays":14},
    "snailCurry": {"kind":"dish","tier":2,"stack":5,"pays":36},
    "candiedPumpkin": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "friedRice": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "sushi": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "tempura": {"kind":"dish","tier":2,"stack":5,"pays":32},
    "okonomiyaki": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "kimchi": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "bibimbap": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "kimbap": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "pajeon": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "harGow": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "springRoll": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "congee": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "spaghetti": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "minestrone": {"kind":"dish","tier":2,"stack":5,"pays":28},
    "samosa": {"kind":"dish","tier":2,"stack":5,"pays":26},
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
    "greenCurry": {"kind":"dish","tier":3,"stack":5,"pays":60},
    "khanomJeen": {"kind":"dish","tier":3,"stack":5,"pays":70},
    "hoMok": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "mangoStickyRice": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "bananaInCoconut": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "taroPudding": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "steamedCroaker": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "gingerFish": {"kind":"dish","tier":3,"stack":5,"pays":54},
    "turmericFish": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "jungleCurry": {"kind":"dish","tier":3,"stack":5,"pays":66},
    "megaLaab": {"kind":"dish","tier":3,"stack":20,"pays":90},
    "watermelonSlices": {"kind":"dish","tier":3,"stack":10,"pays":20},
    "khantoke": {"kind":"dish","tier":3,"stack":20,"pays":120},
    "naamPrik": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "ramen": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "unadon": {"kind":"dish","tier":3,"stack":5,"pays":48},
    "tteokbokki": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "chowMein": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "mapoTofu": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "pizza": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "risotto": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "lasagna": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "fishCurry": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "naan": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "biryani": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "lassi": {"kind":"dish","tier":3,"stack":5,"pays":24},
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
    "creekBroth": {"kind":"dish","tier":3,"stack":5,"pays":25},
    "smokedBrookBowl": {"kind":"dish","tier":2,"stack":5,"pays":28},
    "torrentSkewer": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "springDumpling": {"kind":"dish","tier":2,"stack":5,"pays":22},
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
    "reedFishCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "sandbankSkillet": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "fernBarbelStew": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "creekHerbGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "orchidFishHotpot": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "ancientCreekFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
    "springFishCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "bluefinMountainPan": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "cascadeHerbStew": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "ridgeFishGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "mistFishBroth": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "cloudCrownFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
    "lilyPoolCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "duskFishSkillet": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "glassCaveSoup": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "jadeFishGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "mirrorPoolStew": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "moonveilFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
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
  ('pouches', $town$[{"gift":"thingCreel","slots":5,"holds":["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish","creekDace","torrentBarb","stoneLapper","glassGoby","brookTrout","caveBlindfish","uplandEel","springShrimp","riverLamprey","marbleMahseer","torrentSleeper","waterfallSturgeon","reedMinnow","ribbonRasbora","pebbleLoach","willowShiner","sandGudgeon","amberChub","fernBarbel","redfinDace","stripedSpinyLoach","leafPerch","copperBream","needleHalfbeak","spottedCreekCatfish","saffronLoach","longfinCreekCarp","orchidSnakehead","creekDragonfish","ancientCreekBarbel","silverSpringDace","rockSculpin","mossLoach","swiftGrayling","bluefinTrout","mountainWhitefish","cascadeChar","graniteGoby","windfinMahseer","crimsonHillBarb","snowlineTrout","ridgePike","mistSalmon","blackstoneEel","cloudCrownMahseer","thunderbackSturgeon","poolMedaka","lilyGourami","moonspotGoby","mossfinPerch","roundtailBetta","duskFeatherfin","petalKillifish","caveGlassPerch","spottedPoolCatfish","ivoryKnifefish","jadeSleeper","caveRibbonEel","violetCaveChar","mirrorPoolCarp","starfinBichir","moonveilArowana","crystalCaveDragon","pearlDanio","peacockGudgeon","huchen","forktailBlueEye","empireGudgeon","lenok","zebrafish","europeanChub","arcticChar","rosyBitterling","pumpkinseed","europeanGrayling","leastKillifish","australianBass","lakeWhitefish","tench","goldenDorado","europeanBullhead","glassKnifefish","tigerShovelnose","burbot","elephantnoseFish","freshwaterSole","dollyVarden"]},{"gift":"thingSack","slots":5,"holds":["stone","shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx","oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx","slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","mineralSalt","wholeGeode"]},{"gift":"thingBundle","slots":3,"holds":["log","timber","knottedWood","straightWood","heartwood","cedarSliver","pineBark","pinePitch","pineNut","rootFiber"]},{"gift":"thingPouch","slots":6,"holds":["bottleGourd","rowBean","trellisBerry","blueCorn","teaBush","sunflowerPatch","redOkra","lotusRootBed","runnerBean","peanut","buckwheat","sesame","clover","gardenStrawberry","rhubarb","watercress","fig","chamomile","borage","lavender","passionfruit","milkweed","fennel","marigold","nasturtium","garlicChives","mint","dill","pearlNut","silverGrain","dewSesame","glassFlower","opalStalk","crystalLeaf","dewFig","silkPollen","kangkong","scallion","cabbage","carrot","daikon","corn","chili","tomato","basil","sweetPotato","garlic","pumpkin","eggplant","cucumber","longBean","lemongrass","galangal","lime","papaya","mango","banana","coconut","ginger","turmeric","taro","watermelon","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedDaikon","seedCorn","seedChili","seedTomato","seedBasil","seedSweetPotato","seedGarlic","seedPumpkin","seedEggplant","seedCucumber","seedLongBean","seedLemongrass","seedGalangal","seedLime","seedPapaya","seedMango","seedBanana","seedCoconut","seedGinger","seedTurmeric","seedTaro","seedWatermelon","seedBottleGourd","seedRowBean","seedTrellisBerry","seedBlueCorn","seedTeaBush","seedSunflowerPatch","seedRedOkra","seedLotusRootBed","seedRunnerBean","seedPeanut","seedBuckwheat","seedSesame","seedClover","seedGardenStrawberry","seedRhubarb","seedWatercress","seedFig","seedBorage","seedPassionfruit","seedMilkweed","seedFennel","seedMarigold","seedNasturtium","seedGarlicChives","seedDill","seedPearlNut","seedSilverGrain","seedDewSesame","seedGlassFlower","seedOpalStalk","seedCrystalLeaf","seedDewFig","seedSilkPollen","seedMint","seedChamomile","seedLavender"]}]$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v274>

CREATE OR REPLACE FUNCTION town.pouches_of(p_purse jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  had jsonb := town.gifts_of(p_purse)->'had';
  kept jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  p jsonb;
  mine jsonb;
  s jsonb;
  slots jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  for p in select e.v from jsonb_array_elements(town.cat('pouches')) with ordinality e(v, ord) order by e.ord loop
    continue when not (had ? (p->>'gift'));
    mine := kept->(p->>'gift');
    slots := '[]'::jsonb;
    for i in 0..(p->>'slots')::integer - 1 loop
      s := case when jsonb_typeof(mine) = 'array' then mine->i end;
      if s is not null and jsonb_typeof(s) = 'object' and jsonb_typeof(s->'item') = 'string' and p->'holds' ? (s->>'item')
         and jsonb_typeof(s->'n') = 'number' and (s->>'n')::numeric = floor((s->>'n')::numeric) and (s->>'n')::numeric > 0 then
        -- v274: with its grade, one of the three stars (graded produce in the farm's pouch)
        slots := slots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', least((s->>'n')::numeric, (town.cat('items')->(s->>'item')->>'stack')::numeric)::bigint)
          || case when town.grade_in(s) between 1 and 3 then jsonb_build_object('grade', town.grade_in(s)) else '{}'::jsonb end);
      else
        slots := slots || '[null]'::jsonb;
      end if;
    end loop;
    out_ := out_ || jsonb_build_array(jsonb_build_object('gift', p->>'gift', 'slots', slots, 'holds', p->'holds'));
  end loop;
  return out_;
end;
$function$;

CREATE OR REPLACE FUNCTION town.room_in_g(p_purse jsonb, p_id text, p_grade integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- v274: of a grade (lib/town/pouches' roomIn): in the bag and in every pouch that takes the thing
  select (town.room_g(p_purse->'bag', p_id, coalesce(p_grade, 0))
    + coalesce((select sum(town.room_g(p.v->'slots', p_id, coalesce(p_grade, 0))) from jsonb_array_elements(town.pouches_of(p_purse)) p(v) where p.v->'holds' ? p_id), 0))::integer
$function$;

CREATE OR REPLACE FUNCTION town.room_in(p_purse jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- v274: of normal things, as town.room_in_g has it
  select town.room_in_g(p_purse, p_id, 0)
$function$;

CREATE OR REPLACE FUNCTION town.stow_away_g(p_purse jsonb, p_id text, p_n integer, p_grade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  out_ jsonb := p_purse;
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  left_ integer := p_n;
  add_ integer;
  p jsonb;
begin
  -- v274: of a grade (lib/town/pouches' stow): into the pouches that take it first, then the bag, each with its grade
  for p in select e.v from jsonb_array_elements(town.pouches_of(p_purse)) with ordinality e(v, ord) order by e.ord loop
    continue when left_ <= 0 or not (p->'holds' ? p_id);
    add_ := least(left_, town.room_g(p->'slots', p_id, coalesce(p_grade, 0)));
    if add_ > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.put_g(p->'slots', p_id, add_, coalesce(p_grade, 0)));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - add_;
    end if;
  end loop;
  if left_ > 0 then out_ := out_ || jsonb_build_object('bag', town.put_g(out_->'bag', p_id, left_, coalesce(p_grade, 0))); end if;
  return out_;
end;
$function$;

CREATE OR REPLACE FUNCTION town.stow_away(p_purse jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  -- v274: of normal things, as town.stow_away_g has it
  select town.stow_away_g(p_purse, p_id, p_n, 0)
$function$;

CREATE OR REPLACE FUNCTION town.stow_all_v207(p_purse jsonb, p_things jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  out_ jsonb := p_purse;
  t jsonb;
  many integer;
begin
  for t in select e.v from jsonb_array_elements(p_things) with ordinality e(v, ord) order by e.ord loop
    many := (t->>1)::integer;
    continue when many <= 0;
    -- v274: of its grade, where it says one (lib/town/pouches' stowAll)
    if town.room_in_g(out_, t->>0, coalesce((t->>2)::integer, 0)) < many then return null; end if;
    out_ := town.stow_away_g(out_, t->>0, many, coalesce((t->>2)::integer, 0));
  end loop;
  return out_;
end;
$function$;

CREATE OR REPLACE FUNCTION town.use_up(p_purse jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v274: lib/town/pouches' useUp: what a seed sown is taken from, the farm's pouch first, so that the seed in the hand,
-- which is the bag's, is the last to go
declare
  out_ jsonb := p_purse;
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  left_ integer := p_n;
  less integer;
  p jsonb;
begin
  for p in select e.v from jsonb_array_elements(town.pouches_of(p_purse)) with ordinality e(v, ord) order by e.ord loop
    exit when left_ <= 0;
    less := least(left_, town.held(p->'slots', p_id));
    if less > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.take(p->'slots', p_id, less));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - less;
    end if;
  end loop;
  if left_ > 0 then out_ := out_ || jsonb_build_object('bag', town.take(out_->'bag', p_id, left_)); end if;
  return out_;
end;
$function$;

CREATE OR REPLACE FUNCTION town.pouch_to_bag(p_purse jsonb, p_gift text, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  mine jsonb := (select p.v from jsonb_array_elements(town.pouches_of(p_purse)) p(v) where p.v->>'gift' = p_gift limit 1);
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  s jsonb := case when p_slot is not null and p_slot >= 0 then mine->'slots'->p_slot end;
  many integer;
begin
  if mine is null or s is null or s = 'null'::jsonb then return town.no('none'); end if;
  -- v274: with its grade, one grade to a slot as in the bag
  many := least((s->>'n')::integer, town.room_g(p_purse->'bag', s->>'item', town.grade_in(s)));
  if many <= 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'n', many, 'purse', p_purse || jsonb_build_object(
    'pouches', pouches || jsonb_build_object(p_gift, jsonb_set(mine->'slots', array[p_slot::text],
      case when (s->>'n')::integer > many then s || jsonb_build_object('n', (s->>'n')::integer - many) else 'null'::jsonb end)),
    'bag', town.put_g(p_purse->'bag', s->>'item', many, town.grade_in(s))));
end;
$function$;

CREATE OR REPLACE FUNCTION town.bag_to_pouch(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is not null and p_slot >= 0 then p_purse->'bag'->p_slot end;
  mine jsonb := town.pouches_of(p_purse);
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  out_ jsonb := p_purse;
  left_ integer;
  add_ integer;
  p jsonb;
begin
  if s is null or s = 'null'::jsonb or coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' or town.forged(s) then return town.no('none'); end if;
  left_ := (s->>'n')::integer;
  for p in select e.v from jsonb_array_elements(mine) with ordinality e(v, ord) order by e.ord loop
    continue when left_ <= 0 or not (p->'holds' ? (s->>'item'));
    -- v274: with its grade, one grade to a slot as in the bag
    add_ := least(left_, town.room_g(p->'slots', s->>'item', town.grade_in(s)));
    if add_ > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.put_g(p->'slots', s->>'item', add_, town.grade_in(s)));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - add_;
    end if;
  end loop;
  if left_ = (s->>'n')::integer then
    return town.no(case when exists (select 1 from jsonb_array_elements(mine) q(v) where q.v->'holds' ? (s->>'item')) then 'full' else 'none' end);
  end if;
  return jsonb_build_object('ok', true, 'n', (s->>'n')::integer - left_, 'purse', out_ || jsonb_build_object(
    'bag', jsonb_set(out_->'bag', array[p_slot::text], case when left_ > 0 then s || jsonb_build_object('n', left_) else 'null'::jsonb end)));
end;
$function$;

CREATE OR REPLACE FUNCTION town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  crop text := f->'seeds'->>p_hand;
begin
  if crop is null or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p_plot->>'soil' <> 'tilled' or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  -- ── the older tools (v174): a plot with `damp` on it: sown as any other, then the plant as lib/town/farm's sow has it there ──
  if p_plot->'damp' = 'true'::jsonb then
    return (select d.v || jsonb_build_object('plot', (d.v->'plot') || jsonb_build_object('plant', town.sow_damp(d.v->'plot'->'plant', p_now)))
              from (select town.sow(p_purse, p_plot - 'damp', p_hand, p_me, p_now) as v) d);
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true,
    'plot', jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', p_me, 'crop', crop, 'sown', p_now,
      'boost', case when town.has_buff(p_purse, p_now, 'sprout')
        then (town.wishing()->>'sprout')::double precision * (town.cat('crops')->crop->>'hours')::double precision * 3600000 else 0 end, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)),
    -- v274: the seed from the farm's pouch first, then the bag, whose is the one in the hand (town.use_up)
    'purse', town.use_up(town.spend(p_purse, (f->'costs'->>'sow')::double precision, p_now), p_hand, 1));
end;
$function$;

CREATE OR REPLACE FUNCTION town.row_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  x0 integer;
  deed text;
  row_ jsonb;
  hoes boolean;
  sows boolean;
  reaps boolean;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) then return null; end if;
  deed := town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner);
  if deed is null then return null; end if;
  if deed='sow' and town.cat('gardening')->'shapes' ? (town.cat('farming')->'seeds'->>hand) then return null; end if;
  hoes := deed in ('clear', 'till') and town.wearing(p_purse, 'charmHoe');
  sows := deed = 'sow' and town.gift_works(p_purse, 'thingPouch');
  -- (the sickle is for its wearer's own beds: not somebody else's, nor one that is nobody's)
  reaps := deed = 'pick' and p_owner is not distinct from p_me and town.wearing(p_purse, 'charmSickle');
  if not hoes and not sows and not reaps then return null; end if;
  x0 := split_part(p_at, ',', 1)::integer;
  -- (the pouch sows as many plots as the seeds in the bag and the farm's pouch reach, the nearest first: v274)
  select jsonb_agg(q.key_ order by q.far, q.x) into row_
    from (
      select k.key_, abs(split_part(k.key_, ',', 1)::integer - x0) as far, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed
       order by far, x
       limit case when sows then town.pouch_plots(town.held_in(p_purse, hand), jsonb_array_length(p_keys)) end
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return null; end if;
  return jsonb_build_object('deed', deed, 'plots', row_);
end;
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
  -- (v274: the farm's pouch and the bag, the pouch taking what it can first, each fruit with its grade: town.stow_away_g)
  fruits := town.quality_harvest(p_key, p, n, p_now, (select s.salt from town.quality_salt s where s.one), 0, top_);
  room_ := p_purse;
  for g in select e.v from jsonb_array_elements(fruits->'groups') e(v) loop
    if town.room_in_g(room_, p->>'crop', (g->>0)::integer) < (g->>1)::integer then return town.no('full'); end if;
    room_ := town.stow_away_g(room_, p->>'crop', (g->>1)::integer, (g->>0)::integer);
  end loop;
  picked := (p->>'picked')::int + 1;
  -- (v273: the mandrake sings no more; a plant it sang to before has its bearing more still, town.more_of)
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'fruits', jsonb_build_object('range', fruits->'range', 'values', fruits->'values'),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)) end,
    'purse', town.spend(room_, (f->'costs'->>'pick')::double precision, p_now)),p_now,top_);
end;
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
   -- (v274: into the farm's pouch first, then the bag, with its grade)
   if town.room_in_g(after_,p->>'crop',(g->>0)::integer)<(g->>1)::integer then return town.no('full'); end if;
   after_:=town.stow_away_g(after_,p->>'crop',(g->>1)::integer,(g->>0)::integer);
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
  was_ jsonb;
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
    was_ := mine;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back where it was taken from as soon as it was taken: the bag, or the farm's pouch, which is sown
    -- from first (v274); there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then
      mine := case when town.held(mine->'bag', hand) < town.held(was_->'bag', hand) then mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)) else town.stow_away(mine, hand, 1) end;
    end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the farm's pouch or the bag has room for it: v274)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    -- v260: its fruits are rolled for their Quality as the fruits after the pick's and the twine's
    if well then
      -- (v273: at the top of the range, of my own plant with the mandrake at heel: lib/town/farm's atTop)
      top_ := coalesce(p_me <> '' and plot->'plant'->>'by' = p_me and town.gift_works(p_purse, 'famMandrake'), false);
      cut_ := mine;
      for g_ in select e.v from jsonb_array_elements((town.quality_harvest(key, plot->'plant', more, p_now, (select s.salt from town.quality_salt s where s.one),
          (select coalesce(sum((e.v->>1)::integer), 0)::integer from jsonb_array_elements(did->'got') e(v) where e.v->>0 = crop), top_))->'groups') e(v) loop
        if cut_ is not null and town.room_in_g(cut_, crop, (g_->>0)::integer) >= (g_->>1)::integer then cut_ := town.stow_away_g(cut_, crop, (g_->>1)::integer, (g_->>0)::integer); else cut_ := null; end if;
      end loop;
      if cut_ is not null then
        mine := cut_;
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

CREATE OR REPLACE FUNCTION town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู' when 'move' then 'ย้ายผักในแปลงด้วยจอบต้องมนตร์'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    -- ── the lamp relay at dusk (v163) ──
    when 'flame_take' then 'รับไฟจากกองไฟ' when 'flame_pass' then 'ส่งไฟต่อให้คนถัดไป' when 'lamp_light' then 'จุดโคม' when 'lamp_hand' then 'ไฟที่ช่วยกันส่งต่อมาจุดโคม'
    -- ── the lamp relay at dusk (v163): its end ──
    -- ── the mountain's trees (v164) ──
    when 'fell' then 'ตัดต้นไม้' when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'
    -- ── the mountain's trees (v164): its end ──
    -- ── the mountain's rocks (v164) ──
    when 'mine' then 'ทุบหิน' when 'crystal' then 'ทุบหินคริสตัลประจำวัน' when 'delve' then 'เปิดทางลงชั้นถัดไป' when 'hew' then 'ช่วยทุบหินของเพื่อน'
    when 'vein' then 'ขุดสายแร่' when 'vein_odd' then 'สายแร่ที่เล่าผลมาไม่ตรงกติกา' when 'lift' then 'ขึ้นลิฟต์ในถ้ำ' when 'torch' then 'วางคบไฟในถ้ำ'
    -- ── the mountain's rocks (v164): its end ──
    -- ── the blacksmith (v174) ──
    when 'smelt' then 'ฝากช่างตีเหล็กหลอม' when 'smelted' then 'รับของที่หลอมเสร็จ' when 'smith_wider' then 'ขยายเตาหลอม' when 'bellows' then 'สูบลมช่วยเพื่อนหลอม'
    when 'forge' then 'ตีบวกเครื่องมือ' when 'forge_draw' then 'ช่างเปิดออปชันให้เลือก' when 'forge_choose' then 'เลือกออปชันของเครื่องมือ' when 'forge_redraw' then 'สุ่มออปชันใหม่'
    when 'gem_set' then 'ฝังพลอยลงเครื่องมือ' when 'forge_move' then 'ย้ายของที่ตีไว้ไปเครื่องมืออีกชิ้น' when 'forge_first' then 'ขึ้นป้ายคนแรกของช่างตีเหล็ก' when 'power' then 'ใช้พลังของเครื่องมือ'
    when 'fire_found' then 'พบส่วนหนึ่งของไฟใหญ่ของเตา' when 'fire_join' then 'ลงชื่อในคิวไฟใหญ่' when 'fire_leave' then 'ถอนชื่อจากคิวไฟใหญ่'
    -- ── the blacksmith (v174): its end ──
    when 'box_upgrade' then 'อัปเกรดกล่องเก็บของ' else p_what end
$function$;

revoke all on function town.room_in_g(jsonb,text,integer), town.stow_away_g(jsonb,text,integer,integer), town.use_up(jsonb,text,integer) from public, anon, authenticated;
-- (the functions written over keep the grants they had)

commit;

-- What it should say afterwards:
--   select data->'kangkong'->'stack' kangkong, data->'seedKangkong'->'stack' seed from public.town_catalog where key = 'items';   -- 40 | 10
--   select e->'slots' from public.town_catalog c, jsonb_array_elements(c.data) e where c.key = 'pouches' and e->>'gift' = 'thingPouch';  -- 6
--   select town.deed_th('move');                                                                                    -- ย้ายผักในแปลงด้วยจอบต้องมนตร์
