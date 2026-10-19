-- v284: the farm's southern half, 24 more beds (the owner, 2026-10-19, every bed held: "ช่วยเพิ่ม แปลงปลูกผักมาอีก
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
--     [128,0,60,44] → [128,0,60,86]), and insects.haunts (one good garden's haunt over each new bed, after every other, so no haunt
--     moves or changes its number);
--   * the two tables keyed by bed that held the bed to 0..23 (the conduit's and the cloud's), and the two functions that
--     held a cloud's beds to 0..23 (public.town_reward and town.reward_cloud, each its live text but for that range);
--   * town.reward_relay_place: the farm's rows run to 85;
--   * the lamps: the catalog's lamps.maps.farm.posts (the first 28 as they were) and each map's `fires` (`fire`
--     stays the first, for a page loaded before); town.lamp_by, written again, takes a flame at any of a map's fires;
--   * the wells: the catalog's farming.wells (`wellAt` stays the first); town.at_well, new; and the three functions that
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
update public.town_catalog set data = jsonb_set(data, '{bedsAt}', $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb), updated_at = now()
 where key = 'farming' and data->'bedsAt' is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{cloudCorners}', $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb), updated_at = now()
 where key = 'rewards' and data ? 'cloudCorners' and data->'cloudCorners' is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{nurseryBoxes}', (select jsonb_agg(case when m = '[128,0,60,44]'::jsonb then '[128,0,60,86]'::jsonb else m end order by o)
                                                                           from jsonb_array_elements(data->'nurseryBoxes') with ordinality x(m, o))), updated_at = now()
 where key = 'rewards' and data->'nurseryBoxes' @> '[[128,0,60,44]]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{map,farm}', '[128,0,60,86]'::jsonb), updated_at = now()
 where key = 'cooking' and data->'map'->'farm' = '[128,0,60,44]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{maps}', (select jsonb_agg(case when m = '[128,0,60,44]'::jsonb then '[128,0,60,86]'::jsonb else m end order by o)
                                                                   from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'ground' and data->'maps' @> '[[128,0,60,44]]'::jsonb;
update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select jsonb_agg(case when m = '["farm",128,0,60,44]'::jsonb then '["farm",128,0,60,86]'::jsonb else m end order by o)
                                                                          from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now()
 where key = 'insects' and data->'nectar'->'maps' @> '[["farm",128,0,60,44]]'::jsonb;
-- (the new gardens' haunts, after the 149 there are, only while there are just those)
update public.town_catalog set data = jsonb_set(data, '{haunts}', (data->'haunts') || $j$[["garden","farm",null,[[133.5,47.5],[135.5,47],[137.5,47.5],[138,49.5],[137.5,51.5],[135.5,52],[133.5,51.5],[133,49.5]]],["garden","farm",null,[[141.5,47.5],[143.5,47],[145.5,47.5],[146,49.5],[145.5,51.5],[143.5,52],[141.5,51.5],[141,49.5]]],["garden","farm",null,[[149.5,47.5],[151.5,47],[153.5,47.5],[154,49.5],[153.5,51.5],[151.5,52],[149.5,51.5],[149,49.5]]],["garden","farm",null,[[162.5,47.5],[164.5,47],[166.5,47.5],[167,49.5],[166.5,51.5],[164.5,52],[162.5,51.5],[162,49.5]]],["garden","farm",null,[[170.5,47.5],[172.5,47],[174.5,47.5],[175,49.5],[174.5,51.5],[172.5,52],[170.5,51.5],[170,49.5]]],["garden","farm",null,[[178.5,47.5],[180.5,47],[182.5,47.5],[183,49.5],[182.5,51.5],[180.5,52],[178.5,51.5],[178,49.5]]],["garden","farm",null,[[133.5,55.5],[135.5,55],[137.5,55.5],[138,57.5],[137.5,59.5],[135.5,60],[133.5,59.5],[133,57.5]]],["garden","farm",null,[[141.5,55.5],[143.5,55],[145.5,55.5],[146,57.5],[145.5,59.5],[143.5,60],[141.5,59.5],[141,57.5]]],["garden","farm",null,[[149.5,55.5],[151.5,55],[153.5,55.5],[154,57.5],[153.5,59.5],[151.5,60],[149.5,59.5],[149,57.5]]],["garden","farm",null,[[162.5,55.5],[164.5,55],[166.5,55.5],[167,57.5],[166.5,59.5],[164.5,60],[162.5,59.5],[162,57.5]]],["garden","farm",null,[[170.5,55.5],[172.5,55],[174.5,55.5],[175,57.5],[174.5,59.5],[172.5,60],[170.5,59.5],[170,57.5]]],["garden","farm",null,[[178.5,55.5],[180.5,55],[182.5,55.5],[183,57.5],[182.5,59.5],[180.5,60],[178.5,59.5],[178,57.5]]],["garden","farm",null,[[133.5,68.5],[135.5,68],[137.5,68.5],[138,70.5],[137.5,72.5],[135.5,73],[133.5,72.5],[133,70.5]]],["garden","farm",null,[[141.5,68.5],[143.5,68],[145.5,68.5],[146,70.5],[145.5,72.5],[143.5,73],[141.5,72.5],[141,70.5]]],["garden","farm",null,[[149.5,68.5],[151.5,68],[153.5,68.5],[154,70.5],[153.5,72.5],[151.5,73],[149.5,72.5],[149,70.5]]],["garden","farm",null,[[162.5,68.5],[164.5,68],[166.5,68.5],[167,70.5],[166.5,72.5],[164.5,73],[162.5,72.5],[162,70.5]]],["garden","farm",null,[[170.5,68.5],[172.5,68],[174.5,68.5],[175,70.5],[174.5,72.5],[172.5,73],[170.5,72.5],[170,70.5]]],["garden","farm",null,[[178.5,68.5],[180.5,68],[182.5,68.5],[183,70.5],[182.5,72.5],[180.5,73],[178.5,72.5],[178,70.5]]],["garden","farm",null,[[133.5,76.5],[135.5,76],[137.5,76.5],[138,78.5],[137.5,80.5],[135.5,81],[133.5,80.5],[133,78.5]]],["garden","farm",null,[[141.5,76.5],[143.5,76],[145.5,76.5],[146,78.5],[145.5,80.5],[143.5,81],[141.5,80.5],[141,78.5]]],["garden","farm",null,[[149.5,76.5],[151.5,76],[153.5,76.5],[154,78.5],[153.5,80.5],[151.5,81],[149.5,80.5],[149,78.5]]],["garden","farm",null,[[162.5,76.5],[164.5,76],[166.5,76.5],[167,78.5],[166.5,80.5],[164.5,81],[162.5,80.5],[162,78.5]]],["garden","farm",null,[[170.5,76.5],[172.5,76],[174.5,76.5],[175,78.5],[174.5,80.5],[172.5,81],[170.5,80.5],[170,78.5]]],["garden","farm",null,[[178.5,76.5],[180.5,76],[182.5,76.5],[183,78.5],[182.5,80.5],[180.5,81],[178.5,80.5],[178,78.5]]]]$j$::jsonb), updated_at = now()
 where key = 'insects' and jsonb_array_length(data->'haunts') = 149;

do $$
declare r jsonb; i jsonb; k jsonb; g jsonb;
begin
  select data into r from public.town_catalog where key = 'rewards';
  select data into i from public.town_catalog where key = 'insects';
  select data into k from public.town_catalog where key = 'cooking';
  select data into g from public.town_catalog where key = 'ground';
  if (select data->'bedsAt' from public.town_catalog where key = 'farming') is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb then raise exception 'v284: farming.bedsAt is not the 48 beds'; end if;
  if r->'cloudCorners' is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb then raise exception 'v284: rewards.cloudCorners is not the 48 beds'; end if;
  if not r->'nurseryBoxes' @> '[[128,0,60,86]]'::jsonb or r->'nurseryBoxes' @> '[[128,0,60,44]]'::jsonb then raise exception 'v284: rewards.nurseryBoxes is %', r->'nurseryBoxes'; end if;
  if k->'map'->'farm' is distinct from '[128,0,60,86]'::jsonb then raise exception 'v284: cooking.map.farm is %', k->'map'->'farm'; end if;
  if not g->'maps' @> '[[128,0,60,86]]'::jsonb or g->'maps' @> '[[128,0,60,44]]'::jsonb then raise exception 'v284: ground.maps is %', g->'maps'; end if;
  if not i->'nectar'->'maps' @> '[["farm",128,0,60,86]]'::jsonb or i->'nectar'->'maps' @> '[["farm",128,0,60,44]]'::jsonb then raise exception 'v284: insects.nectar.maps is %', i->'nectar'->'maps'; end if;
  if jsonb_array_length(i->'haunts') <> 173 or (select jsonb_agg(h order by o) from jsonb_array_elements(i->'haunts') with ordinality x(h, o) where o > 149) is distinct from $j$[["garden","farm",null,[[133.5,47.5],[135.5,47],[137.5,47.5],[138,49.5],[137.5,51.5],[135.5,52],[133.5,51.5],[133,49.5]]],["garden","farm",null,[[141.5,47.5],[143.5,47],[145.5,47.5],[146,49.5],[145.5,51.5],[143.5,52],[141.5,51.5],[141,49.5]]],["garden","farm",null,[[149.5,47.5],[151.5,47],[153.5,47.5],[154,49.5],[153.5,51.5],[151.5,52],[149.5,51.5],[149,49.5]]],["garden","farm",null,[[162.5,47.5],[164.5,47],[166.5,47.5],[167,49.5],[166.5,51.5],[164.5,52],[162.5,51.5],[162,49.5]]],["garden","farm",null,[[170.5,47.5],[172.5,47],[174.5,47.5],[175,49.5],[174.5,51.5],[172.5,52],[170.5,51.5],[170,49.5]]],["garden","farm",null,[[178.5,47.5],[180.5,47],[182.5,47.5],[183,49.5],[182.5,51.5],[180.5,52],[178.5,51.5],[178,49.5]]],["garden","farm",null,[[133.5,55.5],[135.5,55],[137.5,55.5],[138,57.5],[137.5,59.5],[135.5,60],[133.5,59.5],[133,57.5]]],["garden","farm",null,[[141.5,55.5],[143.5,55],[145.5,55.5],[146,57.5],[145.5,59.5],[143.5,60],[141.5,59.5],[141,57.5]]],["garden","farm",null,[[149.5,55.5],[151.5,55],[153.5,55.5],[154,57.5],[153.5,59.5],[151.5,60],[149.5,59.5],[149,57.5]]],["garden","farm",null,[[162.5,55.5],[164.5,55],[166.5,55.5],[167,57.5],[166.5,59.5],[164.5,60],[162.5,59.5],[162,57.5]]],["garden","farm",null,[[170.5,55.5],[172.5,55],[174.5,55.5],[175,57.5],[174.5,59.5],[172.5,60],[170.5,59.5],[170,57.5]]],["garden","farm",null,[[178.5,55.5],[180.5,55],[182.5,55.5],[183,57.5],[182.5,59.5],[180.5,60],[178.5,59.5],[178,57.5]]],["garden","farm",null,[[133.5,68.5],[135.5,68],[137.5,68.5],[138,70.5],[137.5,72.5],[135.5,73],[133.5,72.5],[133,70.5]]],["garden","farm",null,[[141.5,68.5],[143.5,68],[145.5,68.5],[146,70.5],[145.5,72.5],[143.5,73],[141.5,72.5],[141,70.5]]],["garden","farm",null,[[149.5,68.5],[151.5,68],[153.5,68.5],[154,70.5],[153.5,72.5],[151.5,73],[149.5,72.5],[149,70.5]]],["garden","farm",null,[[162.5,68.5],[164.5,68],[166.5,68.5],[167,70.5],[166.5,72.5],[164.5,73],[162.5,72.5],[162,70.5]]],["garden","farm",null,[[170.5,68.5],[172.5,68],[174.5,68.5],[175,70.5],[174.5,72.5],[172.5,73],[170.5,72.5],[170,70.5]]],["garden","farm",null,[[178.5,68.5],[180.5,68],[182.5,68.5],[183,70.5],[182.5,72.5],[180.5,73],[178.5,72.5],[178,70.5]]],["garden","farm",null,[[133.5,76.5],[135.5,76],[137.5,76.5],[138,78.5],[137.5,80.5],[135.5,81],[133.5,80.5],[133,78.5]]],["garden","farm",null,[[141.5,76.5],[143.5,76],[145.5,76.5],[146,78.5],[145.5,80.5],[143.5,81],[141.5,80.5],[141,78.5]]],["garden","farm",null,[[149.5,76.5],[151.5,76],[153.5,76.5],[154,78.5],[153.5,80.5],[151.5,81],[149.5,80.5],[149,78.5]]],["garden","farm",null,[[162.5,76.5],[164.5,76],[166.5,76.5],[167,78.5],[166.5,80.5],[164.5,81],[162.5,80.5],[162,78.5]]],["garden","farm",null,[[170.5,76.5],[172.5,76],[174.5,76.5],[175,78.5],[174.5,80.5],[172.5,81],[170.5,80.5],[170,78.5]]],["garden","farm",null,[[178.5,76.5],[180.5,76],[182.5,76.5],[183,78.5],[182.5,80.5],[180.5,81],[178.5,80.5],[178,78.5]]]]$j$::jsonb then
    raise exception 'v284: insects.haunts has % (another file wrote haunts since v267?): rebuild v284', jsonb_array_length(i->'haunts'); end if;
  if town.bed_of(132, 46) <> 24 or town.bed_of(183, 81) <> 47 or town.bed_of(132, 4) <> 0 then raise exception 'v284: town.bed_of does not see the new beds'; end if;
end $$;

-- ── 2. The tables keyed by bed: 0..47 ─────────────────────────────────────────────────────────────────────────
do $$
declare c record;
begin
  for c in select conrelid::regclass::text as t, conname from pg_constraint
            where contype = 'c' and conrelid in ('town.reward_conduits'::regclass, 'town.reward_cloud_consents'::regclass) and pg_get_constraintdef(oid) ~ '\mbed\M' loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table town.reward_conduits add constraint reward_conduits_bed_check check (bed between 0 and 47);
alter table town.reward_cloud_consents add constraint reward_cloud_consents_bed_check check (bed between 0 and 47);

-- ── 3. The cloud's beds: 0..47 (each function its live text but for the one range) ────────────────────────────────
do $$
declare sig text; d text; n integer;
begin
  foreach sig in array array['public.town_reward(uuid,jsonb)', 'town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint)'] loop
    d := pg_get_functiondef(sig::regprocedure);
    n := (length(d) - length(replace(d, 'not between 0 and 23', ''))) / length('not between 0 and 23');
    if n = 1 then execute replace(d, 'not between 0 and 23', 'not between 0 and 47');
    elsif not (n = 0 and position('not between 0 and 47' in d) > 0) then raise exception 'v284: % holds the beds to 0..23 % times, not once: rebuild v284', sig, n; end if;
  end loop;
end $$;

-- ── 4. Where a relay may stand: the farm's rows run to 85 (v222's but for that) ──────────────────────────────────────
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 63 then 'town'
 when (at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 85 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;

-- ── 5. The lamps: the southern half's posts after the first 28, and a flame taken at either brazier ───────────────────────
update public.town_catalog set data = jsonb_set(data, '{maps,farm,posts}', $j$[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32],[156,70],[159,62],[149,62],[159,55],[168,65],[159,78],[140,65],[148,53],[147,81],[156,47],[139,75],[170,53],[171,82],[176,72],[139,49],[177,62],[131,62],[130,72],[132,82],[184,62],[181,53],[130,49],[185,73],[182,82]]$j$::jsonb), updated_at = now()
 where key = 'lamps' and data->'maps'->'farm'->'posts' is distinct from $j$[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32],[156,70],[159,62],[149,62],[159,55],[168,65],[159,78],[140,65],[148,53],[147,81],[156,47],[139,75],[170,53],[171,82],[176,72],[139,49],[177,62],[131,62],[130,72],[132,82],[184,62],[181,53],[130,49],[185,73],[182,82]]$j$::jsonb
   and (select jsonb_agg(p order by o) from jsonb_array_elements(data->'maps'->'farm'->'posts') with ordinality x(p, o) where o <= 28) = $j$[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32]]$j$::jsonb;
