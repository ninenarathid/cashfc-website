-- v127 — the well keeps a book
--
-- Run this once in the Supabase SQL editor, after v122. Running it again is
-- safe.
--
-- Some members carry water for the others' sake: they draw it at the river,
-- walk it to the farm's well and pour it in, and somebody else's plants grow
-- of it. On the night every deed began to be written down (v121), four
-- members poured 42 bucketfuls in two and a half hours, two of them with no
-- plant of their own; of 321 waterings 279 were of somebody else's plant. The
-- game told none of them anything. The owner, 2026-10-05: "ผู้เล่นบางคน เน้น
-- support ผู้เล่นคนอื่นโดยการตักน้ำมาส่งให้เพื่อน … แต่เขาไม่ได้รับอะไรตอบแทนเลย".
--
-- Not coins: a minute's walk paid for is a faucet anybody's second character
-- can turn. What was missing is being seen, and getting somewhere. So:
--
--   · The well keeps a book. It says what came of a carrier's water today:
--     how many waterings were of it, of how many plants, of how many people's;
--     and who carried today, by name, in the order they came.
--   · So many bucketfuls poured, all told, and a carrier has a rank, which
--     everybody sees under their name.
--   · At the first rank the well has a yoke for its carrier (two bucketfuls a
--     trip), at the last a great one (four). Things like any other: lent,
--     held, never sold (they fetch nothing).
--
-- To say whose water reached which plant, water is followed. The well's water
-- is kept lot by lot, the oldest taken first (`town_well_water`); a can
-- filled is of the lot it was filled from (`town_well_cans`); a plant watered
-- from that can was watered with that carrier's water (`town_well_reach`, a
-- line to a day, a carrier and a plot). `town_carriers` has what each has
-- poured, all told, and the ranks whose gift they have taken.
--
-- None of the game's functions is written again for it. v121 writes every
-- deed down in `town_deeds`; a trigger on that table reads the lines of water
-- (pour, fill, water) as they are written and keeps the four tables. **It can
-- never undo a deed**: whatever goes wrong in it is swallowed, and the line it
-- was reading stays written. A deed that left no line (before v121) cannot be
-- followed: water from before the book is nobody's.
--
-- When this file first runs, the lines already written are read in order, as
-- if the book had been there since v121: so the water in the well this moment
-- has its carriers, and nobody's count begins at nothing.
--
-- The rules are lib/town/well.ts written again (`town.well_*`), held to the
-- code case by case by the dry run, and their numbers are the catalog's row
-- `well`. The two yokes are things (`items`) that carry water (`farming`):
-- v110's `town.chore` reads what each carries from there, so it is as it was.
--
-- What it does not change: no rule of the farm, no answer of any function
-- there was. `town.deed_th` (v121's, the tally's Thai words) is given one
-- word more, for a gift taken from the well: the function is read as it
-- stands and that one `when` is added to it, whoever wrote it last.
--
-- **The code goes out before this file**: a page built before cannot draw a
-- yoke in a bag.

/* ── the game first ──────────────────────────────────────────────────────── */

