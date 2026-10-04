-- v122 — twenty fish from other waters
--
-- Run this once in the Supabase SQL editor, after v121, AND ONLY ONCE THE
-- SITE'S OWN CODE FOR IT IS LIVE (see "the order" below). Running it again
-- is safe (see the note on numbers changed by hand).
--
-- Why. The owner asked for twenty more fish of the early game
-- (2026-10-05): "ช่วยเพิ่มปลาขั้นแรก ไปอีก 20 แบบ ไม่จำเป้นต้องเป็นปลาไทย เป้นปลาประเทศอื่น
-- หรือ แฟนตาซี หน่อยก็ได้", and then: "โดยแต่ละปลามีเงื่อนไขในการเจอ และ วัตถุประสงค์ในการใช้
-- งาน ที่แตกต่างกันด้วย". So: sixteen fish of other rivers and four of no river,
-- each found its own way and each good for something of its own.
--
--   off the bank only (the shallows had only the deck's common fish):
--     loach         all hours, three times as readily in rain     a live bait for the hunters
--     mosquitofish  by day                                        put on a plant: no pests for a day
--     mussel        all hours, on dough                           two shells make a bowl
--     crayfish      by night                                      a crawfish boil, by two cooks
--     goldfish      by day, at the weekend                        sells dear
--   from anywhere:
--     carp          by day, on dough or corn                      the uncle asks for it; masgouf
--   off the deck only:
--     piranha       by day, on a fish for bait                    piranha soup
--     herring       before dawn to eight                          put on a plant: it grows faster
--     archerfish    by day, never in rain                         put on a plant: rids it of a pest
--     pacu          late morning to afternoon, on dough           opened: a seed in its belly
--     pike          early and late, on a fish                     ukha
--     nilePerch     midday, on a loach, never in rain             thieboudienne
--     salmon        only in rain                                  salmon steak
--     wels          deep night, on a fish                         opened: a recipe scroll
--     gar           the evening, on a fish                        its scale makes a hook
--     arapaima      dawn and dusk, on a loach only (a legend)     roasted whole by three, for ten
--   of no river, each waiting for a sign:
--     dozyFish      whoever fishes has no stamina left            eaten as it is: stamina
--     popotoFish    three are fishing at once                     fish and chips
--     rainbowFish   the rain stopped within the half hour         eaten as it is: the lucky buff
--     moonFish      the moon is full, by night                    its scale makes a float
--
-- Nothing on the screen says any of it. A fish's line says what it looks
-- like and, here and there, how it behaves; the uncle has heard things and
-- will ask for six of the plain ones in his orders.
--
-- What it changes:
--
--   · ten rows of `town_catalog`, written over (items, fish, fishing,
--     dishes, scrolls, makes, cooking, farming, order, hints): the twenty
--     fish, a hook and a float made of two of them, eight dishes with a
--     scroll each, ten things to eat more, three made by hand more, three
--     things more that are put on a plant, a bait more, six fish more the
--     uncle may ask for, and eleven hints more (sold after the rest of the
--     early game's, so that the ones he sells now come in the order they
--     did). The catfish takes a loach as it takes a minnow. Nothing else
--     of what was there is touched: no price, no recipe, no wait.
--
--   · `town.odds`, written again with one argument more and three lines: a
--     fish may say which water it keeps to (`water`: the bank or the deck),
--     what a dry sky does to it (`dry`: 0 for one that bites only in rain),
--     and what it waits for (`needs`: every sign of it must hold). A fish
--     that says none of these is weighed exactly as before: every case of
--     the old rule is put to the new one in the dry run.
--
--   · `town.signs_of`, new: which signs hold as a line is dropped. Tired:
--     no stamina left. A crowd: two others have dropped a line within five
--     minutes (of the game's first 266 lines, 41 were dropped so). The
--     weekend: Saturday or Sunday in Bangkok. After the rain: none now, and
--     some within the half hour, by `town_weather`. A full moon: within a
--     day and a half of it, by the moon's mean month (three nights of each
--     month). The numbers are in `fishing.signs`.
--
--   · `town.cast_line`, with the signs handed on to `town.odds`; and
--     `town_cast`, v121's word for word but for working the signs out and
--     writing them beside the deed. Its arguments are as they were, so a
--     page loaded before this is answered as before.
--
-- What it does not change: every other rule. The three fish that are put on
-- a plant are in `farming.tools`, which `town.feed` and `town.cure` have
-- read since v110 (they take from the bag whatever was in the hand); what
-- is inside a wels or a pacu is in `cooking.inside`, which `town.open` has
-- read since v111; the two fish that are eaten are dishes among the things
-- (`items`: kind `dish`), which is all `town.sit_down` asks.
--
-- THE ORDER. The site's code goes out first, and this file only once that
-- deploy is live. A page built before the code knows nothing of the new
-- things: one of them in its bag, in a deal or in the uncle's order and it
-- cannot be drawn. So members who have had the town open since before the
-- deploy have to load the page again, as after v117. The other way round
-- is safe: with the code live and this not run, nothing new comes up.
--
-- NUMBERS CHANGED BY HAND. This file writes the ten rows OVER, whole, as
-- v117 and v120 did with theirs: that is its purpose. Before it was written
-- the eighteen live rows were compared entry by entry with what the code
-- gave before this change: every one the same. So of the whole catalog 91
-- entries differ after it, every one of them something added but the
-- catfish (its baits) and the lists the new things are in. Nobody has
-- changed these rows by hand. If that is ever not so, the query under
-- "Before running it" says when each was last touched: look before running
-- it again. The other eight rows are not touched, here or by running it
-- twice.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v122> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
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
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1},"hours":[[5,22]],"rain":1,"wait":[3,15],"size":[4,8],"effort":2,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,22],"effort":3,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8},"hours":[[7,17]],"rain":1,"wait":[5,28],"size":[18,32],"effort":4,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1},"hours":[[5,20]],"rain":1.3,"wait":[5,25],"size":[10,18],"effort":4,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"loach":0.5,"dough":0.3},"hours":[[18,24],[0,6]],"rain":2,"wait":[8,35],"size":[25,45],"effort":5,"line":1},
    "pangasius": {"tier":"uncommon","baits":{"dough":1,"corn":1},"hours":[[8,17]],"rain":1,"wait":[10,50],"size":[50,90],"effort":7,"line":1.3},
    "snakehead": {"tier":"uncommon","baits":{"minnow":1,"worm":0.3},"hours":[[5,8],[17,20]],"rain":1.2,"wait":[13,55],"size":[35,70],"effort":7,"line":1.1},
    "eel": {"tier":"uncommon","baits":{"worm":1},"hours":[[19,24],[0,5]],"rain":2.5,"wait":[13,55],"size":[40,80],"effort":6,"line":1},
    "prawn": {"tier":"uncommon","baits":{"worm":0.8,"dough":0.6},"hours":[[17,24]],"rain":1,"wait":[10,45],"size":[14,28],"effort":4,"line":0.7},
    "featherback": {"tier":"rare","baits":{"minnow":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[45,85],"effort":8,"line":1.2},
    "goby": {"tier":"rare","baits":{"minnow":1,"worm":0.7},"hours":[[20,24],[0,4]],"rain":1,"wait":[23,90],"size":[25,50],"effort":8,"line":1.1},
    "gourami": {"tier":"common","baits":{"branBait":1,"cricket":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,20],"effort":3,"line":0.8},
    "crab": {"tier":"common","baits":{"shrimpLive":1,"branBait":0.5},"hours":[[17,24],[0,6]],"rain":1.5,"wait":[5,25],"size":[5,9],"effort":2,"line":0.5},
    "snail": {"tier":"common","baits":{"branBait":1},"hours":[[0,24]],"rain":1.2,"wait":[4,20],"size":[2,4],"effort":1,"line":0.4},
    "hampala": {"tier":"uncommon","baits":{"cricket":1,"shrimpLive":0.8},"hours":[[5,9],[16,19]],"rain":1,"wait":[10,45],"size":[25,50],"effort":6,"line":0.9},
    "sheatfish": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[13,55],"size":[25,45],"effort":6,"line":1},
    "bagrid": {"tier":"uncommon","baits":{"cricket":1,"branBait":0.4},"hours":[[18,24],[0,5]],"rain":2,"wait":[13,55],"size":[30,60],"effort":7,"line":1.2},
    "giantGourami": {"tier":"uncommon","baits":{"branBait":1},"hours":[[8,17]],"rain":1,"wait":[13,55],"size":[35,60],"effort":8,"line":1.4},
    "frog": {"tier":"uncommon","baits":{"cricket":1},"hours":[[18,24],[0,6]],"rain":3,"wait":[10,45],"size":[8,14],"effort":4,"line":0.6},
    "tigerfish": {"tier":"rare","baits":{"shrimpLive":1},"hours":[[5,8],[17,20]],"rain":1,"wait":[23,90],"size":[20,40],"effort":9,"line":1.1},
    "wallago": {"tier":"rare","baits":{"shrimpLive":1,"cricket":0.5},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[23,90],"size":[60,120],"effort":10,"line":1.5},
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
    "koi": {"tier":"legend","baits":{"dough":1,"corn":0.7},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[60,100],"effort":12,"line":1.5},
    "loach": {"tier":"common","baits":{"worm":1,"dough":0.5},"hours":[[0,24]],"rain":3,"wait":[4,20],"size":[8,15],"effort":2,"line":0.5,"water":"bank"},
    "mosquitofish": {"tier":"common","baits":{"dough":1,"worm":0.5},"hours":[[6,18]],"rain":1,"wait":[3,15],"size":[3,6],"effort":1,"line":0.4,"water":"bank"},
    "mussel": {"tier":"common","baits":{"dough":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[6,12],"effort":1,"line":0.4,"water":"bank"},
    "crayfish": {"tier":"common","baits":{"worm":1,"minnow":0.5},"hours":[[18,24],[0,5]],"rain":1.5,"wait":[5,25],"size":[7,13],"effort":3,"line":0.6,"water":"bank"},
    "goldfish": {"tier":"common","baits":{"dough":1},"hours":[[8,18]],"rain":1,"wait":[5,25],"size":[6,14],"effort":2,"line":0.5,"water":"bank","needs":["weekend"]},
    "carp": {"tier":"common","baits":{"corn":1,"dough":0.7},"hours":[[6,18]],"rain":1,"wait":[6,28],"size":[25,50],"effort":5,"line":1},
    "piranha": {"tier":"common","baits":{"minnow":1,"loach":1,"worm":0.4},"hours":[[9,17]],"rain":1,"wait":[4,20],"size":[15,30],"effort":4,"line":0.8,"water":"deck"},
    "herring": {"tier":"uncommon","baits":{"worm":1,"dough":0.6},"hours":[[4,8]],"rain":1,"wait":[8,40],"size":[18,32],"effort":4,"line":0.8},
    "archerfish": {"tier":"uncommon","baits":{"worm":1},"hours":[[8,18]],"rain":0,"wait":[10,45],"size":[10,20],"effort":4,"line":0.7},
    "pacu": {"tier":"uncommon","baits":{"dough":1,"corn":1},"hours":[[9,16]],"rain":1,"wait":[10,50],"size":[30,60],"effort":7,"line":1.2},
    "pike": {"tier":"uncommon","baits":{"minnow":1,"loach":1},"hours":[[5,9],[16,19]],"rain":1,"wait":[13,55],"size":[40,90],"effort":7,"line":1.2},
    "nilePerch": {"tier":"uncommon","baits":{"loach":1,"minnow":0.6},"hours":[[10,16]],"rain":0,"wait":[13,55],"size":[50,110],"effort":8,"line":1.4},
    "salmon": {"tier":"uncommon","baits":{"loach":1,"worm":0.6},"hours":[[0,24]],"rain":4,"wait":[10,45],"size":[45,85],"effort":7,"line":1.2,"dry":0},
    "wels": {"tier":"rare","baits":{"minnow":1,"loach":1},"hours":[[21,24],[0,4]],"rain":2,"wait":[18,75],"size":[80,180],"effort":9,"line":1.5},
    "gar": {"tier":"rare","baits":{"loach":1,"minnow":0.6},"hours":[[17,21]],"rain":1,"wait":[18,75],"size":[70,150],"effort":9,"line":1.4},
    "arapaima": {"tier":"legend","baits":{"loach":0.3},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[120,250],"effort":13,"line":1.9},
    "dozyFish": {"tier":"common","baits":{"worm":1,"dough":1},"hours":[[0,24]],"rain":1,"wait":[4,20],"size":[12,24],"effort":1,"line":0.4,"needs":["tired"]},
    "popotoFish": {"tier":"common","baits":{"worm":1,"dough":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[10,20],"effort":3,"line":0.7,"needs":["crowd"]},
    "rainbowFish": {"tier":"common","baits":{"dough":1,"worm":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[8,14],"effort":3,"line":0.6,"needs":["after"]},
    "moonFish": {"tier":"rare","baits":{"dough":1,"worm":0.6},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[20,40],"effort":7,"line":1,"needs":["full"]}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","loach","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatGlow":1.15,"floatQuill":1.25,"floatBell":1.5},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "signs": {"crowd":2,"lately":300,"after":30,"moon":1.5,"weekend":[0,6]},
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb),
  ('dishes', $town${
    "riceBox": {"stamina":15,"buff":null,"recipe":null},
    "oddDish": {"stamina":6,"buff":null,"recipe":null},
    "friedMinnow": {"stamina":20,"buff":"keen","recipe":{"needs":[["minnow",3],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "grilledFish": {"stamina":25,"buff":"calm","recipe":{"needs":[["tilapia",1],["salt",2]],"in":["grill"],"serves":2,"cooks":1}},
    "grilledCorn": {"stamina":15,"buff":null,"recipe":{"needs":[["corn",2]],"in":["grill"],"serves":2,"cooks":1}},
    "roastSweetPotato": {"stamina":18,"buff":null,"recipe":{"needs":[["sweetPotato",2]],"in":["grill"],"serves":2,"cooks":1}},
    "stirKangkong": {"stamina":22,"buff":"green","recipe":{"needs":[["kangkong",3],["chili",1],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "basilCatfish": {"stamina":35,"buff":"hearty","recipe":{"needs":[["catfish",1],["basil",2],["chili",1],["garlic",1],["rice",2]],"in":["pan"],"serves":3,"cooks":1}},
    "tomYum": {"stamina":40,"buff":"hearty","recipe":{"needs":[["snakehead",1],["tomato",2],["chili",2],["scallion",1]],"in":["pot"],"serves":4,"cooks":1}},
    "sourCurry": {"stamina":32,"buff":"calm","recipe":{"needs":[["barb",2],["daikon",1],["cabbage",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedPerch": {"stamina":28,"buff":"keen","recipe":{"needs":[["perch",2],["garlic",2],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "fishCake": {"stamina":38,"buff":"calm","recipe":{"needs":[["featherback",1],["basil",1],["chili",1],["salt",1]],"in":["pan"],"serves":4,"cooks":1}},
    "spicyEel": {"stamina":40,"buff":"hearty","recipe":{"needs":[["eel",1],["basil",2],["chili",2],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "grilledPrawn": {"stamina":30,"buff":"lucky","recipe":{"needs":[["prawn",2],["salt",1]],"in":["grill"],"serves":2,"cooks":1}},
    "steamedGoby": {"stamina":45,"buff":"lucky","recipe":{"needs":[["goby",1],["scallion",2],["fishSauce",1]],"in":["pot"],"serves":3,"cooks":1}},
    "pumpkinSoup": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["scallion",1],["salt",1]],"in":["pot"],"serves":5,"cooks":1}},
    "shabu": {"stamina":50,"buff":"lucky","recipe":{"needs":[["cabbage",1],["carrot",2],["daikon",1],["corn",1],["scallion",2],["prawn",2],["pangasius",1]],"in":["pot"],"serves":10,"cooks":3}},
    "somTam": {"stamina":30,"buff":"keen","recipe":{"needs":[["papaya",1],["lime",1],["chili",2],["longBean",1],["tomato",1],["sugar",1]],"in":["mortar"],"serves":3,"cooks":1}},
    "grilledEggplant": {"stamina":22,"buff":"calm","recipe":{"needs":[["eggplant",2],["fishSauce",1]],"in":["grill"],"serves":2,"cooks":1}},
    "tomKha": {"stamina":42,"buff":"hearty","recipe":{"needs":[["sheatfish",1],["galangal",1],["lemongrass",1],["lime",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedGourami": {"stamina":26,"buff":null,"recipe":{"needs":[["gourami",2],["oil",1],["salt",1]],"in":["wok"],"serves":2,"cooks":1}},
    "crabCurry": {"stamina":46,"buff":"lucky","recipe":{"needs":[["crab",3],["curryPaste",1],["longBean",1],["eggplant",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "steamedSheatfish": {"stamina":40,"buff":"calm","recipe":{"needs":[["sheatfish",1],["lime",2],["chili",1],["garlic",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "friedFrog": {"stamina":36,"buff":"keen","recipe":{"needs":[["frog",2],["garlic",2],["oil",1]],"in":["wok"],"serves":2,"cooks":1}},
    "laab": {"stamina":44,"buff":"hearty","recipe":{"needs":[["bagrid",1],["lime",1],["chili",1],["scallion",1],["rice",1]],"in":["cleaver","mortar"],"serves":4,"cooks":2}},
    "omelette": {"stamina":20,"buff":null,"recipe":{"needs":[["egg",2],["oil",1]],"in":["pan"],"serves":2,"cooks":1}},
    "snailCurry": {"stamina":40,"buff":"green","recipe":{"needs":[["snail",6],["curryPaste",1],["lemongrass",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "candiedPumpkin": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["sugar",2]],"in":["pot"],"serves":5,"cooks":1}},
    "friedRice": {"stamina":34,"buff":null,"recipe":{"needs":[["rice",3],["egg",1],["scallion",1],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "greenCurry": {"stamina":48,"buff":"calm","recipe":{"needs":[["featherback",1],["curryPaste",1],["coconutMilk",1],["eggplant",2],["basil",1]],"in":["mortar","pot"],"serves":5,"cooks":2}},
    "khanomJeen": {"stamina":50,"buff":"hearty","recipe":{"needs":[["riceNoodle",3],["croaker",1],["curryPaste",1],["coconutMilk",1],["longBean",1]],"in":["mortar","pot","steamer"],"serves":6,"cooks":3}},
    "hoMok": {"stamina":48,"buff":"lucky","recipe":{"needs":[["blackEar",1],["curryPaste",1],["coconutMilk",1],["bananaLeaf",2],["basil",1]],"in":["mortar","steamerBamboo"],"serves":4,"cooks":2}},
    "mangoStickyRice": {"stamina":44,"buff":"green","recipe":{"needs":[["mango",2],["stickyRice",2],["coconutMilk",1],["sugar",1]],"in":["steamerBamboo","pot"],"serves":4,"cooks":2}},
    "bananaInCoconut": {"stamina":32,"buff":"calm","recipe":{"needs":[["banana",3],["coconutMilk",1],["sugar",1]],"in":["pot"],"serves":4,"cooks":1}},
    "taroPudding": {"stamina":40,"buff":"keen","recipe":{"needs":[["taro",1],["flour",1],["coconutMilk",1],["sugar",1]],"in":["panBrass","pot"],"serves":6,"cooks":2}},
    "steamedCroaker": {"stamina":46,"buff":"keen","recipe":{"needs":[["croaker",1],["soy",1],["ginger",1],["scallion",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "gingerFish": {"stamina":45,"buff":"hearty","recipe":{"needs":[["blackEar",1],["ginger",2],["soy",1],["oil",1]],"in":["wok"],"serves":4,"cooks":1}},
    "turmericFish": {"stamina":44,"buff":"calm","recipe":{"needs":[["spinyEel",2],["turmeric",1],["garlic",2],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "jungleCurry": {"stamina":50,"buff":"lucky","recipe":{"needs":[["giantSnakehead",1],["curryPaste",1],["galangal",1],["lemongrass",1],["eggplant",1],["longBean",1]],"in":["mortar","potBrass"],"serves":6,"cooks":2}},
    "megaLaab": {"stamina":50,"buff":"hearty","recipe":{"needs":[["megaCatfish",1],["toastedRice",1],["lime",3],["chili",3],["scallion",2]],"in":["cleaver","mortar","wok"],"serves":20,"cooks":3}},
    "watermelonSlices": {"stamina":24,"buff":null,"recipe":{"needs":[["watermelon",1]],"in":["cleaver"],"serves":6,"cooks":1}},
    "khantoke": {"stamina":50,"buff":"lucky","recipe":{"needs":[["stickyRice",3],["goldenCarp",1],["curryPaste",1],["coconutMilk",1],["cucumber",2],["longBean",2],["pepper",1]],"in":["hotpot","steamerBamboo","wok","mortar"],"serves":20,"cooks":4}},
    "naamPrik": {"stamina":38,"buff":"green","recipe":{"needs":[["fermentedFish",1],["chili",3],["garlic",1],["lime",1],["cucumber",1]],"in":["mortar"],"serves":4,"cooks":1}},
    "sushi": {"stamina":38,"buff":"keen","recipe":{"needs":[["tilapia",1],["rice",2],["sugar",1],["seaweed",1]],"in":["cleaver","sushiMat"],"serves":4,"cooks":2}},
    "ramen": {"stamina":46,"buff":"hearty","recipe":{"needs":[["noodle",2],["egg",1],["scallion",1],["soy",1],["driedFish",1]],"in":["pot"],"serves":3,"cooks":1}},
    "tempura": {"stamina":34,"buff":"lucky","recipe":{"needs":[["prawn",2],["flour",1],["oil",1],["egg",1]],"in":["wok"],"serves":2,"cooks":1}},
    "unadon": {"stamina":48,"buff":"hearty","recipe":{"needs":[["eel",1],["rice",2],["sugar",1],["soy",1]],"in":["grill"],"serves":2,"cooks":1}},
    "okonomiyaki": {"stamina":36,"buff":"green","recipe":{"needs":[["flour",1],["egg",1],["cabbage",1],["scallion",1],["prawn",1]],"in":["pan"],"serves":3,"cooks":1}},
    "kimchi": {"stamina":20,"buff":"hearty","recipe":{"needs":[["cabbage",2],["chili",2],["garlic",1],["fishSauce",1]],"in":["jar"],"serves":4,"cooks":1}},
    "bibimbap": {"stamina":44,"buff":"hearty","recipe":{"needs":[["rice",2],["egg",1],["carrot",1],["cucumber",1],["kangkong",1],["chili",1]],"in":["wok","stoneBowl"],"serves":4,"cooks":2}},
    "tteokbokki": {"stamina":36,"buff":"keen","recipe":{"needs":[["stickyRice",2],["chili",2],["scallion",1],["sugar",1]],"in":["mortar","pan"],"serves":3,"cooks":2}},
    "kimbap": {"stamina":32,"buff":"calm","recipe":{"needs":[["rice",2],["seaweed",1],["carrot",1],["cucumber",1],["egg",1]],"in":["sushiMat"],"serves":3,"cooks":1}},
    "pajeon": {"stamina":28,"buff":null,"recipe":{"needs":[["flour",1],["egg",1],["oil",1],["scallion",3]],"in":["pan"],"serves":2,"cooks":1}},
    "harGow": {"stamina":34,"buff":"lucky","recipe":{"needs":[["flour",2],["scallion",1],["prawn",2]],"in":["rollingPin","steamer"],"serves":4,"cooks":2}},
    "chowMein": {"stamina":40,"buff":"keen","recipe":{"needs":[["noodle",2],["cabbage",1],["carrot",1],["oil",1],["soy",1]],"in":["wok"],"serves":3,"cooks":1}},
    "springRoll": {"stamina":26,"buff":null,"recipe":{"needs":[["flour",1],["cabbage",1],["oil",1],["carrot",1]],"in":["rollingPin","wok"],"serves":4,"cooks":2}},
    "congee": {"stamina":30,"buff":"calm","recipe":{"needs":[["rice",2],["egg",1],["scallion",1],["perch",1]],"in":["pot"],"serves":4,"cooks":1}},
    "mapoTofu": {"stamina":40,"buff":"hearty","recipe":{"needs":[["chili",2],["garlic",1],["scallion",1],["soy",1],["tofu",2]],"in":["wok"],"serves":3,"cooks":1}},
    "pizza": {"stamina":46,"buff":"lucky","recipe":{"needs":[["flour",2],["tomato",2],["basil",1],["cheese",1]],"in":["rollingPin","oven"],"serves":6,"cooks":2}},
    "spaghetti": {"stamina":40,"buff":"keen","recipe":{"needs":[["noodle",2],["tomato",2],["oil",1],["prawn",1],["garlic",1]],"in":["pot","pan"],"serves":3,"cooks":2}},
    "risotto": {"stamina":38,"buff":"calm","recipe":{"needs":[["rice",2],["pumpkin",1],["garlic",1],["cheese",1]],"in":["pot"],"serves":4,"cooks":1}},
    "lasagna": {"stamina":48,"buff":"hearty","recipe":{"needs":[["noodle",2],["tomato",2],["cheese",2],["eggplant",1]],"in":["oven","pot"],"serves":6,"cooks":2}},
    "minestrone": {"stamina":30,"buff":"green","recipe":{"needs":[["tomato",2],["carrot",1],["cabbage",1],["longBean",1],["noodle",1]],"in":["pot"],"serves":5,"cooks":1}},
    "fishCurry": {"stamina":46,"buff":"hearty","recipe":{"needs":[["catfish",1],["chili",2],["ginger",1],["turmeric",1],["coconutMilk",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "naan": {"stamina":26,"buff":null,"recipe":{"needs":[["flour",2],["garlic",1],["milk",1]],"in":["rollingPin","oven"],"serves":4,"cooks":2}},
    "biryani": {"stamina":44,"buff":"calm","recipe":{"needs":[["rice",3],["turmeric",1],["milk",1],["pepper",1],["pangasius",1]],"in":["pot"],"serves":5,"cooks":1}},
    "samosa": {"stamina":28,"buff":"green","recipe":{"needs":[["flour",1],["chili",1],["oil",1],["sweetPotato",1]],"in":["rollingPin","wok"],"serves":4,"cooks":2}},
    "lassi": {"stamina":24,"buff":"lucky","recipe":{"needs":[["mango",1],["sugar",1],["milk",1]],"in":["mortar"],"serves":3,"cooks":1}},
    "dozyFish": {"stamina":12,"buff":null,"recipe":null},
    "rainbowFish": {"stamina":5,"buff":"lucky","recipe":null},
    "fishChips": {"stamina":30,"buff":"hearty","recipe":{"needs":[["salt",1],["popotoFish",2]],"in":["pan"],"serves":4,"cooks":1}},
    "ukha": {"stamina":32,"buff":"calm","recipe":{"needs":[["carrot",2],["scallion",1],["salt",1],["pike",1]],"in":["pot"],"serves":4,"cooks":1}},
    "thieboudienne": {"stamina":36,"buff":"green","recipe":{"needs":[["rice",3],["cabbage",1],["carrot",1],["nilePerch",1]],"in":["pot"],"serves":5,"cooks":1}},
    "piranhaSoup": {"stamina":30,"buff":"keen","recipe":{"needs":[["piranha",2],["chili",2],["scallion",1]],"in":["pot"],"serves":3,"cooks":1}},
    "crawfishBoil": {"stamina":36,"buff":"lucky","recipe":{"needs":[["crayfish",5],["salt",2],["chili",2],["corn",2]],"in":["pot"],"serves":8,"cooks":2}},
    "masgouf": {"stamina":28,"buff":"calm","recipe":{"needs":[["salt",2],["scallion",2],["carp",1]],"in":["grill"],"serves":3,"cooks":1}},
    "salmonSteak": {"stamina":34,"buff":"keen","recipe":{"needs":[["salmon",1],["salt",1],["garlic",1]],"in":["pan"],"serves":2,"cooks":1}},
    "arapaimaRoast": {"stamina":45,"buff":"hearty","recipe":{"needs":[["arapaima",1],["salt",3],["chili",2]],"in":["grill"],"serves":10,"cooks":3}}
  }$town$::jsonb),
  ('scrolls', $town${
    "scrollPestCure": "pestCure",
    "scrollFriedMinnow": "friedMinnow",
    "scrollGrilledFish": "grilledFish",
    "scrollGrilledCorn": "grilledCorn",
    "scrollRoastSweetPotato": "roastSweetPotato",
    "scrollStirKangkong": "stirKangkong",
    "scrollBasilCatfish": "basilCatfish",
    "scrollTomYum": "tomYum",
    "scrollSourCurry": "sourCurry",
    "scrollFriedPerch": "friedPerch",
    "scrollFishCake": "fishCake",
    "scrollSpicyEel": "spicyEel",
    "scrollGrilledPrawn": "grilledPrawn",
    "scrollSteamedGoby": "steamedGoby",
    "scrollPumpkinSoup": "pumpkinSoup",
    "scrollShabu": "shabu",
    "scrollSomTam": "somTam",
    "scrollGrilledEggplant": "grilledEggplant",
    "scrollTomKha": "tomKha",
    "scrollFriedGourami": "friedGourami",
    "scrollCrabCurry": "crabCurry",
    "scrollSteamedSheatfish": "steamedSheatfish",
    "scrollFriedFrog": "friedFrog",
    "scrollLaab": "laab",
    "scrollOmelette": "omelette",
    "scrollSnailCurry": "snailCurry",
    "scrollCandiedPumpkin": "candiedPumpkin",
    "scrollFriedRice": "friedRice",
    "scrollSushi": "sushi",
    "scrollTempura": "tempura",
    "scrollOkonomiyaki": "okonomiyaki",
    "scrollKimchi": "kimchi",
    "scrollBibimbap": "bibimbap",
    "scrollKimbap": "kimbap",
    "scrollPajeon": "pajeon",
    "scrollHarGow": "harGow",
    "scrollSpringRoll": "springRoll",
    "scrollCongee": "congee",
    "scrollSpaghetti": "spaghetti",
    "scrollMinestrone": "minestrone",
    "scrollSamosa": "samosa",
    "scrollGreenCurry": "greenCurry",
    "scrollKhanomJeen": "khanomJeen",
    "scrollHoMok": "hoMok",
    "scrollMangoStickyRice": "mangoStickyRice",
    "scrollBananaInCoconut": "bananaInCoconut",
    "scrollTaroPudding": "taroPudding",
    "scrollSteamedCroaker": "steamedCroaker",
    "scrollGingerFish": "gingerFish",
    "scrollTurmericFish": "turmericFish",
    "scrollJungleCurry": "jungleCurry",
    "scrollMegaLaab": "megaLaab",
    "scrollWatermelonSlices": "watermelonSlices",
    "scrollKhantoke": "khantoke",
    "scrollNaamPrik": "naamPrik",
    "scrollRamen": "ramen",
    "scrollUnadon": "unadon",
    "scrollTteokbokki": "tteokbokki",
    "scrollChowMein": "chowMein",
    "scrollMapoTofu": "mapoTofu",
    "scrollPizza": "pizza",
    "scrollRisotto": "risotto",
    "scrollLasagna": "lasagna",
    "scrollFishCurry": "fishCurry",
    "scrollNaan": "naan",
    "scrollBiryani": "biryani",
    "scrollLassi": "lassi",
    "scrollFishChips": "fishChips",
    "scrollUkha": "ukha",
    "scrollThieboudienne": "thieboudienne",
    "scrollPiranhaSoup": "piranhaSoup",
    "scrollCrawfishBoil": "crawfishBoil",
    "scrollMasgouf": "masgouf",
    "scrollSalmonSteak": "salmonSteak",
    "scrollArapaimaRoast": "arapaimaRoast"
  }$town$::jsonb),
  ('makes', $town${
    "fishSauce": {"needs":[["minnow",4],["salt",2]],"in":["pot"],"gives":2},
    "compost": {"needs":[["hyacinth",3]],"in":[],"gives":2},
    "growFert": {"needs":[["compost",2],["minnow",2]],"in":[],"gives":2},
    "guardFert": {"needs":[["compost",2],["chili",2],["garlic",1]],"in":[],"gives":2},
    "pestCure": {"needs":[["chili",2],["scallion",2],["salt",1]],"in":["pot"],"gives":2},
    "basket": {"needs":[["hyacinth",6]],"in":[],"gives":1},
    "hookScale": {"needs":[["gar",1]],"in":[],"gives":1},
    "floatGlow": {"needs":[["moonFish",1]],"in":[],"gives":1},
    "bowl": {"needs":[["mussel",2]],"in":[],"gives":1},
    "driedFish": {"needs":[["barb",2],["salt",1]],"in":["grill"],"gives":2},
    "saltedFish": {"needs":[["tilapia",1],["salt",3]],"in":["jar"],"gives":2},
    "curryPaste": {"needs":[["chili",3],["garlic",2],["lemongrass",1],["galangal",1]],"in":["mortar"],"gives":2},
    "pickle": {"needs":[["cabbage",1],["salt",2]],"in":["jar"],"gives":2},
    "charcoal": {"needs":[["driftwood",2]],"in":["grill"],"gives":4},
    "rope": {"needs":[["hyacinth",4]],"in":[],"gives":1},
    "krabung": {"needs":[["hyacinth",8],["rope",1]],"in":[],"gives":1},
    "noodle": {"needs":[["flour",2],["egg",1]],"in":["rollingPin"],"gives":3},
    "coconutMilk": {"needs":[["coconut",1]],"in":["mortar"],"gives":2},
    "fermentedFish": {"needs":[["gourami",2],["salt",2],["toastedRice",1]],"in":["jar"],"gives":2},
    "shrimpPaste": {"needs":[["shrimpLive",5],["salt",2]],"in":["jar"],"gives":1},
    "driedChili": {"needs":[["chili",4]],"in":["grill"],"gives":3},
    "riceNoodle": {"needs":[["flour",2]],"in":["pot"],"gives":3},
    "toastedRice": {"needs":[["rice",2]],"in":["wok"],"gives":2},
    "yoke": {"needs":[["driftwood",2],["rope",2],["basket",2]],"in":[],"gives":1}
  }$town$::jsonb),
  ('cooking', $town${
    "cost": 4,
    "stirs": 2,
    "kinds": 8,
    "ladle": 1,
    "pots": 6,
    "reach": 1.8,
    "tok": 3.2,
    "odd": {"per":2,"most":4},
    "oddDish": "oddDish",
    "clue": 3,
    "recipes": ["friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","fishSauce","compost","growFert","guardFert","pestCure","basket","hookScale","floatGlow","bowl","driedFish","saltedFish","curryPaste","pickle","charcoal","rope","krabung","noodle","coconutMilk","fermentedFish","shrimpPaste","driedChili","riceNoodle","toastedRice","yoke"],
    "needs": {"friedMinnow":{"minnow":3,"salt":1},"grilledFish":{"salt":2,"tilapia":1},"grilledCorn":{"corn":2},"roastSweetPotato":{"sweetPotato":2},"stirKangkong":{"chili":1,"garlic":1,"kangkong":3},"basilCatfish":{"basil":2,"catfish":1,"chili":1,"garlic":1,"rice":2},"tomYum":{"chili":2,"scallion":1,"snakehead":1,"tomato":2},"sourCurry":{"barb":2,"cabbage":1,"chili":1,"daikon":1},"friedPerch":{"garlic":2,"perch":2,"salt":1},"fishCake":{"basil":1,"chili":1,"featherback":1,"salt":1},"spicyEel":{"basil":2,"chili":2,"eel":1,"garlic":1},"grilledPrawn":{"prawn":2,"salt":1},"steamedGoby":{"fishSauce":1,"goby":1,"scallion":2},"pumpkinSoup":{"pumpkin":1,"salt":1,"scallion":1},"shabu":{"cabbage":1,"carrot":2,"corn":1,"daikon":1,"pangasius":1,"prawn":2,"scallion":2},"somTam":{"chili":2,"lime":1,"longBean":1,"papaya":1,"sugar":1,"tomato":1},"grilledEggplant":{"eggplant":2,"fishSauce":1},"tomKha":{"chili":1,"galangal":1,"lemongrass":1,"lime":1,"sheatfish":1},"friedGourami":{"gourami":2,"oil":1,"salt":1},"crabCurry":{"crab":3,"curryPaste":1,"eggplant":1,"longBean":1},"steamedSheatfish":{"chili":1,"garlic":1,"lime":2,"sheatfish":1},"friedFrog":{"frog":2,"garlic":2,"oil":1},"laab":{"bagrid":1,"chili":1,"lime":1,"rice":1,"scallion":1},"omelette":{"egg":2,"oil":1},"snailCurry":{"curryPaste":1,"lemongrass":1,"snail":6},"candiedPumpkin":{"pumpkin":1,"sugar":2},"friedRice":{"egg":1,"oil":1,"rice":3,"scallion":1},"greenCurry":{"basil":1,"coconutMilk":1,"curryPaste":1,"eggplant":2,"featherback":1},"khanomJeen":{"coconutMilk":1,"croaker":1,"curryPaste":1,"longBean":1,"riceNoodle":3},"hoMok":{"bananaLeaf":2,"basil":1,"blackEar":1,"coconutMilk":1,"curryPaste":1},"mangoStickyRice":{"coconutMilk":1,"mango":2,"stickyRice":2,"sugar":1},"bananaInCoconut":{"banana":3,"coconutMilk":1,"sugar":1},"taroPudding":{"coconutMilk":1,"flour":1,"sugar":1,"taro":1},"steamedCroaker":{"croaker":1,"ginger":1,"scallion":1,"soy":1},"gingerFish":{"blackEar":1,"ginger":2,"oil":1,"soy":1},"turmericFish":{"garlic":2,"oil":1,"spinyEel":2,"turmeric":1},"jungleCurry":{"curryPaste":1,"eggplant":1,"galangal":1,"giantSnakehead":1,"lemongrass":1,"longBean":1},"megaLaab":{"chili":3,"lime":3,"megaCatfish":1,"scallion":2,"toastedRice":1},"watermelonSlices":{"watermelon":1},"khantoke":{"coconutMilk":1,"cucumber":2,"curryPaste":1,"goldenCarp":1,"longBean":2,"pepper":1,"stickyRice":3},"naamPrik":{"chili":3,"cucumber":1,"fermentedFish":1,"garlic":1,"lime":1},"sushi":{"rice":2,"seaweed":1,"sugar":1,"tilapia":1},"ramen":{"driedFish":1,"egg":1,"noodle":2,"scallion":1,"soy":1},"tempura":{"egg":1,"flour":1,"oil":1,"prawn":2},"unadon":{"eel":1,"rice":2,"soy":1,"sugar":1},"okonomiyaki":{"cabbage":1,"egg":1,"flour":1,"prawn":1,"scallion":1},"kimchi":{"cabbage":2,"chili":2,"fishSauce":1,"garlic":1},"bibimbap":{"carrot":1,"chili":1,"cucumber":1,"egg":1,"kangkong":1,"rice":2},"tteokbokki":{"chili":2,"scallion":1,"stickyRice":2,"sugar":1},"kimbap":{"carrot":1,"cucumber":1,"egg":1,"rice":2,"seaweed":1},"pajeon":{"egg":1,"flour":1,"oil":1,"scallion":3},"harGow":{"flour":2,"prawn":2,"scallion":1},"chowMein":{"cabbage":1,"carrot":1,"noodle":2,"oil":1,"soy":1},"springRoll":{"cabbage":1,"carrot":1,"flour":1,"oil":1},"congee":{"egg":1,"perch":1,"rice":2,"scallion":1},"mapoTofu":{"chili":2,"garlic":1,"scallion":1,"soy":1,"tofu":2},"pizza":{"basil":1,"cheese":1,"flour":2,"tomato":2},"spaghetti":{"garlic":1,"noodle":2,"oil":1,"prawn":1,"tomato":2},"risotto":{"cheese":1,"garlic":1,"pumpkin":1,"rice":2},"lasagna":{"cheese":2,"eggplant":1,"noodle":2,"tomato":2},"minestrone":{"cabbage":1,"carrot":1,"longBean":1,"noodle":1,"tomato":2},"fishCurry":{"catfish":1,"chili":2,"coconutMilk":1,"ginger":1,"turmeric":1},"naan":{"flour":2,"garlic":1,"milk":1},"biryani":{"milk":1,"pangasius":1,"pepper":1,"rice":3,"turmeric":1},"samosa":{"chili":1,"flour":1,"oil":1,"sweetPotato":1},"lassi":{"mango":1,"milk":1,"sugar":1},"fishChips":{"popotoFish":2,"salt":1},"ukha":{"carrot":2,"pike":1,"salt":1,"scallion":1},"thieboudienne":{"cabbage":1,"carrot":1,"nilePerch":1,"rice":3},"piranhaSoup":{"chili":2,"piranha":2,"scallion":1},"crawfishBoil":{"chili":2,"corn":2,"crayfish":5,"salt":2},"masgouf":{"carp":1,"salt":2,"scallion":2},"salmonSteak":{"garlic":1,"salmon":1,"salt":1},"arapaimaRoast":{"arapaima":1,"chili":2,"salt":3},"fishSauce":{"minnow":4,"salt":2},"compost":{"hyacinth":3},"growFert":{"compost":2,"minnow":2},"guardFert":{"chili":2,"compost":2,"garlic":1},"pestCure":{"chili":2,"salt":1,"scallion":2},"basket":{"hyacinth":6},"hookScale":{"gar":1},"floatGlow":{"moonFish":1},"bowl":{"mussel":2},"driedFish":{"barb":2,"salt":1},"saltedFish":{"salt":3,"tilapia":1},"curryPaste":{"chili":3,"galangal":1,"garlic":2,"lemongrass":1},"pickle":{"cabbage":1,"salt":2},"charcoal":{"driftwood":2},"rope":{"hyacinth":4},"krabung":{"hyacinth":8,"rope":1},"noodle":{"egg":1,"flour":2},"coconutMilk":{"coconut":1},"fermentedFish":{"gourami":2,"salt":2,"toastedRice":1},"shrimpPaste":{"salt":2,"shrimpLive":5},"driedChili":{"chili":4},"riceNoodle":{"flour":2},"toastedRice":{"rice":2},"yoke":{"basket":2,"driftwood":2,"rope":2}},
    "cookware": ["pan","grill","pot","mortar","wok","steamer","cleaver","steamerBamboo","panBrass","potBrass","hotpot","sushiMat","jar","stoneBowl","rollingPin","oven"],
    "gear": {"wok":1.25,"potBrass":1.5,"panBrass":1.5,"stoveBig":1.25},
    "never": ["tool","scroll","dish"],
    "bowl": "bowl",
    "bowled": ["oddDish","friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast"],
    "inside": {"boot":{"chance":0.35,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast"]},"bottle":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast"]},"chest":{"chance":1,"scrolls":["scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollKhanomJeen","scrollMangoStickyRice","scrollBananaInCoconut","scrollTaroPudding","scrollSteamedCroaker","scrollGingerFish","scrollTurmericFish","scrollJungleCurry","scrollMegaLaab","scrollWatermelonSlices","scrollKhantoke","scrollNaamPrik","scrollRamen","scrollUnadon","scrollTteokbokki","scrollChowMein","scrollMapoTofu","scrollPizza","scrollRisotto","scrollLasagna","scrollFishCurry","scrollNaan","scrollBiryani","scrollLassi"]},"wels":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast"]},"pacu":{"chance":0.8,"scrolls":["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato"]}},
    "map": {"town":[64,64],"farm":[128,0,60,44]},
    "misses": 30
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
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","mosquitofish":"guard","herring":"feed","archerfish":"cure","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
    "seeds": {"seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb),
  ('order', $town${
    "n": {"fish":[4,8],"crop":[4,8],"made":[2,4]},
    "asks": {"fish":[["minnow",0],["barb",0],["tilapia",0],["perch",0],["catfish",0],["gourami",7],["crab",18],["snail",18],["loach",0],["mosquitofish",0],["mussel",0],["crayfish",0],["carp",0],["piranha",0]],"crop":[["kangkong",0],["scallion",0],["cabbage",0],["carrot",0],["daikon",5],["corn",4],["chili",0],["basil",2],["cucumber",8],["longBean",14]],"made":[["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["sourCurry",5],["friedGourami",19],["omelette",10],["friedRice",19],["sushi",29],["ramen",48],["bibimbap",30],["tteokbokki",49],["kimbap",23],["pajeon",12],["chowMein",48],["springRoll",19],["congee",10],["fishSauce",0],["compost",0],["growFert",0],["pestCure",0],["driedFish",7],["saltedFish",22],["pickle",22],["rope",7],["noodle",16],["fermentedFish",46],["shrimpPaste",46],["driedChili",46],["riceNoodle",46],["toastedRice",46]]}
  }$town$::jsonb),
  ('hints', $town${
    "price": {"1":15,"2":40,"3":90},
    "ids": [["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["roastSweetPotato",6],["stirKangkong",1],["basilCatfish",2],["tomYum",3],["sourCurry",5],["friedPerch",1],["fishCake",2],["spicyEel",2],["grilledPrawn",0],["steamedGoby",0],["pumpkinSoup",0],["shabu",5],["fishSauce",0],["compost",0],["growFert",0],["guardFert",1],["pestCure",0],["basket",0],["fishChips",0],["ukha",0],["thieboudienne",0],["piranhaSoup",0],["crawfishBoil",4],["masgouf",0],["salmonSteak",1],["arapaimaRoast",0],["hookScale",0],["floatGlow",0],["bowl",0],["somTam",31],["grilledEggplant",17],["tomKha",28],["friedGourami",19],["crabCurry",24],["steamedSheatfish",28],["friedFrog",19],["laab",29],["omelette",10],["snailCurry",24],["candiedPumpkin",15],["friedRice",19],["sushi",29],["tempura",19],["okonomiyaki",12],["kimchi",22],["bibimbap",30],["kimbap",23],["pajeon",12],["harGow",26],["springRoll",19],["congee",10],["spaghetti",16],["minestrone",16],["samosa",19],["driedFish",0],["saltedFish",22],["curryPaste",24],["pickle",22],["charcoal",7],["rope",0],["krabung",0],["noodle",16],["greenCurry",61],["khanomJeen",61],["hoMok",61],["mangoStickyRice",62],["bananaInCoconut",61],["taroPudding",65],["steamedCroaker",48],["gingerFish",56],["turmericFish",54],["jungleCurry",64],["megaLaab",46],["watermelonSlices",58],["khantoke",66],["naamPrik",28],["ramen",48],["unadon",48],["tteokbokki",49],["chowMein",48],["mapoTofu",48],["pizza",60],["risotto",57],["lasagna",60],["fishCurry",61],["naan",60],["biryani",54],["lassi",62],["coconutMilk",61],["fermentedFish",22],["shrimpPaste",25],["driedChili",0],["riceNoodle",12],["toastedRice",19],["yoke",7]]
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v122>

/* ── when a sign holds ───────────────────────────────────────────────────── */

-- lib/town/fishing.ts's signsOf(): the signs that hold as a line is dropped,
-- in the order the code lists them. `p_spent` is whether whoever drops it
-- has no stamina left, `p_others` how many others' lines are out, `p_wet`
-- the milliseconds of rain in the minutes before, `p_rain` whether it rains
-- now. The weekend and the moon are the clock's.
create or replace function town.signs_of(p_now bigint, p_spent boolean, p_others integer, p_wet bigint, p_rain boolean)
returns text[] language plpgsql stable
as $$
declare
  s jsonb := town.cat('fishing')->'signs';
  -- the moon's month in days, and its age at this moment in days, from a moment it was new (2000-01-06 18:14 UTC)
  month double precision := 29.530588853;
  days double precision := (p_now - 947182440000)::double precision / 86400000::double precision;
  age double precision := days - floor(days / month) * month;
  -- the day of the week in Bangkok: 0 is Sunday (the first day of 1970 was a Thursday)
  dow integer := (((floor((p_now + 25200000)::numeric / 86400000)::bigint + 4) % 7 + 7) % 7)::int;
  signs text[] := '{}';
begin
  if coalesce(p_spent, false) then signs := signs || 'tired'::text; end if;
  if coalesce(p_others, 0) >= (s->>'crowd')::int then signs := signs || 'crowd'::text; end if;
  if s->'weekend' @> to_jsonb(dow) then signs := signs || 'weekend'::text; end if;
  if not coalesce(p_rain, false) and coalesce(p_wet, 0) > 0 then signs := signs || 'after'::text; end if;
  if abs(age - month / 2::double precision) <= (s->>'moon')::double precision then signs := signs || 'full'::text; end if;
  return signs;
end;
$$;

/* ── what takes the bait: v108's, with a fish's water, its dry sky and its signs ── */

-- lib/town/fishing.ts's oddsOf(): what takes a bait at an hour, and how
-- likely each is, in the order the code weighs them. `p_signs` are the signs
-- that hold (town.signs_of).
create or replace function town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[])
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  fish jsonb := town.cat('fish');
  flot jsonb := town.cat('flotsam');
  lucky_by double precision := (town.cat('stamina')->'buffs'->>'lucky')::double precision;
  h integer := ((p_hour % 24) + 24) % 24;
  ids text[] := '{}';
  ws double precision[] := '{}';
  id text;
  f jsonb;
  likes double precision;
  sky double precision;
  total double precision := 0;
  odds jsonb := '[]'::jsonb;
  i integer;
begin
  for id in select jsonb_array_elements_text(cat->'fish') loop
    f := fish->id;
    likes := coalesce((f->'baits'->>p_bait)::double precision, 0);
    continue when likes = 0;
    continue when not exists (select 1 from jsonb_array_elements(f->'hours') x where h >= (x->>0)::int and h < (x->>1)::int);
    -- (a fish that says where it lives keeps to that water; of the rest only the common ones come to the bank)
    continue when case when f ? 'water' then f->>'water' <> (case when p_shallow then 'bank' else 'deck' end) else p_shallow and f->>'tier' <> 'common' end;
    -- (one that waits for a sign bites only while every sign of it holds)
    continue when f ? 'needs' and exists (select 1 from jsonb_array_elements_text(f->'needs') n where not (n = any(coalesce(p_signs, '{}'::text[]))));
    -- (one the sky keeps away is not in the water at all: it is given no share, not a share of nothing)
    sky := case when p_rain then (f->>'rain')::double precision else coalesce((f->>'dry')::double precision, 1::double precision) end;
    continue when not (sky > 0);
    ids := ids || id;
    ws := ws || ((cat->'tiers'->>(f->>'tier'))::double precision * likes
      * sky
      * (case when p_lucky and f->>'tier' in ('rare', 'legend') then 1::double precision + lucky_by else 1::double precision end));
  end loop;
  for id in select jsonb_array_elements_text(cat->'flotsam') loop
    f := flot->id;
    if f->'on' is null or f->'on' ? p_bait then
      ids := ids || id;
      ws := ws || (f->>'weight')::double precision;
    end if;
  end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop total := total + ws[i]; end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop
    odds := odds || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ws[i] / total));
  end loop;
  return odds;
end;
$$;

-- castLine(): everything about what happens to a line, decided as it is
-- dropped. `p_rnd` are the numbers in [0, 1) it is drawn with, taken in order
-- (six are enough).
create or replace function town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[])
returns jsonb language plpgsql stable
as $$
declare
  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs);
  n integer := jsonb_array_length(odds);
  apart integer := (town.cat('fishing')->>'apart')::int;
  k integer := 2;
  r double precision := p_rnd[1];
  what text := odds->(n - 1)->>'what';
  fish jsonb;
  span jsonb;
  wait integer;
  many integer := 0;
  nibbles integer[] := '{}';
  at_ integer;
  big double precision;
  size double precision := 0;
  i integer;
begin
  for i in 0..n - 1 loop
    if r < (odds->i->>'p')::double precision then what := odds->i->>'what'; exit; end if;
    r := r - (odds->i->>'p')::double precision;
  end loop;
  fish := town.cat('fish')->what;
  span := coalesce(fish->'wait', town.cat('flotsam')->what->'wait');
  wait := floor((span->>0)::double precision + ((span->>1)::double precision - (span->>0)::double precision) * p_rnd[k] + 0.5::double precision)::int;
  k := k + 1;
  -- a fish may nibble once or twice first; what is no fish only drifts onto the hook
  if fish is not null then
    many := case when p_rnd[k] < 0.3 then 0 when p_rnd[k] < 0.75 then 1 else 2 end;
    k := k + 1;
  end if;
  for i in 1..many loop
    at_ := floor((0.25::double precision + 0.6::double precision * p_rnd[k]) * wait + 0.5::double precision)::int;
    k := k + 1;
    if at_ >= apart and wait - at_ >= apart and not exists (select 1 from unnest(nibbles) x where abs(x - at_) < apart) then
      nibbles := nibbles || at_;
    end if;
  end loop;
  -- most are small: the roll is multiplied by itself
  if fish is not null then
    big := p_rnd[k];
    size := floor(((fish->'size'->>0)::double precision + ((fish->'size'->>1)::double precision - (fish->'size'->>0)::double precision) * (big * big)) * 10 + 0.5::double precision)
      / 10::double precision;
  end if;
  return jsonb_build_object('what', what, 'wait', wait, 'size', size,
    'nibbles', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(nibbles) x));
end;
$$;

/* ── a line dropped: v121's, with the signs worked out ───────────────────── */

-- `p_rain` is still taken, so that a page built before this is answered,
-- and is believed no longer.
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  did := town.hook_bait(purse, p_bait);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  line := town.cast_line(p_bait, hour, town.raining(now_), coalesce(town.buff_of(purse, now_) = 'lucky', false), not deep::boolean, signs,
    array[random(), random(), random(), random(), random(), random()]);
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs)));
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')));
end;
$$;

-- The two rules as they were have nothing to call them now.
drop function if exists town.cast_line(text, integer, boolean, boolean, boolean, double precision[]);
drop function if exists town.odds(text, integer, boolean, boolean, boolean);

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; a line is a member's to drop, as it was.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_cast(text, integer, integer, boolean) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ─── Before running it ───────────────────────────────────────────────────
--
-- Is the site's code for it live? The newest deploy has to be the one that
-- knows the twenty fish (see "the order" at the top).
--
-- Has a row been changed by hand? fish and fishing should say 2026-10-04
-- 17:09, items 2026-10-04 09:39, dishes 2026-10-03 17:10, farming 2026-10-04
-- 06:50, and cooking, hints, makes, order and scrolls 2026-10-04 08:21.
--
--   select key, updated_at from public.town_catalog
--    where key in ('items', 'fish', 'fishing', 'dishes', 'scrolls', 'makes', 'cooking', 'farming', 'order', 'hints') order by key;
--
-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- cooking, dishes, farming, fish, fishing, hints, items, makes, order,
--   -- scrolls: t. The other eight rows: f. (`written` is true for an hour
--   -- after it runs)
--
--   select (select count(*) from jsonb_object_keys(c.data)) as n, c.key
--     from public.town_catalog c where c.key in ('items', 'fish', 'dishes', 'scrolls', 'makes') order by c.key;
--   -- 78 dishes | 52 fish | 351 items | 24 makes | 75 scrolls
--
--   select data->'signs' as signs, jsonb_array_length(data->'fish') as fish, data->'baits' ? 'loach' as loach, data->'floats' as floats
--     from public.town_catalog where key = 'fishing';
--   -- {"moon": 1.5, "after": 30, "crowd": 2, "lately": 300, "weekend": [0, 6]} | 52 | t | {"floatBell": 1.5, "floatGlow": 1.15, "floatQuill": 1.25}
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p
--    where p.pronamespace = 'town'::regnamespace and p.proname in ('odds', 'cast_line', 'signs_of') order by 1;
--   -- cast_line | p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[]
--   -- odds      | p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[]
--   -- signs_of  | p_now bigint, p_spent boolean, p_others integer, p_wet bigint, p_rain boolean
--   -- (one of each: the two of five and six arguments are gone)
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
--          has_function_privilege('anon', 'public.town_cast(text, integer, integer, boolean)', 'execute') as anon_casts,
--          has_function_privilege('authenticated', 'public.town_cast(text, integer, integer, boolean)', 'execute') as member_casts;
--   -- false | 0 | false | true
--
--   -- what bites on a worm off the bank at noon on a dry weekday, and for somebody tired there
--   select (select string_agg(o->>'what', ', ') from jsonb_array_elements(town.odds('worm', 12, false, false, true, '{}')) o) as plain,
--          (select string_agg(o->>'what', ', ') from jsonb_array_elements(town.odds('worm', 12, false, false, true, '{tired}')) o) as tired;
--   -- minnow, barb, perch, loach, mosquitofish, hyacinth, boot | minnow, barb, perch, loach, mosquitofish, dozyFish, hyacinth, boot
--
--   -- the signs that hold now, for somebody with stamina and nobody else fishing (the weekend and the moon, if any)
--   select town.signs_of(town.now_ms(), false, 0, 0, false);
--
-- ─── Reading it, afterwards ──────────────────────────────────────────────
--
--   -- how often each sign held as a line was dropped, and who has landed which of the twenty
--   select s as sign, count(*) from public.town_deeds d, jsonb_array_elements_text(d.doc->'signs') s where d.what = 'cast' group by 1 order by 2 desc;
--   select p.doc->>'what' as fish, count(*) as landed, count(distinct p.member_id) as members
--     from public.town_plays p where p.game = 'fishing' and p.doc->>'how' = 'landed' group by 1 order by 2 desc;
