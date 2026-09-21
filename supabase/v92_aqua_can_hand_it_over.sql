-- v92 — Aqua can hand over a minion too
--
-- Run this once in the Supabase SQL editor, after v91.
--
-- v91 gave the wallet its own notification card: Aqua standing out of the top
-- of it, throwing the coins, going round for as long as it is up. It is the
-- best thing on the site and it was nailed to one kind of prize, which is a
-- waste of a good drawing — a minion is as worth being handed by somebody as
-- ten thousand gil is.
--
-- So how a win arrives is now its own setting, separate from how loud it is:
--
--   prizes.fx        'tier' — the R/SR/UR card, which is what everything has
--                    worn so far — or 'aqua', her card.
--   prize_wins.fx    copied onto the win with the rest of it, so re-dressing a
--                    prize later does not re-dress one somebody already holds.
--
-- It is deliberately not a fourth tier. The tier is a ladder — R, SR and UR
-- mean the same amount of noise everywhere on this site, including inside the
-- rare popoto, which has nothing to do with prizes — and a rung that is not
-- louder than the one below it but simply different is not a rung. A prize
-- keeps its tier when it is dressed as Aqua: the tier is still what its chip
-- says and still what the card in the winner's inventory does. This is about
-- the moment it lands.
--
-- The wallet says which card it wants in the notification body, where it has
-- always said which tier: the first half of "ultra:30000" is now either a tier
-- or the word aqua — which card, and how much. Nothing else about the body
-- changes, and one written before this still reads.
--
-- The three gil prizes from v91 are set to 'aqua' at the bottom of this file,
-- because that is what they already do and a migration that quietly turned it
-- off would be a migration that broke the thing it was written to spread.

/* ── how a win arrives ───────────────────────────────────────────────────── */

alter table public.prizes
  add column if not exists fx text not null default 'tier'
    check (fx in ('tier', 'aqua'));

alter table public.prize_wins
  add column if not exists prize_fx text not null default 'tier';

/* ── paying into a wallet, saying which card ─────────────────────────────── */

/**
 * v91's, carrying the prize's choice of card as well as its tier.
 *
 * The tier is still written onto the payment, because the wallet's own page
 * still reads it off there — what the extra argument changes is only the first
 * half of the notification's body, which is the browser's instruction for
 * which card to draw.
 */
