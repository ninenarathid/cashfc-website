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