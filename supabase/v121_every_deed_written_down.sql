-- v121 — every deed written down
--
-- Run this once in the Supabase SQL editor, after v120. Running it again is
-- safe.
--
-- Why. The owner asked whether it can be looked up what each member has done
-- in the town, and how often ("ใน cash town เราตรวจสอบได้ไหมว่า action ที่แต่ละคนทำ
-- ทำไปกี่ครั้ง อะไรบ้าง เช่น การตักน้ำมาเติมบ่อน้ำ"). Only in part: what has a game
-- or a ledger was kept by name (a line that ended, a plot cleared or tilled,
-- a pot cooked: `town_plays`, v108; popoto changed: `town_exchanges`, v105;
-- a deal: `town_deals`, v112), and of everything else only what came of it:
-- the well's level and not who poured, a plot's plant and not who watered
-- it, a purse's coins and not what they went on. So nobody could say who had
-- filled the well. Then: "ทำให้นับได้ และช่วยเช็ค action อื่นๆให้ครบด้วย".
--
-- All thirty-seven functions a member calls were gone through:
--
--   · seven only read (town_me, town_stall, town_line, town_farm,
--     town_kitchen, town_deal, town_bank);
--   · eight write down what they do already (town_exchange; town_strike and
--     town_land; town_cook; town_deal_open, _lay, _agree and _cancel);
--   · one is the page's clock counting a meal on, and no deed (town_chew);
--   · twenty-one did something and left no line of who. They are written
--     again here, each as it last ran, word for word but for the line that
--     writes the deed down: town_buy, town_leave, town_take_back,
--     town_collect, town_hold, town_wear, town_take_off, town_drop, town_give
--     and town_hint (v106's); town_sit, town_get_up and town_read (v107's);
--     town_cast (v118's); town_tend (v119's) and town_chore (v110's);
--     town_pot_down, town_pot_ladle, town_pot_take, town_serve and town_open
--     (v111's).
--
-- What it adds:
--
--   · `town_deeds`: a line for every deed that came off (one refused leaves
--     none): who, when, what, with or to which thing, how many, and what it
--     did to their coins. Closed like `town_plays`: written by these
--     functions, read by no browser.
--   · `town.doings`: those lines and, beside them in the same shape, what
--     was kept elsewhere all along (the games, the bank, the deals), so that
--     everything a member has done is in one place, the days before this
--     ran included for what was kept then.
--   · `town.tally(from, to)`: how often each member has done what, for the
--     SQL editor.
--
-- What it does not change: no rule, no number, no answer. A page loaded
-- before it ran plays on as it was, and nothing of the site waits for it.
-- A deed done before it ran that left no line has none now: who filled the
-- well on the game's first two days is not known and cannot be.
--
-- The words (`what`), and what `thing` and `n` are for each:
--
--   buy        bought from the uncle: the thing, how many; coins paid
--   leave      left with him to be sold: the thing, how many
--   take_back  taken back from him: the thing, how many
--   collect    the money for what his relatives fetched; coins got
--   give       brought for his order: the thing, how many; coins got
--   hint       a hint bought: the dish it is of; coins paid
--   hold       a thing taken into the hand        put_away  put back
--   wear       a basket put on                    take_off  taken off
--   drop       a slot thrown away: the thing, how many
--   eat        sat down to a dish                 get_up    left a meal
--   read       a scroll read: what it tells how to make
--   cast       a line dropped: the bait
--   draw       a bucket filled at the river: the bucket, bucketfuls
--   pour       poured into the well: the bucket, bucketfuls
--   fill       a can filled at the well: the can (one bucketful)
--   sow, water, feed, cure, pick, pull, uproot
--              done to a plot: the plant; for a picking, how many
--   pot_down   a pot of food set down: the dish, its helpings
--   ladle      a helping out of a pot that stands about: the dish
--   pot_take   one's pot taken up again: the dish, its helpings
--   serve      a helping out of the pot in one's own bag: the dish
--   open       an old boot, a bottle or a chest opened: which
--
-- and, in `town.doings` only, from what was kept already: clear and till (a
-- plot hoed), cook (the dish, or nothing), fish_landed, fish_early,
-- fish_missed, fish_slipped, fish_snapped and fish_left (how a line ended:
-- what was on it), exchange (popoto changed: how many; coins got) and deal
-- (a deal done; coins got less coins given).

/* ── what is kept ────────────────────────────────────────────────────────── */

-- Every deed that came off, a line each. `thing` is what it was done with or
-- to, by its id; `n` how many of it (things, bucketfuls, helpings); `coins`
-- what the deed did to the purse's coins (paid: below nothing); `doc` the
-- rest: the tile, the thing in the hand, whose plant or pot it was when not
-- one's own.
--
-- No check on any of it, on purpose: a line that could not be written would
-- undo the deed it is of, and a member's sowing must not fail over its
-- record. It is written by the functions below and by nothing else.
create table if not exists public.town_deeds (
  id        bigint generated always as identity primary key,
  member_id uuid references public.profiles (id) on delete cascade,
  at        timestamptz not null default now(),
  what      text not null,
  thing     text,
  n         numeric not null default 1,
  coins     numeric not null default 0,
  doc       jsonb not null default '{}'::jsonb
);

create index if not exists town_deeds_member on public.town_deeds (member_id, at desc);
create index if not exists town_deeds_what on public.town_deeds (what, at desc);

alter table public.town_deeds enable row level security;
revoke all on public.town_deeds from anon, authenticated;

/* ── writing a deed down ─────────────────────────────────────────────────── */

-- By the town's clock, as a play is (v108's town.record). What is not said
-- is one of it, for no coins.
create or replace function town.note(p_member uuid, p_what text, p_thing text default null, p_n numeric default 1,
  p_coins numeric default 0, p_doc jsonb default '{}'::jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_deeds (member_id, at, what, thing, n, coins, doc)
  values (p_member, to_timestamp(town.now_ms() / 1000.0), coalesce(p_what, '?'), p_thing, coalesce(p_n, 1), coalesce(p_coins, 0), coalesce(p_doc, '{}'::jsonb))
$$;

/* ── the stall and the bag: v106's, each with its deed written down ──────── */

create or replace function public.town_buy(p_item text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  stall jsonb := town.thing('stall', true);
  village jsonb := town.thing('village', false);
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.buy(purse, stall, p_item, p_n, town.now_ms(), town.shelf_of((village->>'unlocked')::int));
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('stall', did->'stall');
    perform town.note(me, 'buy', p_item, p_n, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric);
  end if;
  return town.answer(me, did) || jsonb_build_object('stall', town.thing('stall', false));
end;
$$;

create or replace function public.town_leave(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.leave(purse, p_slot, p_n, town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'leave', purse->'bag'->p_slot->>'item', p_n); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_take_back(p_at integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.take_back(purse, coalesce(p_at, -1), town.now_ms());
  lot jsonb;
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then
    -- (which lot it was: the first place where what he held and what he holds now differ)
    select b.l into lot from jsonb_array_elements(purse->'left') with ordinality b(l, ord)
      left join jsonb_array_elements(did->'purse'->'left') with ordinality a(l, ord) on a.ord = b.ord
     where a.l is distinct from b.l order by b.ord limit 1;
    perform town.note(me, 'take_back', lot->>'item', (lot->>'n')::numeric);
  end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_collect()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.collect(town.purse_of(me, true), town.now_ms());
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'collect', null, 1, (did->>'coins')::numeric); end if;
  return town.answer(me, did);
end;
$$;

-- Take up the thing in a slot to hold it in the hand; with no slot, put away
-- what is held.
create or replace function public.town_hold(p_slot integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_slot is null then did := jsonb_build_object('ok', true, 'purse', purse || '{"hand": null}'::jsonb);
  else did := town.hold(purse, p_slot); end if;
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  -- (nothing in the hand and nothing taken up is no deed)
  if (did->>'ok')::boolean and coalesce(did->'purse'->>'hand', purse->>'hand') is not null then
    perform town.note(me, case when p_slot is null then 'put_away' else 'hold' end, coalesce(did->'purse'->>'hand', purse->>'hand'));
  end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_wear(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.wear(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'wear', did->'purse'->'wears'->>-1); end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_take_off(p_item text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb;
begin
  if p_item is null or p_item !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.take_off(town.purse_of(me, true), p_item);
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'take_off', p_item); end if;
  return town.answer(me, did);
end;
$$;

-- Throw away what is in a slot, to make room.
create or replace function public.town_drop(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
begin
  if p_slot is null or p_slot < 0 or p_slot >= jsonb_array_length(purse->'bag') or purse->'bag'->p_slot = 'null'::jsonb then
    return town.answer(me, town.no('none'));
  end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', jsonb_set(purse->'bag', array[p_slot::text], 'null'::jsonb)));
  perform town.note(me, 'drop', purse->'bag'->p_slot->>'item', (purse->'bag'->p_slot->>'n')::numeric);
  return town.answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- Bring the uncle some of what is in a slot, for today's order.
create or replace function public.town_give(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  village jsonb := town.thing('village', true);
  did jsonb := town.give(purse, village, p_slot, p_n, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_thing('village', did->'village');
    village := did->'village';
    perform town.note(me, 'give', purse->'bag'->p_slot->>'item', (did->>'given')::numeric, (did->>'coins')::numeric,
      case when coalesce(did->'opened', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('opened', did->'opened') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object(
    'order', town.order_of(village, town.now_ms()),
    'shelf', town.shelf_of((village->>'unlocked')::int));
end;
$$;

-- Buy the uncle's next hint.
create or replace function public.town_hint()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.buy_hint(purse, town.thing('found', false), (town.thing('village', false)->>'unlocked')::int);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'hint', did->>'hint', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric); end if;
  return town.answer(me, did);
end;
$$;

/* ── a meal and a scroll: v107's, each with its deed written down ────────── */

-- (Counting a meal on, town_chew, is the page's clock and no deed: it is as
-- v107 left it. A meal that ends is not written down either: it ends as the
-- purse is next read, whoever reads it.)

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
  if (did->>'ok')::boolean then perform town.note(me, 'eat', did->>'dish'); end if;
  return town.answer(me, did);
end;
$$;

-- Get up from my meal before it is finished.
create or replace function public.town_get_up(p_company integer default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_kept(me, true);
begin
  perform town.keep_purse(me, town.get_up(purse, coalesce(p_company, 0), town.now_ms()));
  -- (only somebody at a meal gets up from one)
  if coalesce(purse->'eating', 'null'::jsonb) <> 'null'::jsonb then perform town.note(me, 'get_up', purse->'eating'->>'dish'); end if;
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
  if (did->>'ok')::boolean then perform town.note(me, 'read', did->>'dish'); end if;
  return town.answer(me, did);
end;
$$;

/* ── a line dropped: v118's, with the bait written down ──────────────────── */

-- (How a line ends is written down already, with its game: v108's
-- town_strike and town_land are as they were. A line dropped is not always
-- one that ends: the page may be shut on it, or another dropped over it.)

-- `p_rain` is still taken, so that a page built before this is answered,
-- and is believed no longer.
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
  line := town.cast_line(p_bait, hour, town.raining(now_), coalesce(town.buff_of(purse, now_) = 'lucky', false), not deep::boolean,
    array[random(), random(), random(), random(), random(), random()]);
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y)));
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')));
end;
$$;

/* ── the farm: v119's tending and v110's water, each deed written down ───── */

-- Do to a plot what the thing in my hand does: clear it, till it, dig its
-- plant out, sow it, water it, feed it, cure it, pick it. `p_timing` is the
-- browser's own account of the hoe's game (hits, misses, seconds), kept
-- with the play; its misses, within bounds, cost a little more stamina.
-- `p_sure` is the page's word that it has asked a second time and a living
-- plant is meant: without it only a dead one is dug out.
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null, p_sure boolean default false)
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
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
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
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end);
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
    -- (how much: the bucketfuls poured into the well, or drawn at the river; a can takes one from the well)
    perform town.note(me, did->>'chore', town.hand_of(purse),
      case did->>'chore' when 'pour' then (did->>'well')::numeric - well when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric else 1 end,
      0, jsonb_build_object('well', did->'well'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well));
end;
$$;

/* ── the kitchen: v111's, each with its deed written down ────────────────── */

-- (A pot cooked is written down already, with its game: town_cook is as it
-- was.)

-- Set the pot of food in my bag down on the tile I stand on (the browser's
-- word for where that is): if nothing stands on it or beside it, and I have
-- not left as many about as one may.
create or replace function public.town_pot_down(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  if exists (select 1 from public.town_pots o where abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me) >= (ck->>'pots')::int then return town.answer(me, town.no('many')); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int, p_x, p_y, coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms())
    on conflict (x, y) do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_down', did->'pot'->>'dish', (did->'pot'->>'left')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id));
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$$;

-- Ladle a helping out of a pot that stands about, into a bowl of mine. Its
-- last helping out, the pot is gone.
create or replace function public.town_pot_ladle(p_id bigint, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.ladle(purse, pot);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'ladle', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id) || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  return town.answer(me, did) || jsonb_build_object('dish', pot->'dish');
end;
$$;

-- Take my pot of food up again.
create or replace function public.town_pot_take(p_id bigint, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.take_up(purse, pot, me::text);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  delete from public.town_pots o where o.id = p_id;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_take', pot->>'dish', (pot->>'left')::numeric, 0, jsonb_build_object('pot', p_id));
  return town.answer(me, did);
end;
$$;

-- Ladle a helping out of the pot in a slot of my own bag, into a bowl.
create or replace function public.town_serve(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.serve(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'serve', did->>'dish'); end if;
  return town.answer(me, did);
end;
$$;

-- Open what may hold something (an old boot, a bottle, a chest): says what
-- was in it, if anything. The chance is drawn here.
create or replace function public.town_open(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.open(purse, p_slot, array[random(), random()]);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  if (did->>'ok')::boolean then perform town.note(me, 'open', purse->'bag'->p_slot->>'item', 1, 0, jsonb_build_object('found', did->'found')); end if;
  return town.answer(me, did);
end;
$$;

/* ── everything a member has done, in one place ──────────────────────────── */

-- The deeds above and, in the same shape, what was kept elsewhere all
-- along: a go at a game (`town_plays`: how a line ended and what was on it,
-- a plot cleared or tilled, a pot cooked and what came of it), popoto
-- changed (`town_exchanges`), a deal done (`town_deals`: a line for each of
-- the two, with the coins that came less the coins that went). It is in the
-- schema no browser reaches: for the SQL editor.
create or replace view town.doings with (security_invoker = true) as
  select d.at, d.member_id, d.what, d.thing, d.n, d.coins, d.doc
    from public.town_deeds d
  union all
  select p.at, p.member_id,
         case p.game when 'fishing' then 'fish_' || coalesce(p.doc->>'how', 'left')
                     when 'cooking' then 'cook'
                     else coalesce(p.doc->>'what', p.game) end,
         case when p.game <> 'farming' then p.doc->>'what' end,
         1, 0, jsonb_build_object('won', p.won, 'spent', p.spent)
    from public.town_plays p
  union all
  select e.created_at, e.member_id, 'exchange', e.kind, e.popoto, e.coins, '{}'::jsonb
    from public.town_exchanges e
  union all
  select to_timestamp(d.ended_at / 1000.0), s.who, 'deal', null, 1, s.coins, jsonb_build_object('deal', d.id, 'with', s.other)
    from public.town_deals d
   cross join lateral (values
     (d.a, d.b, coalesce((d.doc->'coins'->>'b')::numeric, 0) - coalesce((d.doc->'coins'->>'a')::numeric, 0)),
     (d.b, d.a, coalesce((d.doc->'coins'->>'a')::numeric, 0) - coalesce((d.doc->'coins'->>'b')::numeric, 0))) s(who, other, coins)
   where d.ended = 'done';

revoke all on town.doings from public, anon, authenticated;

-- A deed's word in Thai, for whoever reads the tally.
create or replace function town.deed_th(p_what text)
returns text language sql immutable
as $$
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
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    else p_what end
$$;

-- How often each member has done what, between two moments (either may be
-- left out: from the beginning, until now). `n` is how many it came to in
-- all, `coins` what it did to their coins in all.
create or replace function town.tally(p_from timestamptz default null, p_to timestamptz default null)
returns table (name text, what text, th text, times bigint, n numeric, coins numeric, first_at timestamptz, last_at timestamptz)
language sql stable set search_path = public
as $$
  select coalesce(p.character_name, p.display_name, p.discord_username, '(gone)'), d.what, town.deed_th(d.what),
         count(*), sum(d.n), sum(d.coins), min(d.at), max(d.at)
    from town.doings d left join public.profiles p on p.id = d.member_id
   where (p_from is null or d.at >= p_from) and (p_to is null or d.at < p_to)
   group by d.member_id, 1, d.what
   order by 1, count(*) desc, d.what
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules, the tally among them, are no browser's to call; the deeds are a
-- member's, as they were.
revoke execute on all functions in schema town from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'town_buy(text, integer)', 'town_leave(integer, integer)', 'town_take_back(integer)', 'town_collect()', 'town_hold(integer)',
    'town_wear(integer)', 'town_take_off(text)', 'town_drop(integer)', 'town_give(integer, integer)', 'town_hint()',
    'town_sit(integer, boolean)', 'town_get_up(integer)', 'town_read(integer)', 'town_cast(text, integer, integer, boolean)',
    'town_tend(integer, integer, jsonb, boolean)', 'town_chore(integer, integer)', 'town_pot_down(integer, integer)',
    'town_pot_ladle(bigint, integer, integer)', 'town_pot_take(bigint, integer, integer)', 'town_serve(integer)', 'town_open(integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select c.relrowsecurity,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_deeds' and grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_deeds'::regclass;
--   -- true | 0
--
--   select count(*) filter (where p.prosrc like '%town.note(%') as write_a_deed_down,
--          count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member,
--          count(*) as all
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_%'
--      and p.proname not in ('town_vote', 'town_vote_tally', 'town_my_vote', 'town_popoto_left', 'town_is_open', 'town_sky', 'town_weather_kept');
--   -- 21 | 0 | 37 | 37
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- false | 0
--
--   select town.deed_th('pour') as pour, town.deed_th('something new') as unknown;
--   -- เทน้ำลงบ่อ | something new
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   select * from town.tally();                                    -- everybody, everything, from the beginning
--   select * from town.tally(now() - interval '1 day');            -- the last day
--   select * from town.tally('2026-10-05 05:00+07', '2026-10-06 05:00+07');   -- one day of the game's, dawn to dawn
--   select * from town.tally() where what in ('draw', 'pour', 'fill');        -- the well: who carried water
--
--   -- who poured how many bucketfuls into the well, day by day
--   select (d.at at time zone 'Asia/Bangkok')::date as day, p.character_name, count(*) as times, sum(d.n) as bucketfuls
--     from public.town_deeds d join public.profiles p on p.id = d.member_id
--    where d.what = 'pour' group by 1, 2 order by 1, 4 desc;
--
--   -- the newest fifty lines, as they were written
--   select d.at, p.character_name, d.what, d.thing, d.n, d.coins, d.doc
--     from town.doings d left join public.profiles p on p.id = d.member_id order by d.at desc limit 50;
