-- Profession tier 10: run after the matching site deploy. Prepared 2026-10-12.
-- Live baseline inspection found v215 warehouse and v216 forge changes already present.
-- This file applies exactly v207-v214, then v217-v251: 43 files in tested order.
-- Run ONCE. A later rerun of the whole batch is NOT supported: newer definitions supersede older guards.
-- Each migration keeps its original transaction and definition guards. Stop on the first error.
-- Do not remove guards or overwrite moved functions. This file does not install v215/v216 again.


-- ===== v207_the_minerals_and_parts_we_earned.sql =====
-- v207: earned minerals guide a compass; a felled trunk offers one more small part.
-- Run after v203 and v205 with the matching site. Safe to run twice.
-- No automatic gift claims, inventory transfers, coins or power upgrades.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('town.stow_all(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('588a39ed8ef3e7e7d2b128da07099543','d695bcf32cdd6c30bc766418f4a9981a') then raise exception 'Definition changed: town.stow_all(jsonb,jsonb); rebuild v207 on current text';end if;
if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('cd6ff5e6aecea3d04afc83644911159c','2274eab11d83eb7d4ce616f9b364ab3a') then raise exception 'Definition changed: town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v207 on current text';end if; end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingOreCompass":{"kind":"thing","line":"mining","rank":4,"by":1},"thingForesterKnife":{"kind":"thing","line":"felling","rank":4,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingOreCompass":{"n":5,"per":"day"},"thingForesterKnife":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
insert into public.town_catalog(key,data) values('rewards','{"version":1,"minerals":["shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx"],"actions":["scan","extractBegin","extractEnd"]}'::jsonb) on conflict(key) do update set data=public.town_catalog.data||excluded.data;
update public.town_catalog set data=(select jsonb_agg(e.value||jsonb_build_object('holds',(select jsonb_agg(v order by v) from (select distinct v from jsonb_array_elements_text(e.value->'holds'||coalesce((select n->'holds' from jsonb_array_elements('[{"gift":"thingSack","slots":5,"holds":["stone","shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx","oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx","slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","mineralSalt","wholeGeode"]},{"gift":"thingBundle","slots":3,"holds":["log","timber","knottedWood","straightWood","heartwood","cedarSliver","pineBark","pinePitch","pineNut","rootFiber"]}]'::jsonb) n where n->>'gift'=e.value->>'gift'),'[]'::jsonb)) h(v)) u)) order by e.ord) from jsonb_array_elements(data) with ordinality e(value,ord)) where key='pouches';
CREATE OR REPLACE FUNCTION town.stow_all_v207(p_purse jsonb, p_things jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  out_ jsonb := p_purse;
  t jsonb;
  many integer;
begin
  for t in select e.v from jsonb_array_elements(p_things) with ordinality e(v, ord) order by e.ord loop
    many := (t->>1)::integer;
    continue when many <= 0;
    if town.room_in(out_, t->>0) < many then return null; end if;
    out_ := town.stow_away(out_, t->>0, many);
  end loop;
  return out_;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.fell_v207(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.fell_v205(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.axe_of(p_purse)));end if;
 return did;end;
$function$
;
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


create or replace function town.stow_all(p_purse jsonb,p_things jsonb) returns jsonb language sql stable set search_path='' as $$
 select town.reward_learn(town.stow_all_v207(p_purse,p_things),p_things)
$$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare did jsonb;f jsonb;p jsonb;
begin
 did:=town.fell_v207(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 and town.gift_works(p_purse,'thingForesterKnife') and p_went->'grain' is not null then
  f:=did->'felled'->0;
  if f->>'quality' in ('rough','clear','heart') then
   p:=did->'purse';p:=p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',jsonb_build_object('key','tree:'||(f->>'id')||':'||p_now,'tree',f->'id','at',jsonb_build_array(p_x,p_y),'excluded',p_went->'grain'->'part','quality',f->'quality','until',p_now+180000)));
   did:=jsonb_set(did,'{purse}',p);
  end if;
 end if;
 return did;
end $$;
revoke all on function town.stow_all_v207(jsonb,jsonb),town.fell_v207(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.stow_all(jsonb,jsonb),town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
select jsonb_build_object('member_rpc',has_function_privilege('authenticated','public.town_reward(uuid,jsonb)','EXECUTE'),'anon_blocked',not has_function_privilege('anon','public.town_reward(uuid,jsonb)','EXECUTE'),'receipts_private',not has_table_privilege('authenticated','town.reward_receipts','SELECT'),'gifts_ready',town.cat('gifts')->'gifts' ?& array['thingOreCompass','thingForesterKnife']) as v207_verified;


-- ===== v208_working_with_wood_and_minerals_on_the_road.sql =====
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


-- ===== v209_personal_traces_under_the_forest_canopy.sql =====
-- v209: personal forest traces, three different games and a finite reward budget per trail.
-- Run after v208 with the matching site. Safe to run twice; no player/world resets or automatic claims.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('67e84d6ced13db0f2bb3a640a65005ab','9d15713928457c41ebf6796580a50840') then raise exception 'town_reward changed: rebuild v209 on current text';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingForestRing":{"kind":"thing","line":"forest","rank":7,"by":1},"thingStarBottle":{"kind":"thing","line":"forest","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingForestRing":{"n":2,"per":"day"},"thingStarBottle":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_trail(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'trail';kind_ text;gift_ text;sites jsonb;nodes jsonb:='[]'::jsonb;
 x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;seed_ bigint;count_ integer;offset_ integer;step_ integer;i integer;s jsonb;node_ jsonb;challenge_ jsonb;
 expected_ jsonb:='[]'::jsonb;target_ numeric;won boolean:=true;got jsonb:='[]'::jsonb;after_ jsonb;used jsonb;finished boolean:=false;next_ integer;
begin
 if input->>'action'='trailBegin' then
  kind_:=input->>'kind';if kind_ is null or kind_ not in ('forest','star') or coalesce(run_,'null'::jsonb)<>'null'::jsonb then return town.no('none');end if;
  gift_:=case when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') spot where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=8) then return town.no('far');end if;
  select jsonb_agg(spot order by ord) into sites from jsonb_array_elements(town.cat('forest')->'spots') with ordinality a(spot,ord) where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=28;
  count_:=jsonb_array_length(sites);if count_ is null or count_<3 then return town.no('none');end if;
  used:=town.gift_use(p,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  offset_:=(seed_%count_)::integer;step_:=floor(count_::numeric/3)::integer;
  for i in 0..2 loop s:=sites->((offset_+i*step_)%count_);nodes:=nodes||jsonb_build_array(jsonb_build_object('at',jsonb_build_array(s->1,s->2),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
  run_:=jsonb_build_object('id',request,'kind',kind_,'nodes',nodes,'next',0,'began',t,'challenge',null);
  return jsonb_build_object('ok',true,'trail',run_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'trail' then return town.no('none');end if;
 kind_:=run_->>'kind';gift_:=case when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
 if input->>'action'='trailCancel' then return jsonb_build_object('ok',true,'trail',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',null)));end if;
 next_:=(run_->>'next')::integer;node_:=run_->'nodes'->next_;if node_ is null or greatest(abs(x-(node_->'at'->>0)::integer),abs(y-(node_->'at'->>1)::integer))>3 then return town.no('far');end if;
 challenge_:=run_->'challenge';
 if input->>'action'='trailStage' then
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('challenge',challenge_);
  return jsonb_build_object('ok',true,'trail',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',run_)));
 end if;
 if input->>'action'<>'trailEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won:=false;end if;
 end loop;
 if won then
  if kind_='forest' then got:=jsonb_build_array(jsonb_build_array((array['forestLichen','mushroomSpores','wildMedicRoot'])[next_+1],1));elsif next_=2 then got:='[["starShard",1]]'::jsonb;end if;
 end if;
 after_:=town.stow_all(p,got);if after_ is null then return town.no('full');end if;
 finished:=won and next_=2;
 run_:=case when finished then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won then 1 else 0 end,'challenge',null) end;
 return jsonb_build_object('ok',true,'trail',run_,'completed',finished,'got',got,'passed',case when won then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,2,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
end $$;
revoke all on function town.reward_trail(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
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
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingForestRing','thingStarBottle']) as v209_verified;


-- ===== v210_honey_crystals_and_colours_we_make.sql =====
-- v210: choose honey/wax, mend fragments, and transform two loose gem colours into one known colour.
-- Run after v209 with the matching site. Safe to run twice; no automatic claims, transfers or socket edits.
-- Games spend three stamina and one daily attempt when completed. A miss retains ingredients.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9d15713928457c41ebf6796580a50840','96ea55e2038e9d6da64588aaca70c682') then raise exception 'town_reward changed: rebuild v210 on current text';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingTreeHive":{"kind":"thing","line":"forest","rank":8,"by":1},"thingCrystalRepair":{"kind":"thing","line":"mining","rank":5,"by":1},"charmGemColor":{"kind":"charm","line":"mining","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingTreeHive":{"n":1,"per":"day"},"thingCrystalRepair":{"n":3,"per":"day"},"charmGemColor":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_resource_recipe(kind_ text,key_ text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];parts text[];
begin
 if kind_='hive' and key_ in ('honey','wax') then return jsonb_build_object('needs','[["fragrantPetal",5]]'::jsonb,'got',jsonb_build_array(jsonb_build_array(case when key_='honey' then 'gardenHoney' else 'beeswax' end,2)));end if;
 if kind_='repair' and key_=any(chips) then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(key_,10),jsonb_build_array('quartzCore',2),jsonb_build_array('rootTwine',1)),'got','[["wholeGeode",1]]'::jsonb);end if;
 if kind_='color' then
  parts:=string_to_array(key_,':');
  if array_length(parts,1)=3 and parts[1]=any(gems) and parts[2]=any(gems) and parts[3]=any(gems) and parts[1]<>parts[2] then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(parts[1],1),jsonb_build_array(parts[2],1),jsonb_build_array('sparkPowder',1)),'got',jsonb_build_array(jsonb_build_array(parts[3],1)));end if;
 end if;
 return null;
end $$;
create or replace function town.reward_resource(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'resource';kind_ text;gift_ text;r jsonb;need jsonb;bag jsonb:=p->'bag';after_ jsonb;used jsonb;seed_ bigint;node_ jsonb;expected_ numeric;answers_ jsonb:=input->'answers';won boolean:=true;got jsonb;at_ jsonb:=input->'at';i integer;target_ text;chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];
begin
 if input->>'action'='resourceBegin' then
  kind_:=input->>'kind';r:=town.reward_resource_recipe(kind_,input->>'recipe');
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 else
  if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  kind_:=run_->>'kind';r:=town.reward_resource_recipe(kind_,run_->>'recipe');
 end if;
 gift_:=case kind_ when 'hive' then 'thingTreeHive' when 'repair' then 'thingCrystalRepair' when 'color' then 'charmGemColor' end;
 if gift_ is null or not town.gift_works(p,gift_) or r is null then return town.no('none');end if;
 if input->>'action'='resourceCancel' then return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',null)));end if;
 if kind_='hive' then
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') s where greatest(abs((s->>1)::numeric-(at_->>0)::numeric),abs((s->>2)::numeric-(at_->>1)::numeric))<=8) then return town.no('far');end if;
 elsif not coalesce(sqrt(power((at_->>0)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>0)::numeric,2)+power((at_->>1)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>1)::numeric,2))<=(town.cat('forge')->'stand'->>'reach')::numeric,false) then return town.no('far');end if;
 for need in select value from jsonb_array_elements(r->'needs') loop
  if town.held(bag,need->>0)<(need->>1)::integer or exists(select 1 from jsonb_array_elements(bag) s where s->>'item'=need->>0 and case when jsonb_typeof(s)='object' then (s-'item'-'n')<>'{}'::jsonb else false end) then return town.no('none');end if;
 end loop;
 if input->>'action'='resourceBegin' then
  if kind_='color' then target_:=r->'got'->0->>0;if town.held(bag,target_)<1 and not (town.reward_minerals(p) ? chips[array_position(gems,target_)]) then return town.no('none');end if;end if;
  if town.used_of(p,gift_,t)>=(town.cat('gifts')->'uses'->gift_->>'n')::integer then return town.no('spent');end if;
  for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
  if town.stow_all(p||jsonb_build_object('bag',bag),r->'got') is null then return town.no('full');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  node_:=jsonb_build_object('at',at_,'game',case when kind_='repair' then 'timing' else 'order' end,'seed',seed_);
  run_:=jsonb_build_object('id',request,'kind',kind_,'recipe',input->>'recipe','at',at_,'node',node_,'began',t,'until',t+90000,'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',run_)));
 end if;
 if input->>'action'<>'resourceEnd' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if run_->'at' is distinct from at_ then return town.no('far');end if;
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 node_:=run_->'node';seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  if jsonb_typeof(answers_->i)<>'number' or (answers_->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=0.2+(seed_%61)::numeric/100;
  if (case when node_->>'game'='timing' then abs(expected_-(answers_->>i)::numeric)>0.09 else mod(floor(expected_*100),3)<>(answers_->>i)::numeric end) then won:=false;end if;
 end loop;
 if won then for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;end if;
 got:=case when won then r->'got' else '[]'::jsonb end;after_:=town.stow_all(p||jsonb_build_object('bag',bag),got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'resource',null,'got',got,'passed',case when won then 3 else 0 end,'left',used->'left','purse',town.spend(used->'purse',3,t)||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',null)));
end $$;
revoke all on function town.reward_resource_recipe(text,text),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
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
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingTreeHive','thingCrystalRepair','charmGemColor']) as v210_verified;


-- ===== v211_a_light_that_remembers_the_colours.sql =====
-- v211: a private equipment bond can offer one correction within the same gem-colour batch.
-- Run after v210 with the matching site. Safe to run twice; no automatic discoveries or rewards.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.combo_rules()'::regprocedure),chr(13),'')) not in ('d2388128ebdf48ffa9c9cbc26eec05c0','a68c61367a128b2c4e413fcbbb819fea') then raise exception 'Private rules changed: rebuild v211 on current text';end if;
 if md5(replace(pg_get_functiondef('town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('919e33e35c89e7758cbe30802cdf3299','306b74c996661c46a2720370d76f9997') then raise exception 'Resource activity changed: rebuild v211 on current text';end if;
end $guard$;
create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select '[{"cap":3,"cue":"water","key":"SC13","does":{"en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond.","th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง"},"name":{"en":"A thread home","th":"สายใยพากลับ"},"pool":"rescue","version":1,"requires":["charmFloat","charmLine","famOtter"]},{"cap":3,"cue":"water","key":"SC01","does":{"en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day.","th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง"},"name":{"en":"The otter remembers","th":"นากจำทางน้ำ"},"pool":"rescue","version":1,"requires":["charmFloat","famOtter"]},{"cue":"wood","key":"SC02","does":{"en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence.","th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว"},"name":{"en":"The grain''s rhythm","th":"จังหวะของเนื้อไม้"},"pool":"notch","version":1,"requires":["charmEchoAxe","famWoodpecker"]},{"cue":"echo","key":"SC03","does":{"en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence.","th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง"},"name":{"en":"Light hears hollows","th":"แสงฟังโพรง"},"pool":"cavity","version":1,"requires":["charmMinerLamp","famBat"]},{"cue":"echo","key":"SC11","does":{"en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence.","th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน"},"name":{"en":"A song under stone","th":"เพลงใต้หิน"},"pool":"echo","version":1,"requires":["charmMinerLamp","famWoodpecker"]},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}}]'::jsonb $rules$;
CREATE OR REPLACE FUNCTION town.reward_resource(p jsonb, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'resource';kind_ text;gift_ text;r jsonb;need jsonb;bag jsonb:=p->'bag';after_ jsonb;used jsonb;seed_ bigint;node_ jsonb;expected_ numeric;answers_ jsonb:=input->'answers';won boolean:=true;got jsonb;at_ jsonb:=input->'at';i integer;target_ text;chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];
begin
 if input->>'action'='resourceBegin' then
  kind_:=input->>'kind';r:=town.reward_resource_recipe(kind_,input->>'recipe');
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 else
  if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  kind_:=run_->>'kind';r:=town.reward_resource_recipe(kind_,run_->>'recipe');
 end if;
 gift_:=case kind_ when 'hive' then 'thingTreeHive' when 'repair' then 'thingCrystalRepair' when 'color' then 'charmGemColor' end;
 if gift_ is null or not town.gift_works(p,gift_) or r is null then return town.no('none');end if;
 if input->>'action'='resourceCancel' then return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',null)));end if;
 if kind_='hive' then
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') s where greatest(abs((s->>1)::numeric-(at_->>0)::numeric),abs((s->>2)::numeric-(at_->>1)::numeric))<=8) then return town.no('far');end if;
 elsif not coalesce(sqrt(power((at_->>0)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>0)::numeric,2)+power((at_->>1)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>1)::numeric,2))<=(town.cat('forge')->'stand'->>'reach')::numeric,false) then return town.no('far');end if;
 for need in select value from jsonb_array_elements(r->'needs') loop
  if town.held(bag,need->>0)<(need->>1)::integer or exists(select 1 from jsonb_array_elements(bag) s where s->>'item'=need->>0 and case when jsonb_typeof(s)='object' then (s-'item'-'n')<>'{}'::jsonb else false end) then return town.no('none');end if;
 end loop;
 if input->>'action'='resourceBegin' then
  if kind_='color' then target_:=r->'got'->0->>0;if town.held(bag,target_)<1 and not (town.reward_minerals(p) ? chips[array_position(gems,target_)]) then return town.no('none');end if;end if;
  if town.used_of(p,gift_,t)>=(town.cat('gifts')->'uses'->gift_->>'n')::integer then return town.no('spent');end if;
  for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
  if town.stow_all(p||jsonb_build_object('bag',bag),r->'got') is null then return town.no('full');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  node_:=jsonb_build_object('at',at_,'game',case when kind_='repair' then 'timing' else 'order' end,'seed',seed_);
  run_:=jsonb_build_object('id',request,'kind',kind_,'recipe',input->>'recipe','at',at_,'node',node_,'began',t,'until',t+90000,'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',run_)));
 end if;
 if input->>'action'<>'resourceEnd' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if run_->'at' is distinct from at_ then return town.no('far');end if;
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 node_:=run_->'node';seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  if jsonb_typeof(answers_->i)<>'number' or (answers_->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=0.2+(seed_%61)::numeric/100;
  if (case when node_->>'game'='timing' then abs(expected_-(answers_->>i)::numeric)>0.09 else mod(floor(expected_*100),3)<>(answers_->>i)::numeric end) then won:=false;end if;
 end loop;

 if not won and kind_='color' and not coalesce((run_->>'correctionUsed')::boolean,false) and run_->>'loadout'=town.combo_loadout(p)
  and town.used_of(p,gift_,t)<(town.cat('gifts')->'uses'->gift_->>'n')::integer then
  used:=town.combo_grant(p,'SC15','color:'||(run_->>'id'),t,'{}'::jsonb);
  if used->'ok'='true'::jsonb then
   run_:=run_||jsonb_build_object('began',t,'correctionUsed',true);
   return jsonb_build_object('ok',true,'resource',run_,'correction',true,'combo',used->'effect','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',run_)));
  end if;
 end if;
 if won then for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;end if;
 got:=case when won then r->'got' else '[]'::jsonb end;after_:=town.stow_all(p||jsonb_build_object('bag',bag),got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'resource',null,'got',got,'passed',case when won then 3 else 0 end,'left',used->'left','purse',town.spend(used->'purse',3,t)||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',null)));
end $function$
;
revoke all on function town.combo_rules(),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('rules_private',not has_function_privilege('authenticated','town.combo_rules()','EXECUTE'),'helper_private',not has_function_privilege('authenticated','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE')) as v211_verified;


-- ===== v212_a_bell_for_fish_we_have_met.sql =====
-- v212: target a known nonlegendary fish within the unchanged eligible cast pool.
-- Run after v211 with the matching site. Rerunnable; no free bait or automatic claims.
-- Two calls/day, three eligible casts/call, thirty-minute expiry. Stardust preserves charges.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('96ea55e2038e9d6da64588aaca70c682','b503a689b15d869ccb91d8c2ad56c739') then raise exception 'Action changed: rebuild v212 on current text';end if;
 if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('ddd0a5998b1091461dc17145471260bf','3c5a58198bd036c47eb5c8ba63ae01fe') then raise exception 'Action changed: rebuild v212 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingSchoolBell":{"kind":"thing","line":"fishing","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingSchoolBell":{"n":2,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_school_start(p jsonb,fish_ text,odds_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare active_ jsonb:=p->'professionRewards'->'school';used jsonb;school_ jsonb;
begin
 if not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->fish_ is null or town.cat('fish')->fish_->>'tier'='legend'
  or coalesce((p->'best'->>fish_)::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 if coalesce(active_,'null'::jsonb)<>'null'::jsonb and (active_->>'left')::integer>0 and (active_->>'until')::bigint>t then return town.no('none');end if;
 used:=town.gift_use(p,'thingSchoolBell',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 school_:=jsonb_build_object('fish',fish_,'left',3,'until',t+1800000);
 return jsonb_build_object('ok',true,'school',school_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_)));
end $$;
create or replace function town.reward_school_weights(p jsonb,odds_ jsonb,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare school_ jsonb:=p->'professionRewards'->'school';weighted_ jsonb;total_ double precision;
begin
 if coalesce(star_,false) or coalesce(school_,'null'::jsonb)='null'::jsonb or (school_->>'left')::integer<1 or t>=(school_->>'until')::bigint or not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->(school_->>'fish') is null or town.cat('fish')->(school_->>'fish')->>'tier'='legend'
  or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=school_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision*case when o->>'what'=school_->>'fish' then 3 else 1 end) order by ord) into weighted_ from jsonb_array_elements(odds_) with ordinality a(o,ord);
 select sum((o->>'p')::double precision) into total_ from jsonb_array_elements(weighted_) o;
 if total_ is null or total_<=0 then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision/total_) order by ord) into weighted_ from jsonb_array_elements(weighted_) with ordinality a(o,ord);
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_||jsonb_build_object('left',(school_->>'left')::integer-1))),'odds',weighted_);
end $$;
-- Identical regular-cast habitat/sky/sign/pattern/wariness/forged-rod filters; no full pool is returned to the player.
create or replace function town.reward_school_pool(p jsonb,me uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;deep_ jsonb:=town.cat('fishing')->'places'->(x::text||','||y::text);water_ jsonb:=town.cat('fishing')->'waters'->(x::text||','||y::text);
 habitat_ text:=coalesce(water_->>'habitat','town');current_ text:=coalesce(input->>'current',water_->>'current','eddy');bait_ text:=input->>'bait';sg jsonb:=town.cat('fishing')->'signs';signs_ text[];under_ jsonb;odds_ jsonb;pattern_ jsonb;rod_ jsonb;
begin
 if deep_ is null or current_ not in ('eddy','run','shelter') or (habitat_='town' and current_<>'eddy') or (habitat_='pool' and current_='run') or town.hook_bait(p,bait_)->'ok' is distinct from 'true'::jsonb then return '[]'::jsonb;end if;
 signs_:=town.signs_of(t,town.stamina_of(p,t)<=0,(select count(*)::integer from public.town_lines l where l.member_id<>me and (l.doc->>'cast_at')::bigint>t-(sg->>'lately')::bigint*1000),town.wet_ms(t-(sg->>'after')::bigint*60000,t),town.raining(t));
 under_:=town.under_orb(town.orb_of(p,t),extract(hour from to_timestamp(t/1000.0) at time zone 'Asia/Bangkok')::integer,town.raining(t),signs_);
 odds_:=town.river_odds(bait_,(under_->>'hour')::integer,(under_->>'rain')::boolean,town.has_buff(p,t,'lucky'),not deep_::boolean,array(select jsonb_array_elements_text(under_->'signs')),town.buff_by(p,t,'lucky'),habitat_,current_);
 pattern_:=town.river_pattern(p,bait_,x,y,current_,t);if habitat_<>'town' then odds_:=town.river_pattern_odds(odds_,(pattern_->>'n')::integer);end if;
 if town.is_wary(p,t) then odds_:=town.sift(odds_,array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')));end if;
 rod_:=town.rod_held(p);if rod_ is not null then odds_:=town.rarer(odds_,(town.rod_fx(rod_)->>'rare')::double precision);end if;
 return odds_;
end $$;
revoke all on function town.reward_school_start(jsonb,text,jsonb,bigint),town.reward_school_weights(jsonb,jsonb,boolean,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text := town.orb_of(purse, now_);
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$
;
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_school_weights(jsonb,jsonb,boolean,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'thingSchoolBell') as v212_verified;


-- ===== v213_a_lift_to_the_floor_we_worked.sql =====
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


-- ===== v214_a_branch_only_after_the_vein_pays.sql =====
-- v214: correctly read and paid main veins expose one bounded optional branch.
-- Run after v213 with the matching site. Rerunnable; no automatic claims or new shared spawns.
-- Charm must be worn at opening/result; three attempts/day, three extra stamina, one mineral choice.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('64fb11604bf41464dd639f9f860ca5d0','37d8276bae0466bbe7f4e16f777e1a4e') then raise exception 'Action changed: rebuild v214 on current text';end if;
 if md5(replace(pg_get_functiondef('town.vein_end(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('14ca7f971e623c71060a699a5365994a','dec5e67fb43a3f9e5ec7718b90ad689a') then raise exception 'Action changed: rebuild v214 on current text';end if;
 if md5(replace(pg_get_functiondef('town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('306b74c996661c46a2720370d76f9997','6d9fc89efc465bff2aa5372d3a1f561d') then raise exception 'Action changed: rebuild v214 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmBranchVein":{"kind":"charm","line":"mining","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmBranchVein":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_vein_key(v jsonb)
returns text language sql immutable set search_path='' as $$select concat_ws(':',v->>'f',v->>'rock',v->>'turn',v->>'seed')$$;
create or replace function town.reward_vein_site(after_ jsonb,before_ jsonb,v jsonb,at_ jsonb,day_ integer)
returns jsonb language sql stable set search_path='' as $$
 select case when town.gift_works(before_,'charmBranchVein') then after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('veinSite',jsonb_build_object('key',town.reward_vein_key(v),'floor',v->'f','at',at_,'day',day_))) else after_ end
$$;
create or replace function town.reward_branch_source(after_ jsonb,before_ jsonb,v jsonb,ore_ integer,gems_ integer,choice_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ jsonb:=before_->'professionRewards'->'veinSite';b jsonb;
begin
 if not town.gift_works(before_,'charmBranchVein') or site_ is null or site_->>'key' is distinct from town.reward_vein_key(v) or (site_->>'day')::integer<>town.day_of(t)
  or choice_ is null or (choice_->>'echo')::integer<>(case when abs((v->>'seed')::numeric)%2=1 then 1 else -1 end) or ore_+gems_<=0 or before_->'professionRewards'->'resource'->>'kind'='branch' then return after_;end if;
 b:=site_||jsonb_build_object('seed',mod(abs(trunc((v->>'seed')::numeric)),4294967296),'ore',case when ore_>0 then town.mine_ore((v->>'f')::integer) end,
  'crystal',case when gems_>0 and v->'gem'<>'null'::jsonb then town.cat('forge')->'gems'->(v->>'gem')->>'chip' end,'until',t+180000);
 return after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('branch',b));
end $$;
create or replace function town.reward_branch_resource(p jsonb,request uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=p->'professionRewards'->'branch';run_ jsonb:=p->'professionRewards'->'resource';kind_ text:=input->>'action';recipe_ text;item_ text;at_ jsonb:=input->'at';
 seed_ bigint;node_ jsonb;g jsonb;used jsonb;after_ jsonb;got_ jsonb;answers_ jsonb;expected_ jsonb;won_ boolean;ord_ integer;value_ numeric;
begin
 if not town.gift_works(p,'charmBranchVein') then return town.no('none');end if;
 if kind_='resourceCancel' then
  if run_ is null or run_->>'kind'<>'branch' or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',p->'professionRewards'||jsonb_build_object('resource',null)));
 end if;
 recipe_:=case when kind_='resourceBegin' then input->>'recipe' else run_->>'recipe' end;
 item_:=s->>recipe_;
 if s is null or recipe_ is null or recipe_ not in ('ore','crystal') or item_ is null then return town.no('none');end if;
 if kind_='resourceBegin' and coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 if kind_='resourceEnd' then
  if run_ is null or run_->>'id' is distinct from input->>'run' or run_->>'kind'<>'branch' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
  if at_ is distinct from run_->'at' then return town.no('far');end if;
 end if;
 if (s->>'day')::integer<>town.day_of(t) or t>(s->>'until')::bigint or town.cave_floor_at((at_->>0)::integer,(at_->>1)::integer)<>(s->>'floor')::integer
  or not town.cave_floor_tile(town.cave_laid(town.day_of(t),(s->>'floor')::integer),(s->>'floor')::integer,(at_->>0)::integer,(at_->>1)::integer)
  or greatest(abs((at_->>0)::integer-(s->'at'->>0)::integer),abs((at_->>1)::integer-(s->'at'->>1)::integer))>3 then return town.no('far');end if;
 if kind_='resourceBegin' then
  if town.used_of(p,'charmBranchVein',t)>=3 then return town.no('spent');end if;
  if town.stow_all(p,jsonb_build_array(jsonb_build_array(item_,case when recipe_='ore' then 4 else 3 end))) is null then return town.no('full');end if;
  node_:=jsonb_build_object('at',at_,'game','timing','seed',s->'seed');
  run_:=jsonb_build_object('id',request,'kind','branch','recipe',recipe_,'at',at_,'node',node_,'began',t,'until',least(t+90000,(s->>'until')::bigint),'loadout',town.combo_loadout(p),'source',s->'key');
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',p->'professionRewards'||jsonb_build_object('resource',run_)));
 end if;
 if kind_<>'resourceEnd' or run_->>'source' is distinct from s->>'key' then return town.no('none');end if;
 answers_:=input->'answers';
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(answers_) a where jsonb_typeof(a)<>'number' or (a::text)::numeric not between 0 and 1) then return town.no('none');end if;
 seed_:=(run_->'node'->>'seed')::bigint;won_:=true;
 for ord_ in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;value_:=0.2+(seed_%61)::numeric/100;if abs((answers_->>ord_)::numeric-value_)>.09 then won_:=false;end if;end loop;
 got_:=case when won_ then jsonb_build_array(jsonb_build_array(item_,case when recipe_='ore' then 4 else 3 end)) else '[]'::jsonb end;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,'charmBranchVein',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'got',got_,'passed',case when won_ then 3 else 0 end,'left',used->'left','resource',null,'purse',town.spend(used->'purse',3::double precision,t)||jsonb_build_object('professionRewards',used->'purse'->'professionRewards'||jsonb_build_object('resource',null,'branch',null)));
end $$;
revoke all on function town.reward_vein_key(jsonb),town.reward_vein_site(jsonb,jsonb,jsonb,jsonb,integer),town.reward_branch_source(jsonb,jsonb,jsonb,integer,integer,jsonb,bigint),town.reward_branch_resource(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;

do $$ begin if to_regprocedure('town.mine_pay_v214(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.mine_pay_v214(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 declare did jsonb;begin
  did:=town.mine_pay_v213(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_visit(did->'purse',(p_go->>'floor')::integer));end if;
  return did;
 end $function$
$copy$;end if;end $$;
create or replace function town.mine_pay(p_purse jsonb,p_go jsonb,p_rock jsonb,p_struck jsonb,p_quake boolean,p_own boolean,p_word text)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb;begin
  did:=town.mine_pay_v214(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
  if did->'ok'='true'::jsonb and did->'done'='true'::jsonb and coalesce(did->'vein','null'::jsonb)<>'null'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_vein_site(did->'purse',p_purse,did->'vein',p_go->'at',(p_go->>'day')::integer));end if;
  return did;end $$;
do $$ begin if to_regprocedure('town.vein_end_v214(jsonb,jsonb,bigint)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.vein_end_v214(p_purse jsonb, p_go jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if p_go ? 'geology' and not town.rock_choice(p_go->'geology') then return town.no('none'); end if;
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null and coalesce(p_go->'geology'->>'focus','ore') <> 'crystal' then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  pick := town.mine_pick(p_purse);
  twin := case when jsonb_array_length(got_) > 0 and not twice and pick is not null then town.use_power(p_purse, pick, 'pkTwin', p_now) end;
  if coalesce((twin->>'ok')::boolean, false) then
    select jsonb_agg(jsonb_build_array(g.v->>0, (g.v->>1)::numeric * town.opt_n('pkTwin', 'times', pick)) order by g.ord) into got_
      from jsonb_array_elements(got_) with ordinality g(v, ord);
  end if;
  if p_go ? 'geology' then got_ := got_ || town.geological_yield(vein_,p_go->'geology',ore,jsonb_array_length(p_go->'gems'),p_purse); end if;
  stowed := town.stow_all(case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else p_purse end, got_);
  if stowed is null then return town.no('full'); end if;
  after_ := stowed;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', false, 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      'null'::jsonb)));
end;
$function$
$copy$;end if;end $$;
create or replace function town.vein_end(p_purse jsonb,p_go jsonb,p_now bigint)
 returns jsonb language plpgsql stable set search_path='' as $$declare did jsonb;v jsonb:=town.mine_of(p_purse)->'vein';begin
  did:=town.vein_end_v214(p_purse,p_go,p_now);
  if did->'ok'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.reward_branch_source(did->'purse',p_purse,v,(p_go->>'ore')::integer,jsonb_array_length(p_go->'gems'),p_go->'geology',p_now));end if;
  return did;end $$;
do $$ begin if to_regprocedure('town.reward_resource_v214(jsonb,uuid,jsonb,bigint,bigint)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.reward_resource_v214(p jsonb, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'resource';kind_ text;gift_ text;r jsonb;need jsonb;bag jsonb:=p->'bag';after_ jsonb;used jsonb;seed_ bigint;node_ jsonb;expected_ numeric;answers_ jsonb:=input->'answers';won boolean:=true;got jsonb;at_ jsonb:=input->'at';i integer;target_ text;chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];
begin
 if input->>'action'='resourceBegin' then
  kind_:=input->>'kind';r:=town.reward_resource_recipe(kind_,input->>'recipe');
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
 else
  if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run' then return town.no('none');end if;
  kind_:=run_->>'kind';r:=town.reward_resource_recipe(kind_,run_->>'recipe');
 end if;
 gift_:=case kind_ when 'hive' then 'thingTreeHive' when 'repair' then 'thingCrystalRepair' when 'color' then 'charmGemColor' end;
 if gift_ is null or not town.gift_works(p,gift_) or r is null then return town.no('none');end if;
 if input->>'action'='resourceCancel' then return jsonb_build_object('ok',true,'resource',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',null)));end if;
 if kind_='hive' then
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') s where greatest(abs((s->>1)::numeric-(at_->>0)::numeric),abs((s->>2)::numeric-(at_->>1)::numeric))<=8) then return town.no('far');end if;
 elsif not coalesce(sqrt(power((at_->>0)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>0)::numeric,2)+power((at_->>1)::numeric+0.5-(town.cat('forge')->'stand'->'at'->>1)::numeric,2))<=(town.cat('forge')->'stand'->>'reach')::numeric,false) then return town.no('far');end if;
 for need in select value from jsonb_array_elements(r->'needs') loop
  if town.held(bag,need->>0)<(need->>1)::integer or exists(select 1 from jsonb_array_elements(bag) s where s->>'item'=need->>0 and case when jsonb_typeof(s)='object' then (s-'item'-'n')<>'{}'::jsonb else false end) then return town.no('none');end if;
 end loop;
 if input->>'action'='resourceBegin' then
  if kind_='color' then target_:=r->'got'->0->>0;if town.held(bag,target_)<1 and not (town.reward_minerals(p) ? chips[array_position(gems,target_)]) then return town.no('none');end if;end if;
  if town.used_of(p,gift_,t)>=(town.cat('gifts')->'uses'->gift_->>'n')::integer then return town.no('spent');end if;
  for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
  if town.stow_all(p||jsonb_build_object('bag',bag),r->'got') is null then return town.no('full');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  node_:=jsonb_build_object('at',at_,'game',case when kind_='repair' then 'timing' else 'order' end,'seed',seed_);
  run_:=jsonb_build_object('id',request,'kind',kind_,'recipe',input->>'recipe','at',at_,'node',node_,'began',t,'until',t+90000,'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'resource',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('resource',run_)));
 end if;
 if input->>'action'<>'resourceEnd' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if run_->'at' is distinct from at_ then return town.no('far');end if;
 if jsonb_typeof(answers_) is distinct from 'array' or jsonb_array_length(answers_)<>3 then return town.no('none');end if;
 node_:=run_->'node';seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  if jsonb_typeof(answers_->i)<>'number' or (answers_->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=0.2+(seed_%61)::numeric/100;
  if (case when node_->>'game'='timing' then abs(expected_-(answers_->>i)::numeric)>0.09 else mod(floor(expected_*100),3)<>(answers_->>i)::numeric end) then won:=false;end if;
 end loop;

 if not won and kind_='color' and not coalesce((run_->>'correctionUsed')::boolean,false) and run_->>'loadout'=town.combo_loadout(p)
  and town.used_of(p,gift_,t)<(town.cat('gifts')->'uses'->gift_->>'n')::integer then
  used:=town.combo_grant(p,'SC15','color:'||(run_->>'id'),t,'{}'::jsonb);
  if used->'ok'='true'::jsonb then
   run_:=run_||jsonb_build_object('began',t,'correctionUsed',true);
   return jsonb_build_object('ok',true,'resource',run_,'correction',true,'combo',used->'effect','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',run_)));
  end if;
 end if;
 if won then for need in select value from jsonb_array_elements(r->'needs') loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;end if;
 got:=case when won then r->'got' else '[]'::jsonb end;after_:=town.stow_all(p||jsonb_build_object('bag',bag),got);if after_ is null then return town.no('full');end if;
 used:=town.gift_use(after_,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'resource',null,'got',got,'passed',case when won then 3 else 0 end,'left',used->'left','purse',town.spend(used->'purse',3,t)||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',null)));
end $function$
$copy$;end if;end $$;
create or replace function town.reward_resource(p jsonb,request uuid,input jsonb,t bigint,p_seed bigint default null)
 returns jsonb language plpgsql stable set search_path='' as $$begin
  if input->>'action'='resourceBegin' and input->>'kind'='branch' or input->>'action' in ('resourceEnd','resourceCancel') and p->'professionRewards'->'resource'->>'kind'='branch' then return town.reward_branch_resource(p,request,input,t);end if;
  return town.reward_resource_v214(p,request,input,t,p_seed);end $$;
revoke all on function town.mine_pay_v214(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.vein_end_v214(jsonb,jsonb,bigint),town.reward_resource_v214(jsonb,uuid,jsonb,bigint,bigint),town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.vein_end(jsonb,jsonb,bigint),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_branch_resource(jsonb,uuid,jsonb,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'charmBranchVein') as v214_verified;


-- ===== v217_the_guardian_reads_leaves_and_roots.sql =====
-- v217: the forest guardian reads two parts through two manual games.
-- Run after v214 and v216 with the matching site. Running it again is safe.
-- Five perfect plants/day, two ordinary stamina costs, one shared gathering claim.
-- Misses keep the ordinary leaf result; full bags never pay a partial result.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)'::regprocedure),chr(13),'')) not in ('06f018a52e965b83ffef36e99ffbcd3c','4e633176ff6442b08096f2b011d9b87a') then raise exception 'Gathering changed: rebuild v217 on current definitions';end if;
if md5(replace(pg_get_functiondef('public.town_gather(integer,integer,integer,jsonb)'::regprocedure),chr(13),'')) not in ('e2cab894733949fc4bba6c3dd4d5487b','422b4c4fc8e765e8423088d061e2882d') then raise exception 'Public gathering changed: rebuild v217 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famForestGuardian":{"kind":"familiar","line":"forest","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famForestGuardian":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.gather_part_v217(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.gather_part_v217(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_part text, p_with text, p_lost boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 f jsonb:=town.cat('forest'); k jsonb:=town.cat('forest_parts'); spot jsonb:=town.wild_place(f,p_spot);
 rule jsonb:=town.wild_rule(f,spot->>0); item text; protected boolean; forgiven integer;
 n integer; book jsonb:=coalesce(p_purse->'forestPartsBook','[]'::jsonb); entry text; next_ bigint;
 rest jsonb;
begin
 if p_has is null or p_has='null'::jsonb or spot is null then return town.no('none'); end if;
 if coalesce(p_mine,false) then return town.no('had'); end if;
 if coalesce(p_taken,0)>=(rule->>'shares')::integer then return town.no('bare'); end if;
 if p_x is null or p_y is null or greatest(abs(p_x-(spot->>1)::integer),abs(p_y-(spot->>2)::integer))>town.wild_reach(p_purse,rule->>'how',p_now) then return town.no('far'); end if;
 if p_part is null or p_part not in ('leaf','root') or town.wild_secret(f,p_spot) or p_with is not null or coalesce(p_lost,false) then return town.no('none'); end if;
 item:=k->'parts'->(spot->>0)->>p_part;
 if item is null then return town.no('none'); end if;
 if p_part='root' and town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool'); end if;
 protected:=p_part='leaf' and town.held(town.carried_bag(p_purse),'pruningKnife')>0
   or item='forestLichen' and town.held(town.carried_bag(p_purse),'specimenPress')>0
   or item in ('berryPip','mushroomSpores') and town.held(town.carried_bag(p_purse),'seedSieve')>0;
 forgiven:=case when town.held(town.carried_bag(p_purse),'forageBasket')>0 then 1 else 0 end;
 n:=greatest(1,(k->>p_part)::integer+case when protected then (k->>'bonus')::integer else 0 end-greatest(0,floor(coalesce(p_misses,0)+coalesce(p_wrong,0))::integer-forgiven));
 if town.room(p_purse->'bag',item)<n then return town.no('full'); end if;
 entry:=(spot->>0)||':'||p_part||':'||item;
 if not book ? entry then book:=book||to_jsonb(entry); end if;
 if p_part='root' then
  next_:=((p_has->>'turn')::bigint+1)*(rule->>'every')::bigint*60000-floor(town.roll('phase',p_spot)*(rule->>'every')::double precision)::bigint*60000;
  rest:=jsonb_build_object('from',next_,'until',next_+60000*case when town.held(town.carried_bag(p_purse),'rootSpade')>0 then (k->>'spadeMinutes')::bigint else (k->>'restMinutes')::bigint end);
 end if;
 return jsonb_build_object('ok',true,'got',jsonb_build_array(jsonb_build_array(item,n)),
   'purse',town.spend(p_purse,(rule->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(p_purse->'bag',item,n),'forestPartsBook',book))
   ||case when rest is not null then jsonb_build_object('rest',rest) else '{}'::jsonb end;
end $function$
$copy$;end if;end $$;
create or replace function town.gather_part(p_purse jsonb,p_spot integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_wrong double precision,p_now bigint,p_part text,p_with text,p_lost boolean)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare f jsonb:=town.cat('forest');k jsonb:=town.cat('forest_parts');spot jsonb:=town.wild_place(f,p_spot);a jsonb;b jsonb;used_ jsonb;
 begin
  if p_part is distinct from 'paired' then return town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,p_part,p_with,p_lost);end if;
  if not town.gift_works(p_purse,'famForestGuardian') or spot is null or k->'parts'->(spot->>0)->>'leaf' is null or k->'parts'->(spot->>0)->>'root' is null or not coalesce(p_misses>=0 and p_wrong>=0,false) or p_misses='Infinity'::double precision or p_wrong='Infinity'::double precision or p_misses='NaN'::double precision or p_wrong='NaN'::double precision then return town.no('none');end if;
  used_:=town.gift_use(p_purse,'famForestGuardian',p_now);if not coalesce((used_->>'ok')::boolean,false) then return town.no('none');end if;
  if town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool');end if;
  a:=town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,'leaf',p_with,p_lost);
  if not coalesce((a->>'ok')::boolean,false) or p_misses+p_wrong<>0 then return a;end if;
  b:=town.gather_part_v217(a->'purse',p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,0,0,p_now,'root',p_with,p_lost);
  if not coalesce((b->>'ok')::boolean,false) then return b;end if;
  used_:=town.gift_use(b->'purse','famForestGuardian',p_now);
  return b || jsonb_build_object('purse',used_->'purse','got',(a->'got')||(b->'got'));
 end $$;
CREATE OR REPLACE FUNCTION public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  with_ text := case when jsonb_typeof(went->'with') = 'string' then went->>'with' end;
  lost_ boolean := coalesce(case when jsonb_typeof(went->'lost') = 'boolean' then (went->>'lost')::boolean end, false);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  -- Paired mastery uses raw mistakes, before the normal game rounds them down.
  if went->>'part'='paired' then
    if jsonb_typeof(went->'misses') is distinct from 'number' or jsonb_typeof(went->'wrong') is distinct from 'number' or (went->>'misses')::numeric<0 or (went->>'wrong')::numeric<0 then return town.answer(me,town.no('none'));end if;
    misses:=least((went->>'misses')::numeric,(f->>'misses')::integer);
    wrong:=least((went->>'wrong')::numeric,(f->>'misses')::integer);
  end if;
  if went->>'part' is not null and went->>'part'<>'whole' then
    did:=town.gather_part(purse,p_spot,has,(t->>'n')::integer,(t->>'mine')::boolean,town.hand_of(purse),p_x,p_y,misses,wrong,now_,went->>'part',with_,lost_);
  else
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  end if;
  if (did->>'ok')::boolean then
    if did ? 'rest' then
      insert into public.town_forest_rest(spot,begins,ends) values(p_spot,(did->'rest'->>'from')::bigint,(did->'rest'->>'until')::bigint)
        on conflict on constraint town_forest_rest_pkey do update set begins=case when town_forest_rest.ends<=now_ then excluded.begins else least(town_forest_rest.begins,excluded.begins) end,ends=greatest(town_forest_rest.ends,excluded.ends);
    end if;
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', did->'got'->0->>0, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', town.wild_rule(f, spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, town.wild_rule(f, spot->>0)->>'how', now_) then jsonb_build_object('by', 'famSquirrel', 'left',
                (town.cat('gifts')->'uses'->'famSquirrel'->>'n')::integer - town.used_of(did->'purse', 'famSquirrel', now_))
              when with_ = 'famPiglet' and town.wild_rule(f, spot->>0)->>'how' = 'dig' and not town.wild_secret(f, p_spot) then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end
      || case when town.wild_secret(f, p_spot) then jsonb_build_object('secret', true) else '{}'::jsonb end);
    end if;
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$
;
revoke all on function town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean),town.gather_part_v217(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)','EXECUTE'),'guardian_ready',town.cat('gifts')->'gifts' ? 'famForestGuardian') as v217_verified;


-- ===== v218_a_second_part_from_a_perfect_trunk.sql =====
-- v218: choose a second part before a perfectly read and played trunk.
-- Run after v217 with the matching site. Running it again is safe.
-- Five trunks/day, first trunk only; the knife and listener share two parts/trunk.
-- Original logs, costs, training, companion and gem rules remain in the wrapped deed.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('2274eab11d83eb7d4ce616f9b364ab3a','ee3235db50a98be59d7b05fe7266178c') then raise exception 'Felling changed: rebuild v218 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmListening":{"kind":"charm","line":"felling","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmListening":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.fell_v218(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_v218(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare did jsonb;f jsonb;p jsonb;
begin
 did:=town.fell_v207(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 and town.gift_works(p_purse,'thingForesterKnife') and p_went->'grain' is not null then
  f:=did->'felled'->0;
  if f->>'quality' in ('rough','clear','heart') then
   p:=did->'purse';p:=p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',jsonb_build_object('key','tree:'||(f->>'id')||':'||p_now,'tree',f->'id','at',jsonb_build_array(p_x,p_y),'excluded',p_went->'grain'->'part','quality',f->'quality','until',p_now+180000)));
   did:=jsonb_set(did,'{purse}',p);
  end if;
 end if;
 return did;
end $function$
$copy$;end if;end $$;
create or replace function town.reward_listening(before_ jsonb,did jsonb,went jsonb,t bigint)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare grain jsonb:=went->'grain';second_ text:=grain->>'second';f jsonb:=did->'felled'->0;used_ jsonb;got_ jsonb;home jsonb;state_ jsonb;
 begin
  if did->'ok' is distinct from 'true'::jsonb or jsonb_array_length(did->'felled')=0 or second_ is null then return did;end if;
  if second_ not in ('bark','sap','seed') or second_=grain->>'part' then return town.no('none');end if;
  if coalesce((did->>'one')::boolean,false) or did->'through' is distinct from 'true'::jsonb or town.tree_elder(town.tree_of((f->>'id')::integer)) or went->'misses' is distinct from '0'::jsonb or town.wood_quality((f->>'id')::integer,grain,0,'{"bag":[]}'::jsonb,t)<>'heart' then return did;end if;
  used_:=town.gift_use(did->'purse','charmListening',t);if used_->'ok' is distinct from 'true'::jsonb then return did;end if;
  got_:=town.wood_yield(false,second_,'heart',before_);home:=town.stow_all(used_->'purse',got_);if home is null then return town.no('full');end if;
  if home ? 'professionRewards' then state_:=home->'professionRewards';home:=home||jsonb_build_object('professionRewards',state_||jsonb_build_object('extraction',null,'run',null));end if;
  return jsonb_set(did,'{felled,0}',f||jsonb_build_object('got',(f->'got')||got_))||jsonb_build_object('purse',home,'got',(did->'got')||got_);
 end $$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
 returns jsonb language plpgsql stable set search_path='' as $$
 begin
  if p_went->'grain' ? 'second' and (jsonb_typeof(p_went->'grain'->'second') is distinct from 'string' or p_went->'grain'->>'second' not in ('bark','sap','seed') or p_went->'grain'->>'second'=p_went->'grain'->>'part') then return town.no('none');end if;
  return town.reward_listening(p_purse,town.fell_v218(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who),p_went,p_now);
 end $$;
revoke all on function town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.fell_v218(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.reward_listening(jsonb,jsonb,jsonb,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_listening(jsonb,jsonb,jsonb,bigint)','EXECUTE'),'listener_ready',town.cat('gifts')->'gifts' ? 'charmListening') as v218_verified;


-- ===== v219_three_private_rooms_beneath_a_worked_floor.sql =====
-- v219: one three-room core expedition/day; route-specific costs and finite loot.
-- Run after v218 with the matching site. Rerunnable; no cave resets or automatic inventory changes.
-- Known minerals and an exact worked floor; room choices survive misses and day boundaries.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('53e3cbc7629a28062cb2bbe0d692a390','3b54cbd6a53455fc8c7edb42d3ce09b2') then raise exception 'Reward dispatcher changed: rebuild v219 on current definitions';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCoreSpade":{"kind":"thing","line":"mining","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCoreSpade":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_core(p jsonb,me uuid,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'core';room_ jsonb;challenge_ jsonb;
 f integer;at_ jsonb:=input->'at';seed_ bigint;used_ jsonb;known_ jsonb;chips_ jsonb;route_ text;mineral_ text;game_ text;
 node_ jsonb;expected_ jsonb:='[]'::jsonb;target_ numeric;i integer;won_ boolean:=true;got_ jsonb:='[]'::jsonb;
 cost_ integer;n_ integer;next_ integer;after_ jsonb;completed_ boolean;
begin
 if input->>'action'='coreBegin' then
  if jsonb_typeof(input->'floor') is distinct from 'number' or (input->>'floor')::numeric<>floor((input->>'floor')::numeric) or (input->>'floor')::numeric not between 1 and 30 then return town.no('none');end if;
  f:=(input->>'floor')::integer;
  if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null or coalesce(run_,'null'::jsonb)<>'null'::jsonb or not (
   coalesce(state_->'visited','[]'::jsonb) @> jsonb_build_array(f) or town.mine_of(p)->'rests' @> jsonb_build_array(f)
   or exists(select 1 from public.town_deeds d where d.member_id=me and d.what in ('mine','crystal','vein','hew') and d.n>0 and d.doc->>'floor'=f::text)) then return town.no('none');end if;
  if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingCoreSpade',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'floor',f,'seed',seed_,'began',t,'next',0,'known',town.reward_minerals(p),'room',null);
  after_:=town.reward_visit(used_->'purse',f);
  return jsonb_build_object('ok',true,'core',run_,'left',used_->'left','purse',after_||jsonb_build_object('professionRewards',after_->'professionRewards'||jsonb_build_object('core',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'core' then return town.no('none');end if;
 if input->>'action'='coreCancel' then return jsonb_build_object('ok',true,'core',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',null)));end if;
 if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null then return town.no('none');end if;
 f:=(run_->>'floor')::integer;next_:=(run_->>'next')::integer;known_:=run_->'known';room_:=run_->'room';
 if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
 select coalesce(jsonb_agg(to_jsonb(g.value->>'chip') order by m.ord),'[]'::jsonb) into chips_
  from jsonb_array_elements_text(town.cat('forge')->'elements') with ordinality m(id,ord)
  join lateral (select town.cat('forge')->'gems'->m.id value) g on true where known_ ? (g.value->>'chip');
 if input->>'action'='coreRoom' then
  route_:=input->>'route';
  if route_ is null or route_ not in ('ore','crystal','safe') or route_='ore' and not known_ ? town.mine_ore(f)
   or route_='crystal' and jsonb_array_length(chips_)=0 or coalesce(room_,'null'::jsonb)<>'null'::jsonb and room_->>'route'<>route_ then return town.no('none');end if;
  seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
  if coalesce(room_,'null'::jsonb)='null'::jsonb then
   mineral_:=case route_ when 'ore' then town.mine_ore(f) when 'crystal' then chips_->>((seed_%jsonb_array_length(chips_))::integer) else 'stone' end;
   game_:=case route_ when 'ore' then 'timing' when 'crystal' then 'order' else 'memory' end;
   room_:=jsonb_build_object('route',route_,'mineral',mineral_,'node',jsonb_build_object('at',at_,'seed',seed_,'game',game_),'challenge',null);
  end if;
  challenge_:=room_->'challenge';
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint or room_->'node'->'at' is distinct from at_ then
   challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);
   room_:=jsonb_set(room_,'{node,at}',at_);
  end if;
  room_:=room_||jsonb_build_object('challenge',challenge_);run_:=run_||jsonb_build_object('room',room_);
  return jsonb_build_object('ok',true,'core',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',run_)));
 end if;
 challenge_:=room_->'challenge';node_:=room_->'node';
 if input->>'action'<>'coreEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge'
  or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 if node_->'at' is distinct from at_ then return town.no('far');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;
  expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);
 end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 cost_:=case room_->>'route' when 'crystal' then 4 when 'ore' then 3 else 2 end;n_:=case when room_->>'route'='crystal' then 1 else 2 end;
 if won_ then got_:=jsonb_build_array(jsonb_build_array(room_->>'mineral',n_));end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=won_ and next_=2;
 run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won_ then 1 else 0 end,'room',case when won_ then 'null'::jsonb else room_||jsonb_build_object('challenge',null) end) end;
 return jsonb_build_object('ok',true,'core',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,cost_,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('core',run_)));
end $$;
revoke all on function town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
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
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint)','EXECUTE'),'core_ready',town.cat('gifts')->'gifts' ? 'thingCoreSpade') as v219_verified;


-- ===== v220_three_trunks_in_a_chosen_direction.sql =====
-- v220: directional domino, up to three real eligible trees, three chains/day.
-- Run after v219 with the matching site. Rerunnable; grove lock remains before purse access.
-- Hardest trunk's game, original per-tree costs, held targets, ordinary failure/full-bag semantics.
begin;
do $guard$ begin
if md5(replace(pg_get_functiondef('town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text)'::regprocedure),chr(13),'')) not in ('780147f91dbe13e15cb18d1453cce8f7', '36a0ffcbd743ead76ba106823fa39979') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('ee3235db50a98be59d7b05fe7266178c', 'ace75c7d307051d7085159f1a5b2690f') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
if md5(replace(pg_get_functiondef('public.town_fell_begin(integer,integer,integer)'::regprocedure),chr(13),'')) not in ('f38a589d8d33e220993697e1eb9900ae') then raise exception 'Felling changed: rebuild v220 on current definitions';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmDomino":{"kind":"charm","line":"felling","rank":5,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmDomino":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
do $$ begin if to_regprocedure('town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_group_v220(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint, p_me text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') then '[]'::jsonb else
    coalesce((select jsonb_agg(s.v order by s.far_, s.id) from (
      select w.v, town.tree_apart(w.v, p_first) as far_, (w.v->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') w(v)
       where (w.v->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w.v) and town.tree_apart(w.v, p_first) <= (c.k->'echo'->>'reach')::integer
         and town.axe_bites(p_axe, w.v) is null and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$function$
$copy$;end if;end $$;
do $$ begin if to_regprocedure('town.fell_v220(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)') is null then execute $copy$CREATE OR REPLACE FUNCTION town.fell_v220(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 begin
  if p_went->'grain' ? 'second' and (jsonb_typeof(p_went->'grain'->'second') is distinct from 'string' or p_went->'grain'->>'second' not in ('bark','sap','seed') or p_went->'grain'->>'second'=p_went->'grain'->>'part') then return town.no('none');end if;
  return town.reward_listening(p_purse,town.fell_v218(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who),p_went,p_now);
 end $function$
$copy$;end if;end $$;
create or replace function town.reward_domino_group(p jsonb,g jsonb,first_ jsonb,axe_ jsonb,t bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb:=jsonb_build_array(first_);from_ jsonb:=first_;next_ jsonb;dx integer;dy integer;i integer;
begin
 if jsonb_typeof(dir_) is distinct from 'array' or jsonb_array_length(dir_)<>2 or exists(select 1 from jsonb_array_elements(dir_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between -1 and 1) then return '[]'::jsonb;end if;
 dx:=(dir_->>0)::integer;dy:=(dir_->>1)::integer;
 if dx=0 and dy=0 or town.tree_elder(first_) or not town.gift_works(p,'charmDomino') or town.used_of(p,'charmDomino',t)>=3 then return '[]'::jsonb;end if;
 for i in 1..2 loop
  select w.v into next_ from jsonb_array_elements(town.cat('trees')->'wood') w(v)
   cross join lateral (select town.tree_apart(w.v,from_) n) d
   where not exists(select 1 from jsonb_array_elements(grp) a where a->0=w.v->0)
    and town.tree_grown(g,w.v,t) and d.n between 1 and 4
    and (w.v->>1)::integer-(from_->>1)::integer=dx*d.n and (w.v->>2)::integer-(from_->>2)::integer=dy*d.n
   order by d.n,(w.v->>0)::integer limit 1;
  if next_ is null or town.tree_elder(next_) or town.axe_bites(axe_,next_) is not null or town.tree_held(g,(next_->>0)::integer,t,me) then exit;end if;
  grp:=grp||jsonb_build_array(next_);from_:=next_;
 end loop;
 return grp;
end $$;
create or replace function town.fell_group(p_purse jsonb,p_grove jsonb,p_first jsonb,p_axe jsonb,p_now bigint,p_me text default null)
returns jsonb language plpgsql stable set search_path='' as $$ begin
 if p_purse ? 'dominoDirection' then return town.reward_domino_group(p_purse,p_grove,p_first,p_axe,p_now,p_me,p_purse->'dominoDirection');end if;
 return town.fell_group_v220(p_purse,p_grove,p_first,p_axe,p_now,p_me);
end $$;
create or replace function town.fell_domino_begin(p jsonb,g jsonb,tree_ integer,x integer,y integer,t bigint,seed_ bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb;
begin
 if town.tree_of(tree_) is null or town.axe_of(p) is null then return town.no('none');end if;
 grp:=town.reward_domino_group(p,g,town.tree_of(tree_),town.axe_of(p),t,me,dir_);
 if jsonb_array_length(grp)<2 then return town.no(case when town.used_of(p,'charmDomino',t)>=3 then 'spent' else 'none' end);end if;
 return town.fell_begin(p||jsonb_build_object('dominoDirection',dir_),g,tree_,x,y,t,seed_,me);
end $$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare go_ jsonb:=p_grove->'goes'->p_me;domino_ boolean;did jsonb;used_ jsonb;
begin
 domino_:=coalesce(go_ ? 'domino' and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree',false);
 if domino_ and (coalesce((p_went->>'one')::boolean,false) or not town.gift_works(p_purse,'charmDomino') or town.used_of(p_purse,'charmDomino',p_now)>=3) then return town.no('none');end if;
 did:=town.fell_v220(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmDomino',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return did;
end $$;
revoke all on function town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb),town.fell_domino_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text,jsonb),town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text),town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_fell_domino_begin(p_tree integer, p_x integer, p_y integer, p_direction jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  -- (the grove is held: of two who walk up to one tree at one moment, the second finds it held)
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, false);
  did := town.fell_domino_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text,p_direction);
  if (did->>'ok')::boolean then
    grove := town.fell_opened(grove, me::text, did->'trees', now_);
    grove:=jsonb_set(grove,array['goes',me::text,'domino'],p_direction);
    grove:=jsonb_set(grove,array['goes',me::text],(grove->'goes'->(me::text))||jsonb_build_object('comboLoadout',town.combo_loadout(purse),'comboTree',p_tree,'comboHints',did->'ask'->'grain'->'hints'));
    perform town.keep_thing('grove', grove);
  end if;
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return town.answer(me, (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$function$
;
revoke all on function town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text),town.fell_v220(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;
revoke all on function public.town_fell_domino_begin(integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.town_fell_domino_begin(integer,integer,integer,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)','EXECUTE'),'domino_ready',town.cat('gifts')->'gifts' ? 'charmDomino') as v220_verified;


-- ===== v221_echoes_along_the_falling_trunks.sql =====
-- v221: a private equipment bond projects actual eligible domino trunks and a blocker.
-- Run after v220 with the matching site. Rerunnable; no trees reserved, quota paid or gameplay played by preview.
begin;
do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('3b54cbd6a53455fc8c7edb42d3ce09b2','1e6064b1c20131a304f301b8470b3298') then raise exception 'Reward/combo definitions moved: rebuild v221';end if;
if md5(replace(pg_get_functiondef('town.combo_rules()'::regprocedure),chr(13),'')) not in ('a68c61367a128b2c4e413fcbbb819fea','1ae6e0434f5d7b69e9bf1a921f4ea437') then raise exception 'Reward/combo definitions moved: rebuild v221';end if;
end $guard$;
create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select '[{"cap":3,"cue":"water","key":"SC13","does":{"en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond.","th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง"},"name":{"en":"A thread home","th":"สายใยพากลับ"},"pool":"rescue","version":1,"requires":["charmFloat","charmLine","famOtter"]},{"cap":3,"cue":"water","key":"SC01","does":{"en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day.","th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง"},"name":{"en":"The otter remembers","th":"นากจำทางน้ำ"},"pool":"rescue","version":1,"requires":["charmFloat","famOtter"]},{"cue":"wood","key":"SC02","does":{"en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence.","th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว"},"name":{"en":"The grain''s rhythm","th":"จังหวะของเนื้อไม้"},"pool":"notch","version":1,"requires":["charmEchoAxe","famWoodpecker"]},{"cue":"echo","key":"SC03","does":{"en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence.","th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง"},"name":{"en":"Light hears hollows","th":"แสงฟังโพรง"},"pool":"cavity","version":1,"requires":["charmMinerLamp","famBat"]},{"cue":"echo","key":"SC11","does":{"en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence.","th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน"},"name":{"en":"A song under stone","th":"เพลงใต้หิน"},"pool":"echo","version":1,"requires":["charmMinerLamp","famWoodpecker"]},{"cap":1,"cue":"echo","key":"SC15","does":{"en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase.","th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย"},"name":{"en":"Light remembers colour","th":"แสงจำสี"},"pool":"gemCorrection","version":1,"requires":["charmGemColor","famSprite"]},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}}]'::jsonb $rules$;
create or replace function town.reward_domino_preview(p jsonb,g jsonb,me text,input jsonb,t bigint)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare first_ jsonb;axe_ jsonb:=town.axe_of(p);grp jsonb;last_ jsonb;stop_ jsonb;dir_ jsonb:=input->'direction';dx integer;dy integer;used_ jsonb;path_ jsonb;action_ text;
 begin
  if jsonb_typeof(input->'tree') is distinct from 'number' or (input->>'tree')::numeric<>floor((input->>'tree')::numeric) or (input->>'tree')::numeric not between 0 and 10000 then return town.no('none');end if;
  first_:=town.tree_of((input->>'tree')::integer);
  if first_ is null or axe_ is null or town.tree_elder(first_) or not town.tree_grown(g,first_,t) or town.axe_bites(axe_,first_) is not null or town.tree_held(g,(first_->>0)::integer,t,me) or town.tree_far(first_,(input->'at'->>0)::integer,(input->'at'->>1)::integer)>1 then return town.no('none');end if;
  grp:=town.reward_domino_group(p,g,first_,axe_,t,me,dir_);if jsonb_array_length(grp)=0 then return town.no('none');end if;
  dx:=(dir_->>0)::integer;dy:=(dir_->>1)::integer;last_:=grp->(jsonb_array_length(grp)-1);
  if jsonb_array_length(grp)<3 then
   select w.v into stop_ from jsonb_array_elements(town.cat('trees')->'wood') w(v) cross join lateral (select town.tree_apart(w.v,last_) n) d
   where not exists(select 1 from jsonb_array_elements(grp) a where a->0=w.v->0) and town.tree_grown(g,w.v,t) and d.n between 1 and 4
    and (w.v->>1)::integer-(last_->>1)::integer=dx*d.n and (w.v->>2)::integer-(last_->>2)::integer=dy*d.n order by d.n,(w.v->>0)::integer limit 1;
  end if;
  select jsonb_agg(a->0 order by ord) into path_ from jsonb_array_elements(grp) with ordinality q(a,ord);
  action_:='domino:'||(first_->>0)||':'||dx||','||dy||':'||town.day_of(t);
  used_:=town.combo_grant(p,'SC14',action_,t,jsonb_build_object('path',path_,'stop',stop_->0,'previewAt',t));
  if used_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
  return jsonb_build_object('ok',true,'combo',used_->'effect','purse',used_->'purse');
 end $$;
 revoke all on function town.reward_domino_preview(jsonb,jsonb,text,jsonb,bigint) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function town.combo_rules(),public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_function_privilege('authenticated','town.reward_domino_preview(jsonb,jsonb,text,jsonb,bigint)','EXECUTE')) as v221_verified;


-- ===== v222_water_to_our_waiting_container.sql =====
-- v222: a real empty receiver and conserved owned water, three sends/day.
-- Run after v221 with the matching site. Same-map 40 tiles, six bucketfuls, two stamina.
-- One staged container, one fill before retrieval. Nature and actual carriers survive transport.
-- Rerunnable. Retrieval does not require the familiar; no installation inventory moves.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('1e6064b1c20131a304f301b8470b3298','c9d348f2974fadc46158392beacf85e3') then raise exception 'Reward dispatcher moved: rebuild v222';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famWaterRelay":{"kind":"familiar","line":"well","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famWaterRelay":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_relay_place(at_ jsonb)
returns text language sql immutable set search_path='' as $$
 select case when (at_->>0)::integer between 0 and 63 and (at_->>1)::integer between 0 and 63 then 'town'
 when (at_->>0)::integer between 128 and 187 and (at_->>1)::integer between 0 and 43 then 'farm'
 when (at_->>0)::integer between 144 and 239 and (at_->>1)::integer between 112 and 191 then 'forest' end
$$;
create or replace function town.reward_relay(p jsonb,input jsonb,t bigint,trace_ jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);relay_ jsonb:=state_->'relay';at_ jsonb:=input->'at';
 slot_ integer;s jsonb;bag_ jsonb:=p->'bag';hand_ text;source_ integer;has_ integer;n_ integer;left_ integer;used_ jsonb;after_ jsonb:=p;moved_ integer;extra_ jsonb:='{}'::jsonb;
begin
 if not town.is_tile(at_) or town.reward_relay_place(at_) is null then return town.no('far');end if;
 if input->>'action'='relayTake' then
  if coalesce(relay_,'null'::jsonb)='null'::jsonb then return town.no('none');end if;
  if greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>1 then return town.no('far');end if;
  if (relay_->>'water')::integer>0 and exists(select 1 from jsonb_array_elements(bag_) b where b->>'item'=relay_->>'item' and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
  select (ord-1)::integer into slot_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b='null'::jsonb order by ord limit 1;
  if slot_ is null then return town.no('full');end if;
  moved_:=(relay_->>'water')::integer;
  bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',relay_->>'item','n',1)||case when moved_>0 then jsonb_build_object('water',moved_) else '{}'::jsonb end);
  relay_:='null'::jsonb;extra_:=jsonb_build_object('moved',moved_);
 else
  if not town.gift_works(p,'famWaterRelay') then return town.no('none');end if;
  if input->>'action'='relayPlace' then
   if coalesce(relay_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'slot') is distinct from 'number' or (input->>'slot')::numeric<>floor((input->>'slot')::numeric) or (input->>'slot')::numeric not between 0 and jsonb_array_length(bag_)-1 then return town.no('none');end if;
   slot_:=(input->>'slot')::integer;s:=bag_->slot_;
   if coalesce(s,'null'::jsonb)='null'::jsonb or not coalesce(town.cat('farming')->'buckets' ? (s->>'item'),false) or s->'n'<>'1'::jsonb or (s-'item'-'n')<>'{}'::jsonb then return town.no('none');end if;
   bag_:=jsonb_set(bag_,array[slot_::text],'null'::jsonb);after_:=town.spend(p,1::double precision,t);
   relay_:=jsonb_build_object('item',s->>'item','at',at_,'water',0);
  elsif input->>'action'='relaySend' then
   if coalesce(relay_,'null'::jsonb)='null'::jsonb or (relay_->>'water')::integer>0 then return town.no('none');end if;
   if town.reward_relay_place(at_) is distinct from town.reward_relay_place(relay_->'at') or greatest(abs((at_->>0)::integer-(relay_->'at'->>0)::integer),abs((at_->>1)::integer-(relay_->'at'->>1)::integer))>40 then return town.no('far');end if;
   hand_:=town.hand_of(p);if hand_ is null or not (town.cat('farming')->'buckets' ? hand_) then return town.no('none');end if;
   select (ord-1)::integer,(b->>'water')::integer into source_,has_ from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
   if source_ is null then return town.no('none');end if;
   n_:=least(6,(town.cat('farming')->'buckets'->>(relay_->>'item'))::integer,has_);left_:=has_-n_;
   if n_<1 or exists(select 1 from jsonb_array_elements(bag_) with ordinality q(b,ord) where b->>'item'=relay_->>'item' and case when ord-1=source_ then left_ else coalesce((b->>'water')::integer,0) end>0) then return town.no('none');end if;
   used_:=town.gift_use(p,'famWaterRelay',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   after_:=town.spend(used_->'purse',2::double precision,t);
   bag_:=jsonb_set(bag_,array[source_::text],jsonb_build_object('item',hand_,'n',1)||case when left_>0 then jsonb_build_object('water',left_) else '{}'::jsonb end);
   relay_:=relay_||jsonb_build_object('from',at_,'sentAt',t,'water',n_,'kind',trace_->'kind','hands',coalesce(trace_->'hands','[]'::jsonb));
   extra_:=jsonb_build_object('moved',n_,'left',used_->'left');
  else return town.no('none');end if;
 end if;
 return jsonb_build_object('ok',true,'relay',relay_,'purse',after_||jsonb_build_object('bag',bag_,'professionRewards',state_||jsonb_build_object('relay',relay_)))||extra_;
end $$;
revoke all on function town.reward_relay_place(jsonb),town.reward_relay(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
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
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_function_privilege('authenticated','town.reward_relay(jsonb,jsonb,bigint,jsonb)','EXECUTE')) as v222_verified;


-- ===== v223_three_branches_of_real_water.sql =====
-- v223: three manual conduit branches, real water and rooted plant identities.
-- Run after v222 with the matching site. Correct branches only, original bucketfuls.
-- One stamina/game plus one/bucketful, shared ninety-minute bed cooldown after a real watering.
-- Ordinary watering remains available. At most twenty-four derived cooldown rows, private.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('c9d348f2974fadc46158392beacf85e3','8b580e1975c353845db6ad61e15fd6f4') then raise exception 'Reward dispatcher moved: rebuild v223';end if;end $guard$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingRiverHorn":{"kind":"thing","line":"well","rank":8,"by":1}}'::jsonb) where key='gifts';
create table if not exists town.reward_conduits (
 bed integer primary key check(bed between 0 and 23),until_ms bigint not null
);
alter table town.reward_conduits enable row level security;
revoke all on town.reward_conduits from public,anon,authenticated;
create or replace function town.reward_root_identity(k text,p jsonb)
returns text language sql immutable set search_path='' as $$
 select k||':'||(p->'plant'->>'by')||':'||(p->'plant'->>'sown')||':'||(p->'plant'->>'crop')||':'||(p->'plant'->>'picked')
$$;
create or replace function town.reward_conduit(p jsonb,input jsonb,request uuid,bed_ jsonb,cooldown_ bigint,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'conduit';
 number_ integer:=town.bed_of((input->'at'->>0)::integer,(input->'at'->>1)::integer);preview_ jsonb;roots_ jsonb;expected_ jsonb:='[]'::jsonb;
 width_ integer;i integer;n_ bigint;answer_ integer;passed_ integer:=0;matching_ jsonb:='{}'::jsonb;r jsonb;after_ jsonb;used_ integer:=0;plots_ jsonb:='{}'::jsonb;watered_ jsonb:='[]'::jsonb;extra_ jsonb:='{}'::jsonb;
begin
 if input->>'action'='conduitCancel' then return jsonb_build_object('ok',true,'conduit',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)));end if;
 if not town.gift_works(p,'thingRiverHorn') or not coalesce(town.cat('farming')->'buckets' ? town.hand_of(p),false)
  or not exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 if number_<0 then return town.no('far');end if;
 if cooldown_>t then return town.no('spent');end if;
 select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) into bed_ from jsonb_each(bed_) e where town.bed_of(split_part(e.key,',',1)::integer,split_part(e.key,',',2)::integer)=number_;
 if input->>'action'='conduitBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint then return town.no('none');end if;
  preview_:=town.ditch(p,bed_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
  if preview_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  select jsonb_agg(jsonb_build_object('key',k,'identity',town.reward_root_identity(k,bed_->k)) order by ord) into roots_ from jsonb_array_elements_text(preview_->'watered') with ordinality q(k,ord) where ord<=48;
  run_:=jsonb_build_object('id',request,'at',input->'at','bed',number_,'seed',seed_,'began',t,'until',t+90000,'roots',roots_);
  return jsonb_build_object('ok',true,'conduit',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',run_)));
 end if;
 if input->>'action'<>'conduitEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'run'
  or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint or jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(input->'answers') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 n_:=(run_->>'seed')::bigint;
 for i in 0..2 loop n_:=(n_*1664525+1013904223)%4294967296;answer_:=mod(20+n_%61,3);expected_:=expected_||jsonb_build_array(answer_);if answer_=(input->'answers'->>i)::integer then passed_:=passed_+1;end if;end loop;
 roots_:=run_->'roots';width_:=ceil(jsonb_array_length(roots_)::numeric/3)::integer;
 for i in 0..jsonb_array_length(roots_)-1 loop
  r:=roots_->i;
  if expected_->(i/width_)=input->'answers'->(i/width_) and town.reward_root_identity(r->>'key',bed_->(r->>'key'))=r->>'identity' then matching_:=matching_||jsonb_build_object(r->>'key',bed_->(r->>'key'));end if;
 end loop;
 preview_:=town.ditch(p,matching_,(input->'at'->>0)::integer,(input->'at'->>1)::integer,t);
 if preview_->'ok'='true'::jsonb then used_:=(preview_->>'used')::integer;plots_:=preview_->'plots';watered_:=preview_->'watered';extra_:=jsonb_build_object('cooldown',t+5400000);end if;
 after_:=town.spend(p,(1+used_)::double precision,t)||case when used_>0 then jsonb_build_object('bag',preview_->'purse'->'bag') else '{}'::jsonb end;
 return jsonb_build_object('ok',true,'conduit',null,'purse',after_||jsonb_build_object('professionRewards',state_||jsonb_build_object('conduit',null)),'plots',plots_,'watered',watered_,'used',used_,'passed',passed_)||extra_;
end $$;
revoke all on function town.reward_root_identity(text,jsonb),town.reward_conduit(jsonb,jsonb,uuid,jsonb,bigint,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
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
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_conduits','SELECT'),'bounded',(select count(*)<=24 from town.reward_conduits)) as v223_verified;


-- ===== v224_twelve_bucketfuls_to_share.sql =====
-- v224: one sixty-minute ordinary spring/day, twelve shared bucketfuls total.
-- Run after v223 with the matching site. Five fixed rest sites, five private bounded rows.
-- World spring lock precedes the purse lock; receipts never reset shared stock.
-- Plain water clears the receiver's old nature/contributors. Actual pouring still earns ordinary credit.
-- Rerunnable. Installation moves no coins, inventory, or players.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('8b580e1975c353845db6ad61e15fd6f4','bb82fefc0d5d273bafd8236115563a48') then raise exception 'Reward dispatcher moved: rebuild v224';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingSpringStone":{"kind":"thing","line":"well","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingSpringStone":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('springSites','[[39,32],[159,24],[189,162],[11,216],[58,230]]'::jsonb) where key='rewards';
create table if not exists town.reward_springs(
 site integer primary key check(site between 0 and 4),doc jsonb not null,
 check((doc->>'left')::integer between 0 and 12 and (doc->>'site')::integer=site)
);
alter table town.reward_springs enable row level security;
revoke all on town.reward_springs from public,anon,authenticated;
insert into town.reward_springs(site,doc) select i,jsonb_build_object('site',i,'left',0,'until',0) from generate_series(0,4) i on conflict do nothing;
create or replace function public.town_reward_springs()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 return jsonb_build_object('now',t,'springs',(select coalesce(jsonb_agg(s.doc order by s.site),'[]'::jsonb) from town.reward_springs s where (s.doc->>'until')::bigint>t and (s.doc->>'left')::integer>0));
end $$;
revoke all on function public.town_reward_springs() from public,anon,authenticated;
grant execute on function public.town_reward_springs() to authenticated;
create or replace function town.reward_spring(p jsonb,input jsonb,request uuid,me uuid,old_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ integer;point_ jsonb;used_ jsonb;hand_ text;slot_ integer;n_ integer;after_ jsonb;node_ jsonb;
begin
 if jsonb_typeof(input->'site') is distinct from 'number' or (input->>'site')::numeric<>floor((input->>'site')::numeric) or (input->>'site')::numeric not between 0 and 4 then return town.no('far');end if;
 site_:=(input->>'site')::integer;point_:=town.cat('rewards')->'springSites'->site_;
 if point_ is null then return town.no('far');end if;
 if greatest(abs((input->'at'->>0)::integer-(point_->>0)::integer),abs((input->'at'->>1)::integer-(point_->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='springPlace' then
  if not town.gift_works(p,'thingSpringStone') then return town.no('none');end if;
  if (old_->>'until')::bigint>t and (old_->>'left')::integer>0 then return town.no('spent');end if;
  used_:=town.gift_use(p,'thingSpringStone',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  node_:=jsonb_build_object('site',site_,'id',request,'by',me,'at',point_,'until',t+3600000,'left',12);
  return jsonb_build_object('ok',true,'spring',node_,'purse',town.spend(used_->'purse',3::double precision,t),'left',used_->'left');
 end if;
 if input->>'action'<>'springDraw' or coalesce(old_,'null'::jsonb)='null'::jsonb or (old_->>'site')::integer<>site_ or (old_->>'until')::bigint<=t or (old_->>'left')::integer<=0 then return town.no('none');end if;
 hand_:=town.hand_of(p);if hand_ is null or not town.cat('farming')->'buckets' ? hand_ then return town.no('none');end if;
 if exists(select 1 from jsonb_array_elements(p->'bag') b where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0) then return town.no('none');end if;
 select (ord-1)::integer into slot_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and b->'n'='1'::jsonb and (b-'item'-'n')='{}'::jsonb order by ord limit 1;
 if slot_ is null then return town.no('none');end if;
 n_:=least((old_->>'left')::integer,(town.cat('farming')->'buckets'->>hand_)::integer);
 after_:=town.spend(p,(town.cat('farming')->'chores'->>'draw')::double precision,t)||jsonb_build_object('bag',jsonb_set(p->'bag',array[slot_::text],jsonb_build_object('item',hand_,'n',1,'water',n_)));
 return jsonb_build_object('ok',true,'spring',old_||jsonb_build_object('left',(old_->>'left')::integer-n_),'purse',after_,'moved',n_);
end $$;
revoke all on function town.reward_spring(jsonb,jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
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
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_springs','SELECT'),'bounded',(select count(*)=5 from town.reward_springs)) as v224_verified;


-- ===== v225_a_cloud_over_consenting_gardens.sql =====
-- v225: ten-minute local clouds for up to three consenting beds, one real special bucketful.
-- Run after v224 with the matching site. One finished rhythm attempt/day, six stamina, even on a miss.
-- Consent lasts ten minutes and can be revoked. Rechecked after locking the actual beds.
-- Existing roots only, each root once/day. Water nature applies once; no world weather, XP, or rain-trigger writes.
-- Elapsed local rain excludes natural rain and moist soil. Plant identity and shared bed locks prevent duplicate effects.
-- Rerunnable. Installation moves no player resources.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('bb82fefc0d5d273bafd8236115563a48','dc71f24d65076fc87c5db81b2595c426') then raise exception 'Definition moved: public.town_reward(uuid,jsonb); rebuild v225';end if;
if md5(replace(pg_get_functiondef('town.grown(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('34553dd788a9219297362f5bcc17ce58','9261b1bd28ced1d5a8842f540a1aebcf') then raise exception 'Definition moved: town.grown(jsonb,bigint); rebuild v225';end if;
if md5(replace(pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('dae24c962734ed800c31020602ed32ff','754846f0f9e59b321e66b1495eec8d78') then raise exception 'Definition moved: town.see(text,jsonb,bigint); rebuild v225';end if; end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCloudJar":{"kind":"thing","line":"well","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCloudJar":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('cloudCorners','[[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]]'::jsonb) where key='rewards';
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

CREATE OR REPLACE FUNCTION town.grown(p_plant jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + (case when p_plant->'moist' = 'true'::jsonb then greatest(0, p_now - p.sown)::double precision else (town.wet_ms(p.sown, p_now)+town.local_rain_ms(p_plant,p_now))::double precision end) * (w.f->>'adds')::double precision / (w.f->>'every')::double precision
      + town.quick_ms(p_plant, p.sown, p_now)) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$function$
;
CREATE OR REPLACE FUNCTION town.see(p_key text, p_plot jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  ends bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  -- (the moment it dies of its pest: so long after it struck, not counting the time fae dust lay on it)
  ends := town.dies_at(p, struck, kills);
  dead := struck is not null and p_now > ends;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then ends else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', coalesce(p->'moist' = 'true'::jsonb, false) or p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now) or coalesce((p->'localRain'->>'from')::bigint<=p_now and p_now<(p->'localRain'->>'until')::bigint,false));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_cloud_consents','SELECT'),'bounded',(select count(*)<=24 from town.reward_cloud_consents)) as v225_verified;


-- ===== v226_three_living_trees_inside_a_bottle.sql =====
-- v226: three chosen known trees, finite private nursery and three real care games.
-- Run after v225 with the matching site. Three real plain pine seeds/start, one start/day.
-- Two stamina/attempt. Up to six parts total, three cedar slivers at most, no logs or timber.
-- Known tree kinds from actual felling; owning pine seeds teaches pine. Repeated kinds allowed.
-- Parts lock before each game; full bags preserve the same challenge, seed and choice.
-- Checkpoints cross days; cancelling never refunds seeds/quota. No world felling, regrowth, forging multipliers or XP.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('dc71f24d65076fc87c5db81b2595c426','b3baa3f6500c7af38d919ca01d73a315') then raise exception 'Reward dispatcher moved: rebuild v226';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingTinyForest":{"kind":"thing","line":"felling","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingTinyForest":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('nurseryBoxes','[[0,0,64,64],[128,0,60,44],[144,112,96,80],[0,208,72,56]]'::jsonb) where key='rewards';
create or replace function town.reward_nursery(p jsonb,input jsonb,request uuid,known_ jsonb,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'nursery';at_ jsonb:=input->'at';used_ jsonb;node_ jsonb;challenge_ jsonb;next_ integer;game_ text;part_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;won_ boolean:=true;got_ jsonb:='[]'::jsonb;i integer;kind_ text;item_ text;n_ integer;after_ jsonb;completed_ boolean;allowed_ boolean;
begin
 select coalesce(jsonb_agg(k order by ord),'[]'::jsonb) into known_ from jsonb_array_elements_text('["pine","ironwood","moonwood","elder"]'::jsonb) with ordinality q(k,ord) where known_ ? k or coalesce(state_->'treeKinds','[]'::jsonb) ? k or k='pine' and town.held(p->'bag','pineNut')>0;
 if input->>'action'='nurseryLook' then if not town.gift_works(p,'thingTinyForest') then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('treeKinds',known_)));end if;
 if input->>'action'='nurseryCancel' then
  if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',null)),'nursery',null);
 end if;
 if not town.gift_works(p,'thingTinyForest') or town.axe_of(p) is null then return town.no('none');end if;
 select exists(select 1 from jsonb_array_elements(town.cat('rewards')->'nurseryBoxes') b where (at_->>0)::integer>=(b->>0)::integer and (at_->>1)::integer>=(b->>1)::integer and (at_->>0)::integer<(b->>0)::integer+(b->>2)::integer and (at_->>1)::integer<(b->>1)::integer+(b->>3)::integer) into allowed_;
 if not allowed_ then return town.no('far');end if;
 if input->>'action'='nurseryBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'kinds') is distinct from 'array' or jsonb_array_length(input->'kinds')<>3 or exists(select 1 from jsonb_array_elements(input->'kinds') k where jsonb_typeof(k)<>'string' or not known_ ? (k#>>'{}')) or town.held(p->'bag','pineNut')<3 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item'='pineNut' and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingTinyForest',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'at',at_,'kinds',input->'kinds','seed',seed_,'next',0,'began',t,'part',null,'challenge',null);
  after_:=used_->'purse'||jsonb_build_object('bag',town.take(p->'bag','pineNut',3),'professionRewards',state_||jsonb_build_object('nursery',run_));
  return jsonb_build_object('ok',true,'purse',after_,'nursery',run_,'left',used_->'left');
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
 if greatest(abs((at_->>0)::integer-(run_->'at'->>0)::integer),abs((at_->>1)::integer-(run_->'at'->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='nurseryStage' then
  part_:=input->>'part';if part_ is null or part_ not in ('wood','bark','sap','seed','root') or run_->>'part' is not null and part_<>run_->>'part' then return town.no('none');end if;
  challenge_:=run_->'challenge';if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('part',part_,'challenge',challenge_);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_);
 end if;
 challenge_:=run_->'challenge';part_:=run_->>'part';
 if input->>'action'<>'nurseryEnd' or part_ is null or coalesce(challenge_,'null'::jsonb)='null'::jsonb or input->>'challenge' is distinct from challenge_->>'id' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(run_->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when game_='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 if won_ then
  kind_:=run_->'kinds'->>next_;item_:=case part_ when 'wood' then case when kind_='elder' then 'cedarSliver' else 'heartwood' end when 'sap' then 'pinePitch' when 'bark' then 'pineBark' when 'seed' then 'pineNut' else 'rootFiber' end;n_:=case when kind_='elder' and part_='wood' then 1 else 2 end;
  got_:=jsonb_build_array(jsonb_build_array(item_,n_));
 end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=won_ and next_=2;run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won_ then 1 else 0 end,'part',case when won_ then 'null'::jsonb else run_->'part' end,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end);
end $$;
revoke all on function town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action'='dominoPreview' then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)','EXECUTE') as nursery_private;


-- ===== v227_small_parts_belong_to_living_trees.sql =====
-- v227: three daily living-tree care attempts; no logs, timber or tree reset.
-- Run after v226 with the matching site. One actual water + compost + two stamina/attempt.
-- A perfect care sequence gives two small parts. Every small part rests ten minutes per tree,
-- shared by ordinary grain collection, listener, parting knife and care. Felling/logs remain available.
-- The existing grove lock orders every writer before purse locks. Full bags preserve all inputs.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('b3baa3f6500c7af38d919ca01d73a315','133e989544ae64a1f415bedf27cb7a11') then raise exception 'Definition moved: rebuild v227 (public.town_reward(uuid,jsonb))';end if;
if md5(replace(pg_get_functiondef('town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('c660e34893867d668773db983352c643','bc292ec213859f4a8122e7315d436f85') then raise exception 'Definition moved: rebuild v227 (town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text))';end if;
if md5(replace(pg_get_functiondef('town.reward_listening(jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('7216c0f245492d666c4e3b345f19b4cb','4ed04d3bbf4adb4b3ac958a3035e0a5d') then raise exception 'Definition moved: rebuild v227 (town.reward_listening(jsonb,jsonb,jsonb,bigint))';end if;
if md5(replace(pg_get_functiondef('town.grove_tidied(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('c34ed23433afa09b5710b0ae0cfe0c40','d63c82e9be19ba4040b0fd17f9a18f50') then raise exception 'Definition moved: rebuild v227 (town.grove_tidied(jsonb,bigint))';end if;
if md5(replace(pg_get_functiondef('town.trees_told(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('8fe46da9234886da15c2464666686d47','3e96719aa8edbabf1f9422a6be71148c') then raise exception 'Definition moved: rebuild v227 (town.trees_told(jsonb,jsonb,bigint))';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmTreePact":{"kind":"charm","line":"felling","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmTreePact":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.tree_parts(parts jsonb,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(q.key,q.doc),'{}'::jsonb) from (
  select a.key,jsonb_object_agg(b.key,b.value) doc from jsonb_each(coalesce(parts,'{}'::jsonb)) a
  cross join lateral jsonb_each(a.value) b where a.key ~ '^[0-9]{1,4}$' and town.tree_of(a.key::integer) is not null
  and b.key in ('bark','sap','seed','root') and (b.value::text)::bigint>t group by a.key
 ) q
$$;
create or replace function town.tree_part_ready(g jsonb,id integer,part text,t bigint)
returns boolean language sql immutable set search_path='' as $$
 select part='wood' or coalesce((g->'parts'->id::text->>part)::bigint,0)<=t
$$;
create or replace function town.tree_part_rest(g jsonb,id integer,part text,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select case when part='wood' then g else g||jsonb_build_object('parts',case when part='wood' then parts else parts||jsonb_build_object(id::text,coalesce(parts->id::text,'{}'::jsonb)||jsonb_build_object(part,t+600000)) end) end from (select town.tree_parts(g->'parts',t) parts) q
$$;
create or replace function town.reward_pact(p jsonb,g jsonb,input jsonb,request uuid,t bigint,seed_ bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'pact';tree_ jsonb;id_ integer;part_ text;water_ jsonb;slot_ integer;hand_ text;has_ integer;used_ jsonb;after_ jsonb;bag_ jsonb;got_ jsonb:='[]'::jsonb;passed_ integer:=0;expected_ numeric;i integer;
begin
 if input->>'action'='pactCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null);end if;
 hand_:=town.hand_of(p);
 if not town.gift_works(p,'charmTreePact') or not coalesce(town.cat('farming')->'buckets' ? hand_,false) or town.held(p->'bag','compost')<1 then return town.no('none');end if;
 select jsonb_build_object('slot',ord-1,'hand',hand_,'has',floor((b->>'water')::numeric)) into water_ from jsonb_array_elements(p->'bag') with ordinality q(b,ord) where b->>'item'=hand_ and coalesce((b->>'water')::numeric,0)>0 order by ord limit 1;
 if water_ is null then return town.no('none');end if;
 if input->>'action'='pactBegin' then
  if jsonb_typeof(input->'tree') is distinct from 'number' or (input->>'tree')::numeric<>floor((input->>'tree')::numeric) or (input->>'tree')::numeric not between 0 and 9999 then return town.no('none');end if;
  id_:=(input->>'tree')::integer;part_:=input->>'part';
 else id_:=(run_->>'tree')::integer;part_:=run_->>'part';end if;
 tree_:=town.tree_of(id_);if tree_ is null or town.tree_elder(tree_) or not town.tree_grown(g,tree_,t) or town.tree_held(g,id_,t,'') then return town.no('none');end if;
 if town.tree_far(tree_,(input->'at'->>0)::integer,(input->'at'->>1)::integer)>1 then return town.no('far');end if;
 if input->>'action'='pactBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb and t<=(run_->>'until')::bigint or part_ is null or part_ not in ('bark','sap','seed','root') then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  if not town.tree_part_ready(g,id_,part_,t) or town.used_of(p,'charmTreePact',t)>=3 then return town.no('spent');end if;
  run_:=jsonb_build_object('id',request,'tree',id_,'part',part_,'at',input->'at','seed',seed_,'began',t,'until',t+90000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',run_)),'pact',run_);
 end if;
 if input->>'action'<>'pactEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t<(run_->>'began')::bigint+2400 or t>(run_->>'until')::bigint then return town.no('none');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 or exists(select 1 from jsonb_array_elements(input->'answers') a where jsonb_typeof(a)<>'number' or (a::text)::numeric<>floor((a::text)::numeric) or (a::text)::numeric not between 0 and 2) then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if not town.tree_part_ready(g,id_,part_,t) then return town.no('spent');end if;
 seed_:=(run_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;expected_:=mod(20+seed_%61,3);if expected_=(input->'answers'->>i)::numeric then passed_:=passed_+1;end if;end loop;
 if passed_=3 then got_:=jsonb_build_array(jsonb_build_array(case part_ when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,2));end if;
 used_:=town.gift_use(p,'charmTreePact',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 slot_:=(water_->>'slot')::integer;hand_:=water_->>'hand';has_:=(water_->>'has')::integer-1;bag_:=town.take(used_->'purse'->'bag','compost',1);
 bag_:=jsonb_set(bag_,array[slot_::text],jsonb_build_object('item',hand_,'n',1)||case when has_>0 then jsonb_build_object('water',has_) else '{}'::jsonb end);
 after_:=town.stow_all(used_->'purse'||jsonb_build_object('bag',bag_),got_);if after_ is null then return town.no('full');end if;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('pact',null)),'pact',null,'got',got_,'passed',passed_,'left',used_->'left')||case when passed_=3 then jsonb_build_object('grove',town.tree_part_rest(g,id_,part_,t)) else '{}'::jsonb end;
end $$;
revoke all on function town.tree_parts(jsonb,bigint),town.tree_part_ready(jsonb,integer,text,bigint),town.tree_part_rest(jsonb,integer,text,bigint),town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.fell_v205(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
  quality_ text;
begin
  if p_went ? 'grain' and (not town.wood_choice(p_went->'grain') or jsonb_typeof(p_went->'misses') is distinct from 'number') then return town.no('none'); end if;
  if p_went ? 'grain' and ((p_went->>'misses')::numeric <> floor((p_went->>'misses')::numeric) or (p_went->>'misses')::numeric not between 0 and 1000) then return town.no('none'); end if;
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- ── v172: there is no plain way any more: a tree is felled at its board ──
  if plain_ then return town.no('board'); end if;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  -- ── v173: and so does every other tree: a go that is lost fells nothing, gives nothing and costs no stamina ──
  if not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  if board_ and p_went ? 'grain' then quality_ := town.wood_quality((first_->>0)::integer,p_went->'grain',misses,p_purse,p_now); end if;
  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by', axe) else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if board_ and through_ and misses=0 and coalesce((l->>'dark')::double precision,1)<town.gem_by(axe,'dark',k->'axe'->'gems'->'dark'->'timber') then timber:=timber+1;end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every', axe) then logs := logs + town.opt_n('axDust', 'more', axe); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by', axe); timber := timber * town.opt_n('axDouble', 'by', axe);
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in', axe) then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_stamina(axe), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    if quality_ is not null and town.tree_part_ready(closed_,id_,p_went->'grain'->>'part',p_now) then
     got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse);
     closed_ := town.tree_part_rest(closed_,id_,p_went->'grain'->>'part',p_now);
    end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when quality_ is not null then jsonb_build_object('quality',quality_) else '{}'::jsonb end
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_listening(before_ jsonb, did jsonb, went jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 declare grain jsonb:=went->'grain';second_ text:=grain->>'second';f jsonb:=did->'felled'->0;used_ jsonb;got_ jsonb;home jsonb;state_ jsonb;
 begin
  if did->'ok' is distinct from 'true'::jsonb or jsonb_array_length(did->'felled')=0 or second_ is null then return did;end if;
  if second_ not in ('bark','sap','seed') or second_=grain->>'part' then return town.no('none');end if;
  if coalesce((did->>'one')::boolean,false) or did->'through' is distinct from 'true'::jsonb or town.tree_elder(town.tree_of((f->>'id')::integer)) or went->'misses' is distinct from '0'::jsonb or town.wood_quality((f->>'id')::integer,grain,0,'{"bag":[]}'::jsonb,t)<>'heart' then return did;end if;
  if not town.tree_part_ready(did->'grove',(f->>'id')::integer,second_,t) then return did;end if;
  used_:=town.gift_use(did->'purse','charmListening',t);if used_->'ok' is distinct from 'true'::jsonb then return did;end if;
  got_:=town.wood_yield(false,second_,'heart',before_);home:=town.stow_all(used_->'purse',got_);if home is null then return town.no('full');end if;
  if home ? 'professionRewards' then state_:=home->'professionRewards';home:=home||jsonb_build_object('professionRewards',state_||jsonb_build_object('extraction',null,'run',null));end if;
  did:=jsonb_set(did,'{grove}',town.tree_part_rest(did->'grove',(f->>'id')::integer,second_,t));
  return jsonb_set(did,'{felled,0}',f||jsonb_build_object('got',(f->'got')||got_))||jsonb_build_object('purse',home,'got',(did->'got')||got_);
 end $function$
;
CREATE OR REPLACE FUNCTION town.grove_tidied(p_grove jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  still jsonb;
  held_ jsonb;
begin
  if p_grove ? 'parts' then p_grove:=p_grove||jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now));end if;
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into still
    from jsonb_each(down_) e, lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
   where x.t is not null and p_now < town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint);
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into held_ from jsonb_each(goes_) e where town.go_holds(e.value, p_now);
  if (select count(*) from jsonb_object_keys(still)) = (select count(*) from jsonb_object_keys(down_))
     and (select count(*) from jsonb_object_keys(held_)) = (select count(*) from jsonb_object_keys(goes_)) then
    return p_grove;
  end if;
  return (p_grove - 'goes') || jsonb_build_object('down', still) || case when held_ <> '{}'::jsonb then jsonb_build_object('goes', held_) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.trees_told(p_grove jsonb, p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select (case when p_grove ? 'parts' then jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now)) else '{}'::jsonb end) || jsonb_build_object(
    'down', coalesce((select jsonb_agg(jsonb_build_object('id', (d.t->>0)::integer, 'at', d.f->'at')
          || case when town.tree_elder(d.t) and not c.knows then '{}'::jsonb else jsonb_build_object('until', d.until) end order by (d.t->>0)::integer)
        from (select x.t, e.value as f, town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint) as until
                from jsonb_each(case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end) e,
                     lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
               where x.t is not null) d
       where p_now < d.until), '[]'::jsonb),
    'half', coalesce((select jsonb_agg(h.v order by (h.v #>> '{}')::numeric)
        from jsonb_array_elements(case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) h(v)
       where not coalesce(p_grove->'down', '{}'::jsonb) ? (h.v #>> '{}')), '[]'::jsonb))
    || coalesce((select jsonb_build_object('book', jsonb_agg(jsonb_build_array(i.id, p_grove->'book'->i.id->'by') order by i.ord))
        from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
       where jsonb_typeof(p_grove->'book') = 'object' and p_grove->'book' ? i.id
      having count(*) > 0), '{}'::jsonb)
    from (select coalesce(town.tool_has(town.hand_stack(p_purse), 'axElder'), false) as knows) c
$function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint)','EXECUTE') as pact_private;


-- ===== v228_a_beavers_path_between_the_banks.sql =====
-- v228: two marked forest crossings, one thirty-minute bridge/day.
-- Run after v227 with matching site. Four/eight real logs, two root fibres, three stamina.
-- All players use ordinary movement; no map gates, permanent paths or resources change.
-- World bridge row is locked before any purse. Exactly two derived site rows; rerun preserves active bridges.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('133e989544ae64a1f415bedf27cb7a11','9d9318b7329f705cef6946e9c60fd2b9') then raise exception 'Reward dispatcher moved: rebuild v228';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famBeaver":{"kind":"familiar","line":"felling","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famBeaver":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('crossings','[{"a":[174,135],"b":[174,143],"tiles":[[174,136],[174,137],[174,138],[174,139],[174,140],[174,141],[174,142]],"logs":8},{"a":[206,137],"b":[206,141],"tiles":[[206,138],[206,139],[206,140]],"logs":4}]'::jsonb) where key='rewards';
create table if not exists town.reward_bridges(site integer primary key check(site between 0 and 1),doc jsonb not null);
alter table town.reward_bridges enable row level security;
revoke all on town.reward_bridges from public,anon,authenticated;
insert into town.reward_bridges select i,jsonb_build_object('site',i,'until',0) from generate_series(0,1) i on conflict do nothing;
create or replace function public.town_reward_bridges()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 return jsonb_build_object('now',t,'bridges',(select coalesce(jsonb_agg(doc order by site),'[]'::jsonb) from town.reward_bridges where (doc->>'until')::bigint>t));
end $$;
revoke all on function public.town_reward_bridges() from public,anon,authenticated;
grant execute on function public.town_reward_bridges() to authenticated;
create or replace function town.reward_bridge(p jsonb,input jsonb,request uuid,me uuid,old_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare site_ integer;point_ jsonb;used_ jsonb;logs_ integer;bag_ jsonb;bridge_ jsonb;
begin
 if input->>'action'<>'bridgeBuild' or jsonb_typeof(input->'site') is distinct from 'number' or (input->>'site')::numeric<>floor((input->>'site')::numeric) or (input->>'site')::numeric not between 0 and 1 then return town.no('far');end if;
 site_:=(input->>'site')::integer;point_:=town.cat('rewards')->'crossings'->site_;logs_:=(point_->>'logs')::integer;
 if point_ is null or input->'at' is distinct from point_->'a' and input->'at' is distinct from point_->'b' then return town.no('far');end if;
 if not town.gift_works(p,'famBeaver') or town.held(p->'bag','log')<logs_ or town.held(p->'bag','rootFiber')<2 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item' in ('log','rootFiber') and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
 if (old_->>'until')::bigint>t then return town.no('spent');end if;
 used_:=town.gift_use(p,'famBeaver',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 bag_:=town.take(town.take(p->'bag','log',logs_),'rootFiber',2);bridge_:=jsonb_build_object('site',site_,'id',request,'by',me,'until',t+1800000);
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',3::double precision,t)||jsonb_build_object('bag',bag_),'bridge',bridge_,'left',used_->'left');
end $$;
revoke all on function town.reward_bridge(jsonb,jsonb,uuid,uuid,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_table_privilege('authenticated','town.reward_bridges','SELECT') as bridges_private;


-- ===== v229_the_moon_reel_and_a_moment_of_quiet.sql =====
-- v229: each hooked fish charges its lunar reel separately; shorten remaining line once.
-- Run after v228 with matching site. Real world rain and running currents can reveal secret bonds.
-- No fish, bait, stamina or XP is created. Server records one activation per stable fish key.
-- Gameplay charge is the existing client minigame account; server checks elapsed time and live line ownership.
begin;do $g$ begin
if md5(replace(pg_get_functiondef('public.town_strike(integer)'::regprocedure),chr(13),'')) not in ('20e078799a86df01b5edf597b205f1f3','4ad38af628f679cf07e60edbcdea6cf1') then raise exception 'Definition moved: rebuild v229';end if;
if md5(replace(pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure),chr(13),'')) not in ('d0b5bc730adc5b150f66c488b566beef','fe1db164ccae7995ee5fe6941dfe220d') then raise exception 'Definition moved: rebuild v229';end if;
if md5(replace(pg_get_functiondef('town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('bdba7cc3867e4af1eff269b7be6ea436','6a73e8d73c185195cf140fcf3ee4b6ce') then raise exception 'Definition moved: rebuild v229';end if;
if md5(replace(pg_get_functiondef('town.combo_rules()'::regprocedure),chr(13),'')) not in ('1ae6e0434f5d7b69e9bf1a921f4ea437','4b0307da03099683f6fcde3e8d34bea9') then raise exception 'Definition moved: rebuild v229';end if;
if to_regprocedure('public.town_strike_v229(integer)') is null then alter function public.town_strike(integer) rename to town_strike_v229;elsif md5(replace(pg_get_functiondef('public.town_strike_v229(integer)'::regprocedure),chr(13),''))<>'205412e296dfb831c8fbd92e3c863590' then raise exception 'Base strike moved: rebuild v229';end if;
end $g$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"charmLunarReel":{"kind":"charm","line":"fishing","rank":9,"by":1}}'::jsonb) where key='gifts';
create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $r$select '[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain''s rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}}]'::jsonb$r$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.fishing_power_seed(me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare p jsonb;l jsonb;n integer;keys_ jsonb:='[]';info jsonb:='{}';key_ text;bond jsonb;
begin
 select doc into l from public.town_lines where member_id=me for update;
 if l is null or l->'struck_at'='null'::jsonb then return '{}'::jsonb;end if;
 p:=town.purse_of(me,true);
 n:=1+jsonb_array_length(coalesce(l->'others','[]'));
 for i in 0..n-1 loop
  key_:=(l->>'cast_at')||':'||i;keys_:=keys_||to_jsonb(key_);
  bond:=town.no('none');
  if l->>'current'='run' and l->>'comboLoadout'=town.combo_loadout(p) then bond:=town.combo_grant(p,'SC18','quiet:'||key_,t,'{"quiet":1.5}'::jsonb);end if;
  if bond->'ok'='true'::jsonb then p:=bond->'purse';end if;
  info:=info||jsonb_build_object(key_,jsonb_build_object('key',key_,'quiet',coalesce((bond->'effect'->>'quiet')::numeric,0)));
 end loop;
 perform town.keep_purse(me,p);
 update public.town_lines set doc=l||jsonb_build_object('powerOrder',keys_,'powerInfo',info) where member_id=me;
 return jsonb_build_object('powers',(select jsonb_agg(info->v order by ord) from jsonb_array_elements_text(keys_) with ordinality x(v,ord)));
end $$;
revoke all on function town.fishing_power_seed(uuid,bigint) from public,anon,authenticated;

create or replace function public.town_fishing_power(p_key text,p_charge double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.far_member();p jsonb;l jsonb;t bigint:=town.now_ms();bond jsonb;info jsonb;quiet_ numeric:=0;
begin
 select doc into l from public.town_lines where member_id=me for update;
 if l is null or p_key is null or not coalesce(l->'powerOrder' ? p_key,false) or l->'struck_at'='null'::jsonb then return town.answer(me,town.no('none'));end if;
 perform 1 from public.town_purses where member_id=me for update;p:=town.purse_of(me,true);
 if not town.gift_works(p,'charmLunarReel') or l->>'comboLoadout' is distinct from town.combo_loadout(p)
  or p_charge is null or p_charge not between 5 and 180 or p_charge>(t-(l->>'struck_at')::bigint)/1000.0+0.1
  or t-(l->>'struck_at')::bigint<5000 then return town.answer(me,town.no('none'));end if;
 info:=l->'powerInfo'->p_key;
 if info->'used'='true'::jsonb then return town.answer(me,jsonb_build_object('ok',true,'quiet',coalesce(info->'lunarQuiet','0'::jsonb)));end if;
 bond:=town.no('none');
 -- The world's actual rain, never an orb or a local garden cloud.
 if town.raining(t) then bond:=town.combo_grant(p,'SC16','quiet:'||p_key,t,'{"quiet":2}'::jsonb);end if;
 if bond->'ok'='true'::jsonb then p:=bond->'purse';quiet_:=2;end if;
 perform town.keep_purse(me,p);
 update public.town_lines set doc=jsonb_set(l,array['powerInfo',p_key],info||jsonb_build_object('used',true,'lunarQuiet',quiet_)) where member_id=me;
 return town.answer(me,jsonb_build_object('ok',true,'quiet',quiet_)||case when bond->'ok'='true'::jsonb then jsonb_build_object('combo',bond->'effect') else '{}'::jsonb end);
end $$;
revoke all on function public.town_fishing_power(text,double precision) from public,anon,authenticated;
grant execute on function public.town_fishing_power(text,double precision) to authenticated;

create or replace function public.town_strike(p_reaction integer) returns jsonb language plpgsql security definer set search_path='' as $$declare a jsonb;me uuid:=town.member();extra jsonb;begin a:=public.town_strike_v229(p_reaction);if a->'ok'='true'::jsonb and a->'hooked'='true'::jsonb and a->'landed'='false'::jsonb then extra:=town.fishing_power_seed(me,town.now_ms());return a||town.answer(me,extra);end if;return a;end $$;
CREATE OR REPLACE FUNCTION public.town_land(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
  drove jsonb;
  bond jsonb;
  -- ── the older tools (v174): the forged rod, the purse with a bait left in it, and whether one was ──
  rod_ jsonb;
  baited_ jsonb;
  kept_ boolean := false;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  -- (two fish still on a rod of two lines: one of them has ended, and the other is on still)
  if (line ? 'two' or line ? 'others') and line->'struck_at' <> 'null'::jsonb and how <> 'left' then return town.answer(me, town.land_one(me, purse, line, how, p_fight, now_)); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
    perform town.keep_purse(me, town.took_up(purse, now_));
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    -- (by how much harder the fish was for this member; and a legend takes its bouts, but for one the otter drove back, which is fought once more)
    if how = 'landed' and (took < town.least_ms(line->>'what', coalesce((line->>'harder')::double precision, 1),
          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)
          -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
          * coalesce((line->>'rod')::double precision, 1::double precision) * (1-coalesce((line->>'comboResume')::double precision,0)) * case when (line->'powerInfo'->(line->'powerOrder'->>0)->>'used')::boolean then .8 else 1 end
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
      -- ── the older tools (v174): lib/town/fishing's baitKept; the number of chance is drawn only with a forged rod ──
      if fish is not null and cat->'baits' ? (line->>'bait') then
        rod_ := town.rod_held(purse);
        if rod_ is not null then
          if random() < (town.rod_fx(rod_)->>'keeps')::double precision then
            baited_ := town.back_bait(landed->'purse', line->>'bait');
            kept_ := town.held(baited_->'bag', line->>'bait') > town.held(landed->'purse'->'bag', line->>'bait');
            perform town.keep_purse(me, baited_);
          end if;
        end if;
      end if;
      -- ── the older tools (v174): its end ──
    elsif how in ('snapped', 'slipped') and not suspect then
      -- (the otter drives it back, once to a line: the line stays out with its fish on, to be fought again from now,
      -- and nothing is lost or written down of the go yet)
      drove := town.drive_back(purse, how, coalesce((line->>'again')::boolean, false), now_);
      if (drove->>'ok')::boolean then
        bond:=town.combo_rescue(drove->'purse','fish:'||(line->>'cast_at'),now_,line->>'comboLoadout');
        if coalesce((bond->>'ok')::boolean,false) then
          drove:=drove||jsonb_build_object('purse',bond->'purse');
          line:=line||jsonb_build_object('comboResume',bond->'effect'->'resume');
        end if;
        perform town.keep_purse(me, drove->'purse');
        update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'again', true), updated_at = now() where member_id = me;
        perform town.note(me, 'gift_use', 'famOtter', 1, 0, jsonb_build_object('left', drove->'left', 'what', line->'what', 'how', how));
        return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', line->'what', 'kept', false, 'record', false, 'back', false, 'again', true) || case when coalesce((bond->>'ok')::boolean,false) then jsonb_build_object('combo',bond->'effect') else '{}'::jsonb end);
      end if;
      back := town.back_bait(case when how = 'snapped' then town.lose_bait(purse, line->>'bait') else purse end, line->>'bait');
      perform town.keep_purse(me, back);
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record',
    -- ── the older tools (v174): or lib/town/fishing's baitKept said so ──
    'back', (back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')) or kept_));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.land_one(p_member uuid, p_purse jsonb, p_line jsonb, p_how text, p_fight jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cat jsonb := town.cat('fishing');
  which_ integer := case when coalesce(p_fight->>'which','0') ~ '^[0-2]$' then coalesce(p_fight->>'which','0')::integer else -1 end;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size')) || coalesce(p_line->'others', jsonb_build_array(p_line->'two'));
  mine jsonb := things->which_;
  others jsonb;
  fish jsonb := town.cat('fish')->(mine->>'what');
  how text := p_how;
  took bigint := p_now - (p_line->>'struck_at')::bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  if which_ < 0 or which_ >= jsonb_array_length(things) then return town.no('none'); end if;
  select jsonb_agg(e.v order by e.ord) into others from jsonb_array_elements(things) with ordinality e(v,ord) where e.ord - 1 <> which_;
  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))
      -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
      * coalesce((p_line->>'rod')::double precision, 1::double precision) * case when (p_line->'powerInfo'->(p_line->'powerOrder'->>which_)->>'used')::boolean then .8 else 1 end
      or took > (cat->>'longest')::bigint * 1000) then
    how := 'slipped';
    suspect := true;
  end if;
  if how = 'landed' then
    landed := town.land_catch(p_purse, mine->>'what', (mine->>'size')::double precision);
    perform town.keep_purse(p_member, landed->'purse');
  elsif not suspect then
    back := town.back_bait(case when how = 'snapped' then town.lose_bait(p_purse, p_line->>'bait') else p_purse end, p_line->>'bait');
    perform town.keep_purse(p_member, back);
  end if;
  if p_line ? 'powerOrder' then p_line:=jsonb_set(p_line,'{powerOrder}',coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_line->'powerOrder') with ordinality e(v,ord) where e.ord-1<>which_),'[]'::jsonb));end if;
  update public.town_lines set doc = (p_line - 'two' - 'others') || jsonb_build_object('what', others->0->'what', 'size', others->0->'size') || case when jsonb_array_length(others) > 1 then jsonb_build_object('others', (select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(others) with ordinality e(v,ord) where e.ord > 1)) else '{}'::jsonb end, updated_at = now() where member_id = p_member;
  perform town.record(p_member, 'fishing', how = 'landed', took / 1000.0, coalesce((p_line->>'spent')::boolean, false), town.buff_of(p_purse, p_now), jsonb_build_object(
    'how', how, 'place', case when (p_line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(p_line->'x', p_line->'y'),
    'bait', p_line->'bait', 'hour', p_line->'hour', 'what', mine->'what', 'size', mine->'size', 'wait', p_line->'wait',
    'nibbles', jsonb_array_length(p_line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect, 'pair', which_,
    'claims', jsonb_build_object('rain', p_line->'rain', 'reaction', p_line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return jsonb_build_object('ok', true, 'how', how, 'what', mine->'what', 'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);
end;
$function$
;
revoke all on function public.town_strike_v229(integer),town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.town_strike(integer),public.town_land(text,jsonb) from public,anon,authenticated;grant execute on function public.town_strike(integer),public.town_land(text,jsonb) to authenticated;
notify pgrst,'reload schema';commit;

-- ===== v230_a_lotus_leaf_for_two_fishers.sql =====
-- v230: owner-operated lotus boats, explicit passenger consent, ordinary-speed fixed local routes.
-- Run after v229 and matching site. One lease row per participating owner; no permanent terrain changes.
-- Cast and movement serialize on the boat before purse locks. Expiry/reload returns travellers to their bank.
begin;do $g$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9d9318b7329f705cef6946e9c60fd2b9','ac1d70c0e62d41141c0855350a9fcafd') then raise exception 'Definition moved: rebuild v230';end if;
if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('3c5a58198bd036c47eb5c8ba63ae01fe','7a3ba07250c86f83359874fcafb41119') then raise exception 'Definition moved: rebuild v230';end if;
end $g$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingLotusBoat":{"kind":"thing","line":"fishing","rank":8,"by":1}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('boatRoutes','[{"dock":[180,133],"anchor":[180,137],"float":[180.5,136.5],"habitat":"creek"},{"dock":[216,138],"anchor":[216,140],"float":[216.5,140.5],"habitat":"headwater"}]'::jsonb) where key='rewards';
create table if not exists town.reward_boats(owner uuid primary key references public.profiles(id),doc jsonb not null);
alter table town.reward_boats enable row level security;
revoke all on town.reward_boats from public,anon,authenticated;
create or replace function town.boat_busy(who uuid,t bigint)
returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.town_lines l where l.member_id=who and
  greatest(coalesce((l.doc->>'bites_at')::bigint,0),coalesce((l.doc->>'struck_at')::bigint,0))+180000>t)
$$;
create or replace function public.town_reward_boats(p_x integer,p_y integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=town.far_member();t bigint:=town.now_ms();begin
 if p_x is null or p_y is null or abs(p_x::bigint)>10000 or abs(p_y::bigint)>10000 then raise exception 'Invalid boat view';end if;
 return jsonb_build_object('now',t,'boats',(select coalesce(jsonb_agg(q.doc||jsonb_build_object('name',coalesce(pr.character_name,pr.display_name,'')) order by q.owner),'[]'::jsonb)
 from (select b.owner,b.doc from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)
 union all select n.owner,n.doc from (select b.owner,b.doc from town.reward_boats b where (b.doc->>'until')::bigint>t and b.owner<>me and b.doc->>'guest' is distinct from me::text
 and greatest(abs(p_x-(town.cat('rewards')->'boatRoutes'->((b.doc->>'site')::integer)->'dock'->>0)::integer),abs(p_y-(town.cat('rewards')->'boatRoutes'->((b.doc->>'site')::integer)->'dock'->>1)::integer))<=24 order by b.owner limit 12) n) q
 join public.profiles pr on pr.id=q.owner));
end $$;
create or replace function town.reward_boat(p jsonb,input jsonb,me uuid,old_ jsonb,t bigint,aboard boolean,busy boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare cmd jsonb:=input->'boat';a text:=cmd->>'action';r jsonb;boat_ jsonb;station_ integer;pos_ jsonb;to_ integer;duration_ bigint;membership_ jsonb;out_ jsonb:=p;
begin
 if jsonb_typeof(cmd) is distinct from 'object' or a is null or a not in ('launch','open','join','depart','return','leave') then return town.no('none');end if;
 if a='launch' then
  if jsonb_typeof(cmd->'site') is distinct from 'number' or (cmd->>'site')::numeric<>floor((cmd->>'site')::numeric) or (cmd->>'site')::numeric not between 0 and 1 then return town.no('far');end if;
  r:=town.cat('rewards')->'boatRoutes'->((cmd->>'site')::integer);if input->'at' is distinct from r->'dock' then return town.no('far');end if;
  if not town.gift_works(p,'thingLotusBoat') or cmd->>'owner' is not null and cmd->>'owner'<>me::text then return town.no('none');end if;
  if aboard or (old_->>'until')::bigint>t or busy then return town.no('spent');end if;
  boat_:=jsonb_build_object('owner',me,'guest',null,'site',cmd->'site','station',0,'open',false,'until',t+1800000,'trip',null);
  out_:=town.spend(p,2::double precision,t);
 else
  if old_ is null or (old_->>'until')::bigint<=t then return town.no('none');end if;
  r:=town.cat('rewards')->'boatRoutes'->((old_->>'site')::integer);if r is null then return town.no('none');end if;
  station_:=(old_->>'station')::integer;
  if (old_->'trip'->>'arrives')::bigint>t then return town.no('spent');end if;
  pos_:=case when station_=0 then r->'dock' else r->'anchor' end;if input->'at' is distinct from pos_ then return town.no('far');end if;
  boat_:=old_;
  if a='join' then
   if old_->>'owner'=me::text or station_<>0 or old_->'open' is distinct from 'true'::jsonb or coalesce(old_->'guest','null'::jsonb)<>'null'::jsonb or aboard or busy then return town.no('none');end if;
   boat_:=old_||jsonb_build_object('guest',me,'open',false);
  else
   if old_->>'owner'<>me::text and old_->>'guest' is distinct from me::text then return town.no('none');end if;
   if a='open' then
    if old_->>'owner'<>me::text or station_<>0 or jsonb_typeof(cmd->'open') is distinct from 'boolean' then return town.no('none');end if;
    return jsonb_build_object('ok',true,'purse',p,'boat',old_||jsonb_build_object('open',cmd->'open'));
   elsif a='leave' then
    if station_<>0 then return town.no('far');end if;
    boat_:=case when old_->>'owner'=me::text then old_||jsonb_build_object('until',t,'open',false) else old_||jsonb_build_object('guest',null) end;
   else
    to_:=case when a='depart' then 1 else 0 end;
    if station_=to_ or a='depart' and old_->>'owner'<>me::text or busy then return town.no('spent');end if;
    duration_:=ceil(sqrt(power((r->'dock'->>0)::numeric-(r->'anchor'->>0)::numeric,2)+power((r->'dock'->>1)::numeric-(r->'anchor'->>1)::numeric,2))/3.5*1000)::bigint;
    boat_:=old_||jsonb_build_object('station',to_,'open',false,'trip',jsonb_build_object('from',station_,'to',to_,'at',t,'arrives',t+duration_))||case when to_=0 then jsonb_build_object('until',t+duration_) else '{}'::jsonb end;
   end if;
  end if;
 end if;
 membership_:=case when a='leave' then 'null'::jsonb else jsonb_build_object('owner',boat_->'owner','until',boat_->'until') end;
 return jsonb_build_object('ok',true,'purse',out_||jsonb_build_object('professionRewards',coalesce(out_->'professionRewards','{}'::jsonb)||jsonb_build_object('boat',membership_)),'boat',boat_);
end $$;
create or replace function town.boat_water(b jsonb,x integer,y integer,t bigint)
returns jsonb language sql stable set search_path='' as $$
 select case when (b->>'until')::bigint>t and b->'station'='1'::jsonb and coalesce((b->'trip'->>'arrives')::bigint,0)<=t and r->'anchor'=jsonb_build_array(x,y)
 then jsonb_build_object('habitat',r->'habitat','current','run') end from (select town.cat('rewards')->'boatRoutes'->((b->>'site')::integer) r) q
$$;
revoke all on function town.boat_busy(uuid,bigint),town.reward_boat(jsonb,jsonb,uuid,jsonb,bigint,boolean,boolean),town.boat_water(jsonb,integer,integer,bigint),public.town_reward_boats(integer,integer) from public,anon,authenticated;
grant execute on function public.town_reward_boats(integer,integer) to authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$
;
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';commit;
select not has_table_privilege('authenticated','town.reward_boats','SELECT') as boats_private;

-- ===== v231_three_clues_before_a_legend_returns.sql =====
-- v231: one private river-dragon trail/day and one known-legend encounter after three manual clues.
-- Run after v230 with matching site. Original eligibility filters, bait, fight and landing remain mandatory.
-- Pair/star casts never spend an encounter; changed conditions preserve it for at most thirty minutes.
begin;do $g$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('ac1d70c0e62d41141c0855350a9fcafd','ce123ffaef22d8d4c01e7e37f4bd3212') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('7a3ba07250c86f83359874fcafb41119','dc29a26fcb2a46458c7ef97dd5858190') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('town.reward_trail(jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('6b239b62d4fddf7b01e1cd0af5963ec1','e7a2359763f418c868e08653d22f2ee4') then raise exception 'Definition moved: rebuild v231';end if;
if md5(replace(pg_get_functiondef('town.reward_school_pool(jsonb,uuid,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('267aca062a4c1e11235b78f8f36d20db','7037e371a7526bfcd98980a42ba95b9e') then raise exception 'Definition moved: rebuild v231';end if;
end $g$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famRiverDragon":{"kind":"familiar","line":"fishing","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famRiverDragon":{"n":1,"per":"day"}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('dragonBanks','[{"at":[0,23],"clues":[[0,17],[5,17],[3,22]]},{"at":[12,39],"clues":[[6,33],[14,33],[6,38]]},{"at":[174,135],"clues":[[169,129],[174,129],[179,129]]},{"at":[216,138],"clues":[[211,132],[216,132],[221,132]]},{"at":[18,252],"clues":[[12,246],[17,246],[22,246]]}]'::jsonb) where key='rewards';
create or replace function town.reward_dragon_begin(p jsonb,me uuid,request uuid,input jsonb,t bigint,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare bank_ jsonb;fish_ text:=input->>'fish';odds_ jsonb;used_ jsonb;seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);nodes_ jsonb:='[]'::jsonb;run_ jsonb;i integer;
begin
 select b into bank_ from jsonb_array_elements(town.cat('rewards')->'dragonBanks') b where b->'at'=input->'at';if bank_ is null then return town.no('far');end if;
 if seed_ not between 0 and 4294967295 or not town.gift_works(p,'famRiverDragon') or coalesce(p->'professionRewards'->'trail','null'::jsonb)<>'null'::jsonb or (p->'professionRewards'->'dragon'->>'until')::bigint>t
 or town.cat('fish')->fish_->>'tier' is distinct from 'legend' or coalesce((p->'best'->>fish_)::numeric,0)<=0 or input->>'current' is null then return town.no('none');end if;
 odds_:=town.reward_school_pool(p,me,input,t);if not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 used_:=town.gift_use(p,'famRiverDragon',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
 for i in 0..2 loop nodes_:=nodes_||jsonb_build_array(jsonb_build_object('at',bank_->'clues'->((i+seed_%3)::integer%3),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
 run_:=jsonb_build_object('id',request,'kind','dragon','next',0,'began',t,'challenge',null,'dragon',jsonb_build_object('fish',fish_,'bait',input->'bait','current',input->'current','at',input->'at'),'nodes',nodes_);
 return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',coalesce(used_->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)),'trail',run_,'left',used_->'left');
end $$;
create or replace function town.reward_dragon_draw(p jsonb,odds_ jsonb,bait_ text,current_ text,at_ jsonb,pair_ boolean,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare call_ jsonb:=p->'professionRewards'->'dragon';begin
 if coalesce(call_,'null'::jsonb)='null'::jsonb or (call_->>'until')::bigint<=t or not town.gift_works(p,'famRiverDragon') or pair_ or star_ or call_->>'bait' is distinct from bait_ or call_->>'current' is distinct from current_ or call_->'at' is distinct from at_ or town.cat('fish')->(call_->>'fish')->>'tier' is distinct from 'legend' or coalesce((p->'best'->>(call_->>'fish'))::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=call_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',null)),'odds',jsonb_build_array(jsonb_build_object('what',call_->'fish','p',1)));
end $$;
revoke all on function town.reward_dragon_begin(jsonb,uuid,uuid,jsonb,bigint,bigint),town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;dragon_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_trail(p jsonb, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'trail';kind_ text;gift_ text;sites jsonb;nodes jsonb:='[]'::jsonb;
 x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;seed_ bigint;count_ integer;offset_ integer;step_ integer;i integer;s jsonb;node_ jsonb;challenge_ jsonb;
 expected_ jsonb:='[]'::jsonb;target_ numeric;won boolean:=true;got jsonb:='[]'::jsonb;after_ jsonb;used jsonb;finished boolean:=false;next_ integer;
begin
 if input->>'action'='trailBegin' then
  kind_:=input->>'kind';if kind_ is null or kind_ not in ('forest','star') or coalesce(run_,'null'::jsonb)<>'null'::jsonb then return town.no('none');end if;
  gift_:=case when kind_='dragon' then 'famRiverDragon' when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
  if not exists(select 1 from jsonb_array_elements(town.cat('forest')->'spots') spot where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=8) then return town.no('far');end if;
  select jsonb_agg(spot order by ord) into sites from jsonb_array_elements(town.cat('forest')->'spots') with ordinality a(spot,ord) where greatest(abs((spot->>1)::integer-x),abs((spot->>2)::integer-y))<=28;
  count_:=jsonb_array_length(sites);if count_ is null or count_<3 then return town.no('none');end if;
  used:=town.gift_use(p,gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  offset_:=(seed_%count_)::integer;step_:=floor(count_::numeric/3)::integer;
  for i in 0..2 loop s:=sites->((offset_+i*step_)%count_);nodes:=nodes||jsonb_build_array(jsonb_build_object('at',jsonb_build_array(s->1,s->2),'game',(array['memory','order','timing'])[i+1],'seed',(seed_+i*7919)%4294967296));end loop;
  run_:=jsonb_build_object('id',request,'kind',kind_,'nodes',nodes,'next',0,'began',t,'challenge',null);
  return jsonb_build_object('ok',true,'trail',run_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'trail' then return town.no('none');end if;
 kind_:=run_->>'kind';gift_:=case when kind_='dragon' then 'famRiverDragon' when kind_='forest' then 'thingForestRing' else 'thingStarBottle' end;if not town.gift_works(p,gift_) then return town.no('none');end if;
 if input->>'action'='trailCancel' then return jsonb_build_object('ok',true,'trail',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',null)));end if;
 next_:=(run_->>'next')::integer;node_:=run_->'nodes'->next_;if node_ is null or greatest(abs(x-(node_->'at'->>0)::integer),abs(y-(node_->'at'->>1)::integer))>3 then return town.no('far');end if;
 challenge_:=run_->'challenge';
 if input->>'action'='trailStage' then
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('challenge',challenge_);
  return jsonb_build_object('ok',true,'trail',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('trail',run_)));
 end if;
 if input->>'action'<>'trailEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won:=false;end if;
 end loop;
 if won then
  if kind_='forest' then got:=jsonb_build_array(jsonb_build_array((array['forestLichen','mushroomSpores','wildMedicRoot'])[next_+1],1));elsif kind_='star' and next_=2 then got:='[["starShard",1]]'::jsonb;end if;
 end if;
 after_:=town.stow_all(p,got);if after_ is null then return town.no('full');end if;
 finished:=won and next_=2;
 if finished and kind_='dragon' then after_:=after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',run_->'dragon'||jsonb_build_object('until',t+1800000)));end if;
 run_:=case when finished then 'null'::jsonb else run_||jsonb_build_object('next',next_+case when won then 1 else 0 end,'challenge',null) end;
 return jsonb_build_object('ok',true,'trail',run_,'completed',finished,'got',got,'passed',case when won then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,2,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('trail',run_)));
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_school_pool(p jsonb, me uuid, input jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;deep_ jsonb:=town.cat('fishing')->'places'->(x::text||','||y::text);water_ jsonb:=town.cat('fishing')->'waters'->(x::text||','||y::text);
 habitat_ text:=coalesce(water_->>'habitat','town');current_ text:=coalesce(input->>'current',water_->>'current','eddy');bait_ text:=input->>'bait';sg jsonb:=town.cat('fishing')->'signs';signs_ text[];under_ jsonb;odds_ jsonb;pattern_ jsonb;rod_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
 select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1;
 if boat_ is not null then boatwater_:=town.boat_water(boat_,x,y,t);if boatwater_ is null then return '[]'::jsonb;end if;deep_:='true'::jsonb;water_:=boatwater_;habitat_:=water_->>'habitat';current_:=coalesce(input->>'current',water_->>'current');end if;
 if deep_ is null or current_ not in ('eddy','run','shelter') or (habitat_='town' and current_<>'eddy') or (habitat_='pool' and current_='run') or town.hook_bait(p,bait_)->'ok' is distinct from 'true'::jsonb then return '[]'::jsonb;end if;
 signs_:=town.signs_of(t,town.stamina_of(p,t)<=0,(select count(*)::integer from public.town_lines l where l.member_id<>me and (l.doc->>'cast_at')::bigint>t-(sg->>'lately')::bigint*1000),town.wet_ms(t-(sg->>'after')::bigint*60000,t),town.raining(t));
 under_:=town.under_orb(town.orb_of(p,t),extract(hour from to_timestamp(t/1000.0) at time zone 'Asia/Bangkok')::integer,town.raining(t),signs_);
 odds_:=town.river_odds(bait_,(under_->>'hour')::integer,(under_->>'rain')::boolean,town.has_buff(p,t,'lucky'),not deep_::boolean,array(select jsonb_array_elements_text(under_->'signs')),town.buff_by(p,t,'lucky'),habitat_,current_);
 pattern_:=town.river_pattern(p,bait_,x,y,current_,t);if habitat_<>'town' then odds_:=town.river_pattern_odds(odds_,(pattern_->>'n')::integer);end if;
 if town.is_wary(p,t) then odds_:=town.sift(odds_,array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')));end if;
 rod_:=town.rod_held(p);if rod_ is not null then odds_:=town.rarer(odds_,(town.rod_fx(rod_)->>'rare')::double precision);end if;
 return odds_;
end $function$
;
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text),town.reward_trail(jsonb,uuid,jsonb,bigint,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';commit;

-- ===== v232_beetles_return_from_the_ring_unharmed.sql =====
-- v232: three skill rounds against a beetle sparring partner. No death, wagers, goods or XP.
-- Run after v231 with matching site. Requires a beetle the player caught and still carries.
-- One private two-minute match; best record is bounded by six species. Finished matches cost one stamina.
begin;do $g$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('ce123ffaef22d8d4c01e7e37f4bd3212','498be6e94c79f8b795856205f698dd63') then raise exception 'Definition moved: rebuild v232';end if;end $g$;
update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingBeetleRing":{"kind":"thing","line":"insects","rank":7,"by":1}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('ringBeetles','["rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","scarab","orchardBeetle"]'::jsonb) where key='rewards';
create or replace function town.reward_arena(p jsonb,input jsonb,request uuid,t bigint,known_ jsonb,p_seed bigint default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare a text:=input->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'arena';beetles_ jsonb:=town.cat('rewards')->'ringBeetles';seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);bug_ text:=input->>'bug';round_ integer;attack_ integer;mark_ numeric;score_ integer:=0;answer_ jsonb;book_ jsonb;
begin
 if not town.gift_works(p,'thingBeetleRing') then return town.no('none');end if;
 if a='arenaLook' then return jsonb_build_object('ok',true,'purse',p,'knownBeetles',coalesce((select jsonb_agg(b order by ord) from jsonb_array_elements(beetles_) with ordinality v(b,ord) where known_ ? (b#>>'{}') and town.held(p->'bag',b#>>'{}')>0),'[]'::jsonb));end if;
 if a='arenaCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null)),'arena',null);end if;
 if a='arenaBegin' then
  if (run_->>'until')::bigint>t or bug_ is null or not beetles_ ? bug_ or not known_ ? bug_ or town.held(p->'bag',bug_)<1 or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'bug',bug_,'opponent',beetles_->(seed_%jsonb_array_length(beetles_))::integer,'seed',seed_,'at',input->'at','began',t,'until',t+120000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',run_)),'arena',run_);
 end if;
 if a<>'arenaEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t>(run_->>'until')::bigint or t<(run_->>'began')::bigint+6000 or town.held(p->'bag',run_->>'bug')<1 then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 seed_:=(run_->>'seed')::bigint;
 for round_ in 0..2 loop
  answer_:=input->'answers'->round_;
  if jsonb_typeof(answer_->'stance') is distinct from 'number' or (answer_->>'stance')::numeric<>floor((answer_->>'stance')::numeric) or (answer_->>'stance')::numeric not between 0 and 2 or jsonb_typeof(answer_->'mark') is distinct from 'number' or (answer_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;mark_:=.2+(seed_%61)::numeric/100;attack_:=mod(round(mark_*100),3)::integer;
  if (answer_->>'stance')::integer=(attack_+1)%3 and abs((answer_->>'mark')::numeric-mark_)<=.1 then score_:=score_+1;end if;
 end loop;
 book_:=coalesce(state_->'arenaBook','{}'::jsonb)||jsonb_build_object(run_->>'bug',greatest(coalesce((state_->'arenaBook'->>(run_->>'bug'))::integer,0),score_));
 return jsonb_build_object('ok',true,'purse',town.spend(p,1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null,'arenaBook',book_)),'arena',null,'arenaScore',score_);
end $$;
revoke all on function town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;

-- ===== v233_a_known_night_insect_under_one_lantern.sql =====
-- v233: one known nocturnal insect at the nearest eligible habitat, twenty minutes, once a day.
-- Run after v232 with matching site. Only the hour is simulated; day, moon, habitat and rain remain real.
-- Catch manually for normal cost. Private lure shares the nectar slot; no cloak follower or spawn chain.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('498be6e94c79f8b795856205f698dd63','64de20966e4ab576fb9253be6fdbfe3e') then raise exception 'Definition moved: rebuild v233';end if;
if md5(replace(pg_get_functiondef('town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)'::regprocedure),chr(13),'')) not in ('75fb8a22c5f9761e47b902c338408fca','cd954e4a16a7d7925c8afe3799e12a36') then raise exception 'Definition moved: rebuild v233';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingMoonLantern":{"kind":"thing","line":"insects","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingMoonLantern":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_lantern(p jsonb,input jsonb,t bigint,known_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare ins jsonb:=town.cat('insects');hid integer:=town.nectar_haunt((input->'at'->>0)::integer,(input->'at'->>1)::integer,ins);h jsonb;id_ text;bug_ jsonb;may_ jsonb:='[]'::jsonb;used_ jsonb;lured_ jsonb;
begin
 if not town.gift_works(p,'thingMoonLantern') or input->>'action' not in ('lanternLook','lanternLight') then return town.no('none');end if;
 if hid is not null then
  h:=ins->'haunts'->hid;
  for id_ in select jsonb_array_elements_text(ins->'order') loop
   bug_:=ins->'bugs'->id_;
   if known_ ? id_ and exists(select 1 from jsonb_array_elements(coalesce(bug_->'hours','[]'::jsonb)) hr where (hr->>0)::numeric=0 or (hr->>1)::numeric=24)
    and bug_->'at' ? (h->>0) and town.wild_fits(bug_-'hours',id_,h->>1,h->>2,t,town.word()) then may_:=may_||to_jsonb(id_);end if;
  end loop;
 end if;
 if input->>'action'='lanternLook' then return jsonb_build_object('ok',true,'purse',p,'knownBugs',may_);end if;
 id_:=input->>'bug';if hid is null or id_ is null or not may_ ? id_ then return town.no('none');end if;
 if (p->'lured'->>'until')::bigint>t then return town.no('none');end if;
 used_:=town.gift_use(p,'thingMoonLantern',t);if not (used_->>'ok')::boolean then return used_;end if;
 lured_:=jsonb_build_object('x',input->'at'->0,'y',input->'at'->1,'haunt',hid,'bug',id_,'n',1,'from',t+3000,'until',t+1200000,'seed',(hid::bigint*100003+t/1000)%2147483647,'origin','lantern');
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',2::double precision,t)||jsonb_build_object('lured',lured_),'knownBugs',may_,'lured',lured_,'left',used_->'left');
end $$;
revoke all on function town.reward_lantern(jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse, p_now) + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
  -- ── the older tools (v174): the forged net in the hand, and the catch's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);
    after_ := more_->'purse';
    return jsonb_build_object('ok', true,
      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
        else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v234_one_visitor_one_choice_for_the_pollen.sql =====
-- v234: a real pollinator, one choice per root per bearing.
-- Run after v233 with matching site. Growth OR crossing; original pollenRound, ownership and dead/ripe gates.
-- Crossing still requires the original ripe-neighbour pair. Graft knife and visitor share two hybrid seeds.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)'::regprocedure),chr(13),'')) not in ('e31cfb29f79bd51f6eb84331fd232622','9f4903c825e2b347bc7ffd110ac2b5e5') then raise exception 'Definition moved: rebuild v234';end if;
if md5(replace(pg_get_functiondef('town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('ede21eb0eaa02449de5de71bb49a132e','2cea6d67a8a6c99cb0427d94d8b50f54') then raise exception 'Definition moved: rebuild v234';end if;
end $guard$;update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"charmPollenGuardian":{"kind":"charm","line":"insects","rank":9,"by":1}}'::jsonb) where key='gifts';
CREATE OR REPLACE FUNCTION town.insect_care(p_key text, p_plot jsonb, p_purse jsonb, p_slot integer, p_mode text, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 k jsonb:=town.cat('insect_garden'); s jsonb; p jsonb:=p_plot->'plant'; seen jsonb;
 plant_ jsonb; book jsonb:=coalesce(p_purse->'insectGardenBook','[]'::jsonb); entry text; allowed jsonb;
begin
 if p_slot is null or p_slot<0 or p_slot>=jsonb_array_length(p_purse->'bag') or p_mode is null or p_mode not in ('pollinate','guard','grow','cross') then return town.no('none'); end if;
 if p_mode in ('grow','cross') and not town.gift_works(p_purse,'charmPollenGuardian') then return town.no('none');end if;
 s:=p_purse->'bag'->p_slot;
 allowed:=case when p_mode<>'guard' then k->'pollinators' else k->'predators' end;
 if not coalesce(allowed ? (s->>'item') and (s->>'n')::numeric>=1,false) then return town.no('none'); end if;
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return town.no('soil'); end if;
 seen:=town.see(p_key,p_plot,p_now);
 if (seen->>'dead')::boolean then return town.no('soil'); end if;
 if p_mode<>'guard' and p->>'by' is distinct from p_me then return town.no('theirs'); end if;
 if p_mode<>'guard' and ((seen->>'ripe')::boolean or p->'pollenRound'=p->'picked') then return town.no('wet'); end if;
 if p_mode='guard' and not (seen->>'pest')::boolean then return town.no('soil'); end if;
 if p_mode<>'guard' then
  plant_:=p || jsonb_build_object('pollenRound',p->'picked','pollenUntil',p_now+60000*case when town.held(town.carried_bag(p_purse),'releaseCage')>0 then (k->>'cageMinutes')::bigint else (k->>'pollenMinutes')::bigint end,
    'boost',(p->>'boost')::numeric+case when p_mode='cross' then 0 when p_mode='grow' then 3600000 when town.held(town.carried_bag(p_purse),'pollenFan')>0 then (k->>'fanBoost')::numeric else (k->>'boost')::numeric end);
  if p_mode='cross' then plant_:=plant_||jsonb_build_object('insectCrossRound',p->'picked');end if;
 else
  plant_:=p || jsonb_build_object('cured',p_now,'guard',greatest((p->>'guard')::bigint,case when town.held(town.carried_bag(p_purse),'pestWhistle')>0 then p_now+(k->>'guardMinutes')::bigint*60000 else 0 end));
 end if;
 entry:=(s->>'item')||':'||(p->>'crop')||':'||p_mode;
 if not book ? entry then book:=book || to_jsonb(entry); end if;
 return jsonb_build_object('ok',true,'mode',p_mode,'plot',p_plot || jsonb_build_object('plant',plant_),
   'purse',p_purse || jsonb_build_object('bag',town.take(p_purse->'bag',s->>'item',1),'insectGardenBook',book));
end $function$
;
CREATE OR REPLACE FUNCTION town.garden_harvest(p_key text, p_before jsonb, p_plot jsonb, p_plots jsonb, p_done jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 p jsonb:=p_plot->'plant'; after_ jsonb:=p_done->'purse'; updated jsonb:=p_done->'plot'; extras jsonb:='[]'::jsonb;
 child text:=town.garden_cross(p_key,p_plots,p->>'by',p_now); book jsonb; stowed jsonb;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return p_done; end if;
 if p->>'root' is not null and town.held(town.carried_bag(p_before),'gardenTwine')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(p->>'crop',(town.cat('gardening')->>'extra')::integer)); end if;
 if updated->'plant'='null'::jsonb and p->>'root' is not null and town.held(town.carried_bag(p_before),'seedTray')>0 then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->(p->>'crop')->>'seed',1)); end if;
 if child is not null then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->child->>'seed',case when town.held(town.carried_bag(p_before),'graftKnife')>0 or p->'insectCrossRound'=p->'picked' then 2 else 1 end)); end if;
 stowed:=town.stow_all(after_,extras);
 if stowed is null then return town.no('full'); end if;
 after_:=stowed;
 if child is not null then
  book:=coalesce(after_->'gardenBook','[]'::jsonb);
  if not book ? child then book:=book || to_jsonb(child); end if;
  after_:=after_ || jsonb_build_object('gardenBook',book);
  if updated->'plant'<>'null'::jsonb then updated:=jsonb_set(updated,'{plant,crossed}','true'::jsonb); end if;
 end if;
 return p_done || jsonb_build_object('purse',after_,'plot',updated,'got',p_done->'got' || extras) || case when child is not null then jsonb_build_object('cross',child) else '{}'::jsonb end;
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v235_three_catches_before_the_wings_answer.sql =====
-- v235: three distinct actual catches unlock three private themed calls, one quest/day.
-- Run after v234 with matching site. Original habitat/hour/weather rules and manual net costs remain.
-- A quest lasts twenty-four hours; followers and crown calls cannot feed quest progress. No new world spawn.
-- Catch RPCs use the purse lock before haunt/bed locks, preserving inventory and quest across commands.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text)'::regprocedure),chr(13),'')) not in ('476d92c8eae422025616b36e8f8525e5','1b4d21f6ff0e64842f3d56da18f023b8') then raise exception 'Definition moved: rebuild v235';end if;
if md5(replace(pg_get_functiondef('town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)'::regprocedure),chr(13),'')) not in ('cd954e4a16a7d7925c8afe3799e12a36','f76e4fdc4332e09897b7b66c118172e0') then raise exception 'Definition moved: rebuild v235';end if;
if md5(replace(pg_get_functiondef('public.town_net(integer,integer,integer,numeric,uuid)'::regprocedure),chr(13),'')) not in ('c62ea9d8cb64c8efcfbb822ece84e1d6','9b31f65d06e78c9c07e575ce444f95c3') then raise exception 'Definition moved: rebuild v235';end if;
if md5(replace(pg_get_functiondef('public.town_net_mine(text,integer,integer,numeric)'::regprocedure),chr(13),'')) not in ('e2146119abb2bc4f70fbf7586d199480','263212779bd9f498939164b38cf5d628') then raise exception 'Definition moved: rebuild v235';end if;
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('64de20966e4ab576fb9253be6fdbfe3e','5e372beac0e1c2324beed1bf0c782f27') then raise exception 'Definition moved: rebuild v235';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingWingCrown":{"kind":"thing","line":"insects","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingWingCrown":{"n":1,"per":"day"}}'::jsonb) where key='gifts';update public.town_catalog set data=data||jsonb_build_object('crownThemes','{"flowers":["butterflyWhite","honeyBee","hoverfly"],"garden":["ladybird","grasshopper","mantis"],"night":["cricket","moth","firefly"]}'::jsonb) where key='rewards';
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

CREATE OR REPLACE FUNCTION town.net_before_crown(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
  -- ── the older tools (v174): the forged net in the hand, the catch's end with it, and what its reader adds to the bound a catch is told far by ──
  tool_ jsonb;
  more_ jsonb;
  far_ double precision := town.net_more_far(p_purse, p_now);
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
           <= (ins->'net'->>'reach')::double precision + far_ + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', p_haunt, (p_has->>'turn')::bigint, p_now), p_now);
    return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, more_->'purse', id, n, p_x, p_y, p_now),
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)), id, n, p_x, p_y, p_now),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$
;
create or replace function town.net(p_purse jsonb,p_haunt integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_now bigint,p_lure text) returns jsonb language plpgsql stable set search_path='' as $wrap$ declare d jsonb:=town.net_before_crown(p_purse,p_haunt,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_now,p_lure);begin if d->'ok'='true'::jsonb then d:=jsonb_set(d,'{purse}',town.reward_crown_caught(p_purse,d->'purse',d->'got',p_now,false));end if;return d;end $wrap$;
revoke all on function town.net_before_crown(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text) from public,anon,authenticated;;
CREATE OR REPLACE FUNCTION town.net_mine_before_crown(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse, p_now) + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
  -- ── the older tools (v174): the forged net in the hand, and the catch's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);
    after_ := more_->'purse';
    return jsonb_build_object('ok', true,
      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
        else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else case when l->>'origin' in ('lantern','crown') then after_ || jsonb_build_object('lured',null) else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$
;
create or replace function town.net_mine(p_purse jsonb,p_which text,p_hand text,p_x integer,p_y integer,p_misses double precision,p_now bigint) returns jsonb language plpgsql stable set search_path='' as $wrap$ declare d jsonb:=town.net_mine_before_crown(p_purse,p_which,p_hand,p_x,p_y,p_misses,p_now);begin if d->'ok'='true'::jsonb then d:=jsonb_set(d,'{purse}',town.reward_crown_caught(p_purse,d->'purse',d->'got',p_now,p_which='pair' or coalesce(p_purse->'lured'->>'origin'='crown',false)));end if;return d;end $wrap$;
revoke all on function town.net_mine_before_crown(jsonb,text,text,integer,integer,double precision,bigint) from public,anon,authenticated;;
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random(),
        -- ── the older tools (v174): the row as the forged net in the hand has it (null, the row as it is, with any other) ──
        town.net_cat(purse, ins));
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_net_mine(p_which text, p_x integer, p_y integer, p_misses numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  did jsonb;
  bug text;
  h jsonb;
  book jsonb;
  is_first boolean := false;
  rid jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_which is null or p_which not in ('lured', 'pair') then return town.answer(me, town.no('none')); end if;
  did := town.net_mine(purse, p_which, town.hand_of(purse), p_x, p_y, misses, now_);
  if (did->>'ok')::boolean then
    bug := did->'got'->0->>0;
    perform town.keep_purse(me, did->'purse');
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    rid := town.rid_by(bug, now_);
    h := case when p_which = 'lured' then ins->'haunts'->((purse->'lured'->>'haunt')::int) end;
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when p_which = 'lured' then jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1) else jsonb_build_object('pair', true) end
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v236_four_real_servings_on_a_picnic_cloth.sql =====
-- v236: up to four actual pot servings on a picnic cloth, one stamina to place.
-- Run after v235 with matching site. Nearby players choose to sit and eat in thirty seconds.
-- Original meal quotas, strength, buffs, early-rise forfeiture and borrowed bowls remain; no extra food.
-- Uses existing shared pot rows, expiry/table transfer, reader and pickup; no new polling or world tables.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('5e372beac0e1c2324beed1bf0c782f27','9980988523ab92e381671a8e72e657ed') then raise exception 'Definition moved: rebuild v236';end if;
if md5(replace(pg_get_functiondef('town.chew(jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('b3fb0ddebcc08357467bccf7b22e8229','525925cefc0de299d4bbbf41bc8fd352') then raise exception 'Definition moved: rebuild v236';end if;
if md5(replace(pg_get_functiondef('town.settle(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('599fa75d406bcb6f44b94dd289d5e915','60bf0e51db80097200d68d3316b4bab1') then raise exception 'Definition moved: rebuild v236';end if;
end $guard$;update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'{"thingPicnicCloth":{"kind":"thing","line":"kitchen","rank":7,"by":1}}'::jsonb) where key='gifts';
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

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := case when e->'picnic'='true'::jsonb then 30000 else (st->>'minutes')::bigint * 60000 end;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  -- ── the older tools (v174): with what the helping carries from its pot (nothing, of any other) ──
  gain := ((dish->>'stamina')::double precision
      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  -- ── the older tools (v174): and what it carries for the buff its dish leaves ──
  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then
    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');
  end if;
  -- ── the older tools (v174): its end ──
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.settle(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  ends bigint;
begin
  if e = 'null'::jsonb then return town.bowls_back(p_purse, 0); end if;
  ends := (e->>'from')::bigint + case when e->'picnic'='true'::jsonb then 30000 else (town.cat('stamina')->>'minutes')::bigint * 60000 end;
  if p_now >= ends then return town.chew(p_purse, 0, ends)->'purse'; end if;
  return town.bowls_back(p_purse, 0);
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v237_fire_flavour_and_five_real_banquet_servings.sql =====
-- v237: playable kitchen ranks eight through ten. Run after v236 with matching site.
-- Optional narrow fire checkpoints, actual extra flavour ingredients, and a three-stage five-serving banquet.
-- Existing recipes, ingredients, cookware, original manual games, meal quotas and shared feast readers remain.
-- Reserved banquet food is forfeited on cancellation/expiry; completed servings preserve dish and pot marks.
-- No new world tables/polling. Secondary effects are level one for thirty minutes; strongest matching buff wins.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9980988523ab92e381671a8e72e657ed','3781fde5409c9220cf513ce1882ddb76') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('public.town_cook(jsonb,uuid[],jsonb)'::regprocedure),chr(13),'')) not in ('7d5cf7fa50f72ff4bd7ee34b776a73a5','1746806d97b7f18f0bf77fd1d50ecb93') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('town.pot_marks(jsonb)'::regprocedure),chr(13),'')) not in ('80e0b8ad4a4443778c326b3111245e13','aef5e95240a23ba6ebb9b8ecbf87d724') then raise exception 'Definition moved: rebuild v237';end if;
if md5(replace(pg_get_functiondef('town.chew(jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('525925cefc0de299d4bbbf41bc8fd352','e245714b14425559da7a2bb3a6f16cdb') then raise exception 'Definition moved: rebuild v237';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmChefFlame":{"kind":"charm","line":"kitchen","rank":8,"by":1},"thingFlavorBook":{"kind":"thing","line":"kitchen","rank":9,"by":1},"thingDragonPot":{"kind":"thing","line":"kitchen","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmChefFlame":{"n":3,"per":"day"},"thingFlavorBook":{"n":3,"per":"day"},"thingDragonPot":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
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

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION public.town_cook(p_things jsonb, p_crew uuid[] DEFAULT '{}'::uuid[], p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  how jsonb := jsonb_build_object('sprite', coalesce(town.claims(p_timing)->'sprite' = 'true'::jsonb, false), 'flame', coalesce(town.claims(p_timing)->'flame' = 'true'::jsonb, false));
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook_with(purse, p_things, crew, misses, now_, how);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  did:=town.reward_kitchen_cooked(purse,did,misses,now_,me,gen_random_uuid());
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims) || case when did->'sprite' = 'true'::jsonb then '{"sprite": true}'::jsonb when did->'back' = 'true'::jsonb then '{"back": true}'::jsonb else '{}'::jsonb end);
  if did->'sprite' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'famSprite', 1, 0, jsonb_build_object('made', made, 'n', did->'n',
      'left', (town.cat('gifts')->'uses'->'famSprite'->>'n')::integer - town.used_of(after, 'famSprite', now_)));
  end if;
  if did->'back' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'thingFlame', 1, 0, jsonb_build_object('things', town.tidy(p_things), 'taste', did->'taste',
      'left', (town.cat('gifts')->'uses'->'thingFlame'->>'n')::integer - town.used_of(after, 'thingFlame', now_)));
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$function$
;
create or replace function town.pot_marks(p_from jsonb) returns jsonb language sql immutable set search_path='' as $marks$
 select case when jsonb_typeof(p_from->'warm')='number' and (p_from->>'warm')::numeric>0 then jsonb_build_object('warm',p_from->'warm') else '{}'::jsonb end
 ||case when jsonb_typeof(p_from->'scent')='number' and (p_from->>'scent')::numeric>0 then jsonb_build_object('scent',p_from->'scent') else '{}'::jsonb end
 ||case when p_from->>'secondary' in ('green','calm','keen') then jsonb_build_object('secondary',p_from->'secondary') else '{}'::jsonb end
 ||case when p_from->>'cookedBy' is not null and p_from->>'cookId' is not null then jsonb_build_object('cookedBy',p_from->'cookedBy','cookId',p_from->'cookId') else '{}'::jsonb end
 $marks$;
CREATE OR REPLACE FUNCTION town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := case when e->'picnic'='true'::jsonb then 30000 else (st->>'minutes')::bigint * 60000 end;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  -- ── the older tools (v174): with what the helping carries from its pot (nothing, of any other) ──
  gain := ((dish->>'stamina')::double precision
      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  -- ── the older tools (v174): and what it carries for the buff its dish leaves ──
  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then
    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');
  end if;
  -- ── the older tools (v174): its end ──
  if done then after:=town.reward_food_finished(after,e,p_now);end if;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v238_one_giant_root_and_pollen_kept_for_tomorrow.sql =====
-- v238: farming ranks seven through nine. Run after v237 with matching site.
-- Four ordinary seeds reserve one 2x2 giant root, real growth, six base yields, blade/twine once, no mandrake repeat.
-- Choose an actual known ripe neighbouring cross; or spend a ripe source's crossing right to keep pollen.
-- Seven sources/day, three samples, twenty-four hours, one-use known adjacent same-bed pairing and original seed cap.
-- Existing plot rows, root/satellite triggers and farming readers; no new tables or polling.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('3781fde5409c9220cf513ce1882ddb76','a88f1ea062ab9d6166a19919ac396bec') then raise exception 'Definition moved: rebuild v238';end if;
if md5(replace(pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint)'::regprocedure),chr(13),'')) not in ('123e3b961add321438dfd53dcc05d1f4','9d43fb6a887d6e5dd19a87a85ff7274e') then raise exception 'Definition moved: rebuild v238';end if;
if md5(replace(pg_get_functiondef('town.garden_cross(text,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('dcedbc70568fc8a33ae1cac213528090','b994e1bdc7657b7e7fcdc03bb1c34251') then raise exception 'Definition moved: rebuild v238';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingGiantSeeds":{"kind":"thing","line":"farming","rank":7,"by":1},"thingCrossBrush":{"kind":"thing","line":"farming","rank":8,"by":1},"thingPollenSeal":{"kind":"thing","line":"farming","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingGiantSeeds":{"n":1,"per":"day"},"thingCrossBrush":{"n":3,"per":"day"},"thingPollenSeal":{"n":7,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;root_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'giant';samples_ jsonb;sample_ jsonb;cells_ jsonb;crop_ text:=c->>'crop';child_ text:=c->>'child';seed_item text;used_ jsonb;after_ jsonb;updated_ jsonb:='{}'::jsonb;cell_ text;plant_ jsonb;z bigint;mark_ numeric;pass_ boolean:=true;i integer;owner_ text;keeping_ jsonb;n_ integer;item_ text;identity_ text;pair_ jsonb;adjacent_ boolean;
begin
 if a='giantCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null)),'giant',null);end if;
 if bed_<0 then return town.no('far');end if;
 -- Match ordinary tend/row: purse first, then one bed. No second member's purse is touched.
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;root_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 owner_:=town.owner_of(keeping_,exists(select 1 from public.town_plots q where q.bed=bed_ and q.plant is not null),t);
 select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) into samples_ from jsonb_array_elements(coalesce(state_->'pollen','[]'::jsonb)) with ordinality q(s,ord) where (s->>'until')::bigint>t;
 if a in ('giantBegin','giantEnd') then
  cells_:=jsonb_build_array(key_,(x_+1)::text||','||y_::text,x_::text||','||(y_+1)::text,(x_+1)::text||','||(y_+1)::text);
  if a='giantEnd' then crop_:=r->>'crop';end if;seed_item:=town.cat('crops')->crop_->>'seed';
  if not town.gift_works(p,'thingGiantSeeds') or owner_ is distinct from me::text or crop_ is null or crop_ not in ('pumpkin','cabbage','carrot','daikon','taro') or town.held(p->'bag',seed_item)<4 or exists(select 1 from jsonb_array_elements_text(cells_) q(k) where town.bed_of(split_part(k,',',1)::integer,split_part(k,',',2)::integer)<>bed_ or plots_->k->>'soil' is distinct from 'tilled' or coalesce(plots_->k->'plant','null'::jsonb)<>'null'::jsonb) then return town.no('none');end if;
  if a='giantBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'thingGiantSeeds',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   r:=jsonb_build_object('id',request_,'key',key_,'crop',crop_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',r)),'giant',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
  after_:=town.spend(p,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'giant',null,'gardenPassed',false);end if;
  plant_:=jsonb_build_object('by',me,'crop',crop_,'sown',t,'boost',0,'watered',case when plot_->'damp'='true'::jsonb then t else 0 end,'fed',0,'guard',0,'cured',0,'picked',0,'pickedAt',0,'root',key_,'footprint',cells_,'giant',true)||case when plot_->'damp'='true'::jsonb then '{"moist":true}'::jsonb else '{}'::jsonb end;
  for cell_ in select jsonb_array_elements_text(cells_) loop updated_:=updated_||jsonb_build_object(cell_,jsonb_build_object('soil','tilled','plant',plant_));end loop;
  after_:=after_||jsonb_build_object('bag',town.take(after_->'bag',seed_item,4));
 else
  if root_ is null or root_='null'::jsonb or root_->>'by' is distinct from me::text or (root_->>'root' is not null and root_->>'root'<>key_) or coalesce((root_->>'crossed')::boolean,false) or not (town.see(key_,plot_,t)->>'ripe')::boolean then return town.no('none');end if;
  if a='gardenBrush' then
   if not town.gift_works(p,'thingCrossBrush') or child_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or root_->>'crossChoice' is not null or town.garden_cross(key_,plots_||jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_))),me::text,t) is distinct from child_ then return town.no('none');end if;
   used_:=town.gift_use(p,'thingCrossBrush',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=used_->'purse';updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_)));
  elsif a='pollenCollect' then
   if not town.gift_works(p,'thingPollenSeal') or jsonb_array_length(samples_)>=3 then return town.no('none');end if;used_:=town.gift_use(p,'thingPollenSeal',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   identity_:=key_||':'||(root_->>'by')||':'||(root_->>'crop')||':'||(root_->>'sown');sample_:=jsonb_build_object('id',request_,'key',key_,'crop',root_->'crop','cells',coalesce(root_->'footprint',jsonb_build_array(key_)),'bed',bed_,'identity',identity_,'until',t+86400000);
   after_:=used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('pollen',samples_||jsonb_build_array(sample_)));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  elsif a='pollenApply' then
   select s into sample_ from jsonb_array_elements(samples_) q(s) where s->>'id'=c->>'sample';
   select v into pair_ from jsonb_array_elements(town.cat('gardening')->'crosses') q(v) where v->>2=child_ and (v->>0=root_->>'crop' and v->>1=sample_->>'crop' or v->>1=root_->>'crop' and v->>0=sample_->>'crop') limit 1;
   select exists(select 1 from jsonb_array_elements_text(sample_->'cells') a(k) cross join jsonb_array_elements_text(coalesce(root_->'footprint',jsonb_build_array(key_))) b(k) where greatest(abs(split_part(a.k,',',1)::integer-split_part(b.k,',',1)::integer),abs(split_part(a.k,',',2)::integer-split_part(b.k,',',2)::integer))=1) into adjacent_;
   if not town.gift_works(p,'thingPollenSeal') or sample_ is null or pair_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or (sample_->>'bed')::integer<>bed_ or not adjacent_ or exists(select 1 from jsonb_array_elements_text(sample_->'cells') q(k) where coalesce(root_->'footprint',jsonb_build_array(key_))?k) then return town.no('none');end if;
   n_:=case when town.held(town.carried_bag(p),'graftKnife')>0 or root_->'insectCrossRound'=root_->'picked' then 2 else 1 end;item_:=town.cat('crops')->child_->>'seed';if town.room(p->'bag',item_)<n_ then return town.no('full');end if;
   after_:=p||jsonb_build_object('bag',town.put(p->'bag',item_,n_),'professionRewards',state_||jsonb_build_object('pollen',(select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) from jsonb_array_elements(samples_) with ordinality q(s,ord) where s->>'id'<>sample_->>'id')));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  else return town.no('none');end if;
 end if;
 for cell_ in select jsonb_object_keys(updated_) loop insert into public.town_plots(x,y,bed,soil,plant,changed) values(split_part(cell_,',',1)::integer,split_part(cell_,',',2)::integer,bed_,updated_->cell_->>'soil',updated_->cell_->'plant',t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;end loop;
 if a='giantEnd' then update public.town_beds b set tended=t,empty=0 where b.bed=bed_ and b.member_id=me;end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',updated_)||case when a='giantEnd' then jsonb_build_object('giant',null,'gardenPassed',true) when a='pollenApply' then jsonb_build_object('got',jsonb_build_array(jsonb_build_array(item_,n_))) else '{}'::jsonb end;
end $$;
revoke all on function town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
begin
  if p = 'null'::jsonb or (p->>'root' is not null and p->>'root' <> p_key) then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if p->'giant'='true'::jsonb then n:=n+5*town.yield_of(p_key,p,null);end if;
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if coalesce(p->'giant','false'::jsonb)<>'true'::jsonb and last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  return town.garden_harvest(p_key,p_purse,p_plot,town.garden_plots(p_key),jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(mine->'bag', p->>'crop', n))),p_now);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.garden_cross(p_key text, p_plots jsonb, p_me text, p_now bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 p jsonb:=p_plots->p_key->'plant'; c jsonb; other text; q record; mine text; theirs text; x integer; y integer; u integer; v integer;
begin
 if p is null or p='null'::jsonb or p->>'by' is distinct from p_me or coalesce((p->>'crossed')::boolean,false) or not (town.see(p_key,p_plots->p_key,p_now)->>'ripe')::boolean then return null; end if;
 for c in select e.v from jsonb_array_elements(town.cat('gardening')->'crosses') with ordinality e(v,ord) order by ord loop
  continue when p->>'crossChoice' is not null and p->>'crossChoice'<>c->>2;
  other:=case when p->>'crop'=c->>0 then c->>1 when p->>'crop'=c->>1 then c->>0 end;
  continue when other is null;
  for q in select e.key,e.value from jsonb_each(p_plots) e where e.value->'plant'->>'crop'=other and e.value->'plant'->>'by'=p_me and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key) order by e.key loop
   continue when not (town.see(q.key,q.value,p_now)->>'ripe')::boolean;
   for mine in select jsonb_array_elements_text(coalesce(p->'footprint',jsonb_build_array(p_key))) loop
    x:=split_part(mine,',',1)::integer; y:=split_part(mine,',',2)::integer;
    for theirs in select jsonb_array_elements_text(coalesce(q.value->'plant'->'footprint',jsonb_build_array(q.key))) loop
     u:=split_part(theirs,',',1)::integer; v:=split_part(theirs,',',2)::integer;
     if town.bed_of(x,y)=town.bed_of(u,v) and greatest(abs(x-u),abs(y-v))=1 then return c->>2; end if;
    end loop;
   end loop;
  end loop;
 end loop;
 return null;
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v239_three_canopy_gardens_on_a_real_bean_vine.sql =====
-- v239: farming rank ten, a private three-stage canopy garden with checkpoints.
-- Run after v238 with matching site. Start beside an own living bean root, one start/day.
-- Three actual beans, one seed and three stamina start it; two stamina per game, max nine attempts, thirty-minute run.
-- One finite harvest: six beans and one personally known seed. Original world roots/readers and gates remain.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('a88f1ea062ab9d6166a19919ac396bec','da266c35b48ed6092b83875844bab044') then raise exception 'Definition moved: rebuild v239';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingSkyBean":{"kind":"thing","line":"farming","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingSkyBean":{"n":1,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_bean(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me text,plot_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'bean';a text:=c->>'action';key_ text:=(c->'at'->>0)||','||(c->'at'->>1);used_ jsonb;after_ jsonb;challenge_ jsonb;z bigint;next_ integer;game_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;i integer;pass_ boolean:=true;completed_ boolean;got_ jsonb:='[]'::jsonb;
begin
 if not town.gift_works(p,'thingSkyBean') then return town.no('none');end if;
 if a='beanCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',null)),'bean',null);end if;
 if a='beanBegin' then
  if (r->>'until')::bigint>t or plot_->'plant'->>'by' is distinct from me or plot_->'plant'->>'crop' is distinct from 'longBean' or (plot_->'plant'->>'root' is not null and plot_->'plant'->>'root'<>key_) or (town.see(key_,plot_,t)->>'dead')::boolean or town.held(p->'bag','longBean')<3 or town.held(p->'bag','seedLongBean')<1 or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingSkyBean',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'at',c->'at','seed',seed_,'next',0,'attempts',0,'until',t+1800000,'seedItem',case when coalesce(p->'gardenBook','[]'::jsonb)?'rowBean' then 'seedRowBean' else 'seedLongBean' end,'challenge',null);
  return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',3::double precision,t)||jsonb_build_object('bag',town.take(town.take(p->'bag','longBean',3),'seedLongBean',1),'professionRewards',state_||jsonb_build_object('bean',r)),'bean',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or (r->>'until')::bigint<t or greatest(abs((r->'at'->>0)::integer-(c->'at'->>0)::integer),abs((r->'at'->>1)::integer-(c->'at'->>1)::integer))>2 then return town.no('far');end if;
 challenge_:=r->'challenge';if a='beanStage' then if coalesce(challenge_,'null'::jsonb)='null'::jsonb or (challenge_->>'until')::bigint<t then challenge_:=jsonb_build_object('id',request_,'began',t,'until',least((r->>'until')::bigint,t+90000));end if;r:=r||jsonb_build_object('challenge',challenge_);return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',r)),'bean',r);end if;
 if coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from c->>'challenge' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(r->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];z:=((r->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(c->'answers') is distinct from 'array' or jsonb_array_length(c->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop if jsonb_typeof(c->'answers'->i) is distinct from 'number' or (c->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;if (case when game_='timing' then abs((c->'answers'->>i)::numeric-(expected_->>i)::numeric)>.09 else (c->'answers'->>i)::numeric<>(expected_->>i)::numeric end) then pass_:=false;end if;end loop;
 completed_:=pass_ and next_=2;if completed_ then got_:=jsonb_build_array(jsonb_build_array('longBean',6),jsonb_build_array(r->>'seedItem',1));end if;after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 r:=case when completed_ or (r->>'attempts')::integer+1>=9 then 'null'::jsonb else r||jsonb_build_object('next',next_+case when pass_ then 1 else 0 end,'attempts',(r->>'attempts')::integer+1,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('bean',r)),'bean',r,'got',got_,'completed',completed_,'beanPassed',pass_);
end $$;
revoke all on function town.reward_bean(jsonb,jsonb,uuid,bigint,bigint,text,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;notify pgrst,'reload schema';commit;

-- ===== v240_missed_garden_beats_and_one_returning_root.sql =====
-- v240: helpers seven and nine. Run after v239 with matching site; safe rerun.
-- Only missed offered garden beats create ten-minute checkpoints. Recovery pays the original tool/water/cost once.
-- Rescue only retained, unpicked, pest-dead foreign roots once, with a real seed/cure and three stamina.
-- Preserve original root identity, reset growth to fifty percent, and keep world readers/cache contracts.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('da266c35b48ed6092b83875844bab044','9f0b1d57f7074aeda22c509064b4d380') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('9d2ef351d4ffef8059d63e01b6639864','3f21d2a38f3912e700388fc3aef38808') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('town.pour_row(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb,double precision)'::regprocedure),chr(13),'')) not in ('63bec9903c1370746b674f9461954445','9b7bcc349e069f21f473c11293a7d73c') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('public.town_row(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('91ca9eec42971574e1bd771a6516e1a2','135e9a8bd54f501d321b4b20b603957d') then raise exception 'Definition moved: rebuild v240';end if;
if md5(replace(pg_get_functiondef('public.town_longpour(integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('2fd57a59c520bd702e91d6a8493f1972','cdd2ed9394888f963745c3da527e9731') then raise exception 'Definition moved: rebuild v240';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"famGardenMender":{"kind":"familiar","line":"helpers","rank":7,"by":1},"thingReviveSeed":{"kind":"thing","line":"helpers","rank":9,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"famGardenMender":{"n":10,"per":"day"},"thingReviveSeed":{"n":3,"per":"day"}}'::jsonb) where key='gifts';
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

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
  cell_ text;
  extras_ jsonb:='[]'::jsonb;
  got_ jsonb;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  mine:=town.remember_garden_misses(mine,found->'plots',found->>'deed',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', coalesce(got_,'[]'::jsonb))
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.pour_row(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb, p_secs double precision DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  row_ jsonb;
  state jsonb := '{}'::jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb;
  key text;
  did jsonb;
  others integer;
begin
  if jsonb_typeof(p_keys) is distinct from 'array' then return town.no('none'); end if;
  row_ := town.pour_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if jsonb_array_length(row_) = 0 then return town.no('none'); end if;
  mine := town.bridged(p_purse, p_secs, p_now);
  for key in select t.key_ from jsonb_array_elements_text(row_) with ordinality as t(key_, ord) order by t.ord loop
    continue when marks->key is distinct from 'true'::jsonb;
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plots->key, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> 'water' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', plots->key->'plant'->'crop', 'times', coalesce(did->'times', '1'::jsonb)));
  end loop;
  mine:=town.remember_garden_misses(mine,row_,'water',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  return jsonb_build_object('ok', true, 'purse', mine, 'plots', state, 'each', each)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_row(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): each plot with its `damp`, where it has one ──
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
    -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then
      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;
    end if;
    -- ── the older tools (v174): its end ──
  end loop;
  perform town.keep_purse(me, did->'purse');
  if n > 0 then
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_longpour(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  hand text;
  -- what the browser says of its game: which plants the water reached, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  was jsonb;
  v_x integer;
  v_y integer;
  hot boolean := town.hot(now_);
  kind text := town.well_kind(now_);
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  kept jsonb := '{}'::jsonb;
  after jsonb;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  hand := town.hand_of(purse);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.pour_row(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks, coalesce((claims->>'secs')::double precision, 0));
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
  -- the pour, whole: how many plants it watered, and how the browser said its game went
  perform town.note(me, 'longpour', hand, n, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'marks', marks, 'claims', claims));
  -- and each plant watered, its own deed: written down as town_tend writes a watering, so that each is read as one
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    was := plots->(e->>'key')->'plant';
    perform town.note(me, 'water', e->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'row', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
    -- (kept with what my gifts, the heat and the well's water make of the watering, under their bound)
    kept := kept || jsonb_build_object(e->>'key', town.poured_as(plots->(e->>'key'), did->'plots'->(e->>'key'), now_, hot, kind, me::text, (e->>'times')::double precision, wears));
  end loop;
  after := did->'purse';
  if n > 0 then
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, kept, after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      kept := kept || (rang->'plots');
    end if;
    for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
      update public.town_plots p set plant = kept->(e->>'key')->'plant', changed = now_
       where p.x = split_part(e->>'key', ',', 1)::integer and p.y = split_part(e->>'key', ',', 2)::integer;
    end loop;
    perform town.keep_purse(me, after);
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  if n=0 then perform town.keep_purse(me,after);end if;
  -- (the plots as they are kept: with what my gifts, the heat and the well's water made of each watering)
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || case when rang is not null then jsonb_build_object('bell', rang->'bell') else '{}'::jsonb end
    || jsonb_build_object('key', key, 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)),
         'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                     from public.town_plots p where p.bed = bed_n and did->'plots' ? (p.x::text || ',' || p.y::text)));
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v241_one_more_played_beat_under_a_camp_pennant.sql =====
-- v241: helpers eight. Run after v240 with matching site; safe rerun.
-- Flag two existing own camps/day using a real cord and stamina. Normal camp benefits keep their costs and buffs.
-- Five recipients at most, one/person/day across all camps; ten-minute replay of one first missed supported beat.
-- A replay must still be played; a second miss spends the coupon and fails normally. No new tables/readers.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('9f0b1d57f7074aeda22c509064b4d380','0a4c93a1804c3d998b7412366c0e798d') then raise exception 'Definition moved: rebuild v241';end if;
if md5(replace(pg_get_functiondef('town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('6f193a24b2aba707e328b323f60b97de','dbfc2f0e2a40a06e7ed6ce0e86ab08e6') then raise exception 'Definition moved: rebuild v241';end if;
end $guard$;update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingCampFlag":{"kind":"thing","line":"helpers","rank":8,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingCampFlag":{"n":2,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.flag_benefit(p jsonb,d jsonb,me text,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare camp_ jsonb:=d->'camp';flag_ jsonb:=camp_->'flag';after_ jsonb:=d->'purse';day_ integer:=town.day_of(t);
begin
 if flag_ is null or coalesce(flag_->'members','[]'::jsonb)?me or jsonb_array_length(coalesce(flag_->'members','[]'::jsonb))>=5 or (p->>'campRetryDay')::integer=day_ then return d;end if;
 after_:=after_||jsonb_build_object('campRetry',jsonb_build_object('line',flag_->'line','until',least(t+600000,(camp_->>'until')::bigint),'site',camp_->'site'),'campRetryDay',day_);
 camp_:=camp_||jsonb_build_object('flag',flag_||jsonb_build_object('members',coalesce(flag_->'members','[]'::jsonb)||jsonb_build_array(me)));
 return d||jsonb_build_object('purse',after_,'camp',camp_);
end $$;
create or replace function town.camp_retry(p jsonb,c jsonb,t bigint)
returns jsonb language plpgsql immutable set search_path='' as $$
declare coupon_ jsonb:=p->'campRetry';miss_ jsonb:=c->'campMiss';r jsonb;line_ text;seed_ bigint;width_ numeric;index_ integer;mark_ numeric;target_ numeric;z bigint;i integer;
begin
 if not c?'campMiss' then return jsonb_build_object('ok',true,'purse',p);end if;
 if c->>'action'='giantEnd' then r:=p->'professionRewards'->'giant';line_:='farming';seed_:=(r->>'seed')::bigint;width_:=.09;
 elsif c->>'action'='reviveEnd' then r:=p->'professionRewards'->'revive';line_:='helpers';seed_:=(r->>'seed')::bigint;width_:=.07;
 elsif c->>'action'='kitchenEnd' then r:=p->'professionRewards'->'kitchen';line_:='kitchen';seed_:=((r->>'seed')::bigint+(r->>'stage')::integer)%4294967296;width_:=.065;
 else return town.no('none');end if;
 if r is null or r='null'::jsonb or coupon_ is null or coupon_='null'::jsonb or (coupon_->>'until')::bigint<t or coupon_->>'line' is distinct from line_ or jsonb_typeof(miss_->'index') is distinct from 'number' or (miss_->>'index')::numeric<>floor((miss_->>'index')::numeric) or (miss_->>'index')::numeric not between 0 and 2 or jsonb_typeof(miss_->'mark') is distinct from 'number' or (miss_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
 index_:=(miss_->>'index')::integer;mark_:=(miss_->>'mark')::numeric;if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_typeof(c->'marks'->index_) is distinct from 'number' or (c->'marks'->>index_)::numeric not between 0 and 1 then return town.no('none');end if;
 z:=seed_;for i in 0..index_ loop z:=(z*1664525+1013904223)%4294967296;target_:=.2+(z%61)::numeric/100;end loop;if abs(target_-mark_)<=width_ then return town.no('none');end if;
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('campRetry',null));
end $$;
create or replace function town.reward_camp_flag(p jsonb,c jsonb,me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare site_ integer;camp_ jsonb;used_ jsonb;line_ text:=c->>'line';after_ jsonb;camps_ jsonb;
begin
 if jsonb_typeof(c->'site') is distinct from 'number' or (c->>'site')::numeric<>floor((c->>'site')::numeric) or (c->>'site')::numeric not between 0 and 4 or line_ not in ('farming','helpers','kitchen') or line_ is null then return town.no('none');end if;
 site_:=(c->>'site')::integer;perform pg_advisory_xact_lock(hashtext('town.camp'),site_);select f.camp into camp_ from public.town_field_camps f where f.site=site_;
 if not town.gift_works(p,'thingCampFlag') or camp_ is null or camp_->>'by' is distinct from me::text or (camp_->>'until')::bigint<=t or camp_?'flag' or town.held(p->'bag','signalCord')<1 then return town.no('none');end if;
 if greatest(abs((camp_->>'x')::integer-(c->'at'->>0)::integer),abs((camp_->>'y')::integer-(c->'at'->>1)::integer))>(town.cat('camps')->>'reach')::integer then return town.no('far');end if;
 used_:=town.gift_use(p,'thingCampFlag',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=town.spend(used_->'purse',1::double precision,t)||jsonb_build_object('bag',town.take(p->'bag','signalCord',1));camp_:=camp_||jsonb_build_object('flag',jsonb_build_object('line',line_,'members','[]'::jsonb));update public.town_field_camps f set camp=camp_ where f.site=site_;
 select coalesce(jsonb_agg(f.camp order by f.site),'[]'::jsonb) into camps_ from public.town_field_camps f where (f.camp->>'until')::bigint>t;
 return jsonb_build_object('ok',true,'purse',after_,'camps',camps_);
end $$;
revoke all on function town.flag_benefit(jsonb,jsonb,text,bigint),town.camp_retry(jsonb,jsonb,bigint),town.reward_camp_flag(jsonb,jsonb,uuid,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.camp_work(p_purse jsonb, p_action text, p_site integer, p_supply text, p_x integer, p_y integer, p_old jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare k jsonb:=town.cat('camps');spot jsonb:=k->'sites'->p_site;bag jsonb:=p_purse->'bag';n integer;day_ integer:=town.day_of(p_now);used_ integer;effect text;out_ jsonb;camp_ jsonb;buffs jsonb;had jsonb;until_ numeric;book jsonb;
begin
 if p_site is null or p_site<0 or spot is null or p_x is null or p_y is null or greatest(abs((spot->>0)::numeric-p_x),abs((spot->>1)::numeric-p_y))>(k->>'reach')::numeric then return town.no('far');end if;
 if p_action='place' then
   if town.held(bag,'campKit')<1 then return town.no('tool');end if;
   if (p_old->>'until')::numeric>p_now then return town.no('spent');end if;
   n:=case when town.held(town.carried_bag(p_purse),'provisionChest')>0 then (k->>'chestCharges')::integer else (k->>'charges')::integer end;
   if town.held(bag,'campCanvas')<1 or town.held(bag,'dryTinder')<1 or town.held(bag,'trailRation')<n then return town.no('none');end if;
   bag:=town.take(town.take(town.take(bag,'campCanvas',1),'dryTinder',1),'trailRation',n);
   camp_:=jsonb_build_object('site',p_site,'x',spot->0,'y',spot->1,'by',p_me,'until',p_now+case when town.held(town.carried_bag(p_purse),'weatherAwning')>0 then (k->>'awningMinutes')::bigint else (k->>'minutes')::bigint end*60000,'left',n,'wide',town.held(town.carried_bag(p_purse),'signalPennant')>0,'lit',town.held(town.carried_bag(p_purse),'campLantern')>0);
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',bag);
   return jsonb_build_object('ok',true,'camp',camp_,'purse',out_);
 end if;
 if p_action<>'benefit' or p_action is null then return town.no('none');end if;
 if p_old is null or (p_old->>'until')::numeric<=p_now or (p_old->>'left')::numeric<=0 then return town.no('none');end if;
 effect:=k->'supplies'->>p_supply;if effect is null then return town.no('none');end if;
 used_:=case when (p_purse->'campUses'->>'day')::integer=day_ then (p_purse->'campUses'->>'n')::integer else 0 end;
 if used_>=(k->>'daily')::integer then return town.no('spent');end if;
 if town.held(bag,p_supply)<1 then return town.no('none');end if;
 if p_supply='sharedTea' and town.held(bag,'fieldKettle')<1 then return town.no('tool');end if;
 until_:=p_now+(k->>'benefitMinutes')::numeric*60000*greatest(1,town.buff_by(p_purse,p_now,'campPreparation'));
 buffs:=coalesce((select jsonb_agg(b.v order by b.ord) from jsonb_array_elements(coalesce(p_purse->'buffs',case when p_purse->'buff' is not null and p_purse->'buff'<>'null'::jsonb then jsonb_build_array(p_purse->'buff'||jsonb_build_object('level',1)) else '[]'::jsonb end)) with ordinality b(v,ord) where (b.v->>'until')::numeric>p_now),'[]'::jsonb);
 select b.v into had from jsonb_array_elements(buffs) b(v) where b.v->>'id'=effect limit 1;
 if had is null then buffs:=buffs||jsonb_build_array(jsonb_build_object('id',effect,'level',1,'until',until_));
 else select jsonb_agg(case when b.v->>'id'=effect then b.v||jsonb_build_object('until',greatest((b.v->>'until')::numeric,until_)) else b.v end order by b.ord) into buffs from jsonb_array_elements(buffs) with ordinality b(v,ord);end if;
 book:=coalesce(p_purse->'campBook','[]'::jsonb);if not book ? p_supply then book:=book||jsonb_build_array(p_supply);end if;
 out_:=town.spend(p_purse,1,p_now)||jsonb_build_object('bag',town.take(bag,p_supply,1),'buffs',buffs,'campUses',jsonb_build_object('day',day_,'n',coalesce(used_,0)+1),'campBook',book);
 return town.flag_benefit(p_purse,jsonb_build_object('ok',true,'effect',effect,'camp',p_old||jsonb_build_object('left',(p_old->>'left')::integer-1),'purse',out_),p_me,p_now);
end $function$
;notify pgrst,'reload schema';commit;

-- ===== v242_a_waykeeper_returns_one_unpaid_checkpoint.sql =====
-- v242: helpers ten. Run after v241 with matching site; safe rerun.
-- Only real failed canopy/banquet attempts create ten-minute private snapshots; foreign owners explicitly request help.
-- Sorted purse locks, two rescue starts/day, once/job; harder solo rhythm, paid stamina and no supply/reward refunds.
-- Completed/progressed/cancelled jobs invalidate old snapshots. Nearby request lookup is explicit, bounded and hides run contents.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('0a4c93a1804c3d998b7412366c0e798d','e78913175fa8ee8334d1908f3d6da5d5') then raise exception 'Definition moved: rebuild v242';end if;end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"charmWaykeeper":{"kind":"charm","line":"helpers","rank":10,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"charmWaykeeper":{"n":2,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.remember_rescue(p_before jsonb,p_after jsonb,a text,request_ uuid,t bigint,failed_ boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare state_ jsonb:=coalesce(p_after->'professionRewards','{}'::jsonb);kind_ text;old_ jsonb;live_ jsonb;snapshot_ jsonb;ticket_ jsonb;
begin
 if a in ('beanCancel','kitchenCancel') then return p_after||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',null));end if;
 kind_:=case a when 'beanEnd' then 'bean' when 'kitchenEnd' then 'kitchen' end;if kind_ is null or not failed_ then return p_after;end if;
 old_:=p_before->'professionRewards'->kind_;if old_ is null or old_='null'::jsonb or old_->'rescued'='true'::jsonb or kind_='kitchen' and old_->>'kind'<>'banquet' then return p_after;end if;
 live_:=coalesce(state_->kind_,'null'::jsonb);snapshot_:=case when live_='null'::jsonb then old_ else live_ end;
 ticket_:=jsonb_build_object('id',request_,'kind',kind_,'at',snapshot_->'at','stage',case when kind_='bean' then snapshot_->'next' else snapshot_->'stage' end,'until',t+600000,'ask',false,'snapshot',snapshot_,'live',live_);
 return p_after||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',ticket_));
end $$;
create or replace function town.rescue_offer(p jsonb,target_ uuid,t bigint,at_ jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select case when r->'ask'='true'::jsonb and (r->>'until')::bigint>t and greatest(abs((r->'at'->>0)::integer-(at_->>0)::integer),abs((r->'at'->>1)::integer-(at_->>1)::integer))<=3 and coalesce(p->'professionRewards'->(r->>'kind'),'null'::jsonb)=r->'live' then jsonb_build_object('id',r->'id','target',target_,'kind',r->'kind','at',r->'at','stage',r->'stage','until',r->'until') end from(select p->'professionRewards'->'rescueTicket' r) q
$$;
create or replace function town.reward_rescue(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid,target_ uuid,theirs_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'rescue';ticket_ jsonb:=theirs_->'professionRewards'->'rescueTicket';mine_ jsonb;used_ jsonb;solo_ boolean:=target_=me;z bigint;mark_ numeric;width_ numeric;i integer;pass_ boolean:=true;restored_ jsonb;their_state jsonb;offers_ jsonb;
begin
 if a='rescueAsk' then ticket_:=state_->'rescueTicket';if ticket_ is null or ticket_='null'::jsonb or (ticket_->>'until')::bigint<=t or coalesce(state_->(ticket_->>'kind'),'null'::jsonb) is distinct from ticket_->'live' then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescueTicket',ticket_||jsonb_build_object('ask',true))));end if;
 if a='rescueCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',null)),'rescue',null);end if;
 if not town.gift_works(p,'charmWaykeeper') then return town.no('none');end if;
 if a='rescueLook' then
  select coalesce(jsonb_agg(q.offer order by q.member_id),'[]'::jsonb) into offers_ from(select pp.member_id,o.offer from public.town_purses pp cross join lateral(select town.rescue_offer(pp.doc,pp.member_id,t,c->'at') offer) o where pp.doc->'professionRewards'->'rescueTicket'->'ask'='true'::jsonb and (pp.doc->'professionRewards'->'rescueTicket'->>'until')::bigint>t and o.offer is not null order by pp.member_id limit 20) q;
  return jsonb_build_object('ok',true,'purse',p,'rescueOffers',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(offers_) with ordinality q(v,ord) where ord<=20));
 end if;
 if theirs_ is null or ticket_ is null or ticket_='null'::jsonb or (ticket_->>'until')::bigint<=t or not solo_ and ticket_->'ask' is distinct from 'true'::jsonb or c->>'ticket' is distinct from ticket_->>'id' or coalesce(theirs_->'professionRewards'->(ticket_->>'kind'),'null'::jsonb) is distinct from ticket_->'live' then return town.no('none');end if;
 if greatest(abs((ticket_->'at'->>0)::integer-(c->'at'->>0)::integer),abs((ticket_->'at'->>1)::integer-(c->'at'->>1)::integer))>3 then return town.no('far');end if;
 if a='rescueBegin' then
  if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;used_:=town.gift_use(p,'charmWaykeeper',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  r:=jsonb_build_object('id',request_,'target',target_,'ticket',ticket_->'id','seed',seed_,'at',ticket_->'at','began',t,'until',least((ticket_->>'until')::bigint,t+120000),'solo',solo_);
  return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',r)),'rescue',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'target' is distinct from target_::text or r->>'ticket' is distinct from ticket_->>'id' or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 width_:=case when solo_ then .055 else .07 end;z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>width_ then pass_:=false;end if;end loop;
 mine_:=town.spend(p,3::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rescue',null));if not pass_ then return jsonb_build_object('ok',true,'purse',mine_,'rescue',null,'rescuePassed',false);end if;
 restored_:=ticket_->'snapshot'||jsonb_build_object('attempts',0,'until',t+600000,'rescued',true)||case when ticket_->>'kind'='bean' then jsonb_build_object('challenge',null) else jsonb_build_object('began',t) end;
 their_state:=coalesce(theirs_->'professionRewards','{}'::jsonb)||jsonb_build_object(ticket_->>'kind',restored_,'rescueTicket',null);
 if solo_ then return jsonb_build_object('ok',true,'purse',mine_||jsonb_build_object('professionRewards',mine_->'professionRewards'||their_state||jsonb_build_object('rescue',null)),'rescue',null,'rescuePassed',true);end if;
 return jsonb_build_object('ok',true,'purse',mine_,'targetPurse',theirs_||jsonb_build_object('professionRewards',their_state),'rescue',null,'rescuePassed',true);
end $$;
revoke all on function town.remember_rescue(jsonb,jsonb,text,uuid,bigint,boolean),town.rescue_offer(jsonb,uuid,bigint,jsonb),town.reward_rescue(jsonb,jsonb,uuid,bigint,bigint,uuid,uuid,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;notify pgrst,'reload schema';commit;

-- ===== v243_wings_at_sowing_and_warmth_after_a_shared_meal.sql =====
-- v243: two private bonds. Run after v242 with matching site; safe rerun.
-- One first pest strike per actual new root, five/day. Ring extends only the cooked meal's own buffs once.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)'::regprocedure),chr(13),'')) not in ('9d927a47b19558005e720c4578e1b518','487c398312868222e2b766ce5b09d6ed') then raise exception 'Definition moved: rebuild v243';end if;
if md5(replace(pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('2f03f364697856cb53e23f8eabbd569c','859a5c0cd94e71659a9736e4c61a63de') then raise exception 'Definition moved: rebuild v243';end if;
if md5(replace(pg_get_functiondef('town.share(jsonb,jsonb,text,text,double precision,bigint)'::regprocedure),chr(13),'')) not in ('2112f04c125b13ec923e567f102f8fbd','6f54990e236e8bde487eb7bb924718dc') then raise exception 'Definition moved: rebuild v243';end if;
if md5(replace(pg_get_functiondef('town.reward_food_finished(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('9ad3166c2935dde8f4432933e2128723','e46191e5f815198c1609a3bb316aeb82') then raise exception 'Definition moved: rebuild v243';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_seed(p jsonb,plot_ jsonb,key_ text,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare plant_ jsonb:=plot_->'plant';bond_ jsonb;begin
 if plant_ is null or plant_='null'::jsonb or plant_->>'root' is not null and plant_->>'root'<>key_ or (plant_->>'guard')::bigint>=t+7200000 or plant_?'wingGuard' then return jsonb_build_object('purse',p,'plot',plot_);end if;
 bond_:=town.combo_grant(p,'SC06','seed:'||key_||':'||(plant_->>'sown'),t,'{}'::jsonb);
 if bond_->'ok'='true'::jsonb then return jsonb_build_object('purse',bond_->'purse','plot',jsonb_set(plot_,'{plant,wingGuard}',to_jsonb(t+7200000)));end if;return jsonb_build_object('purse',p,'plot',plot_);
end $$;
create or replace function town.combo_shared_meal(mine_ jsonb,theirs_ jsonb,me_ text,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare meal_ jsonb:=theirs_->'lastMeal';buffs_ jsonb;bond_ jsonb;begin
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into buffs_ from jsonb_array_elements(coalesce(theirs_->'buffs','[]'::jsonb)) with ordinality q(v,ord) where (v->>'until')::bigint>t;
 if meal_ is null or meal_->>'cookedBy' is distinct from me_ or meal_->'extended'='true'::jsonb or t-(meal_->>'at')::bigint not between 0 and 600000 or not exists(select 1 from jsonb_array_elements(buffs_) v where coalesce(meal_->'buffs','[]'::jsonb)?(v->>'id')) then return jsonb_build_object('mine',mine_,'theirs',theirs_);end if;
 bond_:=town.combo_grant(mine_,'SC08','meal:'||(meal_->>'cookId')||':'||(meal_->>'at')||':'||town.day_of(t)::text||':'||town.used_of(mine_,'charmRing',t)::text,t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return jsonb_build_object('mine',mine_,'theirs',theirs_);end if;
 select jsonb_agg(case when meal_->'buffs'?(v->>'id') then v||jsonb_build_object('until',(v->>'until')::bigint+900000) else v end order by ord) into buffs_ from jsonb_array_elements(buffs_) with ordinality q(v,ord);
 return jsonb_build_object('mine',bond_->'purse','theirs',theirs_||jsonb_build_object('buffs',buffs_,'lastMeal',meal_||jsonb_build_object('extended',true)));
end $$;
revoke all on function town.combo_seed(jsonb,jsonb,text,bigint),town.combo_shared_meal(jsonb,jsonb,text,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;bond_ jsonb;begin
 did:=town.tend_v205(p_key,p_plot,p_bed,p_others,p_holds,p_purse,p_me,p_now,p_sure);
 if did->'ok'='true'::jsonb and did->>'deed' in ('clear','till','water') then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.hand_stack(p_purse)));end if;
 if did->'ok'='true'::jsonb and did->>'deed'='sow' then bond_:=town.combo_seed(did->'purse',did->'plot',p_key,p_now);did:=did||bond_;end if;return did;end;
$function$
;
CREATE OR REPLACE FUNCTION town.pest_at(p_key text, p_plant jsonb, p_now bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
  -- (whether an hourglass was ever turned over it: its term is asked for only then)
  quick boolean := coalesce(jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0, false);
  -- (the bearing more of a plant the mandrake sang to, and the hours it waits for it)
  wing_used boolean:=coalesce((p_plant->>'cured')::bigint>(p_plant->>'sown')::bigint,false);
  more integer := town.more_of(p_plant);
  encore double precision := coalesce((c->>'again')::double precision, (c->>'hours')::double precision * (f->'gifted'->>'encore')::double precision);
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks + more then false
        when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore
        when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every
          + case when quick then town.quick_ms(p_plant, sown, t) else 0::double precision end) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then if not wing_used and t<(p_plant->>'wingGuard')::bigint then wing_used:=true;else return t;end if;end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION town.share(p_mine jsonb, p_theirs jsonb, p_me text, p_name text, p_far double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  r jsonb := town.cat('farming')->'helping'->'ring';
  day_ integer := town.day_of(p_now);
  has double precision;
  gave double precision;
  paid double precision;
  left_ double precision;
  used jsonb;
begin
  if not town.gift_works(p_mine, 'charmRing') then return town.no('none'); end if;
  if town.used_of(p_mine, 'charmRing', p_now) >= (town.cat('gifts')->'uses'->'charmRing'->>'n')::integer then return town.no('spent'); end if;
  if not coalesce(p_far >= 0 and p_far <= (r->>'reach')::double precision, false) then return town.no('far'); end if;
  has := town.stamina_of(p_theirs, p_now);
  gave := least((town.cat('gifts')->'gifts'->'charmRing'->>'by')::double precision, (town.cat('stamina')->>'max')::double precision - has);
  if not coalesce(gave > 0, false) then return town.no('full'); end if;
  paid := gave * (r->>'part')::double precision;
  left_ := town.stamina_of(p_mine, p_now);
  if left_ < paid then return town.no('weak'); end if;
  used := town.gift_use(p_mine, 'charmRing', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  return (select d || town.combo_shared_meal(d->'mine',d->'theirs',p_me,p_now) from(select jsonb_build_object('ok', true, 'gave', gave, 'paid', paid, 'left', used->'left',
    'mine', (used->'purse') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_ - paid)),
    'theirs', town.aided(p_theirs || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', has + gave)),
      jsonb_build_object('what', 'ring', 'by', p_me, 'name', p_name, 'n', gave, 'at', p_now))) d) q);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_food_finished(p jsonb, e jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare b text:=e->>'secondary';buffs_ jsonb;had_ boolean;
begin
 if b in ('green','calm','keen') and b is distinct from town.cat('dishes')->(e->>'dish')->>'buff' then
  buffs_:=coalesce((select jsonb_agg(x order by ord) from jsonb_array_elements(coalesce(p->'buffs','[]'::jsonb)) with ordinality a(x,ord) where (x->>'until')::bigint>t),'[]'::jsonb);had_:=exists(select 1 from jsonb_array_elements(buffs_) x where x->>'id'=b);
  if had_ then select jsonb_agg(case when x->>'id'=b then x||jsonb_build_object('level',greatest(1,(x->>'level')::integer),'until',greatest((x->>'until')::bigint,t+1800000)) else x end order by ord) into buffs_ from jsonb_array_elements(buffs_) with ordinality a(x,ord);
  else buffs_:=buffs_||jsonb_build_array(jsonb_build_object('id',b,'level',1,'until',t+1800000));end if;p:=p||jsonb_build_object('buffs',buffs_);
 end if;
 if e->>'cookedBy' is not null and e->>'cookId' is not null then p:=p||jsonb_build_object('lastMeal',jsonb_build_object('cookedBy',e->'cookedBy','cookId',e->'cookId','at',t,'buffs',(select coalesce(jsonb_agg(distinct v),'[]'::jsonb) from jsonb_array_elements_text(jsonb_build_array(town.cat('dishes')->(e->>'dish')->>'buff',e->>'secondary')) q(v) where v is not null)));end if;return p;
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v244_a_real_rain_kept_at_one_friends_root.sql =====
-- v244: paid, manually played rain care. Run after v243 with matching site; safe rerun.
-- World rain only. One real water and one stamina. Wetness lasts an hour past rain; no added growth/XP.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('e78913175fa8ee8334d1908f3d6da5d5','30745625c0f8a18554ccff07f25bbe30') then raise exception 'Definition moved: rebuild v244';end if;
if md5(replace(pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('754846f0f9e59b321e66b1495eec8d78','e62ee1c023190f19f0d32f9b27e9d156') then raise exception 'Definition moved: rebuild v244';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.reward_rain_care(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'rainCare';key_ text:=(c->'at'->>0)||','||(c->'at'->>1);x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;bed_ integer:=town.bed_of(x_,y_);plot_ jsonb;plant_ jsonb;rule_ jsonb;until_ bigint;hand_ text:=town.hand_of(p);slot_ integer;can_ jsonb;identity_ text;loadout_ text:=town.combo_loadout(p);after_ jsonb;pass_ boolean:=true;z bigint;i integer;mark_ numeric;bond_ jsonb;
begin
 if a='rainCareCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rainCare',null)),'rainCare',null);end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC07';if not town.combo_match(p,rule_) or not town.raining(t) or bed_<0 then return town.no('none');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);select jsonb_build_object('soil',f.soil,'plant',f.plant) into plot_ from public.town_plots f where f.x=x_ and f.y=y_;plant_:=plot_->'plant';
 select (ord-1)::integer,v into slot_,can_ from jsonb_array_elements(p->'bag') with ordinality q(v,ord) where v->>'item'=hand_ and (v->>'water')::numeric>0 order by ord limit 1;
 if plant_ is null or plant_='null'::jsonb or plant_->>'by'=me::text or plant_->>'root' is not null and plant_->>'root'<>key_ or plant_->'moist'='true'::jsonb or (plant_->>'wetUntil')::bigint>t or (town.see(key_,plot_,t)->>'dead')::boolean or not coalesce(town.cat('farming')->'cans'?hand_,false) or slot_ is null then return town.no('none');end if;
 until_:=(floor(t::numeric/900000)::bigint+1)*900000;for i in 1..192 loop if not exists(select 1 from public.town_weather w where w.slot=until_/900000 and town.wet_sky(w.sky)) then exit;end if;until_:=until_+900000;end loop;
 identity_:=key_||':'||(plant_->>'by')||':'||(plant_->>'crop')||':'||(plant_->>'sown');
 if a='rainCareBegin' then if (r->>'until')::bigint>t then return town.no('none');end if;r:=jsonb_build_object('id',request_,'key',key_,'identity',identity_,'seed',seed_,'began',t,'until',least(until_,t+90000),'loadout',loadout_);return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rainCare',r)),'rainCare',r);end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or r->>'identity' is distinct from identity_ or r->>'loadout' is distinct from loadout_ or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.08 then pass_:=false;end if;end loop;
 after_:=town.spend(p,1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rainCare',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'rainCare',null,'rainPassed',false);end if;
 bond_:=town.combo_grant(after_,'SC07','rain:'||key_||':'||(plant_->>'sown')||':'||(r->>'began'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;after_:=bond_->'purse'||jsonb_build_object('bag',jsonb_set(after_->'bag',array[slot_::text],can_||jsonb_build_object('water',(can_->>'water')::numeric-1)));plot_:=jsonb_set(plot_,'{plant,wetUntil}',to_jsonb(until_+3600000));update public.town_plots f set plant=plot_->'plant',changed=t where f.x=x_ and f.y=y_;
 return jsonb_build_object('ok',true,'purse',after_,'plots',jsonb_build_object(key_,plot_),'rainCare',null,'rainPassed',true);
end $$;
revoke all on function town.reward_rain_care(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel','rainCareBegin','rainCareEnd','rainCareCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('rainCareBegin','rainCareEnd','rainCareCancel') then did:=town.reward_rain_care(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.see(p_key text, p_plot jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  ends bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  -- (the moment it dies of its pest: so long after it struck, not counting the time fae dust lay on it)
  ends := town.dies_at(p, struck, kills);
  dead := struck is not null and p_now > ends;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then ends else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', coalesce((p->>'wetUntil')::bigint>p_now,false) or coalesce(p->'moist' = 'true'::jsonb, false) or p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now) or coalesce((p->'localRain'->>'from')::bigint<=p_now and p_now<(p->'localRain'->>'until')::bigint,false));
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v245_tired_hands_play_one_missed_garden_beat_again.sql =====
-- v245: one actually replayed missed clearing/tilling root. Run after v244 with matching site; safe rerun.
-- Foreign bed, empty stamina and original proof/tool required. Three played retries/day, no free energy or extra XP.
begin;do $guard$ begin if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('30745625c0f8a18554ccff07f25bbe30','16f702705cef293f667350cf595641e8') then raise exception 'Definition moved: rebuild v245';end if;end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาดแล้ว เล่นแถวติดกันต่อได้วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.reward_garden_retry(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'gardenRetry';key_ text:=(c->'at'->>0)||','||(c->'at'->>1);x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;bed_ integer:=town.bed_of(x_,y_);plot_ jsonb;keeping_ jsonb;job_ jsonb;rule_ jsonb;loadout_ text:=town.combo_loadout(p);after_ jsonb;did_ jsonb;pass_ boolean:=true;z bigint;i integer;mark_ numeric;bond_ jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC12';if not town.combo_match(p,rule_) or town.stamina_of(p,t)>0 or bed_<0 then return town.no('none');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);select jsonb_build_object('soil',f.soil,'plant',f.plant) into plot_ from public.town_plots f where f.x=x_ and f.y=y_;select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 select v into job_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) q(v) where v->>'id'=case when a='gardenRetryBegin' then c->>'job' else r->>'job' end and v->>'key'=key_ and (v->>'until')::bigint>t limit 1;
 if job_ is null or job_->>'owner'=me::text or job_->>'deed'='water' or coalesce(plot_->'plant','null'::jsonb)<>'null'::jsonb or town.owner_of(keeping_,false,t) is distinct from job_->>'owner' or town.help_fingerprint(plot_,job_->>'owner') is distinct from job_->>'fingerprint' then return town.no('none');end if;
 if a='gardenRetryBegin' then if (r->>'until')::bigint>t or p->'combos'->'actions'?('retry:'||split_part(job_->>'id',':',1)||':'||y_::text) then return town.no('none');end if;bond_:=town.combo_grant(p,'SC12','retry:'||split_part(job_->>'id',':',1)||':'||y_::text,t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;r:=jsonb_build_object('id',request_,'job',job_->'id','key',key_,'seed',seed_,'began',t,'until',least((job_->>'until')::bigint,t+90000),'loadout',loadout_);return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('gardenRetry',r)),'gardenRetry',r);end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or r->>'loadout' is distinct from loadout_ or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.08 then pass_:=false;end if;end loop;
 after_:=p||jsonb_build_object('professionRewards',state_||jsonb_build_object('gardenRetry',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'gardenRetry',null,'gardenRetryPassed',false);end if;
 did_:=town.tend(key_,coalesce(plot_,'{"soil":"wild","plant":null}'::jsonb),keeping_,0,0,after_,me::text,t,false);if did_->'ok' is distinct from 'true'::jsonb or did_->>'deed' is distinct from job_->>'deed' then return town.no('none');end if;after_:=jsonb_set(did_->'purse','{professionRewards,failedGarden}',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(state_->'failedGarden') with ordinality q(v,ord) where v->>'id'<>job_->>'id'));plot_:=did_->'plot';insert into public.town_plots(x,y,bed,soil,plant,changed) values(x_,y_,bed_,plot_->>'soil',nullif(plot_->'plant','null'::jsonb),t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;perform town.note(me,job_->>'deed',null,1,0,jsonb_build_object('owner',job_->>'owner','retry',true));
 return jsonb_build_object('ok',true,'purse',after_,'plots',jsonb_build_object(key_,plot_),'helpDone',job_->'deed','gardenRetry',null,'gardenRetryPassed',true);
end $$;
revoke all on function town.reward_garden_retry(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel','rainCareBegin','rainCareEnd','rainCareCancel','gardenRetryBegin','gardenRetryEnd') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('gardenRetryBegin','gardenRetryEnd') then did:=town.reward_garden_retry(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rainCareBegin','rainCareEnd','rainCareCancel') then did:=town.reward_rain_care(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v246_one_adjacent_row_carries_a_perfect_rhythm.sql =====
-- v246: one manually played adjacent friend row. Run after v245 with matching site; safe rerun.
-- Original clear/till row must be perfect. Three continuations/day, ordinary per-root cost/XP, no third row.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('16f702705cef293f667350cf595641e8','7a1c53ebb0e20d636ffe6ee5d32ca6a5') then raise exception 'Definition moved: rebuild v246';end if;
if md5(replace(pg_get_functiondef('town.row_tend(text,jsonb,jsonb,jsonb,integer,integer,jsonb,text,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('3f21d2a38f3912e700388fc3aef38808','938891183582cd7da7b5039e9f588de7') then raise exception 'Definition moved: rebuild v246';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาดแล้ว เล่นแถวติดกันต่อได้วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_row_checkpoint(before_ jsonb,after_ jsonb,key_ text,offered_ jsonb,done_ jsonb,deed_ text,plots_ jsonb,owner_ text,marks_ jsonb,me_ text,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare rule_ jsonb;x_ integer:=split_part(key_,',',1)::integer;y_ integer:=split_part(key_,',',2)::integer;next_y integer;next_key text;row_ jsonb;r jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC17';if not town.combo_match(before_,rule_) or owner_ is null or owner_=me_ or deed_ not in('clear','till') or jsonb_array_length(offered_)<2 or exists(select 1 from jsonb_array_elements_text(offered_) q(k) where marks_->k is distinct from 'true'::jsonb or not done_?k) then return after_;end if;
 foreach next_y in array array[y_+1,y_-1] loop
  if town.bed_of(x_,next_y)<>town.bed_of(x_,y_) then continue;end if;next_key:=x_::text||','||next_y::text;row_:=town.row_for(next_key,town.row_keys(x_,next_y),plots_,after_,me_,t,owner_);if row_ is null or row_->>'deed'<>deed_ then continue;end if;
  r:=jsonb_build_object('id',t::text||':'||key_,'source',jsonb_build_array(x_,y_),'key',next_key,'keys',row_->'plots','owner',owner_,'deed',deed_,'until',t+90000,'loadout',town.combo_loadout(before_));return after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('rowContinuation',r));
 end loop;return after_;
end $$;
create or replace function town.reward_row_continue(p jsonb,c jsonb,request_ uuid,t bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'rowContinuation';rule_ jsonb;bed_ integer;keeping_ jsonb;plots_ jsonb;x_ integer;y_ integer;keys_ jsonb;row_ jsonb;bond_ jsonb;did_ jsonb;marks_ jsonb;rest_ integer;e jsonb;plot_ jsonb;key_ text;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC17';if not town.combo_match(p,rule_) or r is null or r='null'::jsonb or (r->>'until')::bigint<t or r->>'loadout' is distinct from town.combo_loadout(p) or r->>'owner'=me::text then return town.no('none');end if;
 bed_:=town.bed_of((r->'source'->>0)::integer,(r->'source'->>1)::integer);if greatest(abs((r->'source'->>0)::integer-(c->'at'->>0)::integer),abs((r->'source'->>1)::integer-(c->'at'->>1)::integer))>2 or town.bed_of((c->'at'->>0)::integer,(c->'at'->>1)::integer)<>bed_ then return town.no('far');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;if town.owner_of(keeping_,false,t) is distinct from r->>'owner' then return town.no('none');end if;
 key_:=r->>'key';x_:=split_part(key_,',',1)::integer;y_:=split_part(key_,',',2)::integer;keys_:=town.row_keys(x_,y_);plots_:=town.garden_plots(key_);row_:=town.row_for(key_,keys_,plots_,p,me::text,t,r->>'owner');if row_ is null or row_->>'deed' is distinct from r->>'deed' or row_->'plots' is distinct from r->'keys' then return town.no('none');end if;
 if a='rowContinueBegin' then if r?'run' then return town.no('none');end if;bond_:=town.combo_grant(p,'SC17','row:'||(r->>'id'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;r:=r||jsonb_build_object('run',request_,'began',t);return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('rowContinuation',r)),'rowContinuation',r);end if;
 if not r?'run' or r->>'run' is distinct from c->>'run' or t<(r->>'began')::bigint+2400 or jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>jsonb_array_length(r->'keys') or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'boolean') then return town.no('none');end if;
 select coalesce(jsonb_object_agg(v::text,c->'marks'->(ord-1)::integer),'{}'::jsonb) into marks_ from jsonb_array_elements_text(r->'keys') with ordinality q(v,ord);select count(*)::integer into rest_ from jsonb_each(plots_) q where not keys_?q.key and coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb;
 did_:=town.row_tend(key_,keys_,plots_,keeping_,rest_,0,p,me::text,t,marks_);if did_->'ok' is distinct from 'true'::jsonb then return town.no('none');end if;
 for e in select v from jsonb_array_elements(did_->'each') q(v) loop key_:=e->>'key';plot_:=did_->'plots'->key_;insert into public.town_plots(x,y,bed,soil,plant,changed) values(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer,bed_,plot_->>'soil',nullif(plot_->'plant','null'::jsonb),t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;perform town.note(me,r->>'deed',e->>'crop',1,0,jsonb_build_object('owner',r->>'owner','continuation',true));end loop;
 if did_->'bed' is not null and did_->'bed'<>'null'::jsonb then update public.town_beds b set tended=(did_->'bed'->>'tended')::bigint,empty=(did_->'bed'->>'empty')::bigint where b.bed=bed_;end if;
 return jsonb_build_object('ok',true,'purse',jsonb_set(did_->'purse','{professionRewards,rowContinuation}','null'::jsonb),'plots',did_->'plots','each',did_->'each','rowContinuation',null);
end $$;
revoke all on function town.combo_row_checkpoint(jsonb,jsonb,text,jsonb,jsonb,text,jsonb,text,jsonb,text,bigint),town.reward_row_continue(jsonb,jsonb,uuid,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel','rainCareBegin','rainCareEnd','rainCareCancel','gardenRetryBegin','gardenRetryEnd','rowContinueBegin','rowContinueEnd') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('rowContinueBegin','rowContinueEnd') then did:=town.reward_row_continue(p,p_input,p_request,t,me);
 elsif p_input->>'action' in ('gardenRetryBegin','gardenRetryEnd') then did:=town.reward_garden_retry(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rainCareBegin','rainCareEnd','rainCareCancel') then did:=town.reward_rain_care(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
  cell_ text;
  extras_ jsonb:='[]'::jsonb;
  got_ jsonb;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    others:=others + coalesce((select sum(case when coalesce(stand->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end - case when coalesce(plots->e.key->'plant','null'::jsonb)<>'null'::jsonb then 1 else 0 end)::integer from jsonb_each(state) e where not p_keys ? e.key),0)
      - greatest(0,coalesce(jsonb_array_length(plot->'plant'->'footprint'),1)-1);
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    for cell_ in select jsonb_array_elements_text(coalesce(plot->'plant'->'footprint','[]'::jsonb)) loop state:=state || jsonb_build_object(cell_,did->'plot'); end loop;
    if reaps then extras_:=extras_ || ((did->'got') - 0); end if;
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_array(q.item,q.n) order by q.ord),'[]'::jsonb) into got_
    from (select g.v->>0 item,sum((g.v->>1)::numeric) n,min(g.ord) ord from jsonb_array_elements(
      coalesce((select jsonb_agg(jsonb_build_array(e.v->>'crop',(e.v->>'n')::integer) order by e.ord) from jsonb_array_elements(each) with ordinality e(v,ord) where reaps),'[]'::jsonb) || extras_) with ordinality g(v,ord) group by g.v->>0) q;
  mine:=town.remember_garden_misses(mine,found->'plots',found->>'deed',plots,town.owner_of(p_bed,p_rest+(select count(*) from jsonb_each(plots) q where coalesce(q.value->'plant','null'::jsonb)<>'null'::jsonb)>0,p_now),marks,(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),p_me,p_now);
  mine:=town.combo_row_checkpoint(p_purse,mine,p_at,found->'plots',(select coalesce(jsonb_agg(v->'key'),'[]'::jsonb) from jsonb_array_elements(each) q(v)),found->>'deed',plots||state,town.owner_of(p_bed,false,p_now),marks,p_me,p_now);
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', coalesce(got_,'[]'::jsonb))
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$function$
;
notify pgrst,'reload schema';commit;

-- ===== v247_a_second_part_beneath_the_real_stump.sql =====
-- v247: manually dig one root part after ordinary primary felling. Run after v246 with matching site; safe rerun.
-- Three stumps/day; consumes the second-part branch, pig meal quota and real energy. No one-hit/elder/listener third part.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('7a1c53ebb0e20d636ffe6ee5d32ca6a5','da65115f0bc9ee3e136e00642a0938c0') then raise exception 'Definition moved: rebuild v247';end if;
if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('ace75c7d307051d7085159f1a5b2690f','9f41e70934faa755877ff00ae80d7b99') then raise exception 'Definition moved: rebuild v247';end if;
if md5(replace(pg_get_functiondef('town.reward_extract(jsonb,uuid,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('07b9087b047d701125f1b0c259377e70','c7a076405385db62ce5579e541884dbe') then raise exception 'Definition moved: rebuild v247';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาดแล้ว เล่นแถวติดกันต่อได้วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}},{"key":"SC10","version":1,"cue":"wood","requires":["charmEchoAxe","famPiglet"],"pool":"stumpRoot","cap":3,"name":{"th":"เสียงขวานตามราก","en":"The axe follows roots"},"does":{"th":"หลังเล่นตัดต้นหลัก หมูชี้รากให้สกัดอีกสามจังหวะ วันละสามตอ ใช้สิทธิ์หมูและแรงหนึ่ง มีส่วนต่อต้นได้ไม่เกินสองส่วนรวมมีดกับเครื่องรางฟังไม้","en":"After manually felling the primary trunk, the pig points out a root for three extra played beats, three stumps/day. Uses a piglet allowance and one stamina. Shares the two-part/trunk budget with knife and listener."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_root_source(before_ jsonb,did_ jsonb,went_ jsonb,at_ jsonb,t bigint,grove_ jsonb,me_ text)
returns jsonb language plpgsql stable set search_path='' as $$
declare f jsonb:=did_->'felled'->0;rule_ jsonb;source_ jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC10';
 if did_->'ok' is distinct from 'true'::jsonb or not town.combo_match(before_,rule_) or grove_->'goes'->me_->>'comboLoadout' is distinct from town.combo_loadout(before_) or f is null or went_->'grain' is null or went_->'grain'->>'part'='root' or f->>'quality' is null or coalesce((did_->>'one')::boolean,false) or not coalesce((did_->>'through')::boolean,false) or town.tree_elder(town.tree_of((f->>'id')::integer)) or town.used_of(did_->'purse','charmListening',t)>town.used_of(before_,'charmListening',t) then return did_;end if;
 source_:=jsonb_build_object('key','tree:'||(f->>'id')||':'||t,'tree',f->'id','at',at_,'quality',f->'quality','until',t+180000,'loadout',town.combo_loadout(before_));
 return jsonb_set(did_,'{purse}',did_->'purse'||jsonb_build_object('professionRewards',coalesce(did_->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('rootRun',null,'rootSource',source_)));
end $$;
create or replace function town.reward_root_extract(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,grove_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);source_ jsonb:=state_->'rootSource';r jsonb:=state_->'rootRun';a text:=c->>'action';rule_ jsonb;bond_ jsonb;got_ jsonb:='[]'::jsonb;after_ jsonb;used_ jsonb;pass_ boolean:=true;s_ bigint;target_ numeric;i integer;
begin
 if a='rootExtractCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootRun',null,'rootSource',null)),'rootRun',null);end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC10';
 if not town.combo_match(p,rule_) or source_ is null or source_='null'::jsonb or (source_->>'until')::bigint<t or source_->>'loadout' is distinct from town.combo_loadout(p) or not town.tree_part_ready(grove_,(source_->>'tree')::integer,'root',t) then return town.no('none');end if;
 if greatest(abs((source_->'at'->>0)::integer-(c->'at'->>0)::integer),abs((source_->'at'->>1)::integer-(c->'at'->>1)::integer))>2 then return town.no('far');end if;
 if town.used_of(p,'famPiglet',t)>=(town.cat('gifts')->'uses'->'famPiglet'->>'n')::integer then return town.no('spent');end if;
 if a='rootExtractBegin' then
  if r is not null and r<>'null'::jsonb and (r->>'until')::bigint>t or p->'combos'->'actions'?('root:'||(source_->>'key')) then return town.no('none');end if;
  bond_:=town.combo_grant(p,'SC10','root:'||(source_->>'key'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
  r:=jsonb_build_object('id',request_,'source',source_->'key','seed',seed_,'at',c->'at','began',t,'until',least((source_->>'until')::bigint,t+90000),'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootRun',r,'extraction',null,'run',null)),'rootRun',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->'source' is distinct from source_->'key' or r->>'loadout' is distinct from town.combo_loadout(p) or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('none');end if;
 if r->'at' is distinct from c->'at' then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 s_:=(r->>'seed')::bigint;for i in 0..2 loop s_:=(s_*1664525+1013904223)%4294967296;target_:=.2+(s_%61)::numeric/100;if abs(target_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
 if pass_ then got_:=town.wood_yield(false,'root',source_->>'quality',p);end if;after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;used_:=town.gift_use(after_,'famPiglet',t);if used_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',1,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootSource',null,'rootRun',null,'extraction',null,'run',null)),'rootRun',null,'got',got_,'rootPassed',pass_);
end $$;
revoke all on function town.combo_root_source(jsonb,jsonb,jsonb,jsonb,bigint,jsonb,text),town.reward_root_extract(jsonb,jsonb,uuid,bigint,bigint,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel','rainCareBegin','rainCareEnd','rainCareCancel','gardenRetryBegin','gardenRetryEnd','rowContinueBegin','rowContinueEnd','rootExtractBegin','rootExtractEnd','rootExtractCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
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
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd','rootExtractBegin','rootExtractEnd','rootExtractCancel') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('rootExtractBegin','rootExtractEnd','rootExtractCancel') then did:=town.reward_root_extract(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),grove_);if did->'ok'='true'::jsonb and p_input->>'action'='rootExtractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'rootSource'->>'tree')::integer,'root',t));end if;
 elsif p_input->>'action' in ('rowContinueBegin','rowContinueEnd') then did:=town.reward_row_continue(p,p_input,p_request,t,me);
 elsif p_input->>'action' in ('gardenRetryBegin','gardenRetryEnd') then did:=town.reward_garden_retry(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rainCareBegin','rainCareEnd','rainCareCancel') then did:=town.reward_rain_care(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,(('x'||substr(p_request::text,1,8))::bit(32)::bigint),me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare go_ jsonb:=p_grove->'goes'->p_me;domino_ boolean;did jsonb;used_ jsonb;
begin
 domino_:=coalesce(go_ ? 'domino' and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree',false);
 if domino_ and (coalesce((p_went->>'one')::boolean,false) or not town.gift_works(p_purse,'charmDomino') or town.used_of(p_purse,'charmDomino',p_now)>=3) then return town.no('none');end if;
 did:=town.fell_v220(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmDomino',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return town.combo_root_source(p_purse,did,p_went,jsonb_build_array(p_x,p_y),p_now,p_grove,p_me);
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_extract(p jsonb, request uuid, input jsonb, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
 return jsonb_build_object('ok',true,'got',got,'passed',passed,'left',used->'left','purse',after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',null,'rootSource',null,'rootRun',null)));
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v248_rain_keeps_a_manually_played_cooking_checkpoint.sql =====
-- v248: replay a real failed heat checkpoint in world rain. Run after v247 with matching site; safe rerun.
-- Two pots/day, one replay/pot, successful beats stay played, ingredients paid once by ordinary cooking.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_combo(text,jsonb)'::regprocedure),chr(13),'')) not in ('38021c72ae4d98b957459cfc304370c6','0178c593b4bba35f5a0518ac97f90628') then raise exception 'Definition moved: rebuild v248';end if;
if md5(replace(pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('e4640721ff835305b125511463427148','621a371cc647b48f0364a0244c9fc563') then raise exception 'Definition moved: rebuild v248';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาดแล้ว เล่นแถวติดกันต่อได้วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}},{"key":"SC10","version":1,"cue":"wood","requires":["charmEchoAxe","famPiglet"],"pool":"stumpRoot","cap":3,"name":{"th":"เสียงขวานตามราก","en":"The axe follows roots"},"does":{"th":"หลังเล่นตัดต้นหลัก หมูชี้รากให้สกัดอีกสามจังหวะ วันละสามตอ ใช้สิทธิ์หมูและแรงหนึ่ง มีส่วนต่อต้นได้ไม่เกินสองส่วนรวมมีดกับเครื่องรางฟังไม้","en":"After manually felling the primary trunk, the pig points out a root for three extra played beats, three stumps/day. Uses a piglet allowance and one stamina. Shares the two-part/trunk budget with knife and listener."}},{"key":"SC04","version":1,"cue":"water","requires":["charmApron","famFrog"],"pool":"rainCooking","cap":2,"name":{"th":"ไอฝนประคองไฟ","en":"Rain steadies the flame"},"does":{"th":"ระหว่างฝนโลกจริง หลังเล่นคุมไฟจนสำเร็จอย่างน้อยหนึ่งช่วงแล้วพลาด กบเปิดให้ย้อน checkpoint ที่สำเร็จและเล่นต่อเอง สองหม้อต่อวัน วัตถุดิบจ่ายครั้งเดียว ไม่เพิ่มอาหาร","en":"During real world rain, after at least one successful cooking beat, the frog offers a replay from the last successful checkpoint. Two pots/day, same ingredients once, no extra servings."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_warm(p jsonb,context_ text,c jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'warmJob';rule_ jsonb;made_ text;takes_ jsonb;x jsonb;bond_ jsonb;id_ uuid;
begin
 if context_='cookCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',null)));end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC04';if not town.raining(t) or not town.combo_match(p,rule_) then return town.no('none');end if;
 if context_='cookBegin' then
  if jsonb_typeof(c->'things') is distinct from 'array' or jsonb_array_length(c->'things')=0 or jsonb_typeof(c->'crew') is distinct from 'array' or jsonb_array_length(c->'crew')=0 or c->'crew'->>0 is distinct from town.hand_of(p) or exists(select 1 from jsonb_array_elements(c->'things') q(v) where jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)<>2 or jsonb_typeof(v->1) is distinct from 'number' or (v->>1)::numeric<>floor((v->>1)::numeric) or (v->>1)::numeric<1) then return town.no('none');end if;
  made_:=town.made_of(town.tidy(c->'things'));if made_ is null or not coalesce(p->'made','[]'::jsonb)?made_ and not coalesce(p->'recipes','[]'::jsonb)?made_ then return town.no('none');end if;takes_:=town.takes(made_);if jsonb_array_length(c->'crew')<(takes_->>'cooks')::integer or not town.in_hands(takes_->'in',c->'crew') then return town.no('none');end if;
  for x in select v from jsonb_array_elements(town.tidy(c->'things')) q(v) loop if town.held(p->'bag',x->>0)<(x->>1)::numeric then return town.no('none');end if;end loop;
  id_:=gen_random_uuid();r:=jsonb_build_object('id',id_,'things',c->'things','crew',c->'crew','began',t,'until',t+120000,'loadout',town.combo_loadout(p));return jsonb_build_object('ok',true,'job',id_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',r)));
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'job' or coalesce((r->>'retried')::boolean,false) or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint or r->>'loadout' is distinct from town.combo_loadout(p) or coalesce((c->>'hits')::numeric,0)<1 or coalesce((c->>'misses')::numeric,0)<1 or coalesce((c->>'secs')::numeric,0)<2.4 or r->'crew'->>0 is distinct from town.hand_of(p) then return town.no('none');end if;
 for x in select v from jsonb_array_elements(town.tidy(r->'things')) q(v) loop if town.held(p->'bag',x->>0)<(x->>1)::numeric then return town.no('none');end if;end loop;
 bond_:=town.combo_grant(p,'SC04','cook:'||(r->>'id'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;return bond_||jsonb_build_object('purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',r||jsonb_build_object('retried',true))));
end $$;
revoke all on function town.combo_warm(jsonb,text,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.cook_v248(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.cook_v205(p_purse,p_things,p_crew,p_misses,p_now);
 if did->'ok'='true'::jsonb and town.made_of(town.tidy(p_things)) is not null and did->>'made' is not null then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.cook_held(p_purse,p_crew)));end if;
 return did;end;
$function$
;revoke all on function town.cook_v248(jsonb,jsonb,jsonb,double precision,bigint) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.town_combo(p_context text, p_input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.member(); t bigint:=town.now_ms(); p jsonb; grove jsonb; target jsonb; a text; k text; e jsonb; did jsonb; tree integer; i integer; side integer; hints integer;
begin
 if p_context in('cookBegin','cookRetry','cookCancel') then p:=town.purse_of(me,true);did:=town.combo_warm(p,p_context,p_input,t);if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context not in ('wear','wood','cavity','echo') or p_context is null then return town.answer(me,town.no('none')); end if;
 -- Grove before purse, matching the felling deeds' lock order.
 if p_context='wood' then grove:=town.thing('grove',true); end if;
 p:=town.purse_of(me,true);
 if p_context='wear' then return town.answer(me,jsonb_build_object('ok',true,'cue',town.combo_cue(p,'wear'))); end if;
 if p_context='wood' then
  target:=grove->'goes'->(me::text);
  if target is null or t<(target->>'at')::bigint or t-(target->>'at')::bigint>45000 then return town.answer(me,town.no('none')); end if;
  if jsonb_typeof(p_input->'notches') is distinct from 'array' then return town.answer(me,town.no('none')); end if;
  if jsonb_array_length(p_input->'notches')<>3 or exists(select 1 from jsonb_array_elements(p_input->'notches') v where v not in ('-1'::jsonb,'1'::jsonb)) then return town.answer(me,town.no('none')); end if;
  tree:=(target->>'comboTree')::integer; hints:=coalesce((target->>'comboHints')::integer,0); k:='SC02';
  a:='wood:'||(target->>'at')||':'||tree;
  if p->'combos'->'actions' ? a then e:=(p->'combos'->'actions'->a)-'key'-'cue'-'at';
  else
   for i in 0..2 loop
    side:=case when ((abs(tree)::bigint % 16)>>i)&1=1 then 1 else -1 end;
    if i>=hints and (p_input->'notches'->>i)::integer<>side then e:=jsonb_build_object('index',i,'side',side); exit; end if;
   end loop;
  end if;
 else
  target:=p->'mine'->'vein';
  if jsonb_typeof(target) is distinct from 'object' or not (target ? 'geology') then return town.answer(me,town.no('none')); end if;
  a:='vein:'||(target->>'f')||':'||(target->>'rock')||':'||(target->>'turn')||':'||(target->>'seed')||':'||coalesce(target->>'again','false');
  if p_context='cavity' and not coalesce((target->'geology'->>'cavities')::boolean,false) then k:='SC03'; e:=jsonb_build_object('cavities',true);
  elsif p_context='echo' and not coalesce((target->'geology'->>'hint')::boolean,false) then k:='SC11'; e:=jsonb_build_object('echo',case when abs((target->>'seed')::bigint)%2=1 then 1 else -1 end); end if;
 end if;
 if e is null or target->>'comboLoadout' is distinct from town.combo_loadout(p) then return town.answer(me,town.no('none')); end if;
 did:=town.combo_grant(p,k,a,t,e);
 if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
 return town.answer(me,did-'purse');
end $function$
;
create or replace function town.cook(p_purse jsonb,p_things jsonb,p_crew jsonb,p_misses double precision,p_now bigint) returns jsonb language plpgsql stable set search_path='' as $$ declare d jsonb:=town.cook_v248(p_purse,p_things,p_crew,p_misses,p_now);begin if d->'ok'='true'::jsonb and d->'purse'->'professionRewards'?'warmJob' then d:=jsonb_set(d,'{purse,professionRewards,warmJob}','null'::jsonb);end if;return d;end $$;
notify pgrst,'reload schema';commit;

-- ===== v249_one_insect_hears_quieter_footsteps.sql =====
-- v249: one chosen real insect, one full second standing, ten seconds of quiet approach.
-- Run after v248 with matching site; safe rerun. Five approaches/day; stronger existing stealth wins.
-- Also bind the original perfect friend row to its starting loadout, and require a real hoe before a tired retry.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_combo(text,jsonb)'::regprocedure),chr(13),'')) not in ('0178c593b4bba35f5a0518ac97f90628','5987f6652fd0fc1607a5654317495d74') then raise exception 'Definition moved: rebuild v249';end if;
if md5(replace(pg_get_functiondef('town.combo_row_checkpoint(jsonb,jsonb,text,jsonb,jsonb,text,jsonb,text,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('82bf1aa6043870080a2e5db1927ca168','7c6461a8caea165e7399f289299e132c') then raise exception 'Definition moved: rebuild v249';end if;
if md5(replace(pg_get_functiondef('town.reward_garden_retry(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure),chr(13),'')) not in ('71fd37e188780d3111f853039fccf33f','3c390d872b928a54da208cebee92e0f3') then raise exception 'Definition moved: rebuild v249';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"แบ่งแรงให้เพื่อนภายในสิบนาทีหลังเพื่อนกินอาหารที่เราปรุง ขยายเฉพาะบัฟของมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม","en":"Share stamina within ten minutes of a friend finishing your cooking: extend only that meal’s buffs by fifteen minutes, once/meal, three/day within the ring allowance."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"เล่นสามจังหวะข้างต้นเพื่อนระหว่างฝนโลกจริง ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Play three beats beside a friend’s root during real world rain. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมด ลองเล่นจังหวะที่พลาดจริงในงานถางหรือพรวนแถวสวนเพื่อนใหม่ได้หนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"With no stamina, replay one actually missed clearing or tilling root from a friend’s row, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาดแล้ว เล่นแถวติดกันต่อได้วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}},{"key":"SC10","version":1,"cue":"wood","requires":["charmEchoAxe","famPiglet"],"pool":"stumpRoot","cap":3,"name":{"th":"เสียงขวานตามราก","en":"The axe follows roots"},"does":{"th":"หลังเล่นตัดต้นหลัก หมูชี้รากให้สกัดอีกสามจังหวะ วันละสามตอ ใช้สิทธิ์หมูและแรงหนึ่ง มีส่วนต่อต้นได้ไม่เกินสองส่วนรวมมีดกับเครื่องรางฟังไม้","en":"After manually felling the primary trunk, the pig points out a root for three extra played beats, three stumps/day. Uses a piglet allowance and one stamina. Shares the two-part/trunk budget with knife and listener."}},{"key":"SC04","version":1,"cue":"water","requires":["charmApron","famFrog"],"pool":"rainCooking","cap":2,"name":{"th":"ไอฝนประคองไฟ","en":"Rain steadies the flame"},"does":{"th":"ระหว่างฝนโลกจริง หลังเล่นคุมไฟจนสำเร็จอย่างน้อยหนึ่งช่วงแล้วพลาด กบเปิดให้ย้อน checkpoint ที่สำเร็จและเล่นต่อเอง สองหม้อต่อวัน วัตถุดิบจ่ายครั้งเดียว ไม่เพิ่มอาหาร","en":"During real world rain, after at least one successful cooking beat, the frog offers a replay from the last successful checkpoint. Two pots/day, same ingredients once, no extra servings."}},{"key":"SC05","version":1,"cue":"wood","requires":["charmNet","famStag"],"pool":"quietApproach","cap":5,"name":{"th":"รอยเท้าไม่ปลุกปีก","en":"Footsteps spare the wings"},"does":{"th":"ยืนหนึ่งวินาทีแล้วเลือกแมลงหนึ่งตัว ลดระยะตกใจเหลือครึ่งหนึ่งนานสิบวินาที จนจับหรือหนีครั้งแรก ห้าครั้งต่อวัน ไม่เพิ่มความเร็วหรือเก็บผลไว้หลังสลับสัตว์","en":"Stand one second for one chosen insect: halve its fright distance for ten seconds until the first catch or flight, five/day. No extra speed and no carrying it across familiar changes."}},{"key":"SC09","version":1,"cue":"echo","requires":["charmFirefly","famBat"],"pool":"secretPlantRead","cap":3,"name":{"th":"แสงฟังส่วนพืช","en":"Light hears the living part"},"does":{"th":"ฟังจุดลับที่เคยเก็บสำเร็จเพื่อพบไลเคนหรือสปอร์ที่เก็บแทนของหลักได้ ต้องผ่านสองเกมและใช้ส่วนแบ่งเดิม สามจุดต่อวัน เลนส์หรือบัฟอ่านร่องรอยให้ข้อมูลนี้โดยไม่กินคอมโบ","en":"Listen at a previously harvested secret site to find lichen or spores as an alternative to its main find. Win both games and use the same share, three sites/day. Trace tools or buffs supply this information without spending a bond."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_approach(p jsonb,context_ text,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'bugApproach';rule_ jsonb;id_ integer;turn_ bigint;h jsonb;has_ jsonb;taken_ integer;mine_ boolean;soft_ numeric;bond_ jsonb;at_ jsonb:=c->'at';
begin
 if context_='bugCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',null)));end if;
 if jsonb_typeof(c->'id') is distinct from 'number' or jsonb_typeof(c->'turn') is distinct from 'number' or jsonb_typeof(at_) is distinct from 'array' or jsonb_array_length(at_)<>2 or exists(select 1 from jsonb_array_elements(at_) q(v) where jsonb_typeof(v)<>'number' or v::text::numeric<>floor(v::text::numeric)) then return town.no('none');end if;
 id_:=(c->>'id')::integer;turn_:=(c->>'turn')::bigint;h:=town.cat('insects')->'haunts'->id_;select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC05';
 soft_:=1/(1+greatest(0,town.buff_by(p,t,'net')))*least(case when town.held(town.carried_bag(p),'scentSatchel')>0 then .85 else 1 end,1-town.buff_by(p,t,'scent'));
 if not town.combo_match(p,rule_) or not coalesce(town.cat('insects')->'nets'?town.hand_of(p),false) or soft_<=.5 or h is null or (select min(greatest(abs((v->>0)::numeric-(at_->>0)::numeric),abs((v->>1)::numeric-(at_->>1)::numeric))) from jsonb_array_elements(h->3) q(v))>8 then return town.no('none');end if;
 has_:=coalesce(case when town.wearing(p,'charmCloak') then town.cloak_at(id_,t,town.cat('insects'),town.word()) end,town.bug_here(id_,t,town.backs_now(t),town.cat('insects'),town.word()));if has_ is null or (has_->>'turn')::bigint<>turn_ then return town.no('none');end if;
 select count(*)::integer,coalesce(bool_or(member_id=me_),false) into taken_,mine_ from public.town_takes where what='haunt' and place=id_ and turn=turn_;if mine_ or taken_>=(town.cat('insects')->'kinds'->(h->>0)->>'shares')::integer then return town.no('none');end if;
 if context_='bugBegin' then r:=jsonb_build_object('id',id_,'turn',turn_,'at',at_,'began',t,'until',t+15000,'loadout',town.combo_loadout(p));return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',r)));end if;
 if r is null or r='null'::jsonb or coalesce((r->>'ready')::boolean,false) or (r->>'id')::integer<>id_ or (r->>'turn')::bigint<>turn_ or r->>'loadout' is distinct from town.combo_loadout(p) or r->'at' is distinct from at_ or t<(r->>'began')::bigint+1000 or t>(r->>'until')::bigint then return town.no('none');end if;
 if p->'combos'->'actions'?('approach:'||id_||':'||turn_||':'||(r->>'began')) then return town.no('none');end if;bond_:=town.combo_grant(p,'SC05','approach:'||id_||':'||turn_||':'||(r->>'began'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
 return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',r||jsonb_build_object('ready',true,'until',t+10000))));
end $$;
create or replace function town.combo_row_begin(p jsonb,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare key_ text:=c->>'key';x_ integer;y_ integer;bed_ integer;keeping_ jsonb;owner_ text;row_ jsonb;rule_ jsonb;
begin
 if key_ is null or key_!~'^[0-9]+,[0-9]+$' then return town.no('none');end if;x_:=split_part(key_,',',1)::integer;y_:=split_part(key_,',',2)::integer;bed_:=town.bed_of(x_,y_);if bed_<0 then return town.no('none');end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC17';if not town.combo_match(p,rule_) then return town.no('none');end if;
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;owner_:=town.owner_of(keeping_,false,t);if owner_ is null or owner_=me_::text then return town.no('none');end if;row_:=town.row_for(key_,town.row_keys(x_,y_),town.garden_plots(key_),p,me_::text,t,owner_);if row_ is null or row_->>'deed' not in('clear','till') then return town.no('none');end if;
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('rowStart',jsonb_build_object('key',key_,'until',t+90000,'loadout',town.combo_loadout(p)))));
end $$;
revoke all on function town.combo_approach(jsonb,text,jsonb,bigint,uuid),town.combo_row_begin(jsonb,jsonb,bigint,uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_combo(p_context text, p_input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.member(); t bigint:=town.now_ms(); p jsonb; grove jsonb; target jsonb; a text; k text; e jsonb; did jsonb; tree integer; i integer; side integer; hints integer;
begin
 if p_context in('bugBegin','bugEnd','bugCancel','rowBegin') then p:=town.purse_of(me,true);did:=case when p_context='rowBegin' then town.combo_row_begin(p,p_input,t,me) else town.combo_approach(p,p_context,p_input,t,me) end;if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context in('cookBegin','cookRetry','cookCancel') then p:=town.purse_of(me,true);did:=town.combo_warm(p,p_context,p_input,t);if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context not in ('wear','wood','cavity','echo') or p_context is null then return town.answer(me,town.no('none')); end if;
 -- Grove before purse, matching the felling deeds' lock order.
 if p_context='wood' then grove:=town.thing('grove',true); end if;
 p:=town.purse_of(me,true);
 if p_context='wear' then return town.answer(me,jsonb_build_object('ok',true,'cue',town.combo_cue(p,'wear'))); end if;
 if p_context='wood' then
  target:=grove->'goes'->(me::text);
  if target is null or t<(target->>'at')::bigint or t-(target->>'at')::bigint>45000 then return town.answer(me,town.no('none')); end if;
  if jsonb_typeof(p_input->'notches') is distinct from 'array' then return town.answer(me,town.no('none')); end if;
  if jsonb_array_length(p_input->'notches')<>3 or exists(select 1 from jsonb_array_elements(p_input->'notches') v where v not in ('-1'::jsonb,'1'::jsonb)) then return town.answer(me,town.no('none')); end if;
  tree:=(target->>'comboTree')::integer; hints:=coalesce((target->>'comboHints')::integer,0); k:='SC02';
  a:='wood:'||(target->>'at')||':'||tree;
  if p->'combos'->'actions' ? a then e:=(p->'combos'->'actions'->a)-'key'-'cue'-'at';
  else
   for i in 0..2 loop
    side:=case when ((abs(tree)::bigint % 16)>>i)&1=1 then 1 else -1 end;
    if i>=hints and (p_input->'notches'->>i)::integer<>side then e:=jsonb_build_object('index',i,'side',side); exit; end if;
   end loop;
  end if;
 else
  target:=p->'mine'->'vein';
  if jsonb_typeof(target) is distinct from 'object' or not (target ? 'geology') then return town.answer(me,town.no('none')); end if;
  a:='vein:'||(target->>'f')||':'||(target->>'rock')||':'||(target->>'turn')||':'||(target->>'seed')||':'||coalesce(target->>'again','false');
  if p_context='cavity' and not coalesce((target->'geology'->>'cavities')::boolean,false) then k:='SC03'; e:=jsonb_build_object('cavities',true);
  elsif p_context='echo' and not coalesce((target->'geology'->>'hint')::boolean,false) then k:='SC11'; e:=jsonb_build_object('echo',case when abs((target->>'seed')::bigint)%2=1 then 1 else -1 end); end if;
 end if;
 if e is null or target->>'comboLoadout' is distinct from town.combo_loadout(p) then return town.answer(me,town.no('none')); end if;
 did:=town.combo_grant(p,k,a,t,e);
 if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.combo_row_checkpoint(before_ jsonb, after_ jsonb, key_ text, offered_ jsonb, done_ jsonb, deed_ text, plots_ jsonb, owner_ text, marks_ jsonb, me_ text, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare rule_ jsonb;x_ integer:=split_part(key_,',',1)::integer;y_ integer:=split_part(key_,',',2)::integer;next_y integer;next_key text;row_ jsonb;r jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC17';if not town.combo_match(before_,rule_) or owner_ is null or owner_=me_ or deed_ not in('clear','till') or jsonb_array_length(offered_)<2 or exists(select 1 from jsonb_array_elements_text(offered_) q(k) where marks_->k is distinct from 'true'::jsonb or not done_?k) then return after_;end if;
 foreach next_y in array array[y_+1,y_-1] loop
  if town.bed_of(x_,next_y)<>town.bed_of(x_,y_) then continue;end if;next_key:=x_::text||','||next_y::text;row_:=town.row_for(next_key,town.row_keys(x_,next_y),plots_,after_,me_,t,owner_);if row_ is null or row_->>'deed'<>deed_ then continue;end if;
  r:=jsonb_build_object('id',t::text||':'||key_,'source',jsonb_build_array(x_,y_),'key',next_key,'keys',row_->'plots','owner',owner_,'deed',deed_,'until',t+90000,'loadout',town.combo_loadout(before_));return after_||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('rowStart',null,'rowContinuation',r));
 end loop;return after_;
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_garden_retry(p jsonb, c jsonb, request_ uuid, t bigint, seed_ bigint, me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a text:=c->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'gardenRetry';key_ text:=(c->'at'->>0)||','||(c->'at'->>1);x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;bed_ integer:=town.bed_of(x_,y_);plot_ jsonb;keeping_ jsonb;job_ jsonb;rule_ jsonb;loadout_ text:=town.combo_loadout(p);after_ jsonb;did_ jsonb;pass_ boolean:=true;z bigint;i integer;mark_ numeric;bond_ jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC12';if not coalesce(town.cat('farming')->'tools'->>town.hand_of(p)='hoe',false) or not town.combo_match(p,rule_) or town.stamina_of(p,t)>0 or bed_<0 then return town.no('none');end if;
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);select jsonb_build_object('soil',f.soil,'plant',f.plant) into plot_ from public.town_plots f where f.x=x_ and f.y=y_;select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 select v into job_ from jsonb_array_elements(coalesce(state_->'failedGarden','[]'::jsonb)) q(v) where v->>'id'=case when a='gardenRetryBegin' then c->>'job' else r->>'job' end and v->>'key'=key_ and (v->>'until')::bigint>t limit 1;
 if job_ is null or job_->>'owner'=me::text or job_->>'deed'='water' or coalesce(plot_->'plant','null'::jsonb)<>'null'::jsonb or town.owner_of(keeping_,false,t) is distinct from job_->>'owner' or town.help_fingerprint(plot_,job_->>'owner') is distinct from job_->>'fingerprint' then return town.no('none');end if;
 if a='gardenRetryBegin' then if (r->>'until')::bigint>t or p->'combos'->'actions'?('retry:'||split_part(job_->>'id',':',1)||':'||y_::text) then return town.no('none');end if;bond_:=town.combo_grant(p,'SC12','retry:'||split_part(job_->>'id',':',1)||':'||y_::text,t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;r:=jsonb_build_object('id',request_,'job',job_->'id','key',key_,'seed',seed_,'began',t,'until',least((job_->>'until')::bigint,t+90000),'loadout',loadout_);return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('gardenRetry',r)),'gardenRetry',r);end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or r->>'loadout' is distinct from loadout_ or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.08 then pass_:=false;end if;end loop;
 after_:=p||jsonb_build_object('professionRewards',state_||jsonb_build_object('gardenRetry',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'gardenRetry',null,'gardenRetryPassed',false);end if;
 did_:=town.tend(key_,coalesce(plot_,'{"soil":"wild","plant":null}'::jsonb),keeping_,0,0,after_,me::text,t,false);if did_->'ok' is distinct from 'true'::jsonb or did_->>'deed' is distinct from job_->>'deed' then return town.no('none');end if;after_:=jsonb_set(did_->'purse','{professionRewards,failedGarden}',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(state_->'failedGarden') with ordinality q(v,ord) where v->>'id'<>job_->>'id'));plot_:=did_->'plot';insert into public.town_plots(x,y,bed,soil,plant,changed) values(x_,y_,bed_,plot_->>'soil',nullif(plot_->'plant','null'::jsonb),t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;perform town.note(me,job_->>'deed',null,1,0,jsonb_build_object('owner',job_->>'owner','retry',true));
 return jsonb_build_object('ok',true,'purse',after_,'plots',jsonb_build_object(key_,plot_),'helpDone',job_->'deed','gardenRetry',null,'gardenRetryPassed',true);
end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v250_one_living_part_in_a_known_secret_place.sql =====
-- v250: known secret site, one alternative living plant part. Run after v249 with matching site; safe rerun.
-- Both original games and the original shared take still apply. Three reads/day; trace tools/buffs give the same information without combo use.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('public.town_combo(text,jsonb)'::regprocedure),chr(13),'')) not in ('5987f6652fd0fc1607a5654317495d74','8ce1c709e6ea8f90371aa968ee107207') then raise exception 'Definition moved: rebuild v250';end if;
if md5(replace(pg_get_functiondef('town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)'::regprocedure),chr(13),'')) not in ('4e633176ff6442b08096f2b011d9b87a','f9df11811722544afe73e2a6b228478e') then raise exception 'Definition moved: rebuild v250';end if;
end $guard$;create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}},{"key":"SC15","version":1,"cue":"echo","requires":["charmGemColor","famSprite"],"pool":"gemCorrection","cap":1,"name":{"th":"แสงจำสี","en":"Light remembers colour"},"does":{"th":"ภูตช่วยให้ลองเรียงสีใหม่หนึ่งครั้งหลังพลาด ใช้ชุดวัตถุดิบและสิทธิ์ประสานสีเดิม วันละหนึ่งชุด ไม่เพิ่มระดับพลอย","en":"The sprite offers one correction after a missed colour sequence, within the same ingredients and batch allowance. One batch a day; no grade increase."}},{"key":"SC14","version":1,"cue":"echo","requires":["charmDomino","famBat"],"pool":"dominoPreview","name":{"th":"เสียงอ่านแนวล้ม","en":"Echoes read the fall"},"does":{"th":"ก่อนยืนยันโดมิโน ค้างคาวสะท้อนแนวต้นไม้ที่ล้มได้และต้นที่ขวางแนว ใช้เพดานสามต้นและสามแนวต่อวันเดิม ไม่เล่นโจทย์แทน","en":"Before confirming a domino chain, the bat traces eligible trunks and a blocking tree. Keeps the original three-tree and three-chain limits; play the trunk yourself."}},{"key":"SC16","version":1,"cue":"water","requires":["charmLunarReel","famFrog"],"pool":"fishQuiet","cap":5,"name":{"th":"จันทร์ฟังเสียงฝน","en":"Moon listens to rain"},"does":{"th":"เมื่อดึงรอกจันทราระหว่างฝนโลกจริง กบพักการตอบโต้สองวินาที ใช้ร่วมกับชุดลมที่ทุ่นวันละห้าปลา ยังต้องคุมสายเอง","en":"Pulling the lunar reel during real world rain quiets its counterattack for two seconds. Shares five daily fish with the float-and-wind bond; control the line yourself."}},{"key":"SC18","version":1,"cue":"water","requires":["charmFloat","charmWind"],"pool":"fishQuiet","cap":5,"name":{"th":"ลมโอบทุ่น","en":"Wind cradles the float"},"does":{"th":"เกี่ยวปลาในกระแสน้ำไหลแล้วได้ช่วงนิ่งหนึ่งวินาทีครึ่งรองรับการกระชากแรก ใช้ร่วมกับเสียงกบวันละห้าปลา ไม่เพิ่มปลาหรือจำนวนสาย","en":"Hooking a fish in a running current quiets its first surge for one and a half seconds. Shares five daily fish with the frog bond. Adds no fish or lines."}},{"key":"SC06","version":1,"cue":"wood","requires":["charmHoe","famButterfly"],"pool":"seedWings","cap":5,"name":{"th":"ปีกเฝ้าต้นกล้า","en":"Wings guard the seed"},"does":{"th":"ป้องกันแมลงครั้งแรกในสองชั่วโมงหลังปลูก ห้ารากต่อวัน ไม่เร่งโตและไม่ซ้อนการคุ้มกันที่ยาวกว่า","en":"Skips the first pest strike within two hours of planting, five roots/day. No growth boost; longer protection takes precedence."}},{"key":"SC08","version":1,"cue":"echo","requires":["charmRing","famSprite"],"pool":"sharedMeal","cap":3,"name":{"th":"ไออุ่นถึงเพื่อน","en":"Warmth reaches a friend"},"does":{"th":"ปรุงอาหารแล้วเสิร์ฟจากโต๊ะหรือผ้าปิกนิก ให้เพื่อนกินจนจบ จากนั้นแบ่งแรงให้เพื่อนคนนั้นภายในสิบนาที ขยายเฉพาะบัฟจากมื้อนั้นสิบห้านาที ครั้งเดียวต่อมื้อ สามครั้งต่อวัน ใช้สิทธิ์แหวนเดิม ถ้วยที่ตักใส่กระเป๋าธรรมดาใช้ไม่ได้","en":"Cook and serve at a shared table or picnic. After your friend finishes it, share stamina with that friend within ten minutes to extend only that meal’s buffs by fifteen minutes, once/meal and three/day within the ring allowance. Ordinary ladled bag food does not qualify."}},{"key":"SC07","version":1,"cue":"water","requires":["charmGloves","famFrog"],"pool":"rainCare","cap":5,"name":{"th":"กบเก็บไอฝน","en":"The frog keeps rain"},"does":{"th":"ถือบัวที่มีน้ำ ยืนข้างต้นเพื่อนระหว่างฝนโลกจริง กด “ประคองไอฝน” แล้วเล่นสามจังหวะ ใช้น้ำหนึ่งหน่วยกับแรงหนึ่งเพื่อเก็บความชื้นถึงหนึ่งชั่วโมงหลังฝนหยุด ห้ารากต่อวัน ไม่เพิ่มการโตหรือ XP","en":"Hold a filled can beside a friend’s root during real world rain. Open Keep the rain and play three beats. One water and one stamina keep it wet until one hour after the rain ends, five roots/day. No growth or XP boost."}},{"key":"SC12","version":1,"cue":"wood","requires":["charmGuard","famGnome"],"pool":"tiredGarden","cap":3,"name":{"th":"โนมประคองมือ","en":"The gnome steadies your hands"},"does":{"th":"เมื่อแรงหมดและถางหรือพรวนแถวสวนเพื่อนพลาด ถือจอบเดิมกลับไปช่องที่พลาด กด “ประคองจังหวะสวน” แล้วเล่นสามจังหวะเพื่อทำงานเดิมหนึ่งราก สามครั้งต่อวัน ยังต้องเล่นให้ผ่าน ไม่เพิ่มแรง XP หรือพื้นที่รดน้ำ","en":"After an exhausted clearing or tilling miss in a friend’s row, hold the original hoe at the missed plot, open Steady the garden beat and play three beats, three/day. Play it yourself; no extra stamina, XP or watering area."}},{"key":"SC17","version":1,"cue":"wood","requires":["charmHoe","charmGloves"],"pool":"gardenContinuation","cap":3,"name":{"th":"แนวดินต่อจังหวะ","en":"Furrows carry the rhythm"},"does":{"th":"ถือจอบ ถางหรือพรวนแถวสวนเพื่อนครบโดยไม่พลาด จากตำแหน่งเดิมกด “ต่อจังหวะแถวติดกัน” แล้วเล่นแถวถัดไปเอง วันละสามครั้ง ใช้ทุกจังหวะและแรงตามเดิม แถวที่ต่อไม่เปิดแถวที่สาม","en":"After a perfect friend’s clearing or tilling row, manually play one adjacent row from your position, three/day. Every beat and ordinary cost still apply. A continuation never opens a third row."}},{"key":"SC10","version":1,"cue":"wood","requires":["charmEchoAxe","famPiglet"],"pool":"stumpRoot","cap":3,"name":{"th":"เสียงขวานตามราก","en":"The axe follows roots"},"does":{"th":"หลังเล่นโค่นต้นหลักด้วยตัวเอง เปิด “รอยรากใต้ตอ” ใกล้ตอเดิมแล้วเล่นสกัดอีกสามจังหวะ วันละสามตอ ใช้สิทธิ์หมูและแรงหนึ่ง มีส่วนต่อต้นได้ไม่เกินสองส่วนรวมมีดกับเครื่องรางฟังไม้","en":"After manually felling the primary trunk, the pig points out a root for three extra played beats, three stumps/day. Uses a piglet allowance and one stamina. Shares the two-part/trunk budget with knife and listener."}},{"key":"SC04","version":1,"cue":"water","requires":["charmApron","famFrog"],"pool":"rainCooking","cap":2,"name":{"th":"ไอฝนประคองไฟ","en":"Rain steadies the flame"},"does":{"th":"ระหว่างฝนโลกจริง ปรุงสูตรที่รู้จักด้วยเกมคนอาหาร หลังทำถูกอย่างน้อยหนึ่งช่วงแล้วพลาด กดปุ่มย้อนจังหวะที่กบเสนอ จากนั้นเล่นต่อเองจากจุดที่ทำถูกล่าสุด สองหม้อต่อวัน วัตถุดิบจ่ายครั้งเดียว ไม่เพิ่มอาหาร","en":"During real world rain, after at least one successful cooking beat, the frog offers a replay from the last successful checkpoint. Two pots/day, same ingredients once, no extra servings."}},{"key":"SC05","version":1,"cue":"wood","requires":["charmNet","famStag"],"pool":"quietApproach","cap":5,"name":{"th":"รอยเท้าไม่ปลุกปีก","en":"Footsteps spare the wings"},"does":{"th":"ถือสวิง กดเมนูเข้าหาเงียบ เลือกแมลงหนึ่งตัว แล้วยืนนิ่งหนึ่งวินาที จากนั้นเข้าไปจับภายในสิบวินาที ลดระยะตกใจเหลือครึ่งหนึ่งนานสิบวินาที จนจับหรือหนีครั้งแรก ห้าครั้งต่อวัน ไม่เพิ่มความเร็วหรือเก็บผลไว้หลังสลับสัตว์","en":"Stand one second for one chosen insect: halve its fright distance for ten seconds until the first catch or flight, five/day. No extra speed and no carrying it across familiar changes."}},{"key":"SC09","version":1,"cue":"echo","requires":["charmFirefly","famBat"],"pool":"secretPlantRead","cap":3,"name":{"th":"แสงฟังส่วนพืช","en":"Light hears the living part"},"does":{"th":"ยืนใกล้จุดลับที่เคยเก็บสำเร็จ กดฟังส่วนพืชแล้วเลือกไลเคนหรือสปอร์หนึ่งชิ้นแทนของหลัก ถือเครื่องมือที่จุดนั้นต้องใช้และผ่านสองเกม ใช้ส่วนแบ่งเดิม สามจุดต่อวัน เลนส์หรือบัฟอ่านร่องรอยให้ข้อมูลนี้โดยไม่กินคอมโบ","en":"At a previously harvested secret site, listen and choose one lichen or spore instead of its main find. Hold the required tool, win both games and use the same share, three sites/day. Trace tools or buffs supply this information without spending a bond."}}]$json$::jsonb $rules$;revoke all on function town.combo_rules() from public,anon,authenticated;
create or replace function town.combo_forest_listen(p jsonb,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare id_ integer;f jsonb:=town.cat('forest');spot_ jsonb;has_ jsonb;rule_ jsonb;traces_ boolean;part_ jsonb;bond_ jsonb;taken_ jsonb;item_ text;
begin
 if jsonb_typeof(c->'spot') is distinct from 'number' or jsonb_typeof(c->'at') is distinct from 'array' or jsonb_array_length(c->'at')<>2 then return town.no('none');end if;id_:=(c->>'spot')::integer;spot_:=town.wild_place(f,id_);
 if spot_ is null or not town.wild_secret(f,id_) or not coalesce(p->'forest'->'secrets','[]'::jsonb)@>jsonb_build_array(id_) or not town.wearing(p,'charmFirefly') or greatest(abs((spot_->>1)::numeric-(c->'at'->>0)::numeric),abs((spot_->>2)::numeric-(c->'at'->>1)::numeric))>town.wild_reach(p,town.wild_rule(f,spot_->>0)->>'how',t) then return town.no('none');end if;
 has_:=town.wild_holds(id_,t);if has_ is null then return town.no('none');end if;taken_:=town.taken('spot',id_,(has_->>'turn')::bigint,me_);if coalesce((taken_->>'mine')::boolean,false) or coalesce((taken_->>'n')::integer,0)>=(town.wild_rule(f,spot_->>0)->>'shares')::integer then return town.no('none');end if;
 traces_:=town.held(town.carried_bag(p),'traceLens')>0 or town.has_buff(p,t,'traces');select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC09';if not traces_ and not town.combo_match(p,rule_) then return town.no('none');end if;
 item_:=case when spot_->>0='bough' then 'forestLichen' else 'mushroomSpores' end;part_:=jsonb_build_object('spot',id_,'turn',has_->'turn','item',item_,'until',least((has_->>'until')::bigint,t+180000),'loadout',town.combo_loadout(p));
 if traces_ then bond_:=jsonb_build_object('ok',true,'purse',p);else bond_:=town.combo_grant(p,'SC09','forest:'||id_||':'||(has_->>'turn'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;end if;
 return bond_||jsonb_build_object('purse',bond_->'purse'||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('secretPart',part_)),'part',jsonb_build_object('item',item_,'n',1));
end $$;
create or replace function town.gather_secret_part(p jsonb,id_ integer,has_ jsonb,taken_ integer,mine_ boolean,hand_ text,x_ integer,y_ integer,misses_ double precision,wrong_ double precision,t bigint,with_ text,lost_ boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare r jsonb:=p->'professionRewards'->'secretPart';after_ jsonb;d jsonb;
begin
 if r is null or r='null'::jsonb or has_ is null or (r->>'spot')::integer<>id_ or r->'turn' is distinct from has_->'turn' or (r->>'until')::bigint<t or r->>'loadout' is distinct from town.combo_loadout(p) or with_ is not null or not coalesce(p->'forest'->'secrets','[]'::jsonb)@>jsonb_build_array(id_) or r->>'item' not in('forestLichen','mushroomSpores') then return town.no('none');end if;
 after_:=jsonb_set(p,'{professionRewards,secretPart}','null'::jsonb);d:=town.gather(after_,id_,has_||jsonb_build_object('item',r->>'item','n',1),taken_,mine_,hand_,x_,y_,misses_,wrong_,t,null,lost_);return d;
end $$;
revoke all on function town.combo_forest_listen(jsonb,jsonb,bigint,uuid),town.gather_secret_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,boolean) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_combo(p_context text, p_input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.member(); t bigint:=town.now_ms(); p jsonb; grove jsonb; target jsonb; a text; k text; e jsonb; did jsonb; tree integer; i integer; side integer; hints integer;
begin
 if p_context='forestListen' then p:=town.purse_of(me,true);did:=town.combo_forest_listen(p,p_input,t,me);if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context in('bugBegin','bugEnd','bugCancel','rowBegin') then p:=town.purse_of(me,true);did:=case when p_context='rowBegin' then town.combo_row_begin(p,p_input,t,me) else town.combo_approach(p,p_context,p_input,t,me) end;if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context in('cookBegin','cookRetry','cookCancel') then p:=town.purse_of(me,true);did:=town.combo_warm(p,p_context,p_input,t);if did->'ok'='true'::jsonb then perform town.keep_purse(me,did->'purse');end if;return town.answer(me,did-'purse');end if;
 if p_context not in ('wear','wood','cavity','echo') or p_context is null then return town.answer(me,town.no('none')); end if;
 -- Grove before purse, matching the felling deeds' lock order.
 if p_context='wood' then grove:=town.thing('grove',true); end if;
 p:=town.purse_of(me,true);
 if p_context='wear' then return town.answer(me,jsonb_build_object('ok',true,'cue',town.combo_cue(p,'wear'))); end if;
 if p_context='wood' then
  target:=grove->'goes'->(me::text);
  if target is null or t<(target->>'at')::bigint or t-(target->>'at')::bigint>45000 then return town.answer(me,town.no('none')); end if;
  if jsonb_typeof(p_input->'notches') is distinct from 'array' then return town.answer(me,town.no('none')); end if;
  if jsonb_array_length(p_input->'notches')<>3 or exists(select 1 from jsonb_array_elements(p_input->'notches') v where v not in ('-1'::jsonb,'1'::jsonb)) then return town.answer(me,town.no('none')); end if;
  tree:=(target->>'comboTree')::integer; hints:=coalesce((target->>'comboHints')::integer,0); k:='SC02';
  a:='wood:'||(target->>'at')||':'||tree;
  if p->'combos'->'actions' ? a then e:=(p->'combos'->'actions'->a)-'key'-'cue'-'at';
  else
   for i in 0..2 loop
    side:=case when ((abs(tree)::bigint % 16)>>i)&1=1 then 1 else -1 end;
    if i>=hints and (p_input->'notches'->>i)::integer<>side then e:=jsonb_build_object('index',i,'side',side); exit; end if;
   end loop;
  end if;
 else
  target:=p->'mine'->'vein';
  if jsonb_typeof(target) is distinct from 'object' or not (target ? 'geology') then return town.answer(me,town.no('none')); end if;
  a:='vein:'||(target->>'f')||':'||(target->>'rock')||':'||(target->>'turn')||':'||(target->>'seed')||':'||coalesce(target->>'again','false');
  if p_context='cavity' and not coalesce((target->'geology'->>'cavities')::boolean,false) then k:='SC03'; e:=jsonb_build_object('cavities',true);
  elsif p_context='echo' and not coalesce((target->'geology'->>'hint')::boolean,false) then k:='SC11'; e:=jsonb_build_object('echo',case when abs((target->>'seed')::bigint)%2=1 then 1 else -1 end); end if;
 end if;
 if e is null or target->>'comboLoadout' is distinct from town.combo_loadout(p) then return town.answer(me,town.no('none')); end if;
 did:=town.combo_grant(p,k,a,t,e);
 if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.gather_part(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_part text, p_with text, p_lost boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
 declare f jsonb:=town.cat('forest');k jsonb:=town.cat('forest_parts');spot jsonb:=town.wild_place(f,p_spot);a jsonb;b jsonb;used_ jsonb;
 begin
 if p_part='leaf' and town.wild_secret(town.cat('forest'),p_spot) then return town.gather_secret_part(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,p_with,p_lost);end if;
  if p_part is distinct from 'paired' then return town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,p_part,p_with,p_lost);end if;
  if not town.gift_works(p_purse,'famForestGuardian') or spot is null or k->'parts'->(spot->>0)->>'leaf' is null or k->'parts'->(spot->>0)->>'root' is null or not coalesce(p_misses>=0 and p_wrong>=0,false) or p_misses='Infinity'::double precision or p_wrong='Infinity'::double precision or p_misses='NaN'::double precision or p_wrong='NaN'::double precision then return town.no('none');end if;
  used_:=town.gift_use(p_purse,'famForestGuardian',p_now);if not coalesce((used_->>'ok')::boolean,false) then return town.no('none');end if;
  if town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool');end if;
  a:=town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,'leaf',p_with,p_lost);
  if not coalesce((a->>'ok')::boolean,false) or p_misses+p_wrong<>0 then return a;end if;
  b:=town.gather_part_v217(a->'purse',p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,0,0,p_now,'root',p_with,p_lost);
  if not coalesce((b->>'ok')::boolean,false) then return b;end if;
  used_:=town.gift_use(b->'purse','famForestGuardian',p_now);
  return b || jsonb_build_object('purse',used_->'purse','got',(a->'got')||(b->'got'));
 end $function$
;
notify pgrst,'reload schema';commit;

-- ===== v251_bonds_remember_every_equipment_change.sql =====
-- v251: unfinished bonds are invalid after an equipment change, even when swapping back.
-- Run after v250 with matching site; safe rerun. No changes to owned equipment, earned rewards, completed effects or quotas.
-- Successful catches end a quiet approach. No-op equipment saves keep their current signature.
begin;do $guard$ begin
if md5(replace(pg_get_functiondef('town.combo_loadout(jsonb)'::regprocedure),chr(13),'')) not in ('d7bdcda838e5db371c54523855357da6','e73d796be4a35b460a425cdadf080b50') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_charms_wear(text[])'::regprocedure),chr(13),'')) not in ('cce116bebcf8e5d731093bc116be5c42','6a9f698efc16ebecb168a03eea967094') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_familiar_wear(text)'::regprocedure),chr(13),'')) not in ('4734f72c608e88231b007084ca9d7497','3dc821f0c2495765e6146b3623adcfa5') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_net(integer,integer,integer,numeric,uuid)'::regprocedure),chr(13),'')) not in ('9b31f65d06e78c9c07e575ce444f95c3','1d08283b114cd215c0b3cb1b0381e893') then raise exception 'Definition moved: rebuild v251';end if;
if md5(replace(pg_get_functiondef('public.town_net_mine(text,integer,integer,numeric)'::regprocedure),chr(13),'')) not in ('263212779bd9f498939164b38cf5d628','f2fa5cd4616137d35808b65a87feb643') then raise exception 'Definition moved: rebuild v251';end if;
end $guard$;create or replace function town.combo_equipped(before_ jsonb,after_ jsonb) returns jsonb language sql stable set search_path='' as $$ select case when town.combo_loadout(before_)=town.combo_loadout(after_) then after_ else after_||jsonb_build_object('comboEpoch',coalesce((before_->>'comboEpoch')::bigint,0)+1) end $$;revoke all on function town.combo_equipped(jsonb,jsonb) from public,anon,authenticated;
create or replace function town.combo_loadout(p jsonb) returns text language sql stable set search_path='' as $$ select replace((jsonb_build_array(coalesce((select jsonb_agg(v order by v) from jsonb_array_elements(g->'charms') v),'[]'::jsonb),g->'familiar')||case when coalesce((p->>'comboEpoch')::bigint,0)>0 then jsonb_build_array((p->>'comboEpoch')::bigint) else '[]'::jsonb end)::text,', ', ',') from (select town.gifts_of(p) g) q $$;
CREATE OR REPLACE FUNCTION public.town_charms_wear(p_charms text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  ids jsonb := to_jsonb(coalesce(p_charms, '{}'::text[]));
  before_ jsonb:=town.purse_of(me,true);
  did jsonb := town.charms_wear(before_, ids);
begin
  if (did->>'ok')::boolean then
    did:=jsonb_set(did,'{purse}',town.combo_equipped(before_,did->'purse'));
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'charms', null, jsonb_array_length(ids), 0, jsonb_build_object('worn', ids));
  end if;
  return town.answer(me, did);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_familiar_wear(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  before_ jsonb:=town.purse_of(me,true);
  did jsonb := town.familiar_wear(before_, p_id);
begin
  if (did->>'ok')::boolean then
    did:=jsonb_set(did,'{purse}',town.combo_equipped(before_,did->'purse'));
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'familiar', p_id, case when p_id is null then 0 else 1 end, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    if did->'purse'->'professionRewards'?'bugApproach' then did:=jsonb_set(did,'{purse,professionRewards,bugApproach}','null'::jsonb);end if;
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random(),
        -- ── the older tools (v174): the row as the forged net in the hand has it (null, the row as it is, with any other) ──
        town.net_cat(purse, ins));
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_net_mine(p_which text, p_x integer, p_y integer, p_misses numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  did jsonb;
  bug text;
  h jsonb;
  book jsonb;
  is_first boolean := false;
  rid jsonb := null;
begin
  perform town.purse_of(me,true);
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if p_which is null or p_which not in ('lured', 'pair') then return town.answer(me, town.no('none')); end if;
  did := town.net_mine(purse, p_which, town.hand_of(purse), p_x, p_y, misses, now_);
  if (did->>'ok')::boolean then
    bug := did->'got'->0->>0;
    if did->'purse'->'professionRewards'?'bugApproach' then did:=jsonb_set(did,'{purse,professionRewards,bugApproach}','null'::jsonb);end if;
    perform town.keep_purse(me, did->'purse');
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    rid := town.rid_by(bug, now_);
    h := case when p_which = 'lured' then ins->'haunts'->((purse->'lured'->>'haunt')::int) end;
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when p_which = 'lured' then jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1) else jsonb_build_object('pair', true) end
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$function$
;
notify pgrst,'reload schema';commit;
-- Final read-only checks: reward_count 90; every boolean true.
-- Read-only checks AFTER the matching v251 chain. No wallet or game writes.
with rewards as (
 select key id, value->>'line' line, (value->>'rank')::integer rank
 from jsonb_each(town.cat('gifts')->'gifts')
 union all
 select g->>1, 'well', (g->>0)::integer
 from jsonb_array_elements(town.cat('well')->'gifts') g
), ranks as (
 select line, rank, count(*) n from rewards group by line, rank
)
select jsonb_build_object(
 'reward_count', (select count(*) from rewards),
 'all_ninety', (select count(*)=90 from rewards),
 'nine_lines', (select count(distinct line)=9 from rewards),
 'one_reward_per_rank', (select count(*)=90 and bool_and(n=1 and rank between 1 and 10) from ranks),
 'eighteen_bonds', jsonb_array_length(town.combo_rules())=18,
 'private_rule_registry', not has_function_privilege('authenticated','town.combo_rules()','EXECUTE'),
 'reward_member_only', has_function_privilege('authenticated','public.town_reward(uuid,jsonb)','EXECUTE')
   and not has_function_privilege('anon','public.town_reward(uuid,jsonb)','EXECUTE'),
 'combo_member_only', has_function_privilege('authenticated','public.town_combo(text,jsonb)','EXECUTE')
   and not has_function_privilege('anon','public.town_combo(text,jsonb)','EXECUTE'),
 'private_reward_and_combo_helpers', not exists (
   select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='town' and (p.proname like 'reward_%' or p.proname like 'combo_%' or p.proname='carried_bag')
    and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'))),
 'shared_bugs', position('town.shared_read' in pg_get_functiondef('public.town_bugs()'::regprocedure))>0,
 'shared_wild', position('town.shared_read' in pg_get_functiondef('public.town_wild()'::regprocedure))>0,
 'shared_cave', position('town.shared_read' in pg_get_functiondef('town.cave_told(uuid,jsonb,integer,integer,integer,bigint)'::regprocedure))>0
) as tier10_release_verified;
