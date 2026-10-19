-- v292: every dish twenty to a slot (the owner, 2026-10-20: "ช่วยทำให้ให้ จานstack กันได้ ซัก 20 ใบ").
--
-- Run after v290. Safe to run twice. Either order with the page is safe: the database decides how much a slot holds,
-- and a page of before or after shows what it is told.
--
-- What it changes: the catalog's `items` row, the `stack` of every thing of kind "dish" (most were 5, a few 10; 34
-- were 20 already), lib/town/items' DISH_STACK. Nothing else in the row changes, and no other row is touched. A pot of
-- food is a tool, and stays one to a slot. It goes by kind rather than by a list of names, so a dish added by a file
-- that runs later (the animals' v291) is caught if this is run again after it.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '10s';
do $$ begin
  if town.reward_relay_place('[60,79]'::jsonb) is distinct from 'town' then raise exception 'Run v290 before v292'; end if;
end $$;

-- ── 1. Every dish, twenty to a slot ────────────────────────────────────────────────────────────────────────────────────
update public.town_catalog set data = (select jsonb_object_agg(k, case when v->>'kind' = 'dish' then jsonb_set(v, '{stack}', '20'::jsonb) else v end)
                                         from jsonb_each(data) e(k, v)), updated_at = now()
 where key = 'items' and exists (select 1 from jsonb_each(data) e(k, v) where v->>'kind' = 'dish' and v->'stack' is distinct from '20'::jsonb);

-- ── 2. As it is meant to be, or nothing of this stays ──────────────────────────────────────────────────────────────────
do $$
declare d integer; off integer;
begin
  select count(*), count(*) filter (where v->'stack' is distinct from '20'::jsonb) into d, off
    from public.town_catalog c, jsonb_each(c.data) e(k, v) where c.key = 'items' and v->>'kind' = 'dish';
  if d < 150 or off > 0 then raise exception 'v292: % dishes, % of them not twenty to a slot', d, off; end if;
  -- (the things around them as they were: a bowl three, a rod one, a pot of food one, water spinach forty)
  if (select data->'bowl'->'stack' from public.town_catalog where key = 'items') is distinct from '3'::jsonb
     or (select data->'rod'->'stack' from public.town_catalog where key = 'items') is distinct from '1'::jsonb
     or (select data->'potFull'->'stack' from public.town_catalog where key = 'items') is distinct from '1'::jsonb
     or (select data->'kangkong'->'stack' from public.town_catalog where key = 'items') is distinct from '40'::jsonb
  then raise exception 'v292: a thing that is no dish has changed'; end if;
end $$;
commit;

-- After it has run, in the SQL editor (answers 150 or more · 0 · 20):
--   select count(*) dishes, count(*) filter (where v->'stack' is distinct from '20'::jsonb) not_twenty, max((v->>'stack')::int)
--     from public.town_catalog c, jsonb_each(c.data) e(k, v) where c.key = 'items' and v->>'kind' = 'dish';
