-- ─────────────────────────────────────────────────────────────────────────
-- migration_v20.sql — somewhere to say something to the admins
--
-- Run this once in the Supabase SQL editor, after migration_v19.sql.
--
-- A thread and its replies, and nothing else. Not a ticket system: there is no
-- assignee, no priority, no queue, because a Free Company of five hundred people
-- with two admins does not have a queue. It has the occasional "the board says I
-- am on vacation and I am not", and that wants a place to be said and an answer
-- underneath it.
--
-- The rule underneath is one sentence: a member sees their own threads, an admin
-- sees all of them, and both can write in any thread they can see. Everything
-- below is that sentence in SQL.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.feedback_threads (
  id         bigint generated always as identity primary key,
  author_id  uuid not null references auth.users (id) on delete cascade,
  subject    text not null check (char_length(subject) between 1 and 120),
  -- 'open' | 'closed'. Closed is a state, not a deletion: a thread that has been
  -- answered is worth keeping, and so is the answer.
  status     text not null default 'open',
  created_at timestamptz not null default now(),
  -- Moved by a trigger on every reply, so the list can be ordered by which
  -- conversation is actually alive rather than by which was started last.
  updated_at timestamptz not null default now(),
  -- When each side last looked. Two columns rather than one per person, because
  -- there are only ever two sides to one of these.
  seen_author timestamptz,
  seen_admin  timestamptz
);

create index if not exists feedback_threads_recent
  on public.feedback_threads (updated_at desc);

create table if not exists public.feedback_messages (
  id         bigint generated always as identity primary key,
  thread_id  bigint not null references public.feedback_threads (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_messages_thread
  on public.feedback_messages (thread_id, created_at);

alter table public.feedback_threads enable row level security;
alter table public.feedback_messages enable row level security;

-- ─── Who can see a thread ────────────────────────────────────────────────
create or replace function public.feedback_visible(p_thread bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.feedback_threads t
    where t.id = p_thread
      and (t.author_id = auth.uid() or public.is_admin())
  );
$$;

grant execute on function public.feedback_visible(bigint) to authenticated;

drop policy if exists "feedback: read own or admin" on public.feedback_threads;
create policy "feedback: read own or admin" on public.feedback_threads for select
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists "feedback: start your own" on public.feedback_threads;
create policy "feedback: start your own" on public.feedback_threads for insert
  with check (author_id = auth.uid());

-- Either side may close a thread or mark it read; the trigger below keeps them
-- to the columns that are theirs.
drop policy if exists "feedback: update visible" on public.feedback_threads;
create policy "feedback: update visible" on public.feedback_threads for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

grant update (status, seen_author, seen_admin)
  on table public.feedback_threads to authenticated;

create or replace function public.feedback_thread_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.id         := old.id;
  new.author_id  := old.author_id;
  new.subject    := old.subject;
  new.created_at := old.created_at;

  -- Each side keeps its own bookmark. Being able to mark the other side's copy
  -- as read would make the unread mark meaningless in the one direction that
  -- matters: an admin quietly clearing the badge on somebody's unanswered thread.
  if public.is_admin() then
    new.seen_author := old.seen_author;
  else
    new.seen_admin := old.seen_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_threads_guard on public.feedback_threads;
create trigger feedback_threads_guard
  before update on public.feedback_threads
  for each row execute function public.feedback_thread_guard();

-- ─── The replies ─────────────────────────────────────────────────────────
drop policy if exists "feedback msgs: read visible" on public.feedback_messages;
create policy "feedback msgs: read visible" on public.feedback_messages for select
  using (public.feedback_visible(thread_id));

drop policy if exists "feedback msgs: write visible" on public.feedback_messages;
create policy "feedback msgs: write visible" on public.feedback_messages for insert
  with check (author_id = auth.uid() and public.feedback_visible(thread_id));

-- No update policy at all: a message said is a message said. Anybody may add
-- another one, and neither side can rewrite what the other is replying to.
drop policy if exists "feedback msgs: delete own or admin" on public.feedback_messages;
create policy "feedback msgs: delete own or admin" on public.feedback_messages for delete
  using (author_id = auth.uid() or public.is_admin());

-- ─── A reply wakes the thread, and tells the other side ──────────────────
create or replace function public.feedback_touch()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  t public.feedback_threads%rowtype;
  admins uuid[];
begin
  select * into t from public.feedback_threads where id = new.thread_id;
  if t.id is null then return null; end if;

  update public.feedback_threads
     set updated_at = now(),
         -- Writing counts as having read: the side that just replied has
         -- self-evidently seen everything above their own message.
         seen_author = case when new.author_id = t.author_id then now() else seen_author end,
         seen_admin  = case when new.author_id <> t.author_id then now() else seen_admin end,
         -- A reply reopens a closed thread. Somebody had more to say, and
         -- leaving it closed would hide that from the side who has to hear it.
         status = 'open'
   where id = new.thread_id;

  if new.author_id = t.author_id then
    -- To the admins, all of them: there is no assignee, so there is nobody in
    -- particular whose turn it is.
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    select p.id, 'feedback', new.author_id, public.actor_name(), left(t.subject, 140)
      from public.profiles p
     where p.is_admin and p.id <> new.author_id;
  else
    insert into public.notifications (recipient, kind, actor, actor_name, body)
    values (t.author_id, 'feedback', new.author_id, public.actor_name(),
            left(t.subject, 140));
  end if;
  return null;
end;
$$;

drop trigger if exists feedback_messages_touch on public.feedback_messages;
create trigger feedback_messages_touch
  after insert on public.feedback_messages
  for each row execute function public.feedback_touch();

-- The audit log covers these like everything else.
do $$
declare t text;
begin
  foreach t in array array['feedback_threads', 'feedback_messages'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end;
$$;
