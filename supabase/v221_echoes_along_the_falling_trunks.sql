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
