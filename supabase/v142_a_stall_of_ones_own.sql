-- v142 — a stall of one's own, under a sign held up
--
-- Run this once in the Supabase SQL editor, after v141 (it stands on v112,
-- v121, v128 and v137, and stops at its first line without them). Running it
-- again is safe. The site's code for it goes out first: a page built before
-- knows of no stall and asks for none; a page with the code and a database
-- without this file offers a sign that is a chat room only.
--
-- Why. The owner, 2026-10-06:
--
--   "ช่วยทำระบบตั้งห้องแชท บนหัวผู้เล่น โดยผู้เล่นที่ตั้งห้องแชท จะต้องนั่ง หรือ ยืนเฉยๆ
--    สามารถตั้งรับซื้อของ หรือ ขายของโดยไม่ผ่าน ลุงขายของ (ไม่โดนภาษี)
--    แต่ผู้เล่นต้อง online ค้างไว้เท่านั้น"
--   "ร้านเดียวทั้งขายและรับซื้อพร้อมกัน น่าสนทำเลย"
--
-- A member who sits or stands still holds a sign up over their head. The sign
-- and a chat room under one are the page's own (the room's realtime, nothing
-- kept). A stall is kept here:
--
--   · A stall is a few lines, each a thing at a price: so many to sell out
--     of its keeper's bag, or so many wanted, paid for out of their purse.
--     One stall may have both kinds.
--   · Nothing is set aside. The things stay in the bag and the coins in the
--     purse; each sale is looked at as it is made (the things are still
--     there, the coins are, the bag has room), with both purses held, the
--     lesser id first, as a deal holds them. So a stall that is gone leaves
--     nothing to be given back.
--   · Nothing is kept back: the whole price goes from one purse to the
--     other. No coin is made or lost by any of it.
--   · It is open only while its keeper is in town: their page says so every
--     little while (`town_shop_beat`), and a stall not heard from for
--     `shop_quiet` seconds is shut. Where anybody stands is the page's word,
--     as everywhere in the town: a comer's tile is held to be within
--     `shop_reach` of the stall's.
--   · Only what the village has met can be wanted (the notice board's own
--     rule and its own list), and a price has the notice board's own most.
--     Only plain things change hands (not a pot with food in it, nor a can
--     with water).
--   · Every opening, shutting and sale is written down (v121's `town_deeds`):
--     `shop_open`, `shop_close`; `shop_buy` and `shop_sold` for a thing a
--     comer bought (the comer's line and the keeper's), `shop_sell` and
--     `shop_bought` for a thing a comer brought. Each sale's two lines name
--     each other (`from`, `to`), so that coins handed from one member to
--     another can be followed, as a deal's can.
--
-- What it adds: five `shop_*` knobs; one closed table, `town_shops` (a row to
-- a member who has a stall); the rules (lib/town/shop.ts written again, held
-- to the code case by case by the dry run): `town.shop_open`, `shop_buy`,
-- `shop_sell`, `shop_can`, `shop_told_of`, `shop_mine`; and seven functions a
-- member calls. It writes no function of the game's again; `town.deed_th` is
-- given six words more from its own text as it stands.

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null
     or to_regprocedure('town.notice_cap(text, jsonb)') is null or to_regprocedure('town.take_plain(jsonb, text, integer)') is null
     or to_regprocedure('town.on_ground(integer, integer)') is null or to_regprocedure('town.is_member(uuid)') is null then
    raise exception 'v112, v121, v128 and v137 have not all run yet: a stall holds two purses as a deal does, writes its deeds down, has the notice board''s prices and things, and stands on a tile of the town''s maps';
  end if;
end $$;

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A stall's numbers (a knob is a whole number). A seed: one an admin has
-- turned stays turned. (The most a price is, is the notice board's own knobs.)
insert into public.town_knobs (key, value) values
  ('shop_lines', 6),     -- how many lines a stall may have
  ('shop_reach', 3),     -- how near the stall somebody stands to buy from it or bring to it, in tiles
  ('shop_most', 200),    -- the most of a thing on one line
  ('shop_quiet', 150),   -- a stall not heard from for so many seconds is shut
  ('shop_every', 50)     -- how often its keeper's page says it is still there, in seconds
  on conflict (key) do nothing;

-- A stall: whose, the tile it stands on, its lines (each a kind, a thing, how
-- many it began with, how many are left, a price), since when, when its
-- keeper's page was last heard from, and the coins it has taken and paid.
create table if not exists public.town_shops (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  x         integer not null,
  y         integer not null,
  lines     jsonb not null,
  since     bigint not null,
  beat      bigint not null,
  took      bigint not null default 0 check (took >= 0),
  paid      bigint not null default 0 check (paid >= 0)
);

alter table public.town_shops enable row level security;
revoke all on public.town_shops from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- The numbers as one document, as the rules take them.
create or replace function town.shop_knobs()
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'lines', coalesce((select k.value from public.town_knobs k where k.key = 'shop_lines'), 6),
    'reach', coalesce((select k.value from public.town_knobs k where k.key = 'shop_reach'), 3),
    'most', coalesce((select k.value from public.town_knobs k where k.key = 'shop_most'), 200),
    'quiet', coalesce((select k.value from public.town_knobs k where k.key = 'shop_quiet'), 150),
    'every', coalesce((select k.value from public.town_knobs k where k.key = 'shop_every'), 50),
    'cap', coalesce((select k.value from public.town_knobs k where k.key = 'notice_cap'), 10),
    'capless', coalesce((select k.value from public.town_knobs k where k.key = 'notice_capless'), 500))
$$;

-- Whether a stall is open: its keeper's page has been heard from lately.
create or replace function town.shop_alive(p_shop jsonb, p_now bigint, p_k jsonb)
returns boolean language sql immutable
as $$ select p_shop is not null and p_shop <> 'null'::jsonb and p_now - (p_shop->>'beat')::bigint < (p_k->>'quiet')::bigint * 1000 $$;

-- How many of a line can change hands this moment: no more than are left on
-- it, than its keeper holds (or can pay for, and has room for).
create or replace function town.shop_can(p_line jsonb, p_keeper jsonb)
returns integer language sql stable set search_path = public
as $$
  select greatest(0, case when p_line->>'kind' = 'sell'
    then least((p_line->>'left')::int, town.plain(p_keeper->'bag', p_line->>'item'))
    else least((p_line->>'left')::int, floor((p_keeper->>'coins')::numeric / (p_line->>'price')::numeric)::int, town.room(p_keeper->'bag', p_line->>'item')) end)
$$;

-- Open a stall where its keeper stands. Every thing to sell is in the bag
-- now, as plain things; every thing wanted is one the village has met
-- (`p_seen`, a list), and the purse has the coins for all that is wanted.
-- Nothing leaves the bag or the purse.
create or replace function town.shop_open(p_purse jsonb, p_me text, p_ask jsonb, p_x integer, p_y integer, p_now bigint, p_seen jsonb, p_k jsonb)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  l jsonb;
  item_ text;
  owed numeric := 0;
  lines_ jsonb := '[]'::jsonb;
  n_ numeric;
  price_ numeric;
begin
  if p_ask is null or jsonb_typeof(p_ask) <> 'array' or jsonb_array_length(p_ask) < 1 or jsonb_array_length(p_ask) > (p_k->>'lines')::int then return town.no('lines'); end if;
  if (select count(distinct coalesce(e->>'item', '')) from jsonb_array_elements(p_ask) e) <> jsonb_array_length(p_ask) then return town.no('lines'); end if;
  if p_x is null or p_y is null then return town.no('none'); end if;
  for l in select e from jsonb_array_elements(p_ask) e loop
    item_ := l->>'item';
    if item_ is null or not (town.cat('items') ? item_) or coalesce(l->>'kind', '') not in ('sell', 'buy') then return town.no('none'); end if;
    if jsonb_typeof(l->'n') is distinct from 'number' or jsonb_typeof(l->'price') is distinct from 'number' then return town.no('amount'); end if;
    n_ := (l->>'n')::numeric;
    price_ := (l->>'price')::numeric;
    if n_ <= 0 or n_ <> trunc(n_) or price_ <= 0 or price_ <> trunc(price_) or n_ > (p_k->>'most')::numeric then return town.no('amount'); end if;
    if price_ > town.notice_cap(item_, p_k) then return town.no('dear'); end if;
    if l->>'kind' = 'sell' and town.plain(p_purse->'bag', item_) < n_ then return town.no('none'); end if;
    if l->>'kind' = 'buy' and not (p_seen ? item_) then return town.no('none'); end if;
    if l->>'kind' = 'buy' then owed := owed + n_ * price_; end if;
    lines_ := lines_ || jsonb_build_array(jsonb_build_object('kind', l->>'kind', 'item', item_, 'n', n_::int, 'left', n_::int, 'price', price_::int));
  end loop;
  if owed > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true, 'shop', jsonb_build_object(
    'by', p_me, 'at', jsonb_build_array(p_x, p_y), 'lines', lines_, 'since', p_now, 'beat', p_now, 'took', 0, 'paid', 0));
