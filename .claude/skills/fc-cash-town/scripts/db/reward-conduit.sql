create table if not exists town.reward_conduits (
 bed integer primary key check(bed between 0 and 23),until_ms bigint not null
);
alter table town.reward_conduits enable row level security;
revoke all on town.reward_conduits from public,anon,authenticated;
create or replace function town.reward_root_identity(k text,p jsonb)
returns text language sql immutable set search_path='' as $$
 select k||':'||(p->'plant'->>'by')||':'||(p->'plant'->>'sown')||':'||(p->'plant'->>'crop')||':'||(p->'plant'->>'picked')
$$;
create or replace function town.reward_conduit(p jsonb,input jsonb,request uuid,bed_ jsonb,cooldown_ bigint,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'conduit';
 number_ integer:=town.bed_of((input->'at'->>0)::integer,(input->'at'->>1)::integer);preview_ jsonb;roots_ jsonb;expected_ jsonb:='[]'::jsonb;
 width_ integer;i integer;n_ bigint;answer_ integer;passed_ integer:=0;matching_ jsonb:='{}'::jsonb;r jsonb;after_ jsonb;used_ integer:=0;plots_ jsonb:='{}'::jsonb;watered_ jsonb:='[]'::jsonb;extra_ jsonb:='{}'::jsonb;
begin
 if input->>'action'='conduitCancel' then return jsonb_build_object('ok',true,'conduit',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)));end if;
 if not town.gift_works(p,'thingRiverHorn') or not coalesce(town.cat('farming')->'buckets' ? town.hand_of(p),false)
  or not exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 if number_<0 then return town.no('far');end if;
 if cooldown_>t then return town.no('spent');end if;
 select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) into bed_ from jsonb_each(bed_) e where town.bed_of(split_part(e.key,',',1)::integer,split_part(e.key,',',2)::integer)=number_;
 if input->>'action'='conduitBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
  preview_:=town.ditch(p,bed_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
  if preview_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  select jsonb_agg(jsonb_build_object('key',k,'identity',town.reward_root_identity(k,bed_->k)) order by ord) into roots_ from jsonb_array_elements_text(preview_->'watered') with ordinality q(k,ord) where ord<=48;
  run_:=jsonb_build_object('id',request,'at',input->'at','bed',number_,'seed',seed_,'began',t,'until',t+90000,'roots',roots_);
  return jsonb_build_object('ok',true,'conduit',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',run_)));
 end if;
 if input->>'action'<>'conduitEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run'
  or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint or jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(input->'answers') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 n_:=(run_->>'seed')::bigint;
 for i in 0..2 loop n_:=(n_*1664525+1013904223)%4294967296;answer_:=mod(20+n_%61,3);expected_:=expected_||jsonb_build_array(answer_);if answer_=(input->'answers'->>i)::integer then passed_:=passed_+1;end if;end loop;
 roots_:=run_->'roots';width_:=ceil(jsonb_array_length(roots_)::numeric/3)::integer;
 for i in 0..jsonb_array_length(roots_)-1 loop
  r:=roots_->i;
  if expected_->(i/width_)=input->'answers'->(i/width_) and town.reward_root_identity(r->>'key',bed_->(r->>'key'))=r->>'identity' then matching_:=matching_||jsonb_build_object(r->>'key',bed_->(r->>'key'));end if;
 end loop;
 preview_:=town.ditch(p,matching_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
 if preview_->'ok'='true'::jsonb then used_:=(preview_->>'used')::integer;plots_:=preview_->'plots';watered_:=preview_->'watered';extra_:=jsonb_build_object('cooldown',t+5400000);end if;
 after_:=town.spend(p,(1+used_)::double precision,t)||case when used_>0 then jsonb_build_object('bag',preview_->'purse'->'bag') else '{}'::jsonb end;
 return jsonb_build_object('ok',true,'conduit',null,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)),'plots',plots_,'watered',watered_,'used',used_,'passed',passed_)||extra_;
end $$;
revoke all on function town.reward_root_identity(text,jsonb),town.reward_conduit(jsonb,jsonb,uuid,jsonb,bigint,bigint,bigint) from public,anon,authenticated;
