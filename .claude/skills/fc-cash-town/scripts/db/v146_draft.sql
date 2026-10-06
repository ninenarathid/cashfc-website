-- v146 — three helpings to a meal's hours, and a meal's buffs at their levels
--
-- Run this once in the Supabase SQL editor, after v145 (it stops at its first
-- line without v123's fountain). Running it again is safe. **Run it after the
-- site's own code for it is live**: a page from before goes on as it was (it
-- reads the one buff and the meal's mark this file still writes, and shows a
-- meal as eaten after its first helping), and a page with the code and a
-- database without this file asks its keeper how many helpings a meal takes
-- and is told one, so it shows nothing that would be refused.
--
-- Why. The owner, 2026-10-06, of a food system nobody used:
--
--   "ปรับให้ กินข้าวได้ 3 จานต่อมื้อ ถ้ากินข้าวที่มีบัฟเหมือนกัน buff จะ stack เป็นขั้น 2 3 4 ได้
--    และบัฟจะแรงขึ้น จนถึงขั้น OP"
--   "จานละ 5 นาที แยกกันกินได้ไม่ต้องกินทีเดียว buff stack กันได้ แต่เวลาไม่เพิ่ม ยกเว้น
--    จานต่อไปจะเป็นบัฟใหม่"
--   "ไม่เกิน max stamina"   "Op ได้ แต่มากสุดแค่ x3 พอ"
--
-- What it does (the rules are lib/town/stamina.ts and items.ts again):
--
--   * A meal's hours take three helpings (the catalog's `stamina.bowls`), five
--     minutes each, each when one likes. A purse counts them (`meals.bowls`)
--     beside the mark it always kept (`meals.eaten`); a meal eaten before this
--     file is one of its three.
--   * What meals leave is held together (`buffs`), each at a level. A helping
--     that leaves a buff the purse has raises it a level, to the fourth at the
--     most, and leaves its hours as they run; one that leaves another is a
--     buff of its own, at the first, for its own three hours. The one buff a
--     purse always kept (`buff`) is still written, the last eaten for.
--   * What each does at each level is the catalog's `stamina.steps`: hearty
--     takes 30, 45, 55, 67% off what a thing costs; a keen eye makes the
--     strike's moment 1.5, 2, 2.5, 3 times as long; green fingers add as much
--     to a watering; a lucky meal brings the rare fish as much oftener. (Steady
--     hands are the page's: the fight is played there.) A blessing of the
--     fountain's is the first level, as it was.
--
-- What it changes: one catalog row written over (`stamina`: three entries
-- more); six rules new (`town.meal_buffs`, `level_of`, `buff_by`,
-- `bowls_today`, `raised`, `helped`); ten functions written again, each word
-- for word as it last ran but for the lines meant (scripts/db/v146.lines.mjs,
-- build-v146.mjs): `town.sit_down` (v107's), `town.chew` (v111's),
-- `town.has_buff`, `town.cost_of`, `town.strike_window`, `town.water`,
-- `town.purse_of` and `public.town_cast` (v123's), `town.odds` and
-- `town.cast_line` (v122's, each with one more argument at its end, untold
-- unless given: the two of six and seven arguments are dropped). No table, no
-- knob, no row of anybody's touched: a purse is changed only as its owner
-- next eats.

do $$ begin
  if to_regprocedure('town.has_buff(jsonb, bigint, text)') is null then raise exception 'v123 has not run: the fountain''s rules are not here'; end if;
end $$;

-- <catalog:v146> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('stamina', $town${
    "max": 100,
    "minutes": 5,
    "together": 0.1,
    "company": 5,
    "meals": [5,11,17],
    "hours": 3,
    "buffs": {"calm":0.2,"keen":0.5,"lucky":0.5,"hearty":0.3,"green":0.5},
    "bowls": 3,
    "levels": 4,
    "steps": {"calm":[0.2,0.6,1.2,2],"keen":[0.5,1,1.5,2],"lucky":[0.5,1,1.5,2],"green":[0.5,1,1.5,2],"hearty":[0.3,0.45,0.55,0.67],"forage":[1,2,2,3],"net":[0.5,1,1.5,2]}
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
    "arapaimaRoast": {"stamina":45,"buff":"hearty","recipe":{"needs":[["arapaima",1],["salt",3],["chili",2]],"in":["grill"],"serves":10,"cooks":3}},
    "mushroomSoup": {"stamina":26,"buff":"forage","recipe":{"needs":[["scallion",1],["salt",1],["shiitake",3]],"in":["pot"],"serves":3,"cooks":1}},
    "mushroomSkewer": {"stamina":16,"buff":"forage","recipe":{"needs":[["salt",1],["shiitake",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "fishOnStick": {"stamina":20,"buff":null,"recipe":{"needs":[["salt",1],["barb",1]],"in":["skewer"],"serves":2,"cooks":1}},
    "roastYam": {"stamina":18,"buff":"forage","recipe":{"needs":[["wildYam",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "roastedApple": {"stamina":12,"buff":"net","recipe":{"needs":[["wildApple",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "mushroomRisotto": {"stamina":34,"buff":"forage","recipe":{"needs":[["rice",2],["scallion",1],["salt",1],["porcini",1]],"in":["pot"],"serves":4,"cooks":1}},
    "fernSalad": {"stamina":20,"buff":"forage","recipe":{"needs":[["fiddlehead",3],["salt",1],["mint",1]],"in":["pan"],"serves":2,"cooks":1}},
    "herbTea": {"stamina":12,"buff":"net","recipe":{"needs":[["mint",1],["chamomile",2]],"in":["pot"],"serves":3,"cooks":1}},
    "berryCompote": {"stamina":22,"buff":"net","recipe":{"needs":[["blueberry",2],["raspberry",2],["wildStrawberry",1]],"in":["pot"],"serves":3,"cooks":1}},
    "bakedApple": {"stamina":20,"buff":"net","recipe":{"needs":[["wildApple",3],["chestnut",1]],"in":["grill"],"serves":3,"cooks":1}},
    "roastChestnut": {"stamina":16,"buff":"net","recipe":{"needs":[["salt",1],["chestnut",4]],"in":["pan"],"serves":3,"cooks":1}},
    "forestStew": {"stamina":38,"buff":"forage","recipe":{"needs":[["wildYam",2],["shiitake",1],["carrot",1],["rosemary",1]],"in":["pot"],"serves":6,"cooks":2}},
    "bambooShootStir": {"stamina":24,"buff":"forage","recipe":{"needs":[["chili",1],["salt",1],["bambooShoot",2]],"in":["pan"],"serves":3,"cooks":1}},
    "rosemaryFish": {"stamina":30,"buff":"net","recipe":{"needs":[["perch",1],["salt",1],["rosemary",1]],"in":["grill"],"serves":2,"cooks":1}},
    "ginsengSoup": {"stamina":50,"buff":"forage","recipe":{"needs":[["shiitake",2],["scallion",1],["salt",1],["ginseng",1]],"in":["pot"],"serves":4,"cooks":1}},
    "moonTea": {"stamina":30,"buff":"net","recipe":{"needs":[["chamomile",1],["mint",1],["moonflower",1]],"in":["pot"],"serves":4,"cooks":1}},
    "truffleEggs": {"stamina":44,"buff":"forage","recipe":{"needs":[["egg",2],["salt",1],["truffle",1]],"in":["pan"],"serves":3,"cooks":1}},
    "mushroomOmelette": {"stamina":30,"buff":"forage","recipe":{"needs":[["egg",2],["salt",1],["chanterelle",1]],"in":["pan"],"serves":2,"cooks":1}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v146>

-- ─── What meals have left, and at what level ─────────────────────────────

-- What meals have left a purse, each while it lasts (a purse from before levels has its one buff, at the first).
create or replace function town.meal_buffs(p_purse jsonb, p_now bigint)
returns jsonb language sql immutable
as $$
  select coalesce(jsonb_agg(e.b order by e.ord), '[]'::jsonb)
    from jsonb_array_elements(
      case when jsonb_typeof(p_purse->'buffs') = 'array' then p_purse->'buffs'
           when coalesce(p_purse->'buff', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_array((p_purse->'buff') || jsonb_build_object('level', 1))
           else '[]'::jsonb end) with ordinality as e(b, ord)
   where (e.b->>'until')::bigint > p_now
$$;

-- The level a purse has a buff at: a meal's own (1 to 4), or 1 for a blessing of the fountain's; 0 for none.
create or replace function town.level_of(p_purse jsonb, p_now bigint, p_id text)
returns integer language sql immutable
as $$
  select greatest(
    coalesce((select (e.b->>'level')::int from jsonb_array_elements(town.meal_buffs(p_purse, p_now)) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1), 0),
    case when exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_purse->'blessed') = 'array' then p_purse->'blessed' else '[]'::jsonb end) b
                       where b->>'id' = p_id and (b->>'until')::bigint > p_now) then 1 else 0 end)
$$;

-- How much a meal's buff does for a purse now: the catalog's step for its level; nothing, with none.
create or replace function town.buff_by(p_purse jsonb, p_now bigint, p_id text)
returns double precision language sql stable
as $$
  select case when l.level >= 1
    then coalesce((c.st->'steps'->p_id->>(least((c.st->>'levels')::int, l.level) - 1))::double precision, 0::double precision)
    else 0::double precision end
    from (select town.level_of(p_purse, p_now, p_id) as level) l, (select town.cat('stamina') as st) c
$$;

-- How many helpings each of today's meals has had (a meal eaten before helpings were counted is one).
create or replace function town.bowls_today(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select case
    when (p_purse->'meals'->>'day')::int is distinct from town.day_of(p_now) then '[0, 0, 0]'::jsonb
    when jsonb_typeof(p_purse->'meals'->'bowls') = 'array' then p_purse->'meals'->'bowls'
    else (select jsonb_agg(case when x.e::boolean then 1 else 0 end order by x.ord) from jsonb_array_elements_text(p_purse->'meals'->'eaten') with ordinality as x(e, ord)) end
$$;

-- What a purse has of meals' buffs once a helping that leaves one is eaten up: `buffs`, and `buff` as it was always kept.
create or replace function town.raised(p_purse jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  st jsonb := town.cat('stamina');
  live jsonb := town.meal_buffs(p_purse, p_now);
  at_ integer := (select (e.ord - 1)::int from jsonb_array_elements(live) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1);
  buffs jsonb;
begin
  if at_ is null then
    buffs := live || jsonb_build_array(jsonb_build_object('id', p_id, 'level', 1, 'until', p_now + (st->>'hours')::bigint * 3600000));
    at_ := jsonb_array_length(buffs) - 1;
  else
    buffs := jsonb_set(live, array[at_::text, 'level'], to_jsonb(least((st->>'levels')::int, (live->at_->>'level')::int + 1)));
  end if;
  return jsonb_build_object('buffs', buffs,
    'buff', case when st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', buffs->at_->'until') else coalesce(p_purse->'buff', 'null'::jsonb) end);
end;
$$;

-- A purse as it is told: with how many helpings each of the day's meals has had (a page learns by it that helpings are counted here).
create or replace function town.helped(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$ select p_purse || jsonb_build_object('meals', coalesce(p_purse->'meals', '{}'::jsonb) || jsonb_build_object('bowls', town.bowls_today(p_purse, p_now))) $$;

-- ─── Written again: each as it last ran, but for the lines meant ─────────

-- <has_buff>
create or replace function town.has_buff(p_purse jsonb, p_now bigint, p_id text)
returns boolean language sql stable
as $$
  select town.level_of(p_purse, p_now, p_id) > 0
$$;
-- </has_buff>

-- <cost_of>
create or replace function town.cost_of(p_purse jsonb, p_n double precision, p_now bigint)
returns integer language sql stable
as $$
  select floor(p_n * (1::double precision - town.buff_by(p_purse, p_now, 'hearty')) + 0.5::double precision)::integer
$$;
-- </cost_of>

-- <strike_window>
create or replace function town.strike_window(p_purse jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select (c.f->>'strike')::double precision * (
    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision)))
    from (select town.cat('fishing') as f) c
$$;
-- </strike_window>

-- <sit_down>
create or replace function town.sit_down(p_purse jsonb, p_slot integer, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  meal integer := town.meal_of(p_now);
  bowls jsonb := town.bowls_today(p_purse, p_now);
begin
  if s is null or s = 'null'::jsonb or coalesce(town.cat('items')->(s->>'item')->>'kind', '') <> 'dish' then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb or (bowls->>meal)::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', s->>'item', 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - 1) end),
    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))
                from (select case when x.ord - 1 = meal then x.e::int + 1 else x.e::int end as n, x.ord from jsonb_array_elements_text(bowls) with ordinality as x(e, ord)) b),
    'eating', jsonb_build_object('dish', s->>'item', 'meal', meal, 'from', p_now, 'till', p_now, 'got', 0)));
end;
$$;
-- </sit_down>

-- <chew>
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised(p_purse, dish->>'buff', p_now) else '{}'::jsonb end;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));
end;
$$;
-- </chew>

-- <water>
create or replace function town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  slot integer;
  can jsonb;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'can' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean or ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null)
     or (town.growing(p, p_now)->>'spent')::boolean then return town.no('soil'); end if;
  if (seen->>'wet')::boolean then return town.no('wet'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = p_hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('dry'); end if;
  can := p_purse->'bag'->slot;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision
        + ((f->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f->'field'->>p_hand)::double precision, 1::double precision)
          * (1::double precision + town.buff_by(p_purse, p_now, 'green')))),
    'purse', town.spend(p_purse, (f->'costs'->>'water')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text], can || jsonb_build_object('water', (can->>'water')::numeric - (case when town.has_buff(p_purse, p_now, 'spring') then 0 else 1 end)))));
end;
$$;
-- </water>

-- <odds>
create or replace function town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_luck double precision default null)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  fish jsonb := town.cat('fish');
  flot jsonb := town.cat('flotsam');
  lucky_by double precision := coalesce(p_luck, (town.cat('stamina')->'buffs'->>'lucky')::double precision);
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
-- </odds>

-- <cast_line>
create or replace function town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision default null)
returns jsonb language plpgsql stable
as $$
declare
  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs, p_luck);
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
-- </cast_line>

-- (the two as they were, of six and of seven arguments: what called them calls these, with nothing told of how much luck does)
drop function if exists town.cast_line(text, integer, boolean, boolean, boolean, text[], double precision[]);
drop function if exists town.odds(text, integer, boolean, boolean, boolean, text[]);

-- <town_cast>
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
  line := town.cast_line(p_bait, hour, town.raining(now_), town.has_buff(purse, now_, 'lucky'), not deep::boolean, signs,
    array[random(), random(), random(), random(), random(), random()], town.buff_by(purse, now_, 'lucky'));
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs)));
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end));
end;
$$;
-- </town_cast>

