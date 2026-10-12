import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{SPRINGS}=await import('@/lib/town/reward-springs'),db=await rewardDB(223),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const lock=` if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);`;
 const branch=`if p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then`;
 const patched=original.replace('key_ text;','key_ text;spring_ jsonb;').replace("'conduitCancel')","'conduitCancel','springPlace','springDraw')").replace(' p:=town.purse_of(me,true);',lock).replace("if p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then",branch);
 if(!patched.includes('did:=town.reward_spring'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingSpringStone'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('springSites','${JSON.stringify(SPRINGS.sites)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-springs.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v224_twelve_bucketfuls_to_share.sql',`-- v224: one sixty-minute ordinary spring/day, twelve shared bucketfuls total.
-- Run after v223 with the matching site. Five fixed rest sites, five private bounded rows.
-- World spring lock precedes the purse lock; receipts never reset shared stock.
-- Plain water clears the receiver's old nature/contributors. Actual pouring still earns ordinary credit.
-- Rerunnable. Installation moves no coins, inventory, or players.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher moved: rebuild v224';end if;end $guard$;
${catalog}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_springs','SELECT'),'bounded',(select count(*)=5 from town.reward_springs)) as v224_verified;
`);console.log('Generated five bounded, shared ordinary springs v224.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
