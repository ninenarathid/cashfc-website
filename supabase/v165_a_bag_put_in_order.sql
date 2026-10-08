-- v165 — a bag put in order
--
-- Run this once in the Supabase SQL editor, after v159 (it stands on v106's
-- bag and v115's `town.member`, and on nothing of v160 to v164, which may run
-- before it or after it). Running it again is safe. The site's code for it
-- may be live before this runs or after: until it has run, the bag offers
-- neither of the two things below.
--
-- Why. A member, by way of the owner, 2026-10-08:
--
--   "ขอ function sort ของในกระเป๋า และ ลากวางได้"
--
-- and the owner, of how it was put to him (sorted by kind with split stacks
-- brought together; a thing dragged into an empty slot moves, onto another
-- thing changes places with it, onto more of itself joins it):
--
--   "ตามที่เสนอ ทำได้เลย"
--
-- A bag's slots are kept here, in a member's purse, so putting them in order
-- is this database's to do: a page cannot be let write a bag.
--
--   · A thing moved goes into an empty slot; onto more of the same thing it
--     joins it, as far as a slot holds, and what does not fit stays where it
--     was; onto anything else the two change places.
--   · Sorted, the bag has its things from its first slot on with no gap: by
--     kind (tools, seed, bait, what is grown, fish, what else a line brings
--     up, the forest's, insects, staples, what is made, dishes, scrolls),
--     then the early game's things first, then by the thing; split stacks of
--     one thing are brought together into as few slots as hold them.
--   · What holds something (a pot its food, a can or a bucket its water) is
--     never joined to another, and keeps what it holds wherever it goes.
--   · Nothing is made and nothing is lost by either; the bag has as many
--     slots as it had; what is in the hand is in the hand still (the hand is
--     a kind of thing, not a slot).
--
-- The rules are lib/town/bag.ts again (`moveSlot`, `sortBag`), held to the
-- code case by case by this file's dry run.
--
-- What it adds: three functions of the rules' (`town.bag_joins`,
-- `town.bag_move`, `town.bag_sort`) and three a member's page calls
-- (`town_bag`, which says only that a bag can be put in order here;
-- `town_bag_move(p_from, p_to)`; `town_bag_sort()`). No table, no row, no
-- knob; nothing that was there is written again.
--
-- Neither is written down among the deeds (`town_deeds`): a bag's order
-- gives nobody anything and takes nothing, and a line for every thing
-- dragged would bury what the deeds are read for.

do $$ begin
  if to_regprocedure('town.member()') is null or to_regprocedure('town.purse_of(uuid, boolean)') is null or to_regprocedure('town.keep_purse(uuid, jsonb)') is null then
    raise exception 'v165 stands on the town''s bag and its members (v106, v115): run those first';
  end if;
end $$;

-- ─── 1. The rules (lib/town/bag.ts) ─────────────────────────────────────

-- Whether a stack may be joined to more of its thing: of a thing more than
-- one of which go in a slot, and with nothing hung on it but what it is and
-- how many (a pot's food and a can's water today; whatever a later file
-- hangs on a stack keeps it whole too, with nothing to be written here).
-- (`joins`.)
create or replace function town.bag_joins(p_stack jsonb)
returns boolean language sql stable set search_path = public
as $$
  select coalesce((town.cat('items')->(p_stack->>'item')->>'stack')::int, 1) > 1
     and not exists (select 1 from jsonb_each(p_stack) e
                     where e.key not in ('item', 'n') and e.value not in ('null'::jsonb, '0'::jsonb, 'false'::jsonb, '""'::jsonb))
$$;

-- A thing moved from one slot to another. Refused ('none') for a slot the bag
-- has not, the same slot twice, or an empty slot to move from. (`moveSlot`.)
create or replace function town.bag_move(p_purse jsonb, p_from integer, p_to integer)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  bag jsonb := p_purse->'bag';
  slots integer := coalesce(jsonb_array_length(p_purse->'bag'), 0);
  a jsonb;
  b jsonb;
  stack integer;
  more integer;
begin
  if p_from is null or p_to is null or p_from < 0 or p_to < 0 or p_from >= slots or p_to >= slots or p_from = p_to then return town.no('none'); end if;
  a := bag->p_from;
  b := bag->p_to;
  if a is null or a = 'null'::jsonb then return town.no('none'); end if;
  stack := coalesce((town.cat('items')->(a->>'item')->>'stack')::int, 1);
  if b is not null and b <> 'null'::jsonb and b->>'item' = a->>'item' and town.bag_joins(a) and town.bag_joins(b) and (b->>'n')::int < stack then
    more := least((a->>'n')::int, stack - (b->>'n')::int);
    bag := jsonb_set(bag, array[p_to::text], b || jsonb_build_object('n', (b->>'n')::int + more));
    bag := jsonb_set(bag, array[p_from::text], case when (a->>'n')::int = more then 'null'::jsonb else a || jsonb_build_object('n', (a->>'n')::int - more) end);
  else
    bag := jsonb_set(bag, array[p_to::text], a);
    bag := jsonb_set(bag, array[p_from::text], case when b is null then 'null'::jsonb else b end);
  end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag));
