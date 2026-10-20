-- ── 1. What is kept: the animals, each member's herd (their barn), the pasture's shared things, answers kept for a retry ─
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
-- (one barn of the 24 a member, and no barn two members': the owner's word, "เลือกซ้ำกับเพื่อนไม่ได้")
create unique index if not exists town_herds_barn on public.town_herds ((h->>'barn'));
create table if not exists public.town_pasture (
  one boolean primary key default true check (one),
  found jsonb not null default '{}'::jsonb,
  spells jsonb not null default '[]'::jsonb,
  wagons jsonb not null default '[]'::jsonb,
  -- offers to hand an animal on, and hosts' asks for a friend's animal for a cross (each stands a day)
  offers jsonb not null default '[]'::jsonb,
  asks jsonb not null default '[]'::jsonb,
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
-- The next moment a band begins after a moment (nextBandEdge): an outing's stretch ends there, so each band it was out in counts.
create or replace function town.animal_next_band_edge(p_t double precision)
returns double precision language sql immutable set search_path = '' as $$
  select coalesce((select x.m + e * 3600000 from unnest(array[3, 5, 7, 11, 13, 16, 19, 23]) e where x.m + e * 3600000 > x.l order by e limit 1),
      x.m + 86400000 + 3 * 3600000) - 25200000
    from (select p_t + 25200000 as l, floor((p_t + 25200000) / 86400000) * 86400000 as m) x
$$;
-- Whether a barn's door stood open at a moment, and the next moment after it that it opened or closed (gateAt).
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
-- (JavaScript's Math.round: halves up, as `round` on double precision is not)
create or replace function town.js_round(p double precision)
returns integer language sql immutable set search_path = '' as $$ select floor(p + 0.5)::integer $$;
-- A stat as kept, made sound (statOf: one left out is the plainest), and how far it stands above the plainest (liftOf).
create or replace function town.animal_stat(p_a jsonb, p_key text, p_k jsonb)
returns integer language sql immutable set search_path = '' as $$
  select greatest((p_k->'knobs'->'stats'->>'min')::integer, least((p_k->'knobs'->'stats'->>'max')::integer,
    coalesce(town.js_round(case when jsonb_typeof(p_a->'stats'->p_key) = 'number' then (p_a->'stats'->>p_key)::double precision end), (p_k->'knobs'->'stats'->>'min')::integer)))
$$;
create or replace function town.animal_lift(p_a jsonb, p_key text, p_k jsonb)
returns integer language sql immutable set search_path = '' as $$
  select town.animal_stat(p_a, p_key, p_k) - (p_k->'knobs'->'stats'->>'min')::integer
$$;
-- Whether it gives anything to collect (gives): a female, or a sheep of either sex.
create or replace function town.animal_gives(p_a jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_a->>'sex', 'f') <> 'm' or p_a->>'species' = 'sheep'
$$;
-- Its hearts after a pet, a treat or the barn cat's pet: more of its gentleness, to a hundredth (heartsPlus).
create or replace function town.animal_hearts_plus(p_a jsonb, p_base double precision, p_k jsonb)
returns double precision language sql immutable set search_path = '' as $$
  select least((p_k->'knobs'->>'hearts')::double precision * (p_k->'knobs'->>'perHeart')::double precision,
    town.js_round(((p_a->>'hearts')::double precision
      + town.js_round(p_base * (1 + town.animal_lift(p_a, 'gentle', p_k) * (p_k->'knobs'->'stats'->>'gentle')::double precision) * 100)::double precision / 100) * 100)::double precision / 100)
$$;
-- Its growth speed at a moment (speedAt): +1 a speed-up feed, +1 the warm bottle, its vigour; x3 in spring wind's hour; the cap.
create or replace function town.animal_speed(p_a jsonb, p_t double precision, p_bottle boolean, p_k jsonb)
returns double precision language sql immutable set search_path = '' as $$
  select case when p_t < coalesce((p_a->>'windUntil')::double precision, 0) then (p_k->'knobs'->>'speedCap')::double precision
    else least((p_k->'knobs'->>'speedCap')::double precision, (1 + case when p_t < coalesce((p_a->>'speedUntil')::double precision, 0) then 1 else 0 end
      + case when p_bottle then 1 else 0 end)::double precision + town.animal_lift(p_a, 'vigor', p_k) * (p_k->'knobs'->'stats'->>'vigor')::double precision) end
$$;
-- An animal brought from `at` to a later moment (settle): food eaten (half as fast while its barn's door is open: it is
-- out; less of its thrift), growth and production on fed hours only (production a female's, or a sheep's), rounds
-- banked (a full bank pauses), the hearts and the days fed through that passing days earned. In Uncle Popoto's pen it
-- is frozen. Times are milliseconds as double precision, as the page's numbers are.
create or replace function town.animal_settle(p_a jsonb, p_now double precision, p_door jsonb, p_bottle boolean, p_k jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  kn jsonb := p_k->'knobs';
  sp jsonb := p_k->'species'->(p_a->>'species');
  adult_ double precision := (sp->'grow'->>0)::double precision + (sp->'grow'->>1)::double precision;
  cycle_ double precision := (sp->>'cycle')::double precision;
  bank_ integer := (sp->>'bank')::integer;
  rate_out double precision := (kn->>'outRate')::double precision;
  thrift_ double precision := town.animal_lift(p_a, 'thrift', p_k) * (kn->'stats'->>'thrift')::double precision;
  gives_ boolean := town.animal_gives(p_a);
  most double precision := (kn->>'hearts')::double precision * (kn->>'perHeart')::double precision;
  h_fed integer := (kn->'heart'->>'fed')::integer;
  h_out integer := (kn->'heart'->>'out')::integer;
  cap_streak integer := (kn->>'streakCap')::integer;
  t double precision := greatest((p_a->>'at')::double precision, (p_a->>'born')::double precision);
  food double precision := (p_a->>'food')::double precision;
  grown double precision := (p_a->>'grown')::double precision;
  made double precision := (p_a->>'made')::double precision;
  banked integer := (p_a->>'banked')::integer;
  hearts double precision := (p_a->>'hearts')::double precision;
  streak integer := coalesce((p_a->>'streak')::integer, 0);
  bands integer := coalesce((p_a->>'outBands')::integer, 0);
  today jsonb := coalesce(p_a->'today', '{}'::jsonb);
  speed_until double precision := coalesce((p_a->>'speedUntil')::double precision, 0);
  wind_until double precision := coalesce((p_a->>'windUntil')::double precision, 0);
  g jsonb; out_ boolean; day_end double precision; nxt double precision; rate double precision; runs double precision;
  end_ double precision; h double precision; v double precision; need double precision; guard integer := 0;
begin
  if p_now <= t or coalesce(p_a->>'home', 'barn') = 'pen' then return p_a || jsonb_build_object('at', greatest((p_a->>'at')::double precision, p_now)); end if;
  if (today->>'day')::integer is distinct from town.day_of(floor(t)::bigint) then today := jsonb_build_object('day', town.day_of(floor(t)::bigint)); end if;
  while t < p_now and guard < 10000 loop
    guard := guard + 1;
    g := town.animal_gate_at(p_door, t);
    out_ := (g->>'open')::boolean;
    day_end := town.animal_day_start(town.day_of(floor(t)::bigint) + 1);
    nxt := least(p_now, coalesce((g->>'next')::double precision, 'Infinity'::double precision), day_end);
    if t < speed_until then nxt := least(nxt, speed_until); end if;
    if t < wind_until then nxt := least(nxt, wind_until); end if;
    if out_ then nxt := least(nxt, town.animal_next_band_edge(t)); end if;
    rate := (case when out_ then rate_out else 1 end) * (1 - thrift_);
    if food > 1e-9 then
      runs := t + (food / rate) * 3600000;
      end_ := least(nxt, runs);
      h := (end_ - t) / 3600000;
      food := greatest(0, food - h * rate);
      if grown < adult_ then
        v := town.animal_speed(jsonb_build_object('speedUntil', speed_until, 'windUntil', wind_until, 'stats', p_a->'stats'), t, p_bottle, p_k);
        need := (adult_ - grown) / v;
        if h < need then grown := grown + h * v; h := 0; else grown := adult_; h := h - need; end if;
      end if;
      if h > 0 and gives_ and banked < bank_ then
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
      -- (the day it closes: fed throughout, a heart's worth and a day more of its streak; hungry, the streak begins again)
      if not coalesce((today->>'hungry')::boolean, false) and not coalesce((today->>'fed')::boolean, false) then hearts := least(most, hearts + h_fed); end if;
      streak := case when coalesce((today->>'hungry')::boolean, false) then 0 else least(cap_streak, streak + 1) end;
      today := jsonb_build_object('day', town.day_of(floor(t)::bigint));
    end if;
  end loop;
  return p_a || jsonb_build_object('at', p_now, 'food', food, 'grown', grown, 'made', made, 'banked', banked, 'hearts', hearts,
    'streak', streak, 'outBands', bands, 'today', today);
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
-- Whether a member's rank-3 warm bottle counts for their animals: had, and its moment written on their herd (it counts
-- from their first step after it is had, never backwards: public.town_animals writes it).
create or replace function town.animal_bottle(p_member uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select town.gifts_of(p.doc)->'had' ? (town.cat('animals')->'gifts'->>'bottle') from public.town_purses p where p.member_id = p_member), false)
     and exists (select 1 from public.town_herds h where h.owner = p_member and jsonb_typeof(h.h->'bottleAt') = 'number')
$$;
-- A member's herd, or a new one's (newHerd: no barn yet).
create or replace function town.animal_herd(p_member uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select h.h from public.town_herds h where h.owner = p_member),
    jsonb_build_object('owner', p_member::text, 'barn', null, 'room', (town.cat('animals')->'knobs'->'barns'->'stages'->0->>'room')::integer, 'door', '[]'::jsonb,
      'credit', 0, 'lastCare', 0, 'facade', 0, 'care', 'named', 'carers', '[]'::jsonb))
$$;
-- Where a new animal of a member's goes (freeHome): their barn while it has room, else the pen while it has room, else nowhere.
create or replace function town.animal_free_home(p_member uuid, p_herd jsonb, p_k jsonb)
returns text language sql stable set search_path = '' as $$
  select case when p_herd->>'barn' is not null and u.barn < (p_herd->>'room')::integer then 'barn'
    when u.pen < (p_k->'knobs'->>'pen')::integer then 'pen' end
    from (select count(*) filter (where coalesce(a.a->>'home', 'barn') <> 'pen')::integer as barn, count(*) filter (where a.a->>'home' = 'pen')::integer as pen
      from public.town_animals a where a.owner = p_member) u
$$;
-- A roll in [0, 1): the database's own, or the `i`th of rolls given (a test holding the rolls to the page's; past them, a half).
create or replace function town.animal_roll01(p_rolls jsonb, p_i integer)
returns double precision language sql volatile set search_path = '' as $$
  select case when p_rolls is null then random() else coalesce((p_rolls->>p_i)::double precision, 0.5) end
