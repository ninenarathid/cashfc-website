import { LINE_IDS, rankOf, type LineId } from "./lines";
import { dayOf, eased, mealOf } from "./stamina";
import type { Purse } from "./trade";

/**
 * What a rank of a line of work gives (the owner, 2026-10-06: "อยากทำให้มี progression และ ฉายา ได้ไอเทม เหมือนกับที่
 * ขนน้ำทำได้ด้วย"), and what somebody wears of it. Pure: no clock, no chance, no network.
 *
 * His rulings, of that day:
 * - a gift is **bound to whoever earned it** and is in no slot of the bag ("ผูกกับตัวทั้งหมด ไม่นับรวมใน ช่องเก็บของ");
 *   the well's yoke, cart and great yoke are the exception, things of the bag that are lent already, and stay the
 *   well's own book's to give (lib/town/well);
 * - **two charms at a time** ("ช่องเครื่องราง 2 ช่อง"), one familiar (none is built yet), changed as often as one
 *   likes ("อิสระ"). Twelve charms and two places: one chooses by what one is about to do;
 * - nothing says what a rank will give until it is reached: the page shows a gift only once it can be taken.
 *
 * The first round is the first rank of every line: six charms (the well's first is its yoke). The forest's was a
 * vine basket that made its games kinder until he asked for a light in its place (the basket's picture is still in
 * the icons' sheet, used by nothing). What each does is a
 * number of this file (`CHARMS`); where it is the database that judges (the strike's moment, the stamina of work in
 * somebody else's bed) the same number is in the catalog's row and the rule is written again there (v151).
 * **Every number here is mine, not the owner's.**
 */
export const CHARM_IDS = ["charmApron", "charmGloves", "charmFloat", "charmLamp", "charmNet", "charmHoe"] as const;
export type CharmId = (typeof CHARM_IDS)[number];
/**
 * The familiars: a creature that follows its member wherever they go, for everybody to see (the owner, 2026-10-06:
 * "ใส่ ภูติ หรือ สัตว์เดินตามได้ 1 ชนิด"; changed "อิสระ"). One at a time. It needs no hand: the hand stays free.
 */
export const FAMILIAR_IDS = ["famSquirrel", "famButterfly", "famGnome"] as const;
export type FamiliarId = (typeof FAMILIAR_IDS)[number];
export type GiftId = CharmId | FamiliarId;
export type GiftKind = "charm" | "familiar";

export interface Gift { id: GiftId; kind: GiftKind; line: LineId; rank: number; name: { th: string; en: string }; does: { th: string; en: string } }

