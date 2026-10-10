-- v203: passive equipment frees its inventory slot and keeps its existing effects.
-- Run after v198 and the matching site deploy. Safe to run twice.
-- Players choose Equip in the bag. No automatic inventory moves, fees or stat increases.
-- Active tools and ingredients remain in the physical bag. Unequipping requires room.
begin;
do $guard$ begin
  if md5(replace(pg_get_functiondef('town.fit_hook(jsonb,text)'::regprocedure),chr(13),'')) not in ('cce8fb5d59357b24994742d967245c0c','c29e395e1661bc4a0a7941ece0b91f04') then raise exception 'Definition changed: town.fit_hook(jsonb,text); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.wood_yield(boolean,text,text,jsonb)'::regprocedure),chr(13),'')) not in ('84db7e543332ba3a76600f8010aeea76','3c350e123f3158cc69e5537a9aa1cd21') then raise exception 'Definition changed: town.wood_yield(boolean,text,text,jsonb); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.wood_mods(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('4276db3332f4ea23ae7b81da5015a844','bb8955856d109198d194cab4013e6b2f') then raise exception 'Definition changed: town.wood_mods(jsonb,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.wood_quality(integer,jsonb,numeric,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('5ae63facfa30aa79870b2b7329d162e2','f486e8e8f18d9f941e487e76fd08f0a7') then raise exception 'Definition changed: town.wood_quality(integer,jsonb,numeric,jsonb,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.geology_mods(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('55028aa7352037c5eb11e48cadb79808','e45f8efcaed026fdb6c9ca8052f9fd3b') then raise exception 'Definition changed: town.geology_mods(jsonb,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.geological_yield(jsonb,jsonb,numeric,integer,jsonb)'::regprocedure),chr(13),'')) not in ('63e622bcd9266a1dedbde44614a6132f','6c92d26454d7b033b57df729e2fbda7d') then raise exception 'Definition changed: town.geological_yield(jsonb,jsonb,numeric,integer,jsonb); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.garden_sown(text,jsonb,jsonb,jsonb,integer)'::regprocedure),chr(13),'')) not in ('ba92074ce12ae353976f3dfc0d27ef95','7d742e1187abdba94616110af1fc9ba3') then raise exception 'Definition changed: town.garden_sown(text,jsonb,jsonb,jsonb,integer); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('ab6a9242062642d342b7fde829cb8bb4','ede21eb0eaa02449de5de71bb49a132e') then raise exception 'Definition changed: town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)'::regprocedure),chr(13),'')) not in ('67e4944ec9ee3ba8915e8b9947290958','e31cfb29f79bd51f6eb84331fd232622') then raise exception 'Definition changed: town.insect_care(text,jsonb,jsonb,integer,text,text,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)'::regprocedure),chr(13),'')) not in ('882ca0115d8a4ccc691a5c1a26a8347c','06f018a52e965b83ffef36e99ffbcd3c') then raise exception 'Definition changed: town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('c48a1cece779e2d5f02112ed5f4abb75','24e9653cd412a89c625598e73c357291') then raise exception 'Definition changed: town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('434b2a06a06be811fc65d6d3c173aac6','4e26d31a8670e883764d62ac0215242f') then raise exception 'Definition changed: town.cook(jsonb,jsonb,jsonb,double precision,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint)'::regprocedure),chr(13),'')) not in ('3d6008c22b12a4b07269bc44e3abf96b','004c84b3ccea3bd9993b08b99514f63c') then raise exception 'Definition changed: town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('97f776b415c31b29d7bdf7d491b555db','6f193a24b2aba707e328b323f60b97de') then raise exception 'Definition changed: town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.strike_window(jsonb,bigint)'::regprocedure),chr(13),'')) not in ('f16adf7ce9f8b7c24953341840ab1465','d4b91b0aba788c0d54bce1759a792cdb') then raise exception 'Definition changed: town.strike_window(jsonb,bigint); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.wear(jsonb,integer)'::regprocedure),chr(13),'')) not in ('e548e1c10c3bf44f19d3213e3ada1cd9','3f0be84760b1ead3f27d81af14674dd8') then raise exception 'Definition changed: town.wear(jsonb,integer); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.take_off(jsonb,text)'::regprocedure),chr(13),'')) not in ('3b8f4c5e692c44c0c109ce4a9c63e91b','f6f485eda3779855aea9ba1b5b0fe844') then raise exception 'Definition changed: town.take_off(jsonb,text); rebuild v203 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.set_down(jsonb,integer,text,jsonb,text)'::regprocedure),chr(13),'')) not in ('84f0babfa12587d359279209592ba955','5a5d9e9f0b4fd1c092512c02992f0a5e') then raise exception 'Definition changed: town.set_down(jsonb,integer,text,jsonb,text); rebuild v203 on current text'; end if;
