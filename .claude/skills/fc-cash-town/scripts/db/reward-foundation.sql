create table if not exists town.reward_receipts (
 member_id uuid not null references public.profiles(id), request uuid not null,
 command jsonb not null, reply jsonb not null, at_ms bigint not null,
 primary key(member_id,request)
);
alter table town.reward_receipts enable row level security;
revoke all on town.reward_receipts from public,anon,authenticated;

create or replace function town.reward_minerals(p jsonb) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(id) order by ord),'[]'::jsonb) from jsonb_array_elements_text(town.cat('rewards')->'minerals') with ordinality m(id,ord)
 where coalesce(p->'professionRewards'->'minerals','[]'::jsonb) ? id or town.held(p->'bag',id)>0
 or exists(select 1 from jsonb_each(coalesce(p->'pouches','{}'::jsonb)) b where town.held(b.value,id)>0 and town.gift_works(p,b.key));
$$;
create or replace function town.reward_learn(p jsonb,got jsonb) returns jsonb language sql stable set search_path='' as $$
 select case when p is null then null else p || jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('minerals',
  coalesce((select jsonb_agg(to_jsonb(id) order by ord) from jsonb_array_elements_text(town.cat('rewards')->'minerals') with ordinality m(id,ord)
   where town.reward_minerals(p) ? id or exists(select 1 from jsonb_array_elements(coalesce(got,'[]'::jsonb)) g where g->>0=id and (g->>1)::numeric>0)), '[]'::jsonb))) end;
$$;
create or replace function town.reward_scan(p jsonb,g jsonb,mineral text,t bigint) returns jsonb language plpgsql stable set search_path='' as $$
declare r jsonb;f jsonb;chosen jsonb;dist integer;best integer;dx integer;dy integer;used jsonb;ore text;gem text;
begin
 if not town.gift_works(p,'thingOreCompass') or not town.reward_minerals(p) ? mineral then return town.no('none');end if;
 if g->'at' is null or g->'at'='null'::jsonb then return town.no('far');end if;
 ore:=town.mine_ore((g->>'floor')::integer);gem:=town.cat('forge')->'gems'->(g->>'element')->>'chip';
 for r in select v from jsonb_array_elements(g->'rocks') a(v) order by (v->>0)::integer loop
  if not town.cave_stands(g->'cave',(r->>0)::integer,t,(g->>'crystal')::integer) then continue;end if;
  f:=town.mine_holds(town.mine_word(),(g->>'floor')::integer,(r->>0)::integer,town.mine_turn(t),g->'today',town.mine_pick(p));
  if not (f->>'kind'='vein' and mineral=case when f->'gem'='true'::jsonb then gem else ore end
    or f->>'kind'='stone' and (f->>'shards')::numeric>0 and mineral=ore) then continue;end if;
  dist:=greatest(abs((r->>1)::integer-(g->'at'->>0)::integer),abs((r->>2)::integer-(g->'at'->>1)::integer));
  if best is null or dist<best then chosen:=r;best:=dist;end if;
 end loop;
 if chosen is null then return town.no('none');end if;
 used:=town.gift_use(p,'thingOreCompass',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 dx:=sign((chosen->>1)::integer-(g->'at'->>0)::integer);dy:=sign((chosen->>2)::integer-(g->'at'->>1)::integer);
 return jsonb_build_object('ok',true,'purse',town.reward_learn(used->'purse','[]'::jsonb),'left',used->'left','distance',case when best<=4 then 'near' when best<=10 then 'mid' else 'far' end,
  'direction',case when dy<0 then case when dx<0 then 'NW' when dx>0 then 'NE' else 'N' end when dy>0 then case when dx<0 then 'SW' when dx>0 then 'SE' else 'S' end when dx<0 then 'W' when dx>0 then 'E' else 'here' end);
end $$;
create or replace function town.reward_extract(p jsonb,request uuid,input jsonb,t bigint) returns jsonb language plpgsql stable set search_path='' as $$
declare source_ jsonb:=p->'professionRewards'->'extraction';run_ jsonb:=p->'professionRewards'->'run';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);
 part_ text:=input->>'part';x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;seed_ bigint;target_ numeric;passed integer:=0;i integer;got jsonb:='[]'::jsonb;used jsonb;after_ jsonb;
begin
 if not town.gift_works(p,'thingForesterKnife') or source_ is null or source_='null'::jsonb or t>(source_->>'until')::bigint then return town.no('none');end if;
 if input->>'action'='extractBegin' then
  if part_ is null or part_ not in ('bark','sap','seed') or part_=source_->>'excluded' then return town.no('none');end if;
  if greatest(abs(x-(source_->'at'->>0)::integer),abs(y-(source_->'at'->>1)::integer))>2 then return town.no('far');end if;
  if town.used_of(p,'thingForesterKnife',t)>=(town.cat('gifts')->'uses'->'thingForesterKnife'->>'n')::integer then return town.no('spent');end if;
  if run_ is not null and run_<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'source',source_->'key','tree',source_->'tree','part',part_,'seed',floor(random()*4294967296)::bigint,'at',input->'at','began',t,'until',least((source_->>'until')::bigint,t+90000));
  return jsonb_build_object('ok',true,'run',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('run',run_)));
 end if;
 if input->>'action'<>'extractEnd' or run_ is null or run_='null'::jsonb or run_->>'id' is distinct from input->>'run' or run_->'source' is distinct from source_->'key'
  or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if jsonb_typeof(input->'marks') is distinct from 'array' or jsonb_array_length(input->'marks')<>3
   or exists(select 1 from jsonb_array_elements(input->'marks') v where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;
  if abs(target_-(input->'marks'->>i)::numeric)<=0.09 then passed:=passed+1;end if;
 end loop;
 if passed=3 then got:=town.wood_yield(false,run_->>'part',source_->>'quality',p);end if;
 after_:=town.stow_all(p,got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,'thingForesterKnife',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 after_:=town.spend(used->'purse',1,t);
 return jsonb_build_object('ok',true,'got',got,'passed',passed,'left',used->'left','purse',after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',null)));
end $$;
revoke all on function town.reward_minerals(jsonb),town.reward_learn(jsonb,jsonb),town.reward_scan(jsonb,jsonb,text,bigint),town.reward_extract(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;

create or replace function public.town_reward(p_request uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action'='scan' then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 0 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('none'));end if;
  f:=(p_input->>'floor')::integer;
  if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;
  -- Same world-row-before-purse order as town_mine. This is one requested scan, not a new polling reader.
  c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $$;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
