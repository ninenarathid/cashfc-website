create or replace function town.reward_crown_caught(before_ jsonb,after_ jsonb,got_ jsonb,t bigint,bonus_ boolean default false)
returns jsonb language plpgsql stable set search_path='' as $$
declare q jsonb:=before_->'professionRewards'->'crown';seen_ jsonb;
begin
 if bonus_ or not town.gift_works(before_,'thingWingCrown') or coalesce(q,'null'::jsonb)='null'::jsonb or (q->>'until')::bigint<=t or jsonb_array_length(q->'seen')=3 then return after_;end if;
 select coalesce(jsonb_agg(id order by ord),'[]'::jsonb) into seen_ from jsonb_array_elements(q->'wanted') with ordinality b(id,ord) where q->'seen' ? (id#>>'{}') or exists(select 1 from jsonb_array_elements(got_) g where g->>0=id#>>'{}' and (g->>1)::numeric>0);
 return after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('crown',q||jsonb_build_object('seen',seen_)));
end $$;
create or replace function town.reward_crown(p jsonb,input jsonb,request uuid,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare a text:=input->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);q jsonb:=state_->'crown';ins jsonb:=town.cat('insects');hid integer:=town.nectar_haunt((input->'at'->>0)::integer,(input->'at'->>1)::integer,ins);h jsonb;id_ text;bug_ jsonb;may_ jsonb:='[]'::jsonb;used_ jsonb;lured_ jsonb;wanted_ jsonb:=town.cat('rewards')->'crownThemes'->(input->>'theme');
begin
 if not town.gift_works(p,'thingWingCrown') or a not in ('crownLook','crownBegin','crownCall','crownCancel') then return town.no('none');end if;
 if a='crownCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('crown',null)),'crown',null);end if;
 if a='crownBegin' then
  if (q->>'until')::bigint>t and (q->>'left')::integer>0 or wanted_ is null or hid is null then return town.no('none');end if;
  used_:=town.gift_use(p,'thingWingCrown',t);if not (used_->>'ok')::boolean then return used_;end if;
  q:=jsonb_build_object('id',request,'theme',input->>'theme','wanted',wanted_,'seen','[]'::jsonb,'left',3,'began',t,'until',t+86400000);
  return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('crown',q)),'crown',q);
 end if;
 if hid is not null and (q->>'until')::bigint>t and jsonb_array_length(q->'seen')=3 and (q->>'left')::integer>0 then
  h:=ins->'haunts'->hid;
  for id_ in select jsonb_array_elements_text(q->'wanted') loop
   bug_:=ins->'bugs'->id_;if bug_->'at' ? (h->>0) and town.wild_fits(bug_,id_,h->>1,h->>2,t,town.word()) then may_:=may_||to_jsonb(id_);end if;
  end loop;
 end if;
 if a='crownLook' then return jsonb_build_object('ok',true,'purse',p,'crown',q,'knownBugs',may_);end if;
 id_:=input->>'bug';if a<>'crownCall' or hid is null or id_ is null or not may_ ? id_ or (p->'lured'->>'until')::bigint>t then return town.no('none');end if;
 q:=q||jsonb_build_object('left',(q->>'left')::integer-1);
 lured_:=jsonb_build_object('x',input->'at'->0,'y',input->'at'->1,'haunt',hid,'bug',id_,'n',1,'from',t+3000,'until',least((q->>'until')::bigint,t+1200000),'seed',(hid::bigint*100003+t/1000)%2147483647,'origin','crown');
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('lured',lured_,'professionRewards',state_||jsonb_build_object('crown',q)),'crown',q,'lured',lured_,'knownBugs',may_);
end $$;
revoke all on function town.reward_crown_caught(jsonb,jsonb,jsonb,bigint,boolean),town.reward_crown(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;
