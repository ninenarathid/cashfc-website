// Cash Town's icons: AI sheets in work/out -> public/town/icons-<hash>.png + lib/town/icon-atlas.json.
//
//   node build-icons.mjs
//
// (Run from another checkout of the repo, a worktree say, it would still read this one's sheets and write this one's
// picture: ICONS_SHEETS, ICONS_PUB and ICONS_JSON say otherwise. Two sessions that each added sheets build an atlas
// of their own sheets alone that way, to commit, while the shared tree keeps the one with both.)
//
// The owner's call (2026-10-02): every icon in Cash Town is pixel art made for
// it, no emoji ("จะได้ดูไม่เหมือน AI ทำ"). Each sheet is one row of icons drawn on
// a 16-pixel grid and scaled up; the true pixels are found, each icon cut out,
// and all of them packed into one small picture. The JSON beside the code
// (not in public/) is imported by components/town/TownIcon.tsx, so an icon
// needs no fetch before it shows.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = process.env.ICONS_SHEETS ?? path.join(HERE, "work", "out");
const PUB = process.env.ICONS_PUB ?? "E:/NinenineProject/fcnext/public/town";
const JSON_OUT = process.env.ICONS_JSON ?? "E:/NinenineProject/fcnext/lib/town/icon-atlas.json";

