-- v231: one private river-dragon trail/day and one known-legend encounter after three manual clues.
-- Run after v230 with matching site. Original eligibility filters, bait, fight and landing remain mandatory.
-- Pair/star casts never spend an encounter; changed conditions preserve it for at most thirty minutes.
begin;do $g$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('ac1d70c0e62d41141c0855350a9fcafd','ce123ffaef22d8d4c01e7e37f4bd3212') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('7a3ba07250c86f83359874fcafb41119','dc29a26fcb2a46458c7ef97dd5858190') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('6b239b62d4fddf7b01e1cd0af5963ec1','e7a2359763f418c868e08653d22f2ee4') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('town.reward_school_pool(jsonb,uuid,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('267aca062a4c1e11235b78f8f36d20db','7037e371a7526bfcd98980a42ba95b9e') then raise exception 'Definition moved: rebuild v231';end if;
end $g$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famRiverDragon":{"kind":"familiar","line":"fishing","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famRiverDragon":{"n":1,"per":"day"}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('dragonBanks','[{"at":[0,23],"clues":[[0,17],[5,17],[3,22]]},{"at":[12,39],"clues":[[6,33],[14,33],[6,38]]},{"at":[174,135],"clues":[[169,129],[174,129],[179,129]]},{"at":[216,138],"clues":[[211,132],[216,132],[221,132]]},{"at":[18,252],"clues":[[12,246],[17,246],[22,246]]}]'::jsonb) where key='rewards';
create or replace function town.reward_dragon_begin(p jsonb,me uuid,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare bank_ jsonb;fish_ text:=input->>'fish';odds_ jsonb;used_ jsonb;seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);nodes_ jsonb:='[]'::jsonb;run_ jsonb;i integer;
begin
 select b into bank_ from jsonb_array_elements(town.cat('rewards')->'dragonBanks') b where b->'at'=input->'at';if bank_ is null then return town.no('far');end if;
 if seed_ not between 0 and 4294967295 or not town.gift_works(p,'famRiverDragon') or coalesce(p->'professionRewards'->'trail','null'::jsonb)<>'null'::jsonb or (p->'professionRewards'->'dragon'->>'until')::bigint>t
 or town.cat('fish')->fish_->>'tier' is distinct from 'legend' or coalesce((p->'best'->>fish_)::numeric,0)<=0 or input->>'current' is null then return town.no('none');end if;
 odds_:=town.reward_school_pool(p,me,input,t);if not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 used_:=town.gift_use(p,'famRiverDragon',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 for i in 0..2 loop nodes_:=nodes_||jsonb_build_array(jsonb_build_object('at',bank_->'clues'->((i+seed_%3)::integer%3),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
 run_:=jsonb_build_object('id',request,'kind','dragon','next',0,'began',t,'challenge',null,'dragon',jsonb_build_object('fish',fish_,'bait',input->'bait','current',input->'current','at',input->'at'),'nodes',nodes_);
 return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',coalesce(used_->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)),'trail',run_,'left',used_->'left');
end $$;
create or replace function town.reward_dragon_draw(p jsonb,odds_ jsonb,bait_ text,current_ text,at_ jsonb,pair_ boolean,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare call_ jsonb:=p->'professionRewards'->'dragon';begin
 if coalesce(call_,'null'::jsonb)='null'::jsonb or (call_->>'until')::bigint<=t or not town.gift_works(p,'famRiverDragon') or pair_ or star_ or call_->>'bait' is distinct from bait_ or call_->>'current' is distinct from current_ or call_->'at' is distinct from at_ or town.cat('fish')->(call_->>'fish')->>'tier' is distinct from 'legend' or coalesce((p->'best'->>(call_->>'fish'))::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=call_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',null)),'odds',jsonb_build_array(jsonb_build_object('what',call_->'fish','p',1)));
end $$;
revoke all on function town.reward_dragon_begin(jsonb,uuid,uuid,jsonb,bigint,bigint),town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='boat' then
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
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;dragon_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_trail(p jsonb, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'trail';kind_ text;gift_ text;sites jsonb;nodes jsonb:='[]'::jsonb;
 x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;seed_ bigint;count_ integer;offset_ integer;step_ integer;i integer;s jsonb;node_ jsonb;challenge_ jsonb;
 expected_ jsonb:='[]'::jsonb;target_ numeric;won boolean:=true;got jsonb:='[]'::jsonb;after_ jsonb;used jsonb;finished boolean:=false;next_ integer;
begin
 if input->>'action'='trailBegin' then
  kind_:=input->>'kind';if kind_ is null or kind_ not in ('forest','star') or coalesce(run_,'null'::jsonb)<>'null'::jsonb then return town.no('none');end if;
  gift_:=case when kind_='dragon' then 'famRiverDragon' when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') spot where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=8) then return town.no('far');end if;
  select jsonb_agg(spot order by ord) into sites from jsonb_array_elements(town.cat('forest')->'spots') with ordinality a(spot,ord) where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=28;
  count_:=jsonb_array_length(sites);if count_ is null or count_<3 then return town.no('none');end if;
  used:=town.gift_use(p,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  offset_:=(seed_%count_)::integer;step_:=floor(count_::numeric/3)::integer;
  for i in 0..2 loop s:=sites->((offset_+i*step_)%count_);nodes:=nodes||jsonb_build_array(jsonb_build_object('at',jsonb_build_array(s->1,s->2),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
  run_:=jsonb_build_object('id',request,'kind',kind_,'nodes',nodes,'next',0,'began',t,'challenge',null);
  return jsonb_build_object('ok',true,'trail',run_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'trail' then return town.no('none');end if;
 kind_:=run_->>'kind';gift_:=case when kind_='dragon' then 'famRiverDragon' when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
 if input->>'action'='trailCancel' then return jsonb_build_object('ok',true,'trail',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',null)));end if;
 next_:=(run_->>'next')::integer;node_:=run_->'nodes'->next_;if node_ is null or greatest(abs(x-(node_->'at'->>0)::integer),abs(y-(node_->'at'->>1)::integer))>3 then return town.no('far');end if;
 challenge_:=run_->'challenge';
 if input->>'action'='trailStage' then
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('challenge',challenge_);
  return jsonb_build_object('ok',true,'trail',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',run_)));
 end if;
 if input->>'action'<>'trailEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won:=false;end if;
 end loop;
 if won then
  if kind_='forest' then got:=jsonb_build_array(jsonb_build_array((array['forestLichen','mushroomSpores','wildMedicRoot'])[next_+1],1));elsif kind_='star' and next_=2 then got:='[["starShard",1]]'::jsonb;end if;
 end if;
 after_:=town.stow_all(p,got);if after_ is null then return town.no('full');end if;
 finished:=won and next_=2;
 if finished and kind_='dragon' then after_:=after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',run_->'dragon'||jsonb_build_object('until',t+1800000)));end if;
 run_:=case when finished then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won then 1 else 0 end,'challenge',null) end;
 return jsonb_build_object('ok',true,'trail',run_,'completed',finished,'got',got,'passed',case when won then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,2,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_school_pool(p jsonb, me uuid, input jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;deep_ jsonb:=town.cat('fishing')->'places'->(x::text||','||y::text);water_ jsonb:=town.cat('fishing')->'waters'->(x::text||','||y::text);
 habitat_ text:=coalesce(water_->>'habitat','town');current_ text:=coalesce(input->>'current',water_->>'current','eddy');bait_ text:=input->>'bait';sg jsonb:=town.cat('fishing')->'signs';signs_ text[];under_ jsonb;odds_ jsonb;pattern_ jsonb;rod_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
 select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1;
 if boat_ is not null then boatwater_:=town.boat_water(boat_,x,y,t);if boatwater_ is null then return '[]'::jsonb;end if;deep_:='true'::jsonb;water_:=boatwater_;habitat_:=water_->>'habitat';current_:=coalesce(input->>'current',water_->>'current');end if;
 if deep_ is null or current_ not in ('eddy','run','shelter') or (habitat_='town' and current_<>'eddy') or (habitat_='pool' and current_='run') or town.hook_bait(p,bait_)->'ok' is distinct from 'true'::jsonb then return '[]'::jsonb;end if;
 signs_:=town.signs_of(t,town.stamina_of(p,t)<=0,(select count(*)::integer from public.town_lines l where l.member_id<>me and (l.doc->>'cast_at')::bigint>t-(sg->>'lately')::bigint*1000),town.wet_ms(t-(sg->>'after')::bigint*60000,t),town.raining(t));
 under_:=town.under_orb(town.orb_of(p,t),extract(hour from to_timestamp(t/1000.0) at time zone 'Asia/Bangkok')::integer,town.raining(t),signs_);
 odds_:=town.river_odds(bait_,(under_->>'hour')::integer,(under_->>'rain')::boolean,town.has_buff(p,t,'lucky'),not deep_::boolean,array(select jsonb_array_elements_text(under_->'signs')),town.buff_by(p,t,'lucky'),habitat_,current_);
 pattern_:=town.river_pattern(p,bait_,x,y,current_,t);if habitat_<>'town' then odds_:=town.river_pattern_odds(odds_,(pattern_->>'n')::integer);end if;
 if town.is_wary(p,t) then odds_:=town.sift(odds_,array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')));end if;
 rod_:=town.rod_held(p);if rod_ is not null then odds_:=town.rarer(odds_,(town.rod_fx(rod_)->>'rare')::double precision);end if;
 return odds_;
end $function$
;
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text),town.reward_trail(jsonb,uuid,jsonb,bigint,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';commit;