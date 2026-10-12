create or replace function town.tree_parts(parts jsonb,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(q.key,q.doc),'{}'::jsonb) from (
  select a.key,jsonb_object_agg(b.key,b.value) doc from jsonb_each(coalesce(parts,'{}'::jsonb)) a
  cross join lateral jsonb_each(a.value) b where a.key ~ '^[0-9]{1,4}$' and town.tree_of(a.key::integer) is not null
  and b.key in ('bark','sap','seed','root') and (b.value::text)::bigint>t group by a.key
 ) q
$$;
create or replace function town.tree_part_ready(g jsonb,id integer,part text,t bigint)
returns boolean language sql immutable set search_path='' as $$
 select part='wood' or coalesce((g->'parts'->id::text->>part)::bigint,0)<=t
$$;
create or replace function town.tree_part_rest(g jsonb,id integer,part text,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select case when part='wood' then g else g||jsonb_build_object('parts',case when part='wood' then parts else parts||jsonb_build_object(id::text,coalesce(parts->id::text,'{}'::jsonb)||jsonb_build_object(part,t+600000)) end) end from (select town.tree_parts(g->'parts',t) parts) q
$$;
create or replace function town.reward_pact(p jsonb,g jsonb,input jsonb,request uuid,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'pact';tree_ jsonb;id_ integer;part_ text;water_ jsonb;slot_ integer;hand_ text;has_ integer;used_ jsonb;after_ jsonb;bag_ jsonb;got_ jsonb:='[]'::jsonb;passed_ integer:=0;expected_ numeric;i integer;
begin
 if input->>'action'='pactCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null);end if;
 hand_:=town.hand_of(p);
 if not town.gift_works(p,'charmTreePact') or not coalesce(town.cat('farming')->'buckets' ? hand_,false) or town.held(p->'bag','compost')<1 then return town.no('none');end if;
 select jsonb_build_object('slot',ord-1,'hand',hand_,'has',floor((b->>'water')::numeric)) into water_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
 if water_ is null then return town.no('none');end if;
 if input->>'action'='pactBegin' then
  if jsonb_typeof(input->'tree') is distinct from 'number' or (input->>'tree')::numeric<>floor((input->>'tree')::numeric) or (input->>'tree')::numeric not between 0 and 9999 then return town.no('none');end if;
  id_:=(input->>'tree')::integer;part_:=input->>'part';
 else id_:=(run_->>'tree')::integer;part_:=run_->>'part';end if;
 tree_:=town.tree_of(id_);if tree_ is null or town.tree_elder(tree_) or not town.tree_grown(g,tree_,t) or town.tree_held(g,id_,t,'') then return town.no('none');end if;
 if town.tree_far(tree_,(input->'at'->>0)::integer,(input->'at'->>1)::integer)>1 then return town.no('far');end if;
 if input->>'action'='pactBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint or part_ is null or part_ not in ('bark','sap','seed','root') then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  if not town.tree_part_ready(g,id_,part_,t) or town.used_of(p,'charmTreePact',t)>=3 then return town.no('spent');end if;
  run_:=jsonb_build_object('id',request,'tree',id_,'part',part_,'at',input->'at','seed',seed_,'began',t,'until',t+90000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',run_)),'pact',run_);
 end if;
 if input->>'action'<>'pactEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 or exists(select 1 from jsonb_array_elements(input->'answers') a where jsonb_typeof(a)<>'number' or (a::text)::numeric<>floor((a::text)::numeric) or (a::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if not town.tree_part_ready(g,id_,part_,t) then return town.no('spent');end if;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=mod(20+seed_%61,3);if expected_=(input->'answers'->>i)::numeric then passed_:=passed_+1;end if;end loop;
 if passed_=3 then got_:=jsonb_build_array(jsonb_build_array(case part_ when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,2));end if;
 used_:=town.gift_use(p,'charmTreePact',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 slot_:=(water_->>'slot')::integer;hand_:=water_->>'hand';has_:=(water_->>'has')::integer-1;bag_:=town.take(used_->'purse'->'bag','compost',1);
 bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',hand_,'n',1)||case when has_>0 then jsonb_build_object('water',has_) else '{}'::jsonb end);
 after_:=town.stow_all(used_->'purse'||jsonb_build_object('bag',bag_),got_);if after_ is null then return town.no('full');end if;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null,'got',got_,'passed',passed_,'left',used_->'left')||case when passed_=3 then jsonb_build_object('grove',town.tree_part_rest(g,id_,part_,t)) else '{}'::jsonb end;
end $$;
revoke all on function town.tree_parts(jsonb,bigint),town.tree_part_ready(jsonb,integer,text,bigint),town.tree_part_rest(jsonb,integer,text,bigint),town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint) from public,anon,authenticated;
