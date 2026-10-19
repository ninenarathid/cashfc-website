-- v288: a bed's owner hands it on or gives it up (the owner, 2026-10-19: "ช่วยทำให้แปลงปลูกผัก เจ้าของสามารถจัดการได้
-- ย้ายสิทธิให้คนอื่น (คนนั้นต้องมีไม่เกิน 2 หลังจากแลก) ยกเลิกแปลงตัวเองได้ ผักทั้งหมด จะหายไป ขึ้นเตือนก่อนด้วย ให้กด
-- ยืนยันทุกครั้ง"; and, asked: the plants go with a bed handed on, to somebody standing near, and an insect house in a bed
-- given up goes back into its owner's bag). lib/town/bed-hand's rules.
--
-- Run after v287. Safe to run twice. Nothing but two new functions a member calls; no table, no catalog row, nothing of
-- anybody else's changed. Either order with the page: the page's buttons ask these, and before this has run they are
-- refused ('none') and nothing happens.
--
--   * public.town_bed_give(p_bed, p_to): my bed (as town_tend holds a bed to be: town.owner_of) to another member who
--     holds fewer than farming.beds.each other beds (as town_tend counts them); every plant in it and its insect house
--     become theirs, each kept as it is but for `by` (its Quality, its house's rooms and keep go with it: `||`, never
--     rebuilt), the help kept on its plants for my thanks becomes theirs to thank, and the bed is theirs from now. How
--     near they stand is the page's to hold to (the database cannot know where anybody stands), as a deal's opening is.
--   * public.town_bed_leave(p_bed): my bed; every plant in it is gone (each plot left as its soil is, written, not
--     deleted, so that every page hears of it), its insect house lifted into my bag (its rooms' insects gone, as at a
--     lifting; refused 'full' with no room), the help on its plants forgotten, and the bed nobody's.
-- Each takes the bed's lock as a tend does, and the giver's and the taker's purses in the order of their ids.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.well_by(integer,integer)') is null then raise exception 'Run v287 before v288'; end if;
end $$;

-- The plots of a bed as a page is told them (town_farm's shape), and every bed (its `beds`).
create or replace function town.bed_plots_told(p_bed integer)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text,
           jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))
           || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end
           || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
    from public.town_plots p where p.bed = p_bed
$$;
create or replace function town.beds_told()
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b
$$;
-- How many beds a member holds now, but one (town_tend's count).
create or replace function town.beds_held(p_member uuid, p_but integer, p_now bigint)
returns integer language sql stable set search_path = '' as $$
  select count(*)::integer from public.town_beds b
   where b.member_id = p_member and b.bed <> p_but
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), p_now) is not null
$$;
revoke all on function town.bed_plots_told(integer), town.beds_told(), town.beds_held(uuid, integer, bigint) from public, anon, authenticated;

create or replace function public.town_bed_give(p_bed integer, p_to uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  keeping jsonb;
  planted boolean;
  plants integer;
  held uuid;
begin
  if p_bed is null or p_bed < 0 or p_bed >= jsonb_array_length(town.cat('farming')->'bedsAt') then return town.answer(me, town.no('none')); end if;
  if p_to is null or p_to = me or not town.is_member(p_to) then return town.answer(me, town.no('none')); end if;
  -- (both purses, in the order of their ids, as a deal holds them; then the bed, as a tend does)
  for held in select pp.member_id from public.town_purses pp where pp.member_id in (me, p_to) order by pp.member_id for update loop null; end loop;
  perform pg_advisory_xact_lock(hashtext('town.bed'), p_bed);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = p_bed for update;
  planted := exists (select 1 from public.town_plots p where p.bed = p_bed and p.plant is not null);
  if town.owner_of(keeping, planted, now_) is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
  if town.beds_held(p_to, p_bed, now_) >= (town.cat('farming')->'beds'->>'each')::integer then return town.answer(me, town.no('beds')); end if;
  select count(*)::integer into plants from public.town_plots p
   where p.bed = p_bed and jsonb_typeof(p.plant) = 'object' and (p.plant->>'root' is null or p.plant->>'root' = p.x::text || ',' || p.y::text);
  update public.town_plots p set
      plant = case when jsonb_typeof(p.plant) = 'object' then p.plant || jsonb_build_object('by', p_to::text) else p.plant end,
      house = case when jsonb_typeof(p.house) = 'object' then p.house || jsonb_build_object('by', p_to::text) else p.house end,
      changed = now_
   where p.bed = p_bed and (jsonb_typeof(p.plant) = 'object' or jsonb_typeof(p.house) = 'object');
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
begin
  if p_bed is null or p_bed < 0 or p_bed >= jsonb_array_length(town.cat('farming')->'bedsAt') then return town.answer(me, town.no('none')); end if;
  perform 1 from public.town_purses pp where pp.member_id = me for update;
  purse := town.purse_of(me, true);
  perform pg_advisory_xact_lock(hashtext('town.bed'), p_bed);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = p_bed for update;
  planted := exists (select 1 from public.town_plots p where p.bed = p_bed and p.plant is not null);
  if town.owner_of(keeping, planted, now_) is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
  house_ := exists (select 1 from public.town_plots p where p.bed = p_bed and p.house is not null);
  if house_ and town.room(purse->'bag', 'insectHouse') < 1 then return town.answer(me, town.no('full')); end if;
  select count(*)::integer into plants from public.town_plots p
   where p.bed = p_bed and jsonb_typeof(p.plant) = 'object' and (p.plant->>'root' is null or p.plant->>'root' = p.x::text || ',' || p.y::text);
  -- (written, not deleted: a page is told the plots that changed since it last asked)
  update public.town_plots p set
      plant = null,
      house = null,
      soil = case when p.house is not null then 'tilled' else p.soil end,
      changed = now_
   where p.bed = p_bed and (p.plant is not null or p.house is not null);
  delete from public.town_plot_help h where exists (select 1 from public.town_plots p where p.bed = p_bed and p.x = h.x and p.y = h.y);
  delete from public.town_beds b where b.bed = p_bed;
  if house_ then perform town.keep_purse(me, purse || jsonb_build_object('bag', town.put(purse->'bag', 'insectHouse', 1))); end if;
  perform town.note(me, 'bed_leave', null, plants, 0, jsonb_build_object('bed', p_bed, 'house', house_));
  return town.answer(me, jsonb_build_object('ok', true, 'bed', p_bed, 'plants', plants, 'beds', town.beds_told(), 'plots', town.bed_plots_told(p_bed)));
end $$;

revoke all on function public.town_bed_give(integer, uuid), public.town_bed_leave(integer) from public, anon;
grant execute on function public.town_bed_give(integer, uuid), public.town_bed_leave(integer) to authenticated;
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select to_regprocedure('public.town_bed_give(integer,uuid)') is not null, to_regprocedure('public.town_bed_leave(integer)') is not null;   -- true, true
