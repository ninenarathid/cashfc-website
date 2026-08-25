-- ─────────────────────────────────────────────────────────────────────────
-- migration_v6.sql — a language preference per member
--
-- Run this once in the Supabase SQL editor, after migration_v5.sql.
--
-- The site opens in whatever a member picked, on whichever device they sign in
-- from. Without this the choice lives only in localStorage, which means it is
-- forgotten on a new browser and never shared between a phone and a desktop.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists language text
    check (language is null or language in ('th', 'en'));

-- A member sets their own, like every other cosmetic column.
grant update (language) on table public.profiles to authenticated;
