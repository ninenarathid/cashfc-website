-- v339: Loy Krathong as Aqua announced it (Cash Town): materials easy to come by, entries until midnight, the lucky
-- draw's list for the admins
--
-- The owner, 2026-11-24 morning: "ช่วยปรับให้วัตถุดิบหาง่ายขึ้น", and with Aqua's announcement of the day's event
-- (make a krathong in Cash Town "ได้เรื่อยๆ จนถึงเวลาเที่ยงคืน", float it together in the evening, a lucky draw among the
-- verified members who made one and floated it), his choices: entries until midnight; the admins see who may be drawn.
--
-- 1. The parts: on the contest's morning no member held any base material (banana leaf, fern, plank, flour), nor beeswax
--    or a firefly for the light, and three held wildflowers for a ring. Every count comes down, and every part gains ways
--    to pay with what members do hold (logs, timber, dough, shiitake, toadstools, copper shards, wild apples …) or the
--    town's shop sells (banana leaf, flour, dough, oil, sugar, eggs, seaweed, shrimp, crickets). The cheapest krathong
--    from the shop alone: dough 2, a banana leaf, oil, two eggs: 29 coins. New ways come after the old ones in each
--    part's list, so a pick already made keeps its meaning.
-- 2. The windows (Bangkok): entries 23 Nov 18:00 -> 25 Nov 00:00 (midnight, as Aqua said); the float 24 Nov 18:00 ->
--    26 Nov 05:00 as before, so making and floating overlap the evening of the 24th (a krathong made then is entered and
--    may be floated at once); the vote 25 Nov 00:00 -> 21:00, after the entries close; the results 25 Nov 21:00.
-- 3. `rules.draw_until`: the lucky draw's last moment to have floated (24 Nov midnight); a row he may change.
-- 4. public.town_festival_draw(festival): for an admin only, every floated krathong's maker, FC or not, when made and
--    floated, and whether in time for the draw.
-- The code's twins: lib/town/krathong's PARTS and lib/town/festivals' LOY_KRATHONG_2026 (krathong.test.ts checks these
-- blocks). Needs v336. Runs twice without harm.

begin;
do $$ begin
  if to_regclass('public.town_festivals') is null then raise exception 'Run v336 before v339'; end if;
end $$;

