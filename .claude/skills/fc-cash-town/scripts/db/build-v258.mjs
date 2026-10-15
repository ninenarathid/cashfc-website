// Build guarded replacements from the local game snapshot. Never connects to a hosted database.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rewardAuditDB} from './reward-audit-db.mjs';
const db=await rewardAuditDB(),patches=[];
const hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Patch boundary moved: '+a);return s.replaceAll(a,b);};
async function patch(sig,edit){
 const old=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const next=edit(old);if(next===old)throw Error('No change: '+sig);
 try{await db.exec(next);}catch(e){throw Error(sig+': '+e.message);}
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 patches.push({sig,old,next,normalized});
}
try{
 await patch('town.reward_scan(jsonb,jsonb,text,bigint)',s=>{
  const use=" used:=town.gift_use(p,'thingOreCompass',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;";
  s=replace(s,use,'');
  s=replace(s," ore:=town.mine_ore",use+"\n ore:=town.mine_ore");
  return replace(s,"if chosen is null then return town.no('none');end if;","if chosen is null then return jsonb_build_object('ok',true,'purse',used->'purse','left',used->'left');end if;");
 });
 await patch('public.town_cast(text,integer,integer,boolean,text,text)',s=>replace(s,'town.reward_school_weights(did->\'purse\', odds, star, now_)',"town.reward_school_weights(did->'purse', odds, star or pair, now_)"));
 await patch('town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint)',s=>{
  s=replace(s,"declare call_ jsonb:=p->'professionRewards'->'dragon';begin","declare call_ jsonb:=p->'professionRewards'->'dragon';weighted_ jsonb;total_ double precision;begin");
  s=replace(s," return jsonb_build_object('purse',p||",` select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision*case when o->>'what'=call_->>'fish' then 5 else 1 end) order by ord) into weighted_ from jsonb_array_elements(odds_) with ordinality a(o,ord);
 select sum((o->>'p')::double precision) into total_ from jsonb_array_elements(weighted_) o;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision/total_) order by ord) into weighted_ from jsonb_array_elements(weighted_) with ordinality a(o,ord);
 return jsonb_build_object('purse',p||`);
  return replace(s,"jsonb_build_array(jsonb_build_object('what',call_->'fish','p',1))","weighted_");
 });
 await patch('town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)',s=>{
  s=replace(s,'completed_:=won_ and next_=2','completed_:=next_=2');
  s=replace(s,'next_+case when won_ then 1 else 0 end','next_+1');
  return replace(s,"case when won_ then 'null'::jsonb else run_->'part' end","'null'::jsonb");
 });
 await patch('town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint)',s=>{
  s=replace(s,"n_:=case when room_->>'route'='crystal' then 1 else 2 end","n_:=case when room_->>'route'='crystal' then 4 else 8 end");
  s=replace(s,'completed_:=won_ and next_=2','completed_:=next_=2');
  s=replace(s,'next_+case when won_ then 1 else 0 end','next_+1');
  return replace(s,"case when won_ then 'null'::jsonb else room_||jsonb_build_object('challenge',null) end","'null'::jsonb");
 });
 await patch('town.reward_resource_recipe(text,text)',s=>{
  s=replace(s,"jsonb_build_array(key_,10),jsonb_build_array('quartzCore',2)","jsonb_build_array(key_,2),jsonb_build_array('quartzCore',1)");
  return replace(s,'parts[3]=any(gems) and parts[1]<>parts[2]',"parts[3]=any(gems) and parts[3] not in ('gemDiamond','gemOnyx') and parts[1]<>parts[2]");
 });
 await patch('town.reward_boat(jsonb,jsonb,uuid,jsonb,bigint,boolean,boolean)',s=>replace(s,"station_=to_ or a='depart' and old_->>'owner'<>me::text or busy","station_=to_ or old_->>'owner'<>me::text or busy"));
 await patch('public.town_reward(uuid,jsonb)',s=>replace(s,"(('x'||substr(p_request::text,1,8))::bit(32)::bigint)","floor(random()*4294967296)::bigint"));
 await patch('town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text)',s=>replace(s,"not town.gift_works(p_purse, 'charmEchoAxe')","not town.gift_works(p_purse, 'charmEchoAxe') or town.used_of(p_purse,'charmEchoAxe',p_now)>=5"));
 await patch('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)',s=>{
  s=replace(s,' domino_:=',` if not coalesce((p_went->>'one')::boolean,false) and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree' and go_ ? 'comboLoadout' and go_->>'comboLoadout' is distinct from town.combo_loadout(p_purse) then return town.no('none');end if;
 domino_:=`);
  return replace(s,' return town.combo_root_source',` if not domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmEchoAxe',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return town.combo_root_source`);
 });
 await patch('public.town_fell(jsonb,integer,integer)',s=>replace(s,"1..(k->'echo'->>'trees')::integer","1..greatest(3,(k->'echo'->>'trees')::integer)"));
 await patch('town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint)',s=>{
  s=replace(s," book_:=",` if score_=3 then
  declare prize_ jsonb;begin
   prize_:=town.gift_use(p,'thingBeetleRing',t);
   if prize_->'ok'='true'::jsonb then p:=prize_->'purse';p:=p||jsonb_build_object('coins',(p->>'coins')::numeric+12);end if;
  end;
 end if;
 book_:=`);
  return s;
 });
 const catalog=`update public.town_catalog set data=jsonb_set(data,'{uses}',data->'uses'||'{"charmEchoAxe":{"n":5,"per":"day"},"thingBeetleRing":{"n":5,"per":"day"}}'::jsonb) where key='gifts';`;
 const oldLand=(await db.query("select pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure) d")).rows[0].d;
 // A private copy retains all current fishing rules. Receipts return the current purse on replay.
 const alias=oldLand.replace('FUNCTION public.town_land(', 'FUNCTION town.land_v258(').replace('SECURITY DEFINER','SECURITY INVOKER');
 const wrapper=`create or replace function public.town_land(p_how text,p_fight jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare me uuid:=town.member();request_ uuid;command_ jsonb;old_ town.reward_receipts%rowtype;did_ jsonb;reply_ jsonb;
 begin
  if p_fight->>'request' is null then return town.land_v258(p_how,p_fight);end if;
  if p_fight->>'request' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return town.answer(me,town.no('none'));end if;
  request_:=(p_fight->>'request')::uuid;
  command_:=jsonb_build_object('action','fishLand','how',p_how,'fightHash',md5(p_fight::text));
  perform town.purse_of(me,true);
  select * into old_ from town.reward_receipts where member_id=me and request=request_;
  if found then
   if old_.command is distinct from command_ then return town.answer(me,town.no('none'));end if;
   return town.answer(me,old_.reply);
  end if;
  did_:=town.land_v258(p_how,p_fight);
  if did_->'ok'='true'::jsonb then
   select jsonb_object_agg(key,value) into reply_ from jsonb_each(did_) where key in ('ok','how','what','kept','record','back','again','more','combo');
   delete from town.reward_receipts where member_id=me and at_ms<town.now_ms()-604800000;
   insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,request_,command_,reply_,town.now_ms());
  end if;
  return did_;
 end $$;
 revoke all on function town.land_v258(text,jsonb) from public,anon,authenticated;
 revoke all on function public.town_land(text,jsonb) from public,anon;
 grant execute on function public.town_land(text,jsonb) to authenticated;`;
 await db.exec(catalog);await db.exec(alias);await db.exec(wrapper);
 const newLand=(await db.query("select pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure) d")).rows[0].d;
 const guard=patches.map(p=>`if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${hash(p.old)}','${hash(p.normalized)}') then raise exception 'Definition moved: rebuild v258 (${p.sig})';end if;`).join('\n');
 writeFileSync('supabase/v258_finite_profession_rewards.sql',`-- v258: appendix A reward fixes. Deploy with the matching client after v255 or later.
-- No hosted data is changed by the builder. Transactional and safe to rerun.
begin;
set local statement_timeout='30s';set local lock_timeout='5s';
do $guard$ begin
${guard}
if md5(replace(pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure),chr(13),'')) not in ('${hash(oldLand)}','${hash(newLand)}') then raise exception 'Definition moved: rebuild v258 (town_land)';end if;
end $guard$;
${catalog}
${patches.map(p=>p.next+';').join('\n')}
do $copy$ begin if to_regprocedure('town.land_v258(text,jsonb)') is null then execute $definition$${alias}$definition$;end if;end $copy$;
${wrapper}
notify pgrst,'reload schema';commit;
`);
 console.log('Generated v258: '+patches.length+' guarded replacements and idempotent fishing results.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
