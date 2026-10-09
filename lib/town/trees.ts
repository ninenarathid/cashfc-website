import { FELLING, leastSecs, timberOf, type Family, type FellTree, type FellingAsk, type Girth } from "./felling";
import { works } from "./gifts";
import type { ItemId } from "./items";
import type { TreeAge } from "./mountain";
import { stowAll } from "./pouches";
import { mayPower, usePower } from "./powers";
import { dayOf, eased, isSpent, spend } from "./stamina";
import { ALL, ELEMENTS, FORGE, GEM_FX, GEM_LEVELS, LEVELS, OPTIONS, OPTION_IDS, axeAhead, axeBarPace, axeChops, gemBy, has, levelOf, optN, toolKindOf, type OptionUse } from "./tools";
import { heldStack, type Purse, type Stack } from "./trade";
import { MOUNTAIN_AT, MOUNTAIN_TREES } from "./world";

/**
 * The mountain's trees, and what felling one comes to (the owner, 2026-10-08: woodcutting; "Rocks struck and trees
 * felled are gone for EVERYBODY (as a caught insect is), and come back by the clock").
 *
 * - **A tree is everybody's.** Felled, it is a stump on every screen, and grows back by the clock through four looks
 *   (a stump, a sprout, a young tree, grown). Who felled which and when is kept by whoever keeps the game
 *   (`Grove`); a page is told only what is not grown, and draws that.
 * - **A tree is felled at its board, by a trunk cut through** (lib/town/felling). A go that is lost fells nothing,
 *   gives nothing and costs no stamina: the tree stands, for whoever comes to it next. The owner, the day after the
 *   mountain opened, of somebody who felled so fast that nobody else had a tree: "เอาระบบตัดไม้เร็วออก ต้องเล่น
 *   มินิเกมทุกครั้ง", and of a go lost on purpose, which still fell its tree: "แพ้แล้วต้นไม่ล้ม ไม่ได้ของ และไม่เสีย
 *   stamina". (Before that, from 2026-10-08: a tree always fell and gave its logs however its go went, and beside
 *   the board there was a plain way that felled it at once. A go that asks for the plain way is refused, `board`.)
 * - **A pine has a girth**: slender, plain or stout, its own from its number. A slender one is a short game with a
 *   kind bar and one fine timber at the most; a stout one a long game with a tight bar and three.
 * - **A go is one's own from the moment its board is open**: a tree somebody else fells meanwhile still pays whoever
 *   was at it.
 * - **The ancient tree** is one, grown once a day from dawn, and falls only to an axe forged to the top.
 * - **The trees of the upper terraces** are for better axes than there are yet: an axe of the first tier is refused.
 * - **The game** is lib/town/felling's; this file puts one together from the axe in the hand (lib/town/tools reads
 *   what the axe carries), from the tree's girth, from tired hands, and from the two gifts that change it; and says
 *   what a go that was played brings home.
 * - **A keepsake** falls out of a tree now and then: a small thing that is no thing of the bag and fetches nothing,
 *   kept in the book of the pines, the village's, with who found each first.
 * - **A friend may brace the trunk** of a go that is open: the feller's bar runs slower, and the friend has a log.
 *
 * Nothing here is told to the players: what an axe's option or gem does is theirs to find. Every number is a knob,
 * and they are all in `TREES`. Pure: every function is given the moment it is asked at and the numbers of chance it
 * may need, and gives back a new purse and a new grove.
 */
export const TREES = {
  /** The minutes a felled tree takes to be grown again; and the share of them at which each of its four looks begins. */
  // (six minutes since 2026-10-09, where it was forty: the owner, the evening the mountain opened, "ทำให้ respawn ไวขึ้น".
  // With the ninety-two pines there are it is some fifteen a minute for the whole village: five members felling without a pause.)
  regrow: 6, looks: [0, 0.25, 0.6, 1] as readonly number[],
  /** The stamina a tree felled costs; how near one stands to fell it, in tiles; and the tier of the axes there are. */
  cost: 2, reach: 1, axeTier: 1,
  /** What a tree gives whatever the hand does: so many logs. */
  logs: 2,
  /**
   * A pine's girths: slender, plain, stout. Each: the chops it takes with a plain axe (lib/town/tools' own table is
   * the plain one's); how fast its bar runs for a rested hand and for one with no stamina (so many times the plain
   * pace); the family its branches come in (lib/town/felling); and its fine timber, one for each number, each won by
   * a trunk cut through with no more misses than that number.
   * (Fitted 2026-10-08 with made-up hands: lib/town/felling.test.ts says what each made of them.)
   */
  girths: [
    { chops: 8, pace: 0.8, spent: 1.6, family: "alternate", timber: [2] },
    { chops: LEVELS.axe.chops[0], pace: 1, spent: 1.22, family: "pairs", timber: [2, 0] },
    { chops: 16, pace: 1.05, spent: 1.2, family: "run", timber: [3, 1, 0] },
  ] as ReadonlyArray<{ chops: number; pace: number; spent: number; family: Family; timber: readonly number[] }>,
  /** Which girth a pine is of is worked out from its number and this (a third of the slope's pines each); the trees of the upper terraces are all of one girth. */
  girthSeed: 2627, girthAbove: 2 as Girth,
  /** The chops the ancient tree takes with a plain axe; how fast its bar runs, rested and with no stamina; and the family of its branches. */
  elderChops: 24, elderPace: 1, elderSpent: 1.6, elderFamily: "noise" as Family,
  /** The ancient tree: its number among the trees, the plus an axe has to have, and what it gives. */
  elder: { id: 900, plus: FORGE.top, timber: 15, resin: 3 },
  /**
   * **One go on a tree at a time** (2026-10-09: wood is the scarce thing). From the moment a board is open its trees
   * are held for whoever opened it, for so many seconds: nobody else's board or one chop takes on any of them
   * meanwhile (they are told who fells it; the brace stays theirs to offer), so nobody is robbed mid-go and no tree
   * pays two people. A hold that has lapsed frees its trees, and a go that ends after it is paid only for the trees
   * still standing: nobody keeps a tree from the others by opening a board and walking away.
   * How long: the longest a go can be played is its bar's time, what it begins with and what every chop puts back,
   * at the slowest the bar can run ((1.8 + 0.36 a chop) seconds, over the pace): about 7 s on a stout pine with a
   * plain axe and 10 with its trunk braced, and at the very most about 20 (the ancient tree, the slowest bar there
   * can be, braced). With room to read the board before the first chop and for the answer to come back: 45.
   */
  go: { secs: 45 },
  /** A friend braces a trunk from within so many tiles of it; and has so many logs for it, their own. */
  brace: { reach: 2, logs: 1 },
  /** A keepsake falls out of one tree in so many. */
  keepsake: { in: 6 },
  /** A tree's kinds, by its tier; and what the ancient tree is called in what is written down. */
  kinds: ["pine", "ironwood", "moonwood"] as readonly string[], elderKind: "elder",
  /** What the resin-scent turns up besides the wood: one of these, as likely each. */
  scent: ["resin", "pineCone"] as readonly ItemId[],
  /** The echo axe: how many trees one game fells at the most, and how near the first the others stand, in tiles. */
  echo: { trees: 3, reach: 2 },
  /** A tree half cut by an axe's lightning: how near the felled one it stands, in tiles; and the share of its chops that are left. */
  chain: { reach: 3, left: 0.5 },
  /** The woodpecker: so many branches struck that are forgiven, a tree. */
  pecks: 1,
  /** The quickening root: a stump is "just made" for so many seconds after its tree fell. */
  root: { within: 120 },
};

