-- v169 — more picks and axes on the uncle's shelf: sixty of each a round, where there were six
--
-- Run this once in the Supabase SQL editor, after v164 (it stops at its first line without v164's pick). Running it
-- again is safe. It may run before or after the site's own code for it: the shelf a member sees and what the uncle
-- sells are the database's either way.
--
-- Why. The owner, 2026-10-09, the evening the mountain opened: "เพิ่มโควต้าอีเต้อกับขวานต่อวันให้หน่อย". The pick and
-- the axe were stocked as the hoe is: six a round for the whole village, a round twice a day. Mining wants a pick in
-- the hand and felling an axe, the uncle is the only one who has them, and some fifty-eight members have a purse: at
-- six a round twelve of them a day could begin either line. Sixty a round is every purse there is in one round. (The
-- number is the builders': both AIs were asked, one said thirty and the other sixty.) Still one a member a round,
-- and fifty coins as before: a tool is bought once and kept.
--
-- What it does: two numbers of the catalog's `goods` row, `pick.stock` and `axe.stock`, each written by itself (the
-- row is every thing the uncle sells, and written whole it would take back whatever another file gave it between
-- this one being made and being run). What is left on the shelf this round is counted from the new number at once.
--
-- No table, no column, no function, no coins.

do $$ begin
  if not coalesce((select c.data ? 'pick' and c.data ? 'axe' from public.town_catalog c where c.key = 'goods'), false) then
    raise exception 'v169 needs v164: the uncle''s shelf has no pick and no axe yet';
  end if;
end $$;

update public.town_catalog c
   set data = jsonb_set(jsonb_set(c.data, '{pick,stock}', '60'::jsonb), '{axe,stock}', '60'::jsonb), updated_at = now()
 where c.key = 'goods' and (c.data->'pick'->>'stock' is distinct from '60' or c.data->'axe'->>'stock' is distinct from '60');

-- What it should say afterwards:
--
--   select data->'pick' as pick, data->'axe' as axe, data->'hoe' as hoe from public.town_catalog where key = 'goods';
--   -- {"each": 1, "price": 50, "stock": 60} | {"each": 1, "price": 50, "stock": 60} | {"each": 1, "price": 50, "stock": 6}
