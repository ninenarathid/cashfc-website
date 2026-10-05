-- v134 — a box to keep things in
--
-- Run this once in the Supabase SQL editor, after v133 (everything before it
-- has run; it stands on v112 and v121, and stops at its first line without
-- them), AND ONLY ONCE THE SITE'S OWN CODE FOR IT IS LIVE: the chest has to
-- stand in the plaza of the page that asks for it. Running it again is safe.
--
-- Why. The owner, 2026-10-05:
--
--   "Cashtown ช่วยทำ กล่องเก็บของ มาตั้งไว้กลางเมือง เก็บได้ฟรี 10 ชิ้น อัพเกรดได้ในอนาคต"
--
-- A bag has ten slots, and everything a member has is in it: tools, bait,
-- seeds, what was caught, what was picked. So:
--
--   · A chest stands in the plaza, in front of the fountain. Whoever stands by
--     it finds their own things in it: what a member puts away is theirs
--     alone, and no other member is told of it or takes it.
--   · It has ten slots for nothing, and its slots are as a bag's: things of a
--     kind stack in one, up to their own number. A thing that holds something
--     (a pot of food, a can with water in it) goes in and comes out as it is.
--   · "Upgradeable later": each box has `more` slots beyond the free ones.
--     Nothing gives any yet (how a box grows is still his to settle), and
--     whatever it is only has to raise that number: a box is given the slots
--     it lacks as it is read, and is never made smaller.
--   · Nothing is made and nothing is lost: what leaves the bag is in the box,
--     and the other way about, in one go. Each deed is written down
--     (`box_put`, `box_take`: v121's `town_deeds`).
--
-- What it adds: one closed table, `town_boxes` (a member's box: what is in
-- each slot, and the slots beyond the free ones); the catalog row `box` (ten
-- slots, how near the chest one stands, and its tile); the rules
-- (`town.by_box`, `town.box_roomy`, `town.box_move`, `town.stow`,
-- `town.unstow`: lib/town/box.ts written again, held to the code case by case
-- by the dry run) and two that keep (`town.box_of`, `town.keep_box`); three
-- functions a member calls (`town_box`, `town_box_put`, `town_box_take`).
--
-- It writes no function of the game's again. `town.deed_th` is given two
-- words more from its own text as it stands, whoever wrote it last. And one
-- line touches the notice board's row `seen` (v128: "only what the village has
-- met can be wanted", which it learns by looking through the bags every ten
-- minutes): what is put away has been in a bag, and is counted as met there
-- and then, since it may be in no bag when the board next looks.
--
-- Where a member stands is the page's word, as everywhere in the town: the
-- tile is held to be by the chest, and that is all the database can know.

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.push(jsonb, jsonb)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v112 and v121 have not run yet: a box moves things as a deal does, and writes its deeds down';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v134> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('box', $town${
    "slots": 10,
    "reach": 2,
    "at": [34,34]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v134>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A member's box: what is in each slot (a stack as a bag keeps one, or null),
-- and how many slots it has beyond the free ones. A member who has put nothing
-- away yet has no row. Gone with the member.
create table if not exists public.town_boxes (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  things     jsonb not null default '[]'::jsonb check (jsonb_typeof(things) = 'array'),
  more       integer not null default 0 check (more >= 0),
  updated_at timestamptz not null default now()
);

alter table public.town_boxes enable row level security;
revoke all on public.town_boxes from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- lib/town/box.ts's nearBox(): whether somebody on a tile stands by the chest
-- (within so many steps of it, and not on it).
create or replace function town.by_box(p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select coalesce(greatest(abs(p_x - (b.k->'at'->>0)::int), abs(p_y - (b.k->'at'->>1)::int)) between 1 and (b.k->>'reach')::int, false)
    from (select town.cat('box') as k) b
$$;

-- lib/town/box.ts's roomyBox(): a box as big as it is to be. One kept from
-- when it was smaller (or never written to) is given the slots it lacks, at
-- its end; none is ever made smaller.
create or replace function town.box_roomy(p_box jsonb)
returns jsonb language sql stable
as $$
  select case when w.want > jsonb_array_length(p_box->'things')
    then p_box || jsonb_build_object('things', (p_box->'things')
      || (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_box->'things'))))
    else p_box end
    from (select (town.cat('box')->>'slots')::int + greatest(0, coalesce((p_box->>'more')::int, 0)) as want) w
