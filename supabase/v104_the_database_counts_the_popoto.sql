-- v104 — the database counts the popoto
--
-- Run this once in the Supabase SQL editor, after v103. Running it again is
-- safe.
--
-- The popoto board, on the leaderboards and in the three faces on the front
-- page, has been added up by the page itself: lib/popoto-board.ts fetched
-- every row of `kudos`, a thousand at a time, and counted them. lib/rows.ts
-- gives up at a hundred thousand rows on purpose, with "count these in the
-- database". On 2026-10-03 the table held 52,512 rows, 12,830 of them
-- October's, and was growing by four to five thousand a day: all time and
-- this year would have stopped around the 14th, this month and the front page
-- around the 22nd. Until then every visitor to the front page downloaded the
-- whole month to be shown three names. The owner asked that day for the
-- counting to move here.
--
-- popoto_totals(p_since) is that counting: for each character, how many popoto
-- (`score`) and from how many different people (`n`), since a moment, or ever
-- when it is null. The same numbers the page worked out, by the same rule:
-- every row counts, the ones given to oneself too, and nothing is filtered but
-- the date. One row per sender per person per day is the table's own rule
-- (v2), so rows are popoto and senders are people; `sender_id` is never null,
-- so `distinct` misses nobody.
--
-- The decisions a reader might question:
--
-- Invoker, not definer. `kudos` is readable by everybody (v2's "kudos: read
-- for everyone"), which is how a signed-out browser has been counting the
-- board all along, so there is nothing for this to read past. It hands the
-- totals to exactly whoever can read the rows and can never show more than
-- they could already see. If `kudos` is one day closed to anon, so that who
-- gave to whom stops being public, the board would go empty for visitors (or
-- fail, if only the sender column is withheld), and this is the function to
-- make `security definer` in that same migration. It returns counts and never
-- a sender, which is what would make that safe.
--
-- Granted outright. Postgres gives EXECUTE on a new function to PUBLIC and
-- Supabase to the API roles on top. PUBLIC is taken away and the three roles
-- are named, anon among them because the board is public.
--
-- `first_id`, and the order. The page met the rows in id order, so on a tie in
-- both numbers the board has put first whoever was given theirs first. The
-- answer comes in that order so that it still does. Character order, the
-- obvious other one, would hand every tie to the lowest id: on the first of a
-- month, when ten people have one popoto each, that is the same few old
-- characters every time. It is also an order that never ties and only grows
-- at the end, so the page can ask for the answer a thousand people at a time:
-- PostgREST caps a response at a thousand rows, and the board has some five
-- hundred people on it today.
--
-- `>= coalesce(p_since, '-infinity')` rather than `p_since is null or ...`:
-- one comparison an index can answer whether or not the planner can see the
-- date. With the `or`, a planner that cannot see it (inside a function, or
-- when it arrives in a JSON body) reads the whole table every time.
--
-- The index. Nothing in the migrations that were kept indexes `created_at`,
-- and "this month" is what both pages ask first. Without one the month's
-- board walks every popoto ever given, so its cost grows with the table and
-- not with the month. At today's size it changes little, the whole table
-- being a few megabytes; it is for the months to come. Tried in PGlite at a
-- year's worth of rows (1.6 million), a month went from about 300 ms to about
-- 170 and the last three days from 165 ms to under 20. Those are a slow
-- machine's numbers, and the ratio is the point. It costs one small index
-- entry per popoto sent. It is made only if `kudos` has no index that starts
-- with `created_at` already: lib/prizes.ts has called the column indexed
-- since v90, some early migrations were never committed (v26-38, v40-44,
-- v62-72), and a second copy would be dead weight on every send.
--
-- Nothing to validate: the one argument is a timestamptz, and Postgres has
-- typed it before this runs. Nothing new to abuse either: it is one pass over
-- the rows it counts, where the same key could already ask for every row.
--
-- Later, not now:
--   · When popoto can be spent (the count goes down, the rows stay as the
--     history of who gave, the oldest going first), that belongs inside this
--     function, as a filter on `k` before the grouping, so that `score`, `n`
--     and `first_id` all follow from what is left. The popoto that no longer
--     count are each receiver's oldest, numbered across all time: before the
--     date is applied, not after. If anon may not read whatever records the
--     spending, this becomes definer, as above. The member page and its share
--     card count `kudos` rows themselves today (components/MemberView.tsx,
--     app/member/[id]/opengraph-image.tsx) and should ask this from then on.
--   · If all time ever gets slow (it reads every row, and Supabase gives
--     anon's statements three seconds by default), a counter table kept by a
--     trigger can replace the body, and nothing that calls this would notice.

/* ── the index ───────────────────────────────────────────────────────────── */

do $$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_am m on m.oid = c.relam
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
     where i.indrelid = 'public.kudos'::regclass
       and m.amname = 'btree'
       and a.attname = 'created_at'
       and i.indpred is null
       and i.indisvalid
  ) then
    create index kudos_created_at on public.kudos (created_at);
  end if;
end $$;

/* ── the counting ────────────────────────────────────────────────────────── */

create or replace function public.popoto_totals(
  p_since timestamptz default null
)
returns table (
  receiver_character_id bigint,
  score                 bigint,
  n                     bigint,
  first_id              bigint
)
language sql stable set search_path = public
as $$
  select k.receiver_character_id,
         count(*)                    as score,
         count(distinct k.sender_id) as n,
         min(k.id)                   as first_id
    from public.kudos k
   where k.created_at >= coalesce(p_since, '-infinity'::timestamptz)
   group by k.receiver_character_id
   order by min(k.id);
$$;

comment on function public.popoto_totals(timestamptz) is
  'The popoto board: for each character, how many popoto (score) and from how '
  'many people (n) since p_since, or ever when it is null, in the order each '
  'was first given one (first_id). Invoker on purpose: it shows what its '
  'caller can already read in kudos, and counts only, never who gave.';

revoke all on function public.popoto_totals(timestamptz) from public;
grant execute on function public.popoto_totals(timestamptz)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) = (select count(distinct receiver_character_id)
--                        from public.kudos) as everybody,
--          sum(score) = (select count(*) from public.kudos) as every_popoto
--     from public.popoto_totals();
--   -- true | true
--
--   select coalesce(sum(score), 0) = (select count(*) from public.kudos
--            where created_at >= '2026-10-01T00:00:00+07:00') as october
--     from public.popoto_totals('2026-10-01T00:00:00+07:00');
--   -- true
--
--   select receiver_character_id, score, n from public.popoto_totals()
--    order by score desc, n desc limit 3;
--   -- the top three of the all-time board, with the numbers it shows
--
--   select prosecdef, provolatile, proconfig from pg_proc
--    where oid = 'public.popoto_totals(timestamptz)'::regprocedure;
--   -- false | s | {search_path=public}
--
--   select grantee from information_schema.routine_privileges
--    where routine_schema = 'public' and routine_name = 'popoto_totals'
--      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
--    order by grantee;
--   -- anon, authenticated, service_role   (no PUBLIC)
--
--   select indexname, indexdef from pg_indexes
--    where schemaname = 'public' and tablename = 'kudos'
--      and indexdef like '%(created_at%';
--   -- one row: kudos_created_at, or the index that was already there
--
--   begin; set local role anon;
--   select count(*) > 0 as a_visitor_sees_the_board
--     from public.popoto_totals();
--   rollback;
--   -- true
