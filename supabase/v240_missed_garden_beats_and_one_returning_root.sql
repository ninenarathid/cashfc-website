-- v240: helpers seven and nine. Run after v239 with matching site; safe rerun.
-- Only missed offered garden beats create ten-minute checkpoints. Recovery pays the original tool/water/cost once.
-- Rescue only retained, unpicked, pest-dead foreign roots once, with a real seed/cure and three stamina.
-- Preserve original root identity, reset growth to fifty percent, and keep world readers/cache contracts.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('da266c35b48ed6092b83875844bab044','9f0b1d57f7074aeda22c509064b4d380') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('9d2ef351d4ffef8059d63e01b6639864','3f21d2a38f3912e700388fc3aef38808') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('town.pour_row(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb,double precision)'::regprocedure),chr(13),'')) not in ('63bec9903c1370746b674f9461954445','9b7bcc349e069f21f473c11293a7d73c') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('public.town_row(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('91ca9eec42971574e1bd771a6516e1a2','135e9a8bd54f501d321b4b20b603957d') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('public.town_longpour(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('2fd57a59c520bd702e91d6a8493f1972','cdd2ed9394888f963745c3da527e9731') then raise exception 'Definition moved: rebuild v240';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famGardenMender":{"kind":"familiar","line":"helpers","rank":7,"by":1},"thingReviveSeed":{"kind":"thing","line":"helpers","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famGardenMender":{"n":10,"per":"day"},"thingReviveSeed":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.help_fingerprint(plot_ jsonb,owner_ text)
returns text language sql immutable set search_path='' as $$
 select case when coalesce(plot_->'plant','null'::jsonb)<>'null'::jsonb then
 (plot_->'plant'->>'by')||':'||(plot_->'plant'->>'crop')||':'||(plot_->'plant'->>'sown')||':'||(plot_->'plant'->>'watered')||':'||(plot_->'plant'->>'cured')||':'||(plot_->'plant'->>'picked')
 else coalesce(plot_->>'soil','wild')||':'||owner_ end
$$;
create or replace function town.remember_garden_misses(p jsonb,offered_ jsonb,deed_ text,plots_ jsonb,owner_ text,marks_ jsonb,done_ jsonb,me_ text,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);previous_ jsonb;fresh_ jsonb:='[]'::jsonb;key_ text;by_ text;all_ jsonb;
begin
 if deed_ not in ('water','clear','till') then return p;end if;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into previous_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) with ordinality q(v,ord) where (v->>'until')::bigint>t and not done_?(v->>'key');
 for key_ in select jsonb_array_elements_text(offered_) loop
  if marks_->key_='false'::jsonb and not done_?key_ then
   by_:=coalesce(plots_->key_->'plant'->>'by',owner_,me_);
   fresh_:=fresh_||jsonb_build_array(jsonb_build_object('id',t::text||':'||key_||':'||deed_,'key',key_,'deed',deed_,'owner',by_,'fingerprint',town.help_fingerprint(plots_->key_,by_),'until',t+600000));
  end if;
 end loop;
 if jsonb_array_length(fresh_)=0 and jsonb_array_length(previous_)=jsonb_array_length(coalesce(state_->'failedGarden','[]'::jsonb)) then return p;end if;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into previous_ from jsonb_array_elements(previous_) with ordinality q(v,ord) where not exists(select 1 from jsonb_array_elements(fresh_) f(v) where f.v->>'key'=q.v->>'key');
 all_:=previous_||fresh_;select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into all_ from jsonb_array_elements(all_) with ordinality q(v,ord) where ord>jsonb_array_length(all_)-10;
 return p||jsonb_build_object('professionRewards',state_||jsonb_build_object('failedGarden',all_));
end $$;
create or replace function town.reward_help_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;plant_ jsonb;keeping_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'revive';job_ jsonb;identity_ text;used_ jsonb;after_ jsonb;did_ jsonb;updated_ jsonb;pass_ boolean:=true;z bigint;target_ numeric;i integer;others_ integer;seed_item text;
begin
 if a='reviveCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',null)),'revive',null);end if;
 if bed_<0 then return town.no('far');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;plant_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 if a='helpMend' then
  select v into job_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) q(v) where v->>'id'=c->>'job' and v->>'key'=key_ and (v->>'until')::bigint>t limit 1;
  if not town.gift_works(p,'famGardenMender') or job_ is null or job_->>'owner'=me::text or (coalesce(plant_,'null'::jsonb)='null'::jsonb and town.owner_of(keeping_,false,t) is distinct from job_->>'owner') or town.help_fingerprint(plot_,job_->>'owner') is distinct from job_->>'fingerprint' then return town.no('none');end if;
  used_:=town.gift_use(p,'famGardenMender',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  select count(*)::integer into others_ from jsonb_each(plots_) q where q.key<>key_ and coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb;
  did_:=town.tend(key_,coalesce(plot_,'{"soil":"wild","plant":null}'::jsonb),keeping_,others_,0,used_->'purse',me::text,t,false);
  if did_->'ok' is distinct from 'true'::jsonb or did_->>'deed' is distinct from job_->>'deed' then return town.no('none');end if;
  after_:=did_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('failedGarden',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(state_->'failedGarden') with ordinality q(v,ord) where v->>'id'<>job_->>'id')));updated_:=did_->'plot';
  if job_->>'deed'='water' then updated_:=town.poured_as(plot_,updated_,t,town.hot(t),town.well_kind(t),me::text,coalesce((did_->>'times')::double precision,1),town.wearing(p,'charmBell'));end if;
 else
  seed_item:=town.cat('crops')->(plant_->>'crop')->>'seed';
  if not town.gift_works(p,'thingReviveSeed') or plant_ is null or plant_='null'::jsonb or plant_->>'by'=me::text or (plant_->>'root' is not null and plant_->>'root'<>key_) or plant_->'giant'='true'::jsonb or plant_->'revived'='true'::jsonb or (plant_->>'picked')::integer>0 or not coalesce((town.see(key_,plot_,t)->>'dead')::boolean,false) or town.held(p->'bag',seed_item)<1 or town.held(p->'bag','pestCure')<1 or town.owner_of(keeping_,true,t) is null then return town.no('none');end if;
  identity_:=key_||':'||(plant_->>'by')||':'||(plant_->>'crop')||':'||(plant_->>'sown');
  if a='reviveBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'thingReviveSeed',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   r:=jsonb_build_object('id',request_,'key',key_,'identity',identity_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',r)),'revive',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or r->>'identity' is distinct from identity_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;if abs(target_-(c->'marks'->>i)::numeric)>.07 then pass_:=false;end if;end loop;
  after_:=town.spend(p,3::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'revive',null,'helpPassed',false);end if;
  plant_:=plant_||jsonb_build_object('revived',true,'cured',t,'watered',t,'guard',greatest((plant_->>'guard')::bigint,t+7200000));plant_:=plant_||jsonb_build_object('boost',(plant_->>'boost')::double precision+((town.cat('crops')->(plant_->>'crop')->>'hours')::double precision*.5-town.grown(plant_,t))*3600000);
  after_:=after_||jsonb_build_object('bag',town.take(town.take(after_->'bag',seed_item,1),'pestCure',1));updated_:=plot_||jsonb_build_object('plant',plant_);
 end if;
 insert into public.town_plots(x,y,bed,soil,plant,changed) values(x_,y_,bed_,updated_->>'soil',nullif(updated_->'plant','null'::jsonb),t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;
 if a='helpMend' then perform town.note(me,job_->>'deed',plant_->>'crop',1,0,jsonb_build_object('tile',c->'at','whose',job_->>'owner','recovery',true));end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',jsonb_build_object(key_,updated_))||case when a='helpMend' then jsonb_build_object('helpDone',job_->>'deed','got',did_->'got')||case when did_->'times' is not null then jsonb_build_object('times',did_->'times') else '{}'::jsonb end else jsonb_build_object('revive',null,'helpPassed',true) end;
end $$;
revoke all on function town.help_fingerprint(jsonb,text),town.remember_garden_misses(jsonb,jsonb,text,jsonb,text,jsonb,jsonb,text,bigint),town.reward_help_garden(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
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
CREATE OR REPLACE FUNCTION town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
  cell_ text;
  extras_ jsonb:='[]'::jsonb;
  got_ jsonb;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  mine:=town.remember_garden_misses(mine,found->'plots',found->>'deed',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', coalesce(got_,'[]'::jsonb))
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.pour_row(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb, p_secs double precision DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  row_ jsonb;
  state jsonb := '{}'::jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb;
  key text;
  did jsonb;
  others integer;
begin
  if jsonb_typeof(p_keys) is distinct from 'array' then return town.no('none'); end if;
  row_ := town.pour_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if jsonb_array_length(row_) = 0 then return town.no('none'); end if;
  mine := town.bridged(p_purse, p_secs, p_now);
  for key in select t.key_ from jsonb_array_elements_text(row_) with ordinality as t(key_, ord) order by t.ord loop
    continue when marks->key is distinct from 'true'::jsonb;
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plots->key, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> 'water' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', plots->key->'plant'->'crop', 'times', coalesce(did->'times', '1'::jsonb)));
  end loop;
  mine:=town.remember_garden_misses(mine,row_,'water',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'purse', mine, 'plots', state, 'each', each)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_row(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): each plot with its `damp`, where it has one ──
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
    -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then
      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;
    end if;
    -- ── the older tools (v174): its end ──
  end loop;
  perform town.keep_purse(me, did->'purse');
  if n > 0 then
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_longpour(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  hand text;
  -- what the browser says of its game: which plants the water reached, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  was jsonb;
  v_x integer;
  v_y integer;
  hot boolean := town.hot(now_);
  kind text := town.well_kind(now_);
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  kept jsonb := '{}'::jsonb;
  after jsonb;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  hand := town.hand_of(purse);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.pour_row(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks, coalesce((claims->>'secs')::double precision, 0));
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
  -- the pour, whole: how many plants it watered, and how the browser said its game went
  perform town.note(me, 'longpour', hand, n, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'marks', marks, 'claims', claims));
  -- and each plant watered, its own deed: written down as town_tend writes a watering, so that each is read as one
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    was := plots->(e->>'key')->'plant';
    perform town.note(me, 'water', e->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'row', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
    -- (kept with what my gifts, the heat and the well's water make of the watering, under their bound)
    kept := kept || jsonb_build_object(e->>'key', town.poured_as(plots->(e->>'key'), did->'plots'->(e->>'key'), now_, hot, kind, me::text, (e->>'times')::double precision, wears));
  end loop;
  after := did->'purse';
  if n > 0 then
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, kept, after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      kept := kept || (rang->'plots');
    end if;
    for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
      update public.town_plots p set plant = kept->(e->>'key')->'plant', changed = now_
       where p.x = split_part(e->>'key', ',', 1)::integer and p.y = split_part(e->>'key', ',', 2)::integer;
    end loop;
    perform town.keep_purse(me, after);
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  if n=0 then perform town.keep_purse(me,after);end if;
  -- (the plots as they are kept: with what my gifts, the heat and the well's water made of each watering)
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || case when rang is not null then jsonb_build_object('bell', rang->'bell') else '{}'::jsonb end
    || jsonb_build_object('key', key, 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)),
         'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                     from public.town_plots p where p.bed = bed_n and did->'plots' ? (p.x::text || ',' || p.y::text)));
end;
$function$
;
notify pgrst,'reload schema';commit;