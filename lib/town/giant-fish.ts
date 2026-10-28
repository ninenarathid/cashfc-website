import type { BandId } from "./bands";
import { hoursOf, inHours } from "./band-species";
import type { BaitId, Item } from "./items";
import type { FishingHabitat } from "./river-items";

/**
 * **A giant fish, landed only with a friend** (the owner, 2026-10-27: members said fishing was "not fun, not rich"; to
 * the plan both AIs made: "1 ต้องมีเพื่อนเท่านั้น ต้องมีเฟสให้พิมพ์บอกเพื่อนในเกมได้ด้วย 2 ขายได้ 3 เอาตามที่แนะนำ").
 *
 * - **The hook.** On a cast of the right bait in a giant's water and hours, what would have come up as no fish (the
 *   hyacinth, the boot, the driftwood, the bottle) is a giant at `GIANT.chance` of the cast, never a fish's own chance;
 *   one an angler at most each `GIANT.every`.
 * - **The hold.** Struck, the line is tied to the post: `GIANT.hold` for somebody to come and net it. The angler may
 *   type a call to the town (`GIANT.callLen` letters, `GIANT.calls` a giant, `GIANT.callGap` apart): it goes out as the
 *   town's news with a chip that shows the way. Alone it cannot be landed; nobody in time, and it is gone.
 * - **The fight.** A netter joins at the post and the fight starts on the database's clock: `GIANT.fight` to net it
 *   `GIANT.scoops` times. The angler steers the fish past the rocks with the rod tip; the line rubbing on a rock frays,
 *   and at the `GIANT.frays`th it breaks. Every run of the fish is shown `GIANT.cue` before it comes. Tired, the
 *   angler's steering is `GIANT.tired` of itself (the owner's rule for every game: tired play stays possible).
 * - **What comes of it.** A giant steak each (`giantSteak`, one market kind for all twenty, lib/town/market's band), and
 *   the giant's length and weight with both names in the village's book of fish (lib/town/fish-book).
 *
 * The rules of the hook, the hold and the fight's count are here and in their database twin (v309's
 * `public.town_giant_fish`); the fight itself is played on the two pages (`stepFight`), each judging its own part.
 */
export const GIANT = {
  /** Of an eligible cast, taken only from what is no fish. */
  chance: 0.02,
  /** One giant an angler at most so often. */
  every: 20 * 60_000,
  /** The hold: ten minutes (the owner, 2026-10-28, to Codex's play run: a dawn netter came in time about half the time in four). */
  hold: 600_000,
  fight: 90_000,
  scoops: 3,
  frays: 3,
  /** How long before a run of the fish it is shown. */
  cue: 1_200,
  /** The angler's steering, tired. */
  tired: 0.8,
  calls: 3,
  callGap: 60_000,
  callLen: 120,
  /** Scoops are this far apart at the least, and the first this long after the start (the fish must be brought in). */
  scoopGap: 6_000,
  /** Frays this far apart at the least (one rub on a rock is one fray). */
  frayGap: 2_000,
  /** How late a report is taken after the fight's time is up. */
  grace: 5_000,
  /** How near the post a netter must stand to join, in tiles. */
  reach: 6,
  /** How long a landed or lost giant is still shown (and its steak may be claimed by a page that missed the end). */
  after: 10 * 60_000,
} as const;

