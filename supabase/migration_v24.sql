-- ─────────────────────────────────────────────────────────────────────────
-- v24 — a popoto needs a character behind it
--
-- Anybody who could sign in could give one, which meant an account with no
-- character attached could hand out potatoes and appear in the rankings and the
-- reports as a name nobody recognises. That is not a hypothetical: twelve
-- accounts are in that state and two of them had been giving.
--
-- It also made the boards misreadable. A popoto is the FC saying something
-- about somebody, and "the FC" has to mean people the FC can identify — a
-- login with a free-text display name is not that, and one of them had set its
-- name to another member's character.
--
-- Claimed, not verified. Verifying a claim is the member's own errand and can
-- wait; picking which character you are is the part that makes a potato mean
-- something, and it takes one click.
--
-- Enforced here rather than by hiding the button. The button is hidden too, but
-- a rule that only exists in the page is a rule anybody with the anon key can
-- ignore — and that key is in the JavaScript this site ships.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Whoever is asking, do they hold a character? ────────────────────────
-- security definer so the check can read profiles regardless of whose row it
-- is; stable so the planner may call it once per statement.
create or replace function public.has_character()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and character_id is not null
  );
$$;

comment on function public.has_character() is
  'True when the signed-in account has claimed a character. The bar for giving '
  'a popoto: a potato from a name nobody can place says nothing.';

-- ─── On a profile ────────────────────────────────────────────────────────
drop policy if exists "kudos: send as yourself" on public.kudos;
create policy "kudos: send as yourself"
  on public.kudos for insert
  with check (auth.uid() = sender_id and public.has_character());

-- ─── On a picture ────────────────────────────────────────────────────────
drop policy if exists "gallery: like as yourself" on public.gallery_likes;
create policy "gallery: like as yourself"
  on public.gallery_likes for insert
  with check (auth.uid() = profile_id and public.has_character());

-- Nothing already given is taken away. What is on the boards was given under
-- the old rule and counting it now is the honest thing; this only decides who
-- may give the next one.