$$;
-- How well an animal has been cared for, 0 to 1 (careOf): its hearts (six parts) and its days fed through in a row (four).
create or replace function town.animal_care(p_a jsonb, p_k jsonb)
returns double precision language sql immutable set search_path = '' as $$
  select 0.6::double precision * least(1, (p_a->>'hearts')::double precision / ((p_k->'knobs'->>'hearts')::double precision * (p_k->'knobs'->>'perHeart')::double precision))
    + 0.4::double precision * least(1, coalesce((p_a->>'streak')::double precision, 0) / (p_k->'knobs'->'inherit'->>'streakFull')::double precision)
$$;
-- A bought animal's stats (boughtStats): each of thrift, gentleness and vigour a roll between the bought low and high.
create or replace function town.animal_bought_stats(p_k jsonb, p_rolls jsonb default null)
returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object('thrift', lo + floor(town.animal_roll01(p_rolls, 0) * (hi - lo + 1))::integer,
    'gentle', lo + floor(town.animal_roll01(p_rolls, 1) * (hi - lo + 1))::integer, 'vigor', lo + floor(town.animal_roll01(p_rolls, 2) * (hi - lo + 1))::integer)
    from (select (p_k->'knobs'->'stats'->'bought'->>0)::integer as lo, (p_k->'knobs'->'stats'->'bought'->>1)::integer as hi) x
