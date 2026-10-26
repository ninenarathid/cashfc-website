-- v298 — two chests on the farm (2026-10-26)
-- Run once in the Supabase SQL editor, after v297. Running it again is safe and changes nothing. It may run before or
-- after the page that draws the chests goes out: before, standing on those tiles of the farm opens nothing (there is
-- no chest there to tap, nor a chip by it); after, until it runs, the box at a farm chest answers "stand nearer".
--
-- The owner, 2026-10-26: "ช่วยเพิ่มกล่องเก็บของให้ที่แปลงผัก สองฝั่งด้วย". A chest in each half of the farm, beside the
-- lane from north to south three tiles on from where its lanes cross, by its well and the first of its beds: farm tiles
-- (31, 26) and (31, 68), that is 159,26 and 159,68. Each opens a member's own storage box, the same box as the plaza's
-- and the mountain's (lib/town/box's MORE_CHESTS), from as near (two tiles), never from the chest's own tile.
--
-- The database's `town.by_box` (v134, written again by v164) already reads the catalog's `box.more`, the tiles of the
-- chests beyond the plaza's: the two are added to that list and nothing else changes. Only `more` is written (jsonb_set),
-- never the whole row: `box.at` is the town map's own (town.apply_map writes it: the editor's town has its chest at
-- 51,28, the old town at 34,34), and the shared warehouse (v215) asks the same `town.by_box`, so it opens at these too.
-- A tile is matched as the same pair, in its order (jsonb `@>` would take [26,159] for [159,26]).

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
         select coalesce(jsonb_agg(t.tile order by t.n), '[]'::jsonb) from (values (1, '[159, 26]'::jsonb), (2, '[159, 68]'::jsonb)) as t(n, tile)
          where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'more') = 'array' then c.data->'more' else '[]'::jsonb end) e(v) where e.v = t.tile))),
       updated_at = now()
 where c.key = 'box'
   and exists (select 1 from (values ('[159, 26]'::jsonb), ('[159, 68]'::jsonb)) as t(tile)
                where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.data->'more') = 'array' then c.data->'more' else '[]'::jsonb end) e(v) where e.v = t.tile));

commit;

-- What it should say afterwards:
--   select data from public.town_catalog where key = 'box';
--                                -- {"at": [51, 28], "more": [[67, 242], [159, 26], [159, 68]], "reach": 2, "slots": 10}
--   select town.by_box(158, 25), town.by_box(161, 28), town.by_box(159, 26), town.by_box(162, 26), town.by_box(157, 67);
--                                -- true, true, false (the chest's own tile), false (three tiles off), true
