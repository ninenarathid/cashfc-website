-- v171 — a torch can be made
--
-- Run this once in the Supabase SQL editor, after v164 (it stops at its first line without v164's catalog). Running
-- it again is safe. The site's code needs nothing new for it: the page has offered fine timber at the worktable since
-- the mountain opened, and has been refused it until this runs.
--
-- Why. The owner, 2026-10-09, the evening the mountain opened to everybody:
--
--   "มีคนคราฟคบไฟไม่ได้ ช่วยเช็คดูให้หน่อย"
--
-- A torch is made by hand, of one fine timber and one resin (the catalog's `makes`). Fine timber's kind is `wood`,
-- and what a tree or a rock leaves goes into no pot (`cooking.never`, by kind: a pot of stones is only a way to lose
-- them). So v164 wrote beside that list the things that go in whatever their kind and those that never do
-- (`cooking.putIn`: also fine timber, never a torch), and wrote no function that reads it: `town.cook` (v123's text)
-- and `town.spoon` (v153's) went on asking by kind alone. The database refused the timber as if it were not in the
-- bag ("ของในกระเป๋าไม่พอ", with the timber there), and nobody could make a torch. (And a torch, whose kind is plain
-- goods, would have gone into a pot and been lost there, for a page that offered it. The site's own never did.)
--
-- What it does: those two functions written again, each as it stood but for that one condition. What goes in is now
-- what lib/town/cooking's `goesIn` says: never what `putIn.never` names, always what `putIn.also` names, and
-- anything else by its kind. No table, no column, no catalog row, no coins; nobody's purse is touched. Who may call
-- what is as it was (a function written again keeps its grants; the schema's line is said again all the same).

do $$ begin
  if to_regprocedure('town.spoon(jsonb, jsonb, bigint)') is null or town.cat('cooking')->'putIn' is null then
    raise exception 'v171 needs v164: the catalog does not say yet what goes in whatever its kind';
  end if;
end $$;

-- ─── What is cooked, or made ───────────────────────────────────────────────
-- (v123's, but for what goes in)
create or replace function town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb := town.tidy(p_things);
  kinds integer := jsonb_array_length(alls);
  crew_n integer := jsonb_array_length(p_crew);
  x jsonb;
  made text;
  t jsonb;
  short boolean;
  dish text;
  bag jsonb := p_purse->'bag';
  pot integer;
  spent jsonb;
  near jsonb;
  left_ integer;
  n integer;
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  made := town.made_of(alls);
  if made is not null then
    t := town.takes(made);
    short := crew_n < (t->>'cooks')::int;
    if short or not town.in_hands(t->'in', p_crew) then
      -- somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if coalesce(p_purse->'made', '[]'::jsonb) ? made then
        return town.no(case when short or crew_n > 1 or jsonb_array_length(t->'in') > 1 then 'crew' else 'tool' end);
      end if;
      made := null;
    end if;
  end if;
  -- what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  dish := case when made is not null then (case when town.cat('dishes') ? made then made end)
               when jsonb_typeof(p_crew->0) = 'string' and ck->'cookware' ? (p_crew->>0) then ck->>'oddDish' end;
  for x in select v from jsonb_array_elements(alls) e(v) loop bag := town.take(bag, x->>0, (x->>1)::int); end loop;
  -- (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  if dish is not null then
    select (s.ord - 1)::int into pot from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
    if pot is null then return town.no('full'); end if;
  end if;
  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);
  -- what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  if made is null then
    near := town.taste_of(alls, p_crew);
    if near->>'of' is not null and near->>'lacks' is not null and near->>'taste' in ('swap', 'less')
       and near->>'lacks' = (town.needs_of(near->>'of')->-1)->>0 then
      spent := spent || jsonb_build_object('tries', coalesce(spent->'tries', '{}'::jsonb)
        || jsonb_build_object(near->>'of', coalesce((spent->'tries'->>(near->>'of'))::int, 0) + 1));
    end if;
  end if;
  if dish is not null then
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_)))))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  if town.room(bag, made) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put(bag, made, n)));
end;
$$;

-- ─── The spoon asked of what is in the pot ─────────────────────────────────
-- (v153's, but for what goes in)
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
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))
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

revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- What it should say afterwards (it reads only: a made-up bag, nobody's own):
--
--   select town.cook(town.fresh() || jsonb_build_object('bag', '[{"item":"timber","n":1},{"item":"resin","n":1},null,null]'::jsonb,
--                                                        'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)),
--                    '[["timber",1],["resin",1]]'::jsonb, '[null]'::jsonb, 0, town.now_ms()) - 'purse' as says;
--   -- {"n": 2, "ok": true, "made": "torch"}
--   -- (before this file: {"ok": false, "why": "none"})