end;
$$;

-- The bag sorted. It is never refused: a bag in order already comes back as
-- it was. (`sortBag`; the names of things are told apart letter by letter,
-- as the code tells them: collate "C". Two stacks alike in all that is looked
-- at stay as they stood, the one before the other: `was`.)
create or replace function town.bag_sort(p_purse jsonb)
returns jsonb language sql stable set search_path = public
as $$
  with held as (
    select s.v as stack, s.i::int as was
    from jsonb_array_elements(coalesce(p_purse->'bag', '[]'::jsonb)) with ordinality as s(v, i)
    where s.v <> 'null'::jsonb
  ),
  loose as (   -- what joins: one sum a thing, and how many go in a slot
    select h.stack->>'item' as item, sum((h.stack->>'n')::int)::int as n,
           max((town.cat('items')->(h.stack->>'item')->>'stack')::int) as most
    from held h where town.bag_joins(h.stack) group by h.stack->>'item'
  ),
  whole as (
    select h.stack, h.was from held h where not town.bag_joins(h.stack)
    union all
    select jsonb_build_object('item', l.item, 'n', least(l.most, l.n - g.k * l.most)), 1000000 + g.k
    from loose l cross join lateral generate_series(0, (l.n - 1) / l.most) as g(k)
  ),
  placed as (
    select w.stack, row_number() over (order by
      coalesce(array_position(array['tool', 'seed', 'bait', 'crop', 'fish', 'catch', 'wild', 'bug', 'staple', 'goods', 'dish', 'scroll'], i.it->>'kind'), 99),
      coalesce((i.it->>'tier')::int, 9),
      (w.stack->>'item') collate "C",
      coalesce(w.stack->'of'->>'dish', '') collate "C",
      coalesce((w.stack->'of'->>'left')::numeric, 0) desc,
      coalesce((w.stack->>'water')::numeric, 0) desc,
      (w.stack->>'n')::int desc,
      w.was
    ) - 1 as at
    from whole w cross join lateral (select town.cat('items')->(w.stack->>'item') as it) i
  )
  select p_purse || jsonb_build_object('bag', coalesce((
    select jsonb_agg(coalesce(p.stack, 'null'::jsonb) order by g.i)
    from generate_series(0, jsonb_array_length(coalesce(p_purse->'bag', '[]'::jsonb)) - 1) as g(i)
    left join placed p on p.at = g.i), '[]'::jsonb))
$$;

-- ─── 2. What a member's page calls ───────────────────────────────────────

-- That a bag can be put in order here: asked once as the game begins, so
-- that the page offers nothing this database would not do.
create or replace function public.town_bag()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('ok', me is not null, 'tidy', true, 'now', town.now_ms());
end;
$$;

create or replace function public.town_bag_move(p_from integer, p_to integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.bag_move(town.purse_of(me, true), p_from, p_to);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_bag_sort()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.bag_sort(town.purse_of(me, true));
begin
  perform town.keep_purse(me, purse);
  return town.answer(me, jsonb_build_object('ok', true));
end;
$$;

-- ─── 3. Who may ──────────────────────────────────────────────────────────

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_bag() from public, anon;
revoke execute on function public.town_bag_move(integer, integer) from public, anon;
revoke execute on function public.town_bag_sort() from public, anon;
grant execute on function public.town_bag() to authenticated;
grant execute on function public.town_bag_move(integer, integer) to authenticated;
grant execute on function public.town_bag_sort() to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
-- select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_bag%' order by 1;
--   town_bag
--   town_bag_move
--   town_bag_sort
--
-- select has_function_privilege('anon', 'public.town_bag_sort()', 'execute') as anon,
--        has_function_privilege('authenticated', 'public.town_bag_sort()', 'execute') as member,
--        has_function_privilege('authenticated', 'town.bag_sort(jsonb)', 'execute') as the_rule;
--   anon | member | the_rule
--   f    | t      | f
--
-- select town.bag_sort('{"bag":[{"item":"kangkong","n":5},null,{"item":"hoe","n":1},{"item":"kangkong","n":18},{"item":"worm","n":2}]}'::jsonb)->'bag';
--   [{"n": 1, "item": "hoe"}, {"n": 2, "item": "worm"}, {"n": 20, "item": "kangkong"}, {"n": 3, "item": "kangkong"}, null]
--
-- select town.bag_move('{"bag":[{"item":"hoe","n":1},null]}'::jsonb, 0, 1)->'purse'->'bag';
--   [null, {"n": 1, "item": "hoe"}]
