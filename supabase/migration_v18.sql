-- ─────────────────────────────────────────────────────────────────────────
-- migration_v18.sql — taking a picture down without losing it
--
-- Run this once in the Supabase SQL editor, after migration_v17.sql.
--
-- Hiding was an admin's tool and worked on whole posts. Neither half was right.
-- Somebody who posts eight screenshots and dislikes the third has to delete the
-- whole post and put seven of them back; somebody who wants their own picture off
-- the wall for a week has to ask an admin, or delete it and lose the comments.
--
-- So hiding happens at both levels and belongs to the person who posted it.
--
-- The author's hide is a separate column from the admin's on purpose. One flag
-- shared between them would mean an author could restore whatever an admin had
-- just taken down, which makes hiding useless against the one person it is aimed
-- at. Two flags, and a picture is public only when neither is set.
--
-- Ownership widens at the same time. A picture an admin posted on somebody's
-- behalf was, until now, entirely out of that person's hands: they could not
-- hide it, delete it, fix its caption or correct the names on it. Whoever a post
-- is credited to owns it as much as the account that carried it here does.
--
-- An author can now see their own hidden posts, which they could not before —
-- necessary, since a picture nobody can see is a picture nobody can restore. It
-- is shown to them marked as hidden, so nobody is left wondering why their post
-- appears for them and for no one else.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Whose picture is it ─────────────────────────────────────────────────
--
-- The uploading account is not always the person the picture is of. An admin
-- posts for a member who never signs in, and until now that member could do
-- nothing at all with their own photograph — not hide it, not take it down, not
-- correct the names on it. Whoever the post is credited to is an owner of it,
-- and so is whoever uploaded it, and so is an admin.
--
-- Takes the two columns as arguments rather than the post id, so that a policy on
-- gallery_posts can call it without the call reading gallery_posts and setting
-- that policy off again. It reads profiles, which everybody may read, so it needs
-- no elevated rights of its own.
create or replace function public.gallery_owner(p_author uuid, p_character bigint)
returns boolean
language sql
stable
as $$
  select p_author = auth.uid()
      or public.is_admin()
      or exists (select 1 from public.profiles pr
                 where pr.id = auth.uid()
                   and pr.character_id = p_character
                   and pr.character_verified_at is not null);
$$;

grant execute on function public.gallery_owner(uuid, bigint) to anon, authenticated;

-- ─── The author's own hide, alongside the admin's ────────────────────────
alter table public.gallery_posts
  add column if not exists owner_hidden boolean not null default false;

grant update (owner_hidden) on table public.gallery_posts to authenticated;

drop policy if exists "gallery: read posts" on public.gallery_posts;
create policy "gallery: read posts" on public.gallery_posts for select
  using (
    (hidden = false and owner_hidden = false)
    -- Your own, whatever state it is in: the way back from hidden.
    or public.gallery_owner(author_id, character_id)
  );

-- Unchanged in what it forbids, restated because the column list grew: an author
-- may set owner_hidden freely and may not touch hidden at all.
create or replace function public.gallery_guard_hidden()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.hidden is distinct from old.hidden and not public.is_admin() then
    raise exception 'Only an admin may hide or restore a gallery picture';
  end if;
  return new;
end;
$$;

-- ─── One picture out of a set ────────────────────────────────────────────
alter table public.gallery_images
  add column if not exists hidden boolean not null default false;

grant update (hidden) on table public.gallery_images to authenticated;

drop policy if exists "gallery images: read" on public.gallery_images;
-- gallery_images.hidden spelled out in full: gallery_posts has a column of the
-- same name, and inside this subquery the unqualified one would resolve to the
-- post's — which would have shown every picture of a visible post, hidden or not.
create policy "gallery images: read" on public.gallery_images for select
  using (exists (select 1 from public.gallery_posts p
                 where p.id = post_id
                   and (gallery_images.hidden = false
                        or public.gallery_owner(p.author_id, p.character_id))));

drop policy if exists "gallery images: hide own" on public.gallery_images;
create policy "gallery images: hide own" on public.gallery_images for update
  using (exists (select 1 from public.gallery_posts p
                 where p.id = post_id
                   and public.gallery_owner(p.author_id, p.character_id)))
  with check (exists (select 1 from public.gallery_posts p
                      where p.id = post_id
                        and public.gallery_owner(p.author_id, p.character_id)));

