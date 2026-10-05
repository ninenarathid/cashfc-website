-- v139 — hunted, an insect grows scarce
--
-- Run this once in the Supabase SQL editor, after v138 (it needs v131, which
-- has run; it writes the same row v138 writes, with one entry more, so it
-- goes after it). Running it again is safe (see the note on numbers changed
-- by hand, below).
--
-- Why. The owner, 2026-10-05, the afternoon the village was running after
-- ladybirds, having asked for fewer of those (v138): "จริงๆ adapt ไปกับทุกแมลง
-- เลย ยิ่งโดนจับเยอะ ยิ่งหายาก พอเวลาผ่านไปนานพอ (1วัน) ค่อยกลับมาปกติ". The more
-- of a kind are caught, the scarcer that kind; left alone for a day, it is
-- as it was. For every insect.
--
-- What is counted. Every catch is written down already (v121: a line of
-- `town_deeds`, `what` = 'net', `thing` the insect, `n` how many, `at` the
-- moment). Nothing new is kept: a kind's scarcity is read from those lines,
-- the whole village's, on every map. So what was caught before this file
-- ran counts from the moment it runs, for what is left of its day.
--
-- The rule (lib/town/insects.ts's plentyOf; `town.plenty` here). Each insect
-- caught counts against its kind: wholly at first, less with every hour,
-- and not at all once a day has gone by (`scarce.day`, 24 hours: a catch
-- twelve hours old counts for half an insect). With twenty of them counting
-- (`scarce.half`) the kind is out half as often as its haunts roll it; with
-- forty, a third as often; with sixty, a quarter:
--
--   plenty = half / (half + what counts against it)
--
-- A haunt rolls its turn as it always did: whether it has an insect, and
-- which, by where it is, the hour, the sky and the weights (v125's
-- `town.bug_at`). Then the insect rolled is out only as often as its kind
-- is plentiful as that turn begins, by where the same roll fell within the
-- insect's own share of the weights (a number from 0 up to 1 that says
-- nothing of which insect it is). If it is not out, the haunt has nothing
-- that turn: no other insect takes its place. So a kind that is alone at
-- its haunts (a dragonfly at the town's water) grows scarce like any other,
-- and a kind nobody catches is not made commoner by the hunting of another.
--
-- It is decided as a turn begins, by what was caught before that moment:
-- nothing caught during a turn changes what that turn has, so an insect
-- does not vanish from under a net, and everybody is told the same.
--
-- An insect that comes back after a catch (v131's `town.comeback`: half a
-- minute later, at another haunt of the map) comes only as often as its
-- kind is plentiful at the catch, the same way. Otherwise the kinds that
-- are hunted hardest would come back the most.
--
-- What it does on the day it runs. In the insects' first four hours the
-- village caught 211: 72 dragonflies, 35 cicadas, 26 ladybirds and as many
-- caterpillars, 20 damselflies, 10 grasshoppers, a handful each of seven
-- more. With those counting, a dragonfly is out about a quarter as often
-- as its haunts roll it, a cicada two times in five, a ladybird and a
-- caterpillar a little under half, a damselfly half, a grasshopper two
-- times in three; the kinds with a handful, nine times in ten or more.
-- An insect that is out when this runs and is not out by this rule is gone
-- from the pages within the minute (they ask every forty-five seconds),
-- and a swing at it meanwhile is told it is gone.
--
-- `half` is not the owner's number: he gave the rule and the day. Twenty
-- is a morning's catch of the commonest insect by the whole village. It is
-- a number of the catalog, his to change with one line:
--
--   update public.town_catalog set data = jsonb_set(data, '{scarce,half}', '30'), updated_at = now() where key = 'insects';
--
-- (and lib/town/insects.ts's SCARCE with it, so that the next file that
-- writes this row over does not put it back).
--
-- What it changes.
--
--   · an index on the catches: `town_deeds_net` (thing, at), where `what`
--     is 'net'. The table is small; the index is so that a look at every
--     haunt reads a kind's day of catches and no more.
--   · `town.plenty(insect, moment)`, new.
--   · `town.bug_at` (v125's) and `town.comeback` (v131's), each written
--     again as it ran but for a declaration and the four lines that thin it
--     (scripts/db/v139.lines.mjs; `node build-v139.mjs` writes them from the
--     texts that ran). `town.bug_here`, `town_bugs` and `town_net` call
--     those two and are not touched.
--   · the catalog's `insects` row, written over: `scarce`, new, and what
--     v138 wrote of the ladybird, again.
--
-- No table, no column, no trigger. The page draws what it is told is out,
-- so the site and this file may go out in either order.
--
-- NUMBERS CHANGED BY HAND. This file writes the `insects` row OVER, whole.
-- After v138 one entry differs from the live row: `scarce`. (Run before
-- v138, the ladybird's four entries differ too: it does v138's work as
-- well.) No other row is touched, here or by running it twice.

do $$
begin
  if to_regprocedure('town.comeback(integer, bigint, jsonb, double precision, double precision, double precision, jsonb, text)') is null then
    raise exception 'v131 has not run yet: an insect''s coming back (town.comeback) is what this file writes again';
  end if;
  if to_regclass('public.town_deeds') is null then
    raise exception 'v121 has not run yet: the catches are read from town_deeds';
  end if;
end $$;

/* ── the catches, read a kind and a day at a time ────────────────────────── */

create index if not exists town_deeds_net on public.town_deeds (thing, at) where what = 'net';

/* ── the rule ────────────────────────────────────────────────────────────── */

-- lib/town/insects.ts's plentyOf(): how much of its usual self an insect is
-- at a moment, from 1 (none caught in the day before it) down towards
-- nothing. Each catch before that moment counts for as much of itself as is
-- left of its day. Whole numbers until the one division, so that the answer
-- is the code's to the last digit. (A catch's moment is kept to the
-- millisecond by town.note; it is read back as one. The two lines on `at`
-- are for the index, a second wide of the mark on either side; the two on
-- `ms` are the rule.) With no `scarce` in the catalog, everything is
-- plentiful.
create or replace function town.plenty(p_bug text, p_at bigint, p_cat jsonb default null)
returns double precision language plpgsql stable set search_path = public
as $$
declare
  sc jsonb := coalesce(p_cat, town.cat('insects'))->'scarce';
  day bigint;
  half numeric;
  against numeric;
