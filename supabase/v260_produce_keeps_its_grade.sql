-- v260: produce keeps its grade (the farm's Quality, second part).
-- Run after v259 and with the matching site code. Safe to run twice.
--
-- The owner, 2026-10-15: Quality told as a range a lucky pick lands high in; good growers grow rich from it. The rules
-- are lib/town/quality.ts, quality-plant.ts and trade.ts, which these functions follow line for line.
--
-- What this file does:
-- - A pick rolls each fruit's Quality, evenly between the round's floor and ceiling (v259 keeps the round). The draws
--   are the same for the same plant, picking and fruit, so a retry with a full bag never rolls again; they are mixed
--   with a salt kept in a table no browser can read, so nobody can work out a planting's luck before picking it.
-- - Produce carries its grade on its stack (`grade` 1 silver, 2 gold, 3 excellent; none for normal, as everything from
--   before was). The bag puts, counts and takes by grade (lowest first unless asked); stacks join only at one grade.
-- - Graded produce is not plain: stalls, the notice board and the jar pass it over; the box, the ground and deals move
--   it with its grade; a deal gives it only by its slot.
-- - The uncle's relatives keep the grade on a lot and pay ×1.25 / ×1.75 / ×2.5 for raw produce.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.quality_settled(jsonb,bigint)') is null then raise exception 'Run v259 before v260'; end if;
-- <guards:v260>
 if md5(replace(pg_get_functiondef('town.room(jsonb,text)'::regprocedure),chr(13),'')) not in ('3bdf6a01c204c30ab5ca30159e670b0b','3696210870a6b93a8eaa46e3c9cf907c') then raise exception 'Definition changed: town.room(jsonb,text); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.put(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('6e030b7d01fd4d8ee0831de235eb87e7','ae8deda33108bc3eeb9e4ba88ebae034') then raise exception 'Definition changed: town.put(jsonb,text,integer); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.take(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('1e3323467b21c0faee364a956945ec75','43644545f02c6cdbb5c87b1b45529bba') then raise exception 'Definition changed: town.take(jsonb,text,integer); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.plain(jsonb,text)'::regprocedure),chr(13),'')) not in ('0dfc6f55520f1c33cfe513042cb54c3c','e63ff4c2e62f39b02a450ea43b234e0d') then raise exception 'Definition changed: town.plain(jsonb,text); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.take_plain(jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('015c9dfc0f57cbb8586a9030b8d884f7','9e97212ef0c338fe753b2a6f01ecf793') then raise exception 'Definition changed: town.take_plain(jsonb,text,integer); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.push(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('7848211ec018b6aed1ad2652dc33ec55','f75dd0e1cb5707fecb29541b23f64db4') then raise exception 'Definition changed: town.push(jsonb,jsonb); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.leave(jsonb,integer,integer,bigint,integer)'::regprocedure),chr(13),'')) not in ('c03ba007087c761cda9a28f6c7c460b3','7183fa6134966de7db6cff1050f04046') then raise exception 'Definition changed: town.leave(jsonb,integer,integer,bigint,integer); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.take_back(jsonb,integer,bigint)'::regprocedure),chr(13),'')) not in ('b3a53fe0aebf847c28d601d07bb52a1f','c9924e6bbbd7095403eabed79c6a3991') then raise exception 'Definition changed: town.take_back(jsonb,integer,bigint); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.collect(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('c232948b0580824bd21b3486a2cf0ee2','b6eec4cf3ada7e7ffbc974d6e43e3531') then raise exception 'Definition changed: town.collect(jsonb,bigint); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.has_all(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('f60288e6791052ff322a8da9de847a20','3db81951c9a96ab62c727aab36bf516d') then raise exception 'Definition changed: town.has_all(jsonb,jsonb); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.pull(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('dd3a5ecbc4a19f9f61496dcf881a2598','3756784e8f6aeeac5667d6ec6dcf072e') then raise exception 'Definition changed: town.pull(jsonb,jsonb); rebuild v260'; end if;
 if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint)'::regprocedure),chr(13),'')) not in ('9d43fb6a887d6e5dd19a87a85ff7274e','c8ab9b215d0fca6196ed6b34d2f84161') then raise exception 'Definition changed: town.pick(text,jsonb,jsonb,boolean,text,bigint); rebuild v260'; end if;