do $$
begin
  if to_regclass('public.town_deeds') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 has not run yet: the well''s book reads the deeds it writes down';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v127> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('well', $town${
    "ranks": [50,200,600],
    "gifts": [[1,"waterYoke"],[3,"waterYokeGreat"]],
    "listed": 40
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
    "kangkong": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "scallion": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "cabbage": {"kind":"crop","tier":1,"stack":10,"pays":20},
    "carrot": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "daikon": {"kind":"crop","tier":1,"stack":10,"pays":18},
    "corn": {"kind":"crop","tier":1,"stack":20,"pays":14},
    "chili": {"kind":"crop","tier":1,"stack":20,"pays":5},
    "tomato": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "basil": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "sweetPotato": {"kind":"crop","tier":1,"stack":20,"pays":12},
    "garlic": {"kind":"crop","tier":1,"stack":20,"pays":10},
    "pumpkin": {"kind":"crop","tier":1,"stack":5,"pays":110},
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
    "mint": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "rosemary": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chamomile": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "lavender": {"kind":"wild","tier":1,"stack":20,"pays":3},
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
    "butterflyWhite": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "monarch": {"kind":"bug","tier":1,"stack":20,"pays":4},
    "morpho": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "dragonfly": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "damselfly": {"kind":"bug","tier":1,"stack":20,"pays":7},
    "glassDragonfly": {"kind":"bug","tier":1,"stack":5,"pays":60},
    "grasshopper": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "mantis": {"kind":"bug","tier":1,"stack":10,"pays":9},
    "cicada": {"kind":"bug","tier":1,"stack":20,"pays":7},
    "stickInsect": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "leafInsect": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "firefly": {"kind":"bug","tier":1,"stack":20,"pays":6},
    "orchidMantis": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "moth": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "lunaMoth": {"kind":"bug","tier":1,"stack":5,"pays":50},
    "hawkMoth": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "rhinoBeetle": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "stagBeetle": {"kind":"bug","tier":1,"stack":5,"pays":25},
    "jewelBeetle": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "herculesBeetle": {"kind":"bug","tier":1,"stack":5,"pays":150},
    "ladybird": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "scarab": {"kind":"bug","tier":1,"stack":20,"pays":4},
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
    "bowl": {"kind":"tool","tier":1,"stack":1,"pays":3},
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
    "eggplant": {"kind":"crop","tier":2,"stack":20,"pays":14},
    "cucumber": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "longBean": {"kind":"crop","tier":2,"stack":20,"pays":9},
    "lemongrass": {"kind":"crop","tier":2,"stack":20,"pays":12},
    "galangal": {"kind":"crop","tier":2,"stack":20,"pays":22},
    "lime": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "papaya": {"kind":"crop","tier":2,"stack":10,"pays":26},
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
    "mango": {"kind":"crop","tier":3,"stack":20,"pays":30},
    "banana": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "coconut": {"kind":"crop","tier":3,"stack":10,"pays":34},
    "ginger": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "turmeric": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "taro": {"kind":"crop","tier":3,"stack":10,"pays":30},
    "watermelon": {"kind":"crop","tier":3,"stack":5,"pays":60},
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
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35}
  }$town$::jsonb),
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6},
    "swings": {"clear":3,"till":3},
    "pulled": "compost",
    "stages": [0,0.1,0.3,0.6,1],
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","mosquitofish":"guard","herring":"feed","archerfish":"cure","mulch":"feed","lavenderSachet":"guard","butterflyWhite":"feed","monarch":"feed","mantis":"guard","ladybird":"guard","scarab":"feed","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
    "seeds": {"seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2,"waterYoke":2,"waterYokeGreat":4},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v127>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The well's water, the oldest first: whose each lot is (nobody's, for water
-- from before the book) and how many bucketfuls of it are left. A lot taken
-- to its last bucketful is gone.
create table if not exists public.town_well_water (
  id        bigint generated always as identity primary key,
  member_id uuid references public.profiles (id) on delete set null,
  buckets   integer not null check (buckets > 0)
);
create index if not exists town_well_water_member on public.town_well_water (member_id) where member_id is not null;

-- Whose water is in a can: by who holds it and which can it is, with the
-- waterings left of that filling.
create table if not exists public.town_well_cans (
  member_id uuid not null references public.profiles (id) on delete cascade,
  item      text not null,
  carrier   uuid references public.profiles (id) on delete set null,
  waterings integer not null default 0,
  primary key (member_id, item)
);
create index if not exists town_well_cans_carrier on public.town_well_cans (carrier) where carrier is not null;

-- Every carrier: the bucketfuls poured into the well, all told, and the ranks
-- whose gift they have taken from it.
create table if not exists public.town_carriers (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  buckets   integer not null default 0 check (buckets >= 0),
  taken     integer[] not null default '{}'
);

