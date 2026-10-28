-- v309 — a giant fish landed together
-- Run this once in the Supabase SQL editor, after v308. Running it again is safe and changes nothing more.
--
-- The owner, 2026-10-27, after members said fishing was "not fun, not rich", to the plan both AIs made: "1 ต้องมีเพื่อน
-- เท่านั้น ต้องมีเฟสให้พิมพ์บอกเพื่อนในเกมได้ด้วย 2 ขายได้ 3 เอาตามที่แนะนำ". lib/town/giant-fish is the page's twin, word for
-- word in its numbers (GIANT, the twenty GIANT_ROWS, GIANT_BAIT, RARE_WEIGHT; town.giant_rules() below carries them).
--
-- What changes:
--   * The hook (public.town_cast). On a line by itself, dropped with its water's bait (dough in the town's water, worm
--     in the creek, minnow at the headwater, cricket in the pool; or what stands for one, lib/town/items' BAIT_AS), at an
--     hour a giant is out there, what has come up as no fish (the hyacinth, the boot, the driftwood, the bottle) is a
--     giant at 0.02 / J, J being what is no fish's share of the cast's own odds: a giant is 2% of such a cast, taken only
--     from what is no fish, and a fish's chance is never touched. Never with less than 2% that is no fish, never on a
--     stardust bait, never within twenty minutes of the angler's last giant (counted from public.town_giant_hooks).
--     A rod of two lines or three never hooks one: the trial keeper's cast gives a pair none, and the page, told of a
--     giant, ends the whole line (TownFish), so a pair's other fish would be lost. The hour is the one the fish answer
--     to (under a sky orb, the orb's), as the trial's cast has it. Which giant, its length and its weight are drawn at
--     the cast and kept on the line (`giant`), for the strike.
--   * The hold (public.town_strike). A line with a giant on it, struck in the same moment as any bite (v229's base:
--     not too soon, not too late, a golden rod's late strike too), is not fought and costs no stamina: the line is
--     taken up, and the hook is kept in public.town_giant_hooks (the GiantHook of lib/town/giant-fish, its id, both
--     names, the post's tile and water, the database's milliseconds throughout), and the strike's answer carries it
--     (`giant`). A strike too soon or too late, or a bite let go by with no reaction (the page has given the line up
--     then), goes on as it always did.
--   * The rest of it (public.town_giant_fish): the angler calls the town (three calls, a minute apart, 120 letters,
--     each one the town's news: town_announcements' kind 'giant', its `to` the hook and the post), lets the giant go,
--     or frays the line on the rocks (the third breaks it); a netter joins within six tiles of the post while it
--     holds (four minutes), and the fight runs ninety seconds on the database's clock (five of grace for a late
--     report): the third scoop, six seconds apart and the first six after the join, lands it. Each of the two then
--     claims a giant steak (`giantSteak`, refused when the bag has no room). The row is held while a deed is judged,
--     so that two joins or two scoops cannot both be taken. public.town_giants_now: every giant still held or fought,
--     and those of mine ended in the last ten minutes (a steak a page missed is still there to claim).
--   * Points for both (the owner, 2026-10-28: "ควรได้แต้มทั้งคู่"): as each of the two takes their steak, a `giant` deed is
--     written in their name, and the deeds' trigger counts it on their fishing line (town.work_counts_of, lib/town/
--     line-points' countsOf): a rare fish's worth (8), a legend's for the rare one before dawn (30), the work row's
--     `giants`, and the first of each giant ten more, as every line's first is.
--   * The giant steak: in the catalog (kind catch, tier 3, ten to a slot, paid 120), and in the market with a band of
--     its own (lib/town/market's MARKET.fixed): five a round usual for the whole village, never counted by heads,
--     84 to 100 of its 120.
--   * The announcements: the full reader is town_announcements_v309 from here on, with each event's `to`, and
--     town_announcements_v299, which pages from before this one ask, leaves the giants' calls out (their banner has no
--     words for one), as v299 did for the casino.
--
-- public.town_cast and public.town_strike are written whole, as v264 and v229 left them (v281's third float line in the
-- cast too) with only the giant added, and so are town.market_knobs and town.market_things (v285, v291) with only the
-- band; the file stops before anything changes if one of them is not exactly that, or this file's already.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $guard$
declare
  f text[];
begin
  if to_regprocedure('public.town_strike_v229(integer)') is null or to_regprocedure('town.fishing_power_seed(uuid,bigint)') is null then
    raise exception 'v309: run v229 first';
  end if;
  if to_regprocedure('public.town_announcements_v299(bigint,text)') is null and to_regprocedure('public.town_announcements_v309(bigint,text)') is null then
    raise exception 'v309: run v299 first';
  end if;
  if to_regprocedure('town.room(jsonb,text)') is null or to_regprocedure('town.put(jsonb,text,integer)') is null
     or to_regprocedure('town.announce(uuid,text,text,integer,text,boolean)') is null then
    raise exception 'v309: the bag''s and the announcements'' functions (v255, v260) are missing';
  end if;
  if to_regprocedure('town.work_counts_of(jsonb,text)') is null or to_regprocedure('town.note(uuid,text,text,numeric,numeric,jsonb)') is null
     or not exists (select 1 from public.town_catalog c where c.key = 'work') then
    raise exception 'v309: the lines'' points (v153, v307) are missing';
  end if;
  -- (each function written whole here, as the database has it from the files before: its text without CR, or this file's)
  foreach f slice 1 in array array[
    ['public.town_cast(text,integer,integer,boolean,text,text)', '11761cbd182181c3aecbbbe3843c0138', 'v264 and v281'],
    ['public.town_strike(integer)', 'ac755c4f995481f00bb8a45cbb47f065', 'v229'],
    ['town.market_knobs()', '76654db0fb07d3e579085afa7db74db2', 'v285'],
    ['town.market_things(jsonb)', 'dc35d430e17eccbdbdcaf2d0f7ea6a34', 'v291']] loop
    if to_regprocedure(f[1]) is null then raise exception 'v309: % is missing: run % first', f[1], f[3]; end if;
    if not exists (select 1 from pg_proc p where p.oid = to_regprocedure(f[1])
                    and (md5(replace(p.prosrc, chr(13), '')) = f[2] or position('v309' in p.prosrc) > 0)) then
      raise exception 'v309: % is not as % left it: it has moved since, rebuild v309', f[1], f[3];
    end if;
  end loop;
end $guard$;

-- ── 1. The giant steak in the catalog ─────────────────────────────────────────────────────────────────────────────────
-- (lib/town/giant-fish's GIANT_ITEMS, as lib/town/catalog writes a thing: only this entry, never the whole row)
update public.town_catalog c
   set data = jsonb_set(c.data, '{giantSteak}', '{"kind": "catch", "tier": 3, "stack": 10, "pays": 120}'::jsonb), updated_at = now()
 where c.key = 'items' and c.data->'giantSteak' is distinct from '{"kind": "catch", "tier": 3, "stack": 10, "pays": 120}'::jsonb;

-- ── 1b. A giant on the fishing line ───────────────────────────────────────────────────────────────────────────────────
-- (the owner, 2026-10-28: "ควรได้แต้มทั้งคู่". lib/town/line-points' POINTS.giant and giantPoints: to each of the two who
-- landed it, a rare fish's worth, a legend's for the dawn's rare one, as linesRow writes them into the work row's
-- `giants`, entry by entry; the first of each giant ten more, as every line's first is)
update public.town_catalog c
   set data = jsonb_set(c.data, '{giants}', coalesce(c.data->'giants', '{}'::jsonb) || m.v), updated_at = now()
  from (select '{"sailbackCarp": 8, "bronzeBuffalo": 8, "lanternCatfish": 8, "palePaddlefish": 8, "glasswakeCarp": 30, "reedbackBarbel": 8,
    "copperLongfin": 8, "rootjawCatfish": 8, "ribbonEel": 8, "mistveilBarbel": 30, "graniteMahseer": 8, "torrentSalmon": 8, "slateSturgeon": 8,
    "snowfinTaimen": 8, "dawncrestSturgeon": 30, "lotusGourami": 8, "mirrorbackPerch": 8, "velvetArowana": 8, "pearlBichir": 8,
    "moonthreadEel": 30}'::jsonb as v) m
 where c.key = 'work' and coalesce(c.data->'giants', '{}'::jsonb) || m.v is distinct from c.data->'giants';
-- (countsOf's `giant`: the deed a steak taken writes, counted on the fishing line by the giant's worth; its live text,
-- this case added before the net's, as v307 added the giant pull's)
do $$
declare d text; o text; nw text; n integer;
begin
  d := replace(pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure), chr(13), '');
  o := '  if what = ''net'' then';
  nw := '  -- ── v309: a giant fish landed together, on the fishing line of each of the two (lib/town/line-points: giantPoints) ──
  if what = ''giant'' then
    if coalesce((l->''giants''->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object(''to'', null, ''line'', ''fishing'', ''raw'', l->''giants''->thing, ''first'', ''fishing:'' || thing));
    end if;
    return ''[]''::jsonb;
  end if;
  if what = ''net'' then';
  if position('v309: a giant fish landed together' in d) = 0 then
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n <> 1 then raise exception 'v309: town.work_counts_of has % of [%], not one: rebuild v309', n, o; end if;
    execute replace(d, o, nw);
  end if;
end $$;

-- ── 2. The hooks ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- One row a giant hooked: `doc` is the GiantHook as the page reads it; `by_id` and `at` (its doc's `by` and `at`) are
-- what the cast's twenty minutes and the board's reading look it up by. Nobody reads or writes it but the functions below.
create table if not exists public.town_giant_hooks (
  id text primary key check (id ~ '^g[0-9a-f]{15}$'),
  by_id uuid not null references public.profiles (id) on delete cascade,
  at bigint not null,
  doc jsonb not null check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);
create index if not exists town_giant_hooks_at on public.town_giant_hooks (at);
create index if not exists town_giant_hooks_by_at on public.town_giant_hooks (by_id, at desc);
alter table public.town_giant_hooks enable row level security;
revoke all on public.town_giant_hooks from public, anon, authenticated;

-- ── 3. The rules ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- lib/town/giant-fish's GIANT (but `cue` and `tired`, the pages' own), RARE_WEIGHT, GIANT_BAIT, BAIT_AS, lib/town/fishing's
-- FRESH_JUNK, and the twenty giants with the hours of their bands (lib/town/band-species' hoursOf).
create or replace function town.giant_rules()
returns jsonb language sql immutable set search_path = '' as $$
  select '{"chance": 0.02, "every": 1200000, "hold": 240000, "fight": 90000, "scoops": 3, "frays": 3, "calls": 3, "callGap": 60000,
    "callLen": 120, "scoopGap": 6000, "frayGap": 2000, "grace": 5000, "reach": 6, "after": 600000, "rareWeight": 0.5,
    "bait": {"town": "dough", "creek": "worm", "headwater": "minnow", "pool": "cricket"},
    "baitAs": {"caterpillar": "worm", "moth": "dough", "dragonfly": "minnow", "grasshopper": "cricket", "forktailBlueEye": "minnow",
      "zebrafish": "minnow", "rosyBitterling": "minnow", "leastKillifish": "minnow", "europeanBullhead": "minnow"},
    "junk": ["hyacinth", "boot", "driftwood", "bottle"],
    "rows": [
      {"id": "sailbackCarp", "water": "town", "hours": [[7, 19]], "rare": false, "size": [120, 165], "k": 18},
      {"id": "bronzeBuffalo", "water": "town", "hours": [[11, 23]], "rare": false, "size": [110, 150], "k": 22},
      {"id": "lanternCatfish", "water": "town", "hours": [[0, 7], [19, 24]], "rare": false, "size": [160, 230], "k": 11},
      {"id": "palePaddlefish", "water": "town", "hours": [[0, 11], [23, 24]], "rare": false, "size": [150, 210], "k": 8},
      {"id": "glasswakeCarp", "water": "town", "hours": [[3, 7]], "rare": true, "size": [130, 175], "k": 18},
      {"id": "reedbackBarbel", "water": "creek", "hours": [[7, 19]], "rare": false, "size": [100, 140], "k": 12},
      {"id": "copperLongfin", "water": "creek", "hours": [[11, 23]], "rare": false, "size": [90, 130], "k": 14},
      {"id": "rootjawCatfish", "water": "creek", "hours": [[0, 7], [19, 24]], "rare": false, "size": [140, 200], "k": 11},
      {"id": "ribbonEel", "water": "creek", "hours": [[0, 11], [23, 24]], "rare": false, "size": [160, 230], "k": 2.5},
      {"id": "mistveilBarbel", "water": "creek", "hours": [[3, 7]], "rare": true, "size": [110, 150], "k": 12},
      {"id": "graniteMahseer", "water": "headwater", "hours": [[7, 19]], "rare": false, "size": [120, 170], "k": 13},
      {"id": "torrentSalmon", "water": "headwater", "hours": [[11, 23]], "rare": false, "size": [110, 150], "k": 12},
      {"id": "slateSturgeon", "water": "headwater", "hours": [[0, 7], [19, 24]], "rare": false, "size": [180, 260], "k": 8},
      {"id": "snowfinTaimen", "water": "headwater", "hours": [[0, 11], [23, 24]], "rare": false, "size": [140, 200], "k": 10},
      {"id": "dawncrestSturgeon", "water": "headwater", "hours": [[3, 7]], "rare": true, "size": [190, 270], "k": 8},
      {"id": "lotusGourami", "water": "pool", "hours": [[7, 19]], "rare": false, "size": [70, 100], "k": 26},
      {"id": "mirrorbackPerch", "water": "pool", "hours": [[11, 23]], "rare": false, "size": [80, 115], "k": 22},
      {"id": "velvetArowana", "water": "pool", "hours": [[0, 7], [19, 24]], "rare": false, "size": [100, 140], "k": 7},
      {"id": "pearlBichir", "water": "pool", "hours": [[0, 11], [23, 24]], "rare": false, "size": [90, 130], "k": 7},
      {"id": "moonthreadEel", "water": "pool", "hours": [[3, 7]], "rare": true, "size": [150, 210], "k": 2.5}]}'::jsonb
$$;

-- giantsOut: the giants out in a water at an hour, each with its weight, in the rows' order
create or replace function town.giants_out(p_water text, p_hour double precision)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.v->>'id', 'w', case when (g.v->>'rare')::boolean then (k.r->>'rareWeight')::double precision else 1 end) order by g.n), '[]'::jsonb)
    from (select town.giant_rules() r) k
    cross join lateral jsonb_array_elements(k.r->'rows') with ordinality g(v, n)
   where g.v->>'water' = p_water
     and exists (select 1 from jsonb_array_elements(g.v->'hours') x where p_hour >= (x->>0)::double precision and p_hour < (x->>1)::double precision)
$$;

-- giantOf: which giant by a roll in [0, 1), its length (whole cm, in its range) and its weight (kg, a tenth)
create or replace function town.giant_of(p_water text, p_hour double precision, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  out_ jsonb := town.giants_out(p_water, p_hour);
  all_ double precision := 0;
  at_ double precision;
  id_ text;
  o jsonb;
  g jsonb;
  size_ integer;
begin
  if jsonb_array_length(out_) = 0 then return null; end if;
  for o in select x from jsonb_array_elements(out_) with ordinality a(x, n) order by n loop all_ := all_ + (o->>'w')::double precision; end loop;
  at_ := p_r1 * all_;
  id_ := out_->-1->>'id';
  for o in select x from jsonb_array_elements(out_) with ordinality a(x, n) order by n loop
    if at_ < (o->>'w')::double precision then id_ := o->>'id'; exit; end if;
    at_ := at_ - (o->>'w')::double precision;
  end loop;
  select x into g from jsonb_array_elements(town.giant_rules()->'rows') x where x->>'id' = id_;
  -- (Math.round of a number this size is the floor of it and a half)
  size_ := floor((g->'size'->>0)::double precision + ((g->'size'->>1)::double precision - (g->'size'->>0)::double precision) * p_r2 + 0.5)::integer;
  return jsonb_build_object('id', id_, 'size', size_,
    'weight', floor((g->>'k')::double precision * power(size_::double precision / 100, 3) * 10 + 0.5) / 10);
end $$;

-- giantChance: of an eligible cast's no-fish, the giant's share (0: none may come)
create or replace function town.giant_chance(p_bait text, p_water text, p_hour double precision, p_junk double precision, p_last bigint, p_now bigint, p_star boolean default false)
returns double precision language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_star, false) or p_bait is distinct from k.r->'bait'->>p_water or not coalesce(p_junk >= (k.r->>'chance')::double precision, false)
      or jsonb_array_length(town.giants_out(p_water, p_hour)) = 0 then 0::double precision
    when p_last is not null and p_now - p_last < (k.r->>'every')::bigint then 0::double precision
    else (k.r->>'chance')::double precision / p_junk end
    from (select town.giant_rules() r) k
$$;

-- The cast's draw (the trial keeper's): the share of what is no fish in the odds as they stand, the chance of it, and,
-- when what came up is no fish and the roll takes it, which giant. A fish that came up is never touched.
create or replace function town.giant_on_cast(p_odds jsonb, p_what text, p_bait text, p_water text, p_hour integer, p_me uuid, p_now bigint)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  r jsonb := town.giant_rules();
  total_ double precision;
  junk_ double precision;
  last_ bigint;
  chance_ double precision;
