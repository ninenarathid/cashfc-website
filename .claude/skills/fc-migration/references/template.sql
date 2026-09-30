-- vNN — <a short plain phrase about what changes for people>
--
-- Run this once in the Supabase SQL editor, after vMM. Running it again is
-- safe.
--
-- <Why, in prose: who asked and when, what happens today without this, what
-- members will be able to do afterwards. Then the reasons for anything a
-- reader might question — why security definer here, why this column is not
-- granted, why a restrictive policy rather than a rewritten one.>
--
-- TEMPLATE NOTES (delete this block in a real file):
--   · `fc_things` / `fc_thing_*` are placeholders. Rename throughout, and drop
--     the sections the change does not need.
--   · This file runs as-is under the PGlite harness (template.test.mjs), so the
--     shapes below are known to execute twice and to refuse what they should.

/* ── the table ───────────────────────────────────────────────────────────── */

create table if not exists public.fc_things (
  id          bigint generated always as identity primary key,
  author_id   uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 300),
  -- Set by the database only (see fc_things_kept below); a browser value is
  -- thrown away.
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A column added after the table first shipped: its own line, so re-running
-- over an older copy of the table brings it up to date.
alter table public.fc_things add column if not exists hidden boolean not null default false;

-- Every foreign key and every column a policy or an `order by` reads.
create index if not exists fc_things_author on public.fc_things (author_id);
create index if not exists fc_things_newest on public.fc_things (created_at desc);

alter table public.fc_things enable row level security;

-- Reading: everybody sees what is shown; an author also sees their own hidden
-- rows, an admin sees everything.
drop policy if exists fc_things_read on public.fc_things;
create policy fc_things_read on public.fc_things
  for select to anon, authenticated
  using (
    not hidden
    or author_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Writing: your own rows only, and never in somebody else's name.
drop policy if exists fc_things_add on public.fc_things;
create policy fc_things_add on public.fc_things
  for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists fc_things_edit on public.fc_things;
create policy fc_things_edit on public.fc_things
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists fc_things_drop on public.fc_things;
create policy fc_things_drop on public.fc_things
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- v85: nothing is written by somebody the FC cannot name. Restrictive, so it
-- is ANDed with the ownership rules above; per command, never `for all`,
-- which would carry its USING into SELECT and hide the table from readers.
drop policy if exists fc_things_named_write on public.fc_things;
create policy fc_things_named_write on public.fc_things
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists fc_things_named_edit on public.fc_things;
create policy fc_things_named_edit on public.fc_things
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists fc_things_named_drop on public.fc_things;
create policy fc_things_named_drop on public.fc_things
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

-- Grants outright: Supabase gave anon and authenticated ALL on this table the
-- moment it was created. Column-level grants only mean something after this.
-- author_id is insertable because the site's inserts send it; the policy
-- above pins it to the caller, which is what makes that safe.
revoke all on public.fc_things from anon, authenticated;
grant select on public.fc_things to anon, authenticated;
grant insert (author_id, body) on public.fc_things to authenticated;
grant update (body, hidden, approved_at) on public.fc_things to authenticated;
grant delete on public.fc_things to authenticated;

/* ── columns only the database sets ──────────────────────────────────────── */

-- `current_user` is anon or authenticated for anything sent from a browser.
-- Invoker on purpose: under security definer it would always be the owner.
create or replace function public.fc_things_kept()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.approved_at := null;
    else
      new.approved_at := old.approved_at;
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists fc_things_kept on public.fc_things;
create trigger fc_things_kept
  before insert or update on public.fc_things
  for each row execute function public.fc_things_kept();

/* ── an RPC the browser calls ────────────────────────────────────────────── */

-- security definer because it reads past RLS (it counts hidden rows too);
-- so it checks who is asking itself, and anon may not call it at all.
create or replace function public.fc_things_mine_count()
returns integer
language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  return (select count(*)::int from public.fc_things where author_id = me);
end;
$$;

-- EXECUTE goes to PUBLIC by default and Supabase adds anon on top.
revoke execute on function public.fc_things_mine_count() from public, anon;
grant execute on function public.fc_things_mine_count() to authenticated;

/* ── a bucket for its pictures ───────────────────────────────────────────── */

-- Public: a picture is shown by its address. That does not let anybody list
-- the bucket; the policies below decide that. Limits live on the bucket so a
-- console upload meets them too: 5 MB, and only the formats the page makes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fc-things', 'fc-things', true, 5242880,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Your own folder (`<uid>/...`) and nobody else's.
drop policy if exists fc_things_files_add on storage.objects;
create policy fc_things_files_add on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fc-things'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select public.verified_character()) or (select public.is_admin()))
  );

drop policy if exists fc_things_files_own on storage.objects;
create policy fc_things_files_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fc-things'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_admin()))
  );

drop policy if exists fc_things_files_drop on storage.objects;
create policy fc_things_files_drop on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fc-things'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_admin()))
  );

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select relrowsecurity from pg_class where oid = 'public.fc_things'::regclass;
--   -- true
--
--   select policyname, cmd, permissive from pg_policies
--    where tablename = 'fc_things' order by policyname;
--   -- fc_things_add INSERT PERMISSIVE, fc_things_drop DELETE PERMISSIVE,
--   -- fc_things_edit UPDATE PERMISSIVE, fc_things_named_drop DELETE RESTRICTIVE,
--   -- fc_things_named_edit UPDATE RESTRICTIVE, fc_things_named_write INSERT RESTRICTIVE,
--   -- fc_things_read SELECT PERMISSIVE
--
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'fc_things' and grantee in ('anon', 'authenticated')
--    order by grantee, privilege_type;
--   -- anon SELECT; authenticated DELETE, SELECT (insert/update are per column)
--
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'fc-things';
--   -- one row: true, 5242880, {image/webp,image/jpeg,image/png,image/avif}
