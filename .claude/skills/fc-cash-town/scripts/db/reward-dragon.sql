create or replace function town.reward_dragon_begin(p jsonb,me uuid,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare bank_ jsonb;fish_ text:=input->>'fish';odds_ jsonb;used_ jsonb;seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);nodes_ jsonb:='[]'::jsonb;run_ jsonb;i integer;
begin
 select b into bank_ from jsonb_array_elements(town.cat('rewards')->'dragonBanks') b where b->'at'=input->'at';if bank_ is null then return town.no('far');end if;
 if seed_ not between 0 and 4294967295 or not town.gift_works(p,'famRiverDragon') or coalesce(p->'professionRewards'->'trail','null'::jsonb)<>'null'::jsonb or (p->'professionRewards'->'dragon'->>'until')::bigint>t
 or town.cat('fish')->fish_->>'tier' is distinct from 'legend' or coalesce((p->'best'->>fish_)::numeric,0)<=0 or input->>'current' is null then return town.no('none');end if;
 odds_:=town.reward_school_pool(p,me,input,t);if not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 used_:=town.gift_use(p,'famRiverDragon',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 for i in 0..2 loop nodes_:=nodes_||jsonb_build_array(jsonb_build_object('at',bank_->'clues'->((i+seed_%3)::integer%3),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
 run_:=jsonb_build_object('id',request,'kind','dragon','next',0,'began',t,'challenge',null,'dragon',jsonb_build_object('fish',fish_,'bait',input->'bait','current',input->'current','at',input->'at'),'nodes',nodes_);
 return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',coalesce(used_->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)),'trail',run_,'left',used_->'left');
end $$;
create or replace function town.reward_dragon_draw(p jsonb,odds_ jsonb,bait_ text,current_ text,at_ jsonb,pair_ boolean,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare call_ jsonb:=p->'professionRewards'->'dragon';begin
 if coalesce(call_,'null'::jsonb)='null'::jsonb or (call_->>'until')::bigint<=t or not town.gift_works(p,'famRiverDragon') or pair_ or star_ or call_->>'bait' is distinct from bait_ or call_->>'current' is distinct from current_ or call_->'at' is distinct from at_ or town.cat('fish')->(call_->>'fish')->>'tier' is distinct from 'legend' or coalesce((p->'best'->>(call_->>'fish'))::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=call_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',null)),'odds',jsonb_build_array(jsonb_build_object('what',call_->'fish','p',1)));
end $$;
revoke all on function town.reward_dragon_begin(jsonb,uuid,uuid,jsonb,bigint,bigint),town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint) from public,anon,authenticated;
