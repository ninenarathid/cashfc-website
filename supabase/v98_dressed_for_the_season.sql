-- v98 — dressed for the season
--
-- Run this once in the Supabase SQL editor. It needs v85 (verified_character),
-- v87 (fc_roster) and is_admin(). Running it again is safe, and so is running
-- it over an earlier draft of itself.
--
-- A glamour contest for each festival. Aqua, or any admin, sets a theme, four
-- dates and the rules; each member enters one look; everybody with a verified
-- character throws popoto at the looks they like; Aqua announces the result
-- herself. Asked for by Aqua on 2026-09-30. Every rule below is one of her
-- answers, and where she said "let me choose each time", it is a switch on
-- the contest rather than a rule:
--
--   when          four dates: entries open and close, voting opens and closes
--   vote_limit    popoto per member: one per look on as many as you like, or N
--   show_votes    the running count on or off, changeable while it runs
--   fc_only       whether only the FC may enter (everybody verified may vote)
--   needs_approval  whether a look waits for an admin before anybody sees it
--   hide_names    whether who entered which look stays secret until the result
--   allow_mods, allow_shaders   the two rules every glamour contest states
--
--   contests          one row per contest, with all of the above
--   contest_entries   one look per member per contest, with its caption
--   contest_images    the pictures of a look, in order; up to four
--   contest_votes     one popoto per member per look
--   contest_awards    what Aqua names when she announces
--   contest_secret    one random value, for naming folders (see below)
--   contest (bucket)  the pictures
--
-- Not the gallery, on purpose. A contest popoto is not a gallery popoto: Aqua
-- asked for the two to stay apart, and a gallery popoto is already four other
-- things — a share of the leaderboard, a push up "Hot right now", an Evercold
-- ticket, and a roll at a prize. None of that should happen because somebody
-- liked a costume.
--
-- The decisions that are not the only answer:
--
-- The result is announced by hand, never by the clock, because Aqua may name
-- special prizes that no count decides. Announcing also closes the contest.
--
-- A look's pictures cannot be swapped once it is in. They are written once,
-- all together, by contest_enter; to change them a member withdraws the look
-- and enters again, and the popoto it had go with it. The files under a look
-- cannot be deleted while it stands, so one cannot be replaced underneath it.
--
-- Hiding names is done here, not in the page. A page that merely chose not to
-- print a name would still be sent it, and anybody could read it off the
-- network tab. So members read looks through contest_looks, which leaves the
-- name out while the contest says so; the table itself no longer hands anybody
-- its author columns; and the folders pictures live in are named by a hash of
-- the member and a secret only the database knows, because a folder named
-- after a member's id is a name to anybody who can read profiles.
--
-- "FC only" is asked of fc_roster, which the admin page fills. An empty roster
-- counts nobody as FC, as in v87 — a loud failure, not a quiet one.
--
-- Supabase grants every privilege on a new table to anon and authenticated by
-- default and leaves the rest to row level security. That is not enough here,
-- because a member may update their own look and the row's author is in it.
-- So each table's grants are set outright below rather than added to.

/* ── the contest ─────────────────────────────────────────────────────────── */

create table if not exists public.contests (
  id                bigserial primary key,
  title             text not null check (char_length(btrim(title)) between 1 and 120),
  title_en          text check (title_en is null or char_length(title_en) <= 120),
  -- The theme, the rules, the prizes — whatever Aqua wants to say. Newlines
  -- are kept: a list written as a list should read as one.
  body              text check (body is null or char_length(body) <= 4000),
  body_en           text check (body_en is null or char_length(body_en) <= 4000),
  poster_url        text,
  submit_opens_at   timestamptz not null,
  submit_closes_at  timestamptz not null,
  vote_opens_at     timestamptz not null,
  vote_closes_at    timestamptz not null,
  -- Null: one popoto per look, on as many looks as you like.
  vote_limit        integer check (vote_limit is null or vote_limit between 1 and 99),
  show_votes        boolean not null default false,
  fc_only           boolean not null default true,
  needs_approval    boolean not null default false,
  hide_names        boolean not null default false,
  allow_mods        boolean not null default false,
  allow_shaders     boolean not null default true,
  -- Null is a draft only admins can see.
  published_at      timestamptz,
  announced_at      timestamptz,
  created_by        uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (submit_closes_at > submit_opens_at),
  check (vote_closes_at > vote_opens_at),
  check (vote_opens_at >= submit_opens_at),
  check (vote_closes_at >= submit_closes_at)
);

