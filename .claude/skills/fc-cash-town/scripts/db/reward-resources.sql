create or replace function town.reward_resource_recipe(kind_ text,key_ text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];parts text[];
begin
 if kind_='hive' and key_ in ('honey','wax') then return jsonb_build_object('needs','[["fragrantPetal",5]]'::jsonb,'got',jsonb_build_array(jsonb_build_array(case when key_='honey' then 'gardenHoney' else 'beeswax' end,2)));end if;
 if kind_='repair' and key_=any(chips) then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(key_,10),jsonb_build_array('quartzCore',2),jsonb_build_array('rootTwine',1)),'got','[["wholeGeode",1]]'::jsonb);end if;
 if kind_='color' then
  parts:=string_to_array(key_,':');
  if array_length(parts,1)=3 and parts[1]=any(gems) and parts[2]=any(gems) and parts[3]=any(gems) and parts[1]<>parts[2] then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(parts[1],1),jsonb_build_array(parts[2],1),jsonb_build_array('sparkPowder',1)),'got',jsonb_build_array(jsonb_build_array(parts[3],1)));end if;
 end if;
 return null;
end $$;
create or replace function town.reward_resource(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'resource';kind_ text;gift_ text;r jsonb;need jsonb;bag jsonb:=p->'bag';after_ jsonb;used jsonb;seed_ bigint;node_ jsonb;expected_ numeric;answers_ jsonb:=input->'answers';won boolean:=true;got jsonb;at_ jsonb:=input->'at';i integer;target_ text;chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];
begin
 if input->>'action'='resourceBegin' then
  kind_:=input->>'kind';r:=town.reward_resource_recipe(kind_,input->>'recipe');
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 else
  if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  kind_:=run_->>'kind';r:=town.reward_resource_recipe(kind_,run_->>'recipe');
 end if;
 gift_:=case kind_ when 'hive' then 'thingTreeHive' when 'repair' then 'thingCrystalRepair' when 'color' then 'charmGemColor' end;
 if gift_ is null or not town.gift_works(p,gift_) or r is null then return town.no('none');end if;
 if input->>'action'='resourceCancel' then return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',null)));end if;
 if kind_='hive' then
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') s where greatest(abs((s->>1)::numeric-(at_->>0)::numeric),abs((s->>2)::numeric-(at_->>1)::numeric))<=8) then return town.no('far');end if;
 elsif not coalesce(sqrt(power((at_->>0)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>0)::numeric,2)+power((at_->>1)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>1)::numeric,2))<=(town.cat('forge')->'stand'->>'reach')::numeric,false) then return town.no('far');end if;
 for need in select value from jsonb_array_elements(r->'needs') loop
  if town.held(bag,need->>0)<(need->>1)::integer or exists(select 1 from jsonb_array_elements(bag) s where s->>'item'=need->>0 and case when jsonb_typeof(s)='object' then (s-'item'-'n')<>'{}'::jsonb else false end) then return town.no('none');end if;
 end loop;
 if input->>'action'='resourceBegin' then
  if kind_='color' then target_:=r->'got'->0->>0;if town.held(bag,target_)<1 and not (town.reward_minerals(p) ? chips[array_position(gems,target_)]) then return town.no('none');end if;end if;
  if town.used_of(p,gift_,t)>=(town.cat('gifts')->'uses'->gift_->>'n')::integer then return town.no('spent');end if;
  for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
  if town.stow_all(p||jsonb_build_object('bag',bag),r->'got') is null then return town.no('full');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  node_:=jsonb_build_object('at',at_,'game',case when kind_='repair' then 'timing' else 'order' end,'seed',seed_);
  run_:=jsonb_build_object('id',request,'kind',kind_,'recipe',input->>'recipe','at',at_,'node',node_,'began',t,'until',t+90000,'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',run_)));
 end if;
 if input->>'action'<>'resourceEnd' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if run_->'at' is distinct from at_ then return town.no('far');end if;
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 node_:=run_->'node';seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  if jsonb_typeof(answers_->i)<>'number' or (answers_->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=0.2+(seed_%61)::numeric/100;
  if (case when node_->>'game'='timing' then abs(expected_-(answers_->>i)::numeric)>0.09 else mod(floor(expected_*100),3)<>(answers_->>i)::numeric end) then won:=false;end if;
 end loop;
 if won then for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;end if;
 got:=case when won then r->'got' else '[]'::jsonb end;after_:=town.stow_all(p||jsonb_build_object('bag',bag),got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'resource',null,'got',got,'passed',case when won then 3 else 0 end,'left',used->'left','purse',town.spend(used->'purse',3,t)||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',null)));
end $$;
revoke all on function town.reward_resource_recipe(text,text),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
