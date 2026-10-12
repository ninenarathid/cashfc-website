import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),{RING_BEETLES}=await import('@/lib/town/reward-arena'),db=await rewardDB(231),sig='public.town_reward(uuid,jsonb)',hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d,patched=old.replace("'boat','dragonBegin')","'boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel')").replace(" if p_input->>'action'='boat' then\n  did:=",` if p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=`);if(!patched.includes('did:=town.reward_arena'))throw Error('Arena dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingBeetleRing'),catalog=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('ringBeetles','${JSON.stringify(RING_BEETLES)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-arena.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);await db.exec(patched);const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v232_beetles_return_from_the_ring_unharmed.sql',`-- v232: three skill rounds against a beetle sparring partner. No death, wagers, goods or XP.
-- Run after v231 with matching site. Requires a beetle the player caught and still carries.
-- One private two-minute match; best record is bounded by six species. Finished matches cost one stamina.
begin;do $g$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${hash(old)}','${hash(normalized)}') then raise exception 'Definition moved: rebuild v232';end if;end $g$;
${catalog}\n${helper}\n${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;`);console.log('Generated harmless skill-based beetle arena v232.');
}catch(e){console.error(e.stack,e.where??'',e.position);process.exitCode=1;}finally{await db.close();}
