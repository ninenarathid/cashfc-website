-- v270: the farm's Quality asks far less of the database at a pick or a watering (2026-10-16).
-- Run after v269. Safe to run twice. No site code goes with it.
--
-- The owner's log of 2026-10-16 (09:43-09:54): statements cancelled by the statement timeout while members picked and
-- watered ("ติดต่อเมืองไม่ได้"); pg_stat_statements: public.town_tend 520 ms on average, up to 6 s. Replayed on the bench
-- with the live farm, 80% of a tend was v259's trigger town.quality_keep, held under the bed's lock: for a plant with no
-- Quality round yet (most of those sown before the launch) it worked out the companions' gift of every plant in the bed
-- (town.quality_bed_gift), each over every plot of the bed, asking town.bed_of (a catalog read and a walk of the beds)
-- for each plot: 144,000 bed_of and 1.5 million catalog reads in 60 picks of one bed of 47 plants.
--   * town.quality_bed_gift finds the bed's square once and tests each plot against it (the plots it is given are of
--     one bed; a plot outside every bed is tested as before).
--   * town.quality_keep, at a plant's first round (the same plant, its bed unchanged), works out only the neighbours
--     with no round yet (each is given its first, as before); a neighbour with a round already holds the gift it would
--     be given, for every change of the bed has given each its gift since.
-- What each plant is given is the same, to the digit (v270.test.mjs: both definitions over random beds and deeds).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.yield_of(text,jsonb,text)') is null or not exists (select 1 from public.town_catalog where key = 'work' and data->'farmingCells'->>'blueCorn' = '1') then raise exception 'Run v269 before v270'; end if;
-- <guards:v270>
 if md5(replace(pg_get_functiondef('town.quality_bed_gift(text,jsonb)'::regprocedure),chr(13),'')) not in ('d29afceba83dbd003fabecfdc1be2437','e9157dced6fd8c993146f4a1955521f1') then raise exception 'Definition changed: town.quality_bed_gift(text,jsonb); rebuild v270'; end if;
 if md5(replace(pg_get_functiondef('town.quality_keep()'::regprocedure),chr(13),'')) not in ('9a9eddcb2a787a22266bc92a21cb16f0','2c65aa2aa07898897384067f95c95925') then raise exception 'Definition changed: town.quality_keep(); rebuild v270'; end if;
-- </guards:v270>
end $$;