end $guard$;
create or replace function town.passive_equipment()
returns jsonb language sql immutable set search_path = '' as $$
 select '["apron","stoveBig","ladle","tok","notchGauge","grainLens","fellingWedge","braceStake","barkKnife","sapTap","echoHammer","cavityLens","crystalWrap","oreSieve","seamChisel","surveyCord","pollenBrush","graftKnife","rootGuide","soilScoop","seedTray","gardenTwine","routeLens","scentSatchel","releaseCage","pollenFan","pestWhistle","traceLens","rootSpade","pruningKnife","specimenPress","seedSieve","forageBasket","sealedFlask","tastingSpoon","provisionChest","signalPennant","campLantern","weatherAwning","flowFloat","springLeader","torrentNet","floatFeather","floatGlow","floatQuill","floatBell","hookScale","hookSteel","hookTwin","lineSpun","lineBraid","lineSilk","netSmall","netLong"]'::jsonb
$$;
create or replace function town.carried_bag(p_purse jsonb)
returns jsonb language sql immutable set search_path = '' as $$
 select coalesce(p_purse->'bag','[]'::jsonb) || coalesce((
   select jsonb_agg(jsonb_build_object('item',id,'n',1) order by ord)
   from (select id,min(ord) ord from jsonb_array_elements_text(coalesce(p_purse->'wears','[]'::jsonb)) with ordinality w(id,ord)
     where town.passive_equipment() ? id group by id) worn), '[]'::jsonb)
$$;
revoke all on function town.passive_equipment(), town.carried_bag(jsonb) from public, anon, authenticated;

