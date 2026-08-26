-- ─────────────────────────────────────────────────────────────────────────
-- migration_v15.sql — putting a tag on the spot where the person is
--
-- Run this once in the Supabase SQL editor, after migration_v14.sql.
--
-- A tag stops being a list of names and becomes a point on the picture: the
-- poster clicks a face, picks the member, and anybody hovering that spot sees
-- who it is. The confirmation rule from v14 is untouched — a pin nobody has
-- agreed to is visible only to the people already involved, and the picture
-- still does not reach the tagged member's page until they say yes.
--
-- Coordinates are stored as fractions of the picture rather than pixels, so the
-- same tag lands on the same face on a phone, on a laptop, and in the lightbox.
-- Storing pixels would have meant a tag that drifts off somebody's head the
-- moment the picture is displayed at any size but the one it was tagged at.
--
-- The point is optional. A tag with no coordinates is still a tag — the plain
-- "who is in this" list from v14 keeps working, and a member who is in the shot
-- but hard to point at does not need a pin to belong to the picture.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.gallery_tags
  add column if not exists image_id bigint
    references public.gallery_images (id) on delete cascade,
  add column if not exists x real,
  add column if not exists y real;

-- Either a point or no point, and a point has to be inside the picture. Half a
-- pin is the state that would draw a marker in the corner and look like a bug.
alter table public.gallery_tags drop constraint if exists gallery_tags_point;
alter table public.gallery_tags add constraint gallery_tags_point check (
  (x is null and y is null)
  or (x >= 0 and x <= 1 and y >= 0 and y <= 1)
);

-- ─── Any number of people, and the same person in more than one picture ──
--
-- The old key was (post_id, character_id): one tag per person per post, which
-- was right when a tag was only a name. A post can hold several pictures, and
-- somebody who appears in three of them needs three pins, so the row gets an id
-- of its own and uniqueness moves to the picture.
--
-- NULLS NOT DISTINCT so the pinless variant still cannot be added twice —
-- without it, the default treatment of null would let the same name be listed
-- on the same post over and over.
alter table public.gallery_tags drop constraint if exists gallery_tags_pkey;
alter table public.gallery_tags
  add column if not exists id bigint generated always as identity;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gallery_tags_pkey') then
    alter table public.gallery_tags add primary key (id);
  end if;
end
$$;

drop index if exists public.gallery_tags_unique;
create unique index gallery_tags_unique
  on public.gallery_tags (post_id, character_id, image_id) nulls not distinct;

-- ─── A pin nobody has agreed to is not everybody's business ──────────────
--
-- v14 let anybody read a pending tag, which was harmless while a tag was a row
-- in a list. A pin draws a name across somebody's face, so an unconfirmed one is
-- shown only to the people already in the conversation: whoever wrote it, an
-- admin, and the person it names.
drop policy if exists "gallery tags: read" on public.gallery_tags;
create policy "gallery tags: read" on public.gallery_tags for select
  using (
    exists (select 1 from public.gallery_posts p where p.id = post_id)
    and (
      confirmed_at is not null
      or public.is_admin()
      or exists (select 1 from public.gallery_posts p
                 where p.id = post_id and p.author_id = auth.uid())
      or exists (select 1 from public.profiles pr
                 where pr.id = auth.uid()
                   and pr.character_id = gallery_tags.character_id
                   and pr.character_verified_at is not null)
    )
  );

-- ─── Placing a pin, and answering one, are two different permissions ─────
--
-- Whoever may edit the post decides where the pin sits; the person named decides
-- whether it counts. Both need to be able to update the row, so the update
-- policy lets either in and the trigger below keeps each to their own column.
drop policy if exists "gallery tags: confirm your own" on public.gallery_tags;
create policy "gallery tags: confirm or move" on public.gallery_tags for update
  using (
    public.is_admin()
    or exists (select 1 from public.gallery_posts p
               where p.id = post_id and p.author_id = auth.uid())
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.gallery_posts p
               where p.id = post_id and p.author_id = auth.uid())
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );

create or replace function public.gallery_tag_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  admin     boolean := public.is_admin();
  is_target boolean;
  is_owner  boolean;
begin
  -- Who the tag is about never changes. Moving a name onto a different person
  -- would carry their confirmation across with it.
  new.post_id      := old.post_id;
  new.character_id := old.character_id;
  new.name         := old.name;
  new.created_at   := old.created_at;

  select exists (select 1 from public.profiles pr
                 where pr.id = auth.uid()
                   and pr.character_id = old.character_id
                   and pr.character_verified_at is not null)
    into is_target;
  select exists (select 1 from public.gallery_posts p
                 where p.id = old.post_id and p.author_id = auth.uid())
    into is_owner;

  -- The answer belongs to the person named, and to an admin acting for one who
  -- never signs in. Never to whoever wrote the name.
  if new.confirmed_at is distinct from old.confirmed_at
     and not (is_target or admin) then
    new.confirmed_at := old.confirmed_at;
  end if;

  -- Where the pin sits belongs to whoever may edit the picture.
  if (new.image_id, new.x, new.y) is distinct from (old.image_id, old.x, old.y)
     and not (is_owner or admin) then
    new.image_id := old.image_id;
    new.x        := old.x;
    new.y        := old.y;
  end if;

  return new;
end
$fn$;

-- ─── A pin has to be on a picture this post actually holds ───────────────
create or replace function public.gallery_tag_autoconfirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.image_id is not null and not exists (
    select 1 from public.gallery_images gi
    where gi.id = new.image_id and gi.post_id = new.post_id
  ) then
    raise exception 'that picture is not part of this post';
  end if;

  -- Tagging yourself is its own consent, so it takes effect at once rather than
  -- sitting in your own pending list waiting for you to agree with yourself.
  if new.confirmed_at is null and exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.character_id = new.character_id
      and pr.character_verified_at is not null
  ) then
    new.confirmed_at := now();
  end if;
  return new;
end
$fn$;