export const GIFTS: readonly Gift[] = [
  { id: "charmApron", kind: "charm", line: "kitchen", rank: 1, name: { th: "ผ้ากันเปื้อนต้องมนตร์", en: "Enchanted apron" },
    does: { th: "ตอนคนหม้อและย่างไฟ จังหวะกว้างขึ้นครึ่งเท่า", en: "Stirring and roasting are half as forgiving again" } },
  { id: "charmGloves", kind: "charm", line: "helpers", rank: 1, name: { th: "ถุงมือชาวสวนต้องมนตร์", en: "Enchanted gardener's gloves" },
    does: { th: "งานในแปลงของคนอื่นใช้แรงครึ่งเดียว", en: "Work in somebody else's bed takes half the stamina" } },
  { id: "charmFloat", kind: "charm", line: "fishing", rank: 1, name: { th: "ทุ่นกระซิบ", en: "Whispering float" },
    does: { th: "ช่วงตวัดเบ็ดยาวขึ้นครึ่งเท่า", en: "The moment to strike is half as long again" } },
  { id: "charmLamp", kind: "charm", line: "forest", rank: 1, name: { th: "ตะเกียงผู้เดินป่า", en: "Forest walker's lamp" },
    does: { th: "ในป่าตอนมืด รอบตัวเราสว่างขึ้น และของที่เก็บได้ในวงแสงมีประกาย (เห็นเฉพาะจอเรา)", en: "In the forest's dark, a light about you, and what can be gathered in it glints (on your own screen)" } },
  { id: "charmNet", kind: "charm", line: "insects", rank: 1, name: { th: "สวิงใยเงิน", en: "Silver-web net" },
    does: { th: "วงสวิงกว้างขึ้นครึ่งเท่า", en: "The net's ring is half as wide again" } },
  { id: "charmHoe", kind: "charm", line: "farming", rank: 1, name: { th: "จอบต้องมนตร์", en: "Enchanted hoe" },
    does: { th: "ถอนหญ้าและพรวนดิน จังหวะกว้างขึ้นครึ่งเท่า", en: "Weeding and tilling are half as forgiving again" } },
  // the second rank: the first familiars
  { id: "famSquirrel", kind: "familiar", line: "forest", rank: 2, name: { th: "กระรอกคู่ใจ", en: "A squirrel" },
    does: { th: "ตอนเขย่าต้นไม้ กระรอกช่วยรับลูกไม้ที่เราพลาดให้ ต้นละ 2 ลูก", en: "When a tree is shaken it catches two of the fruit you miss" } },
  { id: "famButterfly", kind: "familiar", line: "insects", rank: 2, name: { th: "ผีเสื้อนำโชค", en: "A lucky butterfly" },
    does: { th: "แมลงตื่นตัวช้าลง เข้าใกล้ได้มากขึ้นก่อนมันหนี", en: "Insects are slower to startle: you come nearer before they flee" } },
  { id: "famGnome", kind: "familiar", line: "farming", rank: 2, name: { th: "โนมสวน", en: "A garden gnome" },
    does: { th: "โนมถอนหญ้าให้เองโดยไม่ต้องเล่นมินิเกม มื้อละ 10 ช่อง", en: "It pulls the weeds for you with no game, ten plots to a meal's hours" } },
];

/**
 * How many charms are worn at once, and what each does: the apron, the net and the hoe widen their games so many
 * times; the float lengthens the strike's moment so many times; the gloves leave so much of the cost of work in
 * somebody else's bed (farm work costs a point or two, so the half is kept exact over time: `gloved`); the lamp
 * lights so many tiles about its wearer in the forest's dark, on their own screen (the owner, 2026-10-06, of an early
 * gift of the forest's: "ของที่ช่วยให้ป่าสว่างเวลากลางคืน เอาแค่พอให้ตัวเองเล่นง่ายขึ้น": it finds nothing more, it only shows).
 */
export const CHARMS = { slots: 2, charmApron: 1.5, charmGloves: 0.5, charmFloat: 1.5, charmLamp: 5, charmNet: 1.5, charmHoe: 1.5 } as const;
/**
 * What each familiar does: the squirrel catches so many of the fruit one misses at a tree; the butterfly is so many
 * steps of softness about an insect (lib/town/forest-eye's softStep); the gnome weeds so many plots to a meal's hours
 * with no game. All three are the page's own to read: their games are played in the browser.
 */
export const FAMILIARS = { famSquirrel: 2, famButterfly: 1, famGnome: 10 } as const;
/**
 * What a gift does only so many times: to a day (from dawn, as the stamina's day is) or to a meal's hours. Counted in
 * the purse (`gifts.used`) by whoever keeps the game, so that the count is the same on every device a member plays on.
 */
export type Per = "day" | "meal";
export const USES: Partial<Record<GiftId, { n: number; per: Per }>> = {
  famGnome: { n: FAMILIARS.famGnome, per: "meal" },
};
/** The stretch of time a count is of, as one number: the day, or the day and which meal's hours of it. */
export const stretchOf = (per: Per, now: number): number => (per === "day" ? dayOf(now) : dayOf(now) * 3 + mealOf(now));

/** What a member has of the gifts: those taken, the charms worn of them, the familiar that follows, and what part of a point the gloves' half has left owing (lib/town/stamina's eased). */
export interface Gifts { had: GiftId[]; charms: CharmId[]; owed: number; familiar: FamiliarId | null; used: Record<string, { k: number; n: number }> }
export type GiftRefusal = "none" | "rank" | "had" | "slots" | "spent";

