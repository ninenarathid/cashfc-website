-- v155 — what the whole village sells fetches less than usual
--
-- Run this once in the Supabase SQL editor, after v131. Running it again is safe. It waits for no code, and no code
-- waits for it: a page shows the price the database tells it.
--
-- Why. The owner, 2026-10-07:
--
--   "การปรับราคาสินค้าขาย ช่วยทำให้ติดลบได้ ถ้ามีการขายสิ่งนั้นมากเกินไป"
--
-- The relatives' price (v124) falls when more of a thing is sold than its usual amount, and rises when less. It could
-- fall from its first day, to two fifths of the usual price; it hardly ever did, because "more than usual" was set
-- where the village does not reach. A thing's usual amount is so many coins' worth a head a round, by its kind, and a
-- head is anybody who has done anything in the town in seven days: 38 that morning, of whom some twenty sell in a
-- round, and nobody sells every thing. Looked at live that morning, two days after v124:
--
--   · of the 253 things whose price moves, 245 stood over their usual price, 2 at it and 6 under (six of the forest's);
--   · kangkong, of which the village had left 383 and 220 in the two rounds before, stood at 130 hundredths; scallion
--     (343, 270) at 124; carrot (157, 89) at 125: the three vegetables sold most;
--   · for everything left in those two rounds the relatives paid some 115 and 111 hundredths of plain prices.
--
-- What it does: the seven usual amounts are halved (a half that is not whole goes up), and nothing else.
--
--   a vegetable                  30 → 15        what the forest gives     15 → 8
--   a fish                       15 → 8         an insect                  7 → 4
--   what else a line brings up   10 → 5         a dish, what else is made 15 → 8   (these do not fall, as before:
--                                                                                   the number is only how soon they rise)
--
-- What stays as v124 has it: the rule itself; the least a price is (two fifths of the usual one, and never under what
-- the thing costs to come by and half as much again: the owner's own limit of 2026-10-05, "ไม่ควรลงเกินกว่าต้นทุนของ
-- สิ่งๆนั่น"); that what is cooked or made does not fall; the most a price is; and its pace, a quarter of itself down
-- in a round at the most and a tenth up.
--
-- What members see, and when. Nothing at the moment it runs: a price is posted for a round, and a lot keeps the price
-- it was left at. From the next turn of a round (07:00 and 19:00) each price moves towards where the halved amounts
-- put it, a quarter of itself at the most: the three vegetables above, at 124 to 130, are a little under their usual
-- price at the first turn (93 to 98, sold as they were the day before) and well under it at the second (74 to 78).
-- With the village selling as it did in those two rounds (the rule played on over the live market: an estimate, since
-- members will sell other things once these fetch less), prices settle about here, in hundredths of the usual one:
--
--   kangkong 68–75 · scallion 70–74 · carrot 64–70 · cabbage 49–54 · catfish 63–69
--   raspberry, blueberry, shiitake 58–63 · chanterelle 49–52 · glow mushroom, wild orchid 40 (the least there is)
--   what few sell (chili, garlic, most fish, most insects, every dish): over its usual price, as now
--
--   20 of the 84 things sold in a day under their usual price, where 10 would be with the amounts left alone; and the
--   relatives paying about four fifths of plain prices for the same things, where they would pay a little over them.
--
-- A knob somebody has turned since stays turned: each is changed only from the number it was given (v124's; v131's
-- for an insect). No table, no function, no row of the catalog; the market's own row is not touched.

do $$ begin
  if (select count(*) from public.town_knobs k
       where k.key in ('market_crop', 'market_fish', 'market_catch', 'market_dish', 'market_goods', 'market_wild', 'market_bug')) <> 7 then
    raise exception 'v155 needs v124: the market''s seven usual amounts are not all there';
  end if;
end $$;

-- ─── The usual amounts, in coins' worth a head a round ─────────────────────
update public.town_knobs set value = 15 where key = 'market_crop'  and value = 30;   -- a vegetable
update public.town_knobs set value = 8  where key = 'market_fish'  and value = 15;   -- a fish
update public.town_knobs set value = 5  where key = 'market_catch' and value = 10;   -- what else a line brings up
update public.town_knobs set value = 8  where key = 'market_dish'  and value = 15;   -- a dish
update public.town_knobs set value = 8  where key = 'market_goods' and value = 15;   -- what else is made
update public.town_knobs set value = 8  where key = 'market_wild'  and value = 15;   -- what the forest gives
update public.town_knobs set value = 4  where key = 'market_bug'   and value = 7;    -- an insect

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select town.market_knobs()->'usual' as usual, (select count(*) from public.town_knobs where key like 'market\_%') as knobs;
--   -- {"bug": 4, "crop": 15, "dish": 8, "fish": 8, "wild": 8, "catch": 5, "goods": 8} | 19
--
--   select town.market_things(town.market_knobs())->'kangkong' as kangkong;
--   -- [5, 40, 150]     (five a head a round are usual where ten were; the least and the most as they were)
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- where the prices stand: how many things under, at and over their usual price (after a round has turned)
--   select count(*) filter (where (e.value->>'f')::int < 100) as under, count(*) filter (where (e.value->>'f')::int = 100) as usual,
--          count(*) filter (where (e.value->>'f')::int > 100) as over
--     from public.town_things t, jsonb_each(t.doc->'at') e where t.key = 'market';
--
--   -- the things sold most in the round that ended last: how many, the price they had in it, and the price they have now
--   select e.key as thing, (e.value->>1)::numeric as sold, (e.value->>0)::int as price_then, (m.doc->'at'->e.key->>'f')::int as price_now
--     from public.town_market_log l, jsonb_each(l.doc) e, public.town_things m
--    where l.round = (select max(round) from public.town_market_log) and m.key = 'market' and (e.value->>1)::numeric > 0
--    order by (e.value->>1)::numeric * coalesce((town.cat('items')->e.key->>'pays')::numeric, 0) desc limit 20;