-- For a database that ran an earlier draft of this file.
alter table public.contests add column if not exists needs_approval boolean not null default false;
alter table public.contests add column if not exists hide_names boolean not null default false;

create index if not exists contests_newest on public.contests (submit_opens_at desc);

alter table public.contests enable row level security;

drop policy if exists contests_read on public.contests;
create policy contests_read on public.contests
  for select to anon, authenticated
  using (published_at is not null or (select public.is_admin()));

drop policy if exists contests_admin_add on public.contests;
create policy contests_admin_add on public.contests
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists contests_admin_edit on public.contests;
create policy contests_admin_edit on public.contests
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists contests_admin_drop on public.contests;
create policy contests_admin_drop on public.contests
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.contests from anon, authenticated;
grant select on public.contests to anon, authenticated;
grant insert, update, delete on public.contests to authenticated;
grant usage on sequence public.contests_id_seq to authenticated;

-- Taking entries now, and voting now. The database's clock, not the reader's:
-- a phone set an hour fast should not be able to vote after the close.
create or replace function public.contest_submitting(p_contest bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.contests c
     where c.id = p_contest
       and c.published_at is not null and c.announced_at is null
       and now() >= c.submit_opens_at and now() < c.submit_closes_at
  );
$$;

create or replace function public.contest_voting(p_contest bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.contests c
     where c.id = p_contest
       and c.published_at is not null and c.announced_at is null
       and now() >= c.vote_opens_at and now() < c.vote_closes_at
  );
$$;

-- Whose look is whose is kept back while this is true.
create or replace function public.contest_names_hidden(p_contest bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.contests c
     where c.id = p_contest and c.hide_names and c.announced_at is null
  );
$$;

grant execute on function public.contest_submitting(bigint) to anon, authenticated;
grant execute on function public.contest_voting(bigint) to anon, authenticated;
grant execute on function public.contest_names_hidden(bigint) to anon, authenticated;

/* ── the looks ───────────────────────────────────────────────────────────── */

create table if not exists public.contest_entries (
  id            bigserial primary key,
  contest_id    bigint not null references public.contests(id) on delete cascade,
  author_id     uuid   not null references public.profiles(id) on delete cascade,
  -- Copied from the author's verified character when the look is entered, and
  -- never changed after: the result belongs to whoever entered, not to
  -- whichever character that account holds a month later.
  character_id  bigint not null,
  -- The look's number within its contest, 1 upwards in the order they came.
  -- What a look is called while names are hidden, and never reused: a
  -- withdrawn number stays a gap, so "number 7" means one look all contest.
  number        integer,
  caption       text check (caption is null or char_length(caption) <= 300),
  -- Taken down by an admin: off the contest, out of the count, still here.
  hidden        boolean not null default false,
  -- When an admin let it in, for a contest that asks for that. A look entered
  -- while approval was not asked for is let in as it arrives, so switching
  -- approval on halfway does not take down the looks already showing.
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One look each. Aqua's rule, and the one that makes a vote a choice.
  unique (contest_id, author_id),
  -- So a vote or an award can name its look and its contest in one key and
  -- cannot pair a look with a contest it is not in.
  unique (id, contest_id)
);

alter table public.contest_entries add column if not exists number integer;
alter table public.contest_entries add column if not exists approved_at timestamptz;

create index if not exists contest_entries_on on public.contest_entries (contest_id, created_at);
create unique index if not exists contest_entries_number on public.contest_entries (contest_id, number);

