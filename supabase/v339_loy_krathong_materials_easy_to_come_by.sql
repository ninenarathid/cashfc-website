-- v339: Loy Krathong as Aqua announced it (Cash Town): more parts, each in a colour of the maker's choice, materials
-- a newcomer can find, entries until midnight, a tap on the river says whose krathong it is, the lucky draw's list
--
-- The owner, 2026-11-24: "ช่วยปรับให้วัตถุดิบหาง่ายขึ้น"; with Aqua's announcement of the day's event (make a krathong in
-- Cash Town "ได้เรื่อยๆ จนถึงเวลาเที่ยงคืน", float it together in the evening, a lucky draw among the verified members who
-- made one and floated it) his choices: entries until midnight, the admins see who may be drawn; then "ลุ้นรางวัลไม่แบ่ง
-- แยก fc นอกfc", "ตอนลอยกระทง ... สามารถคลิ๊กดูได้ว่าของใคร", "อยากให้มีแบบกระทงมากกว่านี้ ... วัตถุดิบไม่ยากเกินไป คนที่
-- เพิ่งเข้ามาก็หาได้ ... เอาให้เปลี่ยนสีได้ด้วย ในแต่ละส่วนประกอบ".
--
-- 1. The parts (44): every count is low, and every part may be paid with what members hold or the town's shop sells
--    (banana leaf, flour, dough, oil, sugar, eggs, seaweed, shrimp, crickets …); the cheapest krathong from the shop alone
--    costs about 29 coins. New ways and new parts come after the old ones, so a pick already made keeps its meaning.
-- 2. A pick may carry a third number, its colour (an index into lib/town/krathong's COLORS; 0, or none, the part's own;
--    any below 16 is kept, so colours may be added without a migration). Colour costs nothing.
-- 3. The windows (Bangkok): entries 23 Nov 18:00 -> 25 Nov 00:00 (midnight), the vote with them ("เฟสเปิดโหวต เอาให้
--    เวลาเดียวกับช่วงทำกระทงเลย", open to everybody in the town, one entry each as v336 has it); the float 24 Nov 18:00
--    -> 26 Nov 05:00, so it overlaps them the evening of the 24th (made then: entered, and floated at once); the results
--    25 Nov 21:00.
-- 4. The river (public.town_krathong_river) says each krathong's name and its maker's, for a tap on the map.
-- 4b. The stall (public.town_krathong): the popoto counts go to an admin only, at any time, and never to the members,
--    the results included ("ไม่ต้องเลือกกรรมการ ให้คนในเมืองโหวตกันเอง แค่ไม่เห็นคะแนนพอ มีแต่ admin ที่เห็นคะแนน"); the
--    makers' names as before, once the results are out. No judges' pick is offered any more (the game shows none).
-- 5. `rules.draw_until`: the lucky draw's last moment to have floated (24 Nov midnight), a row he may change; and
--    public.town_festival_draw(festival): for an admin only, every floated krathong's maker and when, one list for all.
-- The code's twins: lib/town/krathong's PARTS and COLOR_SLOTS, lib/town/festivals' LOY_KRATHONG_2026 (krathong.test.ts
-- checks these blocks). Needs v336. Runs twice without harm.

begin;
do $$ begin
  if to_regclass('public.town_festivals') is null then raise exception 'Run v336 before v339'; end if;
end $$;

