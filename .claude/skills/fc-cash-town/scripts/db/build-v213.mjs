import {writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{LIFT_MOUTH}=await import('@/lib/town/reward-lift'),db=await tier10DB(),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209,210,211,212])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const signatures=['public.town_reward(uuid,jsonb)','town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'],originals=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const dispatch=originals[0].replace("'schoolStart')","'schoolStart','liftAnchor','liftRide')").replace("if p_input->>'action'='scan' then", "if p_input->>'action' in ('scan','liftAnchor','liftRide') then");
 const patched=dispatch.replace(" if p_input->>'action'='scan' then\n  g:=town.mine_go",` if p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go`);
 if(!patched.includes('did:=town.reward_lift'))throw Error('Reward dispatch moved');
 const alias=originals[1].replace('FUNCTION town.mine_pay(', 'FUNCTION town.mine_pay_v213('),wrapper=`create or replace function town.mine_pay(p_purse jsonb,p_go jsonb,p_rock jsonb,p_struck jsonb,p_quake boolean,p_own boolean,p_word text)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare did jsonb;begin
  did:=town.mine_pay_v213(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_visit(did->'purse',(p_go->>'floor')::integer));end if;
  return did;
 end $$;`;
 const g=REWARD_GIFTS.find(g=>g.id==='thingPocketLift'),gift={[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}},uses={[g.id]:REWARD_USES[g.id]};
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gift)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('liftMouth','${JSON.stringify(LIFT_MOUTH)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-lift.sql',import.meta.url),'utf8');
 await db.exec(catalogs);await db.exec(helper);await db.exec(alias);await db.exec(wrapper);await db.exec(patched);
 const normalized=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const aliasGuard=`do $$ begin if to_regprocedure('town.mine_pay_v213(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)') is null then execute $copy$${alias}$copy$;end if;end $$;`;
 writeFileSync('supabase/v213_a_lift_to_the_floor_we_worked.sql',`-- v213: an anchor on an exact previously worked floor, six single legs/day.
-- Run after v212 with the matching site. Rerunnable; does not move any player on installation.
-- Current-day arrival tiles, unchanged resting lifts, world row before purse lock.
begin;
do $guard$ begin
${signatures.map((sig,i)=>` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest(normalized[i])}') then raise exception 'Action changed: rebuild v213 on current text';end if;`).join('\n')}
end $guard$;
${catalogs}
${helper}
${aliasGuard}
${wrapper}
${patched};
revoke all on function town.mine_pay_v213(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text) from public,anon,authenticated;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_lift(jsonb,uuid,uuid,jsonb,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'thingPocketLift','ordinary_lift_kept',to_regprocedure('public.town_lift(integer)') is not null) as v213_verified;
`);console.log('Generated v213: exact worked floor, current layout, bounded transport.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