/*
 * Whether a look is on the wall for everybody: the contest is published, an
 * admin has not taken it down, and it does not wait for an approval it has
 * not had. One function, because the policy, contest_looks, the vote and the
 * count all ask it, and four copies of a rule become four rules.
 */
create or replace function public.contest_look_shown(
  p_contest bigint, p_hidden boolean, p_approved timestamptz
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not coalesce(p_hidden, false) and exists (
    select 1 from public.contests c
     where c.id = p_contest and c.published_at is not null
       and (p_approved is not null or not c.needs_approval)
  );
$$;

grant execute on function public.contest_look_shown(bigint, boolean, timestamptz) to anon, authenticated;

alter table public.contest_entries enable row level security;

-- Its author and admins see a look whatever state it is in, so a member can
-- see that theirs is waiting or was taken down.
drop policy if exists contest_entries_read on public.contest_entries;
create policy contest_entries_read on public.contest_entries
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or contest_entries.author_id = (select auth.uid())
    or public.contest_look_shown(contest_entries.contest_id, contest_entries.hidden,
                                 contest_entries.approved_at)
  );

-- No insert policy: a look goes in through contest_enter, pictures and all.

-- The caption by its author; hidden and approved by an admin. Which of them
-- may change what, and when, is contest_entry_guard's to say.
drop policy if exists contest_entries_edit on public.contest_entries;
create policy contest_entries_edit on public.contest_entries
  for update to authenticated
  using (contest_entries.author_id = (select auth.uid()) or (select public.is_admin()))
  with check (contest_entries.author_id = (select auth.uid()) or (select public.is_admin()));

-- Withdrawing: until voting closes, and never after the result is out.
drop policy if exists contest_entries_withdraw on public.contest_entries;
create policy contest_entries_withdraw on public.contest_entries
  for delete to authenticated
  using (
    (select public.is_admin())
    or (contest_entries.author_id = (select auth.uid()) and exists (
          select 1 from public.contests c
           where c.id = contest_entries.contest_id
             and c.announced_at is null and now() < c.vote_closes_at))
  );

-- Everything but who wrote it. The author columns are for contest_looks to
-- hand out, or keep back; a direct select naming them is refused outright.
revoke all on public.contest_entries from anon, authenticated;
grant select (id, contest_id, number, caption, hidden, approved_at, created_at, updated_at)
  on public.contest_entries to anon, authenticated;
grant update (caption, hidden, approved_at) on public.contest_entries to authenticated;
grant delete on public.contest_entries to authenticated;

create or replace function public.contest_entry_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Which contest, whose, and which number: fixed for good, admins included.
  if new.contest_id is distinct from old.contest_id
     or new.author_id is distinct from old.author_id
     or new.character_id is distinct from old.character_id
     or new.number is distinct from old.number
     or new.created_at is distinct from old.created_at then
    raise exception 'that cannot change';
  end if;
  new.updated_at := now();
  if public.is_admin() then
    return new;
  end if;
  if new.hidden is distinct from old.hidden
     or new.approved_at is distinct from old.approved_at then
    raise exception 'admins only';
  end if;
  -- A caption is part of the look, so it can be fixed while looks are still
  -- being taken and not after.
  if new.caption is distinct from old.caption
     and not public.contest_submitting(old.contest_id) then
    raise exception 'entries are closed';
  end if;
  return new;
end;
$fn$;

-- Looks entered under an earlier draft of this file have no number and no
-- approval. Filled here, before the guard is put back, because the guard is
-- what refuses changing either.
drop trigger if exists contest_entry_guard on public.contest_entries;

update public.contest_entries e
   set approved_at = e.created_at
  from public.contests c
 where c.id = e.contest_id and not c.needs_approval and e.approved_at is null;

update public.contest_entries e
   set number = s.k
  from (
    select y.id,
           row_number() over (partition by y.contest_id order by y.id)
           + coalesce((select max(x.number) from public.contest_entries x
                        where x.contest_id = y.contest_id), 0) as k
      from public.contest_entries y
     where y.number is null
  ) s
 where e.id = s.id;

