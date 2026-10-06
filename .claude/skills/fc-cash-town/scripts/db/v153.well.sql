-- v153, the well's part: what the fourth to the sixth rank of the water carriers' line give (the rules are
-- lib/town/well-gifts.ts again). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
-- Its numbers are the catalog's: `gifts` (each gift's own: the flask's thirty) and `well` (written over by v153: what
-- else these three go by).

-- ── the flask of living water (rank 4, thingFlask): a drink for a friend ──

-- A tile as it is told, if it is one: two whole numbers (lib/town/well-gifts' tileOf).
create or replace function town.is_tile(p_at jsonb)
returns boolean language plpgsql immutable
as $$
begin
  if p_at is null or jsonb_typeof(p_at) <> 'array' then return false; end if;
  if jsonb_array_length(p_at) <> 2 then return false; end if;
  if jsonb_typeof(p_at->0) <> 'number' or jsonb_typeof(p_at->1) <> 'number' then return false; end if;
  return (p_at->>0)::numeric = trunc((p_at->>0)::numeric) and (p_at->>1)::numeric = trunc((p_at->>1)::numeric);
end;
$$;

-- The drink somebody holds out, as it is kept, if it is kept soundly: to whom, from which tile, until when
-- (toastOf). Lapsed or not: town.drink_take says which.
create or replace function town.toast_of(p_purse jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  t jsonb := p_purse->'toast';
begin
  if t is null or jsonb_typeof(t) <> 'object' then return null; end if;
  if jsonb_typeof(t->'to') is distinct from 'string' or jsonb_typeof(t->'till') is distinct from 'number' then return null; end if;
  if t->>'to' = '' or not town.is_tile(t->'at') then return null; end if;
  return jsonb_build_object('to', t->'to', 'at', t->'at', 'till', t->'till');
end;
$$;

-- Whether somebody has been given a drink in the meal's hours a moment is in (hasDrunk).
create or replace function town.has_drunk(p_purse jsonb, p_now bigint)
returns boolean language plpgsql stable
as $$
declare
  d jsonb := p_purse->'drunk';
begin
  if d is null or jsonb_typeof(d) <> 'object' then return false; end if;
  if jsonb_typeof(d->'k') is distinct from 'number' then return false; end if;
  return (d->>'k')::numeric = town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now);
end;
$$;

-- Hold a drink out to somebody, from the tile one stands on (p_to null: put it away). One at a time (drinkOffer).
create or replace function town.drink_offer(p_purse jsonb, p_me text, p_to text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  till bigint;
begin
  if not town.gift_works(p_purse, 'thingFlask') then return town.no('none'); end if;
  if p_to is null then return jsonb_build_object('ok', true, 'till', null, 'purse', p_purse - 'toast'); end if;
  if p_to = '' or p_to = p_me then return town.no('none'); end if;
  if not town.is_tile(p_at) then return town.no('none'); end if;
  till := p_now + round((town.cat('well')->'drink'->>'waits')::numeric * 1000)::bigint;
  return jsonb_build_object('ok', true, 'till', till,
    'purse', (p_purse - 'toast') || jsonb_build_object('toast', jsonb_build_object('to', p_to, 'at', p_at, 'till', till)));
end;
$$;

-- Drink what somebody holds out to one, from the tile one stands on: both purses as they are afterwards, what the
-- drinker had of it and what its giver had for the giving (drinkTake). Once in a meal's hours for whoever drinks;
-- never above a full gauge; nothing for a gauge that is full.
create or replace function town.drink_take(p_giver jsonb, p_drinker jsonb, p_from text, p_me text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('well')->'drink';
  top double precision := (town.cat('stamina')->>'max')::double precision;
  gives double precision := (town.cat('gifts')->'gifts'->'thingFlask'->>'by')::double precision;
  held jsonb := town.toast_of(p_giver);
  day_ integer := town.day_of(p_now);
  mine double precision;
  theirs double precision;
  left_ double precision;
  after_ double precision;
begin
  if p_from = p_me or held is null or not town.gift_works(p_giver, 'thingFlask') then return town.no('none'); end if;
  if held->>'to' <> p_me then return town.no('none'); end if;
  if not ((held->>'till')::numeric > p_now) then return town.no('late'); end if;
  if not town.is_tile(p_at) then return town.no('far'); end if;
  if greatest(abs((p_at->>0)::numeric - (held->'at'->>0)::numeric), abs((p_at->>1)::numeric - (held->'at'->>1)::numeric)) > (k->>'reach')::numeric then return town.no('far'); end if;
  if town.has_drunk(p_drinker, p_now) then return town.no('drunk'); end if;
  mine := town.stamina_of(p_drinker, p_now);
  if mine >= top then return town.no('sated'); end if;
  theirs := town.stamina_of(p_giver, p_now);
  left_ := least(top, mine + gives);
  after_ := least(top, theirs + (k->>'back')::double precision);
  return jsonb_build_object('ok', true, 'got', left_ - mine, 'back', after_ - theirs,
    'giver', (p_giver - 'toast') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', after_)),
    'drinker', p_drinker || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_),
      'drunk', jsonb_build_object('k', town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now), 'by', p_from)));
