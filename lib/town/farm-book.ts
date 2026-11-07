/**
 * **The village's farm book** (the owner, 2026-11-07: "ช่วยทำ สมุดปลูกผักให้หน่อย มีข้อมูลผักทั้งหมด รายละเอียดเฉพาะที่ค้นพบแล้ว
 * รวมถึง คู่ผักด้วย ไม่งั้นคนเล่นหากันไม่เจอ"; his choices: found by anybody in the village counts, as the books of fish and
 * insects; a page not found yet shows its shape in shadow and one of its parents).
 *
 * Every crop has a page. One the uncle sells (never a crossing's child) is open from the start. A crossing's child (the
 * garden's hybrids, the helper plants a pollinator's sky decides, their mist forms) opens once somebody in the village has
 * found it: v322's `public.town_garden_book`, and a member's own `gardenBook` while that is not read yet. A page that is
 * shut tells one parent only; a parent's page tells the crossings whose child is open, and how many are still to find, never
 * the other parent of one not found (or a shut page's hint and a parent's page together would give the whole pair).
 */
import { CROPS, type CropId } from "./items";
import { GARDEN } from "./gardening";
import { COMPANIONS, PARTNERS, type CompanionId, type Role, type Shape } from "./quality";
import { HELPER_CROSSES, MIST_PLANTS } from "./helper-items";
import { GROW_CROPS } from "./giant-sizes";

export type Sky = "sun" | "moon" | "mist";
/** A crossing as the book shows it: two parents and the child, under the sky of the pollinator let go (the helpers'). */
export interface BookCross { a: CropId; b: CropId; child: CropId; sky?: Sky }
export const BOOK_CROSSES: readonly BookCross[] = [
  ...GARDEN.crosses.map(([a, b, child]) => ({ a, b, child })),
  ...HELPER_CROSSES.flatMap(([a, b, sun, moon, mist]) => [
    { a, b, child: sun as CropId, sky: "sun" as const }, { a, b, child: moon as CropId, sky: "moon" as const }, { a, b, child: mist as CropId, sky: "mist" as const },
  ]),
];
const CHILDREN: ReadonlySet<string> = new Set(BOOK_CROSSES.map((c) => c.child));
const HYBRIDS: ReadonlySet<string> = new Set(GARDEN.crosses.map((c) => c[2]));

export type BookKind = "uncle" | "helper" | "hybrid" | "mist";
export const kindOf = (id: CropId): BookKind =>
  HYBRIDS.has(id) ? "hybrid" : id in MIST_PLANTS ? "mist" : id in COMPANIONS ? "helper" : "uncle";
/** Whether a crop's page is open: one nobody has to find (no crossing makes it), or a child the village has found. */
export const isOpen = (id: string, found: ReadonlySet<string>): boolean => !CHILDREN.has(id) || found.has(id);

export interface BookPage {
  id: CropId;
  kind: BookKind;
  open: boolean;
  /** A shut page's one parent. */
  hint?: CropId;
  /** An open child's own crossing(s). */
  from: BookCross[];
  /** The crossings it is a parent of whose child is open. */
  makes: BookCross[];
  /** How many of its crossings have a child not found yet. */
  hidden: number;
  partner?: CropId;
  role?: Role;
  shape?: Shape;
  giant: boolean;
  hours: number;
  yield: readonly [number, number];
  again?: number;
  picks?: number;
}

const ORDER: Record<BookKind, number> = { uncle: 0, helper: 1, hybrid: 2, mist: 3 };

/** Every crop's page, in the book's order: the uncle's, the helpers, the hybrids, the mist forms. */
export function farmBook(found: ReadonlySet<string>): BookPage[] {
  const ids = Object.keys(CROPS) as CropId[];
  const pages = ids.map((id): BookPage => {
    const c = CROPS[id], open = isOpen(id, found), helper = COMPANIONS[id as CompanionId];
    const mine = BOOK_CROSSES.filter((x) => x.a === id || x.b === id);
    const base = { id, kind: kindOf(id), open, giant: (GROW_CROPS as readonly string[]).includes(id), hours: c.hours, yield: c.yield,
      ...(c.again ? { again: c.again, picks: c.picks } : {}) };
    if (!open) return { ...base, hint: BOOK_CROSSES.find((x) => x.child === id)!.a, from: [], makes: [], hidden: 0 };
    return {
      ...base,
      from: BOOK_CROSSES.filter((x) => x.child === id),
      makes: mine.filter((x) => isOpen(x.child, found)),
      hidden: mine.filter((x) => !isOpen(x.child, found)).length,
      ...(PARTNERS[id] && PARTNERS[id] in CROPS ? { partner: PARTNERS[id] as CropId } : {}),
      ...(helper ? { role: helper.role, shape: helper.shape } : {}),
    };
  });
  return pages.sort((p, q) => ORDER[p.kind] - ORDER[q.kind] || ids.indexOf(p.id) - ids.indexOf(q.id));
}