create trigger contest_entry_guard
  before update on public.contest_entries
  for each row execute function public.contest_entry_guard();

/*
 * The looks of one contest, as this reader may see them.
 *
 * The one place a member learns who entered what. While the contest hides
 * names, the author, their character and their name come back empty for
 * everybody but the author and admins, and `number` is what the page calls
 * a look instead. `mine` says which look is the reader's own either way, so
 * the page can say so and leave its popoto button off.
 */
create or replace function public.contest_looks(p_contest bigint)
returns table (
  id bigint, contest_id bigint, number integer, caption text, hidden boolean,
  approved_at timestamptz, created_at timestamptz, mine boolean,
  author_id uuid, character_id bigint, author_name text
)
language sql stable security definer set search_path = public
as $$
  select e.id, e.contest_id, e.number, e.caption, e.hidden,
         e.approved_at, e.created_at,
         coalesce(e.author_id = auth.uid(), false),
         case when x.masked then null else e.author_id end,
         case when x.masked then null else e.character_id end,
         case when x.masked then null else p.character_name end
    from public.contest_entries e
    cross join lateral (
      select public.contest_names_hidden(e.contest_id)
             and e.author_id is distinct from auth.uid()
             and not public.is_admin() as masked
    ) x
    left join public.profiles p on p.id = e.author_id
   where e.contest_id = p_contest
     and (public.is_admin()
          or e.author_id = auth.uid()
          or public.contest_look_shown(e.contest_id, e.hidden, e.approved_at))
   order by e.id;
$$;

grant execute on function public.contest_looks(bigint) to anon, authenticated;

/* ── the pictures of a look ──────────────────────────────────────────────── */

create table if not exists public.contest_images (
  id          bigserial primary key,
  entry_id    bigint not null references public.contest_entries(id) on delete cascade,
  -- Where the file is in the bucket, and nothing else. The page makes the
  -- address from it, so a look can only ever show a file that is in this
  -- bucket: a stored address could have pointed anywhere on the internet.
  path        text   not null,
  -- The small copy for the grid, when one was made. See lib/gallery.ts.
  thumb_path  text,
  width       integer,
  height      integer,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique (entry_id, position)
);

alter table public.contest_images enable row level security;

-- Whoever can see the look can see its pictures. The subquery is itself under
-- contest_entries_read, so this is one rule and not two.
drop policy if exists contest_images_read on public.contest_images;
create policy contest_images_read on public.contest_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.contest_entries e where e.id = contest_images.entry_id));

-- One bad picture out of a set, by an admin. Members withdraw the whole look.
drop policy if exists contest_images_admin_drop on public.contest_images;
create policy contest_images_admin_drop on public.contest_images
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.contest_images from anon, authenticated;
grant select on public.contest_images to anon, authenticated;
grant delete on public.contest_images to authenticated;

/* ── the popoto ──────────────────────────────────────────────────────────── */

create table if not exists public.contest_votes (
  contest_id  bigint not null,
  entry_id    bigint not null,
  voter_id    uuid   not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (entry_id, voter_id),
  -- A look withdrawn or deleted takes its popoto with it, and whoever gave
  -- them has them back to give again.
  foreign key (entry_id, contest_id)
    references public.contest_entries (id, contest_id) on delete cascade
);

create index if not exists contest_votes_by on public.contest_votes (contest_id, voter_id);

alter table public.contest_votes enable row level security;

-- Your own, so the page knows which looks you have given to. Admins see all
-- of them, which is how a contest is checked for somebody voting twice. How
-- many a look has is contest_tally's to say.
drop policy if exists contest_votes_read on public.contest_votes;
create policy contest_votes_read on public.contest_votes
  for select to authenticated
  using (contest_votes.voter_id = (select auth.uid()) or (select public.is_admin()));

-- No insert or delete policy: a popoto is given and taken back through
-- contest_vote, which is where the window, the limit and the lock are.

