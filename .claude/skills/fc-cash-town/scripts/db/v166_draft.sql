-- v166 — every go at a board, whatever its end
--
-- Run this once in the Supabase SQL editor, after v165 (it stands on v115's
-- `town.member`, v106's clock and v123's `town.under`, and on nothing of
-- v160 to v164, which may run before it or after it). Running it again is
-- safe. The site's code for it may be live before this runs or after: until
-- it has run, a page that tells of a go is answered nothing three times and
-- then stops telling.
--
-- Why. The owner, 2026-10-09, after every game of the town had been played
-- by made-up hands and scored, and the made-up hands had turned out
-- clumsier than the members who really play:
--
--   "ช่วยแก้เรื่อง บอตมือแย่กว่าสมาชิกจริง ด้วย
--    ทำข้อ 1 ก่อน แล้วนำข้อมูลมาดูกัน"
--
-- (ข้อ 1: write down what is written nowhere.) What is kept of a go today is
-- kept with its deed: `town_plays` for the hoe, the pot and the line,
-- `town_deeds` for the forest and the net. So a go has a line only when the
-- work came off. A board that tired hands dropped, a board its member shut,
-- a throw not caught, an insect that fled: none of these is anywhere; and a
-- tired pour or a steadied hand that did come off has its deed's line with
-- nothing of the board in it. So nobody can say how often a game is lost or
-- given up, and that is what a game's numbers ought to be set by.
--
-- What it adds.
--
--   · `town_tries`: a line for every go at a board as the member's page saw
--     it end: the line of work, the board, what was worked at, how it ended
--     (done; dropped: the board was lost; left: its member shut it), whether
--     it was played with no stamina, and the board's own count (how many it
--     wanted, hits, misses, seconds). Closed, as `town_plays` is: no browser
--     reads it or writes it.
--   · `town_try(...)`: what a member's page calls when a board ends. It
--     answers whether the line was kept, and nothing waits for the answer.
--   · `town.tries_tally(from, to)`: the lines counted by board and by
--     whether the hands were tired. For the SQL editor, in the schema no
--     browser reaches.
--
-- What it is not. Nothing hangs on a line here: no rank, no point, no coin,
-- no deed. The triggers that read `town_plays` and `town_deeds` do not read
-- this table, and no rule does. So what the page says is believed, as a
-- go's `claims` are, and bounded. A member who made lines up would gain
-- nothing and could spoil only the count, which is why one member leaves no
-- more than forty lines a minute. Fishing is not here: every end of a line
-- in the water is the database's own already (`town_plays`). Nothing that
-- was there is written again; no row, no knob.

do $$ begin
  if to_regprocedure('town.member()') is null or to_regprocedure('town.now_ms()') is null or to_regprocedure('town.under(uuid)') is null then
    raise exception 'v166 stands on the town''s members, its clock and its blessings (v106, v115, v123): run those first';
  end if;
end $$;

-- ─── 1. The lines ────────────────────────────────────────────────────────

create table if not exists public.town_tries (
  id         bigint generated always as identity primary key,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  at         timestamptz not null default now(),
  -- The line of work, the board it was played on (none where the work had
  -- no board), and what was worked at: a deed, a dish, a kind of place, an
  -- insect.
  game       text not null check (game in ('farming', 'cooking', 'forest', 'insects')),
  board      text check (board is null or board ~ '^[a-z]{1,16}$'),
  what       text not null check (what ~ '^[A-Za-z][A-Za-z0-9_]{0,47}$'),
  how        text not null check (how in ('done', 'dropped', 'left')),
  -- Played with no stamina left; and the board's own count.
  spent      boolean not null,
  need       integer not null check (need between 0 and 1000),
  hits       integer not null check (hits between 0 and 1000),
  misses     integer not null check (misses between 0 and 1000),
  secs       real not null check (secs >= 0 and secs <= 3600),
  -- The blessings it was played under, as a play's and a deed's lines have them.
  doc        jsonb not null default '{}'::jsonb
);

-- (whose lines, newest first: what the forty a minute are counted by, and what goes with a member who leaves)
create index if not exists town_tries_member on public.town_tries (member_id, at desc);

alter table public.town_tries enable row level security;
revoke all on public.town_tries from anon, authenticated;

-- ─── 2. What a member's page calls ───────────────────────────────────────

