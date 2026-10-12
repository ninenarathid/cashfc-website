-- v209: personal forest traces, three different games and a finite reward budget per trail.
-- Run after v208 with the matching site. Safe to run twice; no player/world resets or automatic claims.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('67e84d6ced13db0f2bb3a640a65005ab','9d15713928457c41ebf6796580a50840') then raise exception 'town_reward changed: rebuild v209 on current text';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingForestRing":{"kind":"thing","line":"forest","rank":7,"by":1},"thingStarBottle":{"kind":"thing","line":"forest","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingForestRing":{"n":2,"per":"day"},"thingStarBottle":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
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

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
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
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingForestRing','thingStarBottle']) as v209_verified;