// [sheet, names] in the order they stand on the sheet, left to right
const SHEETS = [
  ["icons-a", ["mic", "muted", "speaker", "micSettings", "warning", "signal"]],
  ["icons-b", ["wardrobe", "stats", "fullscreen", "exitFullscreen", "leave", "close"]],
  ["icons-c", ["zoomIn", "zoomOut", "recenter", "people", "walk", "away"]],
  ["icons-d", ["chat", "history", "down", "chevron", "check", "lock"]],
  ["icons-e", ["dice", "turnLeft", "turnRight", "town", "vote", "hammer"]],
  ["icons-f", ["music", "musicOff", "volumeLow", "volumeHigh"]],
  // the settings at the top right (2026-10-04): their cog, a gauge for how often the map is drawn, and the two
  // ends of that choice, a cool machine and a smooth picture
  ["icons-g", ["settings", "gauge", "snowflake", "bolt"], { range: [19.5, 22.5] }],
  // the stirring game (2026-10-04): the pot seen from above, as it simmers, boils over (stirred too fast), scorches
  // (too slowly) and stands empty; drawn on a 32-pixel grid, so finer than the icons
  ["icons-game-a", ["potTop", "potTopOver", "potTopBurnt", "potTopEmpty"], { range: [9.5, 11.5] }],
  // the emote window: its button, sitting down where you stand, getting up, a wave
  // (drawn on a 16-pixel grid of big pixels, which measured freely comes out at half their size)
  ["icons-emote", ["emote", "sitDown", "standUp", "wave"], { range: [15, 16.5] }],
  // the town's mouse cursor (components/town/Town.tsx draws it): the arrow with its sparkle twinkling, the pointing
  // hand (pointing, pressing, tapping) over what can be clicked, the fist while dragging the map
  ["icons-cursor", ["cur1", "cur2", "cur3", "cur4", "hand1", "hand2", "hand3", "grab"]],
  // over a bench: the arrow bobbing down onto the seat, and somebody sitting as it is clicked
  ["icons-cursor-sit", ["sit1", "sit2", "sit3", "sit4"]],
  ["icons-sky", ["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night"]],
  // what the uncle sells and a bag holds, the Popoto coin, and the bag itself: things, drawn in their own colours
  ["icons-items-a", ["rod", "hoe", "can", "pot", "worm", "dough"]],
  ["icons-items-b", ["seedKangkong", "seedCabbage", "seedChili", "seedPumpkin", "coin", "bag"]],
  // every thing in the game (lib/town/items.ts): cookware and staples, seeds, vegetables, fish, what else a line
  // brings up, goods, dishes; and the signs for stamina, a float, a hook, a meal's buffs, a fish's shadow, a
  // meal and the recipe book. (The model drew some sheets with pixels half the size of the others', and measured
  // freely those come out at double: their range says where to look.)
  ["icons-items-c", ["pan", "grill", "rice", "salt", "scroll", "basket"]],
  ["icons-items-d", ["seedScallion", "seedCarrot", "seedDaikon", "seedCorn", "seedTomato", "seedBasil"]],
  ["icons-items-e", ["seedSweetPotato", "seedGarlic", "fishSauce", "compost", "growFert", "guardFert"]],
  ["icons-items-f", ["kangkong", "scallion", "cabbage", "carrot", "daikon", "corn"]],
  ["icons-items-g", ["chili", "tomato", "basil", "sweetPotato", "garlic", "pumpkin"]],
  ["icons-items-h", ["minnow", "barb", "tilapia", "perch", "catfish", "pangasius"], { range: [7.5, 8.5] }],
  ["icons-items-i", ["snakehead", "eel", "prawn", "featherback", "goby", "koi"]],
  ["icons-items-j", ["hyacinth", "boot", "pestCure", "stamina", "bobber", "hook"]],
  ["icons-items-k", ["riceBox", "friedMinnow", "grilledFish", "grilledCorn", "roastSweetPotato", "stirKangkong"], { range: [7.5, 8.5] }],
  ["icons-items-l", ["basilCatfish", "tomYum", "sourCurry", "friedPerch", "fishCake", "spicyEel"], { range: [7.5, 8.5] }],
  ["icons-items-m", ["grilledPrawn", "steamedGoby", "pumpkinSoup", "shabu", "buffCalm", "buffKeen"], { range: [7.5, 8.5] }],
  ["icons-items-n", ["buffLucky", "buffHearty", "buffGreen", "fishShadow", "meal", "recipes"], { range: [6.6, 7.6] }],
  // the next two tiers of things (2026-10-03, "ช่วยเพิ่ม ไอเทมทั้งหมดอีก 3 เท่า"), six to a sheet as before, and four signs
  // (each one's range is where its true pixels were found, work/icon-pitch2.mjs and work/icon-try.mjs: measured freely,
  // every one of these sheets comes out two or three times too coarse, and its icons a mush)
  // (the test window's, an exchange between players, washing up, a hand)
  ["icons-items-o", ["rodTeak", "floatQuill", "hookSteel", "lineBraid", "netSmall", "hoeIron"], { range: [5.1, 5.4] }],
  ["icons-items-p", ["canCopper", "sickle", "krabung", "mortar", "steamer", "cleaver"], { range: [5.1, 5.4] }],
  ["icons-items-q", ["jar", "wok", "bowl", "potDirty", "scrubber", "ash"], { range: [6.3, 6.9] }],
  ["icons-items-r", ["cricket", "branBait", "shrimpLive", "sugar", "oil", "tamarind"], { range: [5.3, 5.55] }],
  ["icons-items-s", ["egg", "seedEggplant", "seedCucumber", "seedLongBean", "seedLemongrass", "seedGalangal"], { range: [5.9, 6.15] }],
  ["icons-items-t", ["seedLime", "seedPapaya", "eggplant", "cucumber", "longBean", "lemongrass"], { range: [6.5, 6.8] }],
  ["icons-items-u", ["galangal", "lime", "papaya", "gourami", "crab", "snail"], { range: [7.9, 8.1] }],
  ["icons-items-v", ["hampala", "sheatfish", "bagrid", "giantGourami", "frog", "tigerfish"], { range: [5.3, 5.55] }],
  ["icons-items-w", ["wallago", "driftwood", "bottle", "driedFish", "saltedFish", "curryPaste"], { range: [7.9, 8.1] }],
  ["icons-items-x", ["pickle", "charcoal", "rope", "manure", "somTam", "grilledEggplant"], { range: [7.9, 8.1] }],
  ["icons-items-y", ["tomKha", "friedGourami", "crabCurry", "steamedSheatfish", "friedFrog", "laab"], { range: [5.25, 5.45] }],
  ["icons-items-z", ["omelette", "snailCurry", "candiedPumpkin", "friedRice", "test", "trade"], { range: [5, 5.3] }],
  ["icons-items-aa", ["rodMaster", "floatBell", "hookTwin", "lineSilk", "netLong", "hoeSteel"], { range: [6.15, 6.45] }],
  ["icons-items-ab", ["canBrass", "shears", "yoke", "potBrass", "stoveBig", "panBrass"], { range: [5.85, 6.15] }],
  ["icons-items-ac", ["steamerBamboo", "hotpot", "ladle", "tok", "antEggs", "lure"], { range: [7.9, 8.1] }],
  ["icons-items-ad", ["fermentedBait", "stickyRice", "flour", "soy", "pepper", "seedMango"], { range: [5.8, 6.05] }],
  ["icons-items-ae", ["seedBanana", "seedCoconut", "seedGinger", "seedTurmeric", "seedTaro", "seedWatermelon"], { range: [7.3, 7.6] }],
  ["icons-items-af", ["mango", "banana", "coconut", "ginger", "turmeric", "taro"], { range: [5.45, 5.7] }],
  ["icons-items-ag", ["watermelon", "croaker", "blackEar", "spinyEel", "puffer", "goldenCarp"], { range: [5.35, 5.55] }],
  ["icons-items-ah", ["giantSnakehead", "royalFeatherback", "arowana", "stingray", "megaCatfish", "pearl"], { range: [5.25, 5.45] }],
  ["icons-items-ai", ["chest", "coconutMilk", "fermentedFish", "shrimpPaste", "driedChili", "riceNoodle"], { range: [5.05, 5.3] }],
  ["icons-items-aj", ["bananaLeaf", "toastedRice", "greenCurry", "khanomJeen", "hoMok", "mangoStickyRice"], { range: [5.25, 5.45] }],
  ["icons-items-ak", ["bananaInCoconut", "taroPudding", "steamedCroaker", "gingerFish", "turmericFish", "jungleCurry"], { range: [5.25, 5.45] }],
  ["icons-items-al", ["megaLaab", "watermelonSlices", "khantoke", "naamPrik", "wash", "hand"], { range: [5.3, 5.5] }],
  // what grows in a plot (2026-10-03): weeds, tilled soil, the sprout and the seedling every vegetable shares, a dead
  // plant, a pest, and each vegetable half grown (A) and ripe (B); a drop for a watered plot and a shine for a ripe one
  ["icons-farm-a", ["plotWeeds", "plotSoil", "plotSprout", "plotSeedling", "plotDead", "plotBug"], { range: [5.5, 5.85] }],
  ["icons-farm-b", ["growKangkongA", "growKangkongB", "growScallionA", "growScallionB", "growCabbageA", "growCabbageB"], { range: [5.9, 6.1] }],
  ["icons-farm-c", ["growCarrotA", "growCarrotB", "growDaikonA", "growDaikonB", "growCornA", "growCornB"], { range: [7.9, 8.1] }],
  ["icons-farm-d", ["growChiliA", "growChiliB", "growTomatoA", "growTomatoB", "growBasilA", "growBasilB"], { range: [8.3, 8.55] }],
  ["icons-farm-e", ["growSweetPotatoA", "growSweetPotatoB", "growGarlicA", "growGarlicB", "growPumpkinA", "growPumpkinB"], { range: [5.25, 5.45] }],
  ["icons-farm-f", ["growEggplantA", "growEggplantB", "growCucumberA", "growCucumberB", "growLongBeanA", "growLongBeanB"], { range: [8.6, 8.9] }],
  ["icons-farm-g", ["growLemongrassA", "growLemongrassB", "growGalangalA", "growGalangalB", "growLimeA", "growLimeB"], { range: [5.35, 5.55] }],
  ["icons-farm-h", ["growPapayaA", "growPapayaB", "growMangoA", "growMangoB", "growBananaA", "growBananaB"], { range: [7.9, 8.1] }],
  ["icons-farm-i", ["growCoconutA", "growCoconutB", "growGingerA", "growGingerB", "growTurmericA", "growTurmericB"], { range: [7.9, 8.1] }],
  ["icons-farm-j", ["growTaroA", "growTaroB", "growWatermelonA", "growWatermelonB", "plotDrop", "plotShine"], { range: [5.9, 6.1] }],
  // weeds of many kinds, scattered over an untended plot (the owner: "วัชพืชตอนนี้มีแค่แบบเดียว … ช่วย gen มาหลายๆแบบ และ random ลงในดิน")
  ["icons-farm-k", ["weedTuft", "weedTall", "weedClover", "weedDandelion", "weedThistle", "weedCreeper"], { range: [5.0, 5.3] }],
  ["icons-farm-l", ["weedBroad", "weedFern", "weedDry", "weedBlue", "weedSeed", "weedStone"], { range: [5.9, 6.1] }],
  // a bucket empty and full, a pot of food, the washing tub, an agreement between two, the farm's well
  ["icons-items-am", ["bucket", "bucketFull", "potFull", "tub", "handshake", "well"], { range: [9.5, 9.85] }],
  ["icons-items-an", ["bucketIron", "bucketIronFull", "brush", "soap", "apron", "note"], { range: [5.25, 5.5] }],
  // the pot each dish comes as when it is cooked (work/make-pot-prompts.mjs): "pot" and the dish's id
  ["icons-pots-a", ["potFriedMinnow", "potGrilledFish", "potGrilledCorn", "potRoastSweetPotato", "potStirKangkong", "potBasilCatfish"], { range: [5.25, 5.45] }],
  ["icons-pots-b", ["potTomYum", "potSourCurry", "potFriedPerch", "potFishCake", "potSpicyEel", "potGrilledPrawn"], { range: [3.9, 4.1] }],
  ["icons-pots-c", ["potSteamedGoby", "potPumpkinSoup", "potShabu", "potSomTam", "potGrilledEggplant", "potTomKha"], { range: [5.4, 5.6] }],
  ["icons-pots-d", ["potFriedGourami", "potCrabCurry", "potSteamedSheatfish", "potFriedFrog", "potLaab", "potOmelette"], { range: [5.25, 5.45] }],
  ["icons-pots-e", ["potSnailCurry", "potCandiedPumpkin", "potFriedRice", "potGreenCurry", "potKhanomJeen", "potHoMok"], { range: [4.9, 5.1] }],
  ["icons-pots-f", ["potMangoStickyRice", "potBananaInCoconut", "potTaroPudding", "potSteamedCroaker", "potGingerFish", "potTurmericFish"], { range: [3.6, 3.8] }],
  ["icons-pots-g", ["potJungleCurry", "potMegaLaab", "potWatermelonSlices", "potKhantoke", "potNaamPrik", "potEmpty"], { range: [4.6, 4.8] }],
  // what a plot shows first, when it has only just been sown (the owner: "ให้ state แรก เป็นแค่ seed ก่อน state ต่อไปค่อยเป้นต้นอ่อน"):
  // small seeds, big seeds, a bulb, a root, a cutting, a nut (lib/town/items' growIconOf says which vegetable goes in as which)
  ["icons-farm-m", ["plotSeeds", "plotSeedsBig", "plotBulb", "plotRoot", "plotCutting", "plotNut"], { range: [5.9, 6.2] }],
  // what comes of things that make no dish, in a bowl and in its pot; the thing a found recipe does not name; a find's
  // rosette; looking for something; a plant in a pot, for the test window
  ["icons-items-ao", ["oddDish", "potOddDish", "mystery", "rosette", "seek", "sprout"], { range: [3.9, 4.1] }],
  // the dishes of five other countries (the owner, 2026-10-03: "ช่วยเอาอาหารประเทศอื่นที่ดังๆ มาด้วย ซัก 5 ประเทศ ประเทสละ 5 menu จะเพิ่ม
  // อุปกรณ์ด้วยก็ได้"; work/make-world-prompts.mjs): what the uncle sells for them, the noodles, what they are cooked in, and
  // the dishes themselves; on the last sheet, the pot of the last of them and a puff of steam
  ["icons-items-ap", ["seaweed", "tofu", "cheese", "milk", "noodle", "rollingPin"], { range: [6.0, 6.3] }],
  ["icons-items-aq", ["sushiMat", "stoneBowl", "oven", "sushi", "ramen", "tempura"], { range: [5.25, 5.45] }],
  ["icons-items-ar", ["unadon", "okonomiyaki", "kimchi", "bibimbap", "tteokbokki", "kimbap"], { range: [5.25, 5.45] }],
  ["icons-items-as", ["pajeon", "harGow", "chowMein", "springRoll", "congee", "mapoTofu"], { range: [5.25, 5.45] }],
  ["icons-items-at", ["pizza", "spaghetti", "risotto", "lasagna", "minestrone", "fishCurry"], { range: [5.25, 5.45] }],
  ["icons-items-au", ["naan", "biryani", "samosa", "lassi", "potLassi", "puff"], { range: [5.25, 5.45] }],
  // their pots (work/make-pot-prompts.mjs)
  ["icons-pots-h", ["potSushi", "potRamen", "potTempura", "potUnadon", "potOkonomiyaki", "potKimchi"], { range: [5.25, 5.45] }],
  ["icons-pots-i", ["potBibimbap", "potTteokbokki", "potKimbap", "potPajeon", "potHarGow", "potChowMein"], { range: [5.25, 5.45] }],
  ["icons-pots-j", ["potSpringRoll", "potCongee", "potMapoTofu", "potPizza", "potSpaghetti", "potRisotto"], { range: [5.25, 5.45], split: true }],
  ["icons-pots-k", ["potLasagna", "potMinestrone", "potFishCurry", "potNaan", "potBiryani", "potSamosa"], { range: [5.25, 5.45] }],
  // twenty more fish of the early game (the owner, 2026-10-05: "ช่วยเพิ่มปลาขั้นแรก ไปอีก 20 แบบ ไม่จำเป้นต้องเป็นปลาไทย เป้นปลาประเทศอื่น หรือ
  // แฟนตาซี หน่อยก็ได้"; work/make-fish-prompts.mjs): the fish, the hook and the float two of them are made into (with a
  // full moon and a rainbow beside them, to make the sheet a row of six: drawn as four its pixels came out twice the
  // size), the eight dishes eight of them are cooked into, and those dishes' pots
  ["icons-items-av", ["loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp"], { range: [5.35, 5.55] }],
  ["icons-items-aw", ["piranha", "herring", "archerfish", "pacu", "pike", "nilePerch"], { range: [5.35, 5.55] }],
  ["icons-items-ax", ["salmon", "wels", "gar", "arapaima", "dozyFish", "popotoFish"], { range: [5.2, 5.45] }],
  ["icons-items-ay", ["rainbowFish", "moonFish", "hookScale", "floatGlow", "moonFull", "rainbow"], { range: [5.3, 5.5] }],
  ["icons-items-az", ["fishChips", "ukha", "thieboudienne", "piranhaSoup"], { range: [7.9, 8.1] }],
  ["icons-items-ba", ["crawfishBoil", "masgouf", "salmonSteak", "arapaimaRoast"], { range: [7.9, 8.1] }],
  ["icons-pots-l", ["potFishChips", "potUkha", "potThieboudienne", "potPiranhaSoup"], { range: [7.9, 8.1] }],
  ["icons-pots-m", ["potCrawfishBoil", "potMasgouf", "potSalmonSteak", "potArapaimaRoast"], { range: [7.9, 8.1] }],
  // what is found in the forest (the owner, 2026-10-05; work/make-forest-prompts.mjs): what lies on the ground, what
  // grows, what is dug up, what is shaken down, the rare finds, and the mound of earth something is dug out of
  ["icons-items-bb", ["twig", "leafMould", "pineCone", "feather", "resin", "vine"], { range: [7.9, 8.1] }],
  ["icons-items-bc", ["bambooCane", "wildflower", "clay", "shiitake", "chanterelle", "porcini"], { range: [7.9, 8.1] }],
  ["icons-items-bd", ["glowMushroom", "toadstool", "fiddlehead", "mint", "rosemary", "chamomile"], { range: [7.9, 8.1] }],
  ["icons-items-be", ["lavender", "blueberry", "raspberry", "wildStrawberry", "silkCocoon", "fourLeafClover"], { range: [7.9, 8.1] }],
  ["icons-items-bf", ["bambooShoot", "wildYam", "truffle", "ginseng", "amber", "mandrake"], { range: [7.9, 8.1] }],
  ["icons-items-bg", ["wildApple", "chestnut", "wildOrchid", "moonflower", "starShard", "mound"], { range: [7.9, 8.1] }],
  // what the forest's gathering games are played with (work/make-forest-game-prompts.mjs): what only looks like each
  // thing that is chosen, wrong in a way of its own; and the earth a thing is dug out of, a layer at a time
  ["icons-game-b", ["likeShiitake", "likeChanterelle", "likePorcini", "likeGlowMushroom", "likeFiddlehead", "likeMint"], { range: [7.9, 8.1] }],
  ["icons-game-c", ["likeRosemary", "likeChamomile", "likeLavender", "likeBlueberry", "likeRaspberry", "likeWildStrawberry"], { range: [7.9, 8.1] }],
  ["icons-game-d", ["earthDeep", "earthMid", "earthThin", "earthHole", "earthFound", "earthTop"], { range: [11.4, 11.7] }],
  // what is made of the forest's things (work/make-forest-dish-prompts.mjs): eighteen dishes, the five things made by
  // hand and a net for the insects to come, and the pot each dish comes as. (The first sheet was drawn big and soft:
  // it is cut at ten to the pixel, which gives its icons the others' size.)
  ["icons-items-bh", ["mushroomSoup", "mushroomSkewer", "fishOnStick", "roastYam", "roastedApple", "mushroomRisotto"], { range: [9.9, 10.2] }],
  ["icons-items-bi", ["fernSalad", "herbTea", "berryCompote", "bakedApple", "roastChestnut", "forestStew"], { range: [7.9, 8.1] }],
  ["icons-items-bj", ["bambooShootStir", "rosemaryFish", "ginsengSoup", "moonTea", "truffleEggs", "mushroomOmelette"], { range: [8.1, 8.3] }],
  ["icons-items-bk", ["skewer", "mulch", "lavenderSachet", "floatFeather", "lineSpun", "bugNet"], { range: [7.9, 8.1] }],
  ["icons-pots-n", ["potMushroomSoup", "potMushroomSkewer", "potFishOnStick", "potRoastYam", "potRoastedApple", "potMushroomRisotto"], { range: [7.9, 8.1] }],
  ["icons-pots-o", ["potFernSalad", "potHerbTea", "potBerryCompote", "potBakedApple", "potRoastChestnut", "potForestStew"], { range: [8.0, 8.2] }],
  ["icons-pots-p", ["potBambooShootStir", "potRosemaryFish", "potGinsengSoup", "potMoonTea", "potTruffleEggs", "potMushroomOmelette"], { range: [8.1, 8.3] }],
  // the insects (work/make-insect-prompts.mjs): twenty-three of them, every one facing left (the map flips them), and
  // a leaf for the leaf insect to lie among
  ["icons-items-bl", ["butterflyWhite", "monarch", "morpho", "moth", "lunaMoth", "hawkMoth"], { range: [7.9, 8.1] }],
  ["icons-items-bm", ["dragonfly", "damselfly", "glassDragonfly", "firefly", "cicada", "ladybird"], { range: [7.9, 8.1] }],
  ["icons-items-bn", ["grasshopper", "mantis", "orchidMantis", "stickInsect", "leafInsect", "caterpillar"], { range: [7.9, 8.1] }],
  ["icons-items-bo", ["rhinoBeetle", "stagBeetle", "jewelBeetle", "herculesBeetle", "scarab", "decoyLeaf"], { range: [7.9, 8.1] }],
  // the wishing fountain (2026-10-05): the five blessings that are its own, and a coin dropped into water; the frames
  // of a sparkle as it twinkles and of a ring as it spreads, drawn where a blessing is at work; and a burst for each
  // kind of blessing (water, leaves, clover, heart, steam, drops)
  ["icons-fx-a", ["buffSwift", "buffClear", "buffSpring", "buffSprout", "buffFeast", "wishCoin"]],
  ["icons-fx-b", ["fxSpark1", "fxSpark2", "fxSpark3", "fxSpark4", "fxRing1", "fxRing2"], { range: [7.5, 8.5] }],
  ["icons-fx-c", ["fxRipple", "fxLeaves", "fxClover", "fxHeart", "fxSteam", "fxDrops"]],
  // three more blessings (a carrier of water, a forager, a catcher of insects), and a wish in its writer's words
  ["icons-fx-d", ["buffCarry", "buffForage", "buffNet", "wishNote"]],
  // the well's book (2026-10-05, lib/town/well): the two yokes the well gives whoever carries water to it, empty and
  // full; the book; something waiting; a carrier's three ranks; and, for what comes after, a jar, a card of thanks, a cart
  ["icons-well-a", ["waterYoke", "waterYokeFull", "waterYokeGreat", "waterYokeGreatFull", "wellBook", "wellGift"], { range: [7, 8] }],
  ["icons-well-b", ["rankWaterA", "rankWaterB", "rankWaterC", "tipJar", "thanksCard", "waterCart"]],
  // the carriers' later rounds (2026-10-05): the cart with water in it (a bucket's picture when it holds water is its name and Full), the three
  // waters that differ (lib/town/waters: the dew's, the rain's, the moon's), the cooking yard's jar, and a bucket handed on
  ["icons-well-c", ["waterCartFull", "waterDawn", "waterRain", "waterMoon", "yardJar", "lineHands"]],
  // the charms of each line of work's first rank (lib/town/gifts): an apron, gardener's gloves, a float, a vine basket, a net, a hoe, each with its sparkle
  ["icons-charms-a", ["charmApron", "charmGloves", "charmFloat", "charmBasket", "charmNet", "charmHoe"], { range: [4.9, 5.2] }],
  // the forest walker's lamp, which took the vine basket's place at the forest's first rank (the basket's picture is used by nothing), and a jar of fireflies for a later one
  ["icons-charms-b", ["charmLamp", "charmFirefly"], { range: [10.1, 10.6] }],
  // the familiars that follow their members (lib/town/gifts), each seen from the side and facing right: the first three are given by a second rank, the otter, the piglet and the hearth's sprite by ranks to come
  ["icons-familiars-a", ["famSquirrel", "famButterfly", "famGnome", "famOtter", "famPiglet", "famSprite"], { range: [9.7, 10.3] }],
  // the gifts of the lines' second to sixth ranks (lib/town/gifts), each with its sparkle: the helpers' anklet and duet bell, the kitchen's
  // basket and spoon, the farm's seed pouch, the insects' nectar; the rod of two lines, the dragon-silk line, the sky orb, the stardust bait,
  // the sprite's map, the wind net; the lulling flute, the butterfly-wing cloak, the stardust spice, the phoenix flame, the crescent sickle,
  // the hourglass; the ring of shared strength, the fae dust, the guardian's cloak, the flask of living water, the moon flask, and the
  // chest a sprite's map leads to
  ["icons-gifts-a", ["charmAnklet", "charmBell", "thingBasket", "thingSpoon", "thingPouch", "thingNectar"], { range: [4.5, 4.9], near: true }],
  ["icons-gifts-b", ["thingRod", "charmLine", "thingOrb", "thingBait", "thingMap", "charmWind"], { range: [5.3, 5.5] }],
  ["icons-gifts-c", ["thingFlute", "charmCloak", "thingSpice", "thingFlame", "charmSickle", "thingHourglass"], { range: [5.2, 5.5] }],
  ["icons-gifts-d", ["charmRing", "thingDust", "charmGuard", "thingFlask", "thingMoon", "spriteChest"], { range: [4.6, 4.85] }],
  // more familiars, seen from the side and facing right as the first are, at the first ones' size: the well's rain frog, the forest's moss
  // stag, the farm's mandrake; and for ranks to come a little rain cloud, a river dragon's young and a bee
  ["icons-familiars-b", ["famFrog", "famStag", "famMandrake", "famCloud", "famDragon", "famBee"], { range: [7.9, 8.1] }],
  // the gifts of the seventh to tenth ranks, a line's four together (and each tenth rank's golden mark, `gold…`): fishing's shoal flute,
  // lotus boat, contest pennant and golden scale; the forest's fairy rings, beekeeper's mask, star net, world tree's seed and golden
  // crown; the insects' beetle arena, moon lantern, breeding jar, sceptre and golden butterfly; the kitchen's feast cloth, phoenix
  // feather, feast bell, cauldron and golden toque; the farm's giant seed, bees, festival banner, magic bean and golden ear; the
  // helpers' fae flower, thread of kindness, phoenix tear, golden hour's bell and golden wings; the well's shell horn, staff, rain
  // sceptre and golden drop; and three things those gifts bring: a star's shard, a jar of honey, a hybrid seed
  ["icons-gifts-e", ["thingShoal", "thingBoat", "thingPennant", "goldScale", "thingRings", "thingMask"], { range: [3.9, 4.1] }],
  ["icons-gifts-f", ["thingStarNet", "thingSeed", "goldCrown", "thingArena", "thingLantern", "thingJar"], { range: [3.9, 4.1] }],
  ["icons-gifts-g", ["thingSceptre", "goldButterfly", "thingCloth", "thingFeather", "thingFeastBell", "thingCauldron"], { range: [3.9, 4.1] }],
  ["icons-gifts-h", ["goldToque", "thingGiant", "thingBees", "thingBanner", "thingBean", "goldEar"], { range: [5.5, 5.7], near: true }],
  ["icons-gifts-i", ["thingFlower", "thingThread", "thingTear", "thingHourBell", "goldWings", "thingHorn"], { range: [3.9, 4.1] }],
  ["icons-gifts-j", ["thingStaff", "thingRain", "goldDrop", "shardBig", "honeyJar", "hybridSeed"], { range: [3.9, 4.1] }],
  // woodcutting and mining (2026-10-08; lib/town/items, lib/town/tools): the two tools, what a tree and a rock leave and a
  // torch; ore in fragments and smelted; the eight gems in fragments and cut; and, for the smith's screen, an empty
  // setting and a pair of bellows
  ["icons-ore-a", ["pick", "axe", "stone", "log", "timber", "torch"]],
  ["icons-ore-b", ["shardCopper", "shardIron", "shardSilver", "oreCopper", "oreIron", "oreSilver"]],
  ["icons-ore-c", ["chipRuby", "chipSapphire", "chipAquamarine", "chipAmber", "chipTopaz", "chipEmerald"]],
  ["icons-ore-d", ["chipDiamond", "chipOnyx", "gemDiamond", "gemOnyx", "smithSocket", "smithBellows"]],
  ["icons-ore-e", ["gemRuby", "gemSapphire", "gemAquamarine", "gemAmber", "gemTopaz", "gemEmerald"]],
  // ── felling ── (the woodcutters' three gifts: the echo axe, the woodpecker seen from the side as the other familiars
  // are, the firewood cord; and a pine, a stump and a branch for the felling board's own words)
  ["icons-felling-a", ["charmEchoAxe", "famWoodpecker", "thingBundle", "pineTree", "treeStump", "pineBranch"]],
  // (what a pine lets fall now and then, for the book of the pines: lib/town/trees' KEEPSAKES, each `keep_` and its id;
  // the first sheet came out with pixels half the size of the second's, 8 of the canvas's against 15: finer pictures)
  ["icons-felling-b", ["keep_nest", "keep_feather", "keep_twinCones", "keep_cicada", "keep_pellet", "keep_initials"], { range: [7.5, 8.5] }],
  ["icons-felling-c", ["keep_heartKnot", "keep_amber", "keep_ribbon", "keep_rustKey", "keep_silverRing", "keep_carvedBird"]],
  // ── end: felling ──
];

