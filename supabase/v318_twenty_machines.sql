-- v318: twenty machines in the Popoto Casino (the owner, 2026-10-31: "เพิ่มตอนนี้เลยเป็น 20 เครื่อง โดยขยายเพิ่มด้านลึก").
-- The room goes back behind where its wall stood and a second row stands there, 11 to 20; machines 1 to 10 stay where they
-- are. The database knows only how many there are: the two tables' checks, the seat and the spin, and "all taken", which is
-- what a turn at a machine waits for (v314). Nothing else changes, no row is touched, and a page from before this file
-- goes on working with its ten. Run it before the page with twenty goes live: until it has run, 11 to 20 refuse to seat.
-- Running it again changes nothing.

alter table public.casino_live_spins drop constraint if exists casino_live_spins_machine_check;
alter table public.casino_live_spins add constraint casino_live_spins_machine_check check (machine between 1 and 20);
alter table public.casino_live_seats drop constraint if exists casino_live_seats_machine_check;
alter table public.casino_live_seats add constraint casino_live_seats_machine_check check (machine between 1 and 20);

do $$
declare c text[]; d text; n integer;
begin
  foreach c slice 1 in array array[
    ['casino.machines_full(timestamptz)', 'select count(*) >= 10 from public.casino_live_seats', 'select count(*) >= 20 from public.casino_live_seats'],
    ['public.casino_live_seat(integer)', 'if p_machine not between 1 and 10 then', 'if p_machine not between 1 and 20 then'],
    ['public.casino_live_spin(uuid,integer,text,bigint)', 'p_machine not between 1 and 10 or', 'p_machine not between 1 and 20 or']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (made already, on a run before)
    continue when position(c[3] in d) > 0;
    n := (length(d) - length(replace(d, c[2], ''))) / length(c[2]);
    if n = 1 then execute replace(d, c[2], c[3]);
    else raise exception 'v318: % has % of [%], not 1: nothing changed', c[1], n, c[2]; end if;
  end loop;
end $$;

-- (pages reread the casino)
select casino.hint('changed', '{}'::jsonb);

-- Afterwards, one row, all true:
--   select pg_get_constraintdef(oid) like '%20%' as spins from pg_constraint where conname = 'casino_live_spins_machine_check';
--   select position('>= 20' in pg_get_functiondef('casino.machines_full(timestamptz)'::regprocedure)) > 0 as full,
--          position('between 1 and 20' in pg_get_functiondef('public.casino_live_seat(integer)'::regprocedure)) > 0 as seat,
--          position('between 1 and 20' in pg_get_functiondef('public.casino_live_spin(uuid,integer,text,bigint)'::regprocedure)) > 0 as spin;
