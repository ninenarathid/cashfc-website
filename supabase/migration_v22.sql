-- ─────────────────────────────────────────────────────────────────────────
-- v22 — somewhere to keep a thumbnail
--
-- The gallery grid shows a picture in a box about 325 pixels across and has
-- been serving the original to fill it — up to eight megabytes of it. The extra
-- resolution is thrown away by the browser before anybody sees it, and Supabase
-- bills for every byte of it: 49 MB of stored files went out as 10 GB of cached
-- egress in a month, each file sent about two hundred times over.
--
-- So a second, small copy is kept beside each picture and used in the places
-- that show many at once. The original is never touched — not resized, not
-- re-encoded — and is still what loads when somebody actually opens a picture,
-- so nothing anybody looks at closely changes at all.
--
-- Null means "no thumbnail yet", which every existing row is until the backfill
-- has run, and which the site reads as "use the original". That is the same
-- thing it does today, so nothing breaks in the meantime.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.gallery_posts
  add column if not exists thumb_url text;

alter table public.gallery_images
  add column if not exists thumb_url text;

comment on column public.gallery_posts.thumb_url is
  'Small copy for grids. Null means none yet — fall back to image_url.';
comment on column public.gallery_images.thumb_url is
  'Small copy for grids. Null means none yet — fall back to url.';

-- Written by whoever may write the picture it belongs to, which the existing
-- row policies already decide. These are two more columns on rows people
-- already insert and update, so they join the grant list beside them rather
-- than getting a policy of their own.
grant update (thumb_url) on table public.gallery_posts to authenticated;
grant update (thumb_url) on table public.gallery_images to authenticated;