revoke all on public.contest_votes from anon, authenticated;
grant select on public.contest_votes to authenticated;

/* ── what Aqua names ─────────────────────────────────────────────────────── */

create table if not exists public.contest_awards (
  id          bigserial primary key,
  contest_id  bigint not null,
  entry_id    bigint not null,
  label       text   not null check (char_length(btrim(label)) between 1 and 60),
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  foreign key (entry_id, contest_id)
    references public.contest_entries (id, contest_id) on delete cascade
);

create index if not exists contest_awards_on on public.contest_awards (contest_id, position);

alter table public.contest_awards enable row level security;

-- Written ahead by admins and kept from everybody else until the announcement,
-- so a special prize is a surprise and not a row somebody found early.
drop policy if exists contest_awards_read on public.contest_awards;
create policy contest_awards_read on public.contest_awards
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.contests c
       where c.id = contest_awards.contest_id and c.announced_at is not null)
  );

drop policy if exists contest_awards_admin_add on public.contest_awards;
create policy contest_awards_admin_add on public.contest_awards
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists contest_awards_admin_edit on public.contest_awards;
create policy contest_awards_admin_edit on public.contest_awards
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists contest_awards_admin_drop on public.contest_awards;
create policy contest_awards_admin_drop on public.contest_awards
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.contest_awards from anon, authenticated;
grant select on public.contest_awards to anon, authenticated;
grant insert, update, delete on public.contest_awards to authenticated;
grant usage on sequence public.contest_awards_id_seq to authenticated;

/* ── folders that do not say whose they are ──────────────────────────────── */

/*
 * One random value, made the first time this runs and never shown to anybody.
 * A member's folder in a contest is a hash of it with their id, so the folder
 * is the same every time they upload and nobody can work out whose it is.
 * Row level security with no policy at all: only the functions below read it.
 */
create table if not exists public.contest_secret (
  id    boolean primary key default true check (id),
  salt  text    not null
);

alter table public.contest_secret enable row level security;
revoke all on public.contest_secret from anon, authenticated;

insert into public.contest_secret (salt)
values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

-- The caller's folder in a contest. Asked by the page before it uploads.
create or replace function public.contest_folder(p_contest bigint)
returns text
language sql stable security definer set search_path = public
as $$
  select left(encode(sha256(convert_to(
           s.salt || ':' || p_contest::text || ':' || auth.uid()::text, 'UTF8')), 'hex'), 32)
    from public.contest_secret s
   where auth.uid() is not null;
$$;

-- Whether <contest>/<folder> is the caller's own. A function so that a folder
-- that is not a number is a plain no, rather than a cast error in the middle
-- of a policy whose clauses Postgres may evaluate in any order.
create or replace function public.contest_folder_mine(p_contest text, p_folder text)
returns boolean
language plpgsql stable security definer set search_path = public
as $fn$
begin
  if p_contest is null or p_contest !~ '^[0-9]{1,18}$' or p_folder is null then
    return false;
  end if;
  return p_folder = public.contest_folder(p_contest::bigint);
end;
$fn$;

-- Their own folder in a contest that is taking looks right now.
--
-- Dropped first: an earlier draft had this with its second argument named for
-- the member, and Postgres will not rename an argument in place. The cascade
-- takes the storage policy that used it, which is made again below.
drop function if exists public.contest_folder_open(text, text) cascade;
create or replace function public.contest_folder_open(p_contest text, p_folder text)
returns boolean
language plpgsql stable security definer set search_path = public
as $fn$
begin
  if not public.contest_folder_mine(p_contest, p_folder) then
    return false;
  end if;
  return public.contest_submitting(p_contest::bigint);
end;
$fn$;

grant execute on function public.contest_folder(bigint) to authenticated;
grant execute on function public.contest_folder_mine(text, text) to authenticated;
grant execute on function public.contest_folder_open(text, text) to authenticated;

/* ── entering a look ─────────────────────────────────────────────────────── */

