create table if not exists town.reward_springs(
 site integer primary key check(site between 0 and 4),doc jsonb not null,
 check((doc->>'left')::integer between 0 and 12 and (doc->>'site')::integer=site)
);
alter table town.reward_springs enable row level security;
revoke all on town.reward_springs from public,anon,authenticated;
insert into town.reward_springs(site,doc) select i,jsonb_build_object('site',i,'left',0,'until',0) from generate_series(0,4) i on conflict do nothing;
create or replace function public.town_reward_springs()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 return jsonb_build_object('now',t,'springs',(select coalesce(jsonb_agg(s.doc order by s.site),'[]'::jsonb) from town.reward_springs s where (s.doc->>'until')::bigint>t and (s.doc->>'left')::integer>0));
end $$;
revoke all on function public.town_reward_springs() from public,anon,authenticated;
grant execute on function public.town_reward_springs() to authenticated;
create or replace function town.reward_spring(p jsonb,input jsonb,request uuid,me uuid,old_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ integer;point_ jsonb;used_ jsonb;hand_ text;slot_ integer;n_ integer;after_ jsonb;node_ jsonb;
begin
 if jsonb_typeof(input->'site') is distinct from 'number' or (input->>'site')::numeric<>floor((input->>'site')::numeric) or (input->>'site')::numeric not between 0 and 4 then return town.no('far');end if;
 site_:=(input->>'site')::integer;point_:=town.cat('rewards')->'springSites'->site_;
 if point_ is null then return town.no('far');end if;
 if greatest(abs((input->'at'->>0)::integer-(point_->>0)::integer),abs((input->'at'->>1)::integer-(point_->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='springPlace' then
  if not town.gift_works(p,'thingSpringStone') then return town.no('none');end if;
  if (old_->>'until')::bigint>t and (old_->>'left')::integer>0 then return town.no('spent');end if;
  used_:=town.gift_use(p,'thingSpringStone',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  node_:=jsonb_build_object('site',site_,'id',request,'by',me,'at',point_,'until',t+3600000,'left',12);
  return jsonb_build_object('ok',true,'spring',node_,'purse',town.spend(used_->'purse',3::double precision,t),'left',used_->'left');
 end if;
 if input->>'action'<>'springDraw' or coalesce(old_,'null'::jsonb)='null'::jsonb or (old_->>'site')::integer<>site_ or (old_->>'until')::bigint<=t or (old_->>'left')::integer<=0 then return town.no('none');end if;
 hand_:=town.hand_of(p);if hand_ is null or not town.cat('farming')->'buckets' ? hand_ then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 select (ord-1)::integer into slot_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and b->'n'='1'::jsonb and (b-'item'-'n')='{}'::jsonb order by ord limit 1;
 if slot_ is null then return town.no('none');end if;
 n_:=least((old_->>'left')::integer,(town.cat('farming')->'buckets'->>hand_)::integer);
 after_:=town.spend(p,(town.cat('farming')->'chores'->>'draw')::double precision,t)||jsonb_build_object('bag',jsonb_set(p->'bag',array[slot_::text],jsonb_build_object('item',hand_,'n',1,'water',n_)));
 return jsonb_build_object('ok',true,'spring',old_||jsonb_build_object('left',(old_->>'left')::integer-n_),'purse',after_,'moved',n_);
end $$;
revoke all on function town.reward_spring(jsonb,jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;