-- <town.fit_hook(jsonb,text)>
CREATE OR REPLACE FUNCTION town.fit_hook(p_purse jsonb, p_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
begin
  if p_item is not null and (
    p_item not in ('hookScale', 'hookSteel', 'hookTwin')
    or not exists (select 1 from jsonb_array_elements(p_purse->'bag') s where s->>'item' in ('rod','rodTeak','rodMaster') and (s->>'n')::numeric > 0)
    or town.held(town.carried_bag(p_purse), p_item) < 1
  ) then return town.no('none'); end if;
  return jsonb_build_object('ok',true,'purse',p_purse || jsonb_build_object('fishingHook',p_item));
end;
$function$
;
-- </town.fit_hook(jsonb,text)>

-- <town.wood_yield(boolean,text,text,jsonb)>
CREATE OR REPLACE FUNCTION town.wood_yield(p_elder boolean, p_part text, p_quality text, p_purse jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
 select jsonb_build_array(jsonb_build_array(
   case p_part when 'wood' then case when p_elder then 'cedarSliver' when p_quality='heart' then 'heartwood' when p_quality='clear' then 'straightWood' else 'knottedWood' end when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,
   case p_part when 'wood' then case when p_elder then 1 else (k->'quality'->>p_quality)::integer end when 'bark' then case when town.held(town.carried_bag(p_purse),'barkKnife') > 0 then (k->'parts'->>'barkKnife')::integer else 1 end when 'sap' then case when town.held(town.carried_bag(p_purse),'sapTap') > 0 then (k->'parts'->>'sapTap')::integer else 1 end else case when p_quality='rough' then 1 else 2 end end)) from (select town.cat('woodcutting') k) q
$function$
;
-- </town.wood_yield(boolean,text,text,jsonb)>

-- <town.wood_mods(jsonb,bigint)>
CREATE OR REPLACE FUNCTION town.wood_mods(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
 select jsonb_build_object('hints',greatest(case when town.has_buff(p_purse,p_now,'grain') then 3 else 0 end,
   case when town.held(town.carried_bag(p_purse),'grainLens') > 0 then (k->'hints'->>'grainLens')::integer when town.held(town.carried_bag(p_purse),'notchGauge') > 0 then (k->'hints'->>'notchGauge')::integer else 0 end),
   'direction',town.held(town.carried_bag(p_purse),'fellingWedge') > 0,'buffered',town.held(town.carried_bag(p_purse),'braceStake') > 0) from (select town.cat('woodcutting') k) q
$function$
;
-- </town.wood_mods(jsonb,bigint)>

-- <town.wood_quality(integer,jsonb,numeric,jsonb,bigint)>
CREATE OR REPLACE FUNCTION town.wood_quality(p_tree integer, p_choice jsonb, p_misses numeric, p_purse jsonb, p_now bigint)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
 select case when hits = 4 and misses = 0 then 'heart' when hits >= 3 and misses <= 1 then 'clear' else 'rough' end from (
   select (select count(*) from generate_series(0,3) i where (case when i=3 then p_choice->>'direction' else p_choice->'notches'->>i end)::integer = case when ((abs(p_tree)::bigint % 16) >> i) & 1 = 1 then 1 else -1 end) hits,
     greatest(0,p_misses-case when town.held(town.carried_bag(p_purse),'braceStake') > 0 then (town.cat('woodcutting')->>'brace')::integer else 0 end) misses
 ) q
$function$
;
-- </town.wood_quality(integer,jsonb,numeric,jsonb,bigint)>

-- <town.geology_mods(jsonb,bigint)>
CREATE OR REPLACE FUNCTION town.geology_mods(p_purse jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
 select jsonb_build_object('hint',town.has_buff(p_purse,p_now,'layers') or town.held(town.carried_bag(p_purse),'echoHammer')>0,'cavities',town.held(town.carried_bag(p_purse),'cavityLens')>0,'preserve',town.held(town.carried_bag(p_purse),'crystalWrap')>0,'sieve',town.held(town.carried_bag(p_purse),'oreSieve')>0,'chisel',town.held(town.carried_bag(p_purse),'seamChisel')>0,'cord',town.held(town.carried_bag(p_purse),'surveyCord')>0)
$function$
;
-- </town.geology_mods(jsonb,bigint)>

-- <town.geological_yield(jsonb,jsonb,numeric,integer,jsonb)>
CREATE OR REPLACE FUNCTION town.geological_yield(p_vein jsonb, p_choice jsonb, p_ore numeric, p_gems integer, p_purse jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 k jsonb := town.cat('geology');
 correct boolean := (p_choice->>'echo')::integer = case when abs((p_vein->>'seed')::numeric) % 2 = 1 then 1 else -1 end;
 pool jsonb := case when (p_vein->>'f')::integer < 11 then '["slateLayer","clayPocket","mineralSalt","pyriteCluster"]'::jsonb when (p_vein->>'f')::integer < 21 then '["copperNodule","ironNodule","mineralSalt","pyriteCluster"]'::jsonb else '["silverNodule","ironNodule","copperNodule","pyriteCluster"]'::jsonb end;
 got jsonb := '[]'::jsonb;
begin
 if p_ore+p_gems <= 0 then return got; end if;
 if p_choice->>'focus'='crystal' then
  return case when p_gems>0 and coalesce(p_vein->'gem','null'::jsonb)<>'null'::jsonb and correct then jsonb_build_array(jsonb_build_array('wholeGeode',(k->>'crystal')::integer+case when town.held(town.carried_bag(p_purse),'crystalWrap')>0 then 1 else 0 end)) else got end;
 end if;
 if p_ore>0 then got:=jsonb_build_array(jsonb_build_array(pool->>((abs((p_vein->>'seed')::numeric) % 4)::integer),(case when correct then (k->>'ore')::integer else 1 end)+case when town.held(town.carried_bag(p_purse),'oreSieve')>0 then (k->>'sieve')::integer else 0 end)); end if;
 if correct and (town.held(town.carried_bag(p_purse),'seamChisel')>0 or town.held(town.carried_bag(p_purse),'surveyCord')>0) then got:=got || jsonb_build_array(jsonb_build_array('quartzCore',(k->>'quartz')::integer)); end if;
 return got;
end $function$
;
-- </town.geological_yield(jsonb,jsonb,numeric,integer,jsonb)>

-- <town.garden_sown(text,jsonb,jsonb,jsonb,integer)>
CREATE OR REPLACE FUNCTION town.garden_sown(p_key text, p_before jsonb, p_done jsonb, p_cells jsonb, p_rotation integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
 select jsonb_set(p_done,'{plot,plant}',p_done->'plot'->'plant' || jsonb_build_object('root',p_key,'footprint',p_cells,'rotation',p_rotation,'boost',(p_done->'plot'->'plant'->>'boost')::numeric+case when town.held(town.carried_bag(p_before),'soilScoop')>0 then (town.cat('gardening')->>'boost')::numeric else 0 end))
$function$
;
-- </town.garden_sown(text,jsonb,jsonb,jsonb,integer)>

-- <town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)>
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
 if child is not null then extras:=extras || jsonb_build_array(jsonb_build_array(town.cat('crops')->child->>'seed',case when town.held(town.carried_bag(p_before),'graftKnife')>0 then 2 else 1 end)); end if;
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
-- </town.garden_harvest(text,jsonb,jsonb,jsonb,jsonb,bigint)>

-- <town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)>
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
 if p_slot is null or p_slot<0 or p_slot>=jsonb_array_length(p_purse->'bag') or p_mode is null or p_mode not in ('pollinate','guard') then return town.no('none'); end if;
 s:=p_purse->'bag'->p_slot;
 allowed:=case when p_mode='pollinate' then k->'pollinators' else k->'predators' end;
 if not coalesce(allowed ? (s->>'item') and (s->>'n')::numeric>=1,false) then return town.no('none'); end if;
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return town.no('soil'); end if;
 seen:=town.see(p_key,p_plot,p_now);
 if (seen->>'dead')::boolean then return town.no('soil'); end if;
 if p_mode='pollinate' and p->>'by' is distinct from p_me then return town.no('theirs'); end if;
 if p_mode='pollinate' and ((seen->>'ripe')::boolean or p->'pollenRound'=p->'picked') then return town.no('wet'); end if;
 if p_mode='guard' and not (seen->>'pest')::boolean then return town.no('soil'); end if;
 if p_mode='pollinate' then
  plant_:=p || jsonb_build_object('pollenRound',p->'picked','pollenUntil',p_now+60000*case when town.held(town.carried_bag(p_purse),'releaseCage')>0 then (k->>'cageMinutes')::bigint else (k->>'pollenMinutes')::bigint end,
    'boost',(p->>'boost')::numeric+case when town.held(town.carried_bag(p_purse),'pollenFan')>0 then (k->>'fanBoost')::numeric else (k->>'boost')::numeric end);
 else
  plant_:=p || jsonb_build_object('cured',p_now,'guard',greatest((p->>'guard')::bigint,case when town.held(town.carried_bag(p_purse),'pestWhistle')>0 then p_now+(k->>'guardMinutes')::bigint*60000 else 0 end));
 end if;
 entry:=(s->>'item')||':'||(p->>'crop')||':'||p_mode;
 if not book ? entry then book:=book || to_jsonb(entry); end if;
 return jsonb_build_object('ok',true,'mode',p_mode,'plot',p_plot || jsonb_build_object('plant',plant_),
   'purse',p_purse || jsonb_build_object('bag',town.take(p_purse->'bag',s->>'item',1),'insectGardenBook',book));
end $function$
;
-- </town.insect_care(text,jsonb,jsonb,integer,text,text,bigint)>

-- <town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)>
CREATE OR REPLACE FUNCTION town.gather_part(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_part text, p_with text, p_lost boolean)
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
;
-- </town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)>

-- <town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)>
CREATE OR REPLACE FUNCTION town.stream_work(p_purse jsonb, p_action text, p_choice text, p_x integer, p_y integer, p_gate jsonb, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
 k jsonb:=town.cat('stream_work');site jsonb;route_ text:=case when (p_gate->>'until')::numeric>p_now then p_gate->>'route' else 'pool' end;
 turn_ bigint;key_ text;recipe jsonb;bag jsonb:=p_purse->'bag';need jsonb;got jsonb;out_ jsonb;book jsonb;
 nature_ text;times_ double precision;well_ jsonb:=town.cat('farming')->'wellAt';
begin
 select s.v into site from jsonb_array_elements(k->'sites') s(v) where p_x is not null and p_y is not null
   and greatest(abs((s.v->>'x')::numeric-p_x),abs((s.v->>'y')::numeric-p_y))<=(k->>'reach')::numeric limit 1;
 if p_action='pour' then
   if p_x is null or p_y is null or greatest(abs(p_x-(well_->>0)::integer),abs(p_y-(well_->>1)::integer))<>1 then return town.no('far');end if;
 elsif site is null then return town.no('far');end if;
 if p_action='gate' then
   if p_choice not in ('pool','reed') or p_choice is null then return town.no('none');end if;
   if town.held(bag,'sluiceKey')<1 then return town.no('tool');end if;
   if (p_gate->>'until')::numeric>p_now and (p_gate->>'route'=p_choice or (p_gate->>'until')::numeric-(k->>'gateMinutes')::numeric*60000+(k->>'gateCooldown')::numeric>p_now) then return town.no('spent');end if;
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,(k->>'cost')::double precision,p_now),'gate',jsonb_build_object('route',p_choice,'until',p_now+(k->>'gateMinutes')::bigint*60000,'by',p_me));
 elsif p_action='sample' then
   if p_choice is null or not (site->'items' ? p_choice) then return town.no('none');end if;
   if p_choice='springSample' and route_<>'pool' or p_choice='rushingSample' and route_<>'reed' then return town.no('none');end if;
   if p_choice in ('springSample','rushingSample') and town.held(bag,'waterSampler')<1
     and not exists(select 1 from jsonb_array_elements(bag) s where town.cat('farming')->'buckets' ? (s->>'item') and (s->>'n')::numeric>0) then return town.no('tool');end if;
   turn_:=floor(p_now::numeric/(k->>'every')::numeric)::bigint;key_:=site->>'id'||':'||p_choice;
   if p_purse->'streamTaken'->>key_=turn_::text then return town.no('spent');end if;
   if town.room(bag,p_choice)<1 then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,1));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,1),'streamTaken',coalesce(p_purse->'streamTaken','{}'::jsonb)||jsonb_build_object(key_,turn_));
 elsif p_action='prepare' then
   recipe:=k->'recipes'->p_choice;if recipe is null then return town.no('none');end if;
   if town.held(bag,case when p_choice like '%Blend' then 'mixingJug' else 'filterFrame' end)<1 then return town.no('tool');end if;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop
     if town.held(bag,need->>0)<(need->>1)::numeric then return town.no('none');end if;
   end loop;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
   if town.room(bag,p_choice)<(recipe->>'gives')::numeric then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,(recipe->>'gives')::integer));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,(recipe->>'gives')::integer));
 elsif p_action='pour' then
   nature_:=k->'nature'->>p_choice;if nature_ is null or town.held(bag,p_choice)<1 then return town.no('none');end if;
   times_:=greatest(1::double precision,case when town.held(town.carried_bag(p_purse),'sealedFlask')>0 then 2::double precision else 1::double precision end,town.buff_by(p_purse,p_now,'waterProperty'));
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,1::double precision,p_now)||jsonb_build_object('bag',town.take(bag,p_choice,1)),'nature',nature_,'times',times_);
 else return town.no('none');end if;
 book:=coalesce(p_purse->'streamBook','[]'::jsonb);if not book ? p_choice then book:=book||jsonb_build_array(p_choice);end if;
 return jsonb_build_object('ok',true,'got',got,'purse',out_||jsonb_build_object('streamBook',book));
