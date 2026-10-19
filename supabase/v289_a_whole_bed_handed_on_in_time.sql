-- v289: a bed full of plants handed on, or given up, in time (a member, 2026-10-19: "ไม่สามารถโอนแปลงที่มีผักอยู่ได้").
-- Run after v288. Safe to run twice. No page change.
--
-- What was wrong: town_bed_give wrote each plant of the bed anew (its `by`), and the Quality trigger (town.quality_keep)
-- takes a plant whose `by` changes for a change of its bed: it works out again the gift of every other plant in the
-- bed, at every one of them. For a full bed that is some 49 × 48 gifts, each over all its plots: seconds of work, past
-- what the database gives a member's call (the bed handed on with one plant went; a full one did not). Giving a bed up
-- did the same, a little less.
--
-- Neither changes what any plant of the bed is given by the bed: a bed handed on is the same plants in the same places,
-- and one given up has none left. So while town_bed_give and town_bed_leave write a bed's plots, they tell the trigger
-- so (`town.quality_quiet`, set for that moment of their own transaction only), and it lets each write by as it is:
-- every plant keeps its Quality and its gift as they stand. A member cannot set it: only these two functions do.
--   * town.quality_keep (v286's): its live text but for one line at its head.
--   * public.town_bed_give, public.town_bed_leave (v288's): the same, with the trigger told about their writes.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('public.town_bed_give(integer,uuid)') is null then raise exception 'Run v288 before v289'; end if;
end $$;

-- ── 1. The Quality trigger lets a whole bed's writes by, while it is told to ──────────────────────────────────────────
do $$
declare d text; was_ text := E'begin\n if tg_op=''UPDATE'' then was:=old.plant;'; now_ text := E'begin\n -- v289: a bed handed on or given up whole (town_bed_give, town_bed_leave) writes its plots with every plant\'s Quality\n -- and gift left as they stand: nothing the bed gives changes\n if current_setting(''town.quality_quiet'', true) = ''on'' then return new; end if;\n if tg_op=''UPDATE'' then was:=old.plant;';
begin
  d := replace(pg_get_functiondef('town.quality_keep()'::regprocedure), chr(13), '');
  if position('town.quality_quiet' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, was_, ''))) / length(was_) <> 1 then raise exception 'v289: town.quality_keep has not its head once: rebuild v289'; end if;
  execute replace(d, was_, now_);
end $$;

-- ── 2. The two functions tell it so, about their own writes and no others ─────────────────────────────────────────────
create or replace function public.town_bed_give(p_bed integer, p_to uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  keeping jsonb;
  planted boolean;
  plants integer;
  r record;
begin
  if p_bed is null or p_bed < 0 or p_bed >= jsonb_array_length(town.cat('farming')->'bedsAt') then return town.answer(me, town.no('none')); end if;
  if p_to is null or p_to = me or not town.is_member(p_to) then return town.answer(me, town.no('none')); end if;
  -- (both purses, made if need be and held, the lesser id first, as a deal holds them; then the bed, as a tend does)
  perform town.purse_of(least(me, p_to), true);
  perform town.purse_of(greatest(me, p_to), true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), p_bed);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = p_bed for update;
  planted := exists (select 1 from public.town_plots p where p.bed = p_bed and p.plant is not null);
  if town.owner_of(keeping, planted, now_) is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
  if town.beds_held(p_to, p_bed, now_) >= (town.cat('farming')->'beds'->>'each')::integer then return town.answer(me, town.no('beds')); end if;
  select count(*)::integer into plants from public.town_plots p
   where p.bed = p_bed and jsonb_typeof(p.plant) = 'object' and (p.plant->>'root' is null or p.plant->>'root' = p.x::text || ',' || p.y::text);
  -- (v289: the same plants in the same places: the Quality trigger is told so, and works out no gift again)
  perform set_config('town.quality_quiet', 'on', true);
  for r in select p.x, p.y from public.town_plots p where p.bed = p_bed and (jsonb_typeof(p.plant) = 'object' or jsonb_typeof(p.house) = 'object') order by p.x, p.y loop
    update public.town_plots p set
        plant = case when jsonb_typeof(p.plant) = 'object' then p.plant || jsonb_build_object('by', p_to::text) else p.plant end,
        house = case when jsonb_typeof(p.house) = 'object' then p.house || jsonb_build_object('by', p_to::text) else p.house end,
        changed = now_
     where p.x = r.x and p.y = r.y;
  end loop;
  perform set_config('town.quality_quiet', 'off', true);
  update public.town_plot_help h set owner = p_to
   where h.owner = me and exists (select 1 from public.town_plots p where p.bed = p_bed and p.x = h.x and p.y = h.y);
  update public.town_beds b set member_id = p_to, tended = now_, empty = case when planted then 0 else now_ end where b.bed = p_bed;
  perform town.note(me, 'bed_give', null, plants, 0, jsonb_build_object('bed', p_bed, 'to', p_to));
  return town.answer(me, jsonb_build_object('ok', true, 'bed', p_bed, 'plants', plants, 'beds', town.beds_told(), 'plots', town.bed_plots_told(p_bed)));