/* ── what stands there ──────────────────────────────────────────────────── */

/** A tree as the layout has it: its number, its tile (the ancient tree: its corner and how many tiles it takes), its tier, and whether it is the ancient one. */
export interface Standing { id: number; x: number; y: number; tier: 1 | 2 | 3; size?: number; elder?: boolean }
/** The mountain's trees as the game sees them: every numbered tree, and the ancient tree with a number of its own. (None, outside the preview: lib/town/world lays the mountain out only there.) */
export const woodOf = (trees: ReadonlyArray<{ id: number; x: number; y: number; tier: 1 | 2 | 3 }>, cedar: { x: number; y: number; w: number } | null): Standing[] =>
  (trees.length ? [...trees.map((t) => ({ ...t })), ...(cedar ? [{ id: TREES.elder.id, x: cedar.x, y: cedar.y, tier: 1 as const, size: cedar.w, elder: true }] : [])] : []);
export const WOOD: Standing[] = woodOf(MOUNTAIN_TREES, MOUNTAIN_AT.cedar);
export const treeOf = (id: number, wood: readonly Standing[] = WOOD): Standing | null => wood.find((t) => t.id === id) ?? null;
/** What a tree is called in what is written down, and what its kind is counted as on the line: by its tier, or the ancient tree's own. */
export const kindOf = (t: Standing): string => (t.elder ? TREES.elderKind : TREES.kinds[t.tier - 1]);
/**
 * A tree's girth: its own from its number, the same on every screen and for as long as the knob stands. The ancient
 * tree is a great one; the trees of the upper terraces are all alike.
 */
export function girthOf(t: Pick<Standing, "id" | "tier" | "elder">): Girth {
  if (t.elder) return 3;
  if (t.tier !== 1) return TREES.girthAbove;
  let h = Math.imul(t.id + 1, 0x9e3779b1) ^ TREES.girthSeed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (1 + ((h >>> 0) % 3)) as Girth;
}
/** What a tree's girth makes of its game: the knobs of its girth (the ancient tree's are its own). */
const girthKnobs = (t: Pick<Standing, "id" | "tier" | "elder">) => (t.elder
  ? { chops: TREES.elderChops, pace: TREES.elderPace, spent: TREES.elderSpent, family: TREES.elderFamily, timber: [ALL] as readonly number[] }
  : TREES.girths[girthOf(t) - 1]);
/** The misses each of a tree's fine timbers bears (lib/town/felling's timberOf); the ancient tree's one prize bears them all. */
export const bearsOf = (t: Pick<Standing, "id" | "tier" | "elder">): readonly number[] => girthKnobs(t).timber;
/** How far a tile is from a tree, in tiles (from the nearest of the tiles it stands on). */
export function farFrom(t: Standing, at: readonly [number, number]): number {
  const size = t.size ?? 1, dx = Math.max(t.x - at[0], 0, at[0] - (t.x + size - 1)), dy = Math.max(t.y - at[1], 0, at[1] - (t.y + size - 1));
  return Math.max(dx, dy);
}
/** How far two trees stand from each other, in tiles. */
const apart = (a: Standing, b: Standing) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/* ── what is kept ───────────────────────────────────────────────────────── */

/** A tree that was felled: when, and by whom. */
export interface Felled { at: number; by: string }
/** A go that is open: the trees it is for (the one walked up to first), when its board was opened, and who braces its trunk, if anybody. */
export interface Go { trees: number[]; at: number; braced?: string }
/**
 * The trees as they are kept, the village's: those felled and not yet grown again, by their numbers; those an axe's
 * lightning has left half cut; the goes that are open, by whose they are; and the book of the pines, each keepsake
 * that was ever found with who found it first and when.
 */
export interface Grove { down: Record<string, Felled>; half: number[]; goes?: Record<string, Go>; book?: Record<string, { by: string; at: number }> }
export const newGrove = (): Grove => ({ down: {}, half: [] });
/** A grove as it is kept, made sound. */
export function groveOf(v: unknown): Grove {
  const g = (v && typeof v === "object" ? v : {}) as Partial<Grove>, down: Record<string, Felled> = {};
  for (const [id, f] of Object.entries(g.down && typeof g.down === "object" ? g.down : {})) {
    if (f && typeof f.at === "number" && Number.isFinite(f.at) && typeof f.by === "string") down[id] = { at: f.at, by: f.by };
  }
  const goes: Record<string, Go> = {}, book: Record<string, { by: string; at: number }> = {};
  for (const [who, go] of Object.entries(g.goes && typeof g.goes === "object" ? g.goes : {})) {
    if (go && Array.isArray(go.trees) && go.trees.length && go.trees.every((n) => Number.isInteger(n)) && typeof go.at === "number" && Number.isFinite(go.at)) {
      goes[who] = { trees: [...go.trees], at: go.at, ...(typeof go.braced === "string" && go.braced && go.braced !== who ? { braced: go.braced } : {}) };
    }
  }
  for (const [id, f] of Object.entries(g.book && typeof g.book === "object" ? g.book : {})) {
    if (isKeepsake(id) && f && typeof f.by === "string" && typeof f.at === "number" && Number.isFinite(f.at)) book[id] = { by: f.by, at: f.at };
  }
  return {
    down, half: Array.isArray(g.half) ? [...new Set(g.half.filter((n): n is number => Number.isInteger(n)))] : [],
    ...(Object.keys(goes).length ? { goes } : {}), ...(Object.keys(book).length ? { book } : {}),
  };
}

