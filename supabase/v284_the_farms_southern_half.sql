-- v284: the farm's southern half, 24 more beds (the owner, 2026-10-19, every bed held: "ช่วยเพิ่ม แปลงปลูกผักมาอีก
-- เท่านึง ในฟาร์ม"; "1 คน เป็นเจ้าของมากสุดได้แค่ 2 แปลง", which beds.each already holds the database to, unchanged).
--
-- Run after v281, and after v283 if v283 is to run: v283 writes the farming row whole with the first 24 beds, and run
-- after this one it would take the new beds out again. Safe to run twice. Either order with the page is safe: before
-- the page is live nobody can stand in the southern half; after it, a bed there is refused ('soil') until this has run.
--
-- What it changes (the database's own copies of the farm's shape, lib/town/world):
--   * the catalog: farming.bedsAt (beds 24 to 47 after the first 24, none of whose numbers moves), rewards.cloudCorners
--     (the cloud jar's beds, the same corners), cooking.map.farm, insects.nectar.maps and ground.maps (the farm's tiles,
--     [128,0,60,44] → [128,0,60,86]), and insects.haunts (one good garden's haunt over each new bed, after every other, so no haunt
--     moves or changes its number);
--   * the two tables keyed by bed that held the bed to 0..23 (the conduit's and the cloud's), and the two functions that
--     held a cloud's beds to 0..23 (public.town_reward and town.reward_cloud, each its live text but for that range);
--   * town.reward_relay_place: the farm's rows run to 85.
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
update public.town_catalog set data = jsonb_set(data, '{bedsAt}', $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb), updated_at = now()
 where key = 'farming' and data->'bedsAt' is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{cloudCorners}', $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb), updated_at = now()
 where key = 'rewards' and data ? 'cloudCorners' and data->'cloudCorners' is distinct from $j$[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33],[132,46],[140,46],[148,46],[161,46],[169,46],[177,46],[132,54],[140,54],[148,54],[161,54],[169,54],[177,54],[132,67],[140,67],[148,67],[161,67],[169,67],[177,67],[132,75],[140,75],[148,75],[161,75],[169,75],[177,75]]$j$::jsonb;
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
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select jsonb_array_length(data->'bedsAt') from public.town_catalog where key = 'farming';                  -- 48
--   select town.bed_of(177, 75);                                                                   -- 47
--   select jsonb_array_length(data->'haunts') from public.town_catalog where key = 'insects';                  -- 173
