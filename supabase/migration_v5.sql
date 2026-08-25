-- ─────────────────────────────────────────────────────────────────────────
-- migration_v5.sql — pictures on announcements and timeline posts
--
-- Run this once in the Supabase SQL editor, after migration_v4.sql.
--
-- An FC announcement is usually about something that happened in a screenshot —
-- a house move, a group photo, a clear. Text-only meant admins pasted a link to
-- an image hosted somewhere else, which rots the moment that host does.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.announcements
  add column if not exists image_url text;

alter table public.timeline_posts
  add column if not exists image_url text;

-- ─── Somewhere for the files to live ─────────────────────────────────────
-- Public bucket: these pictures sit on a page anybody can read, so putting them
-- behind signed URLs would be ceremony without a secret to protect.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Anyone may look; only admins may add or remove. Same rule the posts
-- themselves already follow, so a picture cannot outlive the post it belongs to
-- by being uploaded by somebody who could not have written one.
drop policy if exists "post images: public read" on storage.objects;
create policy "post images: public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post images: admin upload" on storage.objects;
create policy "post images: admin upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and public.is_admin());

drop policy if exists "post images: admin update" on storage.objects;
create policy "post images: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and public.is_admin());

drop policy if exists "post images: admin delete" on storage.objects;
create policy "post images: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and public.is_admin());
