-- v110 — a seed in the ground
--
-- Run this once in the Supabase SQL editor, after v109. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. It is the fifth of the migrations Cash
-- Town's game waits for, built as v106 says: the rules of lib/town/farm.ts
-- written again in SQL in the schema `town` and held to the code's answers
-- case by case (sixteen thousand of them), and three functions in `public`
-- for the browser.
--
-- What it keeps: every plot of the farm that is no longer weeds (cleared,
-- tilled, and the plant in it: who sowed it, what, when, what has been done
-- to it), whose each bed is, and how much water the well holds.
--
-- What the database decides, and what it believes ("DB ตามที่คุณเสนอ ทุกอย่าง"):
--
--   · It decides whose a bed is. A bed belongs to whoever sows in it first,
--     the whole bed ("เพื่อไม่ให้ แย่งแปลงปลูกผักกัน ใครเริ่ม หว่านเมล้ดคนแรก แปลงจะเป็นของ
--     คนนั้นทั้งแปลง"), two beds a person at most, and is free again after a day
--     with nothing growing or four days untended. Two members sowing in the
--     same free bed at the same moment are taken one after the other, so
--     only the first owns it.
--   · It decides how a plant grows: sown at this clock's moment, through its
--     five stages by this clock, faster for water (once an hour a plot; more
--     from a better can, and from somebody a meal left with green fingers)
--     and for fertiliser. Nothing a browser sends says when a seed went in.
--   · It decides the pests. Whether one has struck is not kept but worked
--     out, from the plot and the hours gone by, the same for everybody who
--     asks; one left six hours kills the plant.
--   · It decides what a picking gives, whether it fits in the bag, what every
--     deed costs in stamina, and what is in the well: a bucket drawn at the
--     river, poured in, a can filled from it ("ต้องมีคนขนน้ำมาจากแม่น้ำมาใส่บ่อตรงกลาง
--     แมพแปลงผัก").
--   · It believes the browser about where the member stands: the tile is the
--     town's room's to know, which is never stored. The tile has to be a
--     plot, or beside the well, or one of the river's banks.
--   · It believes the browser about the hoe. Clearing and tilling are a game
--     of timing played in the page; each miss costs a little more stamina,
--     and the count of them is the browser's. What bounds a lie: the deed
--     costs its stamina whatever is said, a miss can only cost more, and no
--     more than thirty are counted. Every go is written down in `town_plays`
--     with what the browser said of it.
--
-- A member's name on a bed is their character's, read from their profile
-- when the farm is asked for: no browser says what a bed is called.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v110> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('crops', $town${
    "kangkong": {"seed":"seedKangkong","hours":6,"yield":[2,3],"again":12,"picks":3},
    "scallion": {"seed":"seedScallion","hours":8,"yield":[2,3],"again":12,"picks":3},
    "cabbage": {"seed":"seedCabbage","hours":24,"yield":[1,1],"again":null,"picks":1},
    "carrot": {"seed":"seedCarrot","hours":24,"yield":[2,3],"again":null,"picks":1},
    "daikon": {"seed":"seedDaikon","hours":36,"yield":[1,2],"again":null,"picks":1},
    "corn": {"seed":"seedCorn","hours":48,"yield":[2,3],"again":null,"picks":1},
    "chili": {"seed":"seedChili","hours":48,"yield":[3,5],"again":24,"picks":4},
    "tomato": {"seed":"seedTomato","hours":72,"yield":[3,4],"again":36,"picks":3},
    "basil": {"seed":"seedBasil","hours":36,"yield":[3,4],"again":24,"picks":4},
    "sweetPotato": {"seed":"seedSweetPotato","hours":72,"yield":[2,4],"again":null,"picks":1},
    "garlic": {"seed":"seedGarlic","hours":60,"yield":[2,3],"again":null,"picks":1},
    "pumpkin": {"seed":"seedPumpkin","hours":144,"yield":[1,1],"again":null,"picks":1},
    "eggplant": {"seed":"seedEggplant","hours":60,"yield":[2,3],"again":30,"picks":3},
    "cucumber": {"seed":"seedCucumber","hours":40,"yield":[2,4],"again":20,"picks":3},
    "longBean": {"seed":"seedLongBean","hours":48,"yield":[3,5],"again":24,"picks":4},
    "lemongrass": {"seed":"seedLemongrass","hours":72,"yield":[2,3],"again":36,"picks":5},
    "galangal": {"seed":"seedGalangal","hours":96,"yield":[1,2],"again":null,"picks":1},
    "lime": {"seed":"seedLime","hours":168,"yield":[3,5],"again":48,"picks":8},
    "papaya": {"seed":"seedPapaya","hours":144,"yield":[1,2],"again":48,"picks":5},
    "mango": {"seed":"seedMango","hours":240,"yield":[2,3],"again":48,"picks":8},
    "banana": {"seed":"seedBanana","hours":192,"yield":[3,4],"again":48,"picks":4},
    "coconut": {"seed":"seedCoconut","hours":288,"yield":[1,2],"again":48,"picks":10},
    "ginger": {"seed":"seedGinger","hours":120,"yield":[1,2],"again":null,"picks":1},
    "turmeric": {"seed":"seedTurmeric","hours":120,"yield":[1,2],"again":null,"picks":1},
    "taro": {"seed":"seedTaro","hours":168,"yield":[1,2],"again":null,"picks":1},
    "watermelon": {"seed":"seedWatermelon","hours":144,"yield":[1,1],"again":null,"picks":1}
  }$town$::jsonb),
  ('farming', $town${
    "costs": {"clear":4,"till":4,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6},
    "swings": {"clear":3,"till":3},
    "pulled": "compost",
    "stages": [0,0.1,0.3,0.6,1],
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
    "seeds": {"seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v110>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A plot that is no longer weeds. Its plant is lib/town/farm.ts's Plant; a
-- plot with no row is weeds. `changed` is the moment it last changed, in the
-- milliseconds the code counts in, for a page that asks only for what is new.
create table if not exists public.town_plots (
  x       smallint not null,
  y       smallint not null,
  bed     smallint not null,
  soil    text not null check (soil in ('wild', 'cleared', 'tilled')),
  plant   jsonb,
  changed bigint not null,
  primary key (x, y)
);

create index if not exists town_plots_bed on public.town_plots (bed) where plant is not null;
create index if not exists town_plots_changed on public.town_plots (changed);

alter table public.town_plots enable row level security;
revoke all on public.town_plots from anon, authenticated;

-- Whose a bed is: who sowed in it first, when they last tended it, and since
-- when nothing has grown in it (0 while something does). A bed with no row
-- is nobody's.
create table if not exists public.town_beds (
  bed       smallint primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  tended    bigint not null,
  empty     bigint not null default 0
);

create index if not exists town_beds_member on public.town_beds (member_id);

alter table public.town_beds enable row level security;
revoke all on public.town_beds from anon, authenticated;

-- The well: how many buckets of water it holds.
insert into public.town_things (key, doc) values ('well', '0'::jsonb)
  on conflict (key) do nothing;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- toolOf(): what a thing does in the hand at the farm.
create or replace function town.tool_of(p_hand text)
returns text language sql stable
as $$ select town.cat('farming')->'tools'->>p_hand $$;

-- lib/town/trade.ts's handOf(): the thing held, while there is still one of
-- it in the bag.
create or replace function town.hand_of(p_purse jsonb)
returns text language sql immutable
as $$ select case when town.held(p_purse->'bag', p_purse->>'hand') > 0 then p_purse->>'hand' end $$;

-- lib/town/world.ts's bedOf(): which of the farm's beds a tile is in; −1 for
-- a tile that is no plot.
create or replace function town.bed_of(p_x integer, p_y integer)
returns integer language sql stable
as $$
  select coalesce((
    select (b.ord - 1)::integer
      from (select town.cat('farming') as f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord)
     where p_x >= (b.at->>0)::int and p_x < (b.at->>0)::int + (c.f->>'side')::int
       and p_y >= (b.at->>1)::int and p_y < (b.at->>1)::int + (c.f->>'side')::int
     limit 1), -1)
$$;

-- lib/town/items.ts's growth(): where a plant is, so many hours after it was
-- sown, having been picked so many times, the last so many hours ago.
create or replace function town.growth(p_crop text, p_hours double precision, p_picked integer, p_since double precision)
returns jsonb language plpgsql stable
as $$
declare
  c jsonb := town.cat('crops')->p_crop;
  st jsonb := town.cat('farming')->'stages';
  part double precision;
begin
  if p_picked >= (c->>'picks')::int then return '{"stage": 5, "ripe": false, "spent": true}'::jsonb; end if;
  if p_picked > 0 then
    if c->>'again' is not null and p_since >= (c->>'again')::double precision then return '{"stage": 5, "ripe": true, "spent": false}'::jsonb; end if;
    return '{"stage": 4, "ripe": false, "spent": false}'::jsonb;
  end if;
  if p_hours >= (c->>'hours')::double precision then return '{"stage": 5, "ripe": true, "spent": false}'::jsonb; end if;
  part := greatest(0::double precision, p_hours) / (c->>'hours')::double precision;
  return jsonb_build_object('ripe', false, 'spent', false, 'stage',
    case when part < (st->>1)::double precision then 1 when part < (st->>2)::double precision then 2 when part < (st->>3)::double precision then 3 else 4 end);
end;
$$;

-- grown(): the hours a plant has grown by a moment: the clock's, faster once
-- it is fed, and what watering added.
create or replace function town.grown(p_plant jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p
$$;

-- Where a plant is in its growing at a moment, pests left out.
create or replace function town.growing(p_plant jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select town.growth(p_plant->>'crop', town.grown(p_plant, p_now), (p_plant->>'picked')::int,
    (p_now - (p_plant->>'pickedAt')::bigint)::double precision / 3600000::double precision)
$$;

-- pestAt(): when a pest struck a plant, if one has and it has not been cured
-- since: the first of the day's pest hours, since it was sown, cured or last
-- picked, in which the roll for that plot and that hour came up, the plant
-- being unripe and not covered. Null when none has. (Whether it is ripe at
-- an hour is growing()'s answer, worked out here from the plant's own
-- numbers so that the catalog is read once and not once an hour.)
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
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
begin
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks then false
        when picked > 0 then again is not null and (t - picked_at)::double precision / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      if town.roll(p_key, h, sown) < chance then return t; end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$$;

-- see(): what a plot shows at a moment: its plant's stage, whether it is
-- ripe, has a pest on it, is dead, or was watered this hour.
create or replace function town.see(p_key text, p_plot jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  dead := struck is not null and p_now - struck > kills;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then struck + kills else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000);
end;
$$;

-- ownerOf(): whose a bed is at a moment, there being plants in it or not:
-- nobody's when it was never sown, or has lapsed.
create or replace function town.owner_of(p_bed jsonb, p_planted boolean, p_now bigint)
returns text language sql stable
as $$
  select case
    when p_bed is null or p_bed = 'null'::jsonb then null
    when p_planted and p_now - (p_bed->>'tended')::bigint > (b.k->>'untended')::bigint * 3600000 then null
    when not p_planted and p_now - (case when (p_bed->>'empty')::bigint <> 0 then (p_bed->>'empty')::bigint else (p_bed->>'tended')::bigint end)
      > (b.k->>'empty')::bigint * 3600000 then null
    else p_bed->>'by' end
    from (select town.cat('farming')->'beds' as k) b
$$;

-- hoe(): clear a plot of weeds, or till cleared ground, or pull up a dead
-- plant (which leaves compost, if there is room for it).
create or replace function town.hoe(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  left_ text := f->>'pulled';
  room boolean;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'hoe' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean then
    room := town.room(p_purse->'bag', left_) > 0;
    return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb,
      'purse', town.spend(p_purse, (f->'costs'->>'pull')::double precision, p_now)
        || jsonb_build_object('bag', case when room then town.put(p_purse->'bag', left_, 1) else p_purse->'bag' end),
      'got', case when room then jsonb_build_array(jsonb_build_array(left_, 1)) else '[]'::jsonb end);
  end if;
  if coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  if p_plot->>'soil' = 'wild' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'clear')::double precision, p_now));
  end if;
  if p_plot->>'soil' = 'cleared' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "tilled", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'till')::double precision, p_now));
  end if;
  return town.no('soil');
end;
$$;

-- sow(): the seed in the hand into a tilled plot: one seed, one plot.
create or replace function town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  crop text := f->'seeds'->>p_hand;
begin
  if crop is null or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p_plot->>'soil' <> 'tilled' or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  return jsonb_build_object('ok', true,
    'plot', jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', p_me, 'crop', crop, 'sown', p_now,
      'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)),
    'purse', town.spend(p_purse, (f->'costs'->>'sow')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;

-- water(): a growing plant, anybody's, with a can that has water in it: once
-- an hour for each plot. A better can adds more, and so does a meal that
-- left green fingers.
create or replace function town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  slot integer;
  can jsonb;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'can' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean or ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null)
     or (town.growing(p, p_now)->>'spent')::boolean then return town.no('soil'); end if;
  if (seen->>'wet')::boolean then return town.no('wet'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = p_hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('dry'); end if;
  can := p_purse->'bag'->slot;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision
        + ((f->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f->'field'->>p_hand)::double precision, 1::double precision)
          * (case when town.buff_of(p_purse, p_now) = 'green' then 1::double precision + (town.cat('stamina')->'buffs'->>'green')::double precision
                  else 1::double precision end))),
    'purse', town.spend(p_purse, (f->'costs'->>'water')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text], can || jsonb_build_object('water', (can->>'water')::numeric - 1))));
