import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {standIn} from './stand-in.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {INSECT_ITEMS,INSECT_MAKES,INSECT_DISHES,INSECT_SCROLL_ITEMS,INSECT_SCROLLS,INSECT_CRAFTS,INSECT_SPECIES}=await import('@/lib/town/insect-items');
const cat=catalogOf(),pick=(r,ids)=>Object.fromEntries(ids.map(id=>[id,r[id]])),json=v=>`$insects$${JSON.stringify(v)}$insects$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data || ${json(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','{}'::jsonb) || ${json(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,ids)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${path}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const made=[...Object.keys(INSECT_MAKES),...Object.keys(INSECT_DISHES)],bugs=Object.keys(INSECT_SPECIES);
const t=await standIn({upTo:179});
const signatures=['town.farm_bugs(bigint)','town.rid_pick(jsonb,bigint,double precision)'];
const defs=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def.replaceAll('\r','')));
const swap=(s,a,b)=>{if(!s.includes(a))throw new Error('Definition moved: '+a);return s.replace(a,b);};
const revised=[swap(defs[0],"continue when has is null or rids ? (has->>'bug');","continue when has is null or rids ? (has->>'bug') or town.cat('insect_garden')->'visitors' ? (has->>'bug');"),swap(defs[1],"and p_now <= town.dies_at", "and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key)\n     and p_now <= town.dies_at")];
// Canonical function guards cover unrelated live edits and the already-installed revision.
const canonical=await Promise.all(revised.map(async(s,i)=>{await t.sql(s);return (await t.sql('select pg_get_functiondef($1::regprocedure) def',[signatures[i]])).rows[0].def.replaceAll('\r','');}));
const md5=s=>createHash('md5').update(s).digest('hex');
const guards=signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(canonical[i])}') then raise exception 'Definition changed: ${sig}; rebuild v187 on current text'; end if;`).join('\n');
await t.db.close();
const patches=[root('items',pick(cat.items,[...Object.keys(INSECT_ITEMS),...Object.keys(INSECT_SCROLL_ITEMS)])),root('makes',pick(cat.makes,Object.keys(INSECT_MAKES))),root('dishes',pick(cat.dishes,Object.keys(INSECT_DISHES))),root('scrolls',INSECT_SCROLLS),merge('insects','bugs',pick(cat.insects.bugs,bugs)),append('insects','lures',['nectarVial']),merge('stamina','buffs',{scent:cat.stamina.buffs.scent}),merge('stamina','steps',{scent:cat.stamina.steps.scent}),append('cooking','recipes',made),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(INSECT_DISHES)),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','insects',pick(cat.work.insects,bugs)),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys(INSECT_CRAFTS))),`insert into public.town_catalog(key,data) values('insect_garden',${json(cat.insect_garden)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
patches.push(append('insects','order',bugs),append('insects','rare',cat.insects.rare.filter(id=>bugs.includes(id))));
patches.push(append('cooking','putIn,also',['honeyBee','silkMoth','orchardBeetle']));
const functions=`
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
`;
writeFileSync(join(process.env.FC_REPO,'supabase/v187_visitors_that_tend_the_garden.sql'),`-- v187: eight insect visitors, garden releases and 25 useful insect-line items.
-- Run after v186 and the matching site. Safe to run twice. No purse, plot or coins reset.
-- A released insect is consumed once; the plant remembers each pollinated bearing.
begin;
do $guard$ begin if town.cat('gardening') is null then raise exception 'Run v186 first'; end if; ${guards} end $guard$;
${patches.join('\n')}
${functions}
${revised.map(s=>s+';').join('\n')}
notify pgrst,'reload schema';
commit;
-- Expected: member-only release RPC, private helper, eight new species.
select has_function_privilege('anon','public.town_insect_care(integer,integer,integer,text)','EXECUTE') as anon_release,has_function_privilege('authenticated','public.town_insect_care(integer,integer,integer,text)','EXECUTE') as member_release;
select data from public.town_catalog where key='insect_garden';
`);
console.log('Wrote v187 insect visitors and garden care.');
