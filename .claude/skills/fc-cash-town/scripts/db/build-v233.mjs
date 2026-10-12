import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),db=await rewardDB(232),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];for(const sig of ['public.town_reward(uuid,jsonb)','town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('public.'))next=old.replace("'arenaCancel')","'arenaCancel','lanternLook','lanternLight')").replace(" if p_input->>'action' in ('arenaLook'",()=>` if p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook'`);
 else next=old.replaceAll("else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end", "else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end");
 if(next===old||sig.startsWith('public.')&&!next.includes('did:=town.reward_lantern'))throw Error('Definition moved: '+sig);patches.push({sig,old,next});}
 const gift=REWARD_GIFTS.find(g=>g.id==='thingMoonLantern'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[gift.id]:{kind:gift.kind,line:gift.line,rank:gift.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'{"thingMoonLantern":{"n":1,"per":"day"}}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-lantern.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v233_a_known_night_insect_under_one_lantern.sql',`-- v233: one known nocturnal insect at the nearest eligible habitat, twenty minutes, once a day.
-- Run after v232 with matching site. Only the hour is simulated; day, moon, habitat and rain remain real.
-- Catch manually for normal cost. Private lure shares the nectar slot; no cloak follower or spawn chain.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v233';end if;`).join('\n')}
end $guard$;
${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v233 known nocturnal lure.');
}finally{await db.close();}
