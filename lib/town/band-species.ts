import { BANDS, type BandId } from "./bands";
import type { Fish, Item, ItemId } from "./items";
import type { Bug, HauntKind } from "./insects";
import type { Current, FishingHabitat } from "./river-items";
import type { Place, Zone } from "./world";

/**
 * The time bands' newcomers (the farm's Quality rework, piece 4b; the owner's design of 2026-10-15, section 8 of the
 * design page, docs/plans/farm-quality): twenty-four insects and twenty-four fish, each found by three things only,
 * **where, which band, and its habit or its bait** (no rain, moon or day of its own), and four rare finds. About a
 * third span two or three bands, the first of them the band they are most out in (`peak`).
 *
 * **They never take an old one's place** (AGENTS.md, "Cash Town time of day": the old species keep their windows and
 * their rates):
 * - an insect keeps to haunts of its own (`NEW_HAUNT_KINDS`: flowers, leaves, logs, bark, litter, sand, posts laid out
 *   after every old haunt, lib/town/insects' HAUNTS), so no old haunt's turn is ever theirs; nothing comes back after
 *   a catch at one, nor comes back to one; a drop of nectar and the cloak never reach one; the farm's pests do not count
 *   them (they are the garden's visitors, lib/town/insect-garden);
 * - a fish only ever takes the place of what is no fish (`freshOdds`, lib/town/fishing): every fish's own chance on a
 *   cast is what it was, to the last digit, after every gift that shapes the odds; what is no fish (the hyacinth, the
 *   boot, the driftwood, the bottle; never a pearl or a chest) comes up that much less often where a newcomer fits;
 * - a find comes only in a turn of its place that had nothing (lib/town/forest's `quiet`), at the mine as something
 *   more besides what a rock left (`GUANO`), and at the stream's bank as a sample of its own (lib/town/stream-work).
 *
 * **Uses by family, one rule each** (the design's eight). What works now: a pollinator let go on a plant pollinates and
 * crosses by its sky (`POLLINATOR_SKY`: its time icon's), a hunter takes pests off a plant, a small fish goes on a hook
 * as a minnow does. What consumes the rest comes later, recorded in `FAMILIES` (`later`): the insect house (piece 4a)
 * houses the three insect roles; the fertilisers (piece 3) make glow powder, beetle frass, fish emulsion, bone meal and
 * the scale powder of the ornate fish with recipes that take "any of a family", which is that piece's to build.
 *
 * Pure data. The windows stay data here (`windowsOf`), for the notebook now and a museum later.
 */

export type Family = "pollinator" | "predator" | "decomposer" | "glower" | "smallFish" | "mediumFish" | "largeFish" | "ornateFish";
/** How rare, among the newcomers: common, uncommon, rare, very rare. */
export type Rarity = "C" | "U" | "R" | "V";
/** An insect's fixed time icon on its card: the day's, the night's, the dawn mist's (only the 03–07 ones). */
export type TimeIcon = "sun" | "moon" | "mist";

export const FAMILIES: Record<Family, { th: string; en: string; now: [string, string] | null; later: string }> = {
  pollinator: { th: "ผสมเกสร", en: "Pollinator", now: ["ปล่อยบนต้นที่ยังไม่สุกเพื่อช่วยผสมเกสร ข้ามสายพันธุ์ตามฟ้าของมัน", "Released on an unripe plant it pollinates, and crosses by its own sky."], later: "the insect house's pollen room (piece 4a)" },
  predator: { th: "ล่าเหยื่อ", en: "Hunter", now: ["ปล่อยบนต้นที่มีศัตรูพืชเพื่อช่วยกำจัด", "Released on a plant with pests it takes them off."], later: "the insect house's guard room (piece 4a)" },
  decomposer: { th: "ย่อยดิน", en: "Soil worker", now: null, later: "the insect house's soil room (piece 4a); beetle frass, the fertiliser of any soil worker x1 (piece 3)" },
  glower: { th: "เรืองแสง", en: "Glower", now: null, later: "glow powder, any glower x1 -> 2 (piece 3), and the bat merchant's swap (piece 6)" },
  smallFish: { th: "ปลาเล็ก", en: "Small fish", now: ["เกี่ยวเบ็ดเป็นเหยื่อได้เหมือนปลาซิว", "Goes on a hook as a minnow does."], later: "fish emulsion, any small fish x2 + compost (piece 3); recipes that take any small fish x3" },
  mediumFish: { th: "ปลากลาง", en: "Medium fish", now: null, later: "food: dishes that take any medium fish (with the family recipes, piece 3)" },
  largeFish: { th: "ปลาใหญ่", en: "Large fish", now: null, later: "bone meal, any large fish x1 -> 3 (piece 3); a feast" },
  ornateFish: { th: "ปลาสวยหายาก", en: "Ornate fish", now: null, later: "scale powder, the fertiliser alternative (piece 3); the museum" },
};

/** The hours of some bands, as [from, to) pairs within the day, the ones that run past midnight split there. */
export function hoursOf(bands: readonly BandId[]): Array<[number, number]> {
  const on = Array<boolean>(24).fill(false);
  for (const id of bands) { const b = BANDS.find((x) => x.id === id)!; for (let h = b.from; h < b.to; h++) on[h % 24] = true; }
  const out: Array<[number, number]> = [];
  for (let h = 0; h < 24; h++) if (on[h]) { const last = out[out.length - 1]; if (last && last[1] === h) last[1] = h + 1; else out.push([h, h + 1]); }
  return out;
}
/** Whether an hour (0–24, fractions too) is in some [from, to) pairs. */
export const inHours = (hours: ReadonlyArray<readonly [number, number]>, h: number) => hours.some(([a, z]) => h >= a && h < z);

