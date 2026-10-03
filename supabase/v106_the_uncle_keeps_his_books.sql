-- v106 — the uncle keeps his books
--
-- Run this once in the Supabase SQL editor, after v105. Running it again is
-- safe.
--
-- Nothing on the site uses this yet, and it changes nothing that exists but
-- one column added to v105's own `town_purses`. It is the second of the
-- migrations Cash Town's game waits for (the owner, 2026-10-03: "ยังไม่ Push รอ
-- ฐานข้อมูล", and then, asked how far the database should decide: "DB ตามที่คุณ
-- เสนอ ทุกอย่าง").
--
-- What it keeps: each member's bag (and what they hold in the hand, what they
-- wear to carry more, the hints they bought), the uncle's stall (one stock
-- for the village, refilled twice a day; a limit each a round; what is left
-- with him to be sold, paid after his relatives have been), and the uncle's
-- order of the day, which opens his shelf a thing at a time ("ลุงขายของ จะมีเควส
-- รายวันปลดล็อคของในร้านทีละอย่าง เราเอาของ basic ขึ้นมาก่อน แล้วค่อยๆปลดล็อคไปดีกว่า").
--
-- How it is built, since every migration after it is built the same way:
--
-- The rules are written twice, and held together. Cash Town's rules are pure
-- functions in the site's code (lib/town/*.ts): given a purse and a moment,
-- they give back a new purse. They were played for days in a trial that kept
-- everything in the browser. Here the same rules are written again in SQL, in
-- the schema `town`, as pure functions over the same documents: town.buy()
-- is lib/town/trade.ts's buy(), argument for argument. Before a file like
-- this is handed over, its dry run feeds thousands of made-up cases to both
-- and wants the same answer from each, to the last field
-- (.claude/skills/fc-cash-town/scripts/db). So a purse here is a jsonb
-- document shaped exactly as the code's `Purse`, and what the page receives
-- is what it already knows how to show.
--
-- The numbers come from one place. `town_catalog` is a document to a key
-- (things and their stacks, the stall's prices, the shelf's order, the
-- order's amounts, the hints), seeded below from lib/town/catalog.ts, which
-- gathers them from the code. A test in the site's own suite fails if the
-- block below is not what the code gives. A key once seeded is the
-- database's: an admin changes a number there, and running this again does
-- not put it back (`on conflict do nothing`).
--
-- The schema `town` is not for browsers. PostgREST serves only `public`, and
-- neither anon nor authenticated is given USAGE on `town`, so nothing in it
-- can be called from a browser whatever its own grants say. What a browser
-- calls are the `town_*` functions in `public`: each checks who is asking
-- (signed in, with a proved character, as everything in town does), takes
-- the rows it changes `for update`, calls the rule, and keeps what the rule
-- gave back. They are security definer because every table here is closed:
-- row-level security on, nothing granted (as v103 and v105).
--
-- A refusal a member can run into is an answer, not an error: `ok` false and
-- `why` one of the code's own words (coins, sold, each, full, none, unwanted,
-- gone, nothing, amount, worn), so the page says the same line it says in the
-- trial. Every answer carries the purse as it now stands.
--
-- One at a time. A function takes the member's purse row first, then the
-- stall's, then the village's, always in that order, so two members buying
-- the last worm are served one after the other, and no two functions can
-- wait on each other.
--
-- Time is the database's. A rule is given `town.now_ms()`, the moment the
-- request began, in the milliseconds the code counts in. Nothing a browser
-- sends says what time it is.

/* ── where the numbers are kept ──────────────────────────────────────────── */

create table if not exists public.town_catalog (
  key        text primary key check (key ~ '^[a-z][a-z_]{0,39}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.town_catalog enable row level security;
revoke all on public.town_catalog from anon, authenticated;

-- <catalog:v106> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
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
    "boot": {"kind":"catch","tier":1,"stack":5,"pays":0},
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
    "bowl": {"kind":"tool","tier":1,"stack":1,"pays":3},
    "potDirty": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "scrubber": {"kind":"goods","tier":1,"stack":10,"pays":1},
    "ash": {"kind":"goods","tier":1,"stack":10,"pays":1},
    "bucketIron": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "brush": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "soap": {"kind":"goods","tier":2,"stack":10,"pays":3},
    "apron": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "cricket": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "branBait": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "shrimpLive": {"kind":"bait","tier":2,"stack":20,"pays":3},
    "sugar": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "oil": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tamarind": {"kind":"staple","tier":2,"stack":20,"pays":2},
    "egg": {"kind":"staple","tier":2,"stack":20,"pays":3},
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
    "scrollSomTam": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":0},
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
    "ladle": {"kind":"tool","tier":3,"stack":1,"pays":20},
    "tok": {"kind":"tool","tier":3,"stack":1,"pays":60},
    "antEggs": {"kind":"bait","tier":3,"stack":20,"pays":6},
    "lure": {"kind":"bait","tier":3,"stack":5,"pays":30},
    "fermentedBait": {"kind":"bait","tier":3,"stack":20,"pays":5},
    "stickyRice": {"kind":"staple","tier":3,"stack":20,"pays":3},
    "flour": {"kind":"staple","tier":3,"stack":20,"pays":3},
    "soy": {"kind":"staple","tier":3,"stack":20,"pays":5},
    "pepper": {"kind":"staple","tier":3,"stack":20,"pays":6},
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
    "chest": {"kind":"catch","tier":3,"stack":1,"pays":0},
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
    "scrollGreenCurry": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollHoMok": {"kind":"scroll","tier":3,"stack":1,"pays":0}
  }$town$::jsonb),
  ('goods', $town${
    "rod": {"price":60,"stock":6,"each":1},
    "hoe": {"price":50,"stock":6,"each":1},
    "can": {"price":40,"stock":6,"each":1},
    "pot": {"price":80,"stock":4,"each":1},
    "pan": {"price":70,"stock":4,"each":1},
    "grill": {"price":60,"stock":4,"each":1},
    "worm": {"price":2,"stock":120,"each":10},
    "dough": {"price":3,"stock":80,"each":10},
    "rice": {"price":3,"stock":100,"each":10},
    "salt": {"price":2,"stock":100,"each":10},
    "riceBox": {"price":6,"stock":40,"each":3},
    "seedKangkong": {"price":4,"stock":100,"each":8},
    "seedScallion": {"price":5,"stock":100,"each":8},
    "seedCabbage": {"price":8,"stock":60,"each":6},
    "seedCarrot": {"price":8,"stock":60,"each":6},
    "seedChili": {"price":10,"stock":40,"each":4},
    "seedPumpkin": {"price":25,"stock":20,"each":2},
    "scrollFriedMinnow": {"price":40,"stock":3,"each":1},
    "scrollGrilledFish": {"price":40,"stock":3,"each":1},
    "bowl": {"price":5,"stock":60,"each":5},
    "scrubber": {"price":4,"stock":60,"each":5},
    "ash": {"price":2,"stock":100,"each":10},
    "bucket": {"price":20,"stock":30,"each":4},
    "bucketIron": {"price":70,"stock":6,"each":1},
    "brush": {"price":60,"stock":6,"each":1},
    "soap": {"price":8,"stock":60,"each":10},
    "apron": {"price":120,"stock":4,"each":1},
    "seedDaikon": {"price":10,"stock":40,"each":4},
    "seedCorn": {"price":12,"stock":40,"each":4},
    "seedTomato": {"price":14,"stock":40,"each":4},
    "seedBasil": {"price":8,"stock":40,"each":4},
    "seedSweetPotato": {"price":14,"stock":40,"each":4},
    "seedGarlic": {"price":10,"stock":40,"each":4},
    "rodTeak": {"price":240,"stock":3,"each":1},
    "floatQuill": {"price":90,"stock":4,"each":1},
    "hookSteel": {"price":90,"stock":4,"each":1},
    "lineBraid": {"price":90,"stock":4,"each":1},
    "netSmall": {"price":110,"stock":4,"each":1},
    "hoeIron": {"price":180,"stock":4,"each":1},
    "canCopper": {"price":150,"stock":4,"each":1},
    "sickle": {"price":120,"stock":4,"each":1},
    "krabung": {"price":150,"stock":4,"each":1},
    "mortar": {"price":130,"stock":4,"each":1},
    "steamer": {"price":160,"stock":4,"each":1},
    "cleaver": {"price":130,"stock":4,"each":1},
    "jar": {"price":110,"stock":6,"each":2},
    "wok": {"price":190,"stock":4,"each":1},
    "cricket": {"price":4,"stock":80,"each":10},
    "branBait": {"price":4,"stock":80,"each":10},
    "shrimpLive": {"price":6,"stock":60,"each":10},
    "sugar": {"price":6,"stock":80,"each":10},
    "oil": {"price":6,"stock":80,"each":10},
    "tamarind": {"price":5,"stock":80,"each":10},
    "egg": {"price":6,"stock":60,"each":10},
    "manure": {"price":8,"stock":60,"each":10},
    "seedEggplant": {"price":18,"stock":40,"each":4},
    "seedCucumber": {"price":16,"stock":40,"each":4},
    "seedLongBean": {"price":16,"stock":40,"each":4},
    "seedLemongrass": {"price":20,"stock":40,"each":4},
    "seedGalangal": {"price":26,"stock":30,"each":4},
    "seedLime": {"price":70,"stock":12,"each":2},
    "seedPapaya": {"price":32,"stock":20,"each":2},
    "scrollSomTam": {"price":90,"stock":3,"each":1},
    "scrollOmelette": {"price":60,"stock":3,"each":1},
    "rodMaster": {"price":600,"stock":2,"each":1},
    "floatBell": {"price":220,"stock":3,"each":1},
    "hookTwin": {"price":220,"stock":3,"each":1},
    "lineSilk": {"price":220,"stock":3,"each":1},
    "netLong": {"price":260,"stock":3,"each":1},
    "hoeSteel": {"price":420,"stock":3,"each":1},
    "canBrass": {"price":360,"stock":3,"each":1},
    "shears": {"price":280,"stock":3,"each":1},
    "yoke": {"price":300,"stock":3,"each":1},
    "potBrass": {"price":460,"stock":3,"each":1},
    "stoveBig": {"price":380,"stock":3,"each":1},
    "panBrass": {"price":440,"stock":3,"each":1},
    "steamerBamboo": {"price":330,"stock":3,"each":1},
    "hotpot": {"price":520,"stock":2,"each":1},
    "ladle": {"price":50,"stock":10,"each":1},
    "tok": {"price":150,"stock":6,"each":1},
    "antEggs": {"price":14,"stock":50,"each":10},
    "lure": {"price":70,"stock":10,"each":2},
    "fermentedBait": {"price":12,"stock":50,"each":10},
    "stickyRice": {"price":7,"stock":80,"each":10},
    "flour": {"price":7,"stock":80,"each":10},
    "soy": {"price":12,"stock":60,"each":10},
    "pepper": {"price":14,"stock":60,"each":10},
    "bananaLeaf": {"price":5,"stock":80,"each":10},
    "seedMango": {"price":95,"stock":10,"each":2},
    "seedBanana": {"price":60,"stock":12,"each":2},
    "seedCoconut": {"price":110,"stock":8,"each":2},
    "seedGinger": {"price":38,"stock":30,"each":4},
    "seedTurmeric": {"price":38,"stock":30,"each":4},
    "seedTaro": {"price":42,"stock":30,"each":4},
    "seedWatermelon": {"price":46,"stock":20,"each":2},
    "scrollGreenCurry": {"price":160,"stock":2,"each":1},
    "scrollHoMok": {"price":160,"stock":2,"each":1}
  }$town$::jsonb),
  ('shelf', $town${
    "basic": ["rod","hoe","can","pot","pan","grill","worm","dough","rice","salt","riceBox","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedChili","seedPumpkin","scrollFriedMinnow","scrollGrilledFish","bowl","scrubber","ash","bucket"],
    "unlocks": ["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato","cricket","seedCucumber","oil","egg","scrollOmelette","mortar","seedLongBean","sugar","seedEggplant","branBait","wok","seedLemongrass","jar","seedGalangal","shrimpLive","steamer","seedLime","cleaver","seedPapaya","scrollSomTam","tamarind","manure","floatQuill","hookSteel","lineBraid","netSmall","rodTeak","hoeIron","canCopper","sickle","krabung","bucketIron","brush","soap","apron","antEggs","seedGinger","soy","stickyRice","flour","seedBanana","bananaLeaf","pepper","seedTurmeric","seedTaro","fermentedBait","seedWatermelon","steamerBamboo","seedCoconut","seedMango","lure","potBrass","panBrass","hotpot","stoveBig","ladle","tok","scrollGreenCurry","scrollHoMok","floatBell","hookTwin","lineSilk","netLong","rodMaster","hoeSteel","canBrass","shears","yoke"]
  }$town$::jsonb),
  ('rules', $town${
    "slots": 5,
    "rounds": [7,19],
    "dawn": 5
  }$town$::jsonb),
  ('carries', $town${
    "basket": 5,
    "krabung": 5,
    "yoke": 5
  }$town$::jsonb),
  ('order', $town${
    "n": {"fish":[4,8],"crop":[4,8],"made":[2,4]},
    "asks": {"fish":[["minnow",0],["barb",0],["tilapia",0],["perch",0],["catfish",0],["gourami",7],["crab",16],["snail",16]],"crop":[["kangkong",0],["scallion",0],["cabbage",0],["carrot",0],["daikon",5],["corn",4],["chili",0],["basil",2],["cucumber",8],["longBean",13]],"made":[["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["sourCurry",5],["friedGourami",17],["omelette",10],["friedRice",17],["fishSauce",0],["compost",0],["growFert",0],["driedFish",7],["saltedFish",19],["pickle",19],["rope",7],["fermentedFish",42],["shrimpPaste",42],["driedChili",42],["riceNoodle",46],["toastedRice",42]]}
  }$town$::jsonb),
  ('hints', $town${
    "price": {"1":15,"2":40,"3":90},
    "ids": [["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["roastSweetPotato",6],["stirKangkong",1],["basilCatfish",2],["tomYum",3],["sourCurry",5],["friedPerch",1],["fishCake",2],["spicyEel",2],["grilledPrawn",0],["steamedGoby",0],["pumpkinSoup",0],["shabu",5],["fishSauce",0],["compost",0],["growFert",0],["guardFert",1],["pestCure",2],["basket",0],["somTam",25],["grilledEggplant",15],["tomKha",23],["friedGourami",17],["crabCurry",20],["steamedSheatfish",23],["friedFrog",17],["laab",24],["omelette",10],["snailCurry",20],["candiedPumpkin",14],["friedRice",17],["driedFish",0],["saltedFish",19],["curryPaste",20],["pickle",19],["charcoal",7],["rope",0],["krabung",0],["soap",9],["greenCurry",55],["khanomJeen",55],["hoMok",55],["mangoStickyRice",56],["bananaInCoconut",55],["taroPudding",59],["steamedCroaker",44],["gingerFish",52],["turmericFish",50],["jungleCurry",58],["megaLaab",42],["watermelonSlices",53],["khantoke",60],["naamPrik",23],["coconutMilk",55],["fermentedFish",19],["shrimpPaste",21],["driedChili",0],["riceNoodle",46],["toastedRice",17],["yoke",7]]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v106>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The rest of a purse beside its coins (v105): the bag, what was bought this
-- round, what is left with the uncle, and so on, as lib/town/trade.ts's Purse.
-- Null until the member first does something that needs one.
alter table public.town_purses add column if not exists doc jsonb;

-- What belongs to the whole village, a document to a key: the stall's stock
-- sold this round, how far the uncle's shelf has opened and how today's order
-- stands, and what has been found.
create table if not exists public.town_things (
  key        text primary key check (key ~ '^[a-z][a-z_]{0,39}$'),
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.town_things enable row level security;
revoke all on public.town_things from anon, authenticated;

insert into public.town_things (key, doc) values
  ('stall', '{"round": 0, "sold": {}}'::jsonb),
  ('village', '{"unlocked": 0, "day": -1, "got": {}, "opened": -1}'::jsonb),
  ('found', '[]'::jsonb)
  on conflict (key) do nothing;

/* ── the rules, in a schema no browser reaches ───────────────────────────── */

create schema if not exists town;
revoke all on schema town from public, anon, authenticated;

-- The moment, in the milliseconds the code counts in.
create or replace function town.now_ms()
returns bigint language sql stable
as $$ select floor(extract(epoch from now()) * 1000)::bigint $$;

create or replace function town.cat(p_key text)
returns jsonb language sql stable set search_path = public
as $$ select c.data from public.town_catalog c where c.key = p_key $$;

create or replace function town.no(p_why text)
returns jsonb language sql immutable
as $$ select jsonb_build_object('ok', false, 'why', p_why) $$;

-- lib/town/farm.ts's roll(): a number in [0, 1) from a word and a few whole
-- numbers, the same for everybody. Thirty-two bit arithmetic, as the code's.
create or replace function town.roll(p_word text, variadic p_nums bigint[] default '{}')
returns double precision language plpgsql immutable
as $$
declare
  s text := p_word || '|' || array_to_string(p_nums, '|');
  h bigint := 2166136261;
  i integer;
begin
  for i in 1..char_length(s) loop
    h := h # ascii(substr(s, i, 1));
    h := ((h::numeric * 16777619) % 4294967296)::bigint;
  end loop;
  h := h # (h >> 15);
  h := ((h::numeric * 2246822507) % 4294967296)::bigint;
  h := h # (h >> 13);
  h := ((h::numeric * 3266489909) % 4294967296)::bigint;
  h := h # (h >> 16);
  return h::double precision / 4294967296;
end;
$$;

-- The uncle's round a moment is in (two a day, at his hours in Bangkok), the
-- week (from Monday in Bangkok) and the game's day (from dawn in Bangkok).
create or replace function town.round_of(p_now bigint)
returns integer language sql stable
as $$
  with r as (select (town.cat('rules')->'rounds'->>0)::int as a, (town.cat('rules')->'rounds'->>1)::int as b),
       t as (select p_now + 7 * 3600000::bigint - r.a * 3600000::bigint as t, r.a, r.b from r)
  select ((t.t / 86400000) * 2 + case when t.t - (t.t / 86400000) * 86400000 >= (t.b - t.a) * 3600000 then 1 else 0 end)::integer from t
$$;

create or replace function town.week_of(p_now bigint)
returns integer language sql immutable
as $$ select ((((p_now + 7 * 3600000::bigint) / 86400000) + 3) / 7)::integer $$;

create or replace function town.day_of(p_now bigint)
returns integer language sql stable
as $$ select ((p_now + 7 * 3600000::bigint - (town.cat('rules')->>'dawn')::int * 3600000::bigint) / 86400000)::integer $$;

/* ── the bag ─────────────────────────────────────────────────────────────── */

create or replace function town.held(p_bag jsonb, p_id text)
returns integer language sql immutable
as $$ select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s where s->>'item' = p_id $$;

create or replace function town.room(p_bag jsonb, p_id text)
returns integer language sql stable
as $$
  select coalesce(sum(case when s = 'null'::jsonb then st.stack when s->>'item' = p_id then st.stack - (s->>'n')::int else 0 end), 0)::integer
    from jsonb_array_elements(p_bag) s, (select (town.cat('items')->p_id->>'stack')::int as stack) st
$$;

-- More of something: onto its own stacks first, then into the first empty
-- slots. (It must have the room.)
create or replace function town.put(p_bag jsonb, p_id text, p_n integer)
returns jsonb language plpgsql stable
as $$
declare
  stack integer := (town.cat('items')->p_id->>'stack')::int;
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  add integer;
  i integer;
begin
  for i in 0..jsonb_array_length(bag) - 1 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id and (s->>'n')::int < stack then
      add := least(more, stack - (s->>'n')::int);
      bag := jsonb_set(bag, array[i::text, 'n'], to_jsonb((s->>'n')::int + add));
      more := more - add;
    end if;
  end loop;
  for i in 0..jsonb_array_length(bag) - 1 loop
    exit when more <= 0;
    if bag->i = 'null'::jsonb then
      add := least(more, stack);
      bag := jsonb_set(bag, array[i::text], jsonb_build_object('item', p_id, 'n', add));
      more := more - add;
    end if;
  end loop;
  return bag;
end;
$$;

-- Some of something taken out, from its last stacks first. (It must hold as many.)
create or replace function town.take(p_bag jsonb, p_id text, p_n integer)
returns jsonb language plpgsql immutable
as $$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else jsonb_build_object('item', p_id, 'n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$$;

/* ── the hand, and what is worn ──────────────────────────────────────────── */

create or replace function town.hold(p_purse jsonb, p_slot integer)
returns jsonb language plpgsql immutable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item'));
end;
$$;

create or replace function town.wear(p_purse jsonb, p_slot integer)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  more integer;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  bag jsonb;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  more := (town.cat('carries')->>(s->>'item'))::int;
  if more is null then return town.no('none'); end if;
  if wears ? (s->>'item') then return town.no('worn'); end if;
  bag := jsonb_set(p_purse->'bag', array[p_slot::text],
    case when (s->>'n')::int > 1 then s || jsonb_build_object('n', (s->>'n')::int - 1) else 'null'::jsonb end);
  bag := bag || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, more));
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag, 'wears', wears || to_jsonb(s->>'item')));
end;
$$;

create or replace function town.take_off(p_purse jsonb, p_item text)
returns jsonb language plpgsql stable
as $$
declare
  more integer := (town.cat('carries')->>p_item)::int;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  things jsonb;
  slots integer;
begin
  if more is null or not wears ? p_item then return town.no('none'); end if;
  select coalesce(jsonb_agg(s order by ord), '[]'::jsonb) into things
    from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord) where s <> 'null'::jsonb;
  slots := jsonb_array_length(p_purse->'bag') - more;
  if jsonb_array_length(things) + 1 > slots then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', things || jsonb_build_array(jsonb_build_object('item', p_item, 'n', 1))
      || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, slots - jsonb_array_length(things) - 1)),
    'wears', (select coalesce(jsonb_agg(w order by ord), '[]'::jsonb) from jsonb_array_elements(wears) with ordinality y(w, ord) where w <> to_jsonb(p_item))));
end;
$$;

/* ── the uncle's stall ───────────────────────────────────────────────────── */

-- What the stall has open when so many of the uncle's orders were filled.
create or replace function town.shelf_of(p_unlocked integer)
returns jsonb language sql stable
as $$
  select (town.cat('shelf')->'basic') || coalesce((
    select jsonb_agg(u order by ord) from jsonb_array_elements(town.cat('shelf')->'unlocks') with ordinality x(u, ord)
     where ord <= greatest(0, p_unlocked)), '[]'::jsonb)
$$;

-- lib/town/trade.ts's buy(): `p_shelf` is what is open (everything he ever
-- sells, when it is null).
create or replace function town.buy(p_purse jsonb, p_stall jsonb, p_id text, p_n integer, p_now bigint, p_shelf jsonb)
returns jsonb language plpgsql stable
as $$
declare
  g jsonb := town.cat('goods')->p_id;
  cur integer := town.round_of(p_now);
  sold integer;
  bought integer;
  lim_sold integer;
  lim_each integer;
  lim_full integer;
  lim_coins integer;
  may integer;
  stop text;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if g is null or (p_shelf is not null and not p_shelf ? p_id) then
    return town.no('none');
  end if;
  sold := case when (p_stall->>'round')::int = cur then coalesce((p_stall->'sold'->>p_id)::int, 0) else 0 end;
  bought := case when (p_purse->'bought'->>'round')::int = cur then coalesce((p_purse->'bought'->'n'->>p_id)::int, 0) else 0 end;
  lim_sold := greatest(0, (g->>'stock')::int - sold);
  lim_each := (g->>'each')::int - bought;
  lim_full := town.room(p_purse->'bag', p_id);
  lim_coins := floor((p_purse->>'coins')::numeric / (g->>'price')::int)::int;
  may := greatest(0, least(lim_sold, lim_each, lim_full, lim_coins));
  stop := case when lim_sold <= may then 'sold' when lim_each <= may then 'each' when lim_full <= may then 'full' else 'coins' end;
  if p_n > may then return town.no(stop); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object(
      'coins', (p_purse->>'coins')::int - p_n * (g->>'price')::int,
      'bag', town.put(p_purse->'bag', p_id, p_n),
      'bought', jsonb_build_object('round', cur, 'n',
        (case when (p_purse->'bought'->>'round')::int = cur then p_purse->'bought'->'n' else '{}'::jsonb end) || jsonb_build_object(p_id, bought + p_n))),
    'stall', jsonb_build_object('round', cur, 'sold',
      (case when (p_stall->>'round')::int = cur then p_stall->'sold' else '{}'::jsonb end) || jsonb_build_object(p_id, sold + p_n)));
