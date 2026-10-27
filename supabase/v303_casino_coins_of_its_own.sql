-- v303 — Casino Coin: the casino's own coins (2026-10-27)
-- Run once in the Supabase SQL editor, after v299 (and v300–v302, which it does not touch). Running it again is safe.
-- The page goes out first: until this file runs the casino is as v299 left it (a spin takes Popoto coins), and the page
-- shows no exchange.
--
-- The owner, 2026-10-27, trying the casino: "ขาด function เปลี่ยน popoto coin เป็น casino coin กับ แจก casino coin ฟรี
-- แล้วก็มี มีสุ่ม casino coin คืนให้บ้างด้วย ทำได้เลย".
--
-- 1. A spin takes Casino Coins (`casino_live_accounts.chips`), no longer the town purse's Popoto coins. A member changes
--    Popoto coins into Casino Coins at the counter (`casino_live_buy`), at `casino_live_settings.chip_rate` Popoto coins
--    a Casino Coin (1 to begin with, so the price of a spin is as it was). One way only: Casino Coins are never changed
--    back, so nothing the casino gives (the free coins, the coins back) can reach the town's money (the town must not
--    inflate). Each change is kept in `casino_live_chip_moves`, by its request, so a retry changes nothing twice.
-- 2. Free coins: `casino_live_settings.free_chips` (100 to begin with: a spin a day) once a town day (from 05:00 Bangkok,
--    town.day_of) a member, taken at the counter (`casino_live_free`); 0 turns it off. Set in the desk.
-- 3. Coins back by chance: the pair (the first two reels alike, v299) pays Casino Coins now. How often and how much is
--    the desk's, as every prize is (left unused on the live desk; the owner asked for it: set after this file runs).
-- 4. Both are let in only when a spin is (everybody, or the admins in their trial). What the admins change, take and
--    spin in their trial is a test like their spins and is undone by `casino_live_wipe_tests` with them: the Popoto
--    coins changed are given back and the Casino Coins taken away. A spin of the trial from before this file (paid in
--    Popoto coins) is still given back in Popoto coins; one after it (its trail says `chips`) in Casino Coins.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('public.casino_live_wipe_tests()') is null or to_regprocedure('public.casino_live_access(text)') is null
    then raise exception 'Run v299 before v303'; end if;
  if to_regprocedure('town.day_of(bigint)') is null or to_regprocedure('town.now_ms()') is null then raise exception 'the town''s day (town.day_of) is missing'; end if;
end $$;

-- ── 1. the coins, the rate, the free coins ──────────────────────────────────────────────────────────────────────────

alter table public.casino_live_settings add column if not exists chip_rate integer not null default 1;
alter table public.casino_live_settings add column if not exists free_chips integer not null default 100;
alter table public.casino_live_settings drop constraint if exists casino_live_settings_chips_check;
alter table public.casino_live_settings add constraint casino_live_settings_chips_check check (chip_rate between 1 and 10000 and free_chips between 0 and 100000);
alter table public.casino_live_accounts add column if not exists chips bigint not null default 0;
alter table public.casino_live_accounts drop constraint if exists casino_live_accounts_chips_check;
alter table public.casino_live_accounts add constraint casino_live_accounts_chips_check check (chips >= 0);

create table if not exists public.casino_live_chip_moves (
  request uuid primary key,
  user_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('buy', 'free')),
  chips integer not null check (chips between 1 and 1000000),
  -- (the Popoto coins a change took; none for free coins)
  coins bigint not null default 0 check (coins >= 0),
  -- (the town day of free coins: one a member a day)
  day integer,
  test boolean not null default false,
  at timestamptz not null default now(),
  check ((kind = 'free') = (day is not null))
);
create unique index if not exists casino_live_chip_moves_free_day on public.casino_live_chip_moves (user_id, day) where kind = 'free';
create index if not exists casino_live_chip_moves_tests on public.casino_live_chip_moves (user_id) where test;
alter table public.casino_live_chip_moves enable row level security;
revoke all on public.casino_live_chip_moves from public, anon, authenticated;

