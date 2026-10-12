import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(237),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['public.town_reward(uuid,jsonb)','town.pick(text,jsonb,jsonb,boolean,text,bigint)','town.garden_cross(text,jsonb,text,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('public.'))next=old.replace("'flavorTune')","'flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply')").replace(" if p_input->>'action' in ('kitchenBegin'",()=>` if p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin'`);
 else if(sig.startsWith('town.pick'))next=old.replace('  if town.room(p_purse',()=>`  if p->'giant'='true'::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;
  if town.room(p_purse`).replace('if last_ and town.more_of(p) = 0 then',"if coalesce(p->'giant','false'::jsonb)<>'true'::jsonb and last_ and town.more_of(p) = 0 then");
 else next=old.replace("  other:=case when p->>'crop'",()=>`  continue when p->>'crossChoice' is not null and p->>'crossChoice'<>c->>2;
  other:=case when p->>'crop'`);
 if(next===old)throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const gifts=REWARD_GIFTS.filter(g=>['thingGiantSeeds','thingCrossBrush','thingPollenSeal'].includes(g.id)),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}])))}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(Object.fromEntries(gifts.map(g=>[g.id,REWARD_USES[g.id]])))}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-garden.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v238_one_giant_root_and_pollen_kept_for_tomorrow.sql',`-- v238: farming ranks seven through nine. Run after v237 with matching site.
-- Four ordinary seeds reserve one 2x2 giant root, real growth, six base yields, blade/twine once, no mandrake repeat.
-- Choose an actual known ripe neighbouring cross; or spend a ripe source's crossing right to keep pollen.
-- Seven sources/day, three samples, twenty-four hours, one-use known adjacent same-bed pairing and original seed cap.
-- Existing plot rows, root/satellite triggers and farming readers; no new tables or polling.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v238';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v238 one-root giant crops and bounded one-use pollen.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
