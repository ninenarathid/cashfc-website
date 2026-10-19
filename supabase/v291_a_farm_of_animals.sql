-- v291 — a farm of animals (ฟาร์มสัตว์)
-- Run once in the Supabase SQL editor, after v290. Running it again is safe. Its page goes up first or after: before it
-- has run the page's pasture asks town_animals and is refused ('none'), and nothing happens; before the page, nothing
-- calls it.
--
-- The owner, 2026-10-19: "ช่วยวางแผน ระบบเลี้ยงสัตว์ ... เริ่มแรกสามารถเลี้ยงสัตว์ได้คนละ 2 ตัว ... ไก่ วัว แกะ เป็ด ... ทุกวัน
-- เจ้าของต้องนำอาหารมาให้ ที่รางให้อาหาร ... ยิ่งสนิทสนมมาก จะยิ่งให้ผลผลิตดีขึ้น ... ลุง popoto ขายสัตว์ ...", and over five rounds
-- after it ("ขยายฟาร์มออกไปทางนั้นจริงๆ", "การเก็บผลผลิตต้องเป็นเจ้าของสัตว์ถึงจะเก็บได้", "มีระบบผสมพันธุ์ ... พันธุ์แปลกๆ แฟนตาซีๆ",
-- "ให้ลุงรับซื้อไปเถอะ", "ตอนที่ซื้อมาเป็นแค่สัตว์ขั้นแรก ... ค่อยๆ โตขึ้นตามวันเวลา จะไม่มีของที่ทำให้โตทันที", "คนอื่นสามารถดูแลสัตว์
-- ของเพื่อนได้ (ได้แต้มผู้ช่วยเหลือ)", "เริ่มได้เลย เอาจนจบตาม requirment"). The whole design is docs/plans/animals/README.md; the
-- rules are lib/town/animals.ts and lib/town/animal-act.ts, which this is, step for step.
--
-- * Kept: public.town_animals (an animal a row, its state as the page keeps it), public.town_herds (a member's places,
--   barn front and who may care for their animals), public.town_pasture (the village's gate, who first bred each breed,
--   the gifts' hours that others share, the hay wagon's runs) and public.town_animal_asks (a call's answer, for a retry).
--   No grants and no policies: nothing reaches them but public.town_animals, security definer, for a proved member.
-- * public.town_animals(p_input, p_request): one step (buy a baby, the shop, places, a barn front, sell, name, move,
--   feed, pet, treat, collect with a game's play, pick an egg laid out, lend, breed, the cradle, care, the gate, coming
--   onto the farm, the gifts' spring wind, harp and hay wagon, ride, the meadow's forage), answering through town.answer.
-- * Elsewhere, in their live text: a pasture deed counts its own points into the line "animals" or the helpers'
--   (town.work_counts_of); an animal's produce falls when oversold, as a crop does (town.market_things); the farm's new
--   rows (local y -32..-1) are the farm's for a reward's relay (town.reward_relay_place). Written whole:
--   town.carries_grade and town.grade_pays take an animal's produce (the kitchen counts its grade, the relatives pay by
--   it); town.made_of reads a pot as it is and then as its families (any breed's egg an egg, any milk milk, any wool wool).
-- * The catalog: the row `animals`, and merged into their rows entry by entry: 136 things, 17 dishes and their
--   scrolls, 11 makings, 10 gifts, the line's place in `work`, four new pieces of cookware, and the farm's
--   new shape where a row keeps one (cooking.map.farm, ground.maps, insects.nectar.maps, rewards.nurseryBoxes).
begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';
do $$ begin
  if town.reward_relay_place('[60,79]'::jsonb) is distinct from 'town' then raise exception 'Run v290 before v291'; end if;
end $$;

-- ── 1. What is kept: the animals, each member's herd, the pasture's village things, answers kept for a retry ────────
-- Nothing of these is read or written from a browser but through public.town_animals (no grants, no policies: the
-- function is security definer and is the only way in).
create table if not exists public.town_animals (
  id uuid primary key,
  owner uuid not null references public.profiles (id) on delete cascade,
  -- the animal as lib/town/animals keeps it (its id and owner repeated inside), brought to `changed` at each write
  a jsonb not null check (jsonb_typeof(a) = 'object'),
  changed bigint not null
);
create index if not exists town_animals_owner on public.town_animals (owner);
create table if not exists public.town_herds (
  owner uuid primary key references public.profiles (id) on delete cascade,
  h jsonb not null check (jsonb_typeof(h) = 'object'),
  changed bigint not null
);
create table if not exists public.town_pasture (
  one boolean primary key default true check (one),
  gate jsonb not null default '[]'::jsonb,
  found jsonb not null default '{}'::jsonb,
  spells jsonb not null default '[]'::jsonb,
  wagons jsonb not null default '[]'::jsonb,
  changed bigint not null default 0
);
insert into public.town_pasture (one) values (true) on conflict (one) do nothing;
create table if not exists public.town_animal_asks (
  member uuid not null references public.profiles (id) on delete cascade,
  request text not null check (char_length(request) between 8 and 80),
  answer jsonb not null,
  at bigint not null,
  primary key (member, request)
);
create index if not exists town_animal_asks_at on public.town_animal_asks (at);
alter table public.town_animals enable row level security;
alter table public.town_herds enable row level security;
alter table public.town_pasture enable row level security;
alter table public.town_animal_asks enable row level security;
revoke all on public.town_animals, public.town_herds, public.town_pasture, public.town_animal_asks from public, anon, authenticated;

-- ── 2. The rules (lib/town/animals.ts, step for step; every number from the catalog's `animals`) ────────────────────
-- When a game day began (the Bangkok day turning at the rules' dawn, as town.day_of).
create or replace function town.animal_day_start(p_day integer)
returns double precision language sql stable set search_path = '' as $$
  select p_day::double precision * 86400000 - 7 * 3600000 + (town.cat('rules')->>'dawn')::double precision * 3600000
$$;
-- The band of a moment (0 = 03-05 ... 7 = 23-03), as animals.ts's bandOf.
create or replace function town.animal_band(p_t double precision)
returns integer language sql immutable set search_path = '' as $$
  select case when h >= 23 then 7 when h >= 19 then 6 when h >= 16 then 5 when h >= 13 then 4 when h >= 11 then 3 when h >= 7 then 2 when h >= 5 then 1 when h >= 3 then 0 else 7 end
    from (select floor(((p_t + 25200000) - floor((p_t + 25200000) / 86400000) * 86400000) / 3600000)::integer as h) x
$$;
-- Whether the gate stood open at a moment, and the next moment after it that it opened or closed (gateAt).
create or replace function town.animal_gate_at(p_gate jsonb, p_t double precision)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare e jsonb; f double precision; t double precision; open_ boolean := false; next_ double precision := 'Infinity';
begin
  for e in select x from jsonb_array_elements(coalesce(p_gate, '[]'::jsonb)) x loop
    f := (e->>0)::double precision;
    t := case when jsonb_typeof(e->1) = 'number' then (e->>1)::double precision end;
    if f <= p_t and (t is null or p_t < t) then open_ := true; if t is not null then next_ := least(next_, t); end if;
    elsif f > p_t then next_ := least(next_, f);
    elsif t is not null and t > p_t then next_ := least(next_, t);
    end if;
  end loop;
  return jsonb_build_object('open', open_, 'next', case when next_ = 'Infinity' then null else next_ end);
end $$;
-- Its growth speed at a moment (speedAt).
create or replace function town.animal_speed(p_a jsonb, p_t double precision, p_bottle boolean, p_cap double precision)
returns double precision language sql immutable set search_path = '' as $$
  select case when p_t < coalesce((p_a->>'windUntil')::double precision, 0) then p_cap
    else least(p_cap, 1 + case when p_t < coalesce((p_a->>'speedUntil')::double precision, 0) then 1 else 0 end + case when p_bottle then 1 else 0 end) end
$$;
-- An animal brought from `at` to a later moment (settle): food eaten (half as fast while out), growth and production
-- on fed hours only, rounds banked (a full bank pauses), the hearts that passing days earned. Times are milliseconds
-- as double precision, as the page's numbers are, so that a stretch ending part-way into a millisecond is the same.
create or replace function town.animal_settle(p_a jsonb, p_now double precision, p_gate jsonb, p_bottle boolean, p_k jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  kn jsonb := p_k->'knobs';
  sp jsonb := p_k->'species'->(p_a->>'species');
  adult_ double precision := (sp->'grow'->>0)::double precision + (sp->'grow'->>1)::double precision;
  cycle_ double precision := (sp->>'cycle')::double precision;
  bank_ integer := (sp->>'bank')::integer;
  cap_ double precision := (kn->>'speedCap')::double precision;
  rate_out double precision := (kn->>'outRate')::double precision;
  most integer := (kn->>'hearts')::integer * (kn->>'perHeart')::integer;
  h_fed integer := (kn->'heart'->>'fed')::integer;
  h_out integer := (kn->'heart'->>'out')::integer;
  t double precision := greatest((p_a->>'at')::double precision, (p_a->>'born')::double precision);
  food double precision := (p_a->>'food')::double precision;
  grown double precision := (p_a->>'grown')::double precision;
  made double precision := (p_a->>'made')::double precision;
  banked integer := (p_a->>'banked')::integer;
  hearts integer := (p_a->>'hearts')::integer;
  bands integer := coalesce((p_a->>'outBands')::integer, 0);
  today jsonb := coalesce(p_a->'today', '{}'::jsonb);
  speed_until double precision := coalesce((p_a->>'speedUntil')::double precision, 0);
  wind_until double precision := coalesce((p_a->>'windUntil')::double precision, 0);
  producing boolean := p_a->>'place' = 'producing';
  g jsonb; out_ boolean; day_end double precision; nxt double precision; rate double precision; runs double precision;
  end_ double precision; h double precision; v double precision; need double precision; guard integer := 0;
begin
  if p_now <= t then return p_a || jsonb_build_object('at', greatest((p_a->>'at')::double precision, p_now)); end if;
  if (today->>'day')::integer is distinct from town.day_of(floor(t)::bigint) then today := jsonb_build_object('day', town.day_of(floor(t)::bigint)); end if;
  while t < p_now and guard < 10000 loop
    guard := guard + 1;
    g := town.animal_gate_at(p_gate, t);
    out_ := (g->>'open')::boolean;
    day_end := town.animal_day_start(town.day_of(floor(t)::bigint) + 1);
    nxt := least(p_now, coalesce((g->>'next')::double precision, 'Infinity'::double precision), day_end);
    if t < speed_until then nxt := least(nxt, speed_until); end if;
    if t < wind_until then nxt := least(nxt, wind_until); end if;
    rate := case when out_ then rate_out else 1 end;
    if food > 1e-9 then
      runs := t + (food / rate) * 3600000;
      end_ := least(nxt, runs);
      h := (end_ - t) / 3600000;
      food := greatest(0, food - h * rate);
      if grown < adult_ then
        v := town.animal_speed(jsonb_build_object('speedUntil', speed_until, 'windUntil', wind_until), t, p_bottle, cap_);
        need := (adult_ - grown) / v;
        if h < need then grown := grown + h * v; h := 0; else grown := adult_; h := h - need; end if;
      end if;
      if h > 0 and producing and banked < bank_ then
        made := made + h;
        while made >= cycle_ - 1e-9 and banked < bank_ loop banked := banked + 1; made := made - cycle_; end loop;
        if banked >= bank_ then made := 0; end if;
        if made < 1e-9 then made := 0; end if;
      end if;
      if out_ then
        if not coalesce((today->>'out')::boolean, false) then today := today || '{"out": true}'::jsonb; hearts := least(most, hearts + h_out); end if;
        bands := bands | (1 << town.animal_band(t));
      end if;
      t := end_;
    else
      today := today || '{"hungry": true}'::jsonb;
      if out_ and not coalesce((today->>'out')::boolean, false) then today := today || '{"out": true}'::jsonb; hearts := least(most, hearts + h_out); end if;
      if out_ then bands := bands | (1 << town.animal_band(t)); end if;
      t := nxt;
    end if;
    if t >= day_end and t <= p_now then
      if not coalesce((today->>'hungry')::boolean, false) and not coalesce((today->>'fed')::boolean, false) then hearts := least(most, hearts + h_fed); end if;
      today := jsonb_build_object('day', town.day_of(floor(t)::bigint));
    end if;
  end loop;
  return p_a || jsonb_build_object('at', p_now, 'food', food, 'grown', grown, 'made', made, 'banked', banked, 'hearts', hearts,
    'outBands', bands, 'today', today);
end $$;
-- Its stage at a moment.
create or replace function town.animal_stage(p_a jsonb, p_now double precision, p_k jsonb)
returns text language sql stable set search_path = '' as $$
  select case when p_now < (p_a->>'born')::double precision then 'coming'
    when (p_a->>'grown')::double precision >= (s->'grow'->>0)::double precision + (s->'grow'->>1)::double precision then 'adult'
    when (p_a->>'grown')::double precision >= (s->'grow'->>0)::double precision then 'young' else 'baby' end
    from (select p_k->'species'->(p_a->>'species') as s) x
$$;
-- The range a unit is rolled in (rangeOf) and one roll in it (rollOf; the star collar takes the top).
create or replace function town.animal_range(p_a jsonb, p_k jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('floor', greatest(0, c - (q->>'spread')::integer + least((q->>'narrowest')::integer, coalesce((p_a->>'narrow')::integer, 0))), 'ceiling', c)
    from (select p_k->'knobs'->'quality' as q) qq,
    lateral (select least(100, (q->>'base')::integer + (q->>'perHeart')::integer
      * least((p_k->'knobs'->>'hearts')::integer, floor((p_a->>'hearts')::double precision / (p_k->'knobs'->>'perHeart')::double precision)::integer)) as c) cc
$$;
create or replace function town.animal_roll(p_r jsonb, p_collar boolean)
returns integer language sql volatile set search_path = '' as $$
  select case when p_collar then (p_r->>'ceiling')::integer
    else (p_r->>'floor')::integer + least((p_r->>'ceiling')::integer - (p_r->>'floor')::integer, floor(random() * ((p_r->>'ceiling')::integer - (p_r->>'floor')::integer + 1))::integer) end
$$;
create or replace function town.animal_grade(p_q integer)
returns integer language sql immutable set search_path = '' as $$ select case when p_q >= 95 then 3 when p_q >= 70 then 2 when p_q >= 40 then 1 else 0 end $$;
-- Some of one grade out of a bag (lib/town/trade's take with a grade said).
create or replace function town.animal_take_g(p_bag jsonb, p_id text, p_n integer, p_grade integer)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare bag jsonb := p_bag; s jsonb; more integer := p_n; less integer; i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id and town.grade_in(s) = p_grade then
      less := least(more, (s->>'n')::int); more := more - less;
      bag := jsonb_set(bag, array[i::text], case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end $$;
-- Whether a member has the rank-3 warm bottle (their animals grow faster wherever it is read).
create or replace function town.animal_bottle(p_member uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select town.gifts_of(p.doc)->'had' ? (town.cat('animals')->'gifts'->>'bottle') from public.town_purses p where p.member_id = p_member), false)
$$;
-- A member's herd, or a new one's.
create or replace function town.animal_herd(p_member uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select h.h from public.town_herds h where h.owner = p_member),
    jsonb_build_object('owner', p_member::text, 'keeping', 0, 'facade', 0, 'care', 'named', 'carers', '[]'::jsonb))
$$;
-- Where a new animal of a member's would go (freePlace): a producing place first for one bought, the nursery first for one born.
create or replace function town.animal_free_place(p_member uuid, p_prefer text, p_k jsonb)
returns text language sql stable set search_path = '' as $$
  select p from (values (1, 'producing'), (2, 'nursery'), (3, 'keeping')) o(ord, p),
    lateral (select case p when 'producing' then (p_k->'knobs'->'places'->>'producing')::integer when 'nursery' then (p_k->'knobs'->'places'->>'nursery')::integer
      else (town.animal_herd(p_member)->>'keeping')::integer end as room) r,
    lateral (select count(*)::integer as used from public.town_animals a where a.owner = p_member and a.a->>'place' = p) u
   where u.used < r.room
   order by case when p_prefer = 'producing' then o.ord else array_position(array['nursery', 'keeping', 'producing'], p) end
   limit 1
$$;
-- A new animal (bought, bred or cradled).
create or replace function town.animal_new(p_id uuid, p_owner uuid, p_species text, p_breed text, p_born double precision, p_bought boolean, p_place text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p_id::text, 'owner', p_owner::text, 'species', p_species, 'breed', p_breed, 'name', '', 'born', p_born, 'bought', p_bought,
    'place', p_place, 'at', p_born, 'food', 0, 'grown', 0, 'made', 0, 'banked', 0, 'hearts', 0, 'today', jsonb_build_object('day', town.day_of(floor(p_born)::bigint)),
    'speedUntil', 0, 'windUntil', 0, 'narrow', 0, 'rest', 0, 'lent', null, 'outside', '[]'::jsonb, 'outBands', 0)
$$;
-- What a round out on the meadow brings back (findOf), and what a spot of the meadow gives in a band of a day (forageAt).
create or replace function town.animal_find(p_species text, p_bands integer, p_k jsonb)
returns text language plpgsql volatile set search_path = '' as $$
declare bs integer[]; b integer; part text;
begin
  if p_bands = 0 or random() * (p_k->>'findOdds')::double precision >= 1 then return null; end if;
  select array_agg(i order by i) into bs from generate_series(0, 7) i where p_bands & (1 << i) <> 0;
  b := bs[1 + floor(random() * array_length(bs, 1))::integer];
  part := case when b <= 1 then 'dawn' when b >= 6 then 'night' else 'day' end;
  return p_k->'finds'->p_species->>part;
end $$;
create or replace function town.animal_forage(p_day integer, p_band integer, p_spot integer, p_k jsonb)
returns text language sql stable set search_path = '' as $$
  select (array_agg(f.id order by f.id collate "C"))[1 + ((p_day * 31 + p_band * 7 + p_spot * 13) % count(*))::integer]
    from jsonb_each(p_k->'forage') f(id, bands) where f.bands @> to_jsonb(p_band)
$$;
-- Whether somebody may care for a member's animals (mayCare).
create or replace function town.animal_may_care(p_owner uuid, p_me uuid)
returns boolean language sql stable set search_path = '' as $$
  select p_owner <> p_me and (h->>'care' = 'anybody' or (h->>'care' = 'named' and h->'carers' ? p_me::text)) from (select town.animal_herd(p_owner) as h) x
$$;
-- (JavaScript's Math.round: halves up, as `round` on double precision is not)
create or replace function town.js_round(p double precision)
returns integer language sql immutable set search_path = '' as $$ select floor(p + 0.5)::integer $$;
-- What a collection gives (unitsOf): eggs less what cracked; a fleece 3 to 5 tufts by the score and two more whole; a milking 2 to 5 a round.
create or replace function town.animal_units(p_game text, p_banked integer, p_play jsonb, p_cracked integer)
returns jsonb language sql immutable set search_path = '' as $$
  select case when p_banked <= 0 then jsonb_build_object('units', 0, 'whole', false)
    when p_game = 'eggs' then jsonb_build_object('units', greatest(0, p_banked - greatest(0, least(p_banked, coalesce(p_cracked, 0)))), 'whole', false)
    when p_game = 'shear' then jsonb_build_object('units', 3 + town.js_round(2 * sc) + case when sc >= 0.95 then 2 else 0 end, 'whole', sc >= 0.95)
    else jsonb_build_object('units', p_banked * (2 + town.js_round(3 * sc)), 'whole', false) end
    from (select case when coalesce((p_play->>'hits')::double precision, 0) + coalesce((p_play->>'misses')::double precision, 0) > 0
      then greatest(0, least(1, (p_play->>'hits')::double precision / ((p_play->>'hits')::double precision + (p_play->>'misses')::double precision))) else 0 end as sc) x
$$;

-- ── 3. What a page is told: the whole pasture on a look ──────────────────────────────────────────────────────────────
create or replace function town.animal_world(p_me uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'animals', coalesce((select jsonb_agg(a.a order by a.id) from public.town_animals a), '[]'::jsonb),
    'herds', coalesce((select jsonb_agg(case when h.owner = p_me then h.h else jsonb_build_object('owner', h.owner::text, 'care', h.h->'care', 'carers', h.h->'carers',
        'facade', h.h->'facade', 'keeping', 0) end || jsonb_build_object('bottle', town.animal_bottle(h.owner))) from public.town_herds h), '[]'::jsonb),
    'gate', p.gate, 'found', p.found, 'spells', p.spells, 'wagons', p.wagons, 'whole', true)
    from public.town_pasture p where p.one
$$;

-- ── 4. Every step a keeper takes: lib/town/animal-act's animalAction, case for case ───────────────────────────────────
-- One call, one step. Only an animal's owner collects, breeds, sells, names or moves it; somebody the owner allows may
-- pet it, give a treat and fill its trough from their own bag, for helpers points (30 a day). Nothing makes an animal
-- grow at once. A retried call with the same request answers the first answer.
create or replace function public.town_animals(p_input jsonb, p_request text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ double precision := town.now_ms();
  k jsonb := town.cat('animals');
  kn jsonb;
  act text := coalesce(p_input->>'action', '');
  purse jsonb;
  past jsonb;
  pas record;
  herd jsonb;
  an jsonb; bn jsonb; cn jsonb;
  row_ record;
  sp jsonb;
  id_ uuid; id2 uuid;
  touched jsonb := '[]'::jsonb;   -- animals written by this step, as they are after it
  removed jsonb := '[]'::jsonb;
  got jsonb;
  notes jsonb := '[]'::jsonb;     -- [what, n, line, pts, doc, coins]
  item text; grade_ integer; n_ integer; price integer; hours double precision; grow double precision;
  place_ text; stage_ text; helper boolean; pts integer; left_ integer; care_day integer; care_n integer;
  used_ jsonb; r jsonb; units integer; whole_ boolean; grades jsonb; q integer; byg integer[]; bag jsonb;
  find text; out_n integer; outside jsonb; banked integer; breed jsonb; collar boolean; tool text; play jsonb;
  offering text; dawn text; kind_ text; step jsonb; target text; right_ boolean; odds integer; fee integer; hit boolean;
  child text; born double precision; twin boolean := false; first_ boolean := false; clue boolean := false; misses integer;
  book jsonb; stepkey text; spell jsonb; mins integer; run jsonb; rider jsonb; leg_ms double precision; stops jsonb;
  day_ integer; band_ integer; key_ integer; spots jsonb; spot_ integer; gate_n jsonb; open_ boolean; last_ jsonb;
  dawns text[]; reals text[];
  ans jsonb;
begin
  if k is null then return town.answer(me, town.no('none')); end if;
  kn := k->'knobs';
  if p_request is not null and char_length(p_request) not between 8 and 80 then return town.answer(me, town.no('none')); end if;
  -- (a retried call: the answer it had, the purse as it is now)
  if p_request is not null then
    select x.answer into past from public.town_animal_asks x where x.member = me and x.request = p_request;
    if past is not null then return town.answer(me, past); end if;
  end if;
  purse := town.purse_of(me, true);
  herd := town.animal_herd(me);
  select * into pas from public.town_pasture where one for update;

  if act = 'look' then
    return town.answer(me, jsonb_build_object('ok', true, 'world', town.animal_world(me)));

  elsif act = 'buy' then
    sp := k->'species'->(p_input->>'species');
    if sp is null then return town.answer(me, town.no('none')); end if;
    price := (sp->>'price')::integer;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    place_ := town.animal_free_place(me, 'producing', k);
    if place_ is null then return town.answer(me, town.no('places')); end if;
    id_ := gen_random_uuid();
    an := town.animal_new(id_, me, p_input->>'species', k->'starters'->>(p_input->>'species'), now_, true, place_);
    insert into public.town_animals (id, owner, a, changed) values (id_, me, an, now_::bigint);
    insert into public.town_herds (owner, h, changed) values (me, herd, now_::bigint) on conflict (owner) do nothing;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price);
    touched := touched || jsonb_build_array(an);
    got := jsonb_build_object('child', an->>'breed');
    notes := notes || jsonb_build_array(jsonb_build_array('animal_buy', 1, null, 0, jsonb_build_object('species', p_input->>'species'), -price));

  elsif act = 'shop' then
    item := p_input->>'item'; n_ := floor(coalesce((p_input->>'n')::double precision, 0))::integer;
    price := (k->'shop'->>item)::integer;
    if price is null or price <= 0 or n_ < 1 or n_ > 99 then return town.answer(me, town.no('none')); end if;
    if (purse->>'coins')::integer < price * n_ then return town.answer(me, town.no('coins')); end if;
    if town.room_g(purse->'bag', item, 0) < n_ then return town.answer(me, town.no('room')); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price * n_, 'bag', town.put_g(purse->'bag', item, n_, 0));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_shop', n_, null, 0, jsonb_build_object('item', item), -price * n_));

  elsif act = 'keeping' then
    -- (the packs in order: the next is the one after what is had, all told)
    n_ := 0; price := null;
    for r in select x from jsonb_array_elements(kn->'keeping') x loop
      if n_ = (herd->>'keeping')::integer then price := (r->>1)::integer; q := (r->>0)::integer; units := (r->>2)::integer; exit; end if;
      n_ := n_ + (r->>0)::integer;
      exit when n_ > (herd->>'keeping')::integer;
    end loop;
    if price is null then return town.answer(me, town.no('full')); end if;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    -- (the stalls are built of logs: the woodcutters' cross)
    if town.held(purse->'bag', 'log') < units then return town.answer(me, town.no('nothing')); end if;
    herd := herd || jsonb_build_object('keeping', (herd->>'keeping')::integer + q);
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price, 'bag', town.take(purse->'bag', 'log', units));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_places', q, null, 0, jsonb_build_object('logs', units), -price));

  elsif act = 'facade' then
    price := (kn->'facades'->>((herd->>'facade')::integer))::integer;
    if price is null then return town.answer(me, town.no('full')); end if;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    herd := herd || jsonb_build_object('facade', (herd->>'facade')::integer + 1);
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_facade', (herd->>'facade')::integer, null, 0, '{}'::jsonb, -price));

  elsif act in ('sell', 'name', 'move', 'collect', 'pick', 'lend', 'cradle') then
    begin id_ := (p_input->>'id')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    select * into row_ from public.town_animals x where x.id = id_ and x.owner = me for update;
    if not found then return town.answer(me, town.no('theirs')); end if;
    an := town.animal_settle(row_.a, now_, pas.gate, town.animal_bottle(me), k);
    stage_ := town.animal_stage(an, now_, k);
    sp := k->'species'->(an->>'species');

    if act = 'sell' then
      if stage_ = 'coming' then return town.answer(me, town.no('stage')); end if;
      price := case when (an->>'bought')::boolean then floor((sp->>'price')::double precision * (kn->'sellBack'->>'bought')::double precision)::integer else (sp->>'bredBack')::integer end;
      delete from public.town_animals x where x.id = id_ and x.owner = me;
      removed := removed || to_jsonb(id_::text);
      purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer + price);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_sell', 1, null, 0, jsonb_build_object('species', an->>'species', 'breed', an->>'breed'), price));
      an := null;

    elsif act = 'name' then
      item := left(btrim(coalesce(p_input->>'name', '')), 16);
      if item ~ '[<>]' then return town.answer(me, town.no('name')); end if;
      an := an || jsonb_build_object('name', item);

    elsif act = 'move' then
      place_ := p_input->>'place';
      if place_ not in ('producing', 'nursery', 'keeping') then return town.answer(me, town.no('places')); end if;
      if an->>'place' <> place_ then
        select count(*) into n_ from public.town_animals x where x.owner = me and x.a->>'place' = place_;
        if n_ >= (case place_ when 'producing' then (kn->'places'->>'producing')::integer when 'nursery' then (kn->'places'->>'nursery')::integer else (herd->>'keeping')::integer end) then
          return town.answer(me, town.no('places')); end if;
        an := an || jsonb_build_object('place', place_);
      end if;

    elsif act = 'collect' then
      if stage_ <> 'adult' then return town.answer(me, town.no('stage')); end if;
      if (an->>'banked')::integer < 1 then return town.answer(me, town.no('nothing')); end if;
      tool := k->'tools'->>(sp->>'game');
      if town.held(purse->'bag', tool) < 1 then return town.answer(me, town.no('nothing')); end if;
      play := case when jsonb_typeof(p_input->'play') = 'object' then p_input->'play' end;
      if sp->>'game' <> 'eggs' and (play is null or coalesce((play->>'secs')::double precision, 0) < (k->'leastSecs'->>(sp->>'game'))::double precision) then
        return town.answer(me, town.no('soon')); end if;
      banked := (an->>'banked')::integer; outside := coalesce(an->'outside', '[]'::jsonb);
      if sp->>'game' = 'eggs' and coalesce((an->>'outBands')::integer, 0) <> 0 then
        out_n := least(banked - 1, floor(banked * (kn->>'outsideShare')::double precision + random())::integer);
        if out_n > 0 then
          banked := banked - out_n;
          outside := outside || jsonb_build_array(jsonb_build_object('at', k->'eggSpots'->(floor(random() * jsonb_array_length(k->'eggSpots')))::integer, 'n', out_n));
          if jsonb_array_length(outside) > 6 then outside := (select jsonb_agg(x order by o) from jsonb_array_elements(outside) with ordinality e(x, o) where o > jsonb_array_length(outside) - 6); end if;
        end if;
      end if;
      r := town.animal_units(sp->>'game', banked, play, coalesce((p_input->>'cracked')::integer, 0));
      units := (r->>'units')::integer; whole_ := (r->>'whole')::boolean;
      breed := k->'breeds'->(an->>'breed');
      collar := town.gift_works(purse, k->'gifts'->>'collar');
      r := town.animal_range(an, k);
      grades := '[]'::jsonb; byg := array[0, 0, 0, 0];
      for i in 1..units loop q := town.animal_roll(r, collar); grades := grades || to_jsonb(q); byg[town.animal_grade(q) + 1] := byg[town.animal_grade(q) + 1] + 1; end loop;
      purse := town.spend(purse, (kn->'stamina'->>(sp->>'game'))::double precision, now_::bigint);
      bag := purse->'bag';
      for i in 0..3 loop
        if byg[i + 1] > 0 and town.room_g(bag, breed->>'produce', i) < byg[i + 1] then return town.answer(me, town.no('room')); end if;
        if byg[i + 1] > 0 then bag := town.put_g(bag, breed->>'produce', byg[i + 1], i); end if;
      end loop;
      if not coalesce((an->'today'->>'manure')::boolean, false) and town.room_g(bag, 'manure', 0) > 0 then bag := town.put_g(bag, 'manure', 1, 0); end if;
      find := town.animal_find(an->>'species', coalesce((an->>'outBands')::integer, 0), k);
      if find is not null and town.room_g(bag, find, 0) > 0 then bag := town.put_g(bag, find, 1, 0); end if;
      purse := purse || jsonb_build_object('bag', bag);
      an := an || jsonb_build_object('banked', 0, 'narrow', 0, 'outside', outside, 'outBands', 0, 'today', (an->'today') || '{"manure": true}'::jsonb);
      got := jsonb_build_object('item', breed->>'produce', 'n', units, 'grades', grades, 'whole', whole_, 'find', find);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_collect', units, 'animals', units * (kn->'points'->>'unit')::integer,
        jsonb_build_object('id', id_, 'breed', an->>'breed', 'item', breed->>'produce', 'grades', to_jsonb(byg), 'whole', whole_), 0));

    elsif act = 'pick' then
      spot_ := coalesce((p_input->>'spot')::integer, -1);
      outside := coalesce(an->'outside', '[]'::jsonb);
      if spot_ < 0 or spot_ >= jsonb_array_length(outside) then return town.answer(me, town.no('nothing')); end if;
      n_ := (outside->spot_->>'n')::integer;
      breed := k->'breeds'->(an->>'breed');
      collar := town.gift_works(purse, k->'gifts'->>'collar');
      r := town.animal_range(an, k); bag := purse->'bag'; grades := '[]'::jsonb;
      for i in 1..n_ loop
        q := town.animal_roll(r, collar); grades := grades || to_jsonb(q);
        if town.room_g(bag, breed->>'produce', town.animal_grade(q)) < 1 then return town.answer(me, town.no('room')); end if;
        bag := town.put_g(bag, breed->>'produce', 1, town.animal_grade(q));
      end loop;
      purse := purse || jsonb_build_object('bag', bag);
      got := jsonb_build_object('item', breed->>'produce', 'n', n_, 'grades', grades, 'spot', outside->spot_->'at');
      an := an || jsonb_build_object('outside', outside - spot_);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_pick', n_, 'animals', n_ * (kn->'points'->>'unit')::integer, jsonb_build_object('id', id_, 'item', breed->>'produce'), 0));

    elsif act = 'lend' then
      if p_input->>'to' is null or p_input->'to' = 'null'::jsonb then an := an || jsonb_build_object('lent', null);
      else
        begin id2 := (p_input->>'to')::uuid; exception when others then return town.answer(me, town.no('none')); end;
        if id2 = me or not town.is_member(id2) then return town.answer(me, town.no('none')); end if;
        mins := greatest(5, least(120, coalesce((p_input->>'mins')::integer, 60)));
        an := an || jsonb_build_object('lent', jsonb_build_object('to', id2::text, 'until', now_ + mins * 60000));
      end if;

    elsif act = 'cradle' then
      if stage_ <> 'adult' then return town.answer(me, town.no('stage')); end if;
      place_ := town.animal_free_place(me, 'nursery', k);
      if place_ is null then return town.answer(me, town.no('places')); end if;
      used_ := town.gift_use(purse, k->'gifts'->>'cradle', now_::bigint);
      if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
      purse := used_->'purse';
      select array_agg(x.key order by x.value->>'letter') into reals from jsonb_each(k->'breeds') x where x.value->>'species' = an->>'species' and x.value->>'tier' = 'real';
      child := case when random() < (kn->>'cradleRare')::double precision then reals[1 + floor(random() * array_length(reals, 1))::integer] else an->>'breed' end;
      id2 := gen_random_uuid();
      cn := town.animal_new(id2, me, an->>'species', child, now_, false, place_);
      insert into public.town_animals (id, owner, a, changed) values (id2, me, cn, now_::bigint);
      touched := touched || jsonb_build_array(cn);
      got := jsonb_build_object('child', child);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_cradle', 1, 'animals', (kn->'points'->>'cradle')::integer, jsonb_build_object('id', id_, 'child', child), 0));
    end if;

    if an is not null then
      update public.town_animals x set a = an, changed = now_::bigint where x.id = id_;
      touched := touched || jsonb_build_array(an);
    end if;

  elsif act in ('feed', 'pet', 'treat') then
    begin id_ := (p_input->>'id')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    select * into row_ from public.town_animals x where x.id = id_ for update;
    if not found then return town.answer(me, town.no('none')); end if;
    helper := row_.owner <> me;
    if helper and not town.animal_may_care(row_.owner, me) then return town.answer(me, town.no('theirs')); end if;
    an := town.animal_settle(row_.a, now_, pas.gate, town.animal_bottle(row_.owner), k);
    if town.animal_stage(an, now_, k) = 'coming' then return town.answer(me, town.no('stage')); end if;
    sp := k->'species'->(an->>'species');
    care_day := town.day_of(now_::bigint);
    care_n := case when (purse->'animalCare'->>'day')::integer = care_day then coalesce((purse->'animalCare'->>'n')::integer, 0) else 0 end;

    if act = 'feed' then
      item := p_input->>'item'; grade_ := greatest(0, least(3, coalesce((p_input->>'grade')::integer, 0)));
      hours := coalesce((sp->'feeds'->>item)::double precision, case when sp->>'sack' = item then 24 end, (k->'anyFeed'->>item)::double precision, 0);
      grow := case when sp->>'growItem' = item then (kn->>'growFeed')::double precision when item = k->>'dewGrow' then (kn->>'dewFeed')::double precision else 0 end;
      if hours = 0 and grow = 0 then return town.answer(me, town.no('species')); end if;
      if (case when grow > 0 then town.held(purse->'bag', item) else town.held_g(purse->'bag', item, grade_) end) < 1 then return town.answer(me, town.no('nothing')); end if;
      if grow > 0 then
        if town.animal_stage(an, now_, k) = 'adult' then return town.answer(me, town.no('stage')); end if;
        an := an || jsonb_build_object('speedUntil', greatest(coalesce((an->>'speedUntil')::double precision, 0), now_) + grow);
        purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1));
      else
        if (an->>'food')::double precision >= (kn->>'trough')::double precision - 0.01 then return town.answer(me, town.no('full')); end if;
        hours := least(hours, (kn->>'trough')::double precision - (an->>'food')::double precision);
        an := an || jsonb_build_object('food', (an->>'food')::double precision + hours,
          'narrow', greatest(coalesce((an->>'narrow')::integer, 0), coalesce((kn->'quality'->'narrowBy'->>grade_)::integer, 0)));
        purse := purse || jsonb_build_object('bag', town.animal_take_g(purse->'bag', item, 1, grade_));
        if helper then
          pts := least((kn->'care'->>'cap')::integer - care_n, floor(hours / (kn->'care'->>'foodHours')::double precision)::integer);
          if pts > 0 then
            purse := purse || jsonb_build_object('animalCare', jsonb_build_object('day', care_day, 'n', care_n + pts));
            notes := notes || jsonb_build_array(jsonb_build_array('animal_care', 1, 'helpers', pts, jsonb_build_object('id', id_, 'owner', row_.owner, 'food', hours), 0));
          end if;
        elsif not coalesce((an->'today'->'points'->>'feed')::boolean, false) then
          an := jsonb_set(an, '{today,points}', coalesce(an->'today'->'points', '{}'::jsonb) || '{"feed": true}'::jsonb);
          notes := notes || jsonb_build_array(jsonb_build_array('animal_feed', 1, 'animals', (kn->'points'->>'feed')::integer, jsonb_build_object('id', id_), 0));
        end if;
      end if;
    else
      if coalesce((an->'today'->>act)::boolean, false) then return town.answer(me, town.no('used')); end if;
      if act = 'treat' then
        item := p_input->>'item';
        if not (sp->'treats' ? item) then return town.answer(me, town.no('species')); end if;
        if town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('nothing')); end if;
        purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1));
      end if;
      an := an || jsonb_build_object('hearts', least((kn->>'hearts')::integer * (kn->>'perHeart')::integer, (an->>'hearts')::integer + (kn->'heart'->>act)::integer),
        'today', (an->'today') || jsonb_build_object(act, true));
      if helper then
        pts := least((kn->'care'->>'cap')::integer - care_n, (kn->'care'->>act)::integer);
        if pts > 0 then
          purse := purse || jsonb_build_object('animalCare', jsonb_build_object('day', care_day, 'n', care_n + pts));
          notes := notes || jsonb_build_array(jsonb_build_array('animal_care', 1, 'helpers', pts, jsonb_build_object('id', id_, 'owner', row_.owner, act, true), 0));
        end if;
      elsif not coalesce((an->'today'->'points'->>act)::boolean, false) then
        an := jsonb_set(an, '{today,points}', coalesce(an->'today'->'points', '{}'::jsonb) || jsonb_build_object(act, true));
        notes := notes || jsonb_build_array(jsonb_build_array('animal_' || act, 1, 'animals', (kn->'points'->>act)::integer, jsonb_build_object('id', id_), 0));
      end if;
    end if;
    update public.town_animals x set a = an, changed = now_::bigint where x.id = id_;
    touched := touched || jsonb_build_array(an);

  elsif act = 'breed' then
    begin id_ := (p_input->>'a')::uuid; id2 := (p_input->>'b')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    if id_ = id2 then return town.answer(me, town.no('none')); end if;
    -- (both rows held, the lesser id first)
    perform 1 from public.town_animals x where x.id in (id_, id2) order by x.id for update;
    select x.a into an from public.town_animals x where x.id = id_ and x.owner = me;
    select x.a, x.owner into bn, id2 from public.town_animals x where x.id = (p_input->>'b')::uuid;
    if an is null or bn is null then return town.answer(me, town.no('none')); end if;
    helper := id2 <> me;  -- (the second is borrowed)
    if helper and not (bn->'lent'->>'to' = me::text and (bn->'lent'->>'until')::double precision > now_) then return town.answer(me, town.no('lent')); end if;
    an := town.animal_settle(an, now_, pas.gate, town.animal_bottle(me), k);
    bn := town.animal_settle(bn, now_, pas.gate, town.animal_bottle(id2), k);
    if town.animal_stage(an, now_, k) <> 'adult' or town.animal_stage(bn, now_, k) <> 'adult' then return town.answer(me, town.no('stage')); end if;
    if an->>'species' <> bn->>'species' then return town.answer(me, town.no('species')); end if;
    if (an->>'hearts')::integer < (kn->>'breedHearts')::integer or (bn->>'hearts')::integer < (kn->>'breedHearts')::integer then return town.answer(me, town.no('hearts')); end if;
    if (an->>'rest')::double precision > now_ or (bn->>'rest')::double precision > now_ then return town.answer(me, town.no('rest')); end if;
    offering := nullif(p_input->>'offering', '');
    select array_agg(x) into dawns from jsonb_array_elements_text(k->'dawn') x;
    dawn := case when p_input->>'dawn' = any(dawns) then p_input->>'dawn' end;
    if offering is not null and town.held(purse->'bag', offering) < 1 then return town.answer(me, town.no('offering')); end if;
    if dawn is not null and town.held(purse->'bag', dawn) < (case when dawn = offering then 2 else 1 end) then return town.answer(me, town.no('offering')); end if;
    -- (crossOf: the step two parents' letters take with this kind of offering, and whether the offering is the one)
    kind_ := case when offering like 'seed%' then 'seed' when k->'kinds'->'mineral' ? offering then 'mineral' when k->'kinds'->'flower' ? offering then 'flower'
      when offering = 'prism' then 'prism' end;
    select g into step from jsonb_array_elements(k->'graph') g
     where g->>'kind' = kind_ and ((g->'parents'->>0 = k->'breeds'->(an->>'breed')->>'letter' and g->'parents'->>1 = k->'breeds'->(bn->>'breed')->>'letter')
       or (g->'parents'->>0 = k->'breeds'->(bn->>'breed')->>'letter' and g->'parents'->>1 = k->'breeds'->(an->>'breed')->>'letter')) limit 1;
    target := case when step is not null then (select x.key from jsonb_each(k->'breeds') x where x.value->>'species' = an->>'species' and x.value->>'letter' = step->>'child') end;
    right_ := step is not null and offering is not null and k->'offerings'->(an->>'species')->>(step->>'child') = offering;
    odds := case when right_ then least((kn->>'oddsCap')::integer, (kn->'odds'->>(k->'breeds'->target->>'tier'))::integer + case when dawn is not null then (kn->>'dawnBoost')::integer else 0 end) else 0 end;
    fee := (kn->'fees'->>coalesce(nullif(k->'breeds'->target->>'tier', 'starter'),
      case when 'legend' in (k->'breeds'->(an->>'breed')->>'tier', k->'breeds'->(bn->>'breed')->>'tier') then 'legend'
        when 'fantasy' in (k->'breeds'->(an->>'breed')->>'tier', k->'breeds'->(bn->>'breed')->>'tier') then 'fantasy' else 'real' end))::integer;
    if (purse->>'coins')::integer < fee then return town.answer(me, town.no('coins')); end if;
    place_ := town.animal_free_place(me, 'nursery', k);
    if place_ is null then return town.answer(me, town.no('places')); end if;
    hit := right_ and random() * 100 < odds;
    child := case when hit then target when random() < 0.5 then an->>'breed' else bn->>'breed' end;
    born := now_ + (kn->'hatch'->>(k->'species'->(an->>'species')->>'kind'))::double precision;
    cn := town.animal_new(gen_random_uuid(), me, an->>'species', child, born, false, place_);
    insert into public.town_animals (id, owner, a, changed) values ((cn->>'id')::uuid, me, cn, now_::bigint);
    touched := touched || jsonb_build_array(cn);
    -- (the twin cradle: a cross with a friend's animal gives its owner a baby too, once a day, if they have a place)
    if helper and town.gift_works(purse, k->'gifts'->>'twin') then
      used_ := town.gift_use(purse, k->'gifts'->>'twin', now_::bigint);
      place_ := case when coalesce((used_->>'ok')::boolean, false) then town.animal_free_place(id2, 'nursery', k) end;
      if place_ is not null then
        purse := used_->'purse';
        cn := town.animal_new(gen_random_uuid(), id2, an->>'species', child, born, false, place_);
        insert into public.town_animals (id, owner, a, changed) values ((cn->>'id')::uuid, id2, cn, now_::bigint);
        touched := touched || jsonb_build_array(cn);
        twin := true;
      end if;
    end if;
    an := an || jsonb_build_object('rest', now_ + (kn->>'rest')::double precision);
    bn := bn || jsonb_build_object('rest', now_ + (kn->>'rest')::double precision) || case when helper then jsonb_build_object('lent', null) else '{}'::jsonb end;
    update public.town_animals x set a = an, changed = now_::bigint where x.id = (an->>'id')::uuid;
    update public.town_animals x set a = bn, changed = now_::bigint where x.id = (bn->>'id')::uuid;
    touched := touched || jsonb_build_array(an, bn);
    bag := purse->'bag';
    if offering is not null then bag := town.take(bag, offering, 1); end if;
    if dawn is not null then bag := town.take(bag, dawn, 1); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - fee, 'bag', bag);
    if step is not null and not hit then
      stepkey := (an->>'species') || '.' || (step->>'child');
      book := coalesce(purse->'animalBook', '{"misses": {}}'::jsonb);
      misses := coalesce((book->'misses'->>stepkey)::integer, 0) + 1;
      purse := purse || jsonb_build_object('animalBook', jsonb_set(book, array['misses', stepkey], to_jsonb(misses)));
      clue := misses >= (kn->>'clueAfter')::integer;
    end if;
    if hit and not (pas.found ? child) then
      first_ := true;
      update public.town_pasture p set found = p.found || jsonb_build_object(child, jsonb_build_object('by', me::text, 'at', now_)), changed = now_::bigint where p.one;
    end if;
    got := jsonb_build_object('child', child, 'first', first_, 'right', right_, 'clue', clue);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_breed', 1, 'animals', (kn->'points'->>'breed')::integer + case when first_ then (kn->'points'->>'found')::integer else 0 end,
      jsonb_build_object('a', an->>'breed', 'b', bn->>'breed', 'offering', offering, 'dawn', dawn, 'child', child, 'hit', hit, 'twin', twin), -fee));

  elsif act = 'care' then
    if coalesce(p_input->>'care', '') not in ('none', 'named', 'anybody') then return town.answer(me, town.no('none')); end if;
    select coalesce(jsonb_agg(distinct x), '[]'::jsonb) into spots from (
      select x from jsonb_array_elements_text(case when jsonb_typeof(p_input->'carers') = 'array' then p_input->'carers' else '[]'::jsonb end) x
       where x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and x <> me::text limit 20) y;
    herd := herd || jsonb_build_object('care', p_input->>'care', 'carers', spots);

  elsif act = 'gate' then
    last_ := pas.gate->(jsonb_array_length(pas.gate) - 1);
    open_ := last_ is not null and last_->1 = 'null'::jsonb;
    if open_ is distinct from coalesce((p_input->>'open')::boolean, false) then
      -- (everybody's animals brought to this moment first: the gate changes how fast their troughs go)
      update public.town_animals x set a = town.animal_settle(x.a, now_, pas.gate, town.animal_bottle(x.owner), k), changed = now_::bigint where true;
      gate_n := case when (p_input->>'open')::boolean
        then (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from (select e, o from jsonb_array_elements(pas.gate || jsonb_build_array(jsonb_build_array(now_, null))) with ordinality g(e, o)) z
               where o > jsonb_array_length(pas.gate) + 1 - 64)
        else jsonb_set(pas.gate, array[(jsonb_array_length(pas.gate) - 1)::text, '1'], to_jsonb(now_)) end;
      update public.town_pasture p set gate = gate_n, changed = now_::bigint where p.one;
      notes := notes || jsonb_build_array(jsonb_build_array('animal_gate', case when (p_input->>'open')::boolean then 1 else 0 end, null, 0, '{}'::jsonb, 0));
      got := jsonb_build_object('whole', true);
    end if;

  elsif act = 'enter' then
    -- the barn cat's pets (rank 2), and spring wind's gifts while one blows (rank 9's, anybody's)
    used_ := case when town.gift_works(purse, k->'gifts'->>'cat') then town.gift_use(purse, k->'gifts'->>'cat', now_::bigint) end;
    if coalesce((used_->>'ok')::boolean, false) then purse := used_->'purse'; end if;
    select s into spell from jsonb_array_elements(pas.spells) s where s->>'kind' = 'wind' and (s->>'from')::double precision <= now_ and now_ < (s->>'until')::double precision limit 1;
    for row_ in select x.id, x.a from public.town_animals x where x.owner = me order by x.id for update loop
      an := town.animal_settle(row_.a, now_, pas.gate, town.animal_bottle(me), k);
      stage_ := town.animal_stage(an, now_, k);
      continue when stage_ = 'coming';
      bn := an;
      if coalesce((used_->>'ok')::boolean, false) and not coalesce((an->'today'->>'pet')::boolean, false) then
        an := an || jsonb_build_object('hearts', least((kn->>'hearts')::integer * (kn->>'perHeart')::integer, (an->>'hearts')::integer + (kn->'heart'->>'pet')::integer),
          'today', (an->'today') || '{"pet": true}'::jsonb);
      end if;
      if spell is not null and not coalesce((an->'today'->>'wind')::boolean, false) then
        an := an || jsonb_build_object('today', (an->'today') || '{"wind": true}'::jsonb);
        if stage_ = 'adult' then
          if an->>'place' = 'producing' and (an->>'made')::double precision > 0 and (an->>'banked')::integer < (k->'species'->(an->>'species')->>'bank')::integer then
            an := an || jsonb_build_object('made', 0, 'banked', (an->>'banked')::integer + 1);
          end if;
        else an := an || jsonb_build_object('windUntil', (spell->>'until')::double precision);
        end if;
      end if;
      if an is distinct from bn then
        update public.town_animals x set a = an, changed = now_::bigint where x.id = row_.id;
        touched := touched || jsonb_build_array(an);
      end if;
    end loop;

  elsif act in ('wind', 'harp') then
    used_ := town.gift_use(purse, k->'gifts'->>act, now_::bigint);
    if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
    purse := used_->'purse';
    mins := (kn->act->>'mins')::integer;
    spell := jsonb_build_object('kind', act, 'by', me::text, 'from', now_, 'until', now_ + mins * 60000)
      || case when act = 'harp' then jsonb_build_object('who', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
           select x from jsonb_array_elements_text(jsonb_build_array(me::text) || case when jsonb_typeof(p_input->'near') = 'array' then p_input->'near' else '[]'::jsonb end) x
            where x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' limit 30) y)) else '{}'::jsonb end;
    update public.town_pasture p set spells = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(p.spells) s where (s->>'until')::double precision > now_ - 6 * 3600000)
      || jsonb_build_array(spell), changed = now_::bigint where p.one;
    notes := notes || jsonb_build_array(jsonb_build_array('animal_' || act, 1, null, 0, '{}'::jsonb, 0));

  elsif act = 'wagon' then
    used_ := town.gift_use(purse, k->'gifts'->>'wagon', now_::bigint);
    if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into stops from (select x from jsonb_array_elements_text(case when jsonb_typeof(p_input->'stops') = 'array' then p_input->'stops' else '[]'::jsonb end) x
      where k->'wagonStops' ? x limit 3) y;
    if not (stops ? 'farm') or jsonb_array_length(stops) < 2 then return town.answer(me, town.no('none')); end if;
    purse := used_->'purse';
    run := jsonb_build_object('id', gen_random_uuid()::text, 'by', me::text, 'from', now_, 'stops', stops, 'riders', '[]'::jsonb);
    update public.town_pasture p set wagons = (select coalesce(jsonb_agg(w), '[]'::jsonb) from jsonb_array_elements(p.wagons) w where (w->>'from')::double precision > now_ - 86400000)
      || jsonb_build_array(run), changed = now_::bigint where p.one;
    notes := notes || jsonb_build_array(jsonb_build_array('animal_wagon', 1, null, 0, jsonb_build_object('stops', stops), 0));

  elsif act in ('ride', 'rode') then
    select w into run from jsonb_array_elements(pas.wagons) w where w->>'id' = p_input->>'run' limit 1;
    if run is null then return town.answer(me, town.no('none')); end if;
    if act = 'ride' then
      if now_ > (run->>'from')::double precision + (kn->'wagon'->>'mins')::double precision * 60000 then return town.answer(me, town.no('none')); end if;
      if not exists (select 1 from jsonb_array_elements(run->'riders') x where x->>'who' = me::text) then
        update public.town_pasture p set wagons = (select jsonb_agg(case when w->>'id' = run->>'id'
            then w || jsonb_build_object('riders', (w->'riders') || jsonb_build_array(jsonb_build_object('who', me::text, 'on', now_, 'leg', greatest(0, floor(coalesce((p_input->>'leg')::double precision, 0))::integer))))
            else w end) from jsonb_array_elements(p.wagons) w), changed = now_::bigint where p.one;
      end if;
    else
      select x into rider from jsonb_array_elements(run->'riders') x where x->>'who' = me::text limit 1;
      if rider is null then return town.answer(me, town.no('none')); end if;
      leg_ms := ((kn->'wagon'->>'mins')::double precision * 60000) / greatest(1, jsonb_array_length(run->'stops'));
      if now_ < (rider->>'on')::double precision + (kn->'wagon'->>'legs')::double precision * leg_ms - 1000 then return town.answer(me, town.no('soon')); end if;
      if purse->>'animalRode' = 'wagon:' || town.day_of(now_::bigint) then return town.answer(me, town.no('used')); end if;
      for row_ in select x.id, x.a from public.town_animals x where x.owner = me order by x.id for update loop
        an := town.animal_settle(row_.a, now_, pas.gate, town.animal_bottle(me), k);
        continue when town.animal_stage(an, now_, k) = 'coming';
        an := an || jsonb_build_object('hearts', least((kn->>'hearts')::integer * (kn->>'perHeart')::integer, (an->>'hearts')::integer + (kn->>'wagonHeart')::integer));
        update public.town_animals x set a = an, changed = now_::bigint where x.id = row_.id;
        touched := touched || jsonb_build_array(an);
      end loop;
      purse := purse || jsonb_build_object('animalRode', 'wagon:' || town.day_of(now_::bigint));
      notes := notes || jsonb_build_array(jsonb_build_array('animal_rode', 1, null, 0, jsonb_build_object('run', run->>'id'), 0));
    end if;

  elsif act = 'scroll' then
    -- whoever first bred a breed may write its recipe out, for a little ink and paper
    item := p_input->>'breed';
    breed := k->'breeds'->item;
    if breed is null or breed->>'letter' = 'A' then return town.answer(me, town.no('none')); end if;
    if pas.found->item->>'by' is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
    price := (kn->>'scrollFee')::integer;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    tool := 'scrollBreed' || initcap(breed->>'species') || (breed->>'letter');
    if town.room_g(purse->'bag', tool, 0) < 1 then return town.answer(me, town.no('room')); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price, 'bag', town.put_g(purse->'bag', tool, 1, 0));
    got := jsonb_build_object('item', tool, 'n', 1);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_scroll', 1, null, 0, jsonb_build_object('breed', item), -price));

  elsif act = 'read' then
    -- a breed's scroll read: its step's offering known from now on
    item := p_input->>'item';
    if coalesce(item, '') not like 'scrollBreed%' or town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('nothing')); end if;
    purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1),
      'recipes', case when coalesce(purse->'recipes', '[]'::jsonb) ? item then purse->'recipes' else coalesce(purse->'recipes', '[]'::jsonb) || to_jsonb(item) end);

  elsif act = 'forage' then
    spot_ := floor(coalesce((p_input->>'spot')::double precision, -1))::integer;
    if spot_ < 0 or spot_ >= (k->'meadow'->>'spots')::integer then return town.answer(me, town.no('none')); end if;
    day_ := town.day_of(now_::bigint); band_ := town.animal_band(now_); key_ := day_ * 8 + band_;
    spots := case when (purse->'meadow'->>'k')::integer = key_ then coalesce(purse->'meadow'->'spots', '[]'::jsonb) else '[]'::jsonb end;
    if spots @> to_jsonb(spot_) then return town.answer(me, town.no('used')); end if;
    item := town.animal_forage(day_, band_, spot_, k);
    if item is null then return town.answer(me, town.no('nothing')); end if;
    if town.room_g(purse->'bag', item, 0) < 1 then return town.answer(me, town.no('room')); end if;
    purse := town.spend(purse, (k->'meadow'->>'stamina')::double precision, now_::bigint);
    purse := purse || jsonb_build_object('bag', town.put_g(purse->'bag', item, 1, 0), 'meadow', jsonb_build_object('k', key_, 'spots', spots || to_jsonb(spot_)));
    got := jsonb_build_object('item', item, 'n', 1);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_forage', 1, 'animals', (k->'meadow'->>'points')::integer, jsonb_build_object('item', item, 'spot', spot_, 'band', band_), 0));

  else
    return town.answer(me, town.no('none'));
  end if;

  -- what is kept: my purse, my herd, what was written down
  perform town.keep_purse(me, purse);
  if herd is distinct from town.animal_herd(me) or not exists (select 1 from public.town_herds h where h.owner = me) then
    insert into public.town_herds (owner, h, changed) values (me, herd, now_::bigint) on conflict (owner) do update set h = excluded.h, changed = excluded.changed;
  end if;
  for r in select x from jsonb_array_elements(notes) x loop
    perform town.note(me, r->>0, null, (r->>1)::numeric, (r->>5)::numeric,
      coalesce(r->4, '{}'::jsonb) || case when r->>2 is not null and (r->>3)::integer > 0 then jsonb_build_object('line', r->>2, 'pts', (r->>3)::integer) else '{}'::jsonb end);
  end loop;
  select * into pas from public.town_pasture where one;
  ans := jsonb_build_object('ok', true, 'got', got,
    'world', case when got->>'whole' = 'true' then town.animal_world(me) else jsonb_build_object('animals', touched, 'removed', removed, 'herds', jsonb_build_array(herd),
      'gate', pas.gate, 'found', pas.found, 'spells', pas.spells, 'wagons', pas.wagons) end);
  if p_request is not null then
    delete from public.town_animal_asks x where x.member = me and x.at < now_::bigint - 86400000;
    insert into public.town_animal_asks (member, request, answer, at) values (me, p_request, ans, now_::bigint) on conflict (member, request) do nothing;
  end if;
  return town.answer(me, ans);
end $$;
revoke all on function public.town_animals(jsonb, text) from public, anon;
grant execute on function public.town_animals(jsonb, text) to authenticated;


-- ── 5. The kitchen, the relatives and the grade: written whole (small, and theirs since v260 and v261) ────────────────
create or replace function town.carries_grade(p_id text)
returns boolean language sql stable set search_path='' as $$
 select coalesce(town.cat('items')->p_id->>'kind' = 'crop', false)
     or p_id = any(array['curryPaste','coconutMilk','dicedRoot','brownedOnion','driedZest','brightSauce','thickBroth','sweetGlaze','spicePaste',
                         'beanPaste','berryJam','blueCornFlour','driedTea','sunflowerOil','lotusStarch','nectarSyrup'])
     -- v291: what an animal gives, and what is made of it for the kitchen (lib/town/animal-items' ANIMAL_GRADED)
     or coalesce(town.cat('animals')->'graded' ? p_id, false)
$$;
create or replace function town.grade_pays(p_item text, p_grade integer)
returns numeric language sql stable set search_path='' as $$
 select case when town.cat('items')->p_item->>'kind' = 'crop' or coalesce(town.cat('animals')->'produce' ? p_item, false)
   then (array[1, 1.25, 1.75, 2.5]::numeric[])[coalesce(p_grade, 0) + 1] else 1 end
$$;
-- (town.made_of: its live text kept as town.made_of_exact, once; made_of reads a pot as it is, then as its families)
do $$
declare d text := replace(pg_get_functiondef('town.made_of(jsonb)'::regprocedure), chr(13), '');
begin
  if position('v291' in d) = 0 then
    execute replace(d, 'town.made_of(p_things jsonb)', 'town.made_of_exact(p_things jsonb)');
  end if;
end $$;
create or replace function town.made_of(p_things jsonb)
returns text language sql stable set search_path = '' as $$
  -- v291: as it is, then (when it holds a breed's egg, milk or wool, or farm cheese) as its families
  select coalesce(town.made_of_exact(p_things),
    case when exists (select 1 from jsonb_array_elements(p_things) x where town.cat('animals')->'family' ? (x->>0))
      then town.made_of_exact((select jsonb_agg(jsonb_build_array(coalesce(town.cat('animals')->'family'->>(x->>0), x->>0), x->1)) from jsonb_array_elements(p_things) x)) end)
$$;
revoke all on function town.carries_grade(text), town.grade_pays(text, integer), town.made_of(jsonb), town.made_of_exact(jsonb) from public, anon, authenticated;

-- ── 6. The functions that count, price and place: their live text, but for these ─────────────────────────────────────
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.work_counts_of(jsonb,text)', 'begin
  if p_done->>''from'' = ''play'' then', 'begin
  -- v291: the pasture''s deeds carry their own points, written by public.town_animals alone (animals: the line''s; helpers: friend care, 30 a day)
  if what like ''animal\_%'' and doc ? ''line'' and doc ? ''pts'' and doc->>''line'' in (''animals'', ''helpers'') then
    return jsonb_build_array(jsonb_build_object(''to'', null, ''line'', doc->>''line'', ''raw'', least(200, greatest(0, (doc->>''pts'')::double precision))));
  end if;
  if p_done->>''from'' = ''play'' then', '1'],
    ['town.market_things(jsonb)', 'case when t.kind in (''dish'', ''goods'', ''staple'') then (p_k->>''made'')::int', 'case when t.kind in (''dish'', ''goods'', ''staple'') and not coalesce(town.cat(''animals'')->''produce'' ? t.id, false) then (p_k->>''made'')::int', '1'],
    ['town.reward_relay_place(jsonb)', '(at_->>1)::integer between 0 and 85 then ''farm''', '(at_->>1)::integer between -32 and 85 then ''farm''', '1']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = c[4]::integer then execute replace(d, o, nw);
    else raise exception 'v291: % has % of [%], not %: rebuild v291', c[1], n, left(c[2], 60), c[4]; end if;
  end loop;
end $$;

-- ── 7. The catalog ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- <catalog:v291> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('animals', $town${
    "knobs": {"trough":24,"outRate":0.5,"perHeart":20,"hearts":10,"heart":{"fed":3,"pet":3,"treat":2,"out":2},"wagonHeart":20,"places":{"producing":2,"nursery":2},"keeping":[[2,500,20],[4,2000,40],[8,6000,80]],"facades":[5000,15000,40000],"breedHearts":60,"rest":172800000,"hatch":{"bird":43200000,"mammal":86400000},"odds":{"real":60,"fantasy":30,"legend":10},"dawnBoost":10,"oddsCap":70,"fees":{"real":80,"fantasy":220,"legend":600},"scrollFee":12,"clueAfter":3,"speedCap":3,"growFeed":86400000,"dewFeed":172800000,"packed":72,"quality":{"base":30,"perHeart":7,"spread":30,"narrowest":20,"narrowBy":[0,5,10,15]},"stamina":{"eggs":2,"shear":3,"milk":4},"care":{"pet":1,"treat":1,"foodHours":4,"cap":30},"points":{"feed":15,"pet":10,"treat":10,"unit":2,"breed":20,"found":60,"cradle":15},"sellBack":{"bought":0.25},"cradleRare":0.2,"harp":{"mins":30,"near":8},"wind":{"mins":60},"wagon":{"legs":2,"mins":4,"seats":0},"outsideShare":0.3333333333333333},
    "species": {"chicken":{"price":400,"grow":[24,24],"cycle":6,"bank":4,"game":"eggs","kind":"bird","sack":"chickFeed","sackPrice":4,"growItem":"chickGrow","growPrice":10,"feeds":{"corn":6,"buckwheat":6,"meadowOats":6,"dawnOats":8,"moonOats":6,"pondMillet":6,"orchardPea":5,"reedSeed":5},"treats":["grasshopper","cricket","blueberry"],"bredBack":20},"duck":{"price":1000,"grow":[24,48],"cycle":8,"bank":3,"game":"eggs","kind":"bird","sack":"duckFeed","sackPrice":6,"growItem":"duckGrow","growPrice":15,"feeds":{"watercress":6,"cabbage":4,"pondMillet":6,"nightDuckweed":6,"ghostReed":6,"reedSeed":5},"treats":["minnow","snail","raspberry"],"bredBack":30},"sheep":{"price":2500,"grow":[48,72],"cycle":24,"bank":1,"game":"shear","kind":"mammal","sack":"sheepFeed","sackPrice":8,"growItem":"lambGrow","growPrice":25,"feeds":{"clover":8,"carrot":4,"sweetTimothy":8,"amberClover":8,"dewClover":10,"lanternGrass":8,"copperSedge":6,"velvetVetch":8},"treats":["clover","chamomile","wildApple"],"bredBack":40},"cow":{"price":4000,"grow":[72,96],"cycle":12,"bank":2,"game":"milk","kind":"mammal","sack":"cowFeed","sackPrice":10,"growItem":"calfGrow","growPrice":40,"feeds":{"corn":6,"pumpkin":8,"sunAlfalfa":10,"sweetTimothy":8,"mistVetch":10,"copperSedge":6,"velvetVetch":8,"lanternGrass":8},"treats":["mineralSalt","pumpkin","chestnut"],"bredBack":50}},
    "starters": {"chicken":"barnHen","duck":"puddleDuck","sheep":"meadowSheep","cow":"dairyCow"},
    "breeds": {"barnHen":{"species":"chicken","letter":"A","tier":"starter","produce":"farmEgg"},"silkie":{"species":"chicken","letter":"B","tier":"real","produce":"silkieEgg"},"araucana":{"species":"chicken","letter":"C","tier":"real","produce":"blueEgg"},"marans":{"species":"chicken","letter":"D","tier":"real","produce":"chocolateEgg"},"lanternHen":{"species":"chicken","letter":"E","tier":"fantasy","produce":"lanternEgg"},"cloudHen":{"species":"chicken","letter":"F","tier":"fantasy","produce":"cloudEgg"},"goldenHen":{"species":"chicken","letter":"G","tier":"fantasy","produce":"goldenEgg"},"pocketPhoenix":{"species":"chicken","letter":"H","tier":"legend","produce":"emberEgg"},"puddleDuck":{"species":"duck","letter":"A","tier":"starter","produce":"duckEgg"},"runner":{"species":"duck","letter":"B","tier":"real","produce":"runnerEgg"},"cayuga":{"species":"duck","letter":"C","tier":"real","produce":"cayugaEgg"},"mandarin":{"species":"duck","letter":"D","tier":"real","produce":"mandarinEgg"},"raindropDuck":{"species":"duck","letter":"E","tier":"fantasy","produce":"rainEgg"},"moonDuck":{"species":"duck","letter":"F","tier":"fantasy","produce":"moonEgg"},"paperboatDuck":{"species":"duck","letter":"G","tier":"fantasy","produce":"paperEgg"},"littleLeviathan":{"species":"duck","letter":"H","tier":"legend","produce":"leviathanEgg"},"meadowSheep":{"species":"sheep","letter":"A","tier":"starter","produce":"wool"},"shetland":{"species":"sheep","letter":"B","tier":"real","produce":"shetlandWool"},"jacob":{"species":"sheep","letter":"C","tier":"real","produce":"jacobWool"},"valais":{"species":"sheep","letter":"D","tier":"real","produce":"valaisWool"},"dandelionLamb":{"species":"sheep","letter":"E","tier":"fantasy","produce":"dandelionWool"},"rainbowSheep":{"species":"sheep","letter":"F","tier":"fantasy","produce":"rainbowWool"},"starFleece":{"species":"sheep","letter":"G","tier":"fantasy","produce":"starWool"},"goldenFleece":{"species":"sheep","letter":"H","tier":"legend","produce":"goldenWool"},"dairyCow":{"species":"cow","letter":"A","tier":"starter","produce":"farmMilk"},"jersey":{"species":"cow","letter":"B","tier":"real","produce":"jerseyMilk"},"highland":{"species":"cow","letter":"C","tier":"real","produce":"highlandMilk"},"brownSwiss":{"species":"cow","letter":"D","tier":"real","produce":"swissMilk"},"strawberryCow":{"species":"cow","letter":"E","tier":"fantasy","produce":"strawberryMilk"},"cocoaCow":{"species":"cow","letter":"F","tier":"fantasy","produce":"cocoaMilk"},"flowerCow":{"species":"cow","letter":"G","tier":"fantasy","produce":"flowerMilk"},"milkyWayCow":{"species":"cow","letter":"H","tier":"legend","produce":"starMilk"}},
    "graph": [{"child":"B","parents":["A","A"],"kind":"seed"},{"child":"C","parents":["A","A"],"kind":"mineral"},{"child":"D","parents":["B","C"],"kind":"flower"},{"child":"E","parents":["B","D"],"kind":"seed"},{"child":"F","parents":["C","D"],"kind":"mineral"},{"child":"G","parents":["E","F"],"kind":"flower"},{"child":"H","parents":["E","G"],"kind":"prism"}],
    "offerings": {"chicken":{"B":"seedCorn","C":"copperNodule","D":"marigold","E":"seedBottleGourd","F":"quartzCore","G":"lavender","H":"prism"},"duck":{"B":"seedCabbage","C":"clayPocket","D":"borage","E":"seedWatermelon","F":"silverNodule","G":"chamomile","H":"prism"},"sheep":{"B":"seedCarrot","C":"slateLayer","D":"clover","E":"seedTeaBush","F":"pyriteCluster","G":"milkweed","H":"prism"},"cow":{"B":"seedPumpkin","C":"ironNodule","D":"dill","E":"seedTrellisBerry","F":"wholeGeode","G":"nasturtium","H":"prism"}},
    "kinds": {"mineral":["slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","wholeGeode","mineralSalt"],"flower":["marigold","borage","chamomile","clover","lavender","nasturtium","milkweed","dill","fennel","mint"]},
    "dawn": ["mistVetch","ghostReed","dewClover","dawnOats"],
    "finds": {"chicken":{"day":"worm","night":"scarab","dawn":"dewClover"},"duck":{"day":"snail","night":"nightDuckweed","dawn":"ghostReed"},"sheep":{"day":"wildflower","night":"velvetVetch","dawn":"mistVetch"},"cow":{"day":"sunAlfalfa","night":"lanternGrass","dawn":"dawnOats"}},
    "findOdds": 3,
    "meadow": {"spots":12,"stamina":1,"points":1},
    "forage": {"mistVetch":[0],"ghostReed":[0,1],"dewClover":[1],"dawnOats":[1,0],"meadowOats":[2,3],"sweetTimothy":[2],"sunAlfalfa":[3,4],"pondMillet":[3],"copperSedge":[4],"orchardPea":[4,5],"amberClover":[5],"reedSeed":[5,6],"lanternGrass":[6],"velvetVetch":[6,7],"moonOats":[7],"nightDuckweed":[7,0]},
    "eggSpots": [[134,-27],[139,-25],[145,-28],[150,-26],[155,-28],[160,-25],[164,-28],[152,-20],[157,-14],[162,-22],[147,-12],[154,-11],[165,-12],[178,-13],[181,-19],[183,-15],[137,-5],[143,-6],[148,-4],[165,-6],[171,-5],[177,-4],[183,-7],[132,-12]],
    "wagonStops": {"farm":[151,-3],"town":[57,32],"forest":[190,186]},
    "shop": {"chickFeed":4,"chickGrow":10,"duckFeed":6,"duckGrow":15,"sheepFeed":8,"lambGrow":25,"cowFeed":10,"calfGrow":40,"milker":180,"woolShears":60,"eggBasket":24,"churn":80,"cheesePress":100,"spindle":60,"knittingNeedles":60,"scrollCustard":72,"scrollPancakes":88,"scrollCheesecake":160,"scrollButterCookies":104,"scrollQuiche":144,"scrollLanternCustard":160,"scrollCloudSouffle":176,"scrollGoldenOmelette":184,"scrollEmberBakedEggs":224,"scrollRainBroth":152,"scrollMoonPudding":160,"scrollPaperFish":152,"scrollLeviathanEggCup":232,"scrollStrawberryShake":120,"scrollHotCocoa":120,"scrollFlowerLatte":120,"scrollStarPudding":240},
    "tools": {"eggs":"eggBasket","shear":"woolShears","milk":"milker"},
    "gifts": {"bell":"charmHerdBell","cat":"thingBarnCat","bottle":"thingWarmBottle","collar":"charmStarCollar","cradle":"thingCradle","ram":"famCloudRam","twin":"thingTwinCradle","harp":"thingHarp","wind":"thingSpringWind","wagon":"thingHayWagon"},
    "anyFeed": {"packedRation":72},
    "dewGrow": "dewGrow",
    "leastSecs": {"eggs":3,"shear":6,"milk":6},
    "produce": ["farmEgg","silkieEgg","blueEgg","chocolateEgg","lanternEgg","cloudEgg","goldenEgg","emberEgg","duckEgg","runnerEgg","cayugaEgg","mandarinEgg","rainEgg","moonEgg","paperEgg","leviathanEgg","wool","shetlandWool","jacobWool","valaisWool","dandelionWool","rainbowWool","starWool","goldenWool","farmMilk","jerseyMilk","highlandMilk","swissMilk","strawberryMilk","cocoaMilk","flowerMilk","starMilk"],
    "graded": ["farmEgg","silkieEgg","blueEgg","chocolateEgg","lanternEgg","cloudEgg","goldenEgg","emberEgg","duckEgg","runnerEgg","cayugaEgg","mandarinEgg","rainEgg","moonEgg","paperEgg","leviathanEgg","wool","shetlandWool","jacobWool","valaisWool","dandelionWool","rainbowWool","starWool","goldenWool","farmMilk","jerseyMilk","highlandMilk","swissMilk","strawberryMilk","cocoaMilk","flowerMilk","starMilk","cream","butter","farmCheese","yarn"],
    "family": {"farmEgg":"egg","silkieEgg":"egg","blueEgg":"egg","chocolateEgg":"egg","lanternEgg":"egg","cloudEgg":"egg","goldenEgg":"egg","emberEgg":"egg","duckEgg":"egg","runnerEgg":"egg","cayugaEgg":"egg","mandarinEgg":"egg","rainEgg":"egg","moonEgg":"egg","paperEgg":"egg","leviathanEgg":"egg","farmMilk":"milk","jerseyMilk":"milk","highlandMilk":"milk","swissMilk":"milk","strawberryMilk":"milk","cocoaMilk":"milk","flowerMilk":"milk","starMilk":"milk","shetlandWool":"wool","jacobWool":"wool","valaisWool":"wool","dandelionWool":"wool","rainbowWool":"wool","starWool":"wool","goldenWool":"wool","farmCheese":"cheese"}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v291>
-- (merged, entry by entry: what is the pasture's, into the rows it belongs to)
update public.town_catalog set data = data || $j${"farmEgg":{"kind":"goods","tier":2,"stack":20,"pays":5},"silkieEgg":{"kind":"goods","tier":2,"stack":20,"pays":5},"blueEgg":{"kind":"goods","tier":2,"stack":20,"pays":5},"chocolateEgg":{"kind":"goods","tier":2,"stack":20,"pays":5},"lanternEgg":{"kind":"goods","tier":3,"stack":20,"pays":8},"cloudEgg":{"kind":"goods","tier":3,"stack":20,"pays":8},"goldenEgg":{"kind":"goods","tier":3,"stack":20,"pays":8},"emberEgg":{"kind":"goods","tier":3,"stack":20,"pays":10},"duckEgg":{"kind":"goods","tier":2,"stack":20,"pays":10},"runnerEgg":{"kind":"goods","tier":2,"stack":20,"pays":10},"cayugaEgg":{"kind":"goods","tier":2,"stack":20,"pays":10},"mandarinEgg":{"kind":"goods","tier":2,"stack":20,"pays":10},"rainEgg":{"kind":"goods","tier":3,"stack":20,"pays":15},"moonEgg":{"kind":"goods","tier":3,"stack":20,"pays":15},"paperEgg":{"kind":"goods","tier":3,"stack":20,"pays":15},"leviathanEgg":{"kind":"goods","tier":3,"stack":20,"pays":20},"wool":{"kind":"goods","tier":2,"stack":20,"pays":12},"shetlandWool":{"kind":"goods","tier":2,"stack":20,"pays":12},"jacobWool":{"kind":"goods","tier":2,"stack":20,"pays":12},"valaisWool":{"kind":"goods","tier":2,"stack":20,"pays":12},"dandelionWool":{"kind":"goods","tier":3,"stack":20,"pays":18},"rainbowWool":{"kind":"goods","tier":3,"stack":20,"pays":18},"starWool":{"kind":"goods","tier":3,"stack":20,"pays":18},"goldenWool":{"kind":"goods","tier":3,"stack":20,"pays":24},"farmMilk":{"kind":"goods","tier":2,"stack":20,"pays":10},"jerseyMilk":{"kind":"goods","tier":2,"stack":20,"pays":10},"highlandMilk":{"kind":"goods","tier":2,"stack":20,"pays":10},"swissMilk":{"kind":"goods","tier":2,"stack":20,"pays":10},"strawberryMilk":{"kind":"goods","tier":3,"stack":20,"pays":15},"cocoaMilk":{"kind":"goods","tier":3,"stack":20,"pays":15},"flowerMilk":{"kind":"goods","tier":3,"stack":20,"pays":15},"starMilk":{"kind":"goods","tier":3,"stack":20,"pays":20},"cream":{"kind":"goods","tier":2,"stack":20,"pays":22},"butter":{"kind":"goods","tier":2,"stack":20,"pays":46},"farmCheese":{"kind":"goods","tier":2,"stack":20,"pays":34},"yarn":{"kind":"goods","tier":2,"stack":20,"pays":26},"woolScarf":{"kind":"goods","tier":2,"stack":20,"pays":60},"rainbowScarf":{"kind":"goods","tier":3,"stack":20,"pays":90},"starScarf":{"kind":"goods","tier":3,"stack":20,"pays":90},"goldenScarf":{"kind":"goods","tier":3,"stack":20,"pays":120},"prism":{"kind":"goods","tier":3,"stack":20,"pays":20},"chickFeed":{"kind":"goods","tier":2,"stack":20,"pays":2},"duckFeed":{"kind":"goods","tier":2,"stack":20,"pays":3},"sheepFeed":{"kind":"goods","tier":2,"stack":20,"pays":4},"cowFeed":{"kind":"goods","tier":2,"stack":20,"pays":5},"chickGrow":{"kind":"goods","tier":2,"stack":20,"pays":5},"duckGrow":{"kind":"goods","tier":2,"stack":20,"pays":7},"lambGrow":{"kind":"goods","tier":2,"stack":20,"pays":12},"calfGrow":{"kind":"goods","tier":2,"stack":20,"pays":20},"dewGrow":{"kind":"goods","tier":3,"stack":20,"pays":15},"packedRation":{"kind":"goods","tier":3,"stack":20,"pays":12},"milker":{"kind":"tool","tier":1,"stack":1,"pays":90},"woolShears":{"kind":"tool","tier":1,"stack":1,"pays":30},"eggBasket":{"kind":"tool","tier":1,"stack":1,"pays":12},"churn":{"kind":"tool","tier":1,"stack":1,"pays":40},"cheesePress":{"kind":"tool","tier":1,"stack":1,"pays":50},"spindle":{"kind":"tool","tier":1,"stack":1,"pays":30},"knittingNeedles":{"kind":"tool","tier":1,"stack":1,"pays":30},"mistVetch":{"kind":"wild","tier":3,"stack":20,"pays":10},"ghostReed":{"kind":"wild","tier":3,"stack":20,"pays":10},"dewClover":{"kind":"wild","tier":3,"stack":20,"pays":10},"dawnOats":{"kind":"wild","tier":3,"stack":20,"pays":10},"meadowOats":{"kind":"wild","tier":2,"stack":20,"pays":3},"sweetTimothy":{"kind":"wild","tier":2,"stack":20,"pays":3},"sunAlfalfa":{"kind":"wild","tier":2,"stack":20,"pays":4},"pondMillet":{"kind":"wild","tier":2,"stack":20,"pays":4},"copperSedge":{"kind":"wild","tier":2,"stack":20,"pays":4},"orchardPea":{"kind":"wild","tier":2,"stack":20,"pays":4},"amberClover":{"kind":"wild","tier":2,"stack":20,"pays":4},"reedSeed":{"kind":"wild","tier":2,"stack":20,"pays":3},"lanternGrass":{"kind":"wild","tier":2,"stack":20,"pays":5},"velvetVetch":{"kind":"wild","tier":2,"stack":20,"pays":5},"moonOats":{"kind":"wild","tier":2,"stack":20,"pays":5},"nightDuckweed":{"kind":"wild","tier":2,"stack":20,"pays":4},"custard":{"kind":"dish","tier":3,"stack":5,"pays":18},"pancakes":{"kind":"dish","tier":3,"stack":5,"pays":22},"cheesecake":{"kind":"dish","tier":3,"stack":5,"pays":40},"butterCookies":{"kind":"dish","tier":3,"stack":5,"pays":26},"quiche":{"kind":"dish","tier":3,"stack":5,"pays":36},"lanternCustard":{"kind":"dish","tier":3,"stack":5,"pays":40},"cloudSouffle":{"kind":"dish","tier":3,"stack":5,"pays":44},"goldenOmelette":{"kind":"dish","tier":3,"stack":5,"pays":46},"emberBakedEggs":{"kind":"dish","tier":3,"stack":5,"pays":56},"rainBroth":{"kind":"dish","tier":3,"stack":5,"pays":38},"moonPudding":{"kind":"dish","tier":3,"stack":5,"pays":40},"paperFish":{"kind":"dish","tier":3,"stack":5,"pays":38},"leviathanEggCup":{"kind":"dish","tier":3,"stack":5,"pays":58},"strawberryShake":{"kind":"dish","tier":3,"stack":5,"pays":30},"hotCocoa":{"kind":"dish","tier":3,"stack":5,"pays":30},"flowerLatte":{"kind":"dish","tier":3,"stack":5,"pays":30},"starPudding":{"kind":"dish","tier":3,"stack":5,"pays":60},"scrollCustard":{"kind":"scroll","tier":3,"stack":1,"pays":36},"scrollPancakes":{"kind":"scroll","tier":3,"stack":1,"pays":44},"scrollCheesecake":{"kind":"scroll","tier":3,"stack":1,"pays":80},"scrollButterCookies":{"kind":"scroll","tier":3,"stack":1,"pays":52},"scrollQuiche":{"kind":"scroll","tier":3,"stack":1,"pays":72},"scrollLanternCustard":{"kind":"scroll","tier":3,"stack":1,"pays":80},"scrollCloudSouffle":{"kind":"scroll","tier":3,"stack":1,"pays":88},"scrollGoldenOmelette":{"kind":"scroll","tier":3,"stack":1,"pays":92},"scrollEmberBakedEggs":{"kind":"scroll","tier":3,"stack":1,"pays":112},"scrollRainBroth":{"kind":"scroll","tier":3,"stack":1,"pays":76},"scrollMoonPudding":{"kind":"scroll","tier":3,"stack":1,"pays":80},"scrollPaperFish":{"kind":"scroll","tier":3,"stack":1,"pays":76},"scrollLeviathanEggCup":{"kind":"scroll","tier":3,"stack":1,"pays":116},"scrollStrawberryShake":{"kind":"scroll","tier":3,"stack":1,"pays":60},"scrollHotCocoa":{"kind":"scroll","tier":3,"stack":1,"pays":60},"scrollFlowerLatte":{"kind":"scroll","tier":3,"stack":1,"pays":60},"scrollStarPudding":{"kind":"scroll","tier":3,"stack":1,"pays":120},"scrollBreedChickenB":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenC":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenD":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenE":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenF":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenG":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedChickenH":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckB":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckC":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckD":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckE":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckF":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckG":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedDuckH":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepB":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepC":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepD":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepE":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepF":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepG":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedSheepH":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowB":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowC":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowD":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowE":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowF":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowG":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollBreedCowH":{"kind":"scroll","tier":2,"stack":1,"pays":12}}$j$::jsonb, updated_at = now() where key = 'items';
update public.town_catalog set data = data || $j${"custard":{"stamina":30,"buff":"calm","recipe":{"needs":[["egg",2],["milk",1],["sugar",1]],"in":["pot"],"serves":3,"cooks":1}},"pancakes":{"stamina":32,"buff":"green","recipe":{"needs":[["flour",1],["egg",1],["milk",1],["butter",1]],"in":["pan"],"serves":3,"cooks":1}},"cheesecake":{"stamina":44,"buff":"hearty","recipe":{"needs":[["farmCheese",1],["cream",1],["egg",1],["sugar",1]],"in":["oven"],"serves":6,"cooks":1}},"butterCookies":{"stamina":28,"buff":"lucky","recipe":{"needs":[["butter",1],["flour",2],["sugar",1]],"in":["rollingPin","oven"],"serves":6,"cooks":2}},"quiche":{"stamina":40,"buff":"hearty","recipe":{"needs":[["egg",2],["cream",1],["farmCheese",1],["flour",1]],"in":["oven"],"serves":4,"cooks":1}},"lanternCustard":{"stamina":36,"buff":"calm","recipe":{"needs":[["lanternEgg",2],["milk",1],["sugar",1]],"in":["pot"],"serves":3,"cooks":1}},"cloudSouffle":{"stamina":38,"buff":"lucky","recipe":{"needs":[["cloudEgg",2],["butter",1],["sugar",1]],"in":["oven"],"serves":2,"cooks":1}},"goldenOmelette":{"stamina":40,"buff":"lucky","recipe":{"needs":[["goldenEgg",2],["butter",1],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},"emberBakedEggs":{"stamina":50,"buff":"hearty","recipe":{"needs":[["emberEgg",1],["tomato",2],["butter",1]],"in":["pan"],"serves":4,"cooks":1}},"rainBroth":{"stamina":34,"buff":"green","recipe":{"needs":[["rainEgg",1],["watercress",2],["salt",1]],"in":["pot"],"serves":3,"cooks":1}},"moonPudding":{"stamina":38,"buff":"calm","recipe":{"needs":[["moonEgg",1],["cream",1],["sugar",1]],"in":["pot"],"serves":3,"cooks":1}},"paperFish":{"stamina":36,"buff":"lucky","recipe":{"needs":[["paperEgg",1],["perch",1],["salt",1]],"in":["oven"],"serves":2,"cooks":1}},"leviathanEggCup":{"stamina":50,"buff":"lucky","recipe":{"needs":[["leviathanEgg",1],["prawn",2],["salt",1]],"in":["steamer"],"serves":4,"cooks":1}},"strawberryShake":{"stamina":26,"buff":"green","recipe":{"needs":[["strawberryMilk",2],["sugar",1]],"in":["mortar"],"serves":3,"cooks":1}},"hotCocoa":{"stamina":26,"buff":"calm","recipe":{"needs":[["cocoaMilk",2],["sugar",1]],"in":["pot"],"serves":3,"cooks":1}},"flowerLatte":{"stamina":26,"buff":"calm","recipe":{"needs":[["flowerMilk",2],["sugar",1]],"in":["pot"],"serves":3,"cooks":1}},"starPudding":{"stamina":50,"buff":"hearty","recipe":{"needs":[["starMilk",2],["cream",1],["sugar",1]],"in":["pot"],"serves":4,"cooks":1}}}$j$::jsonb, updated_at = now() where key = 'dishes';
update public.town_catalog set data = data || $j${"scrollCustard":"custard","scrollPancakes":"pancakes","scrollCheesecake":"cheesecake","scrollButterCookies":"butterCookies","scrollQuiche":"quiche","scrollLanternCustard":"lanternCustard","scrollCloudSouffle":"cloudSouffle","scrollGoldenOmelette":"goldenOmelette","scrollEmberBakedEggs":"emberBakedEggs","scrollRainBroth":"rainBroth","scrollMoonPudding":"moonPudding","scrollPaperFish":"paperFish","scrollLeviathanEggCup":"leviathanEggCup","scrollStrawberryShake":"strawberryShake","scrollHotCocoa":"hotCocoa","scrollFlowerLatte":"flowerLatte","scrollStarPudding":"starPudding"}$j$::jsonb, updated_at = now() where key = 'scrolls';
update public.town_catalog set data = data || $j${"cream":{"needs":[["milk",2]],"in":["churn"],"gives":1},"butter":{"needs":[["cream",2]],"in":["churn"],"gives":1},"farmCheese":{"needs":[["milk",3],["salt",1]],"in":["cheesePress"],"gives":1},"yarn":{"needs":[["wool",2]],"in":["spindle"],"gives":1},"woolScarf":{"needs":[["yarn",2]],"in":["knittingNeedles"],"gives":1},"rainbowScarf":{"needs":[["rainbowWool",2],["yarn",1]],"in":["knittingNeedles"],"gives":1},"starScarf":{"needs":[["starWool",2],["yarn",1]],"in":["knittingNeedles"],"gives":1},"goldenScarf":{"needs":[["goldenWool",2],["yarn",1]],"in":["knittingNeedles"],"gives":1},"prism":{"needs":[["crystalLens",1],["quartzCore",1]],"in":[],"gives":1},"dewGrow":{"needs":[["dewClover",2],["chickFeed",1]],"in":[],"gives":1},"packedRation":{"needs":[["mistVetch",1],["ghostReed",1],["sheepFeed",1]],"in":[],"gives":1}}$j$::jsonb, updated_at = now() where key = 'makes';
update public.town_catalog set data = jsonb_set(data, '{uses}', coalesce(data->'uses', '{}'::jsonb) || $j${"thingBarnCat":{"n":1,"per":"day"},"thingCradle":{"n":1,"per":"day"},"thingTwinCradle":{"n":1,"per":"day"},"thingHarp":{"n":1,"per":"day"},"thingSpringWind":{"n":1,"per":"day"},"thingHayWagon":{"n":1,"per":"day"}}$j$::jsonb), updated_at = now() where key = 'gifts';
update public.town_catalog set data = jsonb_set(data, '{gifts}', coalesce(data->'gifts', '{}'::jsonb) || $j${"charmHerdBell":{"kind":"charm","line":"animals","rank":1,"by":1},"thingBarnCat":{"kind":"thing","line":"animals","rank":2,"by":1},"thingWarmBottle":{"kind":"thing","line":"animals","rank":3,"by":1},"charmStarCollar":{"kind":"charm","line":"animals","rank":4,"by":1},"thingCradle":{"kind":"thing","line":"animals","rank":5,"by":1},"famCloudRam":{"kind":"familiar","line":"animals","rank":6,"by":1.5},"thingTwinCradle":{"kind":"thing","line":"animals","rank":7,"by":1},"thingHarp":{"kind":"thing","line":"animals","rank":8,"by":1},"thingSpringWind":{"kind":"thing","line":"animals","rank":9,"by":1},"thingHayWagon":{"kind":"thing","line":"animals","rank":10,"by":1}}$j$::jsonb), updated_at = now() where key = 'gifts';
update public.town_catalog set data = jsonb_set(data, '{ids}', (data->'ids') || '["animals"]'::jsonb), updated_at = now() where key = 'work' and not (data->'ids') ? 'animals';
update public.town_catalog set data = jsonb_set(data, '{marks,animals}', $j$[50,150,350,700,1300,2200,3600,5500,8000,12000]$j$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(data, '{day,animals}', $j$150$j$::jsonb), updated_at = now() where key = 'work';
update public.town_catalog set data = jsonb_set(jsonb_set(jsonb_set(data,
    '{recipes}', (data->'recipes') || (select coalesce(jsonb_agg(r), '[]'::jsonb) from jsonb_array_elements_text($j$["custard","pancakes","cheesecake","butterCookies","quiche","lanternCustard","cloudSouffle","goldenOmelette","emberBakedEggs","rainBroth","moonPudding","paperFish","leviathanEggCup","strawberryShake","hotCocoa","flowerLatte","starPudding","cream","butter","farmCheese","yarn","woolScarf","rainbowScarf","starScarf","goldenScarf","prism","dewGrow","packedRation"]$j$::jsonb) r where not (data->'recipes') ? r)),
    '{needs}', (data->'needs') || $j${"custard":{"egg":2,"milk":1,"sugar":1},"pancakes":{"butter":1,"egg":1,"flour":1,"milk":1},"cheesecake":{"cream":1,"egg":1,"farmCheese":1,"sugar":1},"butterCookies":{"butter":1,"flour":2,"sugar":1},"quiche":{"cream":1,"egg":2,"farmCheese":1,"flour":1},"lanternCustard":{"lanternEgg":2,"milk":1,"sugar":1},"cloudSouffle":{"butter":1,"cloudEgg":2,"sugar":1},"goldenOmelette":{"butter":1,"goldenEgg":2,"salt":1},"emberBakedEggs":{"butter":1,"emberEgg":1,"tomato":2},"rainBroth":{"rainEgg":1,"salt":1,"watercress":2},"moonPudding":{"cream":1,"moonEgg":1,"sugar":1},"paperFish":{"paperEgg":1,"perch":1,"salt":1},"leviathanEggCup":{"leviathanEgg":1,"prawn":2,"salt":1},"strawberryShake":{"strawberryMilk":2,"sugar":1},"hotCocoa":{"cocoaMilk":2,"sugar":1},"flowerLatte":{"flowerMilk":2,"sugar":1},"starPudding":{"cream":1,"starMilk":2,"sugar":1},"cream":{"milk":2},"butter":{"cream":2},"farmCheese":{"milk":3,"salt":1},"yarn":{"wool":2},"woolScarf":{"yarn":2},"rainbowScarf":{"rainbowWool":2,"yarn":1},"starScarf":{"starWool":2,"yarn":1},"goldenScarf":{"goldenWool":2,"yarn":1},"prism":{"crystalLens":1,"quartzCore":1},"dewGrow":{"chickFeed":1,"dewClover":2},"packedRation":{"ghostReed":1,"mistVetch":1,"sheepFeed":1}}$j$::jsonb),
    '{cookware}', (data->'cookware') || (select coalesce(jsonb_agg(w), '[]'::jsonb) from jsonb_array_elements_text($j$["churn","cheesePress","spindle","knittingNeedles"]$j$::jsonb) w where not (data->'cookware') ? w)),
  updated_at = now() where key = 'cooking';
-- (the farm's shape: each entry that is the farm as it was, [128,0,60,86], made the farm as it is now; an entry is matched whole, never by `@>`)
update public.town_catalog set data = jsonb_set(data, '{map,farm}', $j$[128,-32,60,118]$j$::jsonb), updated_at = now() where key = 'cooking' and data->'map'->'farm' = $j$[128,0,60,86]$j$::jsonb;
update public.town_catalog set data = jsonb_set(data, '{maps}', (select jsonb_agg(case when m = $j$[128,0,60,86]$j$::jsonb then $j$[128,-32,60,118]$j$::jsonb else m end order by o) from jsonb_array_elements(data->'maps') with ordinality x(m, o))), updated_at = now() where key = 'ground';
update public.town_catalog set data = jsonb_set(data, '{nectar,maps}', (select jsonb_agg(case when m = $j$["farm",128,0,60,86]$j$::jsonb then $j$["farm",128,-32,60,118]$j$::jsonb else m end order by o) from jsonb_array_elements(data->'nectar'->'maps') with ordinality x(m, o))), updated_at = now() where key = 'insects';


-- ── 8. Each as it is meant to be, or nothing of this stays ──────────────────────────────────────────────────────────────
do $$ begin
  if town.cat('animals') is null or town.cat('animals')->'species'->'cow' is null then raise exception 'v291: the catalog has no animals'; end if;
  if town.made_of('[["farmEgg", 2], ["oil", 1]]'::jsonb) is distinct from 'omelette' then raise exception 'v291: a farm egg is no egg in the kitchen'; end if;
  if town.grade_pays('farmEgg', 3) <> 2.5 or not town.carries_grade('farmMilk') then raise exception 'v291: the grade of what an animal gives'; end if;
  if town.reward_relay_place('[150,-32]'::jsonb) is distinct from 'farm' then raise exception 'v291: the farm''s new rows'; end if;
  if not (town.cat('work')->'ids' ? 'animals') then raise exception 'v291: the line is not in work'; end if;
end $$;
commit;
notify pgrst, 'reload schema';

-- After it has run, in the SQL editor (each answers as said):
--   select to_regprocedure('public.town_animals(jsonb,text)') is not null;                           -- true
--   select town.made_of('[["blueEgg", 1], ["duckEgg", 1], ["oil", 1]]'::jsonb);                      -- omelette
--   select data->'species'->'cow'->>'price' from public.town_catalog where key = 'animals';           -- 4000
--   select town.reward_relay_place('[150,-32]'::jsonb), town.reward_relay_place('[150,-33]'::jsonb);   -- farm, null