-- <krathong-parts>
--   '{"b_wood":{"slot":"base","pay":[["splitPlank",2],["carvingBlank",1],["log",2],["timber",2],["oil",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",2],["fernTip",3]]},"b_bread":{"slot":"base","pay":[["flour",2],["pineNutFlour",2],["dough",2]]},"b_trunk":{"slot":"base","pay":[["bananaLeaf",2],["log",1]]},"b_coconut":{"slot":"base","pay":[["dough",2],["oil",1],["egg",2]]},"b_lilypad":{"slot":"base","pay":[["seaweed",2],["hyacinth",2],["bananaLeaf",2]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",3],["wildflower",4],["sugar",2]]},"r_marigold":{"slot":"ring","pay":[["marigold",4],["sugar",3]]},"r_rose":{"slot":"ring","pay":[["sugar",2],["wildflower",3],["fragrantPetal",2]]},"r_pandan":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2],["scallion",2]]},"r_shell":{"slot":"ring","pay":[["shrimpLive",2],["snail",2],["pearl",1]]},"l_candle":{"slot":"light","pay":[["beeswax",1],["oil",1]]},"l_firefly":{"slot":"light","pay":[["firefly",2],["dragonfly",1],["cricket",2]]},"l_lantern":{"slot":"light","pay":[["oil",1],["shardCopper",1]]},"l_incense":{"slot":"light","pay":[["oil",1],["beeswax",1]]},"c_flower":{"slot":"centre","pay":[["marigold",3],["wildflower",3],["wildOrchid",1],["moonflower",1],["goldenDandelion",1],["sugar",2]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",1],["mushroomSpores",2],["shiitake",2],["toadstool",2],["salt",3]]},"c_shell":{"slot":"centre","pay":[["snail",2],["pearl",1],["shrimpLive",2]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",1],["monarch",1],["lunaMoth",1],["silkMoth",1],["silkCocoon",1],["dragonfly",1],["cricket",3]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1],["shardCopper",3],["shardSilver",2],["chipAquamarine",2],["salt",4]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",1],["lure",1],["log",2],["heartwood",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",3],["gardenHoney",1],["sweetGlaze",1],["candiedPumpkin",1],["wildApple",2]]},"c_feather":{"slot":"centre","pay":[["feather",3],["wool",2],["yarn",1],["egg",2]]},"c_bell":{"slot":"centre","pay":[["copperBlank",1],["floatBell",1],["shardCopper",2],["copperNodule",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",3],["lotusRootBed",1],["seaweed",2]]},"c_lotusbud":{"slot":"centre","pay":[["sugar",2],["wildflower",2],["fragrantPetal",2]]},"c_star":{"slot":"centre","pay":[["shardCopper",2],["starShard",1],["salt",2]]},"c_koi":{"slot":"centre","pay":[["shrimpLive",2],["worm",3]]},"c_rabbit":{"slot":"centre","pay":[["stickyRice",2],["egg",2],["wool",1]]},"t_flower":{"slot":"trim","pay":[["marigold",1],["wildflower",1],["fragrantPetal",1],["sugar",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1],["shiitake",1],["toadstool",1],["salt",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1],["shrimpLive",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1],["dragonfly",1],["cricket",2]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["shardCopper",1],["chipAquamarine",1],["stone",2],["salt",2]]},"t_carving":{"slot":"trim","pay":[["splitPlank",1],["carvingBlank",1],["log",1],["timber",1],["oil",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",1],["gardenHoney",1],["sweetGlaze",1],["wildApple",1]]},"t_feather":{"slot":"trim","pay":[["feather",1],["wool",1],["egg",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1],["shardCopper",1],["oil",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",1],["seaweed",1]]},"t_star":{"slot":"trim","pay":[["salt",1],["shardCopper",1],["stone",1]]},"t_bow":{"slot":"trim","pay":[["egg",1],["wool",1],["yarn",1]]},"t_lantern":{"slot":"trim","pay":[["oil",1],["shardCopper",1]]},"t_moon":{"slot":"trim","pay":[["sugar",1],["seaweed",1]]}}'::jsonb
-- <krathong-windows>
--   '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T14:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb
update public.town_festivals
   set rules = jsonb_set(rules, '{parts}', '{"b_wood":{"slot":"base","pay":[["splitPlank",2],["carvingBlank",1],["log",2],["timber",2],["oil",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",2],["fernTip",3]]},"b_bread":{"slot":"base","pay":[["flour",2],["pineNutFlour",2],["dough",2]]},"b_trunk":{"slot":"base","pay":[["bananaLeaf",2],["log",1]]},"b_coconut":{"slot":"base","pay":[["dough",2],["oil",1],["egg",2]]},"b_lilypad":{"slot":"base","pay":[["seaweed",2],["hyacinth",2],["bananaLeaf",2]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",3],["wildflower",4],["sugar",2]]},"r_marigold":{"slot":"ring","pay":[["marigold",4],["sugar",3]]},"r_rose":{"slot":"ring","pay":[["sugar",2],["wildflower",3],["fragrantPetal",2]]},"r_pandan":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2],["scallion",2]]},"r_shell":{"slot":"ring","pay":[["shrimpLive",2],["snail",2],["pearl",1]]},"l_candle":{"slot":"light","pay":[["beeswax",1],["oil",1]]},"l_firefly":{"slot":"light","pay":[["firefly",2],["dragonfly",1],["cricket",2]]},"l_lantern":{"slot":"light","pay":[["oil",1],["shardCopper",1]]},"l_incense":{"slot":"light","pay":[["oil",1],["beeswax",1]]},"c_flower":{"slot":"centre","pay":[["marigold",3],["wildflower",3],["wildOrchid",1],["moonflower",1],["goldenDandelion",1],["sugar",2]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",1],["mushroomSpores",2],["shiitake",2],["toadstool",2],["salt",3]]},"c_shell":{"slot":"centre","pay":[["snail",2],["pearl",1],["shrimpLive",2]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",1],["monarch",1],["lunaMoth",1],["silkMoth",1],["silkCocoon",1],["dragonfly",1],["cricket",3]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1],["shardCopper",3],["shardSilver",2],["chipAquamarine",2],["salt",4]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",1],["lure",1],["log",2],["heartwood",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",3],["gardenHoney",1],["sweetGlaze",1],["candiedPumpkin",1],["wildApple",2]]},"c_feather":{"slot":"centre","pay":[["feather",3],["wool",2],["yarn",1],["egg",2]]},"c_bell":{"slot":"centre","pay":[["copperBlank",1],["floatBell",1],["shardCopper",2],["copperNodule",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",3],["lotusRootBed",1],["seaweed",2]]},"c_lotusbud":{"slot":"centre","pay":[["sugar",2],["wildflower",2],["fragrantPetal",2]]},"c_star":{"slot":"centre","pay":[["shardCopper",2],["starShard",1],["salt",2]]},"c_koi":{"slot":"centre","pay":[["shrimpLive",2],["worm",3]]},"c_rabbit":{"slot":"centre","pay":[["stickyRice",2],["egg",2],["wool",1]]},"t_flower":{"slot":"trim","pay":[["marigold",1],["wildflower",1],["fragrantPetal",1],["sugar",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1],["shiitake",1],["toadstool",1],["salt",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1],["shrimpLive",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1],["dragonfly",1],["cricket",2]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["shardCopper",1],["chipAquamarine",1],["stone",2],["salt",2]]},"t_carving":{"slot":"trim","pay":[["splitPlank",1],["carvingBlank",1],["log",1],["timber",1],["oil",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",1],["gardenHoney",1],["sweetGlaze",1],["wildApple",1]]},"t_feather":{"slot":"trim","pay":[["feather",1],["wool",1],["egg",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1],["shardCopper",1],["oil",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",1],["seaweed",1]]},"t_star":{"slot":"trim","pay":[["salt",1],["shardCopper",1],["stone",1]]},"t_bow":{"slot":"trim","pay":[["egg",1],["wool",1],["yarn",1]]},"t_lantern":{"slot":"trim","pay":[["oil",1],["shardCopper",1]]},"t_moon":{"slot":"trim","pay":[["sugar",1],["seaweed",1]]}}'::jsonb) || jsonb_build_object('draw_until', '2026-11-24T17:00:00Z'),
       windows = '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T14:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb
 where slug = 'loykrathong' and year = 2026;

