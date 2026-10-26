-- v299 — the Popoto Casino in the town (2026-10-27)
-- Run once in the Supabase SQL editor, after v298. Running it again is safe. The page that walks into the casino goes
-- out first: until this file runs its door stays shut (no `access` column: the page reads the casino as closed) and
-- the casino's own desk is as it was.
--
-- The owner, 2026-10-26/27: "นำ Casino ที่ test อยู่ ใส่เข้ามาในเกม Cashtown … เป็นแมพพิเศษที่ Admin test ดูก่อนได้ จนกว่าจะแน่ใจ
-- และจะสามารถเปิดให้ใช้งานได้ใน page admin aqua", "อยากให้ test ได้ทั้งหมด ทั้งการเล่นแล้วได้รางวัล แล้วจะขึ้นผู้โชคดีในหน้า Admin
-- aqua ยังไง ใช้ระบบ คุย 1-1 ที่มีในเว็ปได้", "สามารถเดินผ่านแมพเข้าไปในเกมเลยได้ไหม โดยไม่ต้องเปลี่ยน url", the door the kura;
-- Aqua's asks (2026-10-19): one more big prize, the evercold; coins back by chance; set the rates; 20–40 players on the
-- day. To every recommendation laid before him: "ทุกข้อเอาตามที่คุณแนะนำ", the prizes "ปรับได้ง่ายๆในหน้า admin aqua".
--
-- 1. Who may spin is three ways (`casino_live_settings.access`): 'closed', 'admins' (the admins try the real thing:
--    every spin of theirs is marked a test, may be forced to any result, and leaves nothing behind once wiped) and
--    'everyone'. `open` stays, kept equal to access = 'everyone' for whatever still reads it. The desk's save takes
--    `access`; `casino_live_access(text)` is the Aqua page's switch, which changes nothing else.
-- 2. Two more prizes, unused until Aqua sets them: 'evercold' (a symbol of its own, four of it on the reels) and 'pair'
--    (the first two reels alike and neither of the other two: coins back, a coin prize always). A miss never shows the
--    first two alike, nor four.
--    Coins paid back must average under the price (the town must not inflate): the save refuses otherwise.
-- 3. Where a win goes: a thing to hand over (physical) becomes a row of `prize_wins` with its `prize_win` bell: the
--    winner claims it and talks with the admins in the site's own 1-1 thread (claim_prize, prize_messages,
--    deliver_prize, v87), and it is on the admins' list. Gil is paid into the winner's wallet (credit_wallet, v93), as
--    every Gil prize of the site is. Coins, the pair's too, go into the town purse as before. No casino receipt is
--    written any more (the Event bag kept them; none was ever written live). Each spin keeps in `trail` what it wrote,
--    so a test is wiped to the row.
-- 4. `casino_live_wipe_tests()`: every test spin undone: the coins it took and paid back, the stock, the Gil set aside,
--    the counts, the prize row with its thread and bells, the wallet payment with its bells.
-- 5. Every page in the casino used to read the whole casino again at each spin of anybody's (the change feed): forty
--    players at five machines would be some fifty reads a second on the small database. Now a spin is told to the
--    private channel 'casino-live' as it is written, with what a page draws of it, and a page reads again only for its
--    own spin, a win, or when an admin changes the settings (told as 'changed'). The casino's tables leave the change
--    feed. Pages no longer send on 'casino-live': its write policy goes.
-- 6. The casino is a map of the town now (lib/town/casino-room), so it has a chat channel of its own: v297's helper and
--    its two policies again, with the zone 'casino' in each list. Nothing else of them changes.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('public.casino_live_spin(uuid,integer,text,bigint)') is null then raise exception 'Run v206 before v299'; end if;
  if to_regprocedure('public.town_zone_topic(text)') is null then raise exception 'Run v297 before v299'; end if;
  if to_regprocedure('public.credit_wallet(uuid,integer,bigint,text,text,text,text,bigint)') is null then raise exception 'credit_wallet (v93) is missing'; end if;
  if to_regclass('public.prize_wins') is null or to_regclass('public.prize_messages') is null or to_regclass('public.notifications') is null
    or to_regclass('public.wallets') is null or to_regclass('public.wallet_drops') is null then raise exception 'the prize and wallet tables (v87, v91) are missing'; end if;
