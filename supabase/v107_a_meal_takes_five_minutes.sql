-- v107 — a meal takes five minutes
--
-- Run this once in the Supabase SQL editor, after v106. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. It is the third of the migrations Cash
-- Town's game waits for, built as v106 says every one of them is: the rules
-- of lib/town/stamina.ts written again in SQL in the schema `town`, held to
-- the code's own answers case by case in its dry run, and a few functions in
-- `public` for the browser, which check who asks and keep what the rule gave.
--
-- What it keeps, all of it inside the purse v106 keeps (nothing new is
-- stored, so there is no new table): the gauge of stamina, full again at dawn
-- in Bangkok; the day's three meals, each eaten once, by the real clock ("ตาม
-- เวลาจริง"); the meal being eaten, which takes five minutes and gives its
-- stamina as it is eaten and its buff at the end ("อยากให้การทานข้าวใช้เวลาระดับนึง
-- ด้วย … อาจจะอยาก login เข้ามาเพื่อหาเพื่อนทานข้าว"); and the recipes read from
-- scrolls.
--
-- What the browser is believed about, and why that is enough. Two things are
-- not the database's to know: whether somebody is sitting down, and how many
-- are eating beside them. Both live in the town's room, which is broadcast
-- from browser to browser and never stored. So town_sit is told `seated` and
-- town_chew is told `company`, and they are believed, as the owner settled
-- for how a mini-game went ("DB ตามที่คุณเสนอ ทุกอย่าง"). What a lie buys is
-- bounded by the rule itself: company counts up to five and adds a tenth of a
-- dish's stamina each, so the most a made-up crowd is worth is half a dish
-- more, three times a day. Everything else is the clock's: which meal's
-- hours it is, that a meal's hours are eaten once, that five minutes have to
-- pass.
--
-- A meal left running. The browser's trial counted a meal on every second
-- while its page was open. Here nothing runs by itself, so a purse is
-- settled whenever it is read: a meal whose five minutes are up is finished
-- then, the part nobody counted taken as eaten alone, and its buff dated
-- from when the meal ended rather than from when somebody came back to look
-- (lib/town/stamina.ts's settle()). town.purse_of, v106's, is replaced by one
-- that does this; nothing else of v106 changes. (Counting a meal on reads the
-- purse as it was kept, town.purse_kept, since that finishes the meal itself
-- and with the company it was told of.)
--
-- Halves round the way the code rounds them. Stamina spent after a hearty
-- meal is seven tenths, rounded: the code's Math.round takes a half up, where
-- Postgres would take it to the even number, so the rule here says
-- floor(x + 0.5) and the dry run has cases that tell the two apart.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v107> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('stamina', $town${
    "max": 100,
    "minutes": 5,
    "together": 0.1,
    "company": 5,
    "meals": [5,11,17],
    "hours": 3,
    "buffs": {"calm":0.2,"keen":0.5,"lucky":0.5,"hearty":0.3,"green":0.5}
  }$town$::jsonb),
  ('dishes', $town${
    "riceBox": {"stamina":15,"buff":null,"recipe":null},
    "oddDish": {"stamina":6,"buff":null,"recipe":null},
    "friedMinnow": {"stamina":20,"buff":"keen","recipe":{"needs":[["minnow",3],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "grilledFish": {"stamina":25,"buff":"calm","recipe":{"needs":[["tilapia",1],["salt",2]],"in":["grill"],"serves":2,"cooks":1}},
    "grilledCorn": {"stamina":15,"buff":null,"recipe":{"needs":[["corn",2]],"in":["grill"],"serves":2,"cooks":1}},
    "roastSweetPotato": {"stamina":18,"buff":null,"recipe":{"needs":[["sweetPotato",2]],"in":["grill"],"serves":2,"cooks":1}},
    "stirKangkong": {"stamina":22,"buff":"green","recipe":{"needs":[["kangkong",3],["chili",1],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "basilCatfish": {"stamina":35,"buff":"hearty","recipe":{"needs":[["catfish",1],["basil",2],["chili",1],["garlic",1],["rice",2]],"in":["pan"],"serves":3,"cooks":1}},
    "tomYum": {"stamina":40,"buff":"hearty","recipe":{"needs":[["snakehead",1],["tomato",2],["chili",2],["scallion",1]],"in":["pot"],"serves":4,"cooks":1}},
    "sourCurry": {"stamina":32,"buff":"calm","recipe":{"needs":[["barb",2],["daikon",1],["cabbage",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedPerch": {"stamina":28,"buff":"keen","recipe":{"needs":[["perch",2],["garlic",2],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "fishCake": {"stamina":38,"buff":"calm","recipe":{"needs":[["featherback",1],["basil",1],["chili",1],["salt",1]],"in":["pan"],"serves":4,"cooks":1}},
    "spicyEel": {"stamina":40,"buff":"hearty","recipe":{"needs":[["eel",1],["basil",2],["chili",2],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "grilledPrawn": {"stamina":30,"buff":"lucky","recipe":{"needs":[["prawn",2],["salt",1]],"in":["grill"],"serves":2,"cooks":1}},
    "steamedGoby": {"stamina":45,"buff":"lucky","recipe":{"needs":[["goby",1],["scallion",2],["fishSauce",1]],"in":["pot"],"serves":3,"cooks":1}},
    "pumpkinSoup": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["scallion",1],["salt",1]],"in":["pot"],"serves":5,"cooks":1}},
    "shabu": {"stamina":50,"buff":"lucky","recipe":{"needs":[["cabbage",1],["carrot",2],["daikon",1],["corn",1],["scallion",2],["prawn",2],["pangasius",1]],"in":["pot"],"serves":10,"cooks":3}},
    "somTam": {"stamina":30,"buff":"keen","recipe":{"needs":[["papaya",1],["lime",1],["chili",2],["longBean",1],["tomato",1],["sugar",1]],"in":["mortar"],"serves":3,"cooks":1}},
    "grilledEggplant": {"stamina":22,"buff":"calm","recipe":{"needs":[["eggplant",2],["fishSauce",1]],"in":["grill"],"serves":2,"cooks":1}},
    "tomKha": {"stamina":42,"buff":"hearty","recipe":{"needs":[["sheatfish",1],["galangal",1],["lemongrass",1],["lime",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedGourami": {"stamina":26,"buff":null,"recipe":{"needs":[["gourami",2],["oil",1],["salt",1]],"in":["wok"],"serves":2,"cooks":1}},
    "crabCurry": {"stamina":46,"buff":"lucky","recipe":{"needs":[["crab",3],["curryPaste",1],["longBean",1],["eggplant",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "steamedSheatfish": {"stamina":40,"buff":"calm","recipe":{"needs":[["sheatfish",1],["lime",2],["chili",1],["garlic",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "friedFrog": {"stamina":36,"buff":"keen","recipe":{"needs":[["frog",2],["garlic",2],["oil",1]],"in":["wok"],"serves":2,"cooks":1}},
    "laab": {"stamina":44,"buff":"hearty","recipe":{"needs":[["bagrid",1],["lime",1],["chili",1],["scallion",1],["rice",1]],"in":["cleaver","mortar"],"serves":4,"cooks":2}},
    "omelette": {"stamina":20,"buff":null,"recipe":{"needs":[["egg",2],["oil",1]],"in":["pan"],"serves":2,"cooks":1}},
    "snailCurry": {"stamina":40,"buff":"green","recipe":{"needs":[["snail",6],["curryPaste",1],["lemongrass",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "candiedPumpkin": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["sugar",2]],"in":["pot"],"serves":5,"cooks":1}},
    "friedRice": {"stamina":34,"buff":null,"recipe":{"needs":[["rice",3],["egg",1],["scallion",1],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "greenCurry": {"stamina":48,"buff":"calm","recipe":{"needs":[["featherback",1],["curryPaste",1],["coconutMilk",1],["eggplant",2],["basil",1]],"in":["mortar","pot"],"serves":5,"cooks":2}},
    "khanomJeen": {"stamina":50,"buff":"hearty","recipe":{"needs":[["riceNoodle",3],["croaker",1],["curryPaste",1],["coconutMilk",1],["longBean",1]],"in":["mortar","pot","steamer"],"serves":6,"cooks":3}},
    "hoMok": {"stamina":48,"buff":"lucky","recipe":{"needs":[["blackEar",1],["curryPaste",1],["coconutMilk",1],["bananaLeaf",2],["basil",1]],"in":["mortar","steamerBamboo"],"serves":4,"cooks":2}},
    "mangoStickyRice": {"stamina":44,"buff":"green","recipe":{"needs":[["mango",2],["stickyRice",2],["coconutMilk",1],["sugar",1]],"in":["steamerBamboo","pot"],"serves":4,"cooks":2}},
    "bananaInCoconut": {"stamina":32,"buff":"calm","recipe":{"needs":[["banana",3],["coconutMilk",1],["sugar",1]],"in":["pot"],"serves":4,"cooks":1}},
    "taroPudding": {"stamina":40,"buff":"keen","recipe":{"needs":[["taro",1],["flour",1],["coconutMilk",1],["sugar",1]],"in":["panBrass","pot"],"serves":6,"cooks":2}},
    "steamedCroaker": {"stamina":46,"buff":"keen","recipe":{"needs":[["croaker",1],["soy",1],["ginger",1],["scallion",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "gingerFish": {"stamina":45,"buff":"hearty","recipe":{"needs":[["blackEar",1],["ginger",2],["soy",1],["oil",1]],"in":["wok"],"serves":4,"cooks":1}},
    "turmericFish": {"stamina":44,"buff":"calm","recipe":{"needs":[["spinyEel",2],["turmeric",1],["garlic",2],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "jungleCurry": {"stamina":50,"buff":"lucky","recipe":{"needs":[["giantSnakehead",1],["curryPaste",1],["galangal",1],["lemongrass",1],["eggplant",1],["longBean",1]],"in":["mortar","potBrass"],"serves":6,"cooks":2}},
    "megaLaab": {"stamina":50,"buff":"hearty","recipe":{"needs":[["megaCatfish",1],["toastedRice",1],["lime",3],["chili",3],["scallion",2]],"in":["cleaver","mortar","wok"],"serves":20,"cooks":3}},
    "watermelonSlices": {"stamina":24,"buff":null,"recipe":{"needs":[["watermelon",1]],"in":["cleaver"],"serves":6,"cooks":1}},
    "khantoke": {"stamina":50,"buff":"lucky","recipe":{"needs":[["stickyRice",3],["goldenCarp",1],["curryPaste",1],["coconutMilk",1],["cucumber",2],["longBean",2],["pepper",1]],"in":["hotpot","steamerBamboo","wok","mortar"],"serves":20,"cooks":4}},
    "naamPrik": {"stamina":38,"buff":"green","recipe":{"needs":[["fermentedFish",1],["chili",3],["garlic",1],["lime",1],["cucumber",1]],"in":["mortar"],"serves":4,"cooks":1}}
  }$town$::jsonb),
  ('scrolls', $town${
    "scrollFriedMinnow": "friedMinnow",
    "scrollGrilledFish": "grilledFish",
    "scrollSomTam": "somTam",
    "scrollOmelette": "omelette",
    "scrollGreenCurry": "greenCurry",
    "scrollHoMok": "hoMok"
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v107>

/* ── the rules ───────────────────────────────────────────────────────────── */

-- Which meal's hours a moment is in: 0 breakfast, 1 lunch, 2 dinner.
create or replace function town.meal_of(p_now bigint)
returns integer language sql stable
as $$
  with h as (
    select ((p_now + 7 * 3600000::bigint) % 86400000)::double precision / 3600000 as h,
           town.cat('stamina')->'meals' as meals, (town.cat('rules')->>'dawn')::int as dawn)
  select case when h.h >= (h.meals->>2)::int or h.h < h.dawn then 2 when h.h >= (h.meals->>1)::int then 1 else 0 end from h
$$;

create or replace function town.stamina_of(p_purse jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select case when (p_purse->'stamina'->>'day')::int = town.day_of(p_now) then (p_purse->'stamina'->>'left')::double precision
              else (town.cat('stamina')->>'max')::double precision end
$$;

create or replace function town.buff_of(p_purse jsonb, p_now bigint)
returns text language sql immutable
as $$
  select case when coalesce(p_purse->'buff', 'null'::jsonb) <> 'null'::jsonb and (p_purse->'buff'->>'until')::bigint > p_now then p_purse->'buff'->>'id' end
$$;

create or replace function town.eaten_today(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$ select case when (p_purse->'meals'->>'day')::int = town.day_of(p_now) then p_purse->'meals'->'eaten' else '[false, false, false]'::jsonb end $$;

-- What something costs in stamina: less after a hearty meal. A half goes up,
-- as the code's Math.round takes it.
create or replace function town.cost_of(p_purse jsonb, p_n double precision, p_now bigint)
returns integer language sql stable
as $$
  select floor(p_n * (case when town.buff_of(p_purse, p_now) = 'hearty'
    then 1::double precision - (town.cat('stamina')->'buffs'->>'hearty')::double precision else 1::double precision end) + 0.5::double precision)::integer
$$;

create or replace function town.spend(p_purse jsonb, p_n double precision, p_now bigint)
returns jsonb language sql stable
as $$
  select p_purse || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now),
    'left', greatest(0::double precision, town.stamina_of(p_purse, p_now) - town.cost_of(p_purse, p_n, p_now))))
$$;

-- sitDown(): this meal's hours' one meal begins, and a helping leaves the bag.
create or replace function town.sit_down(p_purse jsonb, p_slot integer, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  meal integer := town.meal_of(p_now);
  eaten jsonb := town.eaten_today(p_purse, p_now);
begin
  if s is null or s = 'null'::jsonb or coalesce(town.cat('items')->(s->>'item')->>'kind', '') <> 'dish' then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb or (eaten->>meal)::boolean then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', s->>'item', 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - 1) end),
    'meals', jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_set(eaten, array[meal::text], 'true'::jsonb)),
    'eating', jsonb_build_object('dish', s->>'item', 'meal', meal, 'from', p_now, 'till', p_now, 'got', 0)));
end;
$$;

-- chew(): count a meal on to now, with so many eating beside one; and, when
-- its time is up, its end. Gives the purse and whether it is done.
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  return jsonb_build_object('done', done, 'purse', p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end,
    'buff', case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb
      then jsonb_build_object('id', dish->>'buff', 'until', p_now + (st->>'hours')::bigint * 3600000)
      else coalesce(p_purse->'buff', 'null'::jsonb) end));
end;
$$;

-- getUp(): what was eaten stays; the rest, and the buff, are forfeit.
create or replace function town.get_up(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  counted jsonb;
begin
  if coalesce(p_purse->'eating', 'null'::jsonb) = 'null'::jsonb then return p_purse; end if;
  counted := town.chew(p_purse, p_company, p_now)->'purse';
  return counted || jsonb_build_object('eating', 'null'::jsonb,
    'buff', case when counted->'eating' <> 'null'::jsonb then coalesce(p_purse->'buff', 'null'::jsonb) else counted->'buff' end);
end;
$$;

-- settle(): a meal whose time is up, finished as of when it ended.
create or replace function town.settle(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  ends bigint;
begin
  if e = 'null'::jsonb then return p_purse; end if;
  ends := (e->>'from')::bigint + (town.cat('stamina')->>'minutes')::bigint * 60000;
  if p_now >= ends then return town.chew(p_purse, 0, ends)->'purse'; end if;
  return p_purse;
end;
$$;

-- readScroll(): its recipe is known from now on, and the scroll is used up.
create or replace function town.read_scroll(p_purse jsonb, p_slot integer)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  dish text;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  dish := town.cat('scrolls')->>(s->>'item');
  if dish is null then return town.no('none'); end if;
  if p_purse->'recipes' ? dish then return town.no('known'); end if;
  return jsonb_build_object('ok', true, 'dish', dish, 'purse', p_purse || jsonb_build_object(
    'recipes', (p_purse->'recipes') || to_jsonb(dish),
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = 1 then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - 1) end)));
end;
$$;

/* ── keeping a purse, settled ────────────────────────────────────────────── */

-- A purse as it was kept (v106's purse_of, under another name): for counting
-- a meal on, which finishes it itself, with the company it is told of.
create or replace function town.purse_kept(p_member uuid, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  coins integer;
  doc jsonb;
  left_ record;
begin
  if p_hold then
    insert into public.town_purses (member_id) values (p_member) on conflict (member_id) do nothing;
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member for update;
  else
    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member;
  end if;
  select l.profile_left, l.gallery_left into left_ from public.town_popoto_left(p_member) l;
  return coalesce(doc, town.fresh()) || jsonb_build_object(
    'coins', coalesce(coins, 0),
    'popoto', jsonb_build_object('profile', coalesce(left_.profile_left, 0), 'gallery', coalesce(left_.gallery_left, 0)),
    'changed', jsonb_build_object('week', town.week_of(now_), 'n', coalesce((
      select sum(e.popoto) from public.town_exchanges e
       where e.member_id = p_member
         and e.week = date_trunc('week', to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::date), 0)::int));
end;
$$;

-- v106's purse_of, with one thing more: a meal whose time is up is finished
-- as the purse is read (the coins and the ledger's numbers are no part of a
-- meal, so settling after they are put in is the same).
create or replace function town.purse_of(p_member uuid, p_hold boolean)
returns jsonb language sql set search_path = public
as $$ select town.settle(town.purse_kept(p_member, p_hold), town.now_ms()) $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- Sit down to the dish in a slot of the bag. `p_seated` is the browser's word
-- for whether I am sitting (the room knows, the database does not).
create or replace function public.town_sit(p_slot integer, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.sit_down(town.purse_of(me, true), p_slot, p_seated, town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- Count my meal on to now, with so many eating beside me (the browser's word,
-- and it counts for five at the most). Says whether the meal is finished.
create or replace function public.town_chew(p_company integer default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.chew(town.purse_kept(me, true), coalesce(p_company, 0), town.now_ms());
begin
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, jsonb_build_object('ok', true, 'done', did->'done'));
end;
$$;

-- Get up from my meal before it is finished.
create or replace function public.town_get_up(p_company integer default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  perform town.keep_purse(me, town.get_up(town.purse_kept(me, true), coalesce(p_company, 0), town.now_ms()));
  return town.answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- Read the scroll in a slot of the bag.
create or replace function public.town_read(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.read_scroll(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['town_sit(integer, boolean)', 'town_chew(integer)', 'town_get_up(integer)', 'town_read(integer)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, (select count(*) from jsonb_object_keys(data)) as n
--     from public.town_catalog where key in ('stamina', 'dishes', 'scrolls') order by key;
--   -- dishes  | 43
--   -- scrolls | 6
--   -- stamina | 7
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_sit', 'town_chew', 'town_get_up', 'town_read');
--   -- 0 | 4
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          town.meal_of(town.now_ms()) between 0 and 2 as a_meal;
--   -- false | true
