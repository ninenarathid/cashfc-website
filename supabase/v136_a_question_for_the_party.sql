-- v136 — a question for the party
--
-- Run this once in the Supabase SQL editor. It builds on the party board and
-- the bell as they stand (nothing that is still waiting to run), and running
-- it again is safe. The site's code for it may go live before or after: the
-- page asks for these tables on their own, and draws a party with no
-- questions while they are not there.
--
-- Why. The owner, 2026-10-05:
--
--   "ช่วยเพิ่ม function การโหวตให้กับ Party finder โดยหัวหน้า party สามารถทำ poll
--    ตั้งคำถาม และ add choise ได้ member สามารถมาตอบได้"
--
-- A party settles a dozen small things before it starts: which evening, what
-- time, which fight first, who brings the food. Today that is a message under
-- the party and eight answers scattered through the conversation, counted by
-- hand. So the lead asks it as a question with choices, and everybody answers
-- by pressing one.
--
--   party_polls          a question under a party: its words, whether one
--                        answer or several, and whether it is still open
--   party_poll_options   its choices, two to ten, in the order they were typed
--   party_poll_votes     who picked which, one row per person per choice
--
-- Who may do what:
--
--   · Ask, add a choice, close, reopen, delete: the party's lead, holding the
--     proved character v85 asks of anybody who writes, or an admin standing in
--     for one. The same pair that lets a request in (party_let_in) and moves
--     people (v95).
--   · Answer: any signed-in member with a proved character, the same bar as
--     saying something under the party. Not only the people already in it: a
--     lead asking "which evening?" is often asking the people who have not
--     joined yet, and every answer carries its name, so the lead can see who
--     is speaking.
--   · Read: whoever is signed in, as v75's group photos are. Who is free on
--     which evening is said under a name, and that is for members.
--
-- Nothing here is written by a browser straight into a table. The three tables
-- are granted SELECT and nothing else, and every write goes through one of
-- five functions that ask the questions a policy would have asked. Two
-- reasons. A question and its choices are two tables that must arrive
-- together or not at all; and "one answer only" is a rule about a row in
-- another table, which no unique index can say. The v85 restrictive policies
-- are added all the same, so a grant made later cannot open what they close.
--
-- The names on the answers are the database's: read from the caller's own
-- profile at the moment they answer, never sent by the page.
--
-- Everybody in the party is told when a question is asked (`party_poll` in the
-- bell, the question as its body): a question nobody knows about gets no
-- answers. One unread notice a party, as v95 does for a move: three questions
-- in a minute are one piece of news.
--
-- And the board hears about it. Every answer moves `changed_at` on the
-- question's own row, so the one table the page listens to is party_polls:
-- an answer changed is one event, not a delete and an insert.

/* ── the tables ──────────────────────────────────────────────────────────── */

create table if not exists public.party_polls (
  id         bigint generated always as identity primary key,
  party_id   bigint not null references public.party_posts (id) on delete cascade,
  -- Who asked. Kept when they go, because the question is the party's.
  author     uuid references public.profiles (id) on delete set null,
  question   text not null check (char_length(question) between 1 and 200),
  -- Several answers each, where the question is "which evenings can you do".
  multi      boolean not null default false,
  closed_at  timestamptz,
  created_at timestamptz not null default now(),
  -- Moved by every answer and every change, for the board's realtime.
  changed_at timestamptz not null default now()
);

create index if not exists party_polls_party on public.party_polls (party_id, created_at);
create index if not exists party_polls_author on public.party_polls (author) where author is not null;

create table if not exists public.party_poll_options (
  id      bigint generated always as identity primary key,
  poll_id bigint not null references public.party_polls (id) on delete cascade,
  label   text not null check (char_length(label) between 1 and 80),
  sort    integer not null default 0,
  -- So an answer can be held to "a choice of this question" by a foreign key.
  unique (poll_id, id)
);

create index if not exists party_poll_options_poll on public.party_poll_options (poll_id, sort, id);

create table if not exists public.party_poll_votes (
  poll_id      bigint not null references public.party_polls (id) on delete cascade,
  option_id    bigint not null,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  -- Who that is in the game, as their profile said when they answered.
  character_id bigint,
  name         text,
  created_at   timestamptz not null default now(),
  primary key (option_id, profile_id),
  -- The choice belongs to the question the row names: an answer cannot be
  -- filed under one question and point at another's choice.
  foreign key (poll_id, option_id)
    references public.party_poll_options (poll_id, id) on delete cascade
);

create index if not exists party_poll_votes_poll on public.party_poll_votes (poll_id);
create index if not exists party_poll_votes_profile on public.party_poll_votes (profile_id);

