-- v108 — a line in the water
--
-- Run this once in the Supabase SQL editor, after v107. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. It is the fourth of the migrations Cash
-- Town's game waits for, built as v106 says: the rules of lib/town/fishing.ts
-- written again in SQL in the schema `town` and held to the code's answers
-- case by case, and a few functions in `public` for the browser.
--
-- What the database decides, and what it believes (the owner, 2026-10-03,
-- asked how far it should go: "DB ตามที่คุณเสนอ ทุกอย่าง"):
--
--   · It decides what takes the bait. When a line is dropped the fish (or the
--     old boot), its length, how long it waits and when it nibbles are drawn
--     here, from the bait, the hour in Bangkok, the meal in the angler and
--     how deep the water is at the tile they say they stand on, and kept in
--     `town_lines`, which no browser can read. The browser is told only when
--     the float will twitch and go under. What is on the hook is told when
--     the strike has hooked it, and not before: otherwise a line could be
--     dropped and pulled up again until a golden koi was on it.
--   · It decides whether the strike came in time, by its own clock, with
--     some slack for the two clocks and the wire between them (`slack`, in
--     the catalog): early only if it came well before the bite, late only if
--     it came well after the moment the angler's float and meal allow.
--   · It decides what the fight costs in stamina, whether the catch fits in
--     the bag, and whether it is the longest of its kind yet.
--   · It believes the browser about the fight itself: landed, snapped or
--     slipped. The fight is a game of the hand, played sixty times a second
--     in the page; to judge it here would be to play it here. What bounds a
--     lie: a landing is believed only after at least half the time the
--     quickest possible fight with that fish would take (sooner, and it is
--     written down as slipped, and marked), the stamina is spent before the
--     fight whatever comes of it, and a bait is gone with every cast. And
--     every fight is written down with what the browser says of it (its
--     seed and every press of the reel: lib/town/fishing.ts can play it
--     again exactly), so a board of the best can be checked before it is
--     believed.
--   · It believes the browser about where the angler stands and whether it
--     rains: both are the town's room's to know, which is never stored. The
--     tile only has to be one a line can be dropped from.
--
-- `town_plays` is the record of every go at every mini-game, asked for on the
-- same day ("ช่วยเก็บประวัติการเล่น minigame ทั้งหมดไว้ด้วย เผื่ออนาคตเราจะทำ leader board
-- หรือ ทำสกิลที่เหมาะสมกับคนที่เล่น Mini game นั้นๆถึงจริงๆ"). It begins here because
-- fishing is the first to write in it; the plots and the kitchen will too.
-- Like everything of the town's it is closed: written by these functions,
-- read by nobody in a browser until there is a board to read it for.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v108> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1},"hours":[[5,22]],"rain":1,"wait":[5,30],"size":[4,8],"effort":2,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6},"hours":[[6,18]],"rain":1,"wait":[10,50],"size":[12,22],"effort":3,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8},"hours":[[7,17]],"rain":1,"wait":[10,55],"size":[18,32],"effort":4,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1},"hours":[[5,20]],"rain":1.3,"wait":[10,50],"size":[10,18],"effort":4,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"dough":0.3},"hours":[[18,24],[0,6]],"rain":2,"wait":[15,70],"size":[25,45],"effort":5,"line":1},
    "pangasius": {"tier":"uncommon","baits":{"dough":1,"corn":1},"hours":[[8,17]],"rain":1,"wait":[20,100],"size":[50,90],"effort":7,"line":1.3},
    "snakehead": {"tier":"uncommon","baits":{"minnow":1,"worm":0.3},"hours":[[5,8],[17,20]],"rain":1.2,"wait":[25,110],"size":[35,70],"effort":7,"line":1.1},
    "eel": {"tier":"uncommon","baits":{"worm":1},"hours":[[19,24],[0,5]],"rain":2.5,"wait":[25,110],"size":[40,80],"effort":6,"line":1},
    "prawn": {"tier":"uncommon","baits":{"worm":0.8,"dough":0.6},"hours":[[17,24]],"rain":1,"wait":[20,90],"size":[14,28],"effort":4,"line":0.7},
    "featherback": {"tier":"rare","baits":{"minnow":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[35,150],"size":[45,85],"effort":8,"line":1.2},
    "goby": {"tier":"rare","baits":{"minnow":1,"worm":0.7},"hours":[[20,24],[0,4]],"rain":1,"wait":[45,180],"size":[25,50],"effort":8,"line":1.1},
    "gourami": {"tier":"common","baits":{"branBait":1,"cricket":0.6},"hours":[[6,18]],"rain":1,"wait":[10,50],"size":[12,20],"effort":3,"line":0.8},
    "crab": {"tier":"common","baits":{"shrimpLive":1,"branBait":0.5},"hours":[[17,24],[0,6]],"rain":1.5,"wait":[10,50],"size":[5,9],"effort":2,"line":0.5},
    "snail": {"tier":"common","baits":{"branBait":1},"hours":[[0,24]],"rain":1.2,"wait":[8,40],"size":[2,4],"effort":1,"line":0.4},
    "hampala": {"tier":"uncommon","baits":{"cricket":1,"shrimpLive":0.8},"hours":[[5,9],[16,19]],"rain":1,"wait":[20,90],"size":[25,50],"effort":6,"line":0.9},
    "sheatfish": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[25,110],"size":[25,45],"effort":6,"line":1},
    "bagrid": {"tier":"uncommon","baits":{"cricket":1,"branBait":0.4},"hours":[[18,24],[0,5]],"rain":2,"wait":[25,110],"size":[30,60],"effort":7,"line":1.2},
    "giantGourami": {"tier":"uncommon","baits":{"branBait":1},"hours":[[8,17]],"rain":1,"wait":[25,110],"size":[35,60],"effort":8,"line":1.4},
    "frog": {"tier":"uncommon","baits":{"cricket":1},"hours":[[18,24],[0,6]],"rain":3,"wait":[20,90],"size":[8,14],"effort":4,"line":0.6},
    "tigerfish": {"tier":"rare","baits":{"shrimpLive":1},"hours":[[5,8],[17,20]],"rain":1,"wait":[45,180],"size":[20,40],"effort":9,"line":1.1},
    "wallago": {"tier":"rare","baits":{"shrimpLive":1,"cricket":0.5},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[45,180],"size":[60,120],"effort":10,"line":1.5},
    "croaker": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[25,110],"size":[20,35],"effort":7,"line":1.1},
    "blackEar": {"tier":"uncommon","baits":{"fermentedBait":1},"hours":[[6,18]],"rain":1,"wait":[25,110],"size":[50,90],"effort":9,"line":1.5},
    "spinyEel": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":2,"wait":[25,110],"size":[25,45],"effort":6,"line":0.9},
    "puffer": {"tier":"uncommon","baits":{"antEggs":0.8,"lure":0.5},"hours":[[9,16]],"rain":1,"wait":[20,90],"size":[8,15],"effort":4,"line":0.6},
    "goldenCarp": {"tier":"rare","baits":{"fermentedBait":1},"hours":[[5,8],[16,19]],"rain":1,"wait":[45,180],"size":[50,90],"effort":10,"line":1.6},
    "giantSnakehead": {"tier":"rare","baits":{"lure":1},"hours":[[5,9],[16,20]],"rain":1.2,"wait":[45,180],"size":[60,110],"effort":11,"line":1.5},
    "royalFeatherback": {"tier":"rare","baits":{"lure":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[45,180],"size":[50,90],"effort":10,"line":1.4},
    "arowana": {"tier":"legend","baits":{"lure":1},"hours":[[5,7],[17,19]],"rain":1,"wait":[60,240],"size":[50,90],"effort":13,"line":1.6},
    "stingray": {"tier":"legend","baits":{"fermentedBait":1},"hours":[[21,24],[0,4]],"rain":1,"wait":[60,240],"size":[100,220],"effort":14,"line":2},
    "megaCatfish": {"tier":"legend","baits":{"fermentedBait":0.7,"antEggs":0.5},"hours":[[4,7],[18,21]],"rain":1,"wait":[60,240],"size":[120,270],"effort":15,"line":2.2},
    "koi": {"tier":"legend","baits":{"dough":1,"corn":0.7},"hours":[[5,7],[17,19]],"rain":1,"wait":[60,240],"size":[60,100],"effort":12,"line":1.5}
  }$town$::jsonb),
  ('flotsam', $town${
    "hyacinth": {"weight":9,"wait":[8,45]},
    "boot": {"weight":2,"wait":[10,60]},
    "driftwood": {"weight":6,"wait":[8,45],"on":["cricket","branBait","shrimpLive"]},
    "bottle": {"weight":3,"wait":[10,60],"on":["cricket","branBait","shrimpLive"]},
    "pearl": {"weight":0.6,"wait":[30,120],"on":["antEggs","lure","fermentedBait"]},
    "chest": {"weight":0.3,"wait":[40,150],"on":["antEggs","lure","fermentedBait"]}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatQuill":1.25,"floatBell":1.5},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v108>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A line that is out: what will take it and when, which nobody is told
-- before the strike. One to a member.
create table if not exists public.town_lines (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.town_lines enable row level security;
revoke all on public.town_lines from anon, authenticated;

-- Every go at a mini-game, whatever its end.
create table if not exists public.town_plays (
  id         bigint generated always as identity primary key,
  member_id  uuid references public.profiles (id) on delete cascade,
  game       text not null check (game in ('fishing', 'farming', 'cooking', 'washing')),
  at         timestamptz not null default now(),
  won        boolean not null,
  -- How long the part played by hand took, by this clock; whether it was
  -- played with no stamina left, and under which meal's buff.
  secs       real not null default 0,
  spent      boolean not null default false,
  buff       text,
  -- The game's own particulars, as lib/town/plays.ts has them; what only the
  -- browser says is under `claims`.
  doc        jsonb not null default '{}'::jsonb
);

create index if not exists town_plays_member on public.town_plays (member_id, at desc);
create index if not exists town_plays_game on public.town_plays (game, at desc);

alter table public.town_plays enable row level security;
revoke all on public.town_plays from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- lib/town/fishing.ts's oddsOf(): what takes a bait at an hour, and how
-- likely each is, in the order the code weighs them.
create or replace function town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  fish jsonb := town.cat('fish');
  flot jsonb := town.cat('flotsam');
  lucky_by double precision := (town.cat('stamina')->'buffs'->>'lucky')::double precision;
  h integer := ((p_hour % 24) + 24) % 24;
  ids text[] := '{}';
  ws double precision[] := '{}';
  id text;
  f jsonb;
  likes double precision;
  total double precision := 0;
  odds jsonb := '[]'::jsonb;
  i integer;
begin
  for id in select jsonb_array_elements_text(cat->'fish') loop
    f := fish->id;
    likes := coalesce((f->'baits'->>p_bait)::double precision, 0);
    continue when likes = 0;
    continue when not exists (select 1 from jsonb_array_elements(f->'hours') x where h >= (x->>0)::int and h < (x->>1)::int);
    continue when p_shallow and f->>'tier' <> 'common';
    ids := ids || id;
    ws := ws || ((cat->'tiers'->>(f->>'tier'))::double precision * likes
      * (case when p_rain then (f->>'rain')::double precision else 1::double precision end)
      * (case when p_lucky and f->>'tier' in ('rare', 'legend') then 1::double precision + lucky_by else 1::double precision end));
  end loop;
  for id in select jsonb_array_elements_text(cat->'flotsam') loop
    f := flot->id;
    if f->'on' is null or f->'on' ? p_bait then
      ids := ids || id;
      ws := ws || (f->>'weight')::double precision;
    end if;
  end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop total := total + ws[i]; end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop
    odds := odds || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ws[i] / total));
  end loop;
  return odds;
end;
$$;

-- castLine(): everything about what happens to a line, decided as it is
-- dropped. `p_rnd` are the numbers in [0, 1) it is drawn with, taken in order
-- (six are enough).
create or replace function town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_rnd double precision[])
returns jsonb language plpgsql stable
as $$
declare
  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow);
  n integer := jsonb_array_length(odds);
  apart integer := (town.cat('fishing')->>'apart')::int;
  k integer := 2;
  r double precision := p_rnd[1];
  what text := odds->(n - 1)->>'what';
  fish jsonb;
  span jsonb;
  wait integer;
  many integer := 0;
  nibbles integer[] := '{}';
  at_ integer;
  big double precision;
  size double precision := 0;
  i integer;
