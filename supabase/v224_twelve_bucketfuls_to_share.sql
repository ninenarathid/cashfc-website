-- v224: one sixty-minute ordinary spring/day, twelve shared bucketfuls total.
-- Run after v223 with the matching site. Five fixed rest sites, five private bounded rows.
-- World spring lock precedes the purse lock; receipts never reset shared stock.
-- Plain water clears the receiver's old nature/contributors. Actual pouring still earns ordinary credit.
-- Rerunnable. Installation moves no coins, inventory, or players.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('8b580e1975c353845db6ad61e15fd6f4','bb82fefc0d5d273bafd8236115563a48') then raise exception 'Reward dispatcher moved: rebuild v224';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingSpringStone":{"kind":"thing","line":"well","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingSpringStone":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('springSites','[[39,32],[159,24],[189,162],[11,216],[58,230]]'::jsonb) where key='rewards';
create table if not exists town.reward_springs(
 site integer primary key check(site between 0 and 4),doc jsonb not null,
 check((doc->>'left')::integer between 0 and 12 and (doc->>'site')::integer=site)
);
alter table town.reward_springs enable row level security;
revoke all on town.reward_springs from public,anon,authenticated;
insert into town.reward_springs(site,doc) select i,jsonb_build_object('site',i,'left',0,'until',0) from generate_series(0,4) i on conflict do nothing;
create or replace function public.town_reward_springs()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 return jsonb_build_object('now',t,'springs',(select coalesce(jsonb_agg(s.doc order by s.site),'[]'::jsonb) from town.reward_springs s where (s.doc->>'until')::bigint>t and (s.doc->>'left')::integer>0));
end $$;
revoke all on function public.town_reward_springs() from public,anon,authenticated;
grant execute on function public.town_reward_springs() to authenticated;
create or replace function town.reward_spring(p jsonb,input jsonb,request uuid,me uuid,old_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ integer;point_ jsonb;used_ jsonb;hand_ text;slot_ integer;n_ integer;after_ jsonb;node_ jsonb;
begin
 if jsonb_typeof(input->'site') is distinct from 'number' or (input->>'site')::numeric<>floor((input->>'site')::numeric) or (input->>'site')::numeric not between 0 and 4 then return town.no('far');end if;
 site_:=(input->>'site')::integer;point_:=town.cat('rewards')->'springSites'->site_;
 if point_ is null then return town.no('far');end if;
 if greatest(abs((input->'at'->>0)::integer-(point_->>0)::integer),abs((input->'at'->>1)::integer-(point_->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='springPlace' then
  if not town.gift_works(p,'thingSpringStone') then return town.no('none');end if;
  if (old_->>'until')::bigint>t and (old_->>'left')::integer>0 then return town.no('spent');end if;
  used_:=town.gift_use(p,'thingSpringStone',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  node_:=jsonb_build_object('site',site_,'id',request,'by',me,'at',point_,'until',t+3600000,'left',12);
  return jsonb_build_object('ok',true,'spring',node_,'purse',town.spend(used_->'purse',3::double precision,t),'left',used_->'left');
 end if;
 if input->>'action'<>'springDraw' or coalesce(old_,'null'::jsonb)='null'::jsonb or (old_->>'site')::integer<>site_ or (old_->>'until')::bigint<=t or (old_->>'left')::integer<=0 then return town.no('none');end if;
 hand_:=town.hand_of(p);if hand_ is null or not town.cat('farming')->'buckets' ? hand_ then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 select (ord-1)::integer into slot_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and b->'n'='1'::jsonb and (b-'item'-'n')='{}'::jsonb order by ord limit 1;
 if slot_ is null then return town.no('none');end if;
 n_:=least((old_->>'left')::integer,(town.cat('farming')->'buckets'->>hand_)::integer);
 after_:=town.spend(p,(town.cat('farming')->'chores'->>'draw')::double precision,t)||jsonb_build_object('bag',jsonb_set(p->'bag',array[slot_::text],jsonb_build_object('item',hand_,'n',1,'water',n_)));
 return jsonb_build_object('ok',true,'spring',old_||jsonb_build_object('left',(old_->>'left')::integer-n_),'purse',after_,'moved',n_);
end $$;
revoke all on function town.reward_spring(jsonb,jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('springPlace','springDraw') then
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
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_springs','SELECT'),'bounded',(select count(*)=5 from town.reward_springs)) as v224_verified;
