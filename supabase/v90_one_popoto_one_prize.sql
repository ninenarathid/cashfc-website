-- v90 — one popoto, one prize
--
-- Run this once in the Supabase SQL editor, after v89.
--
-- A popoto was rolling four times. The prizes drawn on receiving, the ones
-- drawn on sending, the pair, and the once-a-day were four groups with a
-- number each, and four numbers is four chances: one popoto could hand the
-- sender some gil, the person it went to something else, and both of them a
-- third thing, all at once. Within a group they already could not collide —
-- v87 laid them end to end on one number for exactly this reason — and the
-- groups were left independent because they are about different people.
--
-- Which was the wrong call. "How often does sending a popoto win something"
-- is one question with one answer, and the four groups are four ways of
-- deciding who gets it rather than four separate draws. So they now share the
-- one line: every prize a popoto could possibly produce is laid end to end on
-- a single number from 0 to 100, and at most one comes up. The total of the
-- cupboard is now the chance of winning anything at all, which is the number
-- anybody setting these was already reading it as.
--
-- What that changes in practice, at the four prizes in the cupboard today:
-- nothing at all. They are all drawn on sending, so they were already on one
-- line together. It changes what happens the day somebody adds a prize to a
-- second group, which is the day the old shape would have started quietly
-- handing out two.
--
-- The once-a-day keeps its own rule and loses its own roll. A sender's first
-- popoto of the day is the one whose line includes the daily prizes; every
-- later popoto that day is drawn without them. The day is claimed whether or
-- not the number lands on one, because the claim is on the roll and not on
-- the outcome — the alternative is a daily prize that gets a fresh go at
-- every popoto until it hits, which is not "once a day".
--
-- The rare popoto is NOT part of this and is deliberately left alone. It is
-- its own feature with its own switch, its own chance and its own keeper
-- (v77, v79, v83), and folding it in would mean turning a prize on quietly
-- making rare popoto rarer. A popoto can still be both. That is one roll each
-- from two systems, not one system rolling twice.

/**
 * Every prize one popoto could produce, on one number.
 *
 * Replaces draw_prizes and draw_prize_pair, which are dropped below: a
 * function per group is the shape that made four rolls look reasonable.
 *
 * The eligibility of a prize depends on which group it is in — who has to
 * exist, whose character has to match the audience, how much stock a win
 * costs — so that lives in one CASE rather than in four queries, and the
 * order is by id, which is the order the admin panel lists and totals them.
 */
create or replace function public.draw_one_prize(
  p_receiver uuid, p_sender uuid, p_kudos bigint, p_daily boolean
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rcv   public.profiles;
  snd   public.profiles;
  -- Whether there is a receiver worth drawing for. A flag rather than a null
  -- row variable: "is this composite null" is a question with a fiddly answer
  -- and this one is asked from inside a query.
  has_rcv boolean := false;
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

  -- A prize is handed to a character in game, so an account that has not
  -- proved one cannot win. The receiver may simply not exist — a popoto can
  -- be given to a character nobody on the site holds — and that only rules
  -- out the prizes that would have gone to them.
  select * into snd from public.profiles pr where pr.id = p_sender;
  if snd.id is null or snd.character_id is null or snd.character_verified_at is null then
    return;
  end if;
  if p_receiver is not null then
    select * into rcv from public.profiles pr where pr.id = p_receiver;
    has_rcv := rcv.id is not null and rcv.character_id is not null
      and rcv.character_verified_at is not null;
  end if;

  roll := random() * 100;

  for p in
    select * from public.prizes pz
     where pz.active
       and pz.chance_pct > 0
       and case pz.draw
             when 'give' then
               (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
             when 'daily' then
               p_daily
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
             when 'receive' then
               has_rcv
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, rcv.character_id)
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

  -- Take it off the shelf, and only if it is still there: two popotos a
  -- moment apart can both have read the same last one. A pair costs two.
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
    chr := case when who = p_sender then snd.character_id else rcv.character_id end;
    insert into public.prize_wins (
      prize_id, winner, character_id,
      prize_name, prize_name_en, prize_detail, prize_detail_en,
      prize_icon, prize_color, prize_tier, draw, kudos_id)
    values (
      got.id, who, chr,
      got.name, got.name_en, got.detail, got.detail_en,
      got.icon_url, got.color, got.tier, got.draw, p_kudos)
    returning id into win;

    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (who, 'prize_win', null, null, win::text);
  end loop;
end;
$fn$;

/**
 * v88's trigger, with one roll in it instead of four.
 *
 * Still wrapped: a prize that fails to be drawn is a warning in the log and a
 * potato that still arrived.
 */
create or replace function public.prizes_on_kudos()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  receiver uuid;
  mine     boolean;
  daily    boolean := false;
begin
  if not coalesce((select s.enabled from public.prize_switch s where s.id = 1), false) then
    return null;
  end if;

  if not exists (select 1 from public.prizes pz
                  where pz.active and pz.chance_pct > 0) then
    return null;
  end if;

  -- To your own character: counted, never a prize. It is free, and a draw
  -- anybody can enter fifty times a minute by pressing their own profile is a
  -- draw about nothing (lib/evercold.ts, about the same act).
  select exists (
    select 1 from public.profiles p
     where p.id = new.sender_id and p.character_id = new.receiver_character_id
  ) into mine;
  if mine then return null; end if;

  select id into receiver
    from public.profiles
   where character_id = new.receiver_character_id
     and character_verified_at is not null
   limit 1;

  /*
   * Whether the daily prizes are on this popoto's line.
   *
   * The insert is the claim on today: whoever gets the row gets the shot, and
   * every later popoto that day is drawn without them. Claimed before the
   * roll rather than after a win, because the claim is on the roll — a daily
   * prize that kept trying until it hit would be a daily prize in name only.
   *
   * Only asked when there is a daily prize to be had, so an FC that never
   * uses them never writes the row.
   */
  if exists (select 1 from public.prizes pz
              where pz.active and pz.draw = 'daily' and pz.chance_pct > 0) then
    insert into public.prize_daily_rolls (profile_id, day)
    values (new.sender_id, (new.created_at at time zone 'Asia/Bangkok')::date)
    on conflict do nothing;
    daily := found;
  end if;

  perform public.draw_one_prize(receiver, new.sender_id, new.id, daily);
  return null;
exception
  when others then
    raise warning 'prize draw failed for kudos %: % (%)', new.id, sqlerrm, sqlstate;
    return null;
end;
$fn$;

-- The four-roll shape goes with it, so nothing can call it back by accident.
drop function if exists public.draw_prize_pair(uuid, uuid, bigint);
drop function if exists public.draw_prizes(uuid, text, bigint);

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select proname from pg_proc
 *    where proname in ('draw_prizes', 'draw_prize_pair', 'draw_one_prize');
 *   -- draw_one_prize, and nothing else
 *
 * And from here, no popoto can be behind two rows of prize_wins:
 *
 *   select kudos_id, count(*) from public.prize_wins
 *    where kudos_id is not null group by kudos_id having count(*) > 1;
 *   -- a pair is the one exception, and both its rows are the same prize
 */