create or replace function public.credit_wallet(
  p_who uuid, p_amount integer, p_prize bigint, p_name text,
  p_color text, p_tier text, p_fx text, p_kudos bigint
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  bar  bigint;
  held bigint;
  card text := case when p_fx = 'aqua' then 'aqua'
                    else coalesce(p_tier, 'rare') end;
begin
  if p_who is null or coalesce(p_amount, 0) <= 0 then return; end if;

  insert into public.wallets (profile_id, balance, earned)
  values (p_who, p_amount, p_amount)
  on conflict (profile_id) do update
    set balance = wallets.balance + excluded.balance,
        earned  = wallets.earned + excluded.earned,
        updated_at = now()
  returning balance into held;

  insert into public.wallet_drops
    (profile_id, amount, prize_id, prize_name, prize_color, tier, kudos_id)
  values (p_who, p_amount, p_prize, p_name, p_color,
          coalesce(p_tier, 'rare'), p_kudos);

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  values (p_who, 'wallet_drop', null, null, card || ':' || p_amount::text);

  select threshold into bar from public.wallet_switch where id = 1;
  if bar is not null and held >= bar and held - p_amount < bar then
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (p_who, 'wallet_full', null, null, card || ':' || held::text);
  end if;
end;
$fn$;

revoke all on function public.credit_wallet(
  uuid, integer, bigint, text, text, text, text, bigint)
  from public, anon, authenticated;

-- v91's shape, gone now that nothing calls it.
drop function if exists public.credit_wallet(
  uuid, integer, bigint, text, text, text, bigint);

/* ── the draw, carrying it onto the win ──────────────────────────────────── */

/**
 * v91's roll, with one more column copied onto what it hands out.
 *
 * Everything else is unchanged: one number, every prize laid end to end on it,
 * at most one of them coming up, gil into a wallet and anything else into a row
 * somebody has to hand over.
 */
create or replace function public.draw_one_prize(
  p_receiver uuid, p_receiver_character bigint, p_sender uuid,
  p_kudos bigint, p_daily boolean
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rcv   public.profiles;
  snd   public.profiles;
  has_rcv boolean := false;
  purse boolean;
  p     public.prizes;
  hit   public.prizes;
  got   public.prizes;
  roll  double precision;
  acc   numeric := 0;
  win   bigint;
  who   uuid;
  chr   bigint;
  winners uuid[];
begin
  if p_sender is null then return; end if;

  select * into snd from public.profiles pr where pr.id = p_sender;
  if snd.id is null or snd.character_id is null or snd.character_verified_at is null then
    return;
  end if;
  if p_receiver is not null then
    select * into rcv from public.profiles pr where pr.id = p_receiver;
    has_rcv := rcv.id is not null and rcv.character_id is not null
      and rcv.character_verified_at is not null;
  end if;

  select coalesce(s.enabled, false) into purse
    from public.wallet_switch s where s.id = 1;
  purse := coalesce(purse, false);

  roll := random() * 100;

  for p in
    select * from public.prizes pz
     where pz.active
       and pz.chance_pct > 0
       and (pz.kind <> 'gil' or purse)
       and case pz.draw
             when 'give' then
               (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
               and public.prize_other_side_ok(pz.other_side, p_receiver_character)
             when 'daily' then
               p_daily
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
             when 'receive' then
               has_rcv
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, rcv.character_id)
               and public.prize_other_side_ok(pz.other_side, snd.character_id)
             when 'both' then
               has_rcv
               and (pz.stock is null or pz.stock >= 2)
               and public.prize_audience_ok(pz.audience, snd.character_id)
               and public.prize_audience_ok(pz.audience, rcv.character_id)
             else false
           end
     order by pz.id
  loop
    acc := acc + p.chance_pct;
    if roll < acc then
      hit := p;
      exit;
    end if;
  end loop;

  if hit.id is null then return; end if;

  update public.prizes
     set stock = stock - (case when hit.draw = 'both' then 2 else 1 end)
   where id = hit.id
     and (stock is null or stock >= (case when hit.draw = 'both' then 2 else 1 end))
  returning * into got;
  if got.id is null then return; end if;

  winners := case hit.draw
               when 'receive' then array[p_receiver]
               when 'both' then array[p_receiver, p_sender]
               else array[p_sender]
             end;

  foreach who in array winners loop
    if got.kind = 'gil' then
      perform public.credit_wallet(
        who, got.gil_amount, got.id, got.name, got.color, got.tier, got.fx, p_kudos);
    else
      chr := case when who = p_sender then snd.character_id else rcv.character_id end;
      insert into public.prize_wins (
        prize_id, winner, character_id,
        prize_name, prize_name_en, prize_detail, prize_detail_en,
        prize_icon, prize_color, prize_tier, prize_fx, draw, kudos_id)
      values (
        got.id, who, chr,
        got.name, got.name_en, got.detail, got.detail_en,
        got.icon_url, got.color, got.tier, got.fx, got.draw, p_kudos)
      returning id into win;

      insert into public.notifications (recipient, kind, actor, actor_name, body)
      values (who, 'prize_win', null, null, win::text);
    end if;
  end loop;
end;
$fn$;

revoke all on function public.draw_one_prize(
  uuid, bigint, uuid, bigint, boolean)
  from public, anon, authenticated;

/* ── what a browser may write on a win ───────────────────────────────────── */

/**
 * v91's guard, pinning the column added since.
 *
 * Unreachable from a browser either way — the grant is `update (seen_winner,
 * seen_admin)` and nothing else — and listed anyway, because this function is
 * the answer to "what can be written here" and an answer with a gap in it has
 * to be read twice before it can be trusted once.
 */
create or replace function public.prize_wins_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare admin boolean := public.is_admin();
begin
  if coalesce(current_setting('app.prize_trusted', true), '') = 'on' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;

  new.id := old.id; new.prize_id := old.prize_id; new.winner := old.winner;
  new.character_id := old.character_id;
  new.prize_name := old.prize_name; new.prize_name_en := old.prize_name_en;
  new.prize_detail := old.prize_detail; new.prize_detail_en := old.prize_detail_en;
  new.prize_icon := old.prize_icon; new.prize_color := old.prize_color;
  new.prize_tier := old.prize_tier; new.prize_fx := old.prize_fx;
  new.gil_amount := old.gil_amount;
  new.draw := old.draw; new.kudos_id := old.kudos_id; new.won_at := old.won_at;
  new.claimed_at := old.claimed_at;
  new.delivered_at := old.delivered_at; new.delivered_by := old.delivered_by;

  if old.winner = auth.uid() then
    new.seen_admin := old.seen_admin;
  elsif admin then
    new.seen_winner := old.seen_winner;
  else
    return old;
  end if;
  return new;
end;
$fn$;

/* ── the money keeps the card it already had ─────────────────────────────── */

-- The gil prizes are what she was drawn for. The column's default is 'tier'
-- because that is what every prize made before today wore, and these three are
-- the exception rather than the rule.
update public.prizes set fx = 'aqua' where kind = 'gil' and fx = 'tier';

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select name, kind, tier, fx from public.prizes order by id;
 *   -- the gil ones say aqua, everything else says tier
 *
 *   select proname, pronargs from pg_proc where proname = 'credit_wallet';
 *   -- one row, with eight arguments
 */
