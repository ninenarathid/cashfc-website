-- v280 — the staff type contacts in too
--
-- Run this once in the Supabase SQL editor, after v279. Running it again is
-- safe.
--
-- The owner, 2026-10-17, looking at the staff page v279 gave: "ช่วยทำให้
-- แก้ไขได้เหมือน admin ทั้ง discord facebook". The staff now write a
-- member's Discord and Facebook as the admins do, from the staff page.
--
-- member_contact_set() is still the one way in (the table has no write grant
-- and no write policy, as in v157), and it is the only thing this file
-- changes: its check now lets is_staff() by as well as is_admin(). The body
-- is v157's word for word otherwise. updated_by keeps whoever typed the row,
-- staff or admin.
--
-- Not changed: member_contact(), which a member's own page asks. There the
-- staff are still members and are handed the Discord alone; their place to
-- read and write both is the staff page.

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
  if not (public.is_admin() or public.is_staff()) then
    raise exception 'admins and staff only';
  end if;
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
--   select position('is_staff' in pg_get_functiondef(p.oid)) > 0 as staff_may_write,
--          p.prosecdef,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as members
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname = 'member_contact_set';
--   -- one row: true, true, false, true
