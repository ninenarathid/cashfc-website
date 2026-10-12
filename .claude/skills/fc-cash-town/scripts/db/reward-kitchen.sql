create or replace function town.reward_kitchen(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'kitchen';a text:=c->>'action';kind_ text:=c->>'kind';recipe_ text:=c->>'recipe';ingredient_ text:=c->>'ingredient';used_ jsonb;bag_ jsonb:=p->'bag';foods_ jsonb:='[]'::jsonb;s jsonb;i integer;ix integer;pass_ boolean:=true;mark_ numeric;z bigint;attempts_ integer;after_ jsonb;banquet_ jsonb:='[]'::jsonb;pot_id bigint;
begin
 if a='kitchenCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null)),'kitchen',null);end if;
 if a='flavorTune' then
  if not town.gift_works(p,'thingFlavorBook') or recipe_ is null or coalesce(town.cat('dishes')->recipe_->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?recipe_ or ingredient_ is null or ingredient_ not in ('basil','salt','garlic') or town.held(bag_,ingredient_)<1 or (state_->'flavor'->>'until')::bigint>t then return town.no('none');end if;
  used_:=town.gift_use(p,'thingFlavorBook',t);if used_->'ok'<>'true'::jsonb then return used_;end if;
  return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('bag',town.take(bag_,ingredient_,1),'professionRewards',state_||jsonb_build_object('flavor',jsonb_build_object('recipe',recipe_,'secondary',case ingredient_ when 'basil' then 'green' when 'salt' then 'calm' else 'keen' end,'until',t+1800000))));
 end if;
 if a='kitchenBegin' then
  if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  if kind_='fire' then
   if not town.gift_works(p,'charmChefFlame') or recipe_ is null or coalesce(town.cat('dishes')->recipe_->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?recipe_ or (state_->'fire'->>'until')::bigint>t then return town.no('none');end if;
  elsif kind_='banquet' then
   if not town.gift_works(p,'thingDragonPot') or jsonb_typeof(c->'slots') is distinct from 'array' or jsonb_array_length(c->'slots')<>5 then return town.no('none');end if;
   for i in 0..4 loop
    if jsonb_typeof(c->'slots'->i) is distinct from 'number' or (c->'slots'->>i)::numeric<>floor((c->'slots'->>i)::numeric) or (c->'slots'->>i)::numeric not between 0 and jsonb_array_length(bag_)-1 then return town.no('none');end if;
    ix:=(c->'slots'->>i)::integer;s:=bag_->ix;
    if s->>'item' is distinct from 'potFull' or (s->'of'->>'left')::numeric<1 or coalesce(town.cat('dishes')->(s->'of'->>'dish')->'recipe','null'::jsonb)='null'::jsonb or not coalesce(p->'made','[]'::jsonb)?(s->'of'->>'dish') then return town.no('none');end if;
    foods_:=foods_||jsonb_build_array(jsonb_set(s,'{of,left}','1'::jsonb));bag_:=jsonb_set(bag_,array[ix::text],case when (s->'of'->>'left')::integer=1 then 'null'::jsonb else jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer-1)) end);
   end loop;
   if (select count(distinct x->'of'->>'dish') from jsonb_array_elements(foods_) x)<3 then return town.no('none');end if;
  else return town.no('none');end if;
  used_:=town.gift_use(p,case when kind_='fire' then 'charmChefFlame' else 'thingDragonPot' end,t);if used_->'ok'<>'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'kind',kind_,'seed',seed_,'at',c->'at','began',t,'until',t+1800000,'stage',0,'attempts',0)||case when kind_='fire' then jsonb_build_object('recipe',recipe_) else jsonb_build_object('foods',foods_) end;
  return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('bag',bag_,'professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 or r->'at' is distinct from c->'at' or not town.gift_works(p,case when r->>'kind'='fire' then 'charmChefFlame' else 'thingDragonPot' end) then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') x where jsonb_typeof(x)<>'number' or (x::text)::numeric not between 0 and 1) then return town.no('none');end if;
 z:=((r->>'seed')::bigint+(r->>'stage')::integer)%4294967296;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.065 then pass_:=false;end if;end loop;
 attempts_:=(r->>'attempts')::integer+1;after_:=town.spend(p,2::double precision,t);
 if not pass_ then r:=case when attempts_>=5 then 'null'::jsonb else r||jsonb_build_object('began',t,'attempts',attempts_) end;return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r,'kitchenPassed',false);end if;
 if r->>'kind'='fire' then return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null,'fire',jsonb_build_object('recipe',r->'recipe','until',t+1800000))),'kitchen',null,'kitchenPassed',true);end if;
 if (r->>'stage')::integer<2 then r:=r||jsonb_build_object('stage',(r->>'stage')::integer+1,'began',t,'attempts',attempts_);return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',r)),'kitchen',r,'kitchenPassed',true);end if;
 -- Five reserved servings remain five. Existing feast rows and normal meal quotas handle sharing.
 for s in select value from jsonb_array_elements(r->'foods') loop
  insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values(me,s->'of'->>'dish',1,(town.cat('cooking')->'feast'->'tile'->>0)::integer,(town.cat('cooking')->'feast'->'tile'->>1)::integer,false,t,true,town.pot_marks(s)||jsonb_build_object('warm',greatest(coalesce((s->>'warm')::numeric,0),.5))) returning id into pot_id;
  banquet_:=banquet_||jsonb_build_array(town.pot_doc(pot_id));
 end loop;
 return jsonb_build_object('ok',true,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('kitchen',null)),'kitchen',null,'banquet',banquet_,'kitchenPassed',true);