/*
 * One call for the look and its pictures, so there is never a look with no
 * pictures or a picture with no look. The files are uploaded first, into
 * <contest>/<contest_folder>/, and this is handed where they went.
 *
 * p_images is a list of {path, thumb_path, width, height}, in the order they
 * should be shown. Every path has to be in the caller's own folder of this
 * contest: a look is made of your own uploads, never of somebody else's.
 *
 * Returns the new look's id. Entering twice fails on the unique key (23505),
 * which the page reads as "you already have a look in this one".
 */
create or replace function public.contest_enter(
  p_contest bigint, p_caption text, p_images jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me     uuid := auth.uid();
  who    bigint;
  c      public.contests;
  n      integer;
  k      integer;
  pic    jsonb;
  folder text;
  entry  bigint;
  i      integer := 0;
begin
  if me is null then raise exception 'not signed in'; end if;

  select character_id into who
    from public.profiles
   where id = me and character_id is not null and character_verified_at is not null;
  if who is null then raise exception 'verify your character first'; end if;

  select * into c from public.contests where id = p_contest;
  if c.id is null or c.published_at is null then raise exception 'no such contest'; end if;
  if not public.contest_submitting(p_contest) then raise exception 'entries are closed'; end if;
  if c.fc_only and not exists (
       select 1 from public.fc_roster r where r.character_id = who) then
    raise exception 'this contest is for the FC';
  end if;

  n := case when jsonb_typeof(p_images) = 'array' then jsonb_array_length(p_images) else 0 end;
  if n < 1 then raise exception 'a look needs a picture'; end if;
  if n > 4 then raise exception 'four pictures at most'; end if;

  folder := p_contest::text || '/' || public.contest_folder(p_contest) || '/';
  for pic in select value from jsonb_array_elements(p_images) loop
    if coalesce(pic->>'path', '') not like folder || '_%'
       or coalesce(pic->>'thumb_path', folder || 'x') not like folder || '_%'
       or coalesce(pic->>'path', '') like '%..%'
       or coalesce(pic->>'thumb_path', '') like '%..%' then
      raise exception 'not your picture';
    end if;
  end loop;

  -- A contest's numbers are handed out one at a time, so two looks entered in
  -- the same instant cannot both be number seven.
  perform pg_advisory_xact_lock(hashtextextended('contest_number:' || p_contest::text, 0));
  select coalesce(max(e.number), 0) + 1 into k
    from public.contest_entries e where e.contest_id = p_contest;

  insert into public.contest_entries
    (contest_id, author_id, character_id, number, caption, approved_at)
  values (p_contest, me, who, k, nullif(btrim(coalesce(p_caption, '')), ''),
          case when c.needs_approval then null else now() end)
  returning id into entry;

  for pic in select value from jsonb_array_elements(p_images) loop
    insert into public.contest_images
      (entry_id, path, thumb_path, width, height, position)
    values (
      entry, pic->>'path', nullif(pic->>'thumb_path', ''),
      case when pic->>'width'  ~ '^[0-9]{1,5}$' then (pic->>'width')::integer  end,
      case when pic->>'height' ~ '^[0-9]{1,5}$' then (pic->>'height')::integer end,
      i);
    i := i + 1;
  end loop;

  return entry;
end;
$fn$;

grant execute on function public.contest_enter(bigint, text, jsonb) to authenticated;

/* ── giving and taking back a popoto ─────────────────────────────────────── */

/*
 * p_give true gives this look a popoto, false takes it back. Returns how many
 * the caller has on looks in this contest afterwards, so the page can say how
 * many are left without asking again.
 *
 * Anybody with a verified character, FC or not: Aqua's answer. Never on your
 * own look, only on a look that is on the wall, and only while voting is open.
 *
 * Popoto on a look an admin has since taken down do not count against the
 * limit. They were given to something no longer in the contest, and the
 * member should have them back to give to something that is.
 */
create or replace function public.contest_vote(p_entry bigint, p_give boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me    uuid := auth.uid();
  e     public.contest_entries;
  c     public.contests;
  used  integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.verified_character() then raise exception 'verify your character first'; end if;

  select * into e from public.contest_entries where id = p_entry;
  if e.id is null or not public.contest_look_shown(e.contest_id, e.hidden, e.approved_at) then
    raise exception 'no such entry';
  end if;
  select * into c from public.contests where id = e.contest_id;
  if not public.contest_voting(c.id) then raise exception 'voting is closed'; end if;
  if e.author_id = me then raise exception 'not your own'; end if;

  -- One member's popoto in one contest at a time. Without it two taps in the
  -- same instant could each count one left and both give it.
  perform pg_advisory_xact_lock(hashtextextended('contest_vote:' || c.id || ':' || me::text, 0));

  if p_give then
    if c.vote_limit is not null and not exists (
         select 1 from public.contest_votes v
          where v.entry_id = p_entry and v.voter_id = me) then
      select count(*) into used
        from public.contest_votes v
        join public.contest_entries x on x.id = v.entry_id
       where v.contest_id = c.id and v.voter_id = me
         and public.contest_look_shown(x.contest_id, x.hidden, x.approved_at);
      if used >= c.vote_limit then raise exception 'no popoto left'; end if;
    end if;
    insert into public.contest_votes (contest_id, entry_id, voter_id)
    values (c.id, p_entry, me)
    on conflict (entry_id, voter_id) do nothing;
  else
    delete from public.contest_votes v where v.entry_id = p_entry and v.voter_id = me;
  end if;

  select count(*) into used
    from public.contest_votes v
    join public.contest_entries x on x.id = v.entry_id
   where v.contest_id = c.id and v.voter_id = me
     and public.contest_look_shown(x.contest_id, x.hidden, x.approved_at);
  return used;
end;
$fn$;

grant execute on function public.contest_vote(bigint, boolean) to authenticated;

/* ── counting ────────────────────────────────────────────────────────────── */

-- How many popoto each look has — when this contest shows it, once the result
-- is out, or to an admin. Otherwise nothing, which the page reads as "hidden".
create or replace function public.contest_tally(p_contest bigint)
returns table (entry_id bigint, votes bigint)
language sql stable security definer set search_path = public
as $$
  select v.entry_id, count(*)
    from public.contest_votes v
    join public.contest_entries e on e.id = v.entry_id
    join public.contests c on c.id = v.contest_id
   where v.contest_id = p_contest
     and (
       public.is_admin()
       or (public.contest_look_shown(e.contest_id, e.hidden, e.approved_at)
           and (c.show_votes or c.announced_at is not null))
     )
   group by v.entry_id;
$$;

-- How many looks, how many members have voted, and how many popoto in all.
-- Always published: it says the contest is alive without saying who is ahead.
create or replace function public.contest_turnout(p_contest bigint)
returns table (entries bigint, voters bigint, votes bigint)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from public.contest_entries e
      where e.contest_id = p_contest
        and public.contest_look_shown(e.contest_id, e.hidden, e.approved_at)),
    (select count(distinct v.voter_id) from public.contest_votes v
       join public.contest_entries e on e.id = v.entry_id
      where v.contest_id = p_contest
        and public.contest_look_shown(e.contest_id, e.hidden, e.approved_at)),
    (select count(*) from public.contest_votes v
       join public.contest_entries e on e.id = v.entry_id
      where v.contest_id = p_contest
        and public.contest_look_shown(e.contest_id, e.hidden, e.approved_at))
   where exists (
     select 1 from public.contests c
      where c.id = p_contest and (c.published_at is not null or public.is_admin()));
$$;

grant execute on function public.contest_tally(bigint) to anon, authenticated;
grant execute on function public.contest_turnout(bigint) to anon, authenticated;

/* ── the bucket ──────────────────────────────────────────────────────────── */

-- Public: a picture's address is how it is shown, the same as the gallery's.
-- That serves a file to whoever has its address; it does not let anybody
-- list the bucket, which is what the policies below decide.
insert into storage.buckets (id, name, public)
values ('contest', 'contest', true)
on conflict (id) do nothing;

/*
 * Whether a file is one of the pictures of a look that is still in.
 *
 * Asked before a member may delete one of their own files, because deleting
 * it and uploading a different picture under the same name would swap the
 * picture under a look that has already been voted on. Withdrawing the look
 * first removes its rows, and then the files are free to go.
 */
create or replace function public.contest_file_in_use(p_path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.contest_images i
     where i.path = p_path or i.thumb_path = p_path
  );
$$;

grant execute on function public.contest_file_in_use(text) to authenticated;

-- An earlier draft let anybody list the bucket. Listing would show a pending
-- look's pictures before an admin had let it in, and nobody needs it: the
-- page never lists, it only shows files by their address.
drop policy if exists contest_files_read on storage.objects;

-- Your own folder, and everything to an admin. Removing a file needs this as
-- well as the delete policy.
drop policy if exists contest_files_own on storage.objects;
create policy contest_files_own on storage.objects
  for select to authenticated using (
    objects.bucket_id = 'contest'
    and (
      (select public.is_admin())
      or public.contest_folder_mine(
           (storage.foldername(objects.name))[1],
           (storage.foldername(objects.name))[2])
    )
  );

/*
 * Into your own folder of a contest that is taking looks, by a verified
 * character. Admins anywhere in the bucket, which is where an admin tidying up
 * needs to be.
 */
drop policy if exists contest_files_add on storage.objects;
create policy contest_files_add on storage.objects
  for insert to authenticated with check (
    objects.bucket_id = 'contest'
    and (
      (select public.is_admin())
      or ((select public.verified_character())
          and public.contest_folder_open(
                (storage.foldername(objects.name))[1],
                (storage.foldername(objects.name))[2]))
    )
  );

-- Your own files once no look uses them, so a withdrawn look and a failed
-- upload can be tidied away. Anything to an admin. No update policy at all,
-- so a file here is never overwritten either.
drop policy if exists contest_files_drop on storage.objects;
create policy contest_files_drop on storage.objects
  for delete to authenticated using (
    objects.bucket_id = 'contest'
    and (
      (select public.is_admin())
      or (public.contest_folder_mine(
            (storage.foldername(objects.name))[1],
            (storage.foldername(objects.name))[2])
          and not public.contest_file_in_use(objects.name))
    )
  );

/* ── the v85 rule, on what members write to directly ─────────────────────── */

-- Entering and voting go through the functions above, which ask for a
-- verified character themselves. Editing a caption and withdrawing a look are
-- the two writes a member makes to a table, and they meet the same bar.
drop policy if exists contest_entries_named_edit on public.contest_entries;
create policy contest_entries_named_edit on public.contest_entries
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists contest_entries_named_drop on public.contest_entries;
create policy contest_entries_named_drop on public.contest_entries
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

/* ── the contest's own clock ─────────────────────────────────────────────── */

create or replace function public.contest_touch()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists contest_touch on public.contests;
create trigger contest_touch
  before update on public.contests
  for each row execute function public.contest_touch();

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select tablename, policyname, cmd, permissive from pg_policies
--    where tablename like 'contest%' order by tablename, policyname;
--
--   contest_awards    contest_awards_admin_add / _edit / _drop, contest_awards_read
--   contest_entries   contest_entries_edit, contest_entries_named_drop (RESTRICTIVE),
--                     contest_entries_named_edit (RESTRICTIVE), contest_entries_read,
--                     contest_entries_withdraw
--   contest_images    contest_images_admin_drop, contest_images_read
--   contest_votes     contest_votes_read
--   contests          contests_admin_add / _edit / _drop, contests_read
--   (contest_secret has none, on purpose)
--
--   select policyname from pg_policies
--    where tablename = 'objects' and policyname like 'contest\_%';
--
--   contest_files_add, contest_files_drop, contest_files_own
--
--   select id, public from storage.buckets where id = 'contest';   -- contest | true
--   select count(*) from public.contest_secret;                     -- 1
