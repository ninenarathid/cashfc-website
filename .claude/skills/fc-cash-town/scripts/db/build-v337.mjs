// Writes supabase/v337_the_city.sql: the city (lib/town/city, the owner's cashcity export, 2026-11-23) as a third main town
// behind v295's switch, with its parts of the catalog made by the code (city-parts.mjs, one process a town).
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/build-v337.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
const parts = (map) => execFileSync(process.execPath, [".claude/skills/fc-cash-town/scripts/db/city-parts.mjs"],
  { cwd: REPO, env: { ...process.env, FC_REPO: REPO, TOWN_MAP: map, FARM_MAP: "farm2" }, encoding: "utf8", maxBuffer: 1 << 28 });
const city = parts("city"), town2 = JSON.parse(parts("town2")), classic = JSON.parse(parts("classic"));
if (city.includes("$parts$")) throw new Error("a part holds the quoting tag");
const extra = (p) => JSON.stringify({ boxMore: p.boxMore, boardSpots: p.boardSpots, open: p.open });

// the town's box as v152 to v336 checked it (public.town_pot_down: a pot set down in the town), and as it is checked from now on
export const OLD_BOX = `(p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)`;
export const NEW_BOX = `(p_x >= coalesce((map->'town'->>2)::int, 0) and p_y >= coalesce((map->'town'->>3)::int, 0) and p_x < coalesce((map->'town'->>2)::int, 0) + (map->'town'->>0)::int and p_y < coalesce((map->'town'->>3)::int, 0) + (map->'town'->>1)::int)`;
const q = (s) => s.replaceAll("'", "''");

