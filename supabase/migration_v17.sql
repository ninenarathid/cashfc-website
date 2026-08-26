-- ─────────────────────────────────────────────────────────────────────────
-- migration_v17.sql — a picture cut for the shape the share card actually is
--
-- Run this once in the Supabase SQL editor, after migration_v16.sql.
--
-- The cover is a wide, short banner: 1600 by 500, cropped by the member to sit
-- behind their name at the top of their page. The card Discord draws is 1200 by
-- 630, which is nowhere near the same shape. Using the cover for both meant the
-- card kept about three fifths of the width and threw the rest away, so a group
-- shot the member had framed carefully lost whoever was standing at the edges.
--
-- So the card gets its own crop, of its own picture, at its own shape. It is
-- optional and falls back to the cover: most people will never set it, and the
-- ones who do are the ones who noticed the edges going missing.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  -- 1200x630, the shape every link unfurler in the world settled on.
  add column if not exists share_url text;

grant update (share_url) on table public.profiles to authenticated;