export type GiantShadow = "carp" | "cat" | "long" | "eel";
interface GiantRow {
  id: string; th: string; en: string; water: FishingHabitat; bands: BandId[]; rare?: boolean;
  /** Length in cm, and how heavy for its length (kg at a metre). */
  size: [number, number]; k: number; shadow: GiantShadow; look: [string, string];
}
const G = <const T extends string>(r: Omit<GiantRow, "id"> & { id: T }) => r;
/** Four twelve-hour windows and the rare one before dawn, the same in every water. */
const DAY: BandId[] = ["lateMorning", "midday", "afternoon", "evening"];
const NOON: BandId[] = ["midday", "afternoon", "evening", "night"];
const NIGHT: BandId[] = ["night", "lateNight", "beforeDawn", "earlyMorning"];
const DARK: BandId[] = ["lateNight", "beforeDawn", "earlyMorning", "lateMorning"];
const DAWN: BandId[] = ["beforeDawn", "earlyMorning"];
/** The twenty, five a water. */
export const GIANT_ROWS = [
  G({ id: "sailbackCarp", th: "ปลาไนหลังใบเรือ", en: "Sailback carp", water: "town", bands: DAY, size: [120, 165], k: 18, shadow: "carp", look: ["ปลาไนสีทองบรอนซ์ตัวมหึมา ครีบหลังสูงเหมือนใบเรือยาวตลอดหลัง", "A huge bronze-gold carp with a tall sail of a fin the length of its back"] }),
  G({ id: "bronzeBuffalo", th: "ปลาหลังโหนกทองแดง", en: "Bronze buffalo", water: "town", bands: NOON, size: [110, 150], k: 22, shadow: "carp", look: ["ปลาลำตัวลึกสีบรอนซ์เข้ม หลังโหนกสูง ปากเล็กอยู่ต่ำ", "A deep-bodied dark bronze fish with a high humped back and a small low mouth"] }),
  G({ id: "lanternCatfish", th: "ปลาบึกโคมไฟ", en: "Lantern catfish", water: "town", bands: NIGHT, size: [160, 230], k: 11, shadow: "cat", look: ["ปลาบึกสีเทาหินชนวน หนวดยาวสี่เส้น จุดเหลืองนวลเรียงข้างตัวเหมือนโคม", "A slate-grey catfish with four long whiskers and pale yellow spots along its side like lanterns"] }),
  G({ id: "palePaddlefish", th: "ปลาจมูกพายสีซีด", en: "Pale paddlefish", water: "town", bands: DARK, size: [150, 210], k: 8, shadow: "long", look: ["ปลาสีเทาซีดตัวยาว จมูกแบนเหมือนใบพายยาวเท่าหัว", "A long pale grey fish with a flat paddle of a snout as long as its head"] }),
  G({ id: "glasswakeCarp", th: "ปลาไนเกล็ดแก้ว", en: "Glasswake carp", water: "town", bands: DAWN, rare: true, size: [130, 175], k: 18, shadow: "carp", look: ["ปลาไนตัวใหญ่ เกล็ดขาวฟ้าเหมือนน้ำแข็ง ขอบเกล็ดขาว ครีบยาวสีซีด", "A big carp with frosty white and ice-blue scales edged white, its fins long and pale"] }),
  G({ id: "reedbackBarbel", th: "ปลาบาร์เบลหลังกก", en: "Reedback barbel", water: "creek", bands: DAY, size: [100, 140], k: 12, shadow: "long", look: ["ปลาบาร์เบลสีเขียวมะกอก ลายเข้มบนหลังเหมือนต้นกก หนวดสี่เส้น", "An olive-green barbel striped dark down its back like reeds, with four whiskers"] }),
  G({ id: "copperLongfin", th: "ปลาครีบยาวทองแดง", en: "Copper longfin", water: "creek", bands: NOON, size: [90, 130], k: 14, shadow: "carp", look: ["ปลาสีส้มทองแดง ครีบยาวลากไปไกลกว่าหางเหมือนริบบิ้น", "A copper-orange fish whose long fins stream past its tail like ribbons"] }),
  G({ id: "rootjawCatfish", th: "ปลาดุกกรามราก", en: "Rootjaw catfish", water: "creek", bands: NIGHT, size: [140, 200], k: 11, shadow: "cat", look: ["ปลาดุกลายด่างสีน้ำตาล กรามล่างยื่นใหญ่ หนวดหนาบิดเหมือนรากไม้", "A mottled brown catfish with a big jutting jaw and whiskers twisting like roots"] }),
  G({ id: "ribbonEel", th: "ปลาไหลริบบิ้น", en: "Ribbon eel", water: "creek", bands: DARK, size: [160, 230], k: 2.5, shadow: "eel", look: ["ปลาไหลยาวเรียวสีเขียวเข้ม มีแถบเหลืองสดจากหัวถึงหาง", "A long thin dark green eel with one bright yellow stripe from head to tail"] }),
  G({ id: "mistveilBarbel", th: "ปลาบาร์เบลม่านหมอก", en: "Mistveil barbel", water: "creek", bands: DAWN, rare: true, size: [110, 150], k: 12, shadow: "long", look: ["ปลาบาร์เบลสีเทาเงิน ครีบยาวสีเทาอ่อนพลิ้วเหมือนม่านหมอก", "A silver-grey barbel with long pale veils of fins"] }),
  G({ id: "graniteMahseer", th: "ปลาเวียนหินแกรนิต", en: "Granite mahseer", water: "headwater", bands: DAY, size: [120, 170], k: 13, shadow: "carp", look: ["ปลาเวียนตัวหนา เกล็ดใหญ่สีเทาลายจุดเหมือนหินแกรนิต ครีบสีทอง", "A thick mahseer of big granite-speckled grey scales, its fins warm gold"] }),
  G({ id: "torrentSalmon", th: "ปลาแซลมอนธารเชี่ยว", en: "Torrent salmon", water: "headwater", bands: NOON, size: [110, 150], k: 12, shadow: "long", look: ["ปลาแซลมอนสีแดงตัวทรงพลัง หัวสีเขียวเข้ม กรามล่างงอเป็นตะขอ", "A powerful red salmon with a dark green head and a hooked lower jaw"] }),
  G({ id: "slateSturgeon", th: "ปลาสเตอร์เจียนหินชนวน", en: "Slate sturgeon", water: "headwater", bands: NIGHT, size: [180, 260], k: 8, shadow: "long", look: ["ปลาสเตอร์เจียนสีน้ำเงินหินชนวน แผ่นกระดูกสีซีดเรียงข้างตัว จมูกแหลม", "A slate-blue sturgeon with pale bony plates along its side and a pointed snout"] }),
  G({ id: "snowfinTaimen", th: "ปลาไทเมนครีบหิมะ", en: "Snowfin taimen", water: "headwater", bands: DARK, size: [140, 200], k: 10, shadow: "long", look: ["ปลาไทเมนสีน้ำตาลแดงตัวยาว จุดดำบนหลัง ครีบทุกครีบขอบขาว", "A long red-brown taimen with black dots on its back and every fin edged white"] }),
  G({ id: "dawncrestSturgeon", th: "ปลาสเตอร์เจียนหงอนรุ่งอรุณ", en: "Dawncrest sturgeon", water: "headwater", bands: DAWN, rare: true, size: [190, 270], k: 8, shadow: "long", look: ["ปลาสเตอร์เจียน แผ่นกระดูกบนหลังสีทองอมชมพูเหมือนฟ้ารุ่งอรุณ", "A sturgeon whose back plates are pale gold and pink like the dawn"] }),
  G({ id: "lotusGourami", th: "ปลาแรดดอกบัว", en: "Lotus gourami", water: "pool", bands: DAY, size: [70, 100], k: 26, shadow: "carp", look: ["ปลาแรดตัวกลมแบนสีชมพูครีม ครีบท้องเป็นเส้นยาวสองเส้น", "A round flat pink and cream gourami with two long threads of belly fins"] }),
  G({ id: "mirrorbackPerch", th: "ปลากะพงหลังกระจก", en: "Mirrorback perch", water: "pool", bands: NOON, size: [80, 115], k: 22, shadow: "carp", look: ["ปลากะพงลำตัวลึก แถบเขียวเข้มพาดตัว เกล็ดเงินวาวเรียงบนหลัง", "A deep perch barred dark green, a row of shining silver scales along its back"] }),
  G({ id: "velvetArowana", th: "ปลาอะโรวาน่ากำมะหยี่", en: "Velvet arowana", water: "pool", bands: NIGHT, size: [100, 140], k: 7, shadow: "long", look: ["ปลาอะโรวาน่าสีแดงดำเหมือนกำมะหยี่ เกล็ดใหญ่ คางเชิดมีหนวดสั้นสองเส้น", "A blade of a velvet red and black arowana with big scales and two short whiskers on its upturned chin"] }),
  G({ id: "pearlBichir", th: "ปลาบิเชียร์มุก", en: "Pearl bichir", water: "pool", bands: DARK, size: [90, 130], k: 7, shadow: "eel", look: ["ปลาบิเชียร์สีเทามุกลายจุด ครีบเล็กเรียงบนหลังเหมือนธงจิ๋ว", "A pearl-grey spotted bichir with a row of little flag finlets along its back"] }),
  G({ id: "moonthreadEel", th: "ปลาไหลด้ายจันทร์", en: "Moonthread eel", water: "pool", bands: DAWN, rare: true, size: [150, 210], k: 2.5, shadow: "eel", look: ["ปลาไหลสีขาวเงินตัวยาว ครีบเส้นบางตลอดหลัง มีรอยเสี้ยวจันทร์จางๆ", "A long silver-white eel with a thin fin along its back and pale crescent marks"] }),
] as const;
export type GiantId = (typeof GIANT_ROWS)[number]["id"];
export type Giant = GiantRow & { id: GiantId; hours: Array<[number, number]> };
export const GIANTS = Object.fromEntries((GIANT_ROWS as readonly GiantRow[]).map((r) => [r.id, { ...r, hours: hoursOf(r.bands) }])) as Record<GiantId, Giant>;
export const GIANT_IDS = GIANT_ROWS.map((r) => r.id) as GiantId[];
/** What a giant gives each of the two who landed it: one kind for all twenty, sold to the uncle in a band of its own (lib/town/market's `fixed`). */
export const GIANT_ITEMS = {
  giantSteak: { kind: "catch", tier: 3, name: { th: "สเต๊กปลายักษ์", en: "Giant fish steak" }, about: { th: "ชิ้นเนื้อปลาหนาสีชมพูอ่อน ตัดขวางจากปลายักษ์ ขอบหนังสีเงิน", en: "A thick pink steak cut across a giant fish, ringed with silver skin" }, stack: 10, pays: 120 },
} satisfies Record<string, Item>;
/** Each water's bait (lib/town/items' BAIT_AS gives what stands for one). */
export const GIANT_BAIT: Record<FishingHabitat, BaitId> = { town: "dough", creek: "worm", headwater: "minnow", pool: "cricket" };
/** How the rare one weighs beside the others out at its hour. */
export const RARE_WEIGHT = 0.5;

