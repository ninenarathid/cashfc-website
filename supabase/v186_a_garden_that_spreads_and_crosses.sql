-- v186: rotating footprints, neighbouring crosses and 25 useful garden items.
-- Run after v185 and the matching site. Safe to run twice. No existing purse or plot is reset.
-- Whole-bed locks precede planting and picking. One root pays; its reserved plots mirror every care deed.
begin;
do $guard$ begin
 if town.cat('geology') is null then raise exception 'Run v185 first'; end if;
 if md5(replace(pg_get_functiondef('town.deed_for(text,jsonb,text,text,bigint,text)'::regprocedure),chr(13),'')) not in ('7fc98a05f5a41a63c95b4c126fcd1e27','12140060f29db649ad2e1126d5fbcef7') then raise exception 'Definition changed: town.deed_for(text,jsonb,text,text,bigint,text); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint)'::regprocedure),chr(13),'')) not in ('88406cd2e0259a68e6db12267d64e2b3','123e3b961add321438dfd53dcc05d1f4') then raise exception 'Definition changed: town.pick(text,jsonb,jsonb,boolean,text,bigint); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)'::regprocedure),chr(13),'')) not in ('21404ba8365749c7361c7067fd1b97e9','87c33397a2228724c01130624303937d') then raise exception 'Definition changed: town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('public.town_tend(integer,integer,jsonb,boolean)'::regprocedure),chr(13),'')) not in ('b3d4d539b916716ca3dc502f0fed5e19','4c686cbc8c6db2d24d1c7354a5df9013') then raise exception 'Definition changed: public.town_tend(integer,integer,jsonb,boolean); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('town.glass_turn(jsonb,jsonb,text,bigint,text)'::regprocedure),chr(13),'')) not in ('84072707428736537f64db28891cee55','ed133bc4469dd5e10f92cc579be79500') then raise exception 'Definition changed: town.glass_turn(jsonb,jsonb,text,bigint,text); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('d2b60ca1135a35b051eec0589062c177','9d2ef351d4ffef8059d63e01b6639864') then raise exception 'Definition changed: town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb); rebuild v186'; end if;
 if md5(replace(pg_get_functiondef('public.town_row(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('045853532fdff54220918d3faa384cf3','91ca9eec42971574e1bd771a6516e1a2') then raise exception 'Definition changed: public.town_row(integer,integer,jsonb,jsonb); rebuild v186'; end if;
end $guard$;
update public.town_catalog set data=data || $garden${"bottleGourd":{"kind":"crop","tier":2,"stack":20,"pays":7},"rowBean":{"kind":"crop","tier":2,"stack":20,"pays":6},"trellisBerry":{"kind":"crop","tier":3,"stack":20,"pays":10},"blueCorn":{"kind":"crop","tier":3,"stack":20,"pays":8},"teaBush":{"kind":"crop","tier":3,"stack":20,"pays":8},"sunflowerPatch":{"kind":"crop","tier":2,"stack":20,"pays":6},"redOkra":{"kind":"crop","tier":2,"stack":20,"pays":7},"lotusRootBed":{"kind":"crop","tier":2,"stack":20,"pays":9},"gourdCup":{"kind":"goods","tier":2,"stack":20,"pays":10},"beanPaste":{"kind":"staple","tier":2,"stack":20,"pays":8},"berryJam":{"kind":"staple","tier":3,"stack":20,"pays":13},"blueCornFlour":{"kind":"staple","tier":3,"stack":20,"pays":10},"driedTea":{"kind":"staple","tier":3,"stack":20,"pays":12},"sunflowerOil":{"kind":"staple","tier":2,"stack":20,"pays":9},"lotusStarch":{"kind":"staple","tier":2,"stack":20,"pays":10},"pollenBrush":{"kind":"tool","tier":2,"stack":1,"pays":24},"graftKnife":{"kind":"tool","tier":2,"stack":1,"pays":25},"rootGuide":{"kind":"tool","tier":2,"stack":1,"pays":20},"soilScoop":{"kind":"tool","tier":2,"stack":1,"pays":23},"seedTray":{"kind":"tool","tier":2,"stack":1,"pays":22},"gardenTwine":{"kind":"tool","tier":2,"stack":1,"pays":21},"pollenRice":{"kind":"dish","tier":2,"stack":20,"pays":21},"berryTea":{"kind":"dish","tier":3,"stack":20,"pays":24},"blueCornCake":{"kind":"dish","tier":3,"stack":20,"pays":25},"lotusGardenSoup":{"kind":"dish","tier":2,"stack":20,"pays":23},"seedBottleGourd":{"kind":"seed","tier":2,"stack":20,"pays":4},"seedRowBean":{"kind":"seed","tier":2,"stack":20,"pays":4},"seedTrellisBerry":{"kind":"seed","tier":3,"stack":20,"pays":4},"seedBlueCorn":{"kind":"seed","tier":3,"stack":20,"pays":4},"seedTeaBush":{"kind":"seed","tier":3,"stack":20,"pays":4},"seedSunflowerPatch":{"kind":"seed","tier":2,"stack":20,"pays":4},"seedRedOkra":{"kind":"seed","tier":2,"stack":20,"pays":4},"seedLotusRootBed":{"kind":"seed","tier":2,"stack":20,"pays":4},"scrollPollenRice":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollBerryTea":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollBlueCornCake":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollLotusGardenSoup":{"kind":"scroll","tier":2,"stack":20,"pays":12}}$garden$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data || $garden${"bottleGourd":{"seed":"seedBottleGourd","hours":72,"yield":[4,6],"again":36,"picks":3},"rowBean":{"seed":"seedRowBean","hours":60,"yield":[6,8],"again":24,"picks":3},"trellisBerry":{"seed":"seedTrellisBerry","hours":192,"yield":[6,8],"again":48,"picks":5},"blueCorn":{"seed":"seedBlueCorn","hours":120,"yield":[6,8],"again":null,"picks":1},"teaBush":{"seed":"seedTeaBush","hours":168,"yield":[6,8],"again":48,"picks":5},"sunflowerPatch":{"seed":"seedSunflowerPatch","hours":72,"yield":[6,10],"again":null,"picks":1},"redOkra":{"seed":"seedRedOkra","hours":72,"yield":[6,8],"again":24,"picks":3},"lotusRootBed":{"seed":"seedLotusRootBed","hours":120,"yield":[4,6],"again":null,"picks":1}}$garden$::jsonb,updated_at=now() where key='crops';
update public.town_catalog set data=data || $garden${"scrollPollenRice":"pollenRice","scrollBerryTea":"berryTea","scrollBlueCornCake":"blueCornCake","scrollLotusGardenSoup":"lotusGardenSoup"}$garden$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=data || $garden${"gourdCup":{"needs":[["bottleGourd",2]],"in":["cleaver"],"gives":2},"beanPaste":{"needs":[["rowBean",3]],"in":["mortar"],"gives":2},"berryJam":{"needs":[["trellisBerry",3],["sugar",1]],"in":["pot"],"gives":2},"blueCornFlour":{"needs":[["blueCorn",3]],"in":["mortar"],"gives":2},"driedTea":{"needs":[["teaBush",3]],"in":["pan"],"gives":2},"sunflowerOil":{"needs":[["sunflowerPatch",3]],"in":["mortar"],"gives":2},"lotusStarch":{"needs":[["lotusRootBed",3]],"in":["mortar"],"gives":2}}$garden$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data || $garden${"pollenRice":{"stamina":26,"buff":"pollen","recipe":{"needs":[["beanPaste",1],["rice",2]],"in":["pot"],"serves":3,"cooks":1}},"berryTea":{"stamina":24,"buff":"pollen","recipe":{"needs":[["driedTea",1],["berryJam",1]],"in":["pot"],"serves":3,"cooks":1}},"blueCornCake":{"stamina":30,"buff":"pollen","recipe":{"needs":[["blueCornFlour",2],["sunflowerOil",1],["sugar",1]],"in":["pan"],"serves":3,"cooks":1}},"lotusGardenSoup":{"stamina":28,"buff":"pollen","recipe":{"needs":[["lotusStarch",1],["lotusRootBed",2],["redOkra",2]],"in":["pot"],"serves":3,"cooks":1}}}$garden$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=jsonb_set(data,'{tools}',coalesce(data #> '{tools}','{}'::jsonb) || $garden${"seedBottleGourd":"seed","seedRowBean":"seed","seedTrellisBerry":"seed","seedBlueCorn":"seed","seedTeaBush":"seed","seedSunflowerPatch":"seed","seedRedOkra":"seed","seedLotusRootBed":"seed"}$garden$::jsonb),updated_at=now() where key='farming';
update public.town_catalog set data=jsonb_set(data,'{seeds}',coalesce(data #> '{seeds}','{}'::jsonb) || $garden${"seedBottleGourd":"bottleGourd","seedRowBean":"rowBean","seedTrellisBerry":"trellisBerry","seedBlueCorn":"blueCorn","seedTeaBush":"teaBush","seedSunflowerPatch":"sunflowerPatch","seedRedOkra":"redOkra","seedLotusRootBed":"lotusRootBed"}$garden$::jsonb),updated_at=now() where key='farming';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data #> '{buffs}','{}'::jsonb) || $garden${"pollen":1}$garden$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data #> '{steps}','{}'::jsonb) || $garden${"pollen":[1,1,1,1]}$garden$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($garden$["gourdCup","beanPaste","berryJam","blueCornFlour","driedTea","sunflowerOil","lotusStarch","pollenRice","berryTea","blueCornCake","lotusGardenSoup"]$garden$::jsonb) with ordinality a(v,ord) where not (data #> '{recipes}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data #> '{needs}','{}'::jsonb) || $garden${"gourdCup":{"bottleGourd":2},"beanPaste":{"rowBean":3},"berryJam":{"sugar":1,"trellisBerry":3},"blueCornFlour":{"blueCorn":3},"driedTea":{"teaBush":3},"sunflowerOil":{"sunflowerPatch":3},"lotusStarch":{"lotusRootBed":3},"pollenRice":{"beanPaste":1,"rice":2},"berryTea":{"berryJam":1,"driedTea":1},"blueCornCake":{"blueCornFlour":2,"sugar":1,"sunflowerOil":1},"lotusGardenSoup":{"lotusRootBed":2,"lotusStarch":1,"redOkra":2}}$garden$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data #> '{bowled}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($garden$["pollenRice","berryTea","blueCornCake","lotusGardenSoup"]$garden$::jsonb) with ordinality a(v,ord) where not (data #> '{bowled}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data #> '{ids}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($garden$[["pollenRice",14],["lotusGardenSoup",55],["gourdCup",0],["beanPaste",14],["sunflowerOil",9],["lotusStarch",55],["berryTea",15],["blueCornCake",15],["berryJam",15],["blueCornFlour",4],["driedTea",2]]$garden$::jsonb) with ordinality a(v,ord) where not (data #> '{ids}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{farming}',coalesce(data #> '{farming}','{}'::jsonb) || $garden${"bottleGourd":6,"rowBean":5,"trellisBerry":16,"blueCorn":10,"teaBush":14,"sunflowerPatch":6,"redOkra":6,"lotusRootBed":10}$garden$::jsonb),updated_at=now() where key='work';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data #> '{kitchen,pot}','{}'::jsonb) || $garden${"gourdCup":1,"beanPaste":1,"berryJam":1,"blueCornFlour":1,"driedTea":1,"sunflowerOil":1,"lotusStarch":1,"pollenRice":3,"berryTea":3,"blueCornCake":3,"lotusGardenSoup":3}$garden$::jsonb),updated_at=now() where key='work';
insert into public.town_catalog(key,data) values('gardening',$garden${"version":1,"boost":3600000,"extra":1,"shapes":{"bottleGourd":[[0,0],[1,0],[1,1]],"rowBean":[[0,0],[1,0]],"trellisBerry":[[0,0],[0,1],[0,2]],"blueCorn":[[0,0],[1,0],[2,0]],"teaBush":[[0,0],[1,0]],"sunflowerPatch":[[0,0],[1,0],[0,1]],"redOkra":[[0,0],[0,1]],"lotusRootBed":[[0,0],[1,0],[2,0]]},"crosses":[["pumpkin","cucumber","bottleGourd"],["longBean","basil","rowBean"],["rowBean","teaBush","trellisBerry"],["corn","sunflowerPatch","blueCorn"],["basil","lemongrass","teaBush"],["corn","basil","sunflowerPatch"],["chili","longBean","redOkra"],["taro","kangkong","lotusRootBed"]]}$garden$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','{}'::jsonb) || $garden${"pollenBrush":{"needs":[["feather",3],["splitPlank",1]],"fee":24},"graftKnife":{"needs":[["steelPlate",1],["gourdCup",1]],"fee":25},"rootGuide":{"needs":[["splitPlank",2],["rootTwine",1]],"fee":20},"soilScoop":{"needs":[["copperBlank",1],["timber",1]],"fee":23},"seedTray":{"needs":[["splitPlank",2],["pitchSeal",1]],"fee":22},"gardenTwine":{"needs":[["rootTwine",2],["splitPlank",1]],"fee":21},"seedBottleGourd":{"needs":[["pumpkin",2],["compost",1]],"fee":4},"seedRowBean":{"needs":[["longBean",2],["compost",1]],"fee":4},"seedTrellisBerry":{"needs":[["wildStrawberry",2],["compost",1]],"fee":4},"seedBlueCorn":{"needs":[["corn",2],["compost",1]],"fee":4},"seedTeaBush":{"needs":[["basil",2],["compost",1]],"fee":4},"seedSunflowerPatch":{"needs":[["corn",2],["oil",1]],"fee":4},"seedRedOkra":{"needs":[["chili",2],["compost",1]],"fee":4},"seedLotusRootBed":{"needs":[["taro",2],["compost",1]],"fee":4}}$garden$::jsonb),updated_at=now() where key='workshop';

create or replace function town.garden_plots(p_key text)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(p.x::text||','||p.y::text,jsonb_build_object('soil',p.soil,'plant',coalesce(p.plant,'null'::jsonb)) || case when p.damp then '{"damp":true}'::jsonb else '{}'::jsonb end),'{}'::jsonb)
 from public.town_plots p where p.bed=town.bed_of(split_part(p_key,',',1)::integer,split_part(p_key,',',2)::integer)
$$;
create or replace function town.garden_shape(p_key text,p_crop text,p_rotation integer)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 x integer:=split_part(p_key,',',1)::integer; y integer:=split_part(p_key,',',2)::integer;
 bed integer:=town.bed_of(x,y); cells jsonb:='[]'::jsonb; o jsonb; u integer; v integer; swap integer; r integer;
begin
 if p_rotation is null or p_rotation not between 0 and 3 or bed<0 then return null; end if;
 for o in select e.v from jsonb_array_elements(coalesce(town.cat('gardening')->'shapes'->p_crop,'[[0,0]]'::jsonb)) with ordinality e(v,ord) order by ord loop
  u:=(o->>0)::integer; v:=(o->>1)::integer;
  for r in 1..p_rotation loop swap:=u; u:=-v; v:=swap; end loop;
  if town.bed_of(x+u,y+v)<>bed then return null; end if;
  cells:=cells || jsonb_build_array((x+u)::text||','||(y+v)::text);
 end loop;
 return cells;
end $$;
create or replace function town.garden_room(p_key text,p_crop text,p_plots jsonb,p_rotation integer)
returns jsonb language sql stable set search_path='' as $$
 select case when cells is not null and not exists(select 1 from jsonb_array_elements_text(cells) c(k) where p_plots->c.k->>'soil' is distinct from 'tilled' or coalesce(p_plots->c.k->'plant','null'::jsonb)<>'null'::jsonb) then cells end
 from (select town.garden_shape(p_key,p_crop,p_rotation) cells) s
$$;
create or replace function town.garden_cross(p_key text,p_plots jsonb,p_me text,p_now bigint)
returns text language plpgsql stable set search_path='' as $$
declare
 p jsonb:=p_plots->p_key->'plant'; c jsonb; other text; q record; mine text; theirs text; x integer; y integer; u integer; v integer;
begin
 if p is null or p='null'::jsonb or p->>'by' is distinct from p_me or coalesce((p->>'crossed')::boolean,false) or not (town.see(p_key,p_plots->p_key,p_now)->>'ripe')::boolean then return null; end if;
 for c in select e.v from jsonb_array_elements(town.cat('gardening')->'crosses') with ordinality e(v,ord) order by ord loop
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when not (town.see(q.key,q.value,p_now)->>'ripe')::boolean;
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then return c->>2; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 return null;
end $$;
create or replace function town.garden_harvest(p_key text,p_before jsonb,p_plot jsonb,p_plots jsonb,p_done jsonb,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 p jsonb:=p_plot->'plant'; after_ jsonb:=p_done->'purse'; updated jsonb:=p_done->'plot'; extras jsonb:='[]'::jsonb;
 child text:=town.garden_cross(p_key,p_plots,p->>'by',p_now); book jsonb; stowed jsonb;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return p_done; end if;
 if p->>'root' is not null and town.held(p_before->'bag','gardenTwine')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(p->>'crop',(town.cat('gardening')->>'extra')::integer)); end if;
 if updated->'plant'='null'::jsonb and p->>'root' is not null and town.held(p_before->'bag','seedTray')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->(p->>'crop')->>'seed',1)); end if;
 if child is not null then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->child->>'seed',case when town.held(p_before->'bag','graftKnife')>0 then 2 else 1 end)); end if;
 stowed:=town.stow_all(after_,extras);
 if stowed is null then return town.no('full'); end if;
 after_:=stowed;
 if child is not null then
  book:=coalesce(after_->'gardenBook','[]'::jsonb);
  if not book ? child then book:=book || to_jsonb(child); end if;
  after_:=after_ || jsonb_build_object('gardenBook',book);
  if updated->'plant'<>'null'::jsonb then updated:=jsonb_set(updated,'{plant,crossed}','true'::jsonb); end if;
 end if;
 return p_done || jsonb_build_object('purse',after_,'plot',updated,'got',p_done->'got' || extras) || case when child is not null then jsonb_build_object('cross',child) else '{}'::jsonb end;
end $$;
create or replace function town.garden_sown(p_key text,p_before jsonb,p_done jsonb,p_cells jsonb,p_rotation integer)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_set(p_done,'{plot,plant}',p_done->'plot'->'plant' || jsonb_build_object('root',p_key,'footprint',p_cells,'rotation',p_rotation,'boost',(p_done->'plot'->'plant'->>'boost')::numeric+case when town.held(p_before->'bag','soilScoop')>0 then (town.cat('gardening')->>'boost')::numeric else 0 end))
$$;
create or replace function town.garden_spread()
returns trigger language plpgsql set search_path='' as $$
declare
 root_ text:=new.x::text||','||new.y::text; before_ jsonb; plant_ jsonb; footprint jsonb; cell text; x_ integer; y_ integer;
begin
 if pg_trigger_depth()>1 then return new; end if;
 if tg_op='UPDATE' then before_:=old.plant; end if;
 if new.plant->>'root'=root_ then plant_:=new.plant; footprint:=new.plant->'footprint';
 elsif before_->>'root'=root_ then footprint:=before_->'footprint'; else return new; end if;
 for cell in select jsonb_array_elements_text(footprint) loop
  continue when cell=root_; x_:=split_part(cell,',',1)::integer; y_:=split_part(cell,',',2)::integer;
  if plant_ is not null then
   insert into public.town_plots(x,y,bed,soil,plant,damp,changed) values(x_,y_,new.bed,new.soil,plant_,new.damp,new.changed)
    on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,damp=excluded.damp,changed=excluded.changed where public.town_plots.plant is null or public.town_plots.plant->>'root'=root_;
  else
   update public.town_plots set soil='cleared',plant=null,damp=new.damp,changed=new.changed where x=x_ and y=y_ and bed=new.bed and plant->>'root'=root_;
  end if;
 end loop;
 return new;
end $$;
revoke all on function town.garden_plots(text),town.garden_shape(text,text,integer),town.garden_room(text,text,jsonb,integer),town.garden_cross(text,jsonb,text,bigint),town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint),town.garden_sown(text,jsonb,jsonb,jsonb,integer),town.garden_spread() from public,anon,authenticated;
drop trigger if exists town_garden_spread on public.town_plots;
create trigger town_garden_spread after insert or update of plant,soil,damp on public.town_plots for each row execute function town.garden_spread();

CREATE OR REPLACE FUNCTION town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if p->>'root' is not null and p->>'root' <> p_key then return null; end if;
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now
       and (not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null) then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
begin
  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(mine->'bag', p->>'crop', n))),p_now);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.row_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  x0 integer;
  deed text;
  row_ jsonb;
  hoes boolean;
  sows boolean;
  reaps boolean;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) then return null; end if;
  deed := town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner);
  if deed is null then return null; end if;
  if deed='sow' and town.cat('gardening')->'shapes' ? (town.cat('farming')->'seeds'->>hand) then return null; end if;
  hoes := deed in ('clear', 'till') and town.wearing(p_purse, 'charmHoe');
  sows := deed = 'sow' and town.gift_works(p_purse, 'thingPouch');
  -- (the sickle is for its wearer's own beds: not somebody else's, nor one that is nobody's)
  reaps := deed = 'pick' and p_owner is not distinct from p_me and town.wearing(p_purse, 'charmSickle');
  if not hoes and not sows and not reaps then return null; end if;
  x0 := split_part(p_at, ',', 1)::integer;
  -- (the pouch sows as many plots as the seeds in the bag reach, the nearest first)
  select jsonb_agg(q.key_ order by q.far, q.x) into row_
    from (
      select k.key_, abs(split_part(k.key_, ',', 1)::integer - x0) as far, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed
       order by far, x
       limit case when sows then town.pouch_plots(town.held(p_purse->'bag', hand), jsonb_array_length(p_keys)) end
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return null; end if;
  return jsonb_build_object('deed', deed, 'plots', row_);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_tend(p_x integer, p_y integer, p_timing jsonb DEFAULT NULL::jsonb, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
  -- ── the older tools (v174): the plots of the row as they stood, what the deed did beside its own plot, those plots as they are kept, and one of them ──
  row_ jsonb;
  more_ jsonb;
  also_ jsonb;
  k_ text;
  beside_ jsonb;
  garden_ jsonb;
  cells_ jsonb;
  rotation_ integer := 0;
  crop_ text;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): the plot with its `damp`, where it has one ──
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  garden_ := town.garden_plots(key);
  crop_ := town.cat('farming')->'seeds'->>town.hand_of(purse);
  if coalesce(plot->'plant','null'::jsonb)='null'::jsonb and town.cat('gardening')->'shapes' ? crop_ then
    if p_timing ? 'rotation' and not coalesce(jsonb_typeof(p_timing->'rotation')='number' and (p_timing->>'rotation')::numeric between 0 and 3 and (p_timing->>'rotation')::numeric=floor((p_timing->>'rotation')::numeric),false) then return town.answer(me,town.no('none')); end if;
    rotation_ := coalesce((p_timing->>'rotation')::integer,0);
    cells_ := town.garden_room(key,crop_,garden_,rotation_);
    if cells_ is null then return town.answer(me,town.no('soil')); end if;
  end if;
  if plot->'plant'->>'root'=key then others:=greatest(0,others-jsonb_array_length(plot->'plant'->'footprint')+1); end if;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  if did->>'deed'='sow' and cells_ is not null then did:=town.garden_sown(key,purse,did,cells_,rotation_); end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- ── the older tools (v174): what the lines of work read of a forged can (nothing, of any other) ──
        || town.kind_doc(purse, did->>'deed', plot, me::text)
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
  end if;
  -- ── the older tools (v174): what a deed done with a forged hoe or can does to the plots beside its own: plots of this row of this bed, which is held whole above; each is kept as the deed's own was, and none is a deed of its own ──
  if did->>'deed' in ('clear', 'till', 'water') and purse->>'hand' in ('hoe', 'can') and town.bag_forged(purse->'bag', purse->>'hand') and town.forged(town.hand_stack(purse)) then
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into row_
      from public.town_plots p where p.bed = bed_n and (p.y = p_y or town.tool_has(town.hand_stack(purse), 'cnRain'));
    more_ := town.beside(key, case when town.tool_has(town.hand_stack(purse), 'cnRain') then town.bed_keys(p_x, p_y) else town.row_keys(p_x, p_y) end, row_ || jsonb_build_object(key, plot), did->>'deed', purse, after, me::text, now_,
      town.owner_of(keeping, others > 0 or coalesce(plot->'plant', 'null'::jsonb) <> 'null'::jsonb, now_));
    after := more_->'purse';
    for k_ in select o.key from jsonb_each(more_->'plots') o order by split_part(o.key, ',', 1)::integer loop
      beside_ := more_->'plots'->k_;
      if did->>'deed' = 'water' and row_ ? k_ then
        beside_ := town.poured_as(row_->k_, beside_, now_, town.hot(now_), town.well_kind(now_), me::text, 1, wears);
      end if;
      insert into public.town_plots (x, y, bed, soil, plant, changed)
        values (split_part(k_, ',', 1)::integer, split_part(k_, ',', 2)::integer, bed_n, beside_->>'soil', nullif(beside_->'plant', 'null'::jsonb), now_)
        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
      also_ := coalesce(also_, '{}'::jsonb) || jsonb_build_object(k_, beside_);
    end loop;
  end if;
  -- ── the older tools (v174): its end ──
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then
    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;
  end if;
  -- ── the older tools (v174): its end ──
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  if cells_ is not null or plot->'plant' ? 'footprint' then
    select coalesce(jsonb_object_agg(p.x::text||','||p.y::text,jsonb_build_object('soil',p.soil,'plant',coalesce(p.plant,'null'::jsonb))),'{}'::jsonb) || coalesce(also_,'{}'::jsonb) into also_
      from public.town_plots p where p.bed=bed_n and p.x::text||','||p.y::text <> key and coalesce(cells_,plot->'plant'->'footprint') ? (p.x::text||','||p.y::text);
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses)
    -- ── the older tools (v174): the plots beside it that the deed changed, by their keys and as they are kept ──
    || case when also_ is not null then jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.glass_turn(p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb := town.cat('farming')->'gifted'->'glass';
  span numeric := (k->>'hours')::numeric * 3600000;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  live text[];
  used jsonb;
  key text;
  p jsonb;
  fast jsonb;
  next jsonb := '{}'::jsonb;
begin
  if not town.gift_works(p_purse, 'thingHourglass') then return town.no('none'); end if;
  if town.used_of(p_purse, 'thingHourglass', p_now) >= (town.cat('gifts')->'uses'->'thingHourglass'->>'n')::integer then return town.no('spent'); end if;
  if p_owner is distinct from p_me then return town.no('theirs'); end if;
  select coalesce(array_agg(e.key order by split_part(e.key, ',', 2)::int, split_part(e.key, ',', 1)::int), '{}'::text[]) into live
    from jsonb_each(plots) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) and not (town.see(e.key, e.value, p_now)->>'dead')::boolean;
  -- (while the sand still runs over a plant of the bed it is not turned again)
  if exists (
    select 1 from unnest(live) as l(key_),
           jsonb_array_elements(case when jsonb_typeof(plots->l.key_->'plant'->'fast') = 'array' then plots->l.key_->'plant'->'fast' else '[]'::jsonb end) as f(at)
     where jsonb_typeof(f.at) = 'number' and (f.at #>> '{}')::numeric <= p_now and p_now < (f.at #>> '{}')::numeric + span) then return town.no('running'); end if;
  -- (it is turned for what is still on its way: a bed of plants that only wait to be picked has nothing to gain)
  if not exists (select 1 from unnest(live) as l(key_) where not (town.see(l.key_, plots->l.key_, p_now)->>'ripe')::boolean) then return town.no('soil'); end if;
  used := town.gift_use(p_purse, 'thingHourglass', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  foreach key in array live loop
    p := plots->key->'plant';
    -- (the turnings it remembers, this one last: the newest so many)
    select coalesce(jsonb_agg(q.at order by q.ord), '[]'::jsonb) into fast
      from (
        select t.at, t.ord
          from (select f.at, f.ord from jsonb_array_elements(case when jsonb_typeof(p->'fast') = 'array' then p->'fast' else '[]'::jsonb end) with ordinality as f(at, ord)
                 where jsonb_typeof(f.at) = 'number'
                union all select to_jsonb(p_now), 9223372036854775807) t
         order by t.ord desc limit (k->>'kept')::int
      ) q;
    next := next || jsonb_build_object(key, (plots->key) || jsonb_build_object('plant', p || jsonb_build_object('fast', fast)));
  end loop;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'plots', next, 'quickened', to_jsonb(live), 'until', p_now + span::bigint);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
  cell_ text;
  extras_ jsonb:='[]'::jsonb;
  got_ jsonb;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', coalesce(got_,'[]'::jsonb))
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_row(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): each plot with its `damp`, where it has one ──
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
    -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then
      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;
    end if;
    -- ── the older tools (v174): its end ──
  end loop;
  if n > 0 then
    perform town.keep_purse(me, did->'purse');
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$function$
;
notify pgrst,'reload schema';
commit;
-- Expected: eight shapes and eight crosses; private reward helper.
select data from public.town_catalog where key='gardening';
select has_function_privilege('authenticated','town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)','EXECUTE') as helper; -- false
