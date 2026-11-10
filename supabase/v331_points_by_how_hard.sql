-- v331 — party finder event points by how hard the room was
--
-- Run this once in the Supabase SQL editor, after v320. Running it again is
-- safe.
--
-- The owner, 2026-11-10: rooms of Duty Roulette were being opened one after
-- another for points, and earned what a cleared Extreme earns, which makes no
-- sense. He chose this (plan ข):
--
--   * a room is worth points by its kind: general content 1, Alliance and
--     Criterion 2, Extreme and Chaotic 3, Savage 4, Ultimate 6 — kept on the
--     event as kind_points, so Aqua can change any of them;
--   * a hard room that was not cleared but lasted 15 minutes and more is
--     practice: Aqua says so with her own verdict, worth practice_points;
--   * per person and Bangkok day, at most easy_cap rooms worth 1 point count,
--     and at most practice_cap practice rooms; the day's cap of points stays;
--   * a helper of a listed new player gets helper_bonus on top of the room.
--
-- Every existing event takes the defaults the moment this runs, and its
-- verdicts stand: an "ok" on a hard room is a clear.
--
-- Admins write these as they write the rest of pf_events (v320's policies);
-- they are read with the event, published or not, as its other settings are.

/* ── practice, as a verdict ──────────────────────────────────────────────── */

alter table public.pf_event_reviews drop constraint if exists pf_event_reviews_verdict_check;
alter table public.pf_event_reviews add constraint pf_event_reviews_verdict_check
  check (verdict in ('ok', 'practice', 'no'));

/* ── what each room is worth ─────────────────────────────────────────────── */

-- Only the kinds lib/party.ts knows, each a whole number 0 to 20. Kinds left
-- out are worth 1. Immutable, so a check may call it.
create or replace function public.pf_points_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'object'
     and pg_column_size(p) <= 2048
     and not exists (
       select 1 from jsonb_each(p) e
        where e.key <> all (array['extreme','savage','ultimate','alliance','chaotic',
                                  'treasure','fate','hunt','criterion','pvp','community',
                                  'field','dungeon','mentor','roulette','legacy','other'])
           or jsonb_typeof(e.value) <> 'number'
           or (e.value)::text::numeric not between 0 and 20
           or (e.value)::text::numeric <> trunc((e.value)::text::numeric)
     )
$$;

-- A check runs as whoever writes the row, so the writers keep EXECUTE.
revoke execute on function public.pf_points_ok(jsonb) from public, anon;
grant execute on function public.pf_points_ok(jsonb) to authenticated;

alter table public.pf_events add column if not exists kind_points jsonb not null
  default '{"alliance":2,"criterion":2,"extreme":3,"chaotic":3,"savage":4,"ultimate":6}'::jsonb;
alter table public.pf_events add column if not exists easy_cap int not null default 3;
alter table public.pf_events add column if not exists practice_points int not null default 1;
alter table public.pf_events add column if not exists practice_cap int not null default 1;
alter table public.pf_events add column if not exists helper_bonus int not null default 1;

alter table public.pf_events drop constraint if exists pf_events_points_ok;
alter table public.pf_events add constraint pf_events_points_ok check (
  public.pf_points_ok(kind_points)
  and easy_cap between 0 and 50
  and practice_points between 0 and 20
  and practice_cap between 0 and 50
  and helper_bonus between 0 and 10
);

-- Column grants, as v320 gave the event's other settings: read by whoever may
-- read the event, written by the admins the policies let through.
grant select (kind_points, easy_cap, practice_points, practice_cap, helper_bonus)
  on public.pf_events to anon, authenticated;
grant insert (kind_points, easy_cap, practice_points, practice_cap, helper_bonus)
  on public.pf_events to authenticated;
grant update (kind_points, easy_cap, practice_points, practice_cap, helper_bonus)
  on public.pf_events to authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select id, title, kind_points, easy_cap, practice_points, practice_cap, helper_bonus
  from public.pf_events order by id;
--  4 | Let's GO Party | {"savage": 4, "chaotic": 3, "extreme": 3, "alliance": 2,
--                        "ultimate": 6, "criterion": 2} | 3 | 1 | 1 | 1

select pg_get_constraintdef(oid) from pg_constraint
 where conname = 'pf_event_reviews_verdict_check';
--  CHECK ((verdict = ANY (ARRAY['ok'::text, 'practice'::text, 'no'::text])))

select verdict, count(*) from public.pf_event_reviews group by 1 order by 1;
--  (the verdicts Aqua has given so far, unchanged)

──────────────────────────────────────────────────────────────────────────── */
