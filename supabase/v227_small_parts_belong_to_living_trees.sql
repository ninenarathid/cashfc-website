-- v227: three daily living-tree care attempts; no logs, timber or tree reset.
-- Run after v226 with the matching site. One actual water + compost + two stamina/attempt.
-- A perfect care sequence gives two small parts. Every small part rests ten minutes per tree,
-- shared by ordinary grain collection, listener, parting knife and care. Felling/logs remain available.
-- The existing grove lock orders every writer before purse locks. Full bags preserve all inputs.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('b3baa3f6500c7af38d919ca01d73a315','133e989544ae64a1f415bedf27cb7a11') then raise exception 'Definition moved: rebuild v227 (public.town_reward(uuid,jsonb))';end if;
if md5(replace(pg_get_functiondef('town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('c660e34893867d668773db983352c643','bc292ec213859f4a8122e7315d436f85') then raise exception 'Definition moved: rebuild v227 (town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text))';end if;
if md5(replace(pg_get_functiondef('town.reward_listening(jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('7216c0f245492d666c4e3b345f19b4cb','4ed04d3bbf4adb4b3ac958a3035e0a5d') then raise exception 'Definition moved: rebuild v227 (town.reward_listening(jsonb,jsonb,jsonb,bigint))';end if;
if md5(replace(pg_get_functiondef('town.grove_tidied(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('c34ed23433afa09b5710b0ae0cfe0c40','d63c82e9be19ba4040b0fd17f9a18f50') then raise exception 'Definition moved: rebuild v227 (town.grove_tidied(jsonb,bigint))';end if;
if md5(replace(pg_get_functiondef('town.trees_told(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('8fe46da9234886da15c2464666686d47','3e96719aa8edbabf1f9422a6be71148c') then raise exception 'Definition moved: rebuild v227 (town.trees_told(jsonb,jsonb,bigint))';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmTreePact":{"kind":"charm","line":"felling","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmTreePact":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.tree_parts(parts jsonb,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(q.key,q.doc),'{}'::jsonb) from (
  select a.key,jsonb_object_agg(b.key,b.value) doc from jsonb_each(coalesce(parts,'{}'::jsonb)) a
  cross join lateral jsonb_each(a.value) b where a.key ~ '^[0-9]{1,4}$' and town.tree_of(a.key::integer) is not null
  and b.key in ('bark','sap','seed','root') and (b.value::text)::bigint>t group by a.key
 ) q
$$;
create or replace function town.tree_part_ready(g jsonb,id integer,part text,t bigint)
returns boolean language sql immutable set search_path='' as $$
 select part='wood' or coalesce((g->'parts'->id::text->>part)::bigint,0)<=t
$$;
create or replace function town.tree_part_rest(g jsonb,id integer,part text,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select case when part='wood' then g else g||jsonb_build_object('parts',case when part='wood' then parts else parts||jsonb_build_object(id::text,coalesce(parts->id::text,'{}'::jsonb)||jsonb_build_object(part,t+600000)) end) end from (select town.tree_parts(g->'parts',t) parts) q
$$;
create or replace function town.reward_pact(p jsonb,g jsonb,input jsonb,request uuid,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'pact';tree_ jsonb;id_ integer;part_ text;water_ jsonb;slot_ integer;hand_ text;has_ integer;used_ jsonb;after_ jsonb;bag_ jsonb;got_ jsonb:='[]'::jsonb;passed_ integer:=0;expected_ numeric;i integer;
begin
 if input->>'action'='pactCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null);end if;
 hand_:=town.hand_of(p);
 if not town.gift_works(p,'charmTreePact') or not coalesce(town.cat('farming')->'buckets' ? hand_,false) or town.held(p->'bag','compost')<1 then return town.no('none');end if;
 select jsonb_build_object('slot',ord-1,'hand',hand_,'has',floor((b->>'water')::numeric)) into water_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
 if water_ is null then return town.no('none');end if;
 if input->>'action'='pactBegin' then
  if jsonb_typeof(input->'tree') is distinct from 'number' or (input->>'tree')::numeric<>floor((input->>'tree')::numeric) or (input->>'tree')::numeric not between 0 and 9999 then return town.no('none');end if;
  id_:=(input->>'tree')::integer;part_:=input->>'part';
 else id_:=(run_->>'tree')::integer;part_:=run_->>'part';end if;
 tree_:=town.tree_of(id_);if tree_ is null or town.tree_elder(tree_) or not town.tree_grown(g,tree_,t) or town.tree_held(g,id_,t,'') then return town.no('none');end if;
 if town.tree_far(tree_,(input->'at'->>0)::integer,(input->'at'->>1)::integer)>1 then return town.no('far');end if;
 if input->>'action'='pactBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint or part_ is null or part_ not in ('bark','sap','seed','root') then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  if not town.tree_part_ready(g,id_,part_,t) or town.used_of(p,'charmTreePact',t)>=3 then return town.no('spent');end if;
  run_:=jsonb_build_object('id',request,'tree',id_,'part',part_,'at',input->'at','seed',seed_,'began',t,'until',t+90000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',run_)),'pact',run_);
 end if;
 if input->>'action'<>'pactEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 or exists(select 1 from jsonb_array_elements(input->'answers') a where jsonb_typeof(a)<>'number' or (a::text)::numeric<>floor((a::text)::numeric) or (a::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if not town.tree_part_ready(g,id_,part_,t) then return town.no('spent');end if;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=mod(20+seed_%61,3);if expected_=(input->'answers'->>i)::numeric then passed_:=passed_+1;end if;end loop;
 if passed_=3 then got_:=jsonb_build_array(jsonb_build_array(case part_ when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,2));end if;
 used_:=town.gift_use(p,'charmTreePact',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 slot_:=(water_->>'slot')::integer;hand_:=water_->>'hand';has_:=(water_->>'has')::integer-1;bag_:=town.take(used_->'purse'->'bag','compost',1);
 bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',hand_,'n',1)||case when has_>0 then jsonb_build_object('water',has_) else '{}'::jsonb end);
 after_:=town.stow_all(used_->'purse'||jsonb_build_object('bag',bag_),got_);if after_ is null then return town.no('full');end if;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null,'got',got_,'passed',passed_,'left',used_->'left')||case when passed_=3 then jsonb_build_object('grove',town.tree_part_rest(g,id_,part_,t)) else '{}'::jsonb end;
end $$;
revoke all on function town.tree_parts(jsonb,bigint),town.tree_part_ready(jsonb,integer,text,bigint),town.tree_part_rest(jsonb,integer,text,bigint),town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
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
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.fell_v205(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
  quality_ text;
begin
  if p_went ? 'grain' and (not town.wood_choice(p_went->'grain') or jsonb_typeof(p_went->'misses') is distinct from 'number') then return town.no('none'); end if;
  if p_went ? 'grain' and ((p_went->>'misses')::numeric <> floor((p_went->>'misses')::numeric) or (p_went->>'misses')::numeric not between 0 and 1000) then return town.no('none'); end if;
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- ── v172: there is no plain way any more: a tree is felled at its board ──
  if plain_ then return town.no('board'); end if;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  -- ── v173: and so does every other tree: a go that is lost fells nothing, gives nothing and costs no stamina ──
  if not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  if board_ and p_went ? 'grain' then quality_ := town.wood_quality((first_->>0)::integer,p_went->'grain',misses,p_purse,p_now); end if;
  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by', axe) else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if board_ and through_ and misses=0 and coalesce((l->>'dark')::double precision,1)<town.gem_by(axe,'dark',k->'axe'->'gems'->'dark'->'timber') then timber:=timber+1;end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every', axe) then logs := logs + town.opt_n('axDust', 'more', axe); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by', axe); timber := timber * town.opt_n('axDouble', 'by', axe);
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in', axe) then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_stamina(axe), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    if quality_ is not null and town.tree_part_ready(closed_,id_,p_went->'grain'->>'part',p_now) then
     got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse);
     closed_ := town.tree_part_rest(closed_,id_,p_went->'grain'->>'part',p_now);
    end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when quality_ is not null then jsonb_build_object('quality',quality_) else '{}'::jsonb end
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_listening(before_ jsonb, did jsonb, went jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 declare grain jsonb:=went->'grain';second_ text:=grain->>'second';f jsonb:=did->'felled'->0;used_ jsonb;got_ jsonb;home jsonb;state_ jsonb;
 begin
  if did->'ok' is distinct from 'true'::jsonb or jsonb_array_length(did->'felled')=0 or second_ is null then return did;end if;
  if second_ not in ('bark','sap','seed') or second_=grain->>'part' then return town.no('none');end if;
  if coalesce((did->>'one')::boolean,false) or did->'through' is distinct from 'true'::jsonb or town.tree_elder(town.tree_of((f->>'id')::integer)) or went->'misses' is distinct from '0'::jsonb or town.wood_quality((f->>'id')::integer,grain,0,'{"bag":[]}'::jsonb,t)<>'heart' then return did;end if;
  if not town.tree_part_ready(did->'grove',(f->>'id')::integer,second_,t) then return did;end if;
  used_:=town.gift_use(did->'purse','charmListening',t);if used_->'ok' is distinct from 'true'::jsonb then return did;end if;
  got_:=town.wood_yield(false,second_,'heart',before_);home:=town.stow_all(used_->'purse',got_);if home is null then return town.no('full');end if;
  if home ? 'professionRewards' then state_:=home->'professionRewards';home:=home||jsonb_build_object('professionRewards',state_||jsonb_build_object('extraction',null,'run',null));end if;
  did:=jsonb_set(did,'{grove}',town.tree_part_rest(did->'grove',(f->>'id')::integer,second_,t));
  return jsonb_set(did,'{felled,0}',f||jsonb_build_object('got',(f->'got')||got_))||jsonb_build_object('purse',home,'got',(did->'got')||got_);
 end $function$
;
CREATE OR REPLACE FUNCTION town.grove_tidied(p_grove jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  still jsonb;
  held_ jsonb;
begin
  if p_grove ? 'parts' then p_grove:=p_grove||jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now));end if;
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into still
    from jsonb_each(down_) e, lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
   where x.t is not null and p_now < town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint);
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into held_ from jsonb_each(goes_) e where town.go_holds(e.value, p_now);
  if (select count(*) from jsonb_object_keys(still)) = (select count(*) from jsonb_object_keys(down_))
     and (select count(*) from jsonb_object_keys(held_)) = (select count(*) from jsonb_object_keys(goes_)) then
    return p_grove;
  end if;
  return (p_grove - 'goes') || jsonb_build_object('down', still) || case when held_ <> '{}'::jsonb then jsonb_build_object('goes', held_) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.trees_told(p_grove jsonb, p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select (case when p_grove ? 'parts' then jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now)) else '{}'::jsonb end) || jsonb_build_object(
    'down', coalesce((select jsonb_agg(jsonb_build_object('id', (d.t->>0)::integer, 'at', d.f->'at')
          || case when town.tree_elder(d.t) and not c.knows then '{}'::jsonb else jsonb_build_object('until', d.until) end order by (d.t->>0)::integer)
        from (select x.t, e.value as f, town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint) as until
                from jsonb_each(case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end) e,
                     lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
               where x.t is not null) d
       where p_now < d.until), '[]'::jsonb),
    'half', coalesce((select jsonb_agg(h.v order by (h.v #>> '{}')::numeric)
        from jsonb_array_elements(case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) h(v)
       where not coalesce(p_grove->'down', '{}'::jsonb) ? (h.v #>> '{}')), '[]'::jsonb))
    || coalesce((select jsonb_build_object('book', jsonb_agg(jsonb_build_array(i.id, p_grove->'book'->i.id->'by') order by i.ord))
        from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
       where jsonb_typeof(p_grove->'book') = 'object' and p_grove->'book' ? i.id
      having count(*) > 0), '{}'::jsonb)
    from (select coalesce(town.tool_has(town.hand_stack(p_purse), 'axElder'), false) as knows) c
$function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint)','EXECUTE') as pact_private;
