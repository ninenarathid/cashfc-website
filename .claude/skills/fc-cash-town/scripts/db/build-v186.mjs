import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {GARDEN_ITEMS,GARDEN_SEED_ITEMS,GARDEN_SCROLL_ITEMS,GARDEN_SCROLLS,GARDEN_MAKES,GARDEN_DISHES,GARDEN_CROPS,GARDEN_CRAFTS}=await import('@/lib/town/garden-items');
const {standIn}=await import('./stand-in.mjs');
const t=await standIn({upTo:179});
const signatures=['town.deed_for(text,jsonb,text,text,bigint,text)','town.pick(text,jsonb,jsonb,boolean,text,bigint)','town.row_for(text,jsonb,jsonb,jsonb,text,bigint,text)','public.town_tend(integer,integer,jsonb,boolean)','town.glass_turn(jsonb,jsonb,text,bigint,text)','town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)','public.town_row(integer,integer,jsonb,jsonb)'];
const defs=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def.replaceAll('\r','')));
const replace=(s,a,b)=>{if(!s.includes(a))throw new Error('Definition moved: '+a);return s.replace(a,b);};
const deed=replace(defs[0],"  if kind = 'hoe' then", "  if p->>'root' is not null and p->>'root' <> p_key then return null; end if;\n  if kind = 'hoe' then");
let pick=replace(defs[1],"  if p = 'null'::jsonb then", "  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then");
pick=replace(pick,"  return jsonb_build_object('ok', true, 'got'", "  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got'");
pick=replace(pick,"town.put(mine->'bag', p->>'crop', n)));", "town.put(mine->'bag', p->>'crop', n))),p_now);");
const row=replace(defs[2],"  if deed is null then return null; end if;", "  if deed is null then return null; end if;\n  if deed='sow' and town.cat('gardening')->'shapes' ? (town.cat('farming')->'seeds'->>hand) then return null; end if;");
let rpc=replace(defs[3],'  beside_ jsonb;','  beside_ jsonb;\n  garden_ jsonb;\n  cells_ jsonb;\n  rotation_ integer := 0;\n  crop_ text;');
rpc=replace(rpc,'  did := town.tend(',`  garden_ := town.garden_plots(key);
  crop_ := town.cat('farming')->'seeds'->>town.hand_of(purse);
  if coalesce(plot->'plant','null'::jsonb)='null'::jsonb and town.cat('gardening')->'shapes' ? crop_ then
    if p_timing ? 'rotation' and not coalesce(jsonb_typeof(p_timing->'rotation')='number' and (p_timing->>'rotation')::numeric between 0 and 3 and (p_timing->>'rotation')::numeric=floor((p_timing->>'rotation')::numeric),false) then return town.answer(me,town.no('none')); end if;
    rotation_ := coalesce((p_timing->>'rotation')::integer,0);
    cells_ := town.garden_room(key,crop_,garden_,rotation_);
    if cells_ is null then return town.answer(me,town.no('soil')); end if;
  end if;
  if plot->'plant'->>'root'=key then others:=greatest(0,others-jsonb_array_length(plot->'plant'->'footprint')+1); end if;
  did := town.tend(`);
rpc=replace(rpc,"  after := did->'purse';",`  if did->>'deed'='sow' and cells_ is not null then did:=town.garden_sown(key,purse,did,cells_,rotation_); end if;
  after := did->'purse';`);
rpc=replace(rpc,"  return town.answer(me, did - 'plot' - 'bed')",`  if cells_ is not null or plot->'plant' ? 'footprint' then
    select coalesce(jsonb_object_agg(p.x::text||','||p.y::text,jsonb_build_object('soil',p.soil,'plant',coalesce(p.plant,'null'::jsonb))),'{}'::jsonb) || coalesce(also_,'{}'::jsonb) into also_
      from public.town_plots p where p.bed=bed_n and p.x::text||','||p.y::text <> key and coalesce(cells_,plot->'plant'->'footprint') ? (p.x::text||','||p.y::text);
  end if;
  return town.answer(me, did - 'plot' - 'bed')`);