end $$;
revoke all on function town.reward_kitchen(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

create or replace function town.reward_kitchen_cooked(p jsonb,d jsonb,misses integer,t bigint,me uuid,id uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);q jsonb:=d->'purse';made_ text:=d->>'made';fire_ boolean;flavor_ boolean;extra_ integer;s jsonb;ix integer;
begin
 if d->'ok' is distinct from 'true'::jsonb or made_ is null or coalesce(town.cat('dishes')->made_->'recipe','null'::jsonb)='null'::jsonb or d->'back'='true'::jsonb then return d;end if;
 fire_:=coalesce(d->'sprite'<>'true'::jsonb,true) and coalesce((state_->'fire'->>'until')::bigint>=t and state_->'fire'->>'recipe'=made_ and town.gift_works(p,'charmChefFlame'),false);
 flavor_:=coalesce(d->'sprite'<>'true'::jsonb,true) and coalesce((state_->'flavor'->>'until')::bigint>=t and state_->'flavor'->>'recipe'=made_ and town.gift_works(p,'thingFlavorBook'),false);extra_:=case when fire_ and misses=0 then 2 else 0 end;
 select (x.ord-1)::integer,x.v into ix,s from jsonb_array_elements(q->'bag') with ordinality x(v,ord) where x.v->>'item'='potFull' and x.v->'of'->>'dish'=made_ and (p->'bag'->(x.ord-1)::integer->>'item') is distinct from 'potFull' order by ord limit 1;
 if ix is null then return d;end if;
 s:=jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer+extra_))||jsonb_build_object('cookedBy',me,'cookId',id)||case when flavor_ then jsonb_build_object('secondary',state_->'flavor'->'secondary') else '{}'::jsonb end;
 q:=jsonb_set(q,'{bag}',jsonb_set(q->'bag',array[ix::text],s));if fire_ or flavor_ then q:=q||jsonb_build_object('professionRewards',coalesce(q->'professionRewards','{}'::jsonb)||case when fire_ then '{"fire":null}'::jsonb else '{}'::jsonb end||case when flavor_ then '{"flavor":null}'::jsonb else '{}'::jsonb end);end if;
 return d||jsonb_build_object('n',(d->>'n')::integer+extra_,'purse',q);
end $$;
revoke all on function town.reward_kitchen_cooked(jsonb,jsonb,integer,bigint,uuid,uuid) from public,anon,authenticated;

create or replace function town.reward_food_finished(p jsonb,e jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare b text:=e->>'secondary';buffs_ jsonb;had_ boolean;
begin
 if b in ('green','calm','keen') and b is distinct from town.cat('dishes')->(e->>'dish')->>'buff' then
  buffs_:=coalesce((select jsonb_agg(x order by ord) from jsonb_array_elements(coalesce(p->'buffs','[]'::jsonb)) with ordinality a(x,ord) where (x->>'until')::bigint>t),'[]'::jsonb);had_:=exists(select 1 from jsonb_array_elements(buffs_) x where x->>'id'=b);
  if had_ then select jsonb_agg(case when x->>'id'=b then x||jsonb_build_object('level',greatest(1,(x->>'level')::integer),'until',greatest((x->>'until')::bigint,t+1800000)) else x end order by ord) into buffs_ from jsonb_array_elements(buffs_) with ordinality a(x,ord);
  else buffs_:=buffs_||jsonb_build_array(jsonb_build_object('id',b,'level',1,'until',t+1800000));end if;p:=p||jsonb_build_object('buffs',buffs_);
 end if;
 if e->>'cookedBy' is not null and e->>'cookId' is not null then p:=p||jsonb_build_object('lastMeal',jsonb_build_object('cookedBy',e->'cookedBy','cookId',e->'cookId','at',t));end if;return p;
end $$;
revoke all on function town.reward_food_finished(jsonb,jsonb,bigint) from public,anon,authenticated;
