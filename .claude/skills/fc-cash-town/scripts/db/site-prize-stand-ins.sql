-- The site's prize and wallet tables (v87, v91, v93), stood in for on the town's bench with the columns and the
-- functions the casino (v299) uses, their bodies as they ran; and Supabase's Realtime `send`, which keeps what it is
-- given. Read by v299.test.mjs, and given to town-bench.mjs before v299 (BENCH_EXTRA) for a try in `next dev`.
create table if not exists public.prizes (id bigserial primary key);
create table if not exists public.kudos (id bigserial primary key);
create table if not exists public.notifications (id bigserial primary key, recipient uuid not null, kind text not null, actor uuid, actor_name text,
  body text, read_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.prize_wins (id bigserial primary key, prize_id bigint references public.prizes(id) on delete set null,
  winner uuid not null references auth.users(id) on delete cascade, character_id bigint, prize_name text not null, prize_name_en text, prize_detail text,
  prize_detail_en text, prize_icon text, prize_color text not null default '#f3c969', draw text not null, kudos_id bigint references public.kudos(id),
  won_at timestamptz not null default now(), claimed_at timestamptz, delivered_at timestamptz, delivered_by uuid, seen_winner timestamptz, seen_admin timestamptz,
  prize_tier text not null default 'rare', gil_amount bigint, prize_fx text not null default 'tier');
create table if not exists public.prize_messages (id bigserial primary key, win_id bigint not null references public.prize_wins(id) on delete cascade,
  author_id uuid not null, body text not null, created_at timestamptz not null default now());
create table if not exists public.wallet_switch (id smallint primary key default 1, enabled boolean not null default false, threshold bigint not null default 250000);
insert into public.wallet_switch (id, enabled) values (1, true) on conflict do nothing;
create table if not exists public.wallets (profile_id uuid primary key references auth.users(id), balance bigint not null default 0 check (balance >= 0),
  earned bigint not null default 0 check (earned >= 0), updated_at timestamptz not null default now());
create table if not exists public.wallet_drops (id bigserial primary key, profile_id uuid not null references auth.users(id), amount integer not null check (amount > 0),
  prize_id bigint references public.prizes(id), prize_name text not null, prize_color text, tier text not null default 'rare' check (tier in ('rare','super','ultra')),
  kudos_id bigint, seen_at timestamptz, created_at timestamptz not null default now());
create or replace function public.actor_name() returns text language sql stable as $$ select 'x' $$;
create or replace function public.credit_wallet(p_who uuid, p_amount integer, p_prize bigint, p_name text, p_color text, p_tier text, p_fx text, p_kudos bigint)
returns void language plpgsql security definer set search_path = public as $fn$
declare bar bigint; held bigint; card text := case when p_fx like 'aqua%' then p_fx else coalesce(p_tier, 'rare') end;
begin
  if p_who is null or coalesce(p_amount, 0) <= 0 then return; end if;
  insert into public.wallets (profile_id, balance, earned) values (p_who, p_amount, p_amount)
  on conflict (profile_id) do update set balance = wallets.balance + excluded.balance, earned = wallets.earned + excluded.earned, updated_at = now()
  returning balance into held;
  insert into public.wallet_drops (profile_id, amount, prize_id, prize_name, prize_color, tier, kudos_id) values (p_who, p_amount, p_prize, p_name, p_color, coalesce(p_tier, 'rare'), p_kudos);
  insert into public.notifications (recipient, kind, actor, actor_name, body) values (p_who, 'wallet_drop', null, null, card || ':' || p_amount::text);
  select threshold into bar from public.wallet_switch where id = 1;
  if bar is not null and held >= bar and held - p_amount < bar then
    insert into public.notifications (recipient, kind, actor, actor_name, body) values (p_who, 'wallet_full', null, null, card || ':' || held::text);
  end if;
end $fn$;
revoke all on function public.credit_wallet(uuid, integer, bigint, text, text, text, text, bigint) from public, anon, authenticated;
create or replace function public.claim_prize(p_win bigint) returns timestamptz language plpgsql security definer set search_path = public as $fn$
declare w public.prize_wins; at timestamptz;
begin
  select * into w from public.prize_wins where id = p_win;
  if w.id is null then raise exception 'no such prize'; end if;
  if w.winner <> auth.uid() then raise exception 'not yours'; end if;
  if w.claimed_at is not null then return w.claimed_at; end if;
  update public.prize_wins set claimed_at = now(), seen_admin = null where id = p_win returning claimed_at into at;
  insert into public.notifications (recipient, kind, actor, actor_name, body) select p.id, 'prize_claim', auth.uid(), public.actor_name(), p_win::text from public.profiles p where p.is_admin and p.id <> auth.uid();
  return at;
end $fn$;
create or replace function public.deliver_prize(p_win bigint) returns timestamptz language plpgsql security definer set search_path = public as $fn$
declare w public.prize_wins; at timestamptz;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then raise exception 'admins only'; end if;
  select * into w from public.prize_wins where id = p_win;
  update public.prize_wins set delivered_at = now(), delivered_by = auth.uid() where id = p_win returning delivered_at into at;
  insert into public.notifications (recipient, kind, actor, actor_name, body) values (w.winner, 'prize_done', auth.uid(), public.actor_name(), p_win::text);
  return at;
end $fn$;
create or replace function public.notify_prize_message() returns trigger language plpgsql security definer set search_path = public as $fn$
declare w public.prize_wins;
begin
  select * into w from public.prize_wins where id = new.win_id;
  if new.author_id = w.winner then
    insert into public.notifications (recipient, kind, actor, actor_name, body) select p.id, 'prize_ask', new.author_id, public.actor_name(), w.id::text from public.profiles p where p.is_admin and p.id <> new.author_id;
  else insert into public.notifications (recipient, kind, actor, actor_name, body) values (w.winner, 'prize_talk', new.author_id, public.actor_name(), w.id::text);
  end if;
  return null;
end $fn$;
drop trigger if exists notify_prize_message on public.prize_messages;
create trigger notify_prize_message after insert on public.prize_messages for each row execute function public.notify_prize_message();
grant execute on function public.claim_prize(bigint), public.deliver_prize(bigint) to authenticated;
-- withdraw_wallet (v91): the whole balance out at once, a prize row of its own ('เงินสะสม', draw 'give') for the admins
create or replace function public.withdraw_wallet() returns bigint language plpgsql security definer set search_path = public as $fn$
declare me uuid := auth.uid(); sw public.wallet_switch; who public.profiles; took bigint; win bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into sw from public.wallet_switch where id = 1;
  if sw.id is null or not sw.enabled then raise exception 'the wallet is not running'; end if;
  select * into who from public.profiles where id = me;
  if who.character_id is null or who.character_verified_at is null then raise exception 'verify your character first'; end if;
  select w.balance into took from public.wallets w where w.profile_id = me for update;
  if took is null or took < sw.threshold then raise exception 'not enough in the wallet yet'; end if;
  update public.wallets set balance = balance - took, updated_at = now() where profile_id = me;
  insert into public.prize_wins (prize_id, winner, character_id, prize_name, prize_name_en, prize_detail, prize_detail_en,
    prize_icon, prize_color, prize_tier, draw, gil_amount, claimed_at, seen_winner)
  values (null, me, who.character_id, 'เงินสะสม', 'Saved gil', null, null, null, '#d9a441', 'rare', 'give', took, now(), now())
  returning id into win;
  insert into public.notifications (recipient, kind, actor, actor_name, body)
  select p.id, 'prize_claim', me, public.actor_name(), win::text from public.profiles p where p.is_admin and p.id <> me;
  return took;
end $fn$;
grant execute on function public.withdraw_wallet() to authenticated;

-- Supabase's Realtime, stood in for: what is sent is kept; a topic named to fail fails
create schema if not exists realtime;
create table if not exists realtime.sent (topic text, event text, payload jsonb, private boolean);
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $fn$
begin if current_setting('test.realtime_down', true) = 'on' then raise exception 'cannot send'; end if; insert into realtime.sent values (topic, event, payload, private); end $fn$;