-- A design as it may be kept, a pick being [part, payment] or [part, payment, colour]. The twin of lib/town/krathong's
-- `check` (v336's, and the colour).
create or replace function town.krathong_design(p_parts jsonb, p_design jsonb, p_max integer) returns jsonb
language plpgsql immutable set search_path to '' as $$
declare
  places jsonb := '[]'::jsonb;
  e jsonb;
  pick jsonb;
  part jsonb;
begin
  if p_design is null or jsonb_typeof(p_design) <> 'object' or jsonb_typeof(p_design->'trims') is distinct from 'array'
     or jsonb_array_length(p_design->'trims') > p_max then return null; end if;
  places := jsonb_build_array(jsonb_build_array('base', p_design->'base'), jsonb_build_array('ring', p_design->'ring'),
                              jsonb_build_array('light', p_design->'light'), jsonb_build_array('centre', p_design->'centre'));
  for e in select jsonb_build_array('trim', t) from jsonb_array_elements(p_design->'trims') t loop places := places || jsonb_build_array(e); end loop;
  for e in select x from jsonb_array_elements(places) x loop
    pick := e->1;
    if pick is null or jsonb_typeof(pick) <> 'array' or jsonb_array_length(pick) not in (2, 3)
       or jsonb_typeof(pick->0) <> 'string' or jsonb_typeof(pick->1) <> 'number' or (pick->>1) !~ '^[0-9]{1,3}$' then return null; end if;
    if jsonb_array_length(pick) = 3 and (jsonb_typeof(pick->2) <> 'number' or (pick->>2) !~ '^[0-9]{1,2}$' or (pick->>2)::int >= 16) then return null; end if;
    part := p_parts->(pick->>0);
    if part is null or part->>'slot' is distinct from e->>0 then return null; end if;
    if (pick->>1)::int >= jsonb_array_length(part->'pay') then return null; end if;
  end loop;
  return jsonb_build_object('base', p_design->'base', 'ring', p_design->'ring', 'light', p_design->'light',
                            'centre', p_design->'centre', 'trims', p_design->'trims');
end;
$$;

-- The stall (v336's), the popoto counts for an admin only.
create or replace function public.town_krathong(p_festival integer) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  mine public.town_krathongs%rowtype;
  shown boolean;
  counts boolean := public.is_admin();
  each_ integer;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.no('none'); end if;
  if f.settled_at is null and town.festival_open(f.windows, 'results', town.festival_now()) then
    perform town.krathong_settle(f.id);
    select * into f from public.town_festivals where id = p_festival;
  end if;
  shown := f.settled_at is not null;
  each_ := coalesce((f.rules->>'votes_each')::int, 3);
  select * into mine from public.town_krathongs where festival = f.id and member_id = me;
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'festival', town.festival_view(f),
    'rules', f.rules - 'titles',
    'mine', case when mine.id is null then null else town.krathong_view(mine) || jsonb_build_object('wish', mine.wish) end,
    'entries', coalesce((
      select jsonb_agg(town.krathong_view(k) || jsonb_build_object(
               'mine', k.member_id = me,
               'fc', exists (select 1 from public.fc_roster r where r.character_id = k.character_id))
             || case when shown then jsonb_build_object(
               'maker', (select jsonb_build_object('name', p.character_name, 'character', p.character_id) from public.profiles p where p.id = k.member_id))
             else '{}'::jsonb end
             || case when counts then jsonb_build_object(
               'votes', (select count(*) from public.town_krathong_votes v where v.entry = k.id))
             else '{}'::jsonb end
             order by k.id)
        from public.town_krathongs k where k.festival = f.id and k.entered), '[]'::jsonb),
    'voted', coalesce((select jsonb_agg(v.entry order by v.entry) from public.town_krathong_votes v where v.festival = f.id and v.voter = me), '[]'::jsonb),
    'votesEach', each_,
    'floated', (select count(*) from public.town_krathongs k where k.festival = f.id and k.floated_at is not null),
    'judged', f.judge_entry is not null,
    'awards', case when shown then coalesce((
      select jsonb_agg(jsonb_build_object('entry', a.entry, 'kind', a.kind, 'place', a.place,
               'votes', case when counts then a.votes else null end,
               'title', jsonb_build_object('th', a.title_th, 'en', a.title_en),
               'krathong', town.krathong_view(k),
               'maker', (select jsonb_build_object('name', p.character_name, 'character', p.character_id) from public.profiles p where p.id = a.member_id),
               'fc', exists (select 1 from public.fc_roster r where r.character_id = k.character_id))
             order by a.kind desc, a.place, a.entry)
        from public.town_festival_awards a join public.town_krathongs k on k.id = a.entry where a.festival = f.id), '[]'::jsonb) else null end,
    'capsule', coalesce((
      select jsonb_agg(jsonb_build_object('year', o.year, 'name', k.name, 'design', k.design, 'wish', k.wish) order by o.year desc)
        from public.town_krathongs k join public.town_festivals o on o.id = k.festival
       where k.member_id = me and o.slug = f.slug and o.year < f.year and k.wish is not null), '[]'::jsonb));
end;
$$;

-- What floats now, for the map (v336's), with each krathong's name and its maker's: a tap says whose it is.
create or replace function public.town_krathong_river(p_festival integer) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
begin
  select * into f from public.town_festivals where id = p_festival and published;
  if not found or not town.festival_open(f.windows, 'float', town.festival_now()) then
    return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'now', town.now_ms(), 'river', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'design', x.design, 'floated', (extract(epoch from x.floated_at) * 1000)::bigint,
             'mine', x.member_id = me, 'name', x.name,
             'maker', (select p.character_name from public.profiles p where p.id = x.member_id)) order by x.floated_at)
      from (select * from public.town_krathongs k where k.festival = f.id and k.floated_at is not null order by k.floated_at desc limit 300) x), '[]'::jsonb));
