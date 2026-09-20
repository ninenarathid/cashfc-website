-- v89 — the admin side has no name
--
-- Run this once in the Supabase SQL editor, after v88.
--
-- A prize thread has two sides and only one of them is a person. The winner
-- is somebody in particular — an admin is about to hand them an item in game
-- and has to know who and which character. The other side is "the admins",
-- and which one happens to be at the keyboard is not part of the
-- conversation: it is the Free Company answering, not Ninenine or Aqua.
--
-- The screen already had this right. PrizeChat prints "แอดมิน" over anything
-- the winner did not write and never asks for a name. The bell did not: both
-- notifications sent to a winner carried the admin's account and display
-- name, so an answer in a thread arrived in the bell as "Aqua Eleison
-- answered about your prize", with her face beside it, and the handover
-- notice carried an actor whose portrait the bell draws. One screen
-- anonymous and one not is the same leak as not having tried.
--
-- So the two that reach a winner carry nobody:
--
--   prize_talk   an answer in the thread -> the winner
--   prize_done   handed over             -> the winner
--
-- and the two that reach the admins are unchanged, because a queue of
-- unnamed claims is a queue nobody can work:
--
--   prize_claim  somebody claimed        -> the admins, with their name
--   prize_ask    the winner wrote        -> the admins, with their name
--
-- delivered_by still records which admin closed it. That is the log, which is
-- for the people who run the site; it is not shown to the person who was
-- waiting, and after a handover they cannot see the row at all.

/**
 * v88's message notifier, with the admin side anonymous.
 *
 * Only the recipient's half changes. An admin writing now reaches the winner
 * as the site rather than as themselves — no actor, so the bell has no
 * account to look a face up from, and no name for the sentence to use.
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
    -- To the admins, named: they are about to meet this person in game.
    update public.prize_wins set seen_admin = null where id = w.id;
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    select p.id, 'prize_ask', new.author_id, public.actor_name(), w.id::text
      from public.profiles p
     where p.is_admin and p.id <> new.author_id;
  else
    -- To the winner, unnamed: whichever admin answered, the answer is the
    -- site's. See the note at the top.
    update public.prize_wins set seen_winner = null where id = w.id;
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (w.winner, 'prize_talk', null, null, w.id::text);
  end if;
  perform set_config('app.prize_trusted', 'off', true);
  return null;
end;
$fn$;

/**
 * v87's handover, likewise.
 *
 * delivered_by is still written — it is how the admins know between
 * themselves who closed which — and it is still nowhere the winner can read.
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
  values (w.winner, 'prize_done', null, null, p_win::text);

  return at;
end;
$fn$;

/*
 * Nothing is done about the ones already sent, on purpose.
 *
 * notifications_guard puts every column but the read marks back on any
 * update, which is the right rule — a notification says what happened and
 * nothing may change it afterwards — and an update here would report success
 * and change nothing, which is worse than not trying. The bell answers for
 * them instead: it treats these two kinds as having no actor whatever the row
 * says, so a notification written before today is drawn the new way as well.
 * See FACELESS in components/NotificationBell.tsx.
 */

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select kind, count(*) filter (where actor is not null) as named
 *     from public.notifications
 *    where kind like 'prize%' group by kind;
 *
 *   -- prize_talk and prize_done: named = 0 from here on, and whatever the
 *   --   older rows carry, which the bell no longer draws
 *   -- prize_claim and prize_ask: named, which is the point of them
 */