/* ── who may read, and that nobody writes ────────────────────────────────── */

alter table public.party_polls        enable row level security;
alter table public.party_poll_options enable row level security;
alter table public.party_poll_votes   enable row level security;

-- One loop, because it is one rule said three times: read by whoever is signed
-- in, written by nobody (there is no permissive policy for any write, and no
-- grant), and v85's restrictive trio on top so a later grant stays behind the
-- proved character.
do $$
declare
  t text;
begin
  foreach t in array array['party_polls', 'party_poll_options', 'party_poll_votes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_named_write', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated'
      || ' with check ((select public.verified_character()) or (select public.is_admin()))',
      t || '_named_write', t);
    execute format('drop policy if exists %I on public.%I', t || '_named_edit', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated'
      || ' using ((select public.verified_character()) or (select public.is_admin()))'
      || ' with check ((select public.verified_character()) or (select public.is_admin()))',
      t || '_named_edit', t);
    execute format('drop policy if exists %I on public.%I', t || '_named_drop', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated'
      || ' using ((select public.verified_character()) or (select public.is_admin()))',
      t || '_named_drop', t);

    -- Supabase gave anon and authenticated ALL on these the moment they were
    -- created. Taken back, and only reading handed out again.
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

/* ── whose party it is ───────────────────────────────────────────────────── */

-- The one question four of the functions below ask: is the caller this
-- party's lead, with a proved character, or an admin? False for a party that
-- has been taken down. Nobody's to call from a browser; the functions below
-- run as their owner and ask it for whoever called them.
create or replace function public.party_poll_may(p_party bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.party_posts x
     where x.id = p_party
       and x.deleted_at is null
       and ((x.owner = (select auth.uid()) and public.verified_character())
            or public.is_admin())
  );
$$;

revoke execute on function public.party_poll_may(bigint) from public, anon, authenticated;

/* ── asking ──────────────────────────────────────────────────────────────── */

-- A question and its choices, in one statement. Returns the question's id.
--
-- The choices are taken as typed: trimmed, the empty ones dropped, in the
-- order given. Two to ten of them, no two the same (whatever their capitals),
-- and ten questions a party at the most, so a lead cannot bury a party under
-- them or ring everybody's bell without end.
create or replace function public.party_poll_create(
  p_party bigint,
  p_question text,
  p_options text[],
  p_multi boolean default false
)
returns bigint
language plpgsql security definer set search_path = public
as $fn$
declare
  me     uuid := auth.uid();
  ask    text := btrim(coalesce(p_question, ''));
  labels text[];
  made   bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.party_poll_may(p_party) then
    raise exception 'only the lead can ask the party a question';
  end if;
  if char_length(ask) not between 1 and 200 then
    raise exception 'a question is 1 to 200 characters';
  end if;
  if coalesce(cardinality(p_options), 0) > 40 then
    raise exception 'a question has 2 to 10 choices';
  end if;

  select coalesce(array_agg(btrim(o.x) order by o.i), '{}'::text[]) into labels
    from unnest(coalesce(p_options, '{}'::text[])) with ordinality as o(x, i)
   where btrim(coalesce(o.x, '')) <> '';
  if cardinality(labels) not between 2 and 10 then
    raise exception 'a question has 2 to 10 choices';
  end if;
  if exists (select 1 from unnest(labels) as l(x) where char_length(l.x) > 80) then
    raise exception 'a choice is 80 characters at the most';
  end if;
  if (select count(distinct lower(l.x)) from unnest(labels) as l(x)) <> cardinality(labels) then
    raise exception 'two choices say the same thing';
  end if;

  -- The party held while its questions are counted, so two windows pressing
  -- at once cannot both be the tenth.
  perform 1 from public.party_posts x where x.id = p_party for update;
  if (select count(*) from public.party_polls q where q.party_id = p_party) >= 10 then
    raise exception 'this party has ten questions already';
  end if;

  insert into public.party_polls (party_id, author, question, multi)
  values (p_party, me, ask, coalesce(p_multi, false))
  returning id into made;

  insert into public.party_poll_options (poll_id, label, sort)
  select made, l.x, l.i::int from unnest(labels) with ordinality as l(x, i);

  -- Everybody in it is told, and its lead when an admin asked for them. Only
  -- people who have said yes: a request and an invitation are not in the
  -- party yet. An unread notice about an earlier question of this party is
  -- replaced, so the bell holds one line a party and it names the newest.
  delete from public.notifications n
   where n.kind = 'party_poll' and n.party_id = p_party and n.read_at is null
     and n.recipient <> me;

  insert into public.notifications (recipient, kind, actor, actor_name, party_id, body)
  select w.id, 'party_poll', me, public.actor_name(), p_party, ask
    from (
      select pr.id
        from public.party_members m
        join public.profiles pr
          on pr.character_id = m.character_id and pr.character_verified_at is not null
       where m.party_id = p_party and m.confirmed_at is not null
      union
      select x.owner from public.party_posts x where x.id = p_party
    ) w
   where w.id <> me;

  return made;
