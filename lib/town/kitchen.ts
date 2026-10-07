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

/**
 * What the wrong things taste of: how near they came to something (lib/town/cooking's tasteOf). Each says that it is
 * said of "a recipe": the nearest of all there are, which need not be the one the cook was after (the owner,
 * 2026-10-07: two minnows put in for a bowl were answered "nearly: one thing is missing", which was the taste of a
 * fertiliser and read as said of the bowl: "ระบบจะบอกว่ายังขาดของอีกอย่างนึง ทั้งๆที่ไม่ได้ขาด แต่ใส่ผิดประเภท ช่วยเขียนให้เข้าใจง่ายกว่านี้").
 */
export const TASTE_WORD: Record<Taste, Line> = {
  far: { th: "ไม่ใกล้เคียงกับสูตรไหนเลย", en: "Not close to any recipe" }, some: { th: "มีของบางอย่างตรงกับสูตรหนึ่ง", en: "Some of it is what a recipe takes" },
  less: { th: "ใกล้กับสูตรหนึ่ง: สูตรนั้นต้องใช้ของอีก 1 อย่าง", en: "Close to a recipe: that one takes one more thing" },
  more: { th: "ใกล้กับสูตรหนึ่ง: สูตรนั้นไม่ใช้ของ 1 อย่างที่ใส่ไป", en: "Close to a recipe: that one does not take one of these" },
  swap: { th: "ใกล้กับสูตรหนึ่ง: สูตรนั้นใช้ของอื่นแทน 1 อย่างที่ใส่ไป", en: "Close to a recipe: that one takes something else for one of these" },
  amounts: { th: "ของตรงกับสูตรหนึ่งครบทุกอย่าง แต่จำนวนยังไม่ตรง", en: "Every thing a recipe takes, in other amounts" },
  way: { th: "ของและจำนวนตรงกับสูตรหนึ่งแล้ว แต่เครื่องครัวหรือจำนวนคนทำยังไม่ใช่", en: "A recipe's things and amounts, but not its cookware or its number of cooks" },
};
/** Under a taste, on the card of what came of it: which recipe it is said of. */
export const TASTE_OF: Line = { th: "“สูตรหนึ่ง” คือสูตรที่ใกล้กับของที่ใส่ไปที่สุด อาจไม่ใช่สูตรที่ตั้งใจทำ", en: "“A recipe” is whichever is nearest to what went in: maybe not the one you meant" };

/**
 * How a try missed the recipe that is open beside the pot, by what that recipe's own page tells and nothing more.
 * The taste is of the nearest recipe of all; this is of the one being read, and is said before it.
 *
 * - `lacks`: lines it tells that were not put in; `amounts`: lines put in in another amount (what it takes, what went in);
 * - `strays`: what went in that is no line of it. A recipe read whole takes none. One that hides its last thing
 *   takes one kind, so many of it (`secret`): `none` went in, `many` kinds did, one in another `amount`, or a `guess`;
 * - `tools`, `cooks`: cookware of its that no cook held, and how many cooks it takes when there were fewer;
 * - `wrong`: a guess that was not the thing. Said only when all the rest is as the recipe tells, which is when the
 *   cook could have worked it out: nothing here reads what a recipe hides.
 */
export interface Missed {
  lacks: Array<[ItemId, number]>; amounts: Array<[ItemId, number, number]>; strays: Array<[ItemId, number]>;
  secret: { n: number; how: "none" | "many" | "amount" | "guess" } | null; tools: Cookware[]; cooks: number | null; wrong: ItemId | null;
}
export function missedBy(told: Told, things: Array<[ItemId, number]>, crew: Array<ItemId | null>): Missed {
  const put = new Map(things);
  const lacks = told.needs.filter(([id]) => !put.has(id));
  const amounts = told.needs.flatMap(([id, n]): Array<[ItemId, number, number]> => (put.has(id) && put.get(id) !== n ? [[id, n, put.get(id)!]] : []));
  const strays = things.filter(([id]) => !told.needs.some(([t]) => t === id));
  const secret = told.last ? { n: told.last.n, how: !strays.length ? "none" as const : strays.length > 1 ? "many" as const : strays[0][1] !== told.last.n ? "amount" as const : "guess" as const } : null;
  const tools = toolsAt(told, [], crew).filter((t) => t.state !== "held").map((t) => t.id), cooks = crew.length < told.cooks ? told.cooks : null;
  const rest = !lacks.length && !amounts.length && !tools.length && cooks === null;
  return { lacks, amounts, strays, secret, tools, cooks, wrong: secret?.how === "guess" && rest ? strays[0][0] : null };
}
/** The same, in lines for the card, in the order a recipe's page tells itself: its things, its secret thing, what it is made in and by how many. */
export function missedWords(m: Missed, name: (id: ItemId) => string, th: boolean): string[] {
  const out: string[] = [], list = (ids: ItemId[]) => ids.map(name).join(", ");
  if (m.lacks.length) out.push(`${th ? "ยังไม่ได้ใส่" : "Not put in:"} ${m.lacks.map(([id, n]) => `${name(id)} ×${n}`).join(", ")}`);
  for (const [id, need, n] of m.amounts) out.push(th ? `${name(id)} ต้องใส่ ×${need} (ใส่ไป ×${n})` : `${name(id)} takes ×${need} (×${n} went in)`);
  if (!m.secret && m.strays.length) out.push(th ? `${list(m.strays.map(([id]) => id))} ไม่อยู่ในสูตรนี้` : `Not in this recipe: ${list(m.strays.map(([id]) => id))}`);
  if (m.secret?.how === "none") out.push(th ? `ยังไม่ได้ใส่ชิ้นลับ (ต้องใส่ ×${m.secret.n})` : `Its secret thing (×${m.secret.n}) was not put in`);
  if (m.secret?.how === "many") out.push(th ? `ชิ้นลับมีอย่างเดียว แต่ใส่ของนอกสูตรมา ${m.strays.length} อย่าง` : `It has one secret thing, and ${m.strays.length} things it does not tell went in`);
  if (m.secret?.how === "amount") out.push(th ? `ชิ้นลับต้องใส่ ×${m.secret.n} (ใส่ ${name(m.strays[0][0])} ไป ×${m.strays[0][1]})` : `Its secret thing takes ×${m.secret.n} (×${m.strays[0][1]} of ${name(m.strays[0][0])} went in)`);
  if (m.wrong) out.push(th ? `${name(m.wrong)} ไม่ใช่ชิ้นลับของสูตรนี้` : `${name(m.wrong)} is not its secret thing`);
  if (m.tools.length) out.push(th ? `ไม่ได้ทำใน ${list(m.tools)}` : `Not cooked in: ${list(m.tools)}`);
  if (m.cooks !== null) out.push(th ? `ต้องช่วยกันทำ ${m.cooks} คน` : `Takes ${m.cooks} cooks together`);
  return out;
}
