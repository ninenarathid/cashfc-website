-- v236: up to four actual pot servings on a picnic cloth, one stamina to place.
-- Run after v235 with matching site. Nearby players choose to sit and eat in thirty seconds.
-- Original meal quotas, strength, buffs, early-rise forfeiture and borrowed bowls remain; no extra food.
-- Uses existing shared pot rows, expiry/table transfer, reader and pickup; no new polling or world tables.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('5e372beac0e1c2324beed1bf0c782f27','9980988523ab92e381671a8e72e657ed') then raise exception 'Definition moved: rebuild v236';end if;
if md5(replace(pg_get_functiondef('town.chew(jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('b3fb0ddebcc08357467bccf7b22e8229','525925cefc0de299d4bbbf41bc8fd352') then raise exception 'Definition moved: rebuild v236';end if;
if md5(replace(pg_get_functiondef('town.settle(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('599fa75d406bcb6f44b94dd289d5e915','60bf0e51db80097200d68d3316b4bab1') then raise exception 'Definition moved: rebuild v236';end if;
end $guard$;update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingPicnicCloth":{"kind":"thing","line":"kitchen","rank":7,"by":1}}'::jsonb) where key='gifts';
create or replace function town.reward_picnic(p jsonb,input jsonb,me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=input->>'action';slot_ integer;s jsonb;n_ integer;bag_ jsonb;id_ bigint;pot_ jsonb;after_ jsonb;meal_ jsonb;x_ integer:=(input->'at'->>0)::integer;y_ integer:=(input->'at'->>1)::integer;marks_ jsonb;
begin
 if town.reward_relay_place(input->'at') is null then return town.no('far');end if;
 if a='picnicPlace' then
  if not town.gift_works(p,'thingPicnicCloth') or jsonb_typeof(input->'slot') is distinct from 'number' or (input->>'slot')::numeric<>floor((input->>'slot')::numeric) or (input->>'slot')::numeric not between 0 and jsonb_array_length(p->'bag')-1 then return town.no('none');end if;
  slot_:=(input->>'slot')::integer;s:=p->'bag'->slot_;
  if s->>'item' is distinct from 'potFull' or s->'of'->>'dish' is null or not town.cat('dishes') ? (s->'of'->>'dish') or jsonb_typeof(s->'of'->'left') is distinct from 'number' or (s->'of'->>'left')::numeric<1 or (s->'of'->>'left')::numeric<>floor((s->'of'->>'left')::numeric) then return town.no('none');end if;
  if exists(select 1 from public.town_pots o where not o.feast and abs(o.x-x_)<=1 and abs(o.y-y_)<=1) or (select count(*) from public.town_pots o where o.member_id=me and not o.feast)>=(town.cat('cooking')->>'pots')::integer then return town.no('none');end if;
  n_:=least(4,(s->'of'->>'left')::integer);marks_:=town.pot_marks(s)||jsonb_build_object('picnic',true);
  insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values(me,s->'of'->>'dish',n_,x_,y_,false,t,false,marks_) on conflict (x,y) where not feast do nothing returning id into id_;
  if id_ is null then return town.no('none');end if;
  bag_:=jsonb_set(p->'bag',array[slot_::text],case when (s->'of'->>'left')::integer=n_ then 'null'::jsonb else jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer-n_)) end);
  return jsonb_build_object('ok',true,'purse',town.spend(p,1::double precision,t)||jsonb_build_object('bag',bag_),'picnic',town.pot_doc(id_));
 end if;
 if a<>'picnicEat' or input->>'pot' is null or input->>'pot' !~ '^[0-9]{1,18}$' then return town.no('none');end if;
 id_:=(input->>'pot')::bigint;
 -- The caller already holds its purse, as the ordinary pot RPCs do. Lock this shared serving before reading it.
 perform 1 from public.town_pots o where o.id=id_ for update;pot_:=town.pot_doc(id_);
 if pot_ is null or pot_->'picnic' is distinct from 'true'::jsonb or coalesce((pot_->>'feast')::boolean,false) or (pot_->>'left')::integer<1 then return town.no('none');end if;
 if town.reward_relay_place(pot_->'at') is distinct from town.reward_relay_place(input->'at') or sqrt(power((pot_->'at'->>0)::integer-x_,2)+power((pot_->'at'->>1)::integer-y_,2))>2 then return town.no('far');end if;
 if input->'seated' is distinct from 'true'::jsonb then return town.no('stand');end if;
 if coalesce(p->'eating','null'::jsonb)<>'null'::jsonb or (town.bowls_today(p,t)->>town.meal_of(t))::integer >= (town.cat('stamina')->>'bowls')::integer then return town.no('meal');end if;
 meal_:=town.begun(p,pot_->>'dish',t);after_:=p||meal_||jsonb_build_object('eating',meal_->'eating'||town.pot_marks(pot_)||jsonb_build_object('lent',true,'picnic',true));
 if (pot_->>'left')::integer=1 then delete from public.town_pots o where o.id=id_;pot_:=null;
 else update public.town_pots o set helpings=helpings-1 where o.id=id_;pot_:=town.pot_doc(id_);end if;
 return jsonb_build_object('ok',true,'purse',after_,'picnic',pot_);
end $$;
revoke all on function town.reward_picnic(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('picnicPlace','picnicEat') then
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
CREATE OR REPLACE FUNCTION town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := case when e->'picnic'='true'::jsonb then 30000 else (st->>'minutes')::bigint * 60000 end;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  -- ── the older tools (v174): with what the helping carries from its pot (nothing, of any other) ──
  gain := ((dish->>'stamina')::double precision
      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  -- ── the older tools (v174): and what it carries for the buff its dish leaves ──
  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then
    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');
  end if;
  -- ── the older tools (v174): its end ──
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.settle(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  ends bigint;
begin
  if e = 'null'::jsonb then return town.bowls_back(p_purse, 0); end if;
  ends := (e->>'from')::bigint + case when e->'picnic'='true'::jsonb then 30000 else (town.cat('stamina')->>'minutes')::bigint * 60000 end;
  if p_now >= ends then return town.chew(p_purse, 0, ends)->'purse'; end if;
  return town.bowls_back(p_purse, 0);
end;
$function$
;
notify pgrst,'reload schema';commit;