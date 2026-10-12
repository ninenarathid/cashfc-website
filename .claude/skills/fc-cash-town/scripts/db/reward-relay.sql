create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 63 then 'town'
 when (at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 43 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;
create or replace function town.reward_relay(p jsonb,input jsonb,t bigint,trace_ jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);relay_ jsonb:=state_->'relay';at_ jsonb:=input->'at';
 slot_ integer;s jsonb;bag_ jsonb:=p->'bag';hand_ text;source_ integer;has_ integer;n_ integer;left_ integer;used_ jsonb;after_ jsonb:=p;moved_ integer;extra_ jsonb:='{}'::jsonb;
begin
 if not town.is_tile(at_) or town.reward_relay_place(at_) is null then return town.no('far');end if;
 if input->>'action'='relayTake' then
  if coalesce(relay_,'null'::jsonb)='null'::jsonb then return town.no('none');end if;
  if greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>1 then return town.no('far');end if;
  if (relay_->>'water')::integer>0 and exists(select 1 from jsonb_array_elements(bag_) b where b->>'item'=relay_->>'item' and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
  select (ord-1)::integer into slot_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b='null'::jsonb order by ord limit 1;
  if slot_ is null then return town.no('full');end if;
  moved_:=(relay_->>'water')::integer;
  bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',relay_->>'item','n',1)||case when moved_>0 then jsonb_build_object('water',moved_) else '{}'::jsonb end);
  relay_:='null'::jsonb;extra_:=jsonb_build_object('moved',moved_);
 else
  if not town.gift_works(p,'famWaterRelay') then return town.no('none');end if;
  if input->>'action'='relayPlace' then
   if coalesce(relay_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'slot') is distinct from 'number' or (input->>'slot')::numeric<>floor((input->>'slot')::numeric) or (input->>'slot')::numeric not between 0 and jsonb_array_length(bag_)-1 then return town.no('none');end if;
   slot_:=(input->>'slot')::integer;s:=bag_->slot_;
   if coalesce(s,'null'::jsonb)='null'::jsonb or not coalesce(town.cat('farming')->'buckets' ? (s->>'item'),false) or s->'n'<>'1'::jsonb or (s-'item'-'n')<>'{}'::jsonb then return town.no('none');end if;
   bag_:=jsonb_set(bag_,array[slot_::text],'null'::jsonb);after_:=town.spend(p,1::double precision,t);
   relay_:=jsonb_build_object('item',s->>'item','at',at_,'water',0);
  elsif input->>'action'='relaySend' then
   if coalesce(relay_,'null'::jsonb)='null'::jsonb or (relay_->>'water')::integer>0 then return town.no('none');end if;
   if town.reward_relay_place(at_) is distinct from town.reward_relay_place(relay_->'at') or greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>40 then return town.no('far');end if;
   hand_:=town.hand_of(p);if hand_ is null or not (town.cat('farming')->'buckets' ? hand_) then return town.no('none');end if;
   select (ord-1)::integer,(b->>'water')::integer into source_,has_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
   if source_ is null then return town.no('none');end if;
   n_:=least(6,(town.cat('farming')->'buckets'->>(relay_->>'item'))::integer,has_);left_:=has_-n_;
   if n_<1 or exists(select 1 from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=relay_->>'item' and case when ord-1=source_ then left_ else coalesce((b->>'water')::integer,0) end>0) then return town.no('none');end if;
   used_:=town.gift_use(p,'famWaterRelay',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   after_:=town.spend(used_->'purse',2::double precision,t);
   bag_:=jsonb_set(bag_,array[source_::text],jsonb_build_object('item',hand_,'n',1)||case when left_>0 then jsonb_build_object('water',left_) else '{}'::jsonb end);
   relay_:=relay_||jsonb_build_object('from',at_,'sentAt',t,'water',n_,'kind',trace_->'kind','hands',coalesce(trace_->'hands','[]'::jsonb));
   extra_:=jsonb_build_object('moved',n_,'left',used_->'left');
  else return town.no('none');end if;
 end if;
 return jsonb_build_object('ok',true,'relay',relay_,'purse',after_||jsonb_build_object('bag',bag_,'professionRewards',state_||jsonb_build_object('relay',relay_)))||extra_;
end $$;
revoke all on function town.reward_relay_place(jsonb),town.reward_relay(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;