end $function$
;
-- </town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint)>

-- <town.cook(jsonb,jsonb,jsonb,double precision,bigint)>
CREATE OR REPLACE FUNCTION town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
-- v177: stronger milestones and distinct powers.

declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb := town.tidy(p_things);
  kinds integer := jsonb_array_length(alls);
  crew_n integer := jsonb_array_length(p_crew);
  x jsonb;
  made text;
  t jsonb;
  short boolean;
  dish text;
  bag jsonb := p_purse->'bag';
  pot integer;
  spent jsonb;
  near jsonb;
  left_ integer;
  n integer;
  -- ── the older tools (v174): the forged cookware the pot is begun with, what it carries, and what the pot has of it ──
  mine_ jsonb;
  fx_ jsonb;
  more_ jsonb;
  batch_ integer := 1;
  used_big jsonb;
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  made := town.made_of(alls);
  if made is not null then
    t := town.takes(made);
    short := crew_n < (t->>'cooks')::int;
    if short or not town.in_hands(t->'in', p_crew) then
      -- somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if coalesce(p_purse->'made', '[]'::jsonb) ? made then
        return town.no(case when short or crew_n > 1 or jsonb_array_length(t->'in') > 1 then 'crew' else 'tool' end);
      end if;
      made := null;
    end if;
  end if;
  -- what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  dish := case when made is not null then (case when town.cat('dishes') ? made then made end)
               when jsonb_typeof(p_crew->0) = 'string' and ck->'cookware' ? (p_crew->>0) then ck->>'oddDish' end;
  for x in select v from jsonb_array_elements(alls) e(v) loop bag := town.take(bag, x->>0, (x->>1)::int); end loop;
  -- (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  if dish is not null then
    select (s.ord - 1)::int into pot from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
    if pot is null then return town.no('full'); end if;
  end if;
  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);
  -- ── the older tools (v174): forged cookware in the hand of whoever begins the pot, read once; and what it pays ──
  mine_ := town.cook_held(p_purse, p_crew);
  if mine_ is not null then
    fx_ := town.cook_fx(mine_);
    spent := town.tool_paid(p_purse, spent, p_now, mine_, fx_, 'ckFresh');
  end if;
  -- ── the older tools (v174): its end ──
  -- what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  if made is null then
    near := town.taste_of(alls, p_crew);
    if near->>'of' is not null and near->>'lacks' is not null and near->>'taste' in ('swap', 'less')
       and near->>'lacks' = (town.needs_of(near->>'of')->-1)->>0 then
      spent := spent || jsonb_build_object('tries', coalesce(spent->'tries', '{}'::jsonb)
        || jsonb_build_object(near->>'of', coalesce((spent->'tries'->>(near->>'of'))::int, 0) + 1));
    end if;
  end if;
  if dish is not null then
    if made is not null and mine_ is not null and (fx_->>'big')::double precision > 0
       and not exists (select 1 from jsonb_array_elements(alls) a(v) where town.held(p_purse->'bag', a.v->>0) < (a.v->>1)::numeric * town.opt_n('ckBig', 'batches', mine_)) then
      used_big := town.use_power(spent, mine_, 'ckBig', p_now);
      if (used_big->>'ok')::boolean then
        spent := used_big->'purse'; batch_ := town.opt_n('ckBig', 'batches', mine_)::integer;
        for x in select v from jsonb_array_elements(alls) a(v) loop bag := town.take(bag, x->>0, (x->>1)::numeric * (batch_ - 1)); end loop;
      end if;
    end if;
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, town.carried_bag(p_purse)) * batch_ else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    -- ── the older tools (v174): what the pot has of forged cookware, and what that counts ──
    if mine_ is not null then
      more_ := town.cook_more(spent, mine_, fx_, made is not null, town.luck_of('helping', p_now, kinds), p_now);
      spent := more_->'purse';
      left_ := left_ + (more_->>'more')::integer;
    end if;
    -- ── the older tools (v174): its end ──
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_))
          -- ── the older tools (v174): with what it carries from its cookware (nothing, of any other) ──
          || coalesce(more_->'marks', '{}'::jsonb))))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  if town.room(bag, made) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put(bag, made, n)));