-- A go at a board, as the page saw it end. A word that is no board's (a
-- line of work there is not, an end there is not, a name with anything but
-- letters in it) keeps nothing and says only that; the numbers are brought
-- inside what a board can count, as a go's claims are.
create or replace function public.town_try(p_game text, p_board text, p_what text, p_how text, p_spent boolean,
  p_need integer default 0, p_hits integer default 0, p_misses integer default 0, p_secs double precision default 0)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  at_ timestamptz := to_timestamp(town.now_ms() / 1000.0);
  lately integer;
begin
  if p_game is null or p_game not in ('farming', 'cooking', 'forest', 'insects')
     or p_how is null or p_how not in ('done', 'dropped', 'left')
     or p_what is null or p_what !~ '^[A-Za-z][A-Za-z0-9_]{0,47}$'
     or (p_board is not null and p_board !~ '^[a-z]{1,16}$') then
    return false;
  end if;
  -- (the quickest board there is ends in about a second: forty in a minute is more than hands make)
  select count(*)::int into lately from public.town_tries t where t.member_id = me and t.at > at_ - interval '1 minute';
  if lately >= 40 then return false; end if;
  insert into public.town_tries (member_id, at, game, board, what, how, spent, need, hits, misses, secs, doc)
  values (me, at_, p_game, p_board, p_what, p_how, coalesce(p_spent, false),
    least(greatest(coalesce(p_need, 0), 0), 1000), least(greatest(coalesce(p_hits, 0), 0), 1000), least(greatest(coalesce(p_misses, 0), 0), 1000),
    least(greatest(coalesce(p_secs, 0), 0), 3600)::real, town.under(me));
  return true;
end;
$$;

-- ─── 3. The count, for the SQL editor ────────────────────────────────────

-- Each board, fed and tired apart: how many goes by how many members, how
-- they ended, how many in a hundred came off, the misses a go that was
-- played to an end, and the seconds half of the goes that came off took.
create or replace function town.tries_tally(p_from timestamptz default now() - interval '7 days', p_to timestamptz default now())
returns table (game text, board text, tired boolean, goes bigint, members bigint, done bigint, dropped bigint, given_up bigint, done_in_100 numeric, misses_a_go numeric, half_secs numeric)
language sql stable set search_path = public
as $$
  select t.game, coalesce(t.board, '-'), t.spent, count(*), count(distinct t.member_id),
         count(*) filter (where t.how = 'done'), count(*) filter (where t.how = 'dropped'), count(*) filter (where t.how = 'left'),
         round(100.0 * count(*) filter (where t.how = 'done') / count(*), 0),
         round(avg(t.misses) filter (where t.how <> 'left'), 2),
         round((percentile_cont(0.5) within group (order by t.secs) filter (where t.how = 'done'))::numeric, 1)
    from public.town_tries t
   where t.at >= p_from and t.at < p_to
   group by t.game, coalesce(t.board, '-'), t.spent
   order by 1, 2, 3
$$;

-- ─── 4. Who may call what ────────────────────────────────────────────────

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_try(text, text, text, text, boolean, integer, integer, integer, double precision) from public, anon;
grant execute on function public.town_try(text, text, text, text, boolean, integer, integer, integer, double precision) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
-- select c.relrowsecurity as closed,
--        has_table_privilege('authenticated', 'public.town_tries', 'select') as member_reads,
--        has_table_privilege('authenticated', 'public.town_tries', 'insert') as member_writes,
--        has_table_privilege('anon', 'public.town_tries', 'select') as anon_reads
--   from pg_class c where c.oid = 'public.town_tries'::regclass;
--   closed | member_reads | member_writes | anon_reads
--   t      | f            | f             | f
--
-- select has_function_privilege('anon', 'public.town_try(text, text, text, text, boolean, integer, integer, integer, double precision)', 'execute') as anon,
--        has_function_privilege('authenticated', 'public.town_try(text, text, text, text, boolean, integer, integer, integer, double precision)', 'execute') as member,
--        has_function_privilege('authenticated', 'town.tries_tally(timestamptz, timestamptz)', 'execute') as the_tally;
--   anon | member | the_tally
--   f    | t      | f
--
-- select count(*) from public.town_tries;
--   0     (and more as soon as a member whose page has the new code ends a board)
--
-- select * from town.tries_tally();
--   no line at first; then a line for each board, fed and tired apart, of the last seven days