end;
$$;

-- The line of a stall somebody comes to, of a kind and a thing: refused when
-- the number is none, the stall is shut, it is their own, they stand too far,
-- or the line has not so many left. Answers which line it is.
create or replace function town.shop_line(p_shop jsonb, p_kind text, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  i integer;
begin
  if p_n is null or p_n <= 0 then return town.no('amount'); end if;
  if not town.shop_alive(p_shop, p_now, p_k) then return town.no('shut'); end if;
  if p_shop->>'by' = p_me then return town.no('own'); end if;
  if p_x is null or p_y is null
     or greatest(abs(p_x - (p_shop->'at'->>0)::int), abs(p_y - (p_shop->'at'->>1)::int)) > (p_k->>'reach')::int then return town.no('far'); end if;
  select (t.n - 1)::int into i from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n)
   where t.e->>'kind' = p_kind and t.e->>'item' = p_item order by t.n limit 1;
  if i is null or (p_shop->'lines'->i->>'left')::int < p_n then return town.no('gone'); end if;
  return jsonb_build_object('ok', true, 'i', i);
end;
$$;

-- A stall with so many of a line gone, and what it took or paid counted on.
create or replace function town.shop_spent(p_shop jsonb, p_i integer, p_n integer, p_coins numeric)
returns jsonb language sql immutable
as $$
  select jsonb_set(p_shop, array['lines', p_i::text, 'left'], to_jsonb((p_shop->'lines'->p_i->>'left')::int - p_n))
    || case when p_shop->'lines'->p_i->>'kind' = 'sell'
         then jsonb_build_object('took', (p_shop->>'took')::numeric + p_coins)
         else jsonb_build_object('paid', (p_shop->>'paid')::numeric + p_coins) end