update public.town_catalog set data = jsonb_set(jsonb_set(data, '{maps,farm,fires}', $j$[[155,24],[155,66]]$j$::jsonb), '{maps,forest,fires}', $j$[[193,159]]$j$::jsonb), updated_at = now()
 where key = 'lamps' and (data->'maps'->'farm'->'fires' is distinct from $j$[[155,24],[155,66]]$j$::jsonb or data->'maps'->'forest'->'fires' is distinct from $j$[[193,159]]$j$::jsonb);
do $$ begin
  if (select data->'maps'->'farm'->'posts' from public.town_catalog where key = 'lamps') is distinct from $j$[[146,23],[136,20],[131,23],[166,23],[172,20],[178,23],[184,20],[159,20],[156,10],[159,3],[156,31],[159,39],[131,3],[144,2],[173,3],[183,3],[185,11],[185,32],[185,40],[173,41],[144,41],[131,39],[130,32],[130,12],[143,11],[172,11],[143,32],[172,32],[156,70],[159,62],[149,62],[159,55],[168,65],[159,78],[140,65],[148,53],[147,81],[156,47],[139,75],[170,53],[171,82],[176,72],[139,49],[177,62],[131,62],[130,72],[132,82],[184,62],[181,53],[130,49],[185,73],[182,82]]$j$::jsonb then raise exception 'v284: the farm''s lamp posts are not the 52 (its first 28 moved?): rebuild v284'; end if;
  if (select data->'maps'->'farm'->'fire' from public.town_catalog where key = 'lamps') is distinct from $j$[155,24]$j$::jsonb then raise exception 'v284: the farm''s first fire moved'; end if;