/** The giants out in a water at an hour, each with its weight. */
export function giantsOut(water: FishingHabitat, hour: number): Array<{ id: GiantId; w: number }> {
  return (GIANT_IDS.map((id) => GIANTS[id])).filter((g) => g.water === water && inHours(g.hours, hour)).map((g) => ({ id: g.id, w: g.rare ? RARE_WEIGHT : 1 }));
}
/** Which giant (by a roll in [0, 1)), its length and its weight. */
export function giantOf(water: FishingHabitat, hour: number, r1: number, r2: number): { id: GiantId; size: number; weight: number } | null {
  const out = giantsOut(water, hour), all = out.reduce((s, g) => s + g.w, 0);
  if (!all) return null;
  let at = r1 * all, id = out[out.length - 1].id;
  for (const g of out) { if (at < g.w) { id = g.id; break; } at -= g.w; }
  const g = GIANTS[id], size = Math.round(g.size[0] + (g.size[1] - g.size[0]) * r2);
  return { id, size, weight: Math.round(g.k * (size / 100) ** 3 * 10) / 10 };
}
/**
 * Whether a cast may hook a giant: its own bait (or what stands for it) in a giant's water, a line of its own (not a
 * stardust bait), and none hooked by this angler within `GIANT.every`; and what share of the cast is what is no fish
 * (`junk`), of which the giant's `GIANT.chance` is taken. The share of a giant on such a cast's no-fish is chance/junk.
 */