$$;

-- Buy some of what a stall sells: the things leave its keeper's bag for the
-- comer's, and the comer's coins go to the keeper's purse, all of them.
create or replace function town.shop_buy(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  found jsonb := town.shop_line(p_shop, 'sell', p_me, p_item, p_n, p_x, p_y, p_now, p_k);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain(p_theirs->'bag', p_item) < p_n then return town.no('gone'); end if;
  if (p_mine->>'coins')::numeric < coins then return town.no('coins'); end if;
  if town.room(p_mine->'bag', p_item) < p_n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric - coins, 'bag', town.put(p_mine->'bag', p_item, p_n)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric + coins, 'bag', town.take_plain(p_theirs->'bag', p_item, p_n)));
end;
$$;

-- Bring some of what a stall wants: the things leave the comer's bag for its
-- keeper's, and the keeper's coins come to the comer's purse, all of them.
create or replace function town.shop_sell(p_mine jsonb, p_theirs jsonb, p_shop jsonb, p_me text, p_item text, p_n integer, p_x integer, p_y integer, p_now bigint, p_k jsonb)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  found jsonb := town.shop_line(p_shop, 'buy', p_me, p_item, p_n, p_x, p_y, p_now, p_k);
  i integer;
  coins numeric;
begin
  if not (found->>'ok')::boolean then return found; end if;
  i := (found->>'i')::int;
  coins := p_n * (p_shop->'lines'->i->>'price')::numeric;
  if town.plain(p_mine->'bag', p_item) < p_n then return town.no('none'); end if;
  if (p_theirs->>'coins')::numeric < coins then return town.no('short'); end if;
  if town.room(p_theirs->'bag', p_item) < p_n then return town.no('packed'); end if;
  return jsonb_build_object('ok', true, 'coins', coins, 'shop', town.shop_spent(p_shop, i, p_n, coins),
    'mine', p_mine || jsonb_build_object('coins', (p_mine->>'coins')::numeric + coins, 'bag', town.take_plain(p_mine->'bag', p_item, p_n)),
    'theirs', p_theirs || jsonb_build_object('coins', (p_theirs->>'coins')::numeric - coins, 'bag', town.put(p_theirs->'bag', p_item, p_n)));