const MIN = 60_000;
/** When a tree felled at a moment is grown again: so many minutes on; the ancient tree, at the next dawn. */
export function grownAt(t: Pick<Standing, "elder">, felledAt: number): number {
  if (!t.elder) return felledAt + TREES.regrow * MIN;
  // (the day begins at dawn, as the stamina's does: the first moment of the day after the one it fell on)
  let lo = felledAt, hi = felledAt + 25 * 60 * MIN;
  const day = dayOf(felledAt);
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (dayOf(mid) > day) hi = mid; else lo = mid; }
  return hi;
}
/** A tree's look at a moment, from when it fell and when it is grown again: 0 a stump, 1 a sprout, 2 a young tree, 3 grown. The ancient tree is a stump until it is grown. */
export function lookAt(felledAt: number, until: number, now: number, elder = false): TreeAge {
  if (now >= until) return 3;
  if (elder || until <= felledAt) return 0;
  const share = (now - felledAt) / (until - felledAt);
  return share >= TREES.looks[2] ? 2 : share >= TREES.looks[1] ? 1 : 0;
}
/** How a tree looks now. */
export function ageOf(grove: Grove, t: Standing, now: number): TreeAge {
  const f = grove.down[t.id];
  return f ? lookAt(f.at, grownAt(t, f.at), now, !!t.elder) : 3;
}
export const isGrown = (grove: Grove, t: Standing, now: number): boolean => ageOf(grove, t, now) === 3;
/** Whether a go is still its owner's: opened no longer ago than a go is held. */
const goHolds = (go: Go | undefined, now: number): go is Go => !!go && now - go.at <= TREES.go.secs * 1000 && now >= go.at;
/** Whose go holds a tree now, other than `me`'s own: whoever has an open go, not lapsed, that the tree is one of. Null when nobody's. */
export function heldBy(grove: Grove, tree: number, now: number, me?: string): string | null {
  for (const [who, go] of Object.entries(grove.goes ?? {})) if (who !== me && goHolds(go, now) && go.trees.includes(tree)) return who;
  return null;
}
/**
 * What the room is told of what somebody does at a tree (lib/town/room's `Doing.fell`): `f` and the tree their board
 * is up at, then every other tree their go holds (an echoing axe's), each after a dot; `b` and the tree whose trunk
 * they brace; "" for neither. Every page reads from it which trees are held and by whom, before anybody presses.
 */
export const fellWord = (trees: readonly number[]): string => (trees.length ? `f${trees.slice(0, 4).join(".")}` : "");
/** (The same shape is what lib/town/room lets through: change the two together.) */
export const FELL_WORD = /^(?:f\d{1,4}(?:\.\d{1,4}){0,3}|b\d{1,4})?$/;
/** The word read back: a board (`f`) with its first tree and all the trees it holds, or a brace (`b`) with its tree. Null for no word. */
export function readFellWord(word: unknown): { kind: "f" | "b"; tree: number; trees: number[] } | null {
  if (typeof word !== "string" || !word || !FELL_WORD.test(word)) return null;
  const trees = word.slice(1).split(".").map(Number);
  return { kind: word[0] as "f" | "b", tree: trees[0], trees };
}
/** A grove with what has grown again forgotten, and the goes that are held no longer: only what still counts is kept. */
export function tidied(grove: Grove, now: number, wood: readonly Standing[] = WOOD): Grove {
  const down = Object.fromEntries(Object.entries(grove.down).filter(([id, f]) => { const t = treeOf(Number(id), wood); return !!t && now < grownAt(t, f.at); }));
  const goes = Object.fromEntries(Object.entries(grove.goes ?? {}).filter(([, go]) => goHolds(go, now)));
  const same = Object.keys(down).length === Object.keys(grove.down).length && Object.keys(goes).length === Object.keys(grove.goes ?? {}).length;
  if (same) return grove;
  const { goes: _was, ...rest } = grove;
  return { ...rest, down, ...(Object.keys(goes).length ? { goes } : {}) };
}

/**
 * The trees as a page is told them: every tree that is not grown, with when it fell and when it is grown again (a
 * page draws its look from the two, by the clock); and the trees half cut. Of the ancient tree only that it is down:
 * when it is grown again is told to whoever holds an axe that knows it. And the book of the pines, where anything
 * has been found: each keepsake with who found it first.
 */
export interface TreesTold { down: Array<{ id: number; at: number; until?: number }>; half: number[]; book?: Array<[id: string, by: string]> }
export function toldOf(grove: Grove, purse: Purse, now: number, wood: readonly Standing[] = WOOD): TreesTold {
  const knows = has(heldStack(purse), "axElder"), down: TreesTold["down"] = [];
  for (const [id, f] of Object.entries(grove.down)) {
    const t = treeOf(Number(id), wood);
    if (!t) continue;
    const until = grownAt(t, f.at);
    if (now < until) down.push({ id: t.id, at: f.at, ...(t.elder && !knows ? {} : { until }) });
  }
  const book = KEEPSAKE_IDS.filter((id) => grove.book?.[id]).map((id): [string, string] => [id, grove.book![id].by]);
  return { down: down.sort((a, b) => a.id - b.id), half: grove.half.filter((id) => !grove.down[id]).sort((a, b) => a - b), ...(book.length ? { book } : {}) };
}
/** A tree's look as a page reads it from what it was told: grown, with nothing told of it. */
export function lookOf(told: TreesTold | null, id: number, now: number): TreeAge {
  const d = told?.down.find((x) => x.id === id);
  if (!d) return 3;
  return d.until === undefined ? 0 : lookAt(d.at, d.until, now, id === TREES.elder.id);
}

