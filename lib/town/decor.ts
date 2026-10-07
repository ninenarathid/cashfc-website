import { FARM, FARM_PUMPKINS, KEEPERS, NORTH_WOOD, TOWN, placeOf, type Place, type Prop } from "./world";

/**
 * What Cash Town has only to look at, from pixel art that came drawn (the
 * owner's folder of 2026-10-05: "ช่วยอัพเกรด asset ในเมือง Cash town ด้วย asset ใน
 * โฟเดอร์นี้"; the pictures are in the scenery, by scripts/pixel/build-scenery.mjs's
 * READY): which of several pictures a prop is drawn as, what marks a gate, and
 * pumpkins.
 *
 * Nothing here opens or closes a tile, moves a prop or changes its kind: where
 * one may walk, and everything laid out from that (the insects' haunts, the
 * places to fish from, the forest's), is as it was. A page whose scenery was
 * built before a picture draws the prop's own, and none of the rest.
 */

/** A number from 0 to 1 that is a tile's own: the same on every screen, and nothing to do with how the maps were laid out. */
function chanceAt(x: number, y: number): number {
  let h = Math.imul(x + 613, 0x85ebca6b) ^ Math.imul(y + 157, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const inTown = (x: number, y: number) => x >= TOWN.x && x < TOWN.x + TOWN.w && y >= TOWN.y && y < TOWN.y + TOWN.h;

/**
 * Which picture a prop is drawn as, where its kind has more than one. A tree
 * in three bears apples inside the town and round the farm, one in seven out in
 * the town's countryside, none in the woods that close in on the way to the
 * forest, nor in the forest. Half the forest's stumps have toadstools at their
 * feet (two pictures of it), and a log in three is a short one. From the prop's
 * own tile; and only a picture: the prop is what it was.
 */
export function artOf(p: Pick<Prop, "kind" | "x" | "y">): string {
  const k = chanceAt(p.x, p.y);
  if (p.kind === "tree") {
    const place = placeOf(p.x, p.y);
    if (place === "farm") return k < 1 / 3 ? "appletree" : "tree";
    if (place === "town" && p.y >= NORTH_WOOD.h) return k < (inTown(p.x, p.y) ? 1 / 3 : 1 / 7) ? "appletree" : "tree";
    return "tree";
  }
  if (p.kind === "stump") return k < 1 / 4 ? "stumpCaps" : k < 1 / 2 ? "stumpMoss" : "stump";
  if (p.kind === "log") return k < 1 / 3 ? "logShort" : "log";
  return p.kind;
}

/**
 * How a gate is marked: the gateway that stands over it, and the ring of light
 * on the ground under that. The forest's way has a torii at both its ends and a
 * ring of worn stone; the farm's keeps its wooden gateway, over a white ring.
 */
export function gateLook(g: { from: Place; leads: Place }): { arch: "gateway" | "torii"; ring: "ring" | "ringWild" } {
  return g.from === "forest" || g.leads === "forest" ? { arch: "torii", ring: "ringWild" } : { arch: "gateway", ring: "ring" };
}
/**
 * Where a gate's ring lies: under its gateway. The town's east gate stands a tile and a half from where the map
 * ends with nothing beyond it, and a ring is wider than that: its ring lies half a tile nearer the town, all of it
 * on the ground.
 */
export function ringAt(g: { from: Place; leads: Place; arch: { x: number; y: number } }): { x: number; y: number } {
  return g.from === "town" && g.leads === "farm" ? { x: g.arch.x - 0.5, y: g.arch.y } : g.arch;
}

/**
 * A pumpkin, or a few: where its foot is, and which picture. `carved` ones have
 * a face cut in one of them: they are out only in their season, and lit from
 * inside once the lamps are (`face` is where, from the foot, in the picture's
 * own pixels).
 */
export interface Decor { art: "jacko" | "jacko2" | "pumpkin" | "pumpkin2"; x: number; y: number; mirror?: boolean; carved?: boolean }
/** Where each carved picture's face is from its foot, in its own pixels: across (as drawn, not mirrored) and up. */
export const FACES: Record<"jacko" | "jacko2", [number, number]> = { jacko: [15, 16], jacko2: [10, 16] };

/**
 * The pumpkins. Each sits on a tile that something already closes, a little
 * to one side of what stands there: nobody walks through one, and no tile
 * opens or closes for it (decor.test.ts holds every one to that). Carved ones
 * about the town, by the plaza's four lamps and the two shopkeepers; great ones
 * on the farm all year: one in each quarter, in the middle of the tile a
 * scarecrow stood on until the owner had those taken away (2026-10-07; the
 * tile is closed for the pumpkin now, lib/town/world's FARM_PUMPKINS), and by
 * the hay at its gate.
 */
export const DECOR: Decor[] = [
  { art: "jacko", x: 26.8, y: 26.72, carved: true },
  { art: "jacko2", x: 37.8, y: 26.72, carved: true, mirror: true },
  { art: "jacko2", x: 26.8, y: 37.72, carved: true },
  { art: "jacko", x: 37.8, y: 37.72, carved: true, mirror: true },
  { art: "jacko", x: KEEPERS[0].tiles[1][0] + 0.8, y: KEEPERS[0].tiles[1][1] + 0.85, carved: true },
  { art: "jacko2", x: KEEPERS[1].tiles[1][0] + 0.8, y: KEEPERS[1].tiles[1][1] + 0.85, carved: true, mirror: true },
  ...FARM_PUMPKINS.map(([u, v], i): Decor => ({ art: i % 2 ? "pumpkin2" : "pumpkin", x: FARM.x + u + 0.55, y: FARM.y + v + 0.6, mirror: i > 1 })),
  ...([[3, 20], [2, 24]] as const).map(([u, v], i): Decor => ({ art: i % 2 ? "pumpkin" : "pumpkin2", x: FARM.x + u + 0.88, y: FARM.y + v + 0.86 })),
];

/** Whether carved pumpkins are out: from the first of October to the second of November, by Bangkok's calendar. */
export function carving(ms: number): boolean {
  const d = new Date(ms + 7 * 3_600_000), month = d.getUTCMonth() + 1;
  return month === 10 || (month === 11 && d.getUTCDate() <= 2);
}