const pieces = [];
for (const [sheet, names, opts] of SHEETS) {
  const file = path.join(OUT, `${sheet}.png`);
  if (!fs.existsSync(file)) { console.log(`no ${sheet}`); continue; }
  const raw = await L.loadRaw(file);
  // icons on a 16-pixel grid fill about 180 of the sheet's pixels: big true pixels
  const grid = L.detectGrid(raw, undefined, opts?.range ?? [6, 16]);
  const g = L.cellsOf(raw, grid);
  L.snap(g, L.paletteOf([g], 48));
  // The icons stand evenly spaced, and some are in parts (corner brackets, footprints):
  // every piece goes to the column its middle is in, not to the nearest gap.
  const parts = L.components(g).filter((c) => c.mem.length >= 2);
  const xs = parts.flatMap((c) => c.mem.map((i) => i % g.GW));
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, col = (x1 - x0) / names.length;
  const figs = names.map(() => new Set());
  // (with `near`, a small piece goes with the big piece it is nearest to, whichever column its own middle is in:
  // seeds spilt out of a pouch towards its neighbour are the pouch's)
  const most = Math.max(...parts.map((c) => c.mem.length));
  const big = opts?.near ? parts.filter((c) => c.mem.length >= most * 0.15) : [];
  const midOf = (c) => c.mem.reduce((t, i) => t + (i % g.GW), 0) / c.mem.length;
  const gap = (a, b) => { let d = Infinity; for (const i of a.mem) for (const j of b.mem) { const dx = (i % g.GW) - (j % g.GW), dy = Math.floor(i / g.GW) - Math.floor(j / g.GW); if (dx * dx + dy * dy < d) d = dx * dx + dy * dy; } return d; };
  for (const c of parts) {
    const home = big.length && c.mem.length < most * 0.15 ? big.map((o) => [gap(c, o), o]).sort((a, b) => a[0] - b[0])[0][1] : c;
    const mid = midOf(home);
    // (two that were drawn touching are one piece: with `split`, each cell goes to its own column instead)
    for (const i of c.mem) figs[Math.min(names.length - 1, Math.floor(((opts?.split ? i % g.GW : mid) - x0) / col))].add(i);
  }
  names.forEach((name, k) => {
    const set = figs[k];
    if (!set || !set.size) { console.log(`  ${name}: nothing found`); return; }
    const im = L.crop(g, set);
    pieces.push({ name, img: im });
    console.log(`${name.padEnd(15)} ${im.w}x${im.h}  (grid ${grid.p.toFixed(2)})`);
  });
}

