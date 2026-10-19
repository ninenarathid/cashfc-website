-- v285: crops keep a deeper market, a lower ceiling and a slower fall; the farm tells the village's usual amount (2026-10-19).
-- Run after v283 (it writes v283's public.town_farm_prices again). In any order with v284 (more beds). Safe to run twice
-- (the second finds every function written and changes nothing). With the matching site code: lib/town/market
-- (MARKET.cropAnchor, cropCeil, cropFall; thingOf, next, farmPricesOf), components/town/TownQuality.
--
-- Members, 2026-10-19: "ขายผลผลิตไปแค่ไม่กี่ครั้ง ราคาก้ตกหนักมากแล้ว". Read live the same day (14 days, 28 rounds, about
-- forty heads): a crop's usual amount was its coins' worth (15 a head a round) in pieces, so the village took two hundred
-- kangkong a round at their usual price and five bottle gourds, blue corn or trellis berries; one member's harvest (46
-- bottle gourds in one round, 61 red okra in another) halved such a price for everybody, and an unsold crop stood at
-- twice its price (the buyers' interest, 2×, up to 200 or 220) to fall 40% a round at the first sales. The owner: "1-3
-- เอา" (the three below), "ยังไม่ปิด แต่ให้ตกช้ากว่านี้หน่อย" (the buyers' interest stays; a crop falls slower),
-- "เพิ่มเฉพาะ สายปลูกผัก เพราะสายนี้ ต้องลงทุนเงิน และ เวลาเยอะ" (crops only).
--   1. town.market_things: a crop dearer than `market_crop_anchor` (3) coins is usual in sqrt(pays / anchor) times the
--      pieces its coins' worth says (at forty heads a round: kangkong 200 as before, tomato 122 where 75, red okra 53
--      where 14, pumpkin 33, bottle gourd 31, blue corn 27, trellis berry 25 where 5); its ceiling is `market_crop_ceil`
--      (150) whatever its tier; and it carries its own fall, `market_crop_fall` (25), as a sixth number.
--   2. town.market_rolled: a thing that carries its own fall moves by it (crops); every other thing as before (40).
--   3. town.market_knobs: the three knobs (new rows below, the admin's to change).
--   4. town.market_now: the heads the village was counted as when the round turned are kept with the market (`heads`),
--      so the farm can tell a usual amount without counting them again at every asking.
--   5. public.town_farm_prices (v283's): each crop's usual amount for the whole village a round (`usual`, whole pieces)
--      and what has been left with the uncle so far this round (`selling`).
-- Fish, the forest's things, insects, dishes and goods: nothing changes. Each function of 1–4 is written again from its
-- own live text with only those lines changed (the file stops if a line is not there exactly once: then the function
-- has moved since v253 and this file is to be built again). Grants and owners stay as they are.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

insert into public.town_knobs (key, value) values
  ('market_crop_anchor', 3),  -- a crop dearer than this many coins is usual in sqrt(pays / anchor) times its coins' worth in pieces
  ('market_crop_ceil', 150),  -- the most a crop's price rises to, in hundredths of its usual price, whatever its tier
  ('market_crop_fall', 25)    -- how far a crop's price falls in a round at the most, in hundredths of itself
  on conflict (key) do nothing;

do $v285$
declare
  d text;
  n integer;
  olds text[];
  news text[];
  o text;
begin
  -- ── 3. town.market_knobs: the crops' three knobs ──
  d := replace(pg_get_functiondef('town.market_knobs()'::regprocedure), chr(13), '');
  if position('v285' in d) > 0 then raise notice 'v285: town.market_knobs is written already';
  else
    olds := array[$o1$    'minVolume', coalesce((k.v->>'min_volume')::int, 5),$o1$];
    news := array[$n1$    'minVolume', coalesce((k.v->>'min_volume')::int, 5),
    -- v285: a crop's own usual amount, ceiling and fall (lib/town/market's cropAnchor, cropCeil, cropFall)
    'cropAnchor', coalesce((k.v->>'crop_anchor')::int, 3), 'cropCeil', coalesce((k.v->>'crop_ceil')::int, 150), 'cropFall', coalesce((k.v->>'crop_fall')::int, 25),$n1$];
    for i in 1 .. array_length(olds, 1) loop
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v285: town.market_knobs has % of the lines it changes ("%"), not one: it has moved since v253, rebuild v285', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;

  -- ── 1. town.market_things: a crop's usual amount, ceiling and fall ──
  d := replace(pg_get_functiondef('town.market_things(jsonb)'::regprocedure), chr(13), '');
  if position('v285' in d) > 0 then raise notice 'v285: town.market_things is written already';
  else
    olds := array[
$o1$      (p_k->'usual'->>t.kind)::double precision / t.pays,$o1$,
$o2$      coalesce((p_k->'ceil'->>(t.tier - 1))::int, (p_k->'ceil'->>-1)::int),$o2$,
$o3$      t.pays)), '{}'::jsonb)$o3$];
    news := array[
$n1$      -- v285: a crop dearer than the anchor is usual in sqrt(pays / anchor) times its coins' worth in pieces
      (p_k->'usual'->>t.kind)::double precision / t.pays
        * case when t.kind = 'crop' then greatest(1, sqrt(t.pays / coalesce((p_k->>'cropAnchor')::double precision, 3))) else 1 end,$n1$,
$n2$      case when t.kind = 'crop' then coalesce((p_k->>'cropCeil')::int, 150)
           else coalesce((p_k->'ceil'->>(t.tier - 1))::int, (p_k->'ceil'->>-1)::int) end,$n2$,
$n3$      t.pays,
      -- v285: a crop's own fall, the sixth (null for every other thing)
      case when t.kind = 'crop' then coalesce((p_k->>'cropFall')::int, 25) end)), '{}'::jsonb)$n3$];
    for i in 1 .. array_length(olds, 1) loop
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v285: town.market_things has % of the lines it changes ("%"), not one: it has moved since v253, rebuild v285', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;

  -- ── 2. town.market_rolled: a thing's own fall ──
  d := replace(pg_get_functiondef('town.market_rolled(jsonb,integer,integer,jsonb,jsonb)'::regprocedure), chr(13), '');
  if position('v285' in d) > 0 then raise notice 'v285: town.market_rolled is written already';
  else
    olds := array[$o1$         p_k||jsonb_build_object('demand',town.market_demand(e.key,start_+i+1))) as nx$o1$];
    news := array[$n1$         -- v285: a thing that carries its own fall (a crop: market_things' sixth) moves by it
         p_k||jsonb_build_object('demand',town.market_demand(e.key,start_+i+1))||jsonb_strip_nulls(jsonb_build_object('fall',e.value->5))) as nx$n1$];
    for i in 1 .. array_length(olds, 1) loop
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v285: town.market_rolled has % of the lines it changes ("%"), not one: it has moved since v253, rebuild v285', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;

  -- ── 4. town.market_now: the heads kept with the market ──
  d := replace(pg_get_functiondef('town.market_now()'::regprocedure), chr(13), '');
  if position('v285' in d) > 0 then raise notice 'v285: town.market_now is written already';
  else
    olds := array[
$o1$  entry jsonb;
begin$o1$,
$o2$  did := town.market_rolled(market, cur, town.market_heads(k), town.market_things(k), k);$o2$,
$o3$  perform town.keep_thing('market', did->'market');
  return did->'market';$o3$];
    news := array[
$n1$  entry jsonb;
  heads_ integer; -- v285: kept with the market, for the farm's usual amounts (public.town_farm_prices)
begin$n1$,
$n2$  heads_ := town.market_heads(k);
  did := town.market_rolled(market, cur, heads_, town.market_things(k), k);$n2$,
$n3$  perform town.keep_thing('market', (did->'market') || jsonb_build_object('heads', heads_));
  return (did->'market') || jsonb_build_object('heads', heads_);$n3$];
    for i in 1 .. array_length(olds, 1) loop
      o := replace(olds[i], chr(13), '');
      n := (length(d) - length(replace(d, o, ''))) / length(o);
      if n <> 1 then raise exception 'v285: town.market_now has % of the lines it changes ("%"), not one: it has moved since v253, rebuild v285', n, left(o, 50); end if;
      d := replace(d, o, replace(news[i], chr(13), ''));
    end loop;
    execute d;
  end if;
