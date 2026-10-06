import { CLUES, KIND_WORD, clueOf } from "./clues";
import { DISHES, DISH_IDS, ITEMS, LATER_MADE, MAKES, MAKE_IDS, type Cookware, type DishId, type ItemId, type ItemKind } from "./items";
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
 * thing is never named. It is told by which sort of thing it is and where
 * such a thing is had (lib/town/clues: a mushroom from the deep woods, a
 * common fish off the bank by night, a plant grown from a bulb in about three
 * days), which leaves a handful to choose among (the owner, 2026-10-06: the
 * kind alone, one of thirty-five things of the forest or fifty fish, was too
 * wide to search: "อยากให้ใบ้ง่ายขึ้น … อยากให้ใบ้เพิ่มทุกเมนู").
 * That one is for guessing, and for asking whoever has made the dish, which is
 * the point ("อยากให้ ผู้เล่นมีปฏิสัมพันธ์ มี communicate กันมากที่สุด หลายๆอย่างเลยต้องปิดเป็น
 * ความลับ"): a wrong guess is an odd dish (lib/town/cooking). So reads a scroll,
 * a hint, and a recipe somebody else found; only whoever has made the thing
 * reads all of it.
 *
 * **The way can still be felt for** ("ยังต้องทำให้ ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้"):
 * whoever has missed a recipe by that last thing alone (lib/town/cooking
 * counts it) is told what the thing looks like, in the words every thing is
 * described in, and after three such misses is shown its shadow
 * (lib/town/clues' `CLUES`; it took three misses for the words, until
 * 2026-10-06). Never its name.
 *
 * There is a hint for every dish that is cooked and for everything else that
 * is made, so nothing in the game is beyond finding. Each is written from the
 * recipe itself, so a hint can never be wrong, or out of date when a recipe is
 * changed.
 *
 * The uncle sells them one at a time, and which one is by chance (the owner,
 * 2026-10-05: "ช่วยทำให้ คำใบ้จากลุงขายของ สุ่มด้วยครับ ตอนนี้เหมือนเรียง 1 23 4"; they
 * came in one order until then, so whoever had bought four had the same four
 * as everybody else, and nobody had heard anything worth asking about): one
 * of those the buyer has neither heard nor found, of the earliest tier he
 * still has one of. Dearer the later the tier, so what the next one costs is
 * known though which it will be is not. A hint once bought is kept, to be
 * read again.
 */
export const HINT_PRICE: Record<1 | 2 | 3, number> = { 1: 15, 2: 40, 3: 90 };

/**
 * Everything there is a hint for: the dishes that are cooked, then what else is made; the early game's first, and
 * what came after the game opened (`LATER_MADE`) after the rest of its tier. It was the order they were sold in
 * until they were sold by chance; now it is only the order the database's row lists them in (lib/town/catalog),
 * by which a number of chance is turned into one of them, and it is left as it was so that the row need not be
 * written over.
 */
export const HINT_IDS: ItemId[] = [...DISH_IDS.filter((id) => DISHES[id].recipe), ...MAKE_IDS]
  .map((id, i) => ({ id: id as ItemId, i: i + (LATER_MADE.includes(id as ItemId) ? 1000 : 0) })).sort((a, b) => ITEMS[a.id].tier - ITEMS[b.id].tier || a.i - b.i).map((x) => x.id);

/** What a thing's recipe is: what goes in, in what, how many come of it, and by how many. */
const recipeOf = (id: ItemId) => (id in DISHES
  ? { ...DISHES[id as DishId].recipe!, gives: DISHES[id as DishId].recipe!.serves }
  : { ...MAKES[id]!, cooks: 1 });

export { KIND_WORD };

/**
 * The thing a recipe will not name, as it is told: its kind and how many; which sort of thing it is and where such
 * a thing is had (lib/town/clues); and, once the recipe has been missed by it often enough, what it looks like, and
 * then which thing's shadow to show (its picture, with nothing of it but its outline).
 */
export interface Hidden { kind: ItemKind; n: number; sort: Line; from: Line | null; looks?: Line; shadow?: ItemId }
/** A recipe as it is told: the things named, the one that is not, what it is made in, by how many, and how many come of it. */
export interface Told { needs: Array<[ItemId, number]>; last: Hidden | null; in: Cookware[]; cooks: number; gives: number }
/**
 * A recipe as it is told: all of it to whoever has made the thing (`full`), and otherwise all but its last thing,
 * which is told by its sort and its whereabouts; and, to whoever has missed it by that thing (`tries` times), by
 * what it looks like as well, and then by its shadow.
 */
export function toldOf(id: ItemId, full = false, tries = 0): Told {
  const r = recipeOf(id), [last, n] = r.needs[r.needs.length - 1];
  return {
    needs: full ? r.needs : r.needs.slice(0, -1),
    last: full ? null : {
      kind: ITEMS[last].kind, n, ...clueOf(last),
      ...(tries >= CLUES.looks ? { looks: ITEMS[last].about } : {}), ...(tries >= CLUES.shadow ? { shadow: last } : {}),
    },
    in: r.in, cooks: r.cooks, gives: r.gives,
  };
}
/** The thing a recipe will not name, in a line: which sort it is, and where it is had. "เห็ดสักอย่าง (แถวป่าลึก)". */
export const hiddenLine = (h: Hidden): Line => ({
  th: h.from ? `${h.sort.th} (${h.from.th.replaceAll(" · ", " ")})` : h.sort.th,
  en: h.from ? `${h.sort.en} (${h.from.en.replaceAll(" · ", "; ")})` : h.sort.en,
});

/** The hint for a thing, in a line: its name, what goes into it and how many of each (the last only by its sort and whereabouts), what it is made in (or by hand), and how many cooks when more than one. */
export function hintOf(id: ItemId): Line {
  const t = toldOf(id), name = ITEMS[id].name;
  const things = (th: boolean) => [
    ...t.needs.map(([x, n]) => `${th ? ITEMS[x].name.th : ITEMS[x].name.en.toLowerCase()} ×${n}`),
    `${th ? hiddenLine(t.last!).th : hiddenLine(t.last!).en} ×${t.last!.n}`,
  ].join(", ");
  return {
    th: `${name.th}: ${things(true)} · ${t.in.length ? t.in.map((x) => ITEMS[x].name.th).join(" + ") : "มือเปล่า ที่โต๊ะ"}${t.cooks > 1 ? ` · ${t.cooks} คน` : ""}`,
    en: `${name.en}: ${things(false)} · ${t.in.length ? t.in.map((x) => ITEMS[x].name.en.toLowerCase()).join(" + ") : "bare hands, at a worktable"}${t.cooks > 1 ? ` · ${t.cooks} cooks` : ""}`,
  };
}

/**
 * The hints the uncle may sell somebody next: those they have neither heard
 * nor found, of what can be made now (`can`: with what his shelf has open,
 * lib/town/orders; a hint of a dish nobody can cook yet would be coins for
 * nothing), of the earliest tier there is one of. All of one tier, and so of
 * one price. None when they have them all.
 */
export function hintsLeft(purse: Purse, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): ItemId[] {
  const have = new Set<ItemId>([...(purse.hints ?? []), ...purse.recipes, ...found]);
  const left = HINT_IDS.filter((id) => !have.has(id) && can(id)), tier = Math.min(...left.map((id) => ITEMS[id].tier));
  return left.filter((id) => ITEMS[id].tier === tier);
}
/** What the uncle's next hint costs somebody, whichever it turns out to be; null when he has none for them. */
export function hintPrice(purse: Purse, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): number | null {
  const left = hintsLeft(purse, found, can);
  return left.length ? HINT_PRICE[ITEMS[left[0]].tier] : null;
}
/**
 * The hint the uncle would sell somebody next: one of those he may
 * (`hintsLeft`), which of them by `r`, a number of chance from 0 up to 1 that
 * whoever keeps the game draws (0 is the first of them, as they are listed).
 * None when they have them all.
 */
export function nextHint(purse: Purse, r: number, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): ItemId | null {
  const left = hintsLeft(purse, found, can);
  return left.length ? left[Math.min(left.length - 1, Math.floor((r > 0 ? r : 0) * left.length))] : null;
}
/** Buy the next hint: which one, by `r` (see `nextHint`). */
export function buyHint(purse: Purse, r: number, found: ItemId[] = [], can: (id: ItemId) => boolean = () => true): Done<{ purse: Purse; hint: ItemId }> {
  const hint = nextHint(purse, r, found, can);
  if (!hint) return no("none");
  const price = HINT_PRICE[ITEMS[hint].tier];
  if (purse.coins < price) return no("coins");
  return { ok: true, hint, purse: { ...purse, coins: purse.coins - price, hints: [...(purse.hints ?? []), hint] } };
}
