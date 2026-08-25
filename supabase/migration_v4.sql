-- ─────────────────────────────────────────────────────────────────────────
-- migration_v4.sql — verified character claims, and guests
--
-- Run this once in the Supabase SQL editor, after migration_v3.sql.
--
-- Two problems this closes.
--
-- 1. Claiming a character was unverified. Any signed-in account could write any
--    Lodestone id into its own row and the board would show ✦ "Verified" beside
--    that member's name. Nothing proved the claimer owned the character; the
--    unique constraint only meant first come, first served.
--
-- 2. There was no way to be anyone but an FC member. People who join events
--    without being in the FC — friends from other Free Companies, alt characters
--    — had nowhere to exist.
--
-- The model is deliberately two independent facts rather than one status column:
--
--     character_verified_at   did this person prove they own the character?
--     (not stored)            is that character in the FC roster right now?
--
-- The second is read from data/members.json, which the pipeline rebuilds from the
-- Lodestone roster every four hours, so nothing here can drift out of date. A
-- member who leaves the FC becomes a verified guest and keeps their history; a
-- guest who joins becomes a member on the next run, with nobody approving
-- anything.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  -- Set only by the server after checking a one-time code on The Lodestone.
  -- Never writable by the account itself — see the grants below.
  add column if not exists character_verified_at timestamptz,
  -- What to call a guest who has no character linked. Members are named by their
  -- character, so this stays null for them.
  add column if not exists display_name text;

-- ─── Who may write what ──────────────────────────────────────────────────
-- character_id and character_name leave the writable set entirely: the verify
-- route owns them now, using the service role, and only after the Lodestone check
-- passes. This is the same reasoning that keeps is_admin out of the list.
revoke update (character_id, character_name) on table public.profiles
  from anon, authenticated;

grant update (display_name, bio, favorite_job, accent_color,
              discord_username, discord_avatar, updated_at)
  on table public.profiles to authenticated;

-- ─── First login, whichever provider it came from ────────────────────────
-- The old version read Discord's metadata shape only, so a Google or email
-- account arrived with no name and no avatar at all. Each provider spells these
-- differently; take whichever key is present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar, display_name)
  values (
    new.id,
    -- Kept under its original name so nothing downstream has to change, but it
    -- now holds whatever the provider calls the account.
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             new.raw_user_meta_data ->> 'user_name',
             new.raw_user_meta_data ->> 'preferred_username'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url',
             new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             new.raw_user_meta_data ->> 'user_name',
             -- Email accounts carry no name at all; the local part is a better
             -- placeholder than a blank row, and the member can change it.
             split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── Existing claims ─────────────────────────────────────────────────────
-- Everything claimed before this migration was claimed under the old, unverified
-- rules, so none of it is proof of anything. Leaving character_verified_at null
-- keeps the claims working — the profile still owns the character — while the ✦
-- mark waits until somebody actually verifies.
--
-- To trust the current claims instead and start verification from today, run:
--
--   update public.profiles
--      set character_verified_at = now()
--    where character_id is not null;
--
-- Recommended only if you know who every claimant is. With 502 members and a
-- handful of claims, asking those few to verify is the safer path.
