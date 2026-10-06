-- v153, the part every line's gifts stand on. A line's own functions are in v153.<line>.sql beside this file, tried
-- on top of this one (try-line.mjs); the file for supabase/ is put together from all of them.

-- The stretch of time a count is of, as one number, by the count's whole rule (lib/town/gifts' stretchOf): the day,
-- the day and which meal's hours of it, or which span of so many milliseconds the moment is in.
create or replace function town.stretch_at(p_rule jsonb, p_now bigint)
returns bigint language sql stable
as $$
  select case p_rule->>'per'
    when 'day' then town.day_of(p_now)::bigint
    when 'meal' then town.day_of(p_now)::bigint * 3 + town.meal_of(p_now)
    else floor(p_now::numeric / greatest(1, coalesce((p_rule->>'ms')::numeric, 1)))::bigint end
$$;

-- How many times a counted gift has been used in the stretch p_now is in (lib/town/gifts' usedOf): v152's, the
-- stretch by the rule.
create or replace function town.used_of(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_at(rule, p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- A counted gift used once (lib/town/gifts' useGift): v152's, the stretch by the rule.
create or replace function town.gift_use(p_purse jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  mine jsonb;
  n integer;
begin
  if rule is null or not town.gift_works(p_purse, p_id) then return town.no('none'); end if;
  n := town.used_of(p_purse, p_id, p_now);
  if n >= (rule->>'n')::integer then return town.no('spent'); end if;
  mine := town.gifts_of(p_purse);
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - n - 1,
    'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('used',
      (mine->'used') || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', n + 1)))));
end;
$$;

-- (v152's stretch by a word alone: nothing calls it now)
drop function if exists town.stretch_of(text, bigint);

-- How much harder a line's good things are at a rank of it (lib/town/gifts' harderAt): 1 below the rank the catalog
-- names, then so much more a rank.
create or replace function town.harder_at(p_rank integer)
returns double precision language sql stable
as $$
  select coalesce((select case when p_rank < (h->>'from')::integer then 1::double precision
      else 1 + (h->>'by')::double precision * (least(10, p_rank) - (h->>'from')::integer + 1) end
    from (select town.cat('gifts')->'harder' as h) c), 1)
$$;

-- A member's rank on a line now, and how much harder that line's good things are for them.
create or replace function town.rank_on(p_member uuid, p_line text)
returns integer language sql stable set search_path = public
as $$ select town.work_rank(p_line, coalesce((town.work_told(p_member, town.now_ms())->p_line->>'points')::double precision, 0)) $$;

create or replace function town.harder_for(p_member uuid, p_line text)
returns double precision language sql stable set search_path = public
as $$ select town.harder_at(town.rank_on(p_member, p_line)) $$;

-- The deeds' Thai words, for town.tally: v142's as the database has them, every word of theirs as it was, with a word
-- for each deed written down since that had none, and for each deed of the gifts of ranks 1 to 6.
create or replace function town.deed_th(p_what text)
returns text language sql immutable
as $$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    else p_what end
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
