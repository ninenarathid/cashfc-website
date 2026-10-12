import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),db=await rewardDB(222),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const branch=`if p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then`;
 const patched=original.replace('relay_ jsonb;','relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;').replace("'relayTake')","'relayTake','conduitBegin','conduitEnd','conduitCancel')").replace("if p_input->>'action' in ('relayPlace','relaySend','relayTake') then",branch);
 if(!patched.includes('did:=town.reward_conduit'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingRiverHorn'),catalog=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-conduit.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);await db.exec(patched);const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v223_three_branches_of_real_water.sql',`-- v223: three manual conduit branches, real water and rooted plant identities.
-- Run after v222 with the matching site. Correct branches only, original bucketfuls.
-- One stamina/game plus one/bucketful, shared ninety-minute bed cooldown after a real watering.
-- Ordinary watering remains available. At most twenty-four derived cooldown rows, private.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Reward dispatcher moved: rebuild v223';end if;end $guard$;
${catalog}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_conduits','SELECT'),'bounded',(select count(*)<=24 from town.reward_conduits)) as v223_verified;
`);console.log('Generated rooted, conserved conduits v223.');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