end;
$$;

-- leave(): some of what is in a slot, left with the uncle to be sold.
create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  cur integer := town.round_of(p_now);
  pays integer;
  lots jsonb := p_purse->'left';
  same integer := -1;
  i integer;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb or (s->>'n')::int < p_n then return town.no('none'); end if;
  pays := (town.cat('items')->(s->>'item')->>'pays')::int;
  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;
  for i in 0..jsonb_array_length(lots) - 1 loop
    if lots->i->>'item' = s->>'item' and (lots->i->>'round')::int = cur and (lots->i->>'pays')::int = pays then same := i; exit; end if;
  end loop;
  if same < 0 then
    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur));
  else
    lots := jsonb_set(lots, array[same::text, 'n'], to_jsonb((lots->same->>'n')::int + p_n));
  end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = p_n then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - p_n) end),
    'left', lots));
end;
$$;

-- takeBack(): `p_at` counts along what he still holds (left this round or later).
create or replace function town.take_back(p_purse jsonb, p_at integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  cur integer := town.round_of(p_now);
  lots jsonb := p_purse->'left';
  lot jsonb;
  k integer := -1;
  hit integer := -1;
  i integer;
begin
  for i in 0..jsonb_array_length(lots) - 1 loop
    if (lots->i->>'round')::int >= cur then
      k := k + 1;
      if k = p_at then hit := i; exit; end if;
    end if;
  end loop;
  if hit < 0 then return town.no(case when jsonb_array_length(lots) > 0 then 'gone' else 'none' end); end if;
  lot := lots->hit;
  if town.room(p_purse->'bag', lot->>'item') < (lot->>'n')::int then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', town.put(p_purse->'bag', lot->>'item', (lot->>'n')::int), 'left', lots - hit));
end;
$$;

-- collect(): the money for everything his relatives have fetched.
create or replace function town.collect(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  cur integer := town.round_of(p_now);
  coins integer;
  kept jsonb;
begin
  select coalesce(sum((l->>'n')::int * (l->>'pays')::int) filter (where (l->>'round')::int < cur), 0)::int,
         coalesce(jsonb_agg(l order by ord) filter (where (l->>'round')::int >= cur), '[]'::jsonb)
    into coins, kept
    from jsonb_array_elements(p_purse->'left') with ordinality x(l, ord);
  if coins = 0 then return town.no('nothing'); end if;
  return jsonb_build_object('ok', true, 'coins', coins,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::int + coins, 'left', kept));
end;
$$;

/* ── the uncle's order ───────────────────────────────────────────────────── */

-- What he may ask for of a kind when so many things are open, in order.
create or replace function town.asks(p_kind text, p_stage integer)
returns text[] language sql stable
as $$
  select coalesce(array_agg(e->>0 order by ord), '{}')
    from jsonb_array_elements(town.cat('order')->'asks'->p_kind) with ordinality x(e, ord)
   where (e->>1)::int between 0 and p_stage
$$;

-- lib/town/orders.ts's wantsFor(): one thing from the river, one from the
-- plots, one from the kitchen, as [thing, how many].
create or replace function town.wants(p_day integer, p_stage integer)
returns jsonb language plpgsql stable
as $$
declare
  kinds constant text[] := array['fish', 'crop', 'made'];
  wants jsonb := '[]'::jsonb;
  pool text[];
  lo integer;
  hi integer;
  i integer;
begin
  for i in 0..2 loop
    pool := town.asks(kinds[i + 1], p_stage);
    if coalesce(array_length(pool, 1), 0) = 0 then pool := town.asks('fish', p_stage); end if;
    pool := array(select p from unnest(pool) with ordinality u(p, ord)
                   where not exists (select 1 from jsonb_array_elements(wants) w where w->>0 = p) order by ord);
    continue when coalesce(array_length(pool, 1), 0) = 0;
    lo := (town.cat('order')->'n'->kinds[i + 1]->>0)::int;
    hi := (town.cat('order')->'n'->kinds[i + 1]->>1)::int;
    wants := wants || jsonb_build_array(jsonb_build_array(
      pool[1 + floor(town.roll('want', p_day, i) * array_length(pool, 1))::int],
      lo + floor(town.roll('many', p_day, i) * (hi - lo + 1))::int));
  end loop;
  return wants;
end;
$$;

-- orderOf(): today's order as it stands.
create or replace function town.order_of(p_village jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  today integer := town.day_of(p_now);
  same boolean := (p_village->>'day')::int = today;
  unlocked integer := (p_village->>'unlocked')::int;
  opened boolean := (p_village->>'opened')::int = today;
  wants jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('item', w->>0, 'n', (w->>1)::int,
           'got', least((w->>1)::int, case when same then coalesce((p_village->'got'->>(w->>0))::int, 0) else 0 end)) order by ord), '[]'::jsonb)
    into wants
    from jsonb_array_elements(town.wants(today, case when opened then unlocked - 1 else unlocked end)) with ordinality x(w, ord);
  return jsonb_build_object('day', today, 'wants', wants,
    'filled', jsonb_array_length(wants) > 0 and not exists (select 1 from jsonb_array_elements(wants) w where (w->>'got')::int < (w->>'n')::int),
    'opens', case when opened then 'null'::jsonb else coalesce(town.cat('shelf')->'unlocks'->unlocked, 'null'::jsonb) end);
