-- v219: one three-room core expedition/day; route-specific costs and finite loot.
-- Run after v218 with the matching site. Rerunnable; no cave resets or automatic inventory changes.
-- Known minerals and an exact worked floor; room choices survive misses and day boundaries.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('53e3cbc7629a28062cb2bbe0d692a390','3b54cbd6a53455fc8c7edb42d3ce09b2') then raise exception 'Reward dispatcher changed: rebuild v219 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCoreSpade":{"kind":"thing","line":"mining","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCoreSpade":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_core(p jsonb,me uuid,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'core';room_ jsonb;challenge_ jsonb;
 f integer;at_ jsonb:=input->'at';seed_ bigint;used_ jsonb;known_ jsonb;chips_ jsonb;route_ text;mineral_ text;game_ text;
 node_ jsonb;expected_ jsonb:='[]'::jsonb;target_ numeric;i integer;won_ boolean:=true;got_ jsonb:='[]'::jsonb;
 cost_ integer;n_ integer;next_ integer;after_ jsonb;completed_ boolean;
begin
 if input->>'action'='coreBegin' then
  if jsonb_typeof(input->'floor') is distinct from 'number' or (input->>'floor')::numeric<>floor((input->>'floor')::numeric) or (input->>'floor')::numeric not between 1 and 30 then return town.no('none');end if;
  f:=(input->>'floor')::integer;
  if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null or coalesce(run_,'null'::jsonb)<>'null'::jsonb or not (
   coalesce(state_->'visited','[]'::jsonb) @> jsonb_build_array(f) or town.mine_of(p)->'rests' @> jsonb_build_array(f)
   or exists(select 1 from public.town_deeds d where d.member_id=me and d.what in ('mine','crystal','vein','hew') and d.n>0 and d.doc->>'floor'=f::text)) then return town.no('none');end if;
  if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingCoreSpade',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'floor',f,'seed',seed_,'began',t,'next',0,'known',town.reward_minerals(p),'room',null);
  after_:=town.reward_visit(used_->'purse',f);
  return jsonb_build_object('ok',true,'core',run_,'left',used_->'left','purse',after_||jsonb_build_object('professionRewards',after_->'professionRewards'||jsonb_build_object('core',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'core' then return town.no('none');end if;
 if input->>'action'='coreCancel' then return jsonb_build_object('ok',true,'core',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',null)));end if;
 if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null then return town.no('none');end if;
 f:=(run_->>'floor')::integer;next_:=(run_->>'next')::integer;known_:=run_->'known';room_:=run_->'room';
 if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
 select coalesce(jsonb_agg(to_jsonb(g.value->>'chip') order by m.ord),'[]'::jsonb) into chips_
  from jsonb_array_elements_text(town.cat('forge')->'elements') with ordinality m(id,ord)
  join lateral (select town.cat('forge')->'gems'->m.id value) g on true where known_ ? (g.value->>'chip');
 if input->>'action'='coreRoom' then
  route_:=input->>'route';
  if route_ is null or route_ not in ('ore','crystal','safe') or route_='ore' and not known_ ? town.mine_ore(f)
   or route_='crystal' and jsonb_array_length(chips_)=0 or coalesce(room_,'null'::jsonb)<>'null'::jsonb and room_->>'route'<>route_ then return town.no('none');end if;
  seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
  if coalesce(room_,'null'::jsonb)='null'::jsonb then
   mineral_:=case route_ when 'ore' then town.mine_ore(f) when 'crystal' then chips_->>((seed_%jsonb_array_length(chips_))::integer) else 'stone' end;
   game_:=case route_ when 'ore' then 'timing' when 'crystal' then 'order' else 'memory' end;
   room_:=jsonb_build_object('route',route_,'mineral',mineral_,'node',jsonb_build_object('at',at_,'seed',seed_,'game',game_),'challenge',null);
  end if;
  challenge_:=room_->'challenge';
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint or room_->'node'->'at' is distinct from at_ then
   challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);
   room_:=jsonb_set(room_,'{node,at}',at_);
  end if;
  room_:=room_||jsonb_build_object('challenge',challenge_);run_:=run_||jsonb_build_object('room',room_);
  return jsonb_build_object('ok',true,'core',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',run_)));
 end if;
 challenge_:=room_->'challenge';node_:=room_->'node';
 if input->>'action'<>'coreEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge'
  or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 if node_->'at' is distinct from at_ then return town.no('far');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;
  expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);
 end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 cost_:=case room_->>'route' when 'crystal' then 4 when 'ore' then 3 else 2 end;n_:=case when room_->>'route'='crystal' then 1 else 2 end;
 if won_ then got_:=jsonb_build_array(jsonb_build_array(room_->>'mineral',n_));end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=won_ and next_=2;
 run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won_ then 1 else 0 end,'room',case when won_ then 'null'::jsonb else room_||jsonb_build_object('challenge',null) end) end;
 return jsonb_build_object('ok',true,'core',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,cost_,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('core',run_)));
end $$;
revoke all on function town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('liftAnchor','liftRide') then
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
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint)','EXECUTE'),'core_ready',town.cat('gifts')->'gifts' ? 'thingCoreSpade') as v219_verified;
