-- v225: ten-minute local clouds for up to three consenting beds, one real special bucketful.
-- Run after v224 with the matching site. One finished rhythm attempt/day, six stamina, even on a miss.
-- Consent lasts ten minutes and can be revoked. Rechecked after locking the actual beds.
-- Existing roots only, each root once/day. Water nature applies once; no world weather, XP, or rain-trigger writes.
-- Elapsed local rain excludes natural rain and moist soil. Plant identity and shared bed locks prevent duplicate effects.
-- Rerunnable. Installation moves no player resources.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('bb82fefc0d5d273bafd8236115563a48','dc71f24d65076fc87c5db81b2595c426') then raise exception 'Definition moved: public.town_reward(uuid,jsonb); rebuild v225';end if;
if md5(replace(pg_get_functiondef('town.grown(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('34553dd788a9219297362f5bcc17ce58','9261b1bd28ced1d5a8842f540a1aebcf') then raise exception 'Definition moved: town.grown(jsonb,bigint); rebuild v225';end if;
if md5(replace(pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('dae24c962734ed800c31020602ed32ff','754846f0f9e59b321e66b1495eec8d78') then raise exception 'Definition moved: town.see(text,jsonb,bigint); rebuild v225';end if; end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCloudJar":{"kind":"thing","line":"well","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCloudJar":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('cloudCorners','[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]]'::jsonb) where key='rewards';
create table if not exists town.reward_cloud_consents(bed integer primary key check(bed between 0 and 23),doc jsonb not null);
alter table town.reward_cloud_consents enable row level security;
revoke all on town.reward_cloud_consents from public,anon,authenticated;
create or replace function town.local_rain_ms(p jsonb,t bigint)
returns bigint language sql stable set search_path='' as $$
 select case when coalesce(p->'moist'='true'::jsonb,false) or p->'localRain' is null then 0 else greatest(0,b-a-town.wet_ms(a,b)) end
 from (select greatest((p->>'sown')::bigint,(p->'localRain'->>'from')::bigint) a,least(t,(p->'localRain'->>'until')::bigint) b) q
$$;
create or replace function town.reward_cloud_permitted(bed_ integer,me uuid,owners_ jsonb,consents_ jsonb,t bigint)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(owners_->>bed_::text=me::text or (owners_->>bed_::text=consents_->bed_::text->>'by' and consents_->bed_::text->>'giver'=me::text and (consents_->bed_::text->>'until')::bigint>t),false)
$$;
create or replace function town.reward_cloud(p jsonb,input jsonb,request uuid,me uuid,plots_ jsonb,owners_ jsonb,consents_ jsonb,kind_ text,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'cloud';bed_ integer:=town.bed_of((input->'at'->>0)::integer,(input->'at'->>1)::integer);
 hand_ text;slot_ integer;water_ integer;n integer;r jsonb;q jsonb;s jsonb;roots_ jsonb:='[]'::jsonb;out_ jsonb:='{}'::jsonb;consent_ jsonb;used_ jsonb;after_ jsonb;i integer;passed_ integer:=0;target_ numeric;day_ integer:=town.day_of(t);corner_ jsonb;base_ numeric:=(town.cat('farming')->'water'->>'adds')::numeric*60000;
begin
 if input->>'action'='cloudConsent' then
  if bed_<0 then return town.no('far');end if;
  if owners_->>bed_::text is distinct from me::text then return town.no('theirs');end if;
  if input->'giver' is distinct from 'null'::jsonb and (jsonb_typeof(input->'giver') is distinct from 'string' or input->>'giver'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then return town.no('none');end if;
  consent_:=case when input->'giver'='null'::jsonb then null else jsonb_build_object('by',me,'giver',input->>'giver','until',t+600000) end;
  return jsonb_build_object('ok',true,'purse',p,'consented',consent_ is not null,'consent',consent_);
 end if;
 if input->>'action'='cloudCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('cloud',null)),'cloud',null);end if;
 if not town.gift_works(p,'thingCloudJar') or kind_ is null or kind_ not in ('dawn','rain','moon') then return town.no('none');end if;
 hand_:=town.hand_of(p);if hand_ is null or not town.cat('farming')->'buckets' ? hand_ then return town.no('none');end if;
 select (ord-1)::integer,(b->>'water')::integer into slot_,water_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
 if slot_ is null then return town.no('none');end if;
 if input->>'action'='cloudBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and (run_->>'until')::bigint>=t then return town.no('none');end if;
  if bed_<0 or jsonb_typeof(input->'beds') is distinct from 'array' or jsonb_array_length(input->'beds') not between 1 and 3 then return town.no('far');end if;
  if exists(select 1 from jsonb_array_elements(input->'beds') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) or (select count(distinct v) from jsonb_array_elements(input->'beds') v)<>jsonb_array_length(input->'beds') then return town.no('far');end if;
  for n in select value::text::integer from jsonb_array_elements(input->'beds') loop
   if not town.reward_cloud_permitted(n,me,owners_,consents_,t) then return town.no('theirs');end if;
   corner_:=town.cat('rewards')->'cloudCorners'->n;
   if greatest(abs((corner_->>0)::integer+4-(input->'at'->>0)::integer),abs((corner_->>1)::integer+4-(input->'at'->>1)::integer))>20 then return town.no('far');end if;
  end loop;
  for r in select jsonb_build_object('key',e.key,'plot',e.value) from jsonb_each(plots_) e order by e.key loop
   q:=r->'plot'->'plant';s:=town.see(r->>'key',r->'plot',t);
   if input->'beds' @> to_jsonb(town.bed_of(split_part(r->>'key',',',1)::integer,split_part(r->>'key',',',2)::integer)) and coalesce(q,'null'::jsonb)<>'null'::jsonb and (q->>'root' is null or q->>'root'=r->>'key') and s->'dead'='false'::jsonb and s->'wet'='false'::jsonb and s->'ripe'='false'::jsonb and coalesce((q->'localRain'->>'day')::integer,-1)<>day_ then roots_:=roots_||jsonb_build_array(jsonb_build_object('key',r->>'key','identity',town.reward_root_identity(r->>'key',r->'plot')));end if;
  end loop;
  if jsonb_array_length(roots_) not between 1 and 192 then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'at',input->'at','beds',input->'beds','roots',roots_,'seed',seed_,'kind',kind_,'began',t,'until',t+90000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('cloud',run_)),'cloud',run_);
 end if;
 if input->>'action'<>'cloudEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint or jsonb_typeof(input->'marks') is distinct from 'array' or jsonb_array_length(input->'marks')<>3 or kind_<>run_->>'kind' then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(input->'marks') v where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 for n in select value::text::integer from jsonb_array_elements(run_->'beds') loop if not town.reward_cloud_permitted(n,me,owners_,consents_,t) then return town.no('theirs');end if;end loop;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;if abs(target_-(input->'marks'->>i)::numeric)<=0.09 then passed_:=passed_+1;end if;end loop;
 if passed_=3 then
  for r in select value from jsonb_array_elements(run_->'roots') loop
   q:=plots_->(r->>'key')->'plant';s:=town.see(r->>'key',plots_->(r->>'key'),t);
   if town.reward_root_identity(r->>'key',plots_->(r->>'key')) is distinct from r->>'identity' or q is null or coalesce((q->'localRain'->>'day')::integer,-1)=day_ or s->'dead'='true'::jsonb then continue;end if;
   q:=q||jsonb_build_object('boost',(q->>'boost')::numeric+town.local_rain_ms(q,t)*(town.cat('farming')->'water'->>'adds')::numeric/(town.cat('farming')->'water'->>'every')::numeric+base_*coalesce((town.cat('waters')->'adds'->>kind_)::numeric,0),'guard',greatest((q->>'guard')::bigint,t+coalesce((town.cat('waters')->'guards'->>kind_)::bigint,0)*3600000),'localRain',jsonb_build_object('id',run_->>'id','by',me,'from',t,'until',t+600000,'day',day_));
   out_:=out_||jsonb_build_object(r->>'key',plots_->(r->>'key')||jsonb_build_object('plant',q));
  end loop;
  if out_='{}'::jsonb then return town.no('none');end if;
 end if;
 used_:=town.gift_use(p,'thingCloudJar',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 after_:=town.spend(used_->'purse',6::double precision,t)||jsonb_build_object('bag',jsonb_set(p->'bag',array[slot_::text],jsonb_build_object('item',hand_,'n',1)||case when water_>1 then jsonb_build_object('water',water_-1) else '{}'::jsonb end),'professionRewards',state_||jsonb_build_object('cloud',null));
 return jsonb_build_object('ok',true,'purse',after_,'cloud',null,'plots',out_,'watered',(select coalesce(jsonb_agg(k order by k),'[]'::jsonb) from jsonb_object_keys(out_) k),'used',1,'passed',passed_,'left',used_->'left');
end $$;
revoke all on function town.local_rain_ms(jsonb,bigint),town.reward_cloud_permitted(integer,uuid,jsonb,jsonb,bigint),town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.grown(p_plant jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + (case when p_plant->'moist' = 'true'::jsonb then greatest(0, p_now - p.sown)::double precision else (town.wet_ms(p.sown, p_now)+town.local_rain_ms(p_plant,p_now))::double precision end) * (w.f->>'adds')::double precision / (w.f->>'every')::double precision
      + town.quick_ms(p_plant, p.sown, p_now)) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$function$
;
CREATE OR REPLACE FUNCTION town.see(p_key text, p_plot jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  ends bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  -- (the moment it dies of its pest: so long after it struck, not counting the time fae dust lay on it)
  ends := town.dies_at(p, struck, kills);
  dead := struck is not null and p_now > ends;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then ends else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', coalesce(p->'moist' = 'true'::jsonb, false) or p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now) or coalesce((p->'localRain'->>'from')::bigint<=p_now and p_now<(p->'localRain'->>'until')::bigint,false));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_cloud_consents','SELECT'),'bounded',(select count(*)<=24 from town.reward_cloud_consents)) as v225_verified;
