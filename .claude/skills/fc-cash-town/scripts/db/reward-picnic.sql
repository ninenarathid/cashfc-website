create or replace function town.reward_picnic(p jsonb,input jsonb,me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=input->>'action';slot_ integer;s jsonb;n_ integer;bag_ jsonb;id_ bigint;pot_ jsonb;after_ jsonb;meal_ jsonb;x_ integer:=(input->'at'->>0)::integer;y_ integer:=(input->'at'->>1)::integer;marks_ jsonb;
begin
 if town.reward_relay_place(input->'at') is null then return town.no('far');end if;
 if a='picnicPlace' then
  if not town.gift_works(p,'thingPicnicCloth') or jsonb_typeof(input->'slot') is distinct from 'number' or (input->>'slot')::numeric<>floor((input->>'slot')::numeric) or (input->>'slot')::numeric not between 0 and jsonb_array_length(p->'bag')-1 then return town.no('none');end if;
  slot_:=(input->>'slot')::integer;s:=p->'bag'->slot_;
  if s->>'item' is distinct from 'potFull' or s->'of'->>'dish' is null or not town.cat('dishes') ? (s->'of'->>'dish') or jsonb_typeof(s->'of'->'left') is distinct from 'number' or (s->'of'->>'left')::numeric<1 or (s->'of'->>'left')::numeric<>floor((s->'of'->>'left')::numeric) then return town.no('none');end if;
  if exists(select 1 from public.town_pots o where not o.feast and abs(o.x-x_)<=1 and abs(o.y-y_)<=1) or (select count(*) from public.town_pots o where o.member_id=me and not o.feast)>=(town.cat('cooking')->>'pots')::integer then return town.no('none');end if;
  n_:=least(4,(s->'of'->>'left')::integer);marks_:=town.pot_marks(s)||jsonb_build_object('picnic',true);
  insert into public.town_pots(member_id,dish,helpings,x,y,tok,set_at,feast,marks) values(me,s->'of'->>'dish',n_,x_,y_,false,t,false,marks_) on conflict (x,y) where not feast do nothing returning id into id_;
  if id_ is null then return town.no('none');end if;
  bag_:=jsonb_set(p->'bag',array[slot_::text],case when (s->'of'->>'left')::integer=n_ then 'null'::jsonb else jsonb_set(s,'{of,left}',to_jsonb((s->'of'->>'left')::integer-n_)) end);
  return jsonb_build_object('ok',true,'purse',town.spend(p,1::double precision,t)||jsonb_build_object('bag',bag_),'picnic',town.pot_doc(id_));
 end if;
 if a<>'picnicEat' or input->>'pot' is null or input->>'pot' !~ '^[0-9]{1,18}$' then return town.no('none');end if;
 id_:=(input->>'pot')::bigint;
 -- The caller already holds its purse, as the ordinary pot RPCs do. Lock this shared serving before reading it.
 perform 1 from public.town_pots o where o.id=id_ for update;pot_:=town.pot_doc(id_);
 if pot_ is null or pot_->'picnic' is distinct from 'true'::jsonb or coalesce((pot_->>'feast')::boolean,false) or (pot_->>'left')::integer<1 then return town.no('none');end if;
 if town.reward_relay_place(pot_->'at') is distinct from town.reward_relay_place(input->'at') or sqrt(power((pot_->'at'->>0)::integer-x_,2)+power((pot_->'at'->>1)::integer-y_,2))>2 then return town.no('far');end if;
 if input->'seated' is distinct from 'true'::jsonb then return town.no('stand');end if;
 if coalesce(p->'eating','null'::jsonb)<>'null'::jsonb or (town.bowls_today(p,t)->>town.meal_of(t))::integer >= (town.cat('stamina')->>'bowls')::integer then return town.no('meal');end if;
 meal_:=town.begun(p,pot_->>'dish',t);after_:=p||meal_||jsonb_build_object('eating',meal_->'eating'||town.pot_marks(pot_)||jsonb_build_object('lent',true,'picnic',true));
 if (pot_->>'left')::integer=1 then delete from public.town_pots o where o.id=id_;pot_:=null;
 else update public.town_pots o set helpings=helpings-1 where o.id=id_;pot_:=town.pot_doc(id_);end if;
 return jsonb_build_object('ok',true,'purse',after_,'picnic',pot_);
end $$;
revoke all on function town.reward_picnic(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;
