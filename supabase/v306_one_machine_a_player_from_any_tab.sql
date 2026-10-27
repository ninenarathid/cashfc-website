-- v306 — one machine a player, even from two tabs at once (2026-10-27)
-- Run once in the Supabase SQL editor, after v305. Running it again is safe. Nothing on the page changes with it.
--
-- Codex's check of v305: two tabs of one player sitting down at two machines at the same moment could each hold one
-- (the machine's own lock is per machine, and neither saw the other's seat yet), keeping both from everybody else for a
-- minute. Now sitting down holds the player's own row first, as a spin already does, so the two take turns and the
-- second lets the first's machine go; and the table keeps one seat a player (a unique index), the newest kept of any
-- two already there.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('public.casino_live_seat(integer)') is null then raise exception 'Run v305 before v306'; end if;
end $$;

-- (a player's older seats beyond the newest let go, then one a player for good)
delete from public.casino_live_seats x using public.casino_live_seats y
  where x.user_id = y.user_id and (x.at, x.machine) < (y.at, y.machine);
create unique index if not exists casino_live_seats_one_a_player on public.casino_live_seats (user_id);
drop index if exists public.casino_live_seats_user;

create or replace function public.casino_live_seat(p_machine integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; seat_ public.casino_live_seats; now_ timestamptz := clock_timestamp();
begin
  if p_machine is null then delete from public.casino_live_seats where user_id = me; return jsonb_build_object('ok', true); end if;
  if p_machine not between 1 and 10 then return jsonb_build_object('ok', false, 'why', 'machine'); end if;
  select * into s from public.casino_live_settings where id = 1 for share;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  -- (my own row held first, as a spin holds it: two tabs of mine sitting down at once take turns, and the second lets the
  -- first's machine go)
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  perform 1 from public.casino_live_accounts where user_id = me for update;
  -- (two sitting down at one machine at once: the second waits here, then finds it held)
  perform pg_advisory_xact_lock(hashtext('casino_live_seat'), p_machine);
  select * into seat_ from public.casino_live_seats where machine = p_machine;
  if found and seat_.user_id <> me and seat_.at > now_ - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'why', 'taken',
      'name', (select coalesce(p.character_name, p.display_name, p.discord_username, 'ผู้เล่น') from public.profiles p where p.id = seat_.user_id));
  end if;
  delete from public.casino_live_seats where user_id = me and machine <> p_machine;
  insert into public.casino_live_seats (machine, user_id, at) values (p_machine, me, now_)
    on conflict (machine) do update set user_id = excluded.user_id, at = excluded.at;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.casino_live_seat(integer) from public, anon;
grant execute on function public.casino_live_seat(integer) to authenticated;
commit;

-- What it should say afterwards (read only):
--   select count(*) - count(distinct user_id) from public.casino_live_seats;               → 0
