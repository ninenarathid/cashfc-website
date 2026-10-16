-- v265: the insect house (the farm's Quality, piece 4a).
-- Run after v264 and with the matching site code. Safe to run twice.
--
-- The woodworkers' materials make it at the workshop (the catalog's workshop row); it stands on a plot of its owner's
-- bed, one a bed, and has two rooms (lib/town/insect-house). A pollinator or a predator put in a room is spent and
-- covers half the pollen or the guard bar of every plant of the bed within two plots of it (5x5), 48 hours, a rare one
-- 72 and raising their floor while it stays, 24 more when its favourite helper plant stands in reach as it goes in.
--
-- The house is a column of its plot (`town_plots.house`), whose soil is 'house' while it stands, so that nothing is
-- sown, hoed or spread onto it (every deed asks for tilled, cleared or wild ground). Its own deeds are `town_house`:
-- set it down, fill a room, lift it with the hoe. Its cover reaches the plants through the bed's gift (`h`, v259's
-- town.quality_bed_gift), and v259's trigger now counts a house set, filled or lifted as the bed changing, settling
-- what it reaches before. The farm's read brings the house with its plot.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.garden_cross(text,jsonb,text,bigint)') is null or to_regprocedure('town.quality_care(text,jsonb,jsonb,text,jsonb,text,bigint)') is null then raise exception 'Run v263 before v265'; end if;
-- <guards:v265>
 if md5(replace(pg_get_functiondef('town.quality_bed_gift(text,jsonb)'::regprocedure),chr(13),'')) not in ('8dd77c6c43df95ccae8fd812056d087f','d29afceba83dbd003fabecfdc1be2437') then raise exception 'Definition changed: town.quality_bed_gift(text,jsonb); rebuild v265'; end if;
 if md5(replace(pg_get_functiondef('town.quality_accrue(jsonb,bigint,jsonb)'::regprocedure),chr(13),'')) not in ('31050d35db06c0714d8c179c87427559','55a5514c3c13471cc0fd1a8c8b0b6a5a') then raise exception 'Definition changed: town.quality_accrue(jsonb,bigint,jsonb); rebuild v265'; end if;
 if md5(replace(pg_get_functiondef('town.quality_keep()'::regprocedure),chr(13),'')) not in ('e7794b4f2caf0a0ac976db82c501d5da','9a9eddcb2a787a22266bc92a21cb16f0') then raise exception 'Definition changed: town.quality_keep(); rebuild v265'; end if;
 if md5(replace(pg_get_functiondef('public.town_farm(bigint)'::regprocedure),chr(13),'')) not in ('db1ca5eb1705df530d79b70bef92bbe5','6316928886c805a2e0c13d08c6bdeb09') then raise exception 'Definition changed: public.town_farm(bigint); rebuild v265'; end if;
-- </guards:v265>
end $$;