begin
  select coalesce(sum((o->>'p')::double precision), 0), coalesce(sum((o->>'p')::double precision) filter (where r->'junk' ? (o->>'what')), 0)
    into total_, junk_ from jsonb_array_elements(coalesce(p_odds, '[]'::jsonb)) o;
  junk_ := junk_ / case when total_ = 0 then 1 else total_ end;
  select max(g.at) into last_ from public.town_giant_hooks g where g.by_id = p_me;
  chance_ := town.giant_chance(coalesce(r->'baitAs'->>p_bait, p_bait), p_water, p_hour, junk_, last_, p_now, false);
  if not (chance_ > 0) or p_what is null or not r->'junk' ? p_what or random() >= chance_ then return null; end if;
  return town.giant_of(p_water, p_hour, random(), random());
end $$;

-- settled: the end a hook has come to by the clock, though nobody has said so yet
create or replace function town.giant_settled(p_h jsonb, p_now bigint)
returns jsonb language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_h->>'how', '') <> '' then p_h
    when (p_h->>'go')::bigint = 0 and p_now >= (p_h->>'at')::bigint + (k.r->>'hold')::bigint
      then p_h || jsonb_build_object('how', 'lost', 'end', (p_h->>'at')::bigint + (k.r->>'hold')::bigint)
    when (p_h->>'go')::bigint > 0 and p_now > (p_h->>'go')::bigint + (k.r->>'fight')::bigint + (k.r->>'grace')::bigint
      then p_h || jsonb_build_object('how', 'lost', 'end', (p_h->>'go')::bigint + (k.r->>'fight')::bigint)
    else p_h end
    from (select town.giant_rules() r) k
