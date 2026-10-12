import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{DRAGON_BANKS}=await import('@/lib/town/reward-dragon'),db=await rewardDB(230),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const sigs=['public.town_reward(uuid,jsonb)','public.town_cast(text,integer,integer,boolean,text,text)','town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)','town.reward_school_pool(jsonb,uuid,jsonb,bigint)'],old=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const reward=old[0].replace("'bridgeBuild','boat')","'bridgeBuild','boat','dragonBegin')").replace("elsif p_input->>'action'='schoolStart' then",`elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then`),cast=old[1].replace('school_ jsonb;','school_ jsonb;dragon_ jsonb;').replace("  school_ := town.reward_school_weights(did->'purse', odds, star, now_);",`  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);`),trail=old[2].replaceAll("case when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end","case when kind_='dragon' then 'famRiverDragon' when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end").replace("elsif next_=2 then got:","elsif kind_='star' and next_=2 then got:").replace(" finished:=won and next_=2;",` finished:=won and next_=2;
 if finished and kind_='dragon' then after_:=after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',run_->'dragon'||jsonb_build_object('until',t+1800000)));end if;`),pool=old[3].replace('rod_ jsonb;','rod_ jsonb;boat_ jsonb;boatwater_ jsonb;').replace('begin\n if deep_',`begin
 select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1;
 if boat_ is not null then boatwater_:=town.boat_water(boat_,x,y,t);if boatwater_ is null then return '[]'::jsonb;end if;deep_:='true'::jsonb;water_:=boatwater_;habitat_:=water_->>'habitat';current_:=coalesce(input->>'current',water_->>'current');end if;
 if deep_`);
 if(!reward.includes('did:=town.reward_dragon_begin')||!cast.includes('dragon_:=town.reward_dragon_draw')||!trail.includes("finished and kind_='dragon'")||!pool.includes('boatwater_:=town.boat_water'))throw Error('Dragon boundary moved');
 const g=REWARD_GIFTS.find(g=>g.id==='famRiverDragon'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('dragonBanks','${JSON.stringify(DRAGON_BANKS)}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-dragon.sql',import.meta.url),'utf8'),defs=[reward,cast,trail,pool];
 await db.exec(catalog);await db.exec(helper);for(const d of defs)await db.exec(d);const normalized=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v231_three_clues_before_a_legend_returns.sql',`-- v231: one private river-dragon trail/day and one known-legend encounter after three manual clues.
-- Run after v230 with matching site. Original eligibility filters, bait, fight and landing remain mandatory.
-- Pair/star casts never spend an encounter; changed conditions preserve it for at most thirty minutes.
begin;do $g$ begin
${sigs.map((s,i)=>`if md5(replace(pg_get_functiondef('${s}'::regprocedure),chr(13),'')) not in ('${hash(old[i])}','${hash(normalized[i])}') then raise exception 'Definition moved: rebuild v231';end if;`).join('\n')}
end $g$;
${catalog}\n${helper}\n${defs.join(';\n')};
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text),town.reward_trail(jsonb,uuid,jsonb,bigint,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';commit;`);console.log('Generated private known-legend dragon trail v231.');
}catch(e){console.error(e.stack,e.where??'',e.position);process.exitCode=1;}finally{await db.close();}