-- <krathong-parts>
--   '{"b_wood":{"slot":"base","pay":[["splitPlank",2],["carvingBlank",1],["log",2],["timber",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",2],["fernTip",3]]},"b_bread":{"slot":"base","pay":[["flour",2],["pineNutFlour",2],["dough",2]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",3],["wildflower",4]]},"r_marigold":{"slot":"ring","pay":[["marigold",4]]},"l_candle":{"slot":"light","pay":[["beeswax",1],["oil",1]]},"l_firefly":{"slot":"light","pay":[["firefly",2],["dragonfly",1]]},"c_flower":{"slot":"centre","pay":[["marigold",3],["wildflower",3],["wildOrchid",1],["moonflower",1],["goldenDandelion",1]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",1],["mushroomSpores",2],["shiitake",2],["toadstool",2]]},"c_shell":{"slot":"centre","pay":[["snail",2],["pearl",1],["shrimpLive",2]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",1],["monarch",1],["lunaMoth",1],["silkMoth",1],["silkCocoon",1],["dragonfly",1]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1],["shardCopper",3],["shardSilver",2],["chipAquamarine",2]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",1],["lure",1],["log",2],["heartwood",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",3],["gardenHoney",1],["sweetGlaze",1],["candiedPumpkin",1],["wildApple",2]]},"c_feather":{"slot":"centre","pay":[["feather",3],["wool",2],["yarn",1],["egg",2]]},"c_bell":{"slot":"centre","pay":[["copperBlank",1],["floatBell",1],["shardCopper",2],["copperNodule",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",3],["lotusRootBed",1],["seaweed",2]]},"t_flower":{"slot":"trim","pay":[["marigold",1],["wildflower",1],["fragrantPetal",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1],["shiitake",1],["toadstool",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1],["shrimpLive",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1],["dragonfly",1],["cricket",2]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["shardCopper",1],["chipAquamarine",1],["stone",2]]},"t_carving":{"slot":"trim","pay":[["splitPlank",1],["carvingBlank",1],["log",1],["timber",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",1],["gardenHoney",1],["sweetGlaze",1],["wildApple",1]]},"t_feather":{"slot":"trim","pay":[["feather",1],["wool",1],["egg",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1],["shardCopper",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",1],["seaweed",1]]}}'::jsonb
-- <krathong-windows>
--   '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-24T17:00:00.000Z","until":"2026-11-25T14:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T14:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb
update public.town_festivals
   set rules = jsonb_set(rules, '{parts}', '{"b_wood":{"slot":"base","pay":[["splitPlank",2],["carvingBlank",1],["log",2],["timber",2]]},"b_leaf":{"slot":"base","pay":[["bananaLeaf",2],["fernTip",3]]},"b_bread":{"slot":"base","pay":[["flour",2],["pineNutFlour",2],["dough",2]]},"r_leaf":{"slot":"ring","pay":[["bananaLeaf",1],["fernTip",2]]},"r_lotus":{"slot":"ring","pay":[["fragrantPetal",3],["wildflower",4]]},"r_marigold":{"slot":"ring","pay":[["marigold",4]]},"l_candle":{"slot":"light","pay":[["beeswax",1],["oil",1]]},"l_firefly":{"slot":"light","pay":[["firefly",2],["dragonfly",1]]},"c_flower":{"slot":"centre","pay":[["marigold",3],["wildflower",3],["wildOrchid",1],["moonflower",1],["goldenDandelion",1]]},"c_mushroom":{"slot":"centre","pay":[["glowMushroom",1],["mushroomSpores",2],["shiitake",2],["toadstool",2]]},"c_shell":{"slot":"centre","pay":[["snail",2],["pearl",1],["shrimpLive",2]]},"c_butterfly":{"slot":"centre","pay":[["butterflyWhite",1],["monarch",1],["lunaMoth",1],["silkMoth",1],["silkCocoon",1],["dragonfly",1]]},"c_crystal":{"slot":"centre","pay":[["crystalLens",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["starShard",1],["shardCopper",3],["shardSilver",2],["chipAquamarine",2]]},"c_carving":{"slot":"centre","pay":[["carvingBlank",1],["lure",1],["log",2],["heartwood",1]]},"c_sweets":{"slot":"centre","pay":[["sugar",3],["gardenHoney",1],["sweetGlaze",1],["candiedPumpkin",1],["wildApple",2]]},"c_feather":{"slot":"centre","pay":[["feather",3],["wool",2],["yarn",1],["egg",2]]},"c_bell":{"slot":"centre","pay":[["copperBlank",1],["floatBell",1],["shardCopper",2],["copperNodule",1]]},"c_lily":{"slot":"centre","pay":[["hyacinth",3],["lotusRootBed",1],["seaweed",2]]},"t_flower":{"slot":"trim","pay":[["marigold",1],["wildflower",1],["fragrantPetal",1]]},"t_mushroom":{"slot":"trim","pay":[["mushroomSpores",1],["glowMushroom",1],["shiitake",1],["toadstool",1]]},"t_shell":{"slot":"trim","pay":[["snail",1],["pearl",1],["shrimpLive",1]]},"t_butterfly":{"slot":"trim","pay":[["butterflyWhite",1],["monarch",1],["dragonfly",1],["cricket",2]]},"t_crystal":{"slot":"trim","pay":[["crystalLens",1],["chipAmber",1],["gemRuby",1],["gemSapphire",1],["gemEmerald",1],["gemAmber",1],["gemTopaz",1],["gemAquamarine",1],["gemOnyx",1],["gemDiamond",1],["shardCopper",1],["chipAquamarine",1],["stone",2]]},"t_carving":{"slot":"trim","pay":[["splitPlank",1],["carvingBlank",1],["log",1],["timber",1]]},"t_sweets":{"slot":"trim","pay":[["sugar",1],["gardenHoney",1],["sweetGlaze",1],["wildApple",1]]},"t_feather":{"slot":"trim","pay":[["feather",1],["wool",1],["egg",1]]},"t_bell":{"slot":"trim","pay":[["copperBlank",1],["shardCopper",1]]},"t_lily":{"slot":"trim","pay":[["hyacinth",1],["seaweed",1]]}}'::jsonb) || jsonb_build_object('draw_until', '2026-11-24T17:00:00Z'),
       windows = '[{"kind":"announce","from":"2026-11-22T15:00:00.000Z","until":"2026-11-23T11:00:00.000Z","th":"เตรียมของ","en":"Gather"},{"kind":"auction","from":"2026-11-15T13:30:00.000Z","until":"2026-11-23T13:00:00.000Z","th":"ปิดประมูลชุดลอยกระทง","en":"Festival outfits auction closes"},{"kind":"make","from":"2026-11-23T11:00:00.000Z","until":"2026-11-24T17:00:00.000Z","th":"ส่งกระทงประกวด","en":"Enter a krathong"},{"kind":"float","from":"2026-11-24T11:00:00.000Z","until":"2026-11-25T22:00:00.000Z","th":"ลอยกระทง","en":"Float"},{"kind":"vote","from":"2026-11-24T17:00:00.000Z","until":"2026-11-25T14:00:00.000Z","th":"โหวตกระทง","en":"Vote"},{"kind":"results","from":"2026-11-25T14:00:00.000Z","until":null,"th":"ประกาศผล","en":"Results"}]'::jsonb
 where slug = 'loykrathong' and year = 2026;

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
-- select w->>'until' from public.town_festivals, jsonb_array_elements(windows) w where id = 1 and w->>'kind' = 'make';  -- 2026-11-24T17:00:00.000Z
-- select has_function_privilege('anon', 'public.town_festival_draw(integer)', 'execute');  -- f
