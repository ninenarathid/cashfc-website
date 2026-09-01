-- ─────────────────────────────────────────────────────────────────────────
-- v21 — remember which account somebody signed in with
--
-- The admin panel lists claimed characters so that "who is this person" has an
-- answer. It could not answer the first half of it: sign-in has been open to
-- Discord and Google for a while, and the profile keeps only what the provider
-- called the account. Two people called the same thing on the two services are
-- indistinguishable, and an admin looking at a name with no service beside it
-- cannot tell which door somebody came through.
--
-- Supabase does know — it is on auth.users — but no client can read that for
-- anybody but themselves, which is right and is also why the answer has to be
-- copied somewhere readable.
--
-- Not the address. This table is world-readable by design (the board renders
-- from it), so an email column here would publish five hundred email addresses
-- to anybody with the anon key. Which service, not which account: that is the
-- part an admin needs and the part that is safe to say out loud.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists auth_provider text;

comment on column public.profiles.auth_provider is
  'discord | google | email — which service this account signed in with. '
  'Copied from auth.users.raw_app_meta_data, which no client can read.';

-- ─── Everybody already here ──────────────────────────────────────────────
update public.profiles p
   set auth_provider = u.raw_app_meta_data ->> 'provider'
  from auth.users u
 where u.id = p.id
   and p.auth_provider is distinct from (u.raw_app_meta_data ->> 'provider');

-- ─── And everybody who arrives from now on ───────────────────────────────
-- Same as v4 with the provider added. Each service spells the name and the
-- picture differently, so whichever key is present wins.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar, display_name,
                               auth_provider)
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
             split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Derived from the sign-in, so nobody edits it. The table-wide revoke in
-- schema.sql already covers this — the column is simply left out of the grant
-- list, the same way is_admin and character_id are.
--
-- Anyone signed in before this migration keeps the value the backfill gave
-- them; the trigger only fires for new accounts.
