-- v153, the kitchen's part: the gifts of its second to sixth ranks (lib/town/gifts; the rules are lib/town/cooking.ts
-- and lib/town/stamina.ts again). Tried on top of v153.shared.sql (try-line.mjs). Safe to run twice.
--
--   * The dimension basket (rank 2): twelve helpings, of any dishes, kept in the purse (`basket`) and in no slot of
--     the bag: put in from the bag, taken back out, eaten straight from it as from the bag.
--   * The whispering spoon (rank 3): asked of what is in the pot, it tells its owner the secret thing of the recipe
--     the pot is on the way to, three times a day; the recipes it has told are kept in the purse (`whispers`).
--   * The hearth sprite (rank 4, a familiar): while it follows its member, a recipe they have made before is cooked
--     with no game, its full helpings and one more, three pots to a meal's hours. `town_cook` (v111's, as v121 and
--     v129 left it) is written again but for the lines meant: it is told how the pot was cooked with the game's own
--     account (`p_timing.sprite`), and cooks by `town.cook_with`, which is `town.cook` with the gifts laid over it.
--     A pot the sprite cooks is written down as a go at the game won, as ever, so the line counts it as it counts any.
--   * The stardust spice (rank 5): sprinkled on a bowl as it is begun (out of the bag or the basket), once a day;
--     eaten up, that bowl's buff is at the fourth level at once. Which meal was sprinkled is kept in the purse
--     (`spiced`, by the moment the meal began). `town.chew` (v146's) is written again but for one line: the buff a
--     meal leaves is raised by `town.raised_to`, which is `town.raised` with a level it is at once at the least.
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

-- ─── The hearth sprite ───────────────────────────────────────────────────

-- Things put together as town.cook does, with what the kitchen's later gifts change of it (lib/town/cooking's
-- cookWith). p_how.sprite: by the hearth sprite, with no game: only while it follows, only a recipe made before,
-- counted, as a pot stirred with no miss, and so many helpings more in the pot (the pot that was not in the bag
-- before). What refuses a pot cooked by hand refuses this one, with nothing lost and nothing counted.
create or replace function town.cook_with(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint, p_how jsonb)
returns jsonb language plpgsql stable
as $$
declare
  recipe text;
  used jsonb;
  did jsonb;
  more integer;
  at_ integer;
begin
  if p_how->'sprite' is distinct from 'true'::jsonb then return town.cook(p_purse, p_things, p_crew, p_misses, p_now); end if;
  if not town.gift_works(p_purse, 'famSprite') then return town.no('none'); end if;
  recipe := town.made_of(p_things);
  if recipe is null or not (case when jsonb_typeof(p_purse->'made') = 'array' then p_purse->'made' else '[]'::jsonb end) ? recipe then return town.no('unmade'); end if;
  used := town.gift_use(p_purse, 'famSprite', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  did := town.cook(used->'purse', p_things, p_crew, 0, p_now);
  if not (did->>'ok')::boolean then return did; end if;
  more := (town.cat('gifts')->'gifts'->'famSprite'->>'by')::integer;
  select (s.ord - 1)::int into at_ from jsonb_array_elements(did->'purse'->'bag') with ordinality s(v, ord)
   where s.v->>'item' = 'potFull' and s.v->'of'->>'dish' = did->>'made' and coalesce(p_purse->'bag'->((s.ord - 1)::int)->>'item', '') <> 'potFull'
   order by s.ord limit 1;
  if at_ is null then return did || '{"sprite": true}'::jsonb; end if;
  return did || jsonb_build_object('sprite', true, 'n', (did->>'n')::int + more,
    'purse', jsonb_set(did->'purse', array['bag', at_::text, 'of', 'left'], to_jsonb((did->'purse'->'bag'->at_->'of'->>'left')::int + more)));
end;
$$;

-- Cooking, as a member asks for it: v129's, written again but for four things: how the pot was cooked is read out
-- of what the browser says of its game (`how`), the rule is town.cook_with, a pot the sprite cooked says so in the
-- go that is written down, and the sprite's cooking is written down as a gift used.
create or replace function public.town_cook(p_things jsonb, p_crew uuid[] default '{}', p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  how jsonb := jsonb_build_object('sprite', coalesce(town.claims(p_timing)->'sprite' = 'true'::jsonb, false));
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook_with(purse, p_things, crew, misses, now_, how);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims) || case when did->'sprite' = 'true'::jsonb then '{"sprite": true}'::jsonb else '{}'::jsonb end);
  if did->'sprite' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'famSprite', 1, 0, jsonb_build_object('made', made, 'n', did->'n',
      'left', (town.cat('gifts')->'uses'->'famSprite'->>'n')::integer - town.used_of(after, 'famSprite', now_)));
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$$;

-- ─── The stardust spice ──────────────────────────────────────────────────

