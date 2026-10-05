-- v137 — things dropped on the ground
--
-- Run this once in the Supabase SQL editor, after v134 (it stands on v112 and
-- v121, and stops at its first line without them). Running it again is safe.
-- It may run before the site's own code for it or after: a page built before
-- knows of no ground, and goes on throwing junk away as it did.
--
-- Why. The owner, 2026-10-05:
--
--   "สามาทิ้งของที่ไม่ใช้จากกระเป๋าได้ ลงพื่น คนอื่นเก็บได้ แต่ถ้าไม่มีคนเก็บจะหายไปใน 10 วิ"
--
-- A bag fills up, and until now only what the river brings up that is worth
-- nothing could be thrown away. So:
--
--   · Whatever is in a slot of the bag can be dropped where its holder
--     stands: the whole of the slot, as the stack it is (a pot goes with its
--     food, a can with its water).
--   · It lies there for ten seconds. Anybody standing by it in that time
--     (on its tile, or one of the eight about it) picks it up, the one who
--     dropped it too, if their bag has room for all of it. The first to do so
--     has it.
--   · After the ten seconds it is gone for good: nobody's. Every drop and
--     every picking up is written down (`ground_drop`, `ground_take`: v121's
--     `town_deeds`, each with the thing's own number); a drop that no picking
--     up answers is a thing lost.
--
-- What it adds: one closed table, `town_ground` (what lies about: who dropped
-- it, the stack, its tile, the moment it is gone); the catalog row `ground`
-- (ten seconds, a reach of one tile, the three maps as boxes of tiles); the
-- rules (`town.on_ground`, `town.ground_drop`, `town.ground_pick`:
-- lib/town/ground.ts written again, held to the code case by case by the dry
-- run) and one that tells (`town.ground_now`); three functions a member calls
-- (`town_ground`, `town_ground_drop`, `town_ground_take`).
--
-- It writes no function of the game's again. v121's `town_drop(p_slot)`, which
-- throws a thing away, stays as it is: a page built before still calls it.
-- `town.deed_th` is given two words more from its own text as it stands.
--
-- Where a member stands is the page's word, as everywhere in the town: a tile
-- is held to be on one of the three maps, and near the thing picked up, and
-- that is all the database can know. Nothing is made by any of it: a thing
-- only changes hands, or is lost.

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.push(jsonb, jsonb)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v112 and v121 have not run yet: a thing picked up goes into a bag as a deal''s does, and both deeds are written down';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v137> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('ground', $town${
    "lasts": 10,
    "reach": 1,
    "maps": [[0,0,64,64],[128,0,60,44],[144,112,96,80]]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v137>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A thing lying on the ground: who dropped it (nobody's, once they are gone),
-- the stack as it left their bag, the tile it lies on, and the moment it is
-- gone, by the town's clock. A line whose moment has passed is no longer told
-- to anybody, and is thrown away at the next drop.
create table if not exists public.town_ground (
  id        bigint generated always as identity primary key,
  member_id uuid references public.profiles (id) on delete set null,
  stack     jsonb not null check (jsonb_typeof(stack) = 'object' and stack ? 'item' and (stack->>'n')::int > 0),
  x         integer not null,
  y         integer not null,
  until_ms  bigint not null,
  at        timestamptz not null default now()
);
create index if not exists town_ground_until on public.town_ground (until_ms);
create index if not exists town_ground_member on public.town_ground (member_id);

alter table public.town_ground enable row level security;
revoke all on public.town_ground from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- lib/town/world.ts's placeOf(): whether a tile is on one of the maps a thing
-- may be dropped on (each a box of tiles: the catalog's `ground.maps`).
create or replace function town.on_ground(p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select coalesce(bool_or(p_x >= (m.v->>0)::int and p_y >= (m.v->>1)::int and p_x < (m.v->>0)::int + (m.v->>2)::int and p_y < (m.v->>1)::int + (m.v->>3)::int), false)
    from jsonb_array_elements(town.cat('ground')->'maps') m(v)
$$;

-- lib/town/ground.ts's drop(): what is in a slot of the bag, all of it, onto
-- the tile stood on. `p_id` is the number the thing is given.
create or replace function town.ground_drop(p_purse jsonb, p_slot integer, p_by text, p_x integer, p_y integer, p_now bigint, p_id bigint)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot >= 0 then p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if not town.on_ground(p_x, p_y) then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)),
    'dropped', jsonb_build_object('id', p_id, 'by', p_by, 'stack', s, 'at', jsonb_build_array(p_x, p_y),
      'until', p_now + (town.cat('ground')->>'lasts')::bigint * 1000));
end;
$$;

-- lib/town/ground.ts's pickUp(): a thing picked up from the ground into the
-- bag, from the tile stood on: all of it or none. `p_dropped` is the thing as
-- it is kept, or null when it is no longer kept.
create or replace function town.ground_pick(p_purse jsonb, p_dropped jsonb, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  bag jsonb;
begin
  if p_dropped is null or p_dropped = 'null'::jsonb or (p_dropped->>'until')::bigint <= p_now then return town.no('lost'); end if;
  if p_x is null or p_y is null
     or greatest(abs(p_x - (p_dropped->'at'->>0)::int), abs(p_y - (p_dropped->'at'->>1)::int)) > (town.cat('ground')->>'reach')::int then
    return town.no('far');
  end if;
  -- (as the stack it is, so that what it holds comes with it: v112's push)
  bag := town.push(p_purse->'bag', jsonb_build_array(p_dropped->'stack'));
  if bag is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag),
    'item', p_dropped->'stack'->>'item', 'n', (p_dropped->'stack'->>'n')::int);
end;
$$;

/* ── telling it ──────────────────────────────────────────────────────────── */

-- What lies on the ground at a moment, the oldest first: each as a page keeps
-- it (lib/town/ground.ts's Dropped).
create or replace function town.ground_now(p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'by', g.member_id, 'stack', g.stack, 'at', jsonb_build_array(g.x, g.y), 'until', g.until_ms) order by g.id), '[]'::jsonb)
    from public.town_ground g where g.until_ms > p_now
