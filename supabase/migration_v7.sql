-- ─────────────────────────────────────────────────────────────────────────
-- migration_v7.sql — when each member is around to play
--
-- Run this once in the Supabase SQL editor, after migration_v6.sql.
--
-- "Who can raid on Saturday evening" is the question this FC actually asks, and
-- until now the answer lived in Discord scrollback.
--
-- Stored as 28 characters of '0' and '1' — seven days of four blocks, Monday
-- first, read left to right. A plain string rather than a bitmask or an array
-- because it is legible in the table viewer, survives being read by anything,
-- and there are only 28 bits to hold. See lib/availability.ts for the blocks.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists availability text
    check (availability is null or availability ~ '^[01]{28}$');

grant update (availability) on table public.profiles to authenticated;
