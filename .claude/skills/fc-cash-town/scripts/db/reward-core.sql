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