-- <catalog:v265> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
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
    "skies": {"honeyBee":"sun","carpenterBee":"sun","hoverfly":"sun","pollenMidge":"sun","orchardBeetle":"sun","butterflyWhite":"sun","monarch":"sun","morpho":"sun","silkMoth":"moon","moth":"moon","lunaMoth":"moon","hawkMoth":"moon","megaloptaBee":"mist","indianNightBee":"mist","masonBee":"sun","woolCarderBee":"sun","blueBandedBee":"sun","clearwingMoth":"sun","yuccaMoth":"moon","tobaccoHawkmoth":"moon"},
    "house": {"reach":2,"hours":48,"rareHours":72,"favHours":24,"level":0.5,"rooms":2,"rarePays":20,"costs":{"set":1,"room":1,"lift":1},"favourites":{"honeyBee":"clover","carpenterBee":"runnerBean","hoverfly":"dill","pollenMidge":"watercress","silkMoth":"buckwheat","orchardBeetle":"fig","butterflyWhite":"nasturtium","monarch":"marigold","morpho":"gardenStrawberry","moth":"mint","lunaMoth":"rhubarb","hawkMoth":"sesame","lacewing":"buckwheat","goldenAnt":"peanut","mantis":"fennel","ladybird":"chamomile","orchidMantis":"passionfruit","megaloptaBee":"chamomile","indianNightBee":"mint","masonBee":"gardenStrawberry","woolCarderBee":"sesame","blueBandedBee":"watercress","clearwingMoth":"nasturtium","yuccaMoth":"peanut","tobaccoHawkmoth":"garlicChives","ghostMantis":"lavender","snakefly":"borage","tigerBeetle":"clover","assassinBug":"milkweed","robberFly":"buckwheat","antlion":"peanut","roveBeetle":"rhubarb","earwig":"marigold","roseChafer":"borage","oilBeetle":"dill","superworm":"rhubarb","bessBeetle":"fig"},"soilWorkers":["earwig","roseChafer","oilBeetle","superworm","bessBeetle"]},
    "ferts": {"slatePowder":{"slot":"base","bars":{"soil":1}},"biochar":{"slot":"base","bars":{"water":1}},"mineralClay":{"slot":"base","bars":{"water":1}},"chitinPowder":{"slot":"base","bars":{"guard":1}},"forestHumus":{"slot":"base","bars":{"soil":0.5,"water":0.5}},"silkFrass":{"slot":"base","bars":{"soil":0.5,"pollen":0.5}},"woodAsh":{"slot":"base","bars":{"soil":0.5,"guard":0.5}},"lotusSilt":{"slot":"base","bars":{"water":0.5,"pollen":0.5}},"mulch":{"slot":"base","bars":{"water":0.5,"guard":0.5}},"herbPowder":{"slot":"base","bars":{"pollen":0.5,"guard":0.5}},"fishEmulsion":{"slot":"top","bars":{"soil":1},"hours":12},"kitchenFerment":{"slot":"top","bars":{"soil":1},"hours":12},"mineralWater":{"slot":"top","bars":{"water":1},"hours":24},"nectarLure":{"slot":"top","bars":{"pollen":1},"hours":24},"sulphurPowder":{"slot":"top","bars":{"guard":1},"hours":24},"resinWash":{"slot":"top","bars":{"guard":1},"hours":24},"sawdustMulch":{"slot":"top","bars":{"soil":0.5,"water":0.5},"hours":48},"shellMeal":{"slot":"top","bars":{"soil":0.5,"guard":0.5},"hours":24},"shreddedBark":{"slot":"top","bars":{"water":0.5,"guard":0.5},"hours":48},"boneMeal":{"slot":"base","bars":{"soil":1}},"guanoMeal":{"slot":"base","bars":{"pollen":1}},"scalePowder":{"slot":"base","bars":{"soil":1}},"beetleFrass":{"slot":"top","bars":{"soil":0.5,"pollen":0.5},"hours":24},"dewPollen":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":12},"glowPowder":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":12},"packetMist":{"slot":"top","bars":{"water":0.5,"pollen":0.5},"hours":72,"narrows":true},"packetNight":{"slot":"top","bars":{"pollen":0.5,"guard":0.5},"hours":72,"narrows":true}}
  }$town$::jsonb),
  ('items', $town${
    "rod": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "hoe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "can": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "pot": {"kind":"tool","tier":1,"stack":1,"pays":40},
    "pan": {"kind":"tool","tier":1,"stack":1,"pays":35},
    "grill": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "potFull": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "bucket": {"kind":"tool","tier":1,"stack":1,"pays":8},
    "waterYoke": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterYokeGreat": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterCart": {"kind":"tool","tier":1,"stack":1,"pays":0},
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
    "boot": {"kind":"catch","tier":1,"stack":5,"pays":3},
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
    "scrollPestCure": {"kind":"scroll","tier":1,"stack":1,"pays":0},
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
    "loach": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "mosquitofish": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "mussel": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "crayfish": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "goldfish": {"kind":"fish","tier":1,"stack":5,"pays":35},
    "carp": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "piranha": {"kind":"fish","tier":1,"stack":10,"pays":11},
    "herring": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "archerfish": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "pacu": {"kind":"fish","tier":1,"stack":5,"pays":20},
    "pike": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "nilePerch": {"kind":"fish","tier":1,"stack":5,"pays":32},
    "salmon": {"kind":"fish","tier":1,"stack":5,"pays":26},
    "wels": {"kind":"fish","tier":1,"stack":5,"pays":45},
    "gar": {"kind":"fish","tier":1,"stack":5,"pays":42},
    "arapaima": {"kind":"fish","tier":1,"stack":1,"pays":320},
    "dozyFish": {"kind":"dish","tier":1,"stack":5,"pays":2},
    "popotoFish": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rainbowFish": {"kind":"dish","tier":1,"stack":5,"pays":6},
    "moonFish": {"kind":"fish","tier":1,"stack":5,"pays":50},
    "hookScale": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "floatGlow": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "fishChips": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "ukha": {"kind":"dish","tier":1,"stack":5,"pays":17},
    "thieboudienne": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "piranhaSoup": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "crawfishBoil": {"kind":"dish","tier":1,"stack":10,"pays":15},
    "masgouf": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "salmonSteak": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "arapaimaRoast": {"kind":"dish","tier":1,"stack":10,"pays":45},
    "scrollFishChips": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollUkha": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollThieboudienne": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPiranhaSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollCrawfishBoil": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMasgouf": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSalmonSteak": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollArapaimaRoast": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "twig": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "leafMould": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "pineCone": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "feather": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "resin": {"kind":"wild","tier":1,"stack":10,"pays":3},
    "vine": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "bambooCane": {"kind":"wild","tier":1,"stack":10,"pays":2},
    "wildflower": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "clay": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "shiitake": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chanterelle": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "porcini": {"kind":"wild","tier":1,"stack":20,"pays":7},
    "glowMushroom": {"kind":"wild","tier":1,"stack":10,"pays":12},
    "toadstool": {"kind":"wild","tier":1,"stack":20,"pays":0},
    "fiddlehead": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "mint": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "rosemary": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chamomile": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "lavender": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "blueberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "raspberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "wildStrawberry": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "silkCocoon": {"kind":"wild","tier":1,"stack":10,"pays":8},
    "fourLeafClover": {"kind":"wild","tier":1,"stack":5,"pays":40},
    "bambooShoot": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "wildYam": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "truffle": {"kind":"wild","tier":1,"stack":10,"pays":45},
    "ginseng": {"kind":"wild","tier":1,"stack":5,"pays":80},
    "amber": {"kind":"wild","tier":1,"stack":5,"pays":120},
    "mandrake": {"kind":"wild","tier":1,"stack":1,"pays":200},
    "wildApple": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "chestnut": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "wildOrchid": {"kind":"wild","tier":1,"stack":5,"pays":60},
    "moonflower": {"kind":"wild","tier":1,"stack":5,"pays":70},
    "starShard": {"kind":"wild","tier":1,"stack":5,"pays":150},
    "skewer": {"kind":"tool","tier":1,"stack":1,"pays":1},
    "floatFeather": {"kind":"tool","tier":1,"stack":1,"pays":6},
    "lineSpun": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "mulch": {"kind":"goods","tier":1,"stack":20,"pays":3},
    "lavenderSachet": {"kind":"goods","tier":1,"stack":20,"pays":6},
    "mushroomSoup": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "mushroomSkewer": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "fishOnStick": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "roastYam": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "roastedApple": {"kind":"dish","tier":1,"stack":5,"pays":5},
    "mushroomRisotto": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "fernSalad": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "herbTea": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "berryCompote": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "bakedApple": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "roastChestnut": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "forestStew": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "bambooShootStir": {"kind":"dish","tier":1,"stack":5,"pays":13},
    "rosemaryFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "ginsengSoup": {"kind":"dish","tier":1,"stack":5,"pays":34},
    "moonTea": {"kind":"dish","tier":1,"stack":5,"pays":28},
    "truffleEggs": {"kind":"dish","tier":2,"stack":5,"pays":35},
    "mushroomOmelette": {"kind":"dish","tier":2,"stack":5,"pays":15},
    "scrollMushroomSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomSkewer": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishOnStick": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastYam": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomRisotto": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFernSalad": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollHerbTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBerryCompote": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBakedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastChestnut": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollForestStew": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBambooShootStir": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRosemaryFish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGinsengSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMoonTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTruffleEggs": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMushroomOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "bugNet": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "butterflyWhite": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "monarch": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "morpho": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "dragonfly": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "damselfly": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "glassDragonfly": {"kind":"bug","tier":1,"stack":5,"pays":60},
    "grasshopper": {"kind":"bug","tier":2,"stack":20,"pays":2},
    "mantis": {"kind":"bug","tier":1,"stack":10,"pays":7},
    "cicada": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "stickInsect": {"kind":"bug","tier":1,"stack":10,"pays":5},
    "leafInsect": {"kind":"bug","tier":1,"stack":10,"pays":6},
    "firefly": {"kind":"bug","tier":1,"stack":20,"pays":4},
    "orchidMantis": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "moth": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "lunaMoth": {"kind":"bug","tier":1,"stack":5,"pays":50},
    "hawkMoth": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "rhinoBeetle": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "stagBeetle": {"kind":"bug","tier":1,"stack":5,"pays":25},
    "jewelBeetle": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "herculesBeetle": {"kind":"bug","tier":1,"stack":5,"pays":150},
    "ladybird": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "scarab": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "caterpillar": {"kind":"bug","tier":1,"stack":20,"pays":2},
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
    "bowl": {"kind":"tool","tier":1,"stack":3,"pays":3},
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
    "chest": {"kind":"catch","tier":3,"stack":1,"pays":20},
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
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "pick": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "axe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "stone": {"kind":"mineral","tier":1,"stack":50,"pays":0},
    "log": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "timber": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "shardCopper": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardIron": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardSilver": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "oreCopper": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreIron": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreSilver": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "chipRuby": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipSapphire": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAquamarine": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAmber": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipTopaz": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipEmerald": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipDiamond": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipOnyx": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "gemRuby": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemSapphire": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAquamarine": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAmber": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemTopaz": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemEmerald": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemDiamond": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemOnyx": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "torch": {"kind":"goods","tier":1,"stack":10,"pays":0},
    "creekDace": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "torrentBarb": {"kind":"fish","tier":2,"stack":10,"pays":18},
    "stoneLapper": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "glassGoby": {"kind":"fish","tier":2,"stack":10,"pays":17},
    "brookTrout": {"kind":"fish","tier":2,"stack":10,"pays":28},
    "caveBlindfish": {"kind":"fish","tier":3,"stack":10,"pays":32},
    "uplandEel": {"kind":"fish","tier":2,"stack":10,"pays":25},
    "springShrimp": {"kind":"fish","tier":1,"stack":10,"pays":13},
    "riverLamprey": {"kind":"fish","tier":3,"stack":10,"pays":35},
    "marbleMahseer": {"kind":"fish","tier":3,"stack":10,"pays":48},
    "torrentSleeper": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "waterfallSturgeon": {"kind":"fish","tier":3,"stack":10,"pays":75},
    "brookFillet": {"kind":"goods","tier":2,"stack":20,"pays":7},
    "smokedTrout": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "driedDace": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "springStock": {"kind":"goods","tier":3,"stack":20,"pays":14},
    "fishRoe": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "flowFloat": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "springLeader": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "torrentNet": {"kind":"tool","tier":3,"stack":1,"pays":65},
    "shadeLure": {"kind":"bait","tier":3,"stack":5,"pays":18},
    "creekBroth": {"kind":"dish","tier":3,"stack":5,"pays":25},
    "smokedBrookBowl": {"kind":"dish","tier":2,"stack":5,"pays":28},
    "torrentSkewer": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "springDumpling": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "reedMinnow": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "ribbonRasbora": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "pebbleLoach": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "willowShiner": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "sandGudgeon": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "amberChub": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "fernBarbel": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "redfinDace": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "stripedSpinyLoach": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "leafPerch": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "copperBream": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "needleHalfbeak": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "spottedCreekCatfish": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "saffronLoach": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "longfinCreekCarp": {"kind":"fish","tier":3,"stack":10,"pays":42},
    "orchidSnakehead": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "creekDragonfish": {"kind":"fish","tier":3,"stack":10,"pays":72},
    "ancientCreekBarbel": {"kind":"fish","tier":3,"stack":10,"pays":74},
    "silverSpringDace": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rockSculpin": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "mossLoach": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "swiftGrayling": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "bluefinTrout": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "mountainWhitefish": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "cascadeChar": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "graniteGoby": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "windfinMahseer": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "crimsonHillBarb": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "snowlineTrout": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "ridgePike": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "mistSalmon": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "blackstoneEel": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "cloudCrownMahseer": {"kind":"fish","tier":3,"stack":10,"pays":74},
    "thunderbackSturgeon": {"kind":"fish","tier":3,"stack":10,"pays":70},
    "poolMedaka": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "lilyGourami": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "moonspotGoby": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "mossfinPerch": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "roundtailBetta": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "duskFeatherfin": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "petalKillifish": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "caveGlassPerch": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "spottedPoolCatfish": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "ivoryKnifefish": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "jadeSleeper": {"kind":"fish","tier":2,"stack":10,"pays":22},
    "caveRibbonEel": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "violetCaveChar": {"kind":"fish","tier":3,"stack":10,"pays":38},
    "mirrorPoolCarp": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "starfinBichir": {"kind":"fish","tier":3,"stack":10,"pays":42},
    "moonveilArowana": {"kind":"fish","tier":3,"stack":10,"pays":70},
    "crystalCaveDragon": {"kind":"fish","tier":3,"stack":10,"pays":72},
    "reedFishCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "sandbankSkillet": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "fernBarbelStew": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "creekHerbGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "orchidFishHotpot": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "ancientCreekFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
    "springFishCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "bluefinMountainPan": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "cascadeHerbStew": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "ridgeFishGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "mistFishBroth": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "cloudCrownFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
    "lilyPoolCongee": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "duskFishSkillet": {"kind":"dish","tier":2,"stack":5,"pays":22},
    "glassCaveSoup": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "jadeFishGrill": {"kind":"dish","tier":3,"stack":5,"pays":30},
    "mirrorPoolStew": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "moonveilFeast": {"kind":"dish","tier":3,"stack":5,"pays":38},
    "honeyBee": {"kind":"bug","tier":2,"stack":20,"pays":6},
    "carpenterBee": {"kind":"bug","tier":2,"stack":20,"pays":12},
    "lacewing": {"kind":"bug","tier":2,"stack":20,"pays":9},
    "hoverfly": {"kind":"bug","tier":2,"stack":20,"pays":7},
    "silkMoth": {"kind":"bug","tier":3,"stack":20,"pays":16},
    "goldenAnt": {"kind":"bug","tier":2,"stack":20,"pays":8},
    "orchardBeetle": {"kind":"bug","tier":3,"stack":20,"pays":14},
    "pollenMidge": {"kind":"bug","tier":2,"stack":20,"pays":10},
    "honeycomb": {"kind":"staple","tier":2,"stack":20,"pays":16},
    "gardenHoney": {"kind":"staple","tier":2,"stack":20,"pays":13},
    "beeswax": {"kind":"goods","tier":2,"stack":20,"pays":19},
    "silkTwist": {"kind":"goods","tier":3,"stack":20,"pays":21},
    "silkenCord": {"kind":"goods","tier":3,"stack":20,"pays":34},
    "chitinPlate": {"kind":"goods","tier":3,"stack":20,"pays":21},
    "nectarSyrup": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "routeLens": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "scentSatchel": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "nectarVial": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "releaseCage": {"kind":"tool","tier":2,"stack":1,"pays":29},
    "pollenFan": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "pestWhistle": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "nectarRice": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "honeyHerbTea": {"kind":"dish","tier":2,"stack":20,"pays":23},
    "pollenCake": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "orchardSoup": {"kind":"dish","tier":3,"stack":20,"pays":210},
    "forestLichen": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "fragrantPetal": {"kind":"wild","tier":2,"stack":20,"pays":6},
    "flowerBulb": {"kind":"wild","tier":2,"stack":20,"pays":11},
    "bambooSheath": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "fernTip": {"kind":"wild","tier":2,"stack":20,"pays":7},
    "wildMedicRoot": {"kind":"wild","tier":3,"stack":20,"pays":14},
    "berryPip": {"kind":"wild","tier":2,"stack":20,"pays":10},
    "mushroomSpores": {"kind":"wild","tier":2,"stack":20,"pays":9},
    "lichenSalt": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "petalDye": {"kind":"goods","tier":2,"stack":20,"pays":16},
    "bulbPowder": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "driedFern": {"kind":"staple","tier":2,"stack":20,"pays":17},
    "rootExtract": {"kind":"staple","tier":3,"stack":20,"pays":24},
    "berrySeedOil": {"kind":"staple","tier":2,"stack":20,"pays":22},
    "sporeCulture": {"kind":"staple","tier":2,"stack":20,"pays":23},
    "traceLens": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "pruningKnife": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "rootSpade": {"kind":"tool","tier":2,"stack":1,"pays":31},
    "seedSieve": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "specimenPress": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "forageBasket": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "fernRice": {"kind":"dish","tier":2,"stack":20,"pays":25},
    "rootStew": {"kind":"dish","tier":3,"stack":20,"pays":85},
    "petalBiscuit": {"kind":"dish","tier":2,"stack":20,"pays":27},
    "sporeNoodles": {"kind":"dish","tier":2,"stack":20,"pays":29},
    "springSample": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "rushingSample": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "riverGrit": {"kind":"mineral","tier":2,"stack":20,"pays":5},
    "mineralSand": {"kind":"mineral","tier":2,"stack":20,"pays":9},
    "mossFilter": {"kind":"wild","tier":2,"stack":20,"pays":5},
    "wetClay": {"kind":"mineral","tier":2,"stack":20,"pays":6},
    "reedPith": {"kind":"wild","tier":2,"stack":20,"pays":7},
    "waterMint": {"kind":"wild","tier":2,"stack":20,"pays":8},
    "clearSpring": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "herbalWater": {"kind":"staple","tier":2,"stack":20,"pays":18},
    "mineralWater": {"kind":"staple","tier":2,"stack":20,"pays":21},
    "dawnBlend": {"kind":"staple","tier":3,"stack":20,"pays":25},
    "rainBlend": {"kind":"staple","tier":3,"stack":20,"pays":23},
    "moonBlend": {"kind":"staple","tier":3,"stack":20,"pays":28},
    "springSalt": {"kind":"staple","tier":2,"stack":20,"pays":19},
    "waterSampler": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "sluiceKey": {"kind":"tool","tier":2,"stack":1,"pays":33},
    "filterFrame": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "mixingJug": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "sealedFlask": {"kind":"tool","tier":3,"stack":1,"pays":38},
    "flowGauge": {"kind":"tool","tier":2,"stack":1,"pays":29},
    "springRice": {"kind":"dish","tier":2,"stack":20,"pays":26},
    "mintBroth": {"kind":"dish","tier":2,"stack":20,"pays":29},
    "mineralCongee": {"kind":"dish","tier":3,"stack":20,"pays":31},
    "moonTeaRice": {"kind":"dish","tier":3,"stack":20,"pays":35},
    "dicedRoot": {"kind":"staple","tier":2,"stack":20,"pays":8},
    "emberRice": {"kind":"staple","tier":2,"stack":20,"pays":9},
    "brownedOnion": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "driedZest": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "crushedHerb": {"kind":"staple","tier":2,"stack":20,"pays":10},
    "fishStock": {"kind":"staple","tier":2,"stack":20,"pays":13},
    "roastedSeed": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "whiskedEgg": {"kind":"staple","tier":2,"stack":20,"pays":12},
    "fragrantOil": {"kind":"staple","tier":2,"stack":20,"pays":18},
    "smokedSalt": {"kind":"staple","tier":2,"stack":20,"pays":17},
    "fermentStarter": {"kind":"staple","tier":3,"stack":20,"pays":20},
    "brightSauce": {"kind":"staple","tier":3,"stack":20,"pays":22},
    "thickBroth": {"kind":"staple","tier":3,"stack":20,"pays":22},
    "sweetGlaze": {"kind":"staple","tier":3,"stack":20,"pays":23},
    "spicePaste": {"kind":"staple","tier":3,"stack":20,"pays":24},
    "prepBoard": {"kind":"tool","tier":2,"stack":1,"pays":31},
    "tastingSpoon": {"kind":"tool","tier":2,"stack":1,"pays":32},
    "scentLid": {"kind":"tool","tier":2,"stack":1,"pays":34},
    "heatBell": {"kind":"tool","tier":2,"stack":1,"pays":35},
    "fermentCrock": {"kind":"tool","tier":3,"stack":1,"pays":38},
    "cookTimer": {"kind":"tool","tier":3,"stack":1,"pays":36},
    "layeredRootPot": {"kind":"dish","tier":3,"stack":20,"pays":33},
    "crispRiceSkillet": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "slowFishBroth": {"kind":"dish","tier":3,"stack":20,"pays":36},
    "glazedForestBowl": {"kind":"dish","tier":3,"stack":20,"pays":37},
    "scrollLayeredRootPot": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollCrispRiceSkillet": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollSlowFishBroth": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollGlazedForestBowl": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "trailRation": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "mintPoultice": {"kind":"goods","tier":2,"stack":20,"pays":19},
    "repairBundle": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "seedPacket": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "waterPack": {"kind":"goods","tier":2,"stack":20,"pays":20},
    "dryTinder": {"kind":"goods","tier":2,"stack":20,"pays":16},
    "campCanvas": {"kind":"goods","tier":2,"stack":20,"pays":22},
    "signalCord": {"kind":"goods","tier":2,"stack":20,"pays":18},
    "warmBlanket": {"kind":"goods","tier":3,"stack":20,"pays":27},
    "fieldBandage": {"kind":"goods","tier":3,"stack":20,"pays":25},
    "travelBiscuit": {"kind":"goods","tier":3,"stack":20,"pays":24},
    "sharedTea": {"kind":"goods","tier":3,"stack":20,"pays":25},
    "soilCarePack": {"kind":"goods","tier":3,"stack":20,"pays":26},
    "toolCareOil": {"kind":"goods","tier":3,"stack":20,"pays":26},
    "trailMarker": {"kind":"goods","tier":3,"stack":20,"pays":27},
    "campKit": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "provisionChest": {"kind":"tool","tier":2,"stack":1,"pays":38},
    "fieldKettle": {"kind":"tool","tier":2,"stack":1,"pays":36},
    "campLantern": {"kind":"tool","tier":3,"stack":1,"pays":39},
    "weatherAwning": {"kind":"tool","tier":3,"stack":1,"pays":43},
    "signalPennant": {"kind":"tool","tier":3,"stack":1,"pays":41},
    "sharePorridge": {"kind":"dish","tier":3,"stack":20,"pays":31},
    "travelerSoup": {"kind":"dish","tier":3,"stack":20,"pays":33},
    "friendRice": {"kind":"dish","tier":3,"stack":20,"pays":35},
    "restTea": {"kind":"dish","tier":3,"stack":20,"pays":34},
    "scrollSharePorridge": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollTravelerSoup": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollFriendRice": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollRestTea": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollSpringRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollMintBroth": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollMineralCongee": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollMoonTeaRice": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollFernRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollRootStew": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollPetalBiscuit": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollSporeNoodles": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollNectarRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollHoneyHerbTea": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollPollenCake": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollOrchardSoup": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "knottedWood": {"kind":"wood","tier":2,"stack":20,"pays":3},
    "straightWood": {"kind":"wood","tier":2,"stack":20,"pays":5},
    "heartwood": {"kind":"wood","tier":3,"stack":20,"pays":8},
    "pineBark": {"kind":"wood","tier":2,"stack":20,"pays":2},
    "pinePitch": {"kind":"wood","tier":2,"stack":20,"pays":4},
    "pineNut": {"kind":"wood","tier":2,"stack":20,"pays":4},
    "rootFiber": {"kind":"wood","tier":2,"stack":20,"pays":3},
    "cedarSliver": {"kind":"wood","tier":3,"stack":20,"pays":12},
    "splitPlank": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "carvingBlank": {"kind":"goods","tier":2,"stack":20,"pays":7},
    "pitchSeal": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "sapSyrup": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "pineNutFlour": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "rootTwine": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "woodOil": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "notchGauge": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "grainLens": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "fellingWedge": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "barkKnife": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "sapTap": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "braceStake": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "pineNutRice": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "cedarBroth": {"kind":"dish","tier":3,"stack":20,"pays":24},
    "pineNutCake": {"kind":"dish","tier":2,"stack":20,"pays":20},
    "sapGlazedFish": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "bottleGourd": {"kind":"crop","tier":2,"stack":20,"pays":125},
    "rowBean": {"kind":"crop","tier":2,"stack":20,"pays":40},
    "trellisBerry": {"kind":"crop","tier":3,"stack":20,"pays":190},
    "blueCorn": {"kind":"crop","tier":3,"stack":20,"pays":170},
    "teaBush": {"kind":"crop","tier":3,"stack":20,"pays":45},
    "sunflowerPatch": {"kind":"crop","tier":2,"stack":20,"pays":60},
    "redOkra": {"kind":"crop","tier":2,"stack":20,"pays":42},
    "lotusRootBed": {"kind":"crop","tier":2,"stack":20,"pays":160},
    "gourdCup": {"kind":"goods","tier":2,"stack":20,"pays":145},
    "beanPaste": {"kind":"staple","tier":2,"stack":20,"pays":70},
    "berryJam": {"kind":"staple","tier":3,"stack":20,"pays":335},
    "blueCornFlour": {"kind":"staple","tier":3,"stack":20,"pays":295},
    "driedTea": {"kind":"staple","tier":3,"stack":20,"pays":80},
    "sunflowerOil": {"kind":"staple","tier":2,"stack":20,"pays":105},
    "lotusStarch": {"kind":"staple","tier":2,"stack":20,"pays":280},
    "pollenBrush": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "graftKnife": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "rootGuide": {"kind":"tool","tier":2,"stack":1,"pays":20},
    "soilScoop": {"kind":"tool","tier":2,"stack":1,"pays":23},
    "seedTray": {"kind":"tool","tier":2,"stack":1,"pays":22},
    "gardenTwine": {"kind":"tool","tier":2,"stack":1,"pays":21},
    "pollenRice": {"kind":"dish","tier":2,"stack":20,"pays":35},
    "berryTea": {"kind":"dish","tier":3,"stack":20,"pays":165},
    "blueCornCake": {"kind":"dish","tier":3,"stack":20,"pays":275},
    "lotusGardenSoup": {"kind":"dish","tier":2,"stack":20,"pays":270},
    "seedBottleGourd": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedRowBean": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedTrellisBerry": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedBlueCorn": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedTeaBush": {"kind":"seed","tier":3,"stack":20,"pays":4},
    "seedSunflowerPatch": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedRedOkra": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "seedLotusRootBed": {"kind":"seed","tier":2,"stack":20,"pays":4},
    "runnerBean": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "peanut": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "buckwheat": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "sesame": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "clover": {"kind":"crop","tier":1,"stack":20,"pays":2},
    "gardenStrawberry": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "rhubarb": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "watercress": {"kind":"crop","tier":1,"stack":20,"pays":2},
    "fig": {"kind":"crop","tier":1,"stack":20,"pays":6},
    "borage": {"kind":"crop","tier":1,"stack":20,"pays":2},
    "passionfruit": {"kind":"crop","tier":1,"stack":20,"pays":5},
    "milkweed": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "fennel": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "marigold": {"kind":"crop","tier":1,"stack":20,"pays":2},
    "nasturtium": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "garlicChives": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "dill": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "pearlNut": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "silverGrain": {"kind":"crop","tier":3,"stack":20,"pays":12},
    "dewSesame": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "glassFlower": {"kind":"crop","tier":3,"stack":20,"pays":8},
    "opalStalk": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "crystalLeaf": {"kind":"crop","tier":3,"stack":20,"pays":8},
    "dewFig": {"kind":"crop","tier":3,"stack":20,"pays":24},
    "silkPollen": {"kind":"crop","tier":3,"stack":20,"pays":12},
    "insectHouse": {"kind":"tool","tier":2,"stack":20,"pays":30},
    "slatePowder": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "biochar": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "mineralClay": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "chitinPowder": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "forestHumus": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "silkFrass": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "woodAsh": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "lotusSilt": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "herbPowder": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "fishEmulsion": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "kitchenFerment": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "nectarLure": {"kind":"goods","tier":2,"stack":20,"pays":9},
    "sulphurPowder": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "resinWash": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "sawdustMulch": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "shellMeal": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "shreddedBark": {"kind":"goods","tier":2,"stack":20,"pays":3},
    "boneMeal": {"kind":"goods","tier":2,"stack":20,"pays":11},
    "guanoMeal": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "scalePowder": {"kind":"goods","tier":3,"stack":20,"pays":32},
    "beetleFrass": {"kind":"goods","tier":2,"stack":20,"pays":2},
    "dewPollen": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "glowPowder": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "packetMist": {"kind":"goods","tier":3,"stack":20,"pays":72},
    "packetNight": {"kind":"goods","tier":3,"stack":20,"pays":75},
    "seedRunnerBean": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedPeanut": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedBuckwheat": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedSesame": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedClover": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedGardenStrawberry": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedRhubarb": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedWatercress": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedFig": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedBorage": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedPassionfruit": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedMilkweed": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedFennel": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedMarigold": {"kind":"seed","tier":1,"stack":10,"pays":1},
    "seedNasturtium": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedGarlicChives": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedDill": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedPearlNut": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedSilverGrain": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedDewSesame": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedGlassFlower": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedOpalStalk": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedCrystalLeaf": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedDewFig": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedSilkPollen": {"kind":"seed","tier":3,"stack":10,"pays":0},
    "seedMint": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedChamomile": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "seedLavender": {"kind":"seed","tier":1,"stack":10,"pays":0},
    "scrollPollenRice": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollBerryTea": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollBlueCornCake": {"kind":"scroll","tier":3,"stack":20,"pays":12},
    "scrollLotusGardenSoup": {"kind":"scroll","tier":2,"stack":20,"pays":12},
    "scrollPineNutRice": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCedarBroth": {"kind":"scroll","tier":3,"stack":1,"pays":12},
    "scrollPineNutCake": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSapGlazedFish": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "slateLayer": {"kind":"mineral","tier":2,"stack":20,"pays":3},
    "clayPocket": {"kind":"mineral","tier":2,"stack":20,"pays":3},
    "quartzCore": {"kind":"mineral","tier":2,"stack":20,"pays":6},
    "pyriteCluster": {"kind":"mineral","tier":2,"stack":20,"pays":5},
    "copperNodule": {"kind":"mineral","tier":2,"stack":20,"pays":7},
    "ironNodule": {"kind":"mineral","tier":2,"stack":20,"pays":8},
    "silverNodule": {"kind":"mineral","tier":3,"stack":20,"pays":12},
    "mineralSalt": {"kind":"staple","tier":2,"stack":20,"pays":4},
    "wholeGeode": {"kind":"mineral","tier":3,"stack":20,"pays":15},
    "stoneTile": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "crystalLens": {"kind":"goods","tier":2,"stack":20,"pays":8},
    "sparkPowder": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "copperBlank": {"kind":"goods","tier":2,"stack":20,"pays":9},
    "steelPlate": {"kind":"goods","tier":2,"stack":20,"pays":10},
    "geodeDisplay": {"kind":"goods","tier":3,"stack":20,"pays":22},
    "echoHammer": {"kind":"tool","tier":2,"stack":1,"pays":25},
    "cavityLens": {"kind":"tool","tier":2,"stack":1,"pays":28},
    "crystalWrap": {"kind":"tool","tier":2,"stack":1,"pays":22},
    "oreSieve": {"kind":"tool","tier":2,"stack":1,"pays":26},
    "seamChisel": {"kind":"tool","tier":2,"stack":1,"pays":27},
    "surveyCord": {"kind":"tool","tier":2,"stack":1,"pays":24},
    "minerRice": {"kind":"dish","tier":2,"stack":20,"pays":18},
    "caveStew": {"kind":"dish","tier":2,"stack":20,"pays":22},
    "saltRoast": {"kind":"dish","tier":2,"stack":20,"pays":24},
    "seamCake": {"kind":"dish","tier":2,"stack":20,"pays":20},
    "scrollMinerRice": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCaveStew": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSaltRoast": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSeamCake": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollCreekBroth": {"kind":"scroll","tier":3,"stack":1,"pays":12},
    "scrollSmokedBrookBowl": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollTorrentSkewer": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollSpringDumpling": {"kind":"scroll","tier":2,"stack":1,"pays":12},
    "scrollReedFishCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollSandbankSkillet": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollFernBarbelStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollCreekHerbGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollOrchidFishHotpot": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollAncientCreekFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollSpringFishCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollBluefinMountainPan": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollCascadeHerbStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollRidgeFishGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMistFishBroth": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollCloudCrownFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollLilyPoolCongee": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollDuskFishSkillet": {"kind":"scroll","tier":2,"stack":5,"pays":22},
    "scrollGlassCaveSoup": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollJadeFishGrill": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMirrorPoolStew": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "scrollMoonveilFeast": {"kind":"scroll","tier":3,"stack":5,"pays":28},
    "megaloptaBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "ghostMantis": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "railroadWorm": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "indianNightBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "snakefly": {"kind":"bug","tier":3,"stack":5,"pays":24},
    "earwig": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "masonBee": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "tigerBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "roseChafer": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "woolCarderBee": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "oilBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "assassinBug": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "blueBandedBee": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "robberFly": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "superworm": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "clearwingMoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "antlion": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "bessBeetle": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "yuccaMoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "roveBeetle": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "cucujoBeetle": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "tobaccoHawkmoth": {"kind":"bug","tier":2,"stack":10,"pays":7},
    "blueGhostFirefly": {"kind":"bug","tier":3,"stack":5,"pays":24},
    "californiaGlowworm": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "pearlDanio": {"kind":"fish","tier":3,"stack":5,"pays":110},
    "peacockGudgeon": {"kind":"fish","tier":3,"stack":10,"pays":60},
    "huchen": {"kind":"fish","tier":3,"stack":5,"pays":90},
    "forktailBlueEye": {"kind":"fish","tier":3,"stack":10,"pays":30},
    "empireGudgeon": {"kind":"fish","tier":3,"stack":10,"pays":40},
    "lenok": {"kind":"fish","tier":3,"stack":10,"pays":50},
    "zebrafish": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "europeanChub": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "arcticChar": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "rosyBitterling": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "pumpkinseed": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "europeanGrayling": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "leastKillifish": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "australianBass": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "lakeWhitefish": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "tench": {"kind":"fish","tier":2,"stack":10,"pays":14},
    "goldenDorado": {"kind":"fish","tier":3,"stack":5,"pays":90},
    "europeanBullhead": {"kind":"fish","tier":2,"stack":10,"pays":8},
    "glassKnifefish": {"kind":"fish","tier":3,"stack":5,"pays":110},
    "tigerShovelnose": {"kind":"fish","tier":2,"stack":10,"pays":34},
    "burbot": {"kind":"fish","tier":2,"stack":10,"pays":34},
    "elephantnoseFish": {"kind":"fish","tier":3,"stack":10,"pays":60},
    "freshwaterSole": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "dollyVarden": {"kind":"fish","tier":2,"stack":10,"pays":24},
    "mistMushroom": {"kind":"wild","tier":3,"stack":5,"pays":60},
    "queenPollen": {"kind":"wild","tier":3,"stack":10,"pays":45},
    "morningDew": {"kind":"wild","tier":2,"stack":20,"pays":6},
    "batGuano": {"kind":"mineral","tier":2,"stack":20,"pays":8}
  }$town$::jsonb),
  ('workshop', $town${
    "cost": 4,
    "recipes": {"jar":{"needs":[["clay",6],["stone",2]],"fee":45},"wok":{"needs":[["oreIron",3],["timber",1]],"fee":80},"apron":{"needs":[["silkCocoon",4],["vine",2]],"fee":40},"mortar":{"needs":[["stone",8],["timber",1]],"fee":55},"sickle":{"needs":[["oreIron",2],["timber",1]],"fee":50},"cleaver":{"needs":[["oreIron",3],["timber",1],["resin",1]],"fee":55},"hoeIron":{"needs":[["oreIron",4],["timber",2]],"fee":75},"rodTeak":{"needs":[["timber",3],["silkCocoon",3],["oreIron",1]],"fee":90},"steamer":{"needs":[["bambooCane",4],["vine",2]],"fee":70},"netSmall":{"needs":[["bambooCane",2],["silkCocoon",4]],"fee":45},"sushiMat":{"needs":[["bambooCane",3],["vine",3]],"fee":50},"canCopper":{"needs":[["oreCopper",4],["resin",1]],"fee":60},"hookSteel":{"needs":[["oreIron",2],["charcoal",1]],"fee":40},"lineBraid":{"needs":[["silkCocoon",4],["vine",2]],"fee":40},"stoneBowl":{"needs":[["stone",6],["clay",2]],"fee":70},"bucketIron":{"needs":[["oreIron",4],["timber",1]],"fee":30},"floatQuill":{"needs":[["feather",4],["bambooCane",1],["resin",1]],"fee":40},"rollingPin":{"needs":[["timber",2],["resin",1]],"fee":45},"tok":{"needs":[["bambooCane",6],["rope",2]],"fee":60},"oven":{"needs":[["clay",12],["stone",8],["oreIron",2]],"fee":240},"ladle":{"needs":[["timber",2],["oreCopper",1]],"fee":20},"hotpot":{"needs":[["oreCopper",6],["oreIron",3],["charcoal",2]],"fee":200},"shears":{"needs":[["oreIron",4],["charcoal",2],["timber",1]],"fee":110},"netLong":{"needs":[["bambooCane",4],["silkCocoon",8],["rope",2]],"fee":100},"canBrass":{"needs":[["oreCopper",6],["oreSilver",2],["resin",2]],"fee":140},"hoeSteel":{"needs":[["oreIron",6],["charcoal",3],["timber",3]],"fee":160},"hookTwin":{"needs":[["oreIron",4],["oreSilver",1],["charcoal",2]],"fee":90},"lineSilk":{"needs":[["silkCocoon",8],["resin",2],["vine",2]],"fee":90},"panBrass":{"needs":[["oreCopper",6],["oreSilver",2],["timber",2]],"fee":170},"potBrass":{"needs":[["oreCopper",8],["oreSilver",2]],"fee":180},"stoveBig":{"needs":[["clay",10],["oreIron",5],["stone",4]],"fee":150},"floatBell":{"needs":[["oreCopper",2],["oreSilver",1],["bambooCane",2]],"fee":90},"rodMaster":{"needs":[["timber",6],["silkCocoon",6],["oreSilver",2]],"fee":220},"steamerBamboo":{"needs":[["bambooCane",8],["rope",2],["timber",2]],"fee":130},"notchGauge":{"needs":[["splitPlank",2],["oreCopper",1]],"fee":24},"grainLens":{"needs":[["carvingBlank",2],["oreSilver",2],["cedarSliver",1]],"fee":40},"fellingWedge":{"needs":[["oreIron",2],["knottedWood",2],["pitchSeal",1]],"fee":26},"barkKnife":{"needs":[["oreIron",2],["splitPlank",1],["rootTwine",1]],"fee":25},"sapTap":{"needs":[["oreCopper",2],["pineBark",2],["pitchSeal",1]],"fee":25},"braceStake":{"needs":[["carvingBlank",2],["rootTwine",2]],"fee":30},"pollenBrush":{"needs":[["feather",3],["splitPlank",1]],"fee":24},"graftKnife":{"needs":[["steelPlate",1],["gourdCup",1]],"fee":25},"rootGuide":{"needs":[["splitPlank",2],["rootTwine",1]],"fee":20},"soilScoop":{"needs":[["copperBlank",1],["timber",1]],"fee":23},"seedTray":{"needs":[["splitPlank",2],["pitchSeal",1]],"fee":22},"gardenTwine":{"needs":[["rootTwine",2],["splitPlank",1]],"fee":21},"seedBottleGourd":{"needs":[["pumpkin",2],["compost",1]],"fee":4},"seedRowBean":{"needs":[["longBean",2],["compost",1]],"fee":4},"seedTrellisBerry":{"needs":[["wildStrawberry",2],["compost",1]],"fee":4},"seedBlueCorn":{"needs":[["corn",2],["compost",1]],"fee":4},"seedTeaBush":{"needs":[["basil",2],["compost",1]],"fee":4},"seedSunflowerPatch":{"needs":[["corn",2],["oil",1]],"fee":4},"seedRedOkra":{"needs":[["chili",2],["compost",1]],"fee":4},"seedLotusRootBed":{"needs":[["taro",2],["compost",1]],"fee":4},"echoHammer":{"needs":[["copperBlank",2],["timber",1]],"fee":25},"cavityLens":{"needs":[["crystalLens",1],["copperBlank",1]],"fee":28},"crystalWrap":{"needs":[["silkCocoon",4],["rootTwine",1]],"fee":22},"oreSieve":{"needs":[["steelPlate",2],["rootTwine",1]],"fee":26},"seamChisel":{"needs":[["steelPlate",2],["sparkPowder",1]],"fee":27},"surveyCord":{"needs":[["rootTwine",2],["copperBlank",1]],"fee":24},"routeLens":{"needs":[["crystalLens",1],["splitPlank",1]],"fee":28},"scentSatchel":{"needs":[["silkenCord",1],["basil",3]],"fee":27},"nectarVial":{"needs":[["nectarSyrup",1],["beeswax",1]],"fee":26},"releaseCage":{"needs":[["bambooShoot",3],["silkenCord",1]],"fee":29},"pollenFan":{"needs":[["chitinPlate",1],["rootTwine",1]],"fee":25},"pestWhistle":{"needs":[["carvingBlank",1],["beeswax",1]],"fee":30},"traceLens":{"needs":[["crystalLens",1],["carvingBlank",1]],"fee":30},"pruningKnife":{"needs":[["oreIron",2],["splitPlank",1],["petalDye",1]],"fee":26},"rootSpade":{"needs":[["oreIron",2],["heartwood",1],["berrySeedOil",1]],"fee":31},"seedSieve":{"needs":[["bambooSheath",3],["rootTwine",1]],"fee":27},"specimenPress":{"needs":[["splitPlank",2],["petalDye",1],["silkenCord",1]],"fee":28},"forageBasket":{"needs":[["bambooSheath",4],["silkenCord",2],["beeswax",1]],"fee":32},"waterSampler":{"needs":[["wetClay",3],["beeswax",1]],"fee":30},"sluiceKey":{"needs":[["oreIron",3],["heartwood",1],["riverGrit",2]],"fee":33},"filterFrame":{"needs":[["reedPith",3],["mossFilter",2],["silkenCord",1]],"fee":35},"mixingJug":{"needs":[["wetClay",4],["petalDye",1]],"fee":32},"sealedFlask":{"needs":[["wetClay",3],["beeswax",2],["rootTwine",1]],"fee":38},"flowGauge":{"needs":[["reedPith",2],["splitPlank",1],["oreCopper",1]],"fee":29},"prepBoard":{"needs":[["splitPlank",2],["oreIron",1]],"fee":31},"tastingSpoon":{"needs":[["heartwood",1],["petalDye",1]],"fee":32},"scentLid":{"needs":[["oreCopper",3],["resin",1]],"fee":34},"heatBell":{"needs":[["oreCopper",2],["oreSilver",1],["reedPith",1]],"fee":35},"fermentCrock":{"needs":[["wetClay",5],["sporeCulture",1],["silkenCord",1]],"fee":38},"cookTimer":{"needs":[["splitPlank",2],["oreCopper",2],["crystalLens",1]],"fee":36},"trailRation":{"needs":[["emberRice",2],["driedFern",1]],"fee":18},"mintPoultice":{"needs":[["waterMint",2],["silkCocoon",1]],"fee":19},"repairBundle":{"needs":[["splitPlank",1],["rootTwine",1]],"fee":20},"seedPacket":{"needs":[["berryPip",2],["bambooSheath",1]],"fee":18},"waterPack":{"needs":[["clearSpring",2],["reedPith",1]],"fee":20},"dryTinder":{"needs":[["pineBark",2],["resin",1]],"fee":16},"campCanvas":{"needs":[["silkCocoon",3],["silkenCord",1]],"fee":22},"signalCord":{"needs":[["rootTwine",2],["petalDye",1]],"fee":18},"warmBlanket":{"needs":[["campCanvas",2],["mossFilter",1]],"fee":27},"fieldBandage":{"needs":[["mintPoultice",1],["campCanvas",1]],"fee":25},"travelBiscuit":{"needs":[["bulbPowder",1],["sweetGlaze",1]],"fee":24},"sharedTea":{"needs":[["herbalWater",2],["waterMint",1]],"fee":25},"soilCarePack":{"needs":[["seedPacket",1],["compost",2]],"fee":26},"toolCareOil":{"needs":[["berrySeedOil",1],["rootExtract",1]],"fee":26},"trailMarker":{"needs":[["splitPlank",1],["signalCord",1]],"fee":27},"campKit":{"needs":[["campCanvas",2],["splitPlank",2],["signalCord",1]],"fee":40},"provisionChest":{"needs":[["splitPlank",4],["oreIron",1]],"fee":38},"fieldKettle":{"needs":[["oreCopper",3],["heartwood",1]],"fee":36},"campLantern":{"needs":[["oreCopper",2],["beeswax",2],["crystalLens",1]],"fee":39},"weatherAwning":{"needs":[["campCanvas",3],["splitPlank",2]],"fee":43},"signalPennant":{"needs":[["splitPlank",1],["signalCord",2],["petalDye",1]],"fee":41},"insectHouse":{"needs":[["splitPlank",3],["carvingBlank",1],["pitchSeal",1]],"fee":30}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v265>

alter table public.town_plots add column if not exists house jsonb;
do $$ declare c text; begin
 for c in select conname from pg_constraint where conrelid='public.town_plots'::regclass and contype='c' and pg_get_constraintdef(oid) like '%soil%' loop
  execute format('alter table public.town_plots drop constraint %I', c);
 end loop;
end $$;
alter table public.town_plots add constraint town_plots_soil_check check (soil in ('wild','cleared','tilled','house'));

-- What an insect does in a house (lib/town/insect-house's houseRoleOf): pollen, guard, soil, or null.
create or replace function town.house_role(p_bug text)
returns text language sql stable set search_path='' as $$
 select case when p_bug is null then null
  when town.cat('insect_garden')->'pollinators' ? p_bug then 'pollen'
  when town.cat('insect_garden')->'predators' ? p_bug then 'guard'
  when town.cat('quality')->'house'->'soilWorkers' ? p_bug then 'soil' end
$$;

-- Whether a house insect is rare (isRareInHouse): what the relatives pay for it, the rare insects' mark and more.
create or replace function town.house_rare(p_bug text)
returns boolean language sql stable set search_path='' as $$
 select coalesce((town.cat('items')->p_bug->>'pays')::numeric,0)>=(town.cat('quality')->'house'->>'rarePays')::numeric
$$;

-- Whether a plot is in a house's reach (inReach): two plots or fewer each way, of its bed.
create or replace function town.house_reach(p_house text, p_cell text)
returns boolean language sql stable set search_path='' as $$
 select abs(split_part(p_house,',',1)::integer-split_part(p_cell,',',1)::integer)<=(town.cat('quality')->'house'->>'reach')::integer
    and abs(split_part(p_house,',',2)::integer-split_part(p_cell,',',2)::integer)<=(town.cat('quality')->'house'->>'reach')::integer
    and town.bed_of(split_part(p_house,',',1)::integer,split_part(p_house,',',2)::integer)=town.bed_of(split_part(p_cell,',',1)::integer,split_part(p_cell,',',2)::integer)
$$;

-- Whether an insect's favourite plant stands in the house's reach (favouriteNear).
create or replace function town.house_fav_near(p_house text, p_bug text, p_plots jsonb)
returns boolean language sql stable set search_path='' as $$
 select coalesce(town.cat('quality')->'house'->'favourites'->>p_bug is not null and exists(
  select 1 from jsonb_each(p_plots) e
   where jsonb_typeof(e.value->'plant')='object' and (e.value->'plant'->>'root' is null or e.value->'plant'->>'root'=e.key)
     and e.value->'plant'->>'crop'=town.cat('quality')->'house'->'favourites'->>p_bug
     and exists(select 1 from jsonb_array_elements_text(coalesce(e.value->'plant'->'footprint',jsonb_build_array(e.key))) c where town.house_reach(p_house,c))),false)
$$;

-- The first room an insect may go into (freeRoom): an empty one, or one whose insect has left; -1 when both are lived in.
create or replace function town.house_free(p_house jsonb, p_now bigint)
returns integer language sql stable set search_path='' as $$
 select coalesce((select (r.i-1)::integer from jsonb_array_elements(p_house->'rooms') with ordinality r(v,i)
   where r.v='null'::jsonb or (r.v->>'until')::bigint<=p_now order by r.i limit 1),-1)
$$;

-- What the thing in the hand does at a plot with a house in mind (houseDeedFor). `p_plots`: the bed's plots, by key.
create or replace function town.house_deed_for(p_key text, p_plots jsonb, p_hand text, p_me text, p_owner text, p_now bigint)
returns text language plpgsql stable set search_path='' as $$
declare plot jsonb:=p_plots->p_key; house jsonb:=p_plots->p_key->'house'; bed integer;
begin
 if jsonb_typeof(house)='object' then
  -- (one left by whoever no longer holds the bed is the bed's owner's to lift with a hoe, as a plant left there is theirs
  -- to dig out: it goes to their bag)
  if house->>'by' is distinct from p_me then
   return case when p_owner=p_me and house->>'by' is distinct from p_owner and coalesce(town.tool_of(p_hand),'')='hoe' then 'lift' end;
  end if;
  if coalesce(town.tool_of(p_hand),'')='hoe' then return 'lift'; end if;
  return case when town.house_role(p_hand) is not null and town.house_free(house,p_now)>=0 then 'room' end;
 end if;
 if p_hand is distinct from 'insectHouse' or p_owner is distinct from p_me or plot is null
    or coalesce(plot->'plant','null'::jsonb)<>'null'::jsonb or coalesce(plot->>'soil','') not in ('tilled','cleared') then return null; end if;
 bed:=town.bed_of(split_part(p_key,',',1)::integer,split_part(p_key,',',2)::integer);
 if exists(select 1 from jsonb_each(p_plots) e where jsonb_typeof(e.value->'house')='object'
    and town.bed_of(split_part(e.key,',',1)::integer,split_part(e.key,',',2)::integer)=bed) then return null; end if;
 return 'house';
end $$;

-- Do it (houseDo): what the purse and the plot are after. Lifting gives the house back; the insects in it are spent.
create or replace function town.house_do(p_key text, p_plots jsonb, p_purse jsonb, p_me text, p_owner text, p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 h jsonb:=town.cat('quality')->'house'; hand_ text:=town.hand_of(p_purse); deed_ text; plot jsonb:=p_plots->p_key; house jsonb:=p_plots->p_key->'house';
 slot_ integer; stay double precision; rooms jsonb;
begin
 deed_:=town.house_deed_for(p_key,p_plots,hand_,p_me,p_owner,p_now);
 if deed_ is null then
  return town.no(case when jsonb_typeof(house)='object' and house->>'by' is distinct from p_me then 'theirs'
   when jsonb_typeof(house)='object' then case when town.house_role(hand_) is not null then 'rooms' else 'hand' end
   when hand_='insectHouse' then case when p_owner is distinct from p_me then 'theirs' else 'soil' end else 'hand' end);
 end if;
 if deed_='house' then
  return jsonb_build_object('ok',true,'deed',deed_,
   'purse',town.spend(p_purse,(h->'costs'->>'set')::double precision,p_now) || jsonb_build_object('bag',town.take(p_purse->'bag','insectHouse',1)),
   'plot',jsonb_build_object('soil','house','plant',null,'house',jsonb_build_object('by',p_me,'at',p_now,'rooms',(select jsonb_agg('null'::jsonb) from generate_series(1,(h->>'rooms')::integer)))));
 end if;
 if deed_='lift' then
  if town.room(p_purse->'bag','insectHouse')<1 then return town.no('full'); end if;
  return jsonb_build_object('ok',true,'deed',deed_,
   'purse',town.spend(p_purse,(h->'costs'->>'lift')::double precision,p_now) || jsonb_build_object('bag',town.put(p_purse->'bag','insectHouse',1)),
   'plot',jsonb_build_object('soil','tilled','plant',null));
 end if;
 slot_:=town.house_free(house,p_now);
 stay:=case when town.house_rare(hand_) then (h->>'rareHours')::double precision else (h->>'hours')::double precision end
  + case when town.house_fav_near(p_key,hand_,p_plots) then (h->>'favHours')::double precision else 0 end;
 select jsonb_agg(case when r.n-1=slot_ then jsonb_build_object('bug',hand_,'from',p_now,'until',p_now+(stay*3600000)::bigint) else r.v end order by r.n)
   into rooms from jsonb_array_elements(house->'rooms') with ordinality r(v,n);
 return jsonb_build_object('ok',true,'deed',deed_,
  'purse',town.spend(p_purse,(h->'costs'->>'room')::double precision,p_now) || jsonb_build_object('bag',town.take(p_purse->'bag',hand_,1)),
  'plot',plot || jsonb_build_object('house',house || jsonb_build_object('rooms',rooms)));
end $$;

-- What the bed gives a plant now (lib/town/quality-plant's bedGift): each role's best helper cover, its partner touching
-- it, fennel touching it, and (v265) the rooms of the bed's insect house that reaches it, by the share of its plots in
-- reach: each lived-in room's role from its insect's coming to its leaving, rare or not. Null for a plant the bed gives
-- nothing. `p_plots`: the bed's plots, by key.
create or replace function town.quality_bed_gift(p_key text, p_plots jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 p jsonb:=p_plots->p_key->'plant'; qc jsonb:=town.cat('quality'); mine jsonb; o record; theirs jsonb; helper jsonb; share double precision;
 c jsonb:='{}'::jsonb; partner boolean:=false; fennel integer:=0; bed integer; gift jsonb:='{}'::jsonb; r text;
 h jsonb:='[]'::jsonb; hk record; room jsonb; role_ text; n integer; total integer;
begin
 if p is null or p='null'::jsonb or (p->>'root' is not null and p->>'root'<>p_key) then return null; end if;
 mine:=coalesce(p->'footprint',jsonb_build_array(p_key));
 bed:=town.bed_of(split_part(p_key,',',1)::integer,split_part(p_key,',',2)::integer);
 for o in select e.key k, e.value->'plant' pl from jsonb_each(p_plots) e where e.key<>p_key loop
  continue when o.pl is null or o.pl='null'::jsonb or (o.pl->>'root' is not null and o.pl->>'root'<>o.k);
  continue when town.bed_of(split_part(o.k,',',1)::integer,split_part(o.k,',',2)::integer)<>bed;
  theirs:=coalesce(o.pl->'footprint',jsonb_build_array(o.k));
  helper:=qc->'companions'->(o.pl->>'crop');
  if helper is not null then
   share:=town.quality_share(mine,o.k,helper->>'shape',coalesce((o.pl->>'rotation')::integer,0),theirs);
   if share>0 and share>coalesce((c->>(helper->>'role'))::double precision,0) then c:=c || jsonb_build_object(helper->>'role',share); end if;
  end if;
  if qc->'partners'->>(p->>'crop')=o.pl->>'crop' and town.quality_touching(mine,theirs) then partner:=true; end if;
  if o.pl->>'crop'='fennel' and town.quality_touching(mine,theirs) then fennel:=fennel+(qc->>'fennel')::integer; end if;
 end loop;
 -- v265: the insect house
 for hk in select e.key k, e.value->'house' hs from jsonb_each(p_plots) e where jsonb_typeof(e.value->'house')='object' order by e.key collate "C" loop
  select count(*) filter (where town.house_reach(hk.k,x.c))::integer, count(*)::integer into n, total from jsonb_array_elements_text(mine) x(c);
  continue when n=0;
  for room in select a.v from jsonb_array_elements(hk.hs->'rooms') with ordinality a(v,i) order by a.i loop
   continue when room is null or jsonb_typeof(room)<>'object';
   role_:=town.house_role(room->>'bug');
   continue when role_ is null;
   h:=h || jsonb_build_array(jsonb_build_object('r',role_,'from',(room->>'from')::bigint,'to',(room->>'until')::bigint,'s',n::double precision/total)
    || case when town.house_rare(room->>'bug') then '{"x":1}'::jsonb else '{}'::jsonb end);
  end loop;
 end loop;
 if c<>'{}'::jsonb then gift:=gift || jsonb_build_object('c',c); end if;
 if partner then gift:=gift || '{"p":1}'::jsonb; end if;
 if fennel>0 then gift:=gift || jsonb_build_object('f',fennel); end if;
 if jsonb_array_length(h)>0 then gift:=gift || jsonb_build_object('h',h); end if;
 return case when gift='{}'::jsonb then null else gift end;
end $$;

-- Count a round's growing from its last settle to a moment (lib/town/quality's accrue): in each stretch between two
-- changes, each bar's best cover times the growing done in it, less fennel's points the same way; the partner's
-- narrowing likewise, and (v265) a rare insect's of the house by its share while it stays. The bed's gift (`q.bed`)
-- holds from the last settle on; the house's rooms hold from their insects' coming to their leaving.
create or replace function town.quality_accrue(p_q jsonb, p_to bigint, p_plant jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 at_ bigint:=(p_q->>'at')::bigint; span_ double precision:=(p_q->>'span')::double precision; gift jsonb:=p_q->'bed';
 area double precision[]:=array[(p_q->'area'->>0)::double precision,(p_q->'area'->>1)::double precision,(p_q->'area'->>2)::double precision,(p_q->'area'->>3)::double precision];
 nar double precision[]:=array[coalesce((p_q->'nar'->>0)::double precision,0),coalesce((p_q->'nar'->>1)::double precision,0),coalesce((p_q->'nar'->>2)::double precision,0)];
 roles text[]:=array['soil','water','pollen','guard']; covs jsonb; cuts bigint[]; prog double precision[]; i integer; k integer;
 mid double precision; grew double precision; best double precision; lost double precision; hl double precision:=(town.cat('quality')->'house'->>'level')::double precision;
begin
 if p_to<=at_ then return p_q; end if;
 select coalesce(jsonb_agg(jsonb_build_array(c.role,c.lvl,c.c_from,c.c_to)),'[]'::jsonb) into covs from town.quality_covers(p_plant,at_,p_to) c;
 if jsonb_typeof(gift->'c')='object' then
  select covs || coalesce(jsonb_agg(jsonb_build_array(e.key,(e.value#>>'{}')::double precision,0,9007199254740991::bigint)),'[]'::jsonb) into covs from jsonb_each(gift->'c') e;
 end if;
 if jsonb_typeof(gift->'h')='array' then
  select covs || coalesce(jsonb_agg(jsonb_build_array(e->>'r',hl*(e->>'s')::double precision,(e->>'from')::bigint,(e->>'to')::bigint)),'[]'::jsonb) into covs from jsonb_array_elements(gift->'h') e;
 end if;
 select array_agg(t order by t) into cuts from (
  select at_ t union select p_to union select (e->>2)::bigint from jsonb_array_elements(covs) e union select (e->>3)::bigint from jsonb_array_elements(covs) e
 ) x where t>=at_ and t<=p_to;
 select array_agg(town.quality_progress(p_plant,t) order by n) into prog from unnest(cuts) with ordinality u(t,n);
 for i in 1..array_length(cuts,1)-1 loop
  grew:=greatest(0::double precision,prog[i+1]-prog[i]);
  continue when grew=0;
  span_:=span_+grew; mid:=(cuts[i]::double precision+cuts[i+1]::double precision)/2;
  for k in 1..4 loop
   select coalesce(max((e->>1)::double precision),0) into best from jsonb_array_elements(covs) e
    where e->>0=roles[k] and (e->>2)::double precision<=mid and mid<(e->>3)::double precision;
   lost:=case when k=1 then coalesce((gift->>'f')::double precision,0) else 0 end;
   area[k]:=area[k]+(least(1::double precision,best)-lost/(town.cat('quality')->>'bar')::double precision)*grew;
  end loop;
  if (gift->>'p')::integer=1 then nar[1]:=nar[1]+grew; end if;
  if jsonb_typeof(gift->'h')='array' then
   select coalesce(max((e->>'s')::double precision),0) into best from jsonb_array_elements(gift->'h') e
    where (e->>'x')::integer=1 and (e->>'from')::double precision<=mid and mid<(e->>'to')::double precision;
   nar[2]:=nar[2]+least(1::double precision,best)*grew;
  end if;
 end loop;
 return p_q || jsonb_build_object('at',p_to,'span',span_,'area',to_jsonb(area),'nar',to_jsonb(nar));
end $$;

-- Before a plant changes, settle its round as it stood (lib/town/quality-plant's syncQuality). Only the root of a
-- plant on several plots keeps it (v186's town_garden_spread copies the root to the rest after). A pick starts a new
-- round. A plant set, taken out or put in another's place changes the bed around it, and (v265) so does an insect house
-- set, filled or lifted: every other plant of the bed whose gift changes with it is settled with what the bed gave it
-- and given what it gives it now (a write of nothing but its round, which its own turn of this trigger lets stand).
create or replace function town.quality_keep()
returns trigger language plpgsql set search_path='' as $$
declare
 key_ text:=new.x::text||','||new.y::text; was jsonb; p jsonb:=new.plant; now_ bigint:=coalesce(new.changed,town.now_ms());
 launch_ bigint:=(town.cat('quality')->>'launch')::bigint; wasroot boolean; isroot boolean; plots jsonb; o record; gift jsonb; q jsonb; okey text;
 housed boolean; first_ boolean:=false;
begin
 if tg_op='UPDATE' then was:=old.plant; housed:=old.house is distinct from new.house; else housed:=new.house is not null; end if;
 if was='null'::jsonb then was:=null; end if;
 if p='null'::jsonb then p:=null; end if;
 wasroot:=was is not null and (was->>'root' is null or was->>'root'=key_);
 isroot:=p is not null and (p->>'root' is null or p->>'root'=key_);
 if not wasroot and not isroot and not housed then return new; end if;
 if wasroot and isroot and was->>'sown' is not distinct from p->>'sown' and was->>'crop' is not distinct from p->>'crop' and was->>'by' is not distinct from p->>'by' then
  if was=p or (was-'q')=(p-'q') then return new; end if;
  if jsonb_typeof(was->'q')='object' then
   new.plant:=p || jsonb_build_object('q',case
    when coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0)
     then town.quality_fresh(greatest(launch_,now_)) || case when jsonb_typeof(was->'q'->'bed')='object' then jsonb_build_object('bed',was->'q'->'bed') else '{}'::jsonb end
    else town.quality_settled(was,now_) end);
   return new;
  end if;
  -- (one with no round yet, growing when Quality came: its first, settled with what the bed gives it, which has stood
  -- since then, for a change of the bed would have given it a round)
  first_:=true;
 end if;
 -- the bed changes: its plots as they will be (each with its house, where it has one)
 select coalesce(jsonb_object_agg(t.x::text||','||t.y::text,jsonb_build_object('soil',t.soil,'plant',t.plant) || case when t.house is not null then jsonb_build_object('house',t.house) else '{}'::jsonb end),'{}'::jsonb) into plots
   from public.town_plots t where t.bed=new.bed and not (t.x=new.x and t.y=new.y);
 plots:=plots || jsonb_build_object(key_,jsonb_build_object('soil',new.soil,'plant',coalesce(p,'null'::jsonb)) || case when new.house is not null then jsonb_build_object('house',new.house) else '{}'::jsonb end);
 if isroot then
  gift:=town.quality_bed_gift(key_,plots);
  new.plant:=p || jsonb_build_object('q',(case
    when first_ and coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0) then town.quality_fresh(greatest(launch_,now_))
    when first_ then town.quality_settled(was || jsonb_build_object('q',town.quality_fresh(greatest(launch_,town.quality_round_start(was)))
      || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end),now_)
    else coalesce(case when jsonb_typeof(p->'q')='object' then p->'q' end,town.quality_fresh(greatest(launch_,town.quality_round_start(p)))) end) - 'bed'
   || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end);
  plots:=plots || jsonb_build_object(key_,jsonb_build_object('soil',new.soil,'plant',new.plant));
 end if;
 for o in select t.x, t.y, t.plant from public.town_plots t
   where t.bed=new.bed and not (t.x=new.x and t.y=new.y) and t.plant is not null and t.plant<>'null'::jsonb
     and (t.plant->>'root' is null or t.plant->>'root'=t.x::text||','||t.y::text) loop
  okey:=o.x::text||','||o.y::text;
  gift:=town.quality_bed_gift(okey,plots);
  continue when gift is not distinct from case when jsonb_typeof(o.plant->'q'->'bed')='object' then o.plant->'q'->'bed' end;
  q:=town.quality_settled(o.plant,now_) - 'bed';
  update public.town_plots set plant=plant || jsonb_build_object('q',q || case when gift is null then '{}'::jsonb else jsonb_build_object('bed',gift) end)
   where x=o.x and y=o.y;
 end loop;
 return new;
end $$;
drop trigger if exists town_quality_keep on public.town_plots;
create trigger town_quality_keep before insert or update of plant, house on public.town_plots for each row execute function town.quality_keep();

-- The farm as the page reads it: each plot with its `damp` where it has one, and (v265) its house.
CREATE OR REPLACE FUNCTION public.town_farm(p_since bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  since bigint := greatest(coalesce(p_since, 0), 0) - 10000;
begin
  -- (somebody is looking at the farm: this hour of the pests' is counted, if it has not been)
  perform town.swarm_note(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'swarms', town.swarms_told(since),
    'well', town.thing('well', false),
    -- ── the older tools (v174): each plot with its `damp`, where it has one; v265: and its insect house ──
    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end
                  || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
                from public.town_plots p where p.changed > since),
    'beds', (select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b));
end;
$function$;

-- The house's deeds, with the whole bed in view (lib/town/insect-house): set it down, fill a room, lift it. The bed
-- is locked as any deed in it is; its plots come back as they are kept, every plant the house reaches settled.
create or replace function public.town_house(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key_ text := coalesce(p_x, -1)::text || ',' || coalesce(p_y, -1)::text;
  bed jsonb;
  owner text;
  hand_ text := town.hand_of(purse);
  did jsonb;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))
           || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.house_do(key_, bed, purse, me::text, owner, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'house_' || (did->>'deed'), case when did->>'deed' = 'room' then hand_ else 'insectHouse' end, 1, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n));
  update public.town_plots p set soil = did->'plot'->>'soil', plant = null, house = case when jsonb_typeof(did->'plot'->'house') = 'object' then did->'plot'->'house' end,
    damp = false, changed = now_ where p.x = p_x and p.y = p_y;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  return town.answer(me, did - 'plot') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))
             || case when p.house is not null then jsonb_build_object('house', p.house) else '{}'::jsonb end), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n));
end $$;

revoke all on function town.house_role(text), town.house_rare(text), town.house_reach(text,text), town.house_fav_near(text,text,jsonb),
 town.house_free(jsonb,bigint), town.house_deed_for(text,jsonb,text,text,text,bigint), town.house_do(text,jsonb,jsonb,text,text,bigint) from public, anon, authenticated;
revoke all on function public.town_house(integer,integer) from public, anon;
grant execute on function public.town_house(integer,integer) to authenticated;
-- (the functions written over keep the grants they had)

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select column_name from information_schema.columns where table_name='town_plots' and column_name='house';      -- house
--   select town.cat('quality')->'house'->>'hours', town.cat('workshop')::text like '%insectHouse%';                -- 48, true
--   select has_function_privilege('authenticated','public.town_house(integer,integer)','EXECUTE');                 -- true