end;
$$;

-- feed(): the fertiliser in the hand onto a growing plant: one makes it grow
-- faster from now on, the other keeps pests off it for a day.
create or replace function town.feed(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if kind not in ('feed', 'guard') or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean
     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || case when kind = 'feed' then jsonb_build_object('fed', p_now)
      else jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000) end),
    'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;

-- cure(): rid a plant, anybody's, of its pest.
create or replace function town.cure(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if coalesce(town.tool_of(p_hand), '') <> 'cure' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb or not (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
  return jsonb_build_object('ok', true, 'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)),
    'purse', town.spend(p_purse, (f->'costs'->>'cure')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;

-- yieldOf(): how many a picking gives: between the vegetable's least and
-- most, the same for everybody who asks about that picking; one more with
-- the right blade (shears for a tree, a sickle for the rest).
create or replace function town.yield_of(p_key text, p_plant jsonb, p_hand text)
returns integer language sql stable
as $$
  select ((c.crop->'yield'->>0)::int
    + floor(town.roll(p_key, (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint)
        * ((c.crop->'yield'->>1)::int - (c.crop->'yield'->>0)::int + 1)::double precision)::int
    + case when p_hand is not null
            and p_hand = c.f->'blades'->>(case when (c.crop->>'picks')::int >= (c.f->>'tree')::int then 'tree' else 'plant' end) then 1 else 0 end)::integer
    from (select town.cat('crops')->(p_plant->>'crop') as crop, town.cat('farming') as f) c
$$;

-- pick(): a ripe plant into the bag (which must have the room), by somebody
-- who may. One that bears again goes back a stage; another leaves the plot
-- cleared.
create or replace function town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
begin
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)) end,
    'purse', town.spend(p_purse, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', p->>'crop', n)));
end;
$$;

-- deedFor(): what the thing in the hand can do to a plot now, if anything.
-- In somebody else's bed only the helping deeds: watering, feeding, curing.
create or replace function town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
returns text language plpgsql stable
as $$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if kind = 'hoe' then
    return case when not mine then null when dead then 'pull' when p <> 'null'::jsonb then null
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$$;

-- tend(): do to a plot what the thing in the hand does, with the bed's
-- keeping. `p_others` is how many other plots of the bed have a plant, and
-- `p_holds` how many other beds are this member's now. Whoever sows first
-- in a free bed owns it (unless they hold as many as one may); its owner's
-- every deed there counts as tending it; when its last plant goes, the day
-- it may stand empty begins. A bed that has lapsed is nobody's: no `bed` is
-- given back, and its keeping is dropped.
create or replace function town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
begin
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till', 'pull') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  return jsonb_build_object('ok', true, 'deed', deed, 'purse', did->'purse', 'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end;
end;
$$;

-- choreFor(): what the thing in the hand can do with water where one
-- stands: draw a bucket at the river, pour it into the well, fill a can at
-- the well.
create or replace function town.chore_for(p_purse jsonb, p_where text, p_well integer)
returns text language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
begin
  if hand is null then return null; end if;
  if f->'buckets' ? hand then
    if p_where = 'river' and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) = 0) then return 'draw'; end if;
    if p_where = 'well' and p_well < (f->>'well')::int
       and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) <> 0) then return 'pour'; end if;
  end if;
  if p_where = 'well' and f->'cans' ? hand
     and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric) then return 'fill'; end if;
  return null;
