-- v312 — Casino Coins changed back into Popoto coins (2026-10-28)
-- Run once in the Supabase SQL editor, after v308 (v309 to v311 are other pieces of work: any order). Running it again
-- is safe.
--
-- The owner: "เพิ่ม feature เปลี่ยน casino coin กลับเป็น popoto coin rate เท่าไหร่ดี ช่วยคิดหน่อย"; both AIs' answer, and his
-- "โอเคแล้ว ทำขึ้นมาเลย":
--   * 10 Casino Coins give 9 Popoto coins (nine tenths of what they cost at the counter's rate, chip_rate): a change
--     in and back out loses a tenth, so it never pays, and the casino stays a sink. In tens, ten at the least, no cap a day.
--   * The free Casino Coins are not changed back: an account keeps how many of its free ones are still unspent
--     (`free_left`), a spin spends those first, and what is left of them stays for spinning. What a spin brings back,
--     a free one's too, may be changed back.
--   * Not while one of my spins is still turning (its win is in the count already: `available_at`), nor while any of
--     my moves or spins of the admins' trial are still to be wiped (the wipe takes those back). Open or shut, the
--     casino changes them back: they are the players' own.
--   * Each change kept in casino_live_chip_moves (kind 'cashout', its Casino Coins and the Popoto coins given), by its
--     request, so a retry gives nothing twice.
-- `free_left` is worked out for the coins there now as if it had always been kept: each member's free coins and spins
-- since the Casino Coin (v303) in their order, the free ones spent first, the admins' trial's left out
-- (casino.free_left_of); never more than the coins held. From then on the free claim adds to it and a spin takes from
-- it, the admins' trial's neither (its wipe puts its coins back, and holds it to the coins left).
-- The four functions it touches (the free coins, the spin, the state, the trial's wipe) are changed by their live text,
-- as v307 did.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $guard$ begin
  if to_regprocedure('public.casino_live_seat(integer)') is null or to_regprocedure('public.casino_live_free()') is null
     or to_regprocedure('public.casino_live_wipe_tests()') is null or to_regprocedure('town.keep_purse(uuid,jsonb)') is null then
    raise exception 'v312: run the casino''s migrations to v306 first';
  end if;
end $guard$;

-- ── 1. How many of an account's free Casino Coins are still unspent ──
alter table public.casino_live_accounts add column if not exists free_left integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'casino_live_accounts_free_left_check') then
    alter table public.casino_live_accounts add constraint casino_live_accounts_free_left_check check (free_left >= 0);
  end if;
end $$;
alter table public.casino_live_chip_moves drop constraint if exists casino_live_chip_moves_kind_check;
alter table public.casino_live_chip_moves add constraint casino_live_chip_moves_kind_check check (kind in ('buy', 'free', 'cashout'));

-- (an account's free coins still unspent, worked out from what it did: its free claims and its spins paid in Casino
-- Coins, in their order, the free ones spent first; the trial's left out, as its wipe takes them back. A change back
-- never touches them (only what is not free goes back), so this is what the free claim and the spin keep as they go)
create or replace function casino.free_left_of(p_user uuid)
returns bigint language plpgsql stable security definer set search_path = '' as $$
declare ev record; pool bigint := 0;
begin
  for ev in
    select m.at, 0 as o, m.chips::bigint as free, 0::bigint as spent from public.casino_live_chip_moves m where m.user_id = p_user and m.kind = 'free' and not m.test
    union all
    select x.created_at, 1, 0, x.price::bigint from public.casino_live_spins x where x.user_id = p_user and not x.test and x.trail ? 'chips'
    order by 1, 2
  loop
    pool := greatest(0, pool + ev.free - ev.spent);
  end loop;
  return pool;
end $$;
revoke all on function casino.free_left_of(uuid) from public, anon, authenticated;

-- (for the coins there now; never more than the coins held. Run again it gives the same)
update public.casino_live_accounts a set free_left = least(casino.free_left_of(a.user_id), greatest(a.chips, 0))::integer;

-- ── 2. The free coins, the spin, the state and the wipe keep it: their live text, but for these lines ──
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['public.casino_live_free()',
     'update public.casino_live_accounts set chips = chips + s.free_chips, updated_at = clock_timestamp() where user_id = me;',
     'update public.casino_live_accounts set chips = chips + s.free_chips, free_left = free_left + case when s.access = ''admins'' then 0 else s.free_chips end, updated_at = clock_timestamp() where user_id = me;', '1'],
    ['public.casino_live_spin(uuid,integer,text,bigint)',
     'chips = chips - s.price + case when won.kind = ''coin'' then won.amount else 0 end where user_id = me;',
     'chips = chips - s.price + case when won.kind = ''coin'' then won.amount else 0 end,
    -- (v312: the free Casino Coins spent first; the admins'' trial leaves them be, its wipe puts its coins back)
    free_left = case when test_ then free_left else greatest(0, free_left - s.price) end where user_id = me;', '1'],
    ['public.casino_live_state(integer,boolean)',
     '''chips'', coalesce((select a.chips from public.casino_live_accounts a where a.user_id = me), 0),',
     '''chips'', coalesce((select a.chips from public.casino_live_accounts a where a.user_id = me), 0),
      -- (v312: the free ones still unspent, which are not changed back)
      ''free_left'', coalesce((select least(a.free_left, a.chips) from public.casino_live_accounts a where a.user_id = me), 0),', '1'],
    ['public.casino_live_wipe_tests()',
     'chips = greatest(0, chips - need_), updated_at = clock_timestamp()',
     -- (v312: the trial never touched them, so never more than the coins left: Codex's checks)
     'chips = greatest(0, chips - need_), free_left = least(free_left, greatest(0, chips - need_)), updated_at = clock_timestamp()', '1']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = c[4]::integer then execute replace(d, o, nw);
    else raise exception 'v312: % has % of [%], not %: rebuild v312', c[1], n, left(c[2], 60), c[4]; end if;
  end loop;
end $$;

-- ── 3. The change back ──
create or replace function public.casino_live_cashout(p_request uuid, p_chips integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; a public.casino_live_accounts; old public.casino_live_chip_moves;
  purse_ jsonb; got_ bigint; can_ integer;
begin
  if p_request is null or p_chips is null or p_chips not between 10 and 1000000 or p_chips % 10 <> 0 then
    return jsonb_build_object('ok', false, 'why', 'amount');
  end if;
  -- (the settings' row held as a spin holds it, shared: a wipe of the trial under way is waited for)
  select * into s from public.casino_live_settings where id = 1 for share;
  -- (my account's row first, then the purse, as every change of coins takes them: a retry of this request waits here)
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id = me for update;
  select * into old from public.casino_live_chip_moves where request = p_request;
  if found then
    if old.user_id <> me or old.kind <> 'cashout' or old.chips <> p_chips then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
    return jsonb_build_object('ok', true, 'chips', a.chips, 'got', old.coins, 'coins', coalesce((select w.coins from public.town_purses w where w.member_id = me), 0));
  end if;
  -- (the admins' trial: its coins are the wipe's to take back, so none are changed back while any of mine are there)
  if exists (select 1 from public.casino_live_chip_moves m where m.user_id = me and m.test)
     or exists (select 1 from public.casino_live_spins x where x.user_id = me and x.test) then
    return jsonb_build_object('ok', false, 'why', 'trial');
  end if;
  if a.available_at > now() then return jsonb_build_object('ok', false, 'why', 'turning'); end if;
  can_ := a.chips - least(a.free_left, a.chips);
  if p_chips > can_ then return jsonb_build_object('ok', false, 'why', 'chips', 'chips', a.chips, 'free_left', least(a.free_left, a.chips)); end if;
  -- nine tenths of what they cost at the counter's rate
  got_ := floor(p_chips::numeric * s.chip_rate * 9 / 10);
  -- the town's purse locking contract: nothing else in the purse moves
  perform town.purse_of(me, true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id = me for update;
  purse_ := town.purse_of(me, true);
  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb((purse_ ->> 'coins')::numeric + got_)));
  update public.casino_live_accounts set chips = chips - p_chips, free_left = least(free_left, chips - p_chips), updated_at = clock_timestamp()
    where user_id = me;
  insert into public.casino_live_chip_moves (request, user_id, kind, chips, coins, test) values (p_request, me, 'cashout', p_chips, got_, false);
  return jsonb_build_object('ok', true, 'chips', a.chips - p_chips, 'got', got_, 'coins', (purse_ ->> 'coins')::numeric + got_);
end $$;
revoke all on function public.casino_live_cashout(uuid, integer) from public, anon;
grant execute on function public.casino_live_cashout(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select count(*) filter (where free_left > chips) as over, count(*) as accounts from public.casino_live_accounts;
--   → 0, (the accounts)
--   select position('free_left' in pg_get_functiondef('public.casino_live_spin(uuid,integer,text,bigint)'::regprocedure)) > 0 as spin,
--          position('free_left' in pg_get_functiondef('public.casino_live_free()'::regprocedure)) > 0 as free,
--          position('free_left' in pg_get_functiondef('public.casino_live_state(integer,boolean)'::regprocedure)) > 0 as state,
--          position('free_left' in pg_get_functiondef('public.casino_live_wipe_tests()'::regprocedure)) > 0 as wipe,
--          has_function_privilege('anon', 'public.casino_live_cashout(uuid,integer)', 'EXECUTE') as anon_may;
--   → true, true, true, true, false
