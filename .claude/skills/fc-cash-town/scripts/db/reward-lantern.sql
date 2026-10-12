create or replace function town.reward_lantern(p jsonb,input jsonb,t bigint,known_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare ins jsonb:=town.cat('insects');hid integer:=town.nectar_haunt((input->'at'->>0)::integer,(input->'at'->>1)::integer,ins);h jsonb;id_ text;bug_ jsonb;may_ jsonb:='[]'::jsonb;used_ jsonb;lured_ jsonb;
begin
 if not town.gift_works(p,'thingMoonLantern') or input->>'action' not in ('lanternLook','lanternLight') then return town.no('none');end if;
 if hid is not null then
  h:=ins->'haunts'->hid;
  for id_ in select jsonb_array_elements_text(ins->'order') loop
   bug_:=ins->'bugs'->id_;
   if known_ ? id_ and exists(select 1 from jsonb_array_elements(coalesce(bug_->'hours','[]'::jsonb)) hr where (hr->>0)::numeric=0 or (hr->>1)::numeric=24)
    and bug_->'at' ? (h->>0) and town.wild_fits(bug_-'hours',id_,h->>1,h->>2,t,town.word()) then may_:=may_||to_jsonb(id_);end if;
  end loop;
 end if;
 if input->>'action'='lanternLook' then return jsonb_build_object('ok',true,'purse',p,'knownBugs',may_);end if;
 id_:=input->>'bug';if hid is null or id_ is null or not may_ ? id_ then return town.no('none');end if;
 if (p->'lured'->>'until')::bigint>t then return town.no('none');end if;
 used_:=town.gift_use(p,'thingMoonLantern',t);if not (used_->>'ok')::boolean then return used_;end if;
 lured_:=jsonb_build_object('x',input->'at'->0,'y',input->'at'->1,'haunt',hid,'bug',id_,'n',1,'from',t+3000,'until',t+1200000,'seed',(hid::bigint*100003+t/1000)%2147483647,'origin','lantern');
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',2::double precision,t)||jsonb_build_object('lured',lured_),'knownBugs',may_,'lured',lured_,'left',used_->'left');
end $$;
revoke all on function town.reward_lantern(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;