-- What came of a carrier's water: a line to a day of the game's (from dawn), a
-- carrier and a plot, with whose plant it was and how many waterings. Only the
-- last days are read, and older lines are thrown away as the book is opened.
create table if not exists public.town_well_reach (
  day     integer not null,
  carrier uuid not null references public.profiles (id) on delete cascade,
  x       integer not null,
  y       integer not null,
  owner   uuid references public.profiles (id) on delete cascade,
  n       integer not null default 0,
  primary key (day, carrier, x, y)
);
create index if not exists town_well_reach_carrier on public.town_well_reach (carrier);
create index if not exists town_well_reach_owner on public.town_well_reach (owner);

-- Whether the lines written before this file have been read, and up to which.
create table if not exists public.town_well_kept (
  one     boolean primary key default true check (one),
  upto    bigint not null,
  read_at timestamptz not null default now()
);

-- Closed, all five: no browser reads or writes them. The functions below do.
alter table public.town_well_water enable row level security;
alter table public.town_well_cans enable row level security;
alter table public.town_carriers enable row level security;
alter table public.town_well_reach enable row level security;
alter table public.town_well_kept enable row level security;
revoke all on public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_well_kept from anon, authenticated;

/* ── the rules: lib/town/well.ts, written again ──────────────────────────── */

-- The rank so many bucketfuls make: none, or the first, the second, the third.
create or replace function town.well_rank(p_buckets integer)
returns integer language sql stable
as $$ select count(*)::integer from jsonb_array_elements_text(town.cat('well')->'ranks') r where coalesce(p_buckets, 0) >= r::integer $$;

-- How far along from the rank one has to the next: from nothing to one; one at
-- the last.
create or replace function town.well_towards(p_buckets integer)
returns double precision language plpgsql stable
as $$
declare
  marks jsonb := town.cat('well')->'ranks';
  v_rank integer := town.well_rank(p_buckets);
  v_from integer := case when v_rank > 0 then (marks->>(v_rank - 1))::integer else 0 end;
  v_to integer := (marks->>v_rank)::integer;
begin
  if v_to is null then return 1; end if;
  return greatest(0, least(1, (coalesce(p_buckets, 0) - v_from)::double precision / (v_to - v_from)));
end;
$$;

-- What the well has waiting for somebody: the gift of the lowest rank they
-- have reached and not taken, as [rank, thing]; null when there is none.
create or replace function town.well_due(p_buckets integer, p_taken integer[])
returns jsonb language sql stable
as $$
  select g.gift
    from jsonb_array_elements(town.cat('well')->'gifts') with ordinality as g(gift, at)
   where (g.gift->>0)::integer <= town.well_rank(p_buckets)
     and not ((g.gift->>0)::integer = any (coalesce(p_taken, '{}')))
   order by g.at limit 1
$$;

-- Take what the well has waiting: into the bag, if there is room.
create or replace function town.well_take(p_purse jsonb, p_buckets integer, p_taken integer[])
returns jsonb language plpgsql stable
as $$
declare
  due jsonb := town.well_due(p_buckets, p_taken);
begin
  if due is null then return town.no('none'); end if;
  if town.room(p_purse->'bag', due->>1) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'gift', due->>1, 'rank', (due->>0)::integer,
    'purse', p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', due->>1, 1)));
end;
$$;

