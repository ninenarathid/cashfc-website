-- v113 — a bigger bag
--
-- Run this once in the Supabase SQL editor, after v112. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. The owner, 2026-10-04: "เพิ่ม กระเป๋าเริ่มต้น
-- จาก 5 เป็น 10 ช่อง". A bag begins with ten slots where it began with five.
--
-- Two things, because a number that was seeded is the database's (v106):
--
--   · The catalog's `rules` row is written over with what the code has now:
--     ten slots to begin with. Its other two numbers (the hours of the
--     uncle's rounds, the hour a day begins) are as they were. A purse that
--     has not been used yet is made from this row, so every new one has ten.
--   · A purse kept from when bags began smaller is given the slots it lacks
--     as it is read (`town.roomy`, lib/town/trade.ts's roomy()): at the end
--     of its bag, what is in it staying where it is; as many as a bag begins
--     with, and as many again as what is worn carries. Nobody has a purse
--     today (the game is not open), so this changes nothing now. It is here
--     so that the next time the number is raised, raising it is enough.
--
-- No bag is ever made smaller by this: one that is bigger than it need be
-- (a number lowered again one day) is left alone.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v113> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('rules', $town${
    "slots": 10,
    "rounds": [7,19],
    "dawn": 5
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v113>

/* ── the rule ────────────────────────────────────────────────────────────── */

-- roomy(): a bag as big as bags are now.
create or replace function town.roomy(p_purse jsonb)
returns jsonb language sql stable
as $$
  select case when w.want > jsonb_array_length(p_purse->'bag')
    then p_purse || jsonb_build_object('bag', (p_purse->'bag')
      || (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_purse->'bag'))))
    else p_purse end
    from (select (town.cat('rules')->>'slots')::int + coalesce((
                   select sum((c.carries->>(x.v #>> '{}'))::int)
                     from jsonb_array_elements(coalesce(p_purse->'wears', '[]'::jsonb)) x(v), (select town.cat('carries') as carries) c), 0)::int as want) w
$$;

/* ── keeping a purse ─────────────────────────────────────────────────────── */

-- v107's purse_kept, with one thing more: the bag is as big as bags are now.
create or replace function town.purse_kept(p_member uuid, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  coins integer;
  doc jsonb;
  left_ record;
begin
  if p_hold then
    insert into public.town_purses (member_id) values (p_member) on conflict (member_id) do nothing;
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member for update;
  else
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member;
  end if;
  select l.profile_left, l.gallery_left into left_ from public.town_popoto_left(p_member) l;
  return town.roomy(coalesce(doc, town.fresh())) || jsonb_build_object(
    'coins', coalesce(coins, 0),
    'popoto', jsonb_build_object('profile', coalesce(left_.profile_left, 0), 'gallery', coalesce(left_.gallery_left, 0)),
    'changed', jsonb_build_object('week', town.week_of(now_), 'n', coalesce((
      select sum(e.popoto) from public.town_exchanges e
       where e.member_id = p_member
         and e.week = date_trunc('week', to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::date), 0)::int));
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select data from public.town_catalog where key = 'rules';
--   -- {"dawn": 5, "slots": 10, "rounds": [7, 19]}
--
--   select jsonb_array_length(town.fresh()->'bag') as a_new_bag;
--   -- 10
--
--   select jsonb_array_length(town.roomy('{"bag": [null, null, null, null, null], "wears": ["basket"]}'::jsonb)->'bag') as an_old_bag_with_a_basket_worn;
--   -- 15
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- false | 0
