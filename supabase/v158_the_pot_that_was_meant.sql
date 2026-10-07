-- v158 — the pot set down is the pot that was meant
--
-- Run this once in the Supabase SQL editor, after v121 (it stops at its first line without v121's pot). Running it
-- again is safe. It may run before or after the site's own code for it. A page from before asks as it always did,
-- with no slot said, and is answered as ever: the first pot of food the bag has. The new page asks for the first pot
-- in those same words, and for any other pot by its slot, which a database that has not had this file does not know
-- how to answer: nothing is set down then, and never the wrong pot.
--
-- Why. A member, 2026-10-07, with three pots of food in the bag (the owner passed it on: "มีคนเจอบั๊กนี้ช่วยแก้ไขที"):
--
--   "พอคร๊าฟอาหารเสร็จ set down for company อะ ทำไมมันถึงดรอปอาหารอันอื่นที่อยู่ในกระเป๋า ไม่ใช่อันที่เพิ่งคร๊าฟ"
--   "กะสงสัยว่าเวลาลงหม้ออาหาร ทำไมต้องถือพร้อมกันสามอัน"
--
-- `town_pot_down(x, y)` (v111's; v121's text is the last) set down the first pot of food the bag had, whichever
-- that was: a browser had no way of saying which it meant. With one pot in the bag that is the one. With several,
-- the card of a pot just cooked set down an older one, and a pot taken up to hold was set down only if it happened
-- to be the first (the hand keeps what kind of thing is held, and every pot of food is one kind of thing).
--
-- What it does: `town_pot_down` takes a third word, `p_slot`: the slot of the bag the pot is in. With none (null,
-- which is what a page from before sends by sending nothing) it is the first pot, as before. The slot is the
-- browser's word, and is believed no further than the rule believes any slot: `town.set_down` (v111's, not written
-- again) refuses one that is not there, is empty, or holds anything but a pot of food, and the bag it is a slot of
-- is the caller's own, read here. The function of two words is dropped first: left beside the new one it would go
-- on answering every call of two words itself (of two forms Postgres takes the one that leaves no word out), and
-- there would be two texts of one deed to keep alike.
--
-- The rest of the function is v121's, word for word: where a pot may stand, how many one member may leave about,
-- one to a tile, the deed written down.
--
-- No table, no column, no catalog row, no rule of the schema `town`, no coins.

do $$ begin
  if to_regprocedure('town.set_down(jsonb, integer, text, jsonb, text)') is null or to_regclass('public.town_deeds') is null then
    raise exception 'v158 needs v121: run supabase/v121 first';
  end if;
end $$;

-- ─── The pot set down ──────────────────────────────────────────────────────

drop function if exists public.town_pot_down(integer, integer);

-- Set a pot of food in my bag down on the tile I stand on (the browser's word for where that is, and for which
-- pot: the one in a slot, or with none said the first there is): if nothing stands on it or beside it, and I have
-- not left as many about as one may.
create or replace function public.town_pot_down(p_x integer, p_y integer, p_slot integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  if exists (select 1 from public.town_pots o where abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me) >= (ck->>'pots')::int then return town.answer(me, town.no('many')); end if;
  -- (the pot in the slot that is said; with none said, the first pot of food the bag has, as it was before v158)
  if p_slot is not null then slot := p_slot;
  else select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1; end if;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int, p_x, p_y, coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms())
    on conflict (x, y) do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_down', did->'pot'->>'dish', (did->'pot'->>'left')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id));
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$$;

-- A member's to call, as the one it replaces was; nobody's who is signed out.
revoke execute on function public.town_pot_down(integer, integer, integer) from public, anon;
grant execute on function public.town_pot_down(integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select p.oid::regprocedure as fn, has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'town_pot_down';
--   -- town_pot_down(integer,integer,integer) | f | t          (one line: the function of two words is gone)
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the pots set down of late: who, which dish, how many helpings were in it, on which tile (v121's deeds)
--   select d.at, d.member_id, d.thing as dish, d.n as helpings, d.doc->'tile' as tile
--     from public.town_deeds d where d.what = 'pot_down' order by d.at desc limit 20;
