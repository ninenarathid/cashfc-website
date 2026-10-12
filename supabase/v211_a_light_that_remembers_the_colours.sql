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