/* ── the insects ─────────────────────────────────────────────────────────── */

/** The haunts that are the newcomers' own, a kind for each place of theirs in the design: the old ones' kinds are never theirs. */
export const NEW_HAUNT_KINDS = ["petals", "leaves", "logs", "bark", "duff", "sand", "posts"] as const satisfies readonly HauntKind[];
/** How often each rarity is out beside the others at one of their haunts, against `QUIET.none`. **Mine**: fitted to the measured appearances in band-species.test.ts. */
export const INSECT_WEIGHT: Record<Exclude<Rarity, "V">, number> = { C: 60, U: 20, R: 6 };
/** At a newcomers' haunt a turn has nothing so often beside them (so one that is alone in its band is not out at every turn); outside its peak band one that spans several weighs this much of itself. */
export const QUIET = { none: 100, offPeak: 0.5 };

type InsectRow = {
  id: string; th: string; en: string; family: "pollinator" | "predator" | "decomposer" | "glower";
  place: Place; at: HauntKind; zones?: Zone[]; bands: BandId[]; rarity: Exclude<Rarity, "V">; time: TimeIcon;
  /** How it is caught (one of lib/town/insects' habits), and the design's words for it on its card. */
  habit: Bug["habit"]; hint: [string, string];
  look: [string, string]; size: number; quick?: number; tracks?: boolean; like?: string;
};
const I = <const T extends string>(r: Omit<InsectRow, "id"> & { id: T }) => r;
/** The twenty-four, in the order of the day from before dawn. */
export const NEW_INSECTS = [
  I({ id: "megaloptaBee", th: "ผึ้งเมกาโลปตา", en: "Megalopta bee", family: "pollinator", place: "forest", at: "petals", zones: ["edge"], bands: ["beforeDawn", "earlyMorning"], rarity: "U", time: "mist",
    habit: "path", hint: ["ดักทางบิน", "Wait on its flight path"], look: ["ผึ้งตัวผอมสีเขียวหม่น ตาโตสีดำเกือบเต็มหัว", "A slim dusky green bee whose big black eyes cover most of its head"], size: 0.7 }),
  I({ id: "ghostMantis", th: "ตั๊กแตนตำข้าวผี", en: "Ghost mantis", family: "predator", place: "forest", at: "leaves", bands: ["beforeDawn"], rarity: "U", time: "moon",
    habit: "look", like: "decoyLeaf", hint: ["หาเงาพราง", "Look for the shape hiding as a leaf"], look: ["ตั๊กแตนตำข้าวสีน้ำตาลหม่น ปีกยับเหมือนใบไม้แห้ง", "A dull brown mantis with crumpled wings like a dead leaf"], size: 0.7 }),
  I({ id: "railroadWorm", th: "หนอนรถไฟ", en: "Railroad worm", family: "glower", place: "forest", at: "logs", bands: ["beforeDawn"], rarity: "U", time: "moon",
    habit: "look", hint: ["ตามจุดเรือง", "Follow its row of lights"], look: ["ตัวหนอนยาวสีน้ำตาลอ่อน มีจุดเรืองสีเขียวเรียงสองข้างและหัวสีแดง", "A long pale brown larva with a row of green lights down each side and a red head"], size: 0.6 }),
  I({ id: "indianNightBee", th: "ผึ้งราตรีอินเดีย", en: "Indian night bee", family: "pollinator", place: "forest", at: "petals", zones: ["edge"], bands: ["earlyMorning"], rarity: "U", time: "mist",
    habit: "spot", hint: ["รอเหนือดอก", "Wait above the flowers"], look: ["ผึ้งสีน้ำตาลอำพัน ขนฟูที่อก ตาสีเข้มโต", "An amber brown bee with a fluffy chest and large dark eyes"], size: 0.65 }),
  I({ id: "snakefly", th: "แมลงงู", en: "Snakefly", family: "predator", place: "forest", at: "bark", bands: ["earlyMorning", "lateMorning"], rarity: "R", time: "sun",
    habit: "behind", tracks: true, hint: ["เข้าด้านหลัง", "Come at it from behind"], look: ["แมลงคอยาวยกหัวขึ้นเหมือนงู ปีกใสมีเส้นสีดำ", "A long-necked insect that rears its head like a snake, on clear black-veined wings"], size: 0.65 }),
  I({ id: "earwig", th: "แมลงหางหนีบ", en: "Earwig", family: "decomposer", place: "farm", at: "duff", bands: ["earlyMorning"], rarity: "C", time: "sun",
    habit: "look", like: "decoyLeaf", hint: ["พลิกใบ", "Turn the leaves over"], look: ["ตัวแบนยาวสีน้ำตาลแดง ปลายหางเป็นคีมโค้งสองข้าง", "A flat red-brown body ending in a pair of curved pincers"], size: 0.65 }),
  I({ id: "masonBee", th: "ผึ้งเมสัน", en: "Mason bee", family: "pollinator", place: "town", at: "petals", bands: ["lateMorning", "midday"], rarity: "C", time: "sun",
    habit: "path", hint: ["ดักทางบิน", "Wait on its flight path"], look: ["ผึ้งตัวกลมสีน้ำเงินเหลือบเขียว ขนท้องสีส้ม", "A round metallic blue-green bee with an orange furry belly"], size: 0.75 }),
  I({ id: "tigerBeetle", th: "ด้วงเสือ", en: "Tiger beetle", family: "predator", place: "forest", at: "sand", bands: ["lateMorning"], rarity: "U", time: "sun",
    habit: "crawl", quick: 1.6, hint: ["รอหยุดวิ่ง", "Wait for it to stop running"], look: ["ด้วงขายาวสีเขียวมรกตเงา มีจุดขาวบนปีก กรามโค้ง", "A long-legged shining emerald beetle with white spots on its back and curved jaws"], size: 0.7 }),
  I({ id: "roseChafer", th: "ด้วงกุหลาบ", en: "Rose chafer", family: "decomposer", place: "farm", at: "duff", bands: ["lateMorning"], rarity: "C", time: "sun",
    habit: "crawl", hint: ["เดินตามพื้น", "It walks along the ground"], look: ["ด้วงหลังเรียบสีเขียวทองเหลือบ มีเส้นขาวจางๆ", "A smooth beetle of shining green-gold with faint white streaks"], size: 0.8 }),
  I({ id: "woolCarderBee", th: "ผึ้งขนแกะ", en: "Wool-carder bee", family: "pollinator", place: "farm", at: "petals", bands: ["midday", "afternoon"], rarity: "C", time: "sun",
    habit: "spot", hint: ["รอจุดพัก", "Wait where it rests"], look: ["ผึ้งตัวอ้วนสีดำ มีจุดเหลืองเรียงข้างท้อง", "A stout black bee with yellow spots along the sides of its body"], size: 0.75 }),
  I({ id: "oilBeetle", th: "ด้วงน้ำมัน", en: "Oil beetle", family: "decomposer", place: "forest", at: "duff", bands: ["midday"], rarity: "U", time: "sun",
    habit: "crawl", hint: ["เดินตามพื้น", "It walks along the ground"], look: ["ด้วงท้องป่องสีน้ำเงินดำเหลือบ ปีกสั้นกุด", "A swollen blue-black beetle with short stubby wing covers"], size: 0.8 }),
  I({ id: "assassinBug", th: "มวนเพชฌฆาต", en: "Assassin bug", family: "predator", place: "farm", at: "leaves", bands: ["midday"], rarity: "U", time: "sun",
    habit: "behind", tracks: true, hint: ["เข้าด้านหลัง", "Come at it from behind"], look: ["มวนตัวเรียวสีแดงดำ ปากเป็นงวงโค้งใต้หัว", "A slender red and black bug with a curved beak tucked under its head"], size: 0.7 }),
  I({ id: "blueBandedBee", th: "ผึ้งแถบฟ้า", en: "Blue-banded bee", family: "pollinator", place: "town", at: "petals", bands: ["afternoon", "evening"], rarity: "U", time: "sun",
    habit: "path", quick: 1.2, hint: ["ดักทางบิน", "Wait on its flight path"], look: ["ผึ้งสีน้ำตาลทองมีแถบสีฟ้าสดพาดท้อง", "A golden brown bee with bright blue bands across its body"], size: 0.7 }),
  I({ id: "robberFly", th: "แมลงวันโจร", en: "Robber fly", family: "predator", place: "farm", at: "posts", bands: ["afternoon"], rarity: "C", time: "sun",
    habit: "spot", hint: ["รอจุดพัก", "Wait where it rests"], look: ["แมลงวันตัวยาวสีเทา ขาหน้ามีขน หนวดเคราที่หน้า", "A long grey fly with bristly legs and a moustache of hairs on its face"], size: 0.7 }),
  I({ id: "superworm", th: "ซูเปอร์เวิร์ม", en: "Superworm", family: "decomposer", place: "forest", at: "logs", bands: ["afternoon"], rarity: "C", time: "sun",
    habit: "look", like: "twig", hint: ["หาในเศษใบ", "Search the litter"], look: ["หนอนตัวยาวอ้วนสีเหลืองทอง ข้อปล้องสีน้ำตาลเข้ม", "A long plump golden larva ringed with dark brown segments"], size: 0.6 }),
  I({ id: "clearwingMoth", th: "มอธปีกใส", en: "Hummingbird clearwing", family: "pollinator", place: "town", at: "petals", bands: ["evening", "night"], rarity: "U", time: "sun",
    habit: "path", quick: 1.3, hint: ["ดักทางบิน", "Wait on its flight path"], look: ["มอธตัวอ้วนสีเขียวมะกอกท้องแดงเข้ม ปีกใสขอบน้ำตาล", "A stout olive green moth with a dark red belly and clear brown-rimmed wings"], size: 0.8 }),
  I({ id: "antlion", th: "แมลงช้าง", en: "Antlion", family: "predator", place: "forest", at: "sand", bands: ["evening"], rarity: "C", time: "sun",
    habit: "look", like: "twig", hint: ["สังเกตหลุม", "Watch the pits in the sand"], look: ["ตัวอ่อนท้องกลมสีน้ำตาลทราย กรามคีมยาวสองข้าง", "A round sandy brown larva with two long pincer jaws"], size: 0.65 }),
  I({ id: "bessBeetle", th: "ด้วงเบสส์", en: "Bess beetle", family: "decomposer", place: "forest", at: "logs", bands: ["evening"], rarity: "C", time: "sun",
    habit: "lure", hint: ["ของหวานล่อ", "Bring it down with something sweet"], look: ["ด้วงสีดำเงา หลังมีร่องยาว มีเขาเล็กบนหัว", "A glossy black beetle with long grooves down its back and a small horn on its head"], size: 0.9 }),
  I({ id: "yuccaMoth", th: "มอธยัคคา", en: "Yucca moth", family: "pollinator", place: "town", at: "petals", bands: ["night", "lateNight"], rarity: "U", time: "moon",
    habit: "spot", hint: ["รอดอกพักบิน", "Wait for it to settle on a flower"], look: ["มอธตัวเล็กสีขาวนวลเหมือนกลีบดอก หนวดยาว", "A small creamy white moth like a petal, with long feelers"], size: 0.65 }),
  I({ id: "roveBeetle", th: "ด้วงก้นกระดก", en: "Rove beetle", family: "predator", place: "farm", at: "duff", bands: ["night"], rarity: "C", time: "moon",
    habit: "crawl", hint: ["เดินตามพื้น", "It walks along the ground"], look: ["ด้วงตัวยาวสีส้มดำ ปีกสั้น ปลายท้องงอนขึ้น", "A long orange and black beetle with short wing covers and an upturned tail"], size: 0.65 }),
  I({ id: "cucujoBeetle", th: "ด้วงคลิกเรืองแสง", en: "Cucujo click beetle", family: "glower", place: "forest", at: "bark", bands: ["night"], rarity: "U", time: "moon",
    habit: "look", hint: ["ตามแสงคู่", "Follow the pair of lights"], look: ["ด้วงสีน้ำตาลเข้ม มีจุดเรืองสีเขียวสองจุดที่ไหล่", "A dark brown beetle with two glowing green spots on its shoulders"], size: 0.75 }),
  I({ id: "tobaccoHawkmoth", th: "มอธยาสูบ", en: "Tobacco hawkmoth", family: "pollinator", place: "farm", at: "petals", bands: ["lateNight", "beforeDawn"], rarity: "U", time: "moon",
    habit: "path", quick: 1.3, hint: ["ดักทางบิน", "Wait on its flight path"], look: ["มอธตัวใหญ่สีเทาลายเส้น ท้องมีจุดสีส้มเรียงข้าง", "A large grey streaked moth with a row of orange spots down its body"], size: 0.85 }),
  I({ id: "blueGhostFirefly", th: "หิ่งห้อยผีฟ้า", en: "Blue ghost firefly", family: "glower", place: "forest", at: "leaves", bands: ["lateNight"], rarity: "R", time: "moon",
    habit: "look", hint: ["ตามแสงต่ำ", "Follow the light low over the brush"], look: ["หิ่งห้อยตัวเล็กสีเทาดำ ก้นเปล่งแสงสีฟ้าอมขาว", "A small grey-black firefly whose tail shines bluish white"], size: 0.6 }),
  I({ id: "californiaGlowworm", th: "หนอนเรืองแสง", en: "California glowworm", family: "glower", place: "forest", at: "duff", bands: ["lateNight"], rarity: "C", time: "moon",
    habit: "look", hint: ["หาแสงใต้ใบ", "Look for the light under the leaves"], look: ["ตัวอ่อนแบนเป็นปล้องสีน้ำตาลอ่อน ปลายท้องมีจุดเรืองสีเขียว", "A flat segmented pale brown larva with a glowing green spot at its tail"], size: 0.6 }),
] as const;
export type NewInsectId = (typeof NEW_INSECTS)[number]["id"];

