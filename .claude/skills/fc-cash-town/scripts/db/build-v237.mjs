import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(236),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['public.town_reward(uuid,jsonb)','public.town_cook(jsonb,uuid[],jsonb)','town.pot_marks(jsonb)','town.chew(jsonb,double precision,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('public.town_reward'))next=old.replace("'picnicEat')","'picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune')").replace(" if p_input->>'action' in ('picnicPlace'",()=>` if p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace'`);
 else if(sig.startsWith('public.town_cook'))next=old.replace('  after := did->\'purse\';',()=>`  did:=town.reward_kitchen_cooked(purse,did,misses,now_,me,gen_random_uuid());
  after := did->'purse';`);
 else if(sig.startsWith('town.pot_marks'))next=`create or replace function town.pot_marks(p_from jsonb) returns jsonb language sql immutable set search_path='' as $marks$
 select case when jsonb_typeof(p_from->'warm')='number' and (p_from->>'warm')::numeric>0 then jsonb_build_object('warm',p_from->'warm') else '{}'::jsonb end
 ||case when jsonb_typeof(p_from->'scent')='number' and (p_from->>'scent')::numeric>0 then jsonb_build_object('scent',p_from->'scent') else '{}'::jsonb end
 ||case when p_from->>'secondary' in ('green','calm','keen') then jsonb_build_object('secondary',p_from->'secondary') else '{}'::jsonb end
 ||case when p_from->>'cookedBy' is not null and p_from->>'cookId' is not null then jsonb_build_object('cookedBy',p_from->'cookedBy','cookId',p_from->'cookId') else '{}'::jsonb end
 $marks$`;
 else next=old.replace('  if not done then return',()=>`  if done then after:=town.reward_food_finished(after,e,p_now);end if;
  if not done then return`);
 if(next===old)throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const gifts=REWARD_GIFTS.filter(g=>['charmChefFlame','thingFlavorBook','thingDragonPot'].includes(g.id)),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}])))}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,REWARD_USES[g.id]])))}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-kitchen.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v237_fire_flavour_and_five_real_banquet_servings.sql',`-- v237: playable kitchen ranks eight through ten. Run after v236 with matching site.
-- Optional narrow fire checkpoints, actual extra flavour ingredients, and a three-stage five-serving banquet.
-- Existing recipes, ingredients, cookware, original manual games, meal quotas and shared feast readers remain.
-- Reserved banquet food is forfeited on cancellation/expiry; completed servings preserve dish and pot marks.
-- No new world tables/polling. Secondary effects are level one for thirty minutes; strongest matching buff wins.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v237';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v237 actual cooking and five conserved banquet portions.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