-- </guards:v260>
end $$;

-- The salt that makes the draws unknowable from outside: one row, no grant to anybody but the owner.
create table if not exists town.quality_salt (one boolean primary key default true check (one), salt text not null);
insert into town.quality_salt(one, salt) values (true, md5(random()::text || clock_timestamp()::text || random()::text)) on conflict (one) do nothing;
revoke all on town.quality_salt from public, anon, authenticated;

-- A stack's grade: its own, or normal.
create or replace function town.grade_in(p_stack jsonb)
returns integer language sql immutable set search_path='' as $$
 select case when jsonb_typeof(p_stack->'grade')='number' then (p_stack->>'grade')::integer else 0 end
$$;

-- How many of something of one grade are in a bag.
create or replace function town.held_g(p_bag jsonb, p_id text, p_grade integer)
returns integer language sql immutable set search_path='' as $$
 select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s where s->>'item' = p_id and town.grade_in(s) = p_grade
$$;

-- How many more of something of one grade a bag has room for: what its own stacks of that grade lack, and every empty slot.
create or replace function town.room_g(p_bag jsonb, p_id text, p_grade integer)
returns integer language sql stable set search_path='' as $$
 select coalesce(sum(case when s = 'null'::jsonb then st.stack when s->>'item' = p_id and town.grade_in(s) = p_grade then st.stack - (s->>'n')::int else 0 end), 0)::integer
   from jsonb_array_elements(p_bag) s, (select (town.cat('items')->p_id->>'stack')::int as stack) st
$$;

-- A bag with some more of something of one grade in it: onto its own stacks of that grade first, then into empty slots.
create or replace function town.put_g(p_bag jsonb, p_id text, p_n integer, p_grade integer)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 stack integer := (town.cat('items')->p_id->>'stack')::int; bag jsonb := p_bag; s jsonb; more integer := p_n; add integer; i integer;
begin
 for i in 0..jsonb_array_length(bag) - 1 loop
  exit when more <= 0;
  s := bag->i;
  if s->>'item' = p_id and town.grade_in(s) = p_grade and (s->>'n')::int < stack then
   add := least(more, stack - (s->>'n')::int);
   bag := jsonb_set(bag, array[i::text, 'n'], to_jsonb((s->>'n')::int + add));
   more := more - add;
  end if;
 end loop;
 for i in 0..jsonb_array_length(bag) - 1 loop
  exit when more <= 0;
  if bag->i = 'null'::jsonb then
   add := least(more, stack);
   bag := jsonb_set(bag, array[i::text], jsonb_build_object('item', p_id, 'n', add) || case when p_grade > 0 then jsonb_build_object('grade', p_grade) else '{}'::jsonb end);
   more := more - add;
  end if;
 end loop;
 return bag;
end $$;

