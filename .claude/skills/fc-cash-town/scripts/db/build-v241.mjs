import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';const db=await rewardDB(240),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['public.town_reward(uuid,jsonb)','town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next;
 if(sig.startsWith('public.'))next=old.replace("'reviveCancel')","'reviveCancel','campFlag')").replace(" if p_input->>'action' in ('helpMend'",()=>` if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend'`);
 else next=old.replace(/return jsonb_build_object\('ok',true,'effect',effect[^\n]+/,line=>`return town.flag_benefit(p_purse,${line.replace(/^return /,'').replace(/;$/,'')},p_me,p_now);`);
 if(next===old)throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCampFlag":{"kind":"thing","line":"helpers","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCampFlag":{"n":2,"per":"day"}}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-camp.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){writeFileSync(".codex/tier10/v241-last-definition.sql",p.next);await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v241_one_more_played_beat_under_a_camp_pennant.sql',`-- v241: helpers eight. Run after v240 with matching site; safe rerun.
-- Flag two existing own camps/day using a real cord and stamina. Normal camp benefits keep their costs and buffs.
-- Five recipients at most, one/person/day across all camps; ten-minute replay of one first missed supported beat.
-- A replay must still be played; a second miss spends the coupon and fails normally. No new tables/readers.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v241';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}notify pgrst,'reload schema';commit;`);console.log('Generated v241 paid camp flags and one actually replayed beat.');
}catch(e){console.error(e.message,e.where??'',e.position??'');process.exitCode=1;}finally{await db.close();}
