-- v156 — the fae anklet's run lasts a walk to the well: forty-five seconds between two waterings, where it was eight
--
-- Run this once in the Supabase SQL editor, after v153 (it stops at its first line without v153's anklet). Running
-- it again is safe. It may run before or after the site's own code for it: until both are there, the page's ring of
-- the run and the database's count of it go by different numbers (the ring is shown a little longer or shorter than
-- the run lasts), and what a watering is worth is the database's to say either way.
--
-- Why. The owner, 2026-10-07, the morning the gifts of ranks 1 to 6 went out, of the garden fae anklet (another's
-- plant its wearer waters grows twice as much, and three times from the twentieth of a run):
--
--   "เราจะ stack ถึง 20 ได้ยังไง ในเมื่อบัวรดน้ำมันเก็บได้แค่ 8"
--   then, of a longer gap: "แก้เลย"
--
-- A run began anew when more than eight seconds lay between two waterings. A can holds eight waterings (a copper
-- one twelve, a brass one eighteen), and the well is six to seventeen seconds' walk there and back from a bed: so
-- nobody with one can came to the twentieth plant. The gap is forty-five seconds now (the number is the builder's):
-- long enough to fill the can at the well and come back, short enough that going off to do something else ends the
-- run. A plain can filled three times reaches the twentieth plant.
--
-- What it does: one number of the catalog's `farming` row, `helping.anklet.gap`, which `town.run_of` and
-- `town.bridged` read (v153's; neither is written again). The row is written over whole, as the code has it; nothing
-- else of it differs from what v153 left.
--
-- No table, no column, no function, no coins.

do $$ begin
  if to_regprocedure('town.run_of(jsonb, bigint)') is null then raise exception 'v156 needs v153: run supabase/v153 first'; end if;
end $$;

-- ─── The catalog's row ─────────────────────────────────────────────────────
-- <catalog:v156> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "rids": {"ladybird":0.5,"mantis":0.7},
    "cures": {"pestCure":24},
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6,"swarm":{"some":1,"many":4,"adds":[0.01,0.02]}},
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
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v156>

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->'helping'->'anklet' as anklet, (data->>'well')::int as well, (data->>'fill')::int as fill from public.town_catalog where key = 'farming';
--   -- {"gap": 45, "run": 20, "top": 3, "long": 12} | 100 | 2
--
--   select town.run_of('{"chime": {"n": 5, "at": 1000}}'::jsonb, 46000) as after_45s, town.run_of('{"chime": {"n": 5, "at": 1000}}'::jsonb, 46001) as a_moment_more;
--   -- 5 | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how long the runs get: of each helper's waterings of somebody else's plants a day, how many (a run of twenty
--   -- needs as many in one go; the run itself is kept in the purse, `chime`, and not written down)
--   select d.member_id, (d.at at time zone 'Asia/Bangkok')::date as day, count(*) as waterings
--     from public.town_deeds d where d.what = 'water' and d.doc ? 'whose' and d.at > now() - interval '3 days'
--    group by 1, 2 order by 3 desc limit 30;
--
--   -- the runs on at this moment, and how long each is
--   select p.member_id, (p.doc->'chime'->>'n')::int as run, to_timestamp((p.doc->'chime'->>'at')::bigint / 1000.0) as last
--     from public.town_purses p where town.run_of(p.doc, town.now_ms()) > 0 order by 2 desc;