end;
$$;

-- chore(): do that chore. Gives the purse and the well as they are
-- afterwards.
create or replace function town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  what text := town.chore_for(p_purse, p_where, p_well);
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  has integer;
  pours integer;
begin
  if what is null or hand is null then return town.no('none'); end if;
  if what = 'draw' then
    select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well,
      'purse', town.spend(p_purse, (f->'chores'->>'draw')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', f->'buckets'->hand))));
  end if;
  if what = 'pour' then
    -- as much of it as the well has room for; the rest stays in the bucket
    select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) <> 0 order by x.ord limit 1;
    pours := least(has, (f->>'well')::int - p_well);
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well + pours,
      'purse', town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text],
             case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
  end if;
  -- a can takes one bucket of the well's water, however much was left in it
  if p_well < 1 then return town.no('dry'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric order by x.ord limit 1;
  return jsonb_build_object('ok', true, 'chore', what, 'well', p_well - 1,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', f->'cans'->hand))));
end;
$$;

/* ── keeping the farm ────────────────────────────────────────────────────── */

-- A bed as a page is told of it: whose it is, by their character's name.
create or replace function town.bed_told(p_bed integer)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty,
           'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, ''))
    from public.town_beds b join public.profiles pr on pr.id = b.member_id
   where b.bed = p_bed
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The farm as everybody sees it: every plot that is no longer weeds (soil
-- and plant, as the code's Plot, from which the page works out the stage,
-- the pest and the rest itself), whose each bed is, and the well. With
-- `p_since` (the `now` of an earlier answer), only the plots that changed
-- since then, less a little: a deed that was being done as the earlier
-- answer was read is told again, never missed.
create or replace function public.town_farm(p_since bigint default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  since bigint := greatest(coalesce(p_since, 0), 0) - 10000;
begin
  return jsonb_build_object(
    'now', town.now_ms(),
    'well', town.thing('well', false),
    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                from public.town_plots p where p.changed > since),
    'beds', (select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b));
end;
$$;

-- Do to a plot what the thing in my hand does: clear it, till it, pull up
-- what died, sow it, water it, feed it, cure it, pick it. `p_timing` is the
-- browser's own account of the hoe's game (hits, misses, seconds), kept
-- with the play; its misses, within bounds, cost a little more stamina.
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_);
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  end if;
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses);
end;
$$;

