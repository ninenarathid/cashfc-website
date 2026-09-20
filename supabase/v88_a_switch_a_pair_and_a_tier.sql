-- v88 — a switch, a pair, and a tier
--
-- Run this once in the Supabase SQL editor, after v87.
--
-- Four things v87 wanted and did not have:
--
--   prize_switch    whether the prize draw runs at all. v87 had a switch per
--                   prize and none over the lot of them, so turning the whole
--                   thing off meant pausing every row one at a time and
--                   remembering which had already been off. Same shape as the
--                   rare popoto's (v79), off to start with for the same
--                   reason: everything can be written and looked at before
--                   anybody can win any of it.
--
--   draw = 'both'   one popoto, two winners — the person who sent it and the
--                   person it went to. Stock therefore leaves two at a time,
--                   so a prize drawn this way must have an even number of
--                   them or none at all, which is a constraint rather than a
--                   warning: half a pair is a promise to one of two people.
--
--   prizes.tier     which of the three the win looks like when it lands. The
--                   ladder is the rare popoto's — R, SR, UR, the same colours
--                   and the same fanfare (lib/popoto-rare.ts TIER_LOOK and
--                   TIER_FX) — because the FC has already learnt to read it
--                   and a second ladder would only have to be explained.
--
--                   It is a costume, not a chance. Nothing about the tier
--                   changes how often a prize comes up; the admin panel
--                   suggests a chance to match each one and lets any number
--                   through, because how rare a thing feels and how rare it
--                   is are for whoever is giving it away to decide.
--
--   250,000 gil     something in the cupboard, so the first look at it is not
--                   an empty screen. 1%, drawn on a popoto being sent. At the
--                   pace of the last week that is about three a day, which is
--                   a lot of gil — it is in there switched on, behind a
--                   master switch that is off, which is the safe way round.

/* ── whether any of it runs ──────────────────────────────────────────────── */

create table if not exists public.prize_switch (
  id          smallint primary key default 1 check (id = 1),
  enabled     boolean not null default false,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references auth.users(id) on delete set null
);

insert into public.prize_switch (id, enabled) values (1, false)
on conflict (id) do nothing;

alter table public.prize_switch enable row level security;

drop policy if exists prize_switch_admin_read on public.prize_switch;
create policy prize_switch_admin_read on public.prize_switch
  for select to authenticated using (public.is_admin());

drop policy if exists prize_switch_admin_flip on public.prize_switch;
create policy prize_switch_admin_flip on public.prize_switch
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update (enabled, changed_at, changed_by)
  on public.prize_switch to authenticated;

/* ── one popoto, two winners ─────────────────────────────────────────────── */

-- The column check is an unnamed one from v87, which Postgres called this.
alter table public.prizes drop constraint if exists prizes_draw_check;
alter table public.prizes add constraint prizes_draw_check
  check (draw in ('receive', 'give', 'daily', 'both'));

-- Stock leaves two at a time for a pair, so an odd number would end with one
-- left and nobody able to win it. Refused rather than rounded: the number in
-- the box is how many of the thing exist, and the site should not quietly
-- decide that one of them does not.
alter table public.prizes drop constraint if exists prizes_pair_stock_even;
alter table public.prizes add constraint prizes_pair_stock_even
  check (draw <> 'both' or stock is null or stock % 2 = 0);

/* ── what a win looks like ───────────────────────────────────────────────── */

alter table public.prizes
  add column if not exists tier text not null default 'rare'
    check (tier in ('rare', 'super', 'ultra'));

-- Copied onto the win with the rest of it, so re-dressing a prize later does
-- not change how somebody's own already looked when it arrived.
alter table public.prize_wins
  add column if not exists prize_tier text not null default 'rare';

/* ── the draw, with all of that in it ────────────────────────────────────── */

/**
 * v87's roll, carrying the tier and asking the switch first.
 *
 * The switch is read by the caller rather than here, because the caller reads
 * it once for all three draws rather than once each.
 */
