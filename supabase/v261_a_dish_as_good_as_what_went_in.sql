-- v261: a dish as good as what went into it (the farm's Quality, piece 2.4: cooking and stamina by grade).
-- Run after v260 and with the matching site code. Safe to run twice.
--
-- The owner, 2026-10-15: a dish's grade is its lowest graded ingredient, and a better dish restores more. The rules are
-- lib/town/quality.ts (FOOD_PREPS, restoresOf, buffFloorOf), trade.ts (carriesGrade, usedGrade), cooking.ts,
-- preparation.ts and stamina.ts, which these functions follow line for line.
--
-- What this file does:
-- - A pot of food, and a preparation for the kitchen (made at the yard or at the board), has the grade of the lowest
--   graded thing that went into it, counted from the units that left the bag (the forged cookware's extra batches too;
--   the bag still gives the lowest grade first). Produce counts (a normal unit as normal), and so do the preparations
--   made of it that feed a dish; what the uncle sells, fish and the rest carry none. A dish of only those is normal.
--   Compost, tools, fertilisers and the cure never carry a grade.
-- - The grade rides with the food: on the pot set down, on the feast table, taken up, laid out for a picnic and in a
--   banquet (town.pot_marks keeps it); in a bowl ladled or served (the grade alone); in the dimension basket (one entry
--   a dish and grade, the grade third; a pair from before is normal; out again the lowest grade first); and on the meal.
-- - A graded helping restores its dish's stamina and +20% / +40% / +60% of it, before the forged scent and the company,
--   under the hundred as ever; an excellent one's own buff is at the second level at once at the least (one more than a
--   buff one has, as ever, never past the last). The flavour stays at the first.
-- Pots, bowls, basket entries and meals from before (no grade) are as they were.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.put_g(jsonb,text,integer,integer)') is null then raise exception 'Run v260 before v261'; end if;
-- <guards:v261>
 if md5(replace(pg_get_functiondef('town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('2acad19c1a2fc59df7b18317ebb2ecc1','725b702e76b46752460c1f50256ec0b9') then raise exception 'Definition changed: town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint)'::regprocedure),chr(13),'')) not in ('004c84b3ccea3bd9993b08b99514f63c','b6a65ac61cac6a3c98ea6a71f62c5ac8') then raise exception 'Definition changed: town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.pot_marks(jsonb)'::regprocedure),chr(13),'')) not in ('aef5e95240a23ba6ebb9b8ecbf87d724','fdd2ed20aa4c395dd349b76d6fbdbf4e') then raise exception 'Definition changed: town.pot_marks(jsonb); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.ladle(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('d97e6f38a95c5d92a17c9e5ae264680f','4406fca11b0785a1a73cc3fdeb9d5996') then raise exception 'Definition changed: town.ladle(jsonb,jsonb); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.serve(jsonb,integer)'::regprocedure),chr(13),'')) not in ('537c2f467f8081f59acf2c00a340bbfb','28c0ea67ce331feef5bc96e9300deb8b') then raise exception 'Definition changed: town.serve(jsonb,integer); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.sit_down(jsonb,integer,boolean,bigint)'::regprocedure),chr(13),'')) not in ('88af2e45480684326e92c71011d9016d','4b27c2fdb6fbbdcb5f28fda88ac64f65') then raise exception 'Definition changed: town.sit_down(jsonb,integer,boolean,bigint); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.chew(jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('e245714b14425559da7a2bb3a6f16cdb','afdf98118efdfea67710ab3bb2071e98') then raise exception 'Definition changed: town.chew(jsonb,double precision,bigint); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.basket_of(jsonb)'::regprocedure),chr(13),'')) not in ('3c1468fb1c4e750cda8eb1811f2283df','972e717dbbaa3d1e0472883289008351') then raise exception 'Definition changed: town.basket_of(jsonb); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.basket_less(jsonb,text,numeric)'::regprocedure),chr(13),'')) not in ('bb4bde26b59444c61f22fccb40650910','efb9db4744fb826cbe1d17cba6109636') then raise exception 'Definition changed: town.basket_less(jsonb,text,numeric); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.basket_put(jsonb,integer,numeric)'::regprocedure),chr(13),'')) not in ('202fae1085f09f4bad3fc29ba698316a','f0c31b0b0a1044c2c89274cc26411a88') then raise exception 'Definition changed: town.basket_put(jsonb,integer,numeric); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.basket_take(jsonb,text,numeric)'::regprocedure),chr(13),'')) not in ('cdc1bae90644b45255156a859d520373','f302bac51a907f1cc7652df6c5a18cab') then raise exception 'Definition changed: town.basket_take(jsonb,text,numeric); rebuild v261'; end if;
 if md5(replace(pg_get_functiondef('town.basket_eat(jsonb,text,boolean,bigint)'::regprocedure),chr(13),'')) not in ('144fddffa9cb52b6aa41f696b25110ed','23b0a7739cab78be861835583dff665f') then raise exception 'Definition changed: town.basket_eat(jsonb,text,boolean,bigint); rebuild v261'; end if;
