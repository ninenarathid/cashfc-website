-- v286: an insect house's hunter keeps pests off the plants it reaches, so often (2026-10-19).
-- Run after v285 (or any file from v273 on: it writes over v273's town.pest_at and v270's town.quality_keep and
-- town.quality_bed_gift, which no later file touches), with the matching site code: lib/town/farm (FARMING.pests.house,
-- houseKeepAt, pestAt), lib/town/insect-house (HOUSE.keep, HOUSE.keeps, keepOf, houseCovers), lib/town/quality-plant
-- (houseKept, syncQuality), components/town/TownInsectHouse. Safe to run twice.
--
-- The owner, 2026-10-19: "บ้านแมลงทำไมใส่ แมลงกินศัตรูพืชแล้ว ยังเจอแมลงกินพืชอยู่"; told that the house only filled half
-- the guard bar of Quality and kept no pest off, he chose: "ให้บ้านกันศัตรูพืชได้จริงครับ แก้เลย"; told that one cheap
-- ladybird would then do the work of some forty-eight pest-proof fertilisers: "ทำให้เต่าทอง ตักแตนตำข้าว มีผลน้อยลง", and of
-- the two answers, Codex's ("ตาม Codex"): the cheap hunters half the time, every other one seven times in ten.
--   * town.pest_at: a pest that would strike a plant in an hour a hunter (a guard room) of its bed's house reached it is
--     kept off so often as that hunter keeps them (`k`, the best room's, never added), by a roll of its own: from the
--     moment the insect went in to the moment it leaves, the plant's gift from the house (q.bed.h, v265); and the
--     stretches the gift no longer holds, kept on the plant (`hg`). A pest already there stays (the cure's, or a let-go
--     insect's to rid). A plant the enchanted hoe set down in reach is kept from the move on (`hs`). Only from the
--     catalog's farming.pests.house.from (2026-10-20 08:00 Bangkok), so that no strike before then is undone; a room
--     written down before it said its keep keeps as the weakest hunter does (farming.pests.house.old).
--   * town.quality_bed_gift: a guard room's cover says how often its hunter keeps a pest off (`k`: quality.house.keeps,
--     else quality.house.keep).
--   * town.quality_keep (the trigger on town_plots): whenever a plant's gift from its bed changes, the guard rooms it
--     loses (a room filled again, the house lifted, the plant moved out of reach) are kept on the plant up to that
--     moment with their keep (town.house_kept), so that what was kept off stays kept off; a plant moved here with a
--     round already is marked `hs`; a neighbour's write of only its round and what it keeps is no change of it.
--     Quality itself is as it was, to the digit.
--   * The catalog's `farming` row, its `pests.house` alone, and the `quality` row, its `house.keep` and `house.keeps`
--     alone (jsonb_set: other files' keys stand).
-- What each does is the code's, to the digit (v286.test.mjs: pests, gifts and the trigger against lib/town's).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.home_of(text,jsonb)') is null then raise exception 'Run v273 before v286'; end if;
-- <guards:v286>
 if md5(replace(pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('853fa7e45dc5329be946cd83889ef384','e352279eaf6144b3fa23a3977c148e85') then raise exception 'Definition changed: town.pest_at(text,jsonb,bigint); rebuild v286'; end if;
 if md5(replace(pg_get_functiondef('town.quality_keep()'::regprocedure),chr(13),'')) not in ('2c65aa2aa07898897384067f95c95925','a768c6bd65b9a1c3f429939c992d354e') then raise exception 'Definition changed: town.quality_keep(); rebuild v286'; end if;
 if md5(replace(pg_get_functiondef('town.quality_bed_gift(text,jsonb)'::regprocedure),chr(13),'')) not in ('e9157dced6fd8c993146f4a1955521f1','05caea9f257f7cc14d02bffdf41f98f9') then raise exception 'Definition changed: town.quality_bed_gift(text,jsonb); rebuild v286'; end if;
-- </guards:v286>
end $$;

update public.town_catalog
   set data = jsonb_set(data, '{pests,house}', '{"from":1792458000000,"old":0.5}'::jsonb), updated_at = now()
 where key = 'farming' and data->'pests'->'house' is distinct from '{"from":1792458000000,"old":0.5}'::jsonb;
update public.town_catalog
   set data = jsonb_set(jsonb_set(data, '{house,keep}', '0.7'::jsonb), '{house,keeps}', '{"ladybird":0.5,"mantis":0.7,"robberFly":0.5,"antlion":0.5,"roveBeetle":0.5}'::jsonb), updated_at = now()
 where key = 'quality' and (data->'house'->'keep' is distinct from '0.7'::jsonb or data->'house'->'keeps' is distinct from '{"ladybird":0.5,"mantis":0.7,"robberFly":0.5,"antlion":0.5,"roveBeetle":0.5}'::jsonb);

-- What a plant keeps of the stretches its bed's house kept pests off it, as its gift changes from p_was to p_gift
-- (lib/town/quality-plant's houseKept): those it had (`hg`), and each guard room of the gift it had that the new one
-- does not hold, from when it stood there (`hs`) up to now, each with how often its hunter kept a pest off (a room
-- written down before that was, as farming.pests.house.old); every one of them when it has arrived from somewhere
-- else. Only what can still bear on its pests; in order, each once. Null for none.
CREATE OR REPLACE FUNCTION town.house_kept(p_plant jsonb, p_was jsonb, p_gift jsonb, p_now bigint, p_arrived boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with s as (
   select greatest((p_plant->>'sown')::bigint, coalesce((p_plant->>'cured')::bigint, 0), coalesce((p_plant->>'pickedAt')::bigint, 0)) start_,
          coalesce((p_plant->>'hs')::bigint, 0) hs_,
          (town.cat('farming')->'pests'->'house'->>'old')::double precision old_),
 still as (
   select (e->>'from')::bigint a, (e->>'to')::bigint b, coalesce((e->>'k')::double precision, s.old_) k
     from s, jsonb_array_elements(case when jsonb_typeof(p_gift->'h') = 'array' then p_gift->'h' else '[]'::jsonb end) e
    where e->>'r' = 'guard'),
 had as (
   select (e->>0)::bigint a, (e->>1)::bigint b, coalesce((e->>2)::double precision, s.old_) k
     from s, jsonb_array_elements(case when jsonb_typeof(p_plant->'hg') = 'array' then p_plant->'hg' else '[]'::jsonb end) e),
 gone as (
   select greatest((e->>'from')::bigint, s.hs_) a, least((e->>'to')::bigint, p_now) b, coalesce((e->>'k')::double precision, s.old_) k
     from s, jsonb_array_elements(case when jsonb_typeof(p_was->'h') = 'array' then p_was->'h' else '[]'::jsonb end) e
    where e->>'r' = 'guard'
      and (p_arrived or not exists (select 1 from still where still.a = (e->>'from')::bigint and still.b = (e->>'to')::bigint
                                                         and still.k = coalesce((e->>'k')::double precision, s.old_)))),
 kept as (
   select distinct x.a, x.b, x.k
     from (select a, b, k from had union all select a, b, k from gone where b > a) x, s
    where x.b > s.start_)
 select case when count(*) = 0 then null else jsonb_agg(jsonb_build_array(a, b, k) order by a, b, k) end from kept
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
  -- v286: the stretches its bed's insect house kept pests off it and how often (lib/town/farm's houseKeepAt), from
  -- farming.pests.house.from on
  house_from bigint := coalesce((f->'pests'->'house'->>'from')::bigint, 9223372036854775807);
  house_old double precision := coalesce((f->'pests'->'house'->>'old')::double precision, 0);
  kept_from bigint[];
  kept_to bigint[];
  kept_k double precision[];
  keep_ double precision;
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  select array_agg(k.a), array_agg(k.b), array_agg(k.k) into kept_from, kept_to, kept_k
    from (select greatest((e->>'from')::bigint, coalesce((p_plant->>'hs')::bigint, 0)) a, (e->>'to')::bigint b, coalesce((e->>'k')::double precision, house_old) k
            from jsonb_array_elements(case when jsonb_typeof(p_plant->'q'->'bed'->'h') = 'array' then p_plant->'q'->'bed'->'h' else '[]'::jsonb end) e
           where e->>'r' = 'guard'
          union all
          select (e->>0)::bigint, (e->>1)::bigint, coalesce((e->>2)::double precision, house_old)
            from jsonb_array_elements(case when jsonb_typeof(p_plant->'hg') = 'array' then p_plant->'hg' else '[]'::jsonb end) e) k
   where k.b > k.a and k.b > house_from and k.k > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
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
                                                  else 0::double precision end) then
        -- v286: a hunter of its bed's house keeps it off so often, by a roll of its own (lib/town/farm's houseKeepAt)
        keep_ := case when kept_from is not null and t >= house_from then (select max(u.k) from unnest(kept_from, kept_to, kept_k) u(a, b, k) where u.a <= t and t < u.b) end;
        if keep_ is not null and town.roll('house|' || home_, h, sown) < keep_ then null;
        elsif not wing_used and t<(p_plant->>'wingGuard')::bigint then wing_used:=true;
        else return t;
        end if;
      end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$function$;

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
    || case when town.house_rare(room->>'bug') then '{"x":1}'::jsonb else '{}'::jsonb end
    -- v286: how often a hunter keeps a pest off (lib/town/insect-house's keepOf)
    || case when role_='guard' then jsonb_build_object('k',coalesce((qc->'house'->'keeps'->>(room->>'bug'))::double precision,(qc->'house'->>'keep')::double precision)) else '{}'::jsonb end);
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