/* ── keepsakes ──────────────────────────────────────────────────────────── */

/**
 * What a pine lets fall now and then. A keepsake is no thing of the bag: it is not carried, not dealt in, and
 * fetches nothing. Each has its name and a line of what it looks like; how often it is the one that falls
 * (`weight`, among those a tree may let fall); and whether only a stout tree has it.
 */
export interface Keepsake { name: { th: string; en: string }; line: { th: string; en: string }; weight: number; stout?: boolean }
export const KEEPSAKES = {
  nest: { name: { th: "รังนกเปล่า", en: "An empty nest" }, line: { th: "กิ่งไม้เล็กๆ สานเป็นถ้วย มีขนอ่อนติดอยู่ก้นรัง", en: "Twigs woven into a cup, a wisp of down still in the bottom." }, weight: 10 },
  feather: { name: { th: "ขนนกลายขวาง", en: "A barred feather" }, line: { th: "ขนนกสีน้ำตาล มีลายขวางสีเข้ม ปลายขาว", en: "Brown, with dark bars and a white tip." }, weight: 10 },
  twinCones: { name: { th: "ลูกสนแฝด", en: "Twin cones" }, line: { th: "ลูกสนสองลูกโตติดกันบนขั้วเดียว", en: "Two cones grown from the one stem." }, weight: 10 },
  cicada: { name: { th: "คราบจักจั่น", en: "A cicada's shell" }, line: { th: "คราบใสสีน้ำตาลอ่อน ยังเกาะเปลือกไม้ท่าเดิม", en: "A pale brown husk, still gripping the bark as it did." }, weight: 10 },
  pellet: { name: { th: "ก้อนสำรอกนกฮูก", en: "An owl's pellet" }, line: { th: "ก้อนขนสีเทาอัดแน่น มีกระดูกชิ้นจิ๋วโผล่ออกมา", en: "A grey wad of fur packed tight, tiny bones showing." }, weight: 10 },
  initials: { name: { th: "รอยสลักอักษรย่อ", en: "Carved initials" }, line: { th: "เปลือกไม้แผ่นหนึ่ง มีตัวอักษรสองตัวกับปีที่เลือนจนอ่านไม่ออก", en: "A slab of bark with two letters and a year worn past reading." }, weight: 6 },
  heartKnot: { name: { th: "ตาไม้รูปหัวใจ", en: "A heart-shaped knot" }, line: { th: "ตาไม้สีเข้ม ขอบโค้งเป็นรูปหัวใจพอดี", en: "A dark knot whose edge curls into a heart." }, weight: 6 },
  amber: { name: { th: "ลูกปัดอำพัน", en: "An amber bead" }, line: { th: "ยางไม้แข็งสีน้ำผึ้ง กลมเท่าปลายนิ้ว มีฟองอากาศอยู่ข้างใน", en: "Honey-coloured resin gone hard, round as a fingertip, a bubble inside." }, weight: 6 },
  ribbon: { name: { th: "ริบบิ้นสีซีด", en: "A faded ribbon" }, line: { th: "ริบบิ้นผ้าผูกเป็นโบว์ สีซีดจนเกือบขาว", en: "A cloth ribbon tied in a bow, faded almost white." }, weight: 6 },
  rustKey: { name: { th: "กุญแจขึ้นสนิม", en: "A rusted key" }, line: { th: "กุญแจเหล็กดอกเล็ก เนื้อไม้โตหุ้มไว้ครึ่งดอก", en: "A small iron key, the wood grown half around it." }, weight: 4, stout: true },
  silverRing: { name: { th: "วงปีสีเงิน", en: "A silver ring of grain" }, line: { th: "แว่นไม้บางๆ มีวงปีวงหนึ่งเป็นสีเงิน", en: "A thin round of wood with one growth ring gone silver." }, weight: 3, stout: true },
  carvedBird: { name: { th: "นกไม้แกะตัวจิ๋ว", en: "A tiny carved bird" }, line: { th: "นกไม้แกะสลักตัวเท่าหัวแม่มือ ปีกข้างหนึ่งบิ่น", en: "A wooden bird no bigger than a thumb, one wing chipped." }, weight: 2, stout: true },
} as const satisfies Record<string, Keepsake>;
export type KeepsakeId = keyof typeof KEEPSAKES;
export const KEEPSAKE_IDS = Object.keys(KEEPSAKES) as KeepsakeId[];
export const isKeepsake = (id: unknown): id is KeepsakeId => typeof id === "string" && Object.prototype.hasOwnProperty.call(KEEPSAKES, id);
/** The keepsakes a tree of a girth may let fall. */
export const keepsakesOf = (girth: Girth): KeepsakeId[] => KEEPSAKE_IDS.filter((id) => girth === 3 || !(KEEPSAKES[id] as Keepsake).stout);
/**
 * What a felled tree lets fall, if anything: from two numbers of chance (whether; and which, by the weights of those
 * its girth may have). Nothing, from the ancient tree and from the trees above the first tier.
 */
export function keepsakeFor(t: Pick<Standing, "id" | "tier" | "elder">, whether: number, which: number): KeepsakeId | null {
  if (t.elder || t.tier !== 1 || !(whether < 1 / TREES.keepsake.in)) return null;
  const may = keepsakesOf(girthOf(t)), all = may.reduce((n, id) => n + KEEPSAKES[id].weight, 0);
  let at = Math.max(0, Math.min(0.999999, which)) * all;
  for (const id of may) { at -= KEEPSAKES[id].weight; if (at < 0) return id; }
  return may[may.length - 1] ?? null;
}

/* ── the purse's own ────────────────────────────────────────────────────── */

/**
 * What a woodcutter's purse keeps of the line: the part of a point of stamina left owing by an axe's earth
 * (lib/town/stamina's eased); how many trees have fallen towards the next offcut; and the keepsakes found, how many
 * of each (they are kept here and nowhere else: never in the bag).
 */
