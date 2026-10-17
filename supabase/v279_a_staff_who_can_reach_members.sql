-- v279 — a staff who can reach members
--
-- Run this once in the Supabase SQL editor, after v278. It needs v157
-- (member_contacts). Running it again is safe.
--
-- Asked for by the owner on 2026-10-17: a new role, Staff. A staff member is
-- an ordinary member everywhere on the site except one page, /staff, which
-- for now holds every member's Discord and Facebook. Areeya is the only one.
-- The admins see that page too, and everything on it.
--
-- That takes back one line of v157 on the owner's word: the Facebook was the
-- admins' alone, and now the staff read it as well. Nothing else of v157
-- moves. The staff do not type contacts in (member_contact_set still asks
-- is_admin()), and on a member's own page they are a member like any other
-- (member_contact() still hands the Facebook to admins only). The one door
-- opened is reading the table itself, which is what the staff page does.
--
-- The role is a flag on the profile, beside is_admin and kept the same way:
-- nobody in a browser can set it, admins included. profiles has carried
-- column grants since the first schema (revoke update, then grant the columns
-- a member edits), and is_staff is not among them, so a PATCH naming it is
-- refused with 42501. It is set here, and from the SQL editor after this.
-- Like is_admin it can be read by anybody who reads profiles; it says who is
-- staff, and nothing a staff member can see.
--
-- On the account rather than the character, as is_admin is: the person was
-- made staff, and a second character claimed later does not change that.

/* ── the role ────────────────────────────────────────────────────────────── */

-- No grant follows, on purpose: a column added to profiles is nobody's to
-- write until a grant names it. The third check at the bottom says so live.
alter table public.profiles
  add column if not exists is_staff boolean not null default false;

-- Whether whoever is asking is staff. Reads one row, by auth.uid(), past RLS
-- for the same reason is_admin() does.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $fn$
  select coalesce(
    (select p.is_staff from public.profiles p where p.id = (select auth.uid())),
    false);
$fn$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

/* ── what the staff read ─────────────────────────────────────────────────── */

-- v157's one policy, widened to the staff. Still no policy for any write, and
-- still only the select grant.
drop policy if exists member_contacts_read on public.member_contacts;
create policy member_contacts_read on public.member_contacts
  for select to authenticated
  using ((select public.is_admin()) or (select public.is_staff()));

/* ── who is staff ────────────────────────────────────────────────────────── */

-- Areeya Lovekin, by her proved character: one account, verified 2026-08-30.
update public.profiles p
   set is_staff = true
 where p.character_id = 58199536
   and p.character_verified_at is not null
   and not p.is_staff;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select character_name, is_admin from public.profiles
--    where is_staff order by 1;
--   -- one row: Areeya Lovekin, false
--
--   select policyname, cmd, roles, qual from pg_policies
--    where tablename = 'member_contacts' order by policyname;
--   -- one row: member_contacts_read SELECT {authenticated}, naming is_admin and is_staff
--
--   select has_column_privilege('authenticated', 'public.profiles', 'is_staff', 'UPDATE') as members,
--          has_column_privilege('anon', 'public.profiles', 'is_staff', 'UPDATE') as anon;
--   -- false, false
--
--   select p.prosecdef,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as members
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname = 'is_staff';
--   -- one row: true, false, true