end;
$$;

-- What a member calls: a drink held out to somebody of the town, from the tile they stand on (p_to null: put away).
create or replace function public.town_drink_offer(p_to uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  -- (somebody who is of the town: a proved character, or an admin)
  if p_to is not null and not town.is_member(p_to) then return town.answer(me, town.no('none')); end if;
  did := town.drink_offer(purse, me::text, p_to::text, jsonb_build_array(p_x, p_y), town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if p_to is not null then
      perform town.note(me, 'drink_offer', 'thingFlask', 1, 0, jsonb_build_object('to', p_to, 'at', jsonb_build_array(p_x, p_y)));
    end if;
  end if;
  return town.answer(me, did);
end;
$$;

-- …and the friend drinking it, from the tile they stand on: both purses judged and kept in this one call, and a line
-- written down for each of the two.
create or replace function public.town_drink_take(p_from uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there)
  if p_from is null or p_from = me or not town.is_member(p_from)
     or not exists (select 1 from public.town_purses pp where pp.member_id = p_from) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who drink to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_from then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_from, true);
  else
    theirs := town.purse_of(p_from, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.drink_take(theirs, mine, p_from::text, me::text, jsonb_build_array(p_x, p_y), now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_from, did->'giver');
    perform town.keep_purse(me, did->'drinker');
    perform town.note(me, 'drink', 'thingFlask', (did->>'got')::numeric, 0, jsonb_build_object('from', p_from, 'at', jsonb_build_array(p_x, p_y)));
    perform town.note(p_from, 'drink_gave', 'thingFlask', (did->>'back')::numeric, 0, jsonb_build_object('to', me));
  end if;
  return town.answer(me, did - 'giver' - 'drinker');
end;
$$;

-- ── the rain frog (rank 5, famFrog): under rain the bucket its member holds fills by itself ──
-- (What it shows of the sky to come, and its croak before rain, are the page's own to read: public.town_sky tells
-- every page the quarter hours the database has, those to come among them.)

-- The rain fills the empty bucket in somebody's hand: as much as it carries, for no stamina. Only while it rains
-- (p_raining: public.town_rain_fill says, by the weather the database keeps), only with the frog following, and not
-- sooner after the last than this one takes to fill (rainFill).
create or replace function town.rain_fill(p_purse jsonb, p_raining boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  n integer;
begin
  if not town.gift_works(p_purse, 'famFrog') then return town.no('none'); end if;
  if not coalesce(p_raining, false) then return town.no('dry'); end if;
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  n := (f->'buckets'->>hand)::int;
  if jsonb_typeof(p_purse->'rained') = 'number' then
    if p_now - (p_purse->>'rained')::numeric < n * (town.cat('well')->'frog'->>'fills')::numeric * 1000 then return town.no('soon'); end if;
  end if;
  return jsonb_build_object('ok', true, 'n', n, 'can', hand,
    'purse', p_purse || jsonb_build_object('rained', p_now, 'bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', n))));
end;
$$;

-- What a member's page calls when its bucket has stood under the rain long enough. Written down under a word of its
-- own (`rain_fill`: the bucket, how many bucketfuls). The well's book reads deeds by their word and knows none of this
-- one (its trigger on town_deeds names the words it reads: nothing of v127's is written again here), so what the book
-- does for a bucket drawn is done here: nobody's hands are on its water yet, and it has the nature of the moment,
-- which is the rain's.
create or replace function public.town_rain_fill()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.rain_fill(town.purse_of(me, true), town.raining(now_), now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    delete from public.town_line_water l where l.member_id = me and l.item = did->>'can';
    if town.water_kind(now_) is not null then
      insert into public.town_line_water (member_id, item, hands, kind) values (me, did->>'can', '{}', town.water_kind(now_));
    end if;
    perform town.note(me, 'rain_fill', did->>'can', (did->>'n')::numeric, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$$;

-- ── the moon flask (rank 6, thingMoon): water that differs, kept for the moment of its owner's choosing ──

-- The well after so many bucketfuls of a nature are poured in that work so many times as long (lib/town/waters'
-- pouredIn with its `times`): town.well_poured's rule, with the minutes a bucketful keeps the nature and the most both
-- so many times over. More of the nature the well has never shortens what it has.
create or replace function town.well_poured_times(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint, p_times double precision)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  by_ numeric := case when coalesce(p_times, 0) > 0 then p_times::numeric else 1 end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', greatest(v_from, least(p_now + floor((k->>'most')::numeric * by_ * 60000)::bigint, v_from + floor(p_n * (k->>'lasts')::numeric * by_ * 60000)::bigint)));
end;
$$;

-- What a moon flask keeps, if it is kept soundly: a nature there is, and a whole number of bucketfuls from one to what
-- it holds (moonOf). Null for an empty one.
create or replace function town.moon_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := p_purse->'moon';
  n numeric;
begin
  if m is null or jsonb_typeof(m) <> 'object' then return null; end if;
  if jsonb_typeof(m->'kind') is distinct from 'string' or jsonb_typeof(m->'n') is distinct from 'number' then return null; end if;
  if not (town.cat('waters')->'adds' ? (m->>'kind')) then return null; end if;
  n := (m->>'n')::numeric;
  if n <> trunc(n) or n < 1 or n > (town.cat('well')->'moon'->>'holds')::numeric then return null; end if;
  return jsonb_build_object('kind', m->'kind', 'n', n::integer);
end;
$$;

-- Keep the water of the bucket somebody holds in their flask: as many bucketfuls as the flask has room for, the rest
-- stays in the bucket (moonKeep). p_kind is the nature of that water, as the well's book has it; plain water is not
-- kept, nor another nature than the flask has. For nothing.
create or replace function town.moon_keep(p_purse jsonb, p_kind text)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  has jsonb := town.moon_of(p_purse);
  slot integer;
  water integer;
  room integer;
  n integer;
begin
  if not town.gift_works(p_purse, 'thingMoon') then return town.no('none'); end if;
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, water from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null or water < 1 then return town.no('hand'); end if;
  if p_kind is null or not (town.cat('waters')->'adds' ? p_kind) then return town.no('plain'); end if;
  if has is not null and has->>'kind' <> p_kind then return town.no('other'); end if;
  room := (town.cat('well')->'moon'->>'holds')::integer - coalesce((has->>'n')::integer, 0);
  if room < 1 then return town.no('brim'); end if;
  n := least(water, room);
  return jsonb_build_object('ok', true, 'n', n, 'kind', p_kind, 'can', hand,
    'purse', p_purse || jsonb_build_object('moon', jsonb_build_object('kind', p_kind, 'n', coalesce((has->>'n')::integer, 0) + n),
      'bag', jsonb_set(bag, array[slot::text],
        case when water > n then jsonb_build_object('item', hand, 'n', 1, 'water', water - n) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$$;

-- Pour so many bucketfuls of a flask into the well (all it has, when it has fewer), for a pour's stamina: the purse
-- and the well afterwards, how many were poured, and how many the well had room for (moonPour). What it has no room
-- for runs over. The well's nature is public.town_moon_pour's to keep.
create or replace function town.moon_pour(p_purse jsonb, p_well integer, p_n numeric, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  has jsonb := town.moon_of(p_purse);
  poured integer;
  into_ integer;
  left_ integer;
  spent jsonb;
begin
  if not town.gift_works(p_purse, 'thingMoon') then return town.no('none'); end if;
  if p_n is null then return town.no('amount'); end if;
  if p_n <> trunc(p_n) or p_n < 1 then return town.no('amount'); end if;
  if has is null then return town.no('dry'); end if;
  poured := least(p_n, (has->>'n')::numeric)::integer;
  into_ := greatest(0, least(poured, (f->>'well')::integer - p_well));
  left_ := (has->>'n')::integer - poured;
  spent := town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now) - 'moon';
  return jsonb_build_object('ok', true, 'poured', poured, 'into', into_, 'kind', has->'kind', 'well', p_well + into_,
    'purse', case when left_ > 0 then spent || jsonb_build_object('moon', jsonb_build_object('kind', has->'kind', 'n', left_)) else spent end);
end;
$$;

-- The nature of the water in each bucket of a member's that has one, as the well's book has it (by who holds which
-- thing): what a flask's owner's page asks, to know whether the water in their hand can be kept.
create or replace function town.carried_kinds(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_object_agg(l.item, l.kind), '{}'::jsonb) from public.town_line_water l where l.member_id = p_member and l.kind is not null
$$;

-- What a member's page calls: what water their buckets have; that water kept in the flask; the flask poured into the
-- well from one of the tiles about it.
create or replace function public.town_moon()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'carried', town.carried_kinds(me));
end;
$$;

create or replace function public.town_moon_keep()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  hand text := town.hand_of(purse);
  kind text := (select l.kind from public.town_line_water l where l.member_id = me and l.item = hand);
  did jsonb := town.moon_keep(purse, kind);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'moon_keep', did->>'can', (did->>'n')::numeric, 0, jsonb_build_object('kind', did->'kind', 'flask', did->'purse'->'moon'->'n'));
  end if;
  return town.answer(me, did) || jsonb_build_object('carried', town.carried_kinds(me));
end;
$$;

create or replace function public.town_moon_pour(p_x integer, p_y integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  well integer;
  did jsonb;
  water jsonb;
begin
  -- (at the well, as a bucket is poured: on one of the tiles about it)
  if p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) <> 1 then return town.answer(me, town.no('none')); end if;
  well := (town.thing('well', true) #>> '{}')::int;
  did := town.moon_pour(purse, well, p_n, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
    -- the well takes the flask's nature from all that was poured, so many times as long as a bucket's
    water := town.well_poured_times(town.thing('well_water', true), did->>'kind', (did->>'poured')::integer, me, now_,
      (town.cat('gifts')->'gifts'->'thingMoon'->>'by')::double precision);
    perform town.keep_thing('well_water', coalesce(water, 'null'::jsonb));
    -- what went into the well is a bucketful poured like any other in the well's book, which reads that word (the
    -- flask is no bucket of anybody's line: nobody else is counted it, and the book gives the well no nature of it)
    if (did->>'into')::int > 0 then
      perform town.note(me, 'pour', 'thingMoon', (did->>'into')::numeric, 0, jsonb_build_object('well', did->'well', 'flask', true));
    end if;
    perform town.note(me, 'moon_pour', did->>'kind', (did->>'poured')::numeric, 0, jsonb_build_object('well', did->'well', 'into', did->'into', 'until', water->'until'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well), 'wellWater', town.well_water_told(now_));
end;
$$;

-- The well after so many bucketfuls of a nature are poured in (v133's, as the database has it but for one line): more
-- of the nature the well has never shortens what it has of it. (It could not, while a bucket's most was the only most;
-- with a flask's water in the well, a bucket of the same poured after it would have cut its hours to two.)
CREATE OR REPLACE FUNCTION town.well_poured(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', greatest(v_from, least(p_now + (k->>'most')::bigint * 60000, v_from + p_n::bigint * (k->>'lasts')::bigint * 60000)));
end;
$function$;

-- SHARED BY EVERY LINE: the deeds' Thai words, for town.tally (v142's, as the database has it, with the well's six new
-- words on two lines of their own). A line's file that writes this again after this one drops them: the words of every
-- line are to be put into one.
CREATE OR REPLACE FUNCTION town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้'
    when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ' else p_what end
$function$;

revoke execute on function public.town_drink_offer(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_offer(uuid, integer, integer) to authenticated;
revoke execute on function public.town_drink_take(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_take(uuid, integer, integer) to authenticated;
revoke execute on function public.town_rain_fill() from public, anon;
grant execute on function public.town_rain_fill() to authenticated;
revoke execute on function public.town_moon() from public, anon;
grant execute on function public.town_moon() to authenticated;
revoke execute on function public.town_moon_keep() from public, anon;
grant execute on function public.town_moon_keep() to authenticated;
revoke execute on function public.town_moon_pour(integer, integer, integer) from public, anon;
grant execute on function public.town_moon_pour(integer, integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
