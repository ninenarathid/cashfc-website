-- v206: Persistent LIVE casino, closed by default. Run after v204 and the town base.
-- TEST gameplay remains entirely in browser room memory. This file never seeds test money.
-- Installation touches no existing town wallet. Only an accepted LIVE spin debits coins.
-- Reruns preserve settings, stock, reservations, and receipt history.
begin;
create schema if not exists casino;
revoke all on schema casino from public, anon, authenticated;

-- Membership is checked again by every server command; a URL is never an access key.
create or replace function casino.live_member_allowed()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles p where p.id=auth.uid()
  and (p.is_admin or (p.character_id is not null and p.character_verified_at is not null)));
$$;
create or replace function casino.live_admin_allowed()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin);
$$;
create or replace function public.casino_live_allowed()
returns boolean language sql stable security definer set search_path='' as $$
 select casino.live_member_allowed();
$$;
revoke all on function public.casino_live_allowed() from public,anon;
grant execute on function public.casino_live_allowed() to authenticated;
create table if not exists public.casino_live_settings (
  id smallint primary key check(id=1), revision bigint not null default 1,
  title text not null default 'Popoto Casino', open boolean not null default false,
  mode text not null default 'weighted' check(mode in ('weighted','pool')),
  price integer not null default 100 check(price between 1 and 100000),
  per_player integer not null default 100 check(per_player between 1 and 10000),
  budget bigint not null default 100000000 check(budget between 0 and 1000000000000),
  reserved bigint not null default 0 check(reserved>=0 and reserved<=budget),
  spins bigint not null default 0 check(spins>=0),
  pool_size integer not null default 1800 check(pool_size between 1 and 10000000),
  pool_draws integer not null default 0 check(pool_draws>=0 and pool_draws<=pool_size),
  starts_at timestamptz, ends_at timestamptz,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id),
  check(ends_at is null or starts_at is null or ends_at>starts_at)
);
insert into public.casino_live_settings(id) values(1) on conflict do nothing;
create table if not exists public.casino_live_prizes (
  id text primary key check(id in ('seven','cherry','gold','popoto')),
  name text not null check(length(name) between 1 and 100),
  kind text not null check(kind in ('gil','physical','coin')),
  amount bigint not null check(amount between 0 and 1000000000 and (kind='physical' or amount>0)),
  chance numeric(9,6) not null check(chance between 0 and 100),
  stock integer not null check(stock between 0 and 1000000),
  issued integer not null default 0 check(issued>=0 and issued<=stock),
  announce boolean not null default false, active boolean not null default true
);
insert into public.casino_live_prizes(id,name,kind,amount,chance,stock,announce) values
 ('seven','ทองคำ 96.5% 0.1 กรัม','physical',0,0.02,1,true),
 ('cherry','FFXIV key chain','physical',0,0.04,2,true),
 ('gold','1,000,000 Gil','gil',1000000,0.4,20,false),
 ('popoto','250,000 Gil','gil',250000,6.4,320,false)
