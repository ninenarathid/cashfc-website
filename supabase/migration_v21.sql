-- ─────────────────────────────────────────────────────────────────────────
-- v21 — remember which services somebody signed in with
--
-- The admin panel lists claimed characters so that "who is this person" has an
-- answer. It could not answer the first half of it: sign-in has been open to
-- Discord and Google for a while, and the profile keeps only what the provider
-- called the account. Two people called the same thing on the two services are
-- indistinguishable, and an admin looking at a name with no service beside it
-- cannot tell which door somebody came through.
--
-- Services, plural. One account can have several identities linked to it, and
-- somebody who has linked both Discord and Google has genuinely done both —
-- `raw_app_meta_data ->> 'provider'` names only whichever came first, so a
-- single-valued column would have quietly hidden half the answer.
--
-- Supabase does know — it is on auth.identities — but no client can read that
-- for anybody but themselves, which is right and is also why the answer has to
-- be copied somewhere readable.
--
-- Not the address. This table is world-readable by design (the board renders
-- from it), so an email column here would publish five hundred email addresses
-- to anybody with the anon key. Which services, not which accounts: that is the
-- part an admin needs and the part that is safe to say out loud.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists auth_providers text[];

comment on column public.profiles.auth_providers is
  'Every service linked to this account: discord, google, email. From '
  'auth.identities, which no client can read for anybody but themselves.';

-- An earlier draft of this file added a singular `auth_provider`. It could only
-- ever hold one of the two, so it is folded in and dropped rather than left to
-- disagree with the column beside it. No-op on a database that never had it.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles'
                and column_name = 'auth_provider') then
    execute $sql$
      update public.profiles
         set auth_providers = array[auth_provider]
       where auth_provider is not null and auth_providers is null
    $sql$;
    alter table public.profiles drop column auth_provider;
    raise notice 'Folded the old singular auth_provider into auth_providers.';
  end if;
end $$;

-- ─── Everybody already here ──────────────────────────────────────────────
-- auth.identities is the record of what is actually linked, one row per
-- service, so it answers this directly and stays right for accounts that
-- linked a second service long after they signed up.
update public.profiles p
   set auth_providers = i.provs
  from (select user_id, array_agg(distinct provider order by provider) as provs
          from auth.identities
         group by user_id) i
 where i.user_id = p.id
   and p.auth_providers is distinct from i.provs;

-- ─── And everybody who arrives from now on ───────────────────────────────
-- Same as v4 with the providers added. Each service spells the name and the
-- picture differently, so whichever key is present wins.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar, display_name,
                               auth_providers)
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
    -- The identity rows may not be in yet at this instant, so this reads the
    -- metadata copy. The trigger below is what keeps it true afterwards.
    case
      when jsonb_typeof(new.raw_app_meta_data -> 'providers') = 'array'
        then array(select jsonb_array_elements_text(new.raw_app_meta_data -> 'providers'))
      when new.raw_app_meta_data ->> 'provider' is not null
        then array[new.raw_app_meta_data ->> 'provider']
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── And whenever somebody links or unlinks one ──────────────────────────
-- The part a signup trigger cannot do. Linking a second service happens weeks
-- after the account was made, so anything written only at signup is wrong from
-- the moment it matters — which is exactly the case this column exists for.
create or replace function public.sync_auth_providers()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid;
begin
  -- NEW is unset on a delete and OLD on an insert, so the row is picked by
  -- which operation this is rather than by coalescing across both.
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  update public.profiles p
     set auth_providers = (select array_agg(distinct i.provider order by i.provider)
                             from auth.identities i
                            where i.user_id = uid)
   where p.id = uid;
  return null;
end;
$$;

-- auth.identities belongs to the auth schema, and permission to put a trigger
-- on it is not guaranteed. If it is refused, the backfill above still gives
-- every existing account the right answer and re-running this file picks up
-- anything linked since — better than the whole migration failing over the one
-- statement that was optional.
do $$
begin
  drop trigger if exists identities_sync_providers on auth.identities;
  create trigger identities_sync_providers
    after insert or delete on auth.identities
    for each row execute function public.sync_auth_providers();
exception
  when insufficient_privilege or undefined_table then
    raise notice 'Could not watch auth.identities (%). Existing accounts are '
                 'correct; re-run this file after somebody links a service.',
                 sqlerrm;
end $$;

-- Derived from the sign-in, so nobody edits it. The table-wide revoke in
-- schema.sql already covers this — the column is simply left out of the grant
-- list, the same way is_admin and character_id are.