-- </guards:v261>
end $$;

-- Whether a thing carries a grade into what is cooked of it: produce, and the preparations of it that feed a dish
-- (lib/town/quality's FOOD_PREPS, the same list).
create or replace function town.carries_grade(p_id text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(town.cat('items')->p_id->>'kind' = 'crop', false)
     or p_id = any(array['curryPaste','coconutMilk','dicedRoot','brownedOnion','driedZest','brightSauce','thickBroth','sweetGlaze','spicePaste',
                         'beanPaste','berryJam','blueCornFlour','driedTea','sunflowerOil','lotusStarch','nectarSyrup'])
$$;

-- The grade of what went into something, from the units that left the bag (before and after it) of the things said:
-- of each thing that carries a grade, the lowest grade of which fewer are left; the lowest of those; null when none.
create or replace function town.used_grade(p_before jsonb, p_after jsonb, p_things jsonb)
returns integer language sql stable set search_path='' as $$
 select min(u.g)::integer
   from (select distinct t.v->>0 as id from jsonb_array_elements(p_things) t(v)) i
   cross join lateral (select min(k) as g from generate_series(0, 3) k where town.held_g(p_before, i.id, k) > town.held_g(p_after, i.id, k)) u
  where town.carries_grade(i.id)
$$;

-- What a helping of a grade adds to its dish's own stamina, as a part of it.
create or replace function town.grade_restores(p_grade integer)
returns double precision language sql immutable set search_path='' as $$
 select (case p_grade when 1 then 0.2 when 2 then 0.4 when 3 then 0.6 else 0 end)::double precision
$$;

-- A basket entry's grade: its third number (1 to 3), or normal.
create or replace function town.basket_grade(p_entry jsonb)
returns integer language sql immutable set search_path='' as $$
 select case when jsonb_typeof(p_entry) is distinct from 'array' then 0
             when jsonb_array_length(p_entry) = 3 and p_entry->2 in ('1'::jsonb, '2'::jsonb, '3'::jsonb) then (p_entry->>2)::numeric::integer else 0 end
$$;

revoke all on function town.carries_grade(text), town.used_grade(jsonb,jsonb,jsonb), town.grade_restores(integer), town.basket_grade(jsonb)
 from public, anon, authenticated;

-- Cooking: the pot, and anything else made at the yard for the kitchen, has the grade of the lowest graded thing that went in.
CREATE OR REPLACE FUNCTION town.cook_v205(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
-- v177: stronger milestones and distinct powers.

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
  -- ── the older tools (v174): the forged cookware the pot is begun with, what it carries, and what the pot has of it ──
  mine_ jsonb;
  fx_ jsonb;
  more_ jsonb;
  batch_ integer := 1;
  used_big jsonb;
  -- v261: the grade of what went in
  grade_ integer;
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
  -- ── the older tools (v174): forged cookware in the hand of whoever begins the pot, read once; and what it pays ──
  mine_ := town.cook_held(p_purse, p_crew);
  if mine_ is not null then
    fx_ := town.cook_fx(mine_);
    spent := town.tool_paid(p_purse, spent, p_now, mine_, fx_, 'ckFresh');
  end if;
  -- ── the older tools (v174): its end ──
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
    if made is not null and mine_ is not null and (fx_->>'big')::double precision > 0
       and not exists (select 1 from jsonb_array_elements(alls) a(v) where town.held(p_purse->'bag', a.v->>0) < (a.v->>1)::numeric * town.opt_n('ckBig', 'batches', mine_)) then
      used_big := town.use_power(spent, mine_, 'ckBig', p_now);
      if (used_big->>'ok')::boolean then
        spent := used_big->'purse'; batch_ := town.opt_n('ckBig', 'batches', mine_)::integer;
        -- v261: a whole number (town.take takes an integer: with a numeric this call found no function, and a big pot failed)
        for x in select v from jsonb_array_elements(alls) a(v) loop bag := town.take(bag, x->>0, ((x->>1)::numeric * (batch_ - 1))::integer); end loop;
      end if;
    end if;
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, town.carried_bag(p_purse)) * batch_ else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    -- ── the older tools (v174): what the pot has of forged cookware, and what that counts ──
    if mine_ is not null then
      more_ := town.cook_more(spent, mine_, fx_, made is not null, town.luck_of('helping', p_now, kinds), p_now);
      spent := more_->'purse';
      left_ := left_ + (more_->>'more')::integer;
    end if;
    -- ── the older tools (v174): its end ──
    -- v261: the pot's grade is the lowest of the graded things that went into it, the batches too; none for normal
    grade_ := coalesce(town.used_grade(p_purse->'bag', bag, alls), 0);
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_))
          -- ── the older tools (v174): with what it carries from its cookware (nothing, of any other) ──
          || coalesce(more_->'marks', '{}'::jsonb)
          || case when grade_ > 0 then jsonb_build_object('grade', grade_) else '{}'::jsonb end)))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  -- v261: a preparation for the kitchen has the grade of the lowest graded thing that went into it
  grade_ := case when town.carries_grade(made) then coalesce(town.used_grade(p_purse->'bag', bag, alls), 0) else 0 end;
  if town.room_g(bag, made, grade_) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put_g(bag, made, n, grade_)));