export interface FellingKept { owed: number; dust: number; keeps: Partial<Record<KeepsakeId, number>> }
export function fellingOf(purse: Pick<Purse, "felling">): FellingKept {
  const k = purse.felling, owed = typeof k?.owed === "number" && k.owed > 0 && k.owed < 1 ? k.owed : 0;
  const dust = typeof k?.dust === "number" && Number.isInteger(k.dust) && k.dust > 0 ? k.dust : 0;
  const keeps: Partial<Record<KeepsakeId, number>> = {};
  for (const [id, n] of Object.entries(k?.keeps && typeof k.keeps === "object" ? k.keeps : {})) if (isKeepsake(id) && typeof n === "number" && Number.isInteger(n) && n > 0) keeps[id] = n;
  return { owed, dust, keeps };
}
/** A woodcutter's own as it is written into a purse: nothing of what is empty. */
const keptOut = (k: FellingKept): NonNullable<Purse["felling"]> => ({ owed: k.owed, dust: k.dust, ...(Object.keys(k.keeps).length ? { keeps: k.keeps } : {}) });

/**
 * The wood a go brings home: the purse with every thing in it, or null when there is not the room for all of it.
 * Into the pouches that take wood first (the firewood cord's slots, for whoever has it), then the bag: lib/town/pouches'
 * `stowAll`, as the mine's haul goes. (The one place things from a tree are put away.)
 */
export function bringHome<P extends Purse>(purse: P, things: ReadonlyArray<readonly [ItemId, number]>): P | null {
  return stowAll(purse, things);
}

/* ── a game, put together ───────────────────────────────────────────────── */

/** Why a tree is not felled: it is not grown; this axe will not bite (a tree of a better tier); the ancient tree asks more of an axe; it is too far. */
/** (`board`: the plain way that was, asked for: a tree is felled at its board.) */
export type TreeRefusal = "stump" | "bite" | "plus" | "far" | "held" | "board";
type No = { ok: false; why: TreeRefusal | "none" | "tool" | "full" | "spent" };
const no = (why: No["why"]): No => ({ ok: false, why });

/** The axe in the hand, if it is one. */
export const axeOf = (purse: Purse): Stack | null => { const s = heldStack(purse); return s && toolKindOf(s.item) === "axe" ? s : null; };
/** Whether this axe may fell that tree at all, and why not: its tier, and the ancient tree's own asking. */
export function bites(axe: Stack, t: Standing): TreeRefusal | null {
  if (t.tier > TREES.axeTier) return "bite";
  if (t.elder && levelOf(axe) < TREES.elder.plus) return "plus";
  return null;
}
/**
 * The axe a tree wants, of an axe it refuses: the tier it has to be of, or the plus (a page shows it as a picture).
 * Nothing, of a tree any axe fells.
 */
export function wantsOf(t: Pick<Standing, "tier" | "elder">): { tier: number; plus: number } | null {
  if (t.tier > TREES.axeTier) return { tier: t.tier, plus: 0 };
  return t.elder ? { tier: TREES.axeTier, plus: TREES.elder.plus } : null;
}
/** The chops a tree takes with an axe: the axe's own all told, of a trunk of the tree's girth; and half of that of a tree half cut. */
export function chopsFor(axe: Stack, t: Standing, half: boolean): number {
  const whole = axeChops(axe, girthKnobs(t).chops);
  return half ? Math.max(1, Math.ceil(whole * TREES.chain.left)) : whole;
}
/**
 * The trees one game fells, the first being the one walked up to: with the echo axe worn, as many more grown trees
 * of the axe's own reach as stand near the first, the nearest first (a tie: the lower number). The ancient tree is
 * felled by itself and never among others.
 */
export function groupOf(purse: Purse, grove: Grove, first: Standing, axe: Stack, now: number, wood: readonly Standing[] = WOOD, me?: string): Standing[] {
  if (first.elder || !works(purse, "charmEchoAxe")) return [first];
  // (never a tree somebody else's go holds)
  const more = wood.filter((t) => t.id !== first.id && !t.elder && !bites(axe, t) && apart(t, first) <= TREES.echo.reach && isGrown(grove, t, now) && !heldBy(grove, t.id, now, me))
    .sort((a, b) => apart(a, first) - apart(b, first) || a.id - b.id);
  return [first, ...more.slice(0, TREES.echo.trees - 1)];
}
/** The fine timber a tree gives at the most: one for each number of its girth's (the ancient tree's is its own). */
export const mostTimber = (t: Pick<Standing, "id" | "tier" | "elder">): number => (t.elder ? TREES.elder.timber : bearsOf(t).length);
/**
 * The most a go at these trees can bring home: what the bag has to have room for before the axe is swung (where the
 * axe's scent may turn up one of two things, room for either of them a tree).
 */
export function mostOf(axe: Stack, trees: readonly Standing[]): Array<[ItemId, number]> {
  let logs = 0, timber = 0, resin = 0, scent = 0;
  const twice = has(axe, "axDouble") ? optN("axDouble", "by") : 1, elder = has(axe, "axElder") ? optN("axElder", "by") : 1;
  for (const t of trees) {
    if (t.elder) { timber += Math.ceil(TREES.elder.timber * elder); resin += Math.ceil(TREES.elder.resin * elder); continue; }
    logs += (TREES.logs + (gemBy(axe, "dark", GEM_FX.dark.axe.log) > 0 ? 1 : 0) + (has(axe, "axDust") ? optN("axDust", "more") : 0)) * twice;
    timber += mostTimber(t) * twice;
    if (has(axe, "axResin")) scent++;
  }
  const out: Array<[ItemId, number]> = [["log", logs], ["timber", timber], ...TREES.scent.map((id): [ItemId, number] => [id, scent + (id === "resin" ? resin : 0)])];
  if (!TREES.scent.includes("resin")) out.push(["resin", resin]);
  return out.filter(([, n]) => n > 0);
}
const hasRoom = (purse: Purse, axe: Stack, trees: readonly Standing[]): boolean => !!bringHome(purse, mostOf(axe, trees));
/**
 * The trunk a game is played on, of the trees it fells: the hardest of them (the most chops with this axe; of two
 * alike, the stouter). One game is one trunk, whatever comes down with it.
 */
