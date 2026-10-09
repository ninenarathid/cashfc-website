-- v170 — more trees on the mountain, and trees that grow back sooner
--
-- Run this once in the Supabase SQL editor, after v164 (it stops at its first line without v164's trees). Running it
-- again is safe. Run it after the site's own code for it is live: a page from before it does not know the new trees
-- (it shows the mountain as it was, and what it fells is felled all the same); a page with the new code asking a
-- database that has not had this file is refused the new trees only ("no such tree") until it runs.
--
-- Why. The owner, 2026-10-09, forty minutes after the mountain opened to everybody:
--
--   "ช่วยเพิ่ม ต้นไม้ ทุก tier ตอนนี้มีแค่คนเดียวก็ล้างทั้งเขาได้ ช่วยทำให้ respawn ไวขึ้นด้วย"
--
-- There were sixty pines, the one kind the axe there is can fell, and a felled tree stood a stump for forty minutes:
-- one member had every pine down in twenty. Now there are ninety-two pines, eighty ironwoods and forty moonwoods
-- (as many more as the mountain has room for: every tree keeps a free tile all round it; the first hundred and
-- twenty are where they were and numbered as they were, so every tree that is down now is the same tree after
-- this), and a tree is grown again in six minutes: some fifteen pines a minute for the whole village, where it was
-- one and a half. (The numbers are the builders': both AIs were asked.)
--
-- What it does: the catalog's `trees` row written over as the code has it (the wood's list, and `regrow`); nothing
-- else of the row differs from what v164 left. A stump that stands now is grown again six minutes after it fell
-- (most are grown at once). No table, no column, no function, no coins.

do $$ begin
  if to_regprocedure('town.tree_of(integer)') is null or town.cat('trees') is null then
    raise exception 'v170 needs v164: the mountain has no trees yet';
  end if;
end $$;

-- ─── The catalog's row ─────────────────────────────────────────────────────
-- <catalog:v170> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('trees', $town${
    "regrow": 6,
    "cost": 2,
    "reach": 1,
    "axeTier": 1,
    "logs": 2,
    "girths": [{"chops":8,"pace":0.8,"spent":1.6,"family":"alternate","timber":[2]},{"chops":12,"pace":1,"spent":1.22,"family":"pairs","timber":[2,0]},{"chops":16,"pace":1.05,"spent":1.2,"family":"run","timber":[3,1,0]}],
    "girthSeed": 2627,
    "girthAbove": 2,
    "elderChops": 24,
    "elderPace": 1,
    "elderSpent": 1.6,
    "elderFamily": "noise",
    "elder": {"id":900,"plus":10,"timber":15,"resin":3},
    "kinds": ["pine","ironwood","moonwood"],
    "elderKind": "elder",
    "scent": ["resin","pineCone"],
    "echo": {"trees":3,"reach":2},
    "chain": {"reach":3,"left":0.5},
    "pecks": 1,
    "root": {"within":120},
    "go": {"secs":45},
    "brace": {"reach":2,"logs":1},
    "keepsake": {"in":6},
    "quickest": 0.07,
    "tired": {"later":1,"misses":3},
    "braced": 0.3,
    "keepsakes": {"nest":{"weight":10,"stout":false},"feather":{"weight":10,"stout":false},"twinCones":{"weight":10,"stout":false},"cicada":{"weight":10,"stout":false},"pellet":{"weight":10,"stout":false},"initials":{"weight":6,"stout":false},"heartKnot":{"weight":6,"stout":false},"amber":{"weight":6,"stout":false},"ribbon":{"weight":6,"stout":false},"rustKey":{"weight":4,"stout":true},"silverRing":{"weight":3,"stout":true},"carvedBird":{"weight":2,"stout":true}},
    "axe": {"top":10,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"gemAtTop":1,"gemLevels":4,"cap":3,"chops":[12,11,11,10,10,9,8,7,7,6,4],"ahead":[3,3,3,3,3,3,4,4,4,4,5],"slow":[0,0,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.5],"elements":["fire","water","ice","earth","lightning","wind","light","dark"],"opts":{"axGrain":{"pool":1,"n":{"ahead":2}},"axDust":{"pool":1,"n":{"every":5,"more":1}},"axKeen":{"pool":1,"n":{"chops":2}},"axResin":{"pool":1,"n":{"in":4}},"axFresh":{"pool":1,"n":{},"use":{"n":5,"per":"meal"}},"axDry":{"pool":1,"n":{"pieces":2}},"axOne":{"pool":2,"n":{},"use":{"n":10,"per":"day"}},"axDouble":{"pool":2,"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"n":{},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"n":{"by":1.5}}},"gems":{"fire":{"fewer":[0.15,0.25,0.35,0.45]},"water":{"spared":[1,2,3,4]},"ice":{"slow":[0.15,0.25,0.35,0.45]},"earth":{"stamina":[0.15,0.25,0.35,0.45]},"lightning":{"chain":[0.1,0.2,0.3,0.4]},"wind":{"walk":[0.1,0.15,0.2,0.25]},"light":{"glint":[10,20,30,999]},"dark":{"log":[0.1,0.2,0.3,0.4],"faster":[0.15,0.15,0.15,0.15]}}},
    "wood": [[0,39,253,1,1,1],[1,35,218,1,1,2],[2,42,212,1,1,3],[3,36,224,1,1,2],[4,37,238,1,1,1],[5,35,256,1,1,3],[6,38,227,1,1,3],[7,41,241,1,1,1],[8,50,219,1,1,3],[9,41,217,1,1,3],[10,51,258,1,1,1],[11,38,240,1,1,1],[12,45,219,1,1,3],[13,39,256,1,1,3],[14,37,234,1,1,2],[15,47,221,1,1,3],[16,49,215,1,1,2],[17,42,210,1,1,1],[18,42,251,1,1,3],[19,51,256,1,1,3],[20,45,257,1,1,2],[21,49,229,1,1,2],[22,51,214,1,1,1],[23,40,212,1,1,3],[24,45,261,1,1,2],[25,43,219,1,1,1],[26,39,258,1,1,1],[27,35,226,1,1,2],[28,38,243,1,1,3],[29,44,240,1,1,3],[30,46,214,1,1,3],[31,40,237,1,1,1],[32,44,254,1,1,1],[33,40,234,1,1,2],[34,37,220,1,1,1],[35,40,239,1,1,1],[36,45,217,1,1,1],[37,39,222,1,1,3],[38,41,259,1,1,2],[39,48,219,1,1,3],[40,39,219,1,1,2],[41,49,235,1,1,3],[42,44,214,1,1,2],[43,44,259,1,1,2],[44,47,237,1,1,2],[45,50,241,1,1,2],[46,38,216,1,1,3],[47,51,210,1,1,2],[48,45,222,1,1,1],[49,49,233,1,1,3],[50,50,243,1,1,2],[51,51,229,1,1,2],[52,47,255,1,1,1],[53,42,232,1,1,2],[54,38,236,1,1,1],[55,45,211,1,1,1],[56,36,240,1,1,2],[57,41,214,1,1,1],[58,49,246,1,1,3],[59,37,253,1,1,1],[60,28,260,2,1,2],[61,26,218,2,1,2],[62,19,239,2,1,2],[63,30,252,2,1,2],[64,22,210,2,1,2],[65,19,237,2,1,2],[66,30,261,2,1,2],[67,24,222,2,1,2],[68,18,246,2,1,2],[69,28,258,2,1,2],[70,29,225,2,1,2],[71,29,212,2,1,2],[72,27,249,2,1,2],[73,17,255,2,1,2],[74,25,215,2,1,2],[75,18,220,2,1,2],[76,20,248,2,1,2],[77,22,231,2,1,2],[78,22,240,2,1,2],[79,20,220,2,1,2],[80,20,230,2,1,2],[81,22,220,2,1,2],[82,25,252,2,1,2],[83,19,222,2,1,2],[84,18,259,2,1,2],[85,30,249,2,1,2],[86,26,213,2,1,2],[87,20,218,2,1,2],[88,28,216,2,1,2],[89,20,212,2,1,2],[90,21,259,2,1,2],[91,23,214,2,1,2],[92,27,256,2,1,2],[93,24,249,2,1,2],[94,17,257,2,1,2],[95,29,239,2,1,2],[96,17,251,2,1,2],[97,21,234,2,1,2],[98,27,237,2,1,2],[99,24,219,2,1,2],[100,10,217,3,1,2],[101,6,211,3,1,2],[102,2,259,3,1,2],[103,5,219,3,1,2],[104,6,224,3,1,2],[105,3,255,3,1,2],[106,5,253,3,1,2],[107,11,255,3,1,2],[108,6,214,3,1,2],[109,13,231,3,1,2],[110,4,231,3,1,2],[111,4,226,3,1,2],[112,7,222,3,1,2],[113,5,222,3,1,2],[114,3,252,3,1,2],[115,12,250,3,1,2],[116,10,249,3,1,2],[117,9,245,3,1,2],[118,10,214,3,1,2],[119,8,210,3,1,2],[120,42,223,1,1,3],[121,51,217,1,1,2],[122,35,258,1,1,3],[123,43,257,1,1,3],[124,35,222,1,1,1],[125,36,242,1,1,3],[126,51,254,1,1,1],[127,37,256,1,1,1],[128,52,212,1,1,1],[129,38,250,1,1,3],[130,37,258,1,1,3],[131,39,245,1,1,2],[132,35,234,1,1,1],[133,51,247,1,1,3],[134,36,216,1,1,2],[135,47,233,1,1,1],[136,50,239,1,1,3],[137,49,258,1,1,1],[138,35,220,1,1,1],[139,44,252,1,1,1],[140,40,250,1,1,3],[141,50,237,1,1,1],[142,39,261,1,1,3],[143,35,260,1,1,2],[144,41,257,1,1,1],[145,36,228,1,1,2],[146,41,245,1,1,3],[147,40,210,1,1,3],[148,37,222,1,1,2],[149,36,251,1,1,2],[150,44,232,1,1,1],[151,43,261,1,1,2],[152,26,222,2,1,2],[153,18,217,2,1,2],[154,23,253,2,1,2],[155,27,233,2,1,2],[156,22,216,2,1,2],[157,30,244,2,1,2],[158,18,212,2,1,2],[159,27,239,2,1,2],[160,22,256,2,1,2],[161,24,259,2,1,2],[162,30,256,2,1,2],[163,20,216,2,1,2],[164,19,252,2,1,2],[165,23,261,2,1,2],[166,24,224,2,1,2],[167,27,210,2,1,2],[168,28,214,2,1,2],[169,18,214,2,1,2],[170,21,237,2,1,2],[171,30,214,2,1,2],[172,20,246,2,1,2],[173,19,235,2,1,2],[174,19,254,2,1,2],[175,31,212,2,1,2],[176,25,211,2,1,2],[177,30,258,2,1,2],[178,29,223,2,1,2],[179,31,210,2,1,2],[180,25,254,2,1,2],[181,20,241,2,1,2],[182,20,232,2,1,2],[183,30,242,2,1,2],[184,22,223,2,1,2],[185,27,220,2,1,2],[186,20,256,2,1,2],[187,29,210,2,1,2],[188,29,235,2,1,2],[189,26,258,2,1,2],[190,21,214,2,1,2],[191,18,248,2,1,2],[192,3,223,3,1,2],[193,12,244,3,1,2],[194,9,256,3,1,2],[195,8,251,3,1,2],[196,5,257,3,1,2],[197,10,259,3,1,2],[198,5,246,3,1,2],[199,2,250,3,1,2],[200,4,214,3,1,2],[201,11,219,3,1,2],[202,9,219,3,1,2],[203,2,242,3,1,2],[204,9,261,3,1,2],[205,2,213,3,1,2],[206,4,243,3,1,2],[207,4,259,3,1,2],[208,7,244,3,1,2],[209,7,220,3,1,2],[210,13,237,3,1,2],[211,2,247,3,1,2],[900,43,234,1,3,3]]
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v170>

-- What it should say afterwards:
--
--   select data->'regrow' as minutes, jsonb_array_length(data->'wood') as trees,
--          (select count(*) from jsonb_array_elements(data->'wood') w where (w->>3)::int = 1 and (w->>0)::int < 900) as pines
--     from public.town_catalog where key = 'trees';
--   -- 6 | 213 | 92
