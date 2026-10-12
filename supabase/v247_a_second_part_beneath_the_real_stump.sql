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