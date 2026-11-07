// Writes supabase/v323_the_editors_farm.sql: the editor's farm (lib/town/farm2) and a switch between it and the old farm,
// with both farms' parts of the catalog (db/farm2-parts.mjs) and what moves a member's things from one to the other.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v323.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// (the tree, with forward slashes: the loader of its TypeScript compares paths so)
const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
const partsOf = (map) => execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/farm2-parts.mjs"],
  { cwd: REPO, env: { ...process.env, FC_REPO: REPO, FARM_MAP: map, TOWN_MAP: "town2" }, encoding: "utf8", maxBuffer: 1 << 26 });
const farm2 = partsOf("farm2"), classic = partsOf("classic");
for (const p of [farm2, classic]) if (p.includes("$parts$")) throw new Error("a part holds the quoting tag");
const C = JSON.parse(classic), F = JSON.parse(farm2);

const sql = `-- v323 — the editor's farm, and a switch between it and the old farm
--
-- Run once in the Supabase SQL editor, AFTER the site's deploy that has the editor's farm in it (a page built before knows
-- only the old farm). Running it again is safe and changes nothing more. Needs v295 and v322.
--
-- The owner, 2026-11-07, of the map editor's farm "oatto-farmv2": "ช่วย check … แล้ววางแผนปรับแผนที่ฟาร์มจากแผนนี้หน่อย", and of the
-- plan, "เริ่มทำได้เลย". Both farms are in the site's code (lib/town/farm-map); this file keeps which one is the farm
-- (public.town_farm_switch) and, for each, its parts of the catalog the database holds a member to (town.farm_parts): where
-- each of the 48 beds is (its number kept: a member's plots stay his, each bed somewhere else), the wells (two tiles
-- across in the editor's farm), the farm's box for cooking, things on the ground, nectar and the nursery, its insects'
-- haunts (each its number and kind), its two chests, the lamp relay's four fires and 92 posts, the egg spots and the hay
-- wagon's stop, the cloud jar's corners and the spring by the well.
--
-- What it does when it runs: nothing changes for members. The farm stays the old one until it is switched:
--     select town.apply_farm('farm2');        -- the editor's farm for everybody
--     select town.apply_farm('classic');      -- back to the old farm, at once, in an emergency
--     select * from public.town_farm_switch;   -- which it is now (and how many times it has been switched: epoch)
-- A switch, in one transaction (members' deeds on the farm wait the moments it takes):
--   * the catalog's farm parts become that farm's (what the catalog held is kept as the farm switched away from, so that
--     switching back puts back exactly what was);
--   * every plot moves with its bed, all it holds as it was (its soil, its plant, its water, its insect house): a giant's
--     root and footprint with it; a plant whose rolls go by the plot it was sown at keeps that plot's key (\`home\`), so
--     that nothing it would have rolled rolls again;
--   * what a member has waiting at a farm tile moves the same way: on a plot, with its bed (pollen, a giant growing, the
--     garden helpers' jobs, a bean, a row begun, what was aided); anywhere else (a water relay, a nursery, eggs laid out,
--     a pot set down, a thing dropped, an insect lured, a rescue), to the same place of the same barn, the same egg spot,
--     or as its nearest bed moves, on the nearest tile one may stand on there. Nothing is taken away;
--   * the epoch goes up by one. A page still showing the farm switched from says so with each of its requests (its
--     \`x-town-farm\` header, lib/supabase/client): from now on a write of it to the farm's plots, pots, things on the
--     ground or a purse is refused ("farm-moved") and that page loads again (components/town/Town.tsx's farmMoved).
--
-- History is left as it was: the deeds, the town news and the receipts of answers keep the tiles they were told at.

begin;
set local statement_timeout = '300s';
set local lock_timeout = '10s';
do $guard$ begin
  if to_regprocedure('town.swap_in(jsonb,jsonb,text)') is null then raise exception 'Run v295 before v323'; end if;
  if to_regclass('public.town_garden_book') is null then raise exception 'Run v322 before v323'; end if;
  if to_regprocedure('town.at_well(integer,integer)') is null or to_regprocedure('town.well_by(integer,integer)') is null then raise exception 'v323 needs v284 and v287'; end if;
end $guard$;

-- ── 1. Which farm it is, and what of the catalog is each farm's ──────────────────────────────────────────────────────
create table if not exists public.town_farm_switch (
  one boolean primary key default true check (one),
  -- whose parts the catalog holds now, and so which farm every page has
  catalog text not null default 'classic' check (catalog in ('classic', 'farm2')),
  -- how many times the farm has been switched
  epoch bigint not null default 0,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.town_farm_switch enable row level security;
-- No policies: read through town_farm_map() and written through town.apply_farm.
revoke all on public.town_farm_switch from public, anon, authenticated;
insert into public.town_farm_switch (one, catalog) values (true, 'classic') on conflict (one) do nothing;

create table if not exists town.farm_parts (
  map text primary key check (map in ('classic', 'farm2')),
  parts jsonb not null,
  -- 'code': as the site's code made them (this file); 'live': as the catalog held them when the farm was switched away from
  taken text not null default 'code' check (taken in ('code', 'live')),
  taken_at timestamptz not null default now()
);
revoke all on town.farm_parts from public, anon, authenticated;
-- the editor's farm's, as the code makes them (written again by a later file the same way)
insert into town.farm_parts (map, parts, taken) values ('farm2', $parts$${farm2}$parts$::jsonb, 'code')
  on conflict (map) do update set parts = excluded.parts, taken = 'code', taken_at = now();
-- the old farm's, as the code makes them: only until the catalog's own are kept, the first time the farm is switched away
-- from it (then never written over from here)
insert into town.farm_parts (map, parts, taken) values ('classic', $parts$${classic}$parts$::jsonb, 'code')
  on conflict (map) do nothing;

-- ── 2. The farm's parts of the catalog, as it holds them now ─────────────────────────────────────────────────────────
-- (a box [x, y, w, h] or a named one ["farm", x, y, w, h] whose corner is the farm's)
create or replace function town.farm_corner(m jsonb) returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(m) <> 'array' then false
    when m->>0 = 'farm' then true
    when jsonb_typeof(m->0) = 'number' and jsonb_typeof(m->1) = 'number' then (m->>0)::numeric = 128 and (m->>1)::numeric = 0 and jsonb_array_length(m) = 4
    else false end
$$;
-- (a tile of the farm's part of the tile space, either farm's: x from 128 below 278, y from 0 below 110)
create or replace function town.farm_space(m jsonb) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(m) = 'array' and jsonb_typeof(m->0) = 'number' and jsonb_typeof(m->1) = 'number'
     and (m->>0)::numeric >= 128 and (m->>0)::numeric < 278 and (m->>1)::numeric >= 0 and (m->>1)::numeric < 110
$$;
create or replace function town.catalog_farm_parts() returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bedsAt', f.data->'bedsAt', 'side', f.data->'side', 'wellAt', f.data->'wellAt', 'wells', f.data->'wells', 'wellSize', coalesce(f.data->'wellSize', '1'::jsonb),
    'cookingFarm', (select c.data->'map'->'farm' from public.town_catalog c where c.key = 'cooking'),
    'haunts', (select coalesce(jsonb_object_agg((h.o - 1)::text, h.v), '{}'::jsonb) from public.town_catalog c,
                jsonb_array_elements(c.data->'haunts') with ordinality h(v, o) where c.key = 'insects' and h.v->>1 = 'farm'),
    'nectarFarm', (select m from public.town_catalog c, jsonb_array_elements(c.data->'nectar'->'maps') m where c.key = 'insects' and m->>0 = 'farm' limit 1),
    'groundFarm', (select m from public.town_catalog c, jsonb_array_elements(c.data->'maps') m where c.key = 'ground' and town.farm_corner(m) limit 1),
    'boxFarm', (select coalesce(jsonb_agg(m order by o), '[]'::jsonb) from public.town_catalog c, jsonb_array_elements(c.data->'more') with ordinality x(m, o)
                 where c.key = 'box' and town.farm_space(m)),
    'lampsFarm', (select c.data->'maps'->'farm' from public.town_catalog c where c.key = 'lamps'),
    'eggSpots', (select c.data->'eggSpots' from public.town_catalog c where c.key = 'animals'),
    'wagonFarm', (select c.data->'wagonStops'->'farm' from public.town_catalog c where c.key = 'animals'),
    'cloudCorners', (select c.data->'cloudCorners' from public.town_catalog c where c.key = 'rewards'),
    'nurseryFarm', (select m from public.town_catalog c, jsonb_array_elements(c.data->'nurseryBoxes') m where c.key = 'rewards' and town.farm_corner(m) limit 1),
    'springFarm', (select c.data->'springSites'->1 from public.town_catalog c where c.key = 'rewards'))
  from public.town_catalog f where f.key = 'farming'
$$;

-- ── 3. Laying a farm's parts over the catalog ────────────────────────────────────────────────────────────────────────
create or replace function town.lay_farm_parts(p jsonb) returns void language plpgsql set search_path = '' as $$
declare h record;
begin
  update public.town_catalog set data = data || jsonb_build_object('bedsAt', p->'bedsAt', 'side', p->'side', 'wellAt', p->'wellAt', 'wells', p->'wells', 'wellSize', p->'wellSize'),
    updated_at = now() where key = 'farming';
  update public.town_catalog set data = jsonb_set(data, '{map,farm}', p->'cookingFarm'), updated_at = now() where key = 'cooking' and p ? 'cookingFarm';
  for h in select key::integer i, value v from jsonb_each(p->'haunts') loop
    update public.town_catalog set data = jsonb_set(data, array['haunts', h.i::text], h.v) where key = 'insects';
  end loop;
  update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select coalesce(jsonb_agg(case when m->>0 = 'farm' then p->'nectarFarm' else m end order by o), '[]'::jsonb)
      from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now() where key = 'insects' and p ? 'nectarFarm';
  update public.town_catalog set data = jsonb_set(data, '{maps}', (select coalesce(jsonb_agg(case when town.farm_corner(m) then p->'groundFarm' else m end order by o), '[]'::jsonb)
      from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now() where key = 'ground' and p ? 'groundFarm';
  -- (the chests beyond the plaza's: the others as they were, in their order, then the farm's)
  update public.town_catalog set data = jsonb_set(data, '{more}', (select coalesce(jsonb_agg(m order by o), '[]'::jsonb)
      from jsonb_array_elements(data->'more') with ordinality x(m, o) where not town.farm_space(m)) || (p->'boxFarm')), updated_at = now() where key = 'box' and p ? 'boxFarm';
  update public.town_catalog set data = jsonb_set(data, '{maps,farm}', p->'lampsFarm'), updated_at = now() where key = 'lamps' and p ? 'lampsFarm';
  update public.town_catalog set data = data || jsonb_build_object('eggSpots', p->'eggSpots'), updated_at = now() where key = 'animals' and p ? 'eggSpots';
  update public.town_catalog set data = jsonb_set(data, '{wagonStops,farm}', p->'wagonFarm'), updated_at = now() where key = 'animals' and p ? 'wagonFarm';
  update public.town_catalog set data = data || jsonb_build_object('cloudCorners', p->'cloudCorners'), updated_at = now() where key = 'rewards' and data ? 'cloudCorners' and p ? 'cloudCorners';
  update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', (select coalesce(jsonb_agg(case when town.farm_corner(m) then p->'nurseryFarm' else m end order by o), '[]'::jsonb)
      from jsonb_array_elements(data->'nurseryBoxes') with ordinality x(m, o))), updated_at = now() where key = 'rewards' and jsonb_typeof(data->'nurseryBoxes') = 'array' and p ? 'nurseryFarm';
  update public.town_catalog set data = jsonb_set(data, '{springSites,1}', p->'springFarm'), updated_at = now() where key = 'rewards' and jsonb_typeof(data->'springSites') = 'array' and p ? 'springFarm';
end $$;

-- ── 4. Where a tile of one farm is in the other ──────────────────────────────────────────────────────────────────────
-- (\`f\` the farm moved from, \`t\` the farm moved to: each one's parts)
create or replace function town.farm_in(p jsonb, x integer, y integer) returns boolean language sql immutable set search_path = '' as $$
  select x >= (p->'rect'->>0)::integer and y >= (p->'rect'->>1)::integer and x < (p->'rect'->>0)::integer + (p->'rect'->>2)::integer and y < (p->'rect'->>1)::integer + (p->'rect'->>3)::integer
$$;
-- The bed a tile is a plot of, by its number (0 the first), or null.
create or replace function town.farm_bed(p jsonb, x integer, y integer) returns integer language sql immutable set search_path = '' as $$
  select (b.o - 1)::integer from jsonb_array_elements(p->'bedsAt') with ordinality b(c, o)
   where x >= (b.c->>0)::integer and x < (b.c->>0)::integer + (p->>'side')::integer and y >= (b.c->>1)::integer and y < (b.c->>1)::integer + (p->>'side')::integer
   order by b.o limit 1
$$;
-- Whether a tile of a farm may be stood on (its walking rows, as the code lays them).
create or replace function town.farm_open(p jsonb, x integer, y integer) returns boolean language sql immutable set search_path = '' as $$
  select town.farm_in(p, x, y) and substr(p->'walk'->>(y - (p->'rect'->>1)::integer), x - (p->'rect'->>0)::integer + 1, 1) = '.'
$$;
-- The tile itself, if one may stand on it; else the nearest one may (nearest first, then by row, then by column, within
-- eight); else where the farm's first gate puts one.
create or replace function town.farm_open_near(p jsonb, x integer, y integer) returns integer[] language sql immutable set search_path = '' as $$
  select coalesce(
    (select array[x + dx, y + dy] from generate_series(-8, 8) dx, generate_series(-8, 8) dy
      where town.farm_open(p, x + dx, y + dy) order by dx * dx + dy * dy, dy, dx limit 1),
    array[(p->'arrive'->>0)::integer, (p->'arrive'->>1)::integer])
$$;
/*
 * Where a tile of one farm is in the other, or null for a tile of no farm: a plot, with its bed (the same plot of the same
 * bed: one to one, and back again); an egg spot, the same spot; a barn's floor, its step or the lane before it, the same
 * place of the same barn; anywhere else, as the bed nearest it moves; and then, where that is not a tile one may stand on,
 * the nearest that is.
 */
create or replace function town.farm_point(f jsonb, t jsonb, x integer, y integer) returns integer[] language plpgsql immutable set search_path = '' as $$
declare b integer; i integer; c jsonb; d jsonb; best integer := 0; bestd double precision := 1e18; dd double precision;
begin
  if x is null or y is null or not town.farm_in(f, x, y) then return null; end if;
  b := town.farm_bed(f, x, y);
  if b is not null then
    c := f->'bedsAt'->b; d := t->'bedsAt'->b;
    return array[x - (c->>0)::integer + (d->>0)::integer, y - (c->>1)::integer + (d->>1)::integer];
  end if;
  for i in 0 .. coalesce(jsonb_array_length(f->'eggSpots'), 0) - 1 loop
    if (f->'eggSpots'->i->>0)::integer = x and (f->'eggSpots'->i->>1)::integer = y and t->'eggSpots'->i is not null then
      return array[(t->'eggSpots'->i->>0)::integer, (t->'eggSpots'->i->>1)::integer];
    end if;
  end loop;
  for i in 0 .. jsonb_array_length(f->'barns') - 1 loop
    c := f->'barns'->i; d := t->'barns'->i;
    if x between (c->>0)::integer - 1 and (c->>0)::integer + 8 and y between (c->>1)::integer - 1 and (c->>1)::integer + 6 then
      return town.farm_open_near(t, x - (c->>0)::integer + (d->>0)::integer, y - (c->>1)::integer + (d->>1)::integer);
    end if;
  end loop;
  for i in 0 .. jsonb_array_length(f->'bedsAt') - 1 loop
    c := f->'bedsAt'->i;
    dd := (x + 0.5 - (c->>0)::integer - 3.5) ^ 2 + (y + 0.5 - (c->>1)::integer - 3.5) ^ 2;
    if dd < bestd then bestd := dd; best := i; end if;
  end loop;
  c := f->'bedsAt'->best; d := t->'bedsAt'->best;
  return town.farm_open_near(t, x - (c->>0)::integer + (d->>0)::integer, y - (c->>1)::integer + (d->>1)::integer);
end $$;
-- A plot's or a tile's key "x,y", moved (any other string as it was).
create or replace function town.farm_key(f jsonb, t jsonb, k text) returns text language plpgsql immutable set search_path = '' as $$
declare m text[]; n integer[];
begin
  m := regexp_match(coalesce(k, ''), '^(\\d+),(\\d+)$');
  if m is null then return k; end if;
  n := town.farm_point(f, t, m[1]::integer, m[2]::integer);
  return case when n is null then k else n[1] || ',' || n[2] end;
end $$;
-- A point [x, y] (whole tiles, or a point in one), moved by its tile, what it was into the tile kept.
create or replace function town.farm_at(f jsonb, t jsonb, a jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
declare x numeric; y numeric; n integer[];
begin
  if jsonb_typeof(a) <> 'array' or jsonb_array_length(a) <> 2 or jsonb_typeof(a->0) <> 'number' or jsonb_typeof(a->1) <> 'number' then return a; end if;
  x := (a->>0)::numeric; y := (a->>1)::numeric;
  n := town.farm_point(f, t, floor(x)::integer, floor(y)::integer);
  if n is null then return a; end if;
  return jsonb_build_array(n[1] + (x - floor(x)), n[2] + (y - floor(y)));
end $$;
-- Every "x,y" of a farm tile in a string that names something by where it is (an identity, a job), moved.
create or replace function town.farm_ident(f jsonb, t jsonb, s text) returns text language plpgsql immutable set search_path = '' as $$
declare out_ text := ''; rest text := s; p integer; m text[]; n integer[];
begin
  if s is null then return s; end if;
  loop
    p := regexp_instr(rest, '\\d+,\\d+');
    exit when p = 0;
    m := regexp_match(substr(rest, p), '^(\\d+),(\\d+)');
    -- (a number running on from one before it is no tile's)
    n := case when p > 1 and substr(rest, p - 1, 1) ~ '[0-9.]' then null else town.farm_point(f, t, m[1]::integer, m[2]::integer) end;
    out_ := out_ || substr(rest, 1, p - 1) || coalesce(n[1] || ',' || n[2], m[1] || ',' || m[2]);
    rest := substr(rest, p + length(m[1]) + 1 + length(m[2]));
  end loop;
  return out_ || rest;
end $$;
/*
 * What a member has waiting with a farm tile in it, moved: under the names of what is a tile (\`key\`, \`root\`, \`cells\`,
 * \`keys\`, a giant's \`footprint\` a plot's "x,y"; \`at\`, \`from\`, \`source\` a point; a lured insect's {x, y}; \`identity\`, \`id\`, \`job\` a name
 * with a tile in it), wherever it is in the thing; everything else as it was.
 */
create or replace function town.farm_json(f jsonb, t jsonb, v jsonb, field text default null) returns jsonb language plpgsql immutable set search_path = '' as $$
declare k text; e jsonb; out_ jsonb;
begin
  case jsonb_typeof(v)
  when 'object' then
    if field = 'lured' and jsonb_typeof(v->'x') = 'number' and jsonb_typeof(v->'y') = 'number' then
      e := town.farm_at(f, t, jsonb_build_array(v->'x', v->'y'));
      return v || jsonb_build_object('x', e->0, 'y', e->1);
    end if;
    out_ := '{}'::jsonb;
    for k, e in select * from jsonb_each(v) loop out_ := out_ || jsonb_build_object(k, town.farm_json(f, t, e, k)); end loop;
    return out_;
  when 'array' then
    if field in ('at', 'from', 'source') and jsonb_array_length(v) = 2 and jsonb_typeof(v->0) = 'number' then return town.farm_at(f, t, v); end if;
    return (select coalesce(jsonb_agg(town.farm_json(f, t, x.e, field) order by x.o), '[]'::jsonb) from jsonb_array_elements(v) with ordinality x(e, o));
  when 'string' then
    -- (a plot's key "x,y", or a name with one in it, "giant:x,y")
    if field in ('key', 'root', 'cells', 'keys', 'footprint', 'identity', 'id', 'job') then return to_jsonb(town.farm_ident(f, t, v #>> '{}')); end if;
    return v;
  else return v;
  end case;
end $$;
revoke all on function town.farm_corner(jsonb), town.farm_space(jsonb), town.catalog_farm_parts(), town.lay_farm_parts(jsonb), town.farm_in(jsonb, integer, integer),
  town.farm_bed(jsonb, integer, integer), town.farm_open(jsonb, integer, integer), town.farm_open_near(jsonb, integer, integer), town.farm_point(jsonb, jsonb, integer, integer),
  town.farm_key(jsonb, jsonb, text), town.farm_at(jsonb, jsonb, jsonb), town.farm_ident(jsonb, jsonb, text), town.farm_json(jsonb, jsonb, jsonb, text) from public, anon, authenticated;

-- ── 5. Members' things, moved from one farm to the other ─────────────────────────────────────────────────────────────
-- Every entry of the professionRewards (lib/town/reward-*: pollen, a giant, a banquet begun at a tile and its rescue
-- ticket's copies of it, a relay, a nursery, …; a town's or the forest's tile is outside the farm's box and stays), and the
-- purse's own that hold a farm tile.
create or replace function town.farm_purse(f jsonb, t jsonb, doc jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(doc->'professionRewards') = 'object' then doc := jsonb_set(doc, '{professionRewards}', town.farm_json(f, t, doc->'professionRewards', null)); end if;
  if doc ? 'toast' and doc->'toast' <> 'null'::jsonb then doc := jsonb_set(doc, '{toast}', town.farm_json(f, t, doc->'toast', null)); end if;
  if doc ? 'lured' and doc->'lured' <> 'null'::jsonb then doc := jsonb_set(doc, '{lured}', town.farm_json(f, t, doc->'lured', 'lured')); end if;
  if doc ? 'follower' and doc->'follower' <> 'null'::jsonb then doc := jsonb_set(doc, '{follower}', town.farm_json(f, t, doc->'follower', null)); end if;
  if jsonb_typeof(doc->'aided') = 'array' then doc := jsonb_set(doc, '{aided}', town.farm_json(f, t, doc->'aided', 'aided')); end if;
  return doc;
end $$;
revoke all on function town.farm_purse(jsonb, jsonb, jsonb) from public, anon, authenticated;

create or replace function town.move_farm(f jsonb, t jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare plots integer := 0; purses integer := 0; animals integer := 0; pots integer := 0; ground integer := 0; springs integer := 0; stray integer;
begin
  -- every plot of the farm is a plot of one of its beds, or nothing is moved
  select count(*) into stray from public.town_plots p where town.farm_in(f, p.x, p.y) and town.farm_bed(f, p.x, p.y) is null;
  if stray > 0 then raise exception 'v323: % plots of the farm on no bed of it: nothing is moved', stray; end if;
  -- the plots, with their beds (out of the way first: a bed's new tiles are some other bed's old ones)
  -- (a plot's x and y are smallints, v110: out of the way is below nought, -x - 1)
  update public.town_plots set x = -x - 1 where town.farm_in(f, x, y);
  update public.town_plots p set x = n[1], y = n[2],
      plant = case when jsonb_typeof(p.plant) <> 'object' then p.plant
        -- (a plant's rolls go by the plot it was sown at: one that had not been moved keeps this one's key)
        else town.farm_json(f, t, p.plant, null) || case when p.plant ? 'home' or (p.plant ? 'root' and p.plant->>'root' <> (-p.x - 1) || ',' || p.y) then '{}'::jsonb
          else jsonb_build_object('home', (-p.x - 1) || ',' || p.y) end end
    from (select q.x qx, q.y qy, town.farm_point(f, t, -q.x - 1, q.y) n from public.town_plots q where q.x < 0) m
   where p.x = m.qx and p.y = m.qy;
  get diagnostics plots = row_count;
  if exists (select 1 from public.town_plots where x < 0) then raise exception 'v323: a plot was left unmoved'; end if;
  -- (the plant's own name for its home is untouched: it is a seed, not a place. A part of a giant names its root, moved)
  -- what members have waiting
  update public.town_purses pp set doc = m.doc from (select q.member_id, town.farm_purse(f, t, q.doc) doc from public.town_purses q
      where jsonb_typeof(q.doc->'professionRewards') = 'object' or q.doc ?| array['toast', 'lured', 'follower', 'aided']) m
   where pp.member_id = m.member_id and m.doc is distinct from pp.doc;
  get diagnostics purses = row_count;
  -- eggs and the like an animal left out
  update public.town_animals a set a = jsonb_set(a.a, '{outside}', (select coalesce(jsonb_agg(o || jsonb_build_object('at', town.farm_at(f, t, o->'at')) order by n), '[]'::jsonb)
      from jsonb_array_elements(a.a->'outside') with ordinality x(o, n)))
   where jsonb_typeof(a.a->'outside') = 'array' and jsonb_array_length(a.a->'outside') > 0;
  get diagnostics animals = row_count;
  -- a pot set down on the farm, and a thing dropped there
  update public.town_pots o set x = n[1], y = n[2] from (select id, town.farm_point(f, t, x, y) n from public.town_pots where not feast and town.farm_in(f, x, y)) m where o.id = m.id;
  get diagnostics pots = row_count;
  if to_regclass('public.town_ground') is not null then
    execute 'update public.town_ground g set x = m.n[1], y = m.n[2] from (select id, town.farm_point($1, $2, x, y) n from public.town_ground where town.farm_in($1, x, y)) m where g.id = m.id' using f, t;
    get diagnostics ground = row_count;
  end if;
  -- a spring by the well: at the other farm's spring by its well
  update town.reward_springs s set doc = jsonb_set(s.doc, '{at}', case when s.doc->'at' = f->'springFarm' then t->'springFarm' else town.farm_at(f, t, s.doc->'at') end)
   where town.farm_space(s.doc->'at');
  get diagnostics springs = row_count;
  return jsonb_build_object('plots', plots, 'purses', purses, 'animals', animals, 'pots', pots, 'ground', ground, 'springs', springs);
end $$;
revoke all on function town.move_farm(jsonb, jsonb) from public, anon, authenticated;

-- ── 6. A page with the other farm is refused a write ─────────────────────────────────────────────────────────────────
-- (every request of a page that has the town says which farm it has, \`x-town-farm\`, lib/supabase/client. One that says
-- none: the SQL editor and the database's own jobs (no request), the site's server (not a member) and a page without the
-- town, which writes no plot, pot or thing on the ground, are not held to it; a member's request to the farm's own tables
-- that says none is a page of the town from before this file's deploy, which has the old farm. The switch's own moving
-- is not held to it either)
create or replace function town.farm_page_guard() returns trigger language plpgsql set search_path = '' as $$
declare hs jsonb; h text; cat text;
begin
  if current_setting('town.farm_moving', true) = 'on' then return coalesce(new, old); end if;
  begin hs := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then hs := null; end;
  if hs is null then return coalesce(new, old); end if;
  h := hs->>'x-town-farm';
  if h is null then
    if tg_table_name = 'town_purses' or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') <> 'authenticated' then return coalesce(new, old); end if;
    h := 'classic';
  end if;
  select s.catalog into cat from public.town_farm_switch s where s.one;
  if h is distinct from coalesce(cat, 'classic') then
    raise exception 'farm-moved' using errcode = 'P0001', hint = 'the farm was changed since this page was loaded: load it again';
  end if;
  return coalesce(new, old);
end $$;
revoke all on function town.farm_page_guard() from public, anon, authenticated;
drop trigger if exists town_farm_page_guard on public.town_plots;
create trigger town_farm_page_guard before insert or update or delete on public.town_plots for each row execute function town.farm_page_guard();
drop trigger if exists town_farm_page_guard on public.town_pots;
create trigger town_farm_page_guard before insert or update or delete on public.town_pots for each row execute function town.farm_page_guard();
do $ground$ begin
  if to_regclass('public.town_ground') is not null then
    drop trigger if exists town_farm_page_guard on public.town_ground;
    create trigger town_farm_page_guard before insert or update or delete on public.town_ground for each row execute function town.farm_page_guard();
  end if;
end $ground$;
drop trigger if exists town_farm_page_guard on public.town_purses;
create trigger town_farm_page_guard before insert or update on public.town_purses for each row execute function town.farm_page_guard();

-- ── 7. The wells: beside a well of so many tiles across (the editor's farm's are two) ────────────────────────────────
create or replace function town.at_well(p_x integer, p_y integer)
returns boolean language sql stable set search_path = '' as $$
  select town.well_by(p_x, p_y) is not null
$$;
create or replace function town.well_by(p_x integer, p_y integer)
returns integer language sql stable set search_path = '' as $$
  select (w.o - 1)::integer
    from jsonb_array_elements(coalesce(town.cat('farming')->'wells', jsonb_build_array(town.cat('farming')->'wellAt'))) with ordinality w(t, o),
         (select coalesce((town.cat('farming')->>'wellSize')::integer, 1) n) s
   where p_x is not null and p_y is not null and jsonb_typeof(w.t) = 'array'
     and p_x between (w.t->>0)::integer - 1 and (w.t->>0)::integer + s.n and p_y between (w.t->>1)::integer - 1 and (w.t->>1)::integer + s.n
     and not (p_x between (w.t->>0)::integer and (w.t->>0)::integer + s.n - 1 and p_y between (w.t->>1)::integer and (w.t->>1)::integer + s.n - 1)
   order by w.o limit 1
$$;
revoke all on function town.at_well(integer, integer), town.well_by(integer, integer) from public, anon, authenticated;

-- ── 8. A relay may stand anywhere in either farm (the editor's is 150 tiles wide and 110 down) ───────────────────────
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 79 and (at_->>1)::integer between 0 and 79 then 'town'
 when (at_->>0)::integer between 128 and 277 and (at_->>1)::integer between 0 and 109 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;

-- (the triggers that react to a plant or a purse changing, quiet while the farm moves, those of them that are there)
create or replace function town.farm_quiet(p_quiet boolean) returns void language plpgsql set search_path = '' as $$
declare r record;
begin
  for r in select c.relname, g.tgname from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and not g.tgisinternal
              and ((c.relname = 'town_plots' and g.tgname in ('town_garden_spread', 'town_quality_keep')) or (c.relname = 'town_purses' and g.tgname = 'town_announce_garden_book')) loop
    execute format('alter table public.%I %s trigger %I', r.relname, case when p_quiet then 'disable' else 'enable' end, r.tgname);
  end loop;
end $$;
revoke all on function town.farm_quiet(boolean) from public, anon, authenticated;

-- ── 9. The switch ────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function town.apply_farm(p_map text, p_by uuid default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.town_farm_switch; f jsonb; t jsonb; moved jsonb := '{}'::jsonb;
begin
  if p_map is null or p_map not in ('classic', 'farm2') then return jsonb_build_object('ok', false, 'why', 'map'); end if;
  select * into s from public.town_farm_switch where one for update;
  if s.catalog = p_map then return jsonb_build_object('ok', true, 'map', p_map, 'epoch', s.epoch, 'moved', moved); end if;
  -- (nobody writes the farm's tables while it moves; their triggers that react to a plant or a purse changing are quiet
  -- for it: a plot moved is no plant sown, spread or graded)
  lock table public.town_plots, public.town_purses, public.town_pots, public.town_animals in share row exclusive mode;
  perform set_config('town.farm_moving', 'on', true);
  perform town.farm_quiet(true);
  -- what the catalog holds now is kept as that farm's (so that going back puts back exactly what was)
  update town.farm_parts fp set parts = fp.parts || town.catalog_farm_parts(), taken = 'live', taken_at = now() where fp.map = s.catalog;
  select fp.parts into f from town.farm_parts fp where fp.map = s.catalog;
  select fp.parts into t from town.farm_parts fp where fp.map = p_map;
  if f is null or t is null or jsonb_array_length(f->'bedsAt') <> jsonb_array_length(t->'bedsAt') or jsonb_array_length(f->'barns') <> jsonb_array_length(t->'barns') then
    raise exception 'v323: the two farms'' parts do not match: nothing is switched';
  end if;
  moved := town.move_farm(f, t);
  perform town.lay_farm_parts(t);
  perform town.farm_quiet(false);
  perform set_config('town.farm_moving', 'off', true);
  update public.town_farm_switch set catalog = p_map, epoch = epoch + 1, changed_by = p_by, changed_at = now() where one;
  return jsonb_build_object('ok', true, 'map', p_map, 'epoch', s.epoch + 1, 'moved', moved);
end $$;
revoke all on function town.apply_farm(text, uuid) from public, anon, authenticated;

-- Which farm this page has.
create or replace function public.town_farm_map() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select s.catalog from public.town_farm_switch s where s.one), 'classic')
$$;
revoke all on function public.town_farm_map() from public;
grant execute on function public.town_farm_map() to anon, authenticated;

-- (the old farm's parts, as the code makes them, are the catalog's own today: checked, so that a switch back is exact)
do $check$
declare c jsonb := town.catalog_farm_parts(); k jsonb := (select parts from town.farm_parts where map = 'classic');
begin
  if (select catalog from public.town_farm_switch where one) = 'classic' and (select taken from town.farm_parts where map = 'classic') = 'code' then
    if c->'bedsAt' is distinct from k->'bedsAt' then raise exception 'v323: the catalog''s beds are not the old farm''s'; end if;
    if c->'wells' is distinct from k->'wells' then raise exception 'v323: the catalog''s wells are not the old farm''s'; end if;
    if c->'lampsFarm' is distinct from k->'lampsFarm' then raise warning 'v323: the catalog''s farm lamps differ from the code''s (the catalog''s are kept)'; end if;
  end if;
end $check$;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select catalog, epoch from public.town_farm_switch;                                   -- classic, 0
--   select map, taken, jsonb_array_length(parts->'bedsAt') from town.farm_parts order by map;  -- classic code 48, farm2 code 48
--   select town.at_well(${C.wells[0][0] + 1}, ${C.wells[0][1]}), town.at_well(${C.wells[0][0]}, ${C.wells[0][1]});  -- true, false (the old farm's first well)
-- And after the switch, select town.apply_farm('farm2'):
--   select catalog, epoch from public.town_farm_switch;                                   -- farm2, 1
--   select town.bed_of(${F.bedsAt[0][0]}, ${F.bedsAt[0][1]}), town.bed_of(${F.bedsAt[47][0] + 6}, ${F.bedsAt[47][1] + 6});  -- 0, 47
--   select town.at_well(${F.wells[0][0] + 2}, ${F.wells[0][1]}), town.at_well(${F.wells[0][0] + 1}, ${F.wells[0][1]});  -- true, false (the 2 x 2 well's side, its stone)
`;
writeFileSync(`${REPO}/supabase/v323_the_editors_farm.sql`, sql);
console.log(`v323: ${(sql.length / 1024).toFixed(0)} KB`);
