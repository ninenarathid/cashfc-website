-- v187: eight insect visitors, garden releases and 25 useful insect-line items.
-- Run after v186 and the matching site. Safe to run twice. No purse, plot or coins reset.
-- A released insect is consumed once; the plant remembers each pollinated bearing.
begin;
do $guard$ begin if town.cat('gardening') is null then raise exception 'Run v186 first'; end if; if md5(replace(pg_get_functiondef('town.farm_bugs(bigint)'::regprocedure),chr(13),'')) not in ('7a920eed619968e0ee16dadaec2ca0f0','d1e8e1a6d1c2280fb4235e8d8045338a') then raise exception 'Definition changed: town.farm_bugs(bigint); rebuild v187 on current text'; end if;
if md5(replace(pg_get_functiondef('town.rid_pick(jsonb,bigint,double precision)'::regprocedure),chr(13),'')) not in ('0cc0efce71f4e72c78fe6963f7f84b12','970d2d03c35189c45263aa7476f4c30e') then raise exception 'Definition changed: town.rid_pick(jsonb,bigint,double precision); rebuild v187 on current text'; end if; end $guard$;
update public.town_catalog set data=data || $insects${"honeyBee":{"kind":"bug","tier":2,"stack":20,"pays":6},"carpenterBee":{"kind":"bug","tier":2,"stack":20,"pays":12},"lacewing":{"kind":"bug","tier":2,"stack":20,"pays":9},"hoverfly":{"kind":"bug","tier":2,"stack":20,"pays":7},"silkMoth":{"kind":"bug","tier":3,"stack":20,"pays":16},"goldenAnt":{"kind":"bug","tier":2,"stack":20,"pays":8},"orchardBeetle":{"kind":"bug","tier":3,"stack":20,"pays":14},"pollenMidge":{"kind":"bug","tier":2,"stack":20,"pays":10},"honeycomb":{"kind":"staple","tier":2,"stack":20,"pays":16},"gardenHoney":{"kind":"staple","tier":2,"stack":20,"pays":13},"beeswax":{"kind":"goods","tier":2,"stack":20,"pays":19},"silkTwist":{"kind":"goods","tier":3,"stack":20,"pays":21},"silkenCord":{"kind":"goods","tier":3,"stack":20,"pays":34},"chitinPlate":{"kind":"goods","tier":3,"stack":20,"pays":21},"nectarSyrup":{"kind":"staple","tier":2,"stack":20,"pays":19},"routeLens":{"kind":"tool","tier":2,"stack":1,"pays":28},"scentSatchel":{"kind":"tool","tier":2,"stack":1,"pays":27},"nectarVial":{"kind":"tool","tier":2,"stack":1,"pays":26},"releaseCage":{"kind":"tool","tier":2,"stack":1,"pays":29},"pollenFan":{"kind":"tool","tier":2,"stack":1,"pays":25},"pestWhistle":{"kind":"tool","tier":2,"stack":1,"pays":30},"nectarRice":{"kind":"dish","tier":2,"stack":20,"pays":24},"honeyHerbTea":{"kind":"dish","tier":2,"stack":20,"pays":23},"pollenCake":{"kind":"dish","tier":2,"stack":20,"pays":26},"orchardSoup":{"kind":"dish","tier":3,"stack":20,"pays":27},"scrollNectarRice":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollHoneyHerbTea":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollPollenCake":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollOrchardSoup":{"kind":"scroll","tier":3,"stack":20,"pays":12}}$insects$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data || $insects${"honeycomb":{"needs":[["honeyBee",2],["sugar",1]],"in":["pot"],"gives":1},"gardenHoney":{"needs":[["honeycomb",2]],"in":["pot"],"gives":3},"beeswax":{"needs":[["honeycomb",2],["pinePitch",1]],"in":["pan"],"gives":2},"silkTwist":{"needs":[["silkMoth",1],["silkCocoon",2]],"in":["mortar"],"gives":2},"silkenCord":{"needs":[["silkTwist",3]],"in":["mortar"],"gives":2},"chitinPlate":{"needs":[["orchardBeetle",2],["pitchSeal",1]],"in":["pan"],"gives":2},"nectarSyrup":{"needs":[["gardenHoney",2],["basil",2]],"in":["pot"],"gives":2}}$insects$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data || $insects${"nectarRice":{"stamina":28,"buff":"scent","recipe":{"needs":[["gardenHoney",1],["rice",2]],"in":["pot"],"serves":3,"cooks":1}},"honeyHerbTea":{"stamina":24,"buff":"scent","recipe":{"needs":[["gardenHoney",1],["basil",2]],"in":["pot"],"serves":3,"cooks":1}},"pollenCake":{"stamina":30,"buff":"scent","recipe":{"needs":[["nectarSyrup",1],["flour",2]],"in":["pan"],"serves":3,"cooks":1}},"orchardSoup":{"stamina":32,"buff":"scent","recipe":{"needs":[["gardenHoney",1],["trellisBerry",1],["lotusRootBed",2]],"in":["pot"],"serves":3,"cooks":1}}}$insects$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=data || $insects${"scrollNectarRice":"nectarRice","scrollHoneyHerbTea":"honeyHerbTea","scrollPollenCake":"pollenCake","scrollOrchardSoup":"orchardSoup"}$insects$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=jsonb_set(data,'{bugs}',coalesce(data #> '{bugs}','{}'::jsonb) || $insects${"honeyBee":{"habit":"path","at":["blooms","field"],"hours":[[6,17]],"dry":true,"weight":8,"n":[1,1],"cost":3},"carpenterBee":{"habit":"behind","at":["tree","glade"],"hours":[[8,17]],"dry":true,"weight":5,"n":[1,1],"cost":5},"lacewing":{"habit":"lamp","at":["lamp","blooms"],"hours":[[18,24],[0,5]],"weight":8,"n":[1,1],"cost":4},"hoverfly":{"habit":"spot","at":["blooms","field"],"hours":[[7,18]],"dry":true,"weight":8,"n":[1,1],"cost":4},"silkMoth":{"habit":"lamp","at":["tree","lamp"],"hours":[[19,24],[0,4]],"day":0.5,"weight":4,"n":[1,1],"cost":6},"goldenAnt":{"habit":"crawl","at":["litter","field"],"hours":[[6,19]],"weight":8,"n":[1,2],"cost":5},"orchardBeetle":{"habit":"lure","at":["tree","glade"],"hours":[[6,18]],"weight":5,"n":[1,1],"cost":6},"pollenMidge":{"habit":"spot","at":["blooms","water"],"hours":[[5,10],[16,19]],"dry":true,"weight":6,"n":[1,2],"cost":6}}$insects$::jsonb),updated_at=now() where key='insects';
update public.town_catalog set data=jsonb_set(data,'{lures}',coalesce(data #> '{lures}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$["nectarVial"]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{lures}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='insects';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data #> '{buffs}','{}'::jsonb) || $insects${"scent":0.15}$insects$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data #> '{steps}','{}'::jsonb) || $insects${"scent":[0.15,0.2,0.25,0.3]}$insects$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$["honeycomb","gardenHoney","beeswax","silkTwist","silkenCord","chitinPlate","nectarSyrup","nectarRice","honeyHerbTea","pollenCake","orchardSoup"]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{recipes}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data #> '{needs}','{}'::jsonb) || $insects${"honeycomb":{"honeyBee":2,"sugar":1},"gardenHoney":{"honeycomb":2},"beeswax":{"honeycomb":2,"pinePitch":1},"silkTwist":{"silkCocoon":2,"silkMoth":1},"silkenCord":{"silkTwist":3},"chitinPlate":{"orchardBeetle":2,"pitchSeal":1},"nectarSyrup":{"basil":2,"gardenHoney":2},"nectarRice":{"gardenHoney":1,"rice":2},"honeyHerbTea":{"basil":2,"gardenHoney":1},"pollenCake":{"flour":2,"nectarSyrup":1},"orchardSoup":{"gardenHoney":1,"lotusRootBed":2,"trellisBerry":1}}$insects$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data #> '{bowled}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$["nectarRice","honeyHerbTea","pollenCake","orchardSoup"]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{bowled}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data #> '{ids}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$[["nectarRice",15],["honeyHerbTea",15],["pollenCake",15],["honeycomb",15],["gardenHoney",15],["beeswax",15],["nectarSyrup",15],["orchardSoup",55],["silkTwist",0],["silkenCord",0],["chitinPlate",0]]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{ids}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{insects}',coalesce(data #> '{insects}','{}'::jsonb) || $insects${"honeyBee":1,"carpenterBee":3,"lacewing":3,"hoverfly":3,"silkMoth":3,"goldenAnt":1,"orchardBeetle":8,"pollenMidge":3}$insects$::jsonb),updated_at=now() where key='work';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data #> '{kitchen,pot}','{}'::jsonb) || $insects${"honeycomb":1,"gardenHoney":1,"beeswax":1,"silkTwist":1,"silkenCord":1,"chitinPlate":1,"nectarSyrup":1,"nectarRice":3,"honeyHerbTea":3,"pollenCake":3,"orchardSoup":3}$insects$::jsonb),updated_at=now() where key='work';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','{}'::jsonb) || $insects${"routeLens":{"needs":[["crystalLens",1],["splitPlank",1]],"fee":28},"scentSatchel":{"needs":[["silkenCord",1],["basil",3]],"fee":27},"nectarVial":{"needs":[["nectarSyrup",1],["beeswax",1]],"fee":26},"releaseCage":{"needs":[["bambooShoot",3],["silkenCord",1]],"fee":29},"pollenFan":{"needs":[["chitinPlate",1],["rootTwine",1]],"fee":25},"pestWhistle":{"needs":[["carvingBlank",1],["beeswax",1]],"fee":30}}$insects$::jsonb),updated_at=now() where key='workshop';
insert into public.town_catalog(key,data) values('insect_garden',$insects${"visitors":["honeyBee","carpenterBee","lacewing","hoverfly","silkMoth","goldenAnt","orchardBeetle","pollenMidge"],"boost":1800000,"fanBoost":2700000,"pollenMinutes":60,"cageMinutes":90,"guardMinutes":120,"satchel":0.85,"pollinators":["honeyBee","carpenterBee","hoverfly","pollenMidge","silkMoth","orchardBeetle","butterflyWhite","monarch","morpho","moth","lunaMoth","hawkMoth"],"predators":["lacewing","goldenAnt","mantis","ladybird","orchidMantis"]}$insects$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
update public.town_catalog set data=jsonb_set(data,'{order}',coalesce(data #> '{order}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$["honeyBee","carpenterBee","lacewing","hoverfly","silkMoth","goldenAnt","orchardBeetle","pollenMidge"]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{order}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='insects';
update public.town_catalog set data=jsonb_set(data,'{rare}',coalesce(data #> '{rare}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$[]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{rare}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='insects';
update public.town_catalog set data=jsonb_set(data,'{putIn,also}',coalesce(data #> '{putIn,also}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($insects$["honeyBee","silkMoth","orchardBeetle"]$insects$::jsonb) with ordinality a(v,ord) where not (data #> '{putIn,also}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';

create or replace function town.insect_care(p_key text,p_plot jsonb,p_purse jsonb,p_slot integer,p_mode text,p_me text,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 k jsonb:=town.cat('insect_garden'); s jsonb; p jsonb:=p_plot->'plant'; seen jsonb;
 plant_ jsonb; book jsonb:=coalesce(p_purse->'insectGardenBook','[]'::jsonb); entry text; allowed jsonb;
begin
 if p_slot is null or p_slot<0 or p_slot>=jsonb_array_length(p_purse->'bag') or p_mode is null or p_mode not in ('pollinate','guard') then return town.no('none'); end if;
 s:=p_purse->'bag'->p_slot;
 allowed:=case when p_mode='pollinate' then k->'pollinators' else k->'predators' end;
 if not coalesce(allowed ? (s->>'item') and (s->>'n')::numeric>=1,false) then return town.no('none'); end if;
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return town.no('soil'); end if;
 seen:=town.see(p_key,p_plot,p_now);
 if (seen->>'dead')::boolean then return town.no('soil'); end if;
 if p_mode='pollinate' and p->>'by' is distinct from p_me then return town.no('theirs'); end if;
 if p_mode='pollinate' and ((seen->>'ripe')::boolean or p->'pollenRound'=p->'picked') then return town.no('wet'); end if;
 if p_mode='guard' and not (seen->>'pest')::boolean then return town.no('soil'); end if;
 if p_mode='pollinate' then
  plant_:=p || jsonb_build_object('pollenRound',p->'picked','pollenUntil',p_now+60000*case when town.held(p_purse->'bag','releaseCage')>0 then (k->>'cageMinutes')::bigint else (k->>'pollenMinutes')::bigint end,
    'boost',(p->>'boost')::numeric+case when town.held(p_purse->'bag','pollenFan')>0 then (k->>'fanBoost')::numeric else (k->>'boost')::numeric end);
 else
  plant_:=p || jsonb_build_object('cured',p_now,'guard',greatest((p->>'guard')::bigint,case when town.held(p_purse->'bag','pestWhistle')>0 then p_now+(k->>'guardMinutes')::bigint*60000 else 0 end));
 end if;
 entry:=(s->>'item')||':'||(p->>'crop')||':'||p_mode;
 if not book ? entry then book:=book || to_jsonb(entry); end if;
 return jsonb_build_object('ok',true,'mode',p_mode,'plot',p_plot || jsonb_build_object('plant',plant_),
   'purse',p_purse || jsonb_build_object('bag',town.take(p_purse->'bag',s->>'item',1),'insectGardenBook',book));
end $$;
revoke all on function town.insect_care(text,jsonb,jsonb,integer,text,text,bigint) from public,anon,authenticated;
create or replace function public.town_insect_care(p_x integer,p_y integer,p_slot integer,p_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=town.member(); purse jsonb; now_ bigint:=town.now_ms(); bed_ integer:=town.bed_of(coalesce(p_x,-1),coalesce(p_y,-1));
 key_ text:=p_x::text||','||p_y::text; plot jsonb; did jsonb;
begin
 perform 1 from public.town_purses pp where pp.member_id=me for update;
 purse:=town.purse_of(me,true);
 if bed_<0 then return town.answer(me,town.no('none')); end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);
 select jsonb_build_object('soil',p.soil,'plant',coalesce(p.plant,'null'::jsonb)) || case when p.damp then '{"damp":true}'::jsonb else '{}'::jsonb end into plot from public.town_plots p where p.x=p_x and p.y=p_y;
 did:=town.insect_care(key_,coalesce(plot,'{"soil":"wild","plant":null}'::jsonb),purse,p_slot,p_mode,me::text,now_);
 if not (did->>'ok')::boolean then return town.answer(me,did); end if;
 update public.town_plots set plant=did->'plot'->'plant',changed=now_ where x=p_x and y=p_y;
 update public.town_beds set tended=now_ where bed=bed_ and member_id=me;
 perform town.keep_purse(me,did->'purse');
 perform town.note(me,case when p_mode='guard' then 'cure' else 'feed' end,plot->'plant'->>'crop',1,0,
   jsonb_build_object('tile',jsonb_build_array(p_x,p_y),'with',purse->'bag'->p_slot->>'item','released',true) || case when plot->'plant'->>'by'<>me::text then jsonb_build_object('whose',plot->'plant'->>'by') else '{}'::jsonb end);
 return town.answer(me,did-'purse'-'plot') || jsonb_build_object('key',key_,'plot',did->'plot');
end $$;
revoke all on function public.town_insect_care(integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.town_insect_care(integer,integer,integer,text) to authenticated;

CREATE OR REPLACE FUNCTION town.farm_bugs(p_now bigint)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(p_now);
  rids jsonb := coalesce(town.cat('farming')->'rids', '{}'::jsonb);
  has jsonb;
  taken integer;
  n integer := 0;
  i integer;
begin
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    continue when ins->'haunts'->i->>1 <> 'farm';
    has := town.bug_here(i, p_now, backs, ins, word);
    continue when has is null or rids ? (has->>'bug') or town.cat('insect_garden')->'visitors' ? (has->>'bug');
    select count(*)::int into taken from public.town_takes tk where tk.what = 'haunt' and tk.place = i and tk.turn = (has->>'turn')::bigint;
    continue when taken >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int;
    n := n + 1;
  end loop;
  return n;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.rid_pick(p_plots jsonb, p_now bigint, p_pick double precision)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kills bigint := (town.cat('farming')->'pests'->>'kills')::bigint * 3600000;
  keys text[];
  n integer;
begin
  select array_agg(e.key order by split_part(e.key, ',', 1)::int, split_part(e.key, ',', 2)::int) into keys
    from jsonb_each(coalesce(p_plots, '{}'::jsonb)) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb
     and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key)
     and p_now <= town.dies_at(e.value->'plant', town.pest_at(e.key, e.value->'plant', p_now), kills);
  n := coalesce(array_length(keys, 1), 0);
  if n = 0 then return null; end if;
  return keys[least(n, greatest(1, floor(coalesce(p_pick, 0) * n)::int + 1))];
end;
$function$
;
notify pgrst,'reload schema';
commit;
-- Expected: member-only release RPC, private helper, eight new species.
select has_function_privilege('anon','public.town_insect_care(integer,integer,integer,text)','EXECUTE') as anon_release,has_function_privilege('authenticated','public.town_insect_care(integer,integer,integer,text)','EXECUTE') as member_release;
select data from public.town_catalog where key='insect_garden';
