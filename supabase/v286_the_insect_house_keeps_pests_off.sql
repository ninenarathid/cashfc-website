-- v286: an insect house's hunter keeps pests off the plants it reaches (2026-10-19).
-- Run after v285 (or any file from v273 on: it writes over v273's town.pest_at and v270's town.quality_keep, which no
-- later file touches), with the matching site code: lib/town/farm (FARMING.pests.house, housedAt, pestAt),
-- lib/town/quality-plant (houseKept, syncQuality), components/town/TownInsectHouse. Safe to run twice.
--
-- The owner, 2026-10-19: "บ้านแมลงทำไมใส่ แมลงกินศัตรูพืชแล้ว ยังเจอแมลงกินพืชอยู่"; told that the house only filled half
-- the guard bar of Quality and kept no pest off, he chose: "ให้บ้านกันศัตรูพืชได้จริงครับ แก้เลย".
--   * town.pest_at: no pest strikes a plant in an hour a hunter (a guard room) of its bed's house reached it: from the
--     moment the insect went in to the moment it leaves, the plant's gift from the house (q.bed.h, v265); and the
--     stretches the gift no longer holds, kept on the plant (`hg`). A pest already there stays (the cure's, or a let-go
--     insect's to rid). A plant the enchanted hoe set down in reach is kept from the move on (`hs`). Only from the
--     catalog's farming.pests.house (2026-10-20 08:00 Bangkok), so that no strike before then is undone.
--   * town.quality_keep (the trigger on town_plots): whenever a plant's gift from its bed changes, the guard rooms it
--     loses (a room filled again, the house lifted, the plant moved out of reach) are kept on the plant up to that
--     moment (town.house_kept), so that a pest never comes back into an hour it was kept off; and a plant moved here
--     with a round already is marked `hs`. Quality itself is as it was, to the digit.
--   * The catalog's `farming` row, its `pests.house` alone (jsonb_set: other files' keys stand).
-- What each does is the code's, to the digit (v286.test.mjs: pests and the trigger against lib/town's).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.home_of(text,jsonb)') is null then raise exception 'Run v273 before v286'; end if;
-- <guards:v286>
 if md5(replace(pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('853fa7e45dc5329be946cd83889ef384','8031c666bd859d1d500ad0e5628f1f3c') then raise exception 'Definition changed: town.pest_at(text,jsonb,bigint); rebuild v286'; end if;
 if md5(replace(pg_get_functiondef('town.quality_keep()'::regprocedure),chr(13),'')) not in ('2c65aa2aa07898897384067f95c95925','a768c6bd65b9a1c3f429939c992d354e') then raise exception 'Definition changed: town.quality_keep(); rebuild v286'; end if;
-- </guards:v286>
end $$;

update public.town_catalog
   set data = jsonb_set(data, '{pests,house}', '1792458000000'::jsonb), updated_at = now()
 where key = 'farming' and data->'pests'->'house' is distinct from '1792458000000'::jsonb;

-- What a plant keeps of the stretches its bed's house kept pests off it, as its gift changes from p_was to p_gift
-- (lib/town/quality-plant's houseKept): those it had (`hg`), and each guard room of the gift it had that the new one
-- does not hold, from when it stood there (`hs`) up to now; every one of them when it has arrived from somewhere else.
-- Only what can still bear on its pests; in order, each once. Null for none.
CREATE OR REPLACE FUNCTION town.house_kept(p_plant jsonb, p_was jsonb, p_gift jsonb, p_now bigint, p_arrived boolean)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 with s as (
   select greatest((p_plant->>'sown')::bigint, coalesce((p_plant->>'cured')::bigint, 0), coalesce((p_plant->>'pickedAt')::bigint, 0)) start_,
          coalesce((p_plant->>'hs')::bigint, 0) hs_),
 still as (
   select (e->>'from')::bigint a, (e->>'to')::bigint b
     from jsonb_array_elements(case when jsonb_typeof(p_gift->'h') = 'array' then p_gift->'h' else '[]'::jsonb end) e
    where e->>'r' = 'guard'),
 had as (
   select (e->>0)::bigint a, (e->>1)::bigint b
     from jsonb_array_elements(case when jsonb_typeof(p_plant->'hg') = 'array' then p_plant->'hg' else '[]'::jsonb end) e),
 gone as (
   select greatest((e->>'from')::bigint, s.hs_) a, least((e->>'to')::bigint, p_now) b
     from s, jsonb_array_elements(case when jsonb_typeof(p_was->'h') = 'array' then p_was->'h' else '[]'::jsonb end) e
    where e->>'r' = 'guard'
      and (p_arrived or not exists (select 1 from still where still.a = (e->>'from')::bigint and still.b = (e->>'to')::bigint))),
 kept as (
   select distinct k.a, k.b
     from (select a, b from had union all select a, b from gone where b > a) k, s
    where k.b > s.start_)
 select case when count(*) = 0 then null else jsonb_agg(jsonb_build_array(a, b) order by a, b) end from kept
$function$;
revoke all on function town.house_kept(jsonb, jsonb, jsonb, bigint, boolean) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION town.pest_at(p_key text, p_plant jsonb, p_now bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
  -- (whether an hourglass was ever turned over it: its term is asked for only then)
  quick boolean := coalesce(jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0, false);
  -- (the bearing more of a plant the mandrake sang to, and the hours it waits for it)
  wing_used boolean:=coalesce((p_plant->>'cured')::bigint>(p_plant->>'sown')::bigint,false);
  more integer := town.more_of(p_plant);
  -- v273: the plot it was sown at, should the enchanted hoe have moved it (town.home_of): its pests are that plot's
  home_ text := town.home_of(p_key, p_plant);
  encore double precision := coalesce((c->>'again')::double precision, (c->>'hours')::double precision * (f->'gifted'->>'encore')::double precision);
  -- v286: the stretches its bed's insect house kept pests off it (lib/town/farm's housedAt), from farming.pests.house on
  house_from bigint := coalesce((f->'pests'->>'house')::bigint, 9223372036854775807);
  kept_from bigint[];
  kept_to bigint[];
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  select array_agg(k.a), array_agg(k.b) into kept_from, kept_to
    from (select greatest((e->>'from')::bigint, coalesce((p_plant->>'hs')::bigint, 0)) a, (e->>'to')::bigint b
            from jsonb_array_elements(case when jsonb_typeof(p_plant->'q'->'bed'->'h') = 'array' then p_plant->'q'->'bed'->'h' else '[]'::jsonb end) e
           where e->>'r' = 'guard'
          union all
          select (e->>0)::bigint, (e->>1)::bigint
            from jsonb_array_elements(case when jsonb_typeof(p_plant->'hg') = 'array' then p_plant->'hg' else '[]'::jsonb end) e) k
   where k.b > k.a and k.b > house_from;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint
       and not (kept_from is not null and t >= house_from and exists (select 1 from unnest(kept_from, kept_to) u(a, b) where u.a <= t and t < u.b)) then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks + more then false
        when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore
        when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every
          + case when quick then town.quick_ms(p_plant, sown, t) else 0::double precision end) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(home_, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then if not wing_used and t<(p_plant->>'wingGuard')::bigint then wing_used:=true;else return t;end if;end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION town.quality_keep()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 key_ text:=new.x::text||','||new.y::text; was jsonb; p jsonb:=new.plant; now_ bigint:=coalesce(new.changed,town.now_ms());
 launch_ bigint:=(town.cat('quality')->>'launch')::bigint; wasroot boolean; isroot boolean; plots jsonb; o record; gift jsonb; q jsonb; okey text;
 housed boolean; first_ boolean:=false;
 -- v286: what the plant keeps of its house's stretches (town.house_kept), and whether the hoe has just set it down here
 kept_ jsonb; arrived_ boolean;
begin
 if tg_op='UPDATE' then was:=old.plant; housed:=old.house is distinct from new.house; else housed:=new.house is not null; end if;
 if was='null'::jsonb then was:=null; end if;
 if p='null'::jsonb then p:=null; end if;
 wasroot:=was is not null and (was->>'root' is null or was->>'root'=key_);
 isroot:=p is not null and (p->>'root' is null or p->>'root'=key_);
 if not wasroot and not isroot and not housed then return new; end if;
 if wasroot and isroot and was->>'sown' is not distinct from p->>'sown' and was->>'crop' is not distinct from p->>'crop' and was->>'by' is not distinct from p->>'by' then
  -- (v286: nor what this trigger keeps of the house for a neighbour, written with its round)
  if was=p or (was-'q'-'hg'-'hs')=(p-'q'-'hg'-'hs') then return new; end if;
  if jsonb_typeof(was->'q')='object' then
   new.plant:=p || jsonb_build_object('q',case
    when coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0)
     then town.quality_fresh(greatest(launch_,now_)) || case when jsonb_typeof(was->'q'->'bed')='object' then jsonb_build_object('bed',was->'q'->'bed') else '{}'::jsonb end
    else town.quality_settled(was,now_) end);
   return new;
  end if;
  -- (one with no round yet, growing when Quality came: its first, settled with what the bed gives it, which has stood
  -- since then, for a change of the bed would have given it a round)
  first_:=true;
 end if;
 -- the bed changes: its plots as they will be (each with its house, where it has one)
 select coalesce(jsonb_object_agg(t.x::text||','||t.y::text,jsonb_build_object('soil',t.soil,'plant',t.plant) || case when t.house is not null then jsonb_build_object('house',t.house) else '{}'::jsonb end),'{}'::jsonb) into plots
   from public.town_plots t where t.bed=new.bed and not (t.x=new.x and t.y=new.y);
 plots:=plots || jsonb_build_object(key_,jsonb_build_object('soil',new.soil,'plant',coalesce(p,'null'::jsonb)) || case when new.house is not null then jsonb_build_object('house',new.house) else '{}'::jsonb end);
 if isroot then
  gift:=town.quality_bed_gift(key_,plots);
  q:=(case
    when first_ and coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0) then town.quality_fresh(greatest(launch_,now_))
    when first_ then town.quality_settled(was || jsonb_build_object('q',town.quality_fresh(greatest(launch_,town.quality_round_start(was)))
      || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end),now_)
    else coalesce(case when jsonb_typeof(p->'q')='object' then p->'q' end,town.quality_fresh(greatest(launch_,town.quality_round_start(p)))) end);
  -- v286: one set down here with a round already (the hoe moved it) is kept off by the house here from now
  arrived_:=not first_ and jsonb_typeof(p->'q')='object';
  kept_:=town.house_kept(p,q->'bed',gift,now_,arrived_);
  new.plant:=(p - 'hg' - 'hs') || jsonb_build_object('q',(q - 'bed')
   || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end)
   || case when kept_ is null then '{}'::jsonb else jsonb_build_object('hg',kept_) end
   || case when arrived_ then jsonb_build_object('hs',now_) when p ? 'hs' then jsonb_build_object('hs',p->'hs') else '{}'::jsonb end;
  plots:=plots || jsonb_build_object(key_,jsonb_build_object('soil',new.soil,'plant',new.plant));
 end if;
 for o in select t.x, t.y, t.plant from public.town_plots t
   where t.bed=new.bed and not (t.x=new.x and t.y=new.y) and t.plant is not null and t.plant<>'null'::jsonb
     and (t.plant->>'root' is null or t.plant->>'root'=t.x::text||','||t.y::text)
     -- v270: a plant's first round (the same plant, the bed as it was) changes no neighbour's gift: only those with no
     -- round yet are given theirs, as before; one with a round already has the gift it would be given
     and (not first_ or jsonb_typeof(t.plant->'q') is distinct from 'object') loop
  okey:=o.x::text||','||o.y::text;
  gift:=town.quality_bed_gift(okey,plots);
  continue when gift is not distinct from case when jsonb_typeof(o.plant->'q'->'bed')='object' then o.plant->'q'->'bed' end;
  q:=town.quality_settled(o.plant,now_);
  kept_:=town.house_kept(o.plant,q->'bed',gift,now_,false);
  update public.town_plots set plant=(plant - 'hg') || jsonb_build_object('q',(q - 'bed') || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end)
   || case when kept_ is null then '{}'::jsonb else jsonb_build_object('hg',kept_) end
   where x=o.x and y=o.y;
 end loop;
 return new;
end $function$;

-- (the functions written over keep the grants they had)

commit;

-- What it should say afterwards:
--   select data->'pests'->>'house' from public.town_catalog where key = 'farming';                -- 1792458000000
--   select count(*) from public.town_plots where plant ? 'hg';                                       -- grows as rooms are filled again
