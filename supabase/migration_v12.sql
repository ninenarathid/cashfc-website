-- ─────────────────────────────────────────────────────────────────────────
-- migration_v12.sql — several pictures in one post
--
-- Run this once in the Supabase SQL editor, after migration_v11.sql.
--
-- A post held exactly one picture, so a GPose session came out as eight
-- separate posts competing with each other in the feed. Pictures move to their
-- own table and a post becomes what it should have been all along: a caption
-- with a set of images under it.
--
-- The post keeps image_url, width and height as a cover, filled by a trigger
-- from whichever image sits first. That is deliberate duplication: the grid,
-- the feed function and the Discord embed all want one picture per post and
-- none of them should have to join to get it.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.gallery_images (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.gallery_posts (id) on delete cascade,
  url        text not null,
  width      int,
  height     int,
  -- Where it sits in the post. Gaps are fine; only the order matters.
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gallery_images_post
  on public.gallery_images (post_id, position, id);

alter table public.gallery_images enable row level security;

-- Readable exactly as far as its post is: the join keeps a hidden post's
-- pictures hidden without repeating the rule.
drop policy if exists "gallery images: read" on public.gallery_images;
create policy "gallery images: read" on public.gallery_images for select
  using (exists (select 1 from public.gallery_posts p where p.id = post_id));

drop policy if exists "gallery images: add to own post" on public.gallery_images;
create policy "gallery images: add to own post" on public.gallery_images for insert
  with check (exists (select 1 from public.gallery_posts p
                      where p.id = post_id
                        and (p.author_id = auth.uid() or public.is_admin())));

drop policy if exists "gallery images: remove from own post" on public.gallery_images;
create policy "gallery images: remove from own post" on public.gallery_images for delete
  using (exists (select 1 from public.gallery_posts p
                 where p.id = post_id
                   and (p.author_id = auth.uid() or public.is_admin())));

-- ─── Everything that already exists becomes a one-picture post ───────────
insert into public.gallery_images (post_id, url, width, height, position)
select p.id, p.image_url, p.width, p.height, 0
from public.gallery_posts p
where p.image_url is not null
  and not exists (select 1 from public.gallery_images i where i.post_id = p.id);

-- ─── Keep the cover pointing at the first picture ────────────────────────
-- security definer because the columns are not writable by a member directly,
-- and this is the only thing that should be moving them.
create or replace function public.gallery_sync_cover()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
  cover  public.gallery_images%rowtype;
begin
  select * into cover from public.gallery_images
   where post_id = target order by position, id limit 1;

  if cover.id is null then
    -- The last picture is gone, so there is no post left to look at. Removing
    -- the row is kinder than leaving an empty frame with a caption under it.
    delete from public.gallery_posts where id = target;
  else
    update public.gallery_posts
       set image_url = cover.url, width = cover.width, height = cover.height
     where id = target;
  end if;
  return null;
end;
$$;

drop trigger if exists gallery_images_cover on public.gallery_images;
create trigger gallery_images_cover
  after insert or delete or update on public.gallery_images
  for each row execute function public.gallery_sync_cover();

-- How many pictures a post holds, so the grid can badge the ones with more than
-- one without asking for them.
alter table public.gallery_posts
  add column if not exists image_count int not null default 1;

create or replace function public.gallery_sync_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
begin
  update public.gallery_posts
     set image_count = (select count(*) from public.gallery_images
                         where post_id = target)
   where id = target;
  return null;
end;
$$;

drop trigger if exists gallery_images_count on public.gallery_images;
create trigger gallery_images_count
  after insert or delete on public.gallery_images
  for each row execute function public.gallery_sync_count();

update public.gallery_posts p
   set image_count = (select count(*) from public.gallery_images i where i.post_id = p.id);
