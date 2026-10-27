import { FISH, type FishId } from "./items";
import { GIANTS, type GiantHook, type GiantId } from "./giant-fish";

/**
 * The village's book of fish (the owner, 2026-10-27: "อยากให้เพิ่มสมุดปลาด้วย"), as components/town/TownFishBook shows it:
 * each kind somebody has landed, who landed the first and the biggest the village has landed and by whom; and each giant
 * landed together, its biggest with the angler's and the netter's names. The database keeps it (v310's
 * `town_fish_book`, written as a landing is kept); the trial keeps its own (lib/town/trial).
 */
export interface FishBookLine { first: string; best?: [number, string] }
export interface GiantRecord { id: GiantId; size: number; weight: number; angler: string; netter: string }
export interface FishBook { fish: Partial<Record<FishId, FishBookLine>>; giants: GiantRecord[] }

/** The book with one more fish landed: the first stays the first; the biggest is the bigger (the earlier, of two the same). */
export function noteFish(book: FishBook["fish"], id: string, size: number, name: string): FishBook["fish"] {
  if (!(id in FISH)) return book;
  const was = book[id as FishId];
  const best = size > 0 && (!was?.best || size > was.best[0]) ? ([size, name] as [number, string]) : was?.best;
  return { ...book, [id]: { first: was?.first ?? name, ...(best ? { best } : {}) } };
}
/** The biggest of each giant landed, from the hooks (the earlier, of two the same). */
export function giantRecords(hooks: readonly GiantHook[]): GiantRecord[] {
  const best = new Map<GiantId, GiantHook>();
  for (const h of [...hooks].filter((x) => x.how === "landed" && x.netter && x.giant in GIANTS).sort((a, b) => a.end - b.end)) {
    const was = best.get(h.giant);
    if (!was || h.size > was.size) best.set(h.giant, h);
  }
  return [...best.values()].map((h) => ({ id: h.giant, size: h.size, weight: h.weight, angler: h.byName, netter: h.netterName ?? "" }));
}