const PAD = 1, W = 256;
const all = [...pieces].sort((a, b) => b.img.h - a.img.h);
let x = PAD, y = PAD, rowH = 0;
for (const p of all) {
  if (x + p.img.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
  p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
}
const H = y + rowH + PAD;
const sheet = Buffer.alloc(W * H * 4);
for (const p of all) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(sheet, ((p.y + r) * W + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
const png = await L.sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
const hash = crypto.createHash("sha256").update(png).digest("hex").slice(0, 10);
// the cursor's frames: where in each the click lands. The arrows' is their tip (the top-left pixel); the hands'
// is the pointing finger's tip, with every hand frame lined up on its cuff so the hand never jumps between frames
const cursor = {};
{
  const px = (p, x, y) => p.img.buf[(y * p.img.w + x) * 4 + 3] > 0;
  const by = (n) => pieces.find((p) => p.name === n);
  for (const n of ["cur1", "cur2", "cur3", "cur4"]) {
    const p = by(n); if (!p) continue;
    let tip = null;
    for (let y = 0; y < p.img.h && !tip; y++) for (let x = 0; x < p.img.w; x++) if (px(p, x, y)) { tip = [x, y]; break; }
    cursor[n] = tip;
  }
  const cuff = (p) => { let sx = 0, n = 0; for (let y = p.img.h - 3; y < p.img.h; y++) for (let x = 0; x < p.img.w; x++) if (px(p, x, y)) { sx += x; n++; } return sx / n; };
  const h1 = by("hand1");
  if (h1) {
    let sx = 0, n = 0; for (let x = 0; x < h1.img.w; x++) if (px(h1, x, 0)) { sx += x; n++; }
    const tipX = sx / n, c1 = cuff(h1);
    for (const n2 of ["hand1", "hand2", "hand3", "grab"]) {
      const p = by(n2); if (!p) continue;
      // the same point above the cuff as hand1's fingertip, measured from this frame's cuff and bottom
      cursor[n2] = [Math.round(cuff(p) + (tipX - c1)), p.img.h - h1.img.h];
    }
  }
  // the bench frames: lined up on the bench's legs; the click lands in the middle of the seat
  const s1 = by("sit1");
  if (s1) for (const n3 of ["sit1", "sit2", "sit3", "sit4"]) {
    const p = by(n3); if (!p) continue;
    cursor[n3] = [Math.round(cuff(p)), p.img.h - Math.round(s1.img.h * 0.3)];
  }
}
const meta = {
  image: `/town/icons-${hash}.png`, size: [W, H],
  icons: Object.fromEntries(pieces.map((p) => [p.name, [p.x, p.y, p.img.w, p.img.h]])),
  cursor,
};
for (const f of fs.readdirSync(PUB)) if (/^icons-[0-9a-f]{10}\.png$/.test(f) && `/town/${f}` !== meta.image) fs.unlinkSync(path.join(PUB, f));
fs.writeFileSync(path.join(PUB, path.basename(meta.image)), png);
fs.writeFileSync(JSON_OUT, JSON.stringify(meta, null, 1) + "\n");
console.log(`wrote ${meta.image} ${W}x${H} (${(png.length / 1024).toFixed(1)} KB), ${pieces.length} icons`);
