-- v143 — a stall may ask more than the uncle does
--
-- Run this once in the Supabase SQL editor, after v142 (it stops at its first
-- line without it). Running it again is safe. It may run before the site's
-- own code for it or after: a page built before holds a price to what the
-- uncle asks by itself, and a page with the code and a database without this
-- file is told a dearer price is too dear, as before.
--
-- Why. The owner, 2026-10-06, the afternoon stalls opened:
--
--   "ช่วยทำให้ตั้งราคาแพงกว่าร้านขายของลุงได้"
--
-- v142 gave a stall's prices the notice board's own most (v128's
-- `town.notice_cap`): ten times what the uncle's relatives pay for a thing,
-- but for what the uncle sells himself, never more than he asks. So a worm,
-- which he sells for two, could not be asked three for, though his shelf is
-- small and so many a person a round.
--
-- From here a stall's most is the stall's own, `town.shop_cap`: so many times
-- what the relatives pay (the knob `notice_cap`, ten), and for a thing they do
-- not take, so many coins (`notice_capless`, five hundred), whether the uncle
-- sells the thing or not. For every thing on his price list that is above
-- what he asks (his prices are 1.6 to 3 times what his relatives pay; what
-- they do not take he asks 40 to 300 for). Both ways: a stall may sell for
-- more than he asks, and want a thing for more than he asks.
--
-- The notice board is as it was: `town.notice_cap` is not touched, and a
-- notice of what the uncle sells is still held to his price.
--
-- What it changes: one function is new (`town.shop_cap`), and one is written
-- again, `town.shop_open`, v142's word for word but for the one line that
-- asks the most a price is. No table, no knob, no row; nothing a member calls
-- is written again (`town_shop_open` calls the rule as it did).

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.shop_open(jsonb, text, jsonb, integer, integer, bigint, jsonb, jsonb)') is null then
    raise exception 'v142 has not run yet: there is no stall to give a price''s most to';
  end if;
end $$;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- The most a thing may be asked or offered for at a stall: so many times what
-- the relatives usually pay for it, and for a thing they do not take, a flat
-- most. What the uncle asks for it, if he sells it, is no part of this.
create or replace function town.shop_cap(p_item text, p_k jsonb)
returns integer language sql stable set search_path = public
as $$
  select case
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$$;

-- Open a stall where its keeper stands: v142's, word for word but for the
-- line that asks the most a price is (written here by build-v143.mjs from
-- v142's own text).
-- <shop_open>
create or replace function town.shop_open(p_purse jsonb, p_me text, p_ask jsonb, p_x integer, p_y integer, p_now bigint, p_seen jsonb, p_k jsonb)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  l jsonb;
  item_ text;
  owed numeric := 0;
  lines_ jsonb := '[]'::jsonb;
  n_ numeric;
  price_ numeric;
begin
  if p_ask is null or jsonb_typeof(p_ask) <> 'array' or jsonb_array_length(p_ask) < 1 or jsonb_array_length(p_ask) > (p_k->>'lines')::int then return town.no('lines'); end if;
  if (select count(distinct coalesce(e->>'item', '')) from jsonb_array_elements(p_ask) e) <> jsonb_array_length(p_ask) then return town.no('lines'); end if;
  if p_x is null or p_y is null then return town.no('none'); end if;
  for l in select e from jsonb_array_elements(p_ask) e loop
    item_ := l->>'item';
    if item_ is null or not (town.cat('items') ? item_) or coalesce(l->>'kind', '') not in ('sell', 'buy') then return town.no('none'); end if;
    if jsonb_typeof(l->'n') is distinct from 'number' or jsonb_typeof(l->'price') is distinct from 'number' then return town.no('amount'); end if;
    n_ := (l->>'n')::numeric;
    price_ := (l->>'price')::numeric;
    if n_ <= 0 or n_ <> trunc(n_) or price_ <= 0 or price_ <> trunc(price_) or n_ > (p_k->>'most')::numeric then return town.no('amount'); end if;
    if price_ > town.shop_cap(item_, p_k) then return town.no('dear'); end if;
    if l->>'kind' = 'sell' and town.plain(p_purse->'bag', item_) < n_ then return town.no('none'); end if;
    if l->>'kind' = 'buy' and not (p_seen ? item_) then return town.no('none'); end if;
    if l->>'kind' = 'buy' then owed := owed + n_ * price_; end if;
    lines_ := lines_ || jsonb_build_array(jsonb_build_object('kind', l->>'kind', 'item', item_, 'n', n_::int, 'left', n_::int, 'price', price_::int));
  end loop;
  if owed > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'shop', jsonb_build_object(
    'by', p_me, 'at', jsonb_build_array(p_x, p_y), 'lines', lines_, 'since', p_now, 'beat', p_now, 'took', 0, 'paid', 0));
end;
$$;
-- </shop_open>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call. (Supabase hands every new function to
-- everybody; one written again keeps who may call it.)
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select town.shop_cap('worm', town.shop_knobs()) as worm_at_a_stall, (town.cat('goods')->'worm'->>'price')::int as the_uncle_asks,
--          town.notice_cap('worm', town.notice_knobs()) as worm_on_the_board, town.shop_cap('kangkong', town.shop_knobs()) as kangkong,
--          town.shop_cap('scrollPestCure', town.shop_knobs()) as what_the_relatives_do_not_take;
--   -- 10 | 2 | 2 | 30 | 500
--
--   -- every thing the uncle sells may be asked more for at a stall than he asks: none is left behind
--   select count(*) as on_his_list, count(*) filter (where town.shop_cap(g.key, town.shop_knobs()) > (g.value->>'price')::numeric) as dearer_at_a_stall
--     from jsonb_each(town.cat('goods')) g;
--   -- 103 | 103
--
--   select position('town.shop_cap(item_, p_k)' in pg_get_functiondef('town.shop_open(jsonb, text, jsonb, integer, integer, bigint, jsonb, jsonb)'::regprocedure)) > 0 as stall_asks_its_own,
--          position('notice_cap' in pg_get_functiondef('town.shop_open(jsonb, text, jsonb, integer, integer, bigint, jsonb, jsonb)'::regprocedure)) = 0 as not_the_boards;
--   -- true | true
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what the uncle sells that changed hands at a stall for more than he asks: by the thing, how often, how many, at what price each
--   select d.thing, count(*) as sales, sum(d.n)::int as things, min((d.doc->>'price')::numeric) as least, max((d.doc->>'price')::numeric) as most,
--          (town.cat('goods')->d.thing->>'price')::int as the_uncle_asks
--     from public.town_deeds d
--    where d.what in ('shop_buy', 'shop_sell') and town.cat('goods') ? d.thing and (d.doc->>'price')::numeric > (town.cat('goods')->d.thing->>'price')::numeric
--    group by d.thing order by 2 desc limit 40;