begin
  if sc is null or p_bug is null or p_at is null then return 1; end if;
  day := ((sc->>'day')::numeric * 3600000)::bigint;
  half := (sc->>'half')::numeric;
  select coalesce(sum(d.n * (day - (p_at - m.ms))), 0) into against
    from public.town_deeds d, lateral (select floor(extract(epoch from d.at) * 1000)::bigint as ms) m
   where d.what = 'net' and d.thing = p_bug
     and d.at > to_timestamp((p_at - day) / 1000.0) - interval '1 second'
     and d.at < to_timestamp(p_at / 1000.0) + interval '1 second'
     and m.ms < p_at and m.ms > p_at - day;
  return (half * day)::double precision / (half * day + against)::double precision;
end;
$$;

/* ── what a haunt has: v125's, thinned by how plentiful its insect is ────── */

-- <bug_at>
create or replace function town.bug_at(p_haunt integer, p_now bigint, p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  ids jsonb := ins->'order';
  bug jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick text := null;
  i integer;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>i, h->>1, h->>2, at_, word));
    if fits[i + 1] then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * total;
  for i in 0..jsonb_array_length(ids) - 1 loop
    if fits[i + 1] then
      pick := ids->>i;
      left_ := left_ - (ins->'bugs'->pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  -- hunted, it is out less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is as the turn begins. Nothing takes its place.
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase);
end;
$$;
-- </bug_at>

/* ── what comes back after a catch: v131's, thinned the same way ─────────── */

