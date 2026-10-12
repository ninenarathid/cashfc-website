-- v210: choose honey/wax, mend fragments, and transform two loose gem colours into one known colour.
-- Run after v209 with the matching site. Safe to run twice; no automatic claims, transfers or socket edits.
-- Games spend three stamina and one daily attempt when completed. A miss retains ingredients.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9d15713928457c41ebf6796580a50840','96ea55e2038e9d6da64588aaca70c682') then raise exception 'town_reward changed: rebuild v210 on current text';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingTreeHive":{"kind":"thing","line":"forest","rank":8,"by":1},"thingCrystalRepair":{"kind":"thing","line":"mining","rank":5,"by":1},"charmGemColor":{"kind":"charm","line":"mining","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingTreeHive":{"n":1,"per":"day"},"thingCrystalRepair":{"n":3,"per":"day"},"charmGemColor":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
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

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action'='scan' then
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
 if p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
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
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingTreeHive','thingCrystalRepair','charmGemColor']) as v210_verified;