-- A line of water, read: what `seen` does in the code. A bucketful poured is a
-- lot of the well's water and counts for its carrier; a can filled takes a
-- bucketful of the oldest lot there is and is that carrier's water for as many
-- waterings as it holds; a plant watered from it, when it is neither the
-- carrier's own nor past what the can held, is a line of what came of that
-- carrier's water that day.
create or replace function town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
returns void language plpgsql set search_path = public
as $$
declare
  v_n integer;
  v_lot bigint;
  v_lot_by uuid;
  v_lot_has integer;
  v_can text;
  v_carrier uuid;
  v_waterings integer;
  v_owner uuid;
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
  elsif p_what = 'fill' then
    if p_thing is null then return; end if;
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_well_water w order by w.id limit 1 for update;
    if v_lot is not null then
      if v_lot_has > 1 then update public.town_well_water w set buckets = w.buckets - 1 where w.id = v_lot;
      else delete from public.town_well_water w where w.id = v_lot; end if;
    end if;
    insert into public.town_well_cans (member_id, item, carrier, waterings)
      values (p_member, p_thing, v_lot_by, coalesce((town.cat('farming')->'cans'->>p_thing)::integer, 0))
      on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
  elsif p_what = 'water' then
    v_can := p_doc->>'with';
    if v_can is null then return; end if;
    select c.carrier, c.waterings into v_carrier, v_waterings from public.town_well_cans c where c.member_id = p_member and c.item = v_can for update;
    if v_waterings is null or v_waterings <= 0 then return; end if;
    update public.town_well_cans c set waterings = c.waterings - 1 where c.member_id = p_member and c.item = v_can;
    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);
    if v_carrier is null or v_carrier = v_owner or jsonb_typeof(p_doc->'tile') is distinct from 'array' then return; end if;
    insert into public.town_well_reach (day, carrier, x, y, owner, n)
      values (town.day_of(p_at), v_carrier, (p_doc->'tile'->>0)::integer, (p_doc->'tile'->>1)::integer, v_owner, 1)
      on conflict (day, carrier, x, y) do update set n = public.town_well_reach.n + 1, owner = excluded.owner;
  end if;
end;
$$;

-- The trigger's own: read the line just written, and never undo it. Whatever
-- goes wrong here is a line the book misses, not a deed that fails.
create or replace function town.well_deed()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  begin
    perform town.well_seen(new.member_id, round(extract(epoch from new.at) * 1000)::bigint, new.what, new.thing, new.n, new.doc);
  exception when others then
    raise warning 'the well''s book missed line %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- The book as a member reads it at a moment: all they have poured, their
-- rank, how far towards the next, whether the well has something for them;
-- today (the game's day, from dawn), the bucketfuls they poured, the waterings
-- that were of their water, of how many plants, of how many people's, and the
-- plants of others they watered themselves, for how many people; and today's
-- carriers, in the order they came, by their characters' names.
create or replace function town.well_book(p_member uuid, p_now bigint)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  w jsonb := town.cat('well');
  v_day integer := town.day_of(p_now);
  v_from timestamptz := to_timestamp((v_day::bigint * 86400000 - 7 * 3600000::bigint + (town.cat('rules')->>'dawn')::integer * 3600000::bigint) / 1000.0);
  v_till timestamptz := v_from + interval '1 day';
  v_buckets integer := 0;
  v_taken integer[] := '{}';
  v_today integer;
  v_waterings integer;
  v_plants integer;
  v_people integer;
  v_watered integer;
  v_helped integer;
  v_carriers jsonb;
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = p_member;
  v_buckets := coalesce(v_buckets, 0);
  v_taken := coalesce(v_taken, '{}');
  select coalesce(sum(floor(d.n)), 0)::integer into v_today
    from public.town_deeds d where d.member_id = p_member and d.what = 'pour' and d.at >= v_from and d.at < v_till and d.n >= 1;
  select coalesce(sum(r.n), 0)::integer, count(*)::integer, count(distinct r.owner)::integer into v_waterings, v_plants, v_people
    from public.town_well_reach r where r.day = v_day and r.carrier = p_member;
  select count(*)::integer, count(distinct d.doc->>'whose')::integer into v_watered, v_helped
    from public.town_deeds d where d.member_id = p_member and d.what = 'water' and d.at >= v_from and d.at < v_till and d.doc ? 'whose';
  select coalesce(jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name, 'buckets', q.buckets, 'rank', town.well_rank(q.total)) order by q.first_at, q.id_text), '[]'::jsonb)
    into v_carriers
    from (
      select t.member_id, t.buckets, t.first_at, t.member_id::text collate "C" as id_text,
             coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name, coalesce(c.buckets, 0) as total
        from (select d.member_id, sum(floor(d.n))::integer as buckets, min(d.at) as first_at
                from public.town_deeds d
               where d.what = 'pour' and d.at >= v_from and d.at < v_till and d.n >= 1 and d.member_id is not null
               group by d.member_id) t
        join public.profiles pr on pr.id = t.member_id
        left join public.town_carriers c on c.member_id = t.member_id
       order by t.first_at, t.member_id::text collate "C"
       limit (w->>'listed')::integer
    ) q;
  return jsonb_build_object(
    'buckets', v_buckets, 'rank', town.well_rank(v_buckets), 'towards', town.well_towards(v_buckets), 'gift', town.well_due(v_buckets, v_taken) is not null,
    'today', jsonb_build_object('buckets', v_today, 'waterings', v_waterings, 'plants', v_plants, 'people', v_people, 'watered', v_watered, 'helped', v_helped),
    'carriers', v_carriers);
