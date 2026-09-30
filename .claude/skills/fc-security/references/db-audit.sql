-- FC site: database security audit (read-only).
--
-- For the user to paste into the Supabase SQL editor, one section at a time,
-- pasting each result back. It reads the catalog only: no member's data is
-- selected, only which roles could read or write what.
--
-- Also open Database → Advisors → Security Advisor in the dashboard; it runs
-- Supabase's own linter and complements this.
--
-- How to read the results: every row is a question, not a verdict. The
-- answer "yes, on purpose" is fine when the reason is known (see the
-- deliberate exceptions in SKILL.md).

-- ── 1. Tables with row-level security off ──────────────────────────────────
-- The browser holds the anon key, so a table without RLS is readable (and,
-- with Supabase's default grants, writable) by anybody. Expect no rows.
select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
 order by 1;

-- ── 2. What anon may write ─────────────────────────────────────────────────
-- Nothing on this site is written signed out, so anon should hold no
-- INSERT/UPDATE/DELETE anywhere. A row here is protected only by RLS.
select c.relname as table_name,
       string_agg(p.priv, ', ' order by p.priv) as anon_can
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
 where n.nspname = 'public' and c.relkind in ('r', 'p')
   and has_table_privilege('anon', c.oid, p.priv)
 group by 1
 order by 1;

-- ── 3. Write policies that let anyone through ──────────────────────────────
-- A permissive INSERT/UPDATE/DELETE policy whose condition is just `true`,
-- or that applies to anon or public.
select tablename, policyname, cmd, roles, permissive,
       coalesce(qual, '-') as using_expr, coalesce(with_check, '-') as check_expr
  from pg_policies
 where schemaname in ('public', 'storage')
   and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
   and permissive = 'PERMISSIVE'
   and (coalesce(qual, 'true') = 'true' and coalesce(with_check, 'true') = 'true'
        or roles && array['anon', 'public']::name[])
 order by 1, 2;

-- ── 4. Tables members write to without the v85 "verified character" rule ───
-- Every table authenticated can insert into should carry the restrictive
-- <table>_named_write policy (and _named_edit / _named_drop). The deliberate
-- exceptions are profiles, feedback_threads, feedback_messages and
-- notifications.
select c.relname as table_name,
       exists (select 1 from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname
                  and p.permissive = 'RESTRICTIVE' and p.cmd = 'INSERT') as has_restrictive_insert,
       exists (select 1 from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname
                  and p.permissive = 'RESTRICTIVE' and p.cmd = 'UPDATE') as has_restrictive_update,
       exists (select 1 from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname
                  and p.permissive = 'RESTRICTIVE' and p.cmd = 'DELETE') as has_restrictive_delete
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r', 'p')
   and (has_table_privilege('authenticated', c.oid, 'INSERT')
        or exists (select 1 from pg_attribute a
                    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                      and has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')))
   and exists (select 1 from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname
                  and p.cmd in ('INSERT', 'ALL') and p.permissive = 'PERMISSIVE')
   and not exists (select 1 from pg_policies p
                    where p.schemaname = 'public' and p.tablename = c.relname
                      and p.permissive = 'RESTRICTIVE' and p.cmd = 'INSERT')
 order by 1;

-- ── 5. Personal-looking columns the public key can read ────────────────────
-- Columns whose names suggest personal data, on tables anon can select from,
-- with whether anon holds SELECT on that column. Pair it with the table's
-- SELECT policy (section 6): if that is `true`, every row's value is public.
select c.relname as table_name, a.attname as column_name,
       has_column_privilege('anon', c.oid, a.attnum, 'SELECT') as anon_can_read,
       has_column_privilege('authenticated', c.oid, a.attnum, 'SELECT') as members_can_read
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
 where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
   and a.attname ~* '(discord|email|birth|avail|last_(seen|active|online)|ip_|phone|address|real_name|token|secret|salt|note|language|quiet|is_admin|user_id|uid$)'
 order by 1, 2;

-- ── 6. Read policies that show every row to everyone ───────────────────────
-- Fine for public things (parties, gallery). Look closely wherever section 5
-- found personal columns.
select tablename, policyname, roles, coalesce(qual, 'true') as using_expr
  from pg_policies
 where schemaname = 'public' and cmd in ('SELECT', 'ALL')
   and coalesce(qual, 'true') = 'true'
 order by 1, 2;

-- ── 7. SECURITY DEFINER functions ──────────────────────────────────────────
-- Each runs with its owner's rights, past RLS. It must pin search_path, check
-- auth.uid() itself, and validate its arguments. `anon_can_call` shows who can
-- reach it from the browser (EXECUTE goes to PUBLIC unless revoked).
select p.oid::regprocedure as function,
       (select string_agg(c, ', ') from unnest(p.proconfig) c where c like 'search_path=%') as search_path,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_call,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as members_can_call,
       p.prosrc ~* 'auth\.uid\(\)' as mentions_auth_uid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and p.prorettype <> 'trigger'::regtype
 order by (select count(*) from unnest(p.proconfig) c where c like 'search_path=%') , 1;

-- ── 8. Views that skip RLS ─────────────────────────────────────────────────
-- A view runs as its owner unless created with security_invoker, so it can
-- show rows the table's policies would hide.
select c.relname as view_name,
       coalesce(array_to_string(c.reloptions, ', '), '') as options,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_can_read
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('v', 'm')
   and not coalesce(c.reloptions::text[] && array['security_invoker=true', 'security_invoker=on'], false)
 order by 1;

-- ── 9. Storage buckets ─────────────────────────────────────────────────────
-- A public bucket with no size limit and no type list takes any file of any
-- size from anyone its insert policy lets in, SVG and HTML included.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 order by (file_size_limit is null) desc, (allowed_mime_types is null) desc, id;

-- ── 10. Storage object policies ────────────────────────────────────────────
-- Look for SELECT policies that let people list other members' folders, and
-- write policies not scoped to the uploader's own folder.
select policyname, cmd, roles, permissive, coalesce(qual, '-') as using_expr,
       coalesce(with_check, '-') as check_expr
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by cmd, policyname;