end;
$function$;

-- The preparation board: a preparation made right has the grade of the lowest graded thing that went in; compost none.
CREATE OR REPLACE FUNCTION town.prepare(p_purse jsonb, p_run jsonb, p_id uuid, p_answers jsonb, p_x integer, p_y integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare k jsonb:=town.cat('preparation');id_ text:=p_run->>'recipe';r jsonb:=k->'recipes'->id_;refused text;mistakes integer:=0;key_ text;n jsonb;bag jsonb:=p_purse->'bag';item_ text;count_ integer;out_ jsonb;can_adjust boolean;book jsonb;made_ jsonb;grade_ integer;
begin
 if p_run is null or p_run->>'id' is distinct from p_id::text or p_now<(p_run->>'at')::bigint+(k->>'minMs')::bigint or p_now>(p_run->>'until')::bigint then return town.no('none');end if;
 if p_x is null or p_y is null or (p_run->'tile'->>0)::integer<>p_x or (p_run->'tile'->>1)::integer<>p_y then return town.no('far');end if;
 refused:=town.preparation_ready(p_purse,id_,p_x,p_y);if refused is not null then return town.no(refused);end if;
 if jsonb_typeof(p_answers) is distinct from 'object' then return town.no('none');end if;
 if p_answers ? 'correction' and jsonb_typeof(p_answers->'correction')<>'boolean' then return town.no('none');end if;
 foreach key_ in array array['method','heat','finish'] loop
   if jsonb_typeof(p_answers->key_) is distinct from 'number' then return town.no('none');end if;
   if (p_answers->>key_)::numeric<>floor((p_answers->>key_)::numeric) or (p_answers->>key_)::numeric not between 0 and 2 then return town.no('none');end if;
   if (p_answers->>key_)::integer<>(k->case when key_='method' then 'methods' else key_ end->>id_)::integer then mistakes:=mistakes+1;end if;
 end loop;
 can_adjust:=greatest(case when town.held(town.carried_bag(p_purse),'tastingSpoon')>0 then 1 else 0 end,town.buff_by(p_purse,p_now,'seasoning'))>0;
 if p_answers->'correction'='true'::jsonb then if not can_adjust then return town.no('tool');end if;mistakes:=greatest(0,mistakes-1);end if;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop bag:=town.take(bag,n->>0,(n->>1)::integer);end loop;
 item_:=case when mistakes=0 then id_ else 'compost' end;count_:=case when mistakes=0 then (r->>'gives')::integer else 1 end;
 -- v261: a preparation for the kitchen has the grade of the lowest graded thing that went into it; compost never has one
 grade_:=case when mistakes=0 and town.carries_grade(item_) then coalesce(town.used_grade(p_purse->'bag',bag,r->'needs'),0) else 0 end;
 if town.room_g(bag,item_,grade_)<count_ then return town.no('full');end if;
 book:=coalesce(p_purse->'prepBook','[]'::jsonb);made_:=coalesce(p_purse->'made','[]'::jsonb);
 if mistakes=0 then if not book ? id_ then book:=book||jsonb_build_array(id_);end if;if not made_ ? id_ then made_:=made_||jsonb_build_array(id_);end if;end if;
 out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put_g(bag,item_,count_,grade_),'prepBook',book,'made',made_);
 return jsonb_build_object('ok',true,'made',item_,'n',count_,'mistakes',mistakes,'purse',out_);