const INSECT_PAYS: Record<Exclude<Rarity, "V">, number> = { C: 3, U: 7, R: 24 };
const INSECT_COST: Record<Exclude<Rarity, "V">, number> = { C: 1, U: 2, R: 3 };
const INSECT_STACK: Record<Exclude<Rarity, "V">, number> = { C: 20, U: 10, R: 5 };
/** Each newcomer insect as lib/town/insects has its insects, the peak band's hours whole and the rest at half weight. */
export const NEW_BUGS = Object.fromEntries((NEW_INSECTS as readonly InsectRow[]).map((r): [string, Bug] => {
  const hours = hoursOf(r.bands), peak = r.bands.length > 1 ? hoursOf(r.bands.slice(0, 1)) : undefined;
  return [r.id, {
    habit: r.habit, at: [r.at], weight: INSECT_WEIGHT[r.rarity], n: [1, 1], cost: INSECT_COST[r.rarity], size: r.size, places: [r.place],
    ...(r.zones ? { zones: r.zones } : {}), hours, ...(peak ? { peak } : {}), ...(r.quick ? { quick: r.quick } : {}), ...(r.tracks ? { tracks: true } : {}), ...(r.like ? { like: r.like } : {}),
  }];
})) as Record<NewInsectId, Bug>;
export const NEW_INSECT_ITEMS = Object.fromEntries((NEW_INSECTS as readonly InsectRow[]).map((r): [string, Item] => [r.id, {
  kind: "bug", tier: r.rarity === "R" ? 3 : 2, name: { th: r.th, en: r.en }, about: { th: r.look[0], en: r.look[1] }, stack: INSECT_STACK[r.rarity], pays: INSECT_PAYS[r.rarity],
}])) as Record<NewInsectId, Item>;
/** The newcomer soil workers (decomposers), for the insect house's soil room (piece 4a, lib/town/insect-house's SOIL_WORKERS reads them). */
export const DECOMPOSERS = (NEW_INSECTS as readonly InsectRow[]).filter((r) => r.family === "decomposer").map((r) => r.id as NewInsectId);
/** The newcomer pollinators' skies, by their time icon: the day's, the night's, the dawn mist's (whose crossing comes with piece 5; until then a mist child is the day's). */
export const NEW_POLLINATOR_SKY = Object.fromEntries((NEW_INSECTS as readonly InsectRow[]).filter((r) => r.family === "pollinator").map((r) => [r.id, r.time === "moon" ? "moon" : r.time === "mist" ? "mist" : "sun"])) as Record<string, "sun" | "moon" | "mist">;