-- The level the buff of the meal being eaten goes to at once when it is eaten up (lib/town/stamina's spiceOf): the
-- sprinkling's own, where it is of this meal (by the moment the meal began); none (0) otherwise.
create or replace function town.spice_of(p_purse jsonb)
returns integer language sql immutable
as $$
  select case when coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb and jsonb_typeof(p_purse->'spiced') = 'object'
               and jsonb_typeof(p_purse->'spiced'->'from') = 'number' and p_purse->'spiced'->'from' = p_purse->'eating'->'from'
               and jsonb_typeof(p_purse->'spiced'->'level') = 'number' and (p_purse->'spiced'->>'level')::numeric > 0
    then floor((p_purse->'spiced'->>'level')::numeric)::integer else 0 end
$$;

-- What a purse has of meals' buffs once a helping that leaves p_id is eaten up (lib/town/stamina's raised, with its
-- `to`): town.raised (v146's, as it is), but that the level is p_level at once at the least, never past the last.
create or replace function town.raised_to(p_purse jsonb, p_id text, p_now bigint, p_level integer)
returns jsonb language plpgsql stable
as $$
declare
  st jsonb := town.cat('stamina');
  live jsonb := town.meal_buffs(p_purse, p_now);
  at_ integer := (select (e.ord - 1)::int from jsonb_array_elements(live) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1);
  buffs jsonb;
begin
  if at_ is null then
    buffs := live || jsonb_build_array(jsonb_build_object('id', p_id, 'level', least((st->>'levels')::int, greatest(1, coalesce(p_level, 0))), 'until', p_now + (st->>'hours')::bigint * 3600000));
    at_ := jsonb_array_length(buffs) - 1;
  else
    buffs := jsonb_set(live, array[at_::text, 'level'], to_jsonb(least((st->>'levels')::int, greatest((live->at_->>'level')::int + 1, coalesce(p_level, 0)))));
  end if;
  return jsonb_build_object('buffs', buffs,
    'buff', case when st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', buffs->at_->'until') else coalesce(p_purse->'buff', 'null'::jsonb) end);
end;
$$;

-- A meal counted on (lib/town/stamina's chew): v146's, written again but for one line: the buff it leaves when it
-- is eaten up is raised by town.raised_to, to the level a sprinkled bowl's goes to (none, for any other bowl: then
-- it is raised as it always was).
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));
end;
$$;

-- Sitting down to a helping with the spice sprinkled on it (lib/town/cooking's spiceEat): out of a slot of the bag,
-- or (p_dish) out of the basket. The meal is begun as ever; a dish that leaves no buff is not sprinkled; counted as
-- it is sprinkled.
create or replace function town.spice_eat(p_purse jsonb, p_slot integer, p_dish text, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  sat jsonb;
  used jsonb;
begin
  if not town.gift_works(p_purse, 'thingSpice') then return town.no('none'); end if;
  sat := case when p_dish is not null then town.basket_eat(p_purse, p_dish, p_seated, p_now) else town.sit_down(p_purse, p_slot, p_seated, p_now) end;
  if not (sat->>'ok')::boolean then return sat; end if;
  if coalesce(town.cat('dishes')->(sat->>'dish')->'buff', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  used := town.gift_use(sat->'purse', 'thingSpice', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return jsonb_build_object('ok', true, 'dish', sat->'dish', 'purse', (used->'purse') || jsonb_build_object('spiced',
    jsonb_build_object('from', p_now, 'level', (town.cat('gifts')->'gifts'->'thingSpice'->>'by')::integer)));
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

-- (a meal begun, written down as `eat` with where the helping was and that it was sprinkled; and the gift used)
create or replace function public.town_spice_eat(p_slot integer, p_dish text, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.spice_eat(town.purse_of(me, true), p_slot, p_dish, p_seated, now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'eat', did->>'dish', 1, 0, jsonb_build_object('from', case when p_dish is not null then 'basket' else 'bag' end, 'spice', true));
    perform town.note(me, 'gift_use', 'thingSpice', 1, 0, jsonb_build_object('dish', did->'dish',
      'left', (town.cat('gifts')->'uses'->'thingSpice'->>'n')::integer - town.used_of(did->'purse', 'thingSpice', now_)));
  end if;
  return town.answer(me, did);
end;
$$;

revoke execute on function public.town_spice_eat(integer, text, boolean) from public, anon;
grant execute on function public.town_spice_eat(integer, text, boolean) to authenticated;
revoke execute on function public.town_spoon(jsonb) from public, anon;
grant execute on function public.town_spoon(jsonb) to authenticated;
revoke execute on function public.town_basket_put(integer, integer) from public, anon;
grant execute on function public.town_basket_put(integer, integer) to authenticated;
revoke execute on function public.town_basket_take(text, integer) from public, anon;
grant execute on function public.town_basket_take(text, integer) to authenticated;
revoke execute on function public.town_basket_eat(text, boolean) from public, anon;
grant execute on function public.town_basket_eat(text, boolean) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
