-- v290: the town's southern strip, and a second gate to the farm (the owner, 2026-10-19, pointing at the farm's southern
-- half's west fence: "อยากทำวาร์ปกลับเมืองตรงนี้ โดยอยากให้ห่างกับวาร์ปจุดแรกเท่ากับความห่างของวาร์ปจุดแรกและจุดสอง";
-- asked how, "ขยายเมืองลง 16 แถว").
--
-- Run after v289. Safe to run twice. Either order with the page is safe: before the page is live nobody can stand in
-- the strip; after it, something dropped, a relay laid or a flower's nectar in the strip is taken for off the map
-- until this has run.
--
-- The town is 64 × 80 tiles from now (64 × 64 until now): 16 rows past its old south-west edge, a lane down to them
-- from the east path, and a gate at its end to the farm's southern half. The gates are the page's alone. What the
-- database keeps that was laid out on the town is as it was (the insects' haunts, the places to fish from): the strip's
-- river bank is no place to fish or draw water from, by the farm's second gate as it is (a line from the river to a
-- well is three). What it changes (the database's own copies of the town's size, lib/town/world's COLS × ROWS):
--   * the catalog: cooking.map.town ([64,64] → [64,80]), and the town's entry in insects.nectar.maps, ground.maps and
--     rewards.nurseryBoxes ([0,0,64,64] → [0,0,64,80]; every other entry as it was, in its place);
--   * town.reward_relay_place: the town's rows run to 79 (v284's but for that; lib/town/reward-relay's relayPlace).
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if position('town.quality_quiet' in replace(pg_get_functiondef('town.quality_keep()'::regprocedure), chr(13), '')) = 0 then raise exception 'Run v289 before v290'; end if;
end $$;

-- ── 1. The catalog: the town's size ────────────────────────────────────────────────────────────────────────────────────
update public.town_catalog set data = jsonb_set(data, '{map,town}', '[64,80]'::jsonb), updated_at = now()
 where key = 'cooking' and data->'map'->'town' = '[64,64]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select jsonb_agg(case when m = '["town",0,0,64,64]'::jsonb then '["town",0,0,64,80]'::jsonb else m end order by o)
                                                                          from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'insects' and data->'nectar'->'maps' @> '[["town",0,0,64,64]]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{maps}', (select jsonb_agg(case when m = '[0,0,64,64]'::jsonb then '[0,0,64,80]'::jsonb else m end order by o)
                                                                  from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'ground' and data->'maps' @> '[[0,0,64,64]]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', (select jsonb_agg(case when m = '[0,0,64,64]'::jsonb then '[0,0,64,80]'::jsonb else m end order by o)
                                                                          from jsonb_array_elements(data->'nurseryBoxes') with ordinality x(m, o))), updated_at = now()
 where key = 'rewards' and data->'nurseryBoxes' @> '[[0,0,64,64]]'::jsonb;

-- ── 2. Where a relay may stand: the town's rows run to 79 ──────────────────────────────────────────────────────────────
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 79 then 'town'
 when (at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 85 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;

-- ── 3. Each as it is meant to be, or nothing of this stays ─────────────────────────────────────────────────────────────
do $$
declare k jsonb; i jsonb; g jsonb; r jsonb;
  -- (an entry of a list, to the letter: `@>` would take [0,0,64,64] to be in [0,0,64,80], an array holding each of its numbers)
  has constant text := 'select exists (select 1 from jsonb_array_elements($1) m where m = $2)';
  yes boolean; no_ boolean;
begin
  select data into k from public.town_catalog where key = 'cooking';
  select data into i from public.town_catalog where key = 'insects';
  select data into g from public.town_catalog where key = 'ground';
  select data into r from public.town_catalog where key = 'rewards';
  if k->'map'->'town' is distinct from '[64,80]'::jsonb then raise exception 'v290: cooking.map.town is %', k->'map'->'town'; end if;
  execute has into yes using i->'nectar'->'maps', '["town",0,0,64,80]'::jsonb; execute has into no_ using i->'nectar'->'maps', '["town",0,0,64,64]'::jsonb;
  if not yes or no_ then raise exception 'v290: insects.nectar.maps is %', i->'nectar'->'maps'; end if;
  execute has into yes using g->'maps', '[0,0,64,80]'::jsonb; execute has into no_ using g->'maps', '[0,0,64,64]'::jsonb;
  if not yes or no_ then raise exception 'v290: ground.maps is %', g->'maps'; end if;
  if r ? 'nurseryBoxes' then
    execute has into yes using r->'nurseryBoxes', '[0,0,64,80]'::jsonb; execute has into no_ using r->'nurseryBoxes', '[0,0,64,64]'::jsonb;
    if not yes or no_ then raise exception 'v290: rewards.nurseryBoxes is %', r->'nurseryBoxes'; end if;
  end if;
  if town.reward_relay_place('[60,79]'::jsonb) is distinct from 'town' or town.reward_relay_place('[60,80]'::jsonb) is not null then raise exception 'v290: town.reward_relay_place'; end if;
end $$;
commit;

-- After it has run, in the SQL editor (answers 64,80 · town · null):
--   select data->'map'->'town' from public.town_catalog where key = 'cooking';
--   select town.reward_relay_place('[60,79]'::jsonb), town.reward_relay_place('[60,80]'::jsonb);