end $$;

create or replace function public.town_bed_leave(p_bed integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  purse jsonb;
  keeping jsonb;
  planted boolean;
  plants integer;
  house_ boolean;
  r record;
begin
  if p_bed is null or p_bed < 0 or p_bed >= jsonb_array_length(town.cat('farming')->'bedsAt') then return town.answer(me, town.no('none')); end if;
  purse := town.purse_of(me, true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), p_bed);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = p_bed for update;
  planted := exists (select 1 from public.town_plots p where p.bed = p_bed and p.plant is not null);
  if town.owner_of(keeping, planted, now_) is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
  house_ := exists (select 1 from public.town_plots p where p.bed = p_bed and p.house is not null);
  if house_ and town.room(purse->'bag', 'insectHouse') < 1 then return town.answer(me, town.no('full')); end if;
  select count(*)::integer into plants from public.town_plots p
   where p.bed = p_bed and jsonb_typeof(p.plant) = 'object' and (p.plant->>'root' is null or p.plant->>'root' = p.x::text || ',' || p.y::text);
  -- (written, not deleted: a page is told the plots that changed since it last asked; one at a time; v289: every
  -- plant of the bed goes, so the Quality trigger is told to work out no gift of those left a moment longer)
  perform set_config('town.quality_quiet', 'on', true);
  for r in select p.x, p.y from public.town_plots p where p.bed = p_bed and (p.plant is not null or p.house is not null) order by p.x, p.y loop
    update public.town_plots p set
        plant = null,
        house = null,
        soil = case when p.house is not null then 'tilled' else p.soil end,
        changed = now_
     where p.x = r.x and p.y = r.y;
  end loop;
  perform set_config('town.quality_quiet', 'off', true);
  delete from public.town_plot_help h where exists (select 1 from public.town_plots p where p.bed = p_bed and p.x = h.x and p.y = h.y);
  delete from public.town_beds b where b.bed = p_bed;
  if house_ then perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put(purse->'bag', 'insectHouse', 1))); end if;
  perform town.note(me, 'bed_leave', null, plants, 0, jsonb_build_object('bed', p_bed, 'house', house_));
  return town.answer(me, jsonb_build_object('ok', true, 'bed', p_bed, 'plants', plants, 'beds', town.beds_told(), 'plots', town.bed_plots_told(p_bed)));
end $$;

revoke all on function public.town_bed_give(integer, uuid), public.town_bed_leave(integer) from public, anon;
grant execute on function public.town_bed_give(integer, uuid), public.town_bed_leave(integer) to authenticated;
commit;

-- After it has run, in the SQL editor (answers true):
--   select position('town.quality_quiet' in pg_get_functiondef('town.quality_keep()'::regprocedure)) > 0;