$$;

-- callWords: a call's words as they go out, one line, trimmed (JavaScript's \s and trim, the same set of spaces)
create or replace function town.giant_line(p_text text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(coalesce(p_text, ''), '[\t\n\v\f\r    -     　﻿]+', ' ', 'g'), ' ')
$$;
create or replace function town.giant_words(p_text text)
returns text language sql immutable set search_path = '' as $$
  select case when p_text is not null and t.w <> '' and char_length(t.w) <= (town.giant_rules()->>'callLen')::integer then t.w end
    from (select town.giant_line(p_text) w) t
$$;

-- a member's name as the town shows it to others
create or replace function town.giant_name(p_member uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce((select coalesce(nullif(p.character_name, ''), nullif(p.display_name, ''), nullif(p.discord_username, ''), '')
                     from public.profiles p where p.id = p_member), '')
$$;

revoke all on function town.giant_rules(), town.giants_out(text, double precision), town.giant_of(text, double precision, double precision, double precision),
  town.giant_chance(text, text, double precision, double precision, bigint, bigint, boolean), town.giant_on_cast(jsonb, text, text, text, integer, uuid, bigint),
  town.giant_settled(jsonb, bigint), town.giant_line(text), town.giant_words(text), town.giant_name(uuid) from public, anon, authenticated;

-- ── 4. The hook: public.town_cast as v264 and v281 left it, and the giant (marked v309) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;dragon_ jsonb;boat_ jsonb;boatwater_ jsonb;
  -- ── v309: a giant fish on the line (lib/town/giant-fish), or none ──
  giant_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star or pair, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  -- ── v264: the time bands' newcomer fish, last of all: only in what is no fish's place (lib/town/fishing's freshOdds) ──
  if not star then
    odds := town.fresh_odds(odds, p_bait, (under->>'hour')::integer, habitat, not deep::boolean,
      case when pair then array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never')) else '{}'::text[] end
      || case when town.is_wary(purse, now_) then array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')) else '{}'::text[] end);
  end if;
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── v309: a giant fish (lib/town/giant-fish's giantChance and giantOf, as the trial keeper's cast): of a line by itself
  -- with its water's bait, what has come up as no fish is a giant at the giant's share of what is no fish in these odds.
  -- The odds and what came up are as they were: a fish's own chance is never touched, and a pair's lines and a stardust
  -- bait never hook one. The strike sees it on the line. ──
  if not star and not pair then giant_ := town.giant_on_cast(odds, line->>'what', p_bait, habitat, (under->>'hour')::integer, me, now_); end if;
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || case when giant_ is not null then jsonb_build_object('giant', giant_) else '{}'::jsonb end || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end
    -- v281: and the third line's, with three out
    || case when pair and town.wearing(purse, 'charmFloat') and jsonb_array_length(coalesce(line->'others', '[]'::jsonb)) > 1 then jsonb_build_object('coming3', line->'others'->1->>'what') else '{}'::jsonb end));
end;
$function$;
revoke all on function public.town_cast(text, integer, integer, boolean, text, text) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean, text, text) to authenticated;

-- ── 5. The hold: public.town_strike as v229 left it, and the giant before it ────────────────────────────────────────────
create or replace function public.town_strike(p_reaction integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a jsonb;
  me uuid := town.member();
  extra jsonb;
  -- ── v309: a giant on the line ──
  purse_ jsonb;
  line_ jsonb;
  now_ bigint;
  cat_ jsonb;
  how_ text;
  rod_ jsonb;
  gold_ jsonb;
  g_ jsonb;
  id_ text;
  hook_ jsonb;
begin
  -- ── v309: a giant on the line (lib/town/giant-fish; the trial keeper's strike). Struck in the same moment as any bite
  -- (town_strike_v229's: not before the bite and its slack, not after the window and its slack, or late with a golden
  -- rod's moment), it is no fight here and costs no stamina: the line is taken up, and the hook is kept for the hold.
  -- A strike too soon or too late, and a bite let go by (no reaction: the page has given the line up), are the line's
  -- as ever, below. (Only a line with a giant on it is held here, the purse first and then the line, as there.) ──
  if p_reaction is not null and exists (select 1 from public.town_lines l where l.member_id = me and jsonb_typeof(l.doc->'giant') = 'object') then
    purse_ := town.purse_of(me, true);
    select l.doc into line_ from public.town_lines l where l.member_id = me for update;
    if line_ is not null and line_->'struck_at' = 'null'::jsonb and jsonb_typeof(line_->'giant') = 'object' and not (line_ ? 'two' or line_ ? 'others') then
      now_ := town.now_ms();
      cat_ := town.cat('fishing');
      how_ := case
        when now_ < (line_->>'bites_at')::bigint - (cat_->'slack'->>'early')::bigint then 'early'
        when now_ > (line_->>'bites_at')::bigint + floor(town.strike_window(purse_, now_) * 1000)::bigint + (cat_->'slack'->>'late')::bigint then 'missed'
        end;
      rod_ := town.rod_held(purse_);
      if rod_ is not null and how_ = 'missed' then
        gold_ := town.gold_strike(purse_, rod_, town.rod_fx(rod_), now_ - (line_->>'bites_at')::bigint - (cat_->'slack'->>'late')::bigint, now_);
        if gold_ is not null then purse_ := gold_; how_ := null; end if;
      end if;
      if how_ is null then
        if gold_ is not null then perform town.keep_purse(me, purse_); end if;
        g_ := line_->'giant';
        id_ := 'g' || substr(md5(me::text || ':' || now_::text || ':' || random()::text), 1, 15);
        hook_ := jsonb_build_object('id', id_, 'giant', g_->'id', 'size', g_->'size', 'weight', g_->'weight', 'by', me::text, 'byName', town.giant_name(me),
          'tile', jsonb_build_array(line_->'x', line_->'y'), 'water', coalesce(line_->>'habitat', 'town'), 'at', now_,
          'netter', null, 'netterName', null, 'go', 0, 'scoops', '[]'::jsonb, 'frays', '[]'::jsonb, 'calls', '[]'::jsonb,
          'end', 0, 'how', '', 'claimed', '[]'::jsonb, 'seed', floor(random() * 2147483647)::integer);
        insert into public.town_giant_hooks (id, by_id, at, doc) values (id_, me, now_, hook_);
        delete from public.town_lines where member_id = me;
        return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line_->'what', 'size', 0, 'landed', false, 'giant', hook_));
      end if;
    end if;
  end if;
  -- (v229's, as it was)
  a:=public.town_strike_v229(p_reaction);if a->'ok'='true'::jsonb and a->'hooked'='true'::jsonb and a->'landed'='false'::jsonb then extra:=town.fishing_power_seed(me,town.now_ms());return a||town.answer(me,extra);end if;return a;
end $$;
revoke all on function public.town_strike(integer) from public, anon, authenticated;
grant execute on function public.town_strike(integer) to authenticated;

-- ── 6. The rest of it: lib/town/giant-fish's giantFish, on the database's clock ──────────────────────────────────────────
create or replace function public.town_giant_fish(p_action text, p_id text, p_x integer default null, p_y integer default null, p_text text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  me_ text := me::text;
  now_ bigint := town.now_ms();
  r jsonb := town.giant_rules();
  purse_ jsonb;
  was_ jsonb;
  h jsonb;
  words_ text;
  n_ integer;
  last_ bigint;
  key_ text;
  steak_ boolean := false;
begin
  if p_action is null or p_action not in ('call', 'join', 'scoop', 'fray', 'free', 'claim', 'look') then
    return town.answer(me, town.no('none'));
  end if;
  -- (my purse held first, then the hook, as every deed holds them; only a claim changes the purse)
  if p_action = 'claim' then purse_ := town.purse_of(me, true); end if;
  if p_id is not null and char_length(p_id) <= 40 then
    select g.doc into was_ from public.town_giant_hooks g where g.id = p_id for update;
  end if;
  if was_ is null then return town.answer(me, town.no('none')); end if;
  h := town.giant_settled(was_, now_);

  if p_action = 'look' then
    null;
  elsif p_action = 'claim' then
    if h->>'how' is distinct from 'landed' then return town.answer(me, town.no('gone')); end if;
    if me_ is distinct from h->>'by' and me_ is distinct from h->>'netter' then return town.answer(me, town.no('theirs')); end if;
    if coalesce(h->'claimed', '[]'::jsonb) ? me_ then return town.answer(me, town.no('taken')); end if;
    if town.room(purse_->'bag', 'giantSteak') < 1 then return town.answer(me, town.no('full')); end if;
    h := h || jsonb_build_object('claimed', coalesce(h->'claimed', '[]'::jsonb) || to_jsonb(me_));
    perform town.keep_purse(me, purse_ || jsonb_build_object('bag', town.put(purse_->'bag', 'giantSteak', 1)));
    -- (and the giant on my fishing line, as each of the two takes their steak: a `giant` deed, counted by the deeds'
    -- trigger through town.work_counts_of as lib/town/line-points' countsOf counts it)
    perform town.note(me, 'giant', h->>'giant', 1, 0, jsonb_build_object('hook', p_id, 'size', h->'size', 'weight', h->'weight'));
    steak_ := true;
  elsif coalesce(h->>'how', '') <> '' then
    return town.answer(me, town.no('gone'));
  elsif p_action = 'call' then
    if me_ is distinct from h->>'by' then return town.answer(me, town.no('theirs')); end if;
    if (h->>'go')::bigint > 0 then return town.answer(me, town.no('late')); end if;
    n_ := jsonb_array_length(h->'calls');
    if n_ >= (r->>'calls')::integer then return town.answer(me, town.no('many')); end if;
    if n_ > 0 and now_ - (h->'calls'->>(n_ - 1))::bigint < (r->>'callGap')::bigint then return town.answer(me, town.no('soon')); end if;
    words_ := town.giant_words(p_text);
    if words_ is null then return town.answer(me, town.no(case when town.giant_line(p_text) <> '' then 'long' else 'empty' end)); end if;
    h := h || jsonb_build_object('calls', h->'calls' || to_jsonb(now_));
    -- (the town's news: the angler's name and face as every announcement has them, the words, and the way to the post)
    key_ := 'giant:' || p_id || ':' || (n_ + 1);
    perform town.announce(me, 'giant', words_, 0, key_, false);
    update public.town_announcements a set toward = jsonb_build_object('hook', p_id, 'x', h->'tile'->0, 'y', h->'tile'->1) where a.event_key = key_;
  elsif p_action = 'free' then
    if me_ is distinct from h->>'by' then return town.answer(me, town.no('theirs')); end if;
    h := h || jsonb_build_object('how', 'freed', 'end', now_);
  elsif p_action = 'join' then
    if me_ = h->>'by' then return town.answer(me, town.no('self')); end if;
    if (h->>'go')::bigint > 0 then return town.answer(me, town.no('taken')); end if;
    if p_x is null or p_y is null
       or greatest(abs(p_x - (h->'tile'->>0)::integer), abs(p_y - (h->'tile'->>1)::integer)) > (r->>'reach')::integer then
      return town.answer(me, town.no('far'));
    end if;
    h := h || jsonb_build_object('netter', me_, 'netterName', town.giant_name(me), 'go', now_);
  elsif (h->>'go')::bigint = 0 then
    return town.answer(me, town.no('soon'));
  elsif p_action = 'scoop' then
    if me_ is distinct from h->>'netter' then return town.answer(me, town.no('theirs')); end if;
    n_ := jsonb_array_length(h->'scoops');
    last_ := case when n_ > 0 then (h->'scoops'->>(n_ - 1))::bigint else (h->>'go')::bigint end;
    if now_ - last_ < (r->>'scoopGap')::bigint then return town.answer(me, town.no('soon')); end if;
    h := h || jsonb_build_object('scoops', h->'scoops' || to_jsonb(now_));
    if n_ + 1 >= (r->>'scoops')::integer then h := h || jsonb_build_object('how', 'landed', 'end', now_); end if;
  else
    -- fray: the angler's line rubbed on a rock
    if me_ is distinct from h->>'by' then return town.answer(me, town.no('theirs')); end if;
    n_ := jsonb_array_length(h->'frays');
    if n_ > 0 and now_ - (h->'frays'->>(n_ - 1))::bigint < (r->>'frayGap')::bigint then return town.answer(me, town.no('soon')); end if;
    h := h || jsonb_build_object('frays', h->'frays' || to_jsonb(now_));
    if n_ + 1 >= (r->>'frays')::integer then h := h || jsonb_build_object('how', 'broke', 'end', now_); end if;
  end if;

  if h is distinct from was_ then update public.town_giant_hooks g set doc = h, updated_at = now() where g.id = p_id; end if;
  return town.answer(me, jsonb_build_object('ok', true, 'hook', h) || case when steak_ then jsonb_build_object('steak', true) else '{}'::jsonb end);
end $$;
revoke all on function public.town_giant_fish(text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.town_giant_fish(text, text, integer, integer, text) to authenticated;

-- ── 7. The giants on lines now ────────────────────────────────────────────────────────────────────────────────────────
-- (still held or fought by the clock; and mine, as the angler or the netter, ended in the last `after`. A hook is never
-- either once its hold, a fight and its grace and `after` have gone by since it was hooked: only so far back is read)
create or replace function public.town_giants_now()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me_ text := town.member()::text;
  now_ bigint := town.now_ms();
  r jsonb := town.giant_rules();
begin
  return coalesce((select jsonb_agg(s.h order by s.at, s.id)
    from (select g.id, g.at, town.giant_settled(g.doc, now_) as h from public.town_giant_hooks g
           where g.at >= now_ - ((r->>'hold')::bigint + (r->>'fight')::bigint + (r->>'grace')::bigint + (r->>'after')::bigint)) s
   where coalesce(s.h->>'how', '') = ''
      or ((s.h->>'by' = me_ or s.h->>'netter' = me_) and now_ - (s.h->>'end')::bigint < (r->>'after')::bigint)), '[]'::jsonb);
end $$;
revoke all on function public.town_giants_now() from public, anon, authenticated;
grant execute on function public.town_giants_now() to authenticated;

-- ── 8. A call is the town's news ──────────────────────────────────────────────────────────────────────────────────────
-- (`toward`: where a call points, the hook and its post, given to the page as the event's `to`; only a call has one)
alter table public.town_announcements add column if not exists toward jsonb;
alter table public.town_announcements drop constraint if exists town_announcements_toward_check;
alter table public.town_announcements add constraint town_announcements_toward_check
  check (toward is null or (kind = 'giant' and jsonb_typeof(toward) = 'object'));
alter table public.town_announcements drop constraint if exists town_announcements_kind_check;
alter table public.town_announcements add constraint town_announcements_kind_check
  check (kind in ('forge', 'rank', 'legend', 'forest', 'recipe', 'cross', 'depth', 'bridge', 'lamps', 'admin', 'casino', 'giant'));

-- The reader with every kind is `town_announcements_v309` from here on (v299's, renamed, each event with its `to`), which
-- this page asks first; v299's leaves the calls out for the pages from before this one, as v299 did with the casino.
-- v256's and v255's readers ask v299's by name, and so leave them out too.
do $$
declare
  d text;
  o text := '''portrait'',a.portrait)';
  nw text := '''portrait'',a.portrait)||case when a.toward is not null then jsonb_build_object(''to'',a.toward) else ''{}''::jsonb end';
  n integer;
begin
  if to_regprocedure('public.town_announcements_v309(bigint,text)') is null then
    alter function public.town_announcements_v299(bigint, text) rename to town_announcements_v309;
  end if;
  d := replace(pg_get_functiondef('public.town_announcements_v309(bigint,text)'::regprocedure), chr(13), '');
  if position('a.toward' in d) = 0 then
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n <> 1 then raise exception 'v309: the announcements'' reader has % of [%], not one: rebuild v309', n, o; end if;
    execute replace(d, o, nw);
  end if;
end $$;
create or replace function public.town_announcements_v299(p_after bigint default null, p_look text default null) returns jsonb
language sql security definer set search_path = '' as $$
  select p.page || jsonb_build_object('events', coalesce((select jsonb_agg(e.value order by e.ord)
    from jsonb_array_elements(p.page -> 'events') with ordinality e(value, ord) where e.value ->> 'kind' <> 'giant'), '[]'::jsonb))
  from (select public.town_announcements_v309(p_after, p_look) as page) p
$$;
revoke all on function public.town_announcements_v299(bigint, text), public.town_announcements_v309(bigint, text) from public, anon, authenticated;
grant execute on function public.town_announcements_v299(bigint, text), public.town_announcements_v309(bigint, text) to authenticated;

-- ── 9. The steak's band in the market: town.market_knobs (v285) and town.market_things (v291), and MARKET.fixed ────────
CREATE OR REPLACE FUNCTION town.market_knobs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
  with k as (select coalesce(jsonb_object_agg(substr(n.key, 8), n.value), '{}'::jsonb) as v from public.town_knobs n where n.key like 'market\_%')
  select jsonb_build_object(
    'floor', coalesce((k.v->>'floor')::int, 40), 'made', coalesce((k.v->>'made')::int, 100), 'margin', coalesce((k.v->>'margin')::int, 150),
    'ceil', jsonb_build_array(coalesce((k.v->>'ceil_a')::int, 220), coalesce((k.v->>'ceil_b')::int, 200), coalesce((k.v->>'ceil_c')::int, 180)),
    'fall', coalesce((k.v->>'fall')::int, 40), 'rise', coalesce((k.v->>'rise')::int, 35), 'memory', coalesce((k.v->>'memory')::int, 65),
    'bend', coalesce((k.v->>'bend')::int, 100), 'heads', coalesce((k.v->>'heads')::int, 10), 'lately', coalesce((k.v->>'lately')::int, 14),
    'minVolume', coalesce((k.v->>'min_volume')::int, 5),
    -- v285: a crop's own usual amount, ceiling and fall (lib/town/market's cropAnchor, cropCeil, cropFall)
    'cropAnchor', coalesce((k.v->>'crop_anchor')::int, 3), 'cropCeil', coalesce((k.v->>'crop_ceil')::int, 150), 'cropFall', coalesce((k.v->>'crop_fall')::int, 25),
    -- v309: things with a band of their own, whatever the village's size (lib/town/market's MARKET.fixed): `usual` is how many a round, the whole village's
    'fixed', jsonb_build_object('giantSteak', jsonb_build_object('usual', 5, 'floor', 84, 'ceil', 100)),
    'usual', jsonb_build_object('staple', coalesce((k.v->>'staple')::int, 8), 'crop', coalesce((k.v->>'crop')::int, 15), 'fish', coalesce((k.v->>'fish')::int, 8), 'catch', coalesce((k.v->>'catch')::int, 5),
      'dish', coalesce((k.v->>'dish')::int, 8), 'goods', coalesce((k.v->>'goods')::int, 8), 'wild', coalesce((k.v->>'wild')::int, 8), 'bug', coalesce((k.v->>'bug')::int, 4)))
    from k
$function$;
CREATE OR REPLACE FUNCTION town.market_things(p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
  with c as (select town.cat('items') as items, town.cat('goods') as goods, town.cat('fish') as fish, town.cat('flotsam') as flotsam,
                    town.cat('crops') as crops, town.cat('fishing') as fishing),
       bait as (
         select b.id, case when c.goods ? b.id then (c.goods->b.id->>'price')::double precision else coalesce((c.items->b.id->>'pays')::double precision, 0) end as cost
           from c, jsonb_array_elements_text(c.fishing->'baits') b(id)
          where not c.fishing->'kept' ? b.id),
       thing as (
         select i.key as id, i.value->>'kind' as kind, (i.value->>'tier')::int as tier, (i.value->>'pays')::double precision as pays,
                case i.value->>'kind'
                  when 'crop' then coalesce((c.goods->(c.crops->i.key->>'seed')->>'price')::double precision, 0)
                                   / (coalesce((c.crops->i.key->>'picks')::double precision, 1)
                                      * ((c.crops->i.key->'yield'->>0)::double precision + (c.crops->i.key->'yield'->>1)::double precision) / 2)
                  when 'fish' then (select min(bait.cost) from bait where c.fish->i.key->'baits' ? bait.id)
                  when 'catch' then (select min(bait.cost) from bait where coalesce(c.flotsam->i.key->'on', 'null'::jsonb) = 'null'::jsonb or c.flotsam->i.key->'on' ? bait.id)
                  else 0 end as cost
           from c, jsonb_each(c.items) i
          where (i.value->>'pays')::double precision > 0 and not c.goods ? i.key and p_k->'usual' ? (i.value->>'kind'))
  select coalesce(jsonb_object_agg(t.id, case
    -- v309: a band of its own (lib/town/market's thingOf and MARKET.fixed): so many a round for the whole village, never
    -- counted by heads (usual 0 a head, its batch the village's), between its own floor and ceiling
    when jsonb_typeof(p_k->'fixed'->t.id) = 'object' then jsonb_build_array(0, (p_k->'fixed'->t.id->>'floor')::int, (p_k->'fixed'->t.id->>'ceil')::int,
      (p_k->'fixed'->t.id->>'usual')::double precision, t.pays, null)
    else jsonb_build_array(
      -- v285: a crop dearer than the anchor is usual in sqrt(pays / anchor) times its coins' worth in pieces
      (p_k->'usual'->>t.kind)::double precision / t.pays
        * case when t.kind = 'crop' then greatest(1, sqrt(t.pays / coalesce((p_k->>'cropAnchor')::double precision, 3))) else 1 end,
      case when t.kind in ('dish', 'goods', 'staple') and not coalesce(town.cat('animals')->'graded' ? t.id, false) then (p_k->>'made')::int
           else least(100, greatest((p_k->>'floor')::int, ceil(coalesce(t.cost, 0) * (p_k->>'margin')::double precision / t.pays)::int)) end,
      case when t.kind = 'crop' then coalesce((p_k->>'cropCeil')::int, 150)
           else coalesce((p_k->'ceil'->>(t.tier - 1))::int, (p_k->'ceil'->>-1)::int) end,
      greatest(coalesce((p_k->>'minVolume')::double precision, 5), coalesce(((town.cat('crops')->t.id->'yield'->>0)::double precision + (town.cat('crops')->t.id->'yield'->>1)::double precision) / 2, 1)),
      t.pays,
      -- v285: a crop's own fall, the sixth (null for every other thing)
      case when t.kind = 'crop' then coalesce((p_k->>'cropFall')::int, 25) end) end), '{}'::jsonb)
    from thing t
$function$;
revoke all on function town.market_knobs(), town.market_things(jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select data->'giantSteak' from public.town_catalog where key = 'items';
--                                -- {"kind": "catch", "pays": 120, "tier": 3, "stack": 10}
--   select town.market_things(town.market_knobs())->'giantSteak';
--                                -- [0, 84, 100, 5, 120, null]
--   select position('v309' in p.prosrc) > 0 from pg_proc p
--    where p.oid in ('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure, 'public.town_strike(integer)'::regprocedure);
--                                -- true, true
--   select has_function_privilege('anon', 'public.town_giant_fish(text,text,integer,integer,text)', 'EXECUTE') as anon_fish,
--          has_function_privilege('anon', 'public.town_giants_now()', 'EXECUTE') as anon_now,
--          has_function_privilege('authenticated', 'public.town_giant_fish(text,text,integer,integer,text)', 'EXECUTE') as members_fish,
--          has_table_privilege('authenticated', 'public.town_giant_hooks', 'SELECT') as members_read_hooks;
--                                -- false, false, true, false
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'town_announcements_kind_check';
--                                -- … 'casino'::text, 'giant'::text])))
--   select town.work_counts_of('{"from": "deed", "what": "giant", "thing": "glasswakeCarp", "n": 1, "doc": {}}'::jsonb, 'x');
--                                -- [{"to": null, "raw": 30, "line": "fishing", "first": "fishing:glasswakeCarp"}]
--   (a day on) select doc->>'how' how, count(*) from public.town_giant_hooks group by 1;
--              select thing, count(*) from public.town_deeds where what = 'giant' group by 1;   -- two a giant landed
