-- v214: correctly read and paid main veins expose one bounded optional branch.
-- Run after v213 with the matching site. Rerunnable; no automatic claims or new shared spawns.
-- Charm must be worn at opening/result; three attempts/day, three extra stamina, one mineral choice.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('64fb11604bf41464dd639f9f860ca5d0','37d8276bae0466bbe7f4e16f777e1a4e') then raise exception 'Action changed: rebuild v214 on current text';end if;
 if md5(replace(pg_get_functiondef('town.vein_end(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('14ca7f971e623c71060a699a5365994a','dec5e67fb43a3f9e5ec7718b90ad689a') then raise exception 'Action changed: rebuild v214 on current text';end if;
 if md5(replace(pg_get_functiondef('town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('306b74c996661c46a2720370d76f9997','6d9fc89efc465bff2aa5372d3a1f561d') then raise exception 'Action changed: rebuild v214 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmBranchVein":{"kind":"charm","line":"mining","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmBranchVein":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
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

do $$ begin if to_regprocedure('town.mine_pay_v214(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.mine_pay_v214(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 declare did jsonb;begin
  did:=town.mine_pay_v213(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_visit(did->'purse',(p_go->>'floor')::integer));end if;
  return did;
 end $function$
$copy$;end if;end $$;
create or replace function town.mine_pay(p_purse jsonb,p_go jsonb,p_rock jsonb,p_struck jsonb,p_quake boolean,p_own boolean,p_word text)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb;begin
  did:=town.mine_pay_v214(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb and coalesce(did->'vein','null'::jsonb)<>'null'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_vein_site(did->'purse',p_purse,did->'vein',p_go->'at',(p_go->>'day')::integer));end if;
  return did;end $$;
do $$ begin if to_regprocedure('town.vein_end_v214(jsonb,jsonb,bigint)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.vein_end_v214(p_purse jsonb, p_go jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if p_go ? 'geology' and not town.rock_choice(p_go->'geology') then return town.no('none'); end if;
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null and coalesce(p_go->'geology'->>'focus','ore') <> 'crystal' then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  pick := town.mine_pick(p_purse);
  twin := case when jsonb_array_length(got_) > 0 and not twice and pick is not null then town.use_power(p_purse, pick, 'pkTwin', p_now) end;
  if coalesce((twin->>'ok')::boolean, false) then
    select jsonb_agg(jsonb_build_array(g.v->>0, (g.v->>1)::numeric * town.opt_n('pkTwin', 'times', pick)) order by g.ord) into got_
      from jsonb_array_elements(got_) with ordinality g(v, ord);
  end if;
  if p_go ? 'geology' then got_ := got_ || town.geological_yield(vein_,p_go->'geology',ore,jsonb_array_length(p_go->'gems'),p_purse); end if;
  stowed := town.stow_all(case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else p_purse end, got_);
  if stowed is null then return town.no('full'); end if;
  after_ := stowed;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', false, 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      'null'::jsonb)));
end;
$function$
$copy$;end if;end $$;
create or replace function town.vein_end(p_purse jsonb,p_go jsonb,p_now bigint)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb:=town.mine_of(p_purse)->'vein';begin
  did:=town.vein_end_v214(p_purse,p_go,p_now);
  if did->'ok'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_branch_source(did->'purse',p_purse,v,(p_go->>'ore')::integer,jsonb_array_length(p_go->'gems'),p_go->'geology',p_now));end if;
  return did;end $$;
do $$ begin if to_regprocedure('town.reward_resource_v214(jsonb,uuid,jsonb,bigint,bigint)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.reward_resource_v214(p jsonb, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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

 if not won and kind_='color' and not coalesce((run_->>'correctionUsed')::boolean,false) and run_->>'loadout'=town.combo_loadout(p)
  and town.used_of(p,gift_,t)<(town.cat('gifts')->'uses'->gift_->>'n')::integer then
  used:=town.combo_grant(p,'SC15','color:'||(run_->>'id'),t,'{}'::jsonb);
  if used->'ok'='true'::jsonb then
   run_:=run_||jsonb_build_object('began',t,'correctionUsed',true);
   return jsonb_build_object('ok',true,'resource',run_,'correction',true,'combo',used->'effect','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',run_)));
  end if;
 end if;
 if won then for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;end if;
 got:=case when won then r->'got' else '[]'::jsonb end;after_:=town.stow_all(p||jsonb_build_object('bag',bag),got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'resource',null,'got',got,'passed',case when won then 3 else 0 end,'left',used->'left','purse',town.spend(used->'purse',3,t)||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',null)));
end $function$
$copy$;end if;end $$;
create or replace function town.reward_resource(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
 returns jsonb language plpgsql stable set search_path='' as $$begin
  if input->>'action'='resourceBegin' and input->>'kind'='branch' or input->>'action' in ('resourceEnd','resourceCancel') and p->'professionRewards'->'resource'->>'kind'='branch' then return town.reward_branch_resource(p,request,input,t);end if;
  return town.reward_resource_v214(p,request,input,t,p_seed);end $$;
revoke all on function town.mine_pay_v214(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.vein_end_v214(jsonb,jsonb,bigint),town.reward_resource_v214(jsonb,uuid,jsonb,bigint,bigint),town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.vein_end(jsonb,jsonb,bigint),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_branch_resource(jsonb,uuid,jsonb,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'charmBranchVein') as v214_verified;
