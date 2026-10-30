-- v314 — a machine's turn when all ten are taken; free Casino Coins for an event that end by themselves (2026-10-31)
-- Run once in the Supabase SQL editor, after v312 and after the page that goes with it is live. Running it again is safe.
--
-- For Aqua's event of 2026-10-31, 19:00 to 21:00. The owner, of what was laid before him ("5 6 8 เอาหมด", "แจก 1000 เฉพาะวันกิจกรรม"):
--   * Ten machines, no queue, and eighteen members with coins for a hundred spins and more: one of them could sit for the
--     whole two hours while somebody with ten free spins found no seat. So, only while ALL TEN are taken, whoever has sat
--     at a machine for a whole turn (`seat_turn_s`, 300) gets up at their next pull: no spin, no coins taken ('Turn over'),
--     and a rest (`seat_rest_s`, 60) before sitting anywhere again. With a machine free nobody is moved, and spins stay
--     unlimited ("หมุนกี่ครั้งก็ได้ ไม่จำกัด"). 0 in `seat_turn_s` turns it off, without any SQL.
--   * `free_event_chips` until `free_event_until` take the place of `free_chips` at the counter, so that an event's free
--     coins end by themselves and nobody has to remember to put them back. This file sets neither: they are the desk's
--     values, set with the service key once this has run.
--
-- The free claim and the spin are changed by their live text, as v312 did; the seat is written whole (v306's, changed nowhere since).
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $guard$ begin
  if to_regprocedure('public.casino_live_seat(integer)') is null or to_regprocedure('public.casino_live_cashout(uuid,integer)') is null
     or to_regprocedure('public.casino_live_free()') is null or to_regprocedure('public.casino_live_spin(uuid,integer,text,bigint)') is null then
    raise exception 'v314: run the casino''s migrations to v312 first';
  end if;
end $guard$;

-- ── 1. The knobs, when a turn began, and a rest ──
alter table public.casino_live_settings add column if not exists seat_turn_s integer not null default 300;
alter table public.casino_live_settings add column if not exists seat_rest_s integer not null default 60;
alter table public.casino_live_settings add column if not exists free_event_chips integer not null default 0;
alter table public.casino_live_settings add column if not exists free_event_until timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'casino_live_settings_turn_check') then
    alter table public.casino_live_settings add constraint casino_live_settings_turn_check
      check (seat_turn_s >= 0 and seat_rest_s >= 0 and free_event_chips >= 0);
  end if;
end $$;
alter table public.casino_live_seats add column if not exists since timestamptz not null default now();
alter table public.casino_live_accounts add column if not exists seat_rest_until timestamptz;

