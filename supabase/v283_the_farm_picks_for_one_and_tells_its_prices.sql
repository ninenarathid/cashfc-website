-- v283: picking for one stamina, the farm's pouch of thirty slots, and every crop's price told at the farm (2026-10-19).
-- Run after v281, in any order with v282 (the forge row) and v284 (more beds: farming.bedsAt), with the matching site code:
-- lib/town/farm (FARMING.costs.pick), lib/town/pouches (thingPouch's slots), lib/town/keeper (farmPrices),
-- components/town/TownQuality and TownTrade. Safe to run twice.
--
-- Members, 2026-10-19: "ราคาพืชผักใน cash town ตกต่ำมาก", "ไม่มีที่เก็บ", "เช็คราคาก่อนเก็บไม่ได้", "แค่เก็บผักตอนเช้า stamina
-- ก็หมดแล้ว". The owner, the same morning: "แสดงราคาที่ฟาร์ม ให้เห็นราคาตอนนี้ ราคาของแต่ละเกรด", "ลด stamina ตอนเก็บผัก
-- จาก 2 เป็น 1 ทำอันนี้ด้วย", "กระเป๋าฟาร์ม แก้เป็น 30 ช่องไปเลย".
--   * The catalog's `farming` row, its `costs.pick` alone: a picking costs 1 stamina, where it cost 2. Every picking reads the number there
--     (town.pick, town.row_tend, town.garden_harvest): no function changes.
--   * The catalog's `pouches` row, thingPouch's `slots` alone: the spellbound seed pouch (thingPouch, the farming line's third rank) has 30 slots,
--     where it had 6. town.pouches_of reads the number; what is in the first six stays where it is.
--   * public.town_farm_prices(), new, read only: every crop's price this round, as town.prices_told tells the price of
--     a thing one holds, without the seven days gone by (`was` is empty), for the plant inspector and the seed card.
--     For members only, as every other asking of the town.
begin;

-- (only the two numbers, each by its own path: the rest of each row is as the database has it, so that another
-- file that writes other keys of them, before or after this one, keeps what it wrote: v284 lays more beds in
-- farming.bedsAt, fcnext-16, 2026-10-19)
update public.town_catalog
   set data = jsonb_set(data, '{costs,pick}', '1'::jsonb), updated_at = now()
 where key = 'farming' and data->'costs'->'pick' is distinct from '1'::jsonb;
update public.town_catalog c
   set data = (select jsonb_agg(case when e->>'gift' = 'thingPouch' then jsonb_set(e, '{slots}', '30'::jsonb) else e end order by i)
                 from jsonb_array_elements(c.data) with ordinality x(e, i)),
       updated_at = now()
 where c.key = 'pouches'
   and exists (select 1 from jsonb_array_elements(c.data) e where e->>'gift' = 'thingPouch' and e->'slots' is distinct from '30'::jsonb);

create or replace function public.town_farm_prices()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
-- v283: every crop's price this round, for the farm (the owner, 2026-10-19). Read only; the market is brought to the
-- round as town.prices_told brings it.
declare
  me uuid := town.member();
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  items jsonb := town.cat('items');
  told jsonb;
begin
  select coalesce(jsonb_object_agg(t.id, jsonb_build_object(
      'f', town.factor_of(market, t.id), 'floor', (things->t.id->>1)::int, 'ceil', (things->t.id->>2)::int,
      'base', (things->t.id->>4)::numeric, 'demand', town.market_demand(t.id, cur),
      'demandTrend', sign(town.market_demand(t.id, cur) - town.market_demand(t.id, cur - 1))::int,
      'was', '[]'::jsonb)), '{}'::jsonb)
    into told
    from jsonb_object_keys(things) t(id)
   where items->t.id->>'kind' = 'crop';
  return jsonb_build_object('farmPrices', jsonb_build_object('round', cur, 'things', told));
end;
$function$;
revoke all on function public.town_farm_prices() from public, anon;
grant execute on function public.town_farm_prices() to authenticated;

commit;

-- What it should say afterwards:
--   select data->'costs'->>'pick' from public.town_catalog where key = 'farming';                                   -- 1
--   select e->>'slots' from public.town_catalog c, jsonb_array_elements(c.data) e where c.key = 'pouches' and e->>'gift' = 'thingPouch';  -- 30
--   select count(*) from jsonb_object_keys((public.town_farm_prices())->'farmPrices'->'things');  -- every crop whose price moves (as a member)
