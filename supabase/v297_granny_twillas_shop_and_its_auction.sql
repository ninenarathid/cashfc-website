-- v297 — Granny Twilla's shop and its auction (2026-10-25)
-- Run once in the Supabase SQL editor, after v296. Running it again is safe. The page that knows the shop may go out
-- before or after it: a page without the shop calls nothing here, and a page with it before this file is told "no"
-- by every call of the shop (and the shop's chat is not heard) until it runs.
--
-- The owner, 2026-10-25: an indoor clothes shop (his editor's export, a room of its own reached through the townhouse's
-- door), a new popoto, a granny who sells clothes, forty new things to wear across the slots at many prices, a try-on,
-- and a weekly auction of limited outfits that only a few may have and that can come back for a new round ("rerun"),
-- the first round two Halloween designs closing on Saturday 31 October at 21:00, the bidders' names shown. His answers:
-- "ตามนี้เลย" to the forty and their prices, "31" for the close, "ได้" to the names; he left the number of copies open,
-- so each design has three for now (a row of `town_auctions`, changed by hand if he says otherwise).
--
-- 1. The shop is a map of its own, so it has a chat channel of its own: v293's helper and its two policies again, with
--    the zone 'shop' in each of their lists. Nothing else of them changes.
-- 2. A look written in version 7 (lib/town/look: two digits a thing worn, written only once a list passes 36, the
--    owner's "ทำให้ใส่ได้เยอะขึ้น") is taken by the announcements' faces as v278 took version 6: the check and every function
--    that tests the form, read from the database's own definitions.
-- 3. What is had for good (v276's `town_dressed`) may now be bought at Granny's ('shop') or won at the auction
--    ('auction', with the round it was won in and its number in that round: "#1/3, round 1").
-- 4. The shop: the catalog's `tailor` row (lib/town/tailor, written below from the code: a price each, and the season
--    four of them are sold in), `town_tailor_buy(wearable, request)`: coins out of the purse, the thing into the
--    wardrobe, never a bag slot; a request retried is answered once.
-- 5. The auction (lib/town/auction is the same rule for the page): `town_auctions`, a round to a row; `town_bids`, the
--    bids that stand (never more than the copies: a bid that is pushed out is paid back at once and taken away);
--    `town_auctions()` tells a member every round open, to come or closed in the last fortnight, with its bids and
--    names, and settles first any whose close has passed (nothing schedules it: whoever looks next settles it, and so
--    does a member's wardrobe, `town_dressed()`); `town_bid(round, amount, request)`. The bidder's purse and the purse of
--    whoever is pushed out are held in the order of their ids under the round's own row, so two bids never wait on each
--    other. The coins paid by the winners are gone from the town (no purse gets them), which is the point: the town must
--    not inflate.
--    The first round: the Midnight Bat Count (the outfit for men and the countess's gown for women, the top hat, a
--    bat-wing mask and a rose fascinator) and the Pumpkin Wisp Monarch (the outfit, its crown and pumpkin glasses), three copies each, a start of 8,000 coins (Codex's figure: the middle player held 8,431 that day; mine
--    had been 10,000), a step of 5% and never under 500, open from Tuesday 27 October 20:00 to Saturday 31 October
--    21:00 Bangkok, a bid in the last five minutes moving the close to five minutes after it, never past 22:00.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $$ begin
  if to_regclass('public.town_dressed') is null or to_regprocedure('town.dressed_of(uuid)') is null then raise exception 'Run v276 before v297'; end if;
  if to_regprocedure('public.town_zone_topic(text)') is null then raise exception 'Run v293 before v297'; end if;
end $$;

-- ── 1. the shop's chat ──────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.town_zone_topic(p_zone text)
returns text
language sql stable security invoker set search_path = ''
as $$
  select case when p_zone in ('town', 'farm', 'forest', 'mountain', 'cave', 'shop')
    then public.town_topic('main') || ':z:' || p_zone
    else null end;
$$;
revoke execute on function public.town_zone_topic(text) from public, anon;
grant execute on function public.town_zone_topic(text) to authenticated;

drop policy if exists town_maps_receive on realtime.messages;
create policy town_maps_receive on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and (select realtime.topic()) in (
      select (select public.town_topic('main')) || ':z:' || zone
        from unnest(array['town','farm','forest','mountain','cave','shop']) as zones(zone)
    )
  );

drop policy if exists town_maps_send on realtime.messages;
create policy town_maps_send on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and (select realtime.topic()) in (
      select (select public.town_topic('main')) || ':z:' || zone
        from unnest(array['town','farm','forest','mountain','cave','shop']) as zones(zone)
    )
  );

-- ── 2. a look of version 7 in the announcements' faces ──────────────────────────────────────────────────────────────

do $$
declare
  f regprocedure;
  d text;
begin
  if to_regclass('public.town_announcement_faces') is not null then
    alter table public.town_announcement_faces drop constraint if exists town_announcement_faces_look_check;
    alter table public.town_announcement_faces add constraint town_announcement_faces_look_check
      check (look ~ '^(5[0-9a-z]{7}|6[0-9a-z]{12}|7[0-9a-z]{17})$');
  end if;
  -- (a function already given the new form no longer holds the old text whole, so running this again changes nothing)
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'town') and p.prosrc like '%^(5[0-9a-z]{7}|6[0-9a-z]{12})$%' loop
    d := pg_get_functiondef(f);
    execute replace(d, '''^(5[0-9a-z]{7}|6[0-9a-z]{12})$''', '''^(5[0-9a-z]{7}|6[0-9a-z]{12}|7[0-9a-z]{17})$''');
  end loop;
