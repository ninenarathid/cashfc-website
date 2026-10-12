import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';const db=await rewardDB(241),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const sig='public.town_reward(uuid,jsonb)',old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old.replace('boatowner_ uuid;','boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;').replace("'campFlag')","'campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel')").replace(' p:=town.purse_of(me,true);',()=>` if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);`).replace(" if p_input->>'action'='campFlag'",()=>` if p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag'`).replace(" perform town.keep_purse(me,did->'purse');",()=>` did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');`);
 if(next===old||!next.includes('town.remember_rescue(p,'))throw Error('Definition moved');const catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmWaykeeper":{"kind":"charm","line":"helpers","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmWaykeeper":{"n":2,"per":"day"}}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-rescue.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);await db.exec(next);const normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v242_a_waykeeper_returns_one_unpaid_checkpoint.sql',`-- v242: helpers ten. Run after v241 with matching site; safe rerun.
-- Only real failed canopy/banquet attempts create ten-minute private snapshots; foreign owners explicitly request help.
-- Sorted purse locks, two rescue starts/day, once/job; harder solo rhythm, paid stamina and no supply/reward refunds.
-- Completed/progressed/cancelled jobs invalidate old snapshots. Nearby request lookup is explicit, bounded and hides run contents.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${hash(old)}','${hash(normal)}') then raise exception 'Definition moved: rebuild v242';end if;end $guard$;
${catalog}\n${helper}\n${next};notify pgrst,'reload schema';commit;`);console.log('Generated v242 consenting, one-use checkpoint rescue with sorted purse locks.');
}catch(e){console.error(e.message,e.where??'',e.position??'');process.exitCode=1;}finally{await db.close();}
