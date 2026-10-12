create or replace function town.reward_vein_key(v jsonb)
returns text language sql immutable set search_path='' as $$select concat_ws(':',v->>'f',v->>'rock',v->>'turn',v->>'seed')$$;
create or replace function town.reward_vein_site(after_ jsonb,before_ jsonb,v jsonb,at_ jsonb,day_ integer)
returns jsonb language sql stable set search_path='' as $$
 select case when town.gift_works(before_,'charmBranchVein') then after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('veinSite',jsonb_build_object('key',town.reward_vein_key(v),'floor',v->'f','at',at_,'day',day_))) else after_ end
$$;
create or replace function town.reward_branch_source(after_ jsonb,before_ jsonb,v jsonb,ore_ integer,gems_ integer,choice_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ jsonb:=before_->'professionRewards'->'veinSite';b jsonb;
begin
 if not town.gift_works(before_,'charmBranchVein') or site_ is null or site_->>'key' is distinct from town.reward_vein_key(v) or (site_->>'day')::integer<>town.day_of(t)
  or choice_ is null or (choice_->>'echo')::integer<>(case when abs((v->>'seed')::numeric)%2=1 then 1 else -1 end) or ore_+gems_<=0 or before_->'professionRewards'->'resource'->>'kind'='branch' then return after_;end if;
 b:=site_||jsonb_build_object('seed',mod(abs(trunc((v->>'seed')::numeric)),4294967296),'ore',case when ore_>0 then town.mine_ore((v->>'f')::integer) end,
  'crystal',case when gems_>0 and v->'gem'<>'null'::jsonb then town.cat('forge')->'gems'->(v->>'gem')->>'chip' end,'until',t+180000);
 return after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('branch',b));
end $$;
create or replace function town.reward_branch_resource(p jsonb,request uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=p->'professionRewards'->'branch';run_ jsonb:=p->'professionRewards'->'resource';kind_ text:=input->>'action';recipe_ text;item_ text;at_ jsonb:=input->'at';
 seed_ bigint;node_ jsonb;g jsonb;used jsonb;after_ jsonb;got_ jsonb;answers_ jsonb;expected_ jsonb;won_ boolean;ord_ integer;value_ numeric;
begin
 if not town.gift_works(p,'charmBranchVein') then return town.no('none');end if;
 if kind_='resourceCancel' then
  if run_ is null or run_->>'kind'<>'branch' or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',p->'professionRewards'||jsonb_build_object('resource',null)));
 end if;
 recipe_:=case when kind_='resourceBegin' then input->>'recipe' else run_->>'recipe' end;
 item_:=s->>recipe_;
 if s is null or recipe_ is null or recipe_ not in ('ore','crystal') or item_ is null then return town.no('none');end if;
 if kind_='resourceBegin' and coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 if kind_='resourceEnd' then
  if run_ is null or run_->>'id' is distinct from input->>'run' or run_->>'kind'<>'branch' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
  if at_ is distinct from run_->'at' then return town.no('far');end if;
 end if;
 if (s->>'day')::integer<>town.day_of(t) or t>(s->>'until')::bigint or town.cave_floor_at((at_->>0)::integer,(at_->>1)::integer)<>(s->>'floor')::integer
  or not town.cave_floor_tile(town.cave_laid(town.day_of(t),(s->>'floor')::integer),(s->>'floor')::integer,(at_->>0)::integer,(at_->>1)::integer)
  or greatest(abs((at_->>0)::integer-(s->'at'->>0)::integer),abs((at_->>1)::integer-(s->'at'->>1)::integer))>3 then return town.no('far');end if;
 if kind_='resourceBegin' then
  if town.used_of(p,'charmBranchVein',t)>=3 then return town.no('spent');end if;
  if town.stow_all(p,jsonb_build_array(jsonb_build_array(item_,case when recipe_='ore' then 4 else 3 end))) is null then return town.no('full');end if;
  node_:=jsonb_build_object('at',at_,'game','timing','seed',s->'seed');
  run_:=jsonb_build_object('id',request,'kind','branch','recipe',recipe_,'at',at_,'node',node_,'began',t,'until',least(t+90000,(s->>'until')::bigint),'loadout',town.combo_loadout(p),'source',s->'key');
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',p->'professionRewards'||jsonb_build_object('resource',run_)));
 end if;
 if kind_<>'resourceEnd' or run_->>'source' is distinct from s->>'key' then return town.no('none');end if;
 answers_:=input->'answers';
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(answers_) a where jsonb_typeof(a)<>'number' or (a::text)::numeric not between 0 and 1) then return town.no('none');end if;
 seed_:=(run_->'node'->>'seed')::bigint;won_:=true;
 for ord_ in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;value_:=0.2+(seed_%61)::numeric/100;if abs((answers_->>ord_)::numeric-value_)>.09 then won_:=false;end if;end loop;
 got_:=case when won_ then jsonb_build_array(jsonb_build_array(item_,case when recipe_='ore' then 4 else 3 end)) else '[]'::jsonb end;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,'charmBranchVein',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'got',got_,'passed',case when won_ then 3 else 0 end,'left',used->'left','resource',null,'purse',town.spend(used->'purse',3::double precision,t)||jsonb_build_object('professionRewards',used->'purse'->'professionRewards'||jsonb_build_object('resource',null,'branch',null)));
end $$;
revoke all on function town.reward_vein_key(jsonb),town.reward_vein_site(jsonb,jsonb,jsonb,jsonb,integer),town.reward_branch_source(jsonb,jsonb,jsonb,integer,integer,jsonb,bigint),town.reward_branch_resource(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;