end;
$function$
;
-- </town.cook(jsonb,jsonb,jsonb,double precision,bigint)>

-- <town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint)>
CREATE OR REPLACE FUNCTION town.prepare(p_purse jsonb, p_run jsonb, p_id uuid, p_answers jsonb, p_x integer, p_y integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
-- v203: passive equipment, outside the physical bag.
declare k jsonb:=town.cat('preparation');id_ text:=p_run->>'recipe';r jsonb:=k->'recipes'->id_;refused text;mistakes integer:=0;key_ text;n jsonb;bag jsonb:=p_purse->'bag';item_ text;count_ integer;out_ jsonb;can_adjust boolean;book jsonb;made_ jsonb;
begin
 if p_run is null or p_run->>'id' is distinct from p_id::text or p_now<(p_run->>'at')::bigint+(k->>'minMs')::bigint or p_now>(p_run->>'until')::bigint then return town.no('none');end if;
 if p_x is null or p_y is null or (p_run->'tile'->>0)::integer<>p_x or (p_run->'tile'->>1)::integer<>p_y then return town.no('far');end if;
 refused:=town.preparation_ready(p_purse,id_,p_x,p_y);if refused is not null then return town.no(refused);end if;
 if jsonb_typeof(p_answers) is distinct from 'object' then return town.no('none');end if;
 if p_answers ? 'correction' and jsonb_typeof(p_answers->'correction')<>'boolean' then return town.no('none');end if;
 foreach key_ in array array['method','heat','finish'] loop
   if jsonb_typeof(p_answers->key_) is distinct from 'number' then return town.no('none');end if;
   if (p_answers->>key_)::numeric<>floor((p_answers->>key_)::numeric) or (p_answers->>key_)::numeric not between 0 and 2 then return town.no('none');end if;
   if (p_answers->>key_)::integer<>(k->case when key_='method' then 'methods' else key_ end->>id_)::integer then mistakes:=mistakes+1;end if;
 end loop;
 can_adjust:=greatest(case when town.held(town.carried_bag(p_purse),'tastingSpoon')>0 then 1 else 0 end,town.buff_by(p_purse,p_now,'seasoning'))>0;
 if p_answers->'correction'='true'::jsonb then if not can_adjust then return town.no('tool');end if;mistakes:=greatest(0,mistakes-1);end if;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop bag:=town.take(bag,n->>0,(n->>1)::integer);end loop;
 item_:=case when mistakes=0 then id_ else 'compost' end;count_:=case when mistakes=0 then (r->>'gives')::integer else 1 end;
 if town.room(bag,item_)<count_ then return town.no('full');end if;
 book:=coalesce(p_purse->'prepBook','[]'::jsonb);made_:=coalesce(p_purse->'made','[]'::jsonb);
 if mistakes=0 then if not book ? id_ then book:=book||jsonb_build_array(id_);end if;if not made_ ? id_ then made_:=made_||jsonb_build_array(id_);end if;end if;
 out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,item_,count_),'prepBook',book,'made',made_);
 return jsonb_build_object('ok',true,'made',item_,'n',count_,'mistakes',mistakes,'purse',out_);
