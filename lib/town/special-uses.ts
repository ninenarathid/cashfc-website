/**
 * What the specials are for (the idea patch's stage 3, 2026-11-10; the owner, 2026-11-09: "ทำทั้งหมดได้เลย", the rule that every
 * new thing has a real use, and the coordinator's rulings of 2026-11-10). The four families of lib/town/specials:
 *
 * - **the real breeds' (B to D) eggs and milk** stand in for an egg or milk in every recipe (lib/town/animal-items' FAMILY),
 *   and a pot cooked with one carries its breed's second buff (`CARRY`): one a pot (Codex), to whoever eats of it at the
 *   feast table, as a meal's buff (three hours, a level a helping);
 * - **the fantasy breeds' (E to G)** are the secret, last things of seven new dishes (lib/town/special-dishes), each the
 *   one way to a buff of the five below; two go elsewhere: the first-rain egg is thrown onto the farm and waters the nine
 *   plots round it once (`rainSquare`), and the blank recipe paper is written by a cook with a dish they have made, a
 *   scroll to trade (`writeScroll`);
 * - **the legends' (H)** are the centrepieces of the village feast's three dishes, four cooks and twenty helpings, and
 *   **eaten together**: three or more who begin a helping of the same pot at the table within five minutes of each other
 *   each have its buff a level more (`togetherAt`). Each has to eat their own: no buff is handed to anybody who did not;
 * - **the sheep's wool** is used up: at the feast table (cushions, a pot's cover, the golden tablecloth: `DRESS`), on
 *   the farm (the golden dandelion's seed, a rare flower) and at Granny Twilla's (three of them take a piece's price
 *   down by what the wool they took the place of would have fetched: `woolOff`; the coordinator's ruling: Granny's sink
 *   unchanged on average).
 *
 * **The five buffs** (3 hours, 4 levels, never past x3, none that takes failing away; lib/town/items' BUFF_STEPS):
 * gentle (a pet or a treat gives more hearts), aroma (the kitchen's next hazard shows early: `hazardLead`, a hook every
 * kitchen game calls), featherlight (walking on foot is quicker: `fleetPace`), moon sight (19:00 to 05:00, the dark round
 * oneself lifted farther, glowing things seen farther: `moonTiles`), lucky match (a breeding by its recipe likelier:
 * `matchOdds`, never past three times its own odds, Codex, nor the cap).
 *
 * Pure: the page, the browser's trial and the database (v325) work it out alike.
 */
import { DISHES, ITEMS, SCROLLS, byOf, type DishId, type ItemId, type MealBuffId } from "./items";
import { BANGKOK, HOUR, gradeIn, gradePays, held, no, put, roomFor, take, type Done, type Purse, type Stack } from "./trade";
import { LEGEND_DISHES } from "./special-dishes";
import { SPECIAL_ITEM } from "./specials";
import { matchedOdds } from "./animals";

/** The line's numbers (the doc's and ours: the README of the idea patch says whose). */
export const SPECIAL_USE = {
  /** Eaten together: so many members, each beginning a helping of the same legend pot within so long of the others; so many levels more; a beginning kept so long. */
  together: { within: 5 * 60_000, people: 3, levels: 1, keep: 24 * HOUR },
  /** The first-rain egg: thrown onto a plot, it waters every plot this many steps round it (3x3). */
  rain: { item: "firstRainEgg" as ItemId, reach: 1 },
  /** The blank recipe paper. */
  paper: "blankRecipePaper" as ItemId,
  /** The feast table's wool: cushions (so long; whoever eats there counts so many more companions), a pot's cover (so many meals more), the golden tablecloth (so long; every pot so many meals more). */
  cushion: { item: "cloudFluffTuft" as ItemId, hours: 24, company: 1 },
  cover: { item: "shootingStarLock" as ItemId, meals: 1 },
  cloth: { item: "wholeGoldenFleece" as ItemId, hours: 24, meals: 1 },
  /** Granny Twilla's: the wool she takes off a piece's price, each kind once a piece. */
  tailor: ["rareShadeLock", "spiralShedHorn", "rainbowArcLock"] as ItemId[],
  /** Moon sight's night, by Bangkok's clock: from the first hour to the second. */
  night: [19, 5] as const,
};

/* ── the real breeds' specials: an egg or milk, and a second buff ── */

/** The second buff each real breed's special carries into a pot (the doc's table). */
export const CARRY: Readonly<Record<string, MealBuffId>> = {
  silkieTwinEgg: "gentle", dawnBlueEgg: "keen", cocoaShellEgg: "hearty",
  windRunnerEgg: "featherlight", emeraldShellEgg: "current", brushPaintedEgg: "lucky",
  goldenCreamTop: "calm", warmShaggyMilk: "green", agedCheeseStarter: "aroma",
};
/**
 * The buff a pot carries for the real breeds' specials that went into it: one a pot (Codex), the first of them as the
 * things are told in order (the bag's ids sorted), never the buff the dish leaves of itself; none when none went in.
 */
export function carryOf(things: ReadonlyArray<readonly [ItemId, number]>, dish: DishId | null): MealBuffId | null {
  const own = dish ? DISHES[dish]?.buff : undefined;
  for (const id of [...things.map(([x]) => x)].sort()) { const b = CARRY[id]; if (b && b !== own) return b; }
  return null;
}

/* ── the legend's dishes, eaten together ── */

export const isLegend = (dish: string | null | undefined): boolean => !!dish && (LEGEND_DISHES as readonly string[]).includes(dish);
/** A helping of a legend pot begun at the table: by whom, when. */
export interface Began { by: string; at: number }
/**
 * Whether a helping of a legend pot begun at `from` by `me` was eaten together: some stretch of `within` holds its
 * beginning and the beginnings of helpings of the same pot by at least `people - 1` others (each member once, however
 * many helpings they began). Read when the helping is eaten up; a beginning after that is not looked at.
 */
export function togetherAt(began: readonly Began[], me: string, from: number, k = SPECIAL_USE.together): boolean {
  const near = began.filter((b) => Math.abs(b.at - from) <= k.within);
  for (const w of [from, ...near.map((b) => b.at)]) {
    if (w > from || from - w > k.within) continue;
    const who = new Set([me, ...near.filter((b) => b.at >= w && b.at <= w + k.within).map((b) => b.by)]);
    if (who.size >= k.people) return true;
  }
  return false;
}
/** The beginnings worth keeping (the newer ones, and a beginning more). */
export const keepBegan = (began: readonly Began[], add: Began | null, now: number, k = SPECIAL_USE.together): Began[] =>
  [...began, ...(add ? [add] : [])].filter((b) => now - b.at <= k.keep);

/* ── the five buffs ── */

/** A pet's or a treat's hearts under gentle at a level. */
export const gentleHearts = (base: number, level: number) => base * (1 + byOf("gentle", level));
/**
 * A breeding's odds, in hundredths, under lucky match at a level: so many points more than it would have with its dawn
 * forage, never past three times its own odds (Codex: the buff's "never past x3") nor the line's cap, and never less than
 * it has without the buff.
 */
export const matchOdds = (base: number, dawn: number, level: number, cap: number): number => matchedOdds(base, dawn, matchPoints(level), cap);
/** The points lucky match adds at a level (0 with none): what lib/town/animals' crossOf is given. */
export const matchPoints = (level: number) => byOf("luckyMatch", level);
/** How many seconds early a kitchen game shows its next hazard under aroma at a level (0 with none): the hook every kitchen game calls. */
export const hazardLead = (level: number) => byOf("aroma", level);
/**
 * Whether a kitchen game's warning of a hazard is up at a moment (seconds): from `warns` before one of `at` (the game's own
 * warning), and `lead` before that (aroma's), until it comes. The hook the kitchen's games call, each with its own hazards
 * (the roast's flares today; the pan's, the dough's and the mortar's when they come). Nothing else of the game is eased.
 */
export const hazardNear = (at: readonly number[], t: number, warns: number, lead = 0) => at.some((h) => t >= h - warns - Math.max(0, lead) && t < h);
/** How many times as fast somebody walks on foot under featherlight at a level (1 riding, or with none). */
export const fleetPace = (level: number, riding = false) => (riding ? 1 : 1 + byOf("featherlight", level));
/** Whether it is moon sight's night at a moment (Bangkok's clock). */
export const isNight = (now: number) => { const h = new Date(now + BANGKOK).getUTCHours(); return h >= SPECIAL_USE.night[0] || h < SPECIAL_USE.night[1]; };
/** How many tiles farther somebody sees in the dark round them under moon sight at a level: none by day. */
export const moonTiles = (level: number, now: number) => (isNight(now) ? byOf("moonSight", level) : 0);

/* ── the golden dandelion ── */

/** The rare flowers: grown of a special's seed and nothing else (the dandelion lamb's golden seed); a page of the village's farm book shut until somebody has grown one (lib/town/farm-book). */
export const RARE_FLOWERS: ReadonlySet<string> = new Set(["goldenDandelion"]);

/* ── the first-rain egg ── */

/** The plots the first-rain egg waters when thrown onto one: it and every one round it (3x3). */
export function rainSquare(x: number, y: number, reach = SPECIAL_USE.rain.reach): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) out.push([x + dx, y + dy]);
  return out;
}

/* ── the blank recipe paper ── */

/** The scroll of a recipe (none for what has none). */
export const scrollFor = (id: ItemId): ItemId | null => (Object.keys(SCROLLS) as ItemId[]).find((s) => SCROLLS[s] === id) ?? null;
/** What a cook may write on a blank recipe paper: whatever they have made that has a scroll, in the order they made it. */
export const writable = (purse: Pick<Purse, "made">): ItemId[] => (purse.made ?? []).filter((id) => id in ITEMS && !!scrollFor(id));
/**
 * The ink a recipe's writing costs: the coins its scroll fetches at the uncle's over what the blank paper fetches, none
 * where it fetches no more. Writing turns knowledge into something to trade, never coins into more coins (Codex,
 * 2026-11-10: a 15-coin paper written as the star pudding's scroll would fetch 120).
 */
export const inkOf = (id: ItemId) => { const s = scrollFor(id); return s ? Math.max(0, (ITEMS[s].pays ?? 0) - (ITEMS[SPECIAL_USE.paper].pays ?? 0)) : 0; };
/** Write a recipe one has made onto a blank recipe paper: the paper and the ink's coins are used up and the recipe's scroll is in the bag. */
export function writeScroll(purse: Purse, id: ItemId): Done<{ purse: Purse; scroll: ItemId }> {
  if (held(purse.bag, SPECIAL_USE.paper) < 1) return no("none");
  const scroll = scrollFor(id);
  if (!scroll || !(purse.made ?? []).includes(id)) return no("known");
  const ink = inkOf(id);
  if (purse.coins < ink) return no("coins");
  const bag = take(purse.bag, SPECIAL_USE.paper, 1);
  if (roomFor(bag, scroll) < 1) return no("full");
  return { ok: true, scroll, purse: { ...purse, coins: purse.coins - ink, bag: put(bag, scroll, 1) } };
}

/* ── the feast table's wool ── */

/** What is laid on the feast table now: cushions and the golden tablecloth, each from when, until when, and by whom (a name). */
export interface Dress {
  cushions?: { at: number; until: number; by: string } | null; cloth?: { at: number; until: number; by: string } | null;
  /**
   * The golden cloth laid before the one on the table now, when that one was laid after it had gone: the pots whose time
   * fell while it lay keep their meal's hours (Codex, 2026-11-10). One is enough: a third cloth comes a day after the
   * second at the soonest, and a pot is never kept more than two meals' hours past its time.
   */
  clothWas?: { at: number; until: number; by: string } | null;
}
export type DressKind = "cushions" | "cloth";
export const DRESS_ITEM: Record<DressKind, ItemId> = { cushions: SPECIAL_USE.cushion.item, cloth: SPECIAL_USE.cloth.item };
/** Whether something is laid on the table at a moment. */
export const laid = (d: Dress | null | undefined, kind: DressKind, now: number): boolean => {
  const on = (x: { at: number; until: number } | null | undefined) => !!x && x.at <= now && now < x.until;
  return on(d?.[kind]) || (kind === "cloth" && on(d?.clothWas));
};
/** Lay cushions or the golden tablecloth on the feast table: the wool is used up; laid again, the time runs from now (never shorter). */
export function layDress(purse: Purse, d: Dress | null | undefined, kind: DressKind, by: string, now: number): Done<{ purse: Purse; dress: Dress }> {
  const item = DRESS_ITEM[kind];
  if (held(purse.bag, item) < 1) return no("none");
  const hours = kind === "cushions" ? SPECIAL_USE.cushion.hours : SPECIAL_USE.cloth.hours, was = d?.[kind];
  const until = Math.max(now + hours * HOUR, was && was.until > now ? was.until : 0);
  // (a cloth laid after the last had gone: that one is kept beside it, for the pots whose time fell while it lay)
  const kept = kind === "cloth" && was && was.until <= now ? { clothWas: was } : {};
  return { ok: true, dress: { ...(d ?? {}), ...kept, [kind]: { at: was && was.until > now ? was.at : now, until, by } }, purse: { ...purse, bag: take(purse.bag, item, 1) } };
}
/** How many more companions a helping eaten at the table has for its cushions. */
export const cushionCompany = (d: Dress | null | undefined, now: number) => (laid(d, "cushions", now) ? SPECIAL_USE.cushion.company : 0);
/**
 * How many meals' hours more a pot on the table stays past its time (`end`): one under its own cover, one more when the
 * golden tablecloth lies on the table at that moment. Each once: never more than these two (Codex: no pot kept for ever).
 */
export const mealsMore = (pot: { cover?: boolean }, d: Dress | null | undefined, end: number) =>
  (pot.cover ? SPECIAL_USE.cover.meals : 0) + (laid(d, "cloth", end) ? SPECIAL_USE.cloth.meals : 0);

/* ── Granny Twilla's ── */

/** What a stack of tailor's wool takes off a piece: what that wool fetches at the uncle's base price at its grade. */
export const woolWorth = (s: Pick<Stack, "item" | "grade">) => (SPECIAL_USE.tailor.includes(s.item) ? Math.round(ITEMS[s.item].pays * gradePays(s.item, gradeIn(s))) : 0);
/**
 * Granny takes the wool in these slots towards a piece (each kind once): what it takes off, and the bag without it.
 * Slots of anything else, the same kind twice, or an empty slot are refused.
 */
export function woolOff(purse: Purse, slots: readonly number[]): Done<{ off: number; bag: Purse["bag"] }> {
  const kinds = new Set<string>();
  let off = 0, bag = purse.bag;
  for (const i of slots) {
    const s = purse.bag[i];
    if (!s || !SPECIAL_USE.tailor.includes(s.item) || kinds.has(s.item)) return no("none");
    kinds.add(s.item);
    off += woolWorth(s);
    bag = bag.map((b, k) => (k !== i ? b : b!.n > 1 ? { ...b!, n: b!.n - 1 } : null));
  }
  return { ok: true, off, bag };
}

/** Whether a thing is a special used for something here, by family (what the stage hangs on lib/town/specials' `line`). */
export const isSpecial = (id: string) => SPECIAL_ITEM.has(id);