function trunkOf(axe: Stack, grove: Grove, trees: readonly Standing[]): { t: Standing; chops: number } {
  return trees.map((t) => ({ t, chops: chopsFor(axe, t, grove.half.includes(t.id)) })).sort((a, b) => b.chops - a.chops || girthOf(b.t) - girthOf(a.t))[0];
}

/** What a tree walked up to comes to before the game: the trees it is played for, and the game to play (lib/town/felling makes it from `ask`). */
export interface Begun { trees: number[]; ask: FellingAsk; elder: boolean }
/**
 * Walk up to a tree with an axe in the hand: whether it can be felled now, and the game that fells it. `seed`: a
 * number of chance, from which the trunk is made. Refused: no axe in the hand; too far; an axe that will not bite;
 * the ancient tree to an axe that is not at the top; **a tree somebody else's go holds** (`me`: whose go this would
 * be; their own never refuses them); a tree that is not grown; a bag with no room for what it may give.
 * (Whoever keeps the game writes the go down as open, with `opened`, when a board is put up for it.)
 */
export function begin(purse: Purse, grove: Grove, id: number, at: readonly [number, number], now: number, seed: number, wood: readonly Standing[] = WOOD, me?: string): ({ ok: true } & Begun) | No {
  const t = treeOf(id, wood), axe = axeOf(purse);
  if (!t) return no("none");
  if (!axe) return no("tool");
  if (farFrom(t, at) > TREES.reach) return no("far");
  const refused = bites(axe, t);
  if (refused) return no(refused);
  if (heldBy(grove, t.id, now, me)) return no("held");
  if (!isGrown(grove, t, now)) return no("stump");
  const trees = groupOf(purse, grove, t, axe, now, wood, me);
  if (!hasRoom(purse, axe, trees)) return no("full");
  const trunk = trunkOf(axe, grove, trees), knobs = girthKnobs(trunk.t), spent = isSpent(purse, now);
  return {
    ok: true, trees: trees.map((x) => x.id), elder: !!t.elder,
    ask: {
      trees: trees.map((x): FellTree => ({ id: x.id, girth: girthOf(x), timber: [...bearsOf(x)] })),
      chops: trunk.chops, seed: (Math.imul(seed | 0, 31) + Math.imul(t.id + 1, 7919)) | 0, girth: girthOf(trunk.t), family: knobs.family,
      ahead: axeAhead(axe), pace: axeBarPace(axe) * (spent ? knobs.spent : knobs.pace),
      spared: gemBy(axe, "water", GEM_FX.water.axe.spared) + (works(purse, "famWoodpecker") ? TREES.pecks : 0),
      spent,
    },
  };
}
/** A board is put up for a go: its trees are held for its owner from now, for as long as a go is held (one go a member: an older one is forgotten). */
export function opened(grove: Grove, me: string, trees: readonly number[], now: number): Grove {
  return { ...grove, goes: { ...(grove.goes ?? {}), [me]: { trees: [...trees], at: now } } };
}
/**
 * A friend braces the trunk of somebody's open go, from the tile they stand on: whoever it is stands near its first
 * tree, is not the feller, and nobody braces it yet. It is written on the go, and paid when the go is over.
 */
export function braceGo(grove: Grove, me: string, feller: string, at: readonly [number, number], now: number, wood: readonly Standing[] = WOOD): { ok: true; grove: Grove; tree: number } | No {
  const go = grove.goes?.[feller];
  if (me === feller || !goHolds(go, now)) return no("none");
  const t = treeOf(go.trees[0], wood);
  if (!t) return no("none");
  if (farFrom(t, at) > TREES.brace.reach) return no("far");
  if (go.braced) return no("none");
  return { ok: true, tree: t.id, grove: { ...grove, goes: { ...grove.goes, [feller]: { ...go, braced: me } } } };
}
/** What a friend who braced a trunk has for it, into their own bag: so many logs, where there is room (and nothing lost where there is none). */
export function bracePay<P extends Purse>(purse: P): { purse: P; got: Array<[ItemId, number]> } {
  const home = bringHome(purse, [["log", TREES.brace.logs]]);
  return home ? { purse: home, got: [["log", TREES.brace.logs]] } : { purse, got: [] };
}

/* ── a go, brought home ─────────────────────────────────────────────────── */

/**
 * How a go went, as the page played it: the tree walked up to; whether the trunk was cut through, and with how many
 * misses; the seconds played by hand. (`plain`: the plain way that was, the tree felled at once with no board; a go
 * that says so is refused.) And what
 * was asked of the axe's counted powers (`one`: the tree to fall at one chop, with no game; `twice`: twice the wood).
 */
export interface FellWent { tree: number; through?: boolean; misses?: number; secs: number; plain?: boolean; one?: boolean; twice?: boolean }
/**
 * The numbers of chance a go may need, each from 0 to 1, a set a tree: whether the axe's dark turns up a log more,
 * whether its scent turns something up and what, whether its lightning half cuts a neighbour, and whether the tree
 * lets a keepsake fall and which (none, where the last two are not given).
 */
export interface FellLuck { dark: number; scent: number; which: number; chain: number; keep?: number; kind?: number }
/**
 * One tree that fell: its number, kind and girth; the misses it fell with; what it gave; the fine timber among that
 * and the most it could have given; the neighbour its fall left half cut, if any; and the keepsake it let fall.
 */
export interface FellOne { id: number; kind: string; girth: Girth; misses: number; got: Array<[ItemId, number]>; timber: number; most: number; chained: number | null; free: boolean; twice: boolean; keepsake?: KeepsakeId }
/**
 * What a go came to: the purse and the grove after it; every tree that fell; all it brought home; whether it was the
 * one chop of the axe's own (`plain`: the way that was; never true now); whether the trunk was cut through; whether the tree stands after all
 * (a go that was lost: `stood`, with nothing felled and nothing spent); the keepsakes found, each with whether nobody had found one before; and
 * who braced the trunk, to be paid for it.
 */
export interface Fell {
  purse: Purse; grove: Grove; felled: FellOne[]; got: Array<[ItemId, number]>; one: boolean; plain: boolean; through: boolean; stood: boolean;
  found: Array<{ id: KeepsakeId; first: boolean }>; braced: string | null;
}

