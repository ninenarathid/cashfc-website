-- v39 — the party finder
--
-- Everything the board has been drawing from a sample file, given somewhere to
-- live. Three tables and a bucket.
--
-- Why the shape is what it is:
--
--   A party's small structured facts — where it is in the fight, the loot rule,
--   the place on the map, the seat rules, the write-up — are jsonb. They are
--   read and written whole, never queried by their innards, and each is a
--   handful of fields that will change again before this is finished. Six more
--   columns and a migration every time the FC changes its mind is the wrong
--   trade for data nothing filters on in SQL.
--
--   The people are rows, because they are asked about individually: somebody
--   confirms their own seat, somebody is taken out of one, and "am I in this"
--   is a query. A jsonb array would make every one of those a read-modify-write
--   of the whole party, which is how two people accepting at once lose one of
--   the acceptances.
--
--   Names and faces are copied onto the member row rather than joined from
--   profiles. Half the point of the feature is that a party can contain
--   somebody who is not on this site at all — a friend from another FC, a
--   static partner on Light — and a foreign key cannot hold them. The same
--   reason notifications.actor_name exists.
--
-- Nothing is ever really deleted; deleted_at hides a row and the row stays, as
-- everywhere else on this site.

-- ── the listing ─────────────────────────────────────────────────────────────
create table if not exists public.party_posts (
  id                 bigint generated always as identity primary key,
  owner              uuid not null references public.profiles(id) on delete cascade,
  -- Copied at creation: the owner's face is drawn on the row, and looking it up
  -- through profiles on every render is a join for a picture.
  owner_character_id bigint,

  -- "sav:M11S", "ex:Doomtrain", "comm:gpose" — the catalogue key. Text rather
  -- than a foreign key because the catalogue is built in the front end from the
  -- board and the duty tables, and has no rows here to point at.
  content_key        text not null,
  note               text,
  -- light | full | alliance | open
  shape              text not null,

  starts_at          timestamptz not null,
  length_minutes     integer not null check (length_minutes between 15 and 1440),
  -- 'food' or 'hours': how it was typed in, so it can be shown back that way.
  length_unit        text not null default 'food',

  one_of_each_job    boolean not null default false,
  -- Seat ids the party is not looking to fill.
  closed             text[] not null default '{}',
  -- seat id -> { jobs: [...] }
  rules              jsonb not null default '{}'::jsonb,

  -- { at, phase?, phases?, mech? } — fights only, null everywhere else.
  progress           jsonb,
  -- { rule, pay? } — savage and extreme only.
  loot               jsonb,
  -- { map, region?, x?, y? } — the things that happen somewhere.
  spot               jsonb,
  -- [{ id, kind, text?, url?, caption? }] — paragraphs and pictures.
  body               jsonb not null default '[]'::jsonb,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- The board asks for "not deleted, not finished, soonest first" on every load,
-- which is the one query this table serves often enough to index. Partial, so
-- the index carries only the rows anybody looks at.
create index if not exists party_posts_upcoming
  on public.party_posts (starts_at)
  where deleted_at is null;

create index if not exists party_posts_owner
  on public.party_posts (owner) where deleted_at is null;

-- ── who is in it ────────────────────────────────────────────────────────────
create table if not exists public.party_members (
  id            bigint generated always as identity primary key,
  party_id      bigint not null references public.party_posts(id) on delete cascade,

  -- Null means floating: they have said what they can play and have not been
  -- pinned to a seat. Which seat they end up in is worked out when the party is
  -- drawn, from the seats free at that moment, so it is deliberately not stored.
  seat          text,

  -- Null for somebody who is not on this site.
  character_id  bigint,
  name          text not null,
  avatar        text,
  job           text,
  -- { all?, roles?, seats? } — what else they can play.
  flex          jsonb,

  -- Null until they say yes. An unanswered invitation is not a filled seat,
  -- the same rule a photograph tag follows.
  confirmed_at  timestamptz,
  -- Who put them here, so an invitation can say who sent it.
  invited_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists party_members_party
  on public.party_members (party_id);
create index if not exists party_members_character
  on public.party_members (character_id) where character_id is not null;

-- One seat holds one person, and nobody joins the same party twice. Both are
-- partial: several people can float at once (seat is null), and several
-- outsiders can be in one party (character_id is null).
create unique index if not exists party_members_one_per_seat
  on public.party_members (party_id, seat) where seat is not null;
create unique index if not exists party_members_once
  on public.party_members (party_id, character_id) where character_id is not null;

-- ── the conversation ────────────────────────────────────────────────────────
create table if not exists public.party_comments (
  id            bigint generated always as identity primary key,
  party_id      bigint not null references public.party_posts(id) on delete cascade,
  author        uuid references public.profiles(id) on delete set null,
  author_character_id bigint,
  author_name   text not null,
  author_avatar text,
  body          text not null default '',
  images        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists party_comments_party
  on public.party_comments (party_id, created_at)
  where deleted_at is null;

-- ── who may do what ─────────────────────────────────────────────────────────
alter table public.party_posts    enable row level security;
alter table public.party_members  enable row level security;
alter table public.party_comments enable row level security;

-- Reading is open to anybody signed in. A party is an invitation; keeping it
-- from members would be keeping it from the people it is for.
drop policy if exists party_posts_read on public.party_posts;
create policy party_posts_read on public.party_posts
  for select to authenticated using (deleted_at is null);

-- Putting one up needs a verified character. An unverified claim to a name is
-- somebody's typing, and a raid night arranged under one wastes an evening.
drop policy if exists party_posts_write on public.party_posts;
create policy party_posts_write on public.party_posts
  for insert to authenticated with check (
    owner = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.character_verified_at is not null
    )
  );

-- The owner edits and retires their own. Admins can too, because somebody has
-- to be able to take down a listing whose author has gone quiet.
drop policy if exists party_posts_edit on public.party_posts;
create policy party_posts_edit on public.party_posts
  for update to authenticated using (
    owner = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists party_members_read on public.party_members;
create policy party_members_read on public.party_members
  for select to authenticated using (true);

-- The party's owner puts people in it. Anybody verified may also put
-- themselves in — that is joining, and it is the point.
drop policy if exists party_members_write on public.party_members;
create policy party_members_write on public.party_members
  for insert to authenticated with check (
    exists (select 1 from public.party_posts x
            where x.id = party_id and x.owner = auth.uid())
    or character_id = (select p.character_id from public.profiles p
                       where p.id = auth.uid() and p.character_verified_at is not null)
  );

-- Accepting an invitation is an update to your own row; the owner may also
-- change a row, which is how somebody is moved or their job is set.
drop policy if exists party_members_edit on public.party_members;
create policy party_members_edit on public.party_members
  for update to authenticated using (
    exists (select 1 from public.party_posts x
            where x.id = party_id and x.owner = auth.uid())
    or character_id = (select p.character_id from public.profiles p
                       where p.id = auth.uid())
  );

-- Leaving, or being taken out by whoever put the party up. This one really
-- deletes: a seat is not a record of anything once somebody has left it, and a
-- tombstone row would have to be filtered out of every seat count on the board.
drop policy if exists party_members_leave on public.party_members;
create policy party_members_leave on public.party_members
  for delete to authenticated using (
    exists (select 1 from public.party_posts x
            where x.id = party_id and x.owner = auth.uid())
    or character_id = (select p.character_id from public.profiles p
                       where p.id = auth.uid())
  );

drop policy if exists party_comments_read on public.party_comments;
create policy party_comments_read on public.party_comments
  for select to authenticated using (deleted_at is null);

drop policy if exists party_comments_write on public.party_comments;
create policy party_comments_write on public.party_comments
  for insert to authenticated with check (author = auth.uid());

drop policy if exists party_comments_edit on public.party_comments;
create policy party_comments_edit on public.party_comments
  for update to authenticated using (
    author = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin)
  );

-- ── the pictures ────────────────────────────────────────────────────────────
-- A write-up has screenshots in it and so do the replies. Same arrangement as
-- the feedback bucket: public to read, and a member may only write inside a
-- folder named after their own id.
insert into storage.buckets (id, name, public)
values ('party', 'party', true)
on conflict (id) do nothing;

drop policy if exists party_images_read on storage.objects;
create policy party_images_read on storage.objects
  for select to public using (bucket_id = 'party');

drop policy if exists party_images_write on storage.objects;
create policy party_images_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'party'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists party_images_own on storage.objects;
create policy party_images_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'party'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── keep updated_at honest ──────────────────────────────────────────────────
create or replace function public.party_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists party_posts_touch on public.party_posts;
create trigger party_posts_touch before update on public.party_posts
  for each row execute function public.party_touch();
