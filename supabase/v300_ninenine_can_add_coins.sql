-- v300 — Ninenine can add coins to his own purse (2026-10-27)
-- Run once in the Supabase SQL editor, after v299. Running it again is safe. The page that sends `/coins` may go out
-- before or after: until this runs, the command says it is not ready.
--
-- The owner, 2026-10-27, trying the Popoto Casino in the admins' trial: "ลองเปิดดูแล้ว เสียเงินจริงๆ ขอคำสั่ง add เงินมาลอง
-- เทสได้ไหม ใช้ได้เฉพาะ ninenine". `/coins <amount>` in the town's chat adds that many Popoto coins to his own purse.
--
-- 1. Only Ninenine's account, by its id and its admin flag (as v256's /announce): nobody else, admin or not.
-- 2. Into his own purse only, 1 to 1,000,000 a time, under the town's purse locking contract (town.purse_of, the row
--    held, town.keep_purse), so nothing else in the purse moves.
-- 3. Each grant is kept (`town_admin_coin_grants`: who, how many, when), and its request id makes a retry after a
--    lost answer add nothing twice. Nobody reads the table but the SQL editor.
-- (Coins spent in the casino's admins' trial come back anyway when the trial is wiped: v299.)

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$ begin
  if to_regprocedure('town.purse_of(uuid,boolean)') is null or to_regprocedure('town.keep_purse(uuid,jsonb)') is null
    then raise exception 'the town purse (town.purse_of, town.keep_purse) is missing'; end if;
  if not exists (select 1 from public.profiles where id = '9c0e6904-df00-452d-b005-dac3fa6cd1d7' and is_admin)
    then raise exception 'Ninenine admin account is missing: review v300'; end if;
end $$;

create table if not exists public.town_admin_coin_grants (
  request uuid primary key,
  member_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount between 1 and 1000000),
  coins_after numeric not null,
  at timestamptz not null default now()
);
alter table public.town_admin_coin_grants enable row level security;
revoke all on public.town_admin_coin_grants from public, anon, authenticated;

create or replace function public.town_admin_coins(p_amount integer, p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); purse_ jsonb; prior_ public.town_admin_coin_grants; after_ numeric;
begin
  if me is distinct from '9c0e6904-df00-452d-b005-dac3fa6cd1d7'::uuid or not exists (select 1 from public.profiles p where p.id = me and p.is_admin) then
    return jsonb_build_object('ok', false, 'why', 'forbidden');
  end if;
  if p_request is null or p_amount is null or p_amount not between 1 and 1000000 then
    return jsonb_build_object('ok', false, 'why', 'amount');
  end if;
  perform pg_advisory_xact_lock(hashtext('town.admin_coins'), hashtext(me::text));
  -- (asked again after a lost answer: what it did the first time, nothing more)
  select * into prior_ from public.town_admin_coin_grants where request = p_request;
  if found then
    if prior_.amount <> p_amount or prior_.member_id <> me then return jsonb_build_object('ok', false, 'why', 'amount'); end if;
    return jsonb_build_object('ok', true, 'coins', prior_.coins_after);
  end if;
  -- the town's purse locking contract (as every spin and sale): made if missing, its row held, read, written whole
  perform town.purse_of(me, true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id = me for update;
  purse_ := town.purse_of(me, true);
  after_ := coalesce((purse_ ->> 'coins')::numeric, 0) + p_amount;
  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb(after_)));
  insert into public.town_admin_coin_grants (request, member_id, amount, coins_after) values (p_request, me, p_amount, after_);
  return jsonb_build_object('ok', true, 'coins', after_);
end $$;
revoke all on function public.town_admin_coins(integer, uuid) from public, anon, authenticated;
grant execute on function public.town_admin_coins(integer, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Reading it (the SQL editor):
--   select has_function_privilege('anon', 'public.town_admin_coins(integer,uuid)', 'execute');   -- false
--   select member_id, amount, coins_after, at from public.town_admin_coin_grants order by at desc limit 10;
