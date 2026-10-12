import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog');
const db=await tier10DB(),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209]){const {readdirSync}=await import('node:fs');await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));}
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const patched=original.replace("'trailCancel')","'trailCancel','resourceBegin','resourceEnd','resourceCancel')").replace("else did:=town.reward_extract(p,p_request,p_input,t);end if;","elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;");
 if(!patched.includes('did:=town.reward_resource'))throw Error('Reward RPC moved');
 const gifts=Object.fromEntries(REWARD_GIFTS.filter(g=>['thingTreeHive','thingCrystalRepair','charmGemColor'].includes(g.id)).map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}])),uses=Object.fromEntries(Object.entries(REWARD_USES).filter(([id])=>id in gifts));
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gifts)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`;
 const helper=readFileSync(new URL('./reward-resources.sql',import.meta.url),'utf8');
 await db.exec(catalogs);await db.exec(helper);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v210_honey_crystals_and_colours_we_make.sql',`-- v210: choose honey/wax, mend fragments, and transform two loose gem colours into one known colour.
-- Run after v209 with the matching site. Safe to run twice; no automatic claims, transfers or socket edits.
-- Games spend three stamina and one daily attempt when completed. A miss retains ingredients.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'town_reward changed: rebuild v210 on current text';end if;end $guard$;
${catalogs}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingTreeHive','thingCrystalRepair','charmGemColor']) as v210_verified;
`);console.log('Generated v210: real inputs, finite daily attempts, no change to sockets or existing cooking.');
}catch(e){console.error(JSON.stringify({message:e.message,where:e.where}));process.exitCode=1;}finally{await db.close();}