-- ── the state a page reads ──────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_state(p_receipt_page integer default 0, p_history boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_member(); admin_ boolean := casino.live_admin_allowed(); result jsonb;
begin
  if p_receipt_page is null or p_receipt_page not between 0 and 100000 then raise exception 'Invalid page'; end if;
  select jsonb_build_object(
    'user_id', me, 'admin', admin_, 'settings', (select to_jsonb(s) from public.casino_live_settings s where id = 1),
    'prizes', (select jsonb_agg(to_jsonb(p) order by array_position(array['seven','cherry','gold','popoto','evercold','pair'], p.id)) from public.casino_live_prizes p),
    'account', jsonb_build_object('coins', coalesce((select p.coins from public.town_purses p where p.member_id = me), 0),
      'spins', coalesce((select a.spins from public.casino_live_accounts a where a.user_id = me), 0),
      'chips', coalesce((select a.chips from public.casino_live_accounts a where a.user_id = me), 0),
      'free_today', exists (select 1 from public.casino_live_chip_moves m where m.user_id = me and m.kind = 'free' and m.day = town.day_of(town.now_ms()))),
    'spins', (select coalesce(jsonb_agg(to_jsonb(x) - 'trail' order by x.created_at desc), '[]') from
      (select * from public.casino_live_spins order by created_at desc, id desc limit 30) x),
    'receipts', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from
      (select * from public.casino_live_receipts where user_id = me and
        case when p_history then status in ('fulfilled', 'cancelled') else status in ('pending', 'processing') end
        order by created_at desc, id desc limit 21 offset p_receipt_page * 20) x),
    'queue', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]') from
      (select * from public.casino_live_receipts where admin_ and status in ('pending', 'processing') order by created_at, id limit 100) x),
    'winners', (select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]') from
      (select x.id spin_id, x.user_id, x.player_name, x.prize, x.test, x.created_at,
          (x.trail ->> 'win')::bigint win_id, (x.trail ->> 'drop')::bigint drop_id, pw.claimed_at, pw.delivered_at
        from public.casino_live_spins x left join public.prize_wins pw on pw.id = (x.trail ->> 'win')::bigint
        where admin_ and x.prize is not null and x.prize ->> 'kind' in ('gil', 'physical')
        order by x.created_at desc limit 50) w),
    -- (the trial's coins changed and taken are wiped with its spins: a trial of them alone is still something to wipe)
    'tests', (select count(*) from public.casino_live_spins where admin_ and test) + (select count(*) from public.casino_live_chip_moves where admin_ and test),
    'server_now', clock_timestamp(),
    'paid_gil', (select coalesce(sum((prize ->> 'amount')::bigint) filter (where prize ->> 'kind' = 'gil'), 0)
      from public.casino_live_spins where admin_ and not test and prize is not null)
  ) into result;
  return result;
end $$;

