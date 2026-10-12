create table if not exists town.reward_bridges(site integer primary key check(site between 0 and 1),doc jsonb not null);
alter table town.reward_bridges enable row level security;
revoke all on town.reward_bridges from public,anon,authenticated;
insert into town.reward_bridges select i,jsonb_build_object('site',i,'until',0) from generate_series(0,1) i on conflict do nothing;
create or replace function public.town_reward_bridges()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 return jsonb_build_object('now',t,'bridges',(select coalesce(jsonb_agg(doc order by site),'[]'::jsonb) from town.reward_bridges where (doc->>'until')::bigint>t));
end $$;
revoke all on function public.town_reward_bridges() from public,anon,authenticated;
grant execute on function public.town_reward_bridges() to authenticated;
create or replace function town.reward_bridge(p jsonb,input jsonb,request uuid,me uuid,old_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ integer;point_ jsonb;used_ jsonb;logs_ integer;bag_ jsonb;bridge_ jsonb;
begin
 if input->>'action'<>'bridgeBuild' or jsonb_typeof(input->'site') is distinct from 'number' or (input->>'site')::numeric<>floor((input->>'site')::numeric) or (input->>'site')::numeric not between 0 and 1 then return town.no('far');end if;
 site_:=(input->>'site')::integer;point_:=town.cat('rewards')->'crossings'->site_;logs_:=(point_->>'logs')::integer;
 if point_ is null or input->'at' is distinct from point_->'a' and input->'at' is distinct from point_->'b' then return town.no('far');end if;
 if not town.gift_works(p,'famBeaver') or town.held(p->'bag','log')<logs_ or town.held(p->'bag','rootFiber')<2 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item' in ('log','rootFiber') and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
 if (old_->>'until')::bigint>t then return town.no('spent');end if;
 used_:=town.gift_use(p,'famBeaver',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 bag_:=town.take(town.take(p->'bag','log',logs_),'rootFiber',2);bridge_:=jsonb_build_object('site',site_,'id',request,'by',me,'until',t+1800000);
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',3::double precision,t)||jsonb_build_object('bag',bag_),'bridge',bridge_,'left',used_->'left');
end $$;
revoke all on function town.reward_bridge(jsonb,jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;
