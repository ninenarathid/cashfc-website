/**
 * The animal line (ฟาร์มสัตว์): what an animal is, how it grows, eats, likes its keeper and gives, how two of them make
 * a third, and what a keeper may do with it. The design, with the owner's words, is docs/plans/animals/README.md.
 *
 * Three rules a player learns:
 * 1. Food is the clock. A trough holds fed hours (at most `ANIMALS.trough`); the animal eats an hour's portion an hour
 *    by itself (half as fast while it is out on the meadow). Growth and production run only on fed hours.
 * 2. Closeness is the grade. Hearts (0-10) set the ceiling of the produce's Quality range, as a crop's bars do.
 * 3. The game is the amount. Milking, shearing and the coop's eggs decide how much; failing gives less, never none.
 *
 * Pure: no clock, no chance and no network of its own (both are passed in), so the page, the browser's trial and the
 * database (v291's town_animals) work out the same thing. Every number here is a knob of the line, ours unless the
 * README quotes the owner for it.
 */
import type { ItemId } from "./items";

// (kept here, not imported: lib/town/items reads this file through animal-items, and trade and stamina read items.
// `dayOf` is stamina's own (the Bangkok day turning at 05:00); animals.test.ts holds the two to each other.)
const HOUR = 3_600_000, DAY = 24 * HOUR;
export const dayOf = (now: number) => Math.floor((now + 7 * HOUR - 5 * HOUR) / DAY);

/* ── the line's numbers ── */

export const ANIMALS = {
  /** The most fed hours a trough holds ("ทุกวัน เจ้าของต้องนำอาหารมาให้"). */
  trough: 24,
  /** What a trough is eaten at, a part of an hour an hour, while the animal is out on the meadow. */
  outRate: 0.5,
  /** Closeness, in points: a heart is `perHeart`, ten hearts the most. */
  perHeart: 20,
  hearts: 10,
  /** What each of a day's four sources gives, once a day each: a fully fed day, a pet, a favourite treat, an outing. */
  heart: { fed: 3, pet: 3, treat: 2, out: 2 } as const,
  /** The wagon's ride: so many points to every animal of a rider (a heart), once a day a member. */
  wagonHeart: 20,
  /**
   * The barns (the owner, 2026-10-20: "การทำฟาร์มต้องซื้อ ฟาร์มกับ ลุง popoto ก่อน", "24 โรงเลี้ยงอยู่ตรงนี้เลย", one a member):
   * 24 on the east pasture, one a member, built in stages of coins, logs and stone tiles (the woodcutters' and the
   * miners' cross). His later word on the price: "เริ่มต้นแพงเกินไป: เห็นด้วย ทำให้ถูกกว่านี้", "ช่วยออกแบบให้คืนทุน ราวๆ 20-30
   * วัน": the first stage houses two, the second four (more stages may follow: "ลงทุนเพิ่มเพื่อขยาย"). A first barn with two
   * animals pays back in 23-28 days of full care, 25-30 of plain care (docs/plans/animals/README.md, "Prices").
   */
  barns: {
    count: 24,
    stages: [{ room: 2, coins: 500, logs: 20, stone: 8 }, { room: 4, coins: 1000, logs: 40, stone: 12 }] as ReadonlyArray<{ room: number; coins: number; logs: number; stone: number }>,
  },
  /** Uncle Popoto's pen: so many animals a member keeps there, frozen (they neither eat, grow nor give). */
  pen: 8,
  /** A barn untended (no care by its owner) so many days is warned of, and after `reclaim` days goes to whoever asks for it ("ตาม codex"). */
  untended: { warn: [14, 21] as readonly number[], reclaim: 28 },
  /** How long an offer to hand an animal on, or a friend's ask for a cross, stands; how long an ask accepted lends the animal. */
  offerHours: 24,
  askHours: 24,
  lendHours: 1,
  /** Asks a member may have standing at once. */
  asksOpen: 4,
  /**
   * Three stats a animal is born with, 1 to 10 (the owner: "มี stat ต่างๆของ พ่อพันธุ์ แม่พันธุ์ ที่จะมีผลต่อลูก", and good
   * ones only of good care: "ผู้เล่นต้องเอาใจใส่ดูแลสัตว์มาเป็นอย่างดีจริงๆ"): thrift eats less (2% a point above 1), gentleness
   * takes a pet or a treat to heart (3% a point above 1), vigour grows faster (+0.03 speed a point above 1, inside the x3 cap). None of
   * them makes more to sell (Codex: a yield stat would be the faucet). Bought animals are 2 to 4 in each.
   */
  stats: { min: 1, max: 10, bought: [2, 4] as readonly number[], thrift: 0.02, gentle: 0.03, vigor: 0.03 },
  /**
   * A child's stats: the parents' average, then by their CARE (hearts and days fed through in a row): well cared for,
   * +1 often, +2 now and then, never -1; neglected, seldom up and often down.
   */
  inherit: { upBase: 0.05, upCare: 0.35, downNeglect: 0.25, sparkFrom: 0.9, spark: 0.05, streakFull: 7 },
  /** Days fed through in a row are counted up to this. */
  streakCap: 14,
  /** The barn's front, three dearer looks, cosmetic. */
  facades: [5000, 15000, 40000] as readonly number[],
  /** Breeding: hearts (points) each parent needs, how long a parent rests, how long until the child is out. */
  breedHearts: 60,
  rest: 48 * HOUR,
  hatch: { bird: 12 * HOUR, mammal: 24 * HOUR } as const,
  /** The odds of a recipe's breed, in hundredths, by its tier; what a rare before-dawn offering adds; the most. */
  odds: { real: 60, fantasy: 30, legend: 10 } as const,
  dawnBoost: 10,
  oddsCap: 70,
  fees: { real: 80, fantasy: 220, legend: 600 } as const,
  /** What the first breeder of a breed pays to write its recipe out (a scroll, tradeable). */
  scrollFee: 12,
  /** Misses at one step before the book tells that member its offering outright. */
  clueAfter: 3,
  /** Growth speed-ups add; this is the most. */
  speedCap: 3,
  /** How long a speed-up feed lasts; the dew-clover one; the packed ration's hours. */
  growFeed: 24 * HOUR,
  dewFeed: 48 * HOUR,
  packed: 72,
  /** The produce's Quality: the ceiling at no hearts and what a heart adds; the spread; the most graded feed narrows it. */
  quality: { base: 30, perHeart: 7, spread: 30, narrowest: 20, narrowBy: [0, 5, 10, 15] as readonly number[] },
  /** Stamina a game costs. */
  stamina: { eggs: 2, shear: 3, milk: 4 } as const,
  /** Friend care: helpers points a pet, a treat, so many hours of the helper's food eaten; the most a day. */
  care: { pet: 1, treat: 1, foodHours: 4, cap: 30 },
  /** Line points (the line "animals"): the first feeding, pet and treat of an animal a day, a unit collected, a cross, a breed found first, the cradle. */
  points: { feed: 15, pet: 10, treat: 10, unit: 2, breed: 20, found: 60, cradle: 15 } as const,
  /** What Uncle Popoto pays back for an animal: a part of what he sold it for; a bred one, by species. */
  sellBack: { bought: 0.25 } as const,
  /** Rank gifts. */
  cradleRare: 0.2,
  harp: { mins: 30, near: 8 },
  wind: { mins: 60 },
  wagon: { legs: 2, mins: 4, seats: 0 /* (no limit) */ },
  /** How many rounds a bird's eggs laid out on the meadow may be, of its banked ones, at the most: one in three. */
  outsideShare: 1 / 3,
} as const;

/* ── species ── */

export type SpeciesId = "chicken" | "duck" | "sheep" | "cow";
export const SPECIES_IDS: readonly SpeciesId[] = ["chicken", "duck", "sheep", "cow"];
export type Game = "eggs" | "shear" | "milk";
export type Stage = "coming" | "baby" | "young" | "adult";
export type Tier = "starter" | "real" | "fantasy" | "legend";

export interface Species {
  id: SpeciesId;
  name: { th: string; en: string };
  baby: { th: string; en: string };
  young: { th: string; en: string };
  /** What Uncle Popoto sells a baby for. */
  price: number;
  /** Fed hours as a baby, then as a young one, until it is grown. */
  grow: readonly [number, number];
  /** Fed hours a round of produce takes; the most rounds kept waiting (a full bank pauses the clock). */
  cycle: number;
  bank: number;
  game: Game;
  kind: "bird" | "mammal";
  /** The sack Uncle Popoto sells (24 fed hours) and what it costs; the speed-up feed and its price. */
  sack: ItemId;
  sackPrice: number;
  growItem: ItemId;
  growPrice: number;
  /** What else it eats, and how many fed hours each gives. */
  feeds: Readonly<Partial<Record<ItemId, number>>>;
  /** Its favourite treats (any one, once a day). */
  treats: readonly ItemId[];
  /** What Uncle Popoto pays for one it was not sold (bred, cradled). */
  bredBack: number;
}

const s = (o: Species) => o;
export const SPECIES: Record<SpeciesId, Species> = {
  chicken: s({
    id: "chicken", name: { th: "ไก่", en: "Chicken" }, baby: { th: "ลูกเจี๊ยบ", en: "Chick" }, young: { th: "ไก่รุ่น", en: "Pullet" },
    price: 200, grow: [24, 24], cycle: 6, bank: 4, game: "eggs", kind: "bird",
    sack: "chickFeed" as ItemId, sackPrice: 4, growItem: "chickGrow" as ItemId, growPrice: 10,
    feeds: { corn: 6, buckwheat: 6, meadowOats: 6, dawnOats: 8, moonOats: 6, pondMillet: 6, orchardPea: 5, reedSeed: 5 } as Partial<Record<ItemId, number>>,
    treats: ["grasshopper", "cricket", "blueberry"] as ItemId[], bredBack: 0,
  }),
  duck: s({
    id: "duck", name: { th: "เป็ด", en: "Duck" }, baby: { th: "ลูกเป็ด", en: "Duckling" }, young: { th: "เป็ดรุ่น", en: "Young duck" },
    price: 500, grow: [24, 48], cycle: 8, bank: 3, game: "eggs", kind: "bird",
    sack: "duckFeed" as ItemId, sackPrice: 6, growItem: "duckGrow" as ItemId, growPrice: 15,
    feeds: { watercress: 6, cabbage: 4, pondMillet: 6, nightDuckweed: 6, ghostReed: 6, reedSeed: 5 } as Partial<Record<ItemId, number>>,
    treats: ["minnow", "snail", "raspberry"] as ItemId[], bredBack: 0,
  }),
  sheep: s({
    id: "sheep", name: { th: "แกะ", en: "Sheep" }, baby: { th: "ลูกแกะ", en: "Lamb" }, young: { th: "แกะรุ่น", en: "Hogget" },
    price: 1250, grow: [48, 72], cycle: 24, bank: 1, game: "shear", kind: "mammal",
    sack: "sheepFeed" as ItemId, sackPrice: 8, growItem: "lambGrow" as ItemId, growPrice: 25,
    feeds: { clover: 8, carrot: 4, sweetTimothy: 8, amberClover: 8, dewClover: 10, lanternGrass: 8, copperSedge: 6, velvetVetch: 8 } as Partial<Record<ItemId, number>>,
    treats: ["clover", "chamomile", "wildApple"] as ItemId[], bredBack: 0,
  }),
  cow: s({
    id: "cow", name: { th: "วัว", en: "Cow" }, baby: { th: "ลูกวัว", en: "Calf" }, young: { th: "วัวรุ่น", en: "Heifer" },
    price: 2000, grow: [72, 96], cycle: 12, bank: 2, game: "milk", kind: "mammal",
    sack: "cowFeed" as ItemId, sackPrice: 10, growItem: "calfGrow" as ItemId, growPrice: 40,
    feeds: { corn: 6, pumpkin: 8, sunAlfalfa: 10, sweetTimothy: 8, mistVetch: 10, copperSedge: 6, velvetVetch: 8, lanternGrass: 8 } as Partial<Record<ItemId, number>>,
    treats: ["mineralSalt", "pumpkin", "chestnut"] as ItemId[], bredBack: 0,
  }),
};
/** Feed any species eats: the packed ration (`ANIMALS.packed` hours, of before-dawn forage). */
export const ANY_FEED: Readonly<Partial<Record<ItemId, number>>> = { packedRation: ANIMALS.packed } as Partial<Record<ItemId, number>>;
/** The dew-clover speed-up feed, for any species (48 hours where a species' own lasts 24). */
export const DEW_GROW = "dewGrow" as ItemId;

/* ── breeds ── */

export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export const LETTERS: readonly Letter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const TIER_OF: Record<Letter, Tier> = { A: "starter", B: "real", C: "real", D: "real", E: "fantasy", F: "fantasy", G: "fantasy", H: "legend" };

export interface Breed {
  id: string;
  species: SpeciesId;
  letter: Letter;
  tier: Tier;
  name: { th: string; en: string };
  /** What it gives a round: its family's item (an egg, a milk, a wool) of its own kind. */
  produce: ItemId;
  /** In a line, how it looks: for the book and the card. */
  looks: { th: string; en: string };
}

const b = (species: SpeciesId, letter: Letter, id: string, th: string, en: string, produce: string, lookTh: string, lookEn: string): Breed =>
  ({ id, species, letter, tier: TIER_OF[letter], name: { th, en }, produce: produce as ItemId, looks: { th: lookTh, en: lookEn } });

export const BREEDS: readonly Breed[] = [
  // chickens
  b("chicken", "A", "barnHen", "ไก่บ้าน", "Barn hen", "farmEgg", "ไก่ขนน้ำตาลแดง หงอนแดงเล็ก", "A red-brown hen with a small red comb"),
  b("chicken", "B", "silkie", "ไก่ซิลกี้", "Silkie", "silkieEgg", "ไก่ขนฟูนุ่มเหมือนปุยฝ้าย ทั้งตัวสีขาว", "A hen fluffed all over like white cotton"),
  b("chicken", "C", "araucana", "ไก่อาราอูคาน่า", "Araucana", "blueEgg", "ไก่ขนเทาลายมีพู่แก้มฟู", "A grey-barred hen with puffy cheek tufts"),
  b("chicken", "D", "marans", "ไก่มารันส์", "Marans", "chocolateEgg", "ไก่ขนดำลายทองแดงที่คอ", "A black hen with copper hackles"),
  b("chicken", "E", "lanternHen", "ไก่โคมไฟ", "Lantern hen", "lanternEgg", "ไก่ขนสีอำพันที่ปลายหางเรืองแสงอ่อนๆ", "An amber hen whose tail tips glow softly"),
  b("chicken", "F", "cloudHen", "ไก่เมฆ", "Cloud hen", "cloudEgg", "ไก่ขาวฟูตัวเบาหวิว เดินเหมือนลอยอยู่", "A white puff of a hen that seems to float"),
  b("chicken", "G", "goldenHen", "ไก่ทองคำ", "Golden hen", "goldenEgg", "ไก่ขนสีทองเป็นเงาวาวทั้งตัว", "A hen of shining gold feathers"),
  b("chicken", "H", "pocketPhoenix", "ฟีนิกซ์จิ๋ว", "Pocket phoenix", "emberEgg", "นกไฟตัวเล็กขนส้มแดง หางเป็นเปลวไฟ", "A small bird of red-orange plumes with a tail of flame"),
  // ducks
  b("duck", "A", "puddleDuck", "เป็ดบ้าน", "Puddle duck", "duckEgg", "เป็ดขาวปากส้ม เดินต้วมเตี้ยม", "A waddling white duck with an orange bill"),
  b("duck", "B", "runner", "เป็ดวิ่ง", "Indian runner", "runnerEgg", "เป็ดตัวตรงเหมือนขวด วิ่งเร็วจี๋", "An upright duck shaped like a bottle, always running"),
  b("duck", "C", "cayuga", "เป็ดคายูกา", "Cayuga", "cayugaEgg", "เป็ดดำขนเหลือบเขียวเหมือนแมลงทับ", "A black duck with a beetle-green sheen"),
  b("duck", "D", "mandarin", "เป็ดแมนดาริน", "Mandarin duck", "mandarinEgg", "เป็ดลายส้มม่วงเขียวสีสดใส", "A bright duck of orange, purple and green"),
  b("duck", "E", "raindropDuck", "เป็ดหยดฝน", "Raindrop duck", "rainEgg", "เป็ดฟ้าใส มีเมฆฝนเล็กๆ ลอยตามหัว", "A clear-blue duck with a tiny rain cloud over its head"),
  b("duck", "F", "moonDuck", "เป็ดจันทรา", "Moon duck", "moonEgg", "เป็ดขาวมุกเรืองแสงจางๆ ยามค่ำ", "A pearl-white duck that glows faintly at night"),
  b("duck", "G", "paperboatDuck", "เป็ดเรือกระดาษ", "Paperboat duck", "paperEgg", "เป็ดที่ขนพับเป็นจีบเหมือนเรือกระดาษ", "A duck whose feathers fold like a paper boat"),
  b("duck", "H", "littleLeviathan", "เลวีอาธานจิ๋ว", "Little leviathan", "leviathanEgg", "เป็ดคอยาวเกล็ดสีน้ำทะเลลึก ครีบเล็กที่หาง", "A long-necked duck with deep-sea scales and a finned tail"),
  // sheep
  b("sheep", "A", "meadowSheep", "แกะทุ่ง", "Meadow sheep", "wool", "แกะขนขาวนุ่ม หน้าสีครีม", "A soft white sheep with a cream face"),
  b("sheep", "B", "shetland", "แกะเช็ตแลนด์", "Shetland", "shetlandWool", "แกะตัวเล็กขนสีน้ำตาลเทาหลายเฉด", "A small sheep in many shades of brown and grey"),
  b("sheep", "C", "jacob", "แกะจาค็อบ", "Jacob", "jacobWool", "แกะลายด่างขาวดำ มีเขาสี่เขา", "A piebald sheep with four horns"),
  b("sheep", "D", "valais", "แกะวาเลส์จมูกดำ", "Valais blacknose", "valaisWool", "แกะขนฟูยาว หน้าและเข่าสีดำ", "A long-fleeced sheep with a black face and knees"),
  b("sheep", "E", "dandelionLamb", "แกะแดนดิไลออน", "Dandelion lamb", "dandelionWool", "แกะขนฟูเป็นพู่เหมือนดอกแดนดิไลออน", "A sheep fluffed into seed heads like a dandelion"),
  b("sheep", "F", "rainbowSheep", "แกะสายรุ้ง", "Rainbow sheep", "rainbowWool", "แกะขนไล่สีเจ็ดสีเป็นริ้วๆ", "A sheep whose fleece runs in seven coloured bands"),
  b("sheep", "G", "starFleece", "แกะขนดาว", "Star-fleece", "starWool", "แกะขนน้ำเงินเข้มมีจุดเรืองแสงเหมือนดาว", "A deep-blue sheep speckled with glowing stars"),
  b("sheep", "H", "goldenFleece", "แกะขนทองคำ", "Golden fleece ram", "goldenWool", "แกะเขาโค้ง ขนเป็นลอนทองคำแวววาว", "A curl-horned ram with a fleece of shining gold"),
  // cows
  b("cow", "A", "dairyCow", "วัวนมลายจุด", "Spotted dairy cow", "farmMilk", "วัวขาวลายจุดดำ กระดิ่งที่คอ", "A white cow with black spots and a bell"),
  b("cow", "B", "jersey", "วัวเจอร์ซีย์", "Jersey", "jerseyMilk", "วัวสีน้ำตาลอ่อน ตาโตขนตายาว", "A fawn cow with big long-lashed eyes"),
  b("cow", "C", "highland", "วัวไฮแลนด์", "Highland", "highlandMilk", "วัวขนยาวสีส้มแดงปิดตา เขากว้าง", "A shaggy red cow with a fringe over its eyes and wide horns"),
  b("cow", "D", "brownSwiss", "วัวบราวน์สวิส", "Brown Swiss", "swissMilk", "วัวสีเทาน้ำตาล หูใหญ่ จมูกขาว", "A grey-brown cow with big ears and a pale muzzle"),
  b("cow", "E", "strawberryCow", "วัวสตรอว์เบอร์รี่", "Strawberry cow", "strawberryMilk", "วัวสีชมพูมีจุดเมล็ดสีเหลือง", "A pink cow freckled with yellow seeds"),
  b("cow", "F", "cocoaCow", "วัวโกโก้", "Cocoa cow", "cocoaMilk", "วัวสีช็อกโกแลตเข้ม เขาสีครีม", "A dark chocolate cow with cream horns"),
  b("cow", "G", "flowerCow", "วัวดอกไม้", "Flower cow", "flowerMilk", "วัวขาวมีดอกไม้เล็กๆ บานอยู่บนหลัง", "A white cow with little flowers blooming on its back"),
  b("cow", "H", "milkyWayCow", "วัวทางช้างเผือก", "Milky Way cow", "starMilk", "วัวสีกรมท่า ลายเป็นกลุ่มดาวระยิบระยับ", "A midnight-blue cow patterned with twinkling constellations"),
];
export type BreedId = string;
export const BREED: ReadonlyMap<string, Breed> = new Map(BREEDS.map((x) => [x.id, x]));
export const breedOf = (id: string): Breed | undefined => BREED.get(id);
export const breedAt = (species: SpeciesId, letter: Letter): Breed => BREEDS.find((x) => x.species === species && x.letter === letter)!;
export const starterOf = (species: SpeciesId) => breedAt(species, "A");
/** The real rare breeds of a species (B, C, D): what the cradle may give. */
export const realOf = (species: SpeciesId) => BREEDS.filter((x) => x.species === species && x.tier === "real");

/* ── the recipes: one graph for every species ── */

export type OfferingKind = "seed" | "mineral" | "flower" | "prism";
/** A step of the graph: the child's letter, its parents' letters (either order) and the kind of offering it takes. */
export const GRAPH: ReadonlyArray<{ child: Letter; parents: readonly [Letter, Letter]; kind: OfferingKind }> = [
  { child: "B", parents: ["A", "A"], kind: "seed" },
  { child: "C", parents: ["A", "A"], kind: "mineral" },
  { child: "D", parents: ["B", "C"], kind: "flower" },
  { child: "E", parents: ["B", "D"], kind: "seed" },
  { child: "F", parents: ["C", "D"], kind: "mineral" },
  { child: "G", parents: ["E", "F"], kind: "flower" },
  { child: "H", parents: ["E", "G"], kind: "prism" },
];
/** The exact offering of each step, by species: what is found by trying (the book shows only its kind). */
export const OFFERINGS: Record<SpeciesId, Partial<Record<Letter, ItemId>>> = {
  chicken: { B: "seedCorn", C: "copperNodule", D: "marigold", E: "seedBottleGourd", F: "quartzCore", G: "lavender", H: "prism" } as Partial<Record<Letter, ItemId>>,
  duck: { B: "seedCabbage", C: "clayPocket", D: "borage", E: "seedWatermelon", F: "silverNodule", G: "chamomile", H: "prism" } as Partial<Record<Letter, ItemId>>,
  sheep: { B: "seedCarrot", C: "slateLayer", D: "clover", E: "seedTeaBush", F: "pyriteCluster", G: "milkweed", H: "prism" } as Partial<Record<Letter, ItemId>>,
  cow: { B: "seedPumpkin", C: "ironNodule", D: "dill", E: "seedTrellisBerry", F: "wholeGeode", G: "nasturtium", H: "prism" } as Partial<Record<Letter, ItemId>>,
};
/** What each kind of offering is, for the book's words and for telling a try at a step from no try at all. */
/** The minerals and the flowers that may be offered (any seed is a seed). */
export const MINERALS: readonly string[] = ["slateLayer", "clayPocket", "quartzCore", "pyriteCluster", "copperNodule", "ironNodule", "silverNodule", "wholeGeode", "mineralSalt"];
export const FLOWERS: readonly string[] = ["marigold", "borage", "chamomile", "clover", "lavender", "nasturtium", "milkweed", "dill", "fennel", "mint"];
export const OFFERING_KINDS: Record<OfferingKind, { th: string; en: string; is: (id: string) => boolean }> = {
  seed: { th: "เมล็ดพันธุ์", en: "a seed", is: (id) => id.startsWith("seed") },
  mineral: { th: "แร่", en: "a mineral", is: (id) => MINERALS.includes(id) },
  flower: { th: "ดอกไม้", en: "a flower", is: (id) => FLOWERS.includes(id) },
  prism: { th: "ปริซึม", en: "a prism", is: (id) => id === "prism" },
};
/** The rare before-dawn forage (03-07) that, laid in the nest beside the offering, adds `ANIMALS.dawnBoost` to the odds. */
export const DAWN_BOOSTS: readonly ItemId[] = ["mistVetch", "ghostReed", "dewClover", "dawnOats"] as ItemId[];

/** The step two parents' breeds stand at, for a kind of offering (or none: no step takes these two with that kind). */
export function stepFor(a: Breed, b: Breed, kind: OfferingKind | null) {
  if (a.species !== b.species) return null;
  return GRAPH.find((g) => g.kind === kind && ((g.parents[0] === a.letter && g.parents[1] === b.letter) || (g.parents[0] === b.letter && g.parents[1] === a.letter))) ?? null;
}
export function kindOf(item: string | null | undefined): OfferingKind | null {
  if (!item) return null;
  for (const k of Object.keys(OFFERING_KINDS) as OfferingKind[]) if (OFFERING_KINDS[k].is(item)) return k;
  return null;
}
/** Every step two parents could take, whatever is offered: for the book and the nest's hint. */
export const stepsOf = (a: Breed, b: Breed) =>
  a.species !== b.species ? [] : GRAPH.filter((g) => (g.parents[0] === a.letter && g.parents[1] === b.letter) || (g.parents[0] === b.letter && g.parents[1] === a.letter));

/* ── an animal ── */

/** Where an animal is: in its owner's barn (it eats, grows and gives), or in Uncle Popoto's pen (frozen). */
export type Home = "barn" | "pen";
export type Sex = "m" | "f";
export interface Stats { thrift: number; gentle: number; vigor: number }
export const STAT_IDS: ReadonlyArray<keyof Stats> = ["thrift", "gentle", "vigor"];
/** A day's sources of hearts, and what helped it. `helpers`: who cared for it today and how many points each had of it. */
export interface Today { day: number; fed?: boolean; pet?: boolean; treat?: boolean; out?: boolean; hungry?: boolean; manure?: boolean; wind?: boolean; points?: { feed?: boolean; pet?: boolean; treat?: boolean } }
export interface Animal {
  id: string;
  owner: string;
  species: SpeciesId;
  breed: string;
  name: string;
  /** When it came out (a child of a cross is "coming" until then); bought ones are born when bought. */
  born: number;
  /** Whether Uncle Popoto sold it (what he pays back depends on it). */
  bought: boolean;
  home: Home;
  /** Its sex (chosen when bought; at random when born): a cross is one of each; males but a ram give nothing to collect. */
  sex: Sex;
  stats: Stats;
  /** Days in a row it was fed through (to `ANIMALS.streakCap`): half of what its care is, for its children. */
  streak: number;
  /** Everything below is as it stood at `at`, and `settle` brings it to a later moment. */
  at: number;
  /** Fed hours left in its trough. */
  food: number;
  /** Fed hours of growth (weighted by speed); grown at species.grow[0] + [1]. */
  grown: number;
  /** Fed hours towards the round in hand (an adult in a producing place). */
  made: number;
  /** Rounds ready to collect. */
  banked: number;
  /** Closeness points (0 .. perHeart × hearts). */
  hearts: number;
  today: Today;
  /** A speed-up feed's end; a speed-up whose hour was spring wind's (x3) ends then too. */
  speedUntil: number;
  windUntil: number;
  /** The highest narrowing of the round in hand, from graded feed (0 .. narrowest). */
  narrow: number;
  /** A parent rests until then. */
  rest: number;
  /** Whom it is lent to for a cross (a friend's ask its owner accepted), with which of theirs, until when. */
  lent: { to: string; until: number; with?: string } | null;
  /** Eggs it laid out on the meadow, waiting for its owner: each a spot and how many. */
  outside: Array<{ at: [number, number]; n: number }>;
  /** Bands it was out in during the round in hand (a bit a band, lib/town/bands' order), for its finds. */
  outBands: number;
}

/** A door's log: when it was opened and closed, newest last (an open one's close is null). */
export type GateLog = ReadonlyArray<readonly [number, number | null]>;

export interface Herd {
  owner: string;
  /** Which of the 24 barns is mine (null: none), how many it houses, and its door (open: my animals are out on the meadow). */
  barn: number | null;
  room: number;
  door: GateLog;
  /** What a barn taken back after it was left untended leaves its owner towards the next (coins, logs, stone). */
  credit: number;
  /** When its owner last cared for an animal of it (the untended rule reads it). */
  lastCare: number;
  /** The barn's front; who may care for the animals (none, named, anybody) and whom. */
  facade: number;
  care: "none" | "named" | "anybody";
  carers: string[];
}
export const newHerd = (owner: string): Herd => ({ owner, barn: null, room: ANIMALS.barns.stages[0].room, door: [], credit: 0, lastCare: 0, facade: 0, care: "named", carers: [] });

/** What else a settling needs to know of the keeper and of the town. */
export interface Ctx {
  /** The rank-3 warm bottle (+1 to growth, always). */
  bottle?: boolean;
  /** The owner's barn door. */
  door: GateLog;
}

export const adultAt = (sp: SpeciesId) => SPECIES[sp].grow[0] + SPECIES[sp].grow[1];
export function stageOf(a: Pick<Animal, "species" | "grown" | "born">, now: number): Stage {
  if (now < a.born) return "coming";
  const g = SPECIES[a.species].grow;
  return a.grown >= g[0] + g[1] ? "adult" : a.grown >= g[0] ? "young" : "baby";
}
export const heartsOf = (a: Pick<Animal, "hearts">) => Math.min(ANIMALS.hearts, Math.floor(a.hearts / ANIMALS.perHeart));
const MAX_HEARTS = ANIMALS.hearts * ANIMALS.perHeart;

/** Whether the gate stood open at a moment, and the next moment after it that it opened or closed. */
export function gateAt(gate: GateLog, t: number): { open: boolean; next: number } {
  let open = false, next = Infinity;
  for (const [from, to] of gate) {
    if (from <= t && (to === null || t < to)) { open = true; if (to !== null) next = Math.min(next, to); }
    else if (from > t) next = Math.min(next, from);
    else if (to !== null && to > t) next = Math.min(next, to);
  }
  return { open, next };
}
/** When a game day began (Bangkok; the day turns at 05:00, as stamina's dayOf). */
export const dayStart = (day: number) => day * DAY - 7 * HOUR + 5 * HOUR;

/** A day's flags put right for a day: a later day starts them afresh. */
const todayFor = (t: Today, day: number): Today => (t.day === day ? t : { day });

/** Its growth speed at a moment (x1, +1 a speed-up feed, +1 the warm bottle, its vigour, x3 in spring wind's hour), never above the cap. */
export function speedAt(a: Pick<Animal, "speedUntil" | "windUntil" | "stats">, t: number, ctx: Pick<Ctx, "bottle">): number {
  if (t < a.windUntil) return ANIMALS.speedCap;
  return Math.min(ANIMALS.speedCap, 1 + (t < a.speedUntil ? 1 : 0) + (ctx.bottle ? 1 : 0) + liftOf(a, "vigor") * ANIMALS.stats.vigor);
}
/** A stat as kept, made sound (one left out is the plainest). */
export const statOf = (a: Pick<Animal, "stats">, k: keyof Stats): number => {
  const v = Number(a.stats?.[k]);
  return Number.isFinite(v) ? Math.max(ANIMALS.stats.min, Math.min(ANIMALS.stats.max, Math.round(v))) : ANIMALS.stats.min;
};
/** How far a stat stands above the plainest (a 1 does nothing; a 10 does nine steps). */
export const liftOf = (a: Pick<Animal, "stats">, k: keyof Stats) => statOf(a, k) - ANIMALS.stats.min;
/** Whether an animal gives anything to collect: a female, or a sheep of either sex (the owner took "ตามที่พวกคุณเสนอ"). */
export const gives = (a: Pick<Animal, "sex" | "species">) => a.sex !== "m" || a.species === "sheep";
/** What a pet, a treat, the barn cat's pet or the wagon gives its hearts: more for its gentleness (to a hundredth, as the database rounds). */
export const heartGain = (a: Pick<Animal, "stats">, base: number) => Math.round(base * (1 + liftOf(a, "gentle") * ANIMALS.stats.gentle) * 100) / 100;
/** Its hearts after a gain, never past the most. */
export const heartsPlus = (a: Pick<Animal, "stats" | "hearts">, base: number) => Math.min(MAX_HEARTS, Math.round((a.hearts + heartGain(a, base)) * 100) / 100);
/** How fast its trough goes, an hour's portion an hour: half while out, less for its thrift. */
export const eatRate = (a: Pick<Animal, "stats">, out: boolean) => (out ? ANIMALS.outRate : 1) * (1 - liftOf(a, "thrift") * ANIMALS.stats.thrift);

/**
 * Brings an animal from `a.at` to `now`: food eaten (half as fast while the gate is open: it is out), growth and
 * production on fed hours only, rounds banked (a full bank pauses), and the day's hearts that passing days earned (a
 * day fed throughout; a day it was out). The heart of the line: the database's town.animal_settle is this, step for step.
 */
export function settle(a0: Animal, now: number, ctx: Ctx): Animal {
  const a: Animal = { ...a0, today: { ...a0.today } };
  const sp = SPECIES[a.species];
  let t = Math.max(a.at, a.born);
  // (in Uncle Popoto's pen it is frozen: no food eaten, nothing grows, nothing is given, no day counts)
  if (now <= t || a.home === "pen") return { ...a, at: Math.max(a.at, now) };
  a.today = todayFor(a.today, dayOf(t));
  let guard = 0;
  while (t < now && guard++ < 10_000) {
    const gate = gateAt(ctx.door, t);
    const out = gate.open;
    const dayEnd = dayStart(dayOf(t) + 1);
    let next = Math.min(now, gate.next, dayEnd);
    if (t < a.speedUntil) next = Math.min(next, a.speedUntil);
    if (t < a.windUntil) next = Math.min(next, a.windUntil);
    const rate = eatRate(a, out);
    if (a.food > 1e-9) {
      const runsOut = t + (a.food / rate) * HOUR;
      const end = Math.min(next, runsOut);
      let h = (end - t) / HOUR;
      a.food = Math.max(0, a.food - h * rate);
      // growth first, then whatever of the stretch is left after it is grown goes to production
      const g = adultAt(a.species);
      if (a.grown < g) {
        const v = speedAt(a, t, ctx);
        const need = (g - a.grown) / v;
        if (h < need) { a.grown += h * v; h = 0; } else { a.grown = g; h -= need; }
      }
      if (h > 0 && gives(a)) {
        if (a.banked < sp.bank) {
          a.made += h;
          while (a.made >= sp.cycle - 1e-9 && a.banked < sp.bank) { a.banked += 1; a.made -= sp.cycle; }
          if (a.banked >= sp.bank) a.made = 0;
          if (a.made < 1e-9) a.made = 0;
        }
      }
      if (out) { if (!a.today.out) { a.today.out = true; a.hearts = Math.min(MAX_HEARTS, a.hearts + ANIMALS.heart.out); } a.outBands |= 1 << bandOf(t); }
      t = end;
    } else {
      a.today.hungry = true;
      if (out && !a.today.out) { a.today.out = true; a.hearts = Math.min(MAX_HEARTS, a.hearts + ANIMALS.heart.out); }
      if (out) a.outBands |= 1 << bandOf(t);
      t = next;
    }
    if (t >= dayEnd && t <= now) {
      // the day it closes: fed throughout, a heart's worth and a day more of its streak; hungry, the streak begins again
      if (!a.today.hungry && !a.today.fed) a.hearts = Math.min(MAX_HEARTS, a.hearts + ANIMALS.heart.fed);
      a.streak = a.today.hungry ? 0 : Math.min(ANIMALS.streakCap, (a.streak ?? 0) + 1);
      a.today = { day: dayOf(t) };
    }
  }
  a.at = now;
  return a;
}

/* ── the eight bands (AGENTS.md "Cash Town time of day"): 03-05, 05-07, 07-11, 11-13, 13-16, 16-19, 19-23, 23-03 ── */
export const BAND_EDGES: readonly number[] = [3, 5, 7, 11, 13, 16, 19, 23];
export function bandOf(t: number): number {
  const h = new Date(t + 7 * HOUR).getUTCHours();
  for (let i = BAND_EDGES.length - 1; i >= 0; i--) if (h >= BAND_EDGES[i]) return i;
  return BAND_EDGES.length - 1; // 00-03 belongs to 23-03
}

/* ── what an animal out on the meadow brings back, by band (things of other lines; the before-dawn ones the meadow's) ── */

/** A round it was out in gives a find one time in `FIND_ODDS`, of a band it was out in: day (07-19), night (19-03), before dawn (03-07). */
export const FIND_ODDS = 3;
export const FINDS: Record<SpeciesId, { day: ItemId; night: ItemId; dawn: ItemId }> = {
  chicken: { day: "worm", night: "scarab", dawn: "dewClover" } as Record<"day" | "night" | "dawn", ItemId>,
  duck: { day: "snail", night: "nightDuckweed", dawn: "ghostReed" } as Record<"day" | "night" | "dawn", ItemId>,
  sheep: { day: "wildflower", night: "velvetVetch", dawn: "mistVetch" } as Record<"day" | "night" | "dawn", ItemId>,
  cow: { day: "sunAlfalfa", night: "lanternGrass", dawn: "dawnOats" } as Record<"day" | "night" | "dawn", ItemId>,
};
export const partOfDay = (band: number): "day" | "night" | "dawn" => (band <= 1 ? "dawn" : band >= 6 ? "night" : "day");
/** The find of a round, from its out-bands and two rolls; null most rounds. */
export function findOf(species: SpeciesId, outBands: number, r1: number, r2: number): ItemId | null {
  if (!outBands || r1 * FIND_ODDS >= 1) return null;
  const bands = BAND_EDGES.map((_, i) => i).filter((i) => outBands & (1 << i));
  return FINDS[species][partOfDay(bands[Math.floor(r2 * bands.length) % bands.length])];
}

/* ── the meadow's forage (twelve spots; each gives one thing of the band, once a band to a member) ── */

export const MEADOW = { spots: 12, stamina: 1, points: 1 } as const;
/** What a spot of the meadow gives in a band of a day: one of the band's forage (lib/town/animal-items' FORAGE_BANDS). */
export function forageAt(bands: Readonly<Record<string, readonly number[]>>, day: number, band: number, spot: number): ItemId | null {
  const of = Object.keys(bands).filter((id) => bands[id].includes(band)).sort();
  return of.length ? (of[(day * 31 + band * 7 + spot * 13) % of.length] as ItemId) : null;
}

/* ── Quality of what it gives ── */

/** The range a unit of its produce is rolled in: the ceiling from its hearts, the floor 30 under it raised by graded feed. */
export function rangeOf(a: Pick<Animal, "hearts" | "narrow">): { floor: number; ceiling: number } {
  const ceiling = Math.min(100, ANIMALS.quality.base + ANIMALS.quality.perHeart * heartsOf(a));
  const floor = Math.max(0, ceiling - ANIMALS.quality.spread + Math.min(ANIMALS.quality.narrowest, a.narrow));
  return { floor, ceiling };
}
/** One unit's Quality, from a roll in [0, 1); the rank-4 star collar takes the top. */
export const rollOf = (r: { floor: number; ceiling: number }, roll: number, collar = false) =>
  collar ? r.ceiling : r.floor + Math.min(r.ceiling - r.floor, Math.floor(roll * (r.ceiling - r.floor + 1)));

/* ── what the games give ── */

/** A game's play as the page reports it: hits, misses and how long it took. The score is the share of hits. */
export interface Play { hits: number; misses: number; secs: number }
export const scoreOf = (p: Play) => (p.hits + p.misses > 0 ? Math.max(0, Math.min(1, p.hits / (p.hits + p.misses))) : 0);
/** The least a game can believably take, a round (seconds): a faster report is taken as no play at all. */
export const LEAST_SECS: Record<Game, number> = { eggs: 3, shear: 6, milk: 6 };

/**
 * What a collection gives, units of its breed's produce: the coop's eggs are the banked rounds less what cracked
 * (`cracked` from the game); a fleece is 3 to 5 tufts by the score and two more traced whole; a milking 2 to 5 bottles
 * a banked round by the score.
 */
export function unitsOf(game: Game, banked: number, play: Play | null, cracked = 0): { units: number; whole: boolean } {
  if (banked <= 0) return { units: 0, whole: false };
  const sc = play ? scoreOf(play) : 0;
  if (game === "eggs") return { units: Math.max(0, banked - Math.max(0, Math.min(banked, cracked))), whole: false };
  if (game === "shear") { const whole = sc >= 0.95; return { units: 3 + Math.round(2 * sc) + (whole ? 2 : 0), whole }; }
  return { units: banked * (2 + Math.round(3 * sc)), whole: false };
}

/* ── the barn and the pen ── */

/** How many of a member's animals are in their barn and in Uncle Popoto's pen. */
export function usedOf(animals: readonly Animal[], owner: string) {
  const mine = animals.filter((a) => a.owner === owner);
  return { barn: mine.filter((a) => a.home !== "pen").length, pen: mine.filter((a) => a.home === "pen").length };
}
/** Where a new animal of a member's goes: their barn while it has room, else the pen while it has room, else nowhere. */
export function freeHome(herd: Herd, animals: readonly Animal[]): Home | null {
  const used = usedOf(animals, herd.owner);
  if (herd.barn !== null && used.barn < herd.room) return "barn";
  return used.pen < ANIMALS.pen ? "pen" : null;
}
/** A barn's next stage after the room it has (none: it is as large as it goes). */
export const nextStage = (room: number) => ANIMALS.barns.stages.find((s) => s.room > room) ?? null;
/** The coins a barn's stages cost up to the room it has: what its owner keeps as credit if it is taken back. */
export const stagesPaid = (room: number) => ANIMALS.barns.stages.filter((s) => s.room <= room).reduce((t, s) => t + s.coins, 0);
/** Who holds each of the 24 barns. */
export const barnsOf = (herds: readonly Herd[]): Array<string | null> =>
  Array.from({ length: ANIMALS.barns.count }, (_, i) => herds.find((h) => h.barn === i)?.owner ?? null);
/** Days a barn has gone untended (from its owner's last care), and what that comes to: 0 fine, 1 and 2 warned, 3 to be taken back by whoever asks. */
export function untendedOf(herd: Pick<Herd, "barn" | "lastCare">, now: number): { days: number; level: 0 | 1 | 2 | 3 } {
  if (herd.barn === null) return { days: 0, level: 0 };
  const days = Math.floor((now - herd.lastCare) / DAY);
  const u = ANIMALS.untended;
  return { days, level: days >= u.reclaim ? 3 : days >= u.warn[1] ? 2 : days >= u.warn[0] ? 1 : 0 };
}

/* ── stats and children ── */

/** How well an animal has been cared for, 0 to 1: its hearts (six parts) and its days fed through in a row (four). */
export const careOf = (a: Pick<Animal, "hearts" | "streak">) =>
  0.6 * Math.min(1, a.hearts / MAX_HEARTS) + 0.4 * Math.min(1, (a.streak ?? 0) / ANIMALS.inherit.streakFull);
/** A bought animal's stats, from three rolls. */
export const boughtStats = (rand: () => number): Stats => {
  const [lo, hi] = ANIMALS.stats.bought, roll = () => lo + Math.floor(rand() * (hi - lo + 1));
  return { thrift: roll(), gentle: roll(), vigor: roll() };
};
/**
 * A child's stats: each the parents' average (a half rounded up or down at random), then one roll by the parents'
 * care (the mean of the two): up 1 at 5% + 35% x care, up 2 instead at 5% when the care is 0.9 or more, down 1 at
 * 25% x (1 - care). Kept between 1 and 10.
 */
export function childStats(a: Pick<Animal, "stats" | "hearts" | "streak">, b: Pick<Animal, "stats" | "hearts" | "streak">, rand: () => number): Stats {
  const care = (careOf(a) + careOf(b)) / 2, I = ANIMALS.inherit;
  const one = (k: keyof Stats) => {
    const sum = statOf(a, k) + statOf(b, k);
    let v = sum % 2 === 0 ? sum / 2 : rand() < 0.5 ? Math.floor(sum / 2) : Math.ceil(sum / 2);
    // (one roll: the first `spark` of it a +2 when the care is high enough, then the +1's share, the -1's at the top)
    const r = rand(), two = care >= I.sparkFrom ? I.spark : 0;
    if (r < two) v += 2;
    else if (r < two + I.upBase + I.upCare * care) v += 1;
    else if (r > 1 - I.downNeglect * (1 - care)) v -= 1;
    return Math.max(ANIMALS.stats.min, Math.min(ANIMALS.stats.max, v));
  };
  return { thrift: one("thrift"), gentle: one("gentle"), vigor: one("vigor") };
}
/** What the nest shows before a cross: each stat's likely low and high for the child. */
export function childRange(a: Pick<Animal, "stats" | "hearts" | "streak">, b: Pick<Animal, "stats" | "hearts" | "streak">) {
  const care = (careOf(a) + careOf(b)) / 2;
  return Object.fromEntries(STAT_IDS.map((k) => {
    const sum = statOf(a, k) + statOf(b, k), lo = Math.floor(sum / 2), hi = Math.ceil(sum / 2);
    return [k, { lo: Math.max(ANIMALS.stats.min, lo - (care < 1 ? 1 : 0)), hi: Math.min(ANIMALS.stats.max, hi + (care >= ANIMALS.inherit.sparkFrom ? 2 : 1)) }];
  })) as Record<keyof Stats, { lo: number; hi: number }>;
}

/* ── friend care ── */

export const mayCare = (herd: Herd | undefined, me: string) =>
  !!herd && herd.owner !== me && (herd.care === "anybody" || (herd.care === "named" && herd.carers.includes(me)));

/* ── what Uncle Popoto pays back ── */
export const sellBackOf = (a: Pick<Animal, "species" | "bought">) => (a.bought ? Math.floor(SPECIES[a.species].price * ANIMALS.sellBack.bought) : SPECIES[a.species].bredBack);

/* ── the breed book ── */

/** A member's book: per (species, child letter) how often they missed it (a clue after `clueAfter`), and the recipes read. */
export interface Book { misses: Record<string, number> }
export const stepKey = (species: SpeciesId, child: Letter) => `${species}.${child}`;
export const knowsOffering = (book: Book, recipes: readonly string[], species: SpeciesId, child: Letter) =>
  (book.misses[stepKey(species, child)] ?? 0) >= ANIMALS.clueAfter || recipes.includes(scrollOf(species, child));
/** A breed's recipe written out (a scroll item id, drawn as every scroll is): the species and the child's letter. */
export const scrollOf = (species: SpeciesId, child: Letter) => `scrollBreed${species[0].toUpperCase()}${species.slice(1)}${child}`;

/** What two parents and an offering come to: the step (if any), its breed, the odds in hundredths. */
export function crossOf(a: Breed, b: Breed, offering: string | null, dawn: boolean) {
  const kind = kindOf(offering);
  const step = stepFor(a, b, kind);
  const target = step ? breedAt(a.species, step.child) : null;
  const right = !!(step && offering && OFFERINGS[a.species][step.child] === offering);
  const odds = right && target ? Math.min(ANIMALS.oddsCap, ANIMALS.odds[target.tier as "real" | "fantasy" | "legend"] + (dawn ? ANIMALS.dawnBoost : 0)) : 0;
  return { step, target, right, odds };
}
export const feeOf = (target: Breed | null, a: Breed, b: Breed) => {
  const t = target?.tier ?? (a.tier === "legend" || b.tier === "legend" ? "legend" : a.tier === "fantasy" || b.tier === "fantasy" ? "fantasy" : "real");
  return ANIMALS.fees[t === "starter" ? "real" : (t as "real" | "fantasy" | "legend")];
};
