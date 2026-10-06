-- v153, the kitchen's part: the gifts of its second to sixth ranks (lib/town/gifts; the rules are lib/town/cooking.ts
-- and lib/town/stamina.ts again). Tried on top of v153.shared.sql (try-line.mjs). Safe to run twice.
--
--   * The dimension basket (rank 2): twelve helpings, of any dishes, kept in the purse (`basket`) and in no slot of
--     the bag: put in from the bag, taken back out, eaten straight from it as from the bag.
--   * The whispering spoon (rank 3): asked of what is in the pot, it tells its owner the secret thing of the recipe
--     the pot is on the way to, three times a day; the recipes it has told are kept in the purse (`whispers`).
--
-- No table. No coins and no thing that can be sold comes of any of it.

-- ─── The dimension basket ────────────────────────────────────────────────

-- What a purse keeps in the basket, made sound (lib/town/cooking's basketOf): dishes only, each once, a whole number
-- of helpings of each, in the order they were first put in.
create or replace function town.basket_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  dishes jsonb := town.cat('dishes');
  kept jsonb := '[]'::jsonb;
  seen jsonb := '[]'::jsonb;
  e jsonb;
begin
  if jsonb_typeof(p_purse->'basket') is distinct from 'array' then return kept; end if;
  for e in select t.v from jsonb_array_elements(p_purse->'basket') with ordinality as t(v, ord) order by t.ord loop
    if jsonb_typeof(e) = 'array' and jsonb_array_length(e) = 2 and jsonb_typeof(e->0) = 'string' and dishes ? (e->>0)
       and jsonb_typeof(e->1) = 'number' and (e->>1)::numeric = floor((e->>1)::numeric) and (e->>1)::numeric > 0
       and not seen ? (e->>0) then
      kept := kept || jsonb_build_array(e);
      seen := seen || to_jsonb(e->>0);
    end if;
  end loop;
  return kept;
end;
$$;

-- How many more helpings the basket has room for (basketRoom): none, for whoever has no basket.
create or replace function town.basket_room(p_purse jsonb)
returns integer language sql stable
as $$
  select case when town.gift_works(p_purse, 'thingBasket')
    then greatest(0, (town.cat('gifts')->'gifts'->'thingBasket'->>'by')::numeric
      - coalesce((select sum((e->>1)::numeric) from jsonb_array_elements(town.basket_of(p_purse)) e), 0))::integer
    else 0 end
$$;

-- A basket with so many helpings of a dish out of it (it must hold as many).
create or replace function town.basket_less(p_basket jsonb, p_dish text, p_n numeric)
returns jsonb language sql immutable
as $$
  select coalesce(jsonb_agg(case when t.e->>0 = p_dish then jsonb_build_array(p_dish, (t.e->>1)::numeric - p_n) else t.e end order by t.ord), '[]'::jsonb)
    from jsonb_array_elements(p_basket) with ordinality as t(e, ord)
   where t.e->>0 <> p_dish or (t.e->>1)::numeric > p_n
$$;

-- So many helpings of the dish in a slot of the bag, put into the basket (basketPut).
create or replace function town.basket_put(p_purse jsonb, p_slot integer, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  mine jsonb;
  dish text;
begin
  if not town.gift_works(p_purse, 'thingBasket') or s is null or s = 'null'::jsonb or not (town.cat('dishes') ? (s->>'item')) then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > (s->>'n')::numeric then return town.no('amount'); end if;
  if p_n > town.basket_room(p_purse) then return town.no('full'); end if;
  dish := s->>'item';
  mine := town.basket_of(p_purse);
  return jsonb_build_object('ok', true, 'dish', dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::numeric = p_n then 'null'::jsonb else jsonb_build_object('item', dish, 'n', (s->>'n')::numeric - p_n) end),
    'basket', case when exists (select 1 from jsonb_array_elements(mine) e where e->>0 = dish)
      then (select jsonb_agg(case when t.e->>0 = dish then jsonb_build_array(dish, (t.e->>1)::numeric + p_n) else t.e end order by t.ord)
              from jsonb_array_elements(mine) with ordinality as t(e, ord))
      else mine || jsonb_build_array(jsonb_build_array(dish, p_n)) end));