/* ── the fish ────────────────────────────────────────────────────────────── */

type FishRow = {
  id: string; th: string; en: string; family: "smallFish" | "mediumFish" | "largeFish" | "ornateFish";
  habitat: FishingHabitat; bands: BandId[]; rarity: Rarity; bait: "worm" | "dough" | "corn" | "cricket" | "shrimpLive" | "smallFish";
  look: [string, string]; fight: Fish["fight"]["style"];
};
const F = <const T extends string>(r: Omit<FishRow, "id"> & { id: T }) => r;
/** The twenty-four, in the order of the day from before dawn. "Small fish" as a bait is a minnow or a loach on the hook (or a newcomer small fish, which goes on as a minnow does). */
export const NEW_FISH_ROWS = [
  F({ id: "pearlDanio", th: "ปลาดานิโอไข่มุกดารา", en: "Celestial pearl danio", family: "ornateFish", habitat: "town", bands: ["beforeDawn", "earlyMorning"], rarity: "V", bait: "worm", fight: "darter",
    look: ["ปลาตัวจิ๋วสีน้ำเงินเข้ม มีจุดทองเหมือนดาวทั่วตัว ครีบส้มลายดำ", "A tiny deep blue fish speckled with golden stars, its fins orange with black stripes"] }),
  F({ id: "peacockGudgeon", th: "ปลาบู่นกยูง", en: "Peacock gudgeon", family: "ornateFish", habitat: "creek", bands: ["beforeDawn"], rarity: "R", bait: "shrimpLive", fight: "sleeper",
    look: ["ปลาบู่หน้าผากโหนก ตัวสีม่วงอมฟ้า ครีบขอบเหลืองและจุดดำที่หาง", "A humped-headed goby, violet-blue, its fins edged yellow with a black spot at the tail"] }),
  F({ id: "huchen", th: "ปลาฮูเชน", en: "Huchen", family: "largeFish", habitat: "headwater", bands: ["beforeDawn"], rarity: "V", bait: "smallFish", fight: "leaper",
    look: ["ปลาแซลมอนตัวยาวสีทองแดงอมแดง หัวแหลมและจุดดำเล็กทั่วหลัง", "A long copper-red salmon with a pointed head and small black spots across its back"] }),
  F({ id: "forktailBlueEye", th: "ปลาตาฟ้าหางส้อม", en: "Forktail blue-eye", family: "smallFish", habitat: "town", bands: ["earlyMorning"], rarity: "R", bait: "dough", fight: "darter",
    look: ["ปลาเล็กตัวใส ตาสีฟ้าสด ครีบหางแฉกเป็นเส้นยาวสีเหลือง", "A small see-through fish with bright blue eyes and long yellow streamers on its forked tail"] }),
  F({ id: "empireGudgeon", th: "ปลาบู่จักรวรรดิ", en: "Empire gudgeon", family: "mediumFish", habitat: "creek", bands: ["earlyMorning"], rarity: "R", bait: "worm", fight: "sleeper",
    look: ["ปลาบู่ตัวป้อมสีทองส้ม มีจุดฟ้าเรียงข้างตัวและครีบขอบแดง", "A stout orange-gold gudgeon with rows of blue dots along its sides and red-edged fins"] }),
  F({ id: "lenok", th: "ปลาเลน็อก", en: "Lenok", family: "largeFish", habitat: "headwater", bands: ["earlyMorning", "lateMorning"], rarity: "R", bait: "cricket", fight: "steady",
    look: ["ปลาเทราต์ตัวหนาสีบรอนซ์ ข้างตัวมีจุดดำกลมและแต้มส้ม", "A thick bronze trout with round black spots and orange patches along its sides"] }),
  F({ id: "zebrafish", th: "ปลาม้าลาย", en: "Zebrafish", family: "smallFish", habitat: "town", bands: ["lateMorning", "midday"], rarity: "C", bait: "dough", fight: "darter",
    look: ["ปลาตัวเล็กเรียว มีแถบสีน้ำเงินเข้มสลับครีมยาวตลอดตัว", "A small slender fish striped from head to tail in dark blue and cream"] }),
  F({ id: "europeanChub", th: "ปลาชับยุโรป", en: "European chub", family: "mediumFish", habitat: "creek", bands: ["lateMorning"], rarity: "C", bait: "corn", fight: "steady",
    look: ["ปลาหัวกว้างเกล็ดใหญ่สีเงินขอบเข้ม ครีบท้องสีส้ม", "A broad-headed fish with big dark-edged silver scales and orange lower fins"] }),
  F({ id: "arcticChar", th: "ปลาชาร์อาร์กติก", en: "Arctic char", family: "mediumFish", habitat: "headwater", bands: ["lateMorning"], rarity: "U", bait: "cricket", fight: "leaper",
    look: ["ปลาหลังเขียวมะกอก ท้องสีแดงส้ม จุดชมพูอ่อนข้างตัว ครีบขอบขาว", "An olive-backed fish with a red-orange belly, pale pink spots and white-edged fins"] }),
  F({ id: "rosyBitterling", th: "ปลาบิตเทอร์ลิงกุหลาบ", en: "Rosy bitterling", family: "smallFish", habitat: "town", bands: ["midday", "afternoon"], rarity: "C", bait: "dough", fight: "darter",
    look: ["ปลาตัวแบนสูงสีเงินอมชมพู มีแถบเขียวที่โคนหาง", "A flat deep-bodied silver fish blushed with rose, a green streak near its tail"] }),
  F({ id: "pumpkinseed", th: "ปลาซันฟิช", en: "Pumpkinseed sunfish", family: "mediumFish", habitat: "creek", bands: ["midday"], rarity: "C", bait: "worm", fight: "darter",
    look: ["ปลาตัวกลมแบนลายส้มฟ้า มีจุดแดงที่ปลายแผ่นปิดเหงือก", "A round flat fish swirled orange and blue, with a red spot on its gill flap"] }),
  F({ id: "europeanGrayling", th: "ปลาเกรย์ลิง", en: "European grayling", family: "mediumFish", habitat: "headwater", bands: ["midday"], rarity: "U", bait: "cricket", fight: "leaper",
    look: ["ปลาเรียวสีเทาเงิน ครีบหลังใหญ่เหมือนธงลายม่วงแดง", "A slim grey-silver fish with a great flag of a dorsal fin patterned purple and red"] }),
  F({ id: "leastKillifish", th: "ปลาคิลลีจิ๋ว", en: "Least killifish", family: "smallFish", habitat: "town", bands: ["afternoon", "evening"], rarity: "C", bait: "dough", fight: "darter",
    look: ["ปลาจิ๋วสีน้ำตาลอ่อน มีแถบดำพาดกลางตัวและจุดดำที่ครีบหลัง", "A tiny tan fish with a dark stripe along its middle and a black spot on its back fin"] }),
  F({ id: "australianBass", th: "ปลาแบสออสเตรเลีย", en: "Australian bass", family: "mediumFish", habitat: "creek", bands: ["afternoon"], rarity: "U", bait: "shrimpLive", fight: "steady",
    look: ["ปลาตัวหนาสีบรอนซ์เขียว ตาแดง ครีบหลังเป็นหนามแข็ง", "A thick bronze-green fish with red eyes and a spiny dorsal fin"] }),
  F({ id: "lakeWhitefish", th: "ปลาไวต์ฟิช", en: "Lake whitefish", family: "mediumFish", habitat: "pool", bands: ["afternoon"], rarity: "U", bait: "worm", fight: "steady",
    look: ["ปลาสีเงินขาวหลังโค้ง ปากเล็กอยู่ใต้จมูก หางแฉก", "A silvery white fish with a humped back, a small mouth under its snout and a forked tail"] }),
  F({ id: "tench", th: "ปลาเทนช์", en: "Tench", family: "mediumFish", habitat: "town", bands: ["evening"], rarity: "C", bait: "corn", fight: "sleeper",
    look: ["ปลาลำตัวหนาสีเขียวมะกอกเข้ม ตาสีแดงส้ม ครีบมนกลม", "A thick dark olive green fish with orange-red eyes and round paddle fins"] }),
  F({ id: "goldenDorado", th: "ปลาโดราโดทอง", en: "Golden dorado", family: "largeFish", habitat: "creek", bands: ["evening", "night"], rarity: "V", bait: "smallFish", fight: "leaper",
    look: ["ปลาใหญ่สีทองสดทั้งตัว มีเส้นจุดดำเรียงตามเกล็ด ปากกว้าง", "A big fish of bright gold with lines of black dots along its scales and a wide mouth"] }),
  F({ id: "europeanBullhead", th: "ปลาบูลเฮด", en: "European bullhead", family: "smallFish", habitat: "headwater", bands: ["evening"], rarity: "C", bait: "worm", fight: "sleeper",
    look: ["ปลาหัวโตแบนสีน้ำตาลลายด่าง ครีบอกกว้างเหมือนพัด", "A big flat-headed mottled brown fish with wide fan-like chest fins"] }),
  F({ id: "glassKnifefish", th: "ปลาไนฟ์แก้ว", en: "Glass knifefish", family: "ornateFish", habitat: "town", bands: ["night", "lateNight"], rarity: "V", bait: "worm", fight: "slippery",
    look: ["ปลาตัวบางยาวเหมือนใบมีดใส เห็นก้างข้างใน ครีบท้องเป็นริ้วยาว", "A thin blade of a see-through fish showing its bones, with a long rippling fin beneath"] }),
  F({ id: "tigerShovelnose", th: "ปลาดุกปากพลั่วลายเสือ", en: "Tiger shovelnose", family: "largeFish", habitat: "creek", bands: ["night"], rarity: "U", bait: "smallFish", fight: "steady",
    look: ["ปลาดุกหัวแบนยาวเหมือนพลั่ว ลายเสือสีดำบนตัวเทา หนวดยาว", "A catfish with a long flat shovel of a head, black tiger stripes on grey and long whiskers"] }),
  F({ id: "burbot", th: "ปลาเบอร์บอต", en: "Burbot", family: "largeFish", habitat: "pool", bands: ["night"], rarity: "U", bait: "smallFish", fight: "slippery",
    look: ["ปลาตัวยาวคล้ายปลาไหลลายด่างสีเขียวน้ำตาล มีหนวดเดียวที่คาง", "A long eel-like mottled green-brown fish with a single whisker on its chin"] }),
  F({ id: "elephantnoseFish", th: "ปลาจมูกช้าง", en: "Elephantnose fish", family: "ornateFish", habitat: "town", bands: ["lateNight", "beforeDawn"], rarity: "R", bait: "worm", fight: "slippery",
    look: ["ปลาสีน้ำตาลเข้มมีงวงยาวโค้งลงที่ปาก แถบขาวสองเส้นใกล้หาง", "A dark brown fish with a long downturned trunk of a snout and two pale bands near its tail"] }),
  F({ id: "freshwaterSole", th: "ปลาลิ้นหมาน้ำจืด", en: "Freshwater sole", family: "mediumFish", habitat: "creek", bands: ["lateNight"], rarity: "U", bait: "shrimpLive", fight: "sleeper",
    look: ["ปลาตัวแบนรีสีน้ำตาลทราย ตาสองข้างอยู่ด้านเดียว ลายจุดเหมือนพื้นทราย", "A flat oval sand-brown fish with both eyes on one side, freckled like the riverbed"] }),
  F({ id: "dollyVarden", th: "ปลาดอลลีวาร์เดน", en: "Dolly Varden", family: "mediumFish", habitat: "headwater", bands: ["lateNight"], rarity: "U", bait: "cricket", fight: "leaper",
    look: ["ปลาเทราต์สีเขียวเงิน มีจุดชมพูแดงทั่วข้างตัว ครีบล่างขอบขาว", "A green-silver trout dotted pink-red all along its sides, its lower fins edged white"] }),
] as const;
export type NewFishId = (typeof NEW_FISH_ROWS)[number]["id"];

