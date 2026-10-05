-- v128 — a board to sell on
--
-- Run this once in the Supabase SQL editor, after v121, AND ONLY ONCE THE
-- SITE'S OWN CODE FOR IT IS LIVE (a page built before it has no board to
-- show, and shows none). Running it again is safe. It stands on nothing of
-- v123 to v127: they may have run or not.
--
-- Why. Until now a member's things had one buyer, the uncle's relatives, and
-- one way to another member, a deal face to face. The owner: "กระดานฝากขาย
-- ระหว่างสมาชิก ทำได้เลย", with its numbers "3 ช่อง หัก 10% ประกาศ 3 วัน ใช้ได้", and
-- both ways at once: "ทั้ง ซื้อ ขาย เลย แต่ การรับซื้อห้าม show ไอเทม ที่ยังไม่มีคนพบ
-- เด็ดขาด".
--
--   · A notice to sell takes the things out of the bag and pins them up at a
--     price each. Anybody else buys some or all, and has them at once.
--   · A notice of something wanted puts the coins down: so many of a thing at
--     a price each. Anybody who holds the thing brings some or all; what is
--     brought waits on the board for whoever wanted it. Only a thing that has
--     been in somebody's bag, or is on the uncle's shelf, can be wanted: a
--     notice never names a thing nobody has met.
--   · Whoever sells is owed nine tenths of what the things fetch, either way.
--     It waits at the board, counted to the hundredth of a coin and paid in
--     whole coins, so that selling one by one loses nobody anything. The
--     tenth is nobody's: those coins leave the game.
--   · Three notices a member at once, three days each. Five more places can
--     be bought: 100 coins, then 200, 400, 800, 1,600. A notice past its
--     days is off the board, and its things (or its coins) wait for its
--     writer to take it down.
--   · A price has a most: ten times what the relatives usually pay; for what
--     the uncle sells, never more than he asks; for a thing the relatives do
--     not take, 500 coins.
--   · A thing that holds something (a pot with food in it, a can with water)
--     is not put up: only the plain thing.
--
-- What it adds: eleven knobs (those numbers, an admin's to turn); three
-- tables, all closed (town_notices, town_notice_books: what the board owes a
-- member and the places they bought, town_notice_sales: what was sold, for
-- the board's own account of prices); the village's memory of what has been
-- met (`seen`, a row of town_things); the rules; and eight functions a
-- member may call: town_notices, town_notice_post, town_notice_buy,
-- town_notice_fill, town_notice_fetch, town_notice_down,
-- town_notice_collect, town_notice_slot.
--
-- What it writes again: nothing. Every deed at the board is written down
-- (town.note, v121's), by its own word: notice_post, notice_buy, notice_fill,
-- notice_fetch, notice_down, notice_collect, notice_slot.

/* ── what it stands on ───────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 has not run yet: run it first (every deed at the board is written down by its town.note)';
  end if;
end $$;

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The board's numbers (a knob is a whole number). A seed: one an admin has
-- turned stays turned.
insert into public.town_knobs (key, value) values
  ('notice_slots', 3),          -- notices a member may have up at once
  ('notice_more', 5),           -- how many more places can be bought
  ('notice_slot_price', 100),   -- what the first costs; each after, twice the one before
  ('notice_fee', 10),           -- what the board keeps of what a thing is sold for, in hundredths
  ('notice_hours', 72),         -- how long a notice stays up
  ('notice_cap', 10),           -- the most a price is: so many times what the relatives usually pay
  ('notice_capless', 500),      -- and for a thing the relatives do not take, so many coins
  ('notice_most', 200),         -- the most of a thing on one notice
  ('notice_shown', 120),        -- how many notices are told at once, the newest first
  ('notice_days', 7),           -- how many days of what was sold are told
  ('notice_seen_minutes', 10)   -- how often the bags are looked through for things nobody had met
  on conflict (key) do nothing;

-- What the village has met: every thing that has been found in a bag, or
-- left with the uncle, when the bags were last looked through. It only grows.
insert into public.town_things (key, doc)
  values ('seen', jsonb_build_object('at', 0, 'ids', '{}'::jsonb))
  on conflict (key) do nothing;

-- A notice. rest: how many are still to be bought, or still wanted. held: of
-- a wanted notice, how many have been brought and wait for its writer. at
-- and until: moments as the town counts them (town.now_ms).
create table if not exists public.town_notices (
  id        bigint generated always as identity primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  kind      text not null check (kind in ('sell', 'want')),
  item      text not null,
  n         integer not null check (n > 0),
  rest      integer not null check (rest >= 0),
  price     integer not null check (price > 0),
  held      integer not null default 0 check (held >= 0),
  at        bigint not null,
  until     bigint not null
);
create index if not exists town_notices_member on public.town_notices (member_id);

-- What the board owes a member, in hundredths of a coin; and how many more
-- places they have bought.
create table if not exists public.town_notice_books (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  due       bigint not null default 0 check (due >= 0),
  more      integer not null default 0 check (more >= 0)
);

-- What was sold over the board, either way: read for the board's own account
-- of prices, and by whoever looks into the game's coins.
create table if not exists public.town_notice_sales (
  id     bigint generated always as identity primary key,
  at     bigint not null,
  item   text not null,
  n      integer not null check (n > 0),
  price  integer not null check (price > 0),
  kind   text not null check (kind in ('sell', 'want')),
  seller uuid references public.profiles (id) on delete set null,
  buyer  uuid references public.profiles (id) on delete set null,
  notice bigint
);
create index if not exists town_notice_sales_at on public.town_notice_sales (at desc);

alter table public.town_notices enable row level security;
alter table public.town_notice_books enable row level security;
alter table public.town_notice_sales enable row level security;
revoke all on public.town_notices from anon, authenticated;
revoke all on public.town_notice_books from anon, authenticated;
revoke all on public.town_notice_sales from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- The numbers as one document, as the rules take them.
create or replace function town.notice_knobs()
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'slots', coalesce((select k.value from public.town_knobs k where k.key = 'notice_slots'), 3),
    'more', coalesce((select k.value from public.town_knobs k where k.key = 'notice_more'), 5),
    'slot_price', coalesce((select k.value from public.town_knobs k where k.key = 'notice_slot_price'), 100),
    'fee', coalesce((select k.value from public.town_knobs k where k.key = 'notice_fee'), 10),
    'hours', coalesce((select k.value from public.town_knobs k where k.key = 'notice_hours'), 72),
    'cap', coalesce((select k.value from public.town_knobs k where k.key = 'notice_cap'), 10),
    'capless', coalesce((select k.value from public.town_knobs k where k.key = 'notice_capless'), 500),
    'most', coalesce((select k.value from public.town_knobs k where k.key = 'notice_most'), 200),
    'shown', coalesce((select k.value from public.town_knobs k where k.key = 'notice_shown'), 120),
    'days', coalesce((select k.value from public.town_knobs k where k.key = 'notice_days'), 7))
$$;

-- The most a thing may be asked or offered for: what the uncle asks, for
-- what he sells; so many times what the relatives usually pay; and for a
-- thing they do not take, a flat most.
create or replace function town.notice_cap(p_item text, p_k jsonb)
returns integer language sql stable set search_path = public
as $$
  select case
    when town.cat('goods') ? p_item then (town.cat('goods')->p_item->>'price')::numeric::int
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$$;

-- How many of a thing are in a bag as plain things: a stack that holds
-- something (a pot its food, a can its water) is not counted.
create or replace function town.plain(p_bag jsonb, p_id text)
returns integer language sql immutable
as $$
  select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s
   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0
$$;

-- A bag with so many plain ones of a thing out of it, from its last stacks
-- first. (It must hold as many.)
create or replace function town.take_plain(p_bag jsonb, p_id text, p_n integer)
returns jsonb language plpgsql immutable
as $$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$$;

-- What the village has met, by the thing: looked for again when the last
-- look is old (every bag, every lot left with the uncle, every notice, and
-- what has been bought, left, dropped, given, held or eaten since: from the
-- very moment of the last look, so that a deed done in it is not passed
-- over). The row is held while it is counted, so two looks at once count
-- once.
create or replace function town.seen_now()
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  every_ bigint := coalesce((select k.value from public.town_knobs k where k.key = 'notice_seen_minutes'), 10) * 60000::bigint;
  kept jsonb := town.thing('seen', false);
  ids jsonb;
begin
  if now_ - coalesce((kept->>'at')::bigint, 0) < every_ then return coalesce(kept->'ids', '{}'::jsonb); end if;
  kept := town.thing('seen', true);
  if now_ - coalesce((kept->>'at')::bigint, 0) < every_ then return coalesce(kept->'ids', '{}'::jsonb); end if;
  select coalesce(kept->'ids', '{}'::jsonb) || coalesce(jsonb_object_agg(x.id, true), '{}'::jsonb) into ids
    from (
      select s.v->>'item' as id from public.town_purses p, jsonb_array_elements(coalesce(p.doc->'bag', '[]'::jsonb)) s(v) where s.v <> 'null'::jsonb
      union
      select l.v->>'item' from public.town_purses p, jsonb_array_elements(coalesce(p.doc->'left', '[]'::jsonb)) l(v)
      union
      select n.item from public.town_notices n
      union
      select d.thing from public.town_deeds d
       where d.what in ('buy', 'leave', 'take_back', 'drop', 'give', 'hold', 'eat')
         and d.at >= to_timestamp(coalesce((kept->>'at')::bigint, 0) / 1000.0)) x
   where x.id is not null and town.cat('items') ? x.id;
  perform town.keep_thing('seen', jsonb_build_object('at', now_, 'ids', ids));
  return ids;
end;
$$;

-- Whether a thing may be wanted: the village has met it, or it is on the
-- uncle's shelf, where everybody sees it.
create or replace function town.seen_has(p_item text)
returns boolean language sql set search_path = public
as $$
  select town.seen_now() ? p_item
      or town.shelf_of((town.thing('village', false)->>'unlocked')::int) ? p_item
$$;

-- A notice as a member is told it: whose it is by name, and whether it is
-- theirs. What has been brought to it is told only to its writer.
create or replace function town.notice_told(p_notice public.town_notices, p_me uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'id', p_notice.id, 'kind', p_notice.kind, 'item', p_notice.item, 'n', p_notice.n, 'left', p_notice.rest, 'price', p_notice.price,
    'held', case when p_notice.member_id = p_me then p_notice.held else 0 end,
    'by', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_notice.member_id), ''),
    'mine', p_notice.member_id = p_me,
    'until', p_notice.until)
$$;

-- The board as a member is told it: the notices that can be bought from or
-- brought to, the newest first; my own, whatever has become of them; what
-- waits for me, in whole coins; my places, and what one more costs (null
-- when no more can be bought); what may be wanted; and what was sold over
-- the board in the last days, a thing and a day at a time ([day, how many,
-- coins], the oldest first).
create or replace function town.notices_told(p_me uuid)
returns jsonb language plpgsql set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  today integer := town.day_of(town.now_ms());
  k jsonb := town.notice_knobs();
  due_ bigint;
  had integer;
  seen jsonb;
begin
  select b.due, b.more into due_, had from public.town_notice_books b where b.member_id = p_me;
  had := coalesce(had, 0);
  select coalesce(jsonb_agg(x.id order by x.id), '[]'::jsonb) into seen
    from (select jsonb_object_keys(town.seen_now()) as id
          union
          select jsonb_array_elements_text(town.shelf_of((town.thing('village', false)->>'unlocked')::int))) x
   where town.cat('items') ? x.id;
  return jsonb_build_object(
    'notices', coalesce((select jsonb_agg(town.notice_told(up, p_me) order by up.id desc)
                           from (select * from public.town_notices x where now_ < x.until and x.rest > 0 order by x.id desc limit (k->>'shown')::int) up), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(town.notice_told(x, p_me) order by x.id desc) from public.town_notices x where x.member_id = p_me), '[]'::jsonb),
    'due', (coalesce(due_, 0) / 100)::int,
    'slots', (k->>'slots')::int + least((k->>'more')::int, had),
    'more', case when had >= (k->>'more')::int then null else (k->>'slot_price')::int * (2 ^ had)::int end,
    'fee', (k->>'fee')::int, 'hours', (k->>'hours')::int, 'cap', (k->>'cap')::int, 'capless', (k->>'capless')::int, 'most', (k->>'most')::int,
    'seen', seen,
    'sales', coalesce((select jsonb_object_agg(d.item, d.days)
                         from (select s.item, jsonb_agg(jsonb_build_array(s.day, s.n, s.coins) order by s.day) as days
                                 from (select x.item, town.day_of(x.at) as day, sum(x.n)::int as n, sum(x.n::bigint * x.price)::int as coins
                                         from public.town_notice_sales x
                                        where town.day_of(x.at) > today - (k->>'days')::int and town.day_of(x.at) <= today
                                        group by x.item, town.day_of(x.at)) s
                                group by s.item) d), '{}'::jsonb));
end;
$$;

-- What a deed at the board answers: what it came to, my purse, and the board
-- as it stands now.
create or replace function town.noticed(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$ select town.answer(p_member, p_did) || jsonb_build_object('notices', town.notices_told(p_member)) $$;

/* ── what a member may do ────────────────────────────────────────────────── */

-- The board.
create or replace function public.town_notices()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('notices', town.notices_told(me), 'now', town.now_ms());
end;
$$;

-- Pin a notice up. To sell: so many plain ones of a thing leave my bag.
-- Wanted: the coins for all of them leave my purse, and the thing must be
-- one the village has met.
create or replace function public.town_notice_post(p_kind text, p_item text, p_n integer, p_price integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  had integer;
  up integer;
  pinned bigint;
begin
  if p_item is null or not town.cat('items') ? p_item or p_kind is null or p_kind not in ('sell', 'want') then return town.noticed(me, town.no('none')); end if;
  if p_n is null or p_n <= 0 or p_price is null or p_price <= 0 or p_n > (k->>'most')::int then return town.noticed(me, town.no('amount')); end if;
  if p_kind = 'want' and not town.seen_has(p_item) then return town.noticed(me, town.no('none')); end if;
  if p_kind = 'sell' and town.plain(purse->'bag', p_item) < p_n then return town.noticed(me, town.no('none')); end if;
  if p_price > town.notice_cap(p_item, k) then return town.noticed(me, town.no('dear')); end if;
  if p_kind = 'want' and (purse->>'coins')::numeric < p_n::bigint * p_price then return town.noticed(me, town.no('coins')); end if;
  select b.more into had from public.town_notice_books b where b.member_id = me;
  select count(*) into up from public.town_notices x where x.member_id = me;
  if up >= (k->>'slots')::int + least((k->>'more')::int, coalesce(had, 0)) then return town.noticed(me, town.no('slots')); end if;
  insert into public.town_notices (member_id, kind, item, n, rest, price, at, until)
    values (me, p_kind, p_item, p_n, p_n, p_price, now_, now_ + (k->>'hours')::bigint * 3600000)
    returning id into pinned;
  perform town.keep_purse(me, case when p_kind = 'sell'
    then purse || jsonb_build_object('bag', town.take_plain(purse->'bag', p_item, p_n))
    else purse || jsonb_build_object('coins', (purse->>'coins')::numeric - p_n::bigint * p_price) end);
  perform town.note(me, 'notice_post', p_item, p_n, case when p_kind = 'want' then -(p_n::bigint * p_price) else 0 end,
    jsonb_build_object('kind', p_kind, 'price', p_price, 'notice', pinned));
  return town.noticed(me, jsonb_build_object('ok', true, 'id', pinned));
end;
$$;

-- Buy some of what a notice sells: the things are mine at once, and nine
-- tenths of the coins wait at the board for its writer.
create or replace function public.town_notice_buy(p_id bigint, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'sell' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  coins := p_n::bigint * pinned.price;
  if (purse->>'coins')::numeric < coins then return town.noticed(me, town.no('coins')); end if;
  if town.room(purse->'bag', pinned.item) < p_n then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - coins, 'bag', town.put(purse->'bag', pinned.item, p_n)));
  if pinned.rest = p_n then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set rest = x.rest - p_n where x.id = pinned.id; end if;
  insert into public.town_notice_books (member_id, due) values (pinned.member_id, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice)
    values (now_, pinned.item, p_n, pinned.price, 'sell', pinned.member_id, me, pinned.id);
  perform town.note(me, 'notice_buy', pinned.item, p_n, -coins, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'from', pinned.member_id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$$;

-- Bring some of what a notice wants: they leave my bag and wait on the board
-- for its writer, and nine tenths of the coins wait there for me.
create or replace function public.town_notice_fill(p_id bigint, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  k jsonb := town.notice_knobs();
  pinned public.town_notices;
  coins bigint;
begin
  if p_n is null or p_n <= 0 then return town.noticed(me, town.no('amount')); end if;
  select * into pinned from public.town_notices x where x.id = p_id for update;
  if pinned.id is null or pinned.kind <> 'want' or now_ >= pinned.until or pinned.rest <= 0 or pinned.rest < p_n then return town.noticed(me, town.no('gone')); end if;
  if pinned.member_id = me then return town.noticed(me, town.no('own')); end if;
  if town.plain(purse->'bag', pinned.item) < p_n then return town.noticed(me, town.no('none')); end if;
  coins := p_n::bigint * pinned.price;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.take_plain(purse->'bag', pinned.item, p_n)));
  update public.town_notices x set rest = x.rest - p_n, held = x.held + p_n where x.id = pinned.id;
  insert into public.town_notice_books (member_id, due) values (me, coins * (100 - (k->>'fee')::int))
    on conflict (member_id) do update set due = public.town_notice_books.due + excluded.due;
  insert into public.town_notice_sales (at, item, n, price, kind, seller, buyer, notice)
    values (now_, pinned.item, p_n, pinned.price, 'want', me, pinned.member_id, pinned.id);
  perform town.note(me, 'notice_fill', pinned.item, p_n, 0, jsonb_build_object('notice', pinned.id, 'price', pinned.price, 'to', pinned.member_id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'coins', coins));
end;
$$;

-- Take what has been brought to my notice: as many as the bag has room for.
-- A notice with nothing more wanted and nothing more waiting is gone.
create or replace function public.town_notice_fetch(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  got integer;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null or pinned.kind <> 'want' or pinned.held <= 0 then return town.noticed(me, town.no('none')); end if;
  got := least(pinned.held, town.room(purse->'bag', pinned.item));
  if got <= 0 then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put(purse->'bag', pinned.item, got)));
  if pinned.rest = 0 and pinned.held = got then delete from public.town_notices x where x.id = pinned.id;
  else update public.town_notices x set held = x.held - got where x.id = pinned.id; end if;
  perform town.note(me, 'notice_fetch', pinned.item, got, 0, jsonb_build_object('notice', pinned.id));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'got', got));
