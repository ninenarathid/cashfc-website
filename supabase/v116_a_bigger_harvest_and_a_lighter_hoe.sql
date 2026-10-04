-- v116 — a bigger harvest, and a lighter hoe
--
-- Run this once in the Supabase SQL editor, after v115. Running it again is
-- safe (see the note on numbers changed by hand, below).
--
-- It changes no table and no function: only two rows of `town_catalog`,
-- which the farm's rules read (v110). The game is open, so it is true for
-- everybody from the moment it runs.
--
-- Why. The game opened in the small hours of 2026-10-04. By noon seventeen
-- members were playing: sixty-eight fish landed, worth some 545 coins; two
-- hundred plots cleared and tilled for thirty-six sown; twenty-two stalks of
-- morning glory picked, worth 66; half the players with no stamina left. The
-- owner asked whether a vegetable, which takes hours, fetches more than a
-- fish caught at once ("ผักใช้เวลานานในการเติบโต มันจะขายได้ราคาแพงกว่าปลาที่ตกได้ทันทีไหม
-- ครับ"). It did not: a plot of anything came to 11 to 15 coins a day, a
-- common fish to 8 to 12 at once, and a point of stamina spent on morning
-- glory, cabbage or carrot earned less than one spent fishing. Shown four
-- ways to mend it, he chose two ("1 + 2 ครับ ทำเลย"):
--
--   · every crop gives twice as many at a picking (`crops`: each `yield`),
--     at the price it had. The prices are left alone so that no dish's worth
--     moves: what goes into a dish and what it fetches stand as they were;
--   · clearing weeds and tilling cost 2 stamina each where they cost 4
--     (`farming.costs`).
--
-- Nothing else in the two rows is different from what the database has (they
-- were compared entry by entry with the live rows before this was written).
--
-- What is growing now gains too: how many a plant gives is worked out when it
-- is picked, from this row, so a plant sown yesterday gives the new number
-- at its next picking. What was picked already is as it was.
--
-- A NUMBER CHANGED BY HAND. This file writes OVER the two rows, whole, as
-- v109 did with its seven: that is its purpose. Nobody has changed either by
-- hand (both were last written by v110, on 2026-10-03 at 17:50 UTC). If that
-- is ever not so, the first query at the foot says when each row was last
-- touched: look before running it again. The other fifteen rows are not
-- touched, here or by running it twice.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v116> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('crops', $town${
    "kangkong": {"seed":"seedKangkong","hours":6,"yield":[4,6],"again":12,"picks":3},
    "scallion": {"seed":"seedScallion","hours":8,"yield":[4,6],"again":12,"picks":3},
    "cabbage": {"seed":"seedCabbage","hours":24,"yield":[2,2],"again":null,"picks":1},
    "carrot": {"seed":"seedCarrot","hours":24,"yield":[4,6],"again":null,"picks":1},
    "daikon": {"seed":"seedDaikon","hours":36,"yield":[2,4],"again":null,"picks":1},
    "corn": {"seed":"seedCorn","hours":48,"yield":[4,6],"again":null,"picks":1},
    "chili": {"seed":"seedChili","hours":48,"yield":[6,10],"again":24,"picks":4},
    "tomato": {"seed":"seedTomato","hours":72,"yield":[6,8],"again":36,"picks":3},
    "basil": {"seed":"seedBasil","hours":36,"yield":[6,8],"again":24,"picks":4},
    "sweetPotato": {"seed":"seedSweetPotato","hours":72,"yield":[4,8],"again":null,"picks":1},
    "garlic": {"seed":"seedGarlic","hours":60,"yield":[4,6],"again":null,"picks":1},
    "pumpkin": {"seed":"seedPumpkin","hours":144,"yield":[2,2],"again":null,"picks":1},
    "eggplant": {"seed":"seedEggplant","hours":60,"yield":[4,6],"again":30,"picks":3},
    "cucumber": {"seed":"seedCucumber","hours":40,"yield":[4,8],"again":20,"picks":3},
    "longBean": {"seed":"seedLongBean","hours":48,"yield":[6,10],"again":24,"picks":4},
    "lemongrass": {"seed":"seedLemongrass","hours":72,"yield":[4,6],"again":36,"picks":5},
    "galangal": {"seed":"seedGalangal","hours":96,"yield":[2,4],"again":null,"picks":1},
    "lime": {"seed":"seedLime","hours":168,"yield":[6,10],"again":48,"picks":8},
    "papaya": {"seed":"seedPapaya","hours":144,"yield":[2,4],"again":48,"picks":5},
    "mango": {"seed":"seedMango","hours":240,"yield":[4,6],"again":48,"picks":8},
    "banana": {"seed":"seedBanana","hours":192,"yield":[6,8],"again":48,"picks":4},
    "coconut": {"seed":"seedCoconut","hours":288,"yield":[2,4],"again":48,"picks":10},
    "ginger": {"seed":"seedGinger","hours":120,"yield":[2,4],"again":null,"picks":1},
    "turmeric": {"seed":"seedTurmeric","hours":120,"yield":[2,4],"again":null,"picks":1},
    "taro": {"seed":"seedTaro","hours":168,"yield":[2,4],"again":null,"picks":1},
    "watermelon": {"seed":"seedWatermelon","hours":144,"yield":[2,2],"again":null,"picks":1}
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
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
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
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v116>

notify pgrst, 'reload schema';

-- ─── Before running it ───────────────────────────────────────────────────
--
-- Has a number been changed by hand? The two rows should say 2026-10-03 17:50.
--
--   select key, updated_at from public.town_catalog where key in ('crops', 'farming');
--
-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- crops and farming: t. Every other row: f.
--   -- (`written` is true for an hour after it runs)
--
--   select data->'kangkong'->'yield' as morning_glory, data->'cabbage'->'yield' as cabbage,
--          data->'chili'->'yield' as chili, data->'pumpkin'->'yield' as pumpkin,
--          (select count(*) from jsonb_object_keys(data)) as crops
--     from public.town_catalog where key = 'crops';
--   -- [4, 6] | [2, 2] | [6, 10] | [2, 2] | 26
--
--   select data->'costs' as costs from public.town_catalog where key = 'farming';
--   -- {"cure": 1, "feed": 1, "pick": 2, "pull": 2, "sow": 1, "till": 2, "clear": 2, "water": 1}