-- (every machine held: as the state counts a seat, a minute from a spin or from sitting down)
create or replace function casino.machines_full(p_now timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) >= 10 from public.casino_live_seats x where x.at > p_now - interval '60 seconds'
$$;
-- (what the counter gives today: the event's while it lasts)
create or replace function casino.free_chips_now(s public.casino_live_settings)
returns integer language sql stable security definer set search_path = '' as $$
  select case when s.free_event_until is not null and now() < s.free_event_until then s.free_event_chips else s.free_chips end
$$;
revoke all on function casino.machines_full(timestamptz), casino.free_chips_now(public.casino_live_settings) from public, anon, authenticated;

-- ── 2. Sitting down and getting up ──
create or replace function public.casino_live_seat(p_machine integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := town.member(); s public.casino_live_settings; seat_ public.casino_live_seats; now_ timestamptz := clock_timestamp();
  rest_ timestamptz;
begin
  if p_machine is null then
    -- (letting go after a whole turn with all ten taken: a rest before sitting again, or the turn would be nothing)
    select * into s from public.casino_live_settings where id = 1;
    select * into seat_ from public.casino_live_seats where user_id = me;
    if found and s.seat_turn_s > 0 and seat_.since <= now_ - make_interval(secs => s.seat_turn_s) and casino.machines_full(now_) then
      update public.casino_live_accounts set seat_rest_until = now_ + make_interval(secs => s.seat_rest_s) where user_id = me;
    end if;
    delete from public.casino_live_seats where user_id = me;
    return jsonb_build_object('ok', true);
  end if;
  if p_machine not between 1 and 10 then return jsonb_build_object('ok', false, 'why', 'machine'); end if;
  select * into s from public.casino_live_settings where id = 1 for share;
  if not casino.chips_let_in(s) then return jsonb_build_object('ok', false, 'why', 'closed'); end if;
  -- (my own row held first, as a spin holds it: two tabs of mine sitting down at once take turns, and the second lets the
  -- first's machine go)
  insert into public.casino_live_accounts (user_id) values (me) on conflict do nothing;
  select a.seat_rest_until into rest_ from public.casino_live_accounts a where a.user_id = me for update;
  if rest_ > now_ then return jsonb_build_object('ok', false, 'why', 'rest', 'seconds', ceil(extract(epoch from rest_ - now_))::integer); end if;
  -- (two sitting down at one machine at once: the second waits here, then finds it held)
  perform pg_advisory_xact_lock(hashtext('casino_live_seat'), p_machine);
  select * into seat_ from public.casino_live_seats where machine = p_machine;
  if found and seat_.user_id <> me and seat_.at > now_ - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'why', 'taken', 'full', casino.machines_full(now_),
      'name', (select coalesce(p.character_name, p.display_name, p.discord_username, 'ผู้เล่น') from public.profiles p where p.id = seat_.user_id));
  end if;
  delete from public.casino_live_seats where user_id = me and machine <> p_machine;
  -- (the turn goes on while I hold this machine; a machine that was somebody else's, or let lapse, is a new one)
  insert into public.casino_live_seats (machine, user_id, at, since) values (p_machine, me, now_, now_)
    on conflict (machine) do update set
      since = case when casino_live_seats.user_id = excluded.user_id and casino_live_seats.at > now_ - interval '60 seconds' then casino_live_seats.since else excluded.since end,
      user_id = excluded.user_id, at = excluded.at;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.casino_live_seat(integer) from public, anon;
grant execute on function public.casino_live_seat(integer) to authenticated;

-- ── 3. The free claim and the spin: their live text, but for these lines ──
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['public.casino_live_free()',
     'if s.free_chips < 1 then return jsonb_build_object(''ok'', false, ''why'', ''off''); end if;',
     '-- (v314: an event''s free coins while it lasts; nothing is written back to the settings)
  s.free_chips := casino.free_chips_now(s);
  if s.free_chips < 1 then return jsonb_build_object(''ok'', false, ''why'', ''off''); end if;'],
    ['public.casino_live_spin(uuid,integer,text,bigint)',
     'if found and seat_.user_id <> me and seat_.at > now_ - interval ''60 seconds'' then raise exception ''Machine taken''; end if;',
     'if found and seat_.user_id <> me and seat_.at > now_ - interval ''60 seconds'' then raise exception ''Machine taken''; end if;
  -- (v314: a whole turn with all ten taken: up at this pull, nothing taken; the page lets the machine go, which begins the rest)
  if found and seat_.user_id = me and seat_.at > now_ - interval ''60 seconds'' and s.seat_turn_s > 0
     and seat_.since <= now_ - make_interval(secs => s.seat_turn_s) and casino.machines_full(now_) then raise exception ''Turn over''; end if;
  if a.seat_rest_until > now_ then raise exception ''Resting''; end if;'],
    ['public.casino_live_spin(uuid,integer,text,bigint)',
     'insert into public.casino_live_seats (machine, user_id, at) values (p_machine, me, now_)
    on conflict (machine) do update set user_id = excluded.user_id, at = excluded.at;',
     'insert into public.casino_live_seats (machine, user_id, at, since) values (p_machine, me, now_, now_)
    on conflict (machine) do update set
      since = case when casino_live_seats.user_id = excluded.user_id and casino_live_seats.at > now_ - interval ''60 seconds'' then casino_live_seats.since else excluded.since end,
      user_id = excluded.user_id, at = excluded.at;']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v314: % has % of [%], not 1: rebuild v314', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select seat_turn_s, seat_rest_s, free_event_chips, free_event_until from public.casino_live_settings where id = 1;
--   → 300, 60, 0, null   (until the event's values are set with the service key)
--   select position('Turn over' in pg_get_functiondef('public.casino_live_spin(uuid,integer,text,bigint)'::regprocedure)) > 0 as spin,
--          position('since' in pg_get_functiondef('public.casino_live_spin(uuid,integer,text,bigint)'::regprocedure)) > 0 as spin_since,
--          position('free_chips_now' in pg_get_functiondef('public.casino_live_free()'::regprocedure)) > 0 as free,
--          position('seat_rest_until' in pg_get_functiondef('public.casino_live_seat(integer)'::regprocedure)) > 0 as seat;
--   → true, true, true, true
