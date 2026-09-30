-- FC site: database performance check (read-only).
--
-- For the user to paste into the Supabase SQL editor. Nothing here changes
-- anything. Run the sections one at a time (the editor shows the last result
-- of a batch), and paste each result back.

-- ── 1. The queries that cost the most time in total ────────────────────────
-- Look for: a huge `calls` count from one page (polling, realtime refetch),
-- a high mean on something members do often, and rows ≫ what a page shows.
select calls,
       round(total_exec_time::numeric, 0) as total_ms,
       round(mean_exec_time::numeric, 2)  as mean_ms,
       rows,
       left(regexp_replace(query, '\s+', ' ', 'g'), 180) as query
  from extensions.pg_stat_statements
 where query not ilike '%pg_stat_statements%'
 order by total_exec_time desc
 limit 25;

-- ── 2. Foreign keys with no index on their columns ─────────────────────────
-- Each one makes a join, a cascade delete, or an RLS check on that column
-- scan the table.
select c.conrelid::regclass as table_name,
       c.conname           as fk,
       string_agg(a.attname, ', ' order by x.n) as columns
  from pg_constraint c
  join lateral unnest(c.conkey) with ordinality as x(attnum, n) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = x.attnum
 where c.contype = 'f'
   and c.connamespace = 'public'::regnamespace
   and not exists (
     select 1 from pg_index i
      where i.indrelid = c.conrelid
        and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
   )
 group by 1, 2
 order by 1;

-- ── 3. Tables read by scanning ─────────────────────────────────────────────
-- A big table with seq_scan ≫ idx_scan is missing an index for how it is read.
select relname as table_name,
       n_live_tup as rows,
       seq_scan, seq_tup_read, idx_scan,
       pg_size_pretty(pg_total_relation_size(relid)) as size
  from pg_stat_user_tables
 where schemaname = 'public'
 order by seq_tup_read desc
 limit 25;

-- ── 4. Indexes never used since the stats were reset ───────────────────────
-- Candidates to drop (each slows every write). Keep unique/primary ones.
select s.relname as table_name, s.indexrelname as index_name,
       pg_size_pretty(pg_relation_size(s.indexrelid)) as size, s.idx_scan
  from pg_stat_user_indexes s
  join pg_index i on i.indexrelid = s.indexrelid
 where s.schemaname = 'public' and s.idx_scan = 0
   and not i.indisunique and not i.indisprimary
 order by pg_relation_size(s.indexrelid) desc;

-- ── 5. RLS policies that call auth.uid() or a helper once per row ──────────
-- Written as (select auth.uid()) / (select public.is_admin()) Postgres runs
-- them once per statement. The bare form re-runs for every row scanned.
select tablename, policyname, cmd,
       coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
  from pg_policies
 where schemaname in ('public', 'storage')
   and (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
       ~ '(?<!SELECT )(?<!SELECT public\.)(public\.)?(auth\.uid|is_admin|verified_character|has_character)\(\)'
 order by tablename, policyname;

-- ── 6. What realtime is publishing ─────────────────────────────────────────
-- Every table here sends change messages that are billed and RLS-checked per
-- subscriber. Only tables a page subscribes to belong in it.
select schemaname, tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
 order by 1, 2;

-- ── 7. The biggest tables ──────────────────────────────────────────────────
select relname as table_name,
       n_live_tup as rows,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size
  from pg_stat_user_tables
 where schemaname = 'public'
 order by pg_total_relation_size(relid) desc
 limit 15;

-- ── 8. Cache hit ratio (should be above 0.99) ──────────────────────────────
select round(sum(heap_blks_hit)::numeric
             / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 4) as table_hit_ratio
  from pg_statio_user_tables;
