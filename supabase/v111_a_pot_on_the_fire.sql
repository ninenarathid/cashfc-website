-- v111 — a pot on the fire
--
-- Run this once in the Supabase SQL editor, after v110. Running it again is
-- safe.
--
-- Nothing on the site uses this yet. It is the sixth of the migrations Cash
-- Town's game waits for, built as v106 says: the rules of lib/town/cooking.ts
-- and lib/town/scrolls.ts written again in SQL in the schema `town` and held
-- to the code's answers case by case, and seven functions in `public` for
-- the browser.
--
-- What it keeps: the pots of food that stand about (`town_pots`), who found
-- each recipe first, and, in a member's own purse, what they have made and
-- how often they have missed a recipe by its last thing alone.
--
-- What the database decides, and what it believes ("DB ตามที่คุณเสนอ ทุกอย่าง"):
--
--   · It decides what some things make. No recipe is ever told to a browser
--     by these functions: things are put together ("ทำอาหาร ต้องเลือก วัตถุดิบเอง
--     ไม่ใช่เลือกเป้นสูตร") and the answer is what came of them. The wrong things,
--     in cookware, are an odd dish, with the taste of how near they were
--     ("ยังต้องทำให้ ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้"); with bare hands they
--     are lost.
--   · It decides who found a recipe first, and under what name: the finder's
--     character's, read from their profile at that moment.
--   · It decides what each cook holds. The browser says who stands at the
--     yard's places with whoever begins the dish (that is the town's room's
--     to know, which is never stored); what is in each one's hand is read
--     from their own purse here, so cookware cannot be made up.
--   · It believes the browser about the stirring: each stir missed is a
--     helping lost, down to half, and the count of them is the browser's,
--     within bounds. Every go is written down in `town_plays`.
--   · It believes the browser about where a member stands when a pot is set
--     down, ladled from or taken up: the tile has to be on the map, and near
--     enough to the pot.
--
-- The bowls (the owner, 2026-10-04: "ตอนตักใส่ถ้วย ถ้วยต้องหายไปด้วย ต้องกินหมดก่อน
-- ถ้วยค่อยกลับมา หม้อสกปรก ตัดออกเลย พอตักครบออกหายออกจากพื้นไปเลย"): a helping is ladled
-- into a bowl, which leaves the bag with it and is back when the meal ends;
-- a pot whose last helping is out is gone, and there is no dirty pot and no
-- washing up. So three of v107's functions are written again here (a meal's
-- end gives its bowl back; a bag with no room for it is owed it, and has it
-- as soon as there is room), and five rows of the catalog are written over:
-- the dirty pot and the four things that were only for washing it are no
-- longer things, the uncle no longer sells them, asks for them or hints at
-- them, and a pot to cook in fetches something again, since nothing makes
-- one any more.

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v111> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('makes', $town${
    "fishSauce": {"needs":[["minnow",4],["salt",2]],"in":["pot"],"gives":2},
    "compost": {"needs":[["hyacinth",3]],"in":[],"gives":2},
    "growFert": {"needs":[["compost",2],["minnow",2]],"in":[],"gives":2},
    "guardFert": {"needs":[["compost",2],["chili",2],["garlic",1]],"in":[],"gives":2},
    "pestCure": {"needs":[["chili",2],["garlic",2],["basil",1]],"in":["pot"],"gives":2},
    "basket": {"needs":[["hyacinth",6]],"in":[],"gives":1},
    "driedFish": {"needs":[["barb",2],["salt",1]],"in":["grill"],"gives":2},
    "saltedFish": {"needs":[["tilapia",1],["salt",3]],"in":["jar"],"gives":2},
    "curryPaste": {"needs":[["chili",3],["garlic",2],["lemongrass",1],["galangal",1]],"in":["mortar"],"gives":2},
    "pickle": {"needs":[["cabbage",1],["salt",2]],"in":["jar"],"gives":2},
    "charcoal": {"needs":[["driftwood",2]],"in":["grill"],"gives":4},
    "rope": {"needs":[["hyacinth",4]],"in":[],"gives":1},
    "krabung": {"needs":[["hyacinth",8],["rope",1]],"in":[],"gives":1},
    "noodle": {"needs":[["flour",2],["egg",1]],"in":["rollingPin"],"gives":3},
    "coconutMilk": {"needs":[["coconut",1]],"in":["mortar"],"gives":2},
    "fermentedFish": {"needs":[["gourami",2],["salt",2],["toastedRice",1]],"in":["jar"],"gives":2},
    "shrimpPaste": {"needs":[["shrimpLive",5],["salt",2]],"in":["jar"],"gives":1},
    "driedChili": {"needs":[["chili",4]],"in":["grill"],"gives":3},
    "riceNoodle": {"needs":[["flour",2]],"in":["pot"],"gives":3},
    "toastedRice": {"needs":[["rice",2]],"in":["wok"],"gives":2},
    "yoke": {"needs":[["driftwood",2],["rope",2],["basket",2]],"in":[],"gives":1}
  }$town$::jsonb),
  ('cooking', $town${
    "cost": 4,
    "stirs": 2,
    "kinds": 8,
    "ladle": 1,
    "pots": 6,
    "reach": 1.8,
    "tok": 3.2,
    "odd": {"per":2,"most":4},
    "oddDish": "oddDish",
    "clue": 3,
    "recipes": ["friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishSauce","compost","growFert","guardFert","pestCure","basket","driedFish","saltedFish","curryPaste","pickle","charcoal","rope","krabung","noodle","coconutMilk","fermentedFish","shrimpPaste","driedChili","riceNoodle","toastedRice","yoke"],
    "needs": {"friedMinnow":{"minnow":3,"salt":1},"grilledFish":{"salt":2,"tilapia":1},"grilledCorn":{"corn":2},"roastSweetPotato":{"sweetPotato":2},"stirKangkong":{"chili":1,"garlic":1,"kangkong":3},"basilCatfish":{"basil":2,"catfish":1,"chili":1,"garlic":1,"rice":2},"tomYum":{"chili":2,"scallion":1,"snakehead":1,"tomato":2},"sourCurry":{"barb":2,"cabbage":1,"chili":1,"daikon":1},"friedPerch":{"garlic":2,"perch":2,"salt":1},"fishCake":{"basil":1,"chili":1,"featherback":1,"salt":1},"spicyEel":{"basil":2,"chili":2,"eel":1,"garlic":1},"grilledPrawn":{"prawn":2,"salt":1},"steamedGoby":{"fishSauce":1,"goby":1,"scallion":2},"pumpkinSoup":{"pumpkin":1,"salt":1,"scallion":1},"shabu":{"cabbage":1,"carrot":2,"corn":1,"daikon":1,"pangasius":1,"prawn":2,"scallion":2},"somTam":{"chili":2,"lime":1,"longBean":1,"papaya":1,"sugar":1,"tomato":1},"grilledEggplant":{"eggplant":2,"fishSauce":1},"tomKha":{"chili":1,"galangal":1,"lemongrass":1,"lime":1,"sheatfish":1},"friedGourami":{"gourami":2,"oil":1,"salt":1},"crabCurry":{"crab":3,"curryPaste":1,"eggplant":1,"longBean":1},"steamedSheatfish":{"chili":1,"garlic":1,"lime":2,"sheatfish":1},"friedFrog":{"frog":2,"garlic":2,"oil":1},"laab":{"bagrid":1,"chili":1,"lime":1,"rice":1,"scallion":1},"omelette":{"egg":2,"oil":1},"snailCurry":{"curryPaste":1,"lemongrass":1,"snail":6},"candiedPumpkin":{"pumpkin":1,"sugar":2},"friedRice":{"egg":1,"oil":1,"rice":3,"scallion":1},"greenCurry":{"basil":1,"coconutMilk":1,"curryPaste":1,"eggplant":2,"featherback":1},"khanomJeen":{"coconutMilk":1,"croaker":1,"curryPaste":1,"longBean":1,"riceNoodle":3},"hoMok":{"bananaLeaf":2,"basil":1,"blackEar":1,"coconutMilk":1,"curryPaste":1},"mangoStickyRice":{"coconutMilk":1,"mango":2,"stickyRice":2,"sugar":1},"bananaInCoconut":{"banana":3,"coconutMilk":1,"sugar":1},"taroPudding":{"coconutMilk":1,"flour":1,"sugar":1,"taro":1},"steamedCroaker":{"croaker":1,"ginger":1,"scallion":1,"soy":1},"gingerFish":{"blackEar":1,"ginger":2,"oil":1,"soy":1},"turmericFish":{"garlic":2,"oil":1,"spinyEel":2,"turmeric":1},"jungleCurry":{"curryPaste":1,"eggplant":1,"galangal":1,"giantSnakehead":1,"lemongrass":1,"longBean":1},"megaLaab":{"chili":3,"lime":3,"megaCatfish":1,"scallion":2,"toastedRice":1},"watermelonSlices":{"watermelon":1},"khantoke":{"coconutMilk":1,"cucumber":2,"curryPaste":1,"goldenCarp":1,"longBean":2,"pepper":1,"stickyRice":3},"naamPrik":{"chili":3,"cucumber":1,"fermentedFish":1,"garlic":1,"lime":1},"sushi":{"rice":2,"seaweed":1,"sugar":1,"tilapia":1},"ramen":{"driedFish":1,"egg":1,"noodle":2,"scallion":1,"soy":1},"tempura":{"egg":1,"flour":1,"oil":1,"prawn":2},"unadon":{"eel":1,"rice":2,"soy":1,"sugar":1},"okonomiyaki":{"cabbage":1,"egg":1,"flour":1,"prawn":1,"scallion":1},"kimchi":{"cabbage":2,"chili":2,"fishSauce":1,"garlic":1},"bibimbap":{"carrot":1,"chili":1,"cucumber":1,"egg":1,"kangkong":1,"rice":2},"tteokbokki":{"chili":2,"scallion":1,"stickyRice":2,"sugar":1},"kimbap":{"carrot":1,"cucumber":1,"egg":1,"rice":2,"seaweed":1},"pajeon":{"egg":1,"flour":1,"oil":1,"scallion":3},"harGow":{"flour":2,"prawn":2,"scallion":1},"chowMein":{"cabbage":1,"carrot":1,"noodle":2,"oil":1,"soy":1},"springRoll":{"cabbage":1,"carrot":1,"flour":1,"oil":1},"congee":{"egg":1,"perch":1,"rice":2,"scallion":1},"mapoTofu":{"chili":2,"garlic":1,"scallion":1,"soy":1,"tofu":2},"pizza":{"basil":1,"cheese":1,"flour":2,"tomato":2},"spaghetti":{"garlic":1,"noodle":2,"oil":1,"prawn":1,"tomato":2},"risotto":{"cheese":1,"garlic":1,"pumpkin":1,"rice":2},"lasagna":{"cheese":2,"eggplant":1,"noodle":2,"tomato":2},"minestrone":{"cabbage":1,"carrot":1,"longBean":1,"noodle":1,"tomato":2},"fishCurry":{"catfish":1,"chili":2,"coconutMilk":1,"ginger":1,"turmeric":1},"naan":{"flour":2,"garlic":1,"milk":1},"biryani":{"milk":1,"pangasius":1,"pepper":1,"rice":3,"turmeric":1},"samosa":{"chili":1,"flour":1,"oil":1,"sweetPotato":1},"lassi":{"mango":1,"milk":1,"sugar":1},"fishSauce":{"minnow":4,"salt":2},"compost":{"hyacinth":3},"growFert":{"compost":2,"minnow":2},"guardFert":{"chili":2,"compost":2,"garlic":1},"pestCure":{"basil":1,"chili":2,"garlic":2},"basket":{"hyacinth":6},"driedFish":{"barb":2,"salt":1},"saltedFish":{"salt":3,"tilapia":1},"curryPaste":{"chili":3,"galangal":1,"garlic":2,"lemongrass":1},"pickle":{"cabbage":1,"salt":2},"charcoal":{"driftwood":2},"rope":{"hyacinth":4},"krabung":{"hyacinth":8,"rope":1},"noodle":{"egg":1,"flour":2},"coconutMilk":{"coconut":1},"fermentedFish":{"gourami":2,"salt":2,"toastedRice":1},"shrimpPaste":{"salt":2,"shrimpLive":5},"driedChili":{"chili":4},"riceNoodle":{"flour":2},"toastedRice":{"rice":2},"yoke":{"basket":2,"driftwood":2,"rope":2}},
    "cookware": ["pan","grill","pot","mortar","wok","steamer","cleaver","steamerBamboo","panBrass","potBrass","hotpot","sushiMat","jar","stoneBowl","rollingPin","oven"],
    "gear": {"wok":1.25,"potBrass":1.5,"panBrass":1.5,"stoveBig":1.25},
    "never": ["tool","scroll","dish"],
    "bowl": "bowl",
    "bowled": ["oddDish","friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi"],
    "inside": {"boot":{"chance":0.35,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu"]},"bottle":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa"]},"chest":{"chance":1,"scrolls":["scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollKhanomJeen","scrollMangoStickyRice","scrollBananaInCoconut","scrollTaroPudding","scrollSteamedCroaker","scrollGingerFish","scrollTurmericFish","scrollJungleCurry","scrollMegaLaab","scrollWatermelonSlices","scrollKhantoke","scrollNaamPrik","scrollRamen","scrollUnadon","scrollTteokbokki","scrollChowMein","scrollMapoTofu","scrollPizza","scrollRisotto","scrollLasagna","scrollFishCurry","scrollNaan","scrollBiryani","scrollLassi"]}},
    "map": {"town":[64,64],"farm":[128,0,60,44]},
    "misses": 30
  }$town$::jsonb)
  on conflict (key) do nothing;