export function giantChance(bait: BaitId, water: FishingHabitat, hour: number, junk: number, lastGiant: number | null, now: number, star = false): number {
  if (star || bait !== GIANT_BAIT[water] || junk < GIANT.chance || !giantsOut(water, hour).length) return 0;
  if (lastGiant != null && now - lastGiant < GIANT.every) return 0;
  return GIANT.chance / junk;
}

/* ── the hook, the hold and the fight's count ─────────────────────────────── */

export type GiantEnd = "" | "landed" | "lost" | "broke" | "freed";
/** One giant on a line, from the strike: the database's milliseconds throughout. */
export interface GiantHook {
  id: string;
  giant: GiantId; size: number; weight: number;
  by: string; byName: string;
  /** Where the angler stands (the post), and its water. */
  tile: [number, number]; water: FishingHabitat;
  at: number;
  netter: string | null; netterName: string | null;
  go: number;
  scoops: number[]; frays: number[]; calls: number[];
  end: number; how: GiantEnd;
  /** Who has had their steak. */
  claimed: string[];
  seed: number;
}
export type GiantAction = "call" | "join" | "scoop" | "fray" | "free" | "claim" | "look";
export type GiantRefusal = "none" | "gone" | "theirs" | "taken" | "far" | "self" | "late" | "soon" | "many" | "long" | "empty" | "full";
export type GiantDid = { ok: true; hook: GiantHook; steak?: boolean } | { ok: false; why: GiantRefusal };