end $$;

-- ── 3. what is had for good: bought, or won with its round and number ───────────────────────────────────────────────

alter table public.town_dressed drop constraint if exists town_dressed_how_check;
alter table public.town_dressed add constraint town_dressed_how_check check (how in ('dress', 'drop', 'shop', 'auction'));
alter table public.town_dressed add column if not exists run smallint check (run between 1 and 99);
alter table public.town_dressed add column if not exists edition smallint check (edition between 1 and 99);
create index if not exists town_dressed_won on public.town_dressed (wearable, run) where how = 'auction';

-- ── 4. Granny's rails ───────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists town.tailor_receipts (
  member_id uuid not null references public.profiles (id) on delete cascade,
  request uuid not null,
  wearable text not null,
  price integer not null check (price >= 0),
  at timestamptz not null default now(),
  primary key (member_id, request)
);
alter table town.tailor_receipts enable row level security;
revoke all on town.tailor_receipts from public, anon, authenticated;

-- What a thing costs at a moment, or null: not on her rails, or out of its season (Bangkok's day; a season may run
-- over the year's end). lib/town/tailor's inSeason.
create or replace function town.tailor_price(p_wearable text, p_now timestamptz)
returns integer language plpgsql stable set search_path = '' as $$
declare
  g jsonb := town.cat('tailor')->p_wearable;
  s jsonb;
  d date := (p_now at time zone 'Asia/Bangkok')::date;
  at_ integer; from_ integer; to_ integer;
begin
  if g is null or jsonb_typeof(g) <> 'object' then return null; end if;
  s := g->'season';
  if s is not null and jsonb_typeof(s) = 'array' then
    at_ := extract(month from d)::integer * 100 + extract(day from d)::integer;
    from_ := (s->>0)::integer * 100 + (s->>1)::integer;
    to_ := (s->>2)::integer * 100 + (s->>3)::integer;
    if (from_ <= to_ and (at_ < from_ or at_ > to_)) or (from_ > to_ and at_ < from_ and at_ > to_) then return null; end if;
  end if;
  return (g->>'price')::integer;
end;
$$;
revoke all on function town.tailor_price(text, timestamptz) from public, anon, authenticated;

create or replace function public.town_tailor_buy(p_wearable text, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  price integer;
  purse jsonb;
  receipt town.tailor_receipts%rowtype;
begin
  if p_wearable is null or p_wearable !~ '^[a-z]{1,24}$' or p_request is null then return town.answer(me, town.no('none')); end if;
  -- purse_of makes a new member's purse when there is none; the row is held before anything is read of it
  perform town.purse_of(me, true);
  perform 1 from public.town_purses p where p.member_id = me for update;
  select * into receipt from town.tailor_receipts r where r.member_id = me and r.request = p_request;
  if found then
    if receipt.wearable is distinct from p_wearable then return town.answer(me, town.no('none')); end if;
    return town.answer(me, jsonb_build_object('ok', true, 'wearable', receipt.wearable, 'price', receipt.price, 'repeated', true, 'dressed', town.dressed_of(me)));
  end if;
  price := town.tailor_price(p_wearable, now());
  if price is null then return town.answer(me, town.no(case when town.cat('tailor') ? p_wearable then 'season' else 'none' end)); end if;
  if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = p_wearable) then return town.answer(me, town.no('known')); end if;
  purse := town.purse_of(me, true);
  if (purse->>'coins')::numeric < price then return town.answer(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - price));
  insert into public.town_dressed (member_id, wearable, how) values (me, p_wearable, 'shop') on conflict (member_id, wearable) do nothing;
  insert into town.tailor_receipts (member_id, request, wearable, price) values (me, p_request, p_wearable, price);
  perform town.note(me, 'tailor', p_wearable, 1, -price, '{}'::jsonb);
  return town.answer(me, jsonb_build_object('ok', true, 'wearable', p_wearable, 'price', price, 'dressed', town.dressed_of(me)));