/** The fine timber a tree of a girth gives, cut through with so many misses (the plain girth's, where none is named). */
export const timberFor = (misses: number, girth: Girth = 2): number => timberOf(TREES.girths[girth - 1].timber, Math.max(0, misses));
/** Things, summed: each kind once, in the order it first came. */
function summed(all: Array<Array<[ItemId, number]>>): Array<[ItemId, number]> {
  const out: Array<[ItemId, number]> = [];
  for (const got of all) for (const [item, n] of got) { const had = out.find((x) => x[0] === item); if (had) had[1] += n; else out.push([item, n]); }
  return out;
}

/**
 * A go at felling, as it is judged by whoever keeps the game. The tree named has to be reached with an axe that
 * bites. A trunk cut through fells every tree of the go: each gives its logs, and its fine timber by the misses; a
 * go that says it was played faster than a hand can chop is no go. A go that was lost fells nothing: the trees
 * stand, nothing is given, no stamina is paid, and the go is over. The plain way that was is refused (`board`).
 *
 * **One go on a tree at a time**: a tree that somebody else's open go holds is refused to everybody else, board,
 * and the axe's one chop alike (`held`), so nobody is robbed mid-go and no tree pays twice. The trees of
 * a go are those its board was opened for (`opened`) while it holds; of a go whose hold has lapsed, or that was
 * never written down, they are worked out afresh; either way only those still standing are felled and paid. Every
 * tree that falls is a stump for everybody from now; the stamina is paid a tree.
 * `luck`: a set of numbers of chance for each tree, in their order. `who`: the name the book of the pines writes
 * beside what was never found before.
 */
export function fell(purse: Purse, grove: Grove, me: string, went: FellWent, at: readonly [number, number], now: number, luck: readonly FellLuck[], wood: readonly Standing[] = WOOD, who: string = me): ({ ok: true } & Fell) | No {
  const first = treeOf(went.tree, wood), axe = axeOf(purse);
  if (!first) return no("none");
  if (!axe) return no("tool");
  if (farFrom(first, at) > TREES.reach) return no("far");
  const refused = bites(axe, first);
  if (refused) return no(refused);
  // (somebody else is at it: their go holds the tree)
  if (heldBy(grove, first.id, now, me)) return no("held");
  let mine = purse;
  const one = !!went.one, plain = !one && !!went.plain, board = !one && !plain;
  // (there is no plain way any more: a tree is felled at its board)
  if (plain) return no("board");
  // the axe's one chop: the tree walked up to and nothing else, there and then (never the ancient tree)
  if (!board) {
    if (first.elder) return no("none");
    if (!isGrown(grove, first, now)) return no("stump");
  }
  if (one) {
    const used = usePower(mine, axe, "axOne", now);
    if (!used.ok) return no(used.why);
    mine = used.purse;
  }
  // the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  const go = grove.goes?.[me], held = board && goHolds(go, now) && go.trees[0] === first.id ? go : null;
  const trees = (!board ? [first]
    : held ? held.trees.map((id) => treeOf(id, wood)).filter((t): t is Standing => !!t && !bites(axe, t))
    : groupOf(purse, grove, first, axe, now, wood, me)).filter((t) => isGrown(grove, t, now));
  if (!trees.length) return no("stump");
  const through = !board || !!went.through, misses = board ? Math.max(0, Math.floor(Number(went.misses) || 0)) : 0;
  if (board && through && !(Number(went.secs) + 0.05 >= leastSecs([trunkOf(axe, grove, trees).chops]))) return no("none");
  const goes = { ...(grove.goes ?? {}) };
  if (board) delete goes[me];
  const closed = (g: Grove): Grove => { const { goes: _was, ...rest } = g; return { ...rest, ...(Object.keys(goes).length ? { goes } : {}) }; };
  // a go that was lost: every tree of it stands, and nothing is changed but that the go is over (once the ancient tree's alone)
  if (!through) return { ok: true, purse, grove: closed(grove), felled: [], got: [], one, plain, through, stood: true, found: [], braced: null };

  let down = { ...grove.down }, half = grove.half.slice(), kept = fellingOf(mine);
  const book = { ...(grove.book ?? {}) }, found: Fell["found"] = [];
  const felled: FellOne[] = [];
  trees.forEach((t, i) => {
    const l = luck[i] ?? { dark: 1, scent: 1, which: 1, chain: 1 }, got: Array<[ItemId, number]> = [];
    let twice = false, free = false, timber = 0;
    if (t.elder) {
      const by = has(axe, "axElder") ? optN("axElder", "by") : 1;
      timber = Math.ceil(TREES.elder.timber * by);
      got.push(["timber", timber], ["resin", Math.ceil(TREES.elder.resin * by)]);
    } else {
      let logs = TREES.logs;
      // the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber = one ? mostTimber(t) : plain || !through ? 0 : timberOf(bearsOf(t), misses);
      if (l.dark < gemBy(axe, "dark", GEM_FX.dark.axe.log)) logs++;
      if (has(axe, "axDust")) {
        kept = { ...kept, dust: kept.dust + 1 };
        if (kept.dust >= optN("axDust", "every")) { logs += optN("axDust", "more"); kept = { ...kept, dust: 0 }; }
      }
      // twice the wood, where it was asked for and the axe has a time left for it
      if (went.twice) {
        const used = usePower(mine, axe, "axDouble", now);
        if (used.ok) { mine = used.purse; twice = true; logs *= optN("axDouble", "by"); timber *= optN("axDouble", "by"); }
      }
      got.push(["log", logs]);
      if (timber > 0) got.push(["timber", timber]);
      if (has(axe, "axResin") && l.scent < 1 / optN("axResin", "in")) got.push([TREES.scent[Math.min(TREES.scent.length - 1, Math.floor(l.which * TREES.scent.length))], 1]);
    }
    // the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less the axe's earth (what is left of a point is owed on)
    const fresh = usePower(mine, axe, "axFresh", now);
    if (fresh.ok) { mine = fresh.purse; free = true; }
    else {
      const paid = eased(mine, spend(mine, TREES.cost, now), now, 1 - gemBy(axe, "earth", GEM_FX.earth.axe.stamina), kept.owed);
      mine = paid.purse;
      kept = { ...kept, owed: paid.owed };
    }
    down[t.id] = { at: now, by: me };
    half = half.filter((id) => id !== t.id);
    // the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    let chained: number | null = null;
    if (!t.elder && l.chain < gemBy(axe, "lightning", GEM_FX.lightning.axe.chain)) {
      const near = wood.filter((o) => !o.elder && o.id !== t.id && !bites(axe, o) && !half.includes(o.id) && !down[o.id] && apart(o, t) <= TREES.chain.reach && !trees.some((f) => f.id === o.id))
        .sort((a, b) => apart(a, t) - apart(b, t) || a.id - b.id)[0];
      if (near) { half.push(near.id); chained = near.id; }
    }
    // what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    const keepsake = keepsakeFor(t, l.keep ?? 1, l.kind ?? 1);
    if (keepsake) {
      kept = { ...kept, keeps: { ...kept.keeps, [keepsake]: (kept.keeps[keepsake] ?? 0) + 1 } };
      found.push({ id: keepsake, first: !book[keepsake] });
      book[keepsake] ??= { by: who, at: now };
    }
    felled.push({ id: t.id, kind: kindOf(t), girth: girthOf(t), misses, got, timber, most: mostTimber(t), chained, free, twice, ...(keepsake ? { keepsake } : {}) });
  });
  const got = summed(felled.map((f) => f.got)), home = bringHome(mine, got);
  if (!home) return no("full");
  // (what has grown again is forgotten as the grove is written)
  for (const id of Object.keys(down)) { const t = treeOf(Number(id), wood); if (!t || now >= grownAt(t, down[id].at)) delete down[id]; }
  const after: Grove = { ...closed(grove), down, half, ...(Object.keys(book).length ? { book } : {}) };
  return { ok: true, purse: { ...home, felling: keptOut(kept) }, grove: after, felled, got, one, plain, through, stood: false, found, braced: board && held?.braced && held.braced !== me ? held.braced : null };
}