-- <purse_of>
create or replace function town.purse_of(p_member uuid, p_hold boolean)
returns jsonb language sql set search_path = public
as $$ select town.helped(town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms()), town.now_ms()) $$;
-- </purse_of>

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_cast(text, integer, integer, boolean) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean) to authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->'bowls' as bowls, data->'levels' as levels, data->'steps'->'hearty' as hearty from public.town_catalog where key = 'stamina';
--   -- 3 | 4 | [0.3, 0.45, 0.55, 0.67]
--
--   select town.level_of('{"buffs": [{"id": "keen", "level": 3, "until": 9999999999999}]}'::jsonb, 0, 'keen') as level,
--          town.buff_by('{"buffs": [{"id": "keen", "level": 3, "until": 9999999999999}]}'::jsonb, 0, 'keen') as does;
--   -- 3 | 1.5
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who has a meal's buff above its first level now, and how many helpings today's meals have had
--   select p.member_id, b->>'id' as buff, (b->>'level')::int as level, p.doc->'meals'->'bowls' as helpings
--     from public.town_purses p, jsonb_array_elements(case when jsonb_typeof(p.doc->'buffs') = 'array' then p.doc->'buffs' else '[]'::jsonb end) b
--    where (b->>'until')::bigint > town.now_ms() and (b->>'level')::int > 1
--    order by 3 desc limit 40;