end;
$$;

-- The tally's word for a gift taken from the well: v121's `town.deed_th` (or
-- whatever it has become since) as it stands, with one `when` more. Read and
-- written again from its own text, so that no word anybody gave it is lost.
do $$
declare
  def text;
begin
  if town.deed_th('gift') = 'gift' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''gift'' then ''รับของที่บ่อน้ำฝากไว้ให้'' else p_what end');
  end if;
end $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The well's book, as I read it.
create or replace function public.town_well()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  -- (what the book no longer reads is thrown away as it is opened: a week of days is kept)
  delete from public.town_well_reach r where r.day < town.day_of(now_) - 7;
  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_);
end;
$$;

-- Everybody who has a rank, for the name over their head: a rank to a member.
create or replace function public.town_well_ranks()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(),
    'ranks', (select coalesce(jsonb_object_agg(c.member_id::text, town.well_rank(c.buckets)), '{}'::jsonb)
                from public.town_carriers c where town.well_rank(c.buckets) > 0));
end;
$$;

-- Take what the well has waiting for me, if my bag has room for it.
create or replace function public.town_well_take()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  v_buckets integer;
  v_taken integer[];
  did jsonb;
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = me for update;
  did := town.well_take(purse, coalesce(v_buckets, 0), coalesce(v_taken, '{}'));
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_carriers c set taken = c.taken || (did->>'rank')::integer where c.member_id = me;
    perform town.note(me, 'gift', did->>'gift', 1, 0, jsonb_build_object('from', 'well', 'rank', (did->>'rank')::integer));
  end if;
  return town.answer(me, did) || jsonb_build_object('wellBook', town.well_book(me, town.now_ms()));
end;
$$;

revoke execute on function public.town_well() from public, anon;
revoke execute on function public.town_well_ranks() from public, anon;
revoke execute on function public.town_well_take() from public, anon;
grant execute on function public.town_well() to authenticated;
grant execute on function public.town_well_ranks() to authenticated;
grant execute on function public.town_well_take() to authenticated;

/* ── the lines written before, and the trigger ───────────────────────────── */

-- Once: every line of water already written is read in order, as if the book
-- had been there since v121. The water the well held before the first of
-- them is nobody's, and goes first. Then what the book counts is put right by
-- the well itself (a lot of nobody's water for what it lacks, the oldest lots
-- shortened by what it has too much). No deed is written while this runs: the
-- table is held, for the moment it takes.
do $$
declare
  d record;
  v_first record;
  v_well integer := coalesce((select (t.doc #>> '{}')::integer from public.town_things t where t.key = 'well'), 0);
  v_before integer;
  v_has integer;
  v_lot record;
begin
  lock table public.town_deeds in share row exclusive mode;
  if not exists (select 1 from public.town_well_kept) then
    select x.what, x.n, x.doc into v_first from public.town_deeds x where x.what in ('pour', 'fill') and jsonb_typeof(x.doc->'well') = 'number' order by x.id limit 1;
    v_before := case when v_first.what is null then v_well
                     when v_first.what = 'pour' then (v_first.doc->>'well')::integer - floor(v_first.n)::integer
                     else (v_first.doc->>'well')::integer + 1 end;
    if v_before > 0 then insert into public.town_well_water (member_id, buckets) values (null, v_before); end if;
    for d in select x.* from public.town_deeds x where x.what in ('pour', 'fill', 'water') order by x.id loop
      begin
        perform town.well_seen(d.member_id, round(extract(epoch from d.at) * 1000)::bigint, d.what, d.thing, d.n, d.doc);
      exception when others then
        raise warning 'the well''s book could not read line %: %', d.id, sqlerrm;
      end;
    end loop;
    v_has := coalesce((select sum(w.buckets) from public.town_well_water w), 0)::integer;
    if v_has < v_well then
      insert into public.town_well_water (member_id, buckets) values (null, v_well - v_has);
    end if;
    while v_has > v_well loop
      select w.id, w.buckets into v_lot from public.town_well_water w order by w.id limit 1;
      exit when v_lot.id is null;
      if v_lot.buckets > v_has - v_well then
        update public.town_well_water w set buckets = w.buckets - (v_has - v_well) where w.id = v_lot.id;
        v_has := v_well;
      else
        delete from public.town_well_water w where w.id = v_lot.id;
        v_has := v_has - v_lot.buckets;
      end if;
    end loop;
    insert into public.town_well_kept (upto) values (coalesce((select max(x.id) from public.town_deeds x), 0));
  end if;
  drop trigger if exists town_deeds_well on public.town_deeds;
  create trigger town_deeds_well after insert on public.town_deeds
    for each row when (new.what in ('pour', 'fill', 'water')) execute function town.well_deed();
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) filter (where c.relrowsecurity) as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name like 'town\_well%' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relname in ('town_well_water', 'town_well_cans', 'town_carriers', 'town_well_reach', 'town_well_kept') and c.relnamespace = 'public'::regnamespace;
--   -- 5 | 0
--
--   select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_well%' order by 1;
--   -- town_well | f | t      town_well_ranks | f | t      town_well_take | f | t
--
--   select tgname, tgenabled from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal;
--   -- town_deeds_well | O
--
--   select town.cat('well') as well, town.cat('farming')->'buckets' as buckets, town.cat('items')->'waterYoke' as yoke;
--   -- {"gifts": [[1, "waterYoke"], [3, "waterYokeGreat"]], "ranks": [50, 200, 600], "listed": 40}
--   --   | {"bucket": 1, "waterYoke": 2, "bucketIron": 2, "waterYokeGreat": 4} | {"kind": "tool", "pays": 0, "tier": 1, "stack": 1}
--
--   select town.deed_th('gift') as gift, town.deed_th('pour') as pour, town.deed_th('something new') as unknown;
--   -- รับของที่บ่อน้ำฝากไว้ให้ | เทน้ำลงบ่อ | something new
--
--   -- the book's count of the well's water is the well's own
--   select (select coalesce(sum(buckets), 0) from public.town_well_water) as followed, (select doc from public.town_things where key = 'well') as well;
--   -- the same number twice
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- every carrier, by what they have poured all told, with their rank
--   select p.character_name, c.buckets, town.well_rank(c.buckets) as rank, c.taken
--     from public.town_carriers c join public.profiles p on p.id = c.member_id order by c.buckets desc;
--
--   -- whose water is in the well now, the oldest first
--   select w.id, p.character_name, w.buckets from public.town_well_water w left join public.profiles p on p.id = w.member_id order by w.id;
--
--   -- what came of each carrier's water, day by day
--   select r.day, p.character_name, sum(r.n) as waterings, count(*) as plants, count(distinct r.owner) as people
--     from public.town_well_reach r join public.profiles p on p.id = r.carrier group by 1, 2 order by 1 desc, 3 desc;
