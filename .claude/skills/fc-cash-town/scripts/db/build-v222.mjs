import{readFileSync,writeFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{rewardDB}from'./reward-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(221),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const branch=`if p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview`;
 const patched=original.replace('grove_ jsonb;','grove_ jsonb;trace_ jsonb;relay_ jsonb;').replace("'dominoPreview')","'dominoPreview','relayPlace','relaySend','relayTake')").replace("if p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview",branch);
 if(!patched.includes('did:=town.reward_relay'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='famWaterRelay'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-relay.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v222_water_to_our_waiting_container.sql',`-- v222: a real empty receiver and conserved owned water, three sends/day.
-- Run after v221 with the matching site. Same-map 40 tiles, six bucketfuls, two stamina.
-- One staged container, one fill before retrieval. Nature and actual carriers survive transport.
-- Rerunnable. Retrieval does not require the familiar; no installation inventory moves.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher moved: rebuild v222';end if;end $guard$;
${catalog}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_function_privilege('authenticated','town.reward_relay(jsonb,jsonb,bigint,jsonb)','EXECUTE')) as v222_verified;
`);console.log('Generated conserved water relay v222.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