end;
$$;
revoke all on function public.town_tailor_buy(text, uuid) from public, anon;
grant execute on function public.town_tailor_buy(text, uuid) to authenticated;

-- ── 5. the auction ──────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.town_auctions (
  id bigint generated always as identity primary key,
  design text not null check (design ~ '^[a-z]{1,24}$'),
  wearables text[] not null check (cardinality(wearables) between 1 and 6),
  run smallint not null default 1 check (run between 1 and 99),
  copies smallint not null check (copies between 1 and 20),
  start_price integer not null check (start_price between 1 and 10000000),
  step_pct numeric not null default 5 check (step_pct > 0 and step_pct <= 50),
  step_min integer not null default 500 check (step_min between 1 and 1000000),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  hard_close timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at and hard_close >= closes_at),
  unique (design, run)
);
alter table public.town_auctions enable row level security;
revoke all on public.town_auctions from anon, authenticated;

create table if not exists public.town_bids (
  auction_id bigint not null references public.town_auctions (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  at timestamptz not null default now(),
  primary key (auction_id, member_id)
);
alter table public.town_bids enable row level security;
revoke all on public.town_bids from anon, authenticated;
create index if not exists town_bids_rank on public.town_bids (auction_id, amount desc, at);
create index if not exists town_bids_member on public.town_bids (member_id);

create table if not exists town.auction_receipts (
  member_id uuid not null references public.profiles (id) on delete cascade,
  request uuid not null,
  auction_id bigint not null,
  amount integer not null,
  at timestamptz not null default now(),
  primary key (member_id, request)
);
alter table town.auction_receipts enable row level security;
revoke all on town.auction_receipts from public, anon, authenticated;

-- a member's name as the town shows it to others (v268's way for the board's sellers)
create or replace function town.auction_name(p_member uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_member), '');
$$;
revoke all on function town.auction_name(uuid) from public, anon, authenticated;