-- <comeback>
create or replace function town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision,
  p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  whence jsonb := ins->'haunts'->p_haunt;
  at_ bigint := p_now + (ins->'comeback'->>'after')::bigint * 1000;
  least_ bigint := (ins->'comeback'->>'least')::bigint * 1000;
  ids jsonb := ins->'order';
  backs jsonb := coalesce(p_backs, '[]'::jsonb);
  free integer[] := '{}';
  turns bigint[] := '{}';
  begins bigint[] := '{}';
  h jsonb;
  kind jsonb;
  bug jsonb;
  every bigint;
  phase bigint;
  turn bigint;
  began bigint;
  some_ boolean;
  n integer;
  nth integer;
  i integer;
  j integer;
  total double precision := 0;
  left_ double precision;
  pick text := null;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    every := (kind->>'every')::bigint * 60000;
    phase := floor(town.roll('bugphase', i) * (kind->>'every')::double precision)::bigint * 60000;
    turn := floor((at_ + phase)::numeric / every)::bigint;
    began := turn * every - phase;
    continue when began + every - at_ < least_;
    continue when town.bug_at(i, at_, ins, word) is not null;
    continue when exists (select 1 from jsonb_array_elements(backs) x where (x->>'haunt')::int = i and (x->>'turn')::bigint = turn);
    some_ := false;
    for j in 0..jsonb_array_length(ids) - 1 loop
      bug := ins->'bugs'->(ids->>j);
      if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, began, word) then some_ := true; exit; end if;
    end loop;
    continue when not some_;
    free := free || i;
    turns := turns || turn;
    begins := begins || began;
  end loop;
  n := coalesce(array_length(free, 1), 0);
  if n = 0 then return null; end if;
  nth := least(n - 1, greatest(0, floor(coalesce(p_r1, 0) * n)::int)) + 1;
  i := free[nth];
  h := ins->'haunts'->i;
  -- the insect: by that haunt's own weights, as its own turn would roll it
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * total;
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then
      pick := ids->>j;
      left_ := left_ - (bug->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  -- hunted, it is back less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is at the catch. Nothing takes its place.
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, p_now, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('haunt', i, 'turn', turns[nth], 'bug', pick,
    'n', lo + least(hi - lo, greatest(0, floor(coalesce(p_r3, 0) * (hi - lo + 1))::int)), 'from', at_);
end;
$$;
-- </comeback>

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v139> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":22,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":6,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":10,"chance":0.55,"shares":1},"water":{"every":10,"chance":0.5,"shares":1},"field":{"every":10,"chance":0.55,"shares":1},"lamp":{"every":10,"chance":0.6,"shares":1},"tree":{"every":20,"chance":0.5,"shares":1},"litter":{"every":20,"chance":0.5,"shares":1},"glade":{"every":60,"chance":0.25,"shares":1},"falls":{"every":30,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v139>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call, the new one with them.
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select town.cat('insects')->'scarce' as scarce,
--          town.cat('insects')->'bugs'->'ladybird'->>'weight' as ladybird,
--          (select count(*) from jsonb_each(town.cat('insects')->'bugs')) as insects;
--   -- {"day": 24, "half": 20} | 6 | 24
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- insects: t. Every other row: f. (`written` is true for an hour after
--   -- it runs)
--
--   select indexdef from pg_indexes where schemaname = 'public' and indexname = 'town_deeds_net';
--   -- CREATE INDEX town_deeds_net ON public.town_deeds USING btree (thing, at) WHERE (what = 'net'::text)
--
--   select has_function_privilege('authenticated', 'town.plenty(text, bigint, jsonb)', 'execute') as plenty,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- false | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how plentiful each kind is now (1: as its haunts roll it; 0.5: half as often), and how many were caught in the day
--   select b.key as insect, round(town.plenty(b.key, town.now_ms())::numeric, 2) as plenty,
--          (select coalesce(sum(d.n), 0) from public.town_deeds d where d.what = 'net' and d.thing = b.key and d.at > now() - interval '1 day') as caught_in_the_day
--     from jsonb_each(town.cat('insects')->'bugs') b order by 2, 1;
