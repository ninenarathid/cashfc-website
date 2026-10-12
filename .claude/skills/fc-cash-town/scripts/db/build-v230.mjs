import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),{BOAT_ROUTES}=await import('@/lib/town/lotus-boats'),db=await rewardDB(229),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const sigs=['public.town_reward(uuid,jsonb)','public.town_cast(text,integer,integer,boolean,text,text)'],old=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const lock=` if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);`,dispatch=old[0].replace('bridge_ jsonb;','bridge_ jsonb;boat_ jsonb;boatowner_ uuid;').replace("'bridgeBuild')","'bridgeBuild','boat')").replace(' p:=town.purse_of(me,true);',()=>lock).replace(" if p_input->>'action'='bridgeBuild' then\n  did:=",` if p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=`);
 const cast=old[1].replace('purse jsonb := town.purse_of(me, true);','purse jsonb;').replace('sky text := town.orb_of(purse, now_);','sky text;').replace('  school_ jsonb;','  school_ jsonb;boat_ jsonb;boatwater_ jsonb;').replace('begin\n  if p_bait',`begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait`);
 if(!dispatch.includes('did:=town.reward_boat')||!cast.includes('boatwater_:=town.boat_water'))throw Error('Boat boundaries moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingLotusBoat'),catalog=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('boatRoutes','${JSON.stringify(BOAT_ROUTES)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-boat.sql',import.meta.url),'utf8');
 writeFileSync(".codex/tier10/boat-dispatch.sql",dispatch);writeFileSync(".codex/tier10/boat-cast.sql",cast);
 await db.exec(catalog);await db.exec(helper);await db.exec(dispatch);await db.exec(cast);const patched=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v230_a_lotus_leaf_for_two_fishers.sql',`-- v230: owner-operated lotus boats, explicit passenger consent, ordinary-speed fixed local routes.
-- Run after v229 and matching site. One lease row per participating owner; no permanent terrain changes.
-- Cast and movement serialize on the boat before purse locks. Expiry/reload returns travellers to their bank.
begin;do $g$ begin
${sigs.map((s,i)=>`if md5(replace(pg_get_functiondef('${s}'::regprocedure),chr(13),'')) not in ('${hash(old[i])}','${hash(patched[i])}') then raise exception 'Definition moved: rebuild v230';end if;`).join('\n')}
end $g$;
${catalog}\n${helper}\n${dispatch};\n${cast};
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';commit;
select not has_table_privilege('authenticated','town.reward_boats','SELECT') as boats_private;`);console.log('Generated consenting lotus boats v230.');
}catch(e){console.error(e.stack,e.where??'',e.position,e.internalPosition,e.internalQuery);process.exitCode=1;}finally{await db.close();}
