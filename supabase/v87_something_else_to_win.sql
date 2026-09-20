-- v87 — something else to win
--
-- Run this once in the Supabase SQL editor. It needs v85 (verified_character)
-- and the kudos table as v86 left it.
--
-- A rare popoto is a thing the site can give you by itself: a picture, a
-- colour and a line somebody wrote. This is for the other kind of prize — the
-- kind an admin has to actually hand over in game. A minion, some gil, a set
-- of glamour. The site can decide you have won one; it cannot post it to you.
-- So the draw is only the first half, and the second half is two people
-- arranging to meet.
--
--   prizes              what can be won. A name, a picture, its own chance,
--                       when it is drawn, who is eligible, and how many are
--                       left. Every admin's to write, unlike the rare popoto
--                       flavours, which are one keeper's secret (v77).
--   prize_wins          one row per win, and the whole life of it: won,
--                       claimed, delivered. The prize is copied onto the row
--                       as it was at the moment it was won, the same way a
--                       rare popoto carries its flavour, so editing a prize
--                       later cannot rewrite what somebody already holds.
--   prize_messages      the conversation about one win. Both sides, one
--                       thread, closed when the thing has changed hands.
--   prize_daily_rolls   who has already had today's roll, for the prizes that
--                       are drawn once a day rather than once a popoto.
--   fc_roster           which characters are in the Free Company, because the
--                       database has never needed to know and now does.
--
-- Three decisions worth stating, because none of them is the only answer:
--
-- At most one prize per roll. Each prize has its own chance and they are laid
-- end to end on one number rather than rolled one after another, so the
-- chances add up to "how often anything is won" and two prizes can never land
-- on the same popoto. It also means a total over 100 silently starves the
-- prizes at the bottom of the list, which the admin panel says out loud.
--
-- Stock is decremented, not counted. Counting the wins would be the better
-- shape — one source of truth, the argument lib/evercold.ts makes — but two
-- popotos a second apart can both count the same last one. `update ... where
-- stock > 0 returning` takes the row lock and settles it.
--
-- Nothing is won by an account the site cannot name. Same bar as v85, and for
-- a stronger reason here: at the end of this somebody hands over a real item
-- to a real character, and "which character" cannot be a question.
--
-- And the draw may never cost anybody a popoto. It hangs off the insert as an
-- after-trigger, which means anything it raises rolls the popoto back with it,
-- so the whole of it is wrapped: a prize that fails to be drawn is a warning
-- in the log and a potato that still arrived.

/* ── who is in the FC ────────────────────────────────────────────────────
 *
 * The site has always answered this from data/fc-ids.json, written by the
 * nightly pipeline and read by lib/people.ts. The database has never had to
 * know, because nothing in it ever asked — the Evercold draw is worked out in
 * the app. A prize that is for FC members only is asked inside the roll, and
 * the roll is in here, so the list has to be in here too.
 *
 * Kept up to date by the admin panel: the prizes tab holds the same ids the
 * rest of the site uses and calls sync_fc_roster whenever they differ from
 * this table. That is not as good as the pipeline writing it, but the pipeline
 * deliberately has no write access to this database, and the alternative — the
 * browser deciding who is eligible — is the thing the roll exists to prevent.
 *
 * An empty roster tells nobody apart, so while it is empty only prizes open to
 * everybody are ever won. Silently treating everyone as a member would hand an
 * FC-only prize to a guest, which is the one outcome nobody could undo.
 */
create table if not exists public.fc_roster (
  character_id bigint primary key,
  synced_at    timestamptz not null default now()
);

alter table public.fc_roster enable row level security;

drop policy if exists fc_roster_read on public.fc_roster;
create policy fc_roster_read on public.fc_roster
  for select to authenticated using (true);

grant select on public.fc_roster to authenticated;

/**
 * Replace the roster with exactly these characters.
 *
 * One statement, so a reader between the delete and the insert cannot see an
 * FC with nobody in it. Admin-only, and it takes the whole list rather than
 * one id at a time: this mirrors a file, and half a mirror is worse than none.
 */
create or replace function public.sync_fc_roster(p_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare n integer;
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    raise exception 'an empty roster is not a roster';
  end if;

  with wanted as (select distinct unnest(p_ids) as character_id),
       gone as (
         delete from public.fc_roster r
          where not exists (select 1 from wanted w where w.character_id = r.character_id))
  insert into public.fc_roster (character_id)
  select w.character_id from wanted w
  on conflict (character_id) do nothing;

  select count(*) into n from public.fc_roster;
  return n;
end;
$fn$;

grant execute on function public.sync_fc_roster(bigint[]) to authenticated;

/* ── the prizes ──────────────────────────────────────────────────────────── */

create table if not exists public.prizes (
  id          bigserial primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  name_en     text,
  -- What it actually is, for the admin handing it over and for the winner
  -- reading their inventory: "Wind-up Kupka", "500,000 gil", "a set of the
  -- Ala Mhigan gear". The name is the label; this is the thing.
  detail      text,
  detail_en   text,
  icon_url    text,
  color       text not null default '#f3c969' check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- Its own chance, in whole percent and thousandths, with no relation to the
  -- rare popoto's: 0.5 here means one in two hundred of whatever draws it.
  chance_pct  numeric(6,3) not null default 0
              check (chance_pct >= 0 and chance_pct <= 100),
  -- When it is rolled, and therefore who wins it.
  --   receive  a popoto arriving  → the character it was given to
  --   give     a popoto being sent → the account that sent it
  --   daily    the first popoto somebody gives in a Bangkok day → that account
  -- 'give' rolls on every popoto sent, so somebody generous with fifty a day
  -- has fifty chances; 'daily' is the Evercold rule, one a day for turning up.
  draw        text not null default 'receive'
              check (draw in ('receive', 'give', 'daily')),
  -- Who may win it: the Free Company, the verified characters outside it, or
  -- anybody with a character at all.
  audience    text not null default 'fc'
              check (audience in ('fc', 'guest', 'all')),
  -- How many are left. Null is unlimited; 0 is a prize that has run out and
  -- is no longer drawn, which is different from one switched off.
  stock       integer check (stock is null or stock >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

alter table public.prizes enable row level security;

-- Every admin, unlike the rare popoto flavours. Aqua included: this is the
-- FC's prize cupboard, not one person's surprise.
drop policy if exists prizes_admin_read on public.prizes;
create policy prizes_admin_read on public.prizes
  for select to authenticated using (public.is_admin());

drop policy if exists prizes_admin_write on public.prizes;
create policy prizes_admin_write on public.prizes
  for insert to authenticated with check (public.is_admin());

drop policy if exists prizes_admin_edit on public.prizes;
create policy prizes_admin_edit on public.prizes
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists prizes_admin_drop on public.prizes;
create policy prizes_admin_drop on public.prizes
  for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.prizes to authenticated;
grant usage on sequence public.prizes_id_seq to authenticated;

/* ── what somebody has won ───────────────────────────────────────────────── */

create table if not exists public.prize_wins (
  id            bigserial primary key,
  prize_id      bigint references public.prizes(id) on delete set null,
  winner        uuid not null references auth.users(id) on delete cascade,
  -- The character they held when they won it. The prize is handed to a
  -- character, and somebody may claim a different one later.
  character_id  bigint,
  -- The prize as it was at that moment. See kudos.rare_* (v77) for the same
  -- argument: a gift already given is not edited by tidying the cupboard.
  prize_name    text not null,
  prize_name_en text,
  prize_detail  text,
  prize_detail_en text,
  prize_icon    text,
  prize_color   text not null default '#f3c969',
  draw          text not null,
  kudos_id      bigint references public.kudos(id) on delete set null,
  won_at        timestamptz not null default now(),
  -- The three moments. Claimed is the winner saying they want it; delivered is
  -- an admin saying it has changed hands, which closes the thread and takes
  -- the row out of the inventory without taking it out of the database.
  claimed_at    timestamptz,
  delivered_at  timestamptz,
  delivered_by  uuid references auth.users(id) on delete set null,
  seen_winner   timestamptz,
  seen_admin    timestamptz
);

create index if not exists prize_wins_winner on public.prize_wins (winner, won_at desc);
create index if not exists prize_wins_open on public.prize_wins (claimed_at)
  where delivered_at is null;

alter table public.prize_wins enable row level security;

drop policy if exists prize_wins_mine on public.prize_wins;
create policy prize_wins_mine on public.prize_wins
  for select to authenticated
  using (winner = (select auth.uid()) or public.is_admin());

-- Reading a thread marks it read, from either side. Which side is yours is
-- settled by the trigger below rather than by the browser — the same fix
-- feedback needed when an admin's click stamped the author's column.
drop policy if exists prize_wins_seen on public.prize_wins;
create policy prize_wins_seen on public.prize_wins
  for update to authenticated
  using (winner = (select auth.uid()) or public.is_admin())
  with check (winner = (select auth.uid()) or public.is_admin());

grant select on public.prize_wins to authenticated;
grant update (seen_winner, seen_admin) on public.prize_wins to authenticated;

/**
 * Nothing but the two read-marks may be changed from a browser, and only your
 * own. Winning, claiming and delivering all happen in functions.
 */
create or replace function public.prize_wins_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare admin boolean := public.is_admin();
begin
  -- Claiming and delivering are updates too, and they are allowed to change
  -- the things this refuses everybody else. They say so by setting a flag that
  -- lasts until the end of their transaction and belongs to nobody else's.
  if coalesce(current_setting('app.prize_trusted', true), '') = 'on' then
    return new;
  end if;

  -- Nobody signed in means the service key or the SQL editor, which is the
  -- database's owner reaching in directly. This guard is about what a browser
  -- may send; it is not a lock on the person holding the keys.
  if auth.uid() is null then
    return new;
  end if;

  -- Everything except the two seen_ columns is put back as it was.
  new.id := old.id; new.prize_id := old.prize_id; new.winner := old.winner;
  new.character_id := old.character_id;
  new.prize_name := old.prize_name; new.prize_name_en := old.prize_name_en;
  new.prize_detail := old.prize_detail; new.prize_detail_en := old.prize_detail_en;
  new.prize_icon := old.prize_icon; new.prize_color := old.prize_color;
  new.draw := old.draw; new.kudos_id := old.kudos_id; new.won_at := old.won_at;
  new.claimed_at := old.claimed_at;
  new.delivered_at := old.delivered_at; new.delivered_by := old.delivered_by;

  -- And each side may only stamp its own. An admin who is also the winner is
  -- the winner here: it is their prize, and the admin queue is somebody else's
  -- job that evening.
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

drop trigger if exists prize_wins_guard on public.prize_wins;
create trigger prize_wins_guard before update on public.prize_wins
  for each row execute function public.prize_wins_guard();

/* ── the conversation about one win ──────────────────────────────────────── */

create table if not exists public.prize_messages (
  id          bigserial primary key,
  win_id      bigint not null references public.prize_wins(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index if not exists prize_messages_thread
  on public.prize_messages (win_id, created_at);

alter table public.prize_messages enable row level security;

drop policy if exists prize_messages_read on public.prize_messages;
create policy prize_messages_read on public.prize_messages
  for select to authenticated
  using (exists (
    select 1 from public.prize_wins w
     where w.id = prize_messages.win_id
       and (w.winner = (select auth.uid()) or public.is_admin())));

/*
 * Written by the two sides, and only while it is open.
 *
 * A thread that has been delivered is finished. Leaving it writable would mean
 * a conversation about an item neither person has any more, in a place the
 * winner can no longer see — their inventory row is gone.
 *
 * Claiming is not required to speak: an admin may want to ask about a prize
 * before the winner has pressed anything, and a winner may want to ask what it
 * is before deciding.
 */
drop policy if exists prize_messages_write on public.prize_messages;
create policy prize_messages_write on public.prize_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.prize_wins w
       where w.id = prize_messages.win_id
         and w.delivered_at is null
         and (w.winner = (select auth.uid()) or public.is_admin())));

grant select, insert on public.prize_messages to authenticated;
grant usage on sequence public.prize_messages_id_seq to authenticated;

/* ── one roll a day, for the prizes drawn that way ───────────────────────── */

create table if not exists public.prize_daily_rolls (
  profile_id uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  primary key (profile_id, day)
);

alter table public.prize_daily_rolls enable row level security;
-- No policy at all: nothing outside the roll has any business here.

/* ── the draw ────────────────────────────────────────────────────────────── */

/**
 * Whether this character is the sort of person this prize is for.
 *
 * An empty roster cannot tell an FC member from a guest, so it answers no to
 * both rather than guessing. See the note on fc_roster.
 */
create or replace function public.prize_audience_ok(
  p_audience text, p_character bigint
) returns boolean
language sql stable security definer set search_path = public
as $fn$
  select case
    when p_audience = 'all' then p_character is not null
    when p_character is null then false
    when not exists (select 1 from public.fc_roster) then false
    when p_audience = 'fc' then
      exists (select 1 from public.fc_roster r where r.character_id = p_character)
    when p_audience = 'guest' then
      not exists (select 1 from public.fc_roster r where r.character_id = p_character)
    else false
  end;
$fn$;

/**
 * One roll of one kind, for one person.
 *
 * Every eligible prize laid end to end on a single number from 0 to 100: the
 * first one the number falls inside is the one won, and a number past all of
 * them is the ordinary outcome of winning nothing. Ordered by id so the line
 * is the order they were created in, which is the order the admin panel shows
 * and adds up.
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
  -- A prize is handed to a character. An account that has not proved one is
  -- not somebody an admin can meet in game.
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
      -- Take one off the shelf, and only if there is still one there: two
      -- popotos a moment apart can both have read stock = 1 above.
      update public.prizes
         set stock = stock - 1
       where id = p.id and (stock is null or stock > 0)
      returning * into got;
      if got.id is null then return; end if;

      insert into public.prize_wins (
        prize_id, winner, character_id,
        prize_name, prize_name_en, prize_detail, prize_detail_en,
        prize_icon, prize_color, draw, kudos_id)
      values (
        got.id, p_winner, who.character_id,
        got.name, got.name_en, got.detail, got.detail_en,
        got.icon_url, got.color, p_draw, p_kudos)
      returning id into win;

      -- Told to the winner and to nobody else. The body carries the win, the
      -- same way a rare popoto's notification carries the popoto.
      insert into public.notifications (recipient, kind, actor, actor_name, body)
      values (p_winner, 'prize_win', null, null, win::text);
      return;
    end if;
  end loop;
end;
$fn$;

/**
 * Every draw that a popoto sets off.
 *
 * After the insert rather than before it, because none of this is written onto
 * the popoto — it is its own row — and because the roll wants the popoto's id.
 * A popoto given to your own character sets off nothing at all: it is free,
 * and a draw anybody can enter fifty times a minute by pressing their own
 * profile is a draw about nothing (lib/evercold.ts makes the same argument
 * about the same act).
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
  -- Before v87 is used for anything, this is every popoto's overhead, so it
  -- is one index-less scan of a table with nothing in it and then nothing.
  if not exists (select 1 from public.prizes pz
                  where pz.active and pz.chance_pct > 0) then
    return null;
  end if;

  select exists (
    select 1 from public.profiles p
     where p.id = new.sender_id and p.character_id = new.receiver_character_id
  ) into mine;
  if mine then return null; end if;

  -- The account holding the character it was given to, verified — the same
  -- bar notify_kudos uses before it will tell anybody anything.
  select id into receiver
    from public.profiles
   where character_id = new.receiver_character_id
     and character_verified_at is not null
   limit 1;

  if receiver is not null then
    perform public.draw_prizes(receiver, 'receive', new.id);
  end if;

  perform public.draw_prizes(new.sender_id, 'give', new.id);

  -- And the one a day, on the first popoto they give in a Bangkok day. The
  -- insert is the claim on today: whoever gets the row gets the roll, and
  -- everybody else that day gets nothing back from it.
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
  -- A popoto is the thing this site is for; a prize on top of one is not. An
  -- after-trigger that raises takes the insert down with it, so a mistake in
  -- here would stop the whole Free Company giving potatoes. Whatever goes
  -- wrong, the potato goes through and the reason goes to the log.
  when others then
    raise warning 'prize draw failed for kudos %: % (%)', new.id, sqlerrm, sqlstate;
    return null;
end;
$fn$;

-- After notify_kudos, which is zz_-prefixed for the same reason: the order of
-- after-triggers is alphabetical, and the notification should go out before
-- the prize one so the bell reads in the order things happened.
drop trigger if exists zzz_prizes_on_kudos on public.kudos;
create trigger zzz_prizes_on_kudos after insert on public.kudos
  for each row execute function public.prizes_on_kudos();

/* ── claiming it, and handing it over ────────────────────────────────────── */

/**
 * "Yes, I want this one."
 *
 * The winner's press, once. It opens the thread for the admins by telling them
 * about it — until then a win is somebody's business and nobody else's.
 */
create or replace function public.claim_prize(p_win bigint)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $fn$
declare
  w  public.prize_wins;
  at timestamptz;
begin
  select * into w from public.prize_wins where id = p_win;
  if w.id is null then raise exception 'no such prize'; end if;
  if w.winner <> auth.uid() then raise exception 'not yours'; end if;
  if w.delivered_at is not null then raise exception 'already handed over'; end if;
  if w.claimed_at is not null then return w.claimed_at; end if;

  perform set_config('app.prize_trusted', 'on', true);
  update public.prize_wins
     set claimed_at = now(), seen_admin = null
   where id = p_win
  returning claimed_at into at;
  perform set_config('app.prize_trusted', 'off', true);

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  select p.id, 'prize_claim', auth.uid(), public.actor_name(), p_win::text
    from public.profiles p
   where p.is_admin and p.id <> auth.uid();

  return at;
end;
$fn$;

grant execute on function public.claim_prize(bigint) to authenticated;

/**
 * "Handed over."
 *
 * An admin's press, and the end of it: the thread stops taking messages and
 * the row leaves the winner's inventory. Nothing is deleted — the win, the
 * conversation and who closed it all stay, which is the point of doing it this
 * way rather than with a delete. What the winner loses is a line on a page.
 */
create or replace function public.deliver_prize(p_win bigint)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $fn$
declare
  w  public.prize_wins;
  at timestamptz;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into w from public.prize_wins where id = p_win;
  if w.id is null then raise exception 'no such prize'; end if;
  if w.delivered_at is not null then return w.delivered_at; end if;

  perform set_config('app.prize_trusted', 'on', true);
  update public.prize_wins
     set delivered_at = now(), delivered_by = auth.uid()
   where id = p_win
  returning delivered_at into at;
  perform set_config('app.prize_trusted', 'off', true);

  insert into public.notifications (recipient, kind, actor, actor_name, body)
  values (w.winner, 'prize_done', auth.uid(), public.actor_name(), p_win::text);

  return at;
end;
$fn$;

grant execute on function public.deliver_prize(bigint) to authenticated;

/**
 * Somebody said something in a prize thread.
 *
 * To the other side, whichever that is: a winner writing reaches the admins, an
 * admin writing reaches the winner. Two kinds rather than one, because the two
 * are read by different people and answered in different places — the winner
 * in their inventory, the admins in the admin panel — and a bell that sends
 * somebody to the wrong one of those shows them a page with nothing on it.
 *
 * One notification per message and no bundling, because these threads are
 * short and the whole point of one is that the other person answers.
 */
create or replace function public.notify_prize_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare w public.prize_wins;
begin
  select * into w from public.prize_wins where id = new.win_id;
  if w.id is null then return null; end if;

  perform set_config('app.prize_trusted', 'on', true);
  if new.author_id = w.winner then
    update public.prize_wins set seen_admin = null where id = w.id;
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    select p.id, 'prize_ask', new.author_id, public.actor_name(), w.id::text
      from public.profiles p
     where p.is_admin and p.id <> new.author_id;
  else
    update public.prize_wins set seen_winner = null where id = w.id;
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (w.winner, 'prize_talk', new.author_id, public.actor_name(), w.id::text);
  end if;
  perform set_config('app.prize_trusted', 'off', true);
  return null;
end;
$fn$;

drop trigger if exists zz_prize_message_notify on public.prize_messages;
create trigger zz_prize_message_notify after insert on public.prize_messages
  for each row execute function public.notify_prize_message();

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select count(*) from public.fc_roster;          -- 0 until an admin opens
 *                                                   -- the prizes tab
 *   select * from public.prizes;                    -- empty
 *   select tgname from pg_trigger
 *    where tgrelid = 'public.kudos'::regclass;      -- includes
 *                                                   -- zzz_prizes_on_kudos
 */
