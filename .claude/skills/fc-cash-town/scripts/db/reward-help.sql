create or replace function town.help_fingerprint(plot_ jsonb,owner_ text)
returns text language sql immutable set search_path='' as $$
 select case when coalesce(plot_->'plant','null'::jsonb)<>'null'::jsonb then
 (plot_->'plant'->>'by')||':'||(plot_->'plant'->>'crop')||':'||(plot_->'plant'->>'sown')||':'||(plot_->'plant'->>'watered')||':'||(plot_->'plant'->>'cured')||':'||(plot_->'plant'->>'picked')
 else coalesce(plot_->>'soil','wild')||':'||owner_ end
$$;
create or replace function town.remember_garden_misses(p jsonb,offered_ jsonb,deed_ text,plots_ jsonb,owner_ text,marks_ jsonb,done_ jsonb,me_ text,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);previous_ jsonb;fresh_ jsonb:='[]'::jsonb;key_ text;by_ text;all_ jsonb;
begin
 if deed_ not in ('water','clear','till') then return p;end if;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into previous_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) with ordinality q(v,ord) where (v->>'until')::bigint>t and not done_?(v->>'key');
 for key_ in select jsonb_array_elements_text(offered_) loop
  if marks_->key_='false'::jsonb and not done_?key_ then
   by_:=coalesce(plots_->key_->'plant'->>'by',owner_,me_);
   fresh_:=fresh_||jsonb_build_array(jsonb_build_object('id',t::text||':'||key_||':'||deed_,'key',key_,'deed',deed_,'owner',by_,'fingerprint',town.help_fingerprint(plots_->key_,by_),'until',t+600000));
  end if;
 end loop;
 if jsonb_array_length(fresh_)=0 and jsonb_array_length(previous_)=jsonb_array_length(coalesce(state_->'failedGarden','[]'::jsonb)) then return p;end if;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into previous_ from jsonb_array_elements(previous_) with ordinality q(v,ord) where not exists(select 1 from jsonb_array_elements(fresh_) f(v) where f.v->>'key'=q.v->>'key');
 all_:=previous_||fresh_;select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into all_ from jsonb_array_elements(all_) with ordinality q(v,ord) where ord>jsonb_array_length(all_)-10;
 return p||jsonb_build_object('professionRewards',state_||jsonb_build_object('failedGarden',all_));
end $$;
create or replace function town.reward_help_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;plant_ jsonb;keeping_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'revive';job_ jsonb;identity_ text;used_ jsonb;after_ jsonb;did_ jsonb;updated_ jsonb;pass_ boolean:=true;z bigint;target_ numeric;i integer;others_ integer;seed_item text;
begin
 if a='reviveCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',null)),'revive',null);end if;
 if bed_<0 then return town.no('far');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;plant_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 if a='helpMend' then
  select v into job_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) q(v) where v->>'id'=c->>'job' and v->>'key'=key_ and (v->>'until')::bigint>t limit 1;
  if not town.gift_works(p,'famGardenMender') or job_ is null or job_->>'owner'=me::text or (coalesce(plant_,'null'::jsonb)='null'::jsonb and town.owner_of(keeping_,false,t) is distinct from job_->>'owner') or town.help_fingerprint(plot_,job_->>'owner') is distinct from job_->>'fingerprint' then return town.no('none');end if;
  used_:=town.gift_use(p,'famGardenMender',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  select count(*)::integer into others_ from jsonb_each(plots_) q where q.key<>key_ and coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb;
  did_:=town.tend(key_,coalesce(plot_,'{"soil":"wild","plant":null}'::jsonb),keeping_,others_,0,used_->'purse',me::text,t,false);
  if did_->'ok' is distinct from 'true'::jsonb or did_->>'deed' is distinct from job_->>'deed' then return town.no('none');end if;
  after_:=did_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('failedGarden',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(state_->'failedGarden') with ordinality q(v,ord) where v->>'id'<>job_->>'id')));updated_:=did_->'plot';
  if job_->>'deed'='water' then updated_:=town.poured_as(plot_,updated_,t,town.hot(t),town.well_kind(t),me::text,coalesce((did_->>'times')::double precision,1),town.wearing(p,'charmBell'));end if;
 else
  seed_item:=town.cat('crops')->(plant_->>'crop')->>'seed';
  if not town.gift_works(p,'thingReviveSeed') or plant_ is null or plant_='null'::jsonb or plant_->>'by'=me::text or (plant_->>'root' is not null and plant_->>'root'<>key_) or plant_->'giant'='true'::jsonb or plant_->'revived'='true'::jsonb or (plant_->>'picked')::integer>0 or not coalesce((town.see(key_,plot_,t)->>'dead')::boolean,false) or town.held(p->'bag',seed_item)<1 or town.held(p->'bag','pestCure')<1 or town.owner_of(keeping_,true,t) is null then return town.no('none');end if;
  identity_:=key_||':'||(plant_->>'by')||':'||(plant_->>'crop')||':'||(plant_->>'sown');
  if a='reviveBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'thingReviveSeed',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   r:=jsonb_build_object('id',request_,'key',key_,'identity',identity_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',r)),'revive',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or r->>'identity' is distinct from identity_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;if abs(target_-(c->'marks'->>i)::numeric)>.07 then pass_:=false;end if;end loop;
  after_:=town.spend(p,3::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('revive',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'revive',null,'helpPassed',false);end if;
  plant_:=plant_||jsonb_build_object('revived',true,'cured',t,'watered',t,'guard',greatest((plant_->>'guard')::bigint,t+7200000));plant_:=plant_||jsonb_build_object('boost',(plant_->>'boost')::double precision+((town.cat('crops')->(plant_->>'crop')->>'hours')::double precision*.5-town.grown(plant_,t))*3600000);
  after_:=after_||jsonb_build_object('bag',town.take(town.take(after_->'bag',seed_item,1),'pestCure',1));updated_:=plot_||jsonb_build_object('plant',plant_);
 end if;
 insert into public.town_plots(x,y,bed,soil,plant,changed) values(x_,y_,bed_,updated_->>'soil',nullif(updated_->'plant','null'::jsonb),t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;
 if a='helpMend' then perform town.note(me,job_->>'deed',plant_->>'crop',1,0,jsonb_build_object('tile',c->'at','whose',job_->>'owner','recovery',true));end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',jsonb_build_object(key_,updated_))||case when a='helpMend' then jsonb_build_object('helpDone',job_->>'deed','got',did_->'got')||case when did_->'times' is not null then jsonb_build_object('times',did_->'times') else '{}'::jsonb end else jsonb_build_object('revive',null,'helpPassed',true) end;
end $$;
revoke all on function town.help_fingerprint(jsonb,text),town.remember_garden_misses(jsonb,jsonb,text,jsonb,text,jsonb,jsonb,text,bigint),town.reward_help_garden(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;
