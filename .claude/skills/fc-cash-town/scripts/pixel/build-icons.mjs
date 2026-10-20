// Cash Town's icons: AI sheets in work/out -> public/town/icons-<hash>.png + lib/town/icon-atlas.json.
//
//   node build-icons.mjs
//
// (Run from another checkout of the repo, a worktree say, it would still read this one's sheets and write this one's
// picture: ICONS_SHEETS, ICONS_PUB and ICONS_JSON say otherwise. Two sessions that each added sheets build an atlas
// of their own sheets alone that way, to commit, while the shared tree keeps the one with both.)
//
//   ICONS_ONLY=<sheet,sheet> ICONS_APPEND=1 node build-icons.mjs
//
// (Since 2026-10-10 the atlas holds sets that later builders laid under it (build-garden-icons.mjs and the others),
// which a build of every sheet here would leave out. ICONS_ONLY cuts the sheets named alone, and ICONS_APPEND lays
// what they give under the atlas that is there, ICONS_JSON and its picture, as those builders do: the helper plants'
// sheets went in that way, 2026-10-15.)
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
// (the tree this copy of the builder is in, not always the shared one: a build in a worktree once wrote the shared
// tree's atlas and removed the picture another session's atlas stood on, 2026-10-15)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../../../../..");
const PUB = process.env.ICONS_PUB ?? path.join(ROOT, "public/town");
const JSON_OUT = process.env.ICONS_JSON ?? path.join(ROOT, "lib/town/icon-atlas.json");

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
  // the clock's eighth band, 03:00 to 05:00 (lib/town/bands, 2026-10-15): the hour before dawn, drawn among its
  // neighbours of the set so that it takes their order, size and palette; only it is packed. (The first, icons-sky-b, a
  // crescent sinking into mist, read as night in the game: this one has dawn's shape in night blue and a line of pink)
  ["icons-sky-c", ["_evening", "_night", "beforeDawn", "_dawn", "_morning", "_noon"], { range: [12.7, 13.2] }],
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
  // ── mining ── (the line's three gifts: a miner's lamp, a guiding bat, a miner's sack; and what a vein's face shows:
  // ore that glints, a gem's crystals, a hard knot)
  ["icons-mining-a", ["charmMinerLamp", "famBat", "thingSack", "veinOre", "veinCrystal", "veinKnot"]],
  // ── felling ── (the woodcutters' three gifts: the echo axe, the woodpecker seen from the side as the other familiars
  // are, the firewood cord; and a pine, a stump and a branch for the felling board's own words)
  ["icons-felling-a", ["charmEchoAxe", "famWoodpecker", "thingBundle", "pineTree", "treeStump", "pineBranch"]],
  // (what a pine lets fall now and then, for the book of the pines: lib/town/trees' KEEPSAKES, each `keep_` and its id;
  // the first sheet came out with pixels half the size of the second's, 8 of the canvas's against 15: finer pictures)
  ["icons-felling-b", ["keep_nest", "keep_feather", "keep_twinCones", "keep_cicada", "keep_pellet", "keep_initials"], { range: [7.5, 8.5] }],
  ["icons-felling-c", ["keep_heartKnot", "keep_amber", "keep_ribbon", "keep_rustKey", "keep_silverRing", "keep_carvedBird"]],
  // ── end: felling ──
  // ── the farm's helper plants (2026-10-15; lib/town/helper-items) ── each one young (A) and grown with its crop (B), three
  // to a sheet with icons-farm-d for the reference; then each crop beside its seed packet, with icons-items-d for the
  // packets: the packet's band is its role's colour (soil, water, pollen, guard: components/town/TownQuality's bars).
  // Mint, chamomile and lavender's crops are the forest's herbs (icons-items-bd, -be). The bag's sheets are cut on their
  // finer grid, where the squares are crisp (the coarser one, twice it, is the one measured freely), as the later seeds
  // were. The plants' sheets a to e are cut on the coarser, as icons-farm-d was: on their finer grid the plants came out
  // 75 to 97 tall, and the map draws a plant no smaller than 0.62 of a screen pixel to one of its own (TownFarm's
  // PLANT_SCALES), so they stood twice a tomato's height. Sheets f and g were drawn coarser, and their finer grid gives
  // plants 45 to 63 tall. A name beginning "_" is a filler drawn so that the sheet has six, and is not packed.
  ["icons-helper-grow-a", ["growRunnerBeanA", "growRunnerBeanB", "growPeanutA", "growPeanutB", "growCloverA", "growCloverB"], { range: [9.35, 9.65] }],
  ["icons-helper-grow-b", ["growBuckwheatA", "growBuckwheatB", "growSesameA", "growSesameB", "growRhubarbA", "growRhubarbB"], { range: [7.8, 8.1] }],
  ["icons-helper-grow-c", ["growGardenStrawberryA", "growGardenStrawberryB", "growWatercressA", "growWatercressB", "growChamomileA", "growChamomileB"], { range: [7.85, 8.15] }],
  ["icons-helper-grow-d", ["growBorageA", "growBorageB", "growLavenderA", "growLavenderB", "growMilkweedA", "growMilkweedB"], { range: [7.85, 8.15] }],
  ["icons-helper-grow-e", ["growFennelA", "growFennelB", "growDillA", "growDillB", "_growGarlicChivesA", "_growGarlicChivesB"], { range: [7.85, 8.15] }],
  ["icons-helper-grow-f", ["growMarigoldA", "growMarigoldB", "growNasturtiumA", "growNasturtiumB", "growMintA", "growMintB"], { range: [5.25, 5.45] }],
  ["icons-helper-grow-g", ["_growFigA", "_growFigB", "growPassionfruitA", "growPassionfruitB", "_fig", "passionfruit"], { range: [5.5, 5.7] }],
  ["icons-helper-bag-a", ["runnerBean", "seedRunnerBean", "peanut", "seedPeanut", "buckwheat", "seedBuckwheat"], { range: [6.1, 6.35], near: true }],
  ["icons-helper-bag-b", ["sesame", "seedSesame", "clover", "seedClover", "gardenStrawberry", "seedGardenStrawberry"], { range: [6.3, 6.55] }],
  ["icons-helper-bag-c", ["rhubarb", "seedRhubarb", "watercress", "seedWatercress", "borage", "seedBorage"], { range: [5.65, 5.9] }],
  ["icons-helper-bag-d", ["milkweed", "seedMilkweed", "fennel", "seedFennel", "marigold", "seedMarigold"], { range: [6.75, 7.0] }],
  ["icons-helper-bag-e", ["nasturtium", "seedNasturtium", "garlicChives", "seedGarlicChives", "dill", "seedDill"], { range: [5.35, 5.6] }],
  ["icons-helper-bag-f", ["_seedFig", "seedPassionfruit", "seedMint", "seedChamomile", "seedLavender", "_seedHelper"], { range: [6.0, 6.2] }],
  // (drawn again after the look in the game, the same day: the fig read as an aubergine on a little palm, and the garlic
  // chives' flowers as chamomile; the first drawings' names above begin "_". The plants are cut on the coarser grid as the
  // others are, the fig and its packet for the bag on the finer, as the bag's sheets are)
  ["icons-helper-fix-a", ["growFigA", "growFigB", "growGarlicChivesA", "growGarlicChivesB", "_fig", "_seedFig"], { range: [7.85, 8.15] }],
  ["icons-helper-fix-a", ["_growFigA", "_growFigB", "_growGarlicChivesA", "_growGarlicChivesB", "fig", "seedFig"], { range: [3.9, 4.1] }],
  // the eight mist children (2026-10-15; lib/town/helper-items' MIST_PLANTS): each the rare form of its sun child, the same
  // plant in silvery sage with dew, its rare crop showing; drawn with icons-farm-d (plants) or icons-items-d (packets) and
  // a strip of the sun children's own drawings in the sheet's order (work/out/ref-mist-*.png). The plants are cut where
  // their sizes are the sun children's (grow-c with 96 colours, or its figs go grey), the bag's sheets on their finer
  // grid; the packets are mist grey, with the role's band. grow-c's tomatoes and bag-c's plain packets are fillers.
  ["icons-mist-grow-a", ["growPearlNutA", "growPearlNutB", "_growSilverGrainA", "growSilverGrainB", "_growDewSesameA", "growDewSesameB"], { range: [6.95, 7.3] }],
  ["icons-mist-grow-b", ["growGlassFlowerA", "_growGlassFlowerB", "growOpalStalkA", "growOpalStalkB", "_growCrystalLeafA", "growCrystalLeafB"], { range: [7.85, 8.15] }],
  ["icons-mist-grow-c", ["growSilkPollenA", "growSilkPollenB", "_growDewFigA", "_growDewFigB", "_tomatoA", "_tomatoB"], { range: [7.8, 8.2], colours: 96 }],
  ["icons-mist-bag-a", ["pearlNut", "seedPearlNut", "silverGrain", "_seedSilverGrain", "_dewSesame", "_seedDewSesame"], { range: [5.5, 5.8] }],
  ["icons-mist-bag-b", ["_glassFlower", "_seedGlassFlower", "opalStalk", "seedOpalStalk", "crystalLeaf", "seedCrystalLeaf"], { range: [5.3, 5.6] }],
  ["icons-mist-bag-c", ["dewFig", "seedDewFig", "silkPollen", "seedSilkPollen", "_seedMistSoil", "_seedMistWater"], { range: [6.5, 6.8] }],
  // (drawn again after the look in the game: the dew sesame's two split pods read as plain sesame in the bag, so it is
  // dew-bead seeds heaped on a leaf; the silver grain packet's grains outlined darker on the grey paper. Its last three
  // are bag-a's, to hold the size)
  ["icons-mist-fix-a", ["dewSesame", "seedDewSesame", "seedSilverGrain", "_pearlNut", "_seedPearlNut", "_silverGrain"], { range: [5.4, 5.8] }],
  // ── end: helper plants ──
  // ── the farm's insect house (2026-10-15; lib/town/insect-house): the house standing on its plot, drawn by TownFarm as
  // the growth sprites are (plotInsectHouse), and the same house for the bag in the wood line's set (insectHouse), drawn
  // between a tomato and a basil (icons-farm-d) and two wood tools (icons-wood) to hold its scale; only the two houses
  // are packed. Cut on its finer grid: on the coarser (11.4) the bamboo tubes' rims and the drilled holes ran together
  ["icons-insect-house-a", ["_tomato", "plotInsectHouse", "_basil", "_insectHouse", "_wedge", "_stake"], { range: [5.65, 5.9] }],
  // (the bag's house drawn again with icons-wood and the first sheet for the reference: in the bag and the hotbar the
  // first one's nine small tube ends and holes ran into speckles; this one has six bigger ones)
  ["icons-insect-house-b", ["insectHouse", "_wedge", "_stake", "_barkKnife", "_sapTap", "_grainLens"], { range: [5.45, 5.65] }],
  // ── the time bands' newcomers (2026-10-15; lib/town/band-species) ── twenty-four insects (with icons-items-bm for the
  // reference), twenty-four fish (with icons-items-av), and the four rare finds, glow powder and the mist time icon (with
  // icons-items-bd). icons-band-insects-d came out coarse with its moths drawn half, and was drawn again (d2, with
  // icons-band-insects-a for the reference), which is the one listed; its true pixels came out at 13.5 of the canvas,
  // so it is cut on its half, which gives its insects the others' size (the first drawing is kept in work/out, not listed).
  ["icons-band-insects-a", ["megaloptaBee", "ghostMantis", "railroadWorm", "indianNightBee", "snakefly", "earwig"], { range: [7.9, 8.1] }],
  ["icons-band-insects-b", ["masonBee", "tigerBeetle", "roseChafer", "woolCarderBee", "oilBeetle", "assassinBug"], { range: [7.9, 8.1] }],
  ["icons-band-insects-c", ["blueBandedBee", "robberFly", "superworm", "clearwingMoth", "antlion", "bessBeetle"], { range: [7.9, 8.1] }],
  ["icons-band-insects-d2", ["yuccaMoth", "roveBeetle", "cucujoBeetle", "tobaccoHawkmoth", "blueGhostFirefly", "californiaGlowworm"], { range: [6.6, 6.85] }],
  ["icons-band-fish-a", ["pearlDanio", "peacockGudgeon", "huchen", "forktailBlueEye", "empireGudgeon", "lenok"], { range: [5.3, 5.5] }],
  ["icons-band-fish-b", ["zebrafish", "europeanChub", "arcticChar", "rosyBitterling", "pumpkinseed", "europeanGrayling"], { range: [5.2, 5.45] }],
  ["icons-band-fish-c", ["leastKillifish", "australianBass", "lakeWhitefish", "tench", "goldenDorado", "europeanBullhead"], { range: [5.2, 5.45] }],
  ["icons-band-fish-d", ["glassKnifefish", "tigerShovelnose", "burbot", "elephantnoseFish", "freshwaterSole", "dollyVarden"], { range: [4.8, 5.0] }],
  ["icons-band-finds-a", ["mistMushroom", "queenPollen", "morningDew", "batGuano", "glowPowder", "timeMist"], { range: [6.8, 7.1] }],
  // ── end: the time bands' newcomers ──
  // ── the farm's fertilisers of Quality (2026-10-15; lib/town/fertilisers' FERT_ITEMS), in the goods set beside growFert,
  // guardFert, mulch and compost, with icons-items-e for the reference: what comes in a bag or a sack (a), what is a heap,
  // a lump or a handful (b), what is wet and a pouch of powder (c, its sixth a growFert drawn only to hold the size). a and
  // c cut at the grid that gives them the goods' own size (28 to 44 tall); b on its finer grid (36 to 50): on its coarser
  // they came out 18 to 25, at pixels nearly twice the others' in a bag slot
  ["icons-fert-a", ["_slatePowder", "_biochar", "_silkFrass", "_woodAsh", "sawdustMulch", "sulphurPowder"], { range: [6.9, 7.15] }],
  ["icons-fert-b", ["mineralClay", "forestHumus", "lotusSilt", "shreddedBark", "shellMeal", "chitinPowder"], { range: [4.8, 5.0] }],
  ["icons-fert-c", ["fishEmulsion", "kitchenFerment", "_nectarLure", "_resinWash", "herbPowder", "_growFert"], { range: [7.85, 8.15] }],
  // (drawn again after the look in the game: the first three of sheet a read as one cream sack with a dark heap at bag
  // size, the ash's puff fell into specks, the nectar's flower and the resin's sprig were lost; each now its own cloth and
  // shape with what it holds spilled in front, a big brass sprinkler, a pine cone on the flask)
  ["icons-fert-d", ["slatePowder", "biochar", "silkFrass", "woodAsh", "nectarLure", "resinWash"], { range: [6.15, 6.4] }],
  // (the time bands' fertilisers, the same day: five in e, and in f the two rare three-day packets with the sparkle star,
  // drawn among plain goods that hold the size; the names beginning "_" are not packed)
  ["icons-fert-e", ["boneMeal", "guanoMeal", "scalePowder", "_beetleFrass", "dewPollen", "_growFert"], { range: [5.7, 5.95] }],
  ["icons-fert-f", ["packetMist", "_packetNight", "_growFert", "_guardFert", "_mulch", "_compost"], { range: [6.3, 6.55] }],
  // (drawn again after the look in the game: the beetle frass's shell and pellets ran into one muddy heap, the night
  // packet's fireflies were lost; the scale powder of g came out as plain white powder, so e's is kept)
  ["icons-fert-g", ["beetleFrass", "_scalePowder", "_packetNight", "_growFert", "_guardFert", "_compost"], { range: [7.85, 8.15] }],
  // ── the insect house's insects in flight (components/town/TownFarm's drawHouseInsect): each insect twice, its wings up (A)
  // and down (B), three a sheet, each sheet drawn from its insects' own bag icons laid in a row (work/out/ref-icons-fly-*);
  // the golden ant (a worker, no wings), the antlion (a larva) and the rove beetle (it walks) are not drawn. Each pair is
  // laid on itself and cut to one box (`pairs`), so the body does not jump as the wings beat
  ["icons-fly-a", ["flyHoneyBeeA", "flyHoneyBeeB", "flyCarpenterBeeA", "flyCarpenterBeeB", "flyHoverflyA", "flyHoverflyB"], { range: [7.85, 8.15], pairs: true }],
  ["icons-fly-b", ["flyPollenMidgeA", "flyPollenMidgeB", "flyMegaloptaBeeA", "flyMegaloptaBeeB", "flyIndianNightBeeA", "flyIndianNightBeeB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-c", ["flyMasonBeeA", "flyMasonBeeB", "flyWoolCarderBeeA", "flyWoolCarderBeeB", "flyBlueBandedBeeA", "flyBlueBandedBeeB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-d", ["flyButterflyWhiteA", "flyButterflyWhiteB", "flyMonarchA", "flyMonarchB", "flyMorphoA", "flyMorphoB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-e", ["flyMothA", "flyMothB", "flyLunaMothA", "flyLunaMothB", "flyHawkMothA", "flyHawkMothB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-f", ["flySilkMothA", "flySilkMothB", "flyClearwingMothA", "flyClearwingMothB", "flyYuccaMothA", "flyYuccaMothB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-g", ["flyTobaccoHawkmothA", "flyTobaccoHawkmothB", "flyLacewingA", "flyLacewingB", "flySnakeflyA", "flySnakeflyB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-h", ["flyOrchardBeetleA", "flyOrchardBeetleB", "flyLadybirdA", "flyLadybirdB", "flyTigerBeetleA", "flyTigerBeetleB"], { range: [7.8, 8.2], pairs: true }],
  ["icons-fly-i", ["_flyMantisA", "_flyMantisB", "flyOrchidMantisA", "flyOrchidMantisB", "flyGhostMantisA", "flyGhostMantisB"], { range: [7.8, 8.7], pairs: true }],
  ["icons-fly-j", ["flyAssassinBugA", "flyAssassinBugB", "flyRobberFlyA", "flyRobberFlyB", "_flyHoneyBeeA", "_flyHoneyBeeB"], { range: [7.8, 8.2], pairs: true }],
  // ── the farm's plants of more than one plot, each one plant over its plots (the owner, 2026-10-15: "พืชที่กินมากกว่า 1 ช่อง
  // แบบผสม ช่วย gen ภาพใหม่ ให้ดูเชื่อมต่อกัน ไม่ใช่ ภาพ 1 ช่องแบบนี้ / แบบขนาดใหญ่ ไป Gen ภาพให้ออกมาดีๆ"): the garden's hybrids as one
  // row on one long mound (a and b: three and two plots in a line, running from the lower left up to the upper right;
  // c and d: the two L's with the corner at the front, at the back and at the right), and the five 2x2 giants. Drawn on
  // 3840x1280 with icons-farm-d and the farm in the game for the reference. The rows are cut on their true grid (4), at
  // which their plants are the size of the garden's hybrids drawn at 0.62 (TownFarm's PLANT); the giants on twice it (8):
  // on 4 a ripe daikon stood 224 tall, six tomatoes high beside the farm's plants
  ["icons-wide-a", ["_wideBlueCornA", "_wideBlueCornB", "_wideLotusRootBedA", "_wideLotusRootBedB", "_wideTrellisBerryA", "_wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide-b", ["_wideRowBeanA", "_wideRowBeanB", "_wideTeaBushA", "_wideTeaBushB", "_wideRedOkraA", "_wideRedOkraB"], { range: [3.9, 4.1] }],
  ["icons-wide-c", ["_wideBottleGourdFrontA", "_wideBottleGourdFrontB", "_wideBottleGourdBackA", "_wideBottleGourdBackB", "_wideBottleGourdSideA", "_wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  ["icons-wide-d", ["_wideSunflowerPatchFrontA", "_wideSunflowerPatchFrontB", "_wideSunflowerPatchBackA", "_wideSunflowerPatchBackB", "_wideSunflowerPatchSideA", "_wideSunflowerPatchSideB"], { range: [3.9, 4.1] }],
  ["icons-giantcrop-a", ["giantPumpkinA", "giantPumpkinB", "_giantCabbageA", "_giantCabbageB", "giantCarrotA", "giantCarrotB"], { range: [7.9, 8.1] }],
  ["icons-giantcrop-b", ["_tomato", "giantDaikonA", "giantDaikonB", "_giantTaroA", "_giantTaroB", "_basil"], { range: [7.9, 8.1] }],
  // (drawn again after the look in the game: the sunflower patch's L read as several sunflowers along a bed, the okra row
  // as separate bushes, the giant taro as a little palm on a pedestal, the giant cabbage as broccoli; the first drawings'
  // names above begin "_". Sheet e is cut twice: its okra row on the rows' grid, its giants on twice it)
  ["icons-wide-d2", ["_wideSunflowerPatchFrontA", "_wideSunflowerPatchFrontB", "_wideSunflowerPatchBackA", "_wideSunflowerPatchBackB", "_wideSunflowerPatchSideA", "_wideSunflowerPatchSideB"], { range: [3.9, 4.1] }],
  ["icons-wide-e", ["_wideRedOkraA", "_wideRedOkraB", "_giantCabbageA", "_giantCabbageB", "_giantTaroA", "_giantTaroB"], { range: [3.9, 4.1] }],
  ["icons-wide-e", ["_wideRedOkraA", "_wideRedOkraB", "giantCabbageA", "giantCabbageB", "giantTaroA", "giantTaroB"], { range: [7.9, 8.1] }],
  // (the hybrids drawn again to stand ON their plots, the owner: "พืชลูกผสม รู้สึกว่ายังทำภาพมาไม่ตรงช่องเท่าไหร่ ช่วยแก้ไขใหม่": one small
  // mound on each plot instead of one long mound, and low; measure-wide.mjs finds the mounds and writes how each stands on
  // its plots, lib/town/wide-art.json. The first drawings' names above begin "_")
  ["icons-wide2-a", ["wideBlueCornA", "wideBlueCornB", "wideLotusRootBedA", "wideLotusRootBedB", "wideTrellisBerryA", "wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide2-b", ["wideRowBeanA", "wideRowBeanB", "wideTeaBushA", "wideTeaBushB", "wideRedOkraA", "wideRedOkraB"], { range: [3.9, 4.1] }],
  ["icons-wide2-c", ["_wideBottleGourdFrontA", "_wideBottleGourdFrontB", "_wideBottleGourdBackA", "_wideBottleGourdBackB", "_wideBottleGourdSideA", "_wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  ["icons-wide2-d", ["wideSunflowerPatchFrontA", "wideSunflowerPatchFrontB", "wideSunflowerPatchBackA", "wideSunflowerPatchBackB", "wideSunflowerPatchSideA", "wideSunflowerPatchSideB"], { range: [3.9, 4.1] }],
  // (a, b and d drawn again with the clumps grown together over the gaps between the mounds: the first read as separate plants
  // standing in a row. Drawn so, several have more clumps than plots: their mounds at the ends and the corner were marked)
  ["icons-wide3-a", ["_wideBlueCornA", "_wideBlueCornB", "_wideLotusRootBedA", "_wideLotusRootBedB", "_wideTrellisBerryA", "_wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide3-b", ["wideRowBeanA", "wideRowBeanB", "wideTeaBushA", "wideTeaBushB", "wideRedOkraA", "wideRedOkraB"], { range: [3.9, 4.1] }],
  ["icons-wide3-d", ["wideSunflowerPatchFrontA", "wideSunflowerPatchFrontB", "wideSunflowerPatchBackA", "wideSunflowerPatchBackB", "wideSunflowerPatchSideA", "wideSunflowerPatchSideB"], { range: [3.9, 4.1] }],
  // ── the garden's eight hybrids again, in this pipeline (the owner, 2026-10-15: "ช่วย Gen ภาพพืช ที่ codex เคยทำไปใหม่ด้วย จะได้เป็น
  // Template เดียวกัน"): their one-plot growth sprites with icons-farm-d, their crops and seed packets with icons-items-d (the
  // packet's band the crop's colour), replacing what build-garden-icons.mjs packed from grow-garden.png and icons-garden.png
  // (drawn outside gen.mjs, each cell resized into a box). Packed with ICONS_REPLACE; the names beginning "_" are fillers
  // (the growth sprites' names begin "_" since icons-hybrid-small-* replaced them, 2026-10-16)
  ["icons-garden-grow-a", ["_growBottleGourdA", "_growBottleGourdB", "_growRowBeanA", "_growRowBeanB", "_growTrellisBerryA", "_growTrellisBerryB"], { range: [9.9, 10.3] }],
  ["icons-garden-grow-b", ["_growBlueCornA", "_growBlueCornB", "_growTeaBushA", "_growTeaBushB", "_growSunflowerPatchA", "_growSunflowerPatchB"], { range: [6.0, 6.25] }],
  ["icons-garden-grow-c", ["_growRedOkraA", "_growRedOkraB", "_growLotusRootBedA", "_growLotusRootBedB", "_tomato", "_basil"], { range: [7.85, 8.15] }],
  ["icons-garden-bag-a", ["bottleGourd", "seedBottleGourd", "rowBean", "seedRowBean", "trellisBerry", "seedTrellisBerry"], { range: [8.0, 8.3] }],
  ["icons-garden-bag-b", ["blueCorn", "seedBlueCorn", "teaBush", "seedTeaBush", "sunflowerPatch", "seedSunflowerPatch"], { range: [6.25, 6.5] }],
  ["icons-garden-bag-c", ["redOkra", "seedRedOkra", "lotusRootBed", "seedLotusRootBed", "_seedTomato", "_seedBasil"], { range: [6.5, 6.75] }],
  // ── the leftover fixes (2026-10-16): what Codex left as worth fixing after looking in the game, drawn again; the first
  // drawings' names above begin "_". fert-h: the night packet given back the rare packets' sparkle star (fert-g lost it),
  // its firefly light kept, the size of packetMist. mist-grow-d: the young mist buckwheat, sesame and watercress a living
  // sage green with dew (they read frosted), the glass flower's heads as clear glass (they read as white clover), the mist
  // fig a fig tree's full lobed crown (it read as a cactus); 96 colours, as grow-c, for the figs' violet. mist-bag-d: the
  // glass flower and its packet the same way (its last four copy bag-b, to hold the size). fly-k: the green mantis a deep
  // green back, a pale cream underside and a dark rim (it was lost against the leaves); the other mantises copy fly-i.
  // wide4-a, wide4-c: the hybrids crisp (the bottle gourd's fruit and the lotus pads were soft), the ripe corn lower and
  // open, the ripe lotus roots in the mounds, the ripe berries bright; measured again by measure-wide.mjs
  ["icons-fert-h", ["_packetMist", "packetNight", "_growFert", "_guardFert", "_mulch", "_compost"], { range: [7.85, 8.15] }],
  ["icons-mist-grow-d", ["growSilverGrainA", "growDewSesameA", "_growCrystalLeafA", "growGlassFlowerB", "_growDewFigA", "_growDewFigB"], { range: [7.85, 8.15], colours: 96 }],
  ["icons-fly-k", ["flyMantisA", "flyMantisB", "_flyOrchidMantisA", "_flyOrchidMantisB", "_flyGhostMantisA", "_flyGhostMantisB"], { range: [7.8, 8.7], pairs: true }],
  // (wide4-a laid the ripe lotus roots along the mounds' fronts again, a kerb: a2 is its prompt with only the ripe lotus's
  // words changed, and came out with the corn lower and more open too, so all six are a2's. wide4-c drew the gourds as pears,
  // c2 as figure eights as big as the leafy clumps, standing on the mounds: c3 hangs them small among the leaves)
  ["icons-wide4-a", ["_wideBlueCornA", "_wideBlueCornB", "_wideLotusRootBedA", "_wideLotusRootBedB", "_wideTrellisBerryA", "_wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide4-a2", ["wideBlueCornA", "wideBlueCornB", "wideLotusRootBedA", "wideLotusRootBedB", "wideTrellisBerryA", "wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide4-c", ["_wideBottleGourdFrontA", "_wideBottleGourdFrontB", "_wideBottleGourdBackA", "_wideBottleGourdBackB", "_wideBottleGourdSideA", "_wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  ["icons-wide4-c2", ["_wideBottleGourdFrontA", "_wideBottleGourdFrontB", "_wideBottleGourdBackA", "_wideBottleGourdBackB", "_wideBottleGourdSideA", "_wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  ["icons-wide4-c3", ["wideBottleGourdFrontA", "wideBottleGourdFrontB", "wideBottleGourdBackA", "wideBottleGourdBackB", "wideBottleGourdSideA", "wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  ["icons-mist-bag-d", ["_glassFlower", "_seedGlassFlower", "_opalStalk", "_seedOpalStalk", "_crystalLeaf", "_seedCrystalLeaf"], { range: [5.3, 5.6] }],
  // (the fix round after Codex looked at the above in the game: the young mist fig still a cactus's upright lobes (must fix),
  // the young mist watercress still a little icy, the glass flower's crop and packet still white clover. grow-e's young fig
  // forks into branches under overlapping leaves, so it parts from the sun's young fig, one big leaf; its places 2 to 4
  // copy grow-d. bag-e's places 3 to 6 copy bag-d. The lotus pads and the gourds were drawn again too (wide4-a3, wide4-c4):
  // both came out worse (the lotus roots a kerb again, the gourds pears), so a2 and c3 stand)
  ["icons-mist-grow-e", ["growCrystalLeafA", "_growSilverGrainA", "_growDewSesameA", "_growGlassFlowerB", "growDewFigA", "growDewFigB"], { range: [7.85, 8.15], colours: 96 }],
  ["icons-mist-bag-e", ["glassFlower", "seedGlassFlower", "_opalStalk", "_seedOpalStalk", "_crystalLeaf", "_seedCrystalLeaf"], { range: [5.3, 5.6] }],
  ["icons-wide4-a3", ["_wideBlueCornA", "_wideBlueCornB", "_wideLotusRootBedA", "_wideLotusRootBedB", "_wideTrellisBerryA", "_wideTrellisBerryB"], { range: [3.9, 4.1] }],
  ["icons-wide4-c4", ["_wideBottleGourdFrontA", "_wideBottleGourdFrontB", "_wideBottleGourdBackA", "_wideBottleGourdBackB", "_wideBottleGourdSideA", "_wideBottleGourdSideB"], { range: [3.9, 4.1] }],
  // ── the garden's eight hybrids small, on one plot each (the owner, 2026-10-16: "ช่วยลดขนาดผักที่มีขนาดใหญ่ และใช้หลายช่อง
  // gen ภาพใหม่ ให้ต้นเล็ก ใช้แค่ช่องเดียวพอ"): each grown and ripe, as low and wide as the tomato and the chilli, with
  // icons-farm-d and icons-farm-c for the reference; they replace icons-garden-grow-*'s (ICONS_REPLACE). Each cut on its own
  // grid: a's 6.9 (on 8.4 the gourds' and flowers' outlines went soft), b's 8.0, c's 8.5, where c's tomato and basil
  // come out the atlas's own (21x35, 25x35 beside 22x36, 25x36)
  ["icons-hybrid-small-a", ["growBottleGourdA", "growBottleGourdB", "growRowBeanA", "growRowBeanB", "growTrellisBerryA", "growTrellisBerryB"], { range: [6.7, 6.95] }],
  ["icons-hybrid-small-b", ["growBlueCornA", "growBlueCornB", "growTeaBushA", "growTeaBushB", "growSunflowerPatchA", "growSunflowerPatchB"], { range: [7.9, 8.1] }],
  ["icons-hybrid-small-c", ["growRedOkraA", "growRedOkraB", "growLotusRootBedA", "growLotusRootBedB", "_tomato", "_basil"], { range: [8.4, 8.65] }],
  // ── things to wear kept in the bag (v276, 2026-10-17): the uncle's round glasses, and the bat merchant's sunglasses
  // for when he comes, with icons-items-e for the reference; its four goods drawn only to hold the size. Cut on the
  // finer grid (5.54): on its coarser (10.9) the lenses came out square
  ["icons-wear-a", ["wearGlasses", "wearSunglasses", "_wearSauce", "_wearTub", "_wearGrowFert", "_wearGuardFert"], { range: [5.4, 5.65] }],
  // ── the 24 more of the bag (v277, 2026-10-17: lib/town/wear-items), with icons-wear-a for the reference, each sheet cut
  // on the fine grid that gives the glasses' own size (on the coarser one, 8 to 16, they came out blocky). `f` drew
  // again the four that read as something else beside their neighbours: the apron (a bag), the pumpkin hat (the
  // crop), the tortoiseshell glasses (the copper ones), the garland (the flower crown); its witch's hat and beret hold the size
  ["icons-wear-b", ["_wearSmith", "wearWeaver", "wearWitch", "wearBeret", "wearTraveller", "_wearPumpkin"], { range: [5.4, 5.6] }],
  ["icons-wear-c", ["wearSmithGoggles", "wearCopper", "wearCrystal", "_wearAmber", "wearHexagon", "wearMonocle"], { range: [5.4, 5.7] }],
  ["icons-wear-d", ["wearSquare", "wearScarf", "_wearLei", "wearBeads", "wearNecktie", "wearTassel"], { range: [5.55, 5.8] }],
  ["icons-wear-e", ["wearCatEars", "wearBunnyEars", "wearHorns", "wearTiara", "wearCrown", "wearRibbon"], { range: [5.3, 5.8] }],
  ["icons-wear-f", ["wearSmith", "wearPumpkin", "wearAmber", "wearLei", "_wearWitchSize", "_wearBeretSize"], { range: [5.3, 5.8] }],
  // ── the pasture (2026-10-20, docs/plans/animals): every item's bag icon, written by pasture-icons.mjs on the ICON SHEET
  // template (the pots on theirs), read by Codex as one batch (one silhouette a family: every egg, fleece and milk bottle
  // the same shape). Each cut on the grid that shows crisp squares at the town's icon size (26 to 60 of their pixels):
  // the feed and tool sheets on their finer grid (6.1; on 12 the hoses and the press's screw went jagged), the pots on
  // theirs (6, as the town's pots of 46 by 55), the rest on their own. README "The pasture".
  ["icons-pasture-eggs-a", ["farmEgg", "silkieEgg", "blueEgg", "chocolateEgg", "lanternEgg", "cloudEgg"], { range: [7.4, 7.75] }],
  ["icons-pasture-eggs-b", ["goldenEgg", "emberEgg", "duckEgg", "runnerEgg", "cayugaEgg", "mandarinEgg"], { range: [6.7, 7] }],
  ["icons-pasture-eggs-c", ["rainEgg", "moonEgg", "paperEgg", "leviathanEgg", "cream", "butter"], { range: [9.2, 9.6] }],
  ["icons-pasture-wool-a", ["wool", "shetlandWool", "jacobWool", "valaisWool", "dandelionWool", "rainbowWool"], { range: [8.3, 8.6] }],
  ["icons-pasture-wool-b", ["starWool", "goldenWool", "yarn", "woolScarf", "rainbowScarf", "starScarf"], { range: [7.1, 7.4] }],
  ["icons-pasture-milk-a", ["farmMilk", "jerseyMilk", "highlandMilk", "swissMilk", "strawberryMilk", "cocoaMilk"], { range: [7.9, 8.15] }],
  ["icons-pasture-milk-b", ["flowerMilk", "starMilk", "farmCheese", "goldenScarf", "prism", "packedRation"], { range: [5.95, 6.2] }],
  ["icons-pasture-feed-a", ["chickFeed", "duckFeed", "sheepFeed", "cowFeed", "chickGrow", "duckGrow"], { range: [6.7, 7] }],
  ["icons-pasture-feed-b", ["lambGrow", "calfGrow", "dewGrow", "cowBell", "milker", "woolShears"], { range: [6, 6.3] }],
  ["icons-pasture-tool-a", ["eggBasket", "churn", "cheesePress", "spindle", "knittingNeedles", "charmHerdBell"], { range: [5.95, 6.2] }],
  // (Uncle Popoto's tag that renames an animal, 2026-10-20)
  ["icons-pasture-tag", ["renameTag"]],
  ["icons-pasture-gift-a", ["thingBarnCat", "thingWarmBottle", "charmStarCollar", "thingCradle", "famCloudRam", "thingTwinCradle"], { range: [7.25, 7.55] }],
  ["icons-pasture-wild-a", ["mistVetch", "ghostReed", "dewClover", "dawnOats", "meadowOats", "sweetTimothy"], { range: [7.85, 8.15] }],
  ["icons-pasture-wild-b", ["sunAlfalfa", "pondMillet", "copperSedge", "orchardPea", "amberClover", "reedSeed"], { range: [7.85, 8.15] }],
  ["icons-pasture-wild-c", ["lanternGrass", "velvetVetch", "moonOats", "nightDuckweed", "thingHarp", "thingSpringWind"], { range: [9.4, 9.8] }],
  ["icons-pasture-dish-a", ["custard", "pancakes", "cheesecake", "butterCookies", "quiche", "lanternCustard"], { range: [7.85, 8.15] }],
  ["icons-pasture-dish-b", ["cloudSouffle", "goldenOmelette", "emberBakedEggs", "rainBroth", "moonPudding", "paperFish"], { range: [7.85, 8.15] }],
  ["icons-pasture-dish-c", ["leviathanEggCup", "strawberryShake", "hotCocoa", "flowerLatte", "starPudding", "thingHayWagon"], { range: [6.7, 7] }],
  ["icons-pasture-pots-a", ["potCustard", "potPancakes", "potCheesecake", "potButterCookies", "potQuiche", "potLanternCustard"], { range: [5.8, 6.05] }],
  ["icons-pasture-pots-b", ["potCloudSouffle", "potGoldenOmelette", "potEmberBakedEggs", "potRainBroth", "potMoonPudding", "potPaperFish"], { range: [6.05, 6.35] }],
  ["icons-pasture-pots-c", ["potLeviathanEggCup", "potStrawberryShake", "potHotCocoa", "potFlowerLatte", "potStarPudding", "_potCustard"], { range: [6.1, 6.35] }],
];

const ONLY = process.env.ICONS_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const pieces = [];
for (const [sheet, names, opts] of SHEETS) {
  if (ONLY && !ONLY.includes(sheet)) continue;
  const file = path.join(OUT, `${sheet}.png`);
  if (!fs.existsSync(file)) { console.log(`no ${sheet}`); continue; }
  const raw = await L.loadRaw(file);
  // icons on a 16-pixel grid fill about 180 of the sheet's pixels: big true pixels
  const grid = L.detectGrid(raw, undefined, opts?.range ?? [6, 16]);
  const g = L.cellsOf(raw, grid);
  // (`colours`: a sheet with one pale hue close to another's takes a larger palette: at 48 the mist fig's pale violet
  // went into its sage leaves, 2026-10-16)
  L.snap(g, L.paletteOf([g], opts?.colours ?? 48));
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
    if (name.startsWith("_")) return;
    const set = figs[k];
    if (!set || !set.size) { console.log(`  ${name}: nothing found`); return; }
    const im = L.crop(g, set);
    pieces.push({ name, img: im });
    console.log(`${name.padEnd(15)} ${im.w}x${im.h}  (grid ${grid.p.toFixed(2)})`);
  });
  // (`pairs`: two frames of one thing side by side, an insect's wings up and down: each pair is laid one on the other where
  // the most of their px agree, its body, and both are cut to the box of the two, so that the body stays still between them)
  if (opts?.pairs) for (let k = 0; k + 1 < names.length; k += 2) {
    const a = pieces.find((p) => p.name === names[k]), b = pieces.find((p) => p.name === names[k + 1]);
    if (!a || !b) continue;
    const A = a.img, B = b.img, px = (im, x, y) => (x < 0 || y < 0 || x >= im.w || y >= im.h ? null : im.buf[(y * im.w + x) * 4 + 3] ? im.buf.subarray((y * im.w + x) * 4, (y * im.w + x) * 4 + 3) : null);
    let best = { n: -1, dx: 0, dy: 0 };
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      let n = 0;
      for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { const p = px(A, x, y), q = p && px(B, x + dx, y + dy); if (q && Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 40) n++; }
      if (n > best.n) best = { n, dx, dy };
    }
    // B's (x + dx, y + dy) lies on A's (x, y): the box of the two in A's frame
    const x0 = Math.min(0, -best.dx), y0 = Math.min(0, -best.dy), x1 = Math.max(A.w, B.w - best.dx), y1 = Math.max(A.h, B.h - best.dy), w = x1 - x0, h = y1 - y0;
    const lay = (im, ox, oy) => { const buf = Buffer.alloc(w * h * 4); for (let y = 0; y < im.h; y++) im.buf.copy(buf, ((y + oy) * w + ox) * 4, y * im.w * 4, (y + 1) * im.w * 4); return { buf, w, h }; };
    a.img = lay(A, -x0, -y0); b.img = lay(B, -best.dx - x0, -best.dy - y0);
    console.log(`  ${names[k]} + ${names[k + 1]}: laid together at ${best.dx},${best.dy} (${best.n} px agree), both ${w}x${h}`);
  }
}

if (process.env.ICONS_APPEND) {
  // under the atlas there is: its picture kept as it is, the new pieces packed in rows below it, tallest first
  const atlas = JSON.parse(fs.readFileSync(JSON_OUT, "utf8"));
  // (ICONS_REPLACE: names already there are drawn again, and their entries point at the new pieces; the old pixels stay
  // in the picture, unused. The garden's hybrids went in that way, 2026-10-15)
  const dup = pieces.filter((p) => Object.hasOwn(atlas.icons, p.name)).map((p) => p.name);
  if (dup.length && !process.env.ICONS_REPLACE) throw new Error(`already in the atlas: ${dup.join(", ")}`);
  if (dup.length) console.log(`drawn again: ${dup.join(", ")}`);
  if (!pieces.length) throw new Error("no sheet cut: ICONS_ONLY names none of SHEETS");
  const [AW, AH] = atlas.size, PAD = 2;
  let x = PAD, y = AH + PAD, rowH = 0;
  for (const p of [...pieces].sort((a, b) => b.img.h - a.img.h)) {
    if (x + p.img.w + PAD > AW) { x = PAD; y += rowH + PAD; rowH = 0; }
    p.x = x; p.y = y; x += p.img.w + PAD; rowH = Math.max(rowH, p.img.h);
  }
  const H = y + rowH + PAD, was = path.join(PUB, path.basename(atlas.image));
  const old = await L.sharp(was).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (old.info.width !== AW || old.info.height !== AH) throw new Error(`${atlas.image} is ${old.info.width}x${old.info.height}, the atlas says ${AW}x${AH}`);
  const sheet = Buffer.alloc(AW * H * 4);
  old.data.copy(sheet, 0);
  for (const p of pieces) for (let r = 0; r < p.img.h; r++) p.img.buf.copy(sheet, ((p.y + r) * AW + p.x) * 4, r * p.img.w * 4, (r + 1) * p.img.w * 4);
  const png = await L.sharp(sheet, { raw: { width: AW, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  const image = `/town/icons-${crypto.createHash("sha256").update(png).digest("hex").slice(0, 12)}.png`;
  fs.writeFileSync(path.join(PUB, path.basename(image)), png);
  if (image !== atlas.image) fs.unlinkSync(was);
  atlas.image = image; atlas.size = [AW, H];
  for (const p of pieces) atlas.icons[p.name] = [p.x, p.y, p.img.w, p.img.h];
  fs.writeFileSync(JSON_OUT, JSON.stringify(atlas, null, 2) + "\n");
  console.log(`appended ${pieces.length} icons under the atlas: ${image} ${AW}x${H} (${(png.length / 1024).toFixed(1)} KB)`);
  process.exit(0);
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
