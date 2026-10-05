-- v130 — a hot afternoon, a bucket over a bed, and the yard's water jar
--
-- Run this once in the Supabase SQL editor, after v129. Running it again is
-- safe.
--
-- The third round for the members who carry water for the others (the owner,
-- 2026-10-05: of nine things thought of for them he took all nine). v127 made
-- them seen and v129 let the others answer; this gives their water more to
-- do. Three things:
--
--   · **A hot afternoon.** From noon to four (Bangkok), under a clear sky, a
--     watering does as much again: with a can, with a bucket, by anybody.
--     Nothing dies of the heat and a plant nobody waters loses nothing. At
--     most four waterings' worth more in a day (two hours of growth with a
--     plain can), for a plant watered on every hour of such an afternoon.
--   · **A bucket poured over a bed.** Standing on a plot with a bucket that
--     has water in it: each bucketful waters eight of that bed's plants that
--     could do with water, the nearest first. Anybody's bed. Plain water (no
--     can's bonus, nor a meal's), three stamina a bucketful. It is the water
--     a plain can would have had of that bucketful; what it spares is the
--     walking to the well and five of the eight stamina.
--   · **The cooking yard's water jar.** The jar by the washing tub holds ten
--     bucketfuls. Anybody pours a bucket in, standing by it. A pot cooked
--     while it has water takes a bucketful and comes with a helping more:
--     never the odd dish, never what is roasted on a skewer. With the jar
--     empty everything is cooked as it always was.
--
-- And one thing of their last round, which is the catalog's alone:
--
--   · **A water cart.** Between its two yokes the well has a cart for the
--     second rank: six bucketfuls. To every function there is it is a
--     bucket (what a thing is, what it carries and what the well gives are
--     read from the catalog), so nothing is written for it: three rows are
--     written over, `items` (the thing), `farming` (what it carries) and
--     `well` (the rank it is given at). Whoever passed that rank before
--     finds it waiting. That it is slow for one and not for two is the
--     page's own (lib/town/cart.ts): where anybody walks is not kept here.
--
-- **None of the game's functions is written again.** How each is done:
--
--   · the heat is a trigger on `town_plots`: a row written with
--     `plant.watered` equal to `changed`, and later than it was, is a
--     watering, and what it added is added once more when it is hot. So
--     whatever waters a plant is counted alike, and `town.water` is as it
--     was. (`town_tend` answers with the plot as the rule made it, before
--     the row is kept: the page reads the farm again after a watering in the
--     heat.)
--   · the bucket over a bed is a function of its own, `town_ditch(x, y)`,
--     under the same lock on the bed as `town_tend`;
--   · the jar's helping is a trigger on `town_plays`: `town_cook` keeps the
--     cook's purse and then writes the cooking down, and as that line is
--     written the pot in the purse is given its helping. **It can never undo
--     a dish**: whatever goes wrong in it is swallowed. (Should `town_cook`
--     ever come to write the cooking down before it keeps the purse, the
--     helping would be written over, the water spent for nothing: the dry
--     run's check of a soup cooked with water says so.)
--
-- The well's book follows the new water (v127's and v129's own, written
-- again): a bucket over a bed is written as one line, `ditch`, and then a
-- `water` line a plant, so that the book, the thanks and the jar at the well
-- count each of those waterings as they count a can's, and the water as the
-- pourer's own; it counts towards their rank. A bucket into the yard's jar is
-- a line `yard`, kept lot by lot like the well's water (`town_yard_water`);
-- a pot cooked with it is a line `fresh` by the cook, and a line of what came
-- of that carrier's water (`town_yard_reach`), which the book tells them.
--
-- The rules are lib/town/heat.ts, ditch.ts and yard.ts written again, held to
-- the code case by case by the dry run; their numbers are the catalog's rows
-- `heat`, `ditch` and `yard`. The three rows written over are whole rows, as
-- the code has them (lib/town/catalog.ts): the dry run holds each to what it
-- was but for the cart.
--
-- **The code goes out before this file**: a page built before knows of no
-- jar, offers no pour over a bed and shows no heat (and loses nothing by it).