/**
 * How much of a cast a newcomer fish has, by its rarity, in its water, band and bait (**mine**, measured in
 * band-species.test.ts): taken from what is no fish alone, and never more than `FRESH.take` of it, so where the old
 * fish leave little else (the town's crowded water) the newcomers share that little between them and are rarer there.
 */
export const FISH_SHARE: Record<Rarity, number> = { C: 0.06, U: 0.025, R: 0.008, V: 0.003 };
/** The most of what is no fish on a cast that the newcomers may have between them; and, outside its peak band, the share of itself one that spans several has. */
export const FRESH = { take: 0.5, offPeak: 0.5 };
const TIER: Record<Rarity, Fish["tier"]> = { C: "common", U: "uncommon", R: "rare", V: "legend" };
const SIZES: Record<FishRow["family"], [number, number]> = { smallFish: [3, 7], mediumFish: [20, 45], largeFish: [70, 150], ornateFish: [2, 18] };
const FISH_PAYS: Record<FishRow["family"], Record<Rarity, number>> = {
  smallFish: { C: 8, U: 14, R: 30, V: 60 }, mediumFish: { C: 14, U: 24, R: 40, V: 70 }, largeFish: { C: 24, U: 34, R: 50, V: 90 }, ornateFish: { C: 20, U: 34, R: 60, V: 110 },
};
const baitsOf = (bait: FishRow["bait"]): Fish["baits"] => (bait === "smallFish" ? { minnow: 1, loach: 1 } : { [bait]: 1 });
const fightOf = (style: Fish["fight"]["style"], rarity: Rarity, family: FishRow["family"]): Fish["fight"] => {
  const d = { C: 0, U: 1, R: 2, V: 3 }[rarity], heavy = family === "largeFish" ? 0.08 : family === "smallFish" || family === "ornateFish" ? -0.04 : 0;
  return { style, band: 0.22 - d * 0.025, pull: Math.max(0.05, 0.1 + d * 0.07 + heavy), surge: 0.3 + d * 0.11, every: [2.6 - d * 0.2, 5 - d * 0.3], line: 0.6 + d * 0.3 + heavy * 3,
    effort: 2 + d * 3 + (family === "largeFish" ? 2 : 0), sway: 0.16 + d * 0.04, pace: 0.09 + d * 0.016 };
};
/** Each newcomer fish as lib/town/items has its fish (`fresh`: its share of a cast, only ever in what is no fish's place: lib/town/fishing's freshOdds). */
export const NEW_FISH = Object.fromEntries((NEW_FISH_ROWS as readonly FishRow[]).map((r): [string, Fish] => {
  const d = { C: 0, U: 1, R: 2, V: 3 }[r.rarity];
  return [r.id, {
    tier: TIER[r.rarity], habitat: [r.habitat], baits: baitsOf(r.bait), hours: hoursOf(r.bands), ...(r.bands.length > 1 ? { peak: hoursOf(r.bands.slice(0, 1)) } : {}),
    rain: 1, wait: [5 + d * 5, 24 + d * 18], size: SIZES[r.family], fight: fightOf(r.fight, r.rarity, r.family), fresh: FISH_SHARE[r.rarity],
  }];
})) as Record<NewFishId, Fish>;
export const NEW_FISH_ITEMS = Object.fromEntries((NEW_FISH_ROWS as readonly FishRow[]).map((r): [string, Item] => [r.id, {
  kind: "fish", tier: r.rarity === "C" || r.rarity === "U" ? 2 : 3, name: { th: r.th, en: r.en }, about: { th: r.look[0], en: r.look[1] }, stack: r.rarity === "V" ? 5 : 10, pays: FISH_PAYS[r.family][r.rarity],
}])) as Record<NewFishId, Item>;
/** The newcomer small fish go on a hook as a minnow does (lib/town/items' BAIT_AS). */
export const SMALL_FISH_BAITS = (NEW_FISH_ROWS as readonly FishRow[]).filter((r) => r.family === "smallFish").map((r) => r.id as NewFishId);
/** Where each habitat can be fished from: the maps a member stands on (lib/town/world's fishFrom, mountain-water). */
export const HABITAT_MAPS: Record<FishingHabitat, Place[]> = { town: ["town"], creek: ["forest"], pool: ["forest", "mountain"], headwater: ["forest", "mountain"] };
export type { Current };

