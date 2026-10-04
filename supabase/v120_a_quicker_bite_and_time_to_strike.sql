-- v120 — a quicker bite, and time to strike
--
-- Run this once in the Supabase SQL editor, after v119. Running it again is
-- safe (see the note on numbers changed by hand, below).
--
-- It changes no table and no function: only three rows of `town_catalog`
-- (`fish`, `flotsam`, `fishing`), which the town's rules read. The game is
-- open, so it is true for everybody from the moment it runs.
--
-- Why. Two things the owner asked for on the game's second night
-- (2026-10-04), both about fishing.
--
-- 1. A quicker bite: "ช่วยทำให้รอปลาติดเบ็ด เร็วขึ้นด้วยตอนนี้นานไป". What takes a
--    bait, and after how long, is decided here when the line is dropped
--    (`town.cast_line`): a number of seconds between the least and the most
--    its row gives (`wait`). The members had waited 32 s for a bite, taking
--    one with another (205 bites; half of them more than 27 s, a tenth more
--    than 56 s), and 15 s in the fight that followed: two thirds of fishing
--    was waiting. So every `wait` is halved, least and most, a half second
--    rounded up: the 32 fish (`fish`) and the six things that are no fish
--    (`flotsam`). A minnow takes 3 to 15 s where it took 5 to 30, the other
--    common fish at most 35 s where it was 70, the rarest 30 to 120 s where
--    it was 60 to 240. Nothing else of a fish is changed: what it takes,
--    when, how often, how long it is, how it fights.
--
--    The browser is told the wait by this database with every cast, so the
--    waits are short from the moment this runs, in a page loaded before it
--    as in one loaded after.
--
-- 2. Time to strike: "ตอนนี้คนตกปลาน้อยเพราะพอสตามิน่าหมด เล่นยากเกินไป ช่วยทำให้
--    ง่ายขึ้นหน่อย". With no stamina left, v117 left a strike 0.3 of its
--    moment: 0.48 s from the bite. That was set with made-up players who
--    struck 0.42 s after the bite. The members' own strikes are kept with
--    every go (`town_plays`): of 146 with stamina, by ten members, half come
--    within 0.63 s of the bite, a tenth within 0.47 s, and the quickest of
--    all at 0.31 s. So eight tired bites in ten were gone before the hand
--    came down, however well it would have fought. Six lines were dropped
--    with no stamina in the half day since v117, and one fish landed; the
--    farm's work was done over five hundred times with none in the same
--    hours.
--
--    So the moment with no stamina is 0.6 of its length again, as it was
--    before v117: 0.96 s for 0.48 (`fishing.spent`). Nine in ten of the
--    members' own strikes come within that. With stamina it is 1.6 s, as
--    ever.
--
--    The fight that follows a strike is played in the browser, and the site
--    eases it there with the same change (with no stamina the safe stretch
--    keeps half its width, where it kept 0.35); the database has no number
--    for it.
--
-- The site and this file may go out in either order. The waits are this
-- database's alone to say. And it judges a strike by its own clock, with
-- 1.5 s for the two clocks and the wire between them (`fishing.slack`): a
-- tired strike was counted missed 1.98 s after the bite, and is from now at
-- 2.46 s. A strike the new page takes (within 0.96 s) is well inside the
-- first, and one an old page takes (within 0.48 s) inside both. An old page
-- that gives a line up after its 0.48 s may find a fish still on it by this
-- clock: it lets it go, as it always has when the clocks disagree (the go
-- is written down as slipped where it would have said missed). Members who
-- keep the town open have the longer moment once they load the page again.
--
-- A line that is in the water when this runs keeps the wait it was given.
--
-- NUMBERS CHANGED BY HAND. This file writes the three rows OVER, whole, as
-- v117 did with its nine: that is its purpose. Before it was written the
-- eighteen live rows were compared entry by entry with what the code gave
-- before this change: every one the same. So of the whole catalog 39
-- entries differ after it: the 38 waits, and `fishing.spent`. Nobody has
-- changed these rows by hand (`fish` and `flotsam` were last written on
-- 2026-10-03 at 15:48 UTC, `fishing` by v117 on 2026-10-04 at 08:21). If
-- that is ever not so, the first query at the foot says when each was last
-- touched: look before running it again. The other fifteen rows are not
-- touched, here or by running it twice.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v120> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatQuill":1.25,"floatBell":1.5},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb),
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1},"hours":[[5,22]],"rain":1,"wait":[3,15],"size":[4,8],"effort":2,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,22],"effort":3,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8},"hours":[[7,17]],"rain":1,"wait":[5,28],"size":[18,32],"effort":4,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1},"hours":[[5,20]],"rain":1.3,"wait":[5,25],"size":[10,18],"effort":4,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"dough":0.3},"hours":[[18,24],[0,6]],"rain":2,"wait":[8,35],"size":[25,45],"effort":5,"line":1},
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
    "koi": {"tier":"legend","baits":{"dough":1,"corn":0.7},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[60,100],"effort":12,"line":1.5}
  }$town$::jsonb),
  ('flotsam', $town${
    "hyacinth": {"weight":9,"wait":[4,23]},
    "boot": {"weight":2,"wait":[5,30]},
    "driftwood": {"weight":6,"wait":[4,23],"on":["cricket","branBait","shrimpLive"]},
    "bottle": {"weight":3,"wait":[5,30],"on":["cricket","branBait","shrimpLive"]},
    "pearl": {"weight":0.6,"wait":[15,60],"on":["antEggs","lure","fermentedBait"]},
    "chest": {"weight":0.3,"wait":[20,75],"on":["antEggs","lure","fermentedBait"]}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v120>

notify pgrst, 'reload schema';

-- ─── Before running it ───────────────────────────────────────────────────
--
-- Has a row been changed by hand? fish and flotsam should say 2026-10-03
-- 15:48, fishing 2026-10-04 08:21.
--
--   select key, updated_at from public.town_catalog where key in ('fish', 'flotsam', 'fishing') order by key;
--
-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- fish, fishing, flotsam: t. The other fifteen rows: f. (`written` is
--   -- true for an hour after it runs)
--
--   select (select data->'minnow'->'wait' from public.town_catalog where key = 'fish') as minnow,
--          (select data->'catfish'->'wait' from public.town_catalog where key = 'fish') as catfish,
--          (select data->'koi'->'wait' from public.town_catalog where key = 'fish') as koi,
--          (select data->'hyacinth'->'wait' from public.town_catalog where key = 'flotsam') as hyacinth,
--          (select max((f.value->'wait'->>1)::int) from public.town_catalog c, jsonb_each(c.data) f where c.key in ('fish', 'flotsam')) as longest;
--   -- [3, 15] | [8, 35] | [30, 120] | [4, 23] | 120
--
--   select data->'spent' as spent, data->'strike' as strike, data->'slack' as slack
--     from public.town_catalog where key = 'fishing';
--   -- 0.6 | 1.6 | {"late": 1500, "early": 300}
