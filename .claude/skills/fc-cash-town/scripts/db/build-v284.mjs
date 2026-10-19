// Writes supabase/v284_the_farms_southern_half.sql from the code: the beds' corners, the farm's tiles and the new
// garden haunts as lib/town/catalog's catalogOf gives them, so that the file and the page cannot say different things.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v284.mjs
import { writeFileSync } from "node:fs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { FARM, FARM_FIRST, BEDS_IN_FARM } = await import("@/lib/town/world");

const c = catalogOf();
const OLD_BEDS = 24, OLD_HAUNTS = 149;
const beds = c.farming.bedsAt, haunts = c.insects.haunts;
if (beds.length !== BEDS_IN_FARM || BEDS_IN_FARM !== 2 * OLD_BEDS) throw Error(`beds: ${beds.length}`);
if (haunts.length !== OLD_HAUNTS + BEDS_IN_FARM - OLD_BEDS) throw Error(`haunts: ${haunts.length}`);
const json = (v) => JSON.stringify(v);
const was = json([FARM_FIRST.x, FARM_FIRST.y, FARM_FIRST.w, FARM_FIRST.h]), now = json([FARM.x, FARM.y, FARM.w, FARM.h]);
const lastBed = BEDS_IN_FARM - 1, lastRow = FARM.y + FARM.h - 1;
const BED_RANGE = "not between 0 and 23", BED_RANGE_NOW = `not between 0 and ${lastBed}`;