begin
  for i in 0..n - 1 loop
    if r < (odds->i->>'p')::double precision then what := odds->i->>'what'; exit; end if;
    r := r - (odds->i->>'p')::double precision;
  end loop;
  fish := town.cat('fish')->what;
  span := coalesce(fish->'wait', town.cat('flotsam')->what->'wait');
  wait := floor((span->>0)::double precision + ((span->>1)::double precision - (span->>0)::double precision) * p_rnd[k] + 0.5::double precision)::int;
  k := k + 1;
  -- a fish may nibble once or twice first; what is no fish only drifts onto the hook
  if fish is not null then
    many := case when p_rnd[k] < 0.3 then 0 when p_rnd[k] < 0.75 then 1 else 2 end;
    k := k + 1;
  end if;
  for i in 1..many loop
    at_ := floor((0.25::double precision + 0.6::double precision * p_rnd[k]) * wait + 0.5::double precision)::int;
    k := k + 1;
    if at_ >= apart and wait - at_ >= apart and not exists (select 1 from unnest(nibbles) x where abs(x - at_) < apart) then
      nibbles := nibbles || at_;
    end if;
  end loop;
  -- most are small: the roll is multiplied by itself
  if fish is not null then
    big := p_rnd[k];
    size := floor(((fish->'size'->>0)::double precision + ((fish->'size'->>1)::double precision - (fish->'size'->>0)::double precision) * (big * big)) * 10 + 0.5::double precision)
      / 10::double precision;
  end if;
  return jsonb_build_object('what', what, 'wait', wait, 'size', size,
    'nibbles', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(nibbles) x));