$$;

-- The tally's words for a thing dropped and a thing picked up: `town.deed_th`
-- as it stands, with two `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('ground_drop') = 'ground_drop' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''ground_drop'' then ''ทิ้งของลงพื้น'' when ''ground_take'' then ''เก็บของจากพื้น'' else p_what end');
  end if;
end $$;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- What lies about now, on whichever map.
create or replace function public.town_ground()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  return jsonb_build_object('ground', town.ground_now(now_), 'now', now_);
end;
$$;

-- Drop what is in a slot of my bag where I stand.
create or replace function public.town_ground_drop(p_slot integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb;
  id_ bigint;
begin
  did := town.ground_drop(purse, p_slot, me::text, p_x, p_y, now_, 0);
  if (did->>'ok')::boolean then
    -- (what has lain its time is thrown away here, where a line is written anyway)
    delete from public.town_ground g where g.until_ms <= now_;
    insert into public.town_ground (member_id, stack, x, y, until_ms)
      values (me, did->'dropped'->'stack', p_x, p_y, (did->'dropped'->>'until')::bigint) returning id into id_;
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'ground_drop', did->'dropped'->'stack'->>'item', (did->'dropped'->'stack'->>'n')::numeric, 0,
      jsonb_build_object('id', id_, 'tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'dropped') || case when id_ is not null then jsonb_build_object('id', id_) else '{}'::jsonb end
    || jsonb_build_object('ground', town.ground_now(now_));
end;
$$;

-- Pick a thing up from the ground, from the tile I stand on.
create or replace function public.town_ground_take(p_id bigint, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  -- (my purse's row first, as by every deed of mine; then the thing's own line: of two who reach for it at the same
  -- moment the second waits here, and finds it gone)
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  d jsonb;
  did jsonb;
begin
  select jsonb_build_object('id', g.id, 'by', g.member_id, 'stack', g.stack, 'at', jsonb_build_array(g.x, g.y), 'until', g.until_ms) into d
    from public.town_ground g where g.id = p_id for update;
  did := town.ground_pick(purse, d, p_x, p_y, now_);
  if (did->>'ok')::boolean then
    delete from public.town_ground g where g.id = p_id;
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'ground_take', did->>'item', (did->>'n')::numeric, 0,
      jsonb_build_object('id', p_id, 'tile', jsonb_build_array(p_x, p_y))
      || case when d->>'by' is distinct from me::text then jsonb_build_object('whose', d->'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('ground', town.ground_now(now_));
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the three a member calls are a member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_ground() from public, anon;
revoke execute on function public.town_ground_drop(integer, integer, integer) from public, anon;
revoke execute on function public.town_ground_take(bigint, integer, integer) from public, anon;
grant execute on function public.town_ground() to authenticated;
grant execute on function public.town_ground_drop(integer, integer, integer) to authenticated;
grant execute on function public.town_ground_take(bigint, integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select town.cat('ground')->>'lasts' as seconds, town.cat('ground')->>'reach' as reach, jsonb_array_length(town.cat('ground')->'maps') as maps;
--   -- 10 | 1 | 3
--
--   select town.on_ground(30, 40) as town, town.on_ground(133, 5) as farm, town.on_ground(190, 180) as forest, town.on_ground(100, 100) as nowhere;
--   -- true | true | true | false
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_ground' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_ground'::regclass;
--   -- true | 0
--
--   select has_function_privilege('authenticated', 'public.town_ground()', 'execute') as ground, has_function_privilege('anon', 'public.town_ground()', 'execute') as ground_anon,
--          has_function_privilege('authenticated', 'public.town_ground_drop(integer, integer, integer)', 'execute') as drop_,
--          has_function_privilege('anon', 'public.town_ground_drop(integer, integer, integer)', 'execute') as drop_anon,
--          has_function_privilege('authenticated', 'public.town_ground_take(bigint, integer, integer)', 'execute') as take,
--          has_function_privilege('anon', 'public.town_ground_take(bigint, integer, integer)', 'execute') as take_anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | true | false | true | false | 0
--
--   select town.deed_th('ground_drop') as dropped, town.deed_th('ground_take') as picked_up, town.deed_th('drop') as thrown_away;
--   -- ทิ้งของลงพื้น | เก็บของจากพื้น | ทิ้งของ
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what was dropped lately, and what came of each: picked up (by whom), or lost
--   select d.at, p.character_name as dropped_by, d.thing, d.n::int as n,
--          (select q.character_name from public.town_deeds t left join public.profiles q on q.id = t.member_id
--            where t.what = 'ground_take' and t.doc->>'id' = d.doc->>'id' limit 1) as picked_up_by,
--          not exists (select 1 from public.town_deeds t where t.what = 'ground_take' and t.doc->>'id' = d.doc->>'id') and d.at < now() - interval '10 seconds' as lost
--     from public.town_deeds d left join public.profiles p on p.id = d.member_id
--    where d.what = 'ground_drop' order by d.at desc limit 60;
--
--   -- things handed from one member to another by way of the ground, by the day
--   select date_trunc('day', t.at) as day, count(*) as handed, count(distinct t.member_id) as takers
--     from public.town_deeds t where t.what = 'ground_take' and t.doc ? 'whose' group by 1 order by 1 desc limit 14;
