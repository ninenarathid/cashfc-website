import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),db=await rewardDB(235),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['public.town_reward(uuid,jsonb)','town.chew(jsonb,double precision,bigint)','town.settle(jsonb,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('public.'))next=old.replace("'crownCancel')","'crownCancel','picnicPlace','picnicEat')").replace(" if p_input->>'action' in ('crownLook'",()=>` if p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook'`);
 else if(sig.startsWith('town.chew'))next=old.replace("whole := (st->>'minutes')::bigint * 60000;","whole := case when e->'picnic'='true'::jsonb then 30000 else (st->>'minutes')::bigint * 60000 end;");
 else next=old.replace("(town.cat('stamina')->>'minutes')::bigint * 60000","case when e->'picnic'='true'::jsonb then 30000 else (town.cat('stamina')->>'minutes')::bigint * 60000 end");
 if(next===old||sig.startsWith('public.')&&!next.includes('did:=town.reward_picnic'))throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const g=REWARD_GIFTS.find(g=>g.id==='thingPicnicCloth'),catalog=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-picnic.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v236_four_real_servings_on_a_picnic_cloth.sql',`-- v236: up to four actual pot servings on a picnic cloth, one stamina to place.
-- Run after v235 with matching site. Nearby players choose to sit and eat in thirty seconds.
-- Original meal quotas, strength, buffs, early-rise forfeiture and borrowed bowls remain; no extra food.
-- Uses existing shared pot rows, expiry/table transfer, reader and pickup; no new polling or world tables.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v236';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v236 conserved servings and thirty-second meals.');
}finally{await db.close();}
