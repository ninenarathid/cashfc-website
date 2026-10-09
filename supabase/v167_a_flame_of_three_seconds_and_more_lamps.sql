-- v167 — a flame of three seconds, and more lamps: twenty-eight on the farm, forty in the forest
--
-- Run it once in the Supabase SQL editor, after v163 (the lamp relay at dusk: it stops at its first line without it).
-- Running it again is safe. The site's code for it went out first: a
-- page with the code and a database without this file shows the new posts and is answered "too far" at them, and a
-- flame still lives five seconds there; a page from before the code goes on showing twelve posts a map, and takes a
-- map for whole at twelve (it should be loaded again).
--
-- Why. The owner, 2026-10-09, the morning after the lamps' first night:
--
--   "ช่วยลดเวลาโคมยามค่ำ เหลือ ไฟ 3 วิพอ (5 วิง่ายไป)"
--   "เพิ่มโคมรอบๆแมพฟาร์ม และ ป่า ให้มากกว่านี้ นอกจากทางเดิน อยากให้มีขอบๆแมพด้วย"
--   and, of a first layout of twenty-eight a map: "แมพป่าใหญ่กว่า ควรจะมีโคมเยอะกว่าฟาร์มครับ"
--
-- What it does: the catalog's row `lamps` written over, as the code has it. Three things of it differ from what v163
-- seeded, and nothing else:
--
--   · `life` 3 where it was 5: a flame taken or handed on lives three seconds (`town.flame_take`, `flame_pass`). The
--     second of grace, the hold of tired hands, the reach and the points are as they were.
--   · each map's `posts`: **the first twelve are the tiles they were, under the numbers they had** (a post lit is kept
--     by its number), and more come after them: sixteen on the farm (twelve round its rim, one in the middle of each
--     quarter of the beds) and twenty-eight in the forest (off its trails, the nearest to the camp fire first; none
--     further than fifty tiles of path from it). A map's night is whole when every post of it is lit, so a whole night
--     is twenty-eight posts on the farm now and forty in the forest (`town.lamp_light` reads how many the row has).
--     Nights counted whole before this file ran stay counted.
--   · `more` [4, 10] where it was [4, 8]: the page's own (at how many lit posts more of the night comes out); no rule
--     of the database's reads it.
--
-- No table, no column, no function, no coins. Which tiles, how many, and 10 are the builder's; 3 seconds is his.

do $$ begin
  if to_regprocedure('town.lamp_night(bigint)') is null or to_regclass('public.town_lamps_lit') is null then raise exception 'v167 needs v163: run the lamp relay''s file first'; end if;
end $$;

-- ─── The catalog's row ─────────────────────────────────────────────────────
-- <catalog:v167> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('lamps', $town${
    "from": 1050,
    "until": 300,
    "life": 3,
    "grace": 1,
    "reach": 3,
    "near": 2,
    "cost": 1,
    "hold": 1.2,
    "light": 6,
    "hands": 8,
    "point": 3,
    "more": [4,10],
    "maps": {"farm":{"fire":[155,24],"posts":[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32]]},"forest":{"fire":[193,159],"posts":[[194,168],[192,177],[190,182],[190,186],[193,148],[192,141],[194,132],[189,124],[205,158],[213,158],[218,150],[224,146],[184,156],[181,165],[204,168],[185,147],[205,148],[173,156],[176,148],[209,177],[175,177],[181,137],[165,161],[213,143],[223,160],[220,170],[168,143],[216,183],[157,158],[160,148],[160,172],[207,131],[200,123],[163,181],[219,137],[233,160],[229,171],[184,119],[229,180],[149,155]]}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v167>

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->>'life' as life, data->'more' as more, jsonb_array_length(data->'maps'->'farm'->'posts') as farm,
--          jsonb_array_length(data->'maps'->'forest'->'posts') as forest, data->'maps'->'farm'->'posts'->0 as farm_first,
--          data->'maps'->'forest'->'posts'->11 as forest_twelfth
--     from public.town_catalog where key = 'lamps';
--   -- 3 | [4, 10] | 28 | 40 | [146, 23] | [224, 146]
--
--   select town.lamp_by('farm', 12, 131, 3) as a_new_post, town.lamp_by('farm', 28, 131, 3) as no_such_post, town.lamp_by('forest', 39, 149, 155) as the_forests_last;
--   -- t | f | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how many posts were lit each night, map by map, and how many of them were the new ones (their numbers are 12 and up)
--   select date '1970-01-01' + l.night as evening, l.map, count(*) as lit, count(*) filter (where l.post >= 12) as of_the_new,
--          round(avg(coalesce(array_length(l.hands, 1), 0)), 2) as hands_a_post, max(coalesce(array_length(l.hands, 1), 0)) as longest
--     from public.town_lamps_lit l group by 1, 2 order by 1 desc, 2;
--
--   -- flames taken against posts lit, by day: the takings less the lightings are the flames that went out
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*) from public.town_deeds d
--    where d.what in ('flame_take', 'flame_pass', 'lamp_light') group by 1, 2 order by 1 desc, 2;