CREATE OR REPLACE FUNCTION town.quality_bed_gift(p_key text, p_plots jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; qc jsonb:=town.cat('quality'); mine jsonb; o record; theirs jsonb; helper jsonb; share double precision;
 c jsonb:='{}'::jsonb; partner boolean:=false; fennel integer:=0; bed integer; gift jsonb:='{}'::jsonb; r text;
 h jsonb:='[]'::jsonb; hk record; room jsonb; role_ text; n integer; total integer;
 f jsonb:=town.cat('farming'); side integer; bx integer; by_ integer; ox integer; oy integer;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return null; end if;
 mine:=coalesce(p->'footprint',jsonb_build_array(p_key));
 bed:=town.bed_of(split_part(p_key,',',1)::integer,split_part(p_key,',',2)::integer);
 -- v270: the bed's square once (town.bed_of reads the catalog at every call, and was asked of every plot)
 if bed>=0 then side:=(f->>'side')::integer; bx:=(f->'bedsAt'->bed->>0)::integer; by_:=(f->'bedsAt'->bed->>1)::integer; end if;
 for o in select e.key k, e.value->'plant' pl from jsonb_each(p_plots) e where e.key<>p_key loop
  continue when o.pl is null or o.pl='null'::jsonb or (o.pl->>'root' is not null and o.pl->>'root'<>o.k);
  if bed>=0 then
   ox:=split_part(o.k,',',1)::integer; oy:=split_part(o.k,',',2)::integer;
   continue when ox<bx or ox>=bx+side or oy<by_ or oy>=by_+side;
  else
   continue when town.bed_of(split_part(o.k,',',1)::integer,split_part(o.k,',',2)::integer)<>bed;
  end if;
  theirs:=coalesce(o.pl->'footprint',jsonb_build_array(o.k));
  helper:=qc->'companions'->(o.pl->>'crop');
  if helper is not null then
   share:=town.quality_share(mine,o.k,helper->>'shape',coalesce((o.pl->>'rotation')::integer,0),theirs);
   if share>0 and share>coalesce((c->>(helper->>'role'))::double precision,0) then c:=c || jsonb_build_object(helper->>'role',share); end if;
  end if;
  if qc->'partners'->>(p->>'crop')=o.pl->>'crop' and town.quality_touching(mine,theirs) then partner:=true; end if;
  if o.pl->>'crop'='fennel' and town.quality_touching(mine,theirs) then fennel:=fennel+(qc->>'fennel')::integer; end if;
 end loop;
 -- v265: the insect house
 for hk in select e.key k, e.value->'house' hs from jsonb_each(p_plots) e where jsonb_typeof(e.value->'house')='object' order by e.key collate "C" loop
  select count(*) filter (where town.house_reach(hk.k,x.c))::integer, count(*)::integer into n, total from jsonb_array_elements_text(mine) x(c);
  continue when n=0;
  for room in select a.v from jsonb_array_elements(hk.hs->'rooms') with ordinality a(v,i) order by a.i loop
   continue when room is null or jsonb_typeof(room)<>'object';
   role_:=town.house_role(room->>'bug');
   continue when role_ is null;
   h:=h || jsonb_build_array(jsonb_build_object('r',role_,'from',(room->>'from')::bigint,'to',(room->>'until')::bigint,'s',n::double precision/total)
    || case when town.house_rare(room->>'bug') then '{"x":1}'::jsonb else '{}'::jsonb end);
  end loop;
 end loop;
 if c<>'{}'::jsonb then gift:=gift || jsonb_build_object('c',c); end if;
 if partner then gift:=gift || '{"p":1}'::jsonb; end if;
 if fennel>0 then gift:=gift || jsonb_build_object('f',fennel); end if;
 if jsonb_array_length(h)>0 then gift:=gift || jsonb_build_object('h',h); end if;
 return case when gift='{}'::jsonb then null else gift end;
end $function$;

CREATE OR REPLACE FUNCTION town.quality_keep()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 key_ text:=new.x::text||','||new.y::text; was jsonb; p jsonb:=new.plant; now_ bigint:=coalesce(new.changed,town.now_ms());
 launch_ bigint:=(town.cat('quality')->>'launch')::bigint; wasroot boolean; isroot boolean; plots jsonb; o record; gift jsonb; q jsonb; okey text;
 housed boolean; first_ boolean:=false;
begin
 if tg_op='UPDATE' then was:=old.plant; housed:=old.house is distinct from new.house; else housed:=new.house is not null; end if;
 if was='null'::jsonb then was:=null; end if;
 if p='null'::jsonb then p:=null; end if;
 wasroot:=was is not null and (was->>'root' is null or was->>'root'=key_);
 isroot:=p is not null and (p->>'root' is null or p->>'root'=key_);
 if not wasroot and not isroot and not housed then return new; end if;
 if wasroot and isroot and was->>'sown' is not distinct from p->>'sown' and was->>'crop' is not distinct from p->>'crop' and was->>'by' is not distinct from p->>'by' then
  if was=p or (was-'q')=(p-'q') then return new; end if;
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
  new.plant:=p || jsonb_build_object('q',(case
    when first_ and coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0) then town.quality_fresh(greatest(launch_,now_))
    when first_ then town.quality_settled(was || jsonb_build_object('q',town.quality_fresh(greatest(launch_,town.quality_round_start(was)))
      || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end),now_)
    else coalesce(case when jsonb_typeof(p->'q')='object' then p->'q' end,town.quality_fresh(greatest(launch_,town.quality_round_start(p)))) end) - 'bed'
   || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end);
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
  q:=town.quality_settled(o.plant,now_) - 'bed';
  update public.town_plots set plant=plant || jsonb_build_object('q',q || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end)
   where x=o.x and y=o.y;
 end loop;
 return new;
end $function$;

-- (the functions written over keep the grants they had)

commit;

-- What it should say afterwards (the time of one gift over a bed of yours, a few ms):
--   explain analyze select town.quality_bed_gift(k, (select jsonb_object_agg(t.x||','||t.y, jsonb_build_object('soil',t.soil,'plant',t.plant)) from public.town_plots t where t.bed = 0))
--     from (select x||','||y k from public.town_plots where bed = 0 and plant is not null limit 1) s;
