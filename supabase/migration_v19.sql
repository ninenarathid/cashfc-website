-- ─────────────────────────────────────────────────────────────────────────
-- migration_v19.sql — telling members what happened, and remembering it
--
-- Run this once in the Supabase SQL editor, after migration_v18.sql.
--
-- Two things that both start with "who did what to whom", and are otherwise
-- nothing alike.
--
-- Notifications are for one member, about one thing, and stop mattering the
-- moment they are read. Somebody put your name on a picture; there is an
-- announcement; somebody said something under a photograph of yours. A tag in
-- particular has to travel with enough to answer it — nobody should have to go
-- looking for a picture to decide whether they want to be named in it.
--
-- The audit log is for the FC, about everything, and stops mattering never. It
-- exists so the question "who deleted that" has an answer, and so an admin's
-- actions are as recorded as anybody else's — which is the half worth insisting
-- on, since they are the ones who can do the most.
--
-- Neither is written by a client. Both are filled by triggers on the tables
-- where the thing actually happened, because a rule that depends on every call
-- site remembering to log is a rule that is already broken somewhere.
-- ─────────────────────────────────────────────────────────────────────────

-- ═══ Notifications ═══════════════════════════════════════════════════════
create table if not exists public.notifications (
  id           bigint generated always as identity primary key,
  recipient    uuid not null references auth.users (id) on delete cascade,
  -- 'tag' | 'comment' | 'announcement'. Text rather than an enum so a new kind
  -- is a deploy rather than a migration, and an unknown one renders as a plain
  -- line instead of failing.
  kind         text not null,
  actor        uuid references auth.users (id) on delete set null,
  -- Denormalised: the point of a notification is to read like a sentence months
  -- later, and a name that disappears when somebody leaves the FC does not.
  actor_name   text,
  post_id      bigint references public.gallery_posts (id) on delete cascade,
  body         text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index if not exists notifications_inbox
  on public.notifications (recipient, read_at, created_at desc);

alter table public.notifications enable row level security;

-- Yours and nobody else's, which is the whole of the rule.
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select
  using (recipient = auth.uid());

-- Marking as read is the only change a member makes to one; the trigger below
-- keeps them to that column.
drop policy if exists "notifications: mark own read" on public.notifications;
create policy "notifications: mark own read" on public.notifications for update
  using (recipient = auth.uid())
  with check (recipient = auth.uid());

drop policy if exists "notifications: clear own" on public.notifications;
create policy "notifications: clear own" on public.notifications for delete
  using (recipient = auth.uid());

grant update (read_at) on table public.notifications to authenticated;

create or replace function public.notification_guard()
returns trigger
language plpgsql
as $$
begin
  new.recipient  := old.recipient;
  new.kind       := old.kind;
  new.actor      := old.actor;
  new.actor_name := old.actor_name;
  new.post_id    := old.post_id;
  new.body       := old.body;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard
  before update on public.notifications
  for each row execute function public.notification_guard();

-- ─── Who is speaking ─────────────────────────────────────────────────────
create or replace function public.actor_name()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(character_name, display_name, discord_username)
    from public.profiles where id = auth.uid();
$$;

-- ─── Somebody put your name on a picture ─────────────────────────────────
-- Only for a pending tag: one you placed on yourself is already agreed to, and
-- telling somebody they have tagged themselves is noise.
create or replace function public.notify_tag()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
begin
  if new.confirmed_at is not null then
    return null;
  end if;
  select id into target from public.profiles
   where character_id = new.character_id
     and character_verified_at is not null
   limit 1;
  if target is null or target = auth.uid() then
    return null;
  end if;
  insert into public.notifications (recipient, kind, actor, actor_name, post_id)
  values (target, 'tag', auth.uid(), public.actor_name(), new.post_id);
  return null;
end;
$$;

drop trigger if exists gallery_tags_notify on public.gallery_tags;
create trigger gallery_tags_notify
  after insert on public.gallery_tags
  for each row execute function public.notify_tag();

-- A tag answered — either way — has nothing left to say, so it takes its
-- notification with it rather than leaving an unread line about a settled
-- question.
create or replace function public.notify_tag_settled()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
begin
  -- The guard from v15 pins confirmed_at back when somebody who may not answer
  -- tries to. The row is still updated and this trigger still fires, so without
  -- this the poster attempting to confirm a tag would take away the notification
  -- asking the person who actually has to.
  if tg_op = 'UPDATE'
     and new.confirmed_at is not distinct from old.confirmed_at then
    return null;
  end if;

  select id into target from public.profiles
   where character_id = coalesce(new.character_id, old.character_id)
     and character_verified_at is not null
   limit 1;
  if target is null then return null; end if;
  delete from public.notifications
   where recipient = target and kind = 'tag'
     and post_id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

drop trigger if exists gallery_tags_notify_settled on public.gallery_tags;
create trigger gallery_tags_notify_settled
  after update of confirmed_at or delete on public.gallery_tags
  for each row execute function public.notify_tag_settled();

-- ─── Somebody said something under your picture ──────────────────────────
create or replace function public.notify_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  owner_id  uuid;
  character bigint;
  credited  uuid;
begin
  select author_id, character_id into owner_id, character
    from public.gallery_posts where id = new.post_id;

  -- The person the picture is of, when that is not the account that uploaded it.
  select id into credited from public.profiles
   where character_id = character and character_verified_at is not null limit 1;

  if owner_id is not null and owner_id <> new.author_id then
    insert into public.notifications (recipient, kind, actor, actor_name, post_id, body)
    values (owner_id, 'comment', new.author_id, public.actor_name(), new.post_id,
            left(new.body, 140));
  end if;
  if credited is not null and credited <> new.author_id and credited <> owner_id then
    insert into public.notifications (recipient, kind, actor, actor_name, post_id, body)
    values (credited, 'comment', new.author_id, public.actor_name(), new.post_id,
            left(new.body, 140));
  end if;
  return null;
end;
$$;

drop trigger if exists gallery_comments_notify on public.gallery_comments;
create trigger gallery_comments_notify
  after insert on public.gallery_comments
  for each row execute function public.notify_comment();

-- ─── An announcement reaches everybody who has an account ────────────────
-- Fanned out into a row each rather than read from one shared row, so "read" is
-- something each member has or has not done, and clearing yours does not clear
-- it for the FC.
create or replace function public.notify_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (recipient, kind, actor, actor_name, body)
  select p.id, 'announcement', auth.uid(), public.actor_name(),
         left(new.title, 140)
    from public.profiles p
   where p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  return null;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert on public.announcements
  for each row execute function public.notify_announcement();

-- ═══ The audit log ═══════════════════════════════════════════════════════
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_name  text,
  -- 'gallery_posts.delete', 'profiles.update', and so on.
  action      text not null,
  target_kind text,
  target_id   text,
  -- What changed. The whole row on an insert or a delete; on an update, only the
  -- columns that actually moved, each as [before, after].
  detail      jsonb
);

