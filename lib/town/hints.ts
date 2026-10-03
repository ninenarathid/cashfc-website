import { COOKING } from "./cooking";
import { DISHES, DISH_IDS, ITEMS, MAKES, MAKE_IDS, type Cookware, type DishId, type ItemId, type ItemKind } from "./items";
import type { Line } from "./talk";
import { no, type Done, type Purse } from "./trade";

/**
 * Recipes as they are told, and the hints the uncle sells (the owner,
 * 2026-10-03: "เราจะไม่บอกสูตรอาหาร จะแค่ใบ้ไว้ในเกม"; and, before opening: "make sure
 * ว่า recipe ของอาหารทุกอย่าง สามารถหาได้ในเกม").
 *
 * **A recipe that is found tells nearly all of itself** ("สูตรที่มีให้เจอ จะบอกแค่
 * เกือบหมด เหลือชิ้นสุดท้ายจะบอกแค่ชนิดของ ไอเทมนั้น ต้องไปเดากันเอง"): every thing that goes
 * in, by name and number, what it is made in and by how many; but its last
 * thing only by its kind (a vegetable, something from the river, a staple).
 * That one is for guessing, and for asking whoever has made the dish, which is
 * the point ("อยากให้ ผู้เล่นมีปฏิสัมพันธ์ มี communicate กันมากที่สุด หลายๆอย่างเลยต้องปิดเป็น
 * ความลับ"): a wrong guess is an odd dish (lib/town/cooking). So reads a scroll,
 * a hint, and a recipe somebody else found; only whoever has made the thing
 * reads all of it.
 *
 * **The way can still be felt for** ("ยังต้องทำให้ ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้"):
 * whoever has missed a recipe by that last thing alone so many times
 * (lib/town/cooking's `clue`) is told what the thing looks like, in the words
 * every thing is described in. Never its name.
 *
 * There is a hint for every dish that is cooked and for everything else that
 * is made, so nothing in the game is beyond finding. Each is written from the
 * recipe itself, so a hint can never be wrong, or out of date when a recipe is
 * changed.
 *
 * The uncle sells them one at a time, the next he has that the buyer has
 * neither heard nor found, early ones first; dearer the later the tier.
 * A hint once bought is kept, to be read again.
 */
export const HINT_PRICE: Record<1 | 2 | 3, number> = { 1: 15, 2: 40, 3: 90 };

/** Everything there is a hint for: the dishes that are cooked, then what else is made; the early game's first. */
export const HINT_IDS: ItemId[] = [...DISH_IDS.filter((id) => DISHES[id].recipe), ...MAKE_IDS]
  .map((id, i) => ({ id: id as ItemId, i })).sort((a, b) => ITEMS[a.id].tier - ITEMS[b.id].tier || a.i - b.i).map((x) => x.id);

/** What a thing's recipe is: what goes in, in what, how many come of it, and by how many. */
const recipeOf = (id: ItemId) => (id in DISHES
  ? { ...DISHES[id as DishId].recipe!, gives: DISHES[id as DishId].recipe!.serves }
  : { ...MAKES[id]!, cooks: 1 });

/** What a thing of each kind is called by a recipe that will not name it. */
export const KIND_WORD: Record<ItemKind, Line> = {
  tool: { th: "เครื่องมือสักอย่าง", en: "some tool" },
  bait: { th: "เหยื่อสักอย่าง", en: "some bait" },
  staple: { th: "ของคู่ครัวสักอย่าง", en: "some staple" },
  seed: { th: "เมล็ดสักอย่าง", en: "some seed" },
  crop: { th: "ผักหรือผลไม้สักอย่าง", en: "some vegetable or fruit" },
  fish: { th: "ปลาหรือสัตว์น้ำสักอย่าง", en: "some fish or river creature" },
  catch: { th: "ของที่ลอยมากับน้ำสักอย่าง", en: "something the river brings" },
  goods: { th: "ของแปรรูปสักอย่าง", en: "something that is made" },
  dish: { th: "อาหารสักอย่าง", en: "some dish" },
  scroll: { th: "ม้วนกระดาษสักม้วน", en: "some scroll" },
};

/** A recipe as it is told: the things named, the one that is not (its kind, how many, and what it looks like once that is told), what it is made in, by how many, and how many come of it. */
export interface Told { needs: Array<[ItemId, number]>; last: { kind: ItemKind; n: number; looks?: Line } | null; in: Cookware[]; cooks: number; gives: number }
/**
 * A recipe as it is told: all of it to whoever has made the thing (`full`), and otherwise all but its last thing,
 * which is told by its kind; and, to whoever has missed it by that thing so many times (`tries`), by what it looks
 * like as well.
 */
export function toldOf(id: ItemId, full = false, tries = 0): Told {
  const r = recipeOf(id), [last, n] = r.needs[r.needs.length - 1];
  return {
    needs: full ? r.needs : r.needs.slice(0, -1),
    last: full ? null : { kind: ITEMS[last].kind, n, ...(tries >= COOKING.clue ? { looks: ITEMS[last].about } : {}) },
    in: r.in, cooks: r.cooks, gives: r.gives,
  };
}

/** The hint for a thing, in a line: its name, what goes into it and how many of each (the last only by its kind), what it is made in (or by hand), and how many cooks when more than one. */
export function hintOf(id: ItemId): Line {
  const t = toldOf(id), name = ITEMS[id].name;
  const things = (th: boolean) => [
    ...t.needs.map(([x, n]) => `${th ? ITEMS[x].name.th : ITEMS[x].name.en.toLowerCase()} ×${n}`),
    `${th ? KIND_WORD[t.last!.kind].th : KIND_WORD[t.last!.kind].en} ×${t.last!.n}`,
  ].join(", ");
  return {
    th: `${name.th}: ${things(true)} · ${t.in.length ? t.in.map((x) => ITEMS[x].name.th).join(" + ") : "มือเปล่า ที่โต๊ะ"}${t.cooks > 1 ? ` · ${t.cooks} คน` : ""}`,
    en: `${name.en}: ${things(false)} · ${t.in.length ? t.in.map((x) => ITEMS[x].name.en.toLowerCase()).join(" + ") : "bare hands, at a worktable"}${t.cooks > 1 ? ` · ${t.cooks} cooks` : ""}`,
  };
}

/**
 * The hint the uncle would sell somebody next: the first they have neither
 * heard nor found, of what can be made now (`can`: with what his shelf has
 * open, lib/town/orders; a hint of a dish nobody can cook yet would be coins
 * for nothing). None when they have them all.
 */
export function nextHint(purse: Purse, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): ItemId | null {
  const have = new Set<ItemId>([...(purse.hints ?? []), ...purse.recipes, ...found]);
  return HINT_IDS.find((id) => !have.has(id) && can(id)) ?? null;
}
/** Buy the next hint. */
export function buyHint(purse: Purse, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): Done<{ purse: Purse; hint: ItemId }> {
  const hint = nextHint(purse, found, can);
  if (!hint) return no("none");
  const price = HINT_PRICE[ITEMS[hint].tier];
  if (purse.coins < price) return no("coins");
  return { ok: true, hint, purse: { ...purse, coins: purse.coins - price, hints: [...(purse.hints ?? []), hint] } };
}
