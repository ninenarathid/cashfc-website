-- v305 — ten machines, one player each, the idle stood up, and popoto changed at the casino's counter (2026-10-27)
-- Run once in the Supabase SQL editor, after v304. Running it again is safe. The page goes out first: until this file
-- runs the room shows five machines' worth of play as before (a spin on 6 to 10 is refused) and the counter no popoto.
--
-- The owner, 2026-10-27: "เพิ่มเป็น 10 เครื่อง", "NPC ใน casino สามารถแลก popoto เป็น popoto coin หรือ casino coin ได้แบบ
-- ไม่มี limit", "1 เครื่องเล่นได้พร้อมกันแค่ 1 คน ถ้ามีคนอื่นเล่นอยู่จะเล่นเครื่องนั้นไม่ได้", "ถ้ามีคน AFK ตอนเล่น slot machine
-- อยู่ จะมีระบบ auto kick ให้".
--
-- 1. Ten machines: a spin takes machine 1 to 10.
-- 2. One player a machine (`casino_live_seats`): sitting down (`casino_live_seat(machine)`) or spinning holds it, one at a
--    time a player; another is refused it ("taken", with the holder's name) until the holder has neither sat down nor
--    spun for 60 seconds. `casino_live_seat(null)` lets go. The page stands an idle player up after the same minute.
-- 3. Popoto changed at the counter, no week's limit (`casino_live_popoto(request, popoto, to)`): a profile's popoto
--    (the bank's own count, town_popoto_left), 1 to 1,000 a change, at the bank's rate (town_knobs.bank_rate, 5) into
--    Popoto coins, or into Casino Coins at that over the Casino Coin's rate. Written into the bank's own book
--    (town_exchanges, so the popoto are spent once whichever counter took them, and the board counts them changed) on
--    a week of its own (2000-01-03) that the bank's week never is: they never count against its limit. Kept in
--    `casino_live_popoto_moves` by request, so a retry changes nothing twice. Never a test: the popoto are really spent.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('casino.back_table_ok(jsonb)') is null then raise exception 'Run v304 before v305'; end if;
  if to_regprocedure('public.town_popoto_left(uuid)') is null or to_regprocedure('town.mark_changed(bigint,integer)') is null or to_regclass('public.town_exchanges') is null
    then raise exception 'the bank (town_exchanges, town_popoto_left) is missing'; end if;
end $$;

-- ── 1. ten machines ─────────────────────────────────────────────────────────────────────────────────────────────────

alter table public.casino_live_spins drop constraint if exists casino_live_spins_machine_check;
alter table public.casino_live_spins add constraint casino_live_spins_machine_check check (machine between 1 and 10);

-- ── 2. who holds which machine ──────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.casino_live_seats (
  machine smallint primary key check (machine between 1 and 10),
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists casino_live_seats_user on public.casino_live_seats (user_id);
alter table public.casino_live_seats enable row level security;
revoke all on public.casino_live_seats from public, anon, authenticated;

create or replace function public.casino_live_seat(p_machine integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; seat_ public.casino_live_seats; now_ timestamptz := clock_timestamp();
begin
  if p_machine is null then delete from public.casino_live_seats where user_id = me; return jsonb_build_object('ok', true); end if;
  if p_machine not between 1 and 10 then return jsonb_build_object('ok', false, 'why', 'machine'); end if;
  select * into s from public.casino_live_settings where id = 1 for share;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  -- (two sitting down at one machine at once: the second waits here, then finds it held)
  perform pg_advisory_xact_lock(hashtext('casino_live_seat'), p_machine);
  select * into seat_ from public.casino_live_seats where machine = p_machine;
  if found and seat_.user_id <> me and seat_.at > now_ - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'why', 'taken',
      'name', (select coalesce(p.character_name, p.display_name, p.discord_username, 'ผู้เล่น') from public.profiles p where p.id = seat_.user_id));
  end if;
  delete from public.casino_live_seats where user_id = me and machine <> p_machine;
  insert into public.casino_live_seats (machine, user_id, at) values (p_machine, me, now_)
    on conflict (machine) do update set user_id = excluded.user_id, at = excluded.at;
  return jsonb_build_object('ok', true);
end $$;

-- ── 3. popoto changed at the counter ────────────────────────────────────────────────────────────────────────────────

create table if not exists public.casino_live_popoto_moves (
  request uuid primary key,
  user_id uuid not null references public.profiles(id),
  exchange_id bigint not null,
  popoto integer not null check (popoto between 1 and 1000),
  into_ text not null check (into_ in ('coins', 'chips')),
  amount bigint not null check (amount >= 0),
  at timestamptz not null default now()
);
alter table public.casino_live_popoto_moves enable row level security;
revoke all on public.casino_live_popoto_moves from public, anon, authenticated;

create or replace function public.casino_live_popoto(p_request uuid, p_popoto integer, p_to text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; old public.casino_live_popoto_moves; a public.casino_live_accounts;
  rate_ integer; left_ integer; char_ bigint; ex_ bigint; worth_ bigint; got_ bigint; purse_ jsonb;
begin
  if p_request is null or p_popoto is null or p_popoto not between 1 and 1000 or p_to is null or p_to not in ('coins', 'chips')
    then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
  select * into s from public.casino_live_settings where id = 1 for share;
  -- (my account's row, then the purse, as every change of coins takes them: a retry of this request waits here and finds it)
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id = me for update;
  perform town.purse_of(me, true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id = me for update;
  select * into old from public.casino_live_popoto_moves where request = p_request;
  if found then
    if old.user_id <> me or old.popoto <> p_popoto or old.into_ <> p_to then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
    return jsonb_build_object('ok', true, 'got', old.amount, 'chips', a.chips, 'coins', coalesce((select w.coins from public.town_purses w where w.member_id = me), 0),
      'popoto_left', coalesce((select l.profile_left from public.town_popoto_left(me) l), 0));
  end if;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  select k.value into rate_ from public.town_knobs k where k.key = 'bank_rate';
  select l.profile_left into left_ from public.town_popoto_left(me) l;
  if rate_ is null or rate_ < 1 then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  if p_popoto > coalesce(left_, 0) then return jsonb_build_object('ok', false, 'why', 'popoto', 'popoto_left', coalesce(left_, 0)); end if;
  select p.character_id into char_ from public.profiles p where p.id = me;
  worth_ := p_popoto::bigint * rate_;
  got_ := case when p_to = 'coins' then worth_ else floor(worth_::numeric / s.chip_rate) end;
  if got_ < 1 then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
  -- the bank's own book, on the week it never counts (no limit here), and the board's count of them changed
  insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week)
    values (me, 'profile', char_, p_popoto, worth_, date '2000-01-03') returning id into ex_;
  perform town.mark_changed(char_, p_popoto);
  if p_to = 'coins' then
    purse_ := town.purse_of(me, true);
    perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb((purse_ ->> 'coins')::numeric + worth_)));
  else
    update public.casino_live_accounts set chips = chips + got_, updated_at = clock_timestamp() where user_id = me;
  end if;
  insert into public.casino_live_popoto_moves (request, user_id, exchange_id, popoto, into_, amount) values (p_request, me, ex_, p_popoto, p_to, got_);
  return jsonb_build_object('ok', true, 'got', got_, 'chips', (select x.chips from public.casino_live_accounts x where x.user_id = me),
    'coins', (select w.coins from public.town_purses w where w.member_id = me), 'popoto_left', left_ - p_popoto);
end $$;

-- ── the state a page reads: the popoto, the seats ───────────────────────────────────────────────────────────────────

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
      'free_today', exists (select 1 from public.casino_live_chip_moves m where m.user_id = me and m.kind = 'free' and m.day = town.day_of(town.now_ms())),
      -- (the popoto I may change at the counter: the bank's own count)
      'popoto_left', coalesce((select l.profile_left from public.town_popoto_left(me) l), 0),
      'bank_rate', (select k.value from public.town_knobs k where k.key = 'bank_rate')),
    -- (who holds which machine: a minute from their last spin or their sitting down)
    'seats', (select coalesce(jsonb_agg(jsonb_build_object('machine', x.machine, 'user_id', x.user_id) order by x.machine), '[]')
      from public.casino_live_seats x where x.at > clock_timestamp() - interval '60 seconds'),
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

-- ── 1, 2. a spin: ten machines, the machine held ────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_spin(p_request uuid, p_machine integer, p_force text default null, p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts;
  old public.casino_live_spins; p public.casino_live_prizes; won public.casino_live_prizes;
  prize_ jsonb; reels_ jsonb; n numeric; edge numeric := 0; total_ integer; sample_ integer;
  now_ timestamptz := clock_timestamp(); name_ text; first_ text;
  admin_ boolean := casino.live_admin_allowed(); test_ boolean; trail_ jsonb := '{}'::jsonb;
  seat_ public.casino_live_seats; win_ bigint; note_ bigint; char_ bigint; before_ bigint; tier_ text; back_ jsonb; back2_ jsonb; c_ numeric; front_ boolean; x_ text; y_ text; z_ text;
begin
  if p_request is null or p_machine is null or p_machine not between 1 and 10 or
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
  -- One player a machine: it is mine, or nobody's, or its holder has not spun for a minute (then it is mine now).
  perform pg_advisory_xact_lock(hashtext('casino_live_seat'), p_machine);
  select * into seat_ from public.casino_live_seats where machine = p_machine;
  if found and seat_.user_id <> me and seat_.at > now_ - interval '60 seconds' then raise exception 'Machine taken'; end if;
  delete from public.casino_live_seats where user_id = me and machine <> p_machine;
  insert into public.casino_live_seats (machine, user_id, at) values (p_machine, me, now_)
    on conflict (machine) do update set user_id = excluded.user_id, at = excluded.at;

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
    -- (the pair: the paytable says which symbol and how much of the price comes back)
    if won.id = 'pair' then
      back_ := casino.back_of(s.back_table, s.price);
      -- (as often as a pair comes, the other half is a pair of another symbol too: both paid, as a player sees two)
      -- (not in a pool: its pairs come one a draw, so what is left in it is what it pays, Codex's check)
      c_ := case when s.mode = 'pool' then 0 else won.chance / 100 end;
      if casino.unit() < c_ then back2_ := casino.back_of(s.back_table, s.price, back_ ->> 'sym'); end if;
      won.amount := (back_ ->> 'amount')::bigint + coalesce((back2_ ->> 'amount')::bigint, 0);
      won.name := won.amount || ' Casino Coin';
    end if;
    prize_ := jsonb_build_object('id', won.id, 'name', won.name, 'kind', won.kind, 'amount', won.amount, 'announce', won.announce, 'test', test_);
    -- (and which row of the paytable paid it, for the page to say: a part of the price come back, or more)
    if back_ is not null then prize_ := prize_ || jsonb_build_object('sym', back_ -> 'sym', 'pct', back_ -> 'pct',
      'parts', jsonb_build_array(back_ -> 'amount') || case when back2_ is null then '[]'::jsonb else jsonb_build_array(back2_ -> 'amount') end,
      'syms', jsonb_build_array(back_ -> 'sym') || case when back2_ is null then '[]'::jsonb else jsonb_build_array(back2_ -> 'sym') end); end if;
  end if;
  -- The reels: a symbol's prize four of it; a pair its symbol on the front two or the back two, the other half its second
  -- pair or two unlike; a miss no two side by side alike. Every pair a player sees is paid, and nothing else looks like one.
  if won.id is not null and won.id <> 'pair' then reels_ := jsonb_build_array(won.id, won.id, won.id, won.id);
  elsif won.id = 'pair' then
    first_ := back_ ->> 'sym'; front_ := casino.unit() < 0.5;
    if back2_ is not null then x_ := back2_ ->> 'sym'; y_ := x_;
    elsif front_ then x_ := casino.reel_not(array[first_]); y_ := casino.reel_not(array[x_]);
    else y_ := casino.reel_not(array[first_]); x_ := casino.reel_not(array[y_]);
    end if;
    reels_ := case when front_ then jsonb_build_array(first_, first_, x_, y_) else jsonb_build_array(x_, y_, first_, first_) end;
    -- (two pairs said in the order they stand, left to right: 20 + 50 for cherry cherry popoto popoto)
    if back2_ is not null and not front_ then prize_ := prize_ || jsonb_build_object('parts', jsonb_build_array(back2_ -> 'amount', back_ -> 'amount'), 'syms', jsonb_build_array(back2_ -> 'sym', back_ -> 'sym')); end if;
  else
    first_ := casino.reel(); x_ := casino.reel_not(array[first_]); y_ := casino.reel_not(array[x_]); z_ := casino.reel_not(array[y_]);
    reels_ := jsonb_build_array(first_, x_, y_, z_);
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

revoke all on function public.casino_live_seat(integer), public.casino_live_popoto(uuid, integer, text),
  public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint) from public, anon;
grant execute on function public.casino_live_seat(integer), public.casino_live_popoto(uuid, integer, text),
  public.casino_live_state(integer, boolean), public.casino_live_spin(uuid, integer, text, bigint) to authenticated;

select casino.hint('changed', '{}'::jsonb);
commit;

-- What it should say afterwards (read only):
--   select count(*) from public.casino_live_seats;                                        → 0
--   select count(*) from public.town_exchanges where week = date '2000-01-03';             → 0