end;
$$;

-- Somebody's stall as a comer is told it: whose, where, and the lines that
-- have anything to them now, each with how many can change hands. Nothing,
-- when it is not open.
create or replace function town.shop_told_of(p_shop jsonb, p_keeper jsonb, p_now bigint, p_k jsonb)
returns jsonb language sql stable set search_path = public
as $$
  select case when not town.shop_alive(p_shop, p_now, p_k) then null else jsonb_build_object(
    'by', p_shop->'by', 'at', p_shop->'at',
    'lines', coalesce((select jsonb_agg(jsonb_build_object('kind', t.e->'kind', 'item', t.e->'item', 'price', t.e->'price', 'can', town.shop_can(t.e, p_keeper)) order by t.n)
                         from jsonb_array_elements(p_shop->'lines') with ordinality t(e, n) where town.shop_can(t.e, p_keeper) > 0), '[]'::jsonb)) end
$$;

-- A stall as its own keeper is told it: every line with how many are left,
-- and what it has taken and paid. Nothing, when it is not open.
create or replace function town.shop_mine(p_shop jsonb, p_now bigint, p_k jsonb)
returns jsonb language sql immutable
as $$
  select case when not town.shop_alive(p_shop, p_now, p_k) then null else jsonb_build_object(
    'at', p_shop->'at', 'lines', p_shop->'lines', 'since', p_shop->'since', 'took', p_shop->'took', 'paid', p_shop->'paid') end
$$;

/* ── keeping it ──────────────────────────────────────────────────────────── */

-- A member's stall as the rules take one, from its row; nothing when they
-- have none. With `p_hold`, the row is held until the transaction ends.
create or replace function town.shop_of(p_member uuid, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  s public.town_shops;
begin
  if p_hold then select * into s from public.town_shops x where x.member_id = p_member for update;
  else select * into s from public.town_shops x where x.member_id = p_member; end if;
  if s.member_id is null then return null; end if;
  return jsonb_build_object('by', s.member_id, 'at', jsonb_build_array(s.x, s.y), 'lines', s.lines, 'since', s.since, 'beat', s.beat, 'took', s.took, 'paid', s.paid);
end;
$$;

-- What may be wanted at a stall: what the village has met and what the
-- uncle's shelf shows, as the notice board tells it (v128's own list).
create or replace function town.shop_seen()
returns jsonb language sql set search_path = public
as $$
  select coalesce(jsonb_agg(x.id order by x.id), '[]'::jsonb)
    from (select jsonb_object_keys(town.seen_now()) as id
          union
          select jsonb_array_elements_text(town.shelf_of((town.thing('village', false)->>'unlocked')::int))) x
   where town.cat('items') ? x.id
$$;

-- What a member is told of stalls: theirs, when it is open; what may be
-- wanted; and the rules' numbers, for the page to hold a form to.
create or replace function town.shops_told(p_me uuid)
returns jsonb language plpgsql set search_path = public
as $$
declare
  k jsonb := town.shop_knobs();
begin
  return jsonb_build_object(
    'mine', town.shop_mine(town.shop_of(p_me, false), town.now_ms(), k),
    'seen', town.shop_seen(),
    'lines', (k->>'lines')::int, 'reach', (k->>'reach')::int, 'most', (k->>'most')::int,
    'cap', (k->>'cap')::int, 'capless', (k->>'capless')::int, 'every', (k->>'every')::int);
end;
$$;