$$;

-- lib/town/box.ts's move(): so many of what is in a slot of some slots, into
-- others, as the stack it is (v112's push: what a thing holds goes with it).
-- `p_full` is what is answered when they do not fit.
create or replace function town.box_move(p_from jsonb, p_slot integer, p_n numeric, p_to jsonb, p_full text)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot >= 0 then p_from->p_slot end;
  moved jsonb;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n <= 0 or p_n > (s->>'n')::numeric then return town.no('amount'); end if;
  moved := town.push(p_to, jsonb_build_array(s || jsonb_build_object('n', p_n::int)));
  if moved is null then return town.no(p_full); end if;
  return jsonb_build_object('ok', true, 'item', s->>'item', 'n', p_n::int, 'to', moved,
    'from', jsonb_set(p_from, array[p_slot::text],
      case when (s->>'n')::numeric = p_n then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - p_n::int) end));
end;
$$;

-- lib/town/box.ts's stow(): so many of what is in a slot of the bag, put away.
create or replace function town.stow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
returns jsonb language plpgsql stable
as $$
declare
  kept jsonb := town.box_roomy(p_box);
  did jsonb;
begin
  if not town.by_box(p_x, p_y) then return town.no('far'); end if;
  did := town.box_move(p_purse->'bag', p_slot, p_n, kept->'things', 'packed');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'from'), 'box', kept || jsonb_build_object('things', did->'to'));
end;
$$;

-- lib/town/box.ts's unstow(): so many of what is in a slot of the box, taken
-- out into the bag.
create or replace function town.unstow(p_purse jsonb, p_box jsonb, p_slot integer, p_n numeric, p_x integer, p_y integer)
returns jsonb language plpgsql stable
as $$
declare
  kept jsonb := town.box_roomy(p_box);
  did jsonb;
begin
  if not town.by_box(p_x, p_y) then return town.no('far'); end if;
  did := town.box_move(kept->'things', p_slot, p_n, p_purse->'bag', 'full');
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'item', did->'item', 'n', did->'n',
    'purse', p_purse || jsonb_build_object('bag', did->'to'), 'box', kept || jsonb_build_object('things', did->'from'));
end;
$$;

/* ── keeping it ──────────────────────────────────────────────────────────── */

