-- ─────────────────────────────────────────────────────────────────────────
-- migration_v8.sql — availability at one-hour resolution
--
-- Run this once in the Supabase SQL editor, after migration_v7.sql. Safe to run
-- even if nobody has filled in an availability yet.
--
-- v7 stored four fixed blocks a day, which could not express "20:00 to
-- midnight" — only "evening, roughly". The string is now 168 characters, one
-- per hour of the week, Monday first.
--
-- The old 28-character form stays valid on purpose: rows written under v7 are
-- still readable, and the app expands each block back into the hours it covered
-- (see lib/availability.ts). They convert to the new form the next time their
-- owner saves.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  drop constraint if exists profiles_availability_check;

alter table public.profiles
  add constraint profiles_availability_check
    check (availability is null or availability ~ '^([01]{28}|[01]{168})$');