/**
 * The quickening root: a stump just made by me grows back at once, for everybody. Never the ancient tree's. Counted
 * by the day, by the axe in the hand.
 */
export function rootBack(purse: Purse, grove: Grove, me: string, id: number, now: number, wood: readonly Standing[] = WOOD): { ok: true; purse: Purse; grove: Grove; left: number } | No {
  const t = treeOf(id, wood), f = grove.down[id], axe = axeOf(purse);
  if (!t || t.elder) return no("none");
  if (!axe) return no("tool");
  if (!f || f.by !== me || now - f.at > TREES.root.within * 1000 || now >= grownAt(t, f.at)) return no("none");
  const used = usePower(purse, axe, "axRoot", now);
  if (!used.ok) return no(used.why);
  const down = { ...grove.down };
  delete down[id];
  return { ok: true, purse: used.purse, grove: { ...grove, down }, left: used.left };
}
/** The stump the quickening root may bring back for me now, if there is one: the last tree I felled, while it is just made. */
export function rootable(purse: Purse, grove: Grove, me: string, now: number, wood: readonly Standing[] = WOOD): number | null {
  const axe = axeOf(purse);
  if (!axe || !mayPower(purse, axe, "axRoot", now)) return null;
  const mine = Object.entries(grove.down).filter(([id, f]) => { const t = treeOf(Number(id), wood); return !!t && !t.elder && f.by === me && now - f.at <= TREES.root.within * 1000; }).sort((a, b) => b[1].at - a[1].at)[0];
  return mine ? Number(mine[0]) : null;
}

/**
 * The catalog's row: what the database needs of the trees to keep them and to judge a go. Every knob; the least a
 * chop takes, and what tired hands and a brace change; the axe as the game reads it (what each plus is, each option
 * of the axe's with its pool, its numbers and its count, what each gem does: lib/town/tools' own numbers, copied here
 * so that the trees' rules in the database stand on no other part); the keepsakes, each with its weight and whether
 * only a stout tree has it; and every tree there is, as [number, x, y, tier, tiles across, girth].
 * (The trees are the mountain's, which the world lays out only in `next dev`: left to `WOOD`, the row has no tree in
 * it anywhere else. The catalog hands in the trees as they are laid, wherever it is asked: lib/town/far-side.)
 */
export const treesRow = (wood: readonly Standing[] = WOOD) => ({
  regrow: TREES.regrow, cost: TREES.cost, reach: TREES.reach, axeTier: TREES.axeTier, logs: TREES.logs, girths: TREES.girths, girthSeed: TREES.girthSeed, girthAbove: TREES.girthAbove,
  elderChops: TREES.elderChops, elderPace: TREES.elderPace, elderSpent: TREES.elderSpent, elderFamily: TREES.elderFamily, elder: TREES.elder, kinds: TREES.kinds, elderKind: TREES.elderKind, scent: TREES.scent,
  echo: TREES.echo, chain: TREES.chain, pecks: TREES.pecks, root: TREES.root, go: TREES.go, brace: TREES.brace, keepsake: TREES.keepsake,
  quickest: FELLING.quickest, tired: FELLING.tired, braced: FELLING.brace,
  keepsakes: Object.fromEntries(KEEPSAKE_IDS.map((id) => [id, { weight: KEEPSAKES[id].weight, stout: !!(KEEPSAKES[id] as Keepsake).stout }])),
  axe: {
    top: FORGE.top, milestones: FORGE.milestones, pools: FORGE.pools, sockets: FORGE.sockets, gemAtTop: FORGE.gemAtTop, gemLevels: GEM_LEVELS, cap: FORGE.cap,
    chops: LEVELS.axe.chops, ahead: LEVELS.axe.ahead, slow: LEVELS.axe.slow, elements: ELEMENTS,
    opts: Object.fromEntries(OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly string[]).includes("axe")).map((id) => {
      const o = OPTIONS[id] as { pool: number; n: Readonly<Record<string, number>>; use?: OptionUse };
      return [id, { pool: o.pool, n: o.n, ...(o.use ? { use: o.use } : {}) }];
    })),
    gems: Object.fromEntries(ELEMENTS.map((e) => [e, GEM_FX[e].axe])),
  },
  wood: wood.map((t) => [t.id, t.x, t.y, t.tier, t.size ?? 1, girthOf(t)]),
});
