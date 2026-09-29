-- v97 — the ballot is set
--
-- Run this once in the Supabase SQL editor. It needs v94.
--
-- The first domain round let members put up to three names each on the ballot
-- and take one back until somebody else voted for it. The second is a run-off
-- between three names set when it opened, with no prices, and the page no
-- longer has a form to suggest one. This takes the same right away from the
-- API, so a name cannot be added from the browser console either.
--
-- Voting is untouched: one row each, changeable while the round is open.
-- The names are put on by scripts/domain-poll.mjs with the service key, which
-- no policy stops; an admin signed in to the site can still add or remove one.

drop policy if exists domain_choices_add on public.domain_choices;
drop policy if exists domain_choices_take_back on public.domain_choices;

drop policy if exists domain_choices_admin_add on public.domain_choices;
create policy domain_choices_admin_add on public.domain_choices
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists domain_choices_admin_drop on public.domain_choices;
create policy domain_choices_admin_drop on public.domain_choices
  for delete to authenticated
  using ((select public.is_admin()));

-- Only the two policies above used these.
drop function if exists public.domain_choices_mine(bigint);
drop function if exists public.domain_choice_backed(bigint);

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select policyname, cmd, permissive from pg_policies
--    where tablename = 'domain_choices' order by policyname;
--
--   domain_choices_admin_add   INSERT  PERMISSIVE
--   domain_choices_admin_drop  DELETE  PERMISSIVE
--   domain_choices_named_drop  DELETE  RESTRICTIVE
--   domain_choices_named_write INSERT  RESTRICTIVE
--   domain_choices_read        SELECT  PERMISSIVE