insert into public.town_catalog (key, data) values
  ('items', $town${
    "rod": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "hoe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "can": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "pot": {"kind":"tool","tier":1,"stack":1,"pays":40},
    "pan": {"kind":"tool","tier":1,"stack":1,"pays":35},
    "grill": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "potFull": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "bucket": {"kind":"tool","tier":1,"stack":1,"pays":8},
    "worm": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "dough": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "rice": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "salt": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "seedKangkong": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedScallion": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedCabbage": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedCarrot": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedDaikon": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedCorn": {"kind":"seed","tier":1,"stack":10,"pays":6},
    "seedChili": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedTomato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedBasil": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedSweetPotato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedGarlic": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedPumpkin": {"kind":"seed","tier":1,"stack":10,"pays":12},
    "kangkong": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "scallion": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "cabbage": {"kind":"crop","tier":1,"stack":10,"pays":20},
    "carrot": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "daikon": {"kind":"crop","tier":1,"stack":10,"pays":18},
    "corn": {"kind":"crop","tier":1,"stack":20,"pays":14},
    "chili": {"kind":"crop","tier":1,"stack":20,"pays":5},
    "tomato": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "basil": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "sweetPotato": {"kind":"crop","tier":1,"stack":20,"pays":12},
    "garlic": {"kind":"crop","tier":1,"stack":20,"pays":10},
    "pumpkin": {"kind":"crop","tier":1,"stack":5,"pays":110},
    "minnow": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "barb": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "tilapia": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "perch": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "catfish": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "pangasius": {"kind":"fish","tier":1,"stack":5,"pays":22},
    "snakehead": {"kind":"fish","tier":1,"stack":5,"pays":30},
    "eel": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "prawn": {"kind":"fish","tier":1,"stack":10,"pays":35},
    "featherback": {"kind":"fish","tier":1,"stack":5,"pays":40},
    "goby": {"kind":"fish","tier":1,"stack":5,"pays":60},
    "koi": {"kind":"fish","tier":1,"stack":1,"pays":300},
    "hyacinth": {"kind":"catch","tier":1,"stack":20,"pays":2},
    "boot": {"kind":"catch","tier":1,"stack":5,"pays":0},
    "fishSauce": {"kind":"goods","tier":1,"stack":10,"pays":12},
    "compost": {"kind":"goods","tier":1,"stack":20,"pays":4},
    "growFert": {"kind":"goods","tier":1,"stack":20,"pays":10},
    "guardFert": {"kind":"goods","tier":1,"stack":20,"pays":12},
    "pestCure": {"kind":"goods","tier":1,"stack":10,"pays":10},
    "basket": {"kind":"goods","tier":1,"stack":1,"pays":0},
    "riceBox": {"kind":"dish","tier":1,"stack":5,"pays":3},
    "oddDish": {"kind":"dish","tier":1,"stack":5,"pays":0},
    "friedMinnow": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "grilledFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "grilledCorn": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "roastSweetPotato": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "stirKangkong": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "basilCatfish": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "tomYum": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "sourCurry": {"kind":"dish","tier":1,"stack":5,"pays":20},
    "friedPerch": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "fishCake": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "spicyEel": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "grilledPrawn": {"kind":"dish","tier":1,"stack":5,"pays":44},
    "steamedGoby": {"kind":"dish","tier":1,"stack":5,"pays":38},
    "pumpkinSoup": {"kind":"dish","tier":1,"stack":5,"pays":30},
    "shabu": {"kind":"dish","tier":1,"stack":10,"pays":30},
    "scrollFriedMinnow": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledFish": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledCorn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastSweetPotato": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollStirKangkong": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBasilCatfish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTomYum": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSourCurry": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFriedPerch": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishCake": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSpicyEel": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGrilledPrawn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSteamedGoby": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPumpkinSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollShabu": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "rodTeak": {"kind":"tool","tier":2,"stack":1,"pays":90},
    "floatQuill": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "hookSteel": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "lineBraid": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "netSmall": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "hoeIron": {"kind":"tool","tier":2,"stack":1,"pays":75},
    "canCopper": {"kind":"tool","tier":2,"stack":1,"pays":60},
    "sickle": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "krabung": {"kind":"tool","tier":2,"stack":1,"pays":0},
    "mortar": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "steamer": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "cleaver": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "jar": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "wok": {"kind":"tool","tier":2,"stack":1,"pays":80},
    "rollingPin": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "sushiMat": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "stoneBowl": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "bowl": {"kind":"tool","tier":1,"stack":1,"pays":3},
    "bucketIron": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "apron": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "cricket": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "branBait": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "shrimpLive": {"kind":"bait","tier":2,"stack":20,"pays":3},
    "sugar": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "oil": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tamarind": {"kind":"staple","tier":2,"stack":20,"pays":2},
    "egg": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "flour": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seaweed": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tofu": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seedEggplant": {"kind":"seed","tier":2,"stack":10,"pays":8},
    "seedCucumber": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLongBean": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLemongrass": {"kind":"seed","tier":2,"stack":10,"pays":9},
    "seedGalangal": {"kind":"seed","tier":2,"stack":10,"pays":12},
    "seedLime": {"kind":"seed","tier":2,"stack":5,"pays":30},
    "seedPapaya": {"kind":"seed","tier":2,"stack":10,"pays":14},
    "eggplant": {"kind":"crop","tier":2,"stack":20,"pays":14},
    "cucumber": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "longBean": {"kind":"crop","tier":2,"stack":20,"pays":9},
    "lemongrass": {"kind":"crop","tier":2,"stack":20,"pays":12},
    "galangal": {"kind":"crop","tier":2,"stack":20,"pays":22},
    "lime": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "papaya": {"kind":"crop","tier":2,"stack":10,"pays":26},
    "gourami": {"kind":"fish","tier":2,"stack":10,"pays":12},
    "crab": {"kind":"fish","tier":2,"stack":10,"pays":10},
    "snail": {"kind":"fish","tier":2,"stack":20,"pays":2},
    "hampala": {"kind":"fish","tier":2,"stack":5,"pays":34},
    "sheatfish": {"kind":"fish","tier":2,"stack":5,"pays":42},
    "bagrid": {"kind":"fish","tier":2,"stack":5,"pays":36},
    "giantGourami": {"kind":"fish","tier":2,"stack":5,"pays":44},
    "frog": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "tigerfish": {"kind":"fish","tier":2,"stack":5,"pays":90},
    "wallago": {"kind":"fish","tier":2,"stack":5,"pays":110},
    "driftwood": {"kind":"catch","tier":2,"stack":10,"pays":3},
    "bottle": {"kind":"catch","tier":2,"stack":10,"pays":2},
    "driedFish": {"kind":"goods","tier":2,"stack":10,"pays":14},
    "saltedFish": {"kind":"goods","tier":2,"stack":10,"pays":18},
    "curryPaste": {"kind":"goods","tier":2,"stack":10,"pays":20},
    "pickle": {"kind":"goods","tier":2,"stack":10,"pays":16},
    "charcoal": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "rope": {"kind":"goods","tier":2,"stack":10,"pays":8},
    "manure": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "noodle": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "somTam": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "grilledEggplant": {"kind":"dish","tier":2,"stack":5,"pays":20},
    "tomKha": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "friedGourami": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "crabCurry": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "steamedSheatfish": {"kind":"dish","tier":2,"stack":5,"pays":46},
    "friedFrog": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "laab": {"kind":"dish","tier":2,"stack":5,"pays":42},
    "omelette": {"kind":"dish","tier":2,"stack":5,"pays":14},
    "snailCurry": {"kind":"dish","tier":2,"stack":5,"pays":36},
    "candiedPumpkin": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "friedRice": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "sushi": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "tempura": {"kind":"dish","tier":2,"stack":5,"pays":32},
    "okonomiyaki": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "kimchi": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "bibimbap": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "kimbap": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "pajeon": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "harGow": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "springRoll": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "congee": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "spaghetti": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "minestrone": {"kind":"dish","tier":2,"stack":5,"pays":28},
    "samosa": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "scrollSomTam": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollGrilledEggplant": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTomKha": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedGourami": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCrabCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSteamedSheatfish": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedFrog": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollLaab": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSnailCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCandiedPumpkin": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedRice": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSushi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTempura": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollOkonomiyaki": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimchi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollBibimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollPajeon": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollHarGow": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpringRoll": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCongee": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpaghetti": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMinestrone": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSamosa": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "rodMaster": {"kind":"tool","tier":3,"stack":1,"pays":220},
    "floatBell": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "hookTwin": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "lineSilk": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "netLong": {"kind":"tool","tier":3,"stack":1,"pays":100},
    "hoeSteel": {"kind":"tool","tier":3,"stack":1,"pays":160},
    "canBrass": {"kind":"tool","tier":3,"stack":1,"pays":140},
    "shears": {"kind":"tool","tier":3,"stack":1,"pays":110},
    "yoke": {"kind":"tool","tier":3,"stack":1,"pays":0},
    "potBrass": {"kind":"tool","tier":3,"stack":1,"pays":180},
    "stoveBig": {"kind":"tool","tier":3,"stack":1,"pays":150},
    "panBrass": {"kind":"tool","tier":3,"stack":1,"pays":170},
    "steamerBamboo": {"kind":"tool","tier":3,"stack":1,"pays":130},
    "hotpot": {"kind":"tool","tier":3,"stack":1,"pays":200},
    "oven": {"kind":"tool","tier":3,"stack":1,"pays":240},
    "ladle": {"kind":"tool","tier":3,"stack":1,"pays":20},
    "tok": {"kind":"tool","tier":3,"stack":1,"pays":60},
    "antEggs": {"kind":"bait","tier":3,"stack":20,"pays":6},
    "lure": {"kind":"bait","tier":3,"stack":5,"pays":30},
    "fermentedBait": {"kind":"bait","tier":3,"stack":20,"pays":5},
    "stickyRice": {"kind":"staple","tier":3,"stack":20,"pays":3},
    "soy": {"kind":"staple","tier":3,"stack":20,"pays":5},
    "pepper": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "cheese": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "milk": {"kind":"staple","tier":3,"stack":20,"pays":4},
    "seedMango": {"kind":"seed","tier":3,"stack":5,"pays":40},
    "seedBanana": {"kind":"seed","tier":3,"stack":5,"pays":25},
    "seedCoconut": {"kind":"seed","tier":3,"stack":5,"pays":45},
    "seedGinger": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTurmeric": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTaro": {"kind":"seed","tier":3,"stack":10,"pays":18},
    "seedWatermelon": {"kind":"seed","tier":3,"stack":10,"pays":20},
    "mango": {"kind":"crop","tier":3,"stack":20,"pays":30},
    "banana": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "coconut": {"kind":"crop","tier":3,"stack":10,"pays":34},
    "ginger": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "turmeric": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "taro": {"kind":"crop","tier":3,"stack":10,"pays":30},
    "watermelon": {"kind":"crop","tier":3,"stack":5,"pays":60},
    "croaker": {"kind":"fish","tier":3,"stack":5,"pays":70},
    "blackEar": {"kind":"fish","tier":3,"stack":5,"pays":80},
    "spinyEel": {"kind":"fish","tier":3,"stack":5,"pays":60},
    "puffer": {"kind":"fish","tier":3,"stack":10,"pays":25},
    "goldenCarp": {"kind":"fish","tier":3,"stack":5,"pays":180},
    "giantSnakehead": {"kind":"fish","tier":3,"stack":5,"pays":200},
    "royalFeatherback": {"kind":"fish","tier":3,"stack":5,"pays":190},
    "arowana": {"kind":"fish","tier":3,"stack":1,"pays":600},
    "stingray": {"kind":"fish","tier":3,"stack":1,"pays":700},
    "megaCatfish": {"kind":"fish","tier":3,"stack":1,"pays":800},
    "pearl": {"kind":"catch","tier":3,"stack":10,"pays":150},
    "chest": {"kind":"catch","tier":3,"stack":1,"pays":0},
    "coconutMilk": {"kind":"goods","tier":3,"stack":10,"pays":22},
    "fermentedFish": {"kind":"goods","tier":3,"stack":10,"pays":26},
    "shrimpPaste": {"kind":"goods","tier":3,"stack":10,"pays":28},
    "driedChili": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "riceNoodle": {"kind":"goods","tier":3,"stack":10,"pays":18},
    "bananaLeaf": {"kind":"goods","tier":3,"stack":20,"pays":2},
    "toastedRice": {"kind":"goods","tier":3,"stack":10,"pays":10},
    "greenCurry": {"kind":"dish","tier":3,"stack":5,"pays":60},
    "khanomJeen": {"kind":"dish","tier":3,"stack":5,"pays":70},
    "hoMok": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "mangoStickyRice": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "bananaInCoconut": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "taroPudding": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "steamedCroaker": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "gingerFish": {"kind":"dish","tier":3,"stack":5,"pays":54},
    "turmericFish": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "jungleCurry": {"kind":"dish","tier":3,"stack":5,"pays":66},
    "megaLaab": {"kind":"dish","tier":3,"stack":20,"pays":90},
    "watermelonSlices": {"kind":"dish","tier":3,"stack":10,"pays":20},
    "khantoke": {"kind":"dish","tier":3,"stack":20,"pays":120},
    "naamPrik": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "ramen": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "unadon": {"kind":"dish","tier":3,"stack":5,"pays":48},
    "tteokbokki": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "chowMein": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "mapoTofu": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "pizza": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "risotto": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "lasagna": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "fishCurry": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "naan": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "biryani": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "lassi": {"kind":"dish","tier":3,"stack":5,"pays":24},
    "scrollGreenCurry": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollHoMok": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollKhanomJeen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMangoStickyRice": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBananaInCoconut": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTaroPudding": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollSteamedCroaker": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollGingerFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTurmericFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollJungleCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMegaLaab": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollWatermelonSlices": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollKhantoke": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaamPrik": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRamen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollUnadon": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTteokbokki": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollChowMein": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMapoTofu": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollPizza": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRisotto": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLasagna": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollFishCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaan": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBiryani": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35}
  }$town$::jsonb),
  ('goods', $town${
    "rod": {"price":60,"stock":6,"each":1},
    "hoe": {"price":50,"stock":6,"each":1},
    "can": {"price":40,"stock":6,"each":1},
    "pot": {"price":80,"stock":4,"each":1},
    "pan": {"price":70,"stock":4,"each":1},
    "grill": {"price":60,"stock":4,"each":1},
    "worm": {"price":2,"stock":120,"each":10},
    "dough": {"price":3,"stock":80,"each":10},
    "rice": {"price":3,"stock":100,"each":10},
    "salt": {"price":2,"stock":100,"each":10},
    "riceBox": {"price":6,"stock":40,"each":3},
    "seedKangkong": {"price":4,"stock":100,"each":8},
    "seedScallion": {"price":5,"stock":100,"each":8},
    "seedCabbage": {"price":8,"stock":60,"each":6},
    "seedCarrot": {"price":8,"stock":60,"each":6},
    "seedChili": {"price":10,"stock":40,"each":4},
    "seedPumpkin": {"price":25,"stock":20,"each":2},
    "scrollFriedMinnow": {"price":40,"stock":3,"each":1},
    "scrollGrilledFish": {"price":40,"stock":3,"each":1},
    "bowl": {"price":5,"stock":60,"each":5},
    "bucket": {"price":20,"stock":30,"each":4},
    "bucketIron": {"price":70,"stock":6,"each":1},
    "apron": {"price":120,"stock":4,"each":1},
    "seedDaikon": {"price":10,"stock":40,"each":4},
    "seedCorn": {"price":12,"stock":40,"each":4},
    "seedTomato": {"price":14,"stock":40,"each":4},
    "seedBasil": {"price":8,"stock":40,"each":4},
    "seedSweetPotato": {"price":14,"stock":40,"each":4},
    "seedGarlic": {"price":10,"stock":40,"each":4},
    "rodTeak": {"price":240,"stock":3,"each":1},
    "floatQuill": {"price":90,"stock":4,"each":1},
    "hookSteel": {"price":90,"stock":4,"each":1},
    "lineBraid": {"price":90,"stock":4,"each":1},
    "netSmall": {"price":110,"stock":4,"each":1},
    "hoeIron": {"price":180,"stock":4,"each":1},
    "canCopper": {"price":150,"stock":4,"each":1},
    "sickle": {"price":120,"stock":4,"each":1},
    "krabung": {"price":150,"stock":4,"each":1},
    "mortar": {"price":130,"stock":4,"each":1},
    "steamer": {"price":160,"stock":4,"each":1},
    "cleaver": {"price":130,"stock":4,"each":1},
    "jar": {"price":110,"stock":6,"each":2},
    "wok": {"price":190,"stock":4,"each":1},
    "cricket": {"price":4,"stock":80,"each":10},
    "branBait": {"price":4,"stock":80,"each":10},
    "shrimpLive": {"price":6,"stock":60,"each":10},
    "sugar": {"price":6,"stock":80,"each":10},
    "oil": {"price":6,"stock":80,"each":10},
    "tamarind": {"price":5,"stock":80,"each":10},
    "egg": {"price":6,"stock":60,"each":10},
    "manure": {"price":8,"stock":60,"each":10},
    "flour": {"price":7,"stock":80,"each":10},
    "seaweed": {"price":8,"stock":60,"each":10},
    "tofu": {"price":7,"stock":60,"each":10},
    "rollingPin": {"price":90,"stock":4,"each":1},
    "sushiMat": {"price":100,"stock":4,"each":1},
    "stoneBowl": {"price":140,"stock":4,"each":1},
    "seedEggplant": {"price":18,"stock":40,"each":4},
    "seedCucumber": {"price":16,"stock":40,"each":4},
    "seedLongBean": {"price":16,"stock":40,"each":4},
    "seedLemongrass": {"price":20,"stock":40,"each":4},
    "seedGalangal": {"price":26,"stock":30,"each":4},
    "seedLime": {"price":70,"stock":12,"each":2},
    "seedPapaya": {"price":32,"stock":20,"each":2},
    "scrollSomTam": {"price":90,"stock":3,"each":1},
    "scrollOmelette": {"price":60,"stock":3,"each":1},
    "rodMaster": {"price":600,"stock":2,"each":1},
    "floatBell": {"price":220,"stock":3,"each":1},
    "hookTwin": {"price":220,"stock":3,"each":1},
    "lineSilk": {"price":220,"stock":3,"each":1},
    "netLong": {"price":260,"stock":3,"each":1},
    "hoeSteel": {"price":420,"stock":3,"each":1},
    "canBrass": {"price":360,"stock":3,"each":1},
    "shears": {"price":280,"stock":3,"each":1},
    "yoke": {"price":300,"stock":3,"each":1},
    "potBrass": {"price":460,"stock":3,"each":1},
    "stoveBig": {"price":380,"stock":3,"each":1},
    "panBrass": {"price":440,"stock":3,"each":1},
    "steamerBamboo": {"price":330,"stock":3,"each":1},
    "hotpot": {"price":520,"stock":2,"each":1},
    "ladle": {"price":50,"stock":10,"each":1},
    "tok": {"price":150,"stock":6,"each":1},
    "antEggs": {"price":14,"stock":50,"each":10},
    "lure": {"price":70,"stock":10,"each":2},
    "fermentedBait": {"price":12,"stock":50,"each":10},
    "stickyRice": {"price":7,"stock":80,"each":10},
    "soy": {"price":12,"stock":60,"each":10},
    "pepper": {"price":14,"stock":60,"each":10},
    "bananaLeaf": {"price":5,"stock":80,"each":10},
    "cheese": {"price":16,"stock":50,"each":10},
    "milk": {"price":9,"stock":60,"each":10},
    "oven": {"price":480,"stock":2,"each":1},
    "seedMango": {"price":95,"stock":10,"each":2},
    "seedBanana": {"price":60,"stock":12,"each":2},
    "seedCoconut": {"price":110,"stock":8,"each":2},
    "seedGinger": {"price":38,"stock":30,"each":4},
    "seedTurmeric": {"price":38,"stock":30,"each":4},
    "seedTaro": {"price":42,"stock":30,"each":4},
    "seedWatermelon": {"price":46,"stock":20,"each":2},
    "scrollGreenCurry": {"price":160,"stock":2,"each":1},
    "scrollHoMok": {"price":160,"stock":2,"each":1}
  }$town$::jsonb),
  ('shelf', $town${
    "basic": ["rod","hoe","can","pot","pan","grill","worm","dough","rice","salt","riceBox","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedChili","seedPumpkin","scrollFriedMinnow","scrollGrilledFish","bowl","bucket"],
    "unlocks": ["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato","cricket","seedCucumber","oil","egg","scrollOmelette","flour","mortar","seedLongBean","sugar","rollingPin","seedEggplant","branBait","wok","seaweed","seedLemongrass","jar","sushiMat","seedGalangal","shrimpLive","steamer","tofu","seedLime","cleaver","stoneBowl","seedPapaya","scrollSomTam","tamarind","manure","floatQuill","hookSteel","lineBraid","netSmall","rodTeak","hoeIron","canCopper","sickle","krabung","bucketIron","apron","antEggs","seedGinger","soy","stickyRice","seedBanana","bananaLeaf","pepper","milk","seedTurmeric","seedTaro","fermentedBait","cheese","seedWatermelon","steamerBamboo","oven","seedCoconut","seedMango","lure","potBrass","panBrass","hotpot","stoveBig","ladle","tok","scrollGreenCurry","scrollHoMok","floatBell","hookTwin","lineSilk","netLong","rodMaster","hoeSteel","canBrass","shears","yoke"]
  }$town$::jsonb),
  ('order', $town${
    "n": {"fish":[4,8],"crop":[4,8],"made":[2,4]},
    "asks": {"fish":[["minnow",0],["barb",0],["tilapia",0],["perch",0],["catfish",0],["gourami",7],["crab",18],["snail",18]],"crop":[["kangkong",0],["scallion",0],["cabbage",0],["carrot",0],["daikon",5],["corn",4],["chili",0],["basil",2],["cucumber",8],["longBean",14]],"made":[["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["sourCurry",5],["friedGourami",19],["omelette",10],["friedRice",19],["sushi",29],["ramen",48],["bibimbap",30],["tteokbokki",49],["kimbap",23],["pajeon",12],["chowMein",48],["springRoll",19],["congee",10],["fishSauce",0],["compost",0],["growFert",0],["driedFish",7],["saltedFish",22],["pickle",22],["rope",7],["noodle",16],["fermentedFish",46],["shrimpPaste",46],["driedChili",46],["riceNoodle",46],["toastedRice",46]]}
  }$town$::jsonb),
  ('hints', $town${
    "price": {"1":15,"2":40,"3":90},
    "ids": [["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["roastSweetPotato",6],["stirKangkong",1],["basilCatfish",2],["tomYum",3],["sourCurry",5],["friedPerch",1],["fishCake",2],["spicyEel",2],["grilledPrawn",0],["steamedGoby",0],["pumpkinSoup",0],["shabu",5],["fishSauce",0],["compost",0],["growFert",0],["guardFert",1],["pestCure",2],["basket",0],["somTam",31],["grilledEggplant",17],["tomKha",28],["friedGourami",19],["crabCurry",24],["steamedSheatfish",28],["friedFrog",19],["laab",29],["omelette",10],["snailCurry",24],["candiedPumpkin",15],["friedRice",19],["sushi",29],["tempura",19],["okonomiyaki",12],["kimchi",22],["bibimbap",30],["kimbap",23],["pajeon",12],["harGow",26],["springRoll",19],["congee",10],["spaghetti",16],["minestrone",16],["samosa",19],["driedFish",0],["saltedFish",22],["curryPaste",24],["pickle",22],["charcoal",7],["rope",0],["krabung",0],["noodle",16],["greenCurry",61],["khanomJeen",61],["hoMok",61],["mangoStickyRice",62],["bananaInCoconut",61],["taroPudding",65],["steamedCroaker",48],["gingerFish",56],["turmericFish",54],["jungleCurry",64],["megaLaab",46],["watermelonSlices",58],["khantoke",66],["naamPrik",28],["ramen",48],["unadon",48],["tteokbokki",49],["chowMein",48],["mapoTofu",48],["pizza",60],["risotto",57],["lasagna",60],["fishCurry",61],["naan",60],["biryani",54],["lassi",62],["coconutMilk",61],["fermentedFish",22],["shrimpPaste",25],["driedChili",0],["riceNoodle",12],["toastedRice",19],["yoke",7]]
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v111>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A pot of food set down in the world. One to a tile.
create table if not exists public.town_pots (
  id        bigint generated always as identity primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  dish      text not null,
  helpings  integer not null check (helpings >= 1),
  x         smallint not null,
  y         smallint not null,
  tok       boolean not null default false,
  set_at    bigint not null,
  unique (x, y)
);

create index if not exists town_pots_member on public.town_pots (member_id);

alter table public.town_pots enable row level security;
revoke all on public.town_pots from anon, authenticated;

-- Who found each recipe first: a document, a thing to who (their id, what
-- they were called then, and when).
insert into public.town_things (key, doc) values ('finders', '{}'::jsonb)
  on conflict (key) do nothing;

/* ── a meal's bowl (v107's rules, written again) ─────────────────────────── */

-- lib/town/stamina.ts's bowlsBack(): the bowls a meal has done with, back in
-- the bag: `p_more` of them now, and any owed from before. One the bag has
-- no room for is owed until there is.
create or replace function town.bowls_back(p_purse jsonb, p_more integer)
returns jsonb language plpgsql stable
as $$
declare
  owed integer := coalesce((p_purse->>'owed')::int, 0) + coalesce(p_more, 0);
  bowl text;
  fits integer;
begin
  if owed = 0 then return p_purse; end if;
  bowl := town.cat('cooking')->>'bowl';
  fits := least(owed, town.room(p_purse->'bag', bowl));
  return (p_purse - 'owed')
    || jsonb_build_object('bag', case when fits > 0 then town.put(p_purse->'bag', bowl, fits) else p_purse->'bag' end)
    || case when owed > fits then jsonb_build_object('owed', owed - fits) else '{}'::jsonb end;
end;
$$;

-- chew(): count a meal on to now, with so many eating beside one; and, when
-- its time is up, its end: the dish's buff, and its bowl back in the bag
-- (what the uncle sells ready comes in none).
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end,
    'buff', case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb
      then jsonb_build_object('id', dish->>'buff', 'until', p_now + (st->>'hours')::bigint * 3600000)
      else coalesce(p_purse->'buff', 'null'::jsonb) end);
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));
end;
$$;

-- getUp(): what was eaten stays; the rest, and the buff, are forfeit. The
-- bowl comes back all the same.
create or replace function town.get_up(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  counted jsonb;
  up jsonb;
begin
  if coalesce(p_purse->'eating', 'null'::jsonb) = 'null'::jsonb then return p_purse; end if;
  counted := town.chew(p_purse, p_company, p_now)->'purse';
  up := counted || jsonb_build_object('eating', 'null'::jsonb,
    'buff', case when counted->'eating' <> 'null'::jsonb then coalesce(p_purse->'buff', 'null'::jsonb) else counted->'buff' end);
  -- (a meal that ran out as it was counted gave its bowl back already)
  if counted->'eating' <> 'null'::jsonb and town.cat('cooking')->'bowled' ? (p_purse->'eating'->>'dish') then return town.bowls_back(up, 1); end if;
  return up;
end;
$$;

-- settle(): a meal whose time is up, finished as of when it ended; and a
-- bowl that was owed, back when there is room for it.
create or replace function town.settle(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  ends bigint;
begin
  if e = 'null'::jsonb then return town.bowls_back(p_purse, 0); end if;
  ends := (e->>'from')::bigint + (town.cat('stamina')->>'minutes')::bigint * 60000;
  if p_now >= ends then return town.chew(p_purse, 0, ends)->'purse'; end if;
  return town.bowls_back(p_purse, 0);
end;
$$;

/* ── the rules of the kitchen ────────────────────────────────────────────── */

-- tidy(): things, each kind once with how many of it, kinds in order.
create or replace function town.tidy(p_things jsonb)
returns jsonb language sql immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_array(t.id, t.n) order by t.id collate "C"), '[]'::jsonb)
    from (select x->>0 as id, sum((x->>1)::double precision) as n
            from jsonb_array_elements(p_things) x where (x->>1)::double precision > 0 group by x->>0) t
$$;

-- The same as a document, a thing to how many: two lots of things are the
-- same when theirs are.
create or replace function town.things_of(p_things jsonb)
returns jsonb language sql immutable
as $$ select coalesce(jsonb_object_agg(x->>0, x->1), '{}'::jsonb) from jsonb_array_elements(town.tidy(p_things)) x $$;

-- needsOf(): what goes into a thing, in the order its recipe names them.
create or replace function town.needs_of(p_id text)
returns jsonb language sql stable
as $$ select coalesce(town.cat('dishes')->p_id->'recipe'->'needs', town.cat('makes')->p_id->'needs', '[]'::jsonb) $$;

-- madeOf(): what some things are the makings of, whoever cooks them: the
-- first recipe, in the code's own order, that they are exactly.
create or replace function town.made_of(p_things jsonb)
returns text language sql stable
as $$
  select r.id
    from (select town.cat('cooking') as k, town.things_of(p_things) as mine) c,
         jsonb_array_elements_text(c.k->'recipes') with ordinality r(id, ord)
   where c.k->'needs'->r.id = c.mine
   order by r.ord limit 1
$$;

-- takes(): what making a thing takes: its cookware, and how many cooks.
create or replace function town.takes(p_id text)
returns jsonb language sql stable
as $$
  select case when coalesce(d.r, 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('in', d.r->'in', 'cooks', d.r->'cooks')
              else jsonb_build_object('in', town.cat('makes')->p_id->'in', 'cooks', 1) end
    from (select town.cat('dishes')->p_id->'recipe' as r) d
$$;

-- The cookware in a crew's hands (what else they hold is not counted).
create or replace function town.cook_hands(p_crew jsonb)
returns text[] language sql stable
as $$
  select coalesce(array_agg(h.v #>> '{}'), '{}')
    from jsonb_array_elements(p_crew) h(v), (select town.cat('cooking')->'cookware' as ware) c
   where jsonb_typeof(h.v) = 'string' and c.ware ? (h.v #>> '{}')
$$;

-- Whether every piece of some cookware is in a different hand.
create or replace function town.holds_all(p_tools jsonb, p_hands text[])
returns boolean language sql immutable
as $$
  select not exists (
    select 1 from (select t.v as tool, count(*) as n from jsonb_array_elements_text(p_tools) t(v) group by t.v) need
     where need.n > (select count(*) from unnest(p_hands) h(v) where h.v = need.tool))
$$;

-- inHands(): whether every piece of some cookware is in a different cook's hand.
create or replace function town.in_hands(p_tools jsonb, p_crew jsonb)
returns boolean language sql stable
as $$ select town.holds_all(p_tools, town.cook_hands(p_crew)) $$;

-- helpings(): how many helpings a dish cooked so comes to: what its recipe
-- says, more from better cookware (in a cook's hand, or the stove in the bag
-- of whoever begins it) and a ladle, less for every stir missed (never under
-- half).
create or replace function town.helpings(p_dish text, p_crew jsonb, p_misses double precision, p_bag jsonb)
returns integer language plpgsql stable
as $$
declare
  ck jsonb := town.cat('cooking');
  best double precision;
  whole double precision;
begin
  select greatest(1::double precision, coalesce(max(coalesce((ck->'gear'->>(h.v #>> '{}'))::double precision, 1::double precision)), 1::double precision)) into best
    from jsonb_array_elements(p_crew) h(v) where jsonb_typeof(h.v) = 'string';
  if exists (select 1 from jsonb_array_elements(p_bag) s where s->>'item' = 'stoveBig') then
    best := greatest(best, coalesce((ck->'gear'->>'stoveBig')::double precision, 1::double precision));
  end if;
  whole := (town.cat('dishes')->p_dish->'recipe'->>'serves')::double precision * best
    + case when exists (select 1 from jsonb_array_elements(p_bag) s where s->>'item' = 'ladle') then (ck->>'ladle')::double precision else 0::double precision end;
  return greatest(ceil(whole / 2::double precision), floor(whole + 0.5::double precision) - greatest(0::double precision, floor(p_misses)))::integer;
end;
$$;

-- oddHelpings(): how many helpings of the odd dish some things come to.
create or replace function town.odd_helpings(p_things jsonb, p_misses double precision)
returns integer language sql stable
as $$
  select greatest(ceil(f.whole / 2::double precision), f.whole - greatest(0::double precision, floor(p_misses)))::integer
    from (select greatest(1::double precision, least((o.odd->>'most')::double precision,
                   floor(coalesce((select sum((x->>1)::double precision) from jsonb_array_elements(p_things) x), 0::double precision) / (o.odd->>'per')::double precision))) as whole
            from (select town.cat('cooking')->'odd' as odd) o) f
$$;

-- tasteOf(): how near some things are to making something, with the cooks
-- at their places: measured against the recipe they come nearest (the fewest
-- kinds of thing wrong; then the fewest amounts; then the one whose cookware
-- is in the cooks' hands; the first of them, in the code's own order). Says
-- the taste, the recipe it was measured against, and, when one thing is
-- missing, which.
create or replace function town.taste_of(p_things jsonb, p_crew jsonb)
returns jsonb language plpgsql stable
as $$
declare
  hands text[] := town.cook_hands(p_crew);
  crew_n integer := jsonb_array_length(p_crew);
  best record;
  missing_n integer;
  wrong integer;
  there integer;
  taste text;
begin
  select s.id, s.missing, s.extra, s.off, s.total into best
    from (
      select r.id, r.ord, jsonb_array_length(r.rec->'needs') as total,
             (select coalesce(array_agg(e.n->>0 order by e.ord), '{}') from jsonb_array_elements(r.rec->'needs') with ordinality e(n, ord)
               where not c.mine ? (e.n->>0)) as missing,
             (select count(*)::int from jsonb_object_keys(c.mine) k(v)
               where not exists (select 1 from jsonb_array_elements(r.rec->'needs') n(v) where n.v->>0 = k.v)) as extra,
             (select count(*)::int from jsonb_array_elements(r.rec->'needs') n(v)
               where c.mine ? (n.v->>0) and c.mine->(n.v->>0) <> n.v->1) as off,
             crew_n >= (r.rec->>'cooks')::int and town.holds_all(r.rec->'in', hands) as ready
        from (select town.things_of(p_things) as mine) c,
             (select x.id, x.ord, coalesce(nullif(d.dishes->x.id->'recipe', 'null'::jsonb), d.makes->x.id || '{"cooks": 1}'::jsonb) as rec
                from (select town.cat('dishes') as dishes, town.cat('makes') as makes) d,
                     jsonb_array_elements_text(town.cat('cooking')->'recipes') with ordinality x(id, ord)) r
    ) s
   order by (coalesce(array_length(s.missing, 1), 0) + s.extra) * 1000 + s.off * 10 + case when s.ready then 0 else 1 end, s.ord
   limit 1;
  if best.id is null then return '{"taste": "far", "of": null, "lacks": null}'::jsonb; end if;
  missing_n := coalesce(array_length(best.missing, 1), 0);
  wrong := missing_n + best.extra;
  there := best.total - missing_n;
  taste := case
    when wrong = 0 then (case when best.off > 0 then 'amounts' else 'way' end)
    when missing_n = 1 and best.extra = 1 then 'swap'
    when wrong = 1 then (case when best.extra > 0 then 'more' else 'less' end)
    when there >= 1 and there * 2 >= best.total then 'some'
    else 'far' end;
  return jsonb_build_object('taste', taste, 'of', case when taste = 'far' then null else best.id end,
    'lacks', case when taste in ('less', 'swap') then best.missing[1] end);
end;
$$;

-- cook(): put some things together, with the cooks at their places (`p_crew`:
-- what each holds, whoever begins it first). A dish comes as a pot of it, in
-- a free slot of the bag; something else that is made comes as itself; the
-- wrong things come as a pot of the odd dish when whoever begins it holds
-- cookware, and as nothing (a little compost) with bare hands. Somebody who
-- has made the thing before is told when the cooks or the cookware are
-- missing, and loses nothing. What is no recipe's comes with its taste, and
-- a miss by a recipe's last thing alone is counted against that recipe.
create or replace function town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
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
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null or ck->'never' ? (items->(x->>0)->>'kind')
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
    left_ := case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end;
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_)))))
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
$$;

-- setDown(): the pot of food in a slot of the bag, down on a tile. (On a
-- rattan table, when one is carried: more can gather round it.)
create or replace function town.set_down(p_purse jsonb, p_slot integer, p_me text, p_at jsonb, p_id text)
returns jsonb language plpgsql immutable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'pot', jsonb_build_object('id', p_id, 'by', p_me, 'dish', s->'of'->'dish', 'left', s->'of'->'left', 'at', p_at)
      || case when town.held(p_purse->'bag', 'tok') > 0 then '{"tok": true}'::jsonb else '{}'::jsonb end,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)));
end;
$$;

-- ladle(): a helping out of a pot that is set down, into a bowl of one's
-- own: the bowl leaves the bag, and the helping is there instead. Gives the
-- pot as it is afterwards: null when that was its last helping, and the pot
-- is gone.
create or replace function town.ladle(p_purse jsonb, p_pot jsonb)
returns jsonb language plpgsql stable
as $$
declare
  bowl text := town.cat('cooking')->>'bowl';
  left_ numeric := (p_pot->>'left')::numeric;
  bag jsonb;
begin
  if left_ < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  bag := town.take(p_purse->'bag', bowl, 1);
  if town.room(bag, p_pot->>'dish') < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true,
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || jsonb_build_object('bag', town.put(bag, p_pot->>'dish', 1)));
end;
$$;

-- mayTake(): only whoever set a pot down takes it up.
create or replace function town.may_take(p_pot jsonb, p_me text)
returns boolean language sql immutable
as $$ select p_pot->>'by' = p_me $$;

-- takeUp(): one's pot of food up again, into a free slot of the bag.
create or replace function town.take_up(p_purse jsonb, p_pot jsonb, p_me text)
returns jsonb language plpgsql immutable
as $$
declare
  slot integer;
begin
  if not coalesce(town.may_take(p_pot, p_me), false) or (p_pot->>'left')::numeric < 1 then return town.no('none'); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
  if slot is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
    jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', p_pot->'dish', 'left', p_pot->'left')))));
end;
$$;

-- serve(): a helping out of the pot of food in a slot of one's own bag, into
-- a bowl. Its last helping out, the pot is gone.
create or replace function town.serve(p_purse jsonb, p_slot integer)
returns jsonb language plpgsql stable
as $$
declare
  bowl text := town.cat('cooking')->>'bowl';
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  dish text;
  left_ numeric;
  bag jsonb;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb
     or (s->'of'->>'left')::numeric < 1 then return town.no('none'); end if;
  if town.held(p_purse->'bag', bowl) = 0 then return town.no('tool'); end if;
  dish := s->'of'->>'dish';
  left_ := (s->'of'->>'left')::numeric - 1;
  bag := town.take(jsonb_set(p_purse->'bag', array[p_slot::text],
    case when left_ > 0 then s || jsonb_build_object('of', jsonb_build_object('dish', dish, 'left', left_)) else 'null'::jsonb end), bowl, 1);
  if town.room(bag, dish) < 1 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'dish', dish, 'purse', p_purse || jsonb_build_object('bag', town.put(bag, dish, 1)));
end;
$$;

-- lib/town/scrolls.ts's open(): the thing in a slot of the bag is gone, and
-- what was in it is in the bag instead (`found`; null when it was empty).
-- `p_rolls` are two numbers in [0, 1): whether there is anything in it, and
-- which. Refused, with nothing lost, when it is nothing that opens, or the
-- bag would have no slot for a scroll once the thing is gone.
create or replace function town.open(p_purse jsonb, p_slot integer, p_rolls double precision[])
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  inside jsonb;
  bag jsonb;
  many integer;
  inside_it text;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  inside := town.cat('cooking')->'inside'->(s->>'item');
  if inside is null then return town.no('none'); end if;
  bag := jsonb_set(p_purse->'bag', array[p_slot::text],
    case when (s->>'n')::int = 1 then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - 1) end);
  if not exists (select 1 from jsonb_array_elements(bag) b where b = 'null'::jsonb) then return town.no('full'); end if;
  many := jsonb_array_length(inside->'scrolls');
  if p_rolls[1] < (inside->>'chance')::double precision and many > 0 then
    inside_it := inside->'scrolls'->>least(many - 1, greatest(0, floor(p_rolls[2] * many)::int));
  end if;
  return jsonb_build_object('ok', true, 'found', inside_it,
    'purse', p_purse || jsonb_build_object('bag', case when inside_it is not null then town.put(bag, inside_it, 1) else bag end));
end;
$$;

/* ── keeping the kitchen ─────────────────────────────────────────────────── */

-- A pot as the code has it.
create or replace function town.pot_doc(p_id bigint)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('id', o.id::text, 'by', o.member_id, 'dish', o.dish, 'left', o.helpings, 'at', jsonb_build_array(o.x, o.y))
           || case when o.tok then '{"tok": true}'::jsonb else '{}'::jsonb end
    from public.town_pots o where o.id = p_id
$$;

-- Whether a tile is near enough to a pot to reach it.
create or replace function town.reaches(p_pot jsonb, p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select p_x is not null and p_y is not null
     and sqrt(((p_pot->'at'->>0)::double precision - p_x) ^ 2 + ((p_pot->'at'->>1)::double precision - p_y) ^ 2)
         <= (case when coalesce((p_pot->>'tok')::boolean, false) then c.k->>'tok' else c.k->>'reach' end)::double precision
    from (select town.cat('cooking') as k) c
$$;

-- What the browser says of a game of timing, kept as three numbers and no more.
create or replace function town.timing_said(p_timing jsonb)
returns jsonb language sql immutable
as $$
  select jsonb_build_object(
    'hits', case when jsonb_typeof(s.said->'hits') = 'number' then least(greatest((s.said->>'hits')::numeric, 0), 1000) end,
    'misses', case when jsonb_typeof(s.said->'misses') = 'number' then least(greatest((s.said->>'misses')::numeric, 0), 1000) end,
    'secs', case when jsonb_typeof(s.said->'secs') = 'number' then least(greatest((s.said->>'secs')::numeric, 0), 3600) end)
    from (select town.claims(p_timing) as said) s
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The kitchen as everybody sees it: the pots that stand about, what has been
-- found, and who found each first.
create or replace function public.town_kitchen()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object(
    'now', town.now_ms(),
    'pots', (select coalesce(jsonb_agg(town.pot_doc(o.id) order by o.id), '[]'::jsonb) from public.town_pots o),
    'found', town.thing('found', false),
    'finders', (select coalesce(jsonb_object_agg(f.key, f.value->'name'), '{}'::jsonb) from jsonb_each(town.thing('finders', false)) f));
end;
$$;

-- Put some things together. `p_things` is a list of pairs, a thing and how
-- many; `p_crew` is who else stands at the yard's places (the browser's
-- word; what each holds is read here); `p_timing` is the browser's own
-- account of the stirring, kept with the play, whose misses, within bounds,
-- are helpings lost. Answers what came of it, how many, its taste when it
-- was no recipe's, and whether it is the first time anybody made it.
create or replace function public.town_cook(p_things jsonb, p_crew uuid[] default '{}', p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook(purse, p_things, crew, misses, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims));
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$$;

-- Set the pot of food in my bag down on the tile I stand on (the browser's
-- word for where that is): if nothing stands on it or beside it, and I have
-- not left as many about as one may.
create or replace function public.town_pot_down(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  if exists (select 1 from public.town_pots o where abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me) >= (ck->>'pots')::int then return town.answer(me, town.no('many')); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int, p_x, p_y, coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms())
    on conflict (x, y) do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$$;

-- Ladle a helping out of a pot that stands about, into a bowl of mine. Its
-- last helping out, the pot is gone.
create or replace function public.town_pot_ladle(p_id bigint, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.ladle(purse, pot);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  if did->'pot' = 'null'::jsonb then delete from public.town_pots o where o.id = p_id;
  else update public.town_pots o set helpings = (did->'pot'->>'left')::int where o.id = p_id; end if;
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, did) || jsonb_build_object('dish', pot->'dish');
end;
$$;

-- Take my pot of food up again.
create or replace function public.town_pot_take(p_id bigint, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  pot jsonb;
  did jsonb;
begin
  perform 1 from public.town_pots o where o.id = p_id for update;
  pot := town.pot_doc(p_id);
  if pot is null then return town.answer(me, town.no('gone')); end if;
  if not town.reaches(pot, p_x, p_y) then return town.answer(me, town.no('none')); end if;
  did := town.take_up(purse, pot, me::text);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  delete from public.town_pots o where o.id = p_id;
  perform town.keep_purse(me, did->'purse');
  return town.answer(me, did);
end;
$$;

-- Ladle a helping out of the pot in a slot of my own bag, into a bowl.
create or replace function public.town_serve(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.serve(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- Open what may hold something (an old boot, a bottle, a chest): says what
-- was in it, if anything. The chance is drawn here.
create or replace function public.town_open(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.open(town.purse_of(me, true), p_slot, array[random(), random()]);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'town_kitchen()', 'town_cook(jsonb, uuid[], jsonb)', 'town_pot_down(integer, integer)', 'town_pot_ladle(bigint, integer, integer)',
    'town_pot_take(bigint, integer, integer)', 'town_serve(integer)', 'town_open(integer)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, (select count(*) from jsonb_object_keys(data)) as n
--     from public.town_catalog where key in ('items', 'goods', 'makes', 'cooking') order by key;
--   -- cooking | 20
--   -- goods   | 101
--   -- items   | 312
--   -- makes   | 21
--
--   select jsonb_array_length(data->'basic') as basic, jsonb_array_length(data->'unlocks') as unlocks
--     from public.town_catalog where key = 'shelf';
--   -- 21 | 80
--
--   select data->'pot'->>'pays' as a_pot_fetches, data ? 'potDirty' as dirty_pot, data ? 'soap' as soap
--     from public.town_catalog where key = 'items';
--   -- 40 | false | false
--
--   select doc from public.town_things where key = 'finders';
--   -- {}
--
--   select c.relrowsecurity,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_pots' and grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_pots'::regclass;
--   -- true | 0
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_kitchen', 'town_cook', 'town_pot_down', 'town_pot_ladle', 'town_pot_take', 'town_serve', 'town_open');
--   -- 0 | 7
--
--   select town.made_of('[["minnow", 3], ["salt", 1]]'::jsonb) as three_minnows_and_salt,
--          town.taste_of('[["minnow", 3]]'::jsonb, '["pan"]'::jsonb)->>'taste' as without_the_salt;
--   -- friedMinnow | less
