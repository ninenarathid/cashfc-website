create or replace function town.reward_visit(p jsonb,f integer)
returns jsonb language sql immutable set search_path='' as $$
 select case when f between 1 and 30 then p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('visited',
   (select jsonb_agg(v order by v) from (select distinct n::integer v from jsonb_array_elements_text(coalesce(p->'professionRewards'->'visited','[]'::jsonb)||jsonb_build_array(f)) a(n) where n::numeric between 1 and 30 and n::numeric=floor(n::numeric)) q))) else p end
$$;
-- Coordinates and the shared cave row are checked by the caller before the purse lock.
create or replace function town.reward_lift(p jsonb,me uuid,request uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare f integer:=(input->>'floor')::integer;to_ integer;anchor_ integer:=(p->'professionRewards'->'lift'->>'floor')::integer;
 used jsonb;mouth_ jsonb:=town.cat('rewards')->'liftMouth';at_ jsonb;learned jsonb;day_ integer:=town.day_of(t);
begin
 if not town.gift_works(p,'thingPocketLift') or f not between 0 and (town.cat('mining')->>'floors')::integer then return town.no('none');end if;
 if input->>'action'='liftAnchor' then
  if f<1 or not (coalesce(p->'professionRewards'->'visited','[]'::jsonb) @> jsonb_build_array(f)
   or town.mine_of(p)->'rests' @> jsonb_build_array(f)
   or exists(select 1 from public.town_deeds d where d.member_id=me and d.what in ('mine','crystal','vein','hew') and d.n>0 and d.doc->>'floor'=f::text)) then return town.no('none');end if;
  learned:=town.reward_visit(p,f);
  return jsonb_build_object('ok',true,'purse',learned||jsonb_build_object('professionRewards',learned->'professionRewards'||jsonb_build_object('lift',jsonb_build_object('floor',f))));
 end if;
 if jsonb_typeof(input->'to') is distinct from 'number' or (input->>'to')::numeric<>floor((input->>'to')::numeric) or (input->>'to')::numeric not between 0 and 30 then return town.no('none');end if;
 to_:=(input->>'to')::integer;
 if anchor_ is null or not (coalesce(p->'professionRewards'->'visited','[]'::jsonb) @> jsonb_build_array(anchor_) or town.mine_of(p)->'rests' @> jsonb_build_array(anchor_))
  or not ((f=0 and to_=anchor_) or (f=anchor_ and to_=0)) then return town.no('none');end if;
 if f=0 and greatest(abs((input->'at'->>0)::integer-(mouth_->>0)::integer),abs((input->'at'->>1)::integer-(mouth_->>1)::integer))>3 then return town.no('far');end if;
 at_:=case when to_=0 then mouth_ else town.cave_laid(day_,to_)->'arrive' end;
 if at_ is null or at_='null'::jsonb then return town.no('none');end if;
 used:=town.gift_use(p,'thingPocketLift',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return used||jsonb_build_object('ride',jsonb_build_object('id',request,'floor',to_,'at',at_,'day',day_,'issued',t));
end $$;
revoke all on function town.reward_visit(jsonb,integer),town.reward_lift(jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;
