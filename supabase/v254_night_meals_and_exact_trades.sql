-- v254: exact trade stacks, a real late-night meal and a fishing creel.
-- Run after v253 experience and deploy the matching client. Safe to run twice.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $guard$ begin
 if coalesce((town.cat('work')->>'experienceVersion')::integer,0)<2 then raise exception 'Run v253 experience before v254';end if;
 if md5(replace(pg_get_functiondef('town.meal_of(bigint)'::regprocedure),chr(13),'')) not in ('5313ab34f2101d264c60a95ff6c6e6a7','2fd631fbbb55527de789026289247bd2') then raise exception 'Definition changed: town.meal_of(bigint); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.bowls_today(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('b056be78f7d315d39dcddbadcbc040d2','785925e7642c1256d32f4e72591a16fe') then raise exception 'Definition changed: town.bowls_today(jsonb,bigint); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.land_catch_v205(jsonb,text,double precision)'::regprocedure),chr(13),'')) not in ('717ac1db55b0da8056f6964cc6b21b85','472805e91cc396105c3682ae430a0600') then raise exception 'Definition changed: town.land_catch_v205(jsonb,text,double precision); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.tidy_give(jsonb)'::regprocedure),chr(13),'')) not in ('0b5aba118668998973603b439feac01a','6d35190963a5110acac2999aaead5c63') then raise exception 'Definition changed: town.tidy_give(jsonb); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.has_all(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('a0481201302c938e478c41b479197606','f60288e6791052ff322a8da9de847a20') then raise exception 'Definition changed: town.has_all(jsonb,jsonb); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.pull(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('ab6042305c9fc50ee6fbf70357056a30','dd3a5ecbc4a19f9f61496dcf881a2598') then raise exception 'Definition changed: town.pull(jsonb,jsonb); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.stretch_at(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('08de78143ccc504bda2ce090d9384c1f','12fbc1bd5e072e5c0cbc95cb82649e28') then raise exception 'Definition changed: town.stretch_at(jsonb,bigint); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('public.town_deal_lay(jsonb,numeric)'::regprocedure),chr(13),'')) not in ('e57be51f14622c481db6e7c3eaf74047','cbdffeee33757861f23015ba4230dba2') then raise exception 'Definition changed: public.town_deal_lay(jsonb,numeric); rebuild v254 on the current definition';end if;
 if md5(replace(pg_get_functiondef('town.gift_take(jsonb,jsonb,text,integer)'::regprocedure),chr(13),'')) not in ('f340cc1fb5b0cd4f6e5ccaba06093b01','fad9d72dea7dd77be9faad3ec4702c85') then raise exception 'Definition changed: town.gift_take(jsonb,jsonb,text,integer); rebuild v254 on the current definition';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(data,'{meals}','[5,11,17,23]'::jsonb),updated_at=now() where key='stamina';
create or replace function town.meal_of(p_now bigint) returns integer language sql stable set search_path='' as $$
 select case when h>=23 or h<5 then 3 when h>=17 then 2 when h>=11 then 1 else 0 end
 from (select (((p_now+25200000)%86400000+86400000)%86400000)::double precision/3600000 h) q
$$;
create or replace function town.bowls_today(p_purse jsonb,p_now bigint) returns jsonb language sql stable set search_path='' as $$
 select jsonb_agg(case when (p_purse#>>'{meals,day}')::integer is distinct from town.day_of(p_now) then 0
  when jsonb_typeof(p_purse#>'{meals,bowls}')='array' then coalesce((p_purse#>>array['meals','bowls',i::text])::integer,0)
  else case when p_purse#>array['meals','eaten',i::text]='true'::jsonb then 1 else 0 end end order by i)
 from generate_series(0,3) q(i)
$$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',(data->'gifts')||'{"thingCreel":{"kind":"thing","line":"fishing","rank":1,"by":5}}'::jsonb),updated_at=now() where key='gifts' and not data->'gifts' ? 'thingCreel';
update public.town_catalog set data=data||jsonb_build_array(jsonb_build_object('gift','thingCreel','slots',5,'holds',(select jsonb_agg(key order by key) from jsonb_each(town.cat('fish'))))),updated_at=now() where key='pouches' and not exists(select 1 from jsonb_array_elements(data) p where p->>'gift'='thingCreel');
create or replace function town.land_catch_v205(p_purse jsonb,p_what text,p_size double precision) returns jsonb language plpgsql stable set search_path='' as $$
declare kept boolean:=town.room_in(p_purse,p_what)>0;fish boolean:=town.cat('fish')?p_what;record boolean:=fish and p_size>coalesce((p_purse->'best'->>p_what)::double precision,0);out_ jsonb:=p_purse;
begin
 if kept then out_:=town.stow_all(out_,jsonb_build_array(jsonb_build_array(p_what,1)));end if;
 return jsonb_build_object('kept',kept,'record',record,'purse',out_||jsonb_build_object('best',case when record then coalesce(p_purse->'best','{}'::jsonb)||jsonb_build_object(p_what,p_size) else p_purse->'best' end));
end $$;
create or replace function town.tidy_give(p_give jsonb) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(case when selected is null then jsonb_build_array(id,n) else jsonb_build_array(id,n,selected) end order by first),'[]'::jsonb)
 from (select x.v->>0 id,sum((x.v->>1)::numeric) n,min(x.ord) first,x.v->2 selected
 from jsonb_array_elements(p_give) with ordinality x(v,ord)
 where town.cat('items')?(x.v->>0) and (x.v->>1)::numeric=floor((x.v->>1)::numeric) and (x.v->>1)::numeric>0 group by x.v->>0,x.v->2) q
$$;
create or replace function town.has_all(p_purse jsonb,p_give jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare g jsonb;selected jsonb;slot_ integer;used integer[]:='{}';bag jsonb:=p_purse->'bag';plain jsonb;mine jsonb:=town.tidy_give(p_give);
begin
 for g in select v from jsonb_array_elements(mine) q(v) loop
  selected:=g->2;
  if selected is not null then
   if jsonb_typeof(selected) is distinct from 'object' or jsonb_typeof(selected->'slot') is distinct from 'number' or jsonb_typeof(selected->'stack') is distinct from 'object' then return false;end if;
   if (selected->>'slot')::numeric<>floor((selected->>'slot')::numeric) or (selected->>'slot')::numeric<0 or (selected->>'slot')::numeric>=jsonb_array_length(bag) then return false;end if;
   slot_:=(selected->>'slot')::integer;
   if slot_=any(used) or bag->slot_ is distinct from selected->'stack' or bag->slot_->>'item' is distinct from g->>0 or (bag->slot_->>'n')::numeric<(g->>1)::numeric then return false;end if;
   used:=array_append(used,slot_);
  end if;
 end loop;
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into plain from jsonb_array_elements(bag) with ordinality q(v,ord) where not (ord-1)::integer=any(used);
 return not exists(select 1 from jsonb_array_elements(mine) q(v) where v->2 is null and town.held(plain,v->>0)<(v->>1)::numeric);
end $$;
CREATE OR REPLACE FUNCTION town.pull(p_bag jsonb, p_give jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  bag jsonb := p_bag;
  stacks jsonb := '[]'::jsonb;
  g jsonb;
  s jsonb;
  more numeric;
  less numeric;
  i integer;
begin
  for g in select e.v from jsonb_array_elements(p_give) with ordinality e(v, ord) order by e.ord loop
    more := (g->>1)::numeric;
    for i in reverse jsonb_array_length(bag) - 1..0 loop
      exit when more <= 0;
      s := bag->i;
      continue when s = 'null'::jsonb or s->>'item' <> g->>0
        or (g->2 is not null and i<>(g->2->>'slot')::integer)
        or (g->2 is null and exists(select 1 from jsonb_array_elements(p_give) e where e->2 is not null and (e->2->>'slot')::integer=i));
      less := least(more, (s->>'n')::numeric);
      more := more - less;
      stacks := stacks || jsonb_build_array(s || jsonb_build_object('n', less));
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::numeric = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::numeric - less) end);
    end loop;
  end loop;
  return jsonb_build_object('bag', bag, 'stacks', stacks);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_deal_lay(p_give jsonb, p_coins numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  mine bigint := town.open_deal(me);
  deal jsonb;
  did jsonb;
  entry_ jsonb;
begin
  if mine is null then return town.answer(me, town.no('gone')); end if;
  select d.doc into deal from public.town_deals d where d.id = mine and d.ended is null for update;
  if deal is null then return town.answer(me, town.no('gone')); end if;
  if jsonb_typeof(p_give) is distinct from 'array' then return town.answer(me,town.no('none'));end if;
  if jsonb_array_length(p_give)>64 then return town.answer(me,town.no('none'));end if;
  for entry_ in select v from jsonb_array_elements(p_give) q(v) loop
   if jsonb_typeof(entry_) is distinct from 'array' then return town.answer(me,town.no('none'));end if;
   if jsonb_array_length(entry_) not in (2,3) or jsonb_typeof(entry_->0) is distinct from 'string' or jsonb_typeof(entry_->1) is distinct from 'number' then return town.answer(me,town.no('none'));end if;
   if entry_->>0 !~ '^[A-Za-z]{1,24}$' or (entry_->>1)::numeric<>floor((entry_->>1)::numeric) or (entry_->>1)::numeric<=0 or (entry_->>1)::numeric>100000 then return town.answer(me,town.no('none'));end if;
   if jsonb_array_length(entry_)=3 and jsonb_typeof(entry_->2) is distinct from 'object' then return town.answer(me,town.no('none'));end if;
  end loop;
  did := town.lay(deal, me::text, purse, p_give, p_coins);
  if (did->>'ok')::boolean then
    update public.town_deals d set doc = did->'deal', touched = now_ where d.id = mine;
  end if;
  return town.answer(me, did - 'deal') || jsonb_build_object('deal', town.deal_told(mine, me));
end;
$function$
;
revoke all on function town.land_catch_v205(jsonb,text,double precision),town.tidy_give(jsonb),town.has_all(jsonb,jsonb),town.pull(jsonb,jsonb),town.bowls_today(jsonb,bigint),town.meal_of(bigint) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION town.stretch_at(p_rule jsonb, p_now bigint)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  select case p_rule->>'per'
    when 'day' then town.day_of(p_now)::bigint
    when 'meal' then case when town.meal_of(p_now)=3 then -town.day_of(p_now)::bigint-1 else town.day_of(p_now)::bigint*3+town.meal_of(p_now) end
    else floor(p_now::numeric / greatest(1, coalesce((p_rule->>'ms')::numeric, 1)))::bigint end
$function$
;
create or replace function town.gift_take(p_purse jsonb,p_points jsonb,p_line text,p_rank integer) returns jsonb language plpgsql stable set search_path='' as $$
declare mine jsonb:=town.gifts_of(p_purse);available jsonb;missing jsonb;
begin
 select coalesce(jsonb_agg(e.key order by e.key),'[]'::jsonb) into available from jsonb_each(town.cat('gifts')->'gifts') e where e.value->>'line'=p_line and (e.value->>'rank')::integer=p_rank;
 if jsonb_array_length(available)=0 then return town.no('none');end if;
 if town.work_rank(p_line,coalesce((p_points->>p_line)::double precision,0))<p_rank then return town.no('rank');end if;
 select coalesce(jsonb_agg(e.id order by e.ord),'[]'::jsonb) into missing from jsonb_array_elements_text(available) with ordinality e(id,ord) where not (mine->'had'?e.id);
 if jsonb_array_length(missing)=0 then return town.no('had');end if;
 return jsonb_build_object('ok',true,'gift',missing->>0,'purse',p_purse||jsonb_build_object('gifts',mine||jsonb_build_object('had',(mine->'had')||missing)));
end $$;
revoke all on function town.gift_take(jsonb,jsonb,text,integer),town.stretch_at(jsonb,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