end $function$;

-- What a pot carries, as it is kept on a pot and on a slot alike: and its grade, wherever it goes (set down, the
-- table, taken up, a picnic, a banquet) and into every helping eaten out of it.
CREATE OR REPLACE FUNCTION town.pot_marks(p_from jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select case when jsonb_typeof(p_from->'warm')='number' and (p_from->>'warm')::numeric>0 then jsonb_build_object('warm',p_from->'warm') else '{}'::jsonb end
 ||case when jsonb_typeof(p_from->'scent')='number' and (p_from->>'scent')::numeric>0 then jsonb_build_object('scent',p_from->'scent') else '{}'::jsonb end
 ||case when p_from->>'secondary' in ('green','calm','keen') then jsonb_build_object('secondary',p_from->'secondary') else '{}'::jsonb end
 ||case when p_from->>'cookedBy' is not null and p_from->>'cookId' is not null then jsonb_build_object('cookedBy',p_from->'cookedBy','cookId',p_from->'cookId') else '{}'::jsonb end
 -- v261: the grade of what is in it
 ||case when p_from->'grade' in ('1'::jsonb,'2'::jsonb,'3'::jsonb) then jsonb_build_object('grade',p_from->'grade') else '{}'::jsonb end
 $function$;

-- A helping ladled from a pot set down: it has the pot's grade (and nothing else of the pot's).
CREATE OR REPLACE FUNCTION town.ladle(p_purse jsonb, p_pot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bowl text := town.cat('cooking')->>'bowl';
  left_ numeric := (p_pot->>'left')::numeric;
  bag jsonb;
  -- v261: the pot's grade
  grade_ integer := town.grade_in(p_pot);
begin
  if left_ < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  bag := town.take(p_purse->'bag', bowl, 1);
  if town.room_g(bag, p_pot->>'dish', grade_) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true,
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || jsonb_build_object('bag', town.put_g(bag, p_pot->>'dish', 1, grade_)));
end;
$function$;

-- A helping served from one's own pot: it has the pot's grade.
CREATE OR REPLACE FUNCTION town.serve(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bowl text := town.cat('cooking')->>'bowl';
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  dish text;
  left_ numeric;
  bag jsonb;
  grade_ integer;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb
     or (s->'of'->>'left')::numeric < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  dish := s->'of'->>'dish';
  left_ := (s->'of'->>'left')::numeric - 1;
  -- v261: the pot's grade
  grade_ := town.grade_in(s);
  bag := town.take(jsonb_set(p_purse->'bag', array[p_slot::text],
    case when left_ > 0 then s || jsonb_build_object('of', jsonb_build_object('dish', dish, 'left', left_)) else 'null'::jsonb end), bowl, 1);
  if town.room_g(bag, dish, grade_) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'dish', dish, 'purse', p_purse || jsonb_build_object('bag', town.put_g(bag, dish, 1, grade_)));
end;
$function$;

-- Sitting down to a helping out of the bag: what is left of the stack keeps its grade, and the meal has it.
CREATE OR REPLACE FUNCTION town.sit_down(p_purse jsonb, p_slot integer, p_seated boolean, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  meal integer := town.meal_of(p_now);
  bowls jsonb := town.bowls_today(p_purse, p_now);
begin
  if s is null or s = 'null'::jsonb or coalesce(town.cat('items')->(s->>'item')->>'kind', '') <> 'dish' then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb or (bowls->>meal)::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', s->>'item', 'purse', p_purse || jsonb_build_object(
    -- v261: what is left of the stack keeps what it carries (its grade)
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - 1) end),
    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))
                from (select case when x.ord - 1 = meal then x.e::int + 1 else x.e::int end as n, x.ord from jsonb_array_elements_text(bowls) with ordinality as x(e, ord)) b),
    'eating', jsonb_build_object('dish', s->>'item', 'meal', meal, 'from', p_now, 'till', p_now, 'got', 0)
      -- v261: and the helping eaten has it
      || case when town.grade_in(s) > 0 then jsonb_build_object('grade', town.grade_in(s)) else '{}'::jsonb end));
