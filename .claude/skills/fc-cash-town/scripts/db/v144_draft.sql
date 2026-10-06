-- v144 — the notice board may ask more than the uncle does, too
--
-- Run this once in the Supabase SQL editor, after v143 (it stops at its first
-- line without it). Running it again is safe. It may run before the site's
-- own code for it or after: a page built before holds a notice's price to
-- what the uncle asks by itself, and a page with the code and a database
-- without this file is told a dearer price is too dear, as before.
--
-- Why. The owner, 2026-10-06, an hour after v143 gave a stall a most of its
-- own ("ช่วยทำให้ตั้งราคาแพงกว่าร้านขายของลุงได้"), of the notice board:
--
--   "กระดานฝากขาย เอาเหมือนกัน"
--
-- The board's most for a price (v128's `town.notice_cap`) was ten times what
-- the uncle's relatives pay for a thing, but for what the uncle sells
-- himself, never more than he asks. That one line goes: a notice has the
-- most a stall has, ten times what the relatives pay (the knob `notice_cap`)
-- and so many coins for a thing they do not take (`notice_capless`), whether
-- the uncle sells the thing or not. For every thing on his price list that
-- is above what he asks. Both ways: a notice to sell, and a notice of
-- something wanted. The board keeps its tenth of every sale as before.
--
-- What it changes: one function is written again, `town.notice_cap`, v128's
-- word for word less the one line. Nothing is new: no table, no knob, no
-- row. `town_notice_post` calls the rule as it did; a stall's own most
-- (`town.shop_cap`, v143) is not touched, and from here the two answer alike.
-- A notice already on the board keeps its price.

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.notice_cap(text, jsonb)') is null or to_regprocedure('town.shop_cap(text, jsonb)') is null then
    raise exception 'v128 and v143 have not both run yet: the notice board''s most is v128''s, and it is brought to the stall''s, which is v143''s';
  end if;
end $$;

/* ── the rule ────────────────────────────────────────────────────────────── */

-- The most a thing may be asked or offered for on the board: v128's, word
-- for word less the line that held what the uncle sells to his price
-- (written here by build-v144.mjs from v128's own text).
-- <notice_cap>
create or replace function town.notice_cap(p_item text, p_k jsonb)
returns integer language sql stable set search_path = public
as $$
  select case
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$$;
-- </notice_cap>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call. (A function written again keeps who
-- may call it; this line is here as in every file of the town's.)
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select town.notice_cap('worm', town.notice_knobs()) as worm_on_the_board, town.shop_cap('worm', town.shop_knobs()) as worm_at_a_stall,
--          (town.cat('goods')->'worm'->>'price')::int as the_uncle_asks, town.notice_cap('kangkong', town.notice_knobs()) as kangkong,
--          town.notice_cap('scrollPestCure', town.notice_knobs()) as what_the_relatives_do_not_take;
--   -- 10 | 10 | 2 | 30 | 500
--
--   -- every thing there is has the same most on the board as at a stall, and every thing the uncle sells may be asked more for than he asks
--   select (select count(*) from jsonb_object_keys(town.cat('items')) i(key) where town.notice_cap(i.key, town.notice_knobs()) is distinct from town.shop_cap(i.key, town.shop_knobs())) as unlike,
--          (select count(*) from jsonb_each(town.cat('goods')) g where town.notice_cap(g.key, town.notice_knobs()) > (g.value->>'price')::numeric) as dearer_on_the_board;
--   -- 0 | 103
--
--   select position('goods' in pg_get_functiondef('town.notice_cap(text, jsonb)'::regprocedure)) = 0 as asks_nothing_of_his_shelf;
--   -- true
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- notices of what the uncle sells priced above what he asks: on the board now
--   select n.kind, n.item, n.rest, n.price, (town.cat('goods')->n.item->>'price')::int as the_uncle_asks
--     from public.town_notices n
--    where town.cat('goods') ? n.item and n.price > (town.cat('goods')->n.item->>'price')::numeric and n.rest > 0 and n.until > town.now_ms()
--    order by n.id desc limit 40;
--
--   -- and what of his was sold over the board above his price, by the thing
--   select s.item, count(*) as sales, sum(s.n)::int as things, min(s.price) as least, max(s.price) as most, (town.cat('goods')->s.item->>'price')::int as the_uncle_asks
--     from public.town_notice_sales s
--    where town.cat('goods') ? s.item and s.price > (town.cat('goods')->s.item->>'price')::numeric
--    group by s.item order by 2 desc limit 40;