-- Carry water where I stand: with a bucket in the hand, draw it at the river
-- or pour it into the well; with a can, fill it at the well. The tile is
-- the browser's word for where I am: beside the well, or on one of the
-- river's banks.
create or replace function public.town_chore(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  at_ text := case
    when greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) = 1 then 'well'
    when town.cat('fishing')->'places' ? (p_x::text || ',' || p_y::text) then 'river' end;
  well integer;
  did jsonb;
begin
  if at_ is null then return town.answer(me, town.no('none')); end if;
  -- (the well is held only by somebody at it: drawing at the river does not touch it)
  well := (town.thing('well', at_ = 'well') #>> '{}')::int;
  did := town.chore(purse, at_, well, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['town_farm(bigint)', 'town_tend(integer, integer, jsonb)', 'town_chore(integer, integer)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, (select count(*) from jsonb_object_keys(data)) as n
--     from public.town_catalog where key in ('crops', 'farming') order by key;
--   -- crops   | 26
--   -- farming | 22
--
--   select doc from public.town_things where key = 'well';
--   -- 0
--
--   select c.relname, c.relrowsecurity from pg_class c
--    where c.oid in ('public.town_plots'::regclass, 'public.town_beds'::regclass) order by 1;
--   -- town_beds  | true
--   -- town_plots | true
--
--   select count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and table_name in ('town_plots', 'town_beds') and grantee in ('anon', 'authenticated');
--   -- 0
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname in ('town_farm', 'town_tend', 'town_chore');
--   -- 0 | 3
--
--   select town.bed_of(132, 4) as first, town.bed_of(183, 39) as last, town.bed_of(156, 23) as the_well;
--   -- 0 | 23 | -1
--
--   select town.growth('kangkong', 6, 0, 0)->>'ripe' as ripe_at_six_hours, town.growth('kangkong', 5.9, 0, 0)->>'stage' as stage_just_before;
--   -- true | 4