end;
$$;

-- give(): bring him some of what is in a slot, for today's order.
create or replace function town.give(p_purse jsonb, p_village jsonb, p_slot integer, p_n integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  ord_ jsonb;
  want jsonb;
  given integer;
  coins integer;
  got jsonb;
  filled boolean;
  opened jsonb;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  ord_ := town.order_of(p_village, p_now);
  select w into want from jsonb_array_elements(ord_->'wants') w where w->>'item' = s->>'item';
  if want is null or (want->>'got')::int >= (want->>'n')::int then return town.no('unwanted'); end if;
  given := least(p_n, (s->>'n')::int, (want->>'n')::int - (want->>'got')::int);
  coins := given * (town.cat('items')->(s->>'item')->>'pays')::int;
  got := (case when (p_village->>'day')::int = (ord_->>'day')::int then p_village->'got' else '{}'::jsonb end)
    || jsonb_build_object(s->>'item', (want->>'got')::int + given);
  filled := not exists (select 1 from jsonb_array_elements(ord_->'wants') w
    where (case when w->>'item' = s->>'item' then (want->>'got')::int + given else (w->>'got')::int end) < (w->>'n')::int);
  opened := case when filled and ord_->'opens' <> 'null'::jsonb then ord_->'opens' else 'null'::jsonb end;
  return jsonb_build_object('ok', true, 'given', given, 'coins', coins, 'opened', opened,
    'purse', p_purse || jsonb_build_object(
      'coins', (p_purse->>'coins')::int + coins,
      'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
        case when (s->>'n')::int = given then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - given) end)),
    'village', jsonb_build_object(
      'unlocked', (p_village->>'unlocked')::int + case when opened <> 'null'::jsonb then 1 else 0 end,
      'day', (ord_->>'day')::int, 'got', got,
      'opened', case when opened <> 'null'::jsonb then (ord_->>'day')::int else (p_village->>'opened')::int end));
