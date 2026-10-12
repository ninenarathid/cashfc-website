-- v222: a real empty receiver and conserved owned water, three sends/day.
-- Run after v221 with the matching site. Same-map 40 tiles, six bucketfuls, two stamina.
-- One staged container, one fill before retrieval. Nature and actual carriers survive transport.
-- Rerunnable. Retrieval does not require the familiar; no installation inventory moves.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('1e6064b1c20131a304f301b8470b3298','c9d348f2974fadc46158392beacf85e3') then raise exception 'Reward dispatcher moved: rebuild v222';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famWaterRelay":{"kind":"familiar","line":"well","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famWaterRelay":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 63 then 'town'
 when (at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 43 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;
create or replace function town.reward_relay(p jsonb,input jsonb,t bigint,trace_ jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);relay_ jsonb:=state_->'relay';at_ jsonb:=input->'at';
 slot_ integer;s jsonb;bag_ jsonb:=p->'bag';hand_ text;source_ integer;has_ integer;n_ integer;left_ integer;used_ jsonb;after_ jsonb:=p;moved_ integer;extra_ jsonb:='{}'::jsonb;
begin
 if not town.is_tile(at_) or town.reward_relay_place(at_) is null then return town.no('far');end if;
 if input->>'action'='relayTake' then
  if coalesce(relay_,'null'::jsonb)='null'::jsonb then return town.no('none');end if;
  if greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>1 then return town.no('far');end if;
  if (relay_->>'water')::integer>0 and exists(select 1 from jsonb_array_elements(bag_) b where b->>'item'=relay_->>'item' and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
  select (ord-1)::integer into slot_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b='null'::jsonb order by ord limit 1;
  if slot_ is null then return town.no('full');end if;
  moved_:=(relay_->>'water')::integer;
  bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',relay_->>'item','n',1)||case when moved_>0 then jsonb_build_object('water',moved_) else '{}'::jsonb end);
  relay_:='null'::jsonb;extra_:=jsonb_build_object('moved',moved_);
 else
  if not town.gift_works(p,'famWaterRelay') then return town.no('none');end if;
  if input->>'action'='relayPlace' then
   if coalesce(relay_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'slot') is distinct from 'number' or (input->>'slot')::numeric<>floor((input->>'slot')::numeric) or (input->>'slot')::numeric not between 0 and jsonb_array_length(bag_)-1 then return town.no('none');end if;
   slot_:=(input->>'slot')::integer;s:=bag_->slot_;
   if coalesce(s,'null'::jsonb)='null'::jsonb or not coalesce(town.cat('farming')->'buckets' ? (s->>'item'),false) or s->'n'<>'1'::jsonb or (s-'item'-'n')<>'{}'::jsonb then return town.no('none');end if;
   bag_:=jsonb_set(bag_,array[slot_::text],'null'::jsonb);after_:=town.spend(p,1::double precision,t);
   relay_:=jsonb_build_object('item',s->>'item','at',at_,'water',0);
  elsif input->>'action'='relaySend' then
   if coalesce(relay_,'null'::jsonb)='null'::jsonb or (relay_->>'water')::integer>0 then return town.no('none');end if;
   if town.reward_relay_place(at_) is distinct from town.reward_relay_place(relay_->'at') or greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>40 then return town.no('far');end if;
   hand_:=town.hand_of(p);if hand_ is null or not (town.cat('farming')->'buckets' ? hand_) then return town.no('none');end if;
   select (ord-1)::integer,(b->>'water')::integer into source_,has_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
   if source_ is null then return town.no('none');end if;
   n_:=least(6,(town.cat('farming')->'buckets'->>(relay_->>'item'))::integer,has_);left_:=has_-n_;
   if n_<1 or exists(select 1 from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=relay_->>'item' and case when ord-1=source_ then left_ else coalesce((b->>'water')::integer,0) end>0) then return town.no('none');end if;
   used_:=town.gift_use(p,'famWaterRelay',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   after_:=town.spend(used_->'purse',2::double precision,t);
   bag_:=jsonb_set(bag_,array[source_::text],jsonb_build_object('item',hand_,'n',1)||case when left_>0 then jsonb_build_object('water',left_) else '{}'::jsonb end);
   relay_:=relay_||jsonb_build_object('from',at_,'sentAt',t,'water',n_,'kind',trace_->'kind','hands',coalesce(trace_->'hands','[]'::jsonb));
   extra_:=jsonb_build_object('moved',n_,'left',used_->'left');
  else return town.no('none');end if;
 end if;
 return jsonb_build_object('ok',true,'relay',relay_,'purse',after_||jsonb_build_object('bag',bag_,'professionRewards',state_||jsonb_build_object('relay',relay_)))||extra_;
end $$;
revoke all on function town.reward_relay_place(jsonb),town.reward_relay(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('relayPlace','relaySend','relayTake') then
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
select jsonb_build_object('private',not has_function_privilege('authenticated','town.reward_relay(jsonb,jsonb,bigint,jsonb)','EXECUTE')) as v222_verified;
