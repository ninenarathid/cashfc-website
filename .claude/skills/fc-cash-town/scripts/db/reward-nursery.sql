create or replace function town.reward_nursery(p jsonb,input jsonb,request uuid,known_ jsonb,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'nursery';at_ jsonb:=input->'at';used_ jsonb;node_ jsonb;challenge_ jsonb;next_ integer;game_ text;part_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;won_ boolean:=true;got_ jsonb:='[]'::jsonb;i integer;kind_ text;item_ text;n_ integer;after_ jsonb;completed_ boolean;allowed_ boolean;
begin
 select coalesce(jsonb_agg(k order by ord),'[]'::jsonb) into known_ from jsonb_array_elements_text('["pine","ironwood","moonwood","elder"]'::jsonb) with ordinality q(k,ord) where known_ ? k or coalesce(state_->'treeKinds','[]'::jsonb) ? k or k='pine' and town.held(p->'bag','pineNut')>0;
 if input->>'action'='nurseryLook' then if not town.gift_works(p,'thingTinyForest') then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('treeKinds',known_)));end if;
 if input->>'action'='nurseryCancel' then
  if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',null)),'nursery',null);
 end if;
 if not town.gift_works(p,'thingTinyForest') or town.axe_of(p) is null then return town.no('none');end if;
 select exists(select 1 from jsonb_array_elements(town.cat('rewards')->'nurseryBoxes') b where (at_->>0)::integer>=(b->>0)::integer and (at_->>1)::integer>=(b->>1)::integer and (at_->>0)::integer<(b->>0)::integer+(b->>2)::integer and (at_->>1)::integer<(b->>1)::integer+(b->>3)::integer) into allowed_;
 if not allowed_ then return town.no('far');end if;
 if input->>'action'='nurseryBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'kinds') is distinct from 'array' or jsonb_array_length(input->'kinds')<>3 or exists(select 1 from jsonb_array_elements(input->'kinds') k where jsonb_typeof(k)<>'string' or not known_ ? (k#>>'{}')) or town.held(p->'bag','pineNut')<3 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item'='pineNut' and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingTinyForest',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'at',at_,'kinds',input->'kinds','seed',seed_,'next',0,'began',t,'part',null,'challenge',null);
  after_:=used_->'purse'||jsonb_build_object('bag',town.take(p->'bag','pineNut',3),'professionRewards',state_||jsonb_build_object('nursery',run_));
  return jsonb_build_object('ok',true,'purse',after_,'nursery',run_,'left',used_->'left');
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
 if greatest(abs((at_->>0)::integer-(run_->'at'->>0)::integer),abs((at_->>1)::integer-(run_->'at'->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='nurseryStage' then
  part_:=input->>'part';if part_ is null or part_ not in ('wood','bark','sap','seed','root') or run_->>'part' is not null and part_<>run_->>'part' then return town.no('none');end if;
  challenge_:=run_->'challenge';if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('part',part_,'challenge',challenge_);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_);
 end if;
 challenge_:=run_->'challenge';part_:=run_->>'part';
 if input->>'action'<>'nurseryEnd' or part_ is null or coalesce(challenge_,'null'::jsonb)='null'::jsonb or input->>'challenge' is distinct from challenge_->>'id' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(run_->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when game_='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 if won_ then
  kind_:=run_->'kinds'->>next_;item_:=case part_ when 'wood' then case when kind_='elder' then 'cedarSliver' else 'heartwood' end when 'sap' then 'pinePitch' when 'bark' then 'pineBark' when 'seed' then 'pineNut' else 'rootFiber' end;n_:=case when kind_='elder' and part_='wood' then 1 else 2 end;
  got_:=jsonb_build_array(jsonb_build_array(item_,n_));
 end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=won_ and next_=2;run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won_ then 1 else 0 end,'part',case when won_ then 'null'::jsonb else run_->'part' end,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end);
end $$;
revoke all on function town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