end;
$$;

-- So many helpings of a dish taken back out of the basket, into the bag (basketTake).
create or replace function town.basket_take(p_purse jsonb, p_dish text, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := town.basket_of(p_purse);
  had numeric := (select (e->>1)::numeric from jsonb_array_elements(mine) e where e->>0 = p_dish limit 1);
begin
  if not town.gift_works(p_purse, 'thingBasket') or had is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > had then return town.no('amount'); end if;
  if town.room(p_purse->'bag', p_dish) < p_n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'dish', p_dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', town.put(p_purse->'bag', p_dish, p_n::integer), 'basket', town.basket_less(mine, p_dish, p_n)));
end;
$$;

-- A helping of a dish begun now, wherever it was taken from (lib/town/stamina's begun): one more of this meal's
-- hours' helpings, and the meal at hand. (town.sit_down, v146's, has the same written in it, and is as it was.)
create or replace function town.begun(p_purse jsonb, p_dish text, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))
                from (select case when x.ord - 1 = m.meal then x.e::int + 1 else x.e::int end as n, x.ord
                        from jsonb_array_elements_text(town.bowls_today(p_purse, p_now)) with ordinality as x(e, ord)) b),
    'eating', jsonb_build_object('dish', p_dish, 'meal', m.meal, 'from', p_now, 'till', p_now, 'got', 0))
    from (select town.meal_of(p_now) as meal) m
$$;