/* ── the rare finds, and glow powder ─────────────────────────────────────── */

/** What each find is, and where and when: the forest's two come in a quiet turn of their kind of place; the dew is a sample of the mountain stream's banks; the guano comes with a rock of the cave. */
export const FINDS = {
  mistMushroom: { th: "เห็ดหมอก", en: "Mist mushroom", rarity: "V" as Rarity, place: "forest" as Place, bands: ["beforeDawn"] as BandId[], where: ["ใต้ขอนไม้ในป่าลึก", "Under logs in the woods"] as [string, string],
    look: ["เห็ดดอกเล็กสีเทาอมม่วงจาง หมวกบางเหมือนหมอก มีละอองขาวเกาะ", "A small pale grey-violet mushroom with a thin misty cap beaded with white"] as [string, string], pays: 60, stack: 5 },
  queenPollen: { th: "เกสรราชินีราตรี", en: "Queen-of-the-night pollen", rarity: "R" as Rarity, place: "forest" as Place, bands: ["lateNight"] as BandId[], where: ["ดอกไม้ชายป่า", "Flowers at the forest's edge"] as [string, string],
    look: ["ผงเกสรสีทองนวลห่อในกลีบดอกขาวใหญ่", "Soft golden pollen folded in a large white petal"] as [string, string], pays: 45, stack: 10 },
  morningDew: { th: "น้ำค้าง", en: "Morning dew", rarity: "U" as Rarity, place: "mountain" as Place, bands: ["earlyMorning"] as BandId[], where: ["ริมลำธารบนภูเขา", "The mountain stream's banks"] as [string, string],
    look: ["หยดน้ำใสเม็ดกลมรวมอยู่ในขวดแก้วเล็ก มีใบหญ้าหนึ่งใบ", "Clear round beads of water gathered in a little glass vial with a blade of grass"] as [string, string], pays: 6, stack: 20 },
  batGuano: { th: "มูลค้างคาว", en: "Bat guano", rarity: "U" as Rarity, place: "cave" as Place, bands: ["evening"] as BandId[], where: ["หินในถ้ำ 18:00–19:00 ตอนค้างคาวออกถ้ำ", "Cave rocks, 18:00–19:00, as the bats leave"] as [string, string],
    look: ["ก้อนดินสีน้ำตาลเข้มร่วนเป็นเม็ดในถุงผ้าเล็ก", "Crumbly dark brown pellets in a small cloth sack"] as [string, string], pays: 8, stack: 20 },
} as const;
export type FindId = keyof typeof FINDS;
export const FIND_ITEMS = Object.fromEntries(Object.entries(FINDS).map(([id, f]): [string, Item] => [id, {
  kind: id === "batGuano" ? "mineral" : "wild", tier: f.rarity === "V" || f.rarity === "R" ? 3 : 2, name: { th: f.th, en: f.en }, about: { th: f.look[0], en: f.look[1] }, stack: f.stack, pays: f.pays,
}])) as Record<FindId, Item>;
/**
 * Glow powder, the glowers' family use ("any glower x1 -> 2"): its picture (`glowPowder` in the icon atlas) is drawn
 * with the rest, and it becomes an item with its recipe when the family recipes come (piece 3, the fertilisers), so
 * that nothing is in the game that cannot be had. Its words are kept here for then.
 */
