-- v135 — the uncle's hints come by chance
--
-- Run this once in the Supabase SQL editor, after v121 (it writes v121's
-- town_hint again, and stops at its first line if v121 has not run). Running
-- it again is safe. It may run before the site's own code for it or after:
-- a page built before shows the same price and is sold a hint all the same.
--
-- Why. The owner, 2026-10-05:
--
--   "Cashtown ช่วยทำให้ คำใบ้จากลุงขายของ สุ่มด้วยครับ ตอนนี้เหมือนเรียง 1 23 4 หรือเปล่า"
--
-- They were in order: the uncle sold everybody the first hint on his list
-- that they had neither heard nor found, so whoever had bought four had the
-- same four as everybody else, and no member had heard anything another had
-- reason to ask about. Recipes are kept secret so that members talk.
--
-- So:
--
--   · Which hint he sells is drawn by chance, from those the buyer has
--     neither heard nor found, of what can be made with what his shelf has
--     open (as before), each as likely as any other.
--   · Only among those of the earliest tier he still has one of: a hint of
--     the early game costs 15 coins, of the second tier 40, of the third 90,
--     and the page says what the next one costs before it is bought. Drawn
--     so, the price is known though the hint is not, and the early game's
--     are still heard first.
--
-- What it writes again: the two rules of v106, `town.next_hint` and
-- `town.buy_hint`, each with a fourth word, the number of chance (a rule
-- draws nothing itself, so that it can be held to lib/town/hints.ts case by
-- case; the three-word ones are dropped: nothing else calls them), and
-- `public.town_hint` (v121's, word for word but for the `random()` it hands
-- the rule). No table, no catalog row, no knob: the list of hints
-- (`hints.ids`) is as it was, and its order now only turns the number of
-- chance into one of them.

/* ── v121 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regclass('public.town_deeds') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 has not run yet: run it first (this file writes its town_hint again)';
  end if;
end $$;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- lib/town/hints.ts's nextHint(): one of those he has that the buyer has
-- neither heard nor found, of what can be made with what is open, of the
-- earliest tier there is one of: which of them by `p_r`, a number from 0 up
-- to 1, in the order they are listed (nothing, less than nothing or no
-- number: the first; 1 or more: the last).
create or replace function town.next_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
returns text language sql stable
as $$
  with cat as materialized (select town.cat('hints')->'ids' as ids, town.cat('items') as items),
  may as (
    select e->>0 as id, ord, (cat.items->(e->>0)->>'tier')::int as tier
      from cat, jsonb_array_elements(cat.ids) with ordinality x(e, ord)
     where (e->>1)::int between 0 and p_stage
       and not coalesce(p_purse->'hints', '[]'::jsonb) ? (e->>0)
       and not coalesce(p_purse->'recipes', '[]'::jsonb) ? (e->>0)
       and not coalesce(p_found, '[]'::jsonb) ? (e->>0)
  ),
  pool as (
    select id, row_number() over (order by ord) as nth, count(*) over () as n
      from may where tier = (select min(tier) from may)
  )
  select id from pool
   where nth = least(n, floor(case when p_r is null or p_r = 'NaN'::double precision or p_r <= 0 then 0 else least(p_r, 1) end * n)::bigint + 1)
$$;

create or replace function town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)
returns jsonb language plpgsql stable
as $$
declare
  hint text := town.next_hint(p_purse, p_found, p_stage, p_r);
  price integer;
begin
  if hint is null then return town.no('none'); end if;
  price := (town.cat('hints')->'price'->>(town.cat('items')->hint->>'tier'))::int;
  if (p_purse->>'coins')::int < price then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'hint', hint, 'purse', p_purse || jsonb_build_object(
    'coins', (p_purse->>'coins')::int - price,
    'hints', coalesce(p_purse->'hints', '[]'::jsonb) || to_jsonb(hint)));
end;
$$;

/* ── buying one: v121's, with the number of chance ───────────────────────── */

-- Buy one of the uncle's hints: which, by chance.
create or replace function public.town_hint()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.buy_hint(purse, town.thing('found', false), (town.thing('village', false)->>'unlocked')::int, random());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'hint', did->>'hint', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric); end if;
  return town.answer(me, did);
end;
$$;

-- (the rules as v106 wrote them, with three words: nothing calls them now)
drop function if exists town.buy_hint(jsonb, jsonb, integer);
drop function if exists town.next_hint(jsonb, jsonb, integer);

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; buying a hint is a member's, as it was.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_hint() from public, anon;
grant execute on function public.town_hint() to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select to_regprocedure('town.next_hint(jsonb, jsonb, integer, double precision)') is not null as by_chance,
--          to_regprocedure('town.buy_hint(jsonb, jsonb, integer, double precision)') is not null as bought_by_chance,
--          to_regprocedure('town.next_hint(jsonb, jsonb, integer)') is null and to_regprocedure('town.buy_hint(jsonb, jsonb, integer)') is null as old_gone;
--   -- true | true | true
--
--   -- two hundred draws for somebody who has heard nothing, with what the shelf has open now: many different hints,
--   -- every one of the early game's
--   select count(distinct x.hint) as different, count(*) as draws,
--          min((town.cat('items')->x.hint->>'tier')::int) as tier_from, max((town.cat('items')->x.hint->>'tier')::int) as tier_to
--     from (select town.next_hint('{}'::jsonb, '[]'::jsonb, (town.thing('village', false)->>'unlocked')::int, random()) as hint from generate_series(1, 200)) x;
--   -- (twenty or more) | 200 | 1 | 1
--
--   select has_function_privilege('authenticated', 'public.town_hint()', 'execute') as hint, has_function_privilege('anon', 'public.town_hint()', 'execute') as hint_anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the hints bought lately, and by whom: members who buy as many no longer have the same ones
--   select d.at, p.character_name, d.thing as hint, d.coins
--     from public.town_deeds d left join public.profiles p on p.id = d.member_id where d.what = 'hint' order by d.at desc limit 40;
--
--   -- how many members have heard each hint
--   select h.hint, count(*) as members from public.town_purses pp, jsonb_array_elements_text(coalesce(pp.doc->'hints', '[]'::jsonb)) h(hint) group by 1 order by 2 desc, 1;