end;
$$;

/* ── the uncle's hints ───────────────────────────────────────────────────── */

-- nextHint(): the first he has that the buyer has neither heard nor found, of
-- what can be made with what is open.
create or replace function town.next_hint(p_purse jsonb, p_found jsonb, p_stage integer)
returns text language sql stable
as $$
  select e->>0
    from jsonb_array_elements(town.cat('hints')->'ids') with ordinality x(e, ord)
   where (e->>1)::int between 0 and p_stage
     and not coalesce(p_purse->'hints', '[]'::jsonb) ? (e->>0)
     and not coalesce(p_purse->'recipes', '[]'::jsonb) ? (e->>0)
     and not coalesce(p_found, '[]'::jsonb) ? (e->>0)
   order by ord limit 1
$$;

create or replace function town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer)
returns jsonb language plpgsql stable
as $$
declare
  hint text := town.next_hint(p_purse, p_found, p_stage);
  price integer;
begin
  if hint is null then return town.no('none'); end if;
  price := (town.cat('hints')->'price'->>(town.cat('items')->hint->>'tier'))::int;
  if (p_purse->>'coins')::int < price then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'hint', hint, 'purse', p_purse || jsonb_build_object(
    'coins', (p_purse->>'coins')::int - price,
    'hints', coalesce(p_purse->'hints', '[]'::jsonb) || to_jsonb(hint)));
