// Writes supabase/v295_the_editors_town.sql: the switch between the town of 2026-10-02 and the editor's town (lib/town/
// town-map, lib/town/town2), with each town's parts of the catalog made by the code (town2-parts.mjs, one process a town).
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v295.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = process.env.FC_REPO ?? process.cwd();
const parts = (map) => execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/town2-parts.mjs"],
  { cwd: REPO, env: { ...process.env, FC_REPO: REPO, TOWN_MAP: map }, encoding: "utf8", maxBuffer: 1 << 26 });
const town2 = parts("town2"), classic = parts("classic");
for (const p of [town2, classic]) if (p.includes("$parts$")) throw new Error("a part holds the quoting tag");

const sql = `-- v295 — the editor's town, and a switch between it and the town of 2026-10-02
--
-- Run once in the Supabase SQL editor, AFTER the site's deploy that has the editor's town in it (a page built before
-- knows only the old town). Running it again is safe and changes nothing more. Needs v294.
--
-- The owner, 2026-10-22: "oatto2-cash80x80v2 … เอามาใช้ replace เมืองหลัก", "เปลี่ยนทั้งเมือง เปลี่ยนตำแหน่ง NPC แมลงในเมือง
-- ทั้งหมดเลย", and "ยังมี backup เมืองเดิมพร้อมสลับใช้เมื่อฉุกเฉินเสมอ". Both towns are in the site's code; this file keeps
-- which one is the town (public.town_map_switch) and, for each, its parts of the catalog that the database checks a
-- member against (town.map_parts): where one may fish, the insects' haunts in town, the cooking stations, the feast
-- table, the washing jar, the storage box, the forge, the town's size to the nectar, the ground and the nursery.
--
-- What it does when it runs: nothing changes for members. The switch is set to 'town2-admins': the admins' pages
-- show the editor's town (to walk about and look; the catalog is still the old town's, so fishing, insects and cooking
-- there may be refused until it is opened to everybody), everybody else's the old town.
--
-- To open the editor's town to everybody (the catalog's town parts become its own, members' pots and water relays on
-- a tile it closes are moved to the nearest open tile, every page that asks after it loads the new town):
--     select town.apply_map('town2');            (or, as an admin in the town's chat: /townmap town2)
-- To go back to the old town at once, in an emergency (the same, the other way, to exactly what the catalog held):
--     select town.apply_map('classic');          (or: /townmap classic)
-- To show the editor's town to the admins only again:
--     select town.apply_map('town2-admins');     (or: /townmap admins)
-- Which it is now:  select * from public.town_map_switch;

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('public.town_set_chat_reach(text)') is null then raise exception 'Run v294 before v295'; end if;
end $$;

-- ── 1. Which town it is, and what of the catalog is each town's ──────────────────────────────────────────────────────
create table if not exists public.town_map_switch (
  one boolean primary key default true check (one),
  -- who sees which: 'classic' everybody the old town; 'town2-admins' the admins the editor's; 'town2' everybody the editor's
  map text not null default 'classic' check (map in ('classic', 'town2-admins', 'town2')),
  -- whose parts the catalog holds now
  catalog text not null default 'classic' check (catalog in ('classic', 'town2')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.town_map_switch enable row level security;
-- No policies: read through town_map() and written through town.apply_map / town_set_map.
revoke all on public.town_map_switch from public, anon, authenticated;
insert into public.town_map_switch (one, map, catalog) values (true, 'classic', 'classic') on conflict (one) do nothing;

create table if not exists town.map_parts (
  map text primary key check (map in ('classic', 'town2')),
  parts jsonb not null,
  -- 'code': as the site's code made them (this file); 'live': as the catalog held them when the town was switched away from
  taken text not null default 'code' check (taken in ('code', 'live')),
  taken_at timestamptz not null default now()
);
revoke all on town.map_parts from public, anon, authenticated;
-- the editor's town's, as the code makes them (written again by a later file the same way)
insert into town.map_parts (map, parts, taken) values ('town2', $parts$${town2}$parts$::jsonb, 'code')
  on conflict (map) do update set parts = excluded.parts, taken = 'code', taken_at = now();
-- the old town's, as the code makes them: only until the catalog's own are kept, the first time the town is switched
-- away from it (then never written over from here)
insert into town.map_parts (map, parts, taken) values ('classic', $parts$${classic}$parts$::jsonb, 'code')
  on conflict (map) do nothing;

-- ── 2. The town's parts of the catalog, as it holds them now ─────────────────────────────────────────────────────────
-- (a tile's key "x,y" of the town's part of the tile space: x below 128, y from 0 below 112)
create or replace function town.town_key(k text) returns boolean language sql immutable set search_path = '' as $$
  select split_part(k, ',', 1)::integer < 128 and split_part(k, ',', 2)::integer between 0 and 111
$$;
create or replace function town.catalog_town_parts() returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'stations', (select c.data->'stations' from public.town_catalog c where c.key = 'preparation'),
    'places', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from public.town_catalog c, jsonb_each(c.data->'places') e
               where c.key = 'fishing' and town.town_key(e.key)),
    'cookingTown', (select c.data->'map'->'town' from public.town_catalog c where c.key = 'cooking'),
    'feastTile', (select c.data->'feast'->'tile' from public.town_catalog c where c.key = 'cooking'),
    'feastFloor', (select c.data->'feast'->'floor' from public.town_catalog c where c.key = 'cooking'),
    'haunts', (select coalesce(jsonb_object_agg((h.o - 1)::text, h.v), '{}'::jsonb) from public.town_catalog c,
               jsonb_array_elements(c.data->'haunts') with ordinality h(v, o) where c.key = 'insects' and h.v->>1 = 'town'),
    'nectarTown', (select m from public.town_catalog c, jsonb_array_elements(c.data->'nectar'->'maps') m where c.key = 'insects' and m->>0 = 'town' limit 1),
    'yardAt', (select c.data->'at' from public.town_catalog c where c.key = 'yard'),
    'boxAt', (select c.data->'at' from public.town_catalog c where c.key = 'box'),
    'groundTown', (select m from public.town_catalog c, jsonb_array_elements(c.data->'maps') m where c.key = 'ground' and m->>0 = '0' and m->>1 = '0' limit 1),
    'forgeAt', (select c.data->'stand'->'at' from public.town_catalog c where c.key = 'forge'),
    'nurseryTown', (select m from public.town_catalog c, jsonb_array_elements(c.data->'nurseryBoxes') m where c.key = 'rewards' and m->>0 = '0' and m->>1 = '0' limit 1)
  )
$$;

-- ── 3. Laying a town's parts over the catalog ────────────────────────────────────────────────────────────────────────
-- (an entry of a list put in place of the one that matches, the rest as they were, in their order)
create or replace function town.swap_in(list jsonb, keep jsonb, by text) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(case
    when by = 'town' and m->>0 = 'town' then keep
    when by = 'corner' and m->>0 = '0' and m->>1 = '0' then keep
    else m end order by o), '[]'::jsonb)
  from jsonb_array_elements(list) with ordinality x(m, o)
$$;
create or replace function town.lay_parts(p jsonb) returns void language plpgsql set search_path = '' as $$
declare h record;
begin
  update public.town_catalog set data = jsonb_set(data, '{stations}', p->'stations'), updated_at = now() where key = 'preparation';
  update public.town_catalog c set data = jsonb_set(c.data, '{places}',
      (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(c.data->'places') e where not town.town_key(e.key)) || (p->'places')),
    updated_at = now() where c.key = 'fishing';
  update public.town_catalog set data = jsonb_set(jsonb_set(jsonb_set(data, '{map,town}', p->'cookingTown'), '{feast,tile}', p->'feastTile'), '{feast,floor}', p->'feastFloor'),
    updated_at = now() where key = 'cooking';
  for h in select key::integer i, value v from jsonb_each(p->'haunts') loop
    update public.town_catalog set data = jsonb_set(data, array['haunts', h.i::text], h.v) where key = 'insects';
  end loop;
  update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', town.swap_in(data->'nectar'->'maps', p->'nectarTown', 'town')), updated_at = now() where key = 'insects';
  update public.town_catalog set data = jsonb_set(data, '{at}', p->'yardAt'), updated_at = now() where key = 'yard';
  update public.town_catalog set data = jsonb_set(data, '{at}', p->'boxAt'), updated_at = now() where key = 'box';
  update public.town_catalog set data = jsonb_set(data, '{maps}', town.swap_in(data->'maps', p->'groundTown', 'corner')), updated_at = now() where key = 'ground';
  update public.town_catalog set data = jsonb_set(data, '{stand,at}', p->'forgeAt'), updated_at = now() where key = 'forge';
  update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', town.swap_in(data->'nurseryBoxes', p->'nurseryTown', 'corner')), updated_at = now()
    where key = 'rewards' and jsonb_typeof(data->'nurseryBoxes') = 'array';
end $$;

-- ── 4. Members' things on a tile the town closes ─────────────────────────────────────────────────────────────────────
-- A pot set down, and a water relay or a nursery waiting at a tile, go to the nearest tile one may stand on that is free
-- (the town's own list of six, nearest first); the pots on the feast table go to its table. Nothing is taken away.
create or replace function town.move_things(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare r record; c jsonb; pots integer := 0; kept integer := 0; held integer := 0;
begin
  update public.town_pots set x = (p->'feastTile'->>0)::integer, y = (p->'feastTile'->>1)::integer
   where feast and (x, y) is distinct from ((p->'feastTile'->>0)::integer, (p->'feastTile'->>1)::integer);
  for r in select o.id, o.x, o.y from public.town_pots o where not o.feast and p->'moves' ? (o.x || ',' || o.y) order by o.id loop
    for c in select value from jsonb_array_elements(p->'moves'->(r.x || ',' || r.y)) loop
      if not exists (select 1 from public.town_pots o where not o.feast and o.x = (c->>0)::integer and o.y = (c->>1)::integer) then
        update public.town_pots set x = (c->>0)::integer, y = (c->>1)::integer where id = r.id;
        pots := pots + 1;
        exit;
      end if;
    end loop;
  end loop;
  for r in select pp.member_id, k from public.town_purses pp, unnest(array['relay', 'nursery']) k
            where p->'moves' ? ((pp.doc->'professionRewards'->k->'at'->>0) || ',' || (pp.doc->'professionRewards'->k->'at'->>1)) loop
    update public.town_purses pp set doc = jsonb_set(pp.doc, array['professionRewards', r.k, 'at'],
        p->'moves'->((pp.doc->'professionRewards'->r.k->'at'->>0) || ',' || (pp.doc->'professionRewards'->r.k->'at'->>1))->0)
      where pp.member_id = r.member_id;
    if r.k = 'relay' then kept := kept + 1; else held := held + 1; end if;
  end loop;
  return jsonb_build_object('pots', pots, 'relays', kept, 'nurseries', held);
end $$;

-- ── 5. The switch ────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function town.apply_map(p_map text, p_by uuid default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.town_map_switch; want text; moved jsonb := '{}'::jsonb;
begin
  if p_map is null or p_map not in ('classic', 'town2-admins', 'town2') then return jsonb_build_object('ok', false, 'why', 'map'); end if;
  select * into s from public.town_map_switch where one for update;
  want := case when p_map = 'town2' then 'town2' else 'classic' end;
  if s.catalog <> want then
    -- what the catalog holds now is kept as that town's (so that going back puts back exactly what was)
    update town.map_parts mp set parts = mp.parts || town.catalog_town_parts(), taken = 'live', taken_at = now() where mp.map = s.catalog;
    perform town.lay_parts((select mp.parts from town.map_parts mp where mp.map = want));
    moved := town.move_things((select mp.parts from town.map_parts mp where mp.map = want));
  end if;
  update public.town_map_switch set map = p_map, catalog = want, changed_by = p_by, changed_at = now() where one;
  return jsonb_build_object('ok', true, 'map', p_map, 'catalog', want, 'moved', moved);
end $$;
revoke all on function town.apply_map(text, uuid) from public, anon, authenticated;

-- Which town this page has: the editor's, the old one, or the editor's for an admin only.
create or replace function public.town_map() returns text language sql stable security definer set search_path = '' as $$
  select case s.map
    when 'town2' then 'town2'
    when 'town2-admins' then case when exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then 'town2' else 'classic' end
    else 'classic' end
  from public.town_map_switch s where s.one
$$;
revoke all on function public.town_map() from public;
grant execute on function public.town_map() to anon, authenticated;

-- An admin's switch, from the town's chat: 'classic', 'admins' or 'town2'.
create or replace function public.town_set_map(p_map text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.profiles p where p.id = me and p.is_admin) then
    return jsonb_build_object('ok', false, 'why', 'forbidden');
  end if;
  return town.apply_map(case lower(coalesce(p_map, '')) when 'admins' then 'town2-admins' else lower(p_map) end, me);
end $$;
revoke all on function public.town_set_map(text) from public, anon;
grant execute on function public.town_set_map(text) to authenticated;

-- ── 6. A relay may stand anywhere in either town (the editor's is 80 tiles wide) ─────────────────────────────────────
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 79 and (at_->>1)::integer between 0 and 79 then 'town'
 when (at_->>0)::integer between 128 and 239 and (at_->>1)::integer between 0 and 85 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;

-- ── 7. The admins see the editor's town; everybody else, as before ───────────────────────────────────────────────────
select town.apply_map('town2-admins') where (select map from public.town_map_switch where one) = 'classic';

notify pgrst, 'reload schema';
commit;
`;
writeFileSync(`${REPO}/supabase/v295_the_editors_town.sql`, sql);
console.log(`v295: ${(sql.length / 1024).toFixed(0)} KB`);
