-- v60 — one nudge per burst, and a tighter tick
--
-- Run this once in the Supabase SQL editor, after v59.
--
-- The board is nudged by statement triggers on party_posts and party_members,
-- and one thing a person does is rarely one statement: creating a party writes
-- the listing and then its members, letting somebody in writes a row and
-- redraws, a party being tidied up deletes both. Each of those fired its own
-- call, four or five of them inside a second, and each call edits the same
-- Discord message.
--
-- Discord rate limits that, which on its own would be harmless — the next tick
-- would put it right. What made it visible was the recovery path in the site:
-- when an edit failed it asked whether the message still existed, and under a
-- rate limit that question is refused too, so it posted a fresh board. Four
-- boards in the channel, each the same list. That half is fixed in the code,
-- which now only reposts when Discord says the message is genuinely gone.
--
-- This is the other half: stop making the burst in the first place.

alter table public.discord_board
  add column if not exists poked_at timestamptz;

comment on column public.discord_board.poked_at is
  'When the site was last asked to redraw. Used to collapse a burst of '
  'triggers into one call; see discord_board_poke.';

/**
 * Nudge the site, at most once every couple of seconds.
 *
 * The claim is the update itself: whoever moves poked_at forward is the one
 * that calls, and everybody else in the same burst finds it already moved and
 * goes quietly. No lock, because the row is the lock.
 *
 * Two seconds is chosen against what it costs to be wrong. Every call carries
 * the whole board rather than a change to it, so a dropped nudge only matters
 * when two things happen inside the same two seconds and then nothing happens
 * again — and the five minute tick is the backstop for that.
 */
create or replace function public.discord_board_poke()
returns void
language plpgsql
security definer
set search_path = public, net, extensions
as $fn$
declare
  c public.discord_config;
begin
  update public.discord_board
     set poked_at = now()
   where id = 1
     and (poked_at is null or poked_at < now() - interval '2 seconds');
  if not found then return; end if;

  select * into c from public.discord_config where id = 1;
  if c.url is null or c.secret is null then
    return;
  end if;
  perform http_post(
    url := c.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sync-Secret', c.secret),
    body := '{}'::jsonb);
exception when others then
  -- Whatever went wrong with the notification, it is not the business of the
  -- statement that triggered it. Nothing here is worth failing a join over.
  null;
end;
$fn$;

revoke all on function public.discord_board_poke() from anon, authenticated;

-- The five minute tick from v57 is left exactly as it is. Editing the message
-- every minute would mark it edited every minute, spend the rate limit that
-- the debounce above was written to save, and say nothing new: what actually
-- changes a party already nudges the moment it happens.
