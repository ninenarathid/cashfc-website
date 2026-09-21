-- v91 — a wallet that fills up
--
-- Run this once in the Supabase SQL editor, after v90.
--
-- Every prize so far has been a thing: one popoto, one roll, and either you
-- hold something an admin has to hand over or you hold nothing. That shape is
-- right for a minion and wrong for money, because money is the one prize that
-- adds up. Ten thousand gil handed over in game is a meeting arranged for a
-- rounding error; ten thousand gil twenty-five times is worth walking across
-- Limsa for. So the small ones are not handed over at all — they go into a
-- wallet, the wallet fills, and the person decides when it is worth cashing.
--
--   prizes.kind       'item' as before, or 'gil' — one that pays into the
--                     wallet instead of becoming something to hand over.
--   prizes.gil_amount how much one of those is worth.
--   prizes.other_side who has to be at the other end of the popoto: anybody,
--                     somebody in the FC, or somebody in the FC who has
--                     proved their character.
--   wallets           one row per account: what is in it now, and what has
--                     ever gone into it.
--   wallet_drops      every payment in, so the wallet can say where it came
--                     from rather than being a number that changes by itself.
--   wallet_switch     whether any of it runs, and the bar to cash out at.
--                     250,000 to start with, and an admin's to change.
--
-- Four decisions worth stating.
--
-- It is on the prize line, not beside it. A gil prize sits in the same
-- cupboard as the rest and takes its span of the same 0-to-100 that v90 lays
-- the prizes end to end on, so a popoto paying 10,000 gil is a popoto that did
-- not also win a minion. The rare popoto is still its own roll (v77, and v90
-- says why); the wallet is not a second system, it is a second kind of prize.
-- The cost of that is real and is the point: turning the gil on spends some of
-- the same hundred per cent the items are drawn from, and the admin panel adds
-- it up in one total where it can be seen.
--
-- Cashing out takes the whole balance. The bar is a minimum and not a price:
-- at 380,000 the button hands over 380,000 and the wallet goes back to nought.
-- The alternative — 250,000 a go with the remainder left behind — makes the
-- admin do the same handover twice for somebody who waited, and makes the bar
-- read as a price tag on a thing nobody is buying. Filling past it is the
-- whole appeal of a wallet, and nothing here caps it.
--
-- Only a proved character earns. The same bar the prizes already set (v85,
-- v87): the ✦ beside somebody's name is the site knowing which character to
-- hand gil to, and an account without one cannot be met in game. It is checked
-- on the way in — an unverified sender's popoto rolls for nothing — rather
-- than at the till, so nobody fills a wallet they cannot empty.
--
-- Nothing but a function writes a balance. The table has no insert or update
-- granted to anybody signed in, so the only ways a number in it can change are
-- a popoto arriving and the button being pressed. A wallet a browser can add
-- to is a wallet with as much in it as somebody feels like.
--
-- And a popoto has two ends. `audience` has always been about the person who
-- wins — which is one end of it — and a draw on giving could therefore be
-- farmed by sending fifty popotos to a character nobody has ever met. So a
-- prize can now say something about the other end as well: who it has to be
-- sent to, for the ones drawn on sending, and who it has to come from, for the
-- ones drawn on receiving. One column, read as the opposite question depending
-- on which way the prize is drawn, because it is the same question — who else
-- was involved — and two columns that can never both apply is two columns
-- somebody has to be told about.

/* ── who else was involved ───────────────────────────────────────────────── */

/**
 * Whether the person at the other end of the popoto counts.
 *
 * 'anyone' is the old behaviour and the default, so nothing already in the
 * cupboard changes meaning. The other two are the answer to popotos sent back
 * and forth between two alts, or handed to a character nobody in the FC has
 * ever met: a prize can insist the other end is a member, and can insist that
 * member has proved who they are.
 *
 * An empty roster tells nobody apart, so it answers no rather than guessing —
 * the same call fc_roster makes in prize_audience_ok, and for the same reason.
 * 'anyone' is unaffected, which is the setting every existing prize has.
 */
create or replace function public.prize_other_side_ok(
  p_rule text, p_character bigint
) returns boolean
language sql stable security definer set search_path = public
as $fn$
  select case
    when p_rule is null or p_rule = 'anyone' then true
    when p_character is null then false
    when not exists (select 1 from public.fc_roster) then false
    when p_rule = 'fc' then
      exists (select 1 from public.fc_roster r where r.character_id = p_character)
    when p_rule = 'fc_verified' then
      exists (select 1 from public.fc_roster r where r.character_id = p_character)
      and exists (select 1 from public.profiles p
                   where p.character_id = p_character
                     and p.character_verified_at is not null)
    else false
  end;
$fn$;

/* ── whether any of it runs, and the bar ─────────────────────────────────── */

/**
 * Off to start with, the same way the prize draw and the rare popoto were.
 *
 * Read by everybody, unlike prize_switch (v88), which is the admins'. This one
 * is not a secret: the wallet is on a member's own profile page, it has to
 * know whether to be there at all, and the bar it is filling towards is the
 * number the progress bar is drawn from. Changing either is still admin-only.
 */
create table if not exists public.wallet_switch (
  id          smallint primary key default 1 check (id = 1),
  enabled     boolean not null default false,
  -- What a wallet has to hold before it can be cashed out. A minimum, not a
  -- price: the button hands over everything that is in there.
  threshold   bigint not null default 250000 check (threshold > 0),
  changed_at  timestamptz not null default now(),
  changed_by  uuid references auth.users(id) on delete set null
);

insert into public.wallet_switch (id, enabled) values (1, false)
on conflict (id) do nothing;

alter table public.wallet_switch enable row level security;

drop policy if exists wallet_switch_read on public.wallet_switch;
create policy wallet_switch_read on public.wallet_switch
  for select to authenticated using (true);

drop policy if exists wallet_switch_admin_flip on public.wallet_switch;
create policy wallet_switch_admin_flip on public.wallet_switch
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update (enabled, threshold, changed_at, changed_by)
  on public.wallet_switch to authenticated;

/* ── a prize that is money ───────────────────────────────────────────────── */

alter table public.prizes
  add column if not exists kind text not null default 'item'
    check (kind in ('item', 'gil'));

alter table public.prizes
  add column if not exists gil_amount integer
    check (gil_amount is null or gil_amount > 0);

/*
 * Who has to be at the other end, for the two draws that have one.
 *
 * Read as "sent to whom" on a prize drawn on giving and "received from whom"
 * on one drawn on receiving. It says nothing at all on the pair and the
 * once-a-day: a pair is both ends at once and already asks `audience` of both,
 * and a daily roll is about a person's day rather than about one popoto.
 *
 * 'anyone' for everything that exists today, so no prize already in the
 * cupboard quietly changes who can win it.
 */
alter table public.prizes
  add column if not exists other_side text not null default 'anyone'
    check (other_side in ('anyone', 'fc', 'fc_verified'));

-- The two go together or neither does. A gil prize with no amount would be
-- drawn, take its span of the line, and pay nothing.
alter table public.prizes drop constraint if exists prizes_gil_has_amount;
alter table public.prizes add constraint prizes_gil_has_amount
  check ((kind = 'item' and gil_amount is null)
      or (kind = 'gil' and gil_amount is not null));

-- Carried onto the win the way the name and the tier are, so a cash-out says
-- how much it was for long after the wallet went back to nought. Nothing else
-- uses it: an item win leaves it null.
alter table public.prize_wins
  add column if not exists gil_amount bigint;

/* ── the wallet ──────────────────────────────────────────────────────────── */

/**
 * What one account is holding.
 *
 * Two numbers, because they answer different questions and only one of them
 * ever goes down. `balance` is what the button would hand over right now;
 * `earned` is everything that has ever gone in, which is the number that makes
 * a wallet somebody emptied last week look like something other than a wallet
 * that has never had anything in it.
 *
 * The row is made on the first payment in and not at sign-up: a table with one
 * row per account and nothing in most of them is a table that has to be kept
 * in step with auth.users for no reason. An account with no row has nothing,
 * which the app draws as an empty wallet.
 */
create table if not exists public.wallets (
  profile_id  uuid primary key references auth.users(id) on delete cascade,
  balance     bigint not null default 0 check (balance >= 0),
  earned      bigint not null default 0 check (earned >= 0),
  updated_at  timestamptz not null default now()
);

alter table public.wallets enable row level security;

drop policy if exists wallets_mine on public.wallets;
create policy wallets_mine on public.wallets
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

-- Select and nothing else. Every number in here is written by a function that
-- checked something first.
grant select on public.wallets to authenticated;

/**
 * Every payment in.
 *
 * A balance that goes up on its own is a number nobody can check. This is the
 * line that says 10,000 gil, from this prize, on this popoto, at this minute —
 * which is what the wallet shows underneath the bar, and what an admin can read
 * back when somebody asks where a figure came from.
 *
 * The prize's name and colour are copied rather than joined, for the reason v87
 * gives about prize_wins: tidying the cupboard later must not rewrite what
 * somebody was already paid.
 */
create table if not exists public.wallet_drops (
  id          bigserial primary key,
  profile_id  uuid not null references auth.users(id) on delete cascade,
  amount      integer not null check (amount > 0),
  prize_id    bigint references public.prizes(id) on delete set null,
  prize_name  text not null,
  prize_color text,
  -- How loud it was. The rare popoto's ladder, copied off the prize the way
  -- the name and the colour are: a payment already made is not re-dressed by
  -- somebody editing the cupboard afterwards.
  tier        text not null default 'rare'
              check (tier in ('rare', 'super', 'ultra')),
  -- When its owner first laid eyes on it, which is what stops the fanfare
  -- going off again every time the profile page is opened. Same record
  -- prize_wins.seen_winner keeps, and the only column here a browser may
  -- write.
  seen_at     timestamptz,
  kudos_id    bigint references public.kudos(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- For a database that had the table before the tier did.
alter table public.wallet_drops
  add column if not exists tier text not null default 'rare';
alter table public.wallet_drops drop constraint if exists wallet_drops_tier_check;
alter table public.wallet_drops add constraint wallet_drops_tier_check
  check (tier in ('rare', 'super', 'ultra'));
alter table public.wallet_drops add column if not exists seen_at timestamptz;

create index if not exists wallet_drops_mine
  on public.wallet_drops (profile_id, created_at desc);

alter table public.wallet_drops enable row level security;

drop policy if exists wallet_drops_mine on public.wallet_drops;
create policy wallet_drops_mine on public.wallet_drops
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

/*
 * And marking one seen, which is the one thing about a payment its owner may
 * change. The column grant is the whole of the lock: `update (seen_at)` means
 * a browser cannot name another column in the first place, so there is no
 * guard function here of the sort prize_wins needs — that one has two sides
 * with a column each, and this has one side and one column.
 */
drop policy if exists wallet_drops_seen on public.wallet_drops;
create policy wallet_drops_seen on public.wallet_drops
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

grant select on public.wallet_drops to authenticated;
grant update (seen_at) on public.wallet_drops to authenticated;

/* ── paying into one ─────────────────────────────────────────────────────── */

/**
 * Put gil in somebody's wallet, and tell them.
 *
 * Called only from the draw. Not granted to anybody signed in, and deliberately
 * not callable with an arbitrary amount from a browser — see the note at the
 * top about what a wallet a browser can add to is worth.
 *
 * Two notifications at most, and they say different things. Every payment rings
 * once, because being handed money is the moment and a wallet nobody is told
 * about is a number they find weeks later. The second only goes out on the
 * payment that takes it past the bar: that is the one with something to do in
 * it.
 */
create or replace function public.credit_wallet(
  p_who uuid, p_amount integer, p_prize bigint, p_name text,
  p_color text, p_tier text, p_kudos bigint
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  bar  bigint;
  -- What the wallet holds once this has gone in.
  held bigint;
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

  /*
   * The body is the tier and the figure, as "ultra:30000".
   *
   * An Evercold notice carries its count and a prize notice carries the id of
   * a row to go and read; this carries both things it has to say, because both
   * are numbers settled at the moment it was sent and neither is a sentence in
   * anybody's language. The alternative was an id and a second fetch, which
   * buys nothing and costs the toast its fanfare until the fetch lands — and
   * the fanfare is the point of the tier.
   */
  insert into public.notifications (recipient, kind, actor, actor_name, body)
  values (p_who, 'wallet_drop', null, null,
          coalesce(p_tier, 'rare') || ':' || p_amount::text);

  select threshold into bar from public.wallet_switch where id = 1;
  if bar is not null and held >= bar and held - p_amount < bar then
    -- The same shape, carrying what is in the wallet rather than what went in,
    -- and the tier of the payment that filled it.
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (p_who, 'wallet_full', null, null,
            coalesce(p_tier, 'rare') || ':' || held::text);
  end if;
end;
$fn$;

/**
 * And nobody may call it from outside.
 *
 * Postgres grants execute on a new function to everybody, and Supabase exposes
 * every function in this schema over the API — so a function that pays money
 * into a named account is, by default, a function anybody signed in can call
 * with their own id and any figure they like. The same is true of the roll
 * below, which is why it is revoked too: an account that can ask for a draw
 * whenever it feels like one is an account that wins everything in the
 * cupboard by tea time. Both are only ever called from inside the database, by
 * a trigger on a popoto being given.
 *
 * withdraw_wallet is the one thing here a browser is meant to call, and it is
 * granted on purpose, below, after it has checked who is asking.
 */
revoke all on function public.credit_wallet(
  uuid, integer, bigint, text, text, text, bigint)
  from public, anon, authenticated;

-- The five-argument shape from a first cut of this file, gone so nothing can
-- call a version of it that drops the tier on the floor.
drop function if exists public.credit_wallet(uuid, integer, bigint, text, text, bigint);

/* ── the draw, with money in it ──────────────────────────────────────────── */

/**
 * v90's roll, which now knows two sorts of prize.
 *
 * The line is unchanged: every prize a popoto could produce, end to end on one
 * number, at most one of them coming up. What is new is one condition on the
 * way in and one branch on the way out — a gil prize is only on the line while
 * the wallet is switched on, and winning one pays into a wallet instead of
 * making a row somebody has to hand over.
 *
 * Stock still works, and still costs two for a pair. An unlimited gil prize is
 * the ordinary case; a stocked one is a pot with a bottom, which is a thing an
 * FC might want to run for a month.
 *
 * It also takes the character the popoto was given to, which v90 had no use
 * for: it knew the receiver only as an account, and a popoto can be given to a
 * character nobody on the site holds. `other_side` asks about that character
 * whether or not anybody has claimed it, so the id comes in from the trigger
 * rather than out of a profile that may not exist.
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
  -- Whether the wallet is running. Read once, because it is asked of every gil
  -- prize on the line.
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

  -- A prize is handed to a character in game, and so is gil, so an account that
  -- has not proved one cannot win either. The receiver may simply not exist — a
  -- popoto can be given to a character nobody on the site holds — and that only
  -- rules out the prizes that would have gone to them.
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
       -- Off means off the line rather than a gap in it: the prizes after it
       -- move up and keep their own span, which is why a prize running out of
       -- stock has never changed anybody else's odds.
       and (pz.kind <> 'gil' or purse)
       and case pz.draw
             when 'give' then
               (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
               -- Who it was sent to. The sender wins this one, so the other
               -- end is the far end of their own giving — which is what turns
               -- fifty popotos to a stranger back into no chances at all.
               and public.prize_other_side_ok(pz.other_side, p_receiver_character)
             when 'daily' then
               p_daily
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, snd.character_id)
             when 'receive' then
               has_rcv
               and (pz.stock is null or pz.stock > 0)
               and public.prize_audience_ok(pz.audience, rcv.character_id)
               -- And who it came from, for the one drawn the other way round.
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
      -- Into the wallet. No row to claim, no thread, nobody's evening
      -- interrupted: it adds up quietly until it is worth a meeting, which is
      -- the whole of why this kind exists.
      perform public.credit_wallet(
        who, got.gil_amount, got.id, got.name, got.color, got.tier, p_kudos);
    else
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
    end if;
  end loop;
end;
$fn$;

/* ── cashing one out ─────────────────────────────────────────────────────── */

/**
 * "I'll take it."
 *
 * The whole balance, once it is at or past the bar, and the wallet goes back to
 * nought. What comes out the other side is an ordinary prize_wins row — already
 * claimed, because pressing this is the claim — so everything built for handing
 * a prize over works on it unchanged: the admin queue, the thread, the
 * handover, the notifications.
 *
 * The row lock is what settles two presses a moment apart. `select ... for
 * update` holds the wallet until this transaction ends, so the second press
 * waits, then reads a balance of nought and is told there is nothing to take —
 * rather than writing a second win for gil that has already been promised.
 *
 * The balance is read and then subtracted rather than set to nought, so a
 * payment that lands in between stays in the wallet for next time. That is the
 * safe direction to be wrong in: nobody is ever promised gil twice.
 */
create or replace function public.withdraw_wallet()
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me    uuid := auth.uid();
  sw    public.wallet_switch;
  who   public.profiles;
  took  bigint;
  win   bigint;
begin
  if me is null then raise exception 'not signed in'; end if;

  select * into sw from public.wallet_switch where id = 1;
  if sw.id is null or not sw.enabled then
    raise exception 'the wallet is not running';
  end if;

  select * into who from public.profiles where id = me;
  if who.character_id is null or who.character_verified_at is null then
    raise exception 'verify your character first';
  end if;

  select w.balance into took from public.wallets w
   where w.profile_id = me for update;
  if took is null or took < sw.threshold then
    raise exception 'not enough in the wallet yet';
  end if;

  update public.wallets
     set balance = balance - took, updated_at = now()
   where profile_id = me;

  insert into public.prize_wins (
    prize_id, winner, character_id,
    prize_name, prize_name_en, prize_detail, prize_detail_en,
    prize_icon, prize_color, prize_tier, draw, gil_amount, claimed_at, seen_winner)
  values (
    null, me, who.character_id,
    'เงินสะสม', 'Saved gil', null, null,
    null, '#d9a441', 'rare', 'give', took, now(), now())
  returning id into win;

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  select p.id, 'prize_claim', me, public.actor_name(), win::text
    from public.profiles p
   where p.is_admin and p.id <> me;

  return took;
end;
$fn$;

grant execute on function public.withdraw_wallet() to authenticated;

-- The roll, for the same reason as credit_wallet above. It is called by the
-- trigger on public.kudos and by nothing else, and `create or replace` keeps
-- whatever privileges the function already had, so this has to be said here
-- rather than assumed from v90 having said nothing about it.
revoke all on function public.draw_one_prize(
  uuid, bigint, uuid, bigint, boolean)
  from public, anon, authenticated;

/**
 * And the trigger, which is the only thing that calls it.
 *
 * v90's, with the receiver's character handed across. Everything else about it
 * is unchanged and is still wrapped: whatever goes wrong in the draw, the
 * potato goes through and the reason goes to the log.
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

  -- To your own character: counted, never a prize.
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

  -- Whether the daily prizes are on this popoto's line. The insert is the
  -- claim on today: whoever gets the row gets the shot.
  if exists (select 1 from public.prizes pz
              where pz.active and pz.draw = 'daily' and pz.chance_pct > 0) then
    insert into public.prize_daily_rolls (profile_id, day)
    values (new.sender_id, (new.created_at at time zone 'Asia/Bangkok')::date)
    on conflict do nothing;
    daily := found;
  end if;

  perform public.draw_one_prize(
    receiver, new.receiver_character_id, new.sender_id, new.id, daily);
  return null;
exception
  when others then
    raise warning 'prize draw failed for kudos %: % (%)', new.id, sqlerrm, sqlstate;
    return null;
end;
$fn$;

-- And v90's four-argument roll, gone once nothing calls it: a copy of this
-- that cannot ask who the popoto went to is a copy that would quietly ignore
-- every other_side ever set.
drop function if exists public.draw_one_prize(uuid, uuid, bigint, boolean);

/* ── what a browser may write on a win ───────────────────────────────────── */

/**
 * v87's guard, with the two columns added since.
 *
 * Neither was reachable — the grant on prize_wins is `update (seen_winner,
 * seen_admin)` and nothing else, so a browser cannot name another column in the
 * first place — but the guard's job is to be the answer to "what can be written
 * here", and a guard that lists every column except the newest two is a guard
 * that has to be read twice before it can be trusted once.
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
  new.prize_tier := old.prize_tier; new.gil_amount := old.gil_amount;
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

/* ── three small ones to start with ──────────────────────────────────────── */

/*
 * 10,000, 20,000 and 30,000 gil, drawn on a popoto being sent and won by
 * whoever sent it. Only added if no gil prize exists yet, so running this twice
 * does not fill the cupboard twice.
 *
 * 4%, 2% and 1%: seven popotos in a hundred pay something, and a popoto is
 * worth about 1,100 gil on average — so a wallet reaches 250,000 in a bit over
 * two hundred popotos given. At ten a day that is three weeks of turning up,
 * which is the shape this is meant to have: not a jackpot, and not a number
 * nobody lives to see. All three are the admin panel's to change, and the odds
 * bar there says what any change does before it is saved.
 *
 * Open to anybody with a proved character, in the FC or not — the ✦ is the bar,
 * not the roster, because what this pays out is gil and not membership. And
 * sent to anybody: the other_side rule defaults to 'anyone', so these three
 * behave exactly as they would have before there was such a setting.
 *
 * Two of them arrive as an R and the biggest as an SR, which is the ladder
 * doing what it is for: most payments are a glow at the corner of the eye and
 * the one worth looking up from the game for shakes the screen.
 */
insert into public.prizes
  (name, name_en, detail, detail_en, color, chance_pct, draw, audience,
   tier, kind, gil_amount, active)
select * from (values
  ('เงินสะสม 10,000 gil', '10,000 gil', 'เข้ากระเป๋าเงินสะสมของคนส่ง',
   'Paid into the sender''s wallet', '#c9cf6a', 4::numeric, 'give', 'all',
   'rare', 'gil', 10000, true),
  ('เงินสะสม 20,000 gil', '20,000 gil', 'เข้ากระเป๋าเงินสะสมของคนส่ง',
   'Paid into the sender''s wallet', '#d9a441', 2::numeric, 'give', 'all',
   'rare', 'gil', 20000, true),
  ('เงินสะสม 30,000 gil', '30,000 gil', 'เข้ากระเป๋าเงินสะสมของคนส่ง',
   'Paid into the sender''s wallet', '#e08a4a', 1::numeric, 'give', 'all',
   'super', 'gil', 30000, true)
) as seed
where not exists (select 1 from public.prizes where kind = 'gil');

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select enabled, threshold from public.wallet_switch;
 *   -- false, 250000 — the wallet is off until somebody turns it on
 *
 *   select name, chance_pct, gil_amount from public.prizes where kind = 'gil';
 *   -- the three above
 *
 *   select count(*) from public.wallets;   -- 0, nobody has been paid yet
 *
 *   select has_function_privilege('authenticated',
 *     'public.draw_one_prize(uuid, bigint, uuid, bigint, boolean)', 'execute');
 *   -- false. The same asked of withdraw_wallet() is true.
 *
 * And nothing can be paid until both switches are on: prize_switch (v88) is
 * what makes a popoto roll at all, and wallet_switch is what puts the gil on
 * the line when it does.
 */