-- ── a spin, paid in Casino Coins ────────────────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_spin(p_request uuid, p_machine integer, p_force text default null, p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts;
  old public.casino_live_spins; p public.casino_live_prizes; won public.casino_live_prizes;
  prize_ jsonb; reels_ jsonb; n numeric; edge numeric := 0; total_ integer; sample_ integer;
  now_ timestamptz := clock_timestamp(); name_ text; first_ text;
  admin_ boolean := casino.live_admin_allowed(); test_ boolean; trail_ jsonb := '{}'::jsonb;
  win_ bigint; note_ bigint; char_ bigint; before_ bigint; tier_ text;
begin
  if p_request is null or p_machine is null or p_machine not between 1 and 5 or
    (p_force is not null and p_force not in ('miss', 'seven', 'cherry', 'gold', 'popoto', 'evercold', 'pair')) then raise exception 'Invalid spin'; end if;
  -- All five machines share one short lock for budget, stock, and idempotency.
  select * into s from public.casino_live_settings where id = 1 for update;
  now_ := clock_timestamp();
  select * into old from public.casino_live_spins where id = p_request;
  if found then
    if old.user_id <> me then raise exception 'Spin belongs to another player' using errcode = '42501'; end if;
    return to_jsonb(old) - 'trail';
  end if;
  if p_revision is null or p_revision <> s.revision then raise exception 'Settings changed; refresh before spinning' using errcode = '40001'; end if;
  -- Everybody within the event's hours; or, while only the admins are let in, an admin at any hour (a test).
  test_ := s.access = 'admins';
  if test_ then
    if not admin_ then raise exception 'Casino paused or outside event hours'; end if;
  elsif s.access <> 'everyone' or (s.starts_at is not null and now_ < s.starts_at) or (s.ends_at is not null and now_ >= s.ends_at) then
    raise exception 'Casino paused or outside event hours';
  end if;
  if p_force is not null and not test_ then raise exception 'Forced results are only for the admins'' trial'; end if;
  if exists (select 1 from public.casino_live_spins where machine = p_machine and reveal_at > now_) then raise exception 'Machine occupied'; end if;
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id = me for update;
  if a.available_at > now_ then raise exception 'Wait for your current spin'; end if;
  if a.spins >= s.per_player then raise exception 'Spin allowance used'; end if;
  if a.chips < s.price then raise exception 'Not enough Casino coins'; end if;

  if s.mode = 'pool' then
    if p_force is not null then raise exception 'Forced results are only available in weighted rehearsal'; end if;
    if s.pool_draws >= s.pool_size then raise exception 'Prize pool finished'; end if;
    select coalesce(sum(stock - issued), 0)::integer into total_ from public.casino_live_prizes where active;
    if total_ > s.pool_size - s.pool_draws then raise exception 'Pool prizes exceed remaining draws'; end if;
    sample_ := floor(casino.unit() * (s.pool_size - s.pool_draws))::integer;
    edge := 0;
    for p in select * from public.casino_live_prizes where active order by id loop
      edge := edge + (p.stock - p.issued);
      if sample_ < edge then won := p; exit; end if;
    end loop;
  else
    n := casino.unit() * 100;
    for p in select * from public.casino_live_prizes where active and issued < stock and
      (kind <> 'gil' or amount <= s.budget - s.reserved) order by id loop
      edge := edge + p.chance;
      if n < edge then won := p; exit; end if;
    end loop;
  end if;
  if p_force is not null then
    won := null;
    if p_force <> 'miss' then select * into won from public.casino_live_prizes where id = p_force and active; end if;
  end if;
  if won.id is not null then
    if won.issued >= won.stock then raise exception 'Prize stock exhausted'; end if;
    if won.kind = 'gil' and won.amount > s.budget - s.reserved then raise exception 'Prize exceeds remaining Gil budget'; end if;
    update public.casino_live_prizes set issued = issued + 1 where id = won.id;
    prize_ := jsonb_build_object('id', won.id, 'name', won.name, 'kind', won.kind, 'amount', won.amount, 'announce', won.announce, 'test', test_);
  end if;
  -- The reels: a symbol's prize four of it; the pair the first two alike and neither of the others; a miss the first two unlike.
  first_ := casino.reel();
  if won.id is not null and won.id <> 'pair' then reels_ := jsonb_build_array(won.id, won.id, won.id, won.id);
  elsif won.id = 'pair' then reels_ := jsonb_build_array(first_, first_, casino.reel(first_), casino.reel(first_));
  else reels_ := jsonb_build_array(first_, casino.reel(first_), casino.reel(), casino.reel());
  end if;
  select coalesce(character_name, display_name, discord_username, 'Tester'), character_id into name_, char_ from public.profiles where id = me;

  -- Where the win goes: a thing to hand over into the site's prizes (the winner's bell, the 1-1 thread); Gil into the
  -- wallet; Casino Coins (the pair's) into the account below. What was written is kept, so that a test is wiped to the row.
  if won.kind = 'physical' then
    insert into public.prize_wins (prize_id, winner, character_id, prize_name, prize_detail, prize_color, prize_tier, prize_fx, draw)
      values (null, me, char_, won.name, 'Popoto Casino · เครื่อง ' || p_machine, '#d9a441', 'ultra', 'tier', 'casino')
      returning id into win_;
    insert into public.notifications (recipient, kind, actor, actor_name, body) values (me, 'prize_win', null, null, win_::text)
      returning id into note_;
    trail_ := jsonb_build_object('win', win_, 'notes', jsonb_build_array(note_));
  elsif won.kind = 'gil' then
    tier_ := case when won.amount >= 5000000 then 'ultra' when won.amount >= 1000000 then 'super' else 'rare' end;
    select coalesce(max(id), 0) into before_ from public.notifications where recipient = me;
    perform public.credit_wallet(me, won.amount::integer, null, won.name, '#d9a441', tier_, 'tier', null);
    -- (`out`: the newest of the winner's withdrawals seen once credit_wallet holds the wallet's row: v299's wipe asks it)
    trail_ := jsonb_build_object('drop', currval(pg_get_serial_sequence('public.wallet_drops', 'id')),
      'out', (select coalesce(max(o.id), 0) from public.prize_wins o
        where o.winner = me and o.draw = 'give' and o.prize_name = 'เงินสะสม' and o.gil_amount is not null),
      'notes', (select coalesce(jsonb_agg(id order by id), '[]') from public.notifications
        where recipient = me and id > before_ and kind in ('wallet_drop', 'wallet_full')));
  end if;
  if s.mode = 'pool' then trail_ := trail_ || '{"pool": true}'; end if;
  -- (paid in Casino Coins: the wipe gives a test back in them, and one from before v303 in Popoto coins)
  trail_ := trail_ || '{"chips": true}';

  insert into public.casino_live_spins (id, user_id, player_name, machine, revision, price, reels, prize, forced, created_at, reveal_at, test, trail)
    values (p_request, me, name_, p_machine, s.revision, s.price, reels_, prize_, p_force is not null, now_, now_ + interval '3.6 seconds', test_, trail_)
    returning * into old;
  update public.casino_live_accounts set spins = spins + 1, available_at = old.reveal_at, updated_at = now_,
    chips = chips - s.price + case when won.kind = 'coin' then won.amount else 0 end where user_id = me;
  update public.casino_live_settings set spins = spins + 1,
    pool_draws = pool_draws + case when mode = 'pool' then 1 else 0 end,
    reserved = reserved + case when won.kind = 'gil' then won.amount else 0 end where id = 1;
  -- A prize marked to be told is told to the whole town as the reels stop; a win in the admins' trial never is.
  if won.id is not null and won.announce and not test_ then
    perform town.announce(me, 'casino', won.name, 0, 'casino:' || p_request, false);
    update public.town_announcements set at = old.reveal_at where event_key = 'casino:' || p_request;
  end if;
  perform casino.hint('spin', to_jsonb(old) - 'trail');
  return to_jsonb(old) - 'trail';
end $$;

-- ── Popoto coins into Casino Coins, and the free ones ──────────────────────────────────────────────────────────────

/** Whether I may change and take coins now: whenever I may spin, the event's hours aside. */
create or replace function casino.chips_let_in(s public.casino_live_settings)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.access = 'everyone' or (s.access = 'admins' and casino.live_admin_allowed())
$$;

create or replace function public.casino_live_buy(p_request uuid, p_chips integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts; old public.casino_live_chip_moves;
  purse_ jsonb; cost_ bigint; coins_ numeric;
begin
  if p_request is null or p_chips is null or p_chips not between 1 and 1000000 then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
  -- (the settings' row held as a spin holds it, shared: a wipe of the trial under way is waited for)
  select * into s from public.casino_live_settings where id = 1 for share;
  -- (my account's row first, then the purse, as the wipe takes them: a retry of this request waits here and finds it)
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id = me for update;
  select * into old from public.casino_live_chip_moves where request = p_request;
  if found then
    if old.user_id <> me or old.kind <> 'buy' or old.chips <> p_chips then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
    return jsonb_build_object('ok', true, 'chips', a.chips, 'coins', coalesce((select w.coins from public.town_purses w where w.member_id = me), 0));
  end if;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  cost_ := p_chips::bigint * s.chip_rate;
  -- the town's purse locking contract (as a spin held it before v303): nothing else in the purse moves
  perform town.purse_of(me, true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id = me for update;
  purse_ := town.purse_of(me, true);
  coins_ := (purse_ ->> 'coins')::numeric;
  if coins_ < cost_ then return jsonb_build_object('ok', false, 'why', 'coins', 'chips', a.chips, 'coins', coins_); end if;
  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb(coins_ - cost_)));
  update public.casino_live_accounts set chips = chips + p_chips, updated_at = clock_timestamp() where user_id = me;
  insert into public.casino_live_chip_moves (request, user_id, kind, chips, coins, test) values (p_request, me, 'buy', p_chips, cost_, s.access = 'admins');
  return jsonb_build_object('ok', true, 'chips', a.chips + p_chips, 'coins', coins_ - cost_);
end $$;

create or replace function public.casino_live_free()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts; day_ integer := town.day_of(town.now_ms());
begin
  -- (the settings' row held as a spin holds it, shared: a wipe of the trial under way is waited for)
  select * into s from public.casino_live_settings where id = 1 for share;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if s.free_chips < 1 then return jsonb_build_object('ok', false, 'why', 'off'); end if;
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id = me for update;
  if exists (select 1 from public.casino_live_chip_moves where user_id = me and kind = 'free' and day = day_) then
    return jsonb_build_object('ok', false, 'why', 'taken', 'chips', a.chips);
  end if;
  update public.casino_live_accounts set chips = chips + s.free_chips, updated_at = clock_timestamp() where user_id = me;
  insert into public.casino_live_chip_moves (request, user_id, kind, chips, day, test) values (gen_random_uuid(), me, 'free', s.free_chips, day_, s.access = 'admins');
  return jsonb_build_object('ok', true, 'chips', a.chips + s.free_chips, 'given', s.free_chips);
end $$;

-- ── the desk's save: the rate and the free coins too ────────────────────────────────────────────────────────────────

create or replace function public.casino_live_save(p_revision bigint, p_doc jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); s public.casino_live_settings; x jsonb;
  total numeric := 0; future_ bigint := 0; available_ integer := 0; used_ integer; ids_ text[] := '{}'; access_ text; back_ numeric;
  rate_ integer; free_ integer;
begin
  select * into s from public.casino_live_settings where id = 1 for update;
  if p_revision is null or p_revision <> s.revision then raise exception 'Another admin changed settings; reload first' using errcode = '40001'; end if;
  if p_doc is null or jsonb_typeof(p_doc -> 'prizes') <> 'array' or jsonb_array_length(p_doc -> 'prizes') <> 6 then raise exception 'Six prizes required'; end if;
  access_ := coalesce(p_doc ->> 'access', case when (p_doc ->> 'open')::boolean then 'everyone' else 'closed' end);
  -- (a desk from before v303 sends neither: they stay as they are)
  rate_ := coalesce((p_doc ->> 'chip_rate')::integer, s.chip_rate); free_ := coalesce((p_doc ->> 'free_chips')::integer, s.free_chips);
  if not (p_doc ?& array['title', 'mode', 'price', 'per_player', 'budget', 'pool_size']) or access_ not in ('closed', 'admins', 'everyone') or
    length(p_doc ->> 'title') not between 1 and 100 or p_doc ->> 'mode' not in ('weighted', 'pool') or
    rate_ not between 1 and 10000 or free_ not between 0 and 100000 or
    (p_doc ->> 'budget')::bigint < s.reserved or (p_doc ->> 'pool_size')::integer < s.pool_draws then raise exception 'Invalid settings or budget below committed rewards'; end if;
  for x in select value from jsonb_array_elements(p_doc -> 'prizes') loop
    if not (x ?& array['id', 'name', 'kind', 'amount', 'chance', 'stock', 'announce', 'active']) or
      x ->> 'id' not in ('seven', 'cherry', 'gold', 'popoto', 'evercold', 'pair') or x ->> 'id' = any (ids_) or
      (x ->> 'chance')::numeric not between 0 and 100 or (x ->> 'id' = 'pair' and x ->> 'kind' <> 'coin') then raise exception 'Invalid prize'; end if;
    ids_ := array_append(ids_, x ->> 'id');
    select issued into used_ from public.casino_live_prizes where id = x ->> 'id';
    if (x ->> 'stock')::integer < used_ then raise exception 'Stock below already issued rewards'; end if;
    if (x ->> 'active')::boolean then
      total := total + (x ->> 'chance')::numeric; available_ := available_ + (x ->> 'stock')::integer - used_;
      if x ->> 'kind' = 'gil' then future_ := future_ + ((x ->> 'stock')::bigint - used_) * (x ->> 'amount')::bigint; end if;
    end if;
    update public.casino_live_prizes set name = x ->> 'name', kind = x ->> 'kind', amount = (x ->> 'amount')::bigint,
      chance = (x ->> 'chance')::numeric, stock = (x ->> 'stock')::integer, announce = (x ->> 'announce')::boolean, active = (x ->> 'active')::boolean
      where id = x ->> 'id';
  end loop;
  select coalesce(sum(chance), 0) into total from public.casino_live_prizes where active;
  if total > 100 then raise exception 'Prize chances exceed 100 percent'; end if;
  if p_doc ->> 'mode' = 'pool' and (available_ > (p_doc ->> 'pool_size')::integer - s.pool_draws or
    future_ > (p_doc ->> 'budget')::bigint - s.reserved) then raise exception 'Pool exceeds remaining draws or Gil budget'; end if;
  -- Coins paid back must average under the price: else the free coins alone would spin for ever.
  if p_doc ->> 'mode' = 'pool' then
    select coalesce(sum((stock - issued)::numeric * amount), 0) / greatest(1, (p_doc ->> 'pool_size')::integer - s.pool_draws) into back_
      from public.casino_live_prizes where active and kind = 'coin';
  else
    select coalesce(sum(chance / 100 * amount), 0) into back_ from public.casino_live_prizes where active and kind = 'coin';
  end if;
  if back_ >= (p_doc ->> 'price')::integer then raise exception 'Coins paid back must average under the price'; end if;
  insert into public.casino_live_audit (actor, action, detail) values (me, 'settings', jsonb_build_object('before', to_jsonb(s), 'prizes', p_doc));
  update public.casino_live_settings set title = p_doc ->> 'title', access = access_, open = (access_ = 'everyone'), mode = p_doc ->> 'mode',
    price = (p_doc ->> 'price')::integer, per_player = (p_doc ->> 'per_player')::integer, budget = (p_doc ->> 'budget')::bigint,
    pool_size = (p_doc ->> 'pool_size')::integer, starts_at = nullif(p_doc ->> 'starts_at', '')::timestamptz,
    ends_at = nullif(p_doc ->> 'ends_at', '')::timestamptz, chip_rate = rate_, free_chips = free_,
    revision = revision + 1, updated_at = clock_timestamp(), updated_by = me where id = 1;
  perform casino.hint('changed', '{}'::jsonb);
  return public.casino_live_state();
end $$;

-- ── the admins' trial, wiped: its coins changed and taken too ───────────────────────────────────────────────────────

create or replace function public.casino_live_wipe_tests()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); x record; purse_ jsonb; spins_ integer; moves_ integer; wins_ bigint[]; drops_ bigint[]; notes_ bigint[];
  out_ bigint := 0; have_ numeric; need_ numeric; short_ numeric; refund_ numeric; kept_ numeric := 0;
begin
  perform 1 from public.casino_live_settings where id = 1 for update;
  select count(*) into spins_ from public.casino_live_spins where test;
  select count(*) into moves_ from public.casino_live_chip_moves where test;
  if spins_ = 0 and moves_ = 0 then return jsonb_build_object('spins', 0); end if;
  -- (each tester's account first, then the purse: the order a change of coins takes them)
  perform 1 from public.casino_live_accounts where user_id in (select user_id from public.casino_live_spins where test
    union select user_id from public.casino_live_chip_moves where test) order by user_id for update;
  -- what each tester spent and was paid back, put back: in Popoto coins for a spin from before v303, in Casino Coins
  -- for one since; the Casino Coins changed and taken in the trial taken away, the Popoto coins changed given back.
  -- Trial coins spent once the casino was open (it was opened before the wipe) are not there to take back: the free
  -- ones count as spent first, and only what is left of those changed is given back in Popoto coins (kept_: the rest).
  for x in select t.user_id, sum(t.coins)::numeric coins, sum(t.back)::numeric back, sum(t.bought)::numeric bought,
      sum(t.paid)::numeric paid, sum(t.free)::numeric free, sum(t.n)::integer n from (
      select user_id,
          case when trail ? 'chips' then 0 else price - case when prize ->> 'kind' = 'coin' then (prize ->> 'amount')::numeric else 0 end end coins,
          case when trail ? 'chips' then price - case when prize ->> 'kind' = 'coin' then (prize ->> 'amount')::numeric else 0 end else 0 end back,
          0::numeric bought, 0::numeric paid, 0::numeric free, 1 n
        from public.casino_live_spins where test
      union all
      select user_id, 0, 0, case when kind = 'buy' then chips else 0 end, coins, case when kind = 'free' then chips else 0 end, 0
        from public.casino_live_chip_moves where test) t
    group by t.user_id order by t.user_id loop
    select chips into have_ from public.casino_live_accounts where user_id = x.user_id;
    need_ := x.bought + x.free - x.back;
    short_ := greatest(0, need_ - coalesce(have_, 0));
    refund_ := x.paid;
    if short_ > 0 and x.bought > 0 then refund_ := greatest(0, x.paid - ceil(greatest(0, short_ - x.free) * x.paid / x.bought)); end if;
    kept_ := kept_ + x.paid - refund_;
    if x.coins + refund_ <> 0 then
      perform town.purse_of(x.user_id, true);
      perform 1 from public.town_purses wallet_ where wallet_.member_id = x.user_id for update;
      purse_ := town.purse_of(x.user_id, true);
      perform town.keep_purse(x.user_id, jsonb_set(purse_, '{coins}', to_jsonb(greatest(0, (purse_ ->> 'coins')::numeric + x.coins + refund_))));
    end if;
    update public.casino_live_accounts set spins = greatest(0, spins - x.n), chips = greatest(0, chips - need_), updated_at = clock_timestamp()
      where user_id = x.user_id;
  end loop;
  delete from public.casino_live_chip_moves where test;
  if spins_ = 0 then
    insert into public.casino_live_audit (actor, action, detail) values (me, 'wipe tests', jsonb_build_object('spins', 0, 'moves', moves_, 'kept', kept_));
    perform casino.hint('changed', '{}'::jsonb);
    return jsonb_build_object('spins', 0, 'moves', moves_, 'kept', kept_, 'wins', 0, 'drops', 0, 'withdrawn', 0);
  end if;
  -- the stock, the Gil set aside, the counts
  update public.casino_live_prizes p set issued = greatest(0, p.issued - c.n)
    from (select prize ->> 'id' id, count(*)::integer n from public.casino_live_spins where test and prize is not null group by 1) c where p.id = c.id;
  update public.casino_live_settings set
    reserved = greatest(0, reserved - coalesce((select sum((prize ->> 'amount')::bigint) from public.casino_live_spins where test and prize ->> 'kind' = 'gil'), 0)),
    spins = greatest(0, spins - spins_),
    pool_draws = greatest(0, pool_draws - (select count(*) from public.casino_live_spins where test and (trail ->> 'pool')::boolean)::integer)
    where id = 1;
  -- the prize rows with their threads and bells, and the wallet's payments with theirs
  select coalesce(array_agg((trail ->> 'win')::bigint), '{}') into wins_ from public.casino_live_spins where test and trail ? 'win';
  select coalesce(array_agg((trail ->> 'drop')::bigint), '{}') into drops_ from public.casino_live_spins where test and trail ? 'drop';
  select coalesce(array_agg(n.value::bigint), '{}') into notes_ from public.casino_live_spins, jsonb_array_elements_text(coalesce(trail -> 'notes', '[]')) n where test;
  delete from public.notifications where id = any (notes_)
    or (kind in ('prize_win', 'prize_claim', 'prize_ask', 'prize_talk', 'prize_done') and body = any (select w::text from unnest(wins_) w));
  delete from public.prize_messages where win_id = any (wins_);
  delete from public.prize_wins where id = any (wins_);
  -- (a withdrawal empties the wallet: a payment with a withdrawal after it (one newer than the spin's `out`) is gone
  -- already, and only the rest is taken back; what was withdrawn is said, never taken from Gil won since)
  for x in select t.profile_id, sum(t.amount)::bigint amount, coalesce(sum(t.amount) filter (where t.gone), 0)::bigint taken from (
      select d.profile_id, d.amount, exists (select 1 from public.prize_wins o where o.winner = d.profile_id and o.draw = 'give'
        and o.prize_name = 'เงินสะสม' and o.gil_amount is not null and o.id > coalesce((sp.trail ->> 'out')::bigint, 0)) gone
      from public.casino_live_spins sp join public.wallet_drops d on d.id = (sp.trail ->> 'drop')::bigint
      where sp.test and sp.trail ? 'drop') t group by t.profile_id loop
    update public.wallets set balance = greatest(0, balance - (x.amount - x.taken)), earned = greatest(0, earned - x.amount), updated_at = now() where profile_id = x.profile_id;
    out_ := out_ + x.taken;
  end loop;
  delete from public.wallet_drops where id = any (drops_);
  delete from public.casino_live_receipts where spin_id in (select id from public.casino_live_spins where test);
  delete from public.casino_live_spins where test;
  insert into public.casino_live_audit (actor, action, detail) values (me, 'wipe tests',
    jsonb_build_object('spins', spins_, 'moves', moves_, 'kept', kept_, 'wins', cardinality(wins_), 'drops', cardinality(drops_), 'withdrawn', out_));
  perform casino.hint('changed', '{}'::jsonb);
  return jsonb_build_object('spins', spins_, 'moves', moves_, 'kept', kept_, 'wins', cardinality(wins_), 'drops', cardinality(drops_), 'withdrawn', out_);
end $$;

revoke all on function casino.chips_let_in(public.casino_live_settings) from public, anon, authenticated;
revoke all on function public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint),
  public.casino_live_save(bigint, jsonb), public.casino_live_wipe_tests(), public.casino_live_buy(uuid, integer), public.casino_live_free() from public, anon;
grant execute on function public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint),
  public.casino_live_save(bigint, jsonb), public.casino_live_wipe_tests(), public.casino_live_buy(uuid, integer), public.casino_live_free() to authenticated;

-- (pages read the settings again: the rate and the free coins are new to them)
select casino.hint('changed', '{}'::jsonb);
commit;

-- What it should say afterwards (read only):
--   select chip_rate, free_chips from public.casino_live_settings;                       → 1, 100
--   select count(*) from public.casino_live_chip_moves;                                  → 0