end;
$function$;

-- Eating: a graded helping restores its dish's stamina and +20% / +40% / +60% of it, then the scent and the company;
-- an excellent one's own buff is at the second level at once at the least.
CREATE OR REPLACE FUNCTION town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
  whole := case when e->'picnic'='true'::jsonb then 30000 else (st->>'minutes')::bigint * 60000 end;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  -- ── the older tools (v174): with what the helping carries from its pot (nothing, of any other) ──
  -- v261: the dish's own stamina and what its grade adds to it, before the scent
  gain := ((dish->>'stamina')::double precision * (1::double precision + town.grade_restores(town.grade_in(e)))
      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    -- v261: an excellent helping's buff at the second level at least (a sprinkled bowl's, if higher)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now,
         greatest(town.spice_of(p_purse), case when town.grade_in(e) = 3 then 2 else 0 end)) else '{}'::jsonb end;
  -- ── the older tools (v174): and what it carries for the buff its dish leaves ──
  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then
    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');
  end if;
  -- ── the older tools (v174): its end ──
  if done then after:=town.reward_food_finished(after,e,p_now);end if;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$function$;

-- The dimension basket: each dish once a grade (a pair for normal helpings, the grade third for graded ones).
CREATE OR REPLACE FUNCTION town.basket_of(p_purse jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  dishes jsonb := town.cat('dishes');
  kept jsonb := '[]'::jsonb;
  seen jsonb := '[]'::jsonb;
  e jsonb;
  g integer;
begin
  if jsonb_typeof(p_purse->'basket') is distinct from 'array' then return kept; end if;
  for e in select t.v from jsonb_array_elements(p_purse->'basket') with ordinality as t(v, ord) order by t.ord loop
    -- v261: a third number is the entry's grade, 1 to 3; one entry a dish and grade
    if jsonb_typeof(e) = 'array' and jsonb_array_length(e) in (2, 3) and (jsonb_array_length(e) = 2 or town.basket_grade(e) > 0)
       and jsonb_typeof(e->0) = 'string' and dishes ? (e->>0)
       and jsonb_typeof(e->1) = 'number' and (e->>1)::numeric = floor((e->>1)::numeric) and (e->>1)::numeric > 0
       and not seen ? ((e->>0) || '/' || town.basket_grade(e)) then
      g := town.basket_grade(e);
      kept := kept || jsonb_build_array(case when g > 0 then jsonb_build_array(e->0, e->1, g) else jsonb_build_array(e->0, e->1) end);
      seen := seen || to_jsonb((e->>0) || '/' || g);
    end if;
  end loop;
  return kept;
end;
$function$;

-- A basket with so many helpings of a dish out of it (it must hold as many): the lowest grade first.
CREATE OR REPLACE FUNCTION town.basket_less(p_basket jsonb, p_dish text, p_n numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  basket jsonb := p_basket;
  more numeric := p_n;
  e jsonb;
  k numeric;
  g integer;
  i integer;
begin
  for g in 0..3 loop
    exit when more <= 0;
    for i in 0..jsonb_array_length(basket) - 1 loop
      e := basket->i;
      if e->>0 = p_dish and town.basket_grade(e) = g then
        k := least(more, (e->>1)::numeric);
        more := more - k;
        basket := jsonb_set(basket, array[i::text], case when (e->>1)::numeric > k
          then case when g > 0 then jsonb_build_array(p_dish, (e->>1)::numeric - k, g) else jsonb_build_array(p_dish, (e->>1)::numeric - k) end
          else 'null'::jsonb end);
        exit;
      end if;
    end loop;
  end loop;
  return (select coalesce(jsonb_agg(t.v order by t.ord), '[]'::jsonb) from jsonb_array_elements(basket) with ordinality as t(v, ord) where t.v <> 'null'::jsonb);
end;
$function$;

-- Into the basket: a graded helping beside the dish's helpings of its grade; what is left in the slot keeps its grade.
CREATE OR REPLACE FUNCTION town.basket_put(p_purse jsonb, p_slot integer, p_n numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  mine jsonb;
  dish text;
  g integer;
begin
  if not town.gift_works(p_purse, 'thingBasket') or s is null or s = 'null'::jsonb or not (town.cat('dishes') ? (s->>'item')) then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > (s->>'n')::numeric then return town.no('amount'); end if;
  if p_n > town.basket_room(p_purse) then return town.no('full'); end if;
  dish := s->>'item';
  mine := town.basket_of(p_purse);
  -- v261: its grade
  g := town.grade_in(s);
  return jsonb_build_object('ok', true, 'dish', dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::numeric = p_n then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::numeric - p_n) end),
    'basket', case when exists (select 1 from jsonb_array_elements(mine) e where e->>0 = dish and town.basket_grade(e) = g)
      then (select jsonb_agg(case when t.e->>0 = dish and town.basket_grade(t.e) = g
                then case when g > 0 then jsonb_build_array(dish, (t.e->>1)::numeric + p_n, g) else jsonb_build_array(dish, (t.e->>1)::numeric + p_n) end
                else t.e end order by t.ord)
              from jsonb_array_elements(mine) with ordinality as t(e, ord))
      else mine || jsonb_build_array(case when g > 0 then jsonb_build_array(dish, p_n, g) else jsonb_build_array(dish, p_n) end) end));