end;
$$;

-- hookBait(): one of the bait leaves the bag (one that is not eaten stays). A
-- rod has to be in the bag too.
create or replace function town.hook_bait(p_purse jsonb, p_bait text)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
begin
  if not exists (select 1 from jsonb_array_elements_text(cat->'rods') r where town.held(p_purse->'bag', r) > 0) then return town.no('tool'); end if;
  if not cat->'baits' ? p_bait or town.held(p_purse->'bag', p_bait) = 0 then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse',
    case when cat->'kept' ? p_bait then p_purse else p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, 1)) end);
end;
$$;

-- loseBait(): the line snapped, and a bait that was not eaten goes with it.
create or replace function town.lose_bait(p_purse jsonb, p_bait text)
returns jsonb language sql stable
as $$
  select case when town.cat('fishing')->'kept' ? p_bait and town.held(p_purse->'bag', p_bait) > 0
    then p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, 1)) else p_purse end
$$;

-- landCatch(): into the bag when there is room, and, a fish, onto the record
-- when it is the longest of its kind yet.
create or replace function town.land_catch(p_purse jsonb, p_what text, p_size double precision)
returns jsonb language plpgsql stable
as $$
declare
  kept boolean := town.room(p_purse->'bag', p_what) > 0;
  fish boolean := town.cat('fish') ? p_what;
  record boolean := fish and p_size > coalesce((p_purse->'best'->>p_what)::double precision, 0);
begin
  return jsonb_build_object('kept', kept, 'record', record, 'purse', p_purse || jsonb_build_object(
    'bag', case when kept then town.put(p_purse->'bag', p_what, 1) else p_purse->'bag' end,
    'best', case when record then (p_purse->'best') || jsonb_build_object(p_what, p_size) else p_purse->'best' end));
end;
$$;

-- strikeWindowOf(): how long after the bite somebody's strike still hooks
-- the fish, in seconds.
create or replace function town.strike_window(p_purse jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select (c.f->>'strike')::double precision * (
    (case when town.buff_of(p_purse, p_now) = 'keen' then 1::double precision + (town.cat('stamina')->'buffs'->>'keen')::double precision else 1::double precision end)
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision)))
    from (select town.cat('fishing') as f) c
$$;

-- Write a go at a mini-game down.
create or replace function town.record(p_member uuid, p_game text, p_won boolean, p_secs double precision, p_spent boolean, p_buff text, p_doc jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_plays (member_id, game, at, won, secs, spent, buff, doc)
  values (p_member, p_game, to_timestamp(town.now_ms() / 1000.0), p_won, greatest(0, p_secs)::real, p_spent, p_buff, coalesce(p_doc, '{}'::jsonb))
$$;

-- What a browser's own account of a play may be kept of: a document, and not
-- a big one. Anything else is kept as nothing.
create or replace function town.claims(p_doc jsonb)
returns jsonb language sql immutable
as $$ select case when p_doc is not null and jsonb_typeof(p_doc) = 'object' and pg_column_size(p_doc) <= 24000 then p_doc else null end $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- Drop a line from a tile, with a bait on the hook. Answers how long until
-- the bite and when the float twitches before it, in seconds from now; never
-- what is on its way.
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  did jsonb;
  line jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  did := town.hook_bait(purse, p_bait);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  line := town.cast_line(p_bait, hour, coalesce(p_rain, false), coalesce(town.buff_of(purse, now_) = 'lucky', false), not deep::boolean,
    array[random(), random(), random(), random(), random(), random()]);
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', coalesce(p_rain, false),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')));
end;
$$;

-- Strike. `p_reaction` is the browser's own count of the milliseconds from
-- the bite to the strike, kept with the play; whether it hooked anything is
-- this clock's to say. A fish hooked is named, and the fight is on; what is
-- no fish is landed at once.
create or replace function public.town_strike(p_reaction integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text;
  landed jsonb;
  spent boolean := town.stamina_of(purse, now_) <= 0;
  play jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or line->'struck_at' <> 'null'::jsonb then return town.answer(me, town.no('none')); end if;
  play := jsonb_build_object('place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'claims', jsonb_build_object('rain', line->'rain', 'reaction', p_reaction));
  how := case
    when now_ < (line->>'bites_at')::bigint - (cat->'slack'->>'early')::bigint then 'early'
    when now_ > (line->>'bites_at')::bigint + floor(town.strike_window(purse, now_) * 1000)::bigint + (cat->'slack'->>'late')::bigint then 'missed'
    end;
  if how is not null then
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  fish := town.cat('fish')->(line->>'what');
  if fish is null then
    landed := town.land_catch(purse, line->>'what', 0);
    perform town.keep_purse(me, landed->'purse');
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', true, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', 'landed', 'kept', landed->'kept', 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
  end if;
  -- a fight costs its stamina whatever comes of it
  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false));
end;
$$;

-- The end of a line: `p_how` is landed, snapped or slipped after a fight (the
-- browser's word for how it went), or left for a line pulled up with nothing
-- on it yet. `p_fight` is the browser's own account of the fight, kept with
-- the play.
create or replace function public.town_land(p_how text, p_fight jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    if how = 'landed' and (took < floor((fish->>'line')::double precision / (cat->>'reel')::double precision * (cat->>'least')::double precision * 1000)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
    elsif how = 'snapped' then
      perform town.keep_purse(me, town.lose_bait(purse, line->>'bait'));
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record'));
end;
$$;

-- My line, if one is out: when it was dropped and when the float twitches and
-- goes under (so that a page loaded again can go on watching it), and, once
-- a fish is hooked, what it is.
create or replace function public.town_line()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  line jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me;
  return jsonb_build_object('now', town.now_ms(), 'line', case when line is null then null else
    jsonb_build_object('bait', line->'bait', 'x', line->'x', 'y', line->'y', 'cast_at', line->'cast_at', 'wait', line->'wait', 'nibbles', line->'nibbles',
      'struck_at', line->'struck_at')
    || case when line->'struck_at' <> 'null'::jsonb then jsonb_build_object('what', line->'what', 'size', line->'size') else '{}'::jsonb end end);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['town_cast(text, integer, integer, boolean)', 'town_strike(integer)', 'town_land(text, jsonb)', 'town_line()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, (select count(*) from jsonb_object_keys(data)) as n
--     from public.town_catalog where key in ('fish', 'flotsam', 'fishing') order by key;
--   -- fish    | 32
--   -- fishing | 15
--   -- flotsam | 6
--
--   select (select count(*) from jsonb_object_keys(data->'places')) as places,
--          (select count(*) from jsonb_each(data->'places') p where p.value = 'true'::jsonb) as deep
--     from public.town_catalog where key = 'fishing';
--   -- 72 | 22
--
--   select c.relname, c.relrowsecurity from pg_class c
--    where c.oid in ('public.town_lines'::regclass, 'public.town_plays'::regclass) order by 1;
--   -- town_lines | true
--   -- town_plays | true
--
--   select count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and table_name in ('town_lines', 'town_plays') and grantee in ('anon', 'authenticated');
--   -- 0
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_cast', 'town_strike', 'town_land', 'town_line');
--   -- 0 | 4
--
--   select jsonb_array_length(town.odds('worm', 12, false, false, false)) as bite_on_a_worm_at_noon;
--   -- 5
