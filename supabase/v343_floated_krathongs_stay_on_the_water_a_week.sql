-- v343: the floated krathongs stay on the town's water a week after the float closes (Cash Town)
--
-- The owner, 2026-11-24: "ผมอยากให้มัน ลอยๆ อยู่ซัก 1 อาทิตย์ หลังจากหมด กิจกรรม". Until now the river was read
-- only while the float was open (to 26 Nov 05:00 Bangkok); then every krathong left the water at once.
--
-- 1. rules.river_days of Loy Krathong 2026: 7 (a row he may change; 0 or none: gone as the float closes, as before).
-- 2. public.town_krathong_river(festival): what floats, while the float is open and for `river_days` days after it
--    closes. Nobody can float a new one after the close (town_krathong_float still asks the float window).
-- Needs v339. Runs twice without harm.

begin;
do $$ begin
  if to_regprocedure('public.town_krathong_float(integer, text, real, real)') is null then raise exception 'Run v339 before v343'; end if;
end $$;

update public.town_festivals
   set rules = rules || jsonb_build_object('river_days', 7)
 where slug = 'loykrathong' and year = 2026;

-- Whether a festival's floated krathongs are on the water at a moment: its float open, or closed less than `river_days` ago.
create or replace function town.krathong_river_open(p_windows jsonb, p_rules jsonb, p_at timestamptz) returns boolean
language sql stable set search_path to '' as $$
  select town.festival_open(p_windows, 'float', p_at) or coalesce((
    select bool_or(p_at >= (w->>'until')::timestamptz
                   and p_at < (w->>'until')::timestamptz + make_interval(days => greatest(0, coalesce((p_rules->>'river_days')::int, 0))))
      from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) w
     where w->>'kind' = 'float' and w->>'until' is not null), false)
$$;
revoke all on function town.krathong_river_open(jsonb, jsonb, timestamptz) from public, anon, authenticated;

-- What floats now, for the map (v339's, but on the water `river_days` after the float closes).
create or replace function public.town_krathong_river(p_festival integer) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found or not town.krathong_river_open(f.windows, f.rules, town.festival_now()) then
    return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'design', x.design, 'floated', (extract(epoch from x.floated_at) * 1000)::bigint,
             'mine', x.member_id = me, 'name', x.name, 'wish', x.wish, 'x', x.float_x, 'y', x.float_y,
             'maker', (select p.character_name from public.profiles p where p.id = x.member_id)) order by x.floated_at)
      from (select * from public.town_krathongs k where k.festival = f.id and k.floated_at is not null order by k.floated_at desc limit 300) x), '[]'::jsonb));
end;
$$;
revoke all on function public.town_krathong_river(integer) from public, anon;
grant execute on function public.town_krathong_river(integer) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Afterwards (each should say what is written beside it):
-- select rules->'river_days' from public.town_festivals where id = 1;   -- 7
-- select town.krathong_river_open(windows, rules, '2026-11-30T12:00:00Z') from public.town_festivals where id = 1;   -- t
-- select town.krathong_river_open(windows, rules, '2026-12-03T00:00:00Z') from public.town_festivals where id = 1;   -- f