end;
$function$;

-- Out of the basket into the bag: the lowest grade first, each grade onto its own stacks.
CREATE OR REPLACE FUNCTION town.basket_take(p_purse jsonb, p_dish text, p_n numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  mine jsonb := town.basket_of(p_purse);
  had numeric := (select sum((e->>1)::numeric) from jsonb_array_elements(mine) e where e->>0 = p_dish);
  bag jsonb := p_purse->'bag';
  more numeric;
  k numeric;
  g integer;
begin
  if not town.gift_works(p_purse, 'thingBasket') or had is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > had then return town.no('amount'); end if;
  -- v261: each grade it holds of the dish, the lowest first
  more := p_n;
  for g in 0..3 loop
    exit when more <= 0;
    k := least(more, coalesce((select sum((e->>1)::numeric) from jsonb_array_elements(mine) e where e->>0 = p_dish and town.basket_grade(e) = g), 0));
    if k > 0 then
      if town.room_g(bag, p_dish, g) < k then return town.no('full'); end if;
      bag := town.put_g(bag, p_dish, k::integer, g);
      more := more - k;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'dish', p_dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', bag, 'basket', town.basket_less(mine, p_dish, p_n)));
end;
$function$;

-- Eating out of the basket: the lowest grade first, and the meal has its grade.
CREATE OR REPLACE FUNCTION town.basket_eat(p_purse jsonb, p_dish text, p_seated boolean, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  mine jsonb := town.basket_of(p_purse);
  bowls jsonb := town.bowls_today(p_purse, p_now);
  meal_ jsonb;
  g integer;
begin
  if not town.gift_works(p_purse, 'thingBasket') or p_dish is null
     or not exists (select 1 from jsonb_array_elements(mine) e where e->>0 = p_dish) then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (bowls->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  -- v261: the lowest grade it holds of the dish goes with the meal
  g := (select min(town.basket_grade(e)) from jsonb_array_elements(mine) e where e->>0 = p_dish);
  meal_ := town.begun(p_purse, p_dish, p_now);
  if g > 0 then meal_ := jsonb_set(meal_, '{eating,grade}', to_jsonb(g)); end if;
  return jsonb_build_object('ok', true, 'dish', p_dish,
    'purse', p_purse || jsonb_build_object('basket', town.basket_less(mine, p_dish, 1)) || meal_);
end;
$function$;

-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select town.carries_grade('tomato'), town.carries_grade('curryPaste'), town.carries_grade('salt'), town.carries_grade('compost'); -- t t f f
--   select town.used_grade('[{"item":"corn","n":2,"grade":3},{"item":"salt","n":1}]'::jsonb, '[null,null]'::jsonb, '[["corn",2],["salt",1]]'::jsonb); -- 3
--   select town.pot_marks('{"grade":2,"warm":0}'::jsonb);                                                                         -- {"grade": 2}
--   select town.basket_of('{"basket":[["tomYum",2],["tomYum",1,3],["tomYum",1,0]]}'::jsonb);                                       -- [["tomYum", 2], ["tomYum", 1, 3]]
--   select has_function_privilege('authenticated','town.used_grade(jsonb,jsonb,jsonb)','EXECUTE');                                 -- false