-- Hiding is the only thing an update may do here. A row policy decides which
-- rows you may touch and never which parts of them, and without this the same
-- permission would let somebody point one of their pictures at another URL.
create or replace function public.gallery_image_guard()
returns trigger
language plpgsql
as $$
begin
  new.post_id    := old.post_id;
  new.url        := old.url;
  new.width      := old.width;
  new.height     := old.height;
  new.position   := old.position;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists gallery_images_guard on public.gallery_images;
create trigger gallery_images_guard
  before update on public.gallery_images
  for each row execute function public.gallery_image_guard();

-- ─── The cover skips what is hidden ──────────────────────────────────────
-- Hiding the first of eight pictures should move the cover to the second, not
-- leave the post fronted by the one picture its author took down. The fallback
-- to any picture at all matters: a post with everything hidden still needs a
-- cover to satisfy the not-null, and the read policy is what keeps it out of
-- sight rather than the absence of a URL.
create or replace function public.gallery_sync_cover()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
  cover  public.gallery_images%rowtype;
begin
  select * into cover from public.gallery_images
   where post_id = target and hidden = false order by position, id limit 1;

  if cover.id is null then
    select * into cover from public.gallery_images
     where post_id = target order by position, id limit 1;
  end if;

  if cover.id is null then
    -- The last picture is gone, so there is no post left to look at. Removing
    -- the row is kinder than leaving an empty frame with a caption under it.
    -- Only ever reached by deletion: hiding leaves the rows where they are.
    delete from public.gallery_posts where id = target;
  else
    update public.gallery_posts
       set image_url = cover.url, width = cover.width, height = cover.height
     where id = target;
  end if;
  return null;
end;
$$;

-- ─── And so does the count ───────────────────────────────────────────────
-- The badge says how many there are to look at, so a hidden one is not one of
-- them. The grid asks for the picture rows only when this is above one, which
-- means a post down to a single visible picture stops fetching the rest.
create or replace function public.gallery_sync_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
begin
  update public.gallery_posts
     set image_count = (select count(*) from public.gallery_images
                         where post_id = target and hidden = false)
   where id = target;
  return null;
end;
$$;

-- Both counts are wrong until something touches every post, so settle them now.
update public.gallery_posts p
   set image_count = (select count(*) from public.gallery_images i
                       where i.post_id = p.id and i.hidden = false);

-- ─── Editing, deleting and tagging follow the same definition ────────────
-- All of these used to say "the uploader, or an admin", which left the member a
-- picture is actually of with no say over it at all.
drop policy if exists "gallery: edit own" on public.gallery_posts;
create policy "gallery: edit own" on public.gallery_posts for update
  using (public.gallery_owner(author_id, character_id))
  with check (public.gallery_owner(author_id, character_id));

drop policy if exists "gallery: delete own or admin" on public.gallery_posts;
create policy "gallery: delete own or admin" on public.gallery_posts for delete
  using (public.gallery_owner(author_id, character_id));

drop policy if exists "gallery images: add to own post" on public.gallery_images;
create policy "gallery images: add to own post" on public.gallery_images for insert
  with check (exists (select 1 from public.gallery_posts p
                      where p.id = post_id
                        and public.gallery_owner(p.author_id, p.character_id)));

drop policy if exists "gallery images: remove from own post" on public.gallery_images;
create policy "gallery images: remove from own post" on public.gallery_images for delete
  using (exists (select 1 from public.gallery_posts p
                 where p.id = post_id
                   and public.gallery_owner(p.author_id, p.character_id)));

drop policy if exists "gallery tags: write on own post" on public.gallery_tags;
create policy "gallery tags: write on own post" on public.gallery_tags for insert
  with check (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and public.gallery_owner(p.author_id, p.character_id))
    -- A verified member may always add their own name to a picture they are in.
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );

drop policy if exists "gallery tags: remove" on public.gallery_tags;
create policy "gallery tags: remove" on public.gallery_tags for delete
  using (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and public.gallery_owner(p.author_id, p.character_id))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );

-- Placing a pin is the picture owner's; agreeing to one is the named member's.
-- Both still need to reach the row, and the trigger from v15 keeps each of them
-- to their own column.
drop policy if exists "gallery tags: confirm or move" on public.gallery_tags;
create policy "gallery tags: confirm or move" on public.gallery_tags for update
  using (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and public.gallery_owner(p.author_id, p.character_id))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  )
  with check (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and public.gallery_owner(p.author_id, p.character_id))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );
