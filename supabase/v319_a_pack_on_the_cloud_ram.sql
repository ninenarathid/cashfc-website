-- v319 — a pack on the cloud ram
--
-- Run this once in the Supabase SQL editor, after v318, AND ONLY ONCE THE SITE'S OWN CODE FOR IT IS LIVE (the page
-- that asks for the pack). It stands on v134 (the box: town_boxes, town.box_move), v152 (town.gift_works) and v121
-- (town_deeds), and stops at its first lines without them. Running it again is safe.
--
-- Why. The owner, 2026-11-04:
--
--   "แพะขี่ของสายเลี้ยงสัตว์ ทำให้มีกระเป๋าที่จะเก็บอะไรก็ได้เพิ่มในตัวสัตว์ได้ 10 ช่อง มีแต่เจ้าของที่ access ได้"
--
-- and, asked when it opens: "ตอนใส่แกะเป็นภูต" (while the ram is the familiar put on). So:
--
--   · The cloud ram (the pasture's sixth rank, famCloudRam) carries saddlebags of ten slots that hold anything a box
--     holds, as a box's slots do: things of a kind stack in one, a thing that holds something goes in as it is.
--   · They are their owner's alone: no other member is told of them nor reaches them.
--   · They open anywhere, but only while the cloud ram is the familiar that follows (walked beside or ridden). With
--     another familiar put on, what is in them stays where it is, shut, until the ram follows again.
--   · Nothing is made and nothing is lost, in one go, and each deed is written down (`pack_put`, `pack_take`).
--
-- What it adds: a column `pack` on v134's closed table `town_boxes` (a member who has put nothing away yet has no
-- row, as before); town.pack_roomy, town.pack_put, town.pack_take (lib/town/ram-pack.ts written again, held to the
-- code case by case by the dry run: .claude/skills/fc-cash-town/scripts/db/v319.test.mjs), town.pack_of and
-- town.keep_pack; three functions a member calls (town_pack, town_pack_put, town_pack_take); and two words of
-- town.deed_th, from its own text as it stands. It writes no function of the game's again.

do $guard$
begin
  if to_regclass('public.town_boxes') is null then raise exception 'v319 stands on v134: public.town_boxes is not here'; end if;
  if to_regprocedure('town.box_move(jsonb,integer,numeric,jsonb,text)') is null then raise exception 'v319 stands on v134: town.box_move is not here'; end if;
  if to_regprocedure('town.gift_works(jsonb,text)') is null then raise exception 'v319 stands on v152: town.gift_works is not here'; end if;
  if to_regprocedure('town.note(uuid,text,text,numeric,numeric,jsonb)') is null then raise exception 'v319 stands on v121: town.note is not here'; end if;
end $guard$;

/* ── where it is kept ────────────────────────────────────────────────────── */

-- The pack's slots beside the box's, in the member's own row (closed, as the table is: no browser reads it).
alter table public.town_boxes add column if not exists pack jsonb not null default '[]'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'town_boxes_pack_array' and conrelid = 'public.town_boxes'::regclass) then
    alter table public.town_boxes add constraint town_boxes_pack_array check (jsonb_typeof(pack) = 'array');
  end if;
end $$;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- lib/town/ram-pack.ts's roomyPack(): ten slots, a short pack given the rest at its end.
create or replace function town.pack_roomy(p_things jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_array_length(t) >= 10 then t
    else t || (select jsonb_agg('null'::jsonb) from generate_series(1, 10 - jsonb_array_length(t))) end
    from (select case when jsonb_typeof(p_things) = 'array' then p_things else '[]'::jsonb end as t) k
$$;

-- lib/town/ram-pack.ts's packPut(): so many of what is in a slot of the bag, into the pack, while the ram follows.
create or replace function town.pack_put(p_purse jsonb, p_pack jsonb, p_slot integer, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  kept jsonb := town.pack_roomy(p_pack->'things');
  did jsonb;
begin
  if not town.gift_works(p_purse, 'famCloudRam') then return town.no('shut'); end if;
  did := town.box_move(p_purse->'bag', p_slot, p_n, kept, 'packed');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'from'), 'pack', jsonb_build_object('things', did->'to'));
end;
$$;

-- lib/town/ram-pack.ts's packTake(): so many of what is in a slot of the pack, out into the bag, while the ram follows.
create or replace function town.pack_take(p_purse jsonb, p_pack jsonb, p_slot integer, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  kept jsonb := town.pack_roomy(p_pack->'things');
  did jsonb;
begin
  if not town.gift_works(p_purse, 'famCloudRam') then return town.no('shut'); end if;
  did := town.box_move(kept, p_slot, p_n, p_purse->'bag', 'full');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'to'), 'pack', jsonb_build_object('things', did->'from'));