-- the step a bid must beat a held one by: a share of it, never under the least, in fifties (lib/town/auction's stepOf)
create or replace function town.auction_step(p_price integer, p_pct numeric, p_least integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(p_least, (ceil(p_price * p_pct / 100 / 50) * 50)::integer);
$$;
revoke all on function town.auction_step(integer, numeric, integer) from public, anon, authenticated;

-- a bid paid back whole to its bidder and taken away (pushed out of the copies; or, never expected, standing past
-- them at the close). The caller holds the round's row and the purse.
create or replace function town.auction_pay_back(p_auction public.town_auctions, p_member uuid)
returns void language plpgsql set search_path = '' as $$
declare
  back integer;
  purse jsonb;
begin
  delete from public.town_bids b where b.auction_id = p_auction.id and b.member_id = p_member returning b.amount into back;
  if back is null then return; end if;
  purse := town.purse_of(p_member, true);
  perform town.keep_purse(p_member, purse || jsonb_build_object('coins', (purse->>'coins')::numeric + back));
  perform town.note(p_member, 'bid_back', p_auction.design, 1, back, jsonb_build_object('auction', p_auction.id, 'run', p_auction.run));
end;
$$;
revoke all on function town.auction_pay_back(public.town_auctions, uuid) from public, anon, authenticated;

-- A round whose close has passed, settled once: the top bids have their copies, best first numbered 1, 2, 3; the coins
-- they paid stay gone. Anything beyond the copies (never expected) is paid back.
create or replace function town.auction_settle(p_id bigint)
returns void language plpgsql set search_path = '' as $$
declare
  a public.town_auctions%rowtype;
  b record;
  k integer := 0;
begin
  select * into a from public.town_auctions x where x.id = p_id for update;
  if not found or a.settled_at is not null or now() < a.closes_at then return; end if;
  for b in select x.member_id, x.amount from public.town_bids x where x.auction_id = p_id order by x.amount desc, x.at asc loop
    k := k + 1;
    if k > a.copies then
      perform town.purse_of(b.member_id, true);
      perform 1 from public.town_purses p where p.member_id = b.member_id for update;
      perform town.auction_pay_back(a, b.member_id);
      continue;
    end if;
    insert into public.town_dressed (member_id, wearable, how, run, edition)
      select b.member_id, w, 'auction', a.run, k from unnest(a.wearables) as w
      on conflict (member_id, wearable) do nothing;
    perform town.note(b.member_id, 'auction_won', a.design, 1, 0, jsonb_build_object('auction', a.id, 'run', a.run, 'edition', k, 'paid', b.amount));
  end loop;
  update public.town_auctions x set settled_at = now() where x.id = p_id;
end;
$$;
revoke all on function town.auction_settle(bigint) from public, anon, authenticated;

create or replace function town.auctions_due()
returns void language plpgsql set search_path = '' as $$
declare
  i bigint;
begin
  for i in select a.id from public.town_auctions a where a.settled_at is null and a.closes_at <= now() order by a.id loop
    perform town.auction_settle(i);
  end loop;
end;
$$;
revoke all on function town.auctions_due() from public, anon, authenticated;

-- A round as a member sees it: its terms and times (ms), the bids that stand with the bidders' names (whose is
-- whose only by `mine`), whether this member has the design already, and once settled who has the copies.
create or replace function town.auction_board(p_me uuid, p_id bigint)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'design', a.design, 'wearables', to_jsonb(a.wearables), 'run', a.run, 'copies', a.copies,
    'start', a.start_price, 'stepPct', a.step_pct, 'stepMin', a.step_min,
    'opensAt', (extract(epoch from a.opens_at) * 1000)::bigint, 'closesAt', (extract(epoch from a.closes_at) * 1000)::bigint,
    'hardClose', (extract(epoch from a.hard_close) * 1000)::bigint,
    'settledAt', case when a.settled_at is null then null else (extract(epoch from a.settled_at) * 1000)::bigint end,
    'bids', coalesce((select jsonb_agg(jsonb_build_object('name', town.auction_name(b.member_id), 'amount', b.amount,
               'at', (extract(epoch from b.at) * 1000)::bigint, 'mine', b.member_id = p_me) order by b.amount desc, b.at asc)
             from public.town_bids b where b.auction_id = a.id), '[]'::jsonb),
    'had', exists (select 1 from public.town_dressed d where d.member_id = p_me and d.wearable = a.wearables[1]),
    'owners', coalesce((select jsonb_agg(jsonb_build_object('member', d.member_id, 'name', town.auction_name(d.member_id), 'edition', d.edition) order by d.edition)
             from public.town_dressed d where a.settled_at is not null and d.wearable = a.wearables[1] and d.how = 'auction' and d.run = a.run), '[]'::jsonb))
  from public.town_auctions a where a.id = p_id;
$$;
revoke all on function town.auction_board(uuid, bigint) from public, anon, authenticated;

create or replace function public.town_auctions()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
begin
  perform town.auctions_due();
  return jsonb_build_object('now', (extract(epoch from now()) * 1000)::bigint, 'auctions', coalesce((
    select jsonb_agg(town.auction_board(me, a.id) order by a.closes_at, a.id) from public.town_auctions a
     where a.settled_at is null or a.settled_at > now() - interval '14 days'), '[]'::jsonb));
