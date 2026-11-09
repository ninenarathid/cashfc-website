/**
 * Special produce of the bred breeds, and care that raises Quality (the owner, 2026-11-09: "สัตว์ที่ผสมพันธ์เป็น แบบพิเศษมี
 * โอกาสให้ผลผลิตแบบพิเศษ … ที่เลี้ยงมาดี จะให้ผลผลิต quality สูงด้วย … น่าค้นหา"; the idea patch's "สัตว์พันธุ์พิเศษให้ของพิเศษ" and
 * "เลี้ยงดีได้ Quality สูง", with his "นอกนั้นเห็นด้วยกับ claude" and Codex's chances).
 *
 * - Every bred breed (B to H) has one special of its own; the starters (A) have none, so that breeding goes on.
 * - **A special replaces, it never adds**: at a collection each round collected may turn ONE unit into the breed's
 *   special, of that unit's grade, sold to the uncle for what that unit would have fetched.
 * - **One rule to learn**: every breed has one habit, of six kinds (when it is out, where it goes, what it eats, the
 *   weather, company, a full heart). A round that met it is twice as likely to bring a special. Never a condition.
 * - **Care score**, 0 to 10: its body's size (small 0, medium 2, large 3, very large 5) and the days in a row it was fed
 *   through (a point a day, five at most). It lifts the floor of the produce's Quality with the graded feed, the two
 *   together 25 at most (the feed alone 20, as before); and at every rank it sets the special's chance, from half of it
 *   (no care) to all of it (full care). The hour never enters the Quality maths.
 *
 * Pure: the page, the browser's trial and the database (v324's town.special_* and town_animals) work out the same.
 * The habit table is the answer key; the book shows only each breed's kind of habit, and the true habit to whoever
 * has found its special three times.
 */
import { ANIMALS, BODY, BREEDS, CARE, SPECIES, breedOf, careScore, heartsOf, sizeGrade, type Animal, type GateLog, type Herd, type Letter, type SpeciesId, type Tier } from "./animals";
import { hashStr, patchKind, stretchOf, type PatchKind } from "./roam";

const HOUR = 3_600_000;

/** The line's numbers for specials and care (ours and Codex's, the README of the idea patch says whose). */
export const SPECIAL = {
  /** A special a day an animal at full care brings, by its breed's tier (Codex: every species the same a day; a round is a day's share by its cycle). */
  perDay: { real: 0.2, fantasy: 0.28, legend: 0.4 } as Readonly<Record<"real" | "fantasy" | "legend", number>>,
  /** The most a round's chance may be. */
  cap: 0.5,
  /** A round that met its habit; a gold coat. */
  habit: 2,
  gold: 1.5,
  /** How far back a round is looked at for the weather, where it went and its company, in hours. */
  lookBack: 72,
  /** Found so many times, the book tells its finder the breed's habit. */
  reveal: 3,
  /** Round strips an animal keeps, newest last. */
  strips: 3,
  /** Wind is strong when its speed and half its gusts come to so many km/h (or the sky storms): leaves blowing hard on the map. */
  wind: 30,
} as const;

export type HabitKind = "time" | "place" | "food" | "weather" | "company" | "heart";
export const HABIT_KINDS: readonly HabitKind[] = ["time", "place", "food", "weather", "company", "heart"];
/** Where an animal went in a round: a kind of the pasture's patches, or nowhere (it stayed in its barn the whole round). */
export type Place = PatchKind | "barn";
export const PLACES: readonly Place[] = ["garden", "meadow", "pond", "barn"];
export type Habit =
  | { kind: "time"; band: number }
  | { kind: "place"; place: Place }
  | { kind: "food"; item: string }
  | { kind: "weather"; sky: "rain" | "wind" }
  | { kind: "company" }
  | { kind: "heart" };

/** What a special is for, for the stage that hangs uses on it (the idea patch's four families): a real breed's stands in and carries its breed's second buff, a fantasy breed's is a new dish's secret, a legend's a village feast's centrepiece, a sheep's a wool used up at the tailor, the farm and the feast table. */
export type SpecialLine = "real" | "fantasy" | "legend" | "wool";
/** The 28 specials' ids, things of the bag (lib/town/items' ItemId has them). */
export type SpecialId =
  | "silkieTwinEgg" | "dawnBlueEgg" | "cocoaShellEgg" | "fireflyEgg" | "swirlCloudEgg" | "luckySevenEgg" | "rebirthFlameEgg"
  | "windRunnerEgg" | "emeraldShellEgg" | "brushPaintedEgg" | "firstRainEgg" | "moonShadowEgg" | "blankRecipePaper" | "blackDeepPearlEgg"
  | "rareShadeLock" | "spiralShedHorn" | "cloudFluffTuft" | "goldenDandelionSeed" | "rainbowArcLock" | "shootingStarLock" | "wholeGoldenFleece"
  | "goldenCreamTop" | "warmShaggyMilk" | "agedCheeseStarter" | "wildBerryCream" | "cocoaCreamTop" | "pollenCream" | "cometMilkCrystal";
export interface Special {
  /** The thing (lib/town/animal-items' SPECIAL_ITEMS), its icon's name too. */
  id: SpecialId;
  breed: string;
  species: SpeciesId;
  letter: Letter;
  tier: Exclude<Tier, "starter">;
  line: SpecialLine;
  /** What it stands for in a family: an egg, milk, wool, or something of its own. */
  family: "egg" | "milk" | "wool" | "paper" | "horn" | "seed";
  habit: Habit;
}
/** The eight bands' indexes (lib/town/animals' BAND_EDGES): 0 = 03-05, 1 = 05-07, … 5 = 16-19, 6 = 19-23, 7 = 23-03. */
const S = (breed: string, id: SpecialId, family: Special["family"], habit: Habit): Special => {
  const b = breedOf(breed)!;
  const tier = b.tier as Special["tier"];
  return { id, breed, species: b.species, letter: b.letter, tier, line: b.species === "sheep" ? "wool" : tier, family, habit };
};
export const SPECIALS: readonly Special[] = [
  // hens
  S("silkie", "silkieTwinEgg", "egg", { kind: "heart" }),
  S("araucana", "dawnBlueEgg", "egg", { kind: "time", band: 1 }),
  S("marans", "cocoaShellEgg", "egg", { kind: "food", item: "meadowOats" }),
  S("lanternHen", "fireflyEgg", "egg", { kind: "time", band: 6 }),
  S("cloudHen", "swirlCloudEgg", "egg", { kind: "weather", sky: "wind" }),
  S("goldenHen", "luckySevenEgg", "egg", { kind: "company" }),
  S("pocketPhoenix", "rebirthFlameEgg", "egg", { kind: "time", band: 0 }),
  // ducks
  S("runner", "windRunnerEgg", "egg", { kind: "place", place: "garden" }),
  S("cayuga", "emeraldShellEgg", "egg", { kind: "weather", sky: "rain" }),
  S("mandarin", "brushPaintedEgg", "egg", { kind: "company" }),
  S("raindropDuck", "firstRainEgg", "egg", { kind: "food", item: "nightDuckweed" }),
  S("moonDuck", "moonShadowEgg", "egg", { kind: "time", band: 7 }),
  S("paperboatDuck", "blankRecipePaper", "paper", { kind: "food", item: "ghostReed" }),
  S("littleLeviathan", "blackDeepPearlEgg", "egg", { kind: "place", place: "pond" }),
  // sheep
  S("shetland", "rareShadeLock", "wool", { kind: "food", item: "sweetTimothy" }),
  S("jacob", "spiralShedHorn", "horn", { kind: "company" }),
  S("valais", "cloudFluffTuft", "wool", { kind: "heart" }),
  S("dandelionLamb", "goldenDandelionSeed", "seed", { kind: "weather", sky: "wind" }),
  S("rainbowSheep", "rainbowArcLock", "wool", { kind: "weather", sky: "rain" }),
  S("starFleece", "shootingStarLock", "wool", { kind: "time", band: 6 }),
  S("goldenFleece", "wholeGoldenFleece", "wool", { kind: "heart" }),
  // cows
  S("jersey", "goldenCreamTop", "milk", { kind: "food", item: "sunAlfalfa" }),
  S("highland", "warmShaggyMilk", "milk", { kind: "place", place: "meadow" }),
  S("brownSwiss", "agedCheeseStarter", "milk", { kind: "place", place: "barn" }),
  // (the doc had dew clover, which no cow eats: the coordinator's word, 2026-11-10, the cow feed of the scarcest band, mist vetch of 03-05)
  S("strawberryCow", "wildBerryCream", "milk", { kind: "food", item: "mistVetch" }),
  S("cocoaCow", "cocoaCreamTop", "milk", { kind: "time", band: 5 }),
  S("flowerCow", "pollenCream", "milk", { kind: "place", place: "garden" }),
  S("milkyWayCow", "cometMilkCrystal", "milk", { kind: "time", band: 7 }),
];
export const SPECIAL_OF: ReadonlyMap<string, Special> = new Map(SPECIALS.map((x) => [x.breed, x]));
export const SPECIAL_ITEM: ReadonlyMap<string, Special> = new Map(SPECIALS.map((x) => [x.id, x]));
/** A breed's special (none for a starter). */
export const specialOf = (breed: string): Special | undefined => SPECIAL_OF.get(breed);

/* ── care: lib/town/animals' CARE, careScore and sizeGrade (rangeOf reads them there) ── */
export { CARE, careScore, sizeGrade };

/* ── a round ── */

/** What a round keeps of itself until it is collected: since when, what was put in its trough, whether a friend cared for it, whether its heart was full one day. */
export interface RoundNotes { since?: number; ate?: string[]; friend?: boolean; heart?: boolean }
/** A round as its strip shows it (the six kinds, in their order), and what it brought. */
export interface Strip {
  at: number;
  /** The bands it was out in (a bit a band). */
  bands: number;
  places: Place[];
  ate: string[];
  rain: boolean;
  wind: boolean;
  company: boolean;
  heart: boolean;
  /** The special it brought, and how many (none: null, 0). */
  special: string | null;
  n: number;
}
/** The weather a stretch of time had: some rain, some strong wind. */
export type SkyOf = (from: number, to: number) => { rain: boolean; wind: boolean };
/** The most things a round's food list keeps. */
const ATE_MOST = 8;

/** A round's notes with a thing put in its trough. */
export const ateNote = (r: RoundNotes | undefined, item: string): RoundNotes => {
  const ate = r?.ate ?? [];
  return { ...(r ?? {}), ate: ate.includes(item) ? ate : [...ate, item].slice(-ATE_MOST) };
};
/** Whether its heart is full today: ten hearts, a pet and a treat. */
export const fullHeart = (a: Pick<Animal, "hearts" | "today">) => heartsOf(a) >= ANIMALS.hearts && !!a.today.pet && !!a.today.treat;
/** A round's notes after a care: a friend's, or a full heart. */
export const caredNote = (a: Pick<Animal, "round" | "hearts" | "today">, friend: boolean): RoundNotes | undefined =>
  friend || fullHeart(a) ? { ...(a.round ?? {}), ...(friend ? { friend: true } : {}), ...(fullHeart(a) ? { heart: true } : {}) } : a.round;

/** A door's open stretches inside a span of time. */
function openIn(door: GateLog, from: number, to: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [a, b] of door) {
    const x = Math.max(a, from), y = Math.min(b ?? to, to);
    if (y > x) out.push([x, y]);
  }
  return out;
}
const bkHour = (t: number) => new Date(t + 7 * HOUR).getUTCHours();
/** The pasture's night (19:00 to 05:00 Bangkok): an animal out lies down where nightfall found it (lib/town/pasture). */
const night = (t: number) => { const h = bkHour(t); return h >= 19 || h < 5; };

/**
 * Where it went while out, by kind of place: each stretch of ten minutes its door stood open in the span (as
 * lib/town/pasture draws it), but those of the night past the first of an outing (it lies where the night found it).
 * A round it never went out in is "barn".
 */
export function placesOf(a: Pick<Animal, "id" | "species">, door: GateLog, from: number, to: number, outBands: number): Place[] {
  if (!outBands) return ["barn"];
  const seed = hashStr(a.id), { period, start } = stretchOf(seed), kinds = new Set<Place>();
  for (const [x, y] of openIn(door, from, to)) {
    const k0 = period(x), k1 = period(y - 1);
    for (let k = k0; k <= k1 && kinds.size < 3; k++) {
      if (k !== k0 && night(Math.max(x, start(k)))) continue;
      kinds.add(patchKind(seed, a.species, k));
    }
  }
  return PLACES.filter((p) => kinds.has(p));
}
/** Whether another member's grown animal of its kind was out while it was (their door and mine open at once in the span). */
export function outTogether(a: Pick<Animal, "owner" | "species">, door: GateLog, from: number, to: number, herds: readonly Herd[], animals: readonly Animal[], now: number): boolean {
  const mine = openIn(door, from, to);
  if (!mine.length) return false;
  const grown = SPECIES[a.species].grow[0] + SPECIES[a.species].grow[1];
  const owners = new Set(animals.filter((x) => x.owner !== a.owner && x.species === a.species && x.home !== "pen" && x.born <= now && x.grown >= grown).map((x) => x.owner));
  for (const h of herds) {
    if (!owners.has(h.owner)) continue;
    for (const [x, y] of openIn(h.door, from, to)) if (mine.some(([p, q]) => Math.max(p, x) < Math.min(q, y))) return true;
  }
  return false;
}

/** The span a round is looked at over: since its last collection (or its birth), never further back than `SPECIAL.lookBack`. */
export const roundSpan = (a: Pick<Animal, "round" | "born">, now: number) => ({ from: Math.max(a.round?.since ?? a.born, now - SPECIAL.lookBack * HOUR), to: now });

/** A round's strip, as it stands at its collection (the special not yet rolled). */
export function stripOf(a: Animal, now: number, door: GateLog, sky: SkyOf | undefined, herds: readonly Herd[], animals: readonly Animal[]): Strip {
  const { from, to } = roundSpan(a, now), w = sky ? sky(from, to) : { rain: false, wind: false };
  return {
    at: now, bands: a.outBands ?? 0, places: placesOf(a, door, from, to, a.outBands ?? 0), ate: [...(a.round?.ate ?? [])],
    rain: w.rain, wind: w.wind, company: !!a.round?.friend || (!!a.outBands && outTogether(a, door, from, to, herds, animals, now)),
    heart: !!a.round?.heart || fullHeart(a), special: null, n: 0,
  };
}
/** Whether a round's strip meets a habit. */
export function habitMet(h: Habit, s: Pick<Strip, "bands" | "places" | "ate" | "rain" | "wind" | "company" | "heart">): boolean {
  switch (h.kind) {
    case "time": return (s.bands & (1 << h.band)) !== 0;
    case "place": return s.places.includes(h.place);
    case "food": return s.ate.includes(h.item);
    case "weather": return h.sky === "rain" ? s.rain : s.wind;
    case "company": return s.company;
    case "heart": return s.heart;
  }
}
/** A round's chance of its special: the breed's share of a day by its cycle, the care, the habit, a gold coat; at most `SPECIAL.cap`. */
export function chanceOf(a: Pick<Animal, "breed" | "species" | "body" | "streak" | "gold">, met: boolean): number {
  const sp = specialOf(a.breed);
  if (!sp) return 0;
  const base = (SPECIAL.perDay[sp.tier] * SPECIES[a.species].cycle) / 24;
  return Math.min(SPECIAL.cap, base * (0.5 + (0.5 * careScore(a)) / CARE.most) * (met ? SPECIAL.habit : 1) * (a.gold ? SPECIAL.gold : 1));
}
/** The strips an animal keeps, with one more (the newest last). */
export const withStrip = (strips: readonly Strip[] | undefined, s: Strip): Strip[] => [...(strips ?? []), s].slice(-SPECIAL.strips);

/* ── the book ── */

/** A member's count of each breed's special found (collections that brought one). */
export type SpecialsFound = Record<string, number>;
/** Whether the book tells a member a breed's habit. */
export const knowsHabit = (found: SpecialsFound | undefined, breed: string) => (found?.[breed] ?? 0) >= SPECIAL.reveal;

/** The catalog's part of it (v324, the `animals` row's `specials`): what the database reads to do the same. */
export function specialsRow() {
  return {
    knobs: SPECIAL,
    care: CARE,
    steps: BODY.steps,
    breeds: Object.fromEntries(SPECIALS.map((x) => [x.breed, { item: x.id, habit: x.habit }])),
    priceAs: Object.fromEntries(SPECIALS.map((x) => [x.id, priceAs(x.id)])),
  };
}
/**
 * The thing whose price a thing fetches at the uncle's: a special its breed's produce's, so that it fetches what the unit it
 * replaced would and its sales count as that unit's (one counter; lib/town/market's factorOf and counted, v324's
 * town.price_as); anything else its own.
 */
export const priceAs = (id: string): string => { const x = SPECIAL_ITEM.get(id); return x ? breedOf(x.breed)!.produce : id; };
/** Every starter has none, every bred breed one: held by a test. */
export const BRED = BREEDS.filter((b) => b.letter !== "A");
