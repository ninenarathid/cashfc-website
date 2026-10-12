import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await tier10DB(),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209,210,211,212,213])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const signatures=['town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)','town.vein_end(jsonb,jsonb,bigint)','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)'],originals=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const aliases=originals.map((s,i)=>s.replace(`FUNCTION town.${['mine_pay','vein_end','reward_resource'][i]}(`,`FUNCTION town.${['mine_pay','vein_end','reward_resource'][i]}_v214(`));
 const wrappers=[`create or replace function town.mine_pay(p_purse jsonb,p_go jsonb,p_rock jsonb,p_struck jsonb,p_quake boolean,p_own boolean,p_word text)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb;begin
  did:=town.mine_pay_v214(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb and coalesce(did->'vein','null'::jsonb)<>'null'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_vein_site(did->'purse',p_purse,did->'vein',p_go->'at',(p_go->>'day')::integer));end if;
  return did;end $$;`,
 `create or replace function town.vein_end(p_purse jsonb,p_go jsonb,p_now bigint)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb:=town.mine_of(p_purse)->'vein';begin
  did:=town.vein_end_v214(p_purse,p_go,p_now);
  if did->'ok'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_branch_source(did->'purse',p_purse,v,(p_go->>'ore')::integer,jsonb_array_length(p_go->'gems'),p_go->'geology',p_now));end if;
  return did;end $$;`,
 `create or replace function town.reward_resource(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
 returns jsonb language plpgsql stable set search_path='' as $$begin
  if input->>'action'='resourceBegin' and input->>'kind'='branch' or input->>'action' in ('resourceEnd','resourceCancel') and p->'professionRewards'->'resource'->>'kind'='branch' then return town.reward_branch_resource(p,request,input,t);end if;
  return town.reward_resource_v214(p,request,input,t,p_seed);end $$;`];
 const g=REWARD_GIFTS.find(g=>g.id==='charmBranchVein'),gift={[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}},uses={[g.id]:REWARD_USES[g.id]};
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gift)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-branch.sql',import.meta.url),'utf8');
 await db.exec(catalogs);await db.exec(helper);for(let i=0;i<3;i++){await db.exec(aliases[i]);await db.exec(wrappers[i]);}
 const normalized=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v214_a_branch_only_after_the_vein_pays.sql',`-- v214: correctly read and paid main veins expose one bounded optional branch.
-- Run after v213 with the matching site. Rerunnable; no automatic claims or new shared spawns.
-- Charm must be worn at opening/result; three attempts/day, three extra stamina, one mineral choice.
begin;
do $guard$ begin
${signatures.map((sig,i)=>` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest(normalized[i])}') then raise exception 'Action changed: rebuild v214 on current text';end if;`).join('\n')}
end $guard$;
${catalogs}
${helper}
${signatures.map((sig,i)=>`do $$ begin if to_regprocedure('${sig.replace('(', '_v214(')}') is null then execute $copy$${aliases[i]}$copy$;end if;end $$;\n${wrappers[i]}`).join('\n')}
revoke all on function ${signatures.map(s=>s.replace('(', '_v214(')).join(',')},${signatures.join(',')} from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_branch_resource(jsonb,uuid,jsonb,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'charmBranchVein') as v214_verified;
`);console.log('Generated v214: paid main vein, correct echo, bounded optional branch.');
}catch(e){console.error(e.message,e.where??'',e.position??'');if(e.query&&e.position)console.error(e.query.slice(Math.max(0,Number(e.position)-160),Number(e.position)+160));process.exitCode=1;}finally{await db.close();}
