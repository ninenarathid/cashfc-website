-- v308 — what I won at the casino today (2026-10-27)
-- Run once in the Supabase SQL editor, after v306 (v307 is another piece of work: either order). Running it again is
-- safe. It reads only; nothing in the database changes.
--
-- The owner: "รู้สึกดูกระเป๋าตังค์ตัวเองยากว่าชนะอะไรไปแล้วบ้าง", then of the mock ("ของฉัน": a button in the casino's corner,
-- today's count and what I won, a "+N" by the Casino Coin count): "ทำเลย". The page holds only the room's latest spins,
-- so today's own count comes from here: public.casino_live_mine() answers, for the member asking, the town day (from
-- 05:00 Bangkok, town.day_of, as the free Casino Coins go by) — how many spins, the Casino Coins they cost, the Casino
-- Coins they brought back, how many won anything — and the newest thirty that won, each with its machine, its faces,
-- its prize and when. Only spins whose reels have stopped (reveal_at passed): a spin still turning tells nothing.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('public.casino_live_seat(integer)') is null then raise exception 'Run v305 before v308'; end if;
  if to_regprocedure('town.day_of(bigint)') is null or to_regprocedure('casino.require_live_member()') is null then
    raise exception 'v308: the town''s day (town.day_of) or the casino''s member check is missing';
  end if;
end $$;

create or replace function public.casino_live_mine()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := casino.require_live_member(); today_ integer := town.day_of(town.now_ms()); result jsonb;
begin
  -- (a town day is at most a day and a little: the index on the player and the time keeps it to the last thirty hours)
  with mine as (
    select s.id, s.machine, s.price, s.reels, s.prize, s.reveal_at
      from public.casino_live_spins s
     where s.user_id = me and s.created_at > now() - interval '30 hours' and s.reveal_at <= now()
       and town.day_of((extract(epoch from s.created_at) * 1000)::bigint) = today_)
  select jsonb_build_object('ok', true, 'day', today_,
      'spins', count(*), 'spent', coalesce(sum(m.price), 0),
      'back', coalesce(sum((m.prize->>'amount')::bigint) filter (where m.prize->>'kind' = 'coin'), 0),
      'wins', count(*) filter (where m.prize is not null),
      'won', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'machine', w.machine, 'reels', w.reels, 'prize', w.prize, 'at', w.reveal_at) order by w.reveal_at desc)
                         from (select * from mine x where x.prize is not null order by x.reveal_at desc limit 30) w), '[]'::jsonb))
    into result from mine m;
  return result;
end $$;

revoke all on function public.casino_live_mine() from public, anon;
grant execute on function public.casino_live_mine() to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select has_function_privilege('anon', 'public.casino_live_mine()', 'EXECUTE') as anon_may,
--          has_function_privilege('authenticated', 'public.casino_live_mine()', 'EXECUTE') as members_may;
--   → false, true
