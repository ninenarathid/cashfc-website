-- ─────────────────────────────────────────────────────────────────────────
-- migration_v9.sql — the gallery
--
-- Run this once in the Supabase SQL editor, after migration_v8.sql.
--
-- Anybody signed in can post a screenshot; the pictures show on the poster's own
-- member page and in one shared gallery. Liking reuses the FC's own currency —
-- a popoto — but per picture rather than per person per day, so it needs its own
-- table rather than a second meaning bolted onto kudos.
--
-- Visibility is a switch rather than a hard-coded rule: gallery_public in
-- site_settings starts unset, which means admins only, and an admin opens it to
-- everyone from /admin when the FC is ready. The rows below are readable either
-- way — hiding a page is a product decision, and putting it in RLS would have
-- meant a migration to undo it.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.gallery_posts (
  id           bigint generated always as identity primary key,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  -- Denormalised so a member page can find its pictures without a join through
  -- profiles, and so a picture survives its author unlinking the character.
  character_id bigint,
  image_url    text not null,
  -- Kept so the grid can reserve the right space before the picture loads. A
  -- masonry layout that resizes as images arrive is the thing people notice.
  width        int,
  height       int,
  caption      text check (caption is null or char_length(caption) <= 300),
  created_at   timestamptz not null default now()
);
create index if not exists gallery_posts_author on public.gallery_posts (author_id);
create index if not exists gallery_posts_character on public.gallery_posts (character_id);
create index if not exists gallery_posts_new on public.gallery_posts (created_at desc);

create table if not exists public.gallery_likes (
  post_id    bigint not null references public.gallery_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One popoto per person per picture, enforced by the database rather than by
  -- the button being disabled.
  primary key (post_id, profile_id)
);

create table if not exists public.gallery_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.gallery_posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists gallery_comments_post on public.gallery_comments (post_id, created_at);

alter table public.gallery_posts enable row level security;
alter table public.gallery_likes enable row level security;
alter table public.gallery_comments enable row level security;

-- ─── Who may do what ─────────────────────────────────────────────────────
create policy "gallery: read posts" on public.gallery_posts for select using (true);
create policy "gallery: post as yourself" on public.gallery_posts for insert
  with check (auth.uid() = author_id);
create policy "gallery: edit own" on public.gallery_posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
-- An admin can remove anything: a gallery needs somebody able to take a picture
-- down without asking the person who posted it.
create policy "gallery: delete own or admin" on public.gallery_posts for delete
  using (auth.uid() = author_id or public.is_admin());

create policy "gallery: read likes" on public.gallery_likes for select using (true);
create policy "gallery: like as yourself" on public.gallery_likes for insert
  with check (auth.uid() = profile_id);
create policy "gallery: unlike your own" on public.gallery_likes for delete
  using (auth.uid() = profile_id);

create policy "gallery: read comments" on public.gallery_comments for select using (true);
create policy "gallery: comment as yourself" on public.gallery_comments for insert
  with check (auth.uid() = author_id);
create policy "gallery: delete comment own or admin" on public.gallery_comments for delete
  using (auth.uid() = author_id or public.is_admin());

-- Only these columns, so nothing else on a row can be rewritten after the fact.
revoke update on table public.gallery_posts from anon, authenticated;
grant update (caption) on table public.gallery_posts to authenticated;

-- ─── Somewhere for the pictures ──────────────────────────────────────────
-- Public to read, because they sit on a page anybody with the link can open.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery images: public read" on storage.objects;
create policy "gallery images: public read"
  on storage.objects for select using (bucket_id = 'gallery');

-- Any signed-in member, not just admins — this is the one bucket the FC fills
-- itself. Uploads are filed under the uploader's own id so a stray file can
-- always be traced back, and so one member cannot overwrite another's picture.
drop policy if exists "gallery images: member upload" on storage.objects;
create policy "gallery images: member upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gallery images: delete own or admin" on storage.objects;
create policy "gallery images: delete own or admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'gallery'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.is_admin()));
