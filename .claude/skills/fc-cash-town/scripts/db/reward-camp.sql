create or replace function town.flag_benefit(p jsonb,d jsonb,me text,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare camp_ jsonb:=d->'camp';flag_ jsonb:=camp_->'flag';after_ jsonb:=d->'purse';day_ integer:=town.day_of(t);
begin
 if flag_ is null or coalesce(flag_->'members','[]'::jsonb)?me or jsonb_array_length(coalesce(flag_->'members','[]'::jsonb))>=5 or (p->>'campRetryDay')::integer=day_ then return d;end if;
 after_:=after_||jsonb_build_object('campRetry',jsonb_build_object('line',flag_->'line','until',least(t+600000,(camp_->>'until')::bigint),'site',camp_->'site'),'campRetryDay',day_);
 camp_:=camp_||jsonb_build_object('flag',flag_||jsonb_build_object('members',coalesce(flag_->'members','[]'::jsonb)||jsonb_build_array(me)));
 return d||jsonb_build_object('purse',after_,'camp',camp_);
end $$;
create or replace function town.camp_retry(p jsonb,c jsonb,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare coupon_ jsonb:=p->'campRetry';miss_ jsonb:=c->'campMiss';r jsonb;line_ text;seed_ bigint;width_ numeric;index_ integer;mark_ numeric;target_ numeric;z bigint;i integer;
begin
 if not c?'campMiss' then return jsonb_build_object('ok',true,'purse',p);end if;
 if c->>'action'='giantEnd' then r:=p->'professionRewards'->'giant';line_:='farming';seed_:=(r->>'seed')::bigint;width_:=.09;
 elsif c->>'action'='reviveEnd' then r:=p->'professionRewards'->'revive';line_:='helpers';seed_:=(r->>'seed')::bigint;width_:=.07;
 elsif c->>'action'='kitchenEnd' then r:=p->'professionRewards'->'kitchen';line_:='kitchen';seed_:=((r->>'seed')::bigint+(r->>'stage')::integer)%4294967296;width_:=.065;
 else return town.no('none');end if;
 if r is null or r='null'::jsonb or coupon_ is null or coupon_='null'::jsonb or (coupon_->>'until')::bigint<t or coupon_->>'line' is distinct from line_ or jsonb_typeof(miss_->'index') is distinct from 'number' or (miss_->>'index')::numeric<>floor((miss_->>'index')::numeric) or (miss_->>'index')::numeric not between 0 and 2 or jsonb_typeof(miss_->'mark') is distinct from 'number' or (miss_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
 index_:=(miss_->>'index')::integer;mark_:=(miss_->>'mark')::numeric;if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_typeof(c->'marks'->index_) is distinct from 'number' or (c->'marks'->>index_)::numeric not between 0 and 1 then return town.no('none');end if;
 z:=seed_;for i in 0..index_ loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;end loop;if abs(target_-mark_)<=width_ then return town.no('none');end if;
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('campRetry',null));
end $$;
create or replace function town.reward_camp_flag(p jsonb,c jsonb,me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare site_ integer;camp_ jsonb;used_ jsonb;line_ text:=c->>'line';after_ jsonb;camps_ jsonb;
begin
 if jsonb_typeof(c->'site') is distinct from 'number' or (c->>'site')::numeric<>floor((c->>'site')::numeric) or (c->>'site')::numeric not between 0 and 4 or line_ not in ('farming','helpers','kitchen') or line_ is null then return town.no('none');end if;
 site_:=(c->>'site')::integer;perform pg_advisory_xact_lock(hashtext('town.camp'),site_);select f.camp into camp_ from public.town_field_camps f where f.site=site_;
 if not town.gift_works(p,'thingCampFlag') or camp_ is null or camp_->>'by' is distinct from me::text or (camp_->>'until')::bigint<=t or camp_?'flag' or town.held(p->'bag','signalCord')<1 then return town.no('none');end if;
 if greatest(abs((camp_->>'x')::integer-(c->'at'->>0)::integer),abs((camp_->>'y')::integer-(c->'at'->>1)::integer))>(town.cat('camps')->>'reach')::integer then return town.no('far');end if;
 used_:=town.gift_use(p,'thingCampFlag',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=town.spend(used_->'purse',1::double precision,t)||jsonb_build_object('bag',town.take(p->'bag','signalCord',1));camp_:=camp_||jsonb_build_object('flag',jsonb_build_object('line',line_,'members','[]'::jsonb));update public.town_field_camps f set camp=camp_ where f.site=site_;
 select coalesce(jsonb_agg(f.camp order by f.site),'[]'::jsonb) into camps_ from public.town_field_camps f where (f.camp->>'until')::bigint>t;
 return jsonb_build_object('ok',true,'purse',after_,'camps',camps_);
end $$;
revoke all on function town.flag_benefit(jsonb,jsonb,text,bigint),town.camp_retry(jsonb,jsonb,bigint),town.reward_camp_flag(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;
