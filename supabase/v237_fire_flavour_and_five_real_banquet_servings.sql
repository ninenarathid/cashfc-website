-- v237: playable kitchen ranks eight through ten. Run after v236 with matching site.
-- Optional narrow fire checkpoints, actual extra flavour ingredients, and a three-stage five-serving banquet.
-- Existing recipes, ingredients, cookware, original manual games, meal quotas and shared feast readers remain.
-- Reserved banquet food is forfeited on cancellation/expiry; completed servings preserve dish and pot marks.
-- No new world tables/polling. Secondary effects are level one for thirty minutes; strongest matching buff wins.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9980988523ab92e381671a8e72e657ed','3781fde5409c9220cf513ce1882ddb76') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('public.town_cook(jsonb,uuid[],jsonb)'::regprocedure),chr(13),'')) not in ('7d5cf7fa50f72ff4bd7ee34b776a73a5','1746806d97b7f18f0bf77fd1d50ecb93') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('town.pot_marks(jsonb)'::regprocedure),chr(13),'')) not in ('80e0b8ad4a4443778c326b3111245e13','aef5e95240a23ba6ebb9b8ecbf87d724') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('town.chew(jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('525925cefc0de299d4bbbf41bc8fd352','e245714b14425559da7a2bb3a6f16cdb') then raise exception 'Definition moved: rebuild v237';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmChefFlame":{"kind":"charm","line":"kitchen","rank":8,"by":1},"thingFlavorBook":{"kind":"thing","line":"kitchen","rank":9,"by":1},"thingDragonPot":{"kind":"thing","line":"kitchen","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmChefFlame":{"n":3,"per":"day"},"thingFlavorBook":{"n":3,"per":"day"},"thingDragonPot":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_kitchen(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'kitchen';a text:=c->>'action';kind_ text:=c->>'kind';recipe_ text:=c->>'recipe';ingredient_ text:=c->>'ingredient';used_ jsonb;bag_ jsonb:=p->'bag';foods_ jsonb:='[]'::jsonb;s jsonb;i integer;ix integer;pass_ boolean:=true;mark_ numeric;z bigint;attempts_ integer;after_ jsonb;banquet_ jsonb:='[]'::jsonb;pot_id bigint;
begin
 if a='kitchenCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null)),'kitchen',null);end if;
 if a='flavorTune' then
  if not town.gift_works(p,'thingFlavorBook') or recipe_ is null or coalesce(town.cat('dishes')->recipe_->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?recipe_ or ingredient_ is null or ingredient_ not in ('basil','salt','garlic') or town.held(bag_,ingredient_)<1 or (state_->'flavor'->>'until')::bigint>t then return town.no('none');end if;
  used_:=town.gift_use(p,'thingFlavorBook',t);if used_->'ok'<>'true'::jsonb then return used_;end if;
  return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('bag',town.take(bag_,ingredient_,1),'professionRewards',state_||jsonb_build_object('flavor',jsonb_build_object('recipe',recipe_,'secondary',case ingredient_ when 'basil' then 'green' when 'salt' then 'calm' else 'keen' end,'until',t+1800000))));
 end if;
 if a='kitchenBegin' then
  if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  if kind_='fire' then
   if not town.gift_works(p,'charmChefFlame') or recipe_ is null or coalesce(town.cat('dishes')->recipe_->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?recipe_ or (state_->'fire'->>'until')::bigint>t then return town.no('none');end if;
  elsif kind_='banquet' then
   if not town.gift_works(p,'thingDragonPot') or jsonb_typeof(c->'slots') is distinct from 'array' or jsonb_array_length(c->'slots')<>5 then return town.no('none');end if;
   for i in 0..4 loop
    if jsonb_typeof(c->'slots'->i) is distinct from 'number' or (c->'slots'->>i)::numeric<>floor((c->'slots'->>i)::numeric) or (c->'slots'->>i)::numeric not between 0 and jsonb_array_length(bag_)-1 then return town.no('none');end if;
    ix:=(c->'slots'->>i)::integer;s:=bag_->ix;
    if s->>'item' is distinct from 'potFull' or (s->'of'->>'left')::numeric<1 or coalesce(town.cat('dishes')->(s->'of'->>'dish')->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?(s->'of'->>'dish') then return town.no('none');end if;
    foods_:=foods_||jsonb_build_array(jsonb_set(s,'{of,left}','1'::jsonb));bag_:=jsonb_set(bag_,array[ix::text],case when (s->'of'->>'left')::integer=1 then 'null'::jsonb else jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer-1)) end);
   end loop;
   if (select count(distinct x->'of'->>'dish') from jsonb_array_elements(foods_) x)<3 then return town.no('none');end if;
  else return town.no('none');end if;
  used_:=town.gift_use(p,case when kind_='fire' then 'charmChefFlame' else 'thingDragonPot' end,t);if used_->'ok'<>'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'kind',kind_,'seed',seed_,'at',c->'at','began',t,'until',t+1800000,'stage',0,'attempts',0)||case when kind_='fire' then jsonb_build_object('recipe',recipe_) else jsonb_build_object('foods',foods_) end;
  return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('bag',bag_,'professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 or r->'at' is distinct from c->'at' or not town.gift_works(p,case when r->>'kind'='fire' then 'charmChefFlame' else 'thingDragonPot' end) then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') x where jsonb_typeof(x)<>'number' or (x::text)::numeric not between 0 and 1) then return town.no('none');end if;
 z:=((r->>'seed')::bigint+(r->>'stage')::integer)%4294967296;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.065 then pass_:=false;end if;end loop;
 attempts_:=(r->>'attempts')::integer+1;after_:=town.spend(p,2::double precision,t);
 if not pass_ then r:=case when attempts_>=5 then 'null'::jsonb else r||jsonb_build_object('began',t,'attempts',attempts_) end;return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r,'kitchenPassed',false);end if;
 if r->>'kind'='fire' then return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null,'fire',jsonb_build_object('recipe',r->'recipe','until',t+1800000))),'kitchen',null,'kitchenPassed',true);end if;
 if (r->>'stage')::integer<2 then r:=r||jsonb_build_object('stage',(r->>'stage')::integer+1,'began',t,'attempts',attempts_);return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r,'kitchenPassed',true);end if;
 -- Five reserved servings remain five. Existing feast rows and normal meal quotas handle sharing.
 for s in select value from jsonb_array_elements(r->'foods') loop
  insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values(me,s->'of'->>'dish',1,(town.cat('cooking')->'feast'->'tile'->>0)::integer,(town.cat('cooking')->'feast'->'tile'->>1)::integer,false,t,true,town.pot_marks(s)||jsonb_build_object('warm',greatest(coalesce((s->>'warm')::numeric,0),.5))) returning id into pot_id;
  banquet_:=banquet_||jsonb_build_array(town.pot_doc(pot_id));
 end loop;
 return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null)),'kitchen',null,'banquet',banquet_,'kitchenPassed',true);
end $$;
revoke all on function town.reward_kitchen(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

create or replace function town.reward_kitchen_cooked(p jsonb,d jsonb,misses integer,t bigint,me uuid,id uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);q jsonb:=d->'purse';made_ text:=d->>'made';fire_ boolean;flavor_ boolean;extra_ integer;s jsonb;ix integer;
begin
 if d->'ok' is distinct from 'true'::jsonb or made_ is null or coalesce(town.cat('dishes')->made_->'recipe','null'::jsonb)='null'::jsonb or d->'back'='true'::jsonb then return d;end if;
 fire_:=coalesce(d->'sprite'<>'true'::jsonb,true) and coalesce((state_->'fire'->>'until')::bigint>=t and state_->'fire'->>'recipe'=made_ and town.gift_works(p,'charmChefFlame'),false);
 flavor_:=coalesce(d->'sprite'<>'true'::jsonb,true) and coalesce((state_->'flavor'->>'until')::bigint>=t and state_->'flavor'->>'recipe'=made_ and town.gift_works(p,'thingFlavorBook'),false);extra_:=case when fire_ and misses=0 then 2 else 0 end;
 select (x.ord-1)::integer,x.v into ix,s from jsonb_array_elements(q->'bag') with ordinality x(v,ord) where x.v->>'item'='potFull' and x.v->'of'->>'dish'=made_ and (p->'bag'->(x.ord-1)::integer->>'item') is distinct from 'potFull' order by ord limit 1;
 if ix is null then return d;end if;
 s:=jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer+extra_))||jsonb_build_object('cookedBy',me,'cookId',id)||case when flavor_ then jsonb_build_object('secondary',state_->'flavor'->'secondary') else '{}'::jsonb end;
 q:=jsonb_set(q,'{bag}',jsonb_set(q->'bag',array[ix::text],s));if fire_ or flavor_ then q:=q||jsonb_build_object('professionRewards',coalesce(q->'professionRewards','{}'::jsonb)||case when fire_ then '{"fire":null}'::jsonb else '{}'::jsonb end||case when flavor_ then '{"flavor":null}'::jsonb else '{}'::jsonb end);end if;
 return d||jsonb_build_object('n',(d->>'n')::integer+extra_,'purse',q);
end $$;
revoke all on function town.reward_kitchen_cooked(jsonb,jsonb,integer,bigint,uuid,uuid) from public,anon,authenticated;

create or replace function town.reward_food_finished(p jsonb,e jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare b text:=e->>'secondary';buffs_ jsonb;had_ boolean;
begin
 if b in ('green','calm','keen') and b is distinct from town.cat('dishes')->(e->>'dish')->>'buff' then
  buffs_:=coalesce((select jsonb_agg(x order by ord) from jsonb_array_elements(coalesce(p->'buffs','[]'::jsonb)) with ordinality a(x,ord) where (x->>'until')::bigint>t),'[]'::jsonb);had_:=exists(select 1 from jsonb_array_elements(buffs_) x where x->>'id'=b);
  if had_ then select jsonb_agg(case when x->>'id'=b then x||jsonb_build_object('level',greatest(1,(x->>'level')::integer),'until',greatest((x->>'until')::bigint,t+1800000)) else x end order by ord) into buffs_ from jsonb_array_elements(buffs_) with ordinality a(x,ord);
  else buffs_:=buffs_||jsonb_build_array(jsonb_build_object('id',b,'level',1,'until',t+1800000));end if;p:=p||jsonb_build_object('buffs',buffs_);
 end if;
 if e->>'cookedBy' is not null and e->>'cookId' is not null then p:=p||jsonb_build_object('lastMeal',jsonb_build_object('cookedBy',e->'cookedBy','cookId',e->'cookId','at',t));end if;return p;
end $$;
revoke all on function town.reward_food_finished(jsonb,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
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
CREATE OR REPLACE FUNCTION public.town_cook(p_things jsonb, p_crew uuid[] DEFAULT '{}'::uuid[], p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  how jsonb := jsonb_build_object('sprite', coalesce(town.claims(p_timing)->'sprite' = 'true'::jsonb, false), 'flame', coalesce(town.claims(p_timing)->'flame' = 'true'::jsonb, false));
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook_with(purse, p_things, crew, misses, now_, how);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  did:=town.reward_kitchen_cooked(purse,did,misses,now_,me,gen_random_uuid());
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims) || case when did->'sprite' = 'true'::jsonb then '{"sprite": true}'::jsonb when did->'back' = 'true'::jsonb then '{"back": true}'::jsonb else '{}'::jsonb end);
  if did->'sprite' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'famSprite', 1, 0, jsonb_build_object('made', made, 'n', did->'n',
      'left', (town.cat('gifts')->'uses'->'famSprite'->>'n')::integer - town.used_of(after, 'famSprite', now_)));
  end if;
  if did->'back' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'thingFlame', 1, 0, jsonb_build_object('things', town.tidy(p_things), 'taste', did->'taste',
      'left', (town.cat('gifts')->'uses'->'thingFlame'->>'n')::integer - town.used_of(after, 'thingFlame', now_)));
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$function$
;
create or replace function town.pot_marks(p_from jsonb) returns jsonb language sql immutable set search_path='' as $marks$
 select case when jsonb_typeof(p_from->'warm')='number' and (p_from->>'warm')::numeric>0 then jsonb_build_object('warm',p_from->'warm') else '{}'::jsonb end
 ||case when jsonb_typeof(p_from->'scent')='number' and (p_from->>'scent')::numeric>0 then jsonb_build_object('scent',p_from->'scent') else '{}'::jsonb end
 ||case when p_from->>'secondary' in ('green','calm','keen') then jsonb_build_object('secondary',p_from->'secondary') else '{}'::jsonb end
 ||case when p_from->>'cookedBy' is not null and p_from->>'cookId' is not null then jsonb_build_object('cookedBy',p_from->'cookedBy','cookId',p_from->'cookId') else '{}'::jsonb end
 $marks$;
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
  if done then after:=town.reward_food_finished(after,e,p_now);end if;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$function$
;
notify pgrst,'reload schema';commit;