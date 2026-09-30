-- v100 — told about your look
--
-- Run this once in the Supabase SQL editor, after v99. Running it again is
-- safe.
--
-- Whoever entered a look hears when somebody says something under it, the
-- way the owner of a gallery picture does (notify_comment, v19). Only they
-- do: not the people who spoke before, not whoever a message names. One
-- person to tell, the one whose look it is (asked for on 2026-09-30).
-- Nobody is told about their own message.
--
-- Names hidden changes nothing here. The notice goes to the look's author,
-- who knows whose it is, and to nobody else; the database finds them, so the
-- person speaking never learns who that was.
--
-- The bell needs to know which look, for its picture and its link, so a
-- notification gets a column for it. Nothing but the database fills it in.
-- Members may put a few kinds of notification in the table themselves (the
-- Evercold notice, a party somebody was waiting for), and a look's id sent
-- from a browser could point somebody's bell at a look that is nothing to do
-- with them, or ask whether a look in a draft exists. So the column is set
-- by the trigger below and by nobody else, and kept on every update the way
-- notifications_guard keeps the rest.
--
-- Withdrawing a look takes its notices with it, as deleting a gallery post
-- does: the link would lead nowhere.

/* ── which look ──────────────────────────────────────────────────────────── */

alter table public.notifications
  add column if not exists contest_entry_id bigint
    references public.contest_entries(id) on delete cascade;

-- For the cascade: withdrawing a look looks its notices up by this.
create index if not exists notifications_contest_entry
  on public.notifications (contest_entry_id) where contest_entry_id is not null;

-- Readable by its recipient along with the rest of the row. Added to, not
-- set outright: whatever else the table grants is not this file's business.
grant select (contest_entry_id) on public.notifications to authenticated;

/*
 * Only the database says which look a notice is about.
 *
 * `current_user` is the role the statement runs as: anon or authenticated
 * for anything sent from a browser, and the function's owner inside
 * notify_contest_talk, which is security definer. Invoker here on purpose,
 * or it would always see its own owner.
 */
create or replace function public.notification_look_kept()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.contest_entry_id := old.contest_entry_id;
  elsif current_user in ('anon', 'authenticated') then
    new.contest_entry_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_look_kept on public.notifications;
create trigger notifications_look_kept
  before insert or update on public.notifications
  for each row execute function public.notification_look_kept();

/* ── somebody said something under your look ─────────────────────────────── */

create or replace function public.notify_contest_talk()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  owner_id uuid;
begin
  select author_id into owner_id
    from public.contest_entries where id = new.entry_id;

  if owner_id is null or owner_id = new.author_id then
    return null;
  end if;

  -- The name from the speaker's profile, as a reaction's is (v99): the row
  -- carries it so the notice still reads as a sentence if they leave.
  insert into public.notifications
    (recipient, kind, actor, actor_name, contest_entry_id, body)
  values
    (owner_id, 'contest_talk', new.author_id,
     (select coalesce(p.character_name, p.display_name, p.discord_username)
        from public.profiles p where p.id = new.author_id),
     new.entry_id, left(new.body, 140));
  return null;
end;
$$;

drop trigger if exists contest_comments_notify on public.contest_comments;
create trigger contest_comments_notify
  after insert on public.contest_comments
  for each row execute function public.notify_contest_talk();

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'notifications'
--      and column_name = 'contest_entry_id';
--   -- one row
--
--   select tgname from pg_trigger
--    where not tgisinternal
--      and tgrelid in ('public.notifications'::regclass,
--                      'public.contest_comments'::regclass)
--    order by tgname;
--   -- contest_comments_notify and notifications_look_kept among them
