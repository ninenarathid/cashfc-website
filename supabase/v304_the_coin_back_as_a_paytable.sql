-- v304 — the coin back as a slot machine's paytable (2026-10-27)
-- Run once in the Supabase SQL editor, after v303. Running it again is safe. The page goes out first: until this file
-- runs, the pair pays its one amount as v303 does.
--
-- The owner, 2026-10-27, once the pair paid back the whole price (100 Casino Coin of a 100 spin), then half: "ไม่มีคืน
-- 100% ช่วยคืนมาแค่บางส่วน มีหลาย % ทำให้เหมือน slot machine จริง".
--
-- The pair (the first two reels alike, v299) stays the one knob for how often coins come back (its chance, the desk's).
-- Which symbol makes the pair says how much, as a slot machine's paytable (`casino_live_settings.back_table`): each of
-- the five symbols a part of the price (1% to 99%: never all of it) and a share of the pair's wins. To begin with:
-- cherry 10% (40 in 100 pairs), popoto 20% (30), gold 30% (18), seven 50% (9), evercold 80% (3): small backs often, big
-- ones seldom, 22.3% of the price on average a pair. The desk edits the five rows; its save keeps the pair's own amount
-- at the table's average (what the sums of coins back read). A win's coins and name are written with the spin, so the
-- wipe of the admins' trial takes back what each paid, as before. Nothing else of v303 changes.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('public.casino_live_buy(uuid,integer)') is null then raise exception 'Run v303 before v304'; end if;
end $$;

-- ── the paytable ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Five rows, one a symbol, each a part of the price (1 to 99 in 100) and a share of the pair's wins (0 to 1,000; some). */
create or replace function casino.back_table_ok(t jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(t) = 'array' and jsonb_array_length(t) = 5
    and (select count(distinct e ->> 'sym') = 5 and bool_and(e ->> 'sym' in ('seven', 'cherry', 'gold', 'popoto', 'evercold'))
          and bool_and(jsonb_typeof(e -> 'pct') = 'number' and jsonb_typeof(e -> 'share') = 'number')
          and bool_and(case when jsonb_typeof(e -> 'pct') = 'number' and jsonb_typeof(e -> 'share') = 'number' then
            (e ->> 'pct')::numeric = floor((e ->> 'pct')::numeric) and (e ->> 'pct')::numeric between 1 and 99
            and (e ->> 'share')::numeric = floor((e ->> 'share')::numeric) and (e ->> 'share')::numeric between 0 and 1000 else false end)
          and sum(case when jsonb_typeof(e -> 'share') = 'number' then (e ->> 'share')::numeric else 0 end) > 0
        from jsonb_array_elements(t) e), false)
$$;

alter table public.casino_live_settings add column if not exists back_table jsonb not null default
  '[{"sym":"cherry","pct":10,"share":40},{"sym":"popoto","pct":20,"share":30},{"sym":"gold","pct":30,"share":18},{"sym":"seven","pct":50,"share":9},{"sym":"evercold","pct":80,"share":3}]';
alter table public.casino_live_settings drop constraint if exists casino_live_settings_back_table_check;
alter table public.casino_live_settings add constraint casino_live_settings_back_table_check check (casino.back_table_ok(back_table));

/** A row of the paytable drawn by its share, and the Casino Coins it pays at this price, rounded down: { sym, pct, amount }. */
create or replace function casino.back_of(t jsonb, p_price integer)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare e jsonb; x numeric; edge numeric := 0;
begin
  x := casino.unit() * (select sum((r ->> 'share')::numeric) from jsonb_array_elements(t) r);
  for e in select value from jsonb_array_elements(t) loop
    edge := edge + (e ->> 'share')::numeric;
    if x < edge then exit; end if;
  end loop;
  return jsonb_build_object('sym', e ->> 'sym', 'pct', (e ->> 'pct')::integer, 'amount', floor(p_price * (e ->> 'pct')::numeric / 100)::bigint);
end $$;

/** What a pair pays on average at this price. */
create or replace function casino.back_average(t jsonb, p_price integer)
returns numeric language sql immutable set search_path = '' as $$
  select sum((e ->> 'share')::numeric * floor(p_price * (e ->> 'pct')::numeric / 100)) / nullif(sum((e ->> 'share')::numeric), 0)
    from jsonb_array_elements(t) e
$$;

-- ── a spin: the pair paid by the paytable ───────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_spin(p_request uuid, p_machine integer, p_force text default null, p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts;
  old public.casino_live_spins; p public.casino_live_prizes; won public.casino_live_prizes;
  prize_ jsonb; reels_ jsonb; n numeric; edge numeric := 0; total_ integer; sample_ integer;
  now_ timestamptz := clock_timestamp(); name_ text; first_ text;
  admin_ boolean := casino.live_admin_allowed(); test_ boolean; trail_ jsonb := '{}'::jsonb;
  win_ bigint; note_ bigint; char_ bigint; before_ bigint; tier_ text; back_ jsonb;
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
    -- (the pair: the paytable says which symbol and how much of the price comes back, never all of it)
    if won.id = 'pair' then back_ := casino.back_of(s.back_table, s.price); won.name := (back_ ->> 'amount') || ' Casino Coin'; won.amount := (back_ ->> 'amount')::bigint; end if;
    prize_ := jsonb_build_object('id', won.id, 'name', won.name, 'kind', won.kind, 'amount', won.amount, 'announce', won.announce, 'test', test_);
    -- (and which row of the paytable paid it, for the page to say: a part of the price come back, not a win of it)
    if back_ is not null then prize_ := prize_ || jsonb_build_object('sym', back_ -> 'sym', 'pct', back_ -> 'pct'); end if;
  end if;
  -- The reels: a symbol's prize four of it; the pair its paytable symbol on the first two and neither of the others; a miss the first two unlike.
  first_ := coalesce(back_ ->> 'sym', casino.reel());
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

-- ── the desk's save: the paytable too ───────────────────────────────────────────────────────────────────────────────

create or replace function public.casino_live_save(p_revision bigint, p_doc jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := casino.require_live_admin(); s public.casino_live_settings; x jsonb;
  total numeric := 0; future_ bigint := 0; available_ integer := 0; used_ integer; ids_ text[] := '{}'; access_ text; back_ numeric;
  rate_ integer; free_ integer; table_ jsonb;
begin
  select * into s from public.casino_live_settings where id = 1 for update;
  if p_revision is null or p_revision <> s.revision then raise exception 'Another admin changed settings; reload first' using errcode = '40001'; end if;
  if p_doc is null or jsonb_typeof(p_doc -> 'prizes') <> 'array' or jsonb_array_length(p_doc -> 'prizes') <> 6 then raise exception 'Six prizes required'; end if;
  access_ := coalesce(p_doc ->> 'access', case when (p_doc ->> 'open')::boolean then 'everyone' else 'closed' end);
  -- (a desk from before v303 sends neither: they stay as they are)
  rate_ := coalesce((p_doc ->> 'chip_rate')::integer, s.chip_rate); free_ := coalesce((p_doc ->> 'free_chips')::integer, s.free_chips);
  -- (a desk from before v304 sends no paytable: it stays as it is)
  table_ := coalesce(p_doc -> 'back_table', s.back_table);
  if not casino.back_table_ok(table_) then raise exception 'Invalid coin back table'; end if;
  -- (every row pays at least a coin at this price, and never all of it: a part of the price, rounded down)
  if exists (select 1 from jsonb_array_elements(table_) e where floor((p_doc ->> 'price')::integer * (e ->> 'pct')::numeric / 100) < 1)
    then raise exception 'Every coin back must be at least 1 Casino Coin at this price'; end if;
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
  -- (the pair's own amount is what its paytable pays on average at this price: what the desk and the sums read)
  update public.casino_live_prizes set amount = greatest(1, round(casino.back_average(table_, (p_doc ->> 'price')::integer))) where id = 'pair';
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
    ends_at = nullif(p_doc ->> 'ends_at', '')::timestamptz, chip_rate = rate_, free_chips = free_, back_table = table_,
    revision = revision + 1, updated_at = clock_timestamp(), updated_by = me where id = 1;
  perform casino.hint('changed', '{}'::jsonb);
  return public.casino_live_state();
end $$;

-- (back_table_ok stays callable by all: it reads nothing, and the settings' check asks it of whoever writes the row)
revoke all on function casino.back_of(jsonb, integer), casino.back_average(jsonb, integer) from public, anon, authenticated;
revoke all on function public.casino_live_spin(uuid, integer, text, bigint), public.casino_live_save(bigint, jsonb) from public, anon;
grant execute on function public.casino_live_spin(uuid, integer, text, bigint), public.casino_live_save(bigint, jsonb) to authenticated;

-- (pages read the settings again: the paytable is new to them)
select casino.hint('changed', '{}'::jsonb);
commit;

-- What it should say afterwards (read only):
--   select jsonb_array_length(back_table) from public.casino_live_settings;              → 5