end;
$$;

-- Take my notice down: what was not sold comes back to my bag; of a wanted
-- one, the coins not spent, and whatever was brought. All of it, or the
-- notice stays.
create or replace function public.town_notice_down(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pinned public.town_notices;
  things integer;
  coins bigint;
begin
  select * into pinned from public.town_notices x where x.id = p_id and x.member_id = me for update;
  if pinned.id is null then return town.noticed(me, town.no('none')); end if;
  things := case when pinned.kind = 'sell' then pinned.rest else pinned.held end;
  coins := case when pinned.kind = 'want' then pinned.rest::bigint * pinned.price else 0 end;
  if town.room(purse->'bag', pinned.item) < things then return town.noticed(me, town.no('full')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + coins,
    'bag', case when things > 0 then town.put(purse->'bag', pinned.item, things) else purse->'bag' end));
  delete from public.town_notices x where x.id = pinned.id;
  perform town.note(me, 'notice_down', pinned.item, things, coins, jsonb_build_object('notice', pinned.id, 'kind', pinned.kind));
  return town.noticed(me, jsonb_build_object('ok', true, 'item', pinned.item, 'things', things, 'coins', coins));
end;
$$;

-- Collect what waits at the board for me: whole coins, the odd part waiting on.
create or replace function public.town_notice_collect()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  due_ bigint;
  coins bigint;
