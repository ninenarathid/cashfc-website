-- v226: three chosen known trees, finite private nursery and three real care games.
-- Run after v225 with the matching site. Three real plain pine seeds/start, one start/day.
-- Two stamina/attempt. Up to six parts total, three cedar slivers at most, no logs or timber.
-- Known tree kinds from actual felling; owning pine seeds teaches pine. Repeated kinds allowed.
-- Parts lock before each game; full bags preserve the same challenge, seed and choice.
-- Checkpoints cross days; cancelling never refunds seeds/quota. No world felling, regrowth, forging multipliers or XP.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('dc71f24d65076fc87c5db81b2595c426','b3baa3f6500c7af38d919ca01d73a315') then raise exception 'Reward dispatcher moved: rebuild v226';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingTinyForest":{"kind":"thing","line":"felling","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingTinyForest":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('nurseryBoxes','[[0,0,64,64],[128,0,60,44],[144,112,96,80],[0,208,72,56]]'::jsonb) where key='rewards';
create or replace function town.reward_nursery(p jsonb,input jsonb,request uuid,known_ jsonb,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'nursery';at_ jsonb:=input->'at';used_ jsonb;node_ jsonb;challenge_ jsonb;next_ integer;game_ text;part_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;won_ boolean:=true;got_ jsonb:='[]'::jsonb;i integer;kind_ text;item_ text;n_ integer;after_ jsonb;completed_ boolean;allowed_ boolean;
begin
 select coalesce(jsonb_agg(k order by ord),'[]'::jsonb) into known_ from jsonb_array_elements_text('["pine","ironwood","moonwood","elder"]'::jsonb) with ordinality q(k,ord) where known_ ? k or coalesce(state_->'treeKinds','[]'::jsonb) ? k or k='pine' and town.held(p->'bag','pineNut')>0;
 if input->>'action'='nurseryLook' then if not town.gift_works(p,'thingTinyForest') then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('treeKinds',known_)));end if;
 if input->>'action'='nurseryCancel' then
  if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',null)),'nursery',null);
 end if;
 if not town.gift_works(p,'thingTinyForest') or town.axe_of(p) is null then return town.no('none');end if;
 select exists(select 1 from jsonb_array_elements(town.cat('rewards')->'nurseryBoxes') b where (at_->>0)::integer>=(b->>0)::integer and (at_->>1)::integer>=(b->>1)::integer and (at_->>0)::integer<(b->>0)::integer+(b->>2)::integer and (at_->>1)::integer<(b->>1)::integer+(b->>3)::integer) into allowed_;
 if not allowed_ then return town.no('far');end if;
 if input->>'action'='nurseryBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'kinds') is distinct from 'array' or jsonb_array_length(input->'kinds')<>3 or exists(select 1 from jsonb_array_elements(input->'kinds') k where jsonb_typeof(k)<>'string' or not known_ ? (k#>>'{}')) or town.held(p->'bag','pineNut')<3 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item'='pineNut' and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingTinyForest',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'at',at_,'kinds',input->'kinds','seed',seed_,'next',0,'began',t,'part',null,'challenge',null);
  after_:=used_->'purse'||jsonb_build_object('bag',town.take(p->'bag','pineNut',3),'professionRewards',state_||jsonb_build_object('nursery',run_));
  return jsonb_build_object('ok',true,'purse',after_,'nursery',run_,'left',used_->'left');
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
 if greatest(abs((at_->>0)::integer-(run_->'at'->>0)::integer),abs((at_->>1)::integer-(run_->'at'->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='nurseryStage' then
  part_:=input->>'part';if part_ is null or part_ not in ('wood','bark','sap','seed','root') or run_->>'part' is not null and part_<>run_->>'part' then return town.no('none');end if;
  challenge_:=run_->'challenge';if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('part',part_,'challenge',challenge_);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_);
 end if;
 challenge_:=run_->'challenge';part_:=run_->>'part';
 if input->>'action'<>'nurseryEnd' or part_ is null or coalesce(challenge_,'null'::jsonb)='null'::jsonb or input->>'challenge' is distinct from challenge_->>'id' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(run_->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when game_='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 if won_ then
  kind_:=run_->'kinds'->>next_;item_:=case part_ when 'wood' then case when kind_='elder' then 'cedarSliver' else 'heartwood' end when 'sap' then 'pinePitch' when 'bark' then 'pineBark' when 'seed' then 'pineNut' else 'rootFiber' end;n_:=case when kind_='elder' and part_='wood' then 1 else 2 end;
  got_:=jsonb_build_array(jsonb_build_array(item_,n_));
 end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=won_ and next_=2;run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won_ then 1 else 0 end,'part',case when won_ then 'null'::jsonb else run_->'part' end,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end);
end $$;
revoke all on function town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action' in ('scan','liftAnchor','liftRide') then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 0 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('none'));end if;
  f:=(p_input->>'floor')::integer;
  if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;
  -- Same world-row-before-purse order as town_mine. This is one requested scan, not a new polling reader.
  c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 if p_input->>'action'='process' and p_input->>'kind'='mineral' then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 1 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('far'));end if;
  f:=(p_input->>'floor')::integer;if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
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
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)','EXECUTE') as nursery_private;