-- Normal produce's room and put are the grade-0 case (lib/town/trade's roomFor and put with no grade said).
CREATE OR REPLACE FUNCTION town.room(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- v260: normal produce only; a graded stack is its own grade's (town.room_g)
  select town.room_g(p_bag, p_id, 0)
$function$;

CREATE OR REPLACE FUNCTION town.put(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  -- v260: onto normal stacks only; a graded stack is its own grade's (town.put_g)
  select town.put_g(p_bag, p_id, p_n, 0)
$function$;

-- Taking out: the lowest grade first (normal produce before graded), from the last stacks; a stack left keeps its grade.
CREATE OR REPLACE FUNCTION town.take(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  g integer;
  i integer;
begin
  for g in 0..3 loop
    for i in reverse jsonb_array_length(bag) - 1..0 loop
      exit when more <= 0;
      s := bag->i;
      if s->>'item' = p_id and town.grade_in(s) = g then
        less := least(more, (s->>'n')::int);
        more := more - less;
        -- v260: what is left keeps what it carries (its grade)
        bag := jsonb_set(bag, array[i::text],
          case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
      end if;
    end loop;
  end loop;
  return bag;
end;
$function$;

CREATE OR REPLACE FUNCTION town.plain(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s
   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0
     -- ── v164: a tool that carries something of its own is no plain thing ──
     and not town.forged(s)
     -- ── v260: nor graded produce ──
     and town.grade_in(s) = 0
$function$;

CREATE OR REPLACE FUNCTION town.take_plain(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    -- ── v164: a tool that carries something of its own is no plain thing, and is passed over (v260: graded produce too) ──
    continue when town.forged(s) or town.grade_in(s) > 0;
    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$function$;

CREATE OR REPLACE FUNCTION town.push(p_bag jsonb, p_stacks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bag jsonb := p_bag;
  s jsonb;
  slot integer;
begin
  for s in select e.v from jsonb_array_elements(p_stacks) with ordinality e(v, ord) order by e.ord loop
    -- ── v260: graded produce onto its own grade, as normal produce onto its own kind ──
    if town.grade_in(s) > 0 and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and not s ? 'water' then
      if town.room_g(bag, s->>'item', town.grade_in(s)) < (s->>'n')::numeric then return null; end if;
      bag := town.put_g(bag, s->>'item', (s->>'n')::int, town.grade_in(s));
    -- ── v164: a tool that carries something of its own is moved whole too, into a slot of its own ──
    elsif coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' or town.forged(s) then
      select (b.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality b(v, ord) where b.v = 'null'::jsonb order by b.ord limit 1;
      if slot is null then return null; end if;
      bag := jsonb_set(bag, array[slot::text], s);
    else
      if town.room(bag, s->>'item') < (s->>'n')::numeric then return null; end if;
      bag := town.put(bag, s->>'item', (s->>'n')::int);
    end if;
  end loop;
  return bag;
end;
$function$;

-- What the relatives pay over the usual for a grade, for raw produce only (lib/town/trade's gradePays).
create or replace function town.grade_pays(p_item text, p_grade integer)
returns numeric language sql stable set search_path='' as $$
 select case when town.cat('items')->p_item->>'kind' = 'crop' then (array[1, 1.25, 1.75, 2.5]::numeric[])[coalesce(p_grade, 0) + 1] else 1 end
$$;

CREATE OR REPLACE FUNCTION town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  cur integer := town.round_of(p_now);
  pays integer;
  lots jsonb := p_purse->'left';
  same integer := -1;
  grade_ integer;
  i integer;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb or (s->>'n')::int < p_n then return town.no('none'); end if;
  pays := (town.cat('items')->(s->>'item')->>'pays')::int;
  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;
  -- ── v164: a tool that carries something of its own is not left to be sold as one of its kind ──
  if town.forged(s) then return town.no('unwanted'); end if;
  -- ── v260: a graded slot leaves a lot of its grade, and what stays in the slot keeps it ──
  grade_ := town.grade_in(s);
  for i in 0..jsonb_array_length(lots) - 1 loop
    if lots->i->>'item' = s->>'item' and (lots->i->>'round')::int = cur and (lots->i->>'pays')::int = pays
       and coalesce((lots->i->>'f')::int, 100) = coalesce(p_f, 100) and town.grade_in(lots->i) = grade_ then same := i; exit; end if;
  end loop;
  if same < 0 then
    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur)
      || case when coalesce(p_f, 100) = 100 then '{}'::jsonb else jsonb_build_object('f', p_f) end
      || case when grade_ > 0 then jsonb_build_object('grade', grade_) else '{}'::jsonb end);
  else
    lots := jsonb_set(lots, array[same::text, 'n'], to_jsonb((lots->same->>'n')::int + p_n));
  end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = p_n then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - p_n) end),
    'left', lots));
end;
$function$;

CREATE OR REPLACE FUNCTION town.take_back(p_purse jsonb, p_at integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cur integer := town.round_of(p_now);
  lots jsonb := p_purse->'left';
  lot jsonb;
  k integer := -1;
  hit integer := -1;
  i integer;
begin
  for i in 0..jsonb_array_length(lots) - 1 loop
    if (lots->i->>'round')::int >= cur then
      k := k + 1;
      if k = p_at then hit := i; exit; end if;
    end if;
  end loop;
  if hit < 0 then return town.no(case when jsonb_array_length(lots) > 0 then 'gone' else 'none' end); end if;
  lot := lots->hit;
  -- ── v260: back at its grade ──
  if town.room_g(p_purse->'bag', lot->>'item', town.grade_in(lot)) < (lot->>'n')::int then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', town.put_g(p_purse->'bag', lot->>'item', (lot->>'n')::int, town.grade_in(lot)), 'left', lots - hit));
end;
$function$;

CREATE OR REPLACE FUNCTION town.collect(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cur integer := town.round_of(p_now);
  coins integer;
  kept jsonb;
begin
  -- ── v260: a graded lot of raw produce fetches its grade's share more ──
  select floor(coalesce(sum((l->>'n')::int * (l->>'pays')::int * coalesce((l->>'f')::int, 100) * town.grade_pays(l->>'item', town.grade_in(l))) filter (where (l->>'round')::int < cur), 0) / 100.0)::int,
         coalesce(jsonb_agg(l order by ord) filter (where (l->>'round')::int >= cur), '[]'::jsonb)
    into coins, kept
    from jsonb_array_elements(p_purse->'left') with ordinality x(l, ord);
  if coins = 0 then return town.no('nothing'); end if;
  return jsonb_build_object('ok', true, 'coins', coins,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::int + coins, 'left', kept));
end;
$function$;

CREATE OR REPLACE FUNCTION town.has_all(p_purse jsonb, p_give jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare g jsonb;selected jsonb;slot_ integer;used integer[]:='{}';bag jsonb:=p_purse->'bag';plain jsonb;mine jsonb:=town.tidy_give(p_give);
begin
 for g in select v from jsonb_array_elements(mine) q(v) loop
  selected:=g->2;
  if selected is not null then
   if jsonb_typeof(selected) is distinct from 'object' or jsonb_typeof(selected->'slot') is distinct from 'number' or jsonb_typeof(selected->'stack') is distinct from 'object' then return false;end if;
   if (selected->>'slot')::numeric<>floor((selected->>'slot')::numeric) or (selected->>'slot')::numeric<0 or (selected->>'slot')::numeric>=jsonb_array_length(bag) then return false;end if;
   slot_:=(selected->>'slot')::integer;
   if slot_=any(used) or bag->slot_ is distinct from selected->'stack' or bag->slot_->>'item' is distinct from g->>0 or (bag->slot_->>'n')::numeric<(g->>1)::numeric then return false;end if;
   used:=array_append(used,slot_);
  end if;
 end loop;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into plain from jsonb_array_elements(bag) with ordinality q(v,ord) where not (ord-1)::integer=any(used);
 -- v260: what is given by its kind and not by its slot is normal stock only (graded produce goes only as the slot it is in)
 return not exists(select 1 from jsonb_array_elements(mine) q(v) where v->2 is null and town.held_g(plain,v->>0,0)<(v->>1)::numeric);
end $function$;

CREATE OR REPLACE FUNCTION town.pull(p_bag jsonb, p_give jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  stacks jsonb := '[]'::jsonb;
  g jsonb;
  s jsonb;
  more numeric;
  less numeric;
  i integer;
begin
  for g in select e.v from jsonb_array_elements(p_give) with ordinality e(v, ord) order by e.ord loop
    more := (g->>1)::numeric;
    for i in reverse jsonb_array_length(bag) - 1..0 loop
      exit when more <= 0;
      s := bag->i;
      continue when s = 'null'::jsonb or s->>'item' <> g->>0
        or (g->2 is not null and i<>(g->2->>'slot')::integer)
        or (g->2 is null and exists(select 1 from jsonb_array_elements(p_give) e where e->2 is not null and (e->2->>'slot')::integer=i))
        -- v260: a graded stack goes only as its slot
        or (g->2 is null and town.grade_in(s) > 0);
      less := least(more, (s->>'n')::numeric);
      more := more - less;
      stacks := stacks || jsonb_build_array(s || jsonb_build_object('n', less));
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::numeric = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::numeric - less) end);
    end loop;
  end loop;
  return jsonb_build_object('bag', bag, 'stacks', stacks);
end;
$function$;

-- A pick's fruits (lib/town/quality-plant's harvestOf): the round's range as it stands, one even roll a fruit from the
-- seeded draws, and the fruits by grade. `p_salt` is the private salt (the bench passes an empty one to match the code).
create or replace function town.quality_harvest(p_key text, p_plant jsonb, p_n integer, p_now bigint, p_salt text)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 q jsonb := town.quality_settled(p_plant, p_now); qc jsonb := town.cat('quality'); bars integer[] := '{}'; k integer; ceiling_ integer := 0;
 nar double precision := 0; span_ double precision := (q->>'span')::double precision; brushed boolean; lo integer; hi integer;
 vals integer[] := '{}'; counts integer[] := array[0,0,0,0]; v integer; i integer; g integer; groups jsonb := '[]'::jsonb;
begin
 for k in 0..3 loop
  bars := bars || case when span_ > 0 then greatest(0, least((qc->>'bar')::integer, floor((qc->>'bar')::double precision * (q->'area'->>k)::double precision / span_ + 1e-9)::integer)) else 0 end;
 end loop;
 ceiling_ := least(100, bars[1] + bars[2] + bars[3] + bars[4]);
 brushed := jsonb_typeof(p_plant->'brushed') = 'number' and (p_plant->>'brushed')::bigint >= town.quality_round_start(p_plant);
 for k in 0..2 loop
  nar := nar + (qc->>'narrow')::double precision * least(1, greatest(0, case when span_ > 0 then (q->'nar'->>k)::double precision / span_ else 0 end));
 end loop;
 if brushed then nar := nar + (qc->>'narrow')::double precision; end if;
 hi := greatest(0, least(100, ceiling_));
 lo := greatest(0, hi - ((qc->>'spread')::integer - least((qc->>'narrowest')::integer, floor(nar + 1e-9)::integer)));
 for i in 0..p_n - 1 loop
  v := lo + least(hi - lo, floor(town.roll('quality|' || coalesce(p_salt, '') || '|' || p_key, (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint, i::bigint) * (hi - lo + 1))::integer);
  vals := vals || v;
  g := case when v >= 95 then 3 when v >= 70 then 2 when v >= 40 then 1 else 0 end;
  counts[g + 1] := counts[g + 1] + 1;
 end loop;
 for g in 0..3 loop
  if counts[g + 1] > 0 then groups := groups || jsonb_build_array(jsonb_build_array(g, counts[g + 1])); end if;
 end loop;
 return jsonb_build_object('range', jsonb_build_object('lo', lo, 'hi', hi), 'values', to_jsonb(vals), 'groups', groups);
end $$;

CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
  fruits jsonb;
  g jsonb;
  room_ jsonb;
begin
  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if p->'giant'='true'::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;
  -- ── v260: each fruit's Quality; the bag must hold every grade the pick gives, before anything is done ──
  fruits := town.quality_harvest(p_key, p, n, p_now, (select s.salt from town.quality_salt s where s.one));
  room_ := p_purse->'bag';
  for g in select e.v from jsonb_array_elements(fruits->'groups') e(v) loop
    if town.room_g(room_, p->>'crop', (g->>0)::integer) < (g->>1)::integer then return town.no('full'); end if;
    room_ := town.put_g(room_, p->>'crop', (g->>1)::integer, (g->>0)::integer);
  end loop;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if coalesce(p->'giant','false'::jsonb)<>'true'::jsonb and last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  room_ := mine->'bag';
  for g in select e.v from jsonb_array_elements(fruits->'groups') e(v) loop
    room_ := town.put_g(room_, p->>'crop', (g->>1)::integer, (g->>0)::integer);
  end loop;
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'fruits', jsonb_build_object('range', fruits->'range', 'values', fruits->'values'),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', room_)),p_now);
end;
$function$;

revoke all on function town.grade_in(jsonb), town.held_g(jsonb,text,integer), town.room_g(jsonb,text,integer), town.put_g(jsonb,text,integer,integer),
 town.grade_pays(text,integer), town.quality_harvest(text,jsonb,integer,bigint,text) from public, anon, authenticated;
-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select count(*) from town.quality_salt;                                                         -- 1
--   select has_table_privilege('authenticated','town.quality_salt','SELECT');                       -- false
--   select town.put_g('[null,null]'::jsonb,'tomato',3,2);                                            -- [{"item":"tomato","n":3,"grade":2},null]
--   select town.plain('[{"item":"tomato","n":3,"grade":2},{"item":"tomato","n":2}]'::jsonb,'tomato'); -- 2
