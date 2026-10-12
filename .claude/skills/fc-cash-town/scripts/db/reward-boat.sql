create table if not exists town.reward_boats(owner uuid primary key references public.profiles(id),doc jsonb not null);
alter table town.reward_boats enable row level security;
revoke all on town.reward_boats from public,anon,authenticated;
create or replace function town.boat_busy(who uuid,t bigint)
returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.town_lines l where l.member_id=who and
  greatest(coalesce((l.doc->>'bites_at')::bigint,0),coalesce((l.doc->>'struck_at')::bigint,0))+180000>t)
$$;
create or replace function public.town_reward_boats(p_x integer,p_y integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 if p_x is null or p_y is null or abs(p_x::bigint)>10000 or abs(p_y::bigint)>10000 then raise exception 'Invalid boat view';end if;
 return jsonb_build_object('now',t,'boats',(select coalesce(jsonb_agg(q.doc||jsonb_build_object('name',coalesce(pr.character_name,pr.display_name,'')) order by q.owner),'[]'::jsonb)
 from (select b.owner,b.doc from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)
 union all select n.owner,n.doc from (select b.owner,b.doc from town.reward_boats b where (b.doc->>'until')::bigint>t and b.owner<>me and b.doc->>'guest' is distinct from me::text
 and greatest(abs(p_x-(town.cat('rewards')->'boatRoutes'->((b.doc->>'site')::integer)->'dock'->>0)::integer),abs(p_y-(town.cat('rewards')->'boatRoutes'->((b.doc->>'site')::integer)->'dock'->>1)::integer))<=24 order by b.owner limit 12) n) q
 join public.profiles pr on pr.id=q.owner));
end $$;
create or replace function town.reward_boat(p jsonb,input jsonb,me uuid,old_ jsonb,t bigint,aboard boolean,busy boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare cmd jsonb:=input->'boat';a text:=cmd->>'action';r jsonb;boat_ jsonb;station_ integer;pos_ jsonb;to_ integer;duration_ bigint;membership_ jsonb;out_ jsonb:=p;
begin
 if jsonb_typeof(cmd) is distinct from 'object' or a is null or a not in ('launch','open','join','depart','return','leave') then return town.no('none');end if;
 if a='launch' then
  if jsonb_typeof(cmd->'site') is distinct from 'number' or (cmd->>'site')::numeric<>floor((cmd->>'site')::numeric) or (cmd->>'site')::numeric not between 0 and 1 then return town.no('far');end if;
  r:=town.cat('rewards')->'boatRoutes'->((cmd->>'site')::integer);if input->'at' is distinct from r->'dock' then return town.no('far');end if;
  if not town.gift_works(p,'thingLotusBoat') or cmd->>'owner' is not null and cmd->>'owner'<>me::text then return town.no('none');end if;
  if aboard or (old_->>'until')::bigint>t or busy then return town.no('spent');end if;
  boat_:=jsonb_build_object('owner',me,'guest',null,'site',cmd->'site','station',0,'open',false,'until',t+1800000,'trip',null);
  out_:=town.spend(p,2::double precision,t);
 else
  if old_ is null or (old_->>'until')::bigint<=t then return town.no('none');end if;
  r:=town.cat('rewards')->'boatRoutes'->((old_->>'site')::integer);if r is null then return town.no('none');end if;
  station_:=(old_->>'station')::integer;
  if (old_->'trip'->>'arrives')::bigint>t then return town.no('spent');end if;
  pos_:=case when station_=0 then r->'dock' else r->'anchor' end;if input->'at' is distinct from pos_ then return town.no('far');end if;
  boat_:=old_;
  if a='join' then
   if old_->>'owner'=me::text or station_<>0 or old_->'open' is distinct from 'true'::jsonb or coalesce(old_->'guest','null'::jsonb)<>'null'::jsonb or aboard or busy then return town.no('none');end if;
   boat_:=old_||jsonb_build_object('guest',me,'open',false);
  else
   if old_->>'owner'<>me::text and old_->>'guest' is distinct from me::text then return town.no('none');end if;
   if a='open' then
    if old_->>'owner'<>me::text or station_<>0 or jsonb_typeof(cmd->'open') is distinct from 'boolean' then return town.no('none');end if;
    return jsonb_build_object('ok',true,'purse',p,'boat',old_||jsonb_build_object('open',cmd->'open'));
   elsif a='leave' then
    if station_<>0 then return town.no('far');end if;
    boat_:=case when old_->>'owner'=me::text then old_||jsonb_build_object('until',t,'open',false) else old_||jsonb_build_object('guest',null) end;
   else
    to_:=case when a='depart' then 1 else 0 end;
    if station_=to_ or a='depart' and old_->>'owner'<>me::text or busy then return town.no('spent');end if;
    duration_:=ceil(sqrt(power((r->'dock'->>0)::numeric-(r->'anchor'->>0)::numeric,2)+power((r->'dock'->>1)::numeric-(r->'anchor'->>1)::numeric,2))/3.5*1000)::bigint;
    boat_:=old_||jsonb_build_object('station',to_,'open',false,'trip',jsonb_build_object('from',station_,'to',to_,'at',t,'arrives',t+duration_))||case when to_=0 then jsonb_build_object('until',t+duration_) else '{}'::jsonb end;
   end if;
  end if;
 end if;
 membership_:=case when a='leave' then 'null'::jsonb else jsonb_build_object('owner',boat_->'owner','until',boat_->'until') end;
 return jsonb_build_object('ok',true,'purse',out_||jsonb_build_object('professionRewards',coalesce(out_->'professionRewards','{}'::jsonb)||jsonb_build_object('boat',membership_)),'boat',boat_);
end $$;
create or replace function town.boat_water(b jsonb,x integer,y integer,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select case when (b->>'until')::bigint>t and b->'station'='1'::jsonb and coalesce((b->'trip'->>'arrives')::bigint,0)<=t and r->'anchor'=jsonb_build_array(x,y)
 then jsonb_build_object('habitat',r->'habitat','current','run') end from (select town.cat('rewards')->'boatRoutes'->((b->>'site')::integer) r) q
$$;
revoke all on function town.boat_busy(uuid,bigint),town.reward_boat(jsonb,jsonb,uuid,jsonb,bigint,boolean,boolean),town.boat_water(jsonb,integer,integer,bigint),public.town_reward_boats(integer,integer) from public,anon,authenticated;
grant execute on function public.town_reward_boats(integer,integer) to authenticated;