end $function$
;
-- </town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint)>

-- <town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)>
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
 return jsonb_build_object('ok',true,'effect',effect,'camp',p_old||jsonb_build_object('left',(p_old->>'left')::integer-1),'purse',out_);
end $function$
;
-- </town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint)>

-- <town.strike_window(jsonb,bigint)>
CREATE OR REPLACE FUNCTION town.strike_window(p_purse jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
  select (c.f->>'strike')::double precision * (
    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(town.carried_bag(p_purse)) s where c.f->'floats' ? (s->>'item')), 1::double precision))
    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision))
    -- ── the older tools (v174): a forged rod's own part, taken with the rest and never past the cap (1 for any other rod) ──
    * town.rod_strike(p_purse, p_now, c.f))
    from (select town.cat('fishing') as f) c
$function$
;
-- </town.strike_window(jsonb,bigint)>

-- <town.wear(jsonb,integer)>
CREATE OR REPLACE FUNCTION town.wear(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  more integer;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  bag jsonb;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  more := (town.cat('carries')->>(s->>'item'))::int;
  if more is null and town.passive_equipment() ? (s->>'item') then
    if (s - 'item' - 'n') <> '{}'::jsonb then return town.no('none'); end if;
    more := 0;
  end if;
  if more is null or jsonb_typeof(s->'n') is distinct from 'number' then return town.no('none'); end if;
  if (s->>'n')::numeric < 1 or (s->>'n')::numeric <> floor((s->>'n')::numeric) then return town.no('none'); end if;
  if wears ? (s->>'item') then return town.no('worn'); end if;
  bag := jsonb_set(p_purse->'bag', array[p_slot::text],
    case when (s->>'n')::int > 1 then s || jsonb_build_object('n', (s->>'n')::int - 1) else 'null'::jsonb end);
  bag := bag || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, more));
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', bag, 'wears', wears || to_jsonb(s->>'item')));
end;
$function$
;
-- </town.wear(jsonb,integer)>