const isGift = (id: unknown): id is GiftId => typeof id === "string" && GIFTS.some((g) => g.id === id);
export const giftOf = (id: string): Gift | null => GIFTS.find((g) => g.id === id) ?? null;
/** The gift of a rank of a line, if that rank gives one. */
export const giftAt = (line: string, rank: number): Gift | null => GIFTS.find((g) => g.line === line && g.rank === rank) ?? null;

/** A purse's gifts, made sound: only gifts there are, each once; the charms worn are ones had, each once, no more than the places for them. */
export function giftsOf(purse: Pick<Purse, "gifts">): Gifts {
  const kept = purse.gifts, had: GiftId[] = [];
  for (const id of Array.isArray(kept?.had) ? kept.had : []) if (isGift(id) && !had.includes(id)) had.push(id);
  const charms: CharmId[] = [];
  for (const id of Array.isArray(kept?.charms) ? kept.charms : []) {
    if (charms.length < CHARMS.slots && isGift(id) && had.includes(id) && giftOf(id)!.kind === "charm" && !charms.includes(id as CharmId)) charms.push(id as CharmId);
  }
  const fam = kept?.familiar, familiar = isGift(fam) && had.includes(fam) && giftOf(fam)!.kind === "familiar" ? (fam as FamiliarId) : null;
  const owed = typeof kept?.owed === "number" && kept.owed > 0 && kept.owed < 1 ? kept.owed : 0;
  // (what was used is kept as it is, and read by `usedOf`, which believes only a count of the stretch it is asked about)
  const used = kept?.used && typeof kept.used === "object" && !Array.isArray(kept.used) ? kept.used : {};
  return { had, charms, owed, familiar, used };
}
/** The familiar that follows somebody now, if one does; and what it does for them: its number, or what does nothing. */
export const familiarOf = (purse: Pick<Purse, "gifts">): FamiliarId | null => giftsOf(purse).familiar;
export const famBy = (purse: Pick<Purse, "gifts">, id: FamiliarId, else_ = 0): number => (giftsOf(purse).familiar === id ? FAMILIARS[id] : else_);
/** Have this familiar follow me and no other (null: none follows): one I have. */
export function wearFamiliar<P extends Pick<Purse, "gifts">>(purse: P, id: string | null): { ok: true; purse: P } | { ok: false; why: GiftRefusal } {
  const mine = giftsOf(purse);
  if (id !== null && !(isGift(id) && mine.had.includes(id) && giftOf(id)!.kind === "familiar")) return { ok: false, why: "none" };
  return { ok: true, purse: { ...purse, gifts: { ...mine, familiar: id as FamiliarId | null } } };
}
/** Whether a gift works for somebody now: one they have; and a charm is worn, a familiar follows. */
export function works(purse: Pick<Purse, "gifts">, id: string): boolean {
  const mine = giftsOf(purse), g = giftOf(id);
  return !!g && mine.had.includes(g.id) && (g.kind === "charm" ? mine.charms.includes(g.id as CharmId) : g.kind === "familiar" ? mine.familiar === g.id : true);
}
/** How many times a gift that is counted has been used in the stretch `now` is in (none, of a count kept wrongly or of another stretch). */
export function usedOf(purse: Pick<Purse, "gifts">, id: string, now: number): number {
  const rule = isGift(id) ? USES[id] : undefined, u = giftsOf(purse).used[id] as { k?: unknown; n?: unknown } | undefined;
  if (!rule || !u || typeof u !== "object" || u.k !== stretchOf(rule.per, now) || typeof u.n !== "number" || !Number.isFinite(u.n)) return 0;
  return Math.max(0, Math.floor(u.n));
}
/** How many times more it may be used in this stretch (none, of a gift that is not counted). */
export const usesLeft = (purse: Pick<Purse, "gifts">, id: string, now: number): number => {
  const rule = isGift(id) ? USES[id] : undefined;
  return rule ? Math.max(0, rule.n - usedOf(purse, id, now)) : 0;
};
/** Use a counted gift once: it has to work for me now, and to have a time left in this stretch. */
export function useGift<P extends Pick<Purse, "gifts">>(purse: P, id: string, now: number): { ok: true; purse: P; left: number } | { ok: false; why: GiftRefusal } {
  const rule = isGift(id) ? USES[id] : undefined;
  if (!rule || !works(purse, id)) return { ok: false, why: "none" };
  const n = usedOf(purse, id, now);
  if (n >= rule.n) return { ok: false, why: "spent" };
  const mine = giftsOf(purse);
  return { ok: true, left: rule.n - n - 1, purse: { ...purse, gifts: { ...mine, used: { ...mine.used, [id]: { k: stretchOf(rule.per, now), n: n + 1 } } } } };
}
/** Whether somebody wears a charm now. */
export const wearing = (purse: Pick<Purse, "gifts">, id: CharmId): boolean => giftsOf(purse).charms.includes(id);
/** What a charm does for whoever wears it: its number, or what does nothing (`else_`: 1 for something multiplied, 0 for something added). */
export const charmBy = (purse: Pick<Purse, "gifts">, id: CharmId, else_ = 1): number => (wearing(purse, id) ? CHARMS[id] : else_);