const sql = `-- v284: the farm's southern half, 24 more beds (the owner, 2026-10-19, every bed held: "ช่วยเพิ่ม แปลงปลูกผักมาอีก
-- เท่านึง ในฟาร์ม"; "1 คน เป็นเจ้าของมากสุดได้แค่ 2 แปลง", which beds.each already holds the database to, unchanged).
--
-- Run after v281, and after v283 if v283 is to run: v283 writes the farming row whole with the first 24 beds, and run
-- after this one it would take the new beds out again. Safe to run twice. Either order with the page is safe: before
-- the page is live nobody can stand in the southern half; after it, a bed there is refused ('soil') until this has run.
--
-- What it changes (the database's own copies of the farm's shape, lib/town/world):
--   * the catalog: farming.bedsAt (beds 24 to 47 after the first 24, none of whose numbers moves), rewards.cloudCorners
--     (the cloud jar's beds, the same corners), cooking.map.farm, insects.nectar.maps and ground.maps (the farm's tiles,
--     ${was} → ${now}), and insects.haunts (one good garden's haunt over each new bed, after every other, so no haunt
--     moves or changes its number);
--   * the two tables keyed by bed that held the bed to 0..23 (the conduit's and the cloud's), and the two functions that
--     held a cloud's beds to 0..23 (public.town_reward and town.reward_cloud, each its live text but for that range);
--   * town.reward_relay_place: the farm's rows run to ${lastRow}.
-- No plot, bed, purse or member is touched.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)') is null then raise exception 'Run v281 before v284'; end if;
  if to_regprocedure('town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint)') is null then raise exception 'v284: town.reward_cloud is missing'; end if;
  if to_regclass('town.reward_conduits') is null or to_regclass('town.reward_cloud_consents') is null then raise exception 'v284: the reward tables are missing'; end if;
end $$;

-- ── 1. The catalog's copies of the farm's shape ──────────────────────────────────────────────────────────────────
update public.town_catalog set data = jsonb_set(data, '{bedsAt}', $j$${json(beds)}$j$::jsonb), updated_at = now()
 where key = 'farming' and data->'bedsAt' is distinct from $j$${json(beds)}$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{cloudCorners}', $j$${json(beds)}$j$::jsonb), updated_at = now()
 where key = 'rewards' and data ? 'cloudCorners' and data->'cloudCorners' is distinct from $j$${json(beds)}$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{map,farm}', '${now}'::jsonb), updated_at = now()
 where key = 'cooking' and data->'map'->'farm' = '${was}'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{maps}', (select jsonb_agg(case when m = '${was}'::jsonb then '${now}'::jsonb else m end order by o)
                                                                   from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'ground' and data->'maps' @> '[${was}]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select jsonb_agg(case when m = '["farm",${was.slice(1)}'::jsonb then '["farm",${now.slice(1)}'::jsonb else m end order by o)
                                                                          from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'insects' and data->'nectar'->'maps' @> '[["farm",${was.slice(1)}]'::jsonb;
-- (the new gardens' haunts, after the ${OLD_HAUNTS} there are, only while there are just those)
update public.town_catalog set data = jsonb_set(data, '{haunts}', (data->'haunts') || $j$${json(haunts.slice(OLD_HAUNTS))}$j$::jsonb), updated_at = now()
 where key = 'insects' and jsonb_array_length(data->'haunts') = ${OLD_HAUNTS};

do $$
declare r jsonb; i jsonb; k jsonb; g jsonb;
begin
  select data into r from public.town_catalog where key = 'rewards';
  select data into i from public.town_catalog where key = 'insects';
  select data into k from public.town_catalog where key = 'cooking';
  select data into g from public.town_catalog where key = 'ground';
  if (select data->'bedsAt' from public.town_catalog where key = 'farming') is distinct from $j$${json(beds)}$j$::jsonb then raise exception 'v284: farming.bedsAt is not the 48 beds'; end if;
  if r->'cloudCorners' is distinct from $j$${json(beds)}$j$::jsonb then raise exception 'v284: rewards.cloudCorners is not the 48 beds'; end if;
  if k->'map'->'farm' is distinct from '${now}'::jsonb then raise exception 'v284: cooking.map.farm is %', k->'map'->'farm'; end if;
  if not g->'maps' @> '[${now}]'::jsonb or g->'maps' @> '[${was}]'::jsonb then raise exception 'v284: ground.maps is %', g->'maps'; end if;
  if not i->'nectar'->'maps' @> '[["farm",${now.slice(1)}]'::jsonb or i->'nectar'->'maps' @> '[["farm",${was.slice(1)}]'::jsonb then raise exception 'v284: insects.nectar.maps is %', i->'nectar'->'maps'; end if;
  if jsonb_array_length(i->'haunts') <> ${haunts.length} or (select jsonb_agg(h order by o) from jsonb_array_elements(i->'haunts') with ordinality x(h, o) where o > ${OLD_HAUNTS}) is distinct from $j$${json(haunts.slice(OLD_HAUNTS))}$j$::jsonb then
    raise exception 'v284: insects.haunts has % (another file wrote haunts since v267?): rebuild v284', jsonb_array_length(i->'haunts'); end if;
  if town.bed_of(${beds[OLD_BEDS][0]}, ${beds[OLD_BEDS][1]}) <> ${OLD_BEDS} or town.bed_of(${beds[lastBed][0] + 6}, ${beds[lastBed][1] + 6}) <> ${lastBed} or town.bed_of(${beds[0][0]}, ${beds[0][1]}) <> 0 then raise exception 'v284: town.bed_of does not see the new beds'; end if;
end $$;

-- ── 2. The tables keyed by bed: 0..${lastBed} ─────────────────────────────────────────────────────────────────────────
do $$
declare c record;
begin
  for c in select conrelid::regclass::text as t, conname from pg_constraint
            where contype = 'c' and conrelid in ('town.reward_conduits'::regclass, 'town.reward_cloud_consents'::regclass) and pg_get_constraintdef(oid) ~ '\\mbed\\M' loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table town.reward_conduits add constraint reward_conduits_bed_check check (bed between 0 and ${lastBed});
alter table town.reward_cloud_consents add constraint reward_cloud_consents_bed_check check (bed between 0 and ${lastBed});

-- ── 3. The cloud's beds: 0..${lastBed} (each function its live text but for the one range) ────────────────────────────────
do $$
declare sig text; d text; n integer;
begin
  foreach sig in array array['public.town_reward(uuid,jsonb)', 'town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint)'] loop
    d := pg_get_functiondef(sig::regprocedure);
    n := (length(d) - length(replace(d, '${BED_RANGE}', ''))) / length('${BED_RANGE}');
    if n = 1 then execute replace(d, '${BED_RANGE}', '${BED_RANGE_NOW}');
    elsif not (n = 0 and position('${BED_RANGE_NOW}' in d) > 0) then raise exception 'v284: % holds the beds to 0..23 % times, not once: rebuild v284', sig, n; end if;
  end loop;
end $$;

-- ── 4. Where a relay may stand: the farm's rows run to ${lastRow} (v222's but for that) ──────────────────────────────────────
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 63 then 'town'
 when (at_->>0)::integer between ${FARM.x} and ${FARM.x + FARM.w - 1} and (at_->>1)::integer between ${FARM.y} and ${lastRow} then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select jsonb_array_length(data->'bedsAt') from public.town_catalog where key = 'farming';                  -- 48
--   select town.bed_of(${beds[lastBed][0]}, ${beds[lastBed][1]});                                                                   -- ${lastBed}
--   select jsonb_array_length(data->'haunts') from public.town_catalog where key = 'insects';                  -- ${haunts.length}
`;
writeFileSync("supabase/v284_the_farms_southern_half.sql", sql);
console.log("written", sql.length);
