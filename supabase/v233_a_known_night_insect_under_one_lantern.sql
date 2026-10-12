-- v233: one known nocturnal insect at the nearest eligible habitat, twenty minutes, once a day.
-- Run after v232 with matching site. Only the hour is simulated; day, moon, habitat and rain remain real.
-- Catch manually for normal cost. Private lure shares the nectar slot; no cloak follower or spawn chain.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('498be6e94c79f8b795856205f698dd63','64de20966e4ab576fb9253be6fdbfe3e') then raise exception 'Definition moved: rebuild v233';end if;
if md5(replace(pg_get_functiondef('town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)'::regprocedure),chr(13),'')) not in ('75fb8a22c5f9761e47b902c338408fca','cd954e4a16a7d7925c8afe3799e12a36') then raise exception 'Definition moved: rebuild v233';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingMoonLantern":{"kind":"thing","line":"insects","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingMoonLantern":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_lantern(p jsonb,input jsonb,t bigint,known_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare ins jsonb:=town.cat('insects');hid integer:=town.nectar_haunt((input->'at'->>0)::integer,(input->'at'->>1)::integer,ins);h jsonb;id_ text;bug_ jsonb;may_ jsonb:='[]'::jsonb;used_ jsonb;lured_ jsonb;
begin
 if not town.gift_works(p,'thingMoonLantern') or input->>'action' not in ('lanternLook','lanternLight') then return town.no('none');end if;
 if hid is not null then
  h:=ins->'haunts'->hid;
  for id_ in select jsonb_array_elements_text(ins->'order') loop
   bug_:=ins->'bugs'->id_;
   if known_ ? id_ and exists(select 1 from jsonb_array_elements(coalesce(bug_->'hours','[]'::jsonb)) hr where (hr->>0)::numeric=0 or (hr->>1)::numeric=24)
    and bug_->'at' ? (h->>0) and town.wild_fits(bug_-'hours',id_,h->>1,h->>2,t,town.word()) then may_:=may_||to_jsonb(id_);end if;
  end loop;
 end if;
 if input->>'action'='lanternLook' then return jsonb_build_object('ok',true,'purse',p,'knownBugs',may_);end if;
 id_:=input->>'bug';if hid is null or id_ is null or not may_ ? id_ then return town.no('none');end if;
 if (p->'lured'->>'until')::bigint>t then return town.no('none');end if;
 used_:=town.gift_use(p,'thingMoonLantern',t);if not (used_->>'ok')::boolean then return used_;end if;
 lured_:=jsonb_build_object('x',input->'at'->0,'y',input->'at'->1,'haunt',hid,'bug',id_,'n',1,'from',t+3000,'until',t+1200000,'seed',(hid::bigint*100003+t/1000)%2147483647,'origin','lantern');
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',2::double precision,t)||jsonb_build_object('lured',lured_),'knownBugs',may_,'lured',lured_,'left',used_->'left');
end $$;
revoke all on function town.reward_lantern(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('lanternLook','lanternLight') then
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
CREATE OR REPLACE FUNCTION town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse, p_now) + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
  -- ── the older tools (v174): the forged net in the hand, and the catch's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);
    after_ := more_->'purse';
    return jsonb_build_object('ok', true,
      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
        else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$
;
notify pgrst,'reload schema';commit;