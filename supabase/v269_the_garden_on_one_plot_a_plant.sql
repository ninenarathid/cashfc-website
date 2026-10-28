-- v269: the garden's hybrids and the fig on one plot a plant (the owner, 2026-10-16).
-- Run after v268 and with the matching site code. Safe to run twice.
--
-- The owner: "พืชหลายช่อง ทำให้คน งง กันเยอะ ... แก้เลย เอาให้เหลือช่องเดียว". The eight garden hybrids (two or three
-- plots) and the fig and the mist fig (2x2) are sown on one plot as any crop is (the catalog's gardening row: each
-- shape one cell). What each gives a picking is about a plot's share of what it gave over its plots, kept between 1.45
-- and 2 times its parents' pay a plot-hour (the crops row: the bottle gourd 1-2, the row bean 3-4, the trellis berry 2-3,
-- blue corn 2-4, the tea bush 3-4, the sunflower patch 2-4, red okra 3-4, the lotus root bed 2; the fig and the mist fig
-- 1 a picking of their four), so a bed of them gives about what it gave; and a picking's points are a plot's share too
-- (the work row: farming, farmingAgain, farmingCells). The
-- fig waters the ring of eight around its plot, as the rhubarb does (the quality row's companions).
--
-- A plant sown over several plots before this stands on them until it is done, and gives for each of them as it did:
-- town.yield_of times the plots of its footprint (a giant is counted where it is picked, as before). Its points at a
-- picking are one plot's now (the deed does not say how many plots it stood on).
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.may_grade(text)') is null then raise exception 'Run v268 before v269'; end if;
-- <guards:v269>
 if md5(replace(pg_get_functiondef('town.yield_of(text,jsonb,text)'::regprocedure),chr(13),'')) not in ('8df28f3b8b49ce26748e26f7a00ee495','f6ea0cb77147112b5c1f32774f35bcae') then raise exception 'Definition changed: town.yield_of(text,jsonb,text); rebuild v269'; end if;
-- </guards:v269>
end $$;

-- <catalog:v269> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gardening', $town${
    "version": 1,
    "boost": 3600000,
    "extra": 1,
    "shapes": {"bottleGourd":[[0,0]],"rowBean":[[0,0]],"trellisBerry":[[0,0]],"blueCorn":[[0,0]],"teaBush":[[0,0]],"sunflowerPatch":[[0,0]],"redOkra":[[0,0]],"lotusRootBed":[[0,0]],"fig":[[0,0]],"dewFig":[[0,0]],"sesame":[[0,0]],"watercress":[[0,0]],"borage":[[0,0]],"passionfruit":[[0,0]],"garlicChives":[[0,0]],"dewSesame":[[0,0]],"crystalLeaf":[[0,0]]},
    "crosses": [["pumpkin","cucumber","bottleGourd"],["longBean","basil","rowBean"],["rowBean","teaBush","trellisBerry"],["corn","sunflowerPatch","blueCorn"],["basil","lemongrass","teaBush"],["corn","basil","sunflowerPatch"],["chili","longBean","redOkra"],["taro","kangkong","lotusRootBed"]]
  }$town$::jsonb),
  ('crops', $town${
    "bottleGourd": {"seed":"seedBottleGourd","hours":72,"yield":[1,2],"again":36,"picks":3},
    "rowBean": {"seed":"seedRowBean","hours":60,"yield":[3,4],"again":24,"picks":3},
    "trellisBerry": {"seed":"seedTrellisBerry","hours":192,"yield":[2,3],"again":48,"picks":5},
    "blueCorn": {"seed":"seedBlueCorn","hours":120,"yield":[2,4],"again":null,"picks":1},
    "teaBush": {"seed":"seedTeaBush","hours":168,"yield":[3,4],"again":48,"picks":5},
    "sunflowerPatch": {"seed":"seedSunflowerPatch","hours":72,"yield":[2,4],"again":null,"picks":1},
    "redOkra": {"seed":"seedRedOkra","hours":72,"yield":[3,4],"again":24,"picks":3},
    "lotusRootBed": {"seed":"seedLotusRootBed","hours":120,"yield":[2,2],"again":null,"picks":1},
    "runnerBean": {"seed":"seedRunnerBean","hours":48,"yield":[2,2],"again":24,"picks":3},
    "peanut": {"seed":"seedPeanut","hours":72,"yield":[4,4],"again":null,"picks":1},
    "buckwheat": {"seed":"seedBuckwheat","hours":48,"yield":[3,3],"again":null,"picks":1},
    "sesame": {"seed":"seedSesame","hours":60,"yield":[3,3],"again":null,"picks":1},
    "clover": {"seed":"seedClover","hours":36,"yield":[2,2],"again":24,"picks":3},
    "gardenStrawberry": {"seed":"seedGardenStrawberry","hours":48,"yield":[2,2],"again":24,"picks":3},
    "rhubarb": {"seed":"seedRhubarb","hours":72,"yield":[2,2],"again":36,"picks":3},
    "watercress": {"seed":"seedWatercress","hours":24,"yield":[2,2],"again":24,"picks":3},
    "fig": {"seed":"seedFig","hours":120,"yield":[1,1],"again":48,"picks":4},
    "chamomile": {"seed":"seedChamomile","hours":48,"yield":[2,2],"again":24,"picks":3},
    "borage": {"seed":"seedBorage","hours":36,"yield":[2,2],"again":24,"picks":3},
    "lavender": {"seed":"seedLavender","hours":72,"yield":[2,2],"again":36,"picks":3},
    "passionfruit": {"seed":"seedPassionfruit","hours":96,"yield":[2,2],"again":36,"picks":4},
    "milkweed": {"seed":"seedMilkweed","hours":48,"yield":[2,2],"again":24,"picks":3},
    "fennel": {"seed":"seedFennel","hours":72,"yield":[2,2],"again":36,"picks":3},
    "marigold": {"seed":"seedMarigold","hours":36,"yield":[2,2],"again":24,"picks":3},
    "nasturtium": {"seed":"seedNasturtium","hours":48,"yield":[2,2],"again":24,"picks":3},
    "garlicChives": {"seed":"seedGarlicChives","hours":36,"yield":[2,2],"again":24,"picks":3},
    "mint": {"seed":"seedMint","hours":36,"yield":[2,2],"again":24,"picks":3},
    "dill": {"seed":"seedDill","hours":48,"yield":[2,2],"again":24,"picks":3},
    "pearlNut": {"seed":"seedPearlNut","hours":72,"yield":[4,4],"again":null,"picks":1},
    "silverGrain": {"seed":"seedSilverGrain","hours":48,"yield":[3,3],"again":null,"picks":1},
    "dewSesame": {"seed":"seedDewSesame","hours":60,"yield":[3,3],"again":null,"picks":1},
    "glassFlower": {"seed":"seedGlassFlower","hours":36,"yield":[2,2],"again":24,"picks":3},
    "opalStalk": {"seed":"seedOpalStalk","hours":72,"yield":[2,2],"again":36,"picks":3},
    "crystalLeaf": {"seed":"seedCrystalLeaf","hours":24,"yield":[2,2],"again":24,"picks":3},
    "dewFig": {"seed":"seedDewFig","hours":120,"yield":[1,1],"again":48,"picks":4},
    "silkPollen": {"seed":"seedSilkPollen","hours":48,"yield":[2,2],"again":24,"picks":3},
    "kangkong": {"seed":"seedKangkong","hours":6,"yield":[4,6],"again":12,"picks":3},
    "scallion": {"seed":"seedScallion","hours":8,"yield":[4,6],"again":12,"picks":3},
    "cabbage": {"seed":"seedCabbage","hours":24,"yield":[2,2],"again":null,"picks":1},
    "carrot": {"seed":"seedCarrot","hours":24,"yield":[4,6],"again":null,"picks":1},
    "daikon": {"seed":"seedDaikon","hours":36,"yield":[2,4],"again":null,"picks":1},
    "corn": {"seed":"seedCorn","hours":48,"yield":[4,6],"again":null,"picks":1},
    "chili": {"seed":"seedChili","hours":48,"yield":[6,10],"again":24,"picks":4},
    "tomato": {"seed":"seedTomato","hours":72,"yield":[6,8],"again":36,"picks":3},
    "basil": {"seed":"seedBasil","hours":36,"yield":[6,8],"again":24,"picks":4},
    "sweetPotato": {"seed":"seedSweetPotato","hours":72,"yield":[4,8],"again":null,"picks":1},
    "garlic": {"seed":"seedGarlic","hours":60,"yield":[4,6],"again":null,"picks":1},
    "pumpkin": {"seed":"seedPumpkin","hours":144,"yield":[2,2],"again":null,"picks":1},
    "eggplant": {"seed":"seedEggplant","hours":60,"yield":[4,6],"again":30,"picks":3},
    "cucumber": {"seed":"seedCucumber","hours":40,"yield":[4,8],"again":20,"picks":3},
    "longBean": {"seed":"seedLongBean","hours":48,"yield":[6,10],"again":24,"picks":4},
    "lemongrass": {"seed":"seedLemongrass","hours":72,"yield":[4,6],"again":36,"picks":5},
    "galangal": {"seed":"seedGalangal","hours":96,"yield":[2,4],"again":null,"picks":1},
    "lime": {"seed":"seedLime","hours":168,"yield":[6,10],"again":48,"picks":8},
    "papaya": {"seed":"seedPapaya","hours":144,"yield":[2,4],"again":48,"picks":5},
    "mango": {"seed":"seedMango","hours":240,"yield":[4,6],"again":48,"picks":8},
    "banana": {"seed":"seedBanana","hours":192,"yield":[6,8],"again":48,"picks":4},
    "coconut": {"seed":"seedCoconut","hours":288,"yield":[2,4],"again":48,"picks":10},
    "ginger": {"seed":"seedGinger","hours":120,"yield":[2,4],"again":null,"picks":1},
    "turmeric": {"seed":"seedTurmeric","hours":120,"yield":[2,4],"again":null,"picks":1},
    "taro": {"seed":"seedTaro","hours":168,"yield":[2,4],"again":null,"picks":1},
    "watermelon": {"seed":"seedWatermelon","hours":144,"yield":[2,2],"again":null,"picks":1}
  }$town$::jsonb),
  ('quality', $town${
    "bar": 25,
    "spread": 30,
    "narrowest": 20,
    "narrow": 10,
    "fennel": 10,
    "launch": 1791997200000,
    "hand": {"costs":{"compost":1,"brush":2,"fert":1},"water":93600000,"afterRain":43200000,"level":0.5},
    "encore": 0.5,
    "companions": {"runnerBean":{"role":"soil","shape":"plus"},"peanut":{"role":"soil","shape":"plus"},"buckwheat":{"role":"soil","shape":"ring"},"sesame":{"role":"soil","shape":"line"},"clover":{"role":"soil","shape":"x"},"gardenStrawberry":{"role":"water","shape":"plus"},"rhubarb":{"role":"water","shape":"ring"},"watercress":{"role":"water","shape":"line"},"fig":{"role":"water","shape":"ring"},"chamomile":{"role":"water","shape":"x"},"borage":{"role":"pollen","shape":"line"},"lavender":{"role":"pollen","shape":"ring"},"passionfruit":{"role":"pollen","shape":"line"},"milkweed":{"role":"pollen","shape":"plus"},"fennel":{"role":"pollen","shape":"x"},"marigold":{"role":"guard","shape":"ring"},"nasturtium":{"role":"guard","shape":"x"},"garlicChives":{"role":"guard","shape":"line"},"mint":{"role":"guard","shape":"plus"},"dill":{"role":"guard","shape":"plus"},"pearlNut":{"role":"soil","shape":"plus"},"silverGrain":{"role":"soil","shape":"ring"},"dewSesame":{"role":"soil","shape":"line"},"glassFlower":{"role":"soil","shape":"x"},"opalStalk":{"role":"water","shape":"ring"},"crystalLeaf":{"role":"water","shape":"line"},"dewFig":{"role":"water","shape":"ring"},"silkPollen":{"role":"water","shape":"x"}},
    "partners": {"kangkong":"watercress","scallion":"carrot","cabbage":"dill","carrot":"scallion","daikon":"nasturtium","corn":"runnerBean","chili":"basil","tomato":"basil","basil":"tomato","sweetPotato":"peanut","garlic":"chamomile","pumpkin":"runnerBean","eggplant":"marigold","cucumber":"dill","longBean":"sesame","lemongrass":"mint","galangal":"rhubarb","lime":"lavender","papaya":"passionfruit","mango":"buckwheat","banana":"sweetPotato","coconut":"peanut","ginger":"watercress","turmeric":"chamomile","taro":"watercress","watermelon":"nasturtium","bottleGourd":"borage","rowBean":"corn","trellisBerry":"borage","blueCorn":"runnerBean","teaBush":"clover","sunflowerPatch":"milkweed","redOkra":"garlicChives","lotusRootBed":"kangkong","runnerBean":"corn"},
    "crosses": [["corn","longBean","peanut","lavender","pearlNut"],["cabbage","carrot","buckwheat","passionfruit","silverGrain"],["corn","chili","sesame","milkweed","dewSesame"],["basil","cabbage","clover","fennel","glassFlower"],["gardenStrawberry","tomato","rhubarb","nasturtium","opalStalk"],["kangkong","scallion","watercress","garlicChives","crystalLeaf"],["pumpkin","tomato","fig","mint","dewFig"],["borage","lemongrass","chamomile","dill","silkPollen"]],
    "skies": {"honeyBee":"sun","carpenterBee":"sun","hoverfly":"sun","pollenMidge":"sun","orchardBeetle":"sun","butterflyWhite":"sun","monarch":"sun","morpho":"sun","silkMoth":"moon","moth":"moon","lunaMoth":"moon","hawkMoth":"moon","megaloptaBee":"mist","indianNightBee":"mist","masonBee":"sun","woolCarderBee":"sun","blueBandedBee":"sun","clearwingMoth":"sun","yuccaMoth":"moon","tobaccoHawkmoth":"moon","amberLeafroller":"moon","rosefoldMoth":"moon","silverfoldMoth":"moon","copperfoldMoth":"moon","inkspotLeaftier":"moon","lanternfoldMoth":"moon","dewfoldMoth":"mist","blossomChafer":"sun","thornTreehopper":"sun"},
    "house": {"reach":2,"hours":48,"rareHours":72,"favHours":24,"level":0.5,"rooms":2,"rarePays":20,"costs":{"set":1,"room":1,"lift":1},"keep":0.7,"keeps":{"ladybird":0.5,"mantis":0.7,"robberFly":0.5,"antlion":0.5,"roveBeetle":0.5},"favourites":{"honeyBee":"clover","carpenterBee":"runnerBean","hoverfly":"dill","pollenMidge":"watercress","silkMoth":"buckwheat","orchardBeetle":"fig","butterflyWhite":"nasturtium","monarch":"marigold","morpho":"gardenStrawberry","moth":"mint","lunaMoth":"rhubarb","hawkMoth":"sesame","lacewing":"buckwheat","goldenAnt":"peanut","mantis":"fennel","ladybird":"chamomile","orchidMantis":"passionfruit","megaloptaBee":"chamomile","indianNightBee":"mint","masonBee":"gardenStrawberry","woolCarderBee":"sesame","blueBandedBee":"watercress","clearwingMoth":"nasturtium","yuccaMoth":"peanut","tobaccoHawkmoth":"garlicChives","ghostMantis":"lavender","snakefly":"borage","tigerBeetle":"clover","assassinBug":"milkweed","robberFly":"buckwheat","antlion":"peanut","roveBeetle":"rhubarb","earwig":"marigold","roseChafer":"borage","oilBeetle":"dill","superworm":"rhubarb","bessBeetle":"fig"},"soilWorkers":["earwig","roseChafer","oilBeetle","superworm","bessBeetle","crimsonRollerWeevil","giraffeNeckWeevil","jadeRollerWeevil","hazelCigarWeevil","mistrollWeevil","checkeredBarkBeetle","cedarLonghorn","mossStickInsect","lanternWeevil"]},
    "ferts": {"slatePowder":{"slot":"base","bars":{"soil":1}},"biochar":{"slot":"base","bars":{"water":1}},"mineralClay":{"slot":"base","bars":{"water":1}},"chitinPowder":{"slot":"base","bars":{"guard":1}},"forestHumus":{"slot":"base","bars":{"soil":0.5,"water":0.5}},"silkFrass":{"slot":"base","bars":{"soil":0.5,"pollen":0.5}},"woodAsh":{"slot":"base","bars":{"soil":0.5,"guard":0.5}},"lotusSilt":{"slot":"base","bars":{"water":0.5,"pollen":0.5}},"mulch":{"slot":"base","bars":{"water":0.5,"guard":0.5}},"herbPowder":{"slot":"base","bars":{"pollen":0.5,"guard":0.5}},"fishEmulsion":{"slot":"top","bars":{"soil":1},"hours":12},"kitchenFerment":{"slot":"top","bars":{"soil":1},"hours":12},"mineralWater":{"slot":"top","bars":{"water":1},"hours":24},"nectarLure":{"slot":"top","bars":{"pollen":1},"hours":24},"sulphurPowder":{"slot":"top","bars":{"guard":1},"hours":24},"resinWash":{"slot":"top","bars":{"guard":1},"hours":24},"sawdustMulch":{"slot":"top","bars":{"soil":0.5,"water":0.5},"hours":48},"shellMeal":{"slot":"top","bars":{"soil":0.5,"guard":0.5},"hours":24},"shreddedBark":{"slot":"top","bars":{"water":0.5,"guard":0.5},"hours":48},"boneMeal":{"slot":"base","bars":{"soil":1}},"guanoMeal":{"slot":"base","bars":{"pollen":1}},"scalePowder":{"slot":"base","bars":{"soil":1}},"beetleFrass":{"slot":"top","bars":{"soil":0.5,"pollen":0.5},"hours":24},"dewPollen":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":12},"glowPowder":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":12},"packetMist":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":72,"narrows":true},"packetNight":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":72,"narrows":true}}
  }$town$::jsonb),
  ('work', $town${
    "ids": ["kitchen","well","helpers","fishing","forest","insects","farming","felling","mining","animals"],
    "ranks": 10,
    "past": 0.25,
    "first": 10,
    "experienceVersion": 2,
    "harvestBankDays": 7,
    "marks": {"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000],"felling":[50,150,350,700,1300,2200,3600,5500,8000,12000],"mining":[50,150,350,700,1300,2200,3600,5500,8000,12000],"animals":[50,150,350,700,1300,2200,3600,5500,8000,12000]},
    "day": {"kitchen":150,"well":375,"helpers":375,"fishing":150,"forest":150,"insects":150,"farming":150,"felling":150,"mining":150,"animals":150},
    "kitchen": {"ladled":1,"pots":3,"ladling":9,"pot":{"nectarRice":4,"honeyHerbTea":4,"pollenCake":4,"orchardSoup":4,"fernRice":4,"rootStew":5,"petalBiscuit":4,"sporeNoodles":6,"springRice":5,"mintBroth":5,"mineralCongee":5,"moonTeaRice":4,"layeredRootPot":6,"crispRiceSkillet":7,"slowFishBroth":6,"glazedForestBowl":5,"sharePorridge":7,"travelerSoup":7,"friendRice":7,"restTea":7,"pineNutRice":3,"cedarBroth":6,"pineNutCake":5,"sapGlazedFish":3,"custard":3,"pancakes":5,"cheesecake":9,"butterCookies":8,"quiche":7,"lanternCustard":3,"cloudSouffle":3,"goldenOmelette":3,"emberBakedEggs":5,"rainBroth":3,"moonPudding":4,"paperFish":2,"leviathanEggCup":4,"strawberryShake":3,"hotCocoa":3,"flowerLatte":3,"starPudding":5,"pollenRice":4,"berryTea":5,"blueCornCake":5,"lotusGardenSoup":4,"minerRice":3,"caveStew":3,"saltRoast":3,"seamCake":3,"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":5,"tomYum":5,"sourCurry":5,"friedPerch":2,"fishCake":5,"spicyEel":4,"grilledPrawn":2,"steamedGoby":4,"pumpkinSoup":5,"shabu":14,"somTam":6,"grilledEggplant":3,"tomKha":6,"friedGourami":2,"crabCurry":7,"steamedSheatfish":4,"friedFrog":2,"laab":7,"omelette":2,"snailCurry":6,"candiedPumpkin":5,"friedRice":4,"greenCurry":9,"khanomJeen":10,"hoMok":8,"mangoStickyRice":7,"bananaInCoconut":5,"taroPudding":9,"steamedCroaker":4,"gingerFish":5,"turmericFish":4,"jungleCurry":10,"megaLaab":24,"watermelonSlices":6,"khantoke":24,"naamPrik":7,"sushi":6,"ramen":7,"tempura":3,"unadon":3,"okonomiyaki":5,"kimchi":6,"bibimbap":8,"tteokbokki":5,"kimbap":5,"pajeon":3,"harGow":5,"chowMein":6,"springRoll":6,"congee":5,"mapoTofu":5,"pizza":8,"spaghetti":7,"risotto":5,"lasagna":9,"minestrone":8,"fishCurry":8,"naan":5,"biryani":7,"samosa":6,"lassi":3,"fishChips":4,"ukha":5,"thieboudienne":6,"piranhaSoup":3,"crawfishBoil":10,"masgouf":3,"salmonSteak":2,"arapaimaRoast":12,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":5,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":8,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":5,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"creekBroth":7,"smokedBrookBowl":5,"torrentSkewer":2,"springDumpling":3,"reedFishCongee":5,"sandbankSkillet":5,"fernBarbelStew":6,"creekHerbGrill":6,"orchidFishHotpot":7,"ancientCreekFeast":7,"springFishCongee":4,"bluefinMountainPan":5,"cascadeHerbStew":6,"ridgeFishGrill":5,"mistFishBroth":7,"cloudCrownFeast":7,"lilyPoolCongee":4,"duskFishSkillet":5,"glassCaveSoup":6,"jadeFishGrill":6,"mirrorPoolStew":7,"moonveilFeast":7,"slatePowder":1,"biochar":1,"mineralClay":1,"chitinPowder":2,"forestHumus":3,"silkFrass":1,"woodAsh":1,"lotusSilt":1,"herbPowder":1,"fishEmulsion":3,"kitchenFerment":2,"nectarLure":2,"sulphurPowder":3,"resinWash":1,"sawdustMulch":1,"shellMeal":1,"shreddedBark":1,"boneMeal":1,"guanoMeal":3,"scalePowder":3,"beetleFrass":2,"dewPollen":2,"glowPowder":2,"packetMist":3,"packetNight":3,"splitPlank":1,"carvingBlank":3,"pitchSeal":3,"sapSyrup":2,"pineNutFlour":1,"rootTwine":1,"woodOil":3,"cream":1,"butter":2,"farmCheese":2,"yarn":1,"woolScarf":2,"rainbowScarf":3,"starScarf":3,"goldenScarf":3,"prism":3,"dewGrow":2,"packedRation":3,"honeycomb":2,"gardenHoney":2,"beeswax":3,"silkTwist":2,"silkenCord":2,"chitinPlate":3,"nectarSyrup":3,"lichenSalt":2,"petalDye":2,"bulbPowder":1,"driedFern":2,"rootExtract":2,"berrySeedOil":1,"sporeCulture":2,"clearSpring":3,"herbalWater":3,"mineralWater":2,"dawnBlend":4,"rainBlend":4,"moonBlend":5,"springSalt":3,"dicedRoot":2,"emberRice":2,"brownedOnion":1,"driedZest":1,"crushedHerb":1,"fishStock":3,"roastedSeed":1,"whiskedEgg":1,"fragrantOil":4,"smokedSalt":4,"fermentStarter":3,"brightSauce":4,"thickBroth":4,"sweetGlaze":3,"spicePaste":5,"gourdCup":1,"beanPaste":1,"berryJam":2,"blueCornFlour":1,"driedTea":1,"sunflowerOil":1,"lotusStarch":1,"stoneTile":2,"crystalLens":1,"sparkPowder":1,"copperBlank":3,"steelPlate":3,"geodeDisplay":4,"fishSauce":2,"compost":1,"growFert":3,"guardFert":4,"pestCure":3,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":2,"lineSpun":1,"mulch":1,"lavenderSachet":2,"bugNet":2,"torch":2,"driedFish":2,"saltedFish":2,"curryPaste":3,"pickle":2,"charcoal":1,"rope":1,"krabung":3,"noodle":2,"coconutMilk":1,"fermentedFish":4,"shrimpPaste":2,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":5,"brookFillet":1,"smokedTrout":3,"driedDace":2,"springStock":3,"fishRoe":1,"flowFloat":3,"springLeader":3,"torrentNet":3,"shadeLure":4}},
    "helpers": {"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3,"dust":2,"bellows":2},
    "fishing": {"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":2,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":2,"popotoFish":2,"rainbowFish":2,"moonFish":9,"creekDace":1,"torrentBarb":3,"stoneLapper":1,"glassGoby":3,"brookTrout":3,"caveBlindfish":8,"uplandEel":3,"springShrimp":1,"riverLamprey":8,"marbleMahseer":8,"torrentSleeper":3,"waterfallSturgeon":31,"reedMinnow":1,"ribbonRasbora":1,"pebbleLoach":1,"willowShiner":1,"sandGudgeon":1,"amberChub":1,"fernBarbel":3,"redfinDace":3,"stripedSpinyLoach":3,"leafPerch":3,"copperBream":3,"needleHalfbeak":3,"spottedCreekCatfish":8,"saffronLoach":8,"longfinCreekCarp":8,"orchidSnakehead":8,"creekDragonfish":30,"ancientCreekBarbel":31,"silverSpringDace":1,"rockSculpin":1,"mossLoach":1,"swiftGrayling":1,"bluefinTrout":1,"mountainWhitefish":1,"cascadeChar":3,"graniteGoby":3,"windfinMahseer":3,"crimsonHillBarb":3,"snowlineTrout":3,"ridgePike":3,"mistSalmon":8,"blackstoneEel":8,"cloudCrownMahseer":30,"thunderbackSturgeon":31,"poolMedaka":1,"lilyGourami":1,"moonspotGoby":1,"mossfinPerch":1,"roundtailBetta":1,"duskFeatherfin":1,"petalKillifish":3,"caveGlassPerch":3,"spottedPoolCatfish":3,"ivoryKnifefish":3,"jadeSleeper":3,"caveRibbonEel":3,"violetCaveChar":8,"mirrorPoolCarp":8,"starfinBichir":8,"moonveilArowana":30,"crystalCaveDragon":31,"pearlDanio":30,"peacockGudgeon":8,"huchen":30,"forktailBlueEye":8,"empireGudgeon":8,"lenok":8,"zebrafish":1,"europeanChub":1,"arcticChar":3,"rosyBitterling":1,"pumpkinseed":1,"europeanGrayling":3,"leastKillifish":1,"australianBass":3,"lakeWhitefish":3,"tench":1,"goldenDorado":30,"europeanBullhead":1,"glassKnifefish":30,"tigerShovelnose":3,"burbot":3,"elephantnoseFish":8,"freshwaterSole":3,"dollyVarden":3},
    "forest": {"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"],"kinds":{"ring":5,"bough":4},"parts":["bambooSheath","berryPip","fernTip","flowerBulb","forestLichen","fragrantPetal","mushroomSpores","wildMedicRoot"],"part":2},
    "insects": {"butterflyWhite":1,"monarch":8,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":8,"scarab":1,"caterpillar":1,"honeyBee":8,"carpenterBee":8,"lacewing":8,"hoverfly":8,"silkMoth":8,"goldenAnt":8,"orchardBeetle":8,"pollenMidge":8,"megaloptaBee":3,"ghostMantis":3,"railroadWorm":3,"indianNightBee":3,"snakefly":8,"earwig":3,"masonBee":1,"tigerBeetle":3,"roseChafer":1,"woolCarderBee":3,"oilBeetle":3,"assassinBug":3,"blueBandedBee":3,"robberFly":3,"superworm":3,"clearwingMoth":3,"antlion":3,"bessBeetle":8,"yuccaMoth":3,"roveBeetle":1,"cucujoBeetle":3,"tobaccoHawkmoth":3,"blueGhostFirefly":8,"californiaGlowworm":3,"crimsonRollerWeevil":3,"giraffeNeckWeevil":3,"jadeRollerWeevil":3,"hazelCigarWeevil":3,"amberLeafroller":3,"rosefoldMoth":3,"silverfoldMoth":3,"copperfoldMoth":3,"inkspotLeaftier":3,"lanternfoldMoth":3,"dewfoldMoth":8,"mistrollWeevil":8,"checkeredBarkBeetle":3,"twigLacewing":3,"blossomChafer":3,"thornTreehopper":3,"cedarLonghorn":3,"barkAssassinBug":3,"mossStickInsect":3,"lanternWeevil":3,"ghostBarkMantis":8},
    "giants": {"sailbackCarp":8,"bronzeBuffalo":8,"lanternCatfish":8,"palePaddlefish":8,"glasswakeCarp":30,"reedbackBarbel":8,"copperLongfin":8,"rootjawCatfish":8,"ribbonEel":8,"mistveilBarbel":30,"graniteMahseer":8,"torrentSalmon":8,"slateSturgeon":8,"snowfinTaimen":8,"dawncrestSturgeon":30,"lotusGourami":8,"mirrorbackPerch":8,"velvetArowana":8,"pearlBichir":8,"moonthreadEel":30},
    "farming": {"bottleGourd":6,"rowBean":5,"trellisBerry":16,"blueCorn":10,"teaBush":14,"sunflowerPatch":6,"redOkra":6,"lotusRootBed":10,"runnerBean":4,"peanut":6,"buckwheat":4,"sesame":5,"clover":3,"gardenStrawberry":4,"rhubarb":6,"watercress":2,"fig":10,"chamomile":4,"borage":3,"lavender":6,"passionfruit":8,"milkweed":4,"fennel":6,"marigold":3,"nasturtium":4,"garlicChives":3,"mint":3,"dill":4,"pearlNut":6,"silverGrain":4,"dewSesame":5,"glassFlower":3,"opalStalk":6,"crystalLeaf":2,"dewFig":10,"silkPollen":4,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":4,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12},
    "farmingAgain": {"bottleGourd":4,"rowBean":2,"trellisBerry":6,"blueCorn":11,"teaBush":6,"sunflowerPatch":7,"redOkra":3,"lotusRootBed":11,"runnerBean":2,"peanut":7,"buckwheat":4,"sesame":5,"clover":2,"gardenStrawberry":2,"rhubarb":4,"watercress":2,"fig":5,"chamomile":2,"borage":2,"lavender":4,"passionfruit":4,"milkweed":2,"fennel":4,"marigold":2,"nasturtium":2,"garlicChives":2,"mint":2,"dill":2,"pearlNut":7,"silverGrain":4,"dewSesame":5,"glassFlower":2,"opalStalk":4,"crystalLeaf":2,"dewFig":5,"silkPollen":2,"kangkong":2,"scallion":2,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":2,"tomato":4,"basil":2,"sweetPotato":7,"garlic":5,"pumpkin":14,"eggplant":3,"cucumber":2,"longBean":2,"lemongrass":4,"galangal":9,"lime":6,"papaya":6,"mango":7,"banana":6,"coconut":8,"ginger":11,"turmeric":11,"taro":16,"watermelon":14},
    "farmingCells": {"bottleGourd":1,"rowBean":1,"trellisBerry":1,"blueCorn":1,"teaBush":1,"sunflowerPatch":1,"redOkra":1,"lotusRootBed":1,"runnerBean":1,"peanut":1,"buckwheat":1,"sesame":1,"clover":1,"gardenStrawberry":1,"rhubarb":1,"watercress":1,"fig":1,"chamomile":1,"borage":1,"lavender":1,"passionfruit":1,"milkweed":1,"fennel":1,"marigold":1,"nasturtium":1,"garlicChives":1,"mint":1,"dill":1,"pearlNut":1,"silverGrain":1,"dewSesame":1,"glassFlower":1,"opalStalk":1,"crystalLeaf":1,"dewFig":1,"silkPollen":1,"kangkong":1,"scallion":1,"cabbage":1,"carrot":1,"daikon":1,"corn":1,"chili":1,"tomato":1,"basil":1,"sweetPotato":1,"garlic":1,"pumpkin":1,"eggplant":1,"cucumber":1,"longBean":1,"lemongrass":1,"galangal":1,"lime":1,"papaya":1,"mango":1,"banana":1,"coconut":1,"ginger":1,"turmeric":1,"taro":1,"watermelon":1},
    "farmingCare": 2,
    "farmingGiantCells": 4,
    "well": {"bucket":1},
    "fellingGirth": [0,1,2],
    "fellingPerfect": 1,
    "miningDepth": [1,2,3],
    "miningPerfect": 2,
    "felling": {"pine":2,"ironwood":4,"moonwood":6,"elder":12},
    "braced": 1,
    "mining": {"rock":1,"vein":3,"way":5,"crystal":10,"lent":1,"lending":1}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v269>

-- What a picking gives (lib/town/farm's yieldOf): the crop's least to most by the picking's roll, times the plots a
-- plant sown over several stands on (v269), one more with the right blade in the hand.
CREATE OR REPLACE FUNCTION town.yield_of(p_key text, p_plant jsonb, p_hand text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select (((c.crop->'yield'->>0)::int
    + floor(town.roll(p_key, (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint)
        * ((c.crop->'yield'->>1)::int - (c.crop->'yield'->>0)::int + 1)::double precision)::int)
    -- v269: a plant sown over several plots before they became one-plot plants gives for each of them (a giant is
    -- counted where it is picked)
    * case when p_plant->'giant' is distinct from 'true'::jsonb and jsonb_typeof(p_plant->'footprint') = 'array'
        then greatest(1, jsonb_array_length(p_plant->'footprint')) else 1 end
    + case when p_hand is not null
            and p_hand = c.f->'blades'->>(case when (c.crop->>'picks')::int >= (c.f->>'tree')::int then 'tree' else 'plant' end) then 1 else 0 end)::integer
    from (select town.cat('crops')->(p_plant->>'crop') as crop, town.cat('farming') as f) c
$function$;
-- (the function written over keeps the grants it had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select town.cat('gardening')->'shapes'->'blueCorn', town.cat('crops')->'blueCorn'->'yield', town.cat('quality')->'companions'->'fig'->>'shape',
--          town.cat('work')->'farmingCells'->>'blueCorn',
--          town.yield_of('1,1', '{"crop":"blueCorn","sown":0,"picked":0,"footprint":["1,1","2,1","3,1"]}'::jsonb, null) between 6 and 12;
--   -- [[0, 0]], [2, 4], ring, 1, true
