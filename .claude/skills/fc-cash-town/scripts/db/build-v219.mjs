import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(218),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const patched=original.replace("'liftRide')","'liftRide','coreBegin','coreRoom','coreEnd','coreCancel')").replace("else did:=town.reward_extract", "elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);\n else did:=town.reward_extract");
 if(!patched.includes('did:=town.reward_core')||!patched.includes("'liftRide','coreBegin'"))throw Error('Reward dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingCoreSpade'),gift={[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}},uses={[g.id]:REWARD_USES[g.id]};
 const catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gift)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-core.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v219_three_private_rooms_beneath_a_worked_floor.sql',`-- v219: one three-room core expedition/day; route-specific costs and finite loot.
-- Run after v218 with the matching site. Rerunnable; no cave resets or automatic inventory changes.
-- Known minerals and an exact worked floor; room choices survive misses and day boundaries.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher changed: rebuild v219 on current definitions';end if;end $guard$;
${catalog}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint)','EXECUTE'),'core_ready',town.cat('gifts')->'gifts' ? 'thingCoreSpade') as v219_verified;
`);console.log('Generated v219 on current reward, warehouse and gem baseline.');
}catch(e){console.error(e.message,e.where??"",e.position??"");if(e.position)console.error(e.query.slice(Number(e.position)-80,Number(e.position)+80));process.exitCode=1;}finally{await db.close();}