/* ── v129 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regclass('public.town_plot_help') is null or to_regprocedure('town.jar_work(integer, integer)') is null then
    raise exception 'v129 has not run yet: this round stands on the well''s book, the thanks and the jar';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v130> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('heat', $town${
    "from": 12,
    "to": 16,
    "skies": ["clear"],
    "by": 1
  }$town$::jsonb),
  ('ditch', $town${
    "plants": 8,
    "cost": 3
  }$town$::jsonb),
  ('yard', $town${
    "holds": 10,
    "gives": 1,
    "cost": 1,
    "dry": ["skewer"],
    "at": [[46,38],[45,39],[44,40],[48,41],[49,41],[47,42],[48,42]]
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
    "buckets": {"bucket":1,"bucketIron":2,"waterYoke":2,"waterYokeGreat":4,"waterCart":6},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb),
  ('well', $town${
    "ranks": [50,200,600],
    "gifts": [[1,"waterYoke"],[2,"waterCart"],[3,"waterYokeGreat"]],
    "listed": 40
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v130>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The bucketfuls in the yard's jar: one number, like the well's.
insert into public.town_things (key, doc) values ('yard', '0'::jsonb) on conflict (key) do nothing;

-- The jar's water, the oldest first: whose each lot is, and how many
-- bucketfuls of it are left. A lot taken to its last bucketful is gone.
create table if not exists public.town_yard_water (
  id        bigint generated always as identity primary key,
  member_id uuid references public.profiles (id) on delete set null,
  buckets   integer not null check (buckets > 0)
);
create index if not exists town_yard_water_member on public.town_yard_water (member_id) where member_id is not null;

-- What came of a carrier's water in the yard: a line to a day of the game's
-- (from dawn), a carrier and a cook, with how many pots. A week is kept.
create table if not exists public.town_yard_reach (
  day     integer not null,
  carrier uuid not null references public.profiles (id) on delete cascade,
  cook    uuid not null references public.profiles (id) on delete cascade,
  n       integer not null default 0,
  primary key (day, carrier, cook)
);
create index if not exists town_yard_reach_cook on public.town_yard_reach (cook);

alter table public.town_yard_water enable row level security;
alter table public.town_yard_reach enable row level security;
revoke all on public.town_yard_water, public.town_yard_reach from anon, authenticated;

/* ── a hot afternoon: lib/town/heat.ts, written again ────────────────────── */

-- Whether it is hot at a moment: within the hours, under a sky that is one of
-- the hot ones. A quarter hour nobody has written the weather of is not.
create or replace function town.hot(p_now bigint)
returns boolean language sql stable set search_path = public
as $$
  select exists (
    select 1 from public.town_weather w, (select town.cat('heat') as k) h
     where w.slot = floor(p_now::numeric / 900000)::bigint and h.k->'skies' ? w.sky
       and town.hour_at(p_now) >= (h.k->>'from')::double precision and town.hour_at(p_now) < (h.k->>'to')::double precision)
$$;

-- A plot as it is kept: when what is written is a watering (the same plant,
-- watered at this moment and not before) and it is hot, what the watering
-- added is added once more. Whatever goes wrong here, the row is kept as it
-- was written.
create or replace function town.plot_heat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  added double precision;
begin
  begin
    if new.plant is not null and old.plant is not null and jsonb_typeof(new.plant) = 'object' and jsonb_typeof(old.plant) = 'object'
       and (new.plant->>'sown') = (old.plant->>'sown')
       and (new.plant->>'watered')::bigint = new.changed and (old.plant->>'watered')::bigint < new.changed then
      added := (new.plant->>'boost')::double precision - (old.plant->>'boost')::double precision;
      if added > 0 and town.hot(new.changed) then
        new.plant := new.plant || jsonb_build_object('boost', (new.plant->>'boost')::double precision + added * (town.cat('heat')->>'by')::double precision);
      end if;
    end if;
  exception when others then
    raise warning 'the heat missed plot %,%: %', new.x, new.y, sqlerrm;
  end;
  return new;
end;
$$;

/* ── a bucket over a bed: lib/town/ditch.ts, written again ───────────────── */

