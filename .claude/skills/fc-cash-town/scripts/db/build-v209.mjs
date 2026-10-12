import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog');
const db=await tier10DB(),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const name of ['v207_the_minerals_and_parts_we_earned.sql','v208_working_with_wood_and_minerals_on_the_road.sql'])await db.exec(readFileSync(`supabase/${name}`,'utf8'));
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 let patched=original.replace("not in ('scan','extractBegin','extractEnd','process')","not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel')");
 patched=patched.replace("else did:=town.reward_extract(p,p_request,p_input,t);end if;","elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;");
 if(!patched.includes('did:=town.reward_trail'))throw Error('Reward RPC moved');
 const gifts=Object.fromEntries(REWARD_GIFTS.filter(g=>['thingForestRing','thingStarBottle'].includes(g.id)).map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}])),uses=Object.fromEntries(Object.entries(REWARD_USES).filter(([id])=>id in gifts));
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gifts)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`;
 const helper=readFileSync(new URL('./reward-trails.sql',import.meta.url),'utf8');
 await db.exec(catalogs);await db.exec(helper);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v209_personal_traces_under_the_forest_canopy.sql',`-- v209: personal forest traces, three different games and a finite reward budget per trail.
-- Run after v208 with the matching site. Safe to run twice; no player/world resets or automatic claims.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'town_reward changed: rebuild v209 on current text';end if;end $guard$;
${catalogs}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingForestRing','thingStarBottle']) as v209_verified;
`);console.log('Generated v209: resumable personal forest traces, three distinct games, bounded loot.');
}catch(e){console.error(JSON.stringify({message:e.message,position:e.position,where:e.where,internalPosition:e.internalPosition}));writeFileSync('.codex/tier10/v209-error.sql',e.query??e.internalQuery??'');process.exitCode=1;}finally{await db.close();}