export const holding = (h: GiantHook | null, now: number) => !!h && !h.how && h.go === 0 && now < h.at + GIANT.hold;
export const fighting = (h: GiantHook | null, now: number) => !!h && !h.how && h.go > 0 && now <= h.go + GIANT.fight + GIANT.grace;
/** The end a hook has come to by the clock, though nobody has said so yet (the hold run out, the fight's time up). */
export function settled(h: GiantHook, now: number): GiantHook {
  if (h.how) return h;
  if (h.go === 0 && now >= h.at + GIANT.hold) return { ...h, how: "lost", end: h.at + GIANT.hold };
  if (h.go > 0 && now > h.go + GIANT.fight + GIANT.grace) return { ...h, how: "lost", end: h.go + GIANT.fight };
  return h;
}
/** A call's words as they go out: one line, trimmed, never empty, never longer than `GIANT.callLen`. */
export const callWords = (text: unknown): string | null => {
  if (typeof text !== "string") return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t && [...t].length <= GIANT.callLen ? t : null;
};
/**
 * One deed of a giant by `me` (named `myName`, standing at `at`), at the database's `now`: the hook comes back as it
 * should be kept; `steak` when this deed gave me mine. Calls, joins and scoops are bounded by the clock; a page's
 * own judging of the fight is trusted only that far (two accounts cannot prove two people).
 */
export function giantFish(action: GiantAction, hook: GiantHook | null, me: string, myName: string, now: number, opts: { at?: [number, number]; text?: unknown; bagFull?: boolean } = {}): GiantDid {
  if (!hook) return { ok: false, why: "none" };
  const h = settled(hook, now);
  const keep = (next: GiantHook, steak?: boolean): GiantDid => ({ ok: true, hook: next, ...(steak ? { steak } : {}) });
  if (action === "look") return keep(h);
  if (action === "claim") {
    if (h.how !== "landed") return { ok: false, why: "gone" };
    if (me !== h.by && me !== h.netter) return { ok: false, why: "theirs" };
    if (h.claimed.includes(me)) return { ok: false, why: "taken" };
    if (opts.bagFull) return { ok: false, why: "full" };
    return keep({ ...h, claimed: [...h.claimed, me] }, true);
  }
  if (h.how) return { ok: false, why: "gone" };
  if (action === "call") {
    if (me !== h.by) return { ok: false, why: "theirs" };
    if (h.go > 0) return { ok: false, why: "late" };
    if (h.calls.length >= GIANT.calls) return { ok: false, why: "many" };
    if (h.calls.length && now - h.calls[h.calls.length - 1] < GIANT.callGap) return { ok: false, why: "soon" };
    if (callWords(opts.text) == null) return { ok: false, why: typeof opts.text === "string" && opts.text.trim() ? "long" : "empty" };
    return keep({ ...h, calls: [...h.calls, now] });
  }
  if (action === "free") {
    if (me !== h.by) return { ok: false, why: "theirs" };
    return keep({ ...h, how: "freed", end: now });
  }
  if (action === "join") {
    if (me === h.by) return { ok: false, why: "self" };
    if (h.go > 0) return { ok: false, why: "taken" };
    const at = opts.at;
    if (!at || Math.max(Math.abs(at[0] - h.tile[0]), Math.abs(at[1] - h.tile[1])) > GIANT.reach) return { ok: false, why: "far" };
    return keep({ ...h, netter: me, netterName: myName, go: now });
  }
  if (h.go === 0) return { ok: false, why: "soon" };
  if (action === "scoop") {
    if (me !== h.netter) return { ok: false, why: "theirs" };
    const last = h.scoops.length ? h.scoops[h.scoops.length - 1] : h.go;
    if (now - last < GIANT.scoopGap) return { ok: false, why: "soon" };
    const scoops = [...h.scoops, now];
    return keep(scoops.length >= GIANT.scoops ? { ...h, scoops, how: "landed", end: now } : { ...h, scoops });
  }
  // fray: the angler's line rubbed on a rock
  if (me !== h.by) return { ok: false, why: "theirs" };
  if (h.frays.length && now - h.frays[h.frays.length - 1] < GIANT.frayGap) return { ok: false, why: "soon" };
  const frays = [...h.frays, now];
  return keep(frays.length >= GIANT.frays ? { ...h, frays, how: "broke", end: now } : { ...h, frays });
}
