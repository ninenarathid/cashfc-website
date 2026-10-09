-- v168 — the forest's lamps over the whole of the map: fifty-six, where it had forty near its middle
--
-- A DRAFT: it is not in supabase/ and has not run. Run it once in the Supabase SQL editor, after v167 (it stops at
-- its first line without v163's lamps). Running it again is safe. **Run it by day, before half past five in the
-- evening**: the forest's posts after its twelfth change their tiles, and a post lit is kept by its number, so on a
-- night that is on a lamp lit at one of them would be shown at its number's new place. The site's code for it goes
-- out first: a page with the code and a database without this file shows the new places and is answered "too far" at
-- the forest's posts after the twelfth; a page from before the code shows the old ones (it should be loaded again).
--
-- Why. The owner, 2026-10-09 at noon, of the forty posts v167 gave the forest, none further than fifty tiles of path
-- from the camp fire:
--
--   "ช่วยทำให้โคมไฟ กระจายทั่วแมพกว่านี้ได้ไหม"
--   "ในป่าดูไม่ครอบคลุมทั้งแมพ"
--
-- What it does: the catalog's row `lamps` written over, as the code has it. One thing of it differs from what v167
-- left, and nothing else: **the forest's `posts` after the twelfth**. They were twenty-eight, all within some
-- forty-six tiles of path of the camp fire, and the north of the map and three of its corners had none (open ground
-- was up to thirty-seven tiles from a lamp). They are forty-four now, each put on the free tile furthest from every
-- post there was, so that no open ground is further than eleven tiles from a lamp; the furthest is some
-- seventy-eight tiles of path from the fire. The forest's first twelve, the farm's twenty-eight, `life` 3 and
-- `more` [4, 10] are as they were. A whole night in the forest is fifty-six posts now.
--
-- No table, no column, no function, no coins. Which tiles and how many are the builder's.

do $$ begin
  if to_regprocedure('town.lamp_night(bigint)') is null or to_regclass('public.town_lamps_lit') is null then raise exception 'v168 needs v163: run the lamp relay''s file first'; end if;
  if (select (data->>'life')::numeric from public.town_catalog where key = 'lamps') is distinct from 3 then raise exception 'v168 needs v167: run the three seconds'' file first'; end if;
end $$;

-- ─── The catalog's row ─────────────────────────────────────────────────────
-- <catalog:v168> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
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
    "maps": {"farm":{"fire":[155,24],"posts":[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32]]},"forest":{"fire":[193,159],"posts":[[194,168],[192,177],[190,182],[190,186],[193,148],[192,141],[194,132],[189,124],[205,158],[213,158],[218,150],[224,146],[184,166],[182,157],[207,169],[202,143],[177,173],[170,160],[176,147],[203,181],[179,183],[214,178],[223,161],[164,150],[225,171],[159,167],[210,136],[156,157],[164,181],[201,124],[233,160],[220,137],[224,182],[177,133],[180,123],[163,138],[235,170],[197,114],[235,149],[151,148],[146,162],[150,173],[211,119],[222,127],[235,180],[182,114],[153,139],[163,127],[146,183],[235,131],[168,117],[146,133],[153,124],[231,114],[158,114],[146,114]]}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v168>

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->>'life' as life, jsonb_array_length(data->'maps'->'farm'->'posts') as farm, jsonb_array_length(data->'maps'->'forest'->'posts') as forest,
--          data->'maps'->'forest'->'posts'->11 as forest_twelfth, data->'maps'->'forest'->'posts'->55 as forest_last
--     from public.town_catalog where key = 'lamps';
--   -- 3 | 28 | 56 | [224, 146] | [146, 114]
--
--   select town.lamp_by('forest', 55, 146, 114) as the_forests_last, town.lamp_by('forest', 56, 146, 114) as no_such_post, town.lamp_by('farm', 27, 172, 32) as the_farms_last;
--   -- t | f | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how many posts were lit each night, map by map, how many of them off the ways (their numbers are 12 and up), and how far out (the forest's are numbered the nearest first)
--   select date '1970-01-01' + l.night as evening, l.map, count(*) as lit, count(*) filter (where l.post >= 12) as off_the_ways, max(l.post) as furthest_number,
--          round(avg(coalesce(array_length(l.hands, 1), 0)), 2) as hands_a_post, max(coalesce(array_length(l.hands, 1), 0)) as longest
--     from public.town_lamps_lit l group by 1, 2 order by 1 desc, 2;
