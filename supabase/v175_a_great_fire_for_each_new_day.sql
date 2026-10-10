-- v175: daily great fire and the harder forging table. Site code goes out first.
-- Run after v174, while smith_open remains 0. Safe to run twice.
-- +10: 10% taken, 60% stays, 30% down. One accepted top attempt/member/game day.
-- All tools share the right. Resets 05:00 Bangkok; prior +10 does not bar another tool.
-- The purse's existing transaction lock prevents simultaneous requests spending twice.
-- No member's coins, tools, or historical forge data are reset by this file.
begin;
do $guard$ begin
  if to_regprocedure('town.forge_try_fired(jsonb,jsonb,integer,double precision,text,text,bigint,double precision)') is null then raise exception 'Run v174 first'; end if;
  if md5(pg_get_functiondef('town.fire_new()'::regprocedure)) not in ('c2588e1e8298589f723dc83778b90235','0715f345cd2fe9fc331fecfa93e9a981') then raise exception 'Definition changed: town.fire_new(); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_sound(jsonb)'::regprocedure)) not in ('16ac2fe61f871303d722c81b7d6a5fba','1552cb52b822ecf98b35c03646aa565f') then raise exception 'Definition changed: town.fire_sound(jsonb); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_lit_at(jsonb)'::regprocedure)) not in ('67fdcf892d03512886a87374de0974c7','09311165b3b95ac1ffab3b3ff609ac47') then raise exception 'Definition changed: town.fire_lit_at(jsonb); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_open_to(jsonb,bigint)'::regprocedure)) not in ('5ad1e3e16355776165239d8d7119720d','b2c2b28a5f6814144d47b67611415b94') then raise exception 'Definition changed: town.fire_open_to(jsonb,bigint); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_half_found(jsonb,text,text,text,bigint)'::regprocedure)) not in ('d903c1930922a60fdbd25311bb93aa99','d70ad5fbc200d4d101bb8ab4cac65f35') then raise exception 'Definition changed: town.fire_half_found(jsonb,text,text,text,bigint); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_join(jsonb,text,text,boolean,bigint)'::regprocedure)) not in ('c757878aa0316bccd9115c28efcfbe03','18e39df8575edc1cdf924301e987fe85') then raise exception 'Definition changed: town.fire_join(jsonb,text,text,boolean,bigint); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_leave(jsonb,text)'::regprocedure)) not in ('81acf79c717f8c37fabd1114e41e8e16','e7dd8f5e254f1458e9c3179c231ae006') then raise exception 'Definition changed: town.fire_leave(jsonb,text); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_why(jsonb,text,bigint)'::regprocedure)) not in ('ad53f89f9ac8b2cf5c60d6cb0e9b7ff2','351e04a06a1b96e2b75a7fb637d97d95') then raise exception 'Definition changed: town.fire_why(jsonb,text,bigint); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_spent(jsonb,text,text,text,bigint,double precision)'::regprocedure)) not in ('064f55bf1244ef6a6ff4b90b329ae08a','2621e1dc19ef5e6d71c653ee586ccb71') then raise exception 'Definition changed: town.fire_spent(jsonb,text,text,text,bigint,double precision); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_told(jsonb,text,bigint)'::regprocedure)) not in ('20879e7f43b239613e938715fbf8e132','7925e03451e947120ca2eca42e30aa65') then raise exception 'Definition changed: town.fire_told(jsonb,text,bigint); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.forge_try_fired(jsonb,jsonb,integer,double precision,text,text,bigint,double precision)'::regprocedure)) not in ('75abfd1be5d89f90dfde48f3bfd5e62a','ec1af7c9c0d2d2325ae9e8e3d33263ce') then raise exception 'Definition changed: town.forge_try_fired(jsonb,jsonb,integer,double precision,text,text,bigint,double precision); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_kept(boolean)'::regprocedure)) not in ('f27200a16bb4d8c1e1ef84a9373cc593','0199a3c24384ffb12a0e8ed5794bfb4d') then raise exception 'Definition changed: town.fire_kept(boolean); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town.fire_wants(text,uuid,bigint,uuid)'::regprocedure)) not in ('924b171f6b00de5428c201024131ee72','c31431d18cc929f39733d8a09af1de37') then raise exception 'Definition changed: town.fire_wants(text,uuid,bigint,uuid); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town_smith_try(integer)'::regprocedure)) not in ('92d63d293f185983ec1280bbec002941','9aeda638cec3a36c4362013f42917282') then raise exception 'Definition changed: town_smith_try(integer); rebuild v175 on its current text'; end if;
  if md5(pg_get_functiondef('town_fire_join()'::regprocedure)) not in ('1f52643247f68ab3fcda8b4f8883dba1','504d9717eee972f3bfc89e627434fd1b') then raise exception 'Definition changed: town_fire_join(); rebuild v175 on its current text'; end if;
