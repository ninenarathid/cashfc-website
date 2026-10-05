-- v141 — the jar's row by name
--
-- Run this once in the Supabase SQL editor, after v140. Running it again is
-- safe.
--
-- The well's book stopped answering every member at seven in the evening of
-- 2026-10-05 (Aqua, that night: water poured into the well was no longer
-- counted, "เติมแล้วไม่นับความดี"). It was counted: every carrier's total in
-- `town_carriers` was the sum of their own deeds. What had stopped was the
-- book itself, so each page went on showing the numbers it had last read.
--
-- Why: the jar at the well (v129) is one row, and two statements wrote it
-- with no WHERE: `update public.town_jar j set …`. The live database refuses
-- that to whoever comes by the API ("UPDATE requires a WHERE clause", 21000:
-- Supabase loads `safeupdate` for the role PostgREST connects as, and it
-- reads every statement a function runs, `security definer` or not). The SQL
-- editor lets it by and so does PGlite, so every dry run passed.
--
--   · `town.jar_now` writes the jar when a round of the uncle's has turned
--     since the jar's own. Until the first turn after v129 ran, that line was
--     never reached; from then on (19:00) it was reached by every call, and
--     `town_well()` calls it first: no book for anybody, at every round's
--     turn, for good.
--   · `public.town_jar_drop` writes the jar at every drop: nothing has ever
--     been dropped into the jar on the site (its log has no line).
--
-- Both are written again here, word for word but for `where j.one` (the
-- jar's key: there is the one row). Nothing else changes: no table, no rule,
-- no number, no page. The file then looks at the jar once itself, which
-- brings it to the round that is (an empty jar only moves on; one with
-- something in it is shared as it would have been at the turn).
--
-- No other function of the site's has such a statement (all of them were
-- read: scripts/db/bare-writes.mjs, which the dry runs ask from now on).

/* ── v129 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.jar_now(bigint)') is null or to_regclass('public.town_jar') is null then
    raise exception 'v129 has not run yet: there is no jar to write';
  end if;
end $$;

/* ── the jar as it stands, shared out if a round has turned: v129's ──────── */

-- <jar_now>
create or replace function town.jar_now(p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  v_round integer := town.round_of(p_now);
  jar jsonb;
  work jsonb;
  did jsonb;
  s record;
begin
  insert into public.town_jar (round) values (v_round) on conflict (one) do nothing;
  select jsonb_build_object('round', j.round, 'coins', j.coins, 'things', j.things) into jar from public.town_jar j for update;
  if v_round <= (jar->>'round')::integer then return jar; end if;
  work := town.jar_work((jar->>'round')::integer, v_round);
  did := town.jar_settle(jar, (select coalesce(jsonb_object_agg(o.member_id::text, jsonb_build_object('coins', o.coins, 'things', o.things)), '{}'::jsonb)
                                 from public.town_jar_owed o where o.member_id::text in (select w->>0 from jsonb_array_elements(work) w)), work, v_round);
  if (did->>'shared')::boolean then
    for s in select e.key as who, e.value as mine from jsonb_each(did->'owed') e loop
      insert into public.town_jar_owed (member_id, coins, things) values (s.who::uuid, (s.mine->>'coins')::integer, s.mine->'things')
        on conflict (member_id) do update set coins = excluded.coins, things = excluded.things;
    end loop;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (null, to_timestamp(p_now / 1000.0), (jar->>'round')::integer, 'share', (jar->>'coins')::integer, jsonb_build_object('things', jar->'things', 'work', work));
  end if;
  jar := did->'jar';
  update public.town_jar j set round = (jar->>'round')::integer, coins = (jar->>'coins')::integer, things = jar->'things' where j.one;
  return jar;
end;
$$;
-- </jar_now>

/* ── a drop into the jar: v129's ─────────────────────────────────────────── */

-- <jar_drop>
create or replace function public.town_jar_drop(p_slot integer default null, p_n integer default null, p_coins integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.jar_drop(purse, jar, case when p_coins is not null then jsonb_build_object('coins', p_coins) else jsonb_build_object('slot', p_slot, 'n', p_n) end);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things' where j.one;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'drop', coalesce(p_coins, 0),
              case when p_coins is null then jsonb_build_array(jsonb_build_array(purse->'bag'->p_slot->>'item', p_n)) else '[]'::jsonb end);
    perform town.note(me, 'jar_drop', case when p_coins is null then purse->'bag'->p_slot->>'item' end, coalesce(p_n, 1), -coalesce(p_coins, 0), '{}'::jsonb);
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$$;
-- </jar_drop>

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_jar_drop(integer, integer, integer) from public, anon;
grant execute on function public.town_jar_drop(integer, integer, integer) to authenticated;

/* ── the jar, looked at once: to the round that is ───────────────────────── */

select town.jar_now(town.now_ms());

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select position('where j.one' in pg_get_functiondef('town.jar_now(bigint)'::regprocedure)) > 0 as jar_now,
--          position('where j.one' in pg_get_functiondef('public.town_jar_drop(integer, integer, integer)'::regprocedure)) > 0 as jar_drop;
--   -- t | t
--
--   select j.round = town.round_of(town.now_ms()) as at_the_round from public.town_jar j;
--   -- t
--
--   select has_function_privilege('authenticated', 'town.jar_now(bigint)', 'execute') as rule_open,
--          has_function_privilege('anon', 'public.town_jar_drop(integer, integer, integer)', 'execute') as anon_drops,
--          has_function_privilege('authenticated', 'public.town_jar_drop(integer, integer, integer)', 'execute') as members_drop;
--   -- f | f | t
