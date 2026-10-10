import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
await import('./repo-ts-town.mjs');
const { catalogOf } = await import('@/lib/town/catalog');
const { GEOLOGY_ITEMS, GEOLOGY_SCROLL_ITEMS, GEOLOGY_SCROLLS, GEOLOGY_MAKES, GEOLOGY_DISHES, GEOLOGY_RAW, GEOLOGY_CRAFTS } = await import('@/lib/town/geology-items');
const { standIn } = await import('./stand-in.mjs');
const t=await standIn({upTo:179}), signatures=['town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)','town.vein_end(jsonb,jsonb,bigint)','public.town_vein(jsonb)'];
const defs=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def.replaceAll('\r','')));
const replace=(s,a,b)=>{if(!s.includes(a))throw new Error(`Definition moved: ${a}`);return s.replace(a,b);};
const pay=replace(defs[0],"      'mods', town.vein_mods", "      'geology', town.geology_mods(p_purse,now_),\n      'mods', town.vein_mods");
let end=replace(defs[1],"  if vein_ = 'null'::jsonb",`  if p_go ? 'geology' and not town.rock_choice(p_go->'geology') then return town.no('none'); end if;
  if vein_ = 'null'::jsonb`);
end=replace(end,"  if chips > 0 and chip is not null then", "  if chips > 0 and chip is not null and coalesce(p_go->'geology'->>'focus','ore') <> 'crystal' then");
end=replace(end,'  stowed := town.stow_all(',`  if p_go ? 'geology' then got_ := got_ || town.geological_yield(vein_,p_go->'geology',ore,jsonb_array_length(p_go->'gems'),p_purse); end if;
  stowed := town.stow_all(`);
const rpc=replace(defs[2],"      || jsonb_build_object('said',", "      || case when said ? 'geology' then jsonb_build_object('geology',said->'geology') else '{}'::jsonb end\n      || jsonb_build_object('said',");
const helpers=`create or replace function town.rock_choice(p_choice jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select coalesce(jsonb_typeof(p_choice)='object' and p_choice->'echo' in ('-1'::jsonb,'1'::jsonb) and p_choice->>'focus' in ('ore','crystal'),false)
$$;
create or replace function town.geology_mods(p_purse jsonb,p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('hint',town.has_buff(p_purse,p_now,'layers') or town.held(p_purse->'bag','echoHammer')>0,'cavities',town.held(p_purse->'bag','cavityLens')>0,'preserve',town.held(p_purse->'bag','crystalWrap')>0,'sieve',town.held(p_purse->'bag','oreSieve')>0,'chisel',town.held(p_purse->'bag','seamChisel')>0,'cord',town.held(p_purse->'bag','surveyCord')>0)
$$;
create or replace function town.geological_yield(p_vein jsonb,p_choice jsonb,p_ore numeric,p_gems integer,p_purse jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
 k jsonb := town.cat('geology');
 correct boolean := (p_choice->>'echo')::integer = case when abs((p_vein->>'seed')::numeric) % 2 = 1 then 1 else -1 end;
 pool jsonb := case when (p_vein->>'f')::integer < 11 then '["slateLayer","clayPocket","mineralSalt","pyriteCluster"]'::jsonb when (p_vein->>'f')::integer < 21 then '["copperNodule","ironNodule","mineralSalt","pyriteCluster"]'::jsonb else '["silverNodule","ironNodule","copperNodule","pyriteCluster"]'::jsonb end;
 got jsonb := '[]'::jsonb;
begin
 if p_ore+p_gems <= 0 then return got; end if;
 if p_choice->>'focus'='crystal' then
  return case when p_gems>0 and coalesce(p_vein->'gem','null'::jsonb)<>'null'::jsonb and correct then jsonb_build_array(jsonb_build_array('wholeGeode',(k->>'crystal')::integer+case when town.held(p_purse->'bag','crystalWrap')>0 then 1 else 0 end)) else got end;
 end if;
 if p_ore>0 then got:=jsonb_build_array(jsonb_build_array(pool->>((abs((p_vein->>'seed')::numeric) % 4)::integer),(case when correct then (k->>'ore')::integer else 1 end)+case when town.held(p_purse->'bag','oreSieve')>0 then (k->>'sieve')::integer else 0 end)); end if;
 if correct and (town.held(p_purse->'bag','seamChisel')>0 or town.held(p_purse->'bag','surveyCord')>0) then got:=got || jsonb_build_array(jsonb_build_array('quartzCore',(k->>'quartz')::integer)); end if;
 return got;
end $$;
revoke all on function town.rock_choice(jsonb),town.geology_mods(jsonb,bigint),town.geological_yield(jsonb,jsonb,numeric,integer,jsonb) from public,anon,authenticated;
`;
const cat=catalogOf(),pick=(row,ids)=>Object.fromEntries(ids.map(id=>[id,row[id]])),json=v=>`$geo$${JSON.stringify(v)}$geo$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data || ${json(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','{}'::jsonb) || ${json(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,ids)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${path}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const made=[...Object.keys(GEOLOGY_MAKES),...Object.keys(GEOLOGY_DISHES)],patches=[root('items',pick(cat.items,[...Object.keys(GEOLOGY_ITEMS),...Object.keys(GEOLOGY_SCROLL_ITEMS)])),root('scrolls',GEOLOGY_SCROLLS),root('makes',pick(cat.makes,Object.keys(GEOLOGY_MAKES))),root('dishes',pick(cat.dishes,Object.keys(GEOLOGY_DISHES))),merge('stamina','buffs',{layers:cat.stamina.buffs.layers}),merge('stamina','steps',{layers:cat.stamina.steps.layers}),append('cooking','recipes',made),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(GEOLOGY_DISHES)),append('cooking','putIn,also',GEOLOGY_RAW),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),`insert into public.town_catalog(key,data) values('geology',${json(cat.geology)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
patches.push(merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys(GEOLOGY_CRAFTS))));
const newer=[pay,end,rpc],md5=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
await t.run(patches.join('\n')+'\n'+helpers+'\n'+newer.join(';\n')+';','derive v185 hashes');
const after=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def));
const guard=`do $guard$ begin
 if town.cat('woodcutting') is null then raise exception 'Run v184 first'; end if;
 ${signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(after[i])}') then raise exception 'Definition changed: ${sig}; rebuild v185'; end if;`).join('\n ')}
end $guard$;`;
writeFileSync(join(process.env.FC_REPO,'supabase/v185_listening_to_the_layers_of_rock.sql'),`-- v185: echoes, mineral seams, intact crystals and 25 useful mining items.
-- Run after v184 and the matching site. Safe to run twice. No existing purse is reset.
-- The same bounded vein account pays both sides of the choice. Crystals replace gem fragments.
begin;
${guard}
${patches.join('\n')}
${helpers}
${newer.join(';\n')};
notify pgrst,'reload schema';
commit;
-- Expected: the geological knobs, and no member access to the reward helper.
select data from public.town_catalog where key='geology';
select has_function_privilege('authenticated','town.geological_yield(jsonb,jsonb,numeric,integer,jsonb)','EXECUTE') as helper; -- false
`);
await t.db.close();console.log('Wrote guarded v185 mining migration.');
