import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),{CROWN_THEMES}=await import('@/lib/town/reward-crown'),db=await rewardDB(234),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{const patches=[];const specs=[{sig:'town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text)',name:'net',params:'p_purse jsonb,p_haunt integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_now bigint,p_lure text',args:'p_purse,p_haunt,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_now,p_lure',bonus:'false'},{sig:'town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)',name:'net_mine',params:'p_purse jsonb,p_which text,p_hand text,p_x integer,p_y integer,p_misses double precision,p_now bigint',args:'p_purse,p_which,p_hand,p_x,p_y,p_misses,p_now',bonus:"p_which='pair' or coalesce(p_purse->'lured'->>'origin'='crown',false)"}];
 for(const spec of specs){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[spec.sig])).rows[0].d,alias=old.replace(`FUNCTION town.${spec.name}(`,`FUNCTION town.${spec.name}_before_crown(`),next=`${alias};
create or replace function town.${spec.name}(${spec.params}) returns jsonb language plpgsql stable set search_path='' as $wrap$ declare d jsonb:=town.${spec.name}_before_crown(${spec.args});begin if d->'ok'='true'::jsonb then d:=jsonb_set(d,'{purse}',town.reward_crown_caught(p_purse,d->'purse',d->'got',p_now,${spec.bonus}));end if;return d;end $wrap$;
revoke all on function ${spec.sig.replace(`town.${spec.name}(`,`town.${spec.name}_before_crown(`)} from public,anon,authenticated;`;patches.push({...spec,old,next});}
 for(const sig of ['public.town_net(integer,integer,integer,numeric,uuid)','public.town_net_mine(text,integer,integer,numeric)','public.town_reward(uuid,jsonb)']){const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;let next=old;
 if(sig.startsWith('public.town_reward'))next=old.replace("'lanternLight')","'lanternLight','crownLook','crownBegin','crownCall','crownCancel')").replace(" if p_input->>'action' in ('lanternLook'",()=>` if p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook'`);
 else next=old.replace('purse jsonb := town.purse_of(me, true);','purse jsonb;').replace('\nbegin\n',`\nbegin\n  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
`);
 if(next===old||sig.startsWith('public.town_reward')&&!next.includes('did:=town.reward_crown'))throw Error('Definition moved '+sig);patches.push({sig,old,next});}
 const gift=REWARD_GIFTS.find(g=>g.id==='thingWingCrown'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[gift.id]:{kind:gift.kind,line:gift.line,rank:gift.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'{"thingWingCrown":{"n":1,"per":"day"}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('crownThemes','${JSON.stringify(CROWN_THEMES)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-crown.sql',import.meta.url),'utf8');await db.exec(catalog);await db.exec(helper);for(const p of patches){await db.exec(p.next);p.normal=(await db.query('select pg_get_functiondef($1::regprocedure) d',[p.sig])).rows[0].d;}
 writeFileSync('supabase/v235_three_catches_before_the_wings_answer.sql',`-- v235: three distinct actual catches unlock three private themed calls, one quest/day.
-- Run after v234 with matching site. Original habitat/hour/weather rules and manual net costs remain.
-- A quest lasts twenty-four hours; followers and crown calls cannot feed quest progress. No new world spawn.
-- Catch RPCs use the purse lock before haunt/bed locks, preserving inventory and quest across commands.
begin;do $guard$ begin
${patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normal)}') then raise exception 'Definition moved: rebuild v235';end if;`).join('\n')}
end $guard$;${catalog}\n${helper}\n${patches.map(p=>p.next+';').join('\n')}
notify pgrst,'reload schema';commit;`);console.log('Generated v235 actual-catch quest and bounded private calls.');
}finally{await db.close();}
