import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{FARM,FOREST,MOUNTAIN}=await import('@/lib/town/world'),db=await rewardDB(225),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d,patched=original.replace("'cloudCancel','cloudConsent')","'cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel')").replace('else did:=town.reward_extract',`elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 else did:=town.reward_extract`);
 if(!patched.includes('did:=town.reward_nursery'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingTinyForest'),boxes=[[0,0,64,64],...[FARM,FOREST,MOUNTAIN].map(b=>[b.x,b.y,b.w,b.h])],catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('nurseryBoxes','${JSON.stringify(boxes)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-nursery.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v226_three_living_trees_inside_a_bottle.sql',`-- v226: three chosen known trees, finite private nursery and three real care games.
-- Run after v225 with the matching site. Three real plain pine seeds/start, one start/day.
-- Two stamina/attempt. Up to six parts total, three cedar slivers at most, no logs or timber.
-- Known tree kinds from actual felling; owning pine seeds teaches pine. Repeated kinds allowed.
-- Parts lock before each game; full bags preserve the same challenge, seed and choice.
-- Checkpoints cross days; cancelling never refunds seeds/quota. No world felling, regrowth, forging multipliers or XP.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher moved: rebuild v226';end if;end $guard$;
${catalog}\n${helper}\n${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)','EXECUTE') as nursery_private;
`);console.log('Generated finite, resumable private nurseries v226.');
}catch(e){console.error(e.stack,e.where??'');process.exitCode=1;}finally{await db.close();}