on conflict do nothing;
create table if not exists public.casino_live_accounts (
  user_id uuid primary key references public.profiles(id),
  spins integer not null default 0 check(spins>=0),
  available_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.casino_live_spins (
  id uuid primary key, user_id uuid not null references public.profiles(id),
  player_name text not null, machine integer not null check(machine between 1 and 5),
  revision bigint not null, price integer not null, reels jsonb not null,
  prize jsonb, forced boolean not null default false,
  created_at timestamptz not null default now(), reveal_at timestamptz not null
);
create index if not exists casino_live_spins_recent on public.casino_live_spins(created_at desc,id);
create index if not exists casino_live_spins_player on public.casino_live_spins(user_id,created_at desc);
create table if not exists public.casino_live_receipts (
  id uuid primary key default gen_random_uuid(), spin_id uuid not null unique references public.casino_live_spins(id),
  user_id uuid not null references public.profiles(id), player_name text not null, prize jsonb not null,
  status text not null default 'pending' check(status in ('pending','processing','fulfilled','cancelled')),
  created_at timestamptz not null default now(), requested_at timestamptz,
  handled_by uuid references public.profiles(id), fulfilled_at timestamptz,
  note text not null default '' check(length(note)<=1000)
);
create index if not exists casino_live_receipts_bag on public.casino_live_receipts(user_id,status,created_at desc);
create index if not exists casino_live_receipts_queue on public.casino_live_receipts(status,created_at desc);
create table if not exists public.casino_live_audit (
  id bigint generated always as identity primary key, actor uuid not null references public.profiles(id),
  action text not null, detail jsonb not null, created_at timestamptz not null default now()
);
-- Live announcements are a separate, read-only feed. Only LIVE spins with the admin announcement flag insert here.
create table if not exists public.town_casino_announcements (
  id uuid primary key default gen_random_uuid(), player_name text not null,
  prize_name text not null, created_at timestamptz not null default now()
);
create index if not exists town_casino_announcements_recent on public.town_casino_announcements(created_at desc);

revoke all on function casino.live_member_allowed(),casino.live_admin_allowed() from public,anon;
grant usage on schema casino to authenticated;
grant execute on function casino.live_member_allowed(),casino.live_admin_allowed() to authenticated;
do $$ declare t text; begin
  foreach t in array array['casino_live_settings','casino_live_prizes',
    'casino_live_accounts','casino_live_spins','casino_live_receipts','casino_live_audit','town_casino_announcements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
  end loop;
  foreach t in array array['casino_live_settings','casino_live_prizes','casino_live_spins'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('drop policy if exists casino_live_read on public.%I',t);
    execute format('create policy casino_live_read on public.%I for select to authenticated using ((select public.casino_live_allowed()))',t);
  end loop;
end $$;
grant select on public.casino_live_receipts to authenticated;
drop policy if exists casino_live_read on public.casino_live_receipts;
create policy casino_live_read on public.casino_live_receipts for select to authenticated
using (casino.live_member_allowed() and (user_id=(select auth.uid()) or casino.live_admin_allowed()));
grant select on public.town_casino_announcements to authenticated;
drop policy if exists town_casino_announcements_read on public.town_casino_announcements;
create policy town_casino_announcements_read on public.town_casino_announcements for select to authenticated using (
  exists(select 1 from public.profiles p where p.id=(select auth.uid()) and
    (p.is_admin or (p.character_id is not null and p.character_verified_at is not null)))
);

create or replace function casino.require_live_member()
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not casino.live_member_allowed() then raise exception 'Casino access denied' using errcode='42501'; end if;
  return auth.uid();
end $$;

create or replace function casino.require_live_admin()
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not casino.live_admin_allowed() then raise exception 'Casino admin access denied' using errcode='42501'; end if;
 return auth.uid();
end $$;
create or replace function public.casino_live_state(p_receipt_page integer default 0, p_history boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=casino.require_live_member(); result jsonb;
begin
  if p_receipt_page is null or p_receipt_page not between 0 and 100000 then raise exception 'Invalid page'; end if;
  select jsonb_build_object(
    'user_id',me,'settings',(select to_jsonb(s) from public.casino_live_settings s where id=1),
    'prizes',(select jsonb_agg(to_jsonb(p) order by array_position(array['seven','cherry','gold','popoto'],p.id)) from public.casino_live_prizes p),
    'account',jsonb_build_object('coins',coalesce((select p.coins from public.town_purses p where p.member_id=me),0), 'spins',coalesce((select a.spins from public.casino_live_accounts a where a.user_id=me),0)),
    'spins',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from
      (select * from public.casino_live_spins order by created_at desc,id desc limit 30) x),
    'receipts',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from
      (select * from public.casino_live_receipts where user_id=me and
        case when p_history then status in ('fulfilled','cancelled') else status in ('pending','processing') end
        order by created_at desc,id desc limit 21 offset p_receipt_page*20) x),
    'queue',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]') from
      (select * from public.casino_live_receipts where casino.live_admin_allowed() and status in ('pending','processing') order by created_at,id limit 100) x),
    'server_now',clock_timestamp(),
    'paid_gil',(select coalesce(sum((prize->>'amount')::bigint) filter(where prize->>'kind'='gil'),0) from public.casino_live_receipts where casino.live_admin_allowed() and status='fulfilled')
  ) into result;
  return result;
end $$;

