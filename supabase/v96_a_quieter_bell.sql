-- v96 — a quieter bell, by each member's own choice
--
-- Run this once in the Supabase SQL editor, after v95.
--
-- Feedback #13: somebody wanted the names of the people who had sent them a
-- popoto and had to scroll past a column of "100 gil into your wallet" to find
-- them. Somebody else, sent forty popoto a day, would turn off the popoto and
-- keep the gil. There is no one bell that suits both, so each member says
-- which kinds of news they do not want counted.
--
-- A group turned off is taken out of the bell and out of the red number. It
-- still arrives in the corner of the screen while they are on the site, and
-- it is still in "all notifications". The kinds that ask for an answer — a
-- tag, a request to join, an invitation, a prize — are not in any group and
-- cannot be turned off (see QUIET_GROUPS in lib/notifications.ts).
--
-- Group names rather than notification kinds, so a new kind added to a group
-- later is covered for everybody who already turned that group off. No check
-- on the values: an unknown name is ignored by the page, and a list of allowed
-- names here would be a migration for every group added. Only a bound on the
-- length, so the column cannot be used to store anything else.
--
-- The notifications themselves are untouched. Nothing about what is sent
-- changes; only what the bell shows.

alter table public.profiles
  add column if not exists notif_quiet text[] not null default '{}'
    check (cardinality(notif_quiet) <= 16);

-- A member sets their own, like every other preference on the row.
grant update (notif_quiet) on table public.profiles to authenticated;

/* ── what it should say afterwards ───────────────────────────────────────
 *
 *   select column_name, data_type, column_default
 *     from information_schema.columns
 *    where table_schema = 'public' and table_name = 'profiles'
 *      and column_name = 'notif_quiet';
 *   -- one row: ARRAY, '{}'::text[]
 */
