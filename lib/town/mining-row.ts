import { CAVE_SIZE, caveFloor } from "./cave";
import { CAVE_AT, cornerOf } from "./cave-state";
import { farRocks } from "./far-side";
import { MINING } from "./mining";
import { ALL, ELEMENTS, FORGE, GEM_FX, GEM_LEVELS, LEVELS, OPTIONS, SIX, OPTION_IDS, ORES, type OptionUse } from "./tools";
import { VEIN } from "./vein";

/**
 * Mining as the database is to read it (its catalog's `mining` row), and a floor of the cave as it is to keep one
 * (a row of `town_cave_days`). Made the way the blacksmith's row and the trees' are (lib/town/forge-row,
 * lib/town/trees' treesRow): every number its rules decide by, so that the database only looks a number up.
 *
 * - every knob of `MINING`, as it is named there (`foot` and `cave` are how likely a rock leaves fragments and how
 *   many, on the mountain's foot and in the cave);
 * - `ores`: the ores by their tier (the fragments a place's rocks leave are the tier's of its depth);
 * - `rest`: every so many floors is a resting floor; `depths`: the last floor of each depth but the deepest
 *   (lib/town/cave's `isRest` and `depthOf`, which the row is held to);
 * - `at`: where the cave's floors lie in the world (lib/town/cave-state's CAVE_AT), and a floor's side in tiles;
 * - `all`: the number that stands for "all of it" in a gem's steps;
 * - `vein`: every knob of a vein's game (`VEIN`, whole);
 * - `pick`: the pick as the miners' game reads it (what each plus is, each option of the pick's with its pool, its
 *   numbers and its count, what each gem does: lib/town/tools' own numbers, said here again as the trees' row says
 *   the axe's);
 * - `rocks`: every rock of the mountain's foot, as [number, x, y, look], in the world's tiles. The cave's own rocks
 *   are another layout each day, and are no row of the catalog: `caveLayout` below.
 *
 * No names and no words: what an option or a gem does is the game's own to read from the numbers.
 */
export const miningRow = () => ({
  ...MINING,
  ores: ORES,
  rest: 10, depths: [10, 20],
  at: { ...CAVE_AT, size: CAVE_SIZE },
  all: ALL,
  vein: VEIN,
  pick: {
    top: FORGE.top, milestones: FORGE.milestones, pools: FORGE.pools, sockets: FORGE.sockets, gemAtTop: FORGE.gemAtTop, gemLevels: GEM_LEVELS, cap: FORGE.cap,
    power: LEVELS.pick.power, strikes: LEVELS.pick.strikes, elements: ELEMENTS,
    opts: Object.fromEntries(OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly string[]).includes("pick")).map((id) => {
      const o = OPTIONS[id] as { pool: number; n: Readonly<Record<string, number>>; use?: OptionUse };
      return [id, { pool: o.pool, n: o.n, ...(o.use ? { use: o.use } : {}), ...(SIX[id] ? { six: SIX[id] } : {}) }];
    })),
    gems: Object.fromEntries(ELEMENTS.map((e) => [e, GEM_FX[e].pick])),
  },
  rocks: farRocks().map((r): [number, number, number, number] => [r.id, r.x, r.y, r.look]),
});

/**
 * A floor of the cave on a day, as the database keeps it: everything in the world's tiles, so that its rules need
 * nothing of how a floor is made.
 *
 * - `rocks`: each as [number, x, y, look] (3 has crystals in it), in the order the seed laid them;
 * - `open`: every tile of the floor's square, row by row from its corner (the catalog's `mining.at` says where that
 *   is and how long a row): `0` rock, `1` floor one may stand on, `2` floor with something standing on it;
 * - `up`, `arrive`, `down`: the ladder come down by, where one stands on arriving, the layout's own ladder down;
 * - on a resting floor, `lift` and `liftAt`: the lift, and the tile one takes it from.
 *
 * The chambers and the tunnels are the map's own to draw and are not kept. Made by the site's server once a day for
 * each floor (as it writes the weather), never by a page: a page lays the same floor out for itself from the same
 * two numbers.
 */
export interface CaveLayout {
  rocks: Array<[id: number, x: number, y: number, look: number]>;
  open: string;
  up: [number, number]; arrive: [number, number]; down: [number, number];
  lift?: [number, number]; liftAt?: [number, number];
}
export function caveLayout(floor: number, day: number): CaveLayout {
  const f = caveFloor(floor, day), c = cornerOf(floor), at = ([u, v]: readonly [number, number]): [number, number] => [c.x + u, c.y + v];
  return {
    rocks: f.rocks.map((r): [number, number, number, number] => [r.id, c.x + r.u, c.y + r.v, r.look]),
    open: Array.from(f.open).join(""),
    up: at(f.up), arrive: at(f.arrive), down: at(f.down),
    ...(f.rest ? { lift: at(f.rest.lift), liftAt: at([f.rest.lift[0] + 1, f.rest.lift[1] + 1]) } : {}),
  };
}
