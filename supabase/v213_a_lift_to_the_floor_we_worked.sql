-- v213: an anchor on an exact previously worked floor, six single legs/day.
-- Run after v212 with the matching site. Rerunnable; does not move any player on installation.
-- Current-day arrival tiles, unchanged resting lifts, world row before purse lock.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('b503a689b15d869ccb91d8c2ad56c739','53e3cbc7629a28062cb2bbe0d692a390') then raise exception 'Action changed: rebuild v213 on current text';end if;
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('1e2081fb6c299cdba5ffe4752f95c526','64fb11604bf41464dd639f9f860ca5d0') then raise exception 'Action changed: rebuild v213 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingPocketLift":{"kind":"thing","line":"mining","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingPocketLift":{"n":6,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('liftMouth','[58,238]'::jsonb) where key='rewards';
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

do $$ begin if to_regprocedure('town.mine_pay_v213(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.mine_pay_v213(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.mine_pay_v205(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
 if p_own and did->'ok'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.mine_pick(p_purse)));end if;
 return did;end;
$function$
$copy$;end if;end $$;
create or replace function town.mine_pay(p_purse jsonb,p_go jsonb,p_rock jsonb,p_struck jsonb,p_quake boolean,p_own boolean,p_word text)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare did jsonb;begin
  did:=town.mine_pay_v213(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_visit(did->'purse',(p_go->>'floor')::integer));end if;
  return did;
 end $$;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action' in ('scan','liftAnchor','liftRide') then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 0 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('none'));end if;
  f:=(p_input->>'floor')::integer;
  if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;
  -- Same world-row-before-purse order as town_mine. This is one requested scan, not a new polling reader.
  c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 if p_input->>'action'='process' and p_input->>'kind'='mineral' then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 1 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('far'));end if;
  f:=(p_input->>'floor')::integer;if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function town.mine_pay_v213(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text) from public,anon,authenticated;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_lift(jsonb,uuid,uuid,jsonb,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'thingPocketLift','ordinary_lift_kept',to_regprocedure('public.town_lift(integer)') is not null) as v213_verified;
