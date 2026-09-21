-- v93 — three ways to be handed it
--
-- Run this once in the Supabase SQL editor, after v92.
--
-- v92 made how a win arrives its own setting and gave it two values: the
-- R/SR/UR card, or Aqua throwing coins. There are three of her now, and they
-- are not three volumes of the same thing — they are three different things to
-- be handed:
--
--   aqua         she flings a handful of coins in the air. The small, often
--                one: gil landing in a wallet.
--   aqua_purse   she holds out a full purse with both hands, pushing it at
--                you. For something worth stopping to receive.
--   aqua_card    she tips her hat down, and comes back up in sunglasses with
--                a black card held out between two fingers. For the one that
--                is funny because it is absurd.
--
-- 'aqua' keeps its name rather than becoming 'aqua_shower', because it is
-- already written on every gil prize in the cupboard and on every win anybody
-- is holding, and renaming a value to make a set look tidy is a migration that
-- can only break things.
--
-- The wallet's notification body says which card it wants in its first half
-- (v91, v92). That half is now any of the four words rather than two, which
-- costs one `like` in the function below and nothing else.

/* ── the three of her ────────────────────────────────────────────────────── */

-- The check was made unnamed by v92's `add column ... check (...)`, which
-- Postgres called this.
alter table public.prizes drop constraint if exists prizes_fx_check;
alter table public.prizes add constraint prizes_fx_check
  check (fx in ('tier', 'aqua', 'aqua_purse', 'aqua_card'));

/**
 * v92's, passing any of her cards through rather than the one.
 *
 * The tier still goes onto the payment itself: the wallet's own page reads it
 * off there, and it is the thing that says how good a day it was. What the
 * first half of the notification body says is only which card to draw.
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
  card text := case when p_fx like 'aqua%' then p_fx
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

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select name, kind, fx from public.prizes order by id;
 *   -- unchanged: the gil ones still say aqua
 *
 *   insert into public.prizes (name, chance_pct, fx) values ('x', 0, 'aqua_card');
 *   -- accepted, where before v93 it was refused. Delete it again afterwards.
 */
