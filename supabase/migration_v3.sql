-- ============================================================
-- Migration v3 — run after migration_v2.sql (once, in the SQL Editor)
-- Adds: nickname, real-world birthday (day + month only)
-- ============================================================

-- ─── Nickname shown on the member's own page ─────────────────────────────
alter table public.profiles
  add column nickname text check (char_length(nickname) <= 24);

-- ─── Birthday, deliberately without a year ───────────────────────────────
-- Day and month are all the site ever needs: it only answers "is it someone's
-- birthday today?". Storing a year would collect the member's age for no feature,
-- so there is nowhere to put one.
alter table public.profiles
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_day   smallint check (birth_day   between 1 and 31);

grant update (nickname, birth_month, birth_day) on table public.profiles to authenticated;
