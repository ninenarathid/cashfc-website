import { goesIn, isCookware, isFind, type Taste } from "./cooking";
import type { Told } from "./hints";
import { ITEMS, type Cookware, type ItemId, type ItemKind } from "./items";
import type { Line } from "./talk";
import { held, type Purse } from "./trade";

/**
 * The kitchen table: what the cooking screen shows of a bag, a pot and a recipe (the owner, 2026-10-06: "ตอนนี้ระบบ
 * อาหารในเกม ไม่เป้นที่นิยมและยังใช้งานยากเกินไป อยากให้ rework UI การทำอาหารให้เข้าใจง่ายขึ้น เปิดสูตรที่มีดูคู่กันไปได้"). Nothing here
 * decides what is cooked: that is lib/town/cooking's, and the keeper's. These are the page's own readings, so that
 * the screen (components/town/TownKitchen) only draws them:
 *
 * - **the basket**: the things of the bag that can go in, shelf by shelf, each by its name;
 * - **a recipe beside the pot**: each line it tells, with how many the bag has and how many are in already. It is
 *   for reading: things are still put in one by one by hand ("ใส่วัตถุดิบเองเหมือนเดิม"), and its last thing is as
 *   hidden as on its scroll (lib/town/hints);
 * - **the notebook**: what was put together before and what came of it, kept in the browser, so that nobody has to
 *   remember which guesses a recipe's hidden thing has had. A convenience of the page's: lose it and nothing of the
 *   game is lost.
 */

/** The basket's shelves, in the order they are laid out. */
export const SHELVES = ["fish", "crop", "wild", "staple", "goods", "other"] as const;
export type Shelf = (typeof SHELVES)[number];
export const SHELF_WORD: Record<Shelf, Line> = {
  fish: { th: "ปลาและของจากน้ำ", en: "From the water" }, crop: { th: "ผักที่ปลูก", en: "Grown" }, wild: { th: "ของป่า", en: "From the forest" },
  staple: { th: "ของคู่ครัว", en: "Staples" }, goods: { th: "ของที่ทำขึ้น", en: "Made" }, other: { th: "อื่นๆ", en: "Other" },
};
const SHELF_OF: Partial<Record<ItemKind, Shelf>> = { fish: "fish", catch: "fish", crop: "crop", wild: "wild", staple: "staple", goods: "goods" };
/** Which shelf a thing is laid on. */
export const shelfOf = (id: ItemId): Shelf => SHELF_OF[ITEMS[id].kind] ?? "other";

/** The basket: every thing of the bag that can go in, each once with how many of it, on its shelf; a shelf with nothing on it is left out. */
export function pantry(bag: Purse["bag"]): Array<{ shelf: Shelf; things: Array<[ItemId, number]> }> {
  const all = new Map<ItemId, number>();
  for (const s of bag) if (s && goesIn(s.item)) all.set(s.item, (all.get(s.item) ?? 0) + s.n);
  return SHELVES.map((shelf) => ({ shelf, things: [...all].filter(([id]) => shelfOf(id) === shelf) })).filter((s) => s.things.length);
}
/** The cookware a bag has, each kind once, in the bag's own order, with the slot it is taken up from. */
export function cookwareIn(bag: Purse["bag"]): Array<{ id: Cookware; slot: number }> {
  const out: Array<{ id: Cookware; slot: number }> = [];
  bag.forEach((s, slot) => { if (s && isCookware(s.item) && !out.some((o) => o.id === s.item)) out.push({ id: s.item, slot }); });
  return out;
}

/** A line of a recipe beside the pot: `in` when as many as it takes are in, `have` when the bag has them, `short` when it has not. */
export interface LineAt { id: ItemId; need: number; have: number; put: number; state: "in" | "have" | "short" }
/** The lines a recipe tells, each beside the bag and what is in the pot. */
export function linesAt(told: Told, bag: Purse["bag"], things: Array<[ItemId, number]>): LineAt[] {
  return told.needs.map(([id, need]) => {
    const have = held(bag, id), put = things.find(([t]) => t === id)?.[1] ?? 0;
    return { id, need, have, put, state: put >= need ? "in" : have >= need ? "have" : "short" };
  });
}
/** Whether the bag has every line a recipe tells (its hidden thing, if it hides one, is not counted: nobody is told what it is). */
export const stocked = (told: Told, bag: Purse["bag"]) => told.needs.every(([id, n]) => held(bag, id) >= n);
/** A recipe's cookware beside the cooks: `held` in somebody's hand at a place, `bag` in my bag, or `none`. */
export function toolsAt(told: Told, bag: Purse["bag"], crew: Array<ItemId | null>): Array<{ id: Cookware; state: "held" | "bag" | "none" }> {
  const hands = crew.filter(isCookware) as Cookware[];
  return told.in.map((id) => {
    const i = hands.indexOf(id);
    if (i >= 0) { hands.splice(i, 1); return { id, state: "held" as const }; }
    return { id, state: held(bag, id) > 0 ? "bag" as const : "none" as const };
  });
}

/** A try, as the notebook keeps it: what was put together, in what, by how many, and what came of it. */
export interface Note { at: number; things: Array<[ItemId, number]>; tool: ItemId | null; cooks: number; made: ItemId | null; n: number; taste?: Taste; first?: boolean }
/** How many tries the notebook keeps. */
export const NOTES = { keep: 40 };
const same = (a: Note, b: Note) => a.tool === b.tool && a.cooks === b.cooks && a.made === b.made && a.taste === b.taste && JSON.stringify(a.things) === JSON.stringify(b.things);
/** The notebook with one more try in it: the newest first, the same try again written once, and no more than so many. */
export function keepNote(notes: Note[], note: Note): Note[] {
  return [note, ...notes.filter((n) => !same(n, note))].slice(0, NOTES.keep);
}
const TASTES: Taste[] = ["far", "some", "less", "more", "swap", "amounts", "way"];
/** A notebook read back from where it was kept: whatever of it is still a note of things there are. */
export function readNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const out: Note[] = [];
  for (const r of raw as Array<Partial<Note> | null>) {
    if (!r || typeof r.at !== "number" || !Array.isArray(r.things)) continue;
    const things = r.things.filter((t): t is [ItemId, number] => Array.isArray(t) && typeof t[0] === "string" && t[0] in ITEMS && Number.isInteger(t[1]) && t[1] > 0);
    if (!things.length || things.length !== r.things.length) continue;
    const tool = typeof r.tool === "string" && r.tool in ITEMS ? r.tool : null, made = typeof r.made === "string" && r.made in ITEMS ? r.made : null;
    out.push({
      at: r.at, things, tool, cooks: Number.isInteger(r.cooks) && r.cooks! > 0 ? r.cooks! : 1, made, n: Number.isInteger(r.n) ? r.n! : 0,
      ...(r.taste && TASTES.includes(r.taste) ? { taste: r.taste } : {}), ...(r.first === true ? { first: true } : {}),
    });
  }
  return out.slice(0, NOTES.keep);
}
/** What a guess at a recipe's hidden thing was: what was put in beside the lines the recipe tells, and how it tasted. */
export interface Guess { at: number; put: Array<[ItemId, number]>; tool: ItemId | null; taste?: Taste }
/**
 * My tries at a recipe that still hides its last thing: the notes that had every line it tells, in its amounts, and
 * came to no recipe. Each as what else was put in: the guesses its hidden thing has had, the newest first.
 */
export function guessesAt(told: Told, notes: Note[]): Guess[] {
  if (!told.last || !told.needs.length) return [];
  const lines = new Map(told.needs);
  return notes
    .filter((n) => !isFind(n.made) && told.needs.every(([id, need]) => n.things.some(([t, k]) => t === id && k === need)))
    .map((n) => ({ at: n.at, put: n.things.filter(([t]) => !lines.has(t)), tool: n.tool, ...(n.taste ? { taste: n.taste } : {}) }));
}

/** What the wrong things taste of: how near they came to something (lib/town/cooking's tasteOf). */
export const TASTE_WORD: Record<Taste, Line> = {
  far: { th: "ไม่เข้ากันเลยสักอย่าง", en: "None of it goes together" }, some: { th: "มีบางอย่างที่เข้ากันอยู่", en: "Some of it belongs together" },
  less: { th: "เกือบแล้ว ยังขาดของอีกอย่างหนึ่ง", en: "Nearly: one thing is missing" }, more: { th: "เกือบแล้ว มีของเกินมาอย่างหนึ่ง", en: "Nearly: one thing too many" },
  swap: { th: "เกือบแล้ว มีของอย่างหนึ่งที่ไม่ใช่", en: "Nearly: one thing is not the one" }, amounts: { th: "ของใช่ทุกอย่างแล้ว แต่สัดส่วนยังไม่ใช่", en: "The right things, in the wrong amounts" },
  way: { th: "ของครบ สัดส่วนก็ใช่ แต่วิธีทำยังไม่ใช่", en: "Everything is right but the way it was cooked" },
};