end;
$fn$;

/* ── answering ───────────────────────────────────────────────────────────── */

-- My answer to a question: exactly the choices named, replacing whatever I
-- had said before. An empty list takes the answer back. Returns how many
-- choices now stand under my name.
--
-- One function for answering, changing and taking back, because from the
-- page it is one press, and because "one answer only" is checked against the
-- question's own row, held for the length of the statement.
create or replace function public.party_poll_vote(p_poll bigint, p_options bigint[])
returns integer
language plpgsql security definer set search_path = public
as $fn$
declare
  me    uuid := auth.uid();
  q     public.party_polls;
  picks bigint[];
begin
  if me is null then raise exception 'not signed in'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'a verified character is needed to answer';
  end if;
  if coalesce(cardinality(p_options), 0) > 40 then
    raise exception 'that is not one of its choices';
  end if;

  select * into q from public.party_polls where id = p_poll for update;
  if q.id is null or not exists (
       select 1 from public.party_posts x where x.id = q.party_id and x.deleted_at is null) then
    raise exception 'that question is not there any more';
  end if;
  if q.closed_at is not null then raise exception 'that question is closed'; end if;

  select coalesce(array_agg(distinct o.x), '{}'::bigint[]) into picks
    from unnest(coalesce(p_options, '{}'::bigint[])) as o(x)
   where o.x is not null;
  if cardinality(picks) > 1 and not q.multi then
    raise exception 'this question takes one answer';
  end if;
  if (select count(*) from public.party_poll_options o
       where o.poll_id = p_poll and o.id = any(picks)) <> cardinality(picks) then
    raise exception 'that is not one of its choices';
  end if;

  delete from public.party_poll_votes v
   where v.poll_id = p_poll and v.profile_id = me and not (v.option_id = any(picks));

  -- The name is the profile's, not the page's. A choice I already hold keeps
  -- the moment I first picked it.
  insert into public.party_poll_votes (poll_id, option_id, profile_id, character_id, name)
  select p_poll, o.x, me,
         case when pr.character_verified_at is not null then pr.character_id end,
         coalesce(pr.character_name, pr.display_name, pr.discord_username)
    from unnest(picks) as o(x), public.profiles pr
   where pr.id = me
  on conflict (option_id, profile_id) do nothing;

  update public.party_polls set changed_at = now() where id = p_poll;
  return cardinality(picks);
end;
$fn$;

/* ── the lead's three ────────────────────────────────────────────────────── */

-- One more choice, on a question that is still open: somebody says "what
-- about Sunday?" under it, and the lead adds Sunday. Never renamed and never
-- removed: people answered the words that were there. Returns its id.
create or replace function public.party_poll_add_option(p_poll bigint, p_label text)
returns bigint
language plpgsql security definer set search_path = public
as $fn$
declare
  q     public.party_polls;
  said  text := btrim(coalesce(p_label, ''));
  made  bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into q from public.party_polls where id = p_poll for update;
  if q.id is null then raise exception 'that question is not there any more'; end if;
  if not public.party_poll_may(q.party_id) then
    raise exception 'only the lead can add a choice';
  end if;
  if q.closed_at is not null then raise exception 'that question is closed'; end if;
  if char_length(said) not between 1 and 80 then
    raise exception 'a choice is 1 to 80 characters';
  end if;
  if exists (select 1 from public.party_poll_options o
              where o.poll_id = p_poll and lower(o.label) = lower(said)) then
    raise exception 'two choices say the same thing';
  end if;
  if (select count(*) from public.party_poll_options o where o.poll_id = p_poll) >= 10 then
    raise exception 'a question has 2 to 10 choices';
  end if;

  insert into public.party_poll_options (poll_id, label, sort)
  select p_poll, said, coalesce(max(o.sort), 0) + 1
    from public.party_poll_options o where o.poll_id = p_poll
  returning id into made;

  update public.party_polls set changed_at = now() where id = p_poll;
  return made;
end;
$fn$;

