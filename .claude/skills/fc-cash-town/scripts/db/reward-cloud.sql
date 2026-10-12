create table if not exists town.reward_cloud_consents(bed integer primary key check(bed between 0 and 23),doc jsonb not null);
alter table town.reward_cloud_consents enable row level security;
revoke all on town.reward_cloud_consents from public,anon,authenticated;
create or replace function town.local_rain_ms(p jsonb,t bigint)
returns bigint language sql stable set search_path='' as $$
 select case when coalesce(p->'moist'='true'::jsonb,false) or p->'localRain' is null then 0 else greatest(0,b-a-town.wet_ms(a,b)) end
 from (select greatest((p->>'sown')::bigint,(p->'localRain'->>'from')::bigint) a,least(t,(p->'localRain'->>'until')::bigint) b) q
$$;
create or replace function town.reward_cloud_permitted(bed_ integer,me uuid,owners_ jsonb,consents_ jsonb,t bigint)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(owners_->>bed_::text=me::text or (owners_->>bed_::text=consents_->bed_::text->>'by' and consents_->bed_::text->>'giver'=me::text and (consents_->bed_::text->>'until')::bigint>t),false)
$$;
create or replace function town.reward_cloud(p jsonb,input jsonb,request uuid,me uuid,plots_ jsonb,owners_ jsonb,consents_ jsonb,kind_ text,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'cloud';bed_ integer:=town.bed_of((input->'at'->>0)::integer,(input->'at'->>1)::integer);
 hand_ text;slot_ integer;water_ integer;n integer;r jsonb;q jsonb;s jsonb;roots_ jsonb:='[]'::jsonb;out_ jsonb:='{}'::jsonb;consent_ jsonb;used_ jsonb;after_ jsonb;i integer;passed_ integer:=0;target_ numeric;day_ integer:=town.day_of(t);corner_ jsonb;base_ numeric:=(town.cat('farming')->'water'->>'adds')::numeric*60000;
begin
 if input->>'action'='cloudConsent' then
  if bed_<0 then return town.no('far');end if;
  if owners_->>bed_::text is distinct from me::text then return town.no('theirs');end if;
  if input->'giver' is distinct from 'null'::jsonb and (jsonb_typeof(input->'giver') is distinct from 'string' or input->>'giver'!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then return town.no('none');end if;
  consent_:=case when input->'giver'='null'::jsonb then null else jsonb_build_object('by',me,'giver',input->>'giver','until',t+600000) end;
  return jsonb_build_object('ok',true,'purse',p,'consented',consent_ is not null,'consent',consent_);
 end if;
 if input->>'action'='cloudCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('cloud',null)),'cloud',null);end if;
 if not town.gift_works(p,'thingCloudJar') or kind_ is null or kind_ not in ('dawn','rain','moon') then return town.no('none');end if;
 hand_:=town.hand_of(p);if hand_ is null or not town.cat('farming')->'buckets' ? hand_ then return town.no('none');end if;
 select (ord-1)::integer,(b->>'water')::integer into slot_,water_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
 if slot_ is null then return town.no('none');end if;
 if input->>'action'='cloudBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and (run_->>'until')::bigint>=t then return town.no('none');end if;
  if bed_<0 or jsonb_typeof(input->'beds') is distinct from 'array' or jsonb_array_length(input->'beds') not between 1 and 3 then return town.no('far');end if;
  if exists(select 1 from jsonb_array_elements(input->'beds') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) or (select count(distinct v) from jsonb_array_elements(input->'beds') v)<>jsonb_array_length(input->'beds') then return town.no('far');end if;
  for n in select value::text::integer from jsonb_array_elements(input->'beds') loop
   if not town.reward_cloud_permitted(n,me,owners_,consents_,t) then return town.no('theirs');end if;
   corner_:=town.cat('rewards')->'cloudCorners'->n;
   if greatest(abs((corner_->>0)::integer+4-(input->'at'->>0)::integer),abs((corner_->>1)::integer+4-(input->'at'->>1)::integer))>20 then return town.no('far');end if;
  end loop;
  for r in select jsonb_build_object('key',e.key,'plot',e.value) from jsonb_each(plots_) e order by e.key loop
   q:=r->'plot'->'plant';s:=town.see(r->>'key',r->'plot',t);
   if input->'beds' @> to_jsonb(town.bed_of(split_part(r->>'key',',',1)::integer,split_part(r->>'key',',',2)::integer)) and coalesce(q,'null'::jsonb)<>'null'::jsonb and (q->>'root' is null or q->>'root'=r->>'key') and s->'dead'='false'::jsonb and s->'wet'='false'::jsonb and s->'ripe'='false'::jsonb and coalesce((q->'localRain'->>'day')::integer,-1)<>day_ then roots_:=roots_||jsonb_build_array(jsonb_build_object('key',r->>'key','identity',town.reward_root_identity(r->>'key',r->'plot')));end if;
  end loop;
  if jsonb_array_length(roots_) not between 1 and 192 then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'at',input->'at','beds',input->'beds','roots',roots_,'seed',seed_,'kind',kind_,'began',t,'until',t+90000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('cloud',run_)),'cloud',run_);
 end if;
 if input->>'action'<>'cloudEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint or jsonb_typeof(input->'marks') is distinct from 'array' or jsonb_array_length(input->'marks')<>3 or kind_<>run_->>'kind' then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(input->'marks') v where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 for n in select value::text::integer from jsonb_array_elements(run_->'beds') loop if not town.reward_cloud_permitted(n,me,owners_,consents_,t) then return town.no('theirs');end if;end loop;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;if abs(target_-(input->'marks'->>i)::numeric)<=0.09 then passed_:=passed_+1;end if;end loop;
 if passed_=3 then
  for r in select value from jsonb_array_elements(run_->'roots') loop
   q:=plots_->(r->>'key')->'plant';s:=town.see(r->>'key',plots_->(r->>'key'),t);
   if town.reward_root_identity(r->>'key',plots_->(r->>'key')) is distinct from r->>'identity' or q is null or coalesce((q->'localRain'->>'day')::integer,-1)=day_ or s->'dead'='true'::jsonb then continue;end if;
   q:=q||jsonb_build_object('boost',(q->>'boost')::numeric+town.local_rain_ms(q,t)*(town.cat('farming')->'water'->>'adds')::numeric/(town.cat('farming')->'water'->>'every')::numeric+base_*coalesce((town.cat('waters')->'adds'->>kind_)::numeric,0),'guard',greatest((q->>'guard')::bigint,t+coalesce((town.cat('waters')->'guards'->>kind_)::bigint,0)*3600000),'localRain',jsonb_build_object('id',run_->>'id','by',me,'from',t,'until',t+600000,'day',day_));
   out_:=out_||jsonb_build_object(r->>'key',plots_->(r->>'key')||jsonb_build_object('plant',q));
  end loop;
  if out_='{}'::jsonb then return town.no('none');end if;
 end if;
 used_:=town.gift_use(p,'thingCloudJar',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 after_:=town.spend(used_->'purse',6::double precision,t)||jsonb_build_object('bag',jsonb_set(p->'bag',array[slot_::text],jsonb_build_object('item',hand_,'n',1)||case when water_>1 then jsonb_build_object('water',water_-1) else '{}'::jsonb end),'professionRewards',state_||jsonb_build_object('cloud',null));
 return jsonb_build_object('ok',true,'purse',after_,'cloud',null,'plots',out_,'watered',(select coalesce(jsonb_agg(k order by k),'[]'::jsonb) from jsonb_object_keys(out_) k),'used',1,'passed',passed_,'left',used_->'left');
end $$;
revoke all on function town.local_rain_ms(jsonb,bigint),town.reward_cloud_permitted(integer,uuid,jsonb,jsonb,bigint),town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint) from public,anon,authenticated;