-- Pour the bucket in the hand over a bed, from a tile of it. `p_bed` is every
-- plot of that bed that is not weeds, by its tile. Each bucketful waters so
-- many of the plants a can could water now, the nearest first (then the one
-- further up the map, then further left), with plain water.
create or replace function town.ditch(p_purse jsonb, p_bed jsonb, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  d jsonb := town.cat('ditch');
  hand text := town.hand_of(p_purse);
  slot integer;
  has integer;
  keys text[];
  k text;
  p jsonb;
  used integer;
  plots jsonb := '{}'::jsonb;
begin
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, has from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  select array_agg(q.key order by q.far, q.y, q.x) into keys
    from (
      select e.key, t.x, t.y, (t.x - p_x) * (t.x - p_x) + (t.y - p_y) * (t.y - p_y) as far
        from jsonb_each(p_bed) e, lateral (select split_part(e.key, ',', 1)::int as x, split_part(e.key, ',', 2)::int as y) t
       where town.deed_for(e.key, e.value, 'can', '', p_now, null) = 'water'
       order by far, t.y, t.x
       limit has * (d->>'plants')::int
    ) q;
  if keys is null then
    return town.no(case when exists (
      select 1 from jsonb_each(p_bed) e, lateral (select town.see(e.key, e.value, p_now) as s) z
       where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (z.s->>'dead')::boolean and (z.s->>'wet')::boolean) then 'wet' else 'soil' end);
  end if;
  used := ceil(array_length(keys, 1)::numeric / (d->>'plants')::numeric)::int;
  foreach k in array keys loop
    p := p_bed->k->'plant';
    plots := plots || jsonb_build_object(k, (p_bed->k) || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + (f->'water'->>'adds')::double precision * 60000::double precision)));
  end loop;
  return jsonb_build_object('ok', true, 'used', used, 'watered', to_jsonb(keys), 'plots', plots,
    'purse', town.spend(p_purse, (d->>'cost')::double precision * used, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
           case when has > used then jsonb_build_object('item', hand, 'n', 1, 'water', has - used) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$$;

/* ── the yard's jar: lib/town/yard.ts, written again ─────────────────────── */

-- Pour the bucket in the hand into the jar: as much of it as the jar has room
-- for; the rest stays in the bucket.
create or replace function town.yard_pour(p_purse jsonb, p_jar integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  y jsonb := town.cat('yard');
  hand text := town.hand_of(p_purse);
  slot integer;
  has integer;
  pours integer;
begin
  if hand is null or not (town.cat('farming')->'buckets' ? hand) or p_jar >= (y->>'holds')::int then return town.no('none'); end if;
  select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('none'); end if;
  pours := least(has, (y->>'holds')::int - p_jar);
  return jsonb_build_object('ok', true, 'jar', p_jar + pours, 'poured', pours,
    'purse', town.spend(p_purse, (y->>'cost')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
           case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$$;

-- Whether what was cooked takes the jar's water: a dish that is somebody's
-- recipe, none of whose cookware is of the dry kind.
create or replace function town.takes_water(p_made text)
returns boolean language sql stable
as $$
  select p_made is not null and c.dishes ? p_made and p_made <> c.odd and coalesce(c.dishes->p_made->'recipe', 'null'::jsonb) <> 'null'::jsonb
     and not exists (select 1 from jsonb_array_elements_text(c.dishes->p_made->'recipe'->'in') w where town.cat('yard')->'dry' ? w)
    from (select town.cat('dishes') as dishes, town.cat('cooking')->>'oddDish' as odd) c
$$;

-- A purse just after something was cooked, and the jar: when what was cooked
-- takes water and the jar has some, the pot of it in the bag (the first, of
-- several of that dish) has so many helpings more and the jar a bucketful
-- less.
create or replace function town.yard_freshen(p_purse jsonb, p_made text, p_jar integer)
returns jsonb language plpgsql stable
as $$
declare
  slot integer;
begin
  if not coalesce(town.takes_water(p_made), false) or coalesce(p_jar, 0) < 1 then return jsonb_build_object('purse', p_purse, 'jar', p_jar, 'fresh', false); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality s(v, ord)
   where s.v->>'item' = 'potFull' and s.v->'of'->>'dish' = p_made order by s.ord limit 1;
  if slot is null then return jsonb_build_object('purse', p_purse, 'jar', p_jar, 'fresh', false); end if;
  return jsonb_build_object('fresh', true, 'jar', p_jar - 1,
    'purse', jsonb_set(p_purse, array['bag', slot::text, 'of', 'left'], to_jsonb((p_purse->'bag'->slot->'of'->>'left')::int + (town.cat('yard')->>'gives')::int)));
end;
$$;

-- The trigger's own: as a cooking is written down, the pot just kept in the
-- cook's purse is given the jar's helping. Never undoes a dish: whatever goes
-- wrong here is a helping missed.
create or replace function town.yard_fresh()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  dish text := new.doc->>'what';
  jar integer;
  doc jsonb;
  did jsonb;
begin
  begin
    if new.member_id is null or not coalesce(town.takes_water(dish), false) then return null; end if;
    jar := (town.thing('yard', true) #>> '{}')::integer;
    if jar is null or jar < 1 then return null; end if;
    select p.doc into doc from public.town_purses p where p.member_id = new.member_id for update;
    did := town.yard_freshen(doc, dish, jar);
    if (did->>'fresh')::boolean then
      update public.town_purses p set doc = did->'purse', updated_at = now() where p.member_id = new.member_id;
      perform town.keep_thing('yard', did->'jar');
      perform town.note(new.member_id, 'fresh', dish, 1, 0, jsonb_build_object('jar', did->'jar'));
    end if;
  exception when others then
    raise warning 'the yard''s jar missed play %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

/* ── the well's book: its line reader, with the three new lines ──────────── */

-- v129's, word for word but for: a bucket poured over a bed (`ditch`) counts
-- for its pourer and makes the bucket a can of their own water for the plants
-- it reached (each of which is then read as a watering); a bucket poured into
-- the yard's jar (`yard`) counts for its pourer and is a lot of the jar's
-- water; a pot cooked with the jar's water (`fresh`) takes a bucketful of the
-- oldest lot, and is a line of what came of that carrier's water when the
-- cook is somebody else.
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
  v_x integer;
  v_y integer;
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
  elsif p_what in ('ditch', 'yard') then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 or (p_what = 'ditch' and p_thing is null) then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    if p_what = 'ditch' then
      insert into public.town_well_cans (member_id, item, carrier, waterings)
        values (p_member, p_thing, p_member, greatest(0, floor(coalesce((p_doc->>'plants')::numeric, 0))::integer))
        on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
    else
      insert into public.town_yard_water (member_id, buckets) values (p_member, v_n);
    end if;
  elsif p_what = 'fresh' then
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_yard_water w order by w.id limit 1 for update;
    if v_lot is null then return; end if;
    if v_lot_has > 1 then update public.town_yard_water w set buckets = w.buckets - 1 where w.id = v_lot;
    else delete from public.town_yard_water w where w.id = v_lot; end if;
    if v_lot_by is null or v_lot_by = p_member then return; end if;
    insert into public.town_yard_reach (day, carrier, cook, n) values (town.day_of(p_at), v_lot_by, p_member, 1)
      on conflict (day, carrier, cook) do update set n = public.town_yard_reach.n + 1;
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
    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);
    if jsonb_typeof(p_doc->'tile') = 'array' then
      v_x := (p_doc->'tile'->>0)::integer;
      v_y := (p_doc->'tile'->>1)::integer;
    end if;
    if v_owner <> p_member and v_x is not null then
      -- (a plant of somebody else's than the one the plot's helpers helped: theirs are forgotten)
      delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
      insert into public.town_plot_help (x, y, helper, owner, water) values (v_x, v_y, p_member, v_owner, 1)
        on conflict (x, y, helper) do update set water = public.town_plot_help.water + 1;
    end if;
    v_can := p_doc->>'with';
    if v_can is null then return; end if;
    select c.carrier, c.waterings into v_carrier, v_waterings from public.town_well_cans c where c.member_id = p_member and c.item = v_can for update;
    if v_waterings is null or v_waterings <= 0 then return; end if;
    update public.town_well_cans c set waterings = c.waterings - 1 where c.member_id = p_member and c.item = v_can;
    if v_carrier is null or v_carrier = v_owner or v_x is null then return; end if;
    insert into public.town_well_reach (day, carrier, x, y, owner, n)
      values (town.day_of(p_at), v_carrier, v_x, v_y, v_owner, 1)
      on conflict (day, carrier, x, y) do update set n = public.town_well_reach.n + 1, owner = excluded.owner;
    delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
    insert into public.town_plot_help (x, y, helper, owner, carry) values (v_x, v_y, v_carrier, v_owner, 1)
      on conflict (x, y, helper) do update set carry = public.town_plot_help.carry + 1;
  elsif p_what = 'sow' then
    if jsonb_typeof(p_doc->'tile') = 'array' then
      delete from public.town_plot_help h where h.x = (p_doc->'tile'->>0)::integer and h.y = (p_doc->'tile'->>1)::integer;
    end if;
  end if;
end;
$$;

-- The book as a member reads it (v127's), but for: the bucketfuls carried
-- today, and today's carriers, count a bucket poured over a bed and one
-- poured into the yard's jar with those poured into the well; and, when there
-- are any, the pots cooked with my water today, and for how many cooks.
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
  v_pots integer;
  v_cooks integer;
  v_carriers jsonb;
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = p_member;
  v_buckets := coalesce(v_buckets, 0);
  v_taken := coalesce(v_taken, '{}');
  select coalesce(sum(floor(d.n)), 0)::integer into v_today
    from public.town_deeds d where d.member_id = p_member and d.at >= v_from and d.at < v_till and d.n >= 1
     and (d.what in ('pour', 'yard') or (d.what = 'ditch' and d.thing is not null));
  select coalesce(sum(r.n), 0)::integer, count(*)::integer, count(distinct r.owner)::integer into v_waterings, v_plants, v_people
    from public.town_well_reach r where r.day = v_day and r.carrier = p_member;
  select count(*)::integer, count(distinct d.doc->>'whose')::integer into v_watered, v_helped
    from public.town_deeds d where d.member_id = p_member and d.what = 'water' and d.at >= v_from and d.at < v_till and d.doc ? 'whose';
  select coalesce(sum(r.n), 0)::integer, count(*)::integer into v_pots, v_cooks
    from public.town_yard_reach r where r.day = v_day and r.carrier = p_member;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name, 'buckets', q.buckets, 'rank', town.well_rank(q.total)) order by q.first_at, q.id_text), '[]'::jsonb)
    into v_carriers
    from (
      select t.member_id, t.buckets, t.first_at, t.member_id::text collate "C" as id_text,
             coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name, coalesce(c.buckets, 0) as total
        from (select d.member_id, sum(floor(d.n))::integer as buckets, min(d.at) as first_at
                from public.town_deeds d
               where d.at >= v_from and d.at < v_till and d.n >= 1 and d.member_id is not null
                 and (d.what in ('pour', 'yard') or (d.what = 'ditch' and d.thing is not null))
               group by d.member_id) t
        join public.profiles pr on pr.id = t.member_id
        left join public.town_carriers c on c.member_id = t.member_id
       order by t.first_at, t.member_id::text collate "C"
       limit (w->>'listed')::integer
    ) q;
  return jsonb_build_object(
    'buckets', v_buckets, 'rank', town.well_rank(v_buckets), 'towards', town.well_towards(v_buckets), 'gift', town.well_due(v_buckets, v_taken) is not null,
    'today', jsonb_build_object('buckets', v_today, 'waterings', v_waterings, 'plants', v_plants, 'people', v_people, 'watered', v_watered, 'helped', v_helped)
      || case when v_cooks > 0 then jsonb_build_object('pots', v_pots, 'cooks', v_cooks) else '{}'::jsonb end,
    'carriers', v_carriers);
end;
$$;

-- What each did for the others between two rounds (v129's), but for: a
-- bucketful poured into the yard's jar counts as one poured into the well
-- does. (A bucket poured over a bed is counted by the waterings it is.)
create or replace function town.jar_work(p_from integer, p_to integer)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_array(q.member_id, q.w) order by q.id_text), '[]'::jsonb)
    from (
      select d.member_id, d.member_id::text collate "C" as id_text,
             sum(case when d.what in ('pour', 'yard') then floor(d.n) * (town.cat('jar')->>'bucket')::integer else 1 end)::integer as w
        from public.town_deeds d
       where d.at >= to_timestamp(town.round_from(p_from) / 1000.0) and d.at < to_timestamp(town.round_from(p_to) / 1000.0)
         and d.member_id is not null
         and ((d.what in ('pour', 'yard') and d.n >= 1) or (d.what = 'water' and d.doc ? 'whose'))
       group by d.member_id
    ) q
   where q.w > 0
$$;

-- The tally's words for the three new lines: `town.deed_th` as it stands,
-- with three `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('ditch') = 'ditch' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''ditch'' then ''เทน้ำรดทั้งแปลง'' when ''yard'' then ''เทน้ำใส่โอ่งที่ลานครัว'' when ''fresh'' then ''หม้อได้น้ำจากโอ่ง'' else p_what end');
  end if;
end $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- Pour the bucket in my hand over the bed I stand in, from the plot at a tile.
create or replace function public.town_ditch(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  hand text := town.hand_of(purse);
  bed jsonb;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
  was jsonb;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed, as every deed there
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  did := town.ditch(purse, bed, p_x, p_y, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  -- (the bucketfuls first, then a watering a plant: the well's book reads them in this order)
  perform town.note(me, 'ditch', hand, (did->>'used')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n, 'plants', jsonb_array_length(did->'watered')));
  for k in select jsonb_array_elements_text(did->'watered') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    was := bed->k->'plant';
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
    perform town.note(me, 'water', was->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'ditch', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_
   where b.bed = bed_n and b.member_id = me
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty), true, now_) = me::text;
  -- (the plots as they are kept: with what the heat added, if it is hot)
  return town.answer(me, did - 'plots') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n and did->'watered' ? (p.x::text || ',' || p.y::text)));
end;
$$;

-- The yard's jar, as it stands.
create or replace function public.town_yard()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'yard', jsonb_build_object('jar', coalesce((town.thing('yard', false) #>> '{}')::integer, 0)));
end;
$$;

-- Pour the bucket in my hand into the yard's jar, standing by it.
create or replace function public.town_yard_pour(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  hand text := town.hand_of(purse);
  jar integer;
  did jsonb;
begin
  if p_x is null or p_y is null or not exists (
       select 1 from jsonb_array_elements(town.cat('yard')->'at') t where (t->>0)::integer = p_x and (t->>1)::integer = p_y) then
    return town.answer(me, town.no('none'));
  end if;
  jar := coalesce((town.thing('yard', true) #>> '{}')::integer, 0);
  did := town.yard_pour(purse, jar, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('yard', did->'jar');
    perform town.note(me, 'yard', hand, (did->>'poured')::numeric, 0, jsonb_build_object('jar', did->'jar'));
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('yard', jsonb_build_object('jar', coalesce((did->>'jar')::integer, jar)));
end;
$$;

-- The well's book, as I read it (v129's): what the book no longer reads of
-- the yard is thrown away with the rest.
create or replace function public.town_well()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  -- (what the book no longer reads is thrown away as it is opened: a week of days is kept)
  delete from public.town_well_reach r where r.day < town.day_of(now_) - 7;
  delete from public.town_yard_reach r where r.day < town.day_of(now_) - 7;
  perform town.jar_now(now_);
  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_, 'thanks', town.thanks_board(me, now_), 'jar', town.jar_told(me, now_));
end;
$$;

-- Everybody who has a rank, and who has thanked me today (v129's); and the
-- yard's jar, which is how a page comes to know that there is one.
create or replace function public.town_well_ranks()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(),
    'ranks', (select coalesce(jsonb_object_agg(c.member_id::text, town.well_rank(c.buckets)), '{}'::jsonb)
                from public.town_carriers c where town.well_rank(c.buckets) > 0),
    'thanked', town.thanks_board(me, town.now_ms())->'today',
    'yard', jsonb_build_object('jar', coalesce((select (t.doc #>> '{}')::integer from public.town_things t where t.key = 'yard'), 0)));
end;
$$;

revoke execute on function public.town_ditch(integer, integer) from public, anon;
revoke execute on function public.town_yard() from public, anon;
revoke execute on function public.town_yard_pour(integer, integer) from public, anon;
revoke execute on function public.town_well() from public, anon;
revoke execute on function public.town_well_ranks() from public, anon;
grant execute on function public.town_ditch(integer, integer) to authenticated;
grant execute on function public.town_yard() to authenticated;
grant execute on function public.town_yard_pour(integer, integer) to authenticated;
grant execute on function public.town_well() to authenticated;
grant execute on function public.town_well_ranks() to authenticated;

/* ── the triggers ────────────────────────────────────────────────────────── */

do $$
begin
  drop trigger if exists town_plots_heat on public.town_plots;
  create trigger town_plots_heat before update on public.town_plots
    for each row execute function town.plot_heat();
  drop trigger if exists town_plays_yard on public.town_plays;
  create trigger town_plays_yard after insert on public.town_plays
    for each row when (new.game = 'cooking') execute function town.yard_fresh();
  lock table public.town_deeds in share row exclusive mode;
  drop trigger if exists town_deeds_well on public.town_deeds;
  create trigger town_deeds_well after insert on public.town_deeds
    for each row when (new.what in ('pour', 'fill', 'water', 'sow', 'ditch', 'yard', 'fresh')) execute function town.well_deed();
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) filter (where c.relrowsecurity) as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name in ('town_yard_water', 'town_yard_reach') and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relname in ('town_yard_water', 'town_yard_reach') and c.relnamespace = 'public'::regnamespace;
--   -- 2 | 0
--
--   select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_ditch', 'town_yard', 'town_yard_pour') order by 1;
--   -- town_ditch | f | t      town_yard | f | t      town_yard_pour | f | t
--
--   select c.relname, t.tgname, t.tgenabled from pg_trigger t join pg_class c on c.oid = t.tgrelid
--    where t.tgname in ('town_plots_heat', 'town_plays_yard', 'town_deeds_well') order by 1;
--   -- town_deeds | town_deeds_well | O      town_plays | town_plays_yard | O      town_plots | town_plots_heat | O
--
--   select town.cat('heat') as heat, town.cat('ditch') as ditch, town.cat('yard')->'holds' as holds, jsonb_array_length(town.cat('yard')->'at') as tiles;
--   -- {"by": 1, "to": 16, "from": 12, "skies": ["clear"]} | {"cost": 3, "plants": 8} | 10 | 7
--
--   select town.cat('well')->'gifts' as gifts, town.cat('farming')->'buckets'->'waterCart' as holds, town.cat('items')->'waterCart' as cart;
--   -- [[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]] | 6 | {"kind": "tool", "pays": 0, "tier": 1, "stack": 1}
--
--   select town.deed_th('ditch') as ditch, town.deed_th('yard') as yard, town.deed_th('fresh') as fresh, town.deed_th('thank') as thank;
--   -- เทน้ำรดทั้งแปลง | เทน้ำใส่โอ่งที่ลานครัว | หม้อได้น้ำจากโอ่ง | ขอบคุณคนที่ช่วยดูแลผัก
--
--   select town.hot(town.now_ms()) as hot_now, (select doc from public.town_things where key = 'yard') as jar;
--   -- t between noon and four under a clear sky, f otherwise | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- whose water is in the yard's jar now, the oldest first
--   select w.id, p.character_name, w.buckets from public.town_yard_water w left join public.profiles p on p.id = w.member_id order by w.id;
--
--   -- whose pots were cooked with whose water, day by day
--   select r.day, c.character_name as carrier, k.character_name as cook, r.n
--     from public.town_yard_reach r join public.profiles c on c.id = r.carrier join public.profiles k on k.id = r.cook order by 1 desc, 4 desc;
--
--   -- every bucket poured over a bed: who, how many bucketfuls, how many plants
--   select d.at, p.character_name, d.thing, d.n, d.doc->>'plants' as plants from public.town_deeds d join public.profiles p on p.id = d.member_id
--    where d.what = 'ditch' order by d.id desc limit 50;
