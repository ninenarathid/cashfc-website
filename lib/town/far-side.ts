import { ANCIENT, layMountain } from "./mountain";
import { MOUNTAIN } from "./world";

/**
 * The far side's lists, for the database: the mountain's trees and rocks as they are laid out, whoever asks.
 *
 * lib/town/world puts the mountain in the world in `next dev` only (its `PREVIEW`), so its own lists
 * (`MOUNTAIN_TREES`, `MOUNTAIN_ROCKS`) are empty in a test and in a script. The database is production's and keeps
 * the far side for whoever it is opened to: a catalog row made from an empty list would have no tree to fell and no
 * rock to strike. So what the catalog is given is made here, from the layout itself (lib/town/mountain lays it out
 * everywhere but in a production build, and nothing of a page imports this file: lib/town/catalog does, which only
 * tests and scripts read), in the same way and the same order as the world makes its own; and
 * lib/town/catalog.test.ts holds the two to each other, in a world made as `next dev` makes it.
 */
export interface FarTree { id: number; x: number; y: number; tier: 1 | 2 | 3 }
export interface FarRock { id: number; x: number; y: number; look: number }

/** Every numbered tree of the mountain, in the world's tiles (lib/town/world's MOUNTAIN_TREES, wherever this is asked). */
export const farTrees = (): FarTree[] => layMountain().filter((p) => p.kind === "mtree").map((p) => ({ id: p.id!, x: MOUNTAIN.x + p.u, y: MOUNTAIN.y + p.v, tier: p.tier! }));
/** Every rock of the mountain's foot, in the world's tiles (lib/town/world's MOUNTAIN_ROCKS). */
export const farRocks = (): FarRock[] => layMountain().filter((p) => p.kind === "mrock").map((p) => ({ id: p.id!, x: MOUNTAIN.x + p.u, y: MOUNTAIN.y + p.v, look: p.look! }));
/** The ancient cedar's corner and how many tiles it takes (lib/town/world's MOUNTAIN_AT.cedar). */
export const farCedar = (): { x: number; y: number; w: number; h: number } => ({ x: MOUNTAIN.x + ANCIENT.u, y: MOUNTAIN.y + ANCIENT.v, w: ANCIENT.w, h: ANCIENT.h });