begin
  select b.due into due_ from public.town_notice_books b where b.member_id = me for update;
  coins := coalesce(due_, 0) / 100;
  if coins <= 0 then return town.noticed(me, town.no('nothing')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + coins));
  update public.town_notice_books b set due = b.due - coins * 100 where b.member_id = me;
  perform town.note(me, 'notice_collect', null, 1, coins);
  return town.noticed(me, jsonb_build_object('ok', true, 'coins', coins));
end;
$$;

-- Buy one more place on the board: each costs twice the one before.
create or replace function public.town_notice_slot()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  k jsonb := town.notice_knobs();
  had integer;
  price bigint;
begin
  insert into public.town_notice_books (member_id) values (me) on conflict (member_id) do nothing;
  select b.more into had from public.town_notice_books b where b.member_id = me for update;
  if had >= (k->>'more')::int then return town.noticed(me, town.no('slots')); end if;
  price := (k->>'slot_price')::bigint * (2 ^ had)::bigint;
  if (purse->>'coins')::numeric < price then return town.noticed(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - price));
  update public.town_notice_books b set more = b.more + 1 where b.member_id = me;
  perform town.note(me, 'notice_slot', null, 1, -price);
  return town.noticed(me, jsonb_build_object('ok', true, 'coins', price));
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call; the board's eight are a member's, and
-- nobody's signed out. (Supabase hands every new function to everybody.)
revoke execute on all functions in schema town from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['town_notices()', 'town_notice_post(text, text, integer, integer)', 'town_notice_buy(bigint, integer)',
    'town_notice_fill(bigint, integer)', 'town_notice_fetch(bigint)', 'town_notice_down(bigint)', 'town_notice_collect()', 'town_notice_slot()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) from public.town_knobs where key like 'notice\_%';
--   -- 11
--
--   select c.relname, c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid in ('public.town_notices'::regclass, 'public.town_notice_books'::regclass, 'public.town_notice_sales'::regclass)
--    order by 1;
--   -- town_notice_books | true | 0;  town_notice_sales | true | 0;  town_notices | true | 0
--
--   select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member,
--          count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as signed_out
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\_notice%';
--   -- 8 | 0
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
