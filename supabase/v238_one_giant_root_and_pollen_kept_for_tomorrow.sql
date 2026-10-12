-- v238: farming ranks seven through nine. Run after v237 with matching site.
-- Four ordinary seeds reserve one 2x2 giant root, real growth, six base yields, blade/twine once, no mandrake repeat.
-- Choose an actual known ripe neighbouring cross; or spend a ripe source's crossing right to keep pollen.
-- Seven sources/day, three samples, twenty-four hours, one-use known adjacent same-bed pairing and original seed cap.
-- Existing plot rows, root/satellite triggers and farming readers; no new tables or polling.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('3781fde5409c9220cf513ce1882ddb76','a88f1ea062ab9d6166a19919ac396bec') then raise exception 'Definition moved: rebuild v238';end if;
if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint)'::regprocedure),chr(13),'')) not in ('123e3b961add321438dfd53dcc05d1f4','9d43fb6a887d6e5dd19a87a85ff7274e') then raise exception 'Definition moved: rebuild v238';end if;
if md5(replace(pg_get_functiondef('town.garden_cross(text,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('dcedbc70568fc8a33ae1cac213528090','b994e1bdc7657b7e7fcdc03bb1c34251') then raise exception 'Definition moved: rebuild v238';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingGiantSeeds":{"kind":"thing","line":"farming","rank":7,"by":1},"thingCrossBrush":{"kind":"thing","line":"farming","rank":8,"by":1},"thingPollenSeal":{"kind":"thing","line":"farming","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingGiantSeeds":{"n":1,"per":"day"},"thingCrossBrush":{"n":3,"per":"day"},"thingPollenSeal":{"n":7,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;root_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'giant';samples_ jsonb;sample_ jsonb;cells_ jsonb;crop_ text:=c->>'crop';child_ text:=c->>'child';seed_item text;used_ jsonb;after_ jsonb;updated_ jsonb:='{}'::jsonb;cell_ text;plant_ jsonb;z bigint;mark_ numeric;pass_ boolean:=true;i integer;owner_ text;keeping_ jsonb;n_ integer;item_ text;identity_ text;pair_ jsonb;adjacent_ boolean;
begin
 if a='giantCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null)),'giant',null);end if;
 if bed_<0 then return town.no('far');end if;
 -- Match ordinary tend/row: purse first, then one bed. No second member's purse is touched.
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;root_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 owner_:=town.owner_of(keeping_,exists(select 1 from public.town_plots q where q.bed=bed_ and q.plant is not null),t);
 select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) into samples_ from jsonb_array_elements(coalesce(state_->'pollen','[]'::jsonb)) with ordinality q(s,ord) where (s->>'until')::bigint>t;
 if a in ('giantBegin','giantEnd') then
  cells_:=jsonb_build_array(key_,(x_+1)::text||','||y_::text,x_::text||','||(y_+1)::text,(x_+1)::text||','||(y_+1)::text);
  if a='giantEnd' then crop_:=r->>'crop';end if;seed_item:=town.cat('crops')->crop_->>'seed';
  if not town.gift_works(p,'thingGiantSeeds') or owner_ is distinct from me::text or crop_ is null or crop_ not in ('pumpkin','cabbage','carrot','daikon','taro') or town.held(p->'bag',seed_item)<4 or exists(select 1 from jsonb_array_elements_text(cells_) q(k) where town.bed_of(split_part(k,',',1)::integer,split_part(k,',',2)::integer)<>bed_ or plots_->k->>'soil' is distinct from 'tilled' or coalesce(plots_->k->'plant','null'::jsonb)<>'null'::jsonb) then return town.no('none');end if;
  if a='giantBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'thingGiantSeeds',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   r:=jsonb_build_object('id',request_,'key',key_,'crop',crop_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',r)),'giant',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
  after_:=town.spend(p,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'giant',null,'gardenPassed',false);end if;
  plant_:=jsonb_build_object('by',me,'crop',crop_,'sown',t,'boost',0,'watered',case when plot_->'damp'='true'::jsonb then t else 0 end,'fed',0,'guard',0,'cured',0,'picked',0,'pickedAt',0,'root',key_,'footprint',cells_,'giant',true)||case when plot_->'damp'='true'::jsonb then '{"moist":true}'::jsonb else '{}'::jsonb end;
  for cell_ in select jsonb_array_elements_text(cells_) loop updated_:=updated_||jsonb_build_object(cell_,jsonb_build_object('soil','tilled','plant',plant_));end loop;
  after_:=after_||jsonb_build_object('bag',town.take(after_->'bag',seed_item,4));
 else
  if root_ is null or root_='null'::jsonb or root_->>'by' is distinct from me::text or (root_->>'root' is not null and root_->>'root'<>key_) or coalesce((root_->>'crossed')::boolean,false) or not (town.see(key_,plot_,t)->>'ripe')::boolean then return town.no('none');end if;
  if a='gardenBrush' then
   if not town.gift_works(p,'thingCrossBrush') or child_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or root_->>'crossChoice' is not null or town.garden_cross(key_,plots_||jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_))),me::text,t) is distinct from child_ then return town.no('none');end if;
   used_:=town.gift_use(p,'thingCrossBrush',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=used_->'purse';updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_)));
  elsif a='pollenCollect' then
   if not town.gift_works(p,'thingPollenSeal') or jsonb_array_length(samples_)>=3 then return town.no('none');end if;used_:=town.gift_use(p,'thingPollenSeal',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   identity_:=key_||':'||(root_->>'by')||':'||(root_->>'crop')||':'||(root_->>'sown');sample_:=jsonb_build_object('id',request_,'key',key_,'crop',root_->'crop','cells',coalesce(root_->'footprint',jsonb_build_array(key_)),'bed',bed_,'identity',identity_,'until',t+86400000);
   after_:=used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('pollen',samples_||jsonb_build_array(sample_)));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  elsif a='pollenApply' then
   select s into sample_ from jsonb_array_elements(samples_) q(s) where s->>'id'=c->>'sample';
   select v into pair_ from jsonb_array_elements(town.cat('gardening')->'crosses') q(v) where v->>2=child_ and (v->>0=root_->>'crop' and v->>1=sample_->>'crop' or v->>1=root_->>'crop' and v->>0=sample_->>'crop') limit 1;
   select exists(select 1 from jsonb_array_elements_text(sample_->'cells') a(k) cross join jsonb_array_elements_text(coalesce(root_->'footprint',jsonb_build_array(key_))) b(k) where greatest(abs(split_part(a.k,',',1)::integer-split_part(b.k,',',1)::integer),abs(split_part(a.k,',',2)::integer-split_part(b.k,',',2)::integer))=1) into adjacent_;
   if not town.gift_works(p,'thingPollenSeal') or sample_ is null or pair_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or (sample_->>'bed')::integer<>bed_ or not adjacent_ or exists(select 1 from jsonb_array_elements_text(sample_->'cells') q(k) where coalesce(root_->'footprint',jsonb_build_array(key_))?k) then return town.no('none');end if;
   n_:=case when town.held(town.carried_bag(p),'graftKnife')>0 or root_->'insectCrossRound'=root_->'picked' then 2 else 1 end;item_:=town.cat('crops')->child_->>'seed';if town.room(p->'bag',item_)<n_ then return town.no('full');end if;
   after_:=p||jsonb_build_object('bag',town.put(p->'bag',item_,n_),'professionRewards',state_||jsonb_build_object('pollen',(select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) from jsonb_array_elements(samples_) with ordinality q(s,ord) where s->>'id'<>sample_->>'id')));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  else return town.no('none');end if;
 end if;
 for cell_ in select jsonb_object_keys(updated_) loop insert into public.town_plots(x,y,bed,soil,plant,changed) values(split_part(cell_,',',1)::integer,split_part(cell_,',',2)::integer,bed_,updated_->cell_->>'soil',updated_->cell_->'plant',t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;end loop;
 if a='giantEnd' then update public.town_beds b set tended=t,empty=0 where b.bed=bed_ and b.member_id=me;end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',updated_)||case when a='giantEnd' then jsonb_build_object('giant',null,'gardenPassed',true) when a='pollenApply' then jsonb_build_object('got',jsonb_build_array(jsonb_build_array(item_,n_))) else '{}'::jsonb end;
end $$;
revoke all on function town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
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
CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
begin
  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if p->'giant'='true'::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if coalesce(p->'giant','false'::jsonb)<>'true'::jsonb and last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(mine->'bag', p->>'crop', n))),p_now);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.garden_cross(p_key text, p_plots jsonb, p_me text, p_now bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; c jsonb; other text; q record; mine text; theirs text; x integer; y integer; u integer; v integer;
begin
 if p is null or p='null'::jsonb or p->>'by' is distinct from p_me or coalesce((p->>'crossed')::boolean,false) or not (town.see(p_key,p_plots->p_key,p_now)->>'ripe')::boolean then return null; end if;
 for c in select e.v from jsonb_array_elements(town.cat('gardening')->'crosses') with ordinality e(v,ord) order by ord loop
  continue when p->>'crossChoice' is not null and p->>'crossChoice'<>c->>2;
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when not (town.see(q.key,q.value,p_now)->>'ripe')::boolean;
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then return c->>2; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 return null;
end $function$
;
notify pgrst,'reload schema';commit;