-- v223: three manual conduit branches, real water and rooted plant identities.
-- Run after v222 with the matching site. Correct branches only, original bucketfuls.
-- One stamina/game plus one/bucketful, shared ninety-minute bed cooldown after a real watering.
-- Ordinary watering remains available. At most twenty-four derived cooldown rows, private.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('c9d348f2974fadc46158392beacf85e3','8b580e1975c353845db6ad61e15fd6f4') then raise exception 'Reward dispatcher moved: rebuild v223';end if;end $guard$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingRiverHorn":{"kind":"thing","line":"well","rank":8,"by":1}}'::jsonb) where key='gifts';
create table if not exists town.reward_conduits (
 bed integer primary key check(bed between 0 and 23),until_ms bigint not null
);
alter table town.reward_conduits enable row level security;
revoke all on town.reward_conduits from public,anon,authenticated;
create or replace function town.reward_root_identity(k text,p jsonb)
returns text language sql immutable set search_path='' as $$
 select k||':'||(p->'plant'->>'by')||':'||(p->'plant'->>'sown')||':'||(p->'plant'->>'crop')||':'||(p->'plant'->>'picked')
$$;
create or replace function town.reward_conduit(p jsonb,input jsonb,request uuid,bed_ jsonb,cooldown_ bigint,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'conduit';
 number_ integer:=town.bed_of((input->'at'->>0)::integer,(input->'at'->>1)::integer);preview_ jsonb;roots_ jsonb;expected_ jsonb:='[]'::jsonb;
 width_ integer;i integer;n_ bigint;answer_ integer;passed_ integer:=0;matching_ jsonb:='{}'::jsonb;r jsonb;after_ jsonb;used_ integer:=0;plots_ jsonb:='{}'::jsonb;watered_ jsonb:='[]'::jsonb;extra_ jsonb:='{}'::jsonb;
begin
 if input->>'action'='conduitCancel' then return jsonb_build_object('ok',true,'conduit',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)));end if;
 if not town.gift_works(p,'thingRiverHorn') or not coalesce(town.cat('farming')->'buckets' ? town.hand_of(p),false)
  or not exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 if number_<0 then return town.no('far');end if;
 if cooldown_>t then return town.no('spent');end if;
 select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) into bed_ from jsonb_each(bed_) e where town.bed_of(split_part(e.key,',',1)::integer,split_part(e.key,',',2)::integer)=number_;
 if input->>'action'='conduitBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
  preview_:=town.ditch(p,bed_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
  if preview_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  select jsonb_agg(jsonb_build_object('key',k,'identity',town.reward_root_identity(k,bed_->k)) order by ord) into roots_ from jsonb_array_elements_text(preview_->'watered') with ordinality q(k,ord) where ord<=48;
  run_:=jsonb_build_object('id',request,'at',input->'at','bed',number_,'seed',seed_,'began',t,'until',t+90000,'roots',roots_);
  return jsonb_build_object('ok',true,'conduit',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',run_)));
 end if;
 if input->>'action'<>'conduitEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run'
  or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint or jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(input->'answers') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 n_:=(run_->>'seed')::bigint;
 for i in 0..2 loop n_:=(n_*1664525+1013904223)%4294967296;answer_:=mod(20+n_%61,3);expected_:=expected_||jsonb_build_array(answer_);if answer_=(input->'answers'->>i)::integer then passed_:=passed_+1;end if;end loop;
 roots_:=run_->'roots';width_:=ceil(jsonb_array_length(roots_)::numeric/3)::integer;
 for i in 0..jsonb_array_length(roots_)-1 loop
  r:=roots_->i;
  if expected_->(i/width_)=input->'answers'->(i/width_) and town.reward_root_identity(r->>'key',bed_->(r->>'key'))=r->>'identity' then matching_:=matching_||jsonb_build_object(r->>'key',bed_->(r->>'key'));end if;
 end loop;
 preview_:=town.ditch(p,matching_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
 if preview_->'ok'='true'::jsonb then used_:=(preview_->>'used')::integer;plots_:=preview_->'plots';watered_:=preview_->'watered';extra_:=jsonb_build_object('cooldown',t+5400000);end if;
 after_:=town.spend(p,(1+used_)::double precision,t)||case when used_>0 then jsonb_build_object('bag',preview_->'purse'->'bag') else '{}'::jsonb end;
 return jsonb_build_object('ok',true,'conduit',null,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)),'plots',plots_,'watered',watered_,'used',used_,'passed',passed_)||extra_;
end $$;
revoke all on function town.reward_root_identity(text,jsonb),town.reward_conduit(jsonb,jsonb,uuid,jsonb,bigint,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
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
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_conduits','SELECT'),'bounded',(select count(*)<=24 from town.reward_conduits)) as v223_verified;
