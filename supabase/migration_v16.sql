-- ─────────────────────────────────────────────────────────────────────────
-- migration_v16.sql — a face and a backdrop of your own
--
-- Run this once in the Supabase SQL editor, after migration_v15.sql.
--
-- The portrait on every member is whatever the Lodestone happens to hold: a
-- character standing to attention in whatever they were wearing the day the
-- crawler last looked. It is a reasonable default and a poor photograph. A
-- member can now put up a picture they actually like — cropped out of their own
-- GPose work, or uploaded — and take it down again to fall back to the
-- Lodestone, which stays the source of truth for anybody who never chooses.
--
-- Both are plain URLs into the gallery bucket rather than a new bucket of their
-- own. The bucket is already public, already files uploads under the uploader's
-- id, and already lets a member delete their own — a second bucket would have
-- been the same three policies written again under a different name.
--
-- Nothing here points at gallery_posts. A profile picture cropped out of a
-- screenshot is a copy, so deleting the post it came from leaves the face alone,
-- which is the behaviour anybody would expect and the one a foreign key would
-- have taken away.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  -- Square, and cropped by the member to the size the site uses everywhere.
  add column if not exists avatar_url text,
  -- Wide, and only ever seen at the top of their own member page.
  add column if not exists cover_url text;

-- Both are the member's to set and to clear. They join the same column-level
-- grant the rest of the editable profile lives under, which is what keeps
-- is_admin and character_id out of reach of the account they belong to.
grant update (avatar_url, cover_url) on table public.profiles to authenticated;