end $$;

-- A map's fire, or one of its posts, within reach of a tile (v163's, but a fire is any of the map's `fires`, or its
-- `fire` where it has no list)
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
update public.town_catalog set data = jsonb_set(data, '{wells}', $j$[[156,23],[156,65]]$j$::jsonb), updated_at = now()
 where key = 'farming' and data->'wells' is distinct from $j$[[156,23],[156,65]]$j$::jsonb;
-- Whether a tile is beside one of the farm's wells (lib/town/world's atWell): `wells`, or `wellAt` where there is no list.
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
  foreach c slice 1 in array array[['public.town_chore(integer,integer)', 'greatest(abs(p_x - (f->''wellAt''->>0)::int), abs(p_y - (f->''wellAt''->>1)::int)) = 1', 'town.at_well(p_x, p_y)'],
                                  ['public.town_moon_pour(integer,integer,integer)', 'greatest(abs(p_x - (f->''wellAt''->>0)::int), abs(p_y - (f->''wellAt''->>1)::int)) <> 1', 'not town.at_well(p_x, p_y)'],
                                  ['town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)', 'greatest(abs(p_x-(well_->>0)::integer),abs(p_y-(well_->>1)::integer))<>1', 'not town.at_well(p_x,p_y)']] loop
    d := pg_get_functiondef(c[1]::regprocedure);
    n := (length(d) - length(replace(d, c[2], ''))) / length(c[2]);
    if n = 1 then execute replace(d, c[2], c[3]);
    elsif not (n = 0 and position(c[3] in d) > 0) then raise exception 'v284: % holds somebody to the one well % times, not once: rebuild v284', c[1], n; end if;
  end loop;
  if not town.at_well(157, 65) or not town.at_well(155, 24) or town.at_well(156, 65) then raise exception 'v284: town.at_well does not see both wells'; end if;
end $$;
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select jsonb_array_length(data->'bedsAt') from public.town_catalog where key = 'farming';                  -- 48
--   select town.bed_of(177, 75);                                                                   -- 47
--   select jsonb_array_length(data->'haunts') from public.town_catalog where key = 'insects';                  -- 173
--   select jsonb_array_length(data->'maps'->'farm'->'posts') from public.town_catalog where key = 'lamps';     -- 52
--   select town.at_well(157, 65);                                                                       -- true