create index if not exists audit_log_recent on public.audit_log (at desc);
create index if not exists audit_log_actor on public.audit_log (actor, at desc);

alter table public.audit_log enable row level security;

-- Readable by admins and by nobody else, and writable by nobody at all: the
-- trigger below is security definer and is the only thing that puts a line in
-- here. A log anybody can edit is a log, not a record.
drop policy if exists "audit: admins read" on public.audit_log;
create policy "audit: admins read" on public.audit_log for select
  using (public.is_admin());

revoke insert, update, delete on table public.audit_log from anon, authenticated;

/**
 * Columns kept by triggers rather than by people.
 *
 * image_count and the cover follow the pictures; the like and comment counts
 * follow the likes and comments. Every one of those already has its own line in
 * the log from the thing that caused it, so recording the echo as well would
 * bury the actions in their own consequences.
 */
create or replace function public.audit_derived(col text)
returns boolean
language sql immutable
as $$
  select col in ('image_count', 'image_url', 'width', 'height',
                 'like_count', 'comment_count', 'updated_at');
$$;

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rec     jsonb;
  before  jsonb;
  changed jsonb := '{}'::jsonb;
  k       text;
  real_change boolean := false;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    before := to_jsonb(old);
    for k in select jsonb_object_keys(rec) loop
      if rec -> k is distinct from before -> k then
        changed := changed || jsonb_build_object(k, jsonb_build_array(before -> k, rec -> k));
        if not public.audit_derived(k) then real_change := true; end if;
      end if;
    end loop;
    -- Nothing a person did: the counts moving because something else was
    -- recorded a moment ago.
    if not real_change then return null; end if;
  end if;

  insert into public.audit_log (actor, actor_name, action, target_kind, target_id, detail)
  values (auth.uid(), public.actor_name(),
          tg_table_name || '.' || lower(tg_op), tg_table_name,
          coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'post_id'),
          case when tg_op = 'UPDATE' then changed else rec end);
  return null;
end;
$$;

-- Everything worth asking a question about later. Likes are in: "who took their
-- popoto back" is a real question, and at this size the volume is nothing.
do $$
declare
  t text;
begin
  foreach t in array array[
    'gallery_posts', 'gallery_images', 'gallery_tags', 'gallery_comments',
    'gallery_likes', 'profiles', 'announcements', 'site_settings',
    'member_overrides', 'timeline_posts', 'kudos'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end;
$$;