/**
 * Work in somebody else's bed with the gardener's gloves on: the purse after it, with half its stamina given back
 * (kept exact from one piece of work to the next: `owed`). Without the gloves, the purse as it is.
 */
export function gloved<P extends Purse>(before: Purse, after: P, now: number): P {
  if (!wearing(before, "charmGloves")) return after;
  const mine = giftsOf(after), did = eased(before, after, now, CHARMS.charmGloves, mine.owed);
  return { ...did.purse, gifts: { ...mine, owed: did.owed } };
}

/** The gifts somebody may take now: of ranks they have reached, not taken yet, the lines in their order and the lowest rank first. */
export function dueOf(points: Partial<Record<LineId, number>>, purse: Pick<Purse, "gifts">): Gift[] {
  const had = giftsOf(purse).had;
  return LINE_IDS.flatMap((line) => GIFTS.filter((g) => g.line === line && g.rank <= rankOf(line, points[line] ?? 0) && !had.includes(g.id)).sort((a, b) => a.rank - b.rank));
}
/** How many gifts there are that somebody has not got: all the page says of them. */
export const leftOf = (purse: Pick<Purse, "gifts">): number => GIFTS.length - giftsOf(purse).had.length;

/** Take the gift of a rank one has reached: once. It goes into no bag. */
export function takeGift<P extends Pick<Purse, "gifts">>(purse: P, points: Partial<Record<LineId, number>>, line: string, rank: number):
  { ok: true; purse: P; gift: GiftId } | { ok: false; why: GiftRefusal } {
  const gift = giftAt(line, rank);
  if (!gift) return { ok: false, why: "none" };
  if (rankOf(gift.line, points[gift.line] ?? 0) < gift.rank) return { ok: false, why: "rank" };
  const mine = giftsOf(purse);
  if (mine.had.includes(gift.id)) return { ok: false, why: "had" };
  return { ok: true, gift: gift.id, purse: { ...purse, gifts: { ...mine, had: [...mine.had, gift.id] } } };
}
/** Wear these charms and no others (none: take them all off): ones had, each once, no more than the places for them. */
export function wearCharms<P extends Pick<Purse, "gifts">>(purse: P, ids: readonly string[]): { ok: true; purse: P } | { ok: false; why: GiftRefusal } {
  const mine = giftsOf(purse);
  if (ids.length > CHARMS.slots || new Set(ids).size !== ids.length) return { ok: false, why: "slots" };
  if (!ids.every((id) => isGift(id) && mine.had.includes(id) && giftOf(id)!.kind === "charm")) return { ok: false, why: "none" };
  return { ok: true, purse: { ...purse, gifts: { ...mine, charms: ids as CharmId[] } } };
}

/** The catalog's row: what the database needs of the gifts to give and to judge them (the places for charms; of each gift its kind, which rank of which line gives it, and its number; and what is counted, so many times to what). */
export const giftsRow = () => ({
  slots: CHARMS.slots,
  uses: USES,
  gifts: Object.fromEntries(GIFTS.map((g) => [g.id, { kind: g.kind, line: g.line, rank: g.rank, by: g.kind === "charm" ? CHARMS[g.id as CharmId] : FAMILIARS[g.id as FamiliarId] }])),
});
