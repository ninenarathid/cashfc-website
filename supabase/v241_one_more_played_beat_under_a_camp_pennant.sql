-- v241: helpers eight. Run after v240 with matching site; safe rerun.
-- Flag two existing own camps/day using a real cord and stamina. Normal camp benefits keep their costs and buffs.
-- Five recipients at most, one/person/day across all camps; ten-minute replay of one first missed supported beat.
-- A replay must still be played; a second miss spends the coupon and fails normally. No new tables/readers.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9f0b1d57f7074aeda22c509064b4d380','0a4c93a1804c3d998b7412366c0e798d') then raise exception 'Definition moved: rebuild v241';end if;
if md5(replace(pg_get_functiondef('town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('6f193a24b2aba707e328b323f60b97de','dbfc2f0e2a40a06e7ed6ce0e86ab08e6') then raise exception 'Definition moved: rebuild v241';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCampFlag":{"kind":"thing","line":"helpers","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCampFlag":{"n":2,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.flag_benefit(p jsonb,d jsonb,me text,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare camp_ jsonb:=d->'camp';flag_ jsonb:=camp_->'flag';after_ jsonb:=d->'purse';day_ integer:=town.day_of(t);
begin
 if flag_ is null or coalesce(flag_->'members','[]'::jsonb)?me or jsonb_array_length(coalesce(flag_->'members','[]'::jsonb))>=5 or (p->>'campRetryDay')::integer=day_ then return d;end if;
 after_:=after_||jsonb_build_object('campRetry',jsonb_build_object('line',flag_->'line','until',least(t+600000,(camp_->>'until')::bigint),'site',camp_->'site'),'campRetryDay',day_);
 camp_:=camp_||jsonb_build_object('flag',flag_||jsonb_build_object('members',coalesce(flag_->'members','[]'::jsonb)||jsonb_build_array(me)));
 return d||jsonb_build_object('purse',after_,'camp',camp_);
end $$;
create or replace function town.camp_retry(p jsonb,c jsonb,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare coupon_ jsonb:=p->'campRetry';miss_ jsonb:=c->'campMiss';r jsonb;line_ text;seed_ bigint;width_ numeric;index_ integer;mark_ numeric;target_ numeric;z bigint;i integer;
begin
 if not c?'campMiss' then return jsonb_build_object('ok',true,'purse',p);end if;
 if c->>'action'='giantEnd' then r:=p->'professionRewards'->'giant';line_:='farming';seed_:=(r->>'seed')::bigint;width_:=.09;
 elsif c->>'action'='reviveEnd' then r:=p->'professionRewards'->'revive';line_:='helpers';seed_:=(r->>'seed')::bigint;width_:=.07;
 elsif c->>'action'='kitchenEnd' then r:=p->'professionRewards'->'kitchen';line_:='kitchen';seed_:=((r->>'seed')::bigint+(r->>'stage')::integer)%4294967296;width_:=.065;
 else return town.no('none');end if;
 if r is null or r='null'::jsonb or coupon_ is null or coupon_='null'::jsonb or (coupon_->>'until')::bigint<t or coupon_->>'line' is distinct from line_ or jsonb_typeof(miss_->'index') is distinct from 'number' or (miss_->>'index')::numeric<>floor((miss_->>'index')::numeric) or (miss_->>'index')::numeric not between 0 and 2 or jsonb_typeof(miss_->'mark') is distinct from 'number' or (miss_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
 index_:=(miss_->>'index')::integer;mark_:=(miss_->>'mark')::numeric;if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_typeof(c->'marks'->index_) is distinct from 'number' or (c->'marks'->>index_)::numeric not between 0 and 1 then return town.no('none');end if;
 z:=seed_;for i in 0..index_ loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;end loop;if abs(target_-mark_)<=width_ then return town.no('none');end if;
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('campRetry',null));
end $$;
create or replace function town.reward_camp_flag(p jsonb,c jsonb,me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare site_ integer;camp_ jsonb;used_ jsonb;line_ text:=c->>'line';after_ jsonb;camps_ jsonb;
begin
 if jsonb_typeof(c->'site') is distinct from 'number' or (c->>'site')::numeric<>floor((c->>'site')::numeric) or (c->>'site')::numeric not between 0 and 4 or line_ not in ('farming','helpers','kitchen') or line_ is null then return town.no('none');end if;
 site_:=(c->>'site')::integer;perform pg_advisory_xact_lock(hashtext('town.camp'),site_);select f.camp into camp_ from public.town_field_camps f where f.site=site_;
 if not town.gift_works(p,'thingCampFlag') or camp_ is null or camp_->>'by' is distinct from me::text or (camp_->>'until')::bigint<=t or camp_?'flag' or town.held(p->'bag','signalCord')<1 then return town.no('none');end if;
 if greatest(abs((camp_->>'x')::integer-(c->'at'->>0)::integer),abs((camp_->>'y')::integer-(c->'at'->>1)::integer))>(town.cat('camps')->>'reach')::integer then return town.no('far');end if;
 used_:=town.gift_use(p,'thingCampFlag',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=town.spend(used_->'purse',1::double precision,t)||jsonb_build_object('bag',town.take(p->'bag','signalCord',1));camp_:=camp_||jsonb_build_object('flag',jsonb_build_object('line',line_,'members','[]'::jsonb));update public.town_field_camps f set camp=camp_ where f.site=site_;
 select coalesce(jsonb_agg(f.camp order by f.site),'[]'::jsonb) into camps_ from public.town_field_camps f where (f.camp->>'until')::bigint>t;
 return jsonb_build_object('ok',true,'purse',after_,'camps',camps_);
end $$;
revoke all on function town.flag_benefit(jsonb,jsonb,text,bigint),town.camp_retry(jsonb,jsonb,bigint),town.reward_camp_flag(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
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
CREATE OR REPLACE FUNCTION town.camp_work(p_purse jsonb, p_action text, p_site integer, p_supply text, p_x integer, p_y integer, p_old jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare k jsonb:=town.cat('camps');spot jsonb:=k->'sites'->p_site;bag jsonb:=p_purse->'bag';n integer;day_ integer:=town.day_of(p_now);used_ integer;effect text;out_ jsonb;camp_ jsonb;buffs jsonb;had jsonb;until_ numeric;book jsonb;
begin
 if p_site is null or p_site<0 or spot is null or p_x is null or p_y is null or greatest(abs((spot->>0)::numeric-p_x),abs((spot->>1)::numeric-p_y))>(k->>'reach')::numeric then return town.no('far');end if;
 if p_action='place' then
   if town.held(bag,'campKit')<1 then return town.no('tool');end if;
   if (p_old->>'until')::numeric>p_now then return town.no('spent');end if;
   n:=case when town.held(town.carried_bag(p_purse),'provisionChest')>0 then (k->>'chestCharges')::integer else (k->>'charges')::integer end;
   if town.held(bag,'campCanvas')<1 or town.held(bag,'dryTinder')<1 or town.held(bag,'trailRation')<n then return town.no('none');end if;
   bag:=town.take(town.take(town.take(bag,'campCanvas',1),'dryTinder',1),'trailRation',n);
   camp_:=jsonb_build_object('site',p_site,'x',spot->0,'y',spot->1,'by',p_me,'until',p_now+case when town.held(town.carried_bag(p_purse),'weatherAwning')>0 then (k->>'awningMinutes')::bigint else (k->>'minutes')::bigint end*60000,'left',n,'wide',town.held(town.carried_bag(p_purse),'signalPennant')>0,'lit',town.held(town.carried_bag(p_purse),'campLantern')>0);
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',bag);
   return jsonb_build_object('ok',true,'camp',camp_,'purse',out_);
 end if;
 if p_action<>'benefit' or p_action is null then return town.no('none');end if;
 if p_old is null or (p_old->>'until')::numeric<=p_now or (p_old->>'left')::numeric<=0 then return town.no('none');end if;
 effect:=k->'supplies'->>p_supply;if effect is null then return town.no('none');end if;
 used_:=case when (p_purse->'campUses'->>'day')::integer=day_ then (p_purse->'campUses'->>'n')::integer else 0 end;
 if used_>=(k->>'daily')::integer then return town.no('spent');end if;
 if town.held(bag,p_supply)<1 then return town.no('none');end if;
 if p_supply='sharedTea' and town.held(bag,'fieldKettle')<1 then return town.no('tool');end if;
 until_:=p_now+(k->>'benefitMinutes')::numeric*60000*greatest(1,town.buff_by(p_purse,p_now,'campPreparation'));
 buffs:=coalesce((select jsonb_agg(b.v order by b.ord) from jsonb_array_elements(coalesce(p_purse->'buffs',case when p_purse->'buff' is not null and p_purse->'buff'<>'null'::jsonb then jsonb_build_array(p_purse->'buff'||jsonb_build_object('level',1)) else '[]'::jsonb end)) with ordinality b(v,ord) where (b.v->>'until')::numeric>p_now),'[]'::jsonb);
 select b.v into had from jsonb_array_elements(buffs) b(v) where b.v->>'id'=effect limit 1;
 if had is null then buffs:=buffs||jsonb_build_array(jsonb_build_object('id',effect,'level',1,'until',until_));
 else select jsonb_agg(case when b.v->>'id'=effect then b.v||jsonb_build_object('until',greatest((b.v->>'until')::numeric,until_)) else b.v end order by b.ord) into buffs from jsonb_array_elements(buffs) with ordinality b(v,ord);end if;
 book:=coalesce(p_purse->'campBook','[]'::jsonb);if not book ? p_supply then book:=book||jsonb_build_array(p_supply);end if;
 out_:=town.spend(p_purse,1,p_now)||jsonb_build_object('bag',town.take(bag,p_supply,1),'buffs',buffs,'campUses',jsonb_build_object('day',day_,'n',coalesce(used_,0)+1),'campBook',book);
 return town.flag_benefit(p_purse,jsonb_build_object('ok',true,'effect',effect,'camp',p_old||jsonb_build_object('left',(p_old->>'left')::integer-1),'purse',out_),p_me,p_now);
end $function$
;notify pgrst,'reload schema';commit;