end;
$$;

/* ── keeping a purse ─────────────────────────────────────────────────────── */

-- Who is asking: signed in, with a proved character, as everything in town.
create or replace function town.member()
returns uuid language plpgsql stable set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the town is for a proved character' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- A purse nobody has used yet, as lib/town/trade.ts's newPurse().
create or replace function town.fresh()
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'bag', (select jsonb_agg('null'::jsonb) from generate_series(1, (town.cat('rules')->>'slots')::int)),
    'bought', '{"round": 0, "n": {}}'::jsonb, 'left', '[]'::jsonb,
    'stamina', '{"day": -1, "left": 0}'::jsonb, 'meals', '{"day": -1, "eaten": [false, false, false]}'::jsonb,
    'eating', 'null'::jsonb, 'buff', 'null'::jsonb, 'best', '{}'::jsonb, 'recipes', '[]'::jsonb)
$$;

-- A member's purse, whole: what is kept of it, its coins, and from the
-- banker's ledger (v105) what is left to change and what was changed this
-- week. With `p_hold`, the row is made if it is not there and held until the
-- transaction ends.
create or replace function town.purse_of(p_member uuid, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  coins integer;
  doc jsonb;
  left_ record;
begin
  if p_hold then
    insert into public.town_purses (member_id) values (p_member) on conflict (member_id) do nothing;
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member for update;
  else
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member;
  end if;
  select l.profile_left, l.gallery_left into left_ from public.town_popoto_left(p_member) l;
  return coalesce(doc, town.fresh()) || jsonb_build_object(
    'coins', coalesce(coins, 0),
    'popoto', jsonb_build_object('profile', coalesce(left_.profile_left, 0), 'gallery', coalesce(left_.gallery_left, 0)),
    'changed', jsonb_build_object('week', town.week_of(now_), 'n', coalesce((
      select sum(e.popoto) from public.town_exchanges e
       where e.member_id = p_member
         and e.week = date_trunc('week', to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::date), 0)::int));
end;
$$;

-- Keep a purse as a rule gave it back: its coins in their column, the rest
-- as the document (what the ledger says is never kept twice).
create or replace function town.keep_purse(p_member uuid, p_purse jsonb)
returns void language sql set search_path = public
as $$
  update public.town_purses
     set coins = (p_purse->>'coins')::int, doc = p_purse - 'coins' - 'popoto' - 'changed', updated_at = now()
   where member_id = p_member
$$;

create or replace function town.thing(p_key text, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  doc jsonb;
begin
  if p_hold then select t.doc into doc from public.town_things t where t.key = p_key for update;
  else select t.doc into doc from public.town_things t where t.key = p_key; end if;
  return doc;
end;
$$;

create or replace function town.keep_thing(p_key text, p_doc jsonb)
returns void language sql set search_path = public
as $$ update public.town_things set doc = p_doc, updated_at = now() where key = p_key $$;

-- What a function answers: what the rule said (less the documents it handed
-- back), the purse as it now stands, and the moment.
create or replace function town.answer(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$
  select (p_did - 'purse' - 'stall' - 'village')
    || jsonb_build_object('purse', town.purse_of(p_member, false), 'now', town.now_ms())
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- My purse.
create or replace function public.town_me()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$$;

-- The stall as everybody sees it: what was sold this round, what is open on
-- the shelf, today's order as it stands, and what has been found.
create or replace function public.town_stall()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  village jsonb := town.thing('village', false);
begin
  return jsonb_build_object(
    'stall', town.thing('stall', false),
    'shelf', town.shelf_of((village->>'unlocked')::int),
    'order', town.order_of(village, town.now_ms()),
    'unlocked', (village->>'unlocked')::int,
    'found', town.thing('found', false),
    'now', town.now_ms());
end;
$$;

create or replace function public.town_buy(p_item text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  stall jsonb := town.thing('stall', true);
  village jsonb := town.thing('village', false);
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.buy(purse, stall, p_item, p_n, town.now_ms(), town.shelf_of((village->>'unlocked')::int));
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('stall', did->'stall');
  end if;
  return town.answer(me, did) || jsonb_build_object('stall', town.thing('stall', false));
end;
$$;

create or replace function public.town_leave(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.leave(town.purse_of(me, true), p_slot, p_n, town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_take_back(p_at integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.take_back(town.purse_of(me, true), coalesce(p_at, -1), town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_collect()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.collect(town.purse_of(me, true), town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- Take up the thing in a slot to hold it in the hand; with no slot, put away
-- what is held.
create or replace function public.town_hold(p_slot integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_slot is null then did := jsonb_build_object('ok', true, 'purse', purse || '{"hand": null}'::jsonb);
  else did := town.hold(purse, p_slot); end if;
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_wear(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.wear(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_take_off(p_item text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.take_off(town.purse_of(me, true), p_item);
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- Throw away what is in a slot, to make room.
create or replace function public.town_drop(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
begin
  if p_slot is null or p_slot < 0 or p_slot >= jsonb_array_length(purse->'bag') or purse->'bag'->p_slot = 'null'::jsonb then
    return town.answer(me, town.no('none'));
  end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', jsonb_set(purse->'bag', array[p_slot::text], 'null'::jsonb)));
  return town.answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- Bring the uncle some of what is in a slot, for today's order.
create or replace function public.town_give(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  village jsonb := town.thing('village', true);
  did jsonb := town.give(purse, village, p_slot, p_n, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('village', did->'village');
    village := did->'village';
  end if;
  return town.answer(me, did) || jsonb_build_object(
    'order', town.order_of(village, town.now_ms()),
    'shelf', town.shelf_of((village->>'unlocked')::int));
end;
$$;

-- Buy the uncle's next hint.
create or replace function public.town_hint()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.buy_hint(purse, town.thing('found', false), (town.thing('village', false)->>'unlocked')::int);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'town_me()', 'town_stall()', 'town_buy(text, integer)', 'town_leave(integer, integer)', 'town_take_back(integer)',
    'town_collect()', 'town_hold(integer)', 'town_wear(integer)', 'town_take_off(text)', 'town_drop(integer)',
    'town_give(integer, integer)', 'town_hint()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, jsonb_typeof(data) as is, case jsonb_typeof(data) when 'object' then (select count(*) from jsonb_object_keys(data)) end as n
--     from public.town_catalog order by key;
--   -- carries | object | 3
--   -- goods   | object | 97
--   -- hints   | object | 2
--   -- items   | object | 223
--   -- order   | object | 2
--   -- rules   | object | 3
--   -- shelf   | object | 2
--
--   select key, doc from public.town_things order by key;
--   -- found   | []
--   -- stall   | {"sold": {}, "round": 0}
--   -- village | {"day": -1, "got": {}, "opened": -1, "unlocked": 0}
--
--   select count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and table_name in ('town_catalog', 'town_things', 'town_purses')
--      and grantee in ('anon', 'authenticated');
--   -- 0
--
--   select has_schema_privilege('anon', 'town', 'usage') as anon, has_schema_privilege('authenticated', 'town', 'usage') as member;
--   -- false | false
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member,
--          count(*) as all
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_%'
--      and p.proname not in ('town_vote', 'town_vote_tally', 'town_my_vote', 'town_bank', 'town_exchange', 'town_popoto_left');
--   -- 0 | 12 | 12
--
--   select jsonb_array_length(town.shelf_of(0)) as basic, jsonb_array_length(town.wants(town.day_of(town.now_ms()), 0)) as wants;
--   -- 23 | 3