-- Closed: it keeps its answers and takes no more. Open again with false. The
-- moment it was first closed is kept when it is closed twice.
create or replace function public.party_poll_close(p_poll bigint, p_closed boolean default true)
returns void
language plpgsql security definer set search_path = public
as $fn$
declare
  q public.party_polls;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into q from public.party_polls where id = p_poll for update;
  if q.id is null then raise exception 'that question is not there any more'; end if;
  if not public.party_poll_may(q.party_id) then
    raise exception 'only the lead can close a question';
  end if;
  update public.party_polls
     set closed_at = case when coalesce(p_closed, true) then coalesce(closed_at, now()) end,
         changed_at = now()
   where id = p_poll;
end;
$fn$;

-- Taken down, with its choices and its answers. A real delete: a question
-- withdrawn is not a record of anything, and the bell's unread line about it
-- goes too, because it would lead to a question that is not there.
create or replace function public.party_poll_drop(p_poll bigint)
returns void
language plpgsql security definer set search_path = public
as $fn$
declare
  q public.party_polls;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into q from public.party_polls where id = p_poll for update;
  if q.id is null then return; end if;
  if not public.party_poll_may(q.party_id) then
    raise exception 'only the lead can delete a question';
  end if;
  delete from public.notifications n
   where n.kind = 'party_poll' and n.party_id = q.party_id
     and n.body = q.question and n.read_at is null;
  delete from public.party_polls where id = p_poll;
end;
$fn$;

/* ── who may call them ───────────────────────────────────────────────────── */

-- EXECUTE goes to PUBLIC by default and Supabase adds anon on top. Each of
-- them refuses a caller with no session anyway; this refuses sooner.
revoke execute on function public.party_poll_create(bigint, text, text[], boolean) from public, anon;
revoke execute on function public.party_poll_vote(bigint, bigint[]) from public, anon;
revoke execute on function public.party_poll_add_option(bigint, text) from public, anon;
revoke execute on function public.party_poll_close(bigint, boolean) from public, anon;
revoke execute on function public.party_poll_drop(bigint) from public, anon;
grant execute on function public.party_poll_create(bigint, text, text[], boolean) to authenticated;
grant execute on function public.party_poll_vote(bigint, bigint[]) to authenticated;
grant execute on function public.party_poll_add_option(bigint, text) to authenticated;
grant execute on function public.party_poll_close(bigint, boolean) to authenticated;
grant execute on function public.party_poll_drop(bigint) to authenticated;

/* ── the board hears about it ────────────────────────────────────────────── */

-- Only the questions' own table: every answer and every change moves a row
-- of it (changed_at). Skipped where there is no such publication, and where
-- the table is in it already.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'party_polls') then
    alter publication supabase_realtime add table public.party_polls;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select c.relname, c.relrowsecurity from pg_class c
--    where c.oid in ('public.party_polls'::regclass, 'public.party_poll_options'::regclass,
--                    'public.party_poll_votes'::regclass) order by 1;
--   -- party_poll_options true | party_poll_votes true | party_polls true
--
--   select tablename, count(*) filter (where permissive = 'PERMISSIVE') as open_,
--          string_agg(cmd, ',' order by cmd) filter (where permissive = 'PERMISSIVE') as open_for,
--          count(*) filter (where permissive = 'RESTRICTIVE') as named
--     from pg_policies where tablename like 'party\_poll%' group by 1 order by 1;
--   -- party_poll_options 1 SELECT 3 | party_poll_votes 1 SELECT 3 | party_polls 1 SELECT 3
--
--   select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as may
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name like 'party\_poll%' and grantee in ('anon', 'authenticated')
--    group by 1, 2 order by 1, 2;
--   -- party_poll_options authenticated SELECT | party_poll_votes authenticated SELECT
--   -- | party_polls authenticated SELECT          (and no row for anon)
--
--   select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as member,
--          has_function_privilege('anon', p.oid, 'execute') as anon
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'party\_poll\_%'
--    order by 1;
--   -- party_poll_add_option true false | party_poll_close true false | party_poll_create true false
--   -- | party_poll_drop true false | party_poll_may false false | party_poll_vote true false
--
--   select count(*) from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'party_polls';
--   -- 1
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the questions asked lately: where, by whom, how many answered
--   select q.id, q.party_id, x.content_key, p.character_name as asked_by, q.question, q.multi,
--          q.closed_at is not null as closed,
--          (select count(distinct v.profile_id) from public.party_poll_votes v where v.poll_id = q.id) as answered
--     from public.party_polls q
--     join public.party_posts x on x.id = q.party_id
--     left join public.profiles p on p.id = q.author
--    order by q.created_at desc limit 30;