-- What a deed at a stall of my own answers: what it came to, my purse, and
-- what I am told of stalls now.
create or replace function town.shopped(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$ select town.answer(p_member, p_did) || jsonb_build_object('shops', town.shops_told(p_member)) $$;

-- The tally's words for the stall's six deeds: `town.deed_th` (v121's) as it
-- stands, with six words more before its last line. Once.
do $$
declare
  def text;
begin
  if town.deed_th('shop_open') = 'shop_open' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''shop_open'' then ''ชูป้ายเปิดร้าน'' when ''shop_close'' then ''เก็บป้ายปิดร้าน'' when ''shop_buy'' then ''ซื้อของจากร้านสมาชิก'' when ''shop_sold'' then ''ร้านขายของได้'' when ''shop_sell'' then ''ขายของให้ร้านสมาชิก'' when ''shop_bought'' then ''ร้านรับซื้อของ'' else p_what end');
  end if;
end $$;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- What I am told of stalls, with my purse (somebody may just have come to mine).
create or replace function public.town_shop()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('shops', town.shops_told(me), 'purse', town.purse_of(me, false), 'now', town.now_ms());
end;
$$;

-- Open a stall on the tile I stand on: a list of lines, each a kind
-- ("sell" or "buy"), a thing, how many, and a price each. One that was open
-- is opened anew.
create or replace function public.town_shop_open(p_lines jsonb, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or exists (select 1 from jsonb_array_elements(p_lines) e where jsonb_typeof(e) <> 'object') then
    return town.shopped(me, town.no('lines'));
  end if;
  -- (a stall stands on a tile of one of the town's maps: v137's)
  if p_x is null or p_y is null or not town.on_ground(p_x, p_y) then return town.shopped(me, town.no('none')); end if;
  did := town.shop_open(purse, me::text, p_lines, p_x, p_y, now_, town.shop_seen(), town.shop_knobs());
  if (did->>'ok')::boolean then
    insert into public.town_shops (member_id, x, y, lines, since, beat, took, paid)
      values (me, p_x, p_y, did->'shop'->'lines', now_, now_, 0, 0)
      on conflict (member_id) do update set x = excluded.x, y = excluded.y, lines = excluded.lines, since = excluded.since, beat = excluded.beat, took = 0, paid = 0;
    perform town.note(me, 'shop_open', null, jsonb_array_length(did->'shop'->'lines'), 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'lines', did->'shop'->'lines'));
  end if;
  return town.shopped(me, did - 'shop');
end;
$$;

-- Shut my stall (my sign came down).
create or replace function public.town_shop_close()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  was public.town_shops;
begin
  delete from public.town_shops s where s.member_id = me returning * into was;
  if was.member_id is not null then
    perform town.note(me, 'shop_close', null, 1, 0, jsonb_build_object('took', was.took, 'paid', was.paid, 'lines', was.lines));
  end if;
  return jsonb_build_object('ok', true, 'shops', town.shops_told(me), 'now', town.now_ms());
end;
$$;

-- I am still here: my stall stays open. (One that has been quiet too long is
-- shut, and is not opened by this.)
create or replace function public.town_shop_beat()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  quiet bigint := (town.shop_knobs()->>'quiet')::bigint * 1000;
  kept integer;
begin
  update public.town_shops s set beat = now_ where s.member_id = me and now_ - s.beat < quiet;
  get diagnostics kept = row_count;
  return jsonb_build_object('ok', kept > 0, 'now', now_);
end;
$$;

-- Somebody's stall, as whoever comes to it is told (nothing: they have none open).
create or replace function public.town_shop_look(p_who uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  shop jsonb := town.shop_of(p_who, false);
begin
  return jsonb_build_object('shopWho', p_who, 'now', now_,
    'shopTold', case when shop is null then null else town.shop_told_of(shop, town.purse_of(p_who, false), now_, town.shop_knobs()) end);
end;
$$;

-- A sale at somebody's stall, either way, from the tile I stand on: both
-- purses are held, the lesser id first (as every function that touches two
-- does), then the stall's own row; the rule is asked; and what it gives back
-- is kept, with a line written down for each of the two.
create or replace function town.shop_deal(p_me uuid, p_who uuid, p_kind text, p_item text, p_n integer, p_x integer, p_y integer)
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  k jsonb := town.shop_knobs();
  mine jsonb;
  theirs jsonb;
  shop jsonb;
  did jsonb;
  price_ numeric;
begin
  if p_who is null or not town.is_member(p_who) then
    return town.answer(p_me, town.no('shut')) || jsonb_build_object('shopWho', p_who, 'shopTold', null);
  end if;
  if p_me <= p_who then mine := town.purse_of(p_me, true); theirs := town.purse_of(p_who, true);
  else theirs := town.purse_of(p_who, true); mine := town.purse_of(p_me, true); end if;
  shop := town.shop_of(p_who, true);
  did := case when p_kind = 'sell' then town.shop_buy(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k)
              else town.shop_sell(mine, theirs, shop, p_me::text, p_item, p_n, p_x, p_y, now_, k) end;
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_me, did->'mine');
    perform town.keep_purse(p_who, did->'theirs');
    update public.town_shops s set lines = did->'shop'->'lines', took = (did->'shop'->>'took')::numeric::bigint, paid = (did->'shop'->>'paid')::numeric::bigint
     where s.member_id = p_who;
    price_ := (did->>'coins')::numeric / p_n;
    if p_kind = 'sell' then
      perform town.note(p_me, 'shop_buy', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)));
      perform town.note(p_who, 'shop_sold', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_me, 'price', price_));
    else
      perform town.note(p_me, 'shop_sell', p_item, p_n, (did->>'coins')::numeric, jsonb_build_object('to', p_who, 'price', price_, 'tile', jsonb_build_array(p_x, p_y)));
      perform town.note(p_who, 'shop_bought', p_item, p_n, -(did->>'coins')::numeric, jsonb_build_object('from', p_me, 'price', price_));
    end if;
  end if;
  shop := town.shop_of(p_who, false);
  return town.answer(p_me, did - 'mine' - 'theirs' - 'shop') || jsonb_build_object('shopWho', p_who,
    'shopTold', case when shop is null then null else town.shop_told_of(shop, town.purse_of(p_who, false), now_, k) end);