end;
$$;
revoke all on function public.town_auctions() from public, anon;
grant execute on function public.town_auctions() to authenticated;

create or replace function public.town_bid(p_auction bigint, p_amount integer, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  a public.town_auctions%rowtype;
  receipt town.auction_receipts%rowtype;
  mine integer;
  others integer;
  cut integer;
  least_ integer;
  pay integer;
  out_ uuid;
  who uuid;
  purse jsonb;
begin
  if p_auction is null or p_amount is null or p_request is null or p_amount <= 0 or p_amount > 100000000 then return town.answer(me, town.no('none')); end if;
  perform town.auctions_due();
  -- the round's row first: every bid on it waits here, so the purses below are held in one order only
  select * into a from public.town_auctions x where x.id = p_auction for update;
  if not found then return town.answer(me, town.no('none')); end if;
  select * into receipt from town.auction_receipts r where r.member_id = me and r.request = p_request;
  if found then
    if receipt.auction_id is distinct from p_auction or receipt.amount is distinct from p_amount then return town.answer(me, town.no('none')); end if;
    return town.answer(me, jsonb_build_object('ok', true, 'repeated', true, 'auction', town.auction_board(me, p_auction)));
  end if;
  if a.settled_at is not null or now() < a.opens_at or now() >= a.closes_at then
    return town.answer(me, town.no('closed') || jsonb_build_object('auction', town.auction_board(me, p_auction)));
  end if;
  if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = a.wearables[1]) then return town.answer(me, town.no('known')); end if;
  select b.amount into mine from public.town_bids b where b.auction_id = a.id and b.member_id = me;
  mine := coalesce(mine, 0);
  select count(*) into others from public.town_bids b where b.auction_id = a.id and b.member_id <> me;
  if others < a.copies then
    least_ := a.start_price;
  else
    select b.amount, b.member_id into cut, out_ from public.town_bids b where b.auction_id = a.id and b.member_id <> me
      order by b.amount desc, b.at asc offset a.copies - 1 limit 1;
    least_ := cut + town.auction_step(cut, a.step_pct, a.step_min);
  end if;
  least_ := greatest(least_, mine + 1);
  if p_amount < least_ then
    return town.answer(me, town.no('low') || jsonb_build_object('least', least_, 'auction', town.auction_board(me, p_auction)));
  end if;
  pay := p_amount - mine;
  -- the purses this bid touches (the bidder's, and the one it pushes out of the copies), held in the order of their ids
  for who in select x.m from (select me as m union select out_ where out_ is not null) x order by x.m loop
    perform town.purse_of(who, true);
    perform 1 from public.town_purses p where p.member_id = who for update;
  end loop;
  purse := town.purse_of(me, true);
  if (purse->>'coins')::numeric < pay then return town.answer(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - pay));
  insert into public.town_bids (auction_id, member_id, amount, at) values (a.id, me, p_amount, now())
    on conflict (auction_id, member_id) do update set amount = excluded.amount, at = excluded.at;
  if out_ is not null then perform town.auction_pay_back(a, out_); end if;
  -- a bid in the last five minutes moves the close to five minutes after it, never past the hard close
  if now() >= a.closes_at - interval '5 minutes' then
    update public.town_auctions x set closes_at = least(a.hard_close, greatest(a.closes_at, now() + interval '5 minutes')) where x.id = a.id;
  end if;
  insert into town.auction_receipts (member_id, request, auction_id, amount) values (me, p_request, a.id, p_amount);
  perform town.note(me, 'bid', a.design, 1, -pay, jsonb_build_object('auction', a.id, 'run', a.run, 'amount', p_amount));
  return town.answer(me, jsonb_build_object('ok', true, 'pay', pay, 'auction', town.auction_board(me, p_auction)));
end;
$$;
revoke all on function public.town_bid(bigint, integer, uuid) from public, anon;
grant execute on function public.town_bid(bigint, integer, uuid) to authenticated;