end $guard$;
create or replace function town.fire_from_purse(p_purse jsonb, p_id text)
returns jsonb language sql immutable set search_path = ''
as $$ select town.fire_new() || jsonb_build_object('used', case when p_id is not null and jsonb_typeof(p_purse->'forgeDay') = 'number'
  then jsonb_build_object(p_id, p_purse->'forgeDay') else '{}'::jsonb end) $$;
revoke all on function town.fire_from_purse(jsonb, text) from public, anon, authenticated;
do $catalog$
declare k jsonb; i integer; takes integer[] := array[100,100,100,90,70,55,40,30,20,10]; stays integer[] := array[0,0,0,10,30,40,50,55,55,60]; downs integer[] := array[0,0,0,0,0,5,10,15,25,30];
begin
  select data into k from public.town_catalog where key = 'forge' for update;
  if k is null then raise exception 'v174 is required'; end if;
  for i in 0..jsonb_array_length(k->'tries') - 1 loop
    k := jsonb_set(k, array['tries',i::text,'take'], to_jsonb(takes[(k->'tries'->i->>'to')::integer]));
    k := jsonb_set(k, array['tries',i::text,'stay'], to_jsonb(stays[(k->'tries'->i->>'to')::integer]));
    k := jsonb_set(k, array['tries',i::text,'down'], to_jsonb(downs[(k->'tries'->i->>'to')::integer]));
  end loop;
  k := jsonb_set(k, '{fire}', '{"daily":true,"dawn":5,"tries":1}'::jsonb);
  update public.town_catalog set data = k, updated_at = now() where key = 'forge';
end $catalog$;
-- <town.fire_new>
create or replace function town.fire_new()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
 SELECT '{"due":0,"flint":null,"tinder":null,"row":[],"topped":[],"used":{}}'::jsonb 
$$;
-- </town.fire_new>