end;
$$;

/* ── keeping it ──────────────────────────────────────────────────────────── */

-- A member's pack as a document, ten slots: an empty one for whoever has put nothing in yet (reading makes no row).
create or replace function town.pack_of(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('things', town.pack_roomy((select b.pack from public.town_boxes b where b.member_id = p_member)))
$$;

-- Keep what is in it (the box's slots in the same row are left as they are).
create or replace function town.keep_pack(p_member uuid, p_pack jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_boxes (member_id, pack, updated_at) values (p_member, p_pack->'things', now())
  on conflict (member_id) do update set pack = excluded.pack, updated_at = now()
$$;

-- The tally's words for a thing put in and a thing taken out: `town.deed_th` as it stands, with two `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('pack_put') = 'pack_put' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'v319: town.deed_th has no last line "else p_what end" to add to'; end if;
    execute replace(def, 'else p_what end', 'when ''pack_put'' then ''เก็บของใส่กระเป๋าแกะ'' when ''pack_take'' then ''หยิบของจากกระเป๋าแกะ'' else p_what end');
  end if;
end $$;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- My pack, as it stands (whether it opens now is the page's to tell from my own purse, as the database will).
create or replace function public.town_pack()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('pack', town.pack_of(me), 'now', town.now_ms());
end;
$$;

-- Put so many of what is in a slot of my bag into my pack.
create or replace function public.town_pack_put(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  -- (my purse's row is held first, as by every deed of mine: two deeds of mine at the pack wait for each other on it)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.pack_put(purse, town.pack_of(me), p_slot, p_n);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_pack(me, did->'pack');
    -- (what is put away has been in a bag: the notice board counts it as met, as the box's does)
    update public.town_things t
       set doc = jsonb_set(t.doc, '{ids}', coalesce(t.doc->'ids', '{}'::jsonb) || jsonb_build_object(did->>'item', true)), updated_at = now()
     where t.key = 'seen' and not coalesce(t.doc->'ids', '{}'::jsonb) ? (did->>'item');
    perform town.note(me, 'pack_put', did->>'item', (did->>'n')::numeric, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did - 'pack') || jsonb_build_object('pack', town.pack_of(me));
end;
$$;

-- Take so many of what is in a slot of my pack out into my bag.
create or replace function public.town_pack_take(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.pack_take(purse, town.pack_of(me), p_slot, p_n);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_pack(me, did->'pack');
    perform town.note(me, 'pack_take', did->>'item', (did->>'n')::numeric, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did - 'pack') || jsonb_build_object('pack', town.pack_of(me));
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the three a member calls are a member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_pack() from public, anon;
revoke execute on function public.town_pack_put(integer, integer) from public, anon;
revoke execute on function public.town_pack_take(integer, integer) from public, anon;
grant execute on function public.town_pack() to authenticated;
grant execute on function public.town_pack_put(integer, integer) to authenticated;
grant execute on function public.town_pack_take(integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select column_name, data_type, column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'town_boxes' and column_name = 'pack';
--   -- pack | jsonb | '[]'::jsonb
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_boxes' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_boxes'::regclass;
--   -- true | 0
--
--   select has_function_privilege('authenticated', 'public.town_pack_put(integer, integer)', 'execute') as put,
--          has_function_privilege('anon', 'public.town_pack_put(integer, integer)', 'execute') as put_anon,
--          has_function_privilege('anon', 'public.town_pack()', 'execute') as read_anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | false | 0
--
--   select town.deed_th('pack_put') as put, town.deed_th('pack_take') as take, town.deed_th('box_put') as box;
--   -- เก็บของใส่กระเป๋าแกะ | หยิบของจากกระเป๋าแกะ | เก็บของเข้ากล่อง
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who keeps what on their ram
--   select p.character_name, (select count(*) from jsonb_array_elements(b.pack) s where s <> 'null'::jsonb) as taken, b.updated_at
--     from public.town_boxes b join public.profiles p on p.id = b.member_id
--    where jsonb_array_length(b.pack) > 0 order by b.updated_at desc;
--
--   -- what went in and came out, by the day
--   select date_trunc('day', d.at) as day, count(*) filter (where d.what = 'pack_put') as put_in, count(*) filter (where d.what = 'pack_take') as taken_out,
--          count(distinct d.member_id) as members
--     from public.town_deeds d where d.what in ('pack_put', 'pack_take') group by 1 order by 1 desc limit 14;
