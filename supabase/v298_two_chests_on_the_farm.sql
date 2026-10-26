-- v298 — two chests on the farm (2026-10-26)
-- Run once in the Supabase SQL editor, after v297. Running it again is safe and changes nothing. It may run before or
-- after the page that draws the chests goes out: before, standing on those tiles of the farm opens nothing (there is
-- no chest there to tap, nor a chip by it); after, until it runs, the box at a farm chest answers "stand nearer".
--
-- The owner, 2026-10-26: "ช่วยเพิ่มกล่องเก็บของให้ที่แปลงผัก สองฝั่งด้วย", and where (his circle: "เอามาวางแถวนี้ดีกว่า"):
-- a chest in each half of the farm, in the corner where its lanes cross north of its well, beside the hay: farm tiles
-- (28, 20) and (28, 62), that is 156,20 and 156,62. Each opens a member's own storage box, the same box as the plaza's
-- and the mountain's (lib/town/box's MORE_CHESTS), from as near (two tiles), never from the chest's own tile.
--
-- The database's `town.by_box` (v134, written again by v164) already reads the catalog's `box.more`, the tiles of the
-- chests beyond the plaza's: the two are added to that list and nothing else changes. Only `more` is written (jsonb_set),
-- never the whole row: `box.at` is the town map's own (town.apply_map writes it: the editor's town has its chest at
-- 51,28, the old town at 34,34), and the shared warehouse (v215) asks the same `town.by_box`, so it opens at these too.
-- A tile is matched as the same pair, in its order (jsonb `@>` would take [20,156] for [156,20]).

begin;
set local statement_timeout = '30s';
set local lock_timeout = '10s';

do $$ begin
  if not exists (select 1 from public.town_catalog c where c.key = 'box') then raise exception 'Run v134 before v298'; end if;
  if to_regprocedure('town.by_box(integer, integer)') is null then raise exception 'Run v134 before v298'; end if;
  if position('''more''' in (select p.prosrc from pg_proc p where p.oid = 'town.by_box(integer, integer)'::regprocedure)) = 0 then
    raise exception 'town.by_box does not read box.more: run v164 before v298';
  end if;
end $$;

update public.town_catalog c
   set data = jsonb_set(c.data, '{more}', coalesce(case when jsonb_typeof(c.data->'more') = 'array' then c.data->'more' end, '[]'::jsonb) || (
         select coalesce(jsonb_agg(t.tile order by t.n), '[]'::jsonb) from (values (1, '[156, 20]'::jsonb), (2, '[156, 62]'::jsonb)) as t(n, tile)
          where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'more') = 'array' then c.data->'more' else '[]'::jsonb end) e(v) where e.v = t.tile))),
       updated_at = now()
 where c.key = 'box'
   and exists (select 1 from (values ('[156, 20]'::jsonb), ('[156, 62]'::jsonb)) as t(tile)
                where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'more') = 'array' then c.data->'more' else '[]'::jsonb end) e(v) where e.v = t.tile));

commit;

-- What it should say afterwards:
--   select data from public.town_catalog where key = 'box';
--                                -- {"at": [51, 28], "more": [[67, 242], [156, 20], [156, 62]], "reach": 2, "slots": 10}
--   select town.by_box(155, 19), town.by_box(158, 22), town.by_box(156, 20), town.by_box(159, 20), town.by_box(154, 61);
--                                -- true, true, false (the chest's own tile), false (three tiles off), true
