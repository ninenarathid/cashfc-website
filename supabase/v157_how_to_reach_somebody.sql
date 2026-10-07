-- v157 — how to reach somebody
--
-- Run this once in the Supabase SQL editor, after v156. It needs is_admin()
-- and v87 (fc_roster). Running it again is safe.
--
-- Asked for by the owner on 2026-10-07: a Discord name and a Facebook for
-- each member, and nothing automatic about either. Aqua types them in by
-- hand, one member at a time, from what members have told her. They are not
-- the Discord a member signed in with (profiles.discord_username, which only
-- somebody with an account has) but whatever the member is actually reached
-- on, for all five hundred characters, account or no account. So they are
-- kept by character, as member_overrides is.
--
-- Two fields and two audiences, which is the whole of the design:
--
--   discord    read by the FC: a signed-in account whose proved character is
--              on fc_roster, and the admins
--   facebook   read by the admins and nobody else
--
-- A Facebook is somebody's real name and face tied to a character. It is the
-- most personal thing this database holds, and the reason for every choice
-- below that looks stricter than its neighbours:
--
-- The table is read by admins only. Row level security cannot give one column
-- to members and keep another from them, since both are `authenticated`, so
-- members never read the table at all: they ask member_contact(), which
-- hands a member of the FC the Discord and leaves the Facebook out. A page
-- that merely did not print it would still have been sent it.
--
-- Nothing is written through the table either. member_contact_set() is the
-- one way in, it checks is_admin() itself, and the table carries no insert,
-- update or delete grant for a later policy to open by accident. That is also
-- why there is no v85 restrictive trio here: there is no member write for it
-- to restrict.
--
-- It is not in the audit log, unlike member_overrides. The log keeps the
-- whole row of anything deleted and is never emptied, so a member who asked
-- Aqua to take their Facebook off the site would have it kept there for good.
-- Clearing both fields deletes the row, and then it is gone. Who typed the
-- row that stands is on the row (updated_by), which is the question a log
-- would have been asked.
--
-- An empty roster tells nobody apart, so while it is empty only admins read
-- anything, as in v87 and v98: a loud failure rather than a quiet one.

/* ── the table ───────────────────────────────────────────────────────────── */

create table if not exists public.member_contacts (
  character_id bigint primary key check (character_id > 0),
  -- A Discord name, as the member gave it. 64 rather than Discord's own 32:
  -- "name (the one with the cat)" is the sort of thing that gets typed.
  discord      text check (char_length(discord) between 1 and 64
                           and discord !~ '[[:cntrl:]]'),
  -- A profile address or a name, whichever Aqua was given.
  facebook     text check (char_length(facebook) between 1 and 200
                           and facebook !~ '[[:cntrl:]]'),
  updated_at   timestamptz not null default now(),
  -- The admin who typed it. Null for a row put in from the SQL editor.
  updated_by   uuid references public.profiles (id) on delete set null,
  -- A row with neither is not a row: member_contact_set deletes it.
  constraint member_contacts_something check (num_nonnulls(discord, facebook) > 0)
);

create index if not exists member_contacts_by on public.member_contacts (updated_by)
  where updated_by is not null;

alter table public.member_contacts enable row level security;

-- Admins, and no policy for anybody else or for any write.
drop policy if exists member_contacts_read on public.member_contacts;
create policy member_contacts_read on public.member_contacts
  for select to authenticated
  using ((select public.is_admin()));

-- Grants outright: Supabase gave anon and authenticated ALL on this table the
-- moment it was created.
revoke all on public.member_contacts from anon, authenticated;
grant select on public.member_contacts to authenticated;

/* ── who is in the FC ────────────────────────────────────────────────────── */

-- Whether whoever is asking has a proved character on the roster. Says
-- nothing about anybody but the caller. security definer because fc_roster
-- and another's profile are not the caller's to read in every case; it reads
-- one row of each, by auth.uid().
create or replace function public.fc_member()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select exists (
    select 1
      from public.profiles p
      join public.fc_roster r on r.character_id = p.character_id
     where p.id = (select auth.uid())
       and p.character_verified_at is not null);
$fn$;

revoke execute on function public.fc_member() from public, anon;
grant execute on function public.fc_member() to authenticated;

/* ── reading one member's ────────────────────────────────────────────────── */

-- What the asker may know about how to reach this character: the Discord for
-- the FC and the admins, the Facebook for the admins. No row at all when
-- there is nothing the asker may see, so a member cannot tell "no Facebook on
-- file" from "one on file that is not mine to read".
create or replace function public.member_contact(p_character bigint)
returns table (discord text, facebook text)
language plpgsql stable security definer set search_path = public
as $fn$
declare
  boss boolean;
begin
  if auth.uid() is null then return; end if;
  boss := public.is_admin();
  if not boss and not public.fc_member() then return; end if;

  return query
    select c.discord, case when boss then c.facebook end
      from public.member_contacts c
     where c.character_id = p_character
       and (boss or c.discord is not null);
end;
$fn$;

revoke execute on function public.member_contact(bigint) from public, anon;
grant execute on function public.member_contact(bigint) to authenticated;

/* ── writing one member's ────────────────────────────────────────────────── */

-- The one way in. Both fields every time, as the form holds them: blank
-- means "none", and both blank takes the row away. Returns whether a row
-- stands afterwards.
create or replace function public.member_contact_set(
  p_character bigint, p_discord text, p_facebook text
) returns boolean
language plpgsql security definer set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  d  text := nullif(btrim(coalesce(p_discord, '')), '');
  f  text := nullif(btrim(coalesce(p_facebook, '')), '');
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_character is null or p_character <= 0 then
    raise exception 'no such character';
  end if;
  if char_length(d) > 64 then raise exception 'a Discord name is 64 characters at most'; end if;
  if char_length(f) > 200 then raise exception 'a Facebook is 200 characters at most'; end if;
  if d ~ '[[:cntrl:]]' or f ~ '[[:cntrl:]]' then
    raise exception 'one line each';
  end if;

  if d is null and f is null then
    delete from public.member_contacts c where c.character_id = p_character;
    return false;
  end if;

  insert into public.member_contacts as c (character_id, discord, facebook, updated_at, updated_by)
  values (p_character, d, f, now(), me)
  on conflict (character_id) do update
    set discord = excluded.discord,
        facebook = excluded.facebook,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;
  return true;
end;
$fn$;

revoke execute on function public.member_contact_set(bigint, text, text) from public, anon;
grant execute on function public.member_contact_set(bigint, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select relrowsecurity from pg_class
--    where oid = 'public.member_contacts'::regclass;
--   -- true
--
--   select policyname, cmd, roles from pg_policies
--    where tablename = 'member_contacts' order by policyname;
--   -- one row: member_contacts_read SELECT {authenticated}
--
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'member_contacts' and grantee in ('anon', 'authenticated')
--    order by grantee, privilege_type;
--   -- one row: authenticated SELECT
--
--   select p.proname, p.prosecdef,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as members
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('fc_member', 'member_contact', 'member_contact_set')
--    order by 1;
--   -- three rows, each: true, false, true
--
--   select count(*) from public.member_contacts;
--   -- 0 until Aqua types the first one in
