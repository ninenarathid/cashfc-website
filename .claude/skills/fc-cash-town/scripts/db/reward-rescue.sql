create or replace function town.remember_rescue(p_before jsonb,p_after jsonb,a text,request_ uuid,t bigint,failed_ boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare state_ jsonb:=coalesce(p_after->'professionRewards','{}'::jsonb);kind_ text;old_ jsonb;live_ jsonb;snapshot_ jsonb;ticket_ jsonb;
begin
 if a in ('beanCancel','kitchenCancel') then return p_after||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',null));end if;
 kind_:=case a when 'beanEnd' then 'bean' when 'kitchenEnd' then 'kitchen' end;if kind_ is null or not failed_ then return p_after;end if;
 old_:=p_before->'professionRewards'->kind_;if old_ is null or old_='null'::jsonb or old_->'rescued'='true'::jsonb or kind_='kitchen' and old_->>'kind'<>'banquet' then return p_after;end if;
 live_:=coalesce(state_->kind_,'null'::jsonb);snapshot_:=case when live_='null'::jsonb then old_ else live_ end;
 ticket_:=jsonb_build_object('id',request_,'kind',kind_,'at',snapshot_->'at','stage',case when kind_='bean' then snapshot_->'next' else snapshot_->'stage' end,'until',t+600000,'ask',false,'snapshot',snapshot_,'live',live_);
 return p_after||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',ticket_));
end $$;
create or replace function town.rescue_offer(p jsonb,target_ uuid,t bigint,at_ jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select case when r->'ask'='true'::jsonb and (r->>'until')::bigint>t and greatest(abs((r->'at'->>0)::integer-(at_->>0)::integer),abs((r->'at'->>1)::integer-(at_->>1)::integer))<=3 and coalesce(p->'professionRewards'->(r->>'kind'),'null'::jsonb)=r->'live' then jsonb_build_object('id',r->'id','target',target_,'kind',r->'kind','at',r->'at','stage',r->'stage','until',r->'until') end from(select p->'professionRewards'->'rescueTicket' r) q
$$;
create or replace function town.reward_rescue(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid,target_ uuid,theirs_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'rescue';ticket_ jsonb:=theirs_->'professionRewards'->'rescueTicket';mine_ jsonb;used_ jsonb;solo_ boolean:=target_=me;z bigint;mark_ numeric;width_ numeric;i integer;pass_ boolean:=true;restored_ jsonb;their_state jsonb;offers_ jsonb;
begin
 if a='rescueAsk' then ticket_:=state_->'rescueTicket';if ticket_ is null or ticket_='null'::jsonb or (ticket_->>'until')::bigint<=t or coalesce(state_->(ticket_->>'kind'),'null'::jsonb) is distinct from ticket_->'live' then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',ticket_||jsonb_build_object('ask',true))));end if;
 if a='rescueCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',null)),'rescue',null);end if;
 if not town.gift_works(p,'charmWaykeeper') then return town.no('none');end if;
 if a='rescueLook' then
  select coalesce(jsonb_agg(q.offer order by q.member_id),'[]'::jsonb) into offers_ from(select pp.member_id,o.offer from public.town_purses pp cross join lateral(select town.rescue_offer(pp.doc,pp.member_id,t,c->'at') offer) o where pp.doc->'professionRewards'->'rescueTicket'->'ask'='true'::jsonb and (pp.doc->'professionRewards'->'rescueTicket'->>'until')::bigint>t and o.offer is not null order by pp.member_id limit 20) q;
  return jsonb_build_object('ok',true,'purse',p,'rescueOffers',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(offers_) with ordinality q(v,ord) where ord<=20));
 end if;
 if theirs_ is null or ticket_ is null or ticket_='null'::jsonb or (ticket_->>'until')::bigint<=t or not solo_ and ticket_->'ask' is distinct from 'true'::jsonb or c->>'ticket' is distinct from ticket_->>'id' or coalesce(theirs_->'professionRewards'->(ticket_->>'kind'),'null'::jsonb) is distinct from ticket_->'live' then return town.no('none');end if;
 if greatest(abs((ticket_->'at'->>0)::integer-(c->'at'->>0)::integer),abs((ticket_->'at'->>1)::integer-(c->'at'->>1)::integer))>3 then return town.no('far');end if;
 if a='rescueBegin' then
  if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'charmWaykeeper',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'target',target_,'ticket',ticket_->'id','seed',seed_,'at',ticket_->'at','began',t,'until',least((ticket_->>'until')::bigint,t+120000),'solo',solo_);
  return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',r)),'rescue',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'target' is distinct from target_::text or r->>'ticket' is distinct from ticket_->>'id' or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 width_:=case when solo_ then .055 else .07 end;z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>width_ then pass_:=false;end if;end loop;
 mine_:=town.spend(p,3::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',null));if not pass_ then return jsonb_build_object('ok',true,'purse',mine_,'rescue',null,'rescuePassed',false);end if;
 restored_:=ticket_->'snapshot'||jsonb_build_object('attempts',0,'until',t+600000,'rescued',true)||case when ticket_->>'kind'='bean' then jsonb_build_object('challenge',null) else jsonb_build_object('began',t) end;
 their_state:=coalesce(theirs_->'professionRewards','{}'::jsonb)||jsonb_build_object(ticket_->>'kind',restored_,'rescueTicket',null);
 if solo_ then return jsonb_build_object('ok',true,'purse',mine_||jsonb_build_object('professionRewards',mine_->'professionRewards'||their_state||jsonb_build_object('rescue',null)),'rescue',null,'rescuePassed',true);end if;
 return jsonb_build_object('ok',true,'purse',mine_,'targetPurse',theirs_||jsonb_build_object('professionRewards',their_state),'rescue',null,'rescuePassed',true);
end $$;
revoke all on function town.remember_rescue(jsonb,jsonb,text,uuid,bigint,boolean),town.rescue_offer(jsonb,uuid,bigint,jsonb),town.reward_rescue(jsonb,jsonb,uuid,bigint,bigint,uuid,uuid,jsonb) from public,anon,authenticated;
