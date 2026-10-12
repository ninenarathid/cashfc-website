create or replace function town.reward_bean(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me text,plot_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'bean';a text:=c->>'action';key_ text:=(c->'at'->>0)||','||(c->'at'->>1);used_ jsonb;after_ jsonb;challenge_ jsonb;z bigint;next_ integer;game_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;i integer;pass_ boolean:=true;completed_ boolean;got_ jsonb:='[]'::jsonb;
begin
 if not town.gift_works(p,'thingSkyBean') then return town.no('none');end if;
 if a='beanCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',null)),'bean',null);end if;
 if a='beanBegin' then
  if (r->>'until')::bigint>t or plot_->'plant'->>'by' is distinct from me or plot_->'plant'->>'crop' is distinct from 'longBean' or (plot_->'plant'->>'root' is not null and plot_->'plant'->>'root'<>key_) or (town.see(key_,plot_,t)->>'dead')::boolean or town.held(p->'bag','longBean')<3 or town.held(p->'bag','seedLongBean')<1 or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingSkyBean',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'at',c->'at','seed',seed_,'next',0,'attempts',0,'until',t+1800000,'seedItem',case when coalesce(p->'gardenBook','[]'::jsonb)?'rowBean' then 'seedRowBean' else 'seedLongBean' end,'challenge',null);
  return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',3::double precision,t)||jsonb_build_object('bag',town.take(town.take(p->'bag','longBean',3),'seedLongBean',1),'professionRewards',state_||jsonb_build_object('bean',r)),'bean',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or (r->>'until')::bigint<t or greatest(abs((r->'at'->>0)::integer-(c->'at'->>0)::integer),abs((r->'at'->>1)::integer-(c->'at'->>1)::integer))>2 then return town.no('far');end if;
 challenge_:=r->'challenge';if a='beanStage' then if coalesce(challenge_,'null'::jsonb)='null'::jsonb or (challenge_->>'until')::bigint<t then challenge_:=jsonb_build_object('id',request_,'began',t,'until',least((r->>'until')::bigint,t+90000));end if;r:=r||jsonb_build_object('challenge',challenge_);return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',r)),'bean',r);end if;
 if coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from c->>'challenge' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(r->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];z:=((r->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(c->'answers') is distinct from 'array' or jsonb_array_length(c->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop if jsonb_typeof(c->'answers'->i) is distinct from 'number' or (c->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;if (case when game_='timing' then abs((c->'answers'->>i)::numeric-(expected_->>i)::numeric)>.09 else (c->'answers'->>i)::numeric<>(expected_->>i)::numeric end) then pass_:=false;end if;end loop;
 completed_:=pass_ and next_=2;if completed_ then got_:=jsonb_build_array(jsonb_build_array('longBean',6),jsonb_build_array(r->>'seedItem',1));end if;after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 r:=case when completed_ or (r->>'attempts')::integer+1>=9 then 'null'::jsonb else r||jsonb_build_object('next',next_+case when pass_ then 1 else 0 end,'attempts',(r->>'attempts')::integer+1,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',r)),'bean',r,'got',got_,'completed',completed_,'beanPassed',pass_);
end $$;
revoke all on function town.reward_bean(jsonb,jsonb,uuid,bigint,bigint,text,jsonb) from public,anon,authenticated;