$$;
-- A child's stats (childStats): each the parents' average (an odd sum rounded either way at random), then one roll by
-- the parents' care: up 2 at `spark` when it is `sparkFrom` or more, up 1 at upBase + upCare x care, down 1 at
-- downNeglect x (1 - care). Rolls taken in the page's order: per stat, an odd sum's roll, then the stat's.
create or replace function town.animal_child_stats(p_a jsonb, p_b jsonb, p_k jsonb, p_rolls jsonb default null)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  i jsonb := p_k->'knobs'->'inherit';
  care double precision := (town.animal_care(p_a, p_k) + town.animal_care(p_b, p_k)) / 2;
  two double precision := case when care >= (i->>'sparkFrom')::double precision then (i->>'spark')::double precision else 0 end;
  st text; s integer; v integer; r double precision; n integer := 0; out_ jsonb := '{}'::jsonb;
begin
  foreach st in array array['thrift', 'gentle', 'vigor'] loop
    s := town.animal_stat(p_a, st, p_k) + town.animal_stat(p_b, st, p_k);
    if s % 2 = 0 then v := s / 2;
    else v := case when town.animal_roll01(p_rolls, n) < 0.5 then floor(s / 2.0)::integer else ceil(s / 2.0)::integer end; n := n + 1;
    end if;
    r := town.animal_roll01(p_rolls, n); n := n + 1;
    if r < two then v := v + 2;
    elsif r < two + (i->>'upBase')::double precision + (i->>'upCare')::double precision * care then v := v + 1;
    elsif r > 1 - (i->>'downNeglect')::double precision * (1 - care) then v := v - 1;
    end if;
    out_ := out_ || jsonb_build_object(st, greatest((p_k->'knobs'->'stats'->>'min')::integer, least((p_k->'knobs'->'stats'->>'max')::integer, v)));
  end loop;
  return out_;
end $$;
-- A new animal (newAnimal): bought, bred or cradled, of its home, sex and stats.
create or replace function town.animal_new(p_id uuid, p_owner uuid, p_species text, p_breed text, p_born double precision, p_bought boolean, p_home text, p_sex text, p_stats jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p_id::text, 'owner', p_owner::text, 'species', p_species, 'breed', p_breed, 'name', '', 'born', p_born, 'bought', p_bought,
    'home', p_home, 'sex', p_sex, 'stats', p_stats, 'streak', 0,
    'at', p_born, 'food', 0, 'grown', 0, 'made', 0, 'banked', 0, 'hearts', 0, 'today', jsonb_build_object('day', town.day_of(floor(p_born)::bigint)),
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

-- A barn's next stage after the room it has (nextStage), or null; and the coins its stages cost up to it (stagesPaid).
create or replace function town.animal_next_stage(p_room integer, p_k jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select s from jsonb_array_elements(p_k->'knobs'->'barns'->'stages') with ordinality x(s, o) where (s->>'room')::integer > p_room order by o limit 1
$$;
create or replace function town.animal_stages_paid(p_room integer, p_k jsonb)
returns integer language sql immutable set search_path = '' as $$
  select coalesce(sum((s->>'coins')::integer), 0)::integer from jsonb_array_elements(p_k->'knobs'->'barns'->'stages') s where (s->>'room')::integer <= p_room
$$;
-- Whether an animal is lent now (a friend's ask said yes to, for its hour).
create or replace function town.animal_lent(p_a jsonb, p_now double precision)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(p_a->'lent') = 'object' and (p_a->'lent'->>'until')::double precision > p_now, false)
$$;
-- Offers or asks still standing (each stands a day), in their order.
create or replace function town.animal_live(p_list jsonb, p_now double precision, p_hours double precision)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(coalesce(p_list, '[]'::jsonb)) with ordinality e(x, o)
   where (x->>'at')::double precision > p_now - p_hours * 3600000
$$;

-- ── 3. What a page is told ───────────────────────────────────────────────────────────────────────────────────────────
-- Offers and asks still standing that name a member (each stands a day; nobody else is told of them).
create or replace function town.animal_mine(p_list jsonb, p_me uuid, p_now double precision, p_hours double precision)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(coalesce(p_list, '[]'::jsonb)) with ordinality e(x, o)
   where (x->>'at')::double precision > p_now - p_hours * 3600000 and (x->>'from' = p_me::text or x->>'to' = p_me::text)
$$;
-- A herd as others are told it: all but what a barn taken back left its owner; and whether its owner has the warm bottle.
create or replace function town.animal_herd_told(p_h jsonb, p_owner uuid, p_me uuid)
returns jsonb language sql stable set search_path = '' as $$
  select (case when p_owner = p_me then p_h else p_h - 'credit' end) || jsonb_build_object('bottle', town.animal_bottle(p_owner))
$$;
-- The whole pasture, on a look.
create or replace function town.animal_world(p_me uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'animals', coalesce((select jsonb_agg(a.a order by a.id) from public.town_animals a), '[]'::jsonb),
    'herds', coalesce((select jsonb_agg(town.animal_herd_told(h.h, h.owner, p_me)) from public.town_herds h), '[]'::jsonb),
    'found', p.found, 'spells', p.spells, 'wagons', p.wagons,
    'offers', town.animal_mine(p.offers, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'offerHours')::double precision),
    'asks', town.animal_mine(p.asks, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'askHours')::double precision), 'whole', true)
    from public.town_pasture p where p.one
$$;