export const GLOW_POWDER: Item = { kind: "goods", tier: 2, name: { th: "ผงเรือง", en: "Glow powder" }, about: { th: "ผงละเอียดสีเขียวอมฟ้าเปล่งแสงจางๆ ในขวดเล็ก", en: "Fine blue-green powder that glows faintly, in a little jar" }, stack: 20, pays: 10 };
/**
 * The forest's two finds as lib/town/forest's finds, each in a quiet turn of its kind of place only. Their weights
 * against `QUIET.none`: the mist mushroom very rare, the pollen rare (**mine**, measured in band-species.test.ts).
 */
export const FOREST_FINDS = {
  mushrooms: [{ item: "mistMushroom" as ItemId, weight: 3, n: [1, 1] as [number, number], zones: ["woods", "deep"] as Zone[], hours: hoursOf(["beforeDawn"]), quiet: true as const }],
  flowers: [{ item: "queenPollen" as ItemId, weight: 5, n: [1, 1] as [number, number], zones: ["edge"] as Zone[], hours: hoursOf(["lateNight"]), quiet: true as const }],
};
/** The dew: a sample of either bank of the mountain stream, in its band only (lib/town/stream-work). */
export const DEW = { item: "morningDew" as const, hours: hoursOf(["earlyMorning"]) };
/**
 * The bat guano: as the bats leave the cave at dusk, a plain rock of the cave broken in this hour lets some fall with
 * what it leaves, by this chance a rock (**mine**). Never instead of anything: rolled on its own, after the rock's own.
 */
export const GUANO = { item: "batGuano" as const, hours: [[18, 19]] as Array<[number, number]>, chance: 0.3, n: 1 };

/* ── the windows, as data (for the notebook now, a museum later) ─────────── */

export type Kind = "insect" | "fish" | "find";
export interface Window { id: string; kind: Kind; family: Family | null; rarity: Rarity; bands: BandId[]; peak: BandId | null; places: Place[]; time: TimeIcon | null;
  /** (a window narrower than its band: the guano's hour) the hours it is out, Thai time */
  hours?: Array<[number, number]>;
  /** Where on its map: the haunt's kind (an insect), the habitat (a fish), the words (a find). */
  where: string; how: [string, string] | null; bait: string | null }
export const WINDOWS: readonly Window[] = [
  ...NEW_INSECTS.map((r): Window => ({ id: r.id, kind: "insect", family: r.family, rarity: r.rarity, bands: r.bands, peak: r.bands.length > 1 ? r.bands[0] : null, places: [r.place], time: r.time, where: r.at, how: r.hint, bait: null })),
  ...NEW_FISH_ROWS.map((r): Window => ({ id: r.id, kind: "fish", family: r.family, rarity: r.rarity, bands: r.bands, peak: r.bands.length > 1 ? r.bands[0] : null, places: HABITAT_MAPS[r.habitat], time: null, where: r.habitat, how: null, bait: r.bait })),
  ...Object.entries(FINDS).map(([id, f]): Window => ({ id, kind: "find", family: null, rarity: f.rarity, bands: [...f.bands], peak: null, places: [f.place], time: null, where: f.where[1], how: f.where, bait: null,
    ...(id === GUANO.item ? { hours: GUANO.hours } : {}) })),
];
/** What is out now on a map, in a band (and, given the hour, 0–24, Thai time, within a window narrower than its band): every newcomer whose window and place hold. */
export const outNow = (place: Place, band: BandId, hour?: number): Window[] =>
  WINDOWS.filter((w) => w.places.includes(place) && w.bands.includes(band) && (hour === undefined || !w.hours || inHours(w.hours, hour)));
