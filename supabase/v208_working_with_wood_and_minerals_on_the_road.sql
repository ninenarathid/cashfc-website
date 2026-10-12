-- v208: two travelling rewards keep the original recipe costs and required implements.
-- Run after v207 with the matching site. Safe to run twice; no automatic gift claims or inventory moves.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('0148e0f7321d39e24f4d397ed74659d0','67e84d6ced13db0f2bb3a640a65005ab') then raise exception 'town_reward changed: rebuild v208 on current text';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingPocketSawmill":{"kind":"thing","line":"felling","rank":6,"by":1},"famDwarf":{"kind":"familiar","line":"mining","rank":6,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingPocketSawmill":{"n":3,"per":"day"},"famDwarf":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
update public.town_catalog set data=data||jsonb_build_object('processRecipes','{"wood":{"splitPlank":{"needs":[["straightWood",1]],"in":["cleaver"],"gives":2},"carvingBlank":{"needs":[["heartwood",1],["woodOil",1]],"in":["cleaver"],"gives":2},"pitchSeal":{"needs":[["pinePitch",2],["charcoal",1]],"in":["pot"],"gives":3},"sapSyrup":{"needs":[["pineNut",1],["sugar",2]],"in":["pot"],"gives":2},"pineNutFlour":{"needs":[["pineNut",3]],"in":["mortar"],"gives":2},"rootTwine":{"needs":[["rootFiber",3]],"in":[],"gives":2},"woodOil":{"needs":[["pineNut",2],["oil",1],["pineBark",1]],"in":["mortar"],"gives":2}},"mineral":{"stoneTile":{"needs":[["slateLayer",2],["clayPocket",1]],"in":[],"gives":2},"crystalLens":{"needs":[["quartzCore",2]],"in":["mortar"],"gives":1},"sparkPowder":{"needs":[["pyriteCluster",2]],"in":["mortar"],"gives":3},"copperBlank":{"needs":[["copperNodule",2],["charcoal",1]],"in":["grill"],"gives":2},"steelPlate":{"needs":[["ironNodule",2],["charcoal",2]],"in":["grill"],"gives":2},"geodeDisplay":{"needs":[["wholeGeode",1],["silverNodule",1],["carvingBlank",1]],"in":[],"gives":1}}}'::jsonb) where key='rewards';
create or replace function town.reward_process(p jsonb,input jsonb,t bigint) returns jsonb language plpgsql stable set search_path='' as $$
declare kind_ text:=input->>'kind';id_ text:=input->>'recipe';r jsonb;gift_ text;tool_ text;did jsonb;used jsonb;
begin
 if kind_ is null or kind_ not in ('wood','mineral') then return town.no('none');end if;
 gift_:=case when kind_='wood' then 'thingPocketSawmill' else 'famDwarf' end;
 r:=town.cat('rewards')->'processRecipes'->kind_->id_;
 if not town.gift_works(p,gift_) or r is null or not coalesce(p->'made','[]'::jsonb) ? id_ then return town.no('none');end if;
 for tool_ in select jsonb_array_elements_text(r->'in') loop if town.held(town.carried_bag(p),tool_)<1 then return town.no('tool');end if;end loop;
 did:=town.cook(p,r->'needs',case when jsonb_array_length(r->'in')=0 then '[null]'::jsonb else r->'in' end,0,t);
 if did->'ok' is distinct from 'true'::jsonb then return did;end if;
 if did->>'made' is distinct from id_ then return town.no('none');end if;
 used:=town.gift_use(did->'purse',gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'purse',used->'purse','got',jsonb_build_array(jsonb_build_array(id_,did->'n')),'left',used->'left');
end $$;
revoke all on function town.reward_process(jsonb,jsonb,bigint) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action'='scan' then
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
 if p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_process(jsonb,jsonb,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingPocketSawmill','famDwarf']) as v208_verified;
