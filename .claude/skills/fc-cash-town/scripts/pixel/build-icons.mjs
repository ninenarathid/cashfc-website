// Cash Town's icons: AI sheets in work/out -> public/town/icons-<hash>.png + lib/town/icon-atlas.json.
//
//   node build-icons.mjs
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
const OUT = path.join(HERE, "work", "out");
const PUB = "E:/NinenineProject/fcnext/public/town";
const JSON_OUT = "E:/NinenineProject/fcnext/lib/town/icon-atlas.json";

// [sheet, names] in the order they stand on the sheet, left to right
const SHEETS = [
  ["icons-a", ["mic", "muted", "speaker", "micSettings", "warning", "signal"]],
  ["icons-b", ["wardrobe", "stats", "fullscreen", "exitFullscreen", "leave", "close"]],
  ["icons-c", ["zoomIn", "zoomOut", "recenter", "people", "walk", "away"]],
  ["icons-d", ["chat", "history", "down", "chevron", "check", "lock"]],
  ["icons-e", ["dice", "turnLeft", "turnRight", "town", "vote", "hammer"]],
  ["icons-f", ["music", "musicOff", "volumeLow", "volumeHigh"]],
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
  for (const c of parts) {
    const mid = c.mem.reduce((t, i) => t + (i % g.GW), 0) / c.mem.length;
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