create or replace function public.casino_live_spin(p_request uuid,p_machine integer,p_force text default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=town.member(); s public.casino_live_settings; a public.casino_live_accounts;
  old public.casino_live_spins; p public.casino_live_prizes; won public.casino_live_prizes;
  prize_ jsonb; reels_ jsonb; n numeric; edge numeric:=0; total_ integer; sample_ integer;
  now_ timestamptz:=clock_timestamp(); name_ text; purse_ jsonb; i integer; ids_ text[]:=array['seven','cherry','gold','popoto'];
begin
  if p_request is null or p_machine is null or p_machine not between 1 and 5 or
    (p_force is not null and p_force not in ('miss','seven','cherry','gold','popoto')) then raise exception 'Invalid spin'; end if;
  if p_force is not null then raise exception 'Forced results are disabled in LIVE'; end if;
  -- All five machines share one short lock for budget, stock, and idempotency.
  select * into s from public.casino_live_settings where id=1 for update;
  now_:=clock_timestamp();
  select * into old from public.casino_live_spins where id=p_request;
  if found then
    if old.user_id<>me then raise exception 'Spin belongs to another player' using errcode='42501'; end if;
    return to_jsonb(old);
  end if;
  if p_revision is null or p_revision<>s.revision then raise exception 'Settings changed; refresh before spinning' using errcode='40001'; end if;
  if not s.open or (s.starts_at is not null and now_<s.starts_at) or (s.ends_at is not null and now_>=s.ends_at) then raise exception 'Casino paused or outside event hours'; end if;
  if exists(select 1 from public.casino_live_spins where machine=p_machine and reveal_at>now_) then raise exception 'Machine occupied'; end if;
  insert into public.casino_live_accounts(user_id) values(me) on conflict do nothing;
  select * into a from public.casino_live_accounts where user_id=me for update;
  if a.available_at>now_ then raise exception 'Wait for your current spin'; end if;
  if a.spins>=s.per_player then raise exception 'Spin allowance used'; end if;
  -- Follow the town's purse locking contract, preserving every other inventory field.
  perform town.purse_of(me,true);
  perform 1 from public.town_purses wallet_ where wallet_.member_id=me for update;
  purse_:=town.purse_of(me,true);
  if (purse_->>'coins')::numeric<s.price then raise exception 'Not enough Popoto coins'; end if;

  if s.mode='pool' then
    if p_force is not null then raise exception 'Forced results are only available in weighted rehearsal'; end if;
    if s.pool_draws>=s.pool_size then raise exception 'Prize pool finished'; end if;
    select coalesce(sum(stock-issued),0)::integer into total_ from public.casino_live_prizes where active;
    if total_>s.pool_size-s.pool_draws then raise exception 'Pool prizes exceed remaining draws'; end if;
    sample_:=floor(((('x'||substr(gen_random_uuid()::text,1,8))::bit(32)::bigint)::numeric/4294967296)*(s.pool_size-s.pool_draws))::integer;
    edge:=0;
    for p in select * from public.casino_live_prizes where active order by id loop
      edge:=edge+(p.stock-p.issued);
      if sample_<edge then won:=p; exit; end if;
    end loop;
  else
    n:=((('x'||substr(gen_random_uuid()::text,1,8))::bit(32)::bigint)::numeric/4294967296)*100;
    for p in select * from public.casino_live_prizes where active and issued<stock and
      (kind<>'gil' or amount<=s.budget-s.reserved) order by id loop
      edge:=edge+p.chance;
      if n<edge then won:=p; exit; end if;
    end loop;
  end if;
  if p_force is not null then
    won:=null;
    if p_force<>'miss' then select * into won from public.casino_live_prizes where id=p_force and active; end if;
  end if;
  if won.id is not null then
    if won.issued>=won.stock then raise exception 'Prize stock exhausted'; end if;
    if won.kind='gil' and won.amount>s.budget-s.reserved then raise exception 'Prize exceeds remaining Gil budget'; end if;
    update public.casino_live_prizes set issued=issued+1 where id=won.id;
    prize_:=jsonb_build_object('id',won.id,'name',won.name,'kind',won.kind,'amount',won.amount,'announce',won.announce,'test',false);
    reels_:=jsonb_build_array(won.id,won.id,won.id,won.id);
  else
    reels_:='[]'::jsonb;
    for i in 1..4 loop reels_:=reels_||to_jsonb(ids_[1+floor(((('x'||substr(gen_random_uuid()::text,1,8))::bit(32)::bigint)::numeric/4294967296)*4)::integer]); end loop;
    -- A miss can never visually show a winning four-of-a-kind.
    if (reels_->>0)=(reels_->>1) and (reels_->>0)=(reels_->>2) and (reels_->>0)=(reels_->>3) then
      reels_:=jsonb_set(reels_,'{3}',to_jsonb(ids_[1+(array_position(ids_,reels_->>0)%4)]));
    end if;
  end if;
  select coalesce(character_name,display_name,discord_username,'Tester') into name_ from public.profiles where id=me;
  insert into public.casino_live_spins(id,user_id,player_name,machine,revision,price,reels,prize,forced,created_at,reveal_at)
    values(p_request,me,name_,p_machine,s.revision,s.price,reels_,prize_,p_force is not null,now_,now_+interval '3.6 seconds') returning * into old;
  perform town.keep_purse(me,jsonb_set(purse_,'{coins}',to_jsonb((purse_->>'coins')::numeric-s.price+case when won.kind='coin' then won.amount else 0 end)));
  update public.casino_live_accounts set spins=spins+1,available_at=old.reveal_at,updated_at=now_ where user_id=me;
  update public.casino_live_settings set spins=spins+1,
    pool_draws=pool_draws+case when mode='pool' then 1 else 0 end,
    reserved=reserved+case when won.kind='gil' then won.amount else 0 end where id=1;
  if won.id is not null and won.kind in ('gil','physical') then
    insert into public.casino_live_receipts(spin_id,user_id,player_name,prize) values(p_request,me,name_,prize_);
  end if;
  if won.id is not null and won.announce then
    insert into public.town_casino_announcements(player_name,prize_name,created_at)
      values(name_,won.name,old.reveal_at);
  end if;
  return to_jsonb(old);
end $$;

create or replace function public.casino_live_save(p_revision bigint,p_doc jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=casino.require_live_admin(); s public.casino_live_settings; x jsonb;
  total numeric:=0; future_ bigint:=0; available_ integer:=0; used_ integer; ids_ text[]:='{}';
begin
  select * into s from public.casino_live_settings where id=1 for update;
  if p_revision is null or p_revision<>s.revision then raise exception 'Another admin changed settings; reload first' using errcode='40001'; end if;
  if p_doc is null or jsonb_typeof(p_doc->'prizes')<>'array' or jsonb_array_length(p_doc->'prizes')<>4 then raise exception 'Four prizes required'; end if;
  if not (p_doc ?& array['title','open','mode','price','per_player','budget','pool_size']) or
    length(p_doc->>'title') not between 1 and 100 or p_doc->>'mode' not in ('weighted','pool') or
    (p_doc->>'budget')::bigint<s.reserved or (p_doc->>'pool_size')::integer<s.pool_draws then raise exception 'Invalid settings or budget below committed rewards'; end if;
  for x in select value from jsonb_array_elements(p_doc->'prizes') loop
    if not(x ?& array['id','name','kind','amount','chance','stock','announce','active']) or
      x->>'id' not in ('seven','cherry','gold','popoto') or x->>'id'=any(ids_) or
      (x->>'chance')::numeric not between 0 and 100 then raise exception 'Invalid prize'; end if;
    ids_:=array_append(ids_,x->>'id');
    select issued into used_ from public.casino_live_prizes where id=x->>'id';
    if (x->>'stock')::integer<used_ then raise exception 'Stock below already issued rewards'; end if;
    if (x->>'active')::boolean then
      total:=total+(x->>'chance')::numeric; available_:=available_+(x->>'stock')::integer-used_;
      if x->>'kind'='gil' then future_:=future_+((x->>'stock')::bigint-used_)*(x->>'amount')::bigint; end if;
    end if;
    update public.casino_live_prizes set name=x->>'name',kind=x->>'kind',amount=(x->>'amount')::bigint,
      chance=(x->>'chance')::numeric,stock=(x->>'stock')::integer,announce=(x->>'announce')::boolean,active=(x->>'active')::boolean where id=x->>'id';
  end loop;
  select coalesce(sum(chance),0) into total from public.casino_live_prizes where active;
  if total>100 then raise exception 'Prize chances exceed 100 percent'; end if;
  if p_doc->>'mode'='pool' and (available_>(p_doc->>'pool_size')::integer-s.pool_draws or
    future_>(p_doc->>'budget')::bigint-s.reserved) then raise exception 'Pool exceeds remaining draws or Gil budget'; end if;
  insert into public.casino_live_audit(actor,action,detail) values(me,'settings',jsonb_build_object('before',to_jsonb(s),'prizes',p_doc));
  update public.casino_live_settings set title=p_doc->>'title',open=(p_doc->>'open')::boolean,mode=p_doc->>'mode',
    price=(p_doc->>'price')::integer,per_player=(p_doc->>'per_player')::integer,budget=(p_doc->>'budget')::bigint,
    pool_size=(p_doc->>'pool_size')::integer,starts_at=nullif(p_doc->>'starts_at','')::timestamptz,
    ends_at=nullif(p_doc->>'ends_at','')::timestamptz,revision=revision+1,updated_at=clock_timestamp(),updated_by=me where id=1;
  return public.casino_live_state();
end $$;

create or replace function public.casino_live_receipt(p_id uuid,p_action text,p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=casino.require_live_member(); r public.casino_live_receipts; before_ jsonb;
begin
  select * into r from public.casino_live_receipts where id=p_id for update;
  if not found then raise exception 'Receipt not found'; end if;
  if p_action is null or p_note is null or length(p_note)>1000 then raise exception 'Invalid receipt action'; end if;
  before_:=to_jsonb(r);
  if p_action='request' then
    if r.user_id<>me then raise exception 'Receipt belongs to another player' using errcode='42501'; end if;
    if r.status='pending' then update public.casino_live_receipts set requested_at=coalesce(requested_at,clock_timestamp()) where id=p_id; end if;
  elsif not casino.live_admin_allowed() then raise exception 'Casino admin access denied' using errcode='42501';
  elsif p_action='take' then
    if r.status='processing' and r.handled_by=me then return to_jsonb(r); end if;
    if r.status<>'pending' then raise exception 'Receipt already handled'; end if;
    update public.casino_live_receipts set status='processing',handled_by=me where id=p_id;
  elsif p_action='fulfill' then
    if r.status='fulfilled' and r.handled_by=me then return to_jsonb(r); end if;
    if r.status<>'processing' or r.handled_by<>me then raise exception 'Another admin is handling this receipt'; end if;
    update public.casino_live_receipts set status='fulfilled',fulfilled_at=clock_timestamp(),note=p_note where id=p_id;
  elsif p_action='release' then
    if r.status<>'processing' or r.handled_by<>me then raise exception 'Another admin is handling this receipt'; end if;
    if length(trim(p_note))=0 then raise exception 'Reason required'; end if;
    update public.casino_live_receipts set status='pending',handled_by=null,note=p_note where id=p_id;
  elsif p_action='cancel' then
    if r.status<>'processing' or r.handled_by<>me or length(trim(p_note))=0 then raise exception 'Take receipt and provide cancellation reason'; end if;
    -- Keep the reservation/stock: cancelling a claim never creates money or extra physical prizes.
    update public.casino_live_receipts set status='cancelled',note=p_note where id=p_id;
  else raise exception 'Invalid receipt action'; end if;
  select * into r from public.casino_live_receipts where id=p_id;
  insert into public.casino_live_audit(actor,action,detail) values(me,'receipt:'||p_action,jsonb_build_object('before',before_,'after',to_jsonb(r)));
  return to_jsonb(r);
end $$;

-- Explicit grants only. Direct edits of lab wallets, results and receipts are impossible.
revoke all on function casino.require_live_member(),casino.require_live_admin() from public,anon,authenticated;
revoke all on function public.casino_live_state(integer,boolean), public.casino_live_spin(uuid,integer,text,bigint),
  public.casino_live_save(bigint,jsonb), public.casino_live_receipt(uuid,text,text) from public,anon;
grant execute on function public.casino_live_state(integer,boolean), public.casino_live_spin(uuid,integer,text,bigint),
  public.casino_live_save(bigint,jsonb), public.casino_live_receipt(uuid,text,text) to authenticated;

-- Only authorised testers can join presence/cheering. Financial results come from DB inserts.
drop policy if exists casino_live_room_read on realtime.messages;
create policy casino_live_room_read on realtime.messages for select to authenticated using (
  realtime.topic()='casino-live' and (select public.casino_live_allowed())
);
drop policy if exists casino_live_room_write on realtime.messages;
create policy casino_live_room_write on realtime.messages for insert to authenticated with check (
  realtime.topic()='casino-live' and (select public.casino_live_allowed())
);
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['casino_live_settings','casino_live_prizes','casino_live_spins','casino_live_receipts','town_casino_announcements'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
select jsonb_build_object(
 'installed',to_regprocedure('public.casino_live_spin(uuid,integer,text,bigint)') is not null,
 'public_open',(select open from public.casino_live_settings where id=1),
 'wallet_write_blocked',not has_table_privilege('authenticated','public.casino_live_accounts','UPDATE'),
 'receipt_write_blocked',not has_table_privilege('authenticated','public.casino_live_receipts','UPDATE'),
 'history_kept',not has_table_privilege('authenticated','public.casino_live_receipts','DELETE'),
 'test_guard_kept',to_regprocedure('public.casino_lab_allowed()') is not null
) as casino_live_verified;
