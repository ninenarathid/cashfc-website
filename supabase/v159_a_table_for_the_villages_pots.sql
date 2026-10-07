-- v159 — a table for the village's pots
--
-- Run this once in the Supabase SQL editor, after v158 (it stops at its first line without it). Running it again is
-- safe. THE SITE'S CODE FOR IT GOES OUT FIRST: a page built before draws every pot by the tile it is told, and is told
-- one tile for all that is on the table (it shows them heaped in the middle of the yard, and still ladles from the
-- one it finds there); members with the town open since before the deploy should load it again.
--
-- Why. Aqua, 2026-10-07, of pots of food left standing all over the town:
--
--   "คิดว่าต้องมีโต๊ะวางอาหารเป็นหลักแหล่งแล้วอะ ตอนนี้เกลื่อนเมือง ดีนะ ไม่มีอาหารเน่าเสีย"
--
-- A pot set down stood where it was until its last helping was out, six to a member, on any tile of the town or the
-- farm, and far more is cooked than is eaten (three helpings to a meal's hours, each into a bowl of one's own). And
-- the owner, the same night: "คนชอบทิ้ง อาหารแปลกๆ ที่ได้จากการใช้สูตรผิด". His words on what was laid before him:
-- what is left when its time is up is gone ("หายไปเลย"), a pot may still be set on the ground for a while ("ได้ตามที่
-- คุณแนะนำ"), and the table has bowls of its own ("ถ้วยของโต๊ะ: เอา").
--
-- What it does.
--   * The cooking yard's two dining tables are the village's feast table. A dish set down on the yard's floor is on
--     it (`town_pots.feast`), reached from anywhere on that floor, six of one member's at a time.
--   * A pot set down anywhere else stands there sixty minutes, two of one member's at a time, and is then on the
--     table, as if set there as its hour ended.
--   * What is on the table is cleared away when the meal's hours after the ones it came there in are over (from six
--     to eighteen hours on), whatever is left in it.
--   * The odd dish never comes to the table: set down anywhere, the yard too, it stands its hour and is gone.
--   * The table has bowls of its own: `town_feast_eat` begins a helping of a pot on the table for somebody sitting
--     down in the yard, with no bowl of theirs. It is never in their bag, and no bowl comes back when it is eaten
--     (`eating.lent` in the purse). It is one of the three helpings of a meal's hours like any other.
--   * Nothing runs by a clock of its own: the pots are tidied (`town.pots_tidy`) whenever anybody is told of them or
--     does anything with one, and a pot the table is cleared of is written down (`pot_gone`, in its cook's name).
--   * THE POTS THAT STAND ABOUT AS THIS RUNS: every dish goes onto the table at once, with the table's whole time
--     before it; every pot of the odd dish is gone at once, written down as `pot_gone`.
--
-- Written again, each as it last ran but for the lines meant (scripts/db/build-v159.mjs writes them from the texts
-- that ran; v159.lines.mjs has the lines): `town.chew` (v153's) and `town.get_up` (v111's) for the table's bowl;
-- `public.town_kitchen` (v111's) tidies and tells of the table; `public.town_pot_down` (v158's);
-- `public.town_pot_ladle` and `public.town_pot_take` (v121's) tidy first. `town.pot_doc` and `town.reaches` (v111's)
-- are written anew: a pot is told with the moment it came to where it is, whether that is the table, and what its
-- cook is called; a pot of the table is reached from the yard's floor.
--
-- The catalog's `cooking` row is written over: `pots` 2 where it was 6, and `feast` (how many of one member's the
-- table takes, the minutes on the ground, the tile said of a pot on the table, the yard's floor). No coins are made
-- or taken by any of it. Every number is in that row.
--
-- And a bowl sits three to a slot (the owner, 2026-10-08, while this was being built: "ช่วยแก้ให้ถ้วย stack ได้ด้วย ซัก 3
-- ใบ"): one number of the catalog's `items` row, `bowl.stack`, 3 where it was 1. No rule is written for it: what
-- fits in a slot is read from that row. Bowls that lie one to a slot in a bag stay as they lie, and come together as
-- they are used: a bowl that comes back from a meal sits with the others. A helping ladled out of a slot of several
-- bowls needs room of its own (it took its bowl's place when a bowl had a slot to itself): with none, the bag is full.

do $$ begin
  if to_regprocedure('public.town_pot_down(integer, integer, integer)') is null or to_regprocedure('town.begun(jsonb, text, bigint)') is null then
    raise exception 'v159 needs v158: run supabase/v158 first';
  end if;
end $$;

-- ─── The catalog ───────────────────────────────────────────────────────────

-- <catalog:v159> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('cooking', $town${
    "cost": 4,
    "stirs": 2,
    "kinds": 8,
    "ladle": 1,
    "pots": 2,
    "reach": 1.8,
    "tok": 3.2,
    "odd": {"per":2,"most":4},
    "oddDish": "oddDish",
    "clue": 3,
    "recipes": ["friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette","fishSauce","compost","growFert","guardFert","pestCure","basket","hookScale","floatGlow","bowl","skewer","floatFeather","lineSpun","mulch","lavenderSachet","bugNet","driedFish","saltedFish","curryPaste","pickle","charcoal","rope","krabung","noodle","coconutMilk","fermentedFish","shrimpPaste","driedChili","riceNoodle","toastedRice","yoke"],
    "needs": {"friedMinnow":{"minnow":3,"salt":1},"grilledFish":{"salt":2,"tilapia":1},"grilledCorn":{"corn":2},"roastSweetPotato":{"sweetPotato":2},"stirKangkong":{"chili":1,"garlic":1,"kangkong":3},"basilCatfish":{"basil":2,"catfish":1,"chili":1,"garlic":1,"rice":2},"tomYum":{"chili":2,"scallion":1,"snakehead":1,"tomato":2},"sourCurry":{"barb":2,"cabbage":1,"chili":1,"daikon":1},"friedPerch":{"garlic":2,"perch":2,"salt":1},"fishCake":{"basil":1,"chili":1,"featherback":1,"salt":1},"spicyEel":{"basil":2,"chili":2,"eel":1,"garlic":1},"grilledPrawn":{"prawn":2,"salt":1},"steamedGoby":{"fishSauce":1,"goby":1,"scallion":2},"pumpkinSoup":{"pumpkin":1,"salt":1,"scallion":1},"shabu":{"cabbage":1,"carrot":2,"corn":1,"daikon":1,"pangasius":1,"prawn":2,"scallion":2},"somTam":{"chili":2,"lime":1,"longBean":1,"papaya":1,"sugar":1,"tomato":1},"grilledEggplant":{"eggplant":2,"fishSauce":1},"tomKha":{"chili":1,"galangal":1,"lemongrass":1,"lime":1,"sheatfish":1},"friedGourami":{"gourami":2,"oil":1,"salt":1},"crabCurry":{"crab":3,"curryPaste":1,"eggplant":1,"longBean":1},"steamedSheatfish":{"chili":1,"garlic":1,"lime":2,"sheatfish":1},"friedFrog":{"frog":2,"garlic":2,"oil":1},"laab":{"bagrid":1,"chili":1,"lime":1,"rice":1,"scallion":1},"omelette":{"egg":2,"oil":1},"snailCurry":{"curryPaste":1,"lemongrass":1,"snail":6},"candiedPumpkin":{"pumpkin":1,"sugar":2},"friedRice":{"egg":1,"oil":1,"rice":3,"scallion":1},"greenCurry":{"basil":1,"coconutMilk":1,"curryPaste":1,"eggplant":2,"featherback":1},"khanomJeen":{"coconutMilk":1,"croaker":1,"curryPaste":1,"longBean":1,"riceNoodle":3},"hoMok":{"bananaLeaf":2,"basil":1,"blackEar":1,"coconutMilk":1,"curryPaste":1},"mangoStickyRice":{"coconutMilk":1,"mango":2,"stickyRice":2,"sugar":1},"bananaInCoconut":{"banana":3,"coconutMilk":1,"sugar":1},"taroPudding":{"coconutMilk":1,"flour":1,"sugar":1,"taro":1},"steamedCroaker":{"croaker":1,"ginger":1,"scallion":1,"soy":1},"gingerFish":{"blackEar":1,"ginger":2,"oil":1,"soy":1},"turmericFish":{"garlic":2,"oil":1,"spinyEel":2,"turmeric":1},"jungleCurry":{"curryPaste":1,"eggplant":1,"galangal":1,"giantSnakehead":1,"lemongrass":1,"longBean":1},"megaLaab":{"chili":3,"lime":3,"megaCatfish":1,"scallion":2,"toastedRice":1},"watermelonSlices":{"watermelon":1},"khantoke":{"coconutMilk":1,"cucumber":2,"curryPaste":1,"goldenCarp":1,"longBean":2,"pepper":1,"stickyRice":3},"naamPrik":{"chili":3,"cucumber":1,"fermentedFish":1,"garlic":1,"lime":1},"sushi":{"rice":2,"seaweed":1,"sugar":1,"tilapia":1},"ramen":{"driedFish":1,"egg":1,"noodle":2,"scallion":1,"soy":1},"tempura":{"egg":1,"flour":1,"oil":1,"prawn":2},"unadon":{"eel":1,"rice":2,"soy":1,"sugar":1},"okonomiyaki":{"cabbage":1,"egg":1,"flour":1,"prawn":1,"scallion":1},"kimchi":{"cabbage":2,"chili":2,"fishSauce":1,"garlic":1},"bibimbap":{"carrot":1,"chili":1,"cucumber":1,"egg":1,"kangkong":1,"rice":2},"tteokbokki":{"chili":2,"scallion":1,"stickyRice":2,"sugar":1},"kimbap":{"carrot":1,"cucumber":1,"egg":1,"rice":2,"seaweed":1},"pajeon":{"egg":1,"flour":1,"oil":1,"scallion":3},"harGow":{"flour":2,"prawn":2,"scallion":1},"chowMein":{"cabbage":1,"carrot":1,"noodle":2,"oil":1,"soy":1},"springRoll":{"cabbage":1,"carrot":1,"flour":1,"oil":1},"congee":{"egg":1,"perch":1,"rice":2,"scallion":1},"mapoTofu":{"chili":2,"garlic":1,"scallion":1,"soy":1,"tofu":2},"pizza":{"basil":1,"cheese":1,"flour":2,"tomato":2},"spaghetti":{"garlic":1,"noodle":2,"oil":1,"prawn":1,"tomato":2},"risotto":{"cheese":1,"garlic":1,"pumpkin":1,"rice":2},"lasagna":{"cheese":2,"eggplant":1,"noodle":2,"tomato":2},"minestrone":{"cabbage":1,"carrot":1,"longBean":1,"noodle":1,"tomato":2},"fishCurry":{"catfish":1,"chili":2,"coconutMilk":1,"ginger":1,"turmeric":1},"naan":{"flour":2,"garlic":1,"milk":1},"biryani":{"milk":1,"pangasius":1,"pepper":1,"rice":3,"turmeric":1},"samosa":{"chili":1,"flour":1,"oil":1,"sweetPotato":1},"lassi":{"mango":1,"milk":1,"sugar":1},"fishChips":{"popotoFish":2,"salt":1},"ukha":{"carrot":2,"pike":1,"salt":1,"scallion":1},"thieboudienne":{"cabbage":1,"carrot":1,"nilePerch":1,"rice":3},"piranhaSoup":{"chili":2,"piranha":2,"scallion":1},"crawfishBoil":{"chili":2,"corn":2,"crayfish":5,"salt":2},"masgouf":{"carp":1,"salt":2,"scallion":2},"salmonSteak":{"garlic":1,"salmon":1,"salt":1},"arapaimaRoast":{"arapaima":1,"chili":2,"salt":3},"mushroomSoup":{"salt":1,"scallion":1,"shiitake":3},"mushroomSkewer":{"salt":1,"shiitake":2},"fishOnStick":{"barb":1,"salt":1},"roastYam":{"wildYam":2},"roastedApple":{"wildApple":2},"mushroomRisotto":{"porcini":1,"rice":2,"salt":1,"scallion":1},"fernSalad":{"fiddlehead":3,"mint":1,"salt":1},"herbTea":{"chamomile":2,"mint":1},"berryCompote":{"blueberry":2,"raspberry":2,"wildStrawberry":1},"bakedApple":{"chestnut":1,"wildApple":3},"roastChestnut":{"chestnut":4,"salt":1},"forestStew":{"carrot":1,"rosemary":1,"shiitake":1,"wildYam":2},"bambooShootStir":{"bambooShoot":2,"chili":1,"salt":1},"rosemaryFish":{"perch":1,"rosemary":1,"salt":1},"ginsengSoup":{"ginseng":1,"salt":1,"scallion":1,"shiitake":2},"moonTea":{"chamomile":1,"mint":1,"moonflower":1},"truffleEggs":{"egg":2,"salt":1,"truffle":1},"mushroomOmelette":{"chanterelle":1,"egg":2,"salt":1},"fishSauce":{"minnow":4,"salt":2},"compost":{"hyacinth":3},"growFert":{"compost":2,"minnow":2},"guardFert":{"chili":2,"compost":2,"garlic":1},"pestCure":{"chili":2,"salt":1,"scallion":2},"basket":{"hyacinth":6},"hookScale":{"gar":1},"floatGlow":{"moonFish":1},"bowl":{"mussel":2},"skewer":{"twig":2},"floatFeather":{"bambooCane":1,"feather":2},"lineSpun":{"silkCocoon":3},"mulch":{"leafMould":3},"lavenderSachet":{"lavender":3,"vine":1},"bugNet":{"bambooCane":1,"vine":2},"driedFish":{"barb":2,"salt":1},"saltedFish":{"salt":3,"tilapia":1},"curryPaste":{"chili":3,"galangal":1,"garlic":2,"lemongrass":1},"pickle":{"cabbage":1,"salt":2},"charcoal":{"driftwood":2},"rope":{"hyacinth":4},"krabung":{"hyacinth":8,"rope":1},"noodle":{"egg":1,"flour":2},"coconutMilk":{"coconut":1},"fermentedFish":{"gourami":2,"salt":2,"toastedRice":1},"shrimpPaste":{"salt":2,"shrimpLive":5},"driedChili":{"chili":4},"riceNoodle":{"flour":2},"toastedRice":{"rice":2},"yoke":{"basket":2,"driftwood":2,"rope":2}},
    "cookware": ["pan","grill","pot","mortar","wok","steamer","cleaver","steamerBamboo","panBrass","potBrass","hotpot","sushiMat","jar","stoneBowl","rollingPin","oven","skewer"],
    "gear": {"wok":1.25,"potBrass":1.5,"panBrass":1.5,"stoveBig":1.25},
    "never": ["tool","scroll","dish","bug"],
    "bowl": "bowl",
    "bowled": ["oddDish","friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette"],
    "inside": {"boot":{"chance":0.35,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"bottle":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea","scrollTruffleEggs","scrollMushroomOmelette"]},"chest":{"chance":1,"scrolls":["scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollKhanomJeen","scrollMangoStickyRice","scrollBananaInCoconut","scrollTaroPudding","scrollSteamedCroaker","scrollGingerFish","scrollTurmericFish","scrollJungleCurry","scrollMegaLaab","scrollWatermelonSlices","scrollKhantoke","scrollNaamPrik","scrollRamen","scrollUnadon","scrollTteokbokki","scrollChowMein","scrollMapoTofu","scrollPizza","scrollRisotto","scrollLasagna","scrollFishCurry","scrollNaan","scrollBiryani","scrollLassi","scrollTruffleEggs","scrollMushroomOmelette"]},"wels":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"pacu":{"chance":0.8,"scrolls":["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato"]}},
    "map": {"town":[64,64],"farm":[128,0,60,44]},
    "misses": 30,
    "feast": {"pots":6,"ground":60,"tile":[46,48],"floor":[[47,50],[40,43],[46,38],[45,39],[44,40],[43,41],[44,41],[45,41],[48,41],[49,41],[44,42],[45,42],[46,42],[47,42],[48,42],[50,42],[41,43],[44,43],[47,43],[51,43],[40,44],[41,44],[42,44],[43,44],[46,44],[52,44],[40,45],[41,45],[42,45],[43,45],[44,45],[45,45],[38,46],[41,46],[42,46],[45,46],[46,46],[39,47],[40,47],[46,47],[47,47],[36,48],[37,48],[39,48],[42,48],[43,48],[45,48],[46,48],[47,48],[48,48],[37,49],[38,49],[39,49],[40,49],[41,49],[44,49],[45,49],[46,49],[47,49],[38,50],[39,50],[40,50],[45,50],[46,50],[39,51],[40,52],[41,53],[42,54]]}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v159>

-- A bowl, three to a slot. One number of the `items` row, written by itself: the row is every thing there is, and
-- written whole it would take back whatever another file gave it between this one being made and being run.
update public.town_catalog c set data = jsonb_set(c.data, '{bowl,stack}', '3'::jsonb), updated_at = now()
 where c.key = 'items' and c.data->'bowl'->>'stack' is distinct from '3';

-- ─── The pots' table ───────────────────────────────────────────────────────
-- A pot on the feast table is told as standing on one tile, the same for all of them: so the one-to-a-tile rule is
-- for pots on the ground alone. The first time this runs, what stands about is tidied once (see the head).

do $$
declare
  ck jsonb := town.cat('cooking');
  tile jsonb := ck->'feast'->'tile';
  o record;
begin
  if exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'town_pots' and c.column_name = 'feast') then return; end if;
  alter table public.town_pots add column feast boolean not null default false;
  alter table public.town_pots drop constraint if exists town_pots_x_y_key;
  create unique index town_pots_ground on public.town_pots (x, y) where not feast;
  for o in delete from public.town_pots p where p.dish = ck->>'oddDish' returning p.id, p.member_id, p.dish, p.helpings loop
    perform town.note(o.member_id, 'pot_gone', o.dish, o.helpings, 0, jsonb_build_object('pot', o.id, 'from', 'ground'));
  end loop;
  update public.town_pots p set feast = true, tok = false, set_at = town.now_ms(), x = (tile->>0)::smallint, y = (tile->>1)::smallint
   where not p.feast;
end $$;

-- ─── The rules (lib/town/cooking.ts, lib/town/stamina.ts) ──────────────────

-- The moment the meal after this one begins (lib/town/stamina's nextMealAt), by Bangkok's clock.
create or replace function town.next_meal_at(p_now bigint)
returns bigint language sql stable as $$
  with d as (
    select p_now + 7 * 3600000::bigint as local_, (p_now + 7 * 3600000::bigint) - ((p_now + 7 * 3600000::bigint) % 86400000) as start_,
           town.cat('stamina')->'meals' as meals)
  select (select min(t.at) from (
            select d.start_ + m.h::bigint * 3600000 as at from jsonb_array_elements_text(d.meals) as m(h)
            union all select d.start_ + 86400000 + (d.meals->>0)::bigint * 3600000) t
           where t.at > d.local_) - 7 * 3600000::bigint
    from d
$$;

-- When what came to the feast table at a moment is cleared away: as the meal's hours after the ones it came in end.
create or replace function town.feast_ends(p_from bigint)
returns bigint language sql stable as $$ select town.next_meal_at(town.next_meal_at(p_from)) $$;

-- Where a pot is at a moment, and until when (lib/town/cooking's potNow): on the ground for its hour, then on the
-- table as if set there as that hour ended (never the odd dish), nowhere (null) once the table is cleared of it.
create or replace function town.pot_now(p_feast boolean, p_dish text, p_set bigint, p_now bigint)
returns jsonb language plpgsql stable as $$
declare
  ck jsonb := town.cat('cooking');
  moved bigint;
begin
  if p_feast then
    if p_now < town.feast_ends(p_set) then return jsonb_build_object('feast', true, 'from', p_set, 'until', town.feast_ends(p_set)); end if;
    return null;
  end if;
  moved := p_set + (ck->'feast'->>'ground')::bigint * 60000;
  if p_now < moved then return jsonb_build_object('feast', false, 'from', p_set, 'until', moved); end if;
  if p_dish <> ck->>'oddDish' and p_now < town.feast_ends(moved) then return jsonb_build_object('feast', true, 'from', moved, 'until', town.feast_ends(moved)); end if;
  return null;
end;
$$;

-- Whether a tile is of the cooking yard's floor.
create or replace function town.on_yard(p_x integer, p_y integer)
returns boolean language sql stable as $$
  select p_x is not null and p_y is not null
     and exists (select 1 from jsonb_array_elements(town.cat('cooking')->'feast'->'floor') f where (f->>0)::int = p_x and (f->>1)::int = p_y)
$$;

-- The pots as they stand at a moment (lib/town/cooking's tidied): those whose time is up are gone, each written
-- down in its cook's name; those whose hour on the ground is up are on the table, said to stand on its tile.
create or replace function town.pots_tidy(p_now bigint)
returns void language plpgsql set search_path = public as $$
declare
  ck jsonb := town.cat('cooking');
  tile jsonb := ck->'feast'->'tile';
  ground bigint := (ck->'feast'->>'ground')::bigint * 60000;
  o record;
begin
  for o in delete from public.town_pots p where town.pot_now(p.feast, p.dish, p.set_at, p_now) is null
           returning p.id, p.member_id, p.dish, p.helpings, p.feast loop
    perform town.note(o.member_id, 'pot_gone', o.dish, o.helpings, 0,
      jsonb_build_object('pot', o.id, 'from', case when o.feast then 'table' else 'ground' end));
  end loop;
  update public.town_pots p set feast = true, tok = false, set_at = p.set_at + ground, x = (tile->>0)::smallint, y = (tile->>1)::smallint
   where not p.feast and p_now >= p.set_at + ground;
end;
$$;

-- A pot as a page is told of it: with the moment it came to where it is, whether that is the feast table, and what
-- its cook is called.
create or replace function town.pot_doc(p_id bigint)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('id', o.id::text, 'by', o.member_id, 'dish', o.dish, 'left', o.helpings, 'at', jsonb_build_array(o.x, o.y), 'set', o.set_at,
             'name', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = o.member_id), ''))
           || case when o.tok then '{"tok": true}'::jsonb else '{}'::jsonb end
           || case when o.feast then '{"feast": true}'::jsonb else '{}'::jsonb end
    from public.town_pots o where o.id = p_id
$$;

-- Whether somebody standing on a tile reaches a pot (lib/town/cooking's reaches): beside it, for one on the ground;
-- anywhere on the yard's floor, for one on the feast table.
create or replace function town.reaches(p_pot jsonb, p_x integer, p_y integer)
returns boolean language sql stable as $$
  select p_x is not null and p_y is not null
     and case when coalesce((p_pot->>'feast')::boolean, false) then town.on_yard(p_x, p_y)
              else sqrt(((p_pot->'at'->>0)::double precision - p_x) ^ 2 + ((p_pot->'at'->>1)::double precision - p_y) ^ 2)
                   <= (case when coalesce((p_pot->>'tok')::boolean, false) then c.k->>'tok' else c.k->>'reach' end)::double precision end
    from (select town.cat('cooking') as k) c
$$;

-- A helping eaten at the feast table out of one of the table's own bowls (lib/town/cooking's feastEat): for
-- somebody sitting down who may begin a helping now; begun at once, never in the bag, and marked `lent`.
create or replace function town.feast_eat(p_purse jsonb, p_pot jsonb, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable as $$
declare
  left_ numeric := (p_pot->>'left')::numeric;
  meal jsonb;
begin
  if not coalesce((p_pot->>'feast')::boolean, false) or left_ < 1 then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (town.bowls_today(p_purse, p_now)->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  meal := town.begun(p_purse, p_pot->>'dish', p_now);
  return jsonb_build_object('ok', true, 'dish', p_pot->'dish',
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || meal || jsonb_build_object('eating', (meal->'eating') || '{"lent": true}'::jsonb));
end;
$$;

-- ─── Written again, each as it last ran but for the lines meant ────────────

-- <town.chew>
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$$;
-- </town.chew>

-- <town.get_up>
create or replace function town.get_up(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  counted jsonb;
  up jsonb;
begin
  if coalesce(p_purse->'eating', 'null'::jsonb) = 'null'::jsonb then return p_purse; end if;
  counted := town.chew(p_purse, p_company, p_now)->'purse';
  up := counted || jsonb_build_object('eating', 'null'::jsonb,
    'buff', case when counted->'eating' <> 'null'::jsonb then coalesce(p_purse->'buff', 'null'::jsonb) else counted->'buff' end);
  -- (a meal that ran out as it was counted gave its bowl back already)
  if counted->'eating' <> 'null'::jsonb and town.cat('cooking')->'bowled' ? (p_purse->'eating'->>'dish')
     and not coalesce((p_purse->'eating'->>'lent')::boolean, false) then return town.bowls_back(up, 1); end if;
  return up;
end;
$$;
-- </town.get_up>

-- <public.town_kitchen>
create or replace function public.town_kitchen()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
begin
  -- (an hour on the ground is up, the table is cleared: before anybody is told what stands where)
  perform town.pots_tidy(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'pots', (select coalesce(jsonb_agg(town.pot_doc(o.id) order by o.id), '[]'::jsonb) from public.town_pots o),
    'feast', (town.cat('cooking')->'feast') - 'floor',
    'found', town.thing('found', false),
    'finders', (select coalesce(jsonb_object_agg(f.key, f.value->'name'), '{}'::jsonb) from jsonb_each(town.thing('finders', false)) f));
end;
$$;
-- </public.town_kitchen>

-- <public.town_pot_down>
create or replace function public.town_pot_down(p_x integer, p_y integer, p_slot integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
  feast_ boolean;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  perform town.pots_tidy(town.now_ms());
  -- (the pot in the slot that is said; with none said, the first pot of food the bag has, as it was before v158)
  if p_slot is not null then slot := p_slot;
  else select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1; end if;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (a dish set down in the cooking yard is on the feast table; the odd dish, and anything set down elsewhere, on the ground)
  feast_ := town.on_yard(p_x, p_y) and did->'pot'->>'dish' <> ck->>'oddDish';
  if not feast_ and exists (select 1 from public.town_pots o where not o.feast and abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me and o.feast = feast_)
     >= (case when feast_ then ck->'feast'->>'pots' else ck->>'pots' end)::int then return town.answer(me, town.no('many')); end if;
  -- (on the ground, one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at, feast)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int,
            case when feast_ then (ck->'feast'->'tile'->>0)::int else p_x end, case when feast_ then (ck->'feast'->'tile'->>1)::int else p_y end,
            not feast_ and coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms(), feast_)
    on conflict (x, y) where not feast do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_down', did->'pot'->>'dish', (did->'pot'->>'left')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id) || case when feast_ then '{"feast": true}'::jsonb else '{}'::jsonb end);
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$$;
-- </public.town_pot_down>

-- <public.town_pot_ladle>
create or replace function public.town_pot_ladle(p_id bigint, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform town.pots_tidy(town.now_ms());
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.ladle(purse, pot);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'ladle', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id) || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  return town.answer(me, did) || jsonb_build_object('dish', pot->'dish');
end;
$$;
-- </public.town_pot_ladle>

-- <public.town_pot_take>
create or replace function public.town_pot_take(p_id bigint, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform town.pots_tidy(town.now_ms());
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.take_up(purse, pot, me::text);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  delete from public.town_pots o where o.id = p_id;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_take', pot->>'dish', (pot->>'left')::numeric, 0, jsonb_build_object('pot', p_id));
  return town.answer(me, did);
end;
$$;
-- </public.town_pot_take>

-- ─── The table's own bowl ──────────────────────────────────────────────────
-- Where the caller stands and that they are sitting are the page's word, as where anybody stands always is: the
-- tile is held to the yard's floor. The helping is written down as the two deeds it is: ladled (from whose pot, out
-- of the table's bowl) and eaten.
create or replace function public.town_feast_eat(p_id bigint, p_x integer, p_y integer, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform town.pots_tidy(town.now_ms());
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.feast_eat(purse, pot, p_seated, town.now_ms());
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'ladle', pot->>'dish', 1, 0,
    jsonb_build_object('pot', p_id, 'bowl', 'table') || case when pot->>'by' <> me::text then jsonb_build_object('whose', pot->>'by') else '{}'::jsonb end);
  perform town.note(me, 'eat', pot->>'dish', 1, 0, jsonb_build_object('pot', p_id, 'bowl', 'table'));
  return town.answer(me, did);
end;
$$;

-- The rules are no browser's to call; the table's bowl is a member's, and nobody's who is signed out.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_feast_eat(bigint, integer, integer, boolean) from public, anon;
grant execute on function public.town_feast_eat(bigint, integer, integer, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select p.oid::regprocedure as fn, has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'town_feast_eat';
--   -- town_feast_eat(bigint,integer,integer,boolean) | false | true
--
--   select town.cat('cooking')->>'pots' as ground, town.cat('cooking')->'feast'->>'pots' as on_table, town.cat('cooking')->'feast'->>'ground' as minutes,
--          town.cat('items')->'bowl'->>'stack' as bowls_to_a_slot;
--   -- 2 | 6 | 60 | 3
--
--   -- nothing of the odd dish is on the table, and no two pots on the ground share a tile
--   select (select count(*) from public.town_pots o where o.feast and o.dish = town.cat('cooking')->>'oddDish') as odd_on_table,
--          (select count(*) from (select 1 from public.town_pots o where not o.feast group by o.x, o.y having count(*) > 1) t) as shared_tiles;
--   -- 0 | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what stands where now: on the ground and on the table, how many pots and how many helpings
--   select o.feast as on_table, count(*) as pots, sum(o.helpings) as helpings, count(distinct o.member_id) as cooks
--     from public.town_pots o group by o.feast;
--
--   -- what was cleared away, by day: how many pots and helpings, off the ground (the odd dish) and off the table
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.doc->>'from' as off, count(*) as pots, sum(d.n) as helpings
--     from public.town_deeds d where d.what = 'pot_gone' group by 1, 2 order by 1 desc, 2;
--
--   -- helpings eaten at the table out of its own bowls, by day, against those ladled into a bowl of one's own
--   select (d.at at time zone 'Asia/Bangkok')::date as day, coalesce(d.doc->>'bowl', 'own') as bowl, count(*) as helpings, count(distinct d.member_id) as eaters
--     from public.town_deeds d where d.what = 'ladle' group by 1, 2 order by 1 desc, 2;
