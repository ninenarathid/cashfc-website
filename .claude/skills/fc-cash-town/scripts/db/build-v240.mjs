import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(239),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const patches=[];const pour='public.town_longpour(integer,integer,jsonb,jsonb)';
 for(const sig of ['public.town_reward(uuid,jsonb)','town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)','town.pour_row(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb,double precision)','public.town_row(integer,integer,jsonb,jsonb)',pour]){
  const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
  if(sig==='public.town_reward(uuid,jsonb)')next=old.replace("'beanCancel')","'beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel')").replace(" if p_input->>'action' in ('beanBegin'",()=>` if p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin'`);
  else if(sig.startsWith('town.row_tend'))next=old.replace("  return jsonb_build_object('ok', true, 'deed'",()=>`  mine:=town.remember_garden_misses(mine,found->'plots',found->>'deed',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'deed'`);
  else if(sig.startsWith('town.pour_row'))next=old.replace("  return jsonb_build_object('ok', true, 'purse'",()=>`  mine:=town.remember_garden_misses(mine,row_,'water',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'purse'`);
  else if(sig.includes('town_row'))next=old.replace("  if n > 0 then\n    perform town.keep_purse(me, did->'purse');",()=>"  perform town.keep_purse(me, did->'purse');\n  if n > 0 then");
  else next=old.replace('  -- (the plots as they are kept:',()=>"  if n=0 then perform town.keep_purse(me,after);end if;\n  -- (the plots as they are kept:");
  if(next===old)throw Error('Definition moved '+sig);patches.push({sig,old,next});
 }
 const gifts=REWARD_GIFTS.filter(g=>['famGardenMender','thingReviveSeed'].includes(g.id)),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}])))}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,REWARD_USES[g.id]])))}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-help.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);
 for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v240_missed_garden_beats_and_one_returning_root.sql',`-- v240: helpers seven and nine. Run after v239 with matching site; safe rerun.
-- Only missed offered garden beats create ten-minute checkpoints. Recovery pays the original tool/water/cost once.
-- Rescue only retained, unpicked, pest-dead foreign roots once, with a real seed/cure and three stamina.
-- Preserve original root identity, reset growth to fifty percent, and keep world readers/cache contracts.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v240';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v240 actual missed garden checkpoints and identity-preserving rescue.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
