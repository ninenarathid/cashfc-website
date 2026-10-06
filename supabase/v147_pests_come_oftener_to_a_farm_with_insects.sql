-- v147 — pests come a little oftener to a farm with insects on it
--
-- Run this once in the Supabase SQL editor, after v145 (it stops if v145
-- has not run). Running it again is safe (see the note on numbers changed
-- by hand, below).
--
-- Why. The owner, 2026-10-06:
--
--   "ช่วยทำให้ ใรช่วงที่มีแมลงมาโจทตีพืช ทำให้ % การโจมตีสูงขึ้นถ้ามี แมลงอยู่ในแมพ ฟาร์ม
--    แต่ถ้าไม่มีเลยก็เท่าเดิม"
--   "สูงขึ้นเล็กน้อยพอซัก 1-2 %"
--
-- A pest strikes a growing plant three times in a hundred in each of the
-- pests' hours (eight in the morning to six in the evening). Whether one
-- has struck is not kept: it is worked out from the plot and the hours
-- gone by (`town.pest_at`), the same for everybody who looks, and the
-- page works it out for itself from what it is told of each plot. So "the
-- insects on the farm" has to be something kept: counted once, and the
-- same for the page and for this database ever after.
--
-- What it does.
--
--   · THE FARM'S HOUR IS COUNTED. `town_swarms`: an hour of the pests' to
--     a row, with how many insects that eat plants were on the farm when
--     it was counted. It is counted once, the first time anybody looks at
--     the farm in that hour (`town_farm`, which every page at the farm
--     asks every minute or so): the insects out at the farm's haunts at
--     that moment that nobody has caught (as `town_bugs` tells a member
--     who has caught nothing), less the two that eat pests (the ladybird
--     and the mantis, `farming.rids`: left on the farm they harm nothing).
--     A row is never changed, so a pest, once worked out, stays worked out.
--
--   · AN HOUR NOBODY LOOKED AT THE FARM IN IS NOT COUNTED, and counts as
--     an hour with none: nothing strikes oftener behind everybody's back
--     (mine: the insects are out at their haunts whether anybody is there
--     or not, and a farm left alone a day would otherwise always have the
--     higher chance, with nobody there to do anything about it).
--
--   · A PEST STRIKES A LITTLE OFTENER IN SUCH AN HOUR. `town.pest_at`
--     (v118's, written again): three in a hundred where the hour had none;
--     four where it had some (one to three); five where it had many (four
--     or more). The steps are the catalog's (`farming.pests.swarm`: some
--     1, many 4, adds 0.01 and 0.02) and mine: left alone, a dry day's
--     farm has about six such insects out at a time, so "many" is a farm
--     nobody hunts on and "some" one that somebody has thinned. With all
--     of them caught as the hour turns, it is as it always was. Over a
--     whole day of the pests' ten hours a growing plant is struck 26 times
--     in a hundred with none, 34 with some all day, 40 with many all day.
--
--   · THE PAGE IS TOLD THE HOURS. `town_farm` (v110's, written again)
--     counts the hour, and its answer has `swarms`: the hours counted with
--     any insect since the page last asked (thirty days back at the most,
--     for a page that asks for the first time).
--
--   · AND ONE THING PUT RIGHT while the rule is open: a plant rid of a pest
--     on the very stroke of its hour had it still (that hour's roll was
--     counted from the cure's moment inclusive: one moment in 3,600,000).
--     The pest that comes at the very moment a plant is rid of one is the
--     one it was rid of.
--
-- THE CODE MUST BE LIVE WELL BEFORE THIS RUNS, and pages open since before
-- it have to be loaded again: a page built before does not know of the
-- hours, works the pests out at three in a hundred, and so does not show
-- the one pest in three (at the most) that this database now counts; a
-- plant would have a pest its owner's old page does not draw. A page with
-- the new code and a database without this file is as before (no hours
-- are told, and every hour is one with none).
--
-- It writes two functions again, each as it last ran but for the lines
-- meant (scripts/db/v147.lines.mjs; `node build-v147.mjs`): `town.pest_at`
-- (v118's) and `public.town_farm` (v110's). Three are new:
-- `town.farm_bugs`, `town.swarm_note`, `town.swarms_told`. One closed
-- table. Every other rule that looks for a pest (`town.see`, and through
-- it what a hand is offered, a cure, an insect let go, a ladybird's catch)
-- calls `town.pest_at` and is as it was.
--
-- NUMBERS CHANGED BY HAND. This file writes one row of the catalog OVER,
-- whole (`farming`: `pests.swarm`, new). It was last written by v145: if
-- it has been changed by hand since, the first query at the foot says
-- when: look before running it. No other row is touched.

do $$
begin
  if to_regprocedure('town.bug_here(integer, bigint, jsonb, jsonb, text)') is null then
    raise exception 'v131 has not run yet: what a haunt has (town.bug_here) is what this file counts by';
  end if;
  if (select c.data->'rids' from public.town_catalog c where c.key = 'farming') is null then
    raise exception 'v145 has not run yet: the farm''s row this file writes over is the one that file leaves, and which insects eat pests (rids) is what the count leaves out';
  end if;
end $$;

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v147> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "rids": {"ladybird":0.5,"mantis":0.7},
    "cures": {"pestCure":24},
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6,"swarm":{"some":1,"many":4,"adds":[0.01,0.02]}},
    "swings": {"clear":3,"till":3},
    "pulled": "compost",
    "stages": [0,0.1,0.3,0.6,1],
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","mosquitofish":"guard","herring":"feed","archerfish":"cure","mulch":"feed","lavenderSachet":"guard","butterflyWhite":"feed","monarch":"feed","mantis":"guard","ladybird":"guard","scarab":"feed","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
    "seeds": {"seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2,"waterYoke":2,"waterYokeGreat":4,"waterCart":6},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v147>

/* ── the farm's hours, counted ───────────────────────────────────────────── */

-- An hour of the pests' (its number: the clock's milliseconds over an hour,
-- whole, as `town.pest_at` rolls by) to a row: how many insects that eat
-- plants were on the farm when it was counted, and the moment it was.
-- Nobody in a browser reads or writes it: the farm's answer tells the
-- hours, and only `town.swarm_note` writes one, once.
create table if not exists public.town_swarms (
  hour  bigint primary key,
  bugs  integer not null check (bugs >= 0),
  noted bigint not null
);
create index if not exists town_swarms_noted on public.town_swarms (noted);
alter table public.town_swarms enable row level security;
revoke all on public.town_swarms from anon, authenticated;

-- lib/town/insects.ts's farmBugs(): the insects out at the farm's haunts at
-- a moment (their own, or come back there) that nobody has caught, less
-- the kinds that eat pests.
create or replace function town.farm_bugs(p_now bigint)
returns integer language plpgsql stable
as $$
declare
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(p_now);
  rids jsonb := coalesce(town.cat('farming')->'rids', '{}'::jsonb);
  has jsonb;
  taken integer;
  n integer := 0;
  i integer;
begin
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    continue when ins->'haunts'->i->>1 <> 'farm';
    has := town.bug_here(i, p_now, backs, ins, word);
    continue when has is null or rids ? (has->>'bug');
    select count(*)::int into taken from public.town_takes tk where tk.what = 'haunt' and tk.place = i and tk.turn = (has->>'turn')::bigint;
    continue when taken >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Count this hour, if it is one of the pests' and has not been counted:
-- once, and never again (of two who look at the same moment, the second's
-- count is dropped).
create or replace function town.swarm_note(p_now bigint)
returns void language plpgsql
as $$
declare
  f jsonb := town.cat('farming');
  h bigint := floor(p_now::numeric / 3600000)::bigint;
  -- (the hour of the day, by Bangkok's clock; not named as the table's column is)
  of_day integer := ((((h * 3600000 + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
begin
  if of_day < (f->'pests'->>'from')::int or of_day >= (f->'pests'->>'to')::int then return; end if;
  if exists (select 1 from public.town_swarms s where s.hour = h) then return; end if;
  insert into public.town_swarms (hour, bugs, noted) values (h, town.farm_bugs(p_now), p_now) on conflict (hour) do nothing;
end;
$$;

-- The hours counted with any insect since a moment (as the page last
-- asked), thirty days back at the most: an hour's number to how many.
create or replace function town.swarms_told(p_since bigint)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb)
    from public.town_swarms s
   where s.bugs > 0 and s.noted > p_since and s.hour > floor(town.now_ms()::numeric / 3600000)::bigint - 30 * 24
$$;

/* ── when a pest struck: v118's, a little oftener in such an hour ────────── */

-- <pest_at>
create or replace function town.pest_at(p_key text, p_plant jsonb, p_now bigint)
returns bigint language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks then false
        when picked > 0 then again is not null and (t - picked_at)::double precision / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then return t; end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$$;
-- </pest_at>

/* ── the farm as everybody sees it: v110's, with the hours counted ───────── */

-- <town_farm>
create or replace function public.town_farm(p_since bigint default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  since bigint := greatest(coalesce(p_since, 0), 0) - 10000;
begin
  -- (somebody is looking at the farm: this hour of the pests' is counted, if it has not been)
  perform town.swarm_note(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'swarms', town.swarms_told(since),
    'well', town.thing('well', false),
    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                from public.town_plots p where p.changed > since),
    'beds', (select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b));
end;
$$;
-- </town_farm>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call, new or written again; and the farm is
-- a member's to look at, as it was (a function written again keeps who may
-- call it: said again so that it is so whatever ran before).
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_farm(bigint) from public, anon;
grant execute on function public.town_farm(bigint) to authenticated;

notify pgrst, 'reload schema';

-- ─── Before running it ───────────────────────────────────────────────────
--
-- Has the farm's row been changed by hand since v145 wrote it?
--
--   select key, updated_at, data->'pests' as pests, data->'rids' as rids from public.town_catalog where key = 'farming';
--
-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- farming: t. Every other row: f.
--
--   select data->'pests' as pests from public.town_catalog where key = 'farming';
--   -- {"to": 18, "from": 8, "kills": 6, "swarm": {"adds": [0.01, 0.02], "many": 4, "some": 1}, "chance": 0.03}
--
--   -- the table is there and closed; the count is a number (how many insects that eat plants are on the farm now)
--   select (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_swarms' and grantee in ('anon', 'authenticated')) as grants,
--          (select relrowsecurity from pg_class where oid = 'public.town_swarms'::regclass) as rls,
--          town.farm_bugs(town.now_ms()) >= 0 as counts;
--   -- 0 | t | t
--
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
--          has_function_privilege('anon', 'public.town_farm(bigint)', 'execute') as anon_looks,
--          has_function_privilege('authenticated', 'public.town_farm(bigint)', 'execute') as a_member_looks;
--   -- 0 | f | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the hours counted, a day at a time: how many had none, some, many (an hour of the pests' with no row is one
--   -- nobody looked at the farm in)
--   select date_trunc('day', to_timestamp(s.hour * 3600) at time zone 'Asia/Bangkok') as day, count(*) as hours_counted,
--          count(*) filter (where s.bugs = 0) as none, count(*) filter (where s.bugs between 1 and 3) as some,
--          count(*) filter (where s.bugs >= 4) as many, round(avg(s.bugs), 1) as insects_an_hour
--     from public.town_swarms s group by 1 order by 1 desc;
--
--   -- today's hours, one by one (Bangkok's clock)
--   select to_char(to_timestamp(s.hour * 3600) at time zone 'Asia/Bangkok', 'HH24:00') as hour, s.bugs,
--          to_char(to_timestamp(s.noted / 1000.0) at time zone 'Asia/Bangkok', 'HH24:MI:SS') as counted_at
--     from public.town_swarms s where s.hour >= floor(extract(epoch from date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok') / 3600)
--    order by s.hour;