end;
$$;

-- The lucky draw's list, for the admins: whoever floated a krathong, in the order they floated it.
create or replace function public.town_festival_draw(p_festival integer) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  f public.town_festivals%rowtype;
  cutoff timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then return town.no('denied'); end if;
  select * into f from public.town_festivals where id = p_festival;
  if not found then return town.no('none'); end if;
  cutoff := nullif(f.rules->>'draw_until', '')::timestamptz;
  return jsonb_build_object('ok', true, 'now', town.now_ms(),
    'until', case when cutoff is null then null else (extract(epoch from cutoff) * 1000)::bigint end,
    'list', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'name', k.name, 'design', k.design, 'entered', k.entered,
               'maker', jsonb_build_object('name', p.character_name, 'character', p.character_id),
               'verified', p.character_id is not null,
               'fc', exists (select 1 from public.fc_roster r where r.character_id = k.character_id),
               'made', (extract(epoch from k.made_at) * 1000)::bigint,
               'floated', (extract(epoch from k.floated_at) * 1000)::bigint,
               'inTime', cutoff is null or k.floated_at < cutoff)
             order by k.floated_at, k.id)
        from public.town_krathongs k left join public.profiles p on p.id = k.member_id
       where k.festival = f.id and k.floated_at is not null), '[]'::jsonb));
end;
$$;
revoke all on function public.town_festival_draw(integer) from public, anon;
grant execute on function public.town_festival_draw(integer) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Afterwards (each should say what is written beside it):
-- select rules->'parts'->'l_candle'->'pay', rules->>'draw_until' from public.town_festivals where id = 1;   -- [["beeswax", 1], ["oil", 1]]  2026-11-24T17:00:00Z
-- select (select count(*) from jsonb_object_keys(rules->'parts')) from public.town_festivals where id = 1;  -- 44
-- select w->>'until' from public.town_festivals, jsonb_array_elements(windows) w where id = 1 and w->>'kind' = 'make';  -- 2026-11-24T17:00:00.000Z
-- select has_function_privilege('anon', 'public.town_festival_draw(integer)', 'execute');  -- f