end $$;

-- ── 1. who may spin ─────────────────────────────────────────────────────────────────────────────────────────────────

alter table public.casino_live_settings add column if not exists access text not null default 'closed';
alter table public.casino_live_settings drop constraint if exists casino_live_settings_access_check;
alter table public.casino_live_settings add constraint casino_live_settings_access_check check (access in ('closed', 'admins', 'everyone'));
-- (a casino already open stays open; `open` is access = 'everyone' from here on)
update public.casino_live_settings set access = 'everyone' where open and access <> 'everyone';
update public.casino_live_settings set open = (access = 'everyone') where open <> (access = 'everyone');

-- ── 2. the evercold and the pair ────────────────────────────────────────────────────────────────────────────────────

alter table public.casino_live_prizes drop constraint if exists casino_live_prizes_id_check;
alter table public.casino_live_prizes add constraint casino_live_prizes_id_check check (id in ('seven', 'cherry', 'gold', 'popoto', 'evercold', 'pair'));
alter table public.casino_live_prizes drop constraint if exists casino_live_prizes_pair_coin;
alter table public.casino_live_prizes add constraint casino_live_prizes_pair_coin check (id <> 'pair' or kind = 'coin');
insert into public.casino_live_prizes (id, name, kind, amount, chance, stock, announce, active) values
  ('evercold', 'Evercold', 'physical', 0, 0, 0, true, false),
  ('pair', '50 Coin', 'coin', 50, 0, 100000, false, false)
on conflict (id) do nothing;

-- ── 3. what a spin wrote ────────────────────────────────────────────────────────────────────────────────────────────

alter table public.casino_live_spins add column if not exists test boolean not null default false;
alter table public.casino_live_spins add column if not exists trail jsonb not null default '{}'::jsonb;
create index if not exists casino_live_spins_tests on public.casino_live_spins (user_id) where test;
create index if not exists casino_live_spins_wins on public.casino_live_spins (created_at desc) where prize is not null;

/** A number of chance in [0, 1), drawn as v206's spin drew its own. */
create or replace function casino.unit()
returns numeric language sql volatile set search_path = '' as $$
  select ((('x' || substr(gen_random_uuid()::text, 1, 8))::bit(32)::bigint)::numeric / 4294967296);
$$;
/** A reel's symbol by chance, or one that is not `p_not`. */
create or replace function casino.reel(p_not text default null)
returns text language plpgsql volatile set search_path = '' as $$
declare ids_ text[] := array['seven', 'cherry', 'gold', 'popoto', 'evercold'];
begin
  if p_not is not null then ids_ := array_remove(ids_, p_not); end if;
  return ids_[1 + floor(casino.unit() * array_length(ids_, 1))::integer];
end $$;
/** A hint to the casino's private channel: never stands in the way of what sends it. */
create or replace function casino.hint(p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(p_payload, p_event, 'casino-live', true);
exception when others then null;
end $$;
revoke all on function casino.unit(), casino.reel(text), casino.hint(text, jsonb) from public, anon, authenticated;

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
      'spins', coalesce((select a.spins from public.casino_live_accounts a where a.user_id = me), 0)),
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
    'tests', (select count(*) from public.casino_live_spins where admin_ and test),
    'server_now', clock_timestamp(),
    'paid_gil', (select coalesce(sum((prize ->> 'amount')::bigint) filter (where prize ->> 'kind' = 'gil'), 0)
      from public.casino_live_spins where admin_ and not test and prize is not null)
  ) into result;
  return result;
end $$;

-- ── a spin ──────────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_spin(p_request uuid, p_machine integer, p_force text default null, p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts;
  old public.casino_live_spins; p public.casino_live_prizes; won public.casino_live_prizes;
  prize_ jsonb; reels_ jsonb; n numeric; edge numeric := 0; total_ integer; sample_ integer;
  now_ timestamptz := clock_timestamp(); name_ text; purse_ jsonb; first_ text;
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
  -- Follow the town's purse locking contract, preserving every other inventory field.
  perform town.purse_of(me, true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id = me for update;
  purse_ := town.purse_of(me, true);
  if (purse_ ->> 'coins')::numeric < s.price then raise exception 'Not enough Popoto coins'; end if;

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
  -- wallet; coins (the pair's too) into the purse below. What was written is kept, so that a test is wiped to the row.
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
    trail_ := jsonb_build_object('drop', currval(pg_get_serial_sequence('public.wallet_drops', 'id')),
      'notes', (select coalesce(jsonb_agg(id order by id), '[]') from public.notifications
        where recipient = me and id > before_ and kind in ('wallet_drop', 'wallet_full')));
  end if;
  if s.mode = 'pool' then trail_ := trail_ || '{"pool": true}'; end if;

  insert into public.casino_live_spins (id, user_id, player_name, machine, revision, price, reels, prize, forced, created_at, reveal_at, test, trail)
    values (p_request, me, name_, p_machine, s.revision, s.price, reels_, prize_, p_force is not null, now_, now_ + interval '3.6 seconds', test_, trail_)
    returning * into old;
  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb((purse_ ->> 'coins')::numeric - s.price + case when won.kind = 'coin' then won.amount else 0 end)));
  update public.casino_live_accounts set spins = spins + 1, available_at = old.reveal_at, updated_at = now_ where user_id = me;
  update public.casino_live_settings set spins = spins + 1,
    pool_draws = pool_draws + case when mode = 'pool' then 1 else 0 end,
    reserved = reserved + case when won.kind = 'gil' then won.amount else 0 end where id = 1;
  -- (a win in the admins' trial is never announced to the town)
  if won.id is not null and won.announce and not test_ then
    insert into public.town_casino_announcements (player_name, prize_name, created_at) values (name_, won.name, old.reveal_at);
  end if;
  perform casino.hint('spin', to_jsonb(old) - 'trail');
  return to_jsonb(old) - 'trail';
end $$;

-- ── the desk's save, and the Aqua page's switch ─────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_save(p_revision bigint, p_doc jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); s public.casino_live_settings; x jsonb;
  total numeric := 0; future_ bigint := 0; available_ integer := 0; used_ integer; ids_ text[] := '{}'; access_ text; back_ numeric;
begin
  select * into s from public.casino_live_settings where id = 1 for update;
  if p_revision is null or p_revision <> s.revision then raise exception 'Another admin changed settings; reload first' using errcode = '40001'; end if;
  if p_doc is null or jsonb_typeof(p_doc -> 'prizes') <> 'array' or jsonb_array_length(p_doc -> 'prizes') <> 6 then raise exception 'Six prizes required'; end if;
  access_ := coalesce(p_doc ->> 'access', case when (p_doc ->> 'open')::boolean then 'everyone' else 'closed' end);
  if not (p_doc ?& array['title', 'mode', 'price', 'per_player', 'budget', 'pool_size']) or access_ not in ('closed', 'admins', 'everyone') or
    length(p_doc ->> 'title') not between 1 and 100 or p_doc ->> 'mode' not in ('weighted', 'pool') or
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
  -- Coins paid back must average under the price: the casino takes coins out of the town, never prints them.
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
    ends_at = nullif(p_doc ->> 'ends_at', '')::timestamptz, revision = revision + 1, updated_at = clock_timestamp(), updated_by = me where id = 1;
  perform casino.hint('changed', '{}'::jsonb);
  return public.casino_live_state();
end $$;

create or replace function public.casino_live_access(p_access text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); s public.casino_live_settings;
begin
  if p_access is null or p_access not in ('closed', 'admins', 'everyone') then raise exception 'Invalid access'; end if;
  select * into s from public.casino_live_settings where id = 1 for update;
  if s.access <> p_access then
    insert into public.casino_live_audit (actor, action, detail) values (me, 'access', jsonb_build_object('from', s.access, 'to', p_access));
    update public.casino_live_settings set access = p_access, open = (p_access = 'everyone'), updated_at = clock_timestamp(), updated_by = me where id = 1;
    perform casino.hint('changed', '{}'::jsonb);
  end if;
  return public.casino_live_state();
end $$;

-- ── the admins' trial, wiped ────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_wipe_tests()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); x record; purse_ jsonb; spins_ integer; wins_ bigint[]; drops_ bigint[]; notes_ bigint[];
begin
  perform 1 from public.casino_live_settings where id = 1 for update;
  select count(*) into spins_ from public.casino_live_spins where test;
  if spins_ = 0 then return jsonb_build_object('spins', 0); end if;
  -- the coins each tester spent and was paid back, put back (the purse held as a spin holds it)
  for x in select user_id, sum(price)::numeric spent, count(*)::integer n,
      coalesce(sum((prize ->> 'amount')::numeric) filter (where prize ->> 'kind' = 'coin'), 0) paid
    from public.casino_live_spins where test group by user_id order by user_id loop
    perform town.purse_of(x.user_id, true);
    perform 1 from public.town_purses wallet_ where wallet_.member_id = x.user_id for update;
    purse_ := town.purse_of(x.user_id, true);
    perform town.keep_purse(x.user_id, jsonb_set(purse_, '{coins}', to_jsonb(greatest(0, (purse_ ->> 'coins')::numeric + x.spent - x.paid))));
    update public.casino_live_accounts set spins = greatest(0, spins - x.n), updated_at = clock_timestamp() where user_id = x.user_id;
  end loop;
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
  for x in select profile_id, sum(amount)::bigint amount from public.wallet_drops where id = any (drops_) group by profile_id loop
    update public.wallets set balance = greatest(0, balance - x.amount), earned = greatest(0, earned - x.amount), updated_at = now() where profile_id = x.profile_id;
  end loop;
  delete from public.wallet_drops where id = any (drops_);
  delete from public.casino_live_receipts where spin_id in (select id from public.casino_live_spins where test);
  delete from public.casino_live_spins where test;
  insert into public.casino_live_audit (actor, action, detail) values (me, 'wipe tests',
    jsonb_build_object('spins', spins_, 'wins', cardinality(wins_), 'drops', cardinality(drops_)));
  perform casino.hint('changed', '{}'::jsonb);
  return jsonb_build_object('spins', spins_, 'wins', cardinality(wins_), 'drops', cardinality(drops_));
end $$;

revoke all on function public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint),
  public.casino_live_save(bigint, jsonb), public.casino_live_access(text), public.casino_live_wipe_tests() from public, anon;
grant execute on function public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint),
  public.casino_live_save(bigint, jsonb), public.casino_live_access(text), public.casino_live_wipe_tests() to authenticated;

-- ── 5. hints, not the change feed ───────────────────────────────────────────────────────────────────────────────────

drop policy if exists casino_live_room_write on realtime.messages;
do $$ declare t text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['casino_live_settings', 'casino_live_prizes', 'casino_live_spins', 'casino_live_receipts'] loop
      if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime drop table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ── 6. the casino's chat ────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.town_zone_topic(p_zone text)
returns text
language sql stable security invoker set search_path = ''
as $$
  select case when p_zone in ('town', 'farm', 'forest', 'mountain', 'cave', 'shop', 'casino')
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
        from unnest(array['town','farm','forest','mountain','cave','shop','casino']) as zones(zone)
    )
  );

drop policy if exists town_maps_send on realtime.messages;
create policy town_maps_send on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and (select realtime.topic()) in (
      select (select public.town_topic('main')) || ':z:' || zone
        from unnest(array['town','farm','forest','mountain','cave','shop','casino']) as zones(zone)
    )
  );

notify pgrst, 'reload schema';
commit;

-- Reading it (the SQL editor):
--   select access, open, revision, spins from public.casino_live_settings;            -- 'closed', false, … as before
--   select id, name, kind, amount, chance, stock, active from public.casino_live_prizes order by id;   -- six rows
--   select public.town_zone_topic('casino') is not null;                              -- true when asked as a member
--   select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'casino_live_%';  -- 0
-- To let the admins in, and everybody (or from the Aqua page):
--   update public.casino_live_settings set access = 'admins', open = false where id = 1;
--   update public.casino_live_settings set access = 'everyone', open = true where id = 1;