const glass=replace(defs[4], "and not (town.see(e.key, e.value, p_now)->>'dead')::boolean;", "and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) and not (town.see(e.key, e.value, p_now)->>'dead')::boolean;");
let rowTend=replace(defs[5],'  well boolean;','  well boolean;\n  cell_ text;\n  extras_ jsonb:=\'[]\'::jsonb;\n  got_ jsonb;');
rowTend=replace(rowTend,'    did := town.tend(key, plot, bed, others,',`    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others,`);
rowTend=replace(rowTend,"    state := state || jsonb_build_object(key, did->'plot');",`    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;`);
const gotStart=rowTend.indexOf("      'got', case when reaps then");
const gotEnd=rowTend.indexOf("    || case when bed is null",gotStart);
if(gotStart<0||gotEnd<0)throw new Error('row reward moved');
rowTend=rowTend.slice(0,gotStart)+"      'got', coalesce(got_,'[]'::jsonb))\n"+rowTend.slice(gotEnd);
rowTend=replace(rowTend,"  return jsonb_build_object('ok', true, 'deed', found->>'deed'",`  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  return jsonb_build_object('ok', true, 'deed', found->>'deed'`);
const rowRpc=replace(defs[6],'from public.town_plots p where p.bed = bed_n and p.y = p_y;', 'from public.town_plots p where p.bed = bed_n;');
const helpers=`
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
`;
const cat=catalogOf(),take=(r,ids)=>Object.fromEntries(ids.map(id=>[id,r[id]])),json=v=>`$garden$${JSON.stringify(v)}$garden$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data || ${json(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','{}'::jsonb) || ${json(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,ids)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${path}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const crops=Object.keys(GARDEN_CROPS),made=[...Object.keys(GARDEN_MAKES),...Object.keys(GARDEN_DISHES)],seeds=Object.keys(GARDEN_SEED_ITEMS);
const patches=[root('items',take(cat.items,[...Object.keys(GARDEN_ITEMS),...seeds,...Object.keys(GARDEN_SCROLL_ITEMS)])),root('crops',take(cat.crops,crops)),root('scrolls',GARDEN_SCROLLS),root('makes',take(cat.makes,Object.keys(GARDEN_MAKES))),root('dishes',take(cat.dishes,Object.keys(GARDEN_DISHES))),merge('farming','tools',take(cat.farming.tools,seeds)),merge('farming','seeds',take(cat.farming.seeds,seeds)),merge('stamina','buffs',{pollen:cat.stamina.buffs.pollen}),merge('stamina','steps',{pollen:cat.stamina.steps.pollen}),append('cooking','recipes',made),merge('cooking','needs',take(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(GARDEN_DISHES)),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','farming',take(cat.work.farming,crops)),merge('work','kitchen,pot',take(cat.work.kitchen.pot,made)),`insert into public.town_catalog(key,data) values('gardening',${json(cat.gardening)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
patches.push(merge('workshop','recipes',take(cat.workshop.recipes,Object.keys(GARDEN_CRAFTS))));
const newer=[deed,pick,row,rpc,glass,rowTend,rowRpc],md5=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
await t.run(patches.join('\n')+helpers+newer.join(';\n')+';','derive v186 hashes');
const after=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def));
const guard=`do $guard$ begin
 if town.cat('geology') is null then raise exception 'Run v185 first'; end if;
 ${signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(after[i])}') then raise exception 'Definition changed: ${sig}; rebuild v186'; end if;`).join('\n ')}
end $guard$;`;
writeFileSync(join(process.env.FC_REPO,'supabase/v186_a_garden_that_spreads_and_crosses.sql'),`-- v186: rotating footprints, neighbouring crosses and 25 useful garden items.
-- Run after v185 and the matching site. Safe to run twice. No existing purse or plot is reset.
-- Whole-bed locks precede planting and picking. One root pays; its reserved plots mirror every care deed.
begin;
${guard}
${patches.join('\n')}
${helpers}
${newer.join(';\n')};
notify pgrst,'reload schema';
commit;
-- Expected: eight shapes and eight crosses; private reward helper.
select data from public.town_catalog where key='gardening';
select has_function_privilege('authenticated','town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)','EXECUTE') as helper; -- false
`);
await t.db.close();console.log('Wrote guarded v186 garden migration.');