-- A member's box as a document, as big as it is to be: an empty one for
-- whoever has put nothing away yet (reading makes no row).
create or replace function town.box_of(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select town.box_roomy(coalesce(
    (select jsonb_build_object('things', b.things, 'more', b.more) from public.town_boxes b where b.member_id = p_member),
    jsonb_build_object('things', '[]'::jsonb, 'more', 0)))
$$;

-- Keep what is in it. (`more` is not a deed's to change.)
create or replace function town.keep_box(p_member uuid, p_box jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_boxes (member_id, things, updated_at) values (p_member, p_box->'things', now())
  on conflict (member_id) do update set things = excluded.things, updated_at = now()
$$;

-- The tally's words for a thing put away and a thing taken out: `town.deed_th`
-- as it stands, with two `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('box_put') = 'box_put' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''box_put'' then ''เก็บของเข้ากล่อง'' when ''box_take'' then ''หยิบของออกจากกล่อง'' else p_what end');
  end if;
end $$;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- My box, as it stands.
create or replace function public.town_box()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('box', town.box_of(me), 'now', town.now_ms());
end;
$$;

-- Put so many of what is in a slot of my bag away, from the tile I stand on.
create or replace function public.town_box_put(p_slot integer, p_n integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  -- (my purse's row is held first, as by every deed of mine: two deeds of mine at the box wait for each other on it,
  -- so the box's own row needs no holding)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.stow(purse, town.box_of(me), p_slot, p_n, p_x, p_y);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_box(me, did->'box');
    -- what is put away has been in a bag: the notice board counts it as met (v128's `seen` looks through the bags
    -- every ten minutes, and a thing caught and put away between two looks was in none of them)
    update public.town_things t
       set doc = jsonb_set(t.doc, '{ids}', coalesce(t.doc->'ids', '{}'::jsonb) || jsonb_build_object(did->>'item', true)), updated_at = now()
     where t.key = 'seen' and not coalesce(t.doc->'ids', '{}'::jsonb) ? (did->>'item');
    perform town.note(me, 'box_put', did->>'item', (did->>'n')::numeric, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'box') || jsonb_build_object('box', town.box_of(me));
end;
$$;

-- Take so many of what is in a slot of my box out into my bag, from the tile I stand on.
create or replace function public.town_box_take(p_slot integer, p_n integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.unstow(purse, town.box_of(me), p_slot, p_n, p_x, p_y);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_box(me, did->'box');
    perform town.note(me, 'box_take', did->>'item', (did->>'n')::numeric, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, did - 'box') || jsonb_build_object('box', town.box_of(me));
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the three a member calls are a member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_box() from public, anon;
revoke execute on function public.town_box_put(integer, integer, integer, integer) from public, anon;
revoke execute on function public.town_box_take(integer, integer, integer, integer) from public, anon;
grant execute on function public.town_box() to authenticated;
grant execute on function public.town_box_put(integer, integer, integer, integer) to authenticated;
grant execute on function public.town_box_take(integer, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select town.cat('box') as box;
--   -- {"at": [34, 34], "reach": 2, "slots": 10}
--
--   select town.by_box(35, 35) as beside, town.by_box(34, 34) as on_it, town.by_box(37, 34) as too_far;
--   -- true | false | false
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_boxes' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_boxes'::regclass;
--   -- true | 0
--
--   select has_function_privilege('authenticated', 'public.town_box()', 'execute') as box, has_function_privilege('anon', 'public.town_box()', 'execute') as box_anon,
--          has_function_privilege('authenticated', 'public.town_box_put(integer, integer, integer, integer)', 'execute') as put,
--          has_function_privilege('anon', 'public.town_box_put(integer, integer, integer, integer)', 'execute') as put_anon,
--          has_function_privilege('authenticated', 'public.town_box_take(integer, integer, integer, integer)', 'execute') as take,
--          has_function_privilege('anon', 'public.town_box_take(integer, integer, integer, integer)', 'execute') as take_anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | true | false | true | false | 0
--
--   select town.deed_th('box_put') as put, town.deed_th('box_take') as take, town.deed_th('thank') as thank;
--   -- เก็บของเข้ากล่อง | หยิบของออกจากกล่อง | ขอบคุณคนที่ช่วยดูแลผัก
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who keeps how much in their box
--   select p.character_name, jsonb_array_length(town.box_of(b.member_id)->'things') as slots,
--          (select count(*) from jsonb_array_elements(b.things) s where s <> 'null'::jsonb) as taken, b.more, b.updated_at
--     from public.town_boxes b join public.profiles p on p.id = b.member_id order by b.updated_at desc;
--
--   -- what went in and came out, by the hour
--   select date_trunc('hour', d.at) as hour, count(*) filter (where d.what = 'box_put') as put_away, count(*) filter (where d.what = 'box_take') as taken_out,
--          count(distinct d.member_id) as members
--     from public.town_deeds d where d.what in ('box_put', 'box_take') group by 1 order by 1 desc limit 48;
--
-- ─── A bigger box ────────────────────────────────────────────────────────
--
--   -- for one member (five slots beyond the free ten); how a box is to grow in the game is not settled yet
--   insert into public.town_boxes (member_id, more) values ('<their id>', 5)
--     on conflict (member_id) do update set more = excluded.more;
--
--   -- for everybody: the free slots themselves (a box is given what it lacks as it is next read)
--   update public.town_catalog set data = jsonb_set(data, '{slots}', '12'::jsonb), updated_at = now() where key = 'box';
