import{writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),db=await rewardDB(233),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)','town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('town.insect')){next=old.replace("p_mode not in ('pollinate','guard')","p_mode not in ('pollinate','guard','grow','cross')").replaceAll("p_mode='pollinate'","p_mode<>'guard'").replace(" s:=p_purse->'bag'->p_slot;",` if p_mode in ('grow','cross') and not town.gift_works(p_purse,'charmPollenGuardian') then return town.no('none');end if;
 s:=p_purse->'bag'->p_slot;`).replace("'boost',(p->>'boost')::numeric+case when town.held", "'boost',(p->>'boost')::numeric+case when p_mode='cross' then 0 when p_mode='grow' then 3600000 when town.held").replace(" else\n  plant_:=p ||", "  if p_mode='cross' then plant_:=plant_||jsonb_build_object('insectCrossRound',p->'picked');end if;\n else\n  plant_:=p ||");}
 else next=old.replace("town.held(town.carried_bag(p_before),'graftKnife')>0 then 2", "town.held(town.carried_bag(p_before),'graftKnife')>0 or p->'insectCrossRound'=p->'picked' then 2");
 if(next===old||sig.startsWith('town.insect')&&!next.includes("if p_mode='cross' then plant_"))throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const g=REWARD_GIFTS.find(g=>g.id==='charmPollenGuardian'),catalog=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';`;await db.exec(catalog);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v234_one_visitor_one_choice_for_the_pollen.sql',`-- v234: a real pollinator, one choice per root per bearing.
-- Run after v233 with matching site. Growth OR crossing; original pollenRound, ownership and dead/ripe gates.
-- Crossing still requires the original ripe-neighbour pair. Graft knife and visitor share two hybrid seeds.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v234';end if;`).join('\n')}
end $guard$;${catalog}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v234 root pollinator choices.');
}finally{await db.close();}