end
$v285$;

-- ── 5. public.town_farm_prices: the village's usual amount and what is left so far, a crop ──
create or replace function public.town_farm_prices()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
-- v283: every crop's price this round, for the farm (the owner, 2026-10-19). Read only; the market is brought to the
-- round as town.prices_told brings it.
-- v285: and each crop's usual amount for the whole village a round (`usual`, at the heads the market was counted as
-- when the round turned; counted here only before the first turn after v285), and what has been left so far (`selling`).
declare
  me uuid := town.member();
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  items jsonb := town.cat('items');
  heads_ integer := coalesce((market->>'heads')::int, town.market_heads(k));
  told jsonb;
begin
  select coalesce(jsonb_object_agg(t.id, jsonb_build_object(
      'f', town.factor_of(market, t.id), 'floor', (things->t.id->>1)::int, 'ceil', (things->t.id->>2)::int,
      'base', (things->t.id->>4)::numeric, 'demand', town.market_demand(t.id, cur),
      'demandTrend', sign(town.market_demand(t.id, cur) - town.market_demand(t.id, cur - 1))::int,
      'was', '[]'::jsonb,
      'usual', floor(greatest((things->t.id->>0)::double precision * heads_, (things->t.id->>3)::double precision) + 0.5)::int,
      'selling', coalesce((market->'sold'->>t.id)::numeric, 0))), '{}'::jsonb)
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
--   select key, value from public.town_knobs where key like 'market_crop_%' order by key;          -- anchor 3, ceil 150, fall 25
--   select position('v285' in pg_get_functiondef('town.market_things(jsonb)'::regprocedure)) > 0,
--          position('v285' in pg_get_functiondef('town.market_rolled(jsonb,integer,integer,jsonb,jsonb)'::regprocedure)) > 0,
--          position('v285' in pg_get_functiondef('town.market_now()'::regprocedure)) > 0;        -- true, true, true
--   select (town.market_things(town.market_knobs())->'bottleGourd'); -- [0.7745…, 40, 150, 5, 125, 25]