-- A member's wardrobe (v276's), now also settling any round whose close has passed before it answers, so a winner
-- has their outfit whether or not anybody has looked at the board, and telling which of their things are limited
-- (a wearable: [the round, its number]).
create or replace function public.town_dressed()
returns jsonb language plpgsql volatile security definer set search_path = public as $function$
declare
  me uuid := town.member();
begin
  perform town.auctions_due();
  return jsonb_build_object('dressed', town.dressed_of(me), 'limited', coalesce((
    select jsonb_object_agg(d.wearable, jsonb_build_array(d.run, d.edition)) from public.town_dressed d
     where d.member_id = me and d.how = 'auction'), '{}'::jsonb));
end;
$function$;
revoke execute on function public.town_dressed() from public, anon;
grant execute on function public.town_dressed() to authenticated;

-- The first round: Halloween 2026.
insert into public.town_auctions (design, wearables, run, copies, start_price, step_pct, step_min, opens_at, closes_at, hard_close) values
  ('count', array['count', 'counthat', 'batmask', 'rosefascinator'], 1, 3, 8000, 5, 500, '2026-10-27 20:00+07', '2026-10-31 21:00+07', '2026-10-31 22:00+07'),
  ('pumpkin', array['pumpkin', 'pumpkincrown', 'pumpkinglasses'], 1, 3, 8000, 5, 500, '2026-10-27 20:00+07', '2026-10-31 21:00+07', '2026-10-31 22:00+07')
on conflict (design, run) do nothing;

-- <catalog:v297> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('tailor', $town${
    "knit": {"price":1200},
    "beach": {"price":600},
    "party": {"price":4500},
    "aviator": {"price":3000},
    "track": {"price":500},
    "academy": {"price":2500},
    "pyjamas": {"price":400},
    "ranch": {"price":1500},
    "bard": {"price":2000},
    "skeleton": {"price":900,"season":[10,1,11,2]},
    "tophat": {"price":3500},
    "cowboy": {"price":1200},
    "newsboy": {"price":500},
    "sunhat": {"price":800},
    "fedora": {"price":1500},
    "bearhat": {"price":700},
    "aviatorcap": {"price":2000},
    "tricorn": {"price":2500},
    "ghostcap": {"price":600,"season":[10,1,11,2]},
    "heartshades": {"price":900},
    "cateye": {"price":1200},
    "eyepatch": {"price":400},
    "masquerade": {"price":3000},
    "starshades": {"price":700},
    "halfmoon": {"price":500},
    "pearls": {"price":6000},
    "jabot": {"price":2500},
    "headphones": {"price":1800},
    "camera": {"price":3500},
    "pocketwatch": {"price":2000},
    "cord": {"price":300},
    "batpendant": {"price":500,"season":[10,1,11,2]},
    "bearears": {"price":800},
    "foxears": {"price":1000},
    "halo": {"price":5000},
    "antennae": {"price":600},
    "cherry": {"price":250},
    "fanpin": {"price":1500},
    "hibiscus": {"price":500},
    "batclip": {"price":400,"season":[10,1,11,2]}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v297>

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select public.town_zone_topic('shop') is not null;                                     -- true when asked as a member
--   select count(*) from pg_policies where schemaname = 'realtime' and policyname in ('town_maps_receive', 'town_maps_send')
--     and (coalesce(qual, '') || coalesce(with_check, '')) like '%shop%';                    -- 2
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'town_announcement_faces_look_check';
--                                                    -- CHECK ((look ~ '^(5[0-9a-z]{7}|6[0-9a-z]{12}|7[0-9a-z]{17})$'::text))
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'town_dressed_how_check';
--                                                    -- CHECK ((how = ANY (ARRAY['dress'::text, 'drop'::text, 'shop'::text, 'auction'::text])))
--   select count(*) from public.town_catalog c, jsonb_object_keys(c.data) where c.key = 'tailor';    -- 40
--   select design, run, copies, start_price, closes_at at time zone 'Asia/Bangkok' from public.town_auctions order by id;
--                                                    -- count 1 3 8000 2026-10-31 21:00, pumpkin 1 3 8000 2026-10-31 21:00
--   select has_function_privilege('anon', 'public.town_bid(bigint,integer,uuid)', 'execute');            -- false
--   select has_table_privilege('authenticated', 'public.town_bids', 'select');                           -- false