-- <town.fire_sound>
create or replace function town.fire_sound(p_kept jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.

declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  tops_ jsonb := '[]'::jsonb;
  used_ jsonb := '{}'::jsonb;
  id_ text;
begin
  for id_ in select e.v #>> '{}' from jsonb_array_elements(case when jsonb_typeof(k->'topped') = 'array' then k->'topped' else '[]'::jsonb end) with ordinality e(v, ord)
    where jsonb_typeof(e.v) = 'string' and e.v #>> '{}' <> '' order by e.ord loop
    if not tops_ ? id_ then tops_ := tops_ || jsonb_build_array(id_); end if;
  end loop;
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into used_
    from jsonb_each(case when jsonb_typeof(k->'used') = 'object' then k->'used' else '{}'::jsonb end) e
    where length(e.key) between 1 and 100 and case when jsonb_typeof(e.value) = 'number' then
      (e.value #>> '{}')::numeric = trunc((e.value #>> '{}')::numeric) and abs((e.value #>> '{}')::numeric) <= 9007199254740991 else false end;
  return town.fire_new() || jsonb_build_object('topped', tops_, 'used', used_);
end;
$$;
-- </town.fire_sound>

-- <town.fire_lit_at>
create or replace function town.fire_lit_at(p_fire jsonb)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
 SELECT 0::numeric 
$$;
-- </town.fire_lit_at>

-- <town.fire_open_to>
create or replace function town.fire_open_to(p_fire jsonb, p_now bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
 SELECT jsonb_array_length(p_fire->'row') 
$$;
-- </town.fire_open_to>

-- <town.fire_half_found>
create or replace function town.fire_half_found(p_fire jsonb, p_half text, p_id text, p_name text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
begin return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false); end;
$$;
-- </town.fire_half_found>

-- <town.fire_join>
create or replace function town.fire_join(p_fire jsonb, p_id text, p_name text, p_ready boolean, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
begin
  if not coalesce(p_ready, false) then return town.no('level'); end if;
  if town.fire_why(p_fire, p_id, p_now) is not null then return town.no('daily'); end if;
  return jsonb_build_object('ok', true, 'fire', p_fire);
end;
$$;
-- </town.fire_join>

-- <town.fire_leave>
create or replace function town.fire_leave(p_fire jsonb, p_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
 SELECT town.no('none') 
$$;
-- </town.fire_leave>

-- <town.fire_why>
create or replace function town.fire_why(p_fire jsonb, p_id text, p_now bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
begin
  return case when jsonb_typeof(p_fire->'used'->p_id) = 'number' and (p_fire->'used'->>p_id)::numeric = town.day_of(p_now) then 'daily' end;
end;
$$;
-- </town.fire_why>

-- <town.fire_spent>
create or replace function town.fire_spent(p_fire jsonb, p_id text, p_name text, p_out text, p_now bigint, p_chance double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
begin
  return p_fire || jsonb_build_object('used', coalesce(p_fire->'used', '{}'::jsonb) || jsonb_build_object(p_id, town.day_of(p_now)),
    'topped', case when p_out = 'taken' and not (p_fire->'topped' ? p_id) then p_fire->'topped' || jsonb_build_array(p_id) else p_fire->'topped' end);
end;
$$;
-- </town.fire_spent>

-- <town.fire_told>
create or replace function town.fire_told(p_fire jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $$
-- v175: daily rights, retained only in the member's purse.
 SELECT jsonb_build_object('flint', null, 'tinder', null, 'lit', true, 'row', '[]'::jsonb,
  'open', case when town.fire_why(p_fire, p_me, p_now) = 'daily' then 0 else 1 end,
  'mine', case when town.fire_why(p_fire, p_me, p_now) = 'daily' then -1 else 0 end, 'topped', false,
  'daily', jsonb_build_object('day', town.day_of(p_now), 'used', coalesce(town.fire_why(p_fire, p_me, p_now) = 'daily', false),
    'resetAt', (town.day_of(p_now)::bigint + 1) * 86400000 - 7200000)) 
$$;
-- </town.fire_told>

-- <town.fire_kept>
create or replace function town.fire_kept(p_hold boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
-- v175: daily rights, retained only in the member's purse.
begin
  return town.fire_from_purse(town.purse_of(auth.uid(), false), auth.uid()::text);
end;
$$;
-- </town.fire_kept>

-- <town.fire_wants>
create or replace function town.fire_wants(p_half text, p_who uuid, p_now bigint, p_other uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $$
-- v175: daily rights, retained only in the member's purse.
begin return false; end;
$$;
-- </town.fire_wants>

-- <town.forge_try_fired>
create or replace function town.forge_try_fired(p_purse jsonb, p_fire jsonb, p_slot integer, p_r double precision, p_id text, p_name text, p_now bigint, p_chance double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  held_ jsonb := case when p_slot is null or p_slot < 0 then null else nullif(p_purse->'bag'->p_slot, 'null'::jsonb) end;
  needs boolean := coalesce(town.tool_kind(held_->>'item') is not null and town.tool_level(held_) = (town.cat('forge')->'forge'->>'top')::integer - 1, false);
  why_ text;
  did jsonb;
begin
  if needs then
    -- v175: the locked purse owns the daily right, not the shared fire or a client.
    why_ := town.fire_why(town.fire_from_purse(p_purse, p_id), p_id, p_now);
    if why_ is not null then return town.no(why_); end if;
  end if;
  did := town.forge_try(p_purse, p_slot, p_r, p_name);
  if not (did->>'ok')::boolean then return did; end if;
  -- v175: refusals spend nothing; every accepted top attempt spends the same member's right.
  if needs then did := did || jsonb_build_object('purse', did->'purse' || jsonb_build_object('forgeDay', town.day_of(p_now))); end if;
  return did || jsonb_build_object('spent', needs, 'fire', case when needs then town.fire_spent(p_fire, p_id, p_name, did->>'out', p_now, p_chance) else p_fire end);
end;
$$;
-- </town.forge_try_fired>

-- <public.town_smith_try>
create or replace function public.town_smith_try(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  called text := town.smith_called(me);
  -- (the village's rows first: the great fire's, then the board's; then my purse)
  -- v175: no shared fire lock or global consumption.
  fire_ jsonb := town.fire_new();
  board jsonb := town.board_sound(town.thing('smith', true));
  purse jsonb := town.purse_of(me, true);
  r double precision := random();
  did jsonb := town.forge_try_fired(purse, fire_, p_slot, r, me::text, called, now_, random());
  cost_ jsonb;
  marked jsonb;
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_purse(me, did->'purse');
  -- v175: forgeDay was saved atomically by keep_purse above.
  cost_ := town.try_cost(did->>'item', (did->>'from')::integer + 1);
  -- (every try is written down, whatever came of it: what was tried for, how it went, the number it went by, what it took)
  perform town.note(me, 'forge', did->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
    jsonb_build_object('slot', p_slot, 'from', did->'from', 'to', (did->>'from')::integer + 1, 'out', did->'out', 'level', did->'level', 'r', r,
      'ore', cost_->'ore', 'ores', cost_->'n', 'timber', cost_->'timber')
    || case when (did->>'spent')::boolean then '{"fire": true}'::jsonb else '{}'::jsonb end);
  -- (and the first of a kind at the top goes on the board)
  if (did->>'level')::integer >= (town.cat('forge')->'forge'->>'top')::integer then
    marked := town.board_top(board, did->>'item', me::text, called, now_);
    if marked <> board then
      perform town.keep_thing('smith', marked);
      perform town.note(me, 'forge_first', did->>'item', 1, 0, '{"which": "tops"}'::jsonb);
    end if;
  end if;
  return town.smith_answer(me, jsonb_build_object('ok', true, 'out', did->'out', 'from', did->'from', 'level', did->'level', 'item', did->'item', 'owed', did->'owed', 'spent', did->'spent'));
end;
$$;
-- </public.town_smith_try>

-- <public.town_fire_join>
create or replace function public.town_fire_join()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  fire_ jsonb := town.fire_kept(true);
  did jsonb := town.fire_join(fire_, me::text, town.smith_called(me), town.forge_under_top(town.purse_of(me, false)), now_);
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  -- v175: compatibility call only; there is no queue to write.
  -- v175: no queue deed.
  return town.smith_answer(me, '{"ok": true}'::jsonb);
end;
$$;
-- </public.town_fire_join>
commit;
-- Read-only verification: ten rows, each total 100; daily=true; dawn=5; tries=1.
select x->>'to' level, x->>'take' taken, x->>'stay' stays, x->>'down' down from public.town_catalog, lateral jsonb_array_elements(data->'tries') x where key = 'forge';
select data->'fire' from public.town_catalog where key = 'forge';