end;
$$;

-- Buy so many of a thing at somebody's stall.
create or replace function public.town_shop_buy(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'sell', p_item, p_n, p_x, p_y);
end;
$$;

-- Bring so many of a thing somebody's stall wants.
create or replace function public.town_shop_sell(p_who uuid, p_item text, p_n integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return town.shop_deal(me, p_who, 'buy', p_item, p_n, p_x, p_y);
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the stall's seven are a member's, and
-- nobody's signed out. (Supabase hands every new function to everybody.)
revoke execute on all functions in schema town from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['town_shop()', 'town_shop_open(jsonb, integer, integer)', 'town_shop_close()', 'town_shop_beat()', 'town_shop_look(uuid)',
    'town_shop_buy(uuid, text, integer, integer, integer)', 'town_shop_sell(uuid, text, integer, integer, integer)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) from public.town_knobs where key like 'shop\_%';
--   -- 5
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_shops' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_shops'::regclass;
--   -- true | 0
--
--   select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member,
--          count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as signed_out
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_shop%';
--   -- 7 | 0
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
--   select town.deed_th('shop_open') as opened, town.deed_th('shop_sold') as sold, town.deed_th('drop') as as_it_was;
--   -- ชูป้ายเปิดร้าน | ร้านขายของได้ | ทิ้งของ
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the stalls that are open now
--   select p.character_name, s.x, s.y, jsonb_array_length(s.lines) as lines, s.took, s.paid,
--          to_timestamp(s.since / 1000.0) as since, round((town.now_ms() - s.beat) / 1000.0) as quiet_for
--     from public.town_shops s join public.profiles p on p.id = s.member_id
--    where town.now_ms() - s.beat < (town.shop_knobs()->>'quiet')::bigint * 1000 order by s.since;
--
--   -- what changed hands at stalls, by the day: sales, things, coins, and how many members on each side
--   select date_trunc('day', d.at) as day, count(*) as sales, sum(d.n)::int as things, sum(abs(d.coins))::int as coins,
--          count(distinct d.member_id) as comers, count(distinct coalesce(d.doc->>'from', d.doc->>'to')) as keepers
--     from public.town_deeds d where d.what in ('shop_buy', 'shop_sell') group by 1 order by 1 desc limit 14;
--
--   -- coins that went from one member to another at a stall, the most first (who feeds whose purse)
--   select q.character_name as payer, r.character_name as paid, sum(abs(d.coins))::int as coins, count(*) as sales
--     from public.town_deeds d
--     join public.profiles q on q.id = case when d.what = 'shop_buy' then d.member_id else (d.doc->>'to')::uuid end
--     join public.profiles r on r.id = case when d.what = 'shop_buy' then (d.doc->>'from')::uuid else d.member_id end
--    where d.what in ('shop_buy', 'shop_sell') group by 1, 2 order by 3 desc limit 30;
