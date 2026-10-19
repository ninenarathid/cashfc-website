// Writes supabase/v284_the_farms_southern_half.sql from the code: the beds' corners, the farm's tiles and the new
// garden haunts as lib/town/catalog's catalogOf gives them, so that the file and the page cannot say different things.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v284.mjs
import { writeFileSync } from "node:fs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { FARM, FARM_FIRST, BEDS_IN_FARM, WELLS } = await import("@/lib/town/world");

const c = catalogOf();
const OLD_BEDS = 24, OLD_HAUNTS = 149;
const beds = c.farming.bedsAt, haunts = c.insects.haunts;
if (beds.length !== BEDS_IN_FARM || BEDS_IN_FARM !== 2 * OLD_BEDS) throw Error(`beds: ${beds.length}`);
if (haunts.length !== OLD_HAUNTS + BEDS_IN_FARM - OLD_BEDS) throw Error(`haunts: ${haunts.length}`);
const json = (v) => JSON.stringify(v);
const was = json([FARM_FIRST.x, FARM_FIRST.y, FARM_FIRST.w, FARM_FIRST.h]), now = json([FARM.x, FARM.y, FARM.w, FARM.h]);
const lastBed = BEDS_IN_FARM - 1, lastRow = FARM.y + FARM.h - 1;
const BED_RANGE = "not between 0 and 23", BED_RANGE_NOW = `not between 0 and ${lastBed}`;
const OLD_POSTS = 28, lamps = c.lamps.maps, wells = c.farming.wells;
if (lamps.farm.posts.length !== 52 || lamps.farm.fires.length !== 2 || wells.length !== 2) throw Error("lamps or wells");
// (each well check of the database, as its live text has it, and what it becomes: town.at_well knows both wells)
const WELL_CHECKS = [
  ["public.town_chore(integer,integer)", "greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) = 1", "town.at_well(p_x, p_y)"],
  ["public.town_moon_pour(integer,integer,integer)", "greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) <> 1", "not town.at_well(p_x, p_y)"],
  ["town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)", "greatest(abs(p_x-(well_->>0)::integer),abs(p_y-(well_->>1)::integer))<>1", "not town.at_well(p_x,p_y)"],
];
const lit = (s) => s.replace(/'/g, "''");

const sql = `-- v284: the farm's southern half, 24 more beds (the owner, 2026-10-19, every bed held: "ช่วยเพิ่ม แปลงปลูกผักมาอีก
-- เท่านึง ในฟาร์ม"; "1 คน เป็นเจ้าของมากสุดได้แค่ 2 แปลง", which beds.each already holds the database to, unchanged).
--
-- And its lamps, a second brazier and a second well (the owner, the same day: "เพิ่มจุดโคมไฟใหม่ด้วย", "เพิ่มจุด เริ่มอีก
-- จุด ใน area ใหม่ และ บ่อน้ำเพิ่มเติมด้วยก็ได้"): 24 more lamp posts (28 to 51), a flame taken at either brazier, and
-- a can filled or water poured at either well, the two wells one water.
--
-- Run after v281; v283 and this may run in either order (each writes only its own entries). Safe to run twice. Either
-- order with the page is safe: before the page is live nobody can stand in the southern half; after it, a bed, a post,
-- the second brazier or the second well there is refused until this has run.
--
-- What it changes (the database's own copies of the farm's shape, lib/town/world):
--   * the catalog: farming.bedsAt (beds 24 to 47 after the first 24, none of whose numbers moves), rewards.cloudCorners
--     (the cloud jar's beds, the same corners), rewards.nurseryBoxes (where the bottle forest's nursery may begin),
--     cooking.map.farm, insects.nectar.maps and ground.maps (the farm's tiles,
--     ${was} → ${now}), and insects.haunts (one good garden's haunt over each new bed, after every other, so no haunt
--     moves or changes its number);
--   * the two tables keyed by bed that held the bed to 0..23 (the conduit's and the cloud's), and the two functions that
--     held a cloud's beds to 0..23 (public.town_reward and town.reward_cloud, each its live text but for that range);
--   * town.reward_relay_place: the farm's rows run to ${lastRow};
--   * the lamps: the catalog's lamps.maps.farm.posts (the first ${OLD_POSTS} as they were) and each map's \`fires\` (\`fire\`
--     stays the first, for a page loaded before); town.lamp_by, written again, takes a flame at any of a map's fires;
--   * the wells: the catalog's farming.wells (\`wellAt\` stays the first); town.at_well, new; and the three functions that
--     held somebody to the one well (public.town_chore, public.town_moon_pour, town.stream_work), each its live text but
--     for that one test.
-- No plot, bed, purse, lamp lit or member is touched.
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
update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', (select jsonb_agg(case when m = '${was}'::jsonb then '${now}'::jsonb else m end order by o)
                                                                           from jsonb_array_elements(data->'nurseryBoxes') with ordinality x(m, o))), updated_at = now()
 where key = 'rewards' and data->'nurseryBoxes' @> '[${was}]'::jsonb;
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
  if not r->'nurseryBoxes' @> '[${now}]'::jsonb or r->'nurseryBoxes' @> '[${was}]'::jsonb then raise exception 'v284: rewards.nurseryBoxes is %', r->'nurseryBoxes'; end if;
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

-- ── 5. The lamps: the southern half's posts after the first ${OLD_POSTS}, and a flame taken at either brazier ───────────────────────
update public.town_catalog set data = jsonb_set(data, '{maps,farm,posts}', $j$${json(lamps.farm.posts)}$j$::jsonb), updated_at = now()
 where key = 'lamps' and data->'maps'->'farm'->'posts' is distinct from $j$${json(lamps.farm.posts)}$j$::jsonb
   and (select jsonb_agg(p order by o) from jsonb_array_elements(data->'maps'->'farm'->'posts') with ordinality x(p, o) where o <= ${OLD_POSTS}) = $j$${json(lamps.farm.posts.slice(0, OLD_POSTS))}$j$::jsonb;
update public.town_catalog set data = jsonb_set(jsonb_set(data, '{maps,farm,fires}', $j$${json(lamps.farm.fires)}$j$::jsonb), '{maps,forest,fires}', $j$${json(lamps.forest.fires)}$j$::jsonb), updated_at = now()
 where key = 'lamps' and (data->'maps'->'farm'->'fires' is distinct from $j$${json(lamps.farm.fires)}$j$::jsonb or data->'maps'->'forest'->'fires' is distinct from $j$${json(lamps.forest.fires)}$j$::jsonb);
do $$ begin
  if (select data->'maps'->'farm'->'posts' from public.town_catalog where key = 'lamps') is distinct from $j$${json(lamps.farm.posts)}$j$::jsonb then raise exception 'v284: the farm''s lamp posts are not the 52 (its first 28 moved?): rebuild v284'; end if;
  if (select data->'maps'->'farm'->'fire' from public.town_catalog where key = 'lamps') is distinct from $j$${json(lamps.farm.fire)}$j$::jsonb then raise exception 'v284: the farm''s first fire moved'; end if;
end $$;

-- A map's fire, or one of its posts, within reach of a tile (v163's, but a fire is any of the map's \`fires\`, or its
-- \`fire\` where it has no list)
CREATE OR REPLACE FUNCTION town.lamp_by(p_map text, p_post integer, p_x integer, p_y integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_x is not null and p_y is not null and exists (
    select 1
      from (select town.cat('lamps') as k) l,
           lateral jsonb_array_elements(case when p_post is null then coalesce(l.k->'maps'->p_map->'fires', jsonb_build_array(l.k->'maps'->p_map->'fire'))
                                             when p_post >= 0 then jsonb_build_array(l.k->'maps'->p_map->'posts'->p_post) end) t(tile)
     where jsonb_typeof(t.tile) = 'array'
       and greatest(abs(p_x - (t.tile->>0)::integer), abs(p_y - (t.tile->>1)::integer)) <= (l.k->>'near')::integer)
$function$;

-- ── 6. The wells: both, one water ──────────────────────────────────────────────────────────────────────────────────────
update public.town_catalog set data = jsonb_set(data, '{wells}', $j$${json(wells)}$j$::jsonb), updated_at = now()
 where key = 'farming' and data->'wells' is distinct from $j$${json(wells)}$j$::jsonb;
-- Whether a tile is beside one of the farm's wells (lib/town/world's atWell): \`wells\`, or \`wellAt\` where there is no list.
create or replace function town.at_well(p_x integer, p_y integer)
returns boolean language sql stable set search_path = '' as $$
  select p_x is not null and p_y is not null and exists (
    select 1 from jsonb_array_elements(coalesce(town.cat('farming')->'wells', jsonb_build_array(town.cat('farming')->'wellAt'))) w
     where jsonb_typeof(w) = 'array' and greatest(abs(p_x - (w->>0)::integer), abs(p_y - (w->>1)::integer)) = 1)
$$;
revoke all on function town.at_well(integer, integer) from public, anon, authenticated;
do $$
declare c text[]; d text; n integer;
begin
  foreach c slice 1 in array array[${WELL_CHECKS.map(([sig, a, b]) => `['${sig}', '${lit(a)}', '${lit(b)}']`).join(",\n                                  ")}] loop
    d := pg_get_functiondef(c[1]::regprocedure);
    n := (length(d) - length(replace(d, c[2], ''))) / length(c[2]);
    if n = 1 then execute replace(d, c[2], c[3]);
    elsif not (n = 0 and position(c[3] in d) > 0) then raise exception 'v284: % holds somebody to the one well % times, not once: rebuild v284', c[1], n; end if;
  end loop;
  if not town.at_well(${wells[1][0] + 1}, ${wells[1][1]}) or not town.at_well(${wells[0][0] - 1}, ${wells[0][1] + 1}) or town.at_well(${wells[1][0]}, ${wells[1][1]}) then raise exception 'v284: town.at_well does not see both wells'; end if;
end $$;
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select jsonb_array_length(data->'bedsAt') from public.town_catalog where key = 'farming';                  -- 48
--   select town.bed_of(${beds[lastBed][0]}, ${beds[lastBed][1]});                                                                   -- ${lastBed}
--   select jsonb_array_length(data->'haunts') from public.town_catalog where key = 'insects';                  -- ${haunts.length}
--   select jsonb_array_length(data->'maps'->'farm'->'posts') from public.town_catalog where key = 'lamps';     -- 52
--   select town.at_well(${wells[1][0] + 1}, ${wells[1][1]});                                                                       -- true
`;
writeFileSync("supabase/v284_the_farms_southern_half.sql", sql);
console.log("written", sql.length);