-- <town.take_off(jsonb,text)>
CREATE OR REPLACE FUNCTION town.take_off(p_purse jsonb, p_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
  more integer := (town.cat('carries')->>p_item)::int;
  wears jsonb := coalesce(p_purse->'wears', '[]'::jsonb);
  things jsonb;
  slots integer;
begin
  if more is null and town.passive_equipment() ? p_item then more := 0; end if;
  if more is null or not wears ? p_item then return town.no('none'); end if;
  if more = 0 then
    if town.room(p_purse->'bag',p_item) < 1 then return town.no('full'); end if;
    return jsonb_build_object('ok',true,'purse',p_purse || jsonb_build_object(
      'bag',town.put(p_purse->'bag',p_item,1),'wears',(select coalesce(jsonb_agg(w order by ord),'[]'::jsonb)
        from jsonb_array_elements(wears) with ordinality y(w,ord) where w <> to_jsonb(p_item))));
  end if;
  select coalesce(jsonb_agg(s order by ord), '[]'::jsonb) into things
    from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord) where s <> 'null'::jsonb;
  slots := jsonb_array_length(p_purse->'bag') - more;
  if jsonb_array_length(things) + 1 > slots then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', things || jsonb_build_array(jsonb_build_object('item', p_item, 'n', 1))
      || (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, slots - jsonb_array_length(things) - 1)),
    'wears', (select coalesce(jsonb_agg(w order by ord), '[]'::jsonb) from jsonb_array_elements(wears) with ordinality y(w, ord) where w <> to_jsonb(p_item))));
end;
$function$
;
-- </town.take_off(jsonb,text)>

-- <town.set_down(jsonb,integer,text,jsonb,text)>
CREATE OR REPLACE FUNCTION town.set_down(p_purse jsonb, p_slot integer, p_me text, p_at jsonb, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'pot', jsonb_build_object('id', p_id, 'by', p_me, 'dish', s->'of'->'dish', 'left', s->'of'->'left', 'at', p_at)
      || case when town.held(town.carried_bag(p_purse),'tok') > 0 then '{"tok": true}'::jsonb else '{}'::jsonb end
      -- ── the older tools (v174): with what the pot carries from its cookware ──
      || town.pot_marks(s),
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)));
end;
$function$
;
-- </town.set_down(jsonb,integer,text,jsonb,text)>
notify pgrst, 'reload schema';
commit;
select jsonb_build_object(
 'equipment_count',jsonb_array_length(town.passive_equipment()),
 'helper_private',not has_function_privilege('authenticated','town.carried_bag(jsonb)','EXECUTE'),
 'wear_ready',position('town.passive_equipment()' in pg_get_functiondef('town.wear(jsonb,integer)'::regprocedure))>0,
 'cook_ready',position('town.carried_bag(p_purse)' in pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure))>0
) as v203_verified;
