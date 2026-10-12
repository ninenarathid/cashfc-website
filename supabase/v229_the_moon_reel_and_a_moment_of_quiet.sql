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