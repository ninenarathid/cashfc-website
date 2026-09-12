-- v57 — the board, mirrored into Discord
--
-- Run this once in the Supabase SQL editor, after v56.
--
-- The party finder lives on a page people have to remember to open. The FC
-- lives in Discord. So one message in one channel carries the open parties and
-- edits itself as they fill, and pressing Join there does the same thing as
-- pressing it on the site — same rules, same rows, same answer.
--
-- Three things this file sets up.
--
--   1. Which Discord account belongs to which member, so a press can be
--      attributed to a character without anybody linking anything by hand.
--   2. Somewhere to remember which message is the board, so it can be edited
--      rather than reposted.
--   3. A way for the database to say "something changed" to the site, which is
--      what keeps the message honest between cron ticks.

/* ── who is who ──────────────────────────────────────────────────────────── */

-- The Discord snowflake, which is the only durable handle on a Discord user.
-- profiles already carries discord_username, and a username is not an id: it
-- is theirs to change, and a board that matched on it would hand somebody
-- else's seat to whoever picked up the old handle.
alter table public.profiles
  add column if not exists discord_id text;

comment on column public.profiles.discord_id is
  'Discord user id (snowflake), copied out of auth.identities. Null for an '
  'account that has never signed in with Discord. Not the username: usernames '
  'change hands, ids do not.';

create unique index if not exists profiles_discord_id
  on public.profiles (discord_id) where discord_id is not null;

/**
 * Copy the ids across from the auth schema.
 *
 * Supabase already holds this: signing in with Discord writes a row in
 * auth.identities carrying the provider and the id it gave us. Nobody has to
 * be asked for anything — most of the FC signed in that way, and their seat on
 * the board is already spoken for.
 *
 * Written as a function so the trigger below and the backfill are the same
 * code, and so it can be re-run by hand after an import without harm.
 */
create or replace function public.sync_discord_ids()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer := 0;
begin
  with got as (
    update public.profiles p
       set discord_id = i.provider_id
      from auth.identities i
     where i.user_id = p.id
       and i.provider = 'discord'
       and p.discord_id is distinct from i.provider_id
    returning 1
  )
  select count(*) into n from got;
  return n;
end;
$fn$;

revoke all on function public.sync_discord_ids() from anon, authenticated;

-- Everybody who has already signed in.
select public.sync_discord_ids();

/**
 * And everybody who signs in from now on.
 *
 * On the identity rather than on the user: an account that started with Google
 * and adds Discord later gets a second identity row and no new user row, and
 * that person is exactly who this is for.
 */
create or replace function public.discord_identity_added() returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.provider = 'discord' then
    update public.profiles
       set discord_id = new.provider_id
     where id = new.user_id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists identities_discord_id on auth.identities;
create trigger identities_discord_id after insert on auth.identities
  for each row execute function public.discord_identity_added();

/* ── which message is the board ──────────────────────────────────────────── */

-- One row, because there is one board. The message id is what makes this an
-- edit rather than a new post every five minutes, which is the difference
-- between a channel people read and a channel people mute.
create table if not exists public.discord_board (
  id          smallint primary key default 1 check (id = 1),
  channel_id  text,
  message_id  text,
  posted_at   timestamptz,
  updated_at  timestamptz
);

insert into public.discord_board (id) values (1) on conflict do nothing;

alter table public.discord_board enable row level security;
-- Nobody reaches this from a browser. The site touches it with the service
-- role, from the route that talks to Discord, and there is nothing in it a
-- member has any use for.
revoke all on table public.discord_board from anon, authenticated;

/* ── telling the site that something changed ─────────────────────────────── */

-- Where to call, and the secret that says it is us calling. Kept in a table
-- the policies shut rather than in the function body, so rotating the secret
-- is an update rather than a migration.
create table if not exists public.discord_config (
  id      smallint primary key default 1 check (id = 1),
  url     text not null,
  secret  text not null
);

alter table public.discord_config enable row level security;
revoke all on table public.discord_config from anon, authenticated;

create extension if not exists pg_net with schema extensions;

/**
 * Nudge the site to redraw the board.
 *
 * Fire and forget: pg_net queues the request and returns, so a member pressing
 * Join is never left waiting on Discord to answer. If a call is lost the tick
 * below picks it up — the board is allowed to be a few minutes stale and is
 * never allowed to hold up a seat.
 *
 * Does nothing until the secret is set, so running this file before the secret
 * exists is harmless rather than an error every time anybody joins anything.
 */
create or replace function public.discord_board_poke()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  c public.discord_config;
begin
  select * into c from public.discord_config where id = 1;
  if c.url is null or c.secret is null then
    return;
  end if;
  perform extensions.net_http_post(
    url := c.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sync-Secret', c.secret),
    body := '{}'::jsonb);
end;
$fn$;

revoke all on function public.discord_board_poke() from anon, authenticated;

create or replace function public.discord_board_changed() returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  perform public.discord_board_poke();
  return null;
end;
$fn$;

-- A statement trigger, not a row one: ten people joining in one statement is
-- one thing that happened to the board, and ten pokes would be nine wasted
-- round trips to Discord.
drop trigger if exists party_posts_to_discord on public.party_posts;
create trigger party_posts_to_discord
  after insert or update or delete on public.party_posts
  for each statement execute function public.discord_board_changed();

drop trigger if exists party_members_to_discord on public.party_members;
create trigger party_members_to_discord
  after insert or update or delete on public.party_members
  for each statement execute function public.discord_board_changed();

/* ── and a tick, so the countdowns stay true ─────────────────────────────── */

-- Every five minutes. Nothing may have changed, but "starts in 2 hours" is
-- wrong the moment it is written, and a party that quietly passed its start
-- time should stop being offered to somebody scrolling past.
select cron.unschedule('discord-board')
 where exists (select 1 from cron.job where jobname = 'discord-board');

select cron.schedule('discord-board', '*/5 * * * *',
                     'select public.discord_board_poke()');