const sql = `-- v337 — the city: a third main town behind the town switch (the owner's "cashcity", 2026-11-23)
--
-- Run once in the Supabase SQL editor, AFTER the site's deploy that has the city in it (a page built before knows no
-- city: it stays on town2 whatever the switch says). Running it again is safe and changes nothing more. Needs v295 and
-- v323.
--
-- The owner, 2026-11-23: "ช่วยเพิ่มแมพใหม่เป็นเมืองโดยมีรายละเอียดตามไฟล์ cashcity ใน Download คิดว่าน่าจะ replace แมพเดิม", and
-- of the plan, "ตามที่แนะนำทั้งหมด เริ่มทำได้เลย": the admins walk the city first, then everybody; town2 (the town since
-- 2026-10-22) stays the way back. The city is 140 × 135 tiles with its corner at x -16 (so that it ends at x 123, short
-- of the farm at 128): what the database keeps of the town's box learns a corner.
--
-- What it does when it runs: nothing changes for members. The switch says 'city-admins': the admins' pages show the
-- city (to walk about and look; the catalog is still town2's, so fishing, insects, cooking and the box there may be
-- refused until it is opened to everybody), everybody else's town2.
--
-- To open the city to everybody (the catalog's town parts become its own, members' pots and water relays on a tile it
-- closes are moved to the nearest open tile, every page that asks after it loads the city):
--     select town.apply_map('city');             (or, as an admin in the town's chat: /townmap city)
-- To go back to town2 at once, in an emergency (the same, the other way, to exactly what the catalog held):
--     select town.apply_map('town2');            (or: /townmap town2)
-- To show the city to the admins only again:
--     select town.apply_map('city-admins');      (or: /townmap admins)
-- Which it is now:  select * from public.town_map_switch;

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.apply_map(text,uuid)') is null then raise exception 'Run v295 before v337'; end if;
  if to_regprocedure('town.reward_relay_place(jsonb)') is null then raise exception 'Run v295 before v337'; end if;
end $$;

-- ── 1. The city among the towns ────────────────────────────────────────────────────────────────────────────────────
alter table public.town_map_switch drop constraint if exists town_map_switch_map_check;
alter table public.town_map_switch add constraint town_map_switch_map_check check (map in ('classic', 'town2-admins', 'town2', 'city-admins', 'city'));
alter table public.town_map_switch drop constraint if exists town_map_switch_catalog_check;
alter table public.town_map_switch add constraint town_map_switch_catalog_check check (catalog in ('classic', 'town2', 'city'));
alter table town.map_parts drop constraint if exists map_parts_map_check;
alter table town.map_parts add constraint map_parts_map_check check (map in ('classic', 'town2', 'city'));

-- ── 2. The town's part of the tile space: any town's (the city's reaches x -16 and row 134) ─────────────────────────
create or replace function town.town_key(k text) returns boolean language sql immutable set search_path = '' as $$
  select split_part(k, ',', 1)::integer between -20 and 127 and split_part(k, ',', 2)::integer between 0 and 140
$$;
-- (an entry of a list put in place of the one that matches, the rest as they were, in their order: 'townbox' is the
-- town's box among the maps' boxes, the one on row 0 west of the farm, wherever its corner is)
create or replace function town.swap_in(list jsonb, keep jsonb, by text) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(case
    when keep is null then m
    when by = 'town' and m->>0 = 'town' then keep
    when by = 'corner' and m->>0 = '0' and m->>1 = '0' then keep
    when by = 'townbox' and jsonb_typeof(m) = 'array' and (m->>1)::numeric = 0 and (m->>0)::numeric < 128 then keep
    else m end order by o), '[]'::jsonb)
  from jsonb_array_elements(list) with ordinality x(m, o)
$$;

-- ── 3. The town's parts of the catalog, as it holds them now (v295's, and two more: the town's chests among the box's,
-- and the insects' boards' spots in town) ───────────────────────────────────────────────────────────────────────────
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
    'boxMore', (select coalesce(jsonb_agg(m order by o), '[]'::jsonb) from public.town_catalog c, jsonb_array_elements(coalesce(c.data->'more', '[]'::jsonb)) with ordinality x(m, o)
                where c.key = 'box' and town.town_key((m->>0) || ',' || (m->>1))),
    'groundTown', (select m from public.town_catalog c, jsonb_array_elements(c.data->'maps') m where c.key = 'ground' and (m->>1)::numeric = 0 and (m->>0)::numeric < 128 limit 1),
    'forgeAt', (select c.data->'stand'->'at' from public.town_catalog c where c.key = 'forge'),
    'nurseryTown', (select m from public.town_catalog c, jsonb_array_elements(c.data->'nurseryBoxes') m
                    where c.key = 'rewards' and jsonb_typeof(c.data->'nurseryBoxes') = 'array' and (m->>1)::numeric = 0 and (m->>0)::numeric < 128 limit 1),
    'boardSpots', (select coalesce(jsonb_agg(s order by o), '[]'::jsonb) from public.town_catalog c, jsonb_array_elements(coalesce(c.data->'spots', '[]'::jsonb)) with ordinality x(s, o)
                   where c.key = 'boards' and s->>'place' = 'town')
  )
$$;

-- ── 4. Laying a town's parts over the catalog (v295's, the town's boxes found wherever their corner is, and the two new
-- parts when the town's parts have them) ────────────────────────────────────────────────────────────────────────────
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
  if p ? 'boxMore' then
    update public.town_catalog c set data = jsonb_set(c.data, '{more}',
        (select coalesce(jsonb_agg(m order by o), '[]'::jsonb) from jsonb_array_elements(coalesce(c.data->'more', '[]'::jsonb)) with ordinality x(m, o)
          where not town.town_key((m->>0) || ',' || (m->>1))) || (p->'boxMore')),
      updated_at = now() where c.key = 'box';
  end if;
  update public.town_catalog set data = jsonb_set(data, '{maps}', town.swap_in(data->'maps', p->'groundTown', 'townbox')), updated_at = now() where key = 'ground';
  update public.town_catalog set data = jsonb_set(data, '{stand,at}', p->'forgeAt'), updated_at = now() where key = 'forge';
  update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', town.swap_in(data->'nurseryBoxes', p->'nurseryTown', 'townbox')), updated_at = now()
    where key = 'rewards' and jsonb_typeof(data->'nurseryBoxes') = 'array';
  if p ? 'boardSpots' then
    update public.town_catalog c set data = jsonb_set(c.data, '{spots}',
        (select coalesce(jsonb_agg(coalesce((select n from jsonb_array_elements(p->'boardSpots') n where n->>'id' = s->>'id'), s) order by o), '[]'::jsonb)
           from jsonb_array_elements(c.data->'spots') with ordinality x(s, o))),
      updated_at = now() where c.key = 'boards' and jsonb_typeof(c.data->'spots') = 'array';
  end if;
end $$;

-- ── 4b. Members' things on a tile the town closes (v295's, and a member's stall or sign, v142: the city's buildings stand
-- where town2's ground was; and anything on a tile of the city's that is no tile of town2's, going back): to the nearest
-- free tile one may stand on, from the town's list of them ──────────────────────────────────────────────────────────────────────────────────────────
-- (the nearest tiles one may stand on in a town, nearest first, then by row: from its list of them, v337's parts, or, for
-- a town's parts kept from before, its list of moves from the tile)
create or replace function town.near_open(p jsonb, p_x integer, p_y integer) returns setof jsonb language sql stable set search_path = '' as $$
  select t from (
    select jsonb_build_array(split_part(k, ',', 1)::integer, split_part(k, ',', 2)::integer) t,
           (split_part(k, ',', 1)::integer - p_x) ^ 2 + (split_part(k, ',', 2)::integer - p_y) ^ 2 d, split_part(k, ',', 2)::integer ry, split_part(k, ',', 1)::integer rx
      from jsonb_array_elements_text(coalesce(p->'open', '[]'::jsonb)) k
     where p ? 'open'
     order by 2, 3, 4 limit 6) n
  union all
  select value from jsonb_array_elements(coalesce(p->'moves'->(p_x || ',' || p_y), '[]'::jsonb)) where not (p ? 'open')
$$;
-- (whether a tile of the town's part of the tile space is one a town's things must leave)
create or replace function town.must_move(p jsonb, p_x integer, p_y integer) returns boolean language sql immutable set search_path = '' as $$
  select p_x is not null and p_y is not null and town.town_key(p_x || ',' || p_y)
     and case when p ? 'open' then not ((p->'open') ? (p_x || ',' || p_y)) else coalesce(p->'moves' ? (p_x || ',' || p_y), false) end
$$;
create or replace function town.move_things(p jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare r record; c jsonb; pots integer := 0; kept integer := 0; held integer := 0; shops integer := 0;
begin
  update public.town_pots set x = (p->'feastTile'->>0)::integer, y = (p->'feastTile'->>1)::integer
   where feast and (x, y) is distinct from ((p->'feastTile'->>0)::integer, (p->'feastTile'->>1)::integer);
  for r in select o.id, o.x, o.y from public.town_pots o where not o.feast and town.must_move(p, o.x, o.y) order by o.id loop
    for c in select * from town.near_open(p, r.x, r.y) loop
      if not exists (select 1 from public.town_pots o where not o.feast and o.x = (c->>0)::integer and o.y = (c->>1)::integer) then
        update public.town_pots set x = (c->>0)::integer, y = (c->>1)::integer where id = r.id;
        pots := pots + 1;
        exit;
      end if;
    end loop;
  end loop;
  for r in select pp.member_id, k, (pp.doc->'professionRewards'->k->'at'->>0)::integer ax, (pp.doc->'professionRewards'->k->'at'->>1)::integer ay
             from public.town_purses pp, unnest(array['relay', 'nursery']) k
            where jsonb_typeof(pp.doc->'professionRewards'->k->'at') = 'array'
              and town.must_move(p, (pp.doc->'professionRewards'->k->'at'->>0)::integer, (pp.doc->'professionRewards'->k->'at'->>1)::integer) loop
    c := (select n from town.near_open(p, r.ax, r.ay) n limit 1);
    if c is null then continue; end if;
    update public.town_purses pp set doc = jsonb_set(pp.doc, array['professionRewards', r.k, 'at'], c) where pp.member_id = r.member_id;
    if r.k = 'relay' then kept := kept + 1; else held := held + 1; end if;
  end loop;
  if to_regclass('public.town_shops') is not null then
    for r in select o.member_id, o.x, o.y from public.town_shops o where town.must_move(p, o.x, o.y) order by o.member_id loop
      for c in select * from town.near_open(p, r.x, r.y) loop
        if not exists (select 1 from public.town_shops o where o.x = (c->>0)::integer and o.y = (c->>1)::integer) then
          update public.town_shops set x = (c->>0)::integer, y = (c->>1)::integer where member_id = r.member_id;
          shops := shops + 1;
          exit;
        end if;
      end loop;
    end loop;
  end if;
  return jsonb_build_object('pots', pots, 'relays', kept, 'nurseries', held, 'shops', shops);
end $$;

-- ── 5. The switch: the city, for the admins first ──────────────────────────────────────────────────────────────────
-- ('city-admins': the admins see the city, everybody else town2, whose parts the catalog keeps; 'town2-admins' as v295)
create or replace function town.apply_map(p_map text, p_by uuid default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.town_map_switch; want text; moved jsonb := '{}'::jsonb;
begin
  if p_map is null or p_map not in ('classic', 'town2-admins', 'town2', 'city-admins', 'city') then return jsonb_build_object('ok', false, 'why', 'map'); end if;
  select * into s from public.town_map_switch where one for update;
  want := case p_map when 'city' then 'city' when 'town2' then 'town2' when 'city-admins' then 'town2' else 'classic' end;
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
-- Which town this page has.
create or replace function public.town_map() returns text language sql stable security definer set search_path = '' as $$
  select case s.map
    when 'city' then 'city'
    when 'city-admins' then case when exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then 'city' else 'town2' end
    when 'town2' then 'town2'
    when 'town2-admins' then case when exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then 'town2' else 'classic' end
    else 'classic' end
  from public.town_map_switch s where s.one
$$;
revoke all on function public.town_map() from public;
grant execute on function public.town_map() to anon, authenticated;
-- An admin's switch, from the town's chat: 'city', 'admins' (the city for the admins only), 'town2' or 'classic'.
create or replace function public.town_set_map(p_map text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.profiles p where p.id = me and p.is_admin) then
    return jsonb_build_object('ok', false, 'why', 'forbidden');
  end if;
  return town.apply_map(case lower(coalesce(p_map, '')) when 'admins' then 'city-admins' else lower(p_map) end, me);
end $$;
revoke all on function public.town_set_map(text) from public, anon;
grant execute on function public.town_set_map(text) to authenticated;

-- ── 6. A relay may stand anywhere in any town (the city from x -16 to 123, rows 0 to 134); the farm and forest as v323 ─
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between -16 and 123 and (at_->>1)::integer between 0 and 134 then 'town'
 when (at_->>0)::integer between 128 and 277 and (at_->>1)::integer between 0 and 109 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;

-- ── 7. The town's box with its corner: wherever a function checks a tile is in the town by cooking.map.town (a pot set
-- down), the box from its corner ([w, h, x, y]; [w, h] is from 0, 0, as before) ───────────────────────────────────────
do $$
declare f record; n integer := 0;
  old_box text := '${q(OLD_BOX)}';
  new_box text := '${q(NEW_BOX)}';
begin
  for f in select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname in ('public', 'town') and p.prokind = 'f' and position(old_box in pg_get_functiondef(p.oid)) > 0 loop
    execute replace(pg_get_functiondef(f.oid), old_box, new_box);
    n := n + 1;
  end loop;
  if n = 0 and not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                            where s.nspname in ('public', 'town') and p.prokind = 'f' and position(new_box in pg_get_functiondef(p.oid)) > 0) then
    raise exception 'v337: no function checks the town''s box as v152 wrote it';
  end if;
end $$;

-- ── 8. The city's parts, as the code makes them; the three new parts of town2's and the old town's where they lack them ─
insert into town.map_parts (map, parts, taken) values ('city', $parts$${city}$parts$::jsonb, 'code')
  on conflict (map) do update set parts = excluded.parts, taken = 'code', taken_at = now()
  where town.map_parts.taken = 'code';
update town.map_parts set parts = '${extra(town2)}'::jsonb || parts where map = 'town2' and not (parts ? 'open');
update town.map_parts set parts = '${extra(classic)}'::jsonb || parts where map = 'classic' and not (parts ? 'open');

-- ── 9. The admins see the city; everybody else, town2, as before ──────────────────────────────────────────────────
select town.apply_map('city-admins') where (select map from public.town_map_switch where one) = 'town2';
notify pgrst, 'reload schema';
commit;
`;
writeFileSync(`${REPO}/supabase/v337_the_city.sql`, sql);
console.log(`v337: ${(sql.length / 1024).toFixed(0)} KB`);
