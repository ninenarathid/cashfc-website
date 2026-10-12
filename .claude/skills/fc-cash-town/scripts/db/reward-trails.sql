create or replace function town.reward_trail(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'trail';kind_ text;gift_ text;sites jsonb;nodes jsonb:='[]'::jsonb;
 x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;seed_ bigint;count_ integer;offset_ integer;step_ integer;i integer;s jsonb;node_ jsonb;challenge_ jsonb;
 expected_ jsonb:='[]'::jsonb;target_ numeric;won boolean:=true;got jsonb:='[]'::jsonb;after_ jsonb;used jsonb;finished boolean:=false;next_ integer;
begin
 if input->>'action'='trailBegin' then
  kind_:=input->>'kind';if kind_ is null or kind_ not in ('forest','star') or coalesce(run_,'null'::jsonb)<>'null'::jsonb then return town.no('none');end if;
  gift_:=case when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
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
 kind_:=run_->>'kind';gift_:=case when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
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
  if kind_='forest' then got:=jsonb_build_array(jsonb_build_array((array['forestLichen','mushroomSpores','wildMedicRoot'])[next_+1],1));elsif next_=2 then got:='[["starShard",1]]'::jsonb;end if;
 end if;
 after_:=town.stow_all(p,got);if after_ is null then return town.no('full');end if;
 finished:=won and next_=2;
 run_:=case when finished then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won then 1 else 0 end,'challenge',null) end;
 return jsonb_build_object('ok',true,'trail',run_,'completed',finished,'got',got,'passed',case when won then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,2,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
end $$;
revoke all on function town.reward_trail(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
