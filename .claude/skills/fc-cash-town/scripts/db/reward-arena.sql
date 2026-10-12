create or replace function town.reward_arena(p jsonb,input jsonb,request uuid,t bigint,known_ jsonb,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare a text:=input->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'arena';beetles_ jsonb:=town.cat('rewards')->'ringBeetles';seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);bug_ text:=input->>'bug';round_ integer;attack_ integer;mark_ numeric;score_ integer:=0;answer_ jsonb;book_ jsonb;
begin
 if not town.gift_works(p,'thingBeetleRing') then return town.no('none');end if;
 if a='arenaLook' then return jsonb_build_object('ok',true,'purse',p,'knownBeetles',coalesce((select jsonb_agg(b order by ord) from jsonb_array_elements(beetles_) with ordinality v(b,ord) where known_ ? (b#>>'{}') and town.held(p->'bag',b#>>'{}')>0),'[]'::jsonb));end if;
 if a='arenaCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null)),'arena',null);end if;
 if a='arenaBegin' then
  if (run_->>'until')::bigint>t or bug_ is null or not beetles_ ? bug_ or not known_ ? bug_ or town.held(p->'bag',bug_)<1 or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'bug',bug_,'opponent',beetles_->(seed_%jsonb_array_length(beetles_))::integer,'seed',seed_,'at',input->'at','began',t,'until',t+120000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',run_)),'arena',run_);
 end if;
 if a<>'arenaEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t>(run_->>'until')::bigint or t<(run_->>'began')::bigint+6000 or town.held(p->'bag',run_->>'bug')<1 then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 seed_:=(run_->>'seed')::bigint;
 for round_ in 0..2 loop
  answer_:=input->'answers'->round_;
  if jsonb_typeof(answer_->'stance') is distinct from 'number' or (answer_->>'stance')::numeric<>floor((answer_->>'stance')::numeric) or (answer_->>'stance')::numeric not between 0 and 2 or jsonb_typeof(answer_->'mark') is distinct from 'number' or (answer_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;mark_:=.2+(seed_%61)::numeric/100;attack_:=mod(round(mark_*100),3)::integer;
  if (answer_->>'stance')::integer=(attack_+1)%3 and abs((answer_->>'mark')::numeric-mark_)<=.1 then score_:=score_+1;end if;
 end loop;
 book_:=coalesce(state_->'arenaBook','{}'::jsonb)||jsonb_build_object(run_->>'bug',greatest(coalesce((state_->'arenaBook'->>(run_->>'bug'))::integer,0),score_));
 return jsonb_build_object('ok',true,'purse',town.spend(p,1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null,'arenaBook',book_)),'arena',null,'arenaScore',score_);
end $$;
revoke all on function town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint) from public,anon,authenticated;
