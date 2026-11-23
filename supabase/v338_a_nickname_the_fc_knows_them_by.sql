-- v338 — a nickname the FC knows them by
--
-- Run this once in the Supabase SQL editor, after v157, v279 and v280 (all
-- run long ago). Running it again is safe. Run it BEFORE the page that goes
-- with it is pushed: that page asks for the nickname and saves it.
--
-- The owner, 2026-11-23: "เพิ่มช่อง ชื่อเล่น nickname เห็นเฉพาะคนใน FC", on
-- the form where a member's Discord and Facebook are typed in. A third field
-- on the same row, typed in by the same people (admins and the Crew, v280),
-- and read by the same people who read the Discord: a signed-in account whose
-- proved character is on fc_roster, and the admins. Not anon, not a guest,
-- not an account without a proved character.
--
-- So nothing about who reads the table moves. Members still never read
-- member_contacts itself (its one policy is admins and staff, v279); they ask
-- member_contact(), which now hands a member of the FC the nickname beside
-- the Discord and still leaves the Facebook out.
--
-- member_contact() gains a column, and a function's columns cannot be changed
-- in place, so it is dropped and made again with its grants. The page as it
-- stands reads the two it knows and ignores the third.
--
-- member_contact_set() gains a fourth word, p_nickname, as a function of its
-- own: the three-word one stays, and now keeps whatever nickname is on file.
-- That is for a page opened before the new code went out (the Crew keep the
-- list open for hours): saving a Discord there must not quietly wipe the
-- nickname somebody typed in meanwhile. The four-word one has no default, so
-- the two are never ambiguous to PostgREST.
--
-- As before, all three blank takes the row away, and it is not in the audit
-- log (v157's reason: the log keeps deleted rows for good).

/* ── the column ──────────────────────────────────────────────────────────── */

-- 32 is room for "มิ้นท์ (Mint)" twice over; a nickname, not a note.
alter table public.member_contacts
  add column if not exists nickname text
    check (char_length(nickname) between 1 and 32 and nickname !~ '[[:cntrl:]]');

-- A row with none of the three is not a row.
alter table public.member_contacts drop constraint if exists member_contacts_something;
alter table public.member_contacts
  add constraint member_contacts_something check (num_nonnulls(discord, facebook, nickname) > 0);

/* ── reading one member's ────────────────────────────────────────────────── */

-- What the asker may know about this character: the nickname and the Discord
-- for the FC and the admins, the Facebook for the admins. No row at all when
-- there is nothing the asker may see.
drop function if exists public.member_contact(bigint);
create function public.member_contact(p_character bigint)
returns table (discord text, facebook text, nickname text)
language plpgsql stable security definer set search_path = public
as $fn$
declare
  boss boolean;
begin
  if auth.uid() is null then return; end if;
  boss := public.is_admin();
  if not boss and not public.fc_member() then return; end if;

  return query
    select c.discord, case when boss then c.facebook end, c.nickname
      from public.member_contacts c
     where c.character_id = p_character
       and (boss or c.discord is not null or c.nickname is not null);
end;
$fn$;

revoke execute on function public.member_contact(bigint) from public, anon;
grant execute on function public.member_contact(bigint) to authenticated;

/* ── writing one member's ────────────────────────────────────────────────── */

-- The one way in, now with the nickname. All three every time, as the form
-- holds them: blank means "none", and all three blank takes the row away.
-- Returns whether a row stands afterwards.
create or replace function public.member_contact_set(
  p_character bigint, p_discord text, p_facebook text, p_nickname text
) returns boolean
language plpgsql security definer set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  d  text := nullif(btrim(coalesce(p_discord, '')), '');
  f  text := nullif(btrim(coalesce(p_facebook, '')), '');
  n  text := nullif(btrim(coalesce(p_nickname, '')), '');
begin
  if me is null then raise exception 'not signed in'; end if;
  if not (public.is_admin() or public.is_staff()) then
    raise exception 'admins and staff only';
  end if;
  if p_character is null or p_character <= 0 then
    raise exception 'no such character';
  end if;
  if char_length(d) > 64 then raise exception 'a Discord name is 64 characters at most'; end if;
  if char_length(f) > 200 then raise exception 'a Facebook is 200 characters at most'; end if;
  if char_length(n) > 32 then raise exception 'a nickname is 32 characters at most'; end if;
  if d ~ '[[:cntrl:]]' or f ~ '[[:cntrl:]]' or n ~ '[[:cntrl:]]' then
    raise exception 'one line each';
  end if;

  if d is null and f is null and n is null then
    delete from public.member_contacts c where c.character_id = p_character;
    return false;
  end if;

  insert into public.member_contacts as c (character_id, discord, facebook, nickname, updated_at, updated_by)
  values (p_character, d, f, n, now(), me)
  on conflict (character_id) do update
    set discord = excluded.discord,
        facebook = excluded.facebook,
        nickname = excluded.nickname,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by;
  return true;
end;
$fn$;

revoke execute on function public.member_contact_set(bigint, text, text, text) from public, anon;
grant execute on function public.member_contact_set(bigint, text, text, text) to authenticated;

-- The three-word form, for a page that does not know the nickname yet: it
-- passes on whatever nickname is on file. The four-word form does every
-- check, the right to write first; the nickname read here goes nowhere but
-- into that call.
create or replace function public.member_contact_set(
  p_character bigint, p_discord text, p_facebook text
) returns boolean
language sql security definer set search_path = public
as $fn$
  select public.member_contact_set(
    p_character, p_discord, p_facebook,
    (select c.nickname from public.member_contacts c where c.character_id = p_character));
$fn$;

revoke execute on function public.member_contact_set(bigint, text, text) from public, anon;
grant execute on function public.member_contact_set(bigint, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'member_contacts'
--      and column_name = 'nickname';
--   -- one row: nickname, text
--
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'member_contacts_something';
--   -- CHECK ((num_nonnulls(discord, facebook, nickname) > 0))
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as members
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('member_contact', 'member_contact_set')
--    order by 1, 2;
--   -- three rows, each: true, false, true
--   --   member_contact      p_character bigint
--   --   member_contact_set  p_character bigint, p_discord text, p_facebook text
--   --   member_contact_set  p_character bigint, p_discord text, p_facebook text, p_nickname text
--
--   select policyname, cmd from pg_policies where tablename = 'member_contacts';
--   -- one row, as before: member_contacts_read SELECT