-- Sitting down to a helping of a dish out of the basket (basketEat): as town.sit_down, but that it leaves the basket.
create or replace function town.basket_eat(p_purse jsonb, p_dish text, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := town.basket_of(p_purse);
  bowls jsonb := town.bowls_today(p_purse, p_now);
begin
  if not town.gift_works(p_purse, 'thingBasket') or p_dish is null
     or not exists (select 1 from jsonb_array_elements(mine) e where e->>0 = p_dish) then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (bowls->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', p_dish,
    'purse', p_purse || jsonb_build_object('basket', town.basket_less(mine, p_dish, 1)) || town.begun(p_purse, p_dish, p_now));
end;
$$;

-- ─── The whispering spoon ────────────────────────────────────────────────

-- The recipes whose secret thing the spoon has told somebody, made sound (lib/town/cooking's whispersOf): recipes
-- there are, each once.
create or replace function town.whispers_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  recipes jsonb := town.cat('cooking')->'recipes';
  kept jsonb := '[]'::jsonb;
  e jsonb;
begin
  if jsonb_typeof(p_purse->'whispers') is distinct from 'array' then return kept; end if;
  for e in select t.v from jsonb_array_elements(p_purse->'whispers') with ordinality as t(v, ord) order by t.ord loop
    if jsonb_typeof(e) = 'string' and recipes ? (e #>> '{}') and not kept ? (e #>> '{}') then kept := kept || e; end if;
  end loop;
  return kept;
end;
$$;

-- What the spoon says of some things (spoonSays): of the recipes that have each of them in no smaller an amount,
-- less those p_known names (read whole already), the one nearest done (the fewest things still to go in; of two as
-- near, the first in the catalog's order), its last thing, and how many such recipes there are.
create or replace function town.spoon_says(p_things jsonb, p_known jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('cooking');
  mine jsonb := town.things_of(p_things);
  known jsonb := case when jsonb_typeof(p_known) = 'array' then p_known else '[]'::jsonb end;
  total double precision;
  best record;
begin
  if mine = '{}'::jsonb then return town.no('amount'); end if;
  total := (select sum((m.value #>> '{}')::double precision) from jsonb_each(mine) m);
  with fits as (
    select r.id, r.ord, (select sum(v.value::double precision) from jsonb_each_text(k->'needs'->r.id) v) - total as short
      from jsonb_array_elements_text(k->'recipes') with ordinality r(id, ord)
     where not exists (select 1 from jsonb_each(mine) m
                        where coalesce((k->'needs'->r.id->>m.key)::double precision, 0) < (m.value #>> '{}')::double precision))
  select (select count(*) from fits)::int as all_n,
         (select count(*) from fits f where not known ? f.id)::int as open_n,
         (select f.id from fits f where not known ? f.id order by f.short, f.ord limit 1) as id
    into best;
  if best.all_n = 0 then return town.no('astray'); end if;
  if best.open_n = 0 then return town.no('known'); end if;
  return jsonb_build_object('ok', true, 'of', best.id, 'secret', (town.needs_of(best.id)->-1)->>0, 'ways', best.open_n);
end;
$$;

-- The spoon asked of what is in the pot (spoon): things of one's own bag, as they would be cooked; counted once
-- when it has something to tell, and the recipe is among `whispers` from then on.
create or replace function town.spoon(p_purse jsonb, p_things jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb;
  x jsonb;
  told jsonb;
  says jsonb;
  used jsonb;
begin
  if not town.gift_works(p_purse, 'thingSpoon') then return town.no('none'); end if;
  alls := town.tidy(p_things);
  if jsonb_array_length(alls) = 0 or jsonb_array_length(alls) > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null or ck->'never' ? (items->(x->>0)->>'kind')
       or town.held(p_purse->'bag', x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  if town.used_of(p_purse, 'thingSpoon', p_now) >= (town.cat('gifts')->'uses'->'thingSpoon'->>'n')::integer then return town.no('spent'); end if;
  told := town.whispers_of(p_purse);
  says := town.spoon_says(alls, (case when jsonb_typeof(p_purse->'made') = 'array' then p_purse->'made' else '[]'::jsonb end) || told);
  if not (says->>'ok')::boolean then return says; end if;
  used := town.gift_use(p_purse, 'thingSpoon', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return says || jsonb_build_object('left', used->'left', 'purse', (used->'purse') || jsonb_build_object('whispers', told || to_jsonb(says->>'of')));
end;
$$;

-- ─── What a member does ──────────────────────────────────────────────────

create or replace function public.town_basket_put(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_put(town.purse_of(me, true), p_slot, p_n);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'basket_put', did->>'dish', (did->>'n')::numeric, 0, jsonb_build_object('in', town.basket_of(did->'purse')));
  end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_basket_take(p_dish text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_take(town.purse_of(me, true), p_dish, p_n);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'basket_take', did->>'dish', (did->>'n')::numeric, 0, jsonb_build_object('in', town.basket_of(did->'purse')));
  end if;
  return town.answer(me, did);
end;
$$;

-- (a meal begun is written down as `eat`, as town_sit writes one: this one says where the helping was)
create or replace function public.town_basket_eat(p_dish text, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_eat(town.purse_of(me, true), p_dish, p_seated, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'eat', did->>'dish', 1, 0, jsonb_build_object('from', 'basket'));
  end if;
  return town.answer(me, did);
end;
$$;

-- (what it told goes to whoever asked and to nobody else: the answer, and a line of the town's own log)
create or replace function public.town_spoon(p_things jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  did := town.spoon(town.purse_of(me, true), p_things, town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift_use', 'thingSpoon', 1, 0, jsonb_build_object('left', did->'left', 'of', did->'of', 'ways', did->'ways'));
  end if;
  return town.answer(me, did);
end;
$$;

revoke execute on function public.town_spoon(jsonb) from public, anon;
grant execute on function public.town_spoon(jsonb) to authenticated;
revoke execute on function public.town_basket_put(integer, integer) from public, anon;
grant execute on function public.town_basket_put(integer, integer) to authenticated;
revoke execute on function public.town_basket_take(text, integer) from public, anon;
grant execute on function public.town_basket_take(text, integer) to authenticated;
revoke execute on function public.town_basket_eat(text, boolean) from public, anon;
grant execute on function public.town_basket_eat(text, boolean) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