create or replace function public.draw_prizes(
  p_winner uuid, p_draw text, p_kudos bigint
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  who   public.profiles;
  p     public.prizes;
  got   public.prizes;
  roll  double precision;
  acc   numeric := 0;
  win   bigint;
begin
  if p_winner is null then return; end if;

  select * into who from public.profiles pr where pr.id = p_winner;
  if who.id is null or who.character_id is null or who.character_verified_at is null then
    return;
  end if;

  roll := random() * 100;

  for p in
    select * from public.prizes pz
     where pz.active
       and pz.draw = p_draw
       and pz.chance_pct > 0
       and (pz.stock is null or pz.stock > 0)
       and public.prize_audience_ok(pz.audience, who.character_id)
     order by pz.id
  loop
    acc := acc + p.chance_pct;
    if roll < acc then
      update public.prizes
         set stock = stock - 1
       where id = p.id and (stock is null or stock > 0)
      returning * into got;
      if got.id is null then return; end if;

      insert into public.prize_wins (
        prize_id, winner, character_id,
        prize_name, prize_name_en, prize_detail, prize_detail_en,
        prize_icon, prize_color, prize_tier, draw, kudos_id)
      values (
        got.id, p_winner, who.character_id,
        got.name, got.name_en, got.detail, got.detail_en,
        got.icon_url, got.color, got.tier, p_draw, p_kudos)
      returning id into win;

      insert into public.notifications (recipient, kind, actor, actor_name, body)
      values (p_winner, 'prize_win', null, null, win::text);
      return;
    end if;
  end loop;
end;
$fn$;

/**
 * The same roll, for the prizes that are won by two people at once.
 *
 * One number for the pair, not one each: it is one prize being handed out
 * twice, and rolling separately would mean the popoto where only the sender
 * won, which is the thing this exists to avoid.
 *
 * Both have to be eligible for it to be drawn at all — a proved character
 * each, and both inside whoever the prize is for. A pair with one winner is
 * not a pair, and it is also how the stock stays even.
 */
create or replace function public.draw_prize_pair(
  p_receiver uuid, p_sender uuid, p_kudos bigint
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  a    public.profiles;
  b    public.profiles;
  p    public.prizes;
  got  public.prizes;
  roll double precision;
  acc  numeric := 0;
  win  bigint;
  who  uuid;
  chr  bigint;
begin
  if p_receiver is null or p_sender is null or p_receiver = p_sender then return; end if;

  select * into a from public.profiles pr where pr.id = p_receiver;
  select * into b from public.profiles pr where pr.id = p_sender;
  if a.id is null or a.character_id is null or a.character_verified_at is null then return; end if;
  if b.id is null or b.character_id is null or b.character_verified_at is null then return; end if;

  roll := random() * 100;

  for p in
    select * from public.prizes pz
     where pz.active
       and pz.draw = 'both'
       and pz.chance_pct > 0
       and (pz.stock is null or pz.stock >= 2)
       and public.prize_audience_ok(pz.audience, a.character_id)
       and public.prize_audience_ok(pz.audience, b.character_id)
     order by pz.id
  loop
    acc := acc + p.chance_pct;
    if roll < acc then
      update public.prizes
         set stock = stock - 2
       where id = p.id and (stock is null or stock >= 2)
      returning * into got;
      if got.id is null then return; end if;

      -- Two rows, two notifications, one prize. Each is somebody's own from
      -- here: claimed, arranged and handed over separately, because they are
      -- two different people who will be free at two different times.
      foreach who in array array[p_receiver, p_sender] loop
        chr := case when who = p_receiver then a.character_id else b.character_id end;
        insert into public.prize_wins (
          prize_id, winner, character_id,
          prize_name, prize_name_en, prize_detail, prize_detail_en,
          prize_icon, prize_color, prize_tier, draw, kudos_id)
        values (
          got.id, who, chr,
          got.name, got.name_en, got.detail, got.detail_en,
          got.icon_url, got.color, got.tier, 'both', p_kudos)
        returning id into win;

        insert into public.notifications (recipient, kind, actor, actor_name, body)
        values (who, 'prize_win', null, null, win::text);
      end loop;
      return;
    end if;
  end loop;
end;
$fn$;

/**
 * v87's trigger, asking the switch and drawing the pairs as well.
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
  today    date;
begin
  if not coalesce((select s.enabled from public.prize_switch s where s.id = 1), false) then
    return null;
  end if;

  if not exists (select 1 from public.prizes pz
                  where pz.active and pz.chance_pct > 0) then
    return null;
  end if;

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

  if receiver is not null then
    perform public.draw_prizes(receiver, 'receive', new.id);
    perform public.draw_prize_pair(receiver, new.sender_id, new.id);
  end if;

  perform public.draw_prizes(new.sender_id, 'give', new.id);

  if exists (select 1 from public.prizes pz
              where pz.active and pz.draw = 'daily' and pz.chance_pct > 0) then
    today := (new.created_at at time zone 'Asia/Bangkok')::date;
    insert into public.prize_daily_rolls (profile_id, day)
    values (new.sender_id, today)
    on conflict do nothing;
    if found then
      perform public.draw_prizes(new.sender_id, 'daily', new.id);
    end if;
  end if;

  return null;
exception
  when others then
    raise warning 'prize draw failed for kudos %: % (%)', new.id, sqlerrm, sqlstate;
    return null;
end;
$fn$;

/* ── something in the cupboard ───────────────────────────────────────────── */

/*
 * The picture is this site's own copy of it, uploaded to post-images rather
 * than linked to the wiki it came from — the argument ImagePicker makes about
 * every other picture on the site, and it holds here too: a prize whose icon
 * is a broken frame is a prize nobody can tell apart from the others.
 *
 * Only if it is not already there, so running this twice does not put a
 * second one in the cupboard.
 */
insert into public.prizes
  (name, name_en, detail, detail_en, icon_url, color, chance_pct, draw, audience, tier, stock, active)
select
  '250,000 gil', '250,000 gil',
  'โอนกิลให้ในเกม', 'Handed over in game',
  'https://hltyphvolaobfqeybpot.supabase.co/storage/v1/object/public/post-images/prize-250k-gil.png',
  '#f3c969', 1.000, 'give', 'fc', 'rare', null, true
where not exists (select 1 from public.prizes where name = '250,000 gil');

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select enabled from public.prize_switch;        -- false
 *   select name, chance_pct, draw, tier, stock
 *     from public.prizes;                           -- the gil, 1.000, give,
 *                                                   -- rare, unlimited
 */
