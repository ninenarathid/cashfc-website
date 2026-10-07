/**
 * Cash Town's ground: the map, where you can walk, how to get there, and how
 * loud somebody is from where you stand.
 *
 * Pure functions, so the rules of the town can be tested without a browser
 * and every client works them out the same way. A move is sent as one
 * destination, not a stream of positions (the Zheza way): each client finds
 * the same path on the same map and walks the avatar along it, which is why
 * the path has to come from here and not from whoever happens to be drawing.
 *
 * Coordinates are tiles, continuous: tile (i, j) covers [i, i+1) × [j, j+1)
 * and its centre is (i + 0.5, j + 0.5). x runs down to the right on screen,
 * y down to the left; the isometric diamond is 2:1.
 */

// ── to come (a look-only preview, `next dev` only: see PREVIEW below) ── the mountain's foot and the cave, each laid out in its own file
import { CAVE_SIZE, caveFloor, depthOf, hollowAt, type CaveFloor } from "./cave";
import { ANCIENT as CEDAR, GATE_ROWS, LOOKOUT as LOOKOUT_AT, MOUNTAIN_H, MOUNTAIN_W, MOUTH as MINE_MOUTH, MOUTH_AT, cliffAt, closedOf, layMountain, mountainGround } from "./mountain";

export const COLS = 64;
export const ROWS = 64;
/** One tile on screen, before the town is scaled to fit. */
export const TILE_W = 64;
export const TILE_H = 32;

/** Walking speed, tiles a second. */
export const SPEED = 3.5;

/**
 * Deliveries a second the whole room's steps may cost, at most: half the
 * project's realtime allowance (500 a second, shared with the party board and
 * the bell), even if everybody clicks as fast as they can.
 */
export const MOVE_BUDGET = 250;

/**
 * How often somebody's steps may be announced, ms, with `n` people in the
 * room. Every announcement is delivered to the n − 1 others, so a room of n
 * all clicking nonstop costs n × (n − 1) × 1000 / every deliveries a second.
 * A step after standing still goes at once; only a burst of taps waits, and
 * then sends the last one.
 */
export function moveEvery(n: number): number {
  return Math.max(300, Math.ceil((n * (n - 1) * 1000) / MOVE_BUDGET));
}

/**
 * Whether distance matters to the voice. Off for now (the owner's call on
 * 2026-10-01): one room where everybody in voice hears everybody at full
 * volume, while the FC finds out how many one room holds. On, a voice fades
 * with distance (NEAR, FAR) and lines open nearest first (pickLines), the way
 * Gather works; everything for that is kept below.
 */
export const PROXIMITY = false;

/**
 * Hearing, when PROXIMITY is on: full volume within NEAR tiles, fading to
 * nothing at FAR. Close enough to feel like walking up to somebody, far enough
 * that two people on either side of the plaza are not in each other's ear.
 */
export const NEAR = 3.5;
export const FAR = 7;

export type Vec = { x: number; y: number };

export interface Building {
  id: string;
  /** Where it leads: a page of the site, so the town is a front door to it. */
  href: string;
  name: { th: string; en: string };
  /** Footprint in tiles, top corner (x, y), size w × h. Not walkable. */
  x: number; y: number; w: number; h: number;
  /** Wall height in unscaled pixels. */
  height: number;
  /** Roof, right wall, left wall. */
  colors: [string, string, string];
  icon: string;
}

/**
 * Buildings that lead to pages of the site. None for now (the owner's call,
 * 2026-10-02: the four houses of the first map went, for a bigger open town);
 * kept so a building can come back as a front door to a page.
 */
export const BUILDINGS: Building[] = [];

/**
 * The map (64 × 64 tiles, the owner's call on 2026-10-02: "ขอ Map ใหญ่กว่านี้อีก
 * ส่วนแรกจะเป็นเมืองเริ่มต้น"): the starter town in the middle, around a cobbled
 * plaza with the fountain, and the countryside all round it. Two paths cross the
 * whole map through the plaza.
 */
export const PLAZA = { x: 26, y: 26, w: 12, h: 12 };
/** The fountain in the middle of the plaza: a landmark, and not walkable. */
export const FOUNTAIN = { x: 31, y: 31, w: 2, h: 2 };
/** The starter town: lamps, benches and planters inside; woods and meadows outside. */
export const TOWN = { x: 16, y: 16, w: 32, h: 32 };
/**
 * Popoto Shop, being built, popoto workers on site: stage 1 of 3 was the
 * foundation; stage 2 (the owner, 2026-10-03: "ขึ้น state 2 ได้เลย") is the
 * timber frame and walls up, the roof's rafters going on. Where things will be
 * bought; not walkable. The stage picks the picture (scenery `shop<stage>`).
 */
export const SHOP = { x: 39, y: 24, w: 3, h: 3, stage: 2 };
/**
 * The Popoto Board: a big notice board just north of the plaza, in the middle
 * of the map, telling the town how the building work goes and taking votes for
 * the next building (supabase v103). Not walkable; a tap on it opens it.
 */
export const BOARD = { x: 23, y: 23, w: 2, h: 2 };
/**
 * The storage box (the owner, 2026-10-05: "ช่วยทำ กล่องเก็บของ มาตั้งไว้กลางเมือง"): a big chest in the plaza, in front of
 * the fountain as the screen sees it, at the near corner of its ring of benches. Not walkable. Whoever stands by it
 * keeps things of their own in it (lib/town/box).
 */
export const STOREBOX = { x: 34, y: 34 };
/** Whether a tile is within so many steps of the storage box (and is not the box itself). */
export const byStorebox = (tx: number, ty: number, reach: number) => {
  const far = Math.max(Math.abs(tx - STOREBOX.x), Math.abs(ty - STOREBOX.y));
  return far >= 1 && far <= reach;
};
/**
 * The fishing deck (the owner, 2026-10-03: "ลานตกปลา แถวแม่น้ำด้านซ้าย", then
 * "ไม่อยู่จุดที่เป็นทางเดิน แต่อยู่ระหว่างทางเดิน ซ้ายบน ซ้ายล่าง ทำให้ใหญ่พอ จะทำให้หลายคน
 * ตกปลาพร้อมกันได้", then "ขอใหญ่กว่านี้ 2 เท่า ตอนสร้างเสร็จขอมีทางเดินขึ้นไปได้ (บันได
 * เล็กๆ)"): on the town's bank of the river, straight left of the plaza on the
 * screen and below its left corner, between where the west path and the south
 * path meet the water and on neither. A long platform, its left third out over
 * the river, two jetties further out, and the frame of a few steps up to it at
 * its right corner, beside the south path. At its first stage it is two thirds
 * boarded, with popoto builders hurrying at it, and nobody walks on it yet.
 *
 * `post` is where the platform's left corner post stands, in the water: the
 * picture is stood by it. `tiles` are the ones the platform closes: those
 * whose middles are inside its four corners, which are measured from that post
 * in the picture (the jetties are over water). The stage picks the picture
 * (scenery `pier<stage>`).
 *
 * At its second stage it is finished, and walked on. Its floor is drawn above
 * where its posts stand, so the tiles somebody walks on are the ones whose
 * middles the picture's boards are drawn at (`deck`: the floor, less the racks,
 * barrels and bench along its far railing, and its two jetties), not the ones
 * its posts stand on: those (`tiles`) stay closed where no boards are drawn
 * over them, and so does the row behind its far railing, where anybody would
 * be drawn in front of what stands on the deck. It is walked onto and off only
 * by its steps (`steps`: the deck's tile at their top and the ground's at
 * their foot; findPath crosses nowhere else). Where somebody may fish from,
 * on it and off it, is fishFrom's to say.
 *
 * Finished only in `next dev` for now (the owner, 2026-10-03: "พร้อมกับ ลานตกปลา
 * ที่เสร็จแล้ว เฉพาะใน dev"): a production build's is still the building site.
 */
export const PIER = (() => {
  const post = { x: 18.4, y: 44.5 };
  /** The tiles whose middles are inside four corners (given round the same way as the post's). */
  const middles = (quad: Vec[]) => {
    const inside = (px: number, py: number) => quad.every((a, i) => {
      const b = quad[(i + 1) % quad.length];
      return (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x) <= 0;
    });
    const out: Array<[number, number]> = [];
    for (let y = Math.floor(post.y) - 8; y <= Math.floor(post.y) + 1; y++) for (let x = Math.floor(post.x) - 4; x <= Math.floor(post.x) + 12; x++) {
      if (inside(x + 0.5, y + 0.5)) out.push([x, y]);
    }
    return out;
  };
  // where its posts stand: the platform's corners, round from the post: its near corner, its right corner, its far corner
  const tiles = middles([post, { x: post.x + 10.4, y: post.y + 0.25 }, { x: post.x + 8.9, y: post.y - 6.1 }, { x: post.x - 2.4, y: post.y - 6.55 }]);
  // its floor as the finished picture draws it, round the same way; less the far railing's racks, barrels and bench,
  // and the post at the head of the steps
  const floor = middles([{ x: 17.65, y: 43.63 }, { x: 27.75, y: 43.6 }, { x: 27.6, y: 38.4 }, { x: 15.87, y: 38.34 }])
    .filter(([x, y]) => !(y === 38 && x >= 17) && !(x === 27 && y === 39));
  // the upper jetty, out to the west, and the lower one, out to the south: a tile wide
  const jetties: Array<[number, number]> = [[12, 39], [13, 39], [14, 39], [15, 39], [19, 44], [19, 45], [19, 46]];
  return {
    stage: process.env.NODE_ENV !== "production" ? 2 : 1, post, tiles,
    deck: [...floor, ...jetties],
    steps: { top: [27, 40] as [number, number], foot: [28, 40] as [number, number] },
  };
})();
/**
 * The cooking yard (the owner, 2026-10-03: "ลานทำอาหาร พวกโต๊ะ ที่ทำครัว … มี 2
 * state พอ", then "ขอใหญ่กว่านี้ 2 เท่า และ วางแนวขวาง ตอนนี้เฉียงๆ", "อย่าทับทางเดิน
 * ด้วย"), going up below the plaza on the screen, between the east path and
 * the south and clear of both. It lies across the screen and faces the viewer,
 * as the stall and the bank counter do, rather than along the tiles: four
 * stoves along its back, worktables, a ring of stones for a big pot and
 * dining tables on a flagstone floor, twice as long and twice as deep as the
 * first one drawn. Stage 1 is the building site, with popoto builders at it;
 * stage 2 will be the yard itself, where members cook with cookware of their
 * own (bought from the uncle).
 *
 * `foot` is where the picture's ground point stands: the middle of its front,
 * by the way in. `tiles` are the ones it closes: those whose middles are
 * inside its kerb's four corners, which are measured from that point in the
 * picture's own pixels (`at`: a tile is 64 of them across the screen and 32
 * down it), and the one its sign post stands on. `near` is the ground about
 * it that is kept clear of trees: a little to each side and behind, and far
 * enough in front that no tree stands over its near kerb. `ways` are its two
 * ways in: through its front kerb, and through the back one, from the north.
 * The stage picks the picture (scenery `kitchen<stage>`).
 *
 * At its second stage it is finished (the owner, 2026-10-03: "ช่วยทำให้ ลานทำอาหาร
 * เสร็จเลย"), in `next dev` for now, like the deck. Its floor is walked on
 * (`floor`: the tiles inside the kerb that nothing stands on, and the two
 * tiles of its ways in, through which alone it is walked into and out of);
 * three stoves, two worktables, a fire under a tripod, two dining tables with
 * their benches and a water jar with a washing tub stand on it (`stands`, in
 * the picture's own pixels). `places` are where somebody stands to cook (by
 * a stove, a worktable or the fire) and `wash` where to wash up (by the tub).
 *
 * The picture is drawn from the front, not along the map's tiles, so what
 * stands on it is kept as a box of the picture and `rise`, how much of the
 * box's top is its height and not ground: somebody may stand there, behind it,
 * and the map draws the thing over them (`stands` again, each as far forward
 * as its foot). And the floor is walked straight up, down and across the
 * screen (a tile's corner neighbours), between things that stand closer than
 * the map's own rule for corners would let anybody through.
 */
export const KITCHEN = (() => {
  const foot = { x: 48.75, y: 50.75 };
  /** A point of the picture, in its pixels from the ground point (right, down), as a point of the map. */
  const at = (px: number, py: number): Vec => ({
    x: foot.x + (py / (TILE_H / 2) + px / (TILE_W / 2)) / 2,
    y: foot.y + (py / (TILE_H / 2) - px / (TILE_W / 2)) / 2,
  });
  /** And a point of the map in the picture's pixels. */
  const px = (x: number, y: number) => ({ x: (x - y - (foot.x - foot.y)) * (TILE_W / 2), y: (x + y - (foot.x + foot.y)) * (TILE_H / 2) });
  // the kerb's corners: back left, back right, front right, front left (it is a little narrower at the back)
  const quad = [at(-343, -256), at(346, -256), at(375, -15), at(-376, -15)];
  const inside = (x: number, y: number) => {
    let left = 0, right = 0;
    quad.forEach((a, i) => {
      const b = quad[(i + 1) % quad.length], side = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
      if (side > 0) left++; else if (side < 0) right++;
    });
    return !(left && right);
  };
  const xs = quad.map((q) => q.x), ys = quad.map((q) => q.y);
  const tiles: Array<[number, number]> = [];
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    if (inside(x + 0.5, y + 0.5)) tiles.push([x, y]);
  }
  const sign = at(45, 0);
  tiles.push([Math.floor(sign.x), Math.floor(sign.y)]);
  // (and further still before the way in, which is a little left of the ground point: nothing stands in the way to it)
  const near = (x: number, y: number) => {
    const p = px(x + 0.5, y + 0.5);
    return (Math.abs(p.x) < 420 && p.y > -290 && p.y < 100) || (Math.abs(p.x + 19) < 100 && p.y >= 100 && p.y < 200);
  };
  // its two ways in, through the front kerb and (the owner, 2026-10-03: "อยากให้มีทางเข้าทางทิศเหนือด้วย") through the
  // back one, between the second stove and the third: where each is, for when the yard is walked into
  const ways = { south: at(-19, -15), north: at(-34, -256) };
  // The finished yard, in the picture's pixels from its ground point: the floor inside the kerb (round like `quad`),
  // and what stands on it (left, top, right, bottom).
  const inner = [[-341, -236], [326, -236], [350, -37], [-350, -37]];
  const stands: Array<{ kind: "stove" | "table" | "fire" | "dining" | "wash"; box: [number, number, number, number]; rise: number }> = [
    { kind: "stove", box: [-279, -258, -202, -199], rise: 0 }, { kind: "stove", box: [-175, -258, -100, -199], rise: 0 }, { kind: "stove", box: [30, -258, 110, -199], rise: 0 },
    { kind: "table", box: [-205, -192, -93, -144], rise: 20 }, { kind: "table", box: [63, -192, 174, -144], rise: 20 },
    { kind: "fire", box: [-76, -177, 28, -94], rise: 22 },
    { kind: "dining", box: [-309, -139, -116, -39], rise: 12 }, { kind: "dining", box: [95, -139, 299, -39], rise: 12 },
    { kind: "wash", box: [213, -249, 329, -168], rise: 26 },
  ];
  const within4 = (p: Vec) => {
    let left = 0, right = 0;
    inner.forEach(([ax, ay], i) => {
      const [bx, by] = inner[(i + 1) % inner.length], side = (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax);
      if (side > 0) left++; else if (side < 0) right++;
    });
    return !(left && right);
  };
  /** How far a point is outside a box (0 inside it), in the picture's pixels. */
  const outside = (p: Vec, [x0, y0, x1, y1]: [number, number, number, number]) => Math.max(x0 - p.x, p.x - x1, y0 - p.y, p.y - y1, 0);
  const way = [ways.south, ways.north].map((w): [number, number] => [Math.floor(w.x), Math.floor(w.y)]);
  const floor: Array<[number, number]> = [...way], places: Array<{ at: [number, number]; kind: "stove" | "table" | "fire" }> = [], wash: Array<[number, number]> = [];
  for (const [x, y] of tiles) {
    const p = px(x + 0.5, y + 0.5);
    // (what stands there takes the ground under it: its box, less its height at the top)
    if (way.some(([wx, wy]) => wx === x && wy === y) || !within4(p) || stands.some((st) => outside(p, [st.box[0], st.box[1] + st.rise, st.box[2], st.box[3]]) <= 0)) continue;
    floor.push([x, y]);
    // somebody standing within a step of a stove, a worktable or the fire is at it; of the tub, can wash
    const by = stands.filter((st) => st.kind !== "dining").map((st) => ({ st, far: outside(p, st.box) })).filter((n) => n.far < 34).sort((a, b) => a.far - b.far)[0]?.st;
    if (by?.kind === "wash") wash.push([x, y]);
    else if (by && by.kind !== "dining") places.push({ at: [x, y], kind: by.kind });
  }
  // the posts of its front kerb, which stand up before whoever is on the floor behind them (and the sign post)
  const posts: Array<[number, number, number, number]> = [[-378, -62, -345, -8], [-90, -57, -56, -8], [18, -60, 72, 4], [345, -62, 378, -8]];
  // The places to sit at its two dining tables (the owner, 2026-10-03: "ช่วยทำให้ เก้าอี้ ที่โต๊ะใหญ่ ในลานทำอาหาร สามารถนั่งได้ และ
  // ทานอาหารได้"): three to a bench, a bench along each long side of a table. Each is where somebody sitting there is
  // drawn, in the picture's pixels and as a point of the map: on the far bench facing the viewer, behind the table;
  // on the near one with their back to the viewer. `stand` is the floor tile they walk to before sitting down, the
  // nearest there is: behind the far bench, and for the near bench at its end, level with it (there is no floor
  // before it, and from behind the table it would be a jump over the table). `tops` are the tables' own tops, drawn
  // again over whoever sits behind them.
  //
  // The near benches were not sat on for three days (the owner, 2026-10-04, of somebody sitting there with their back
  // to the viewer: "นั่งมุมนี้ ถอดออกไปก่อน ทำให้นั่งไม่ได้ก่อน เราจะค่อยแก้ทีหลัง"), and are again since 2026-10-07 ("ต้องทำให้
  // เก้าอี้ด้านล่างกลับมานั่งได้ ช่วยแก้บั๊คที่ขาตัวละครบั๊คตอนนั่งหันหลังด้วย": whoever sits there is drawn as lib/town/pixeldoll's
  // `perch`). The far benches' places come first, as they were numbered while they were the only ones: a page built
  // before the near ones knows the same six by the same numbers, and takes anybody on a near one to be standing.
  const SIDES = [false, true];
  const seats = SIDES.flatMap((back) => [[-270, -214, -158], [141, 197, 253]].flatMap((xs, table) => xs.map((x) => {
    const p = { x, y: back ? -64 : -131 };
    const stand = floor.map((tile) => { const c = px(tile[0] + 0.5, tile[1] + 0.5); return { tile, c, far: Math.hypot(c.x - p.x, c.y - p.y) }; })
      .filter(({ c }) => !back || (c.y > -96 && c.y < -40)).sort((a, b) => a.far - b.far)[0].tile;
    return { at: at(p.x, p.y), px: p.x, py: p.y, back, table, stand };
  })));
  const tops: Array<[number, number, number, number]> = [[-309, -127, -116, -84], [95, -127, 299, -84]];
  // The feast table (the owner, 2026-10-07, of pots of food left standing all over the town: lib/town/cooking). The
  // two dining tables are one table to the village: what is set on it is reached from anywhere on the yard's floor.
  // `served` is where a pot is drawn on a top, in the picture's pixels, a place of the left table and then one of the
  // right, so that both fill alike, the middle of a top before its ends. `tile` is a tile of the floor between the two tables: where such a pot is said to
  // stand to a page built before there was a feast table, which draws and reaches every pot by its tile.
  // `over` is the middle of each top, for the few words over it; `door` a point over the house's doorway, for the same
  // words where the yard is seen from outside, under its roof.
  const served = [1, 2, 0, 3].flatMap((i) => tops.map(([x0, y0, x1], table) => {
    const p = { px: Math.round(x0 + 30 + (i * (x1 - x0 - 60)) / 3), py: y0 + 26 };
    return { ...p, at: at(p.px, p.py), table };
  }));
  const feast = {
    served,
    over: tops.map(([x0, y0, x1]) => at((x0 + x1) / 2, y0)),
    door: at(1, -98),
    tile: floor.map((tile) => { const c = px(tile[0] + 0.5, tile[1] + 0.5); return { tile, far: Math.hypot(c.x + 10, c.y + 78) }; }).sort((a, b) => a.far - b.far)[0].tile,
  };
  // What burns and what glows (the owner, 2026-10-03: "ไฟตรงกลางลานอาหาร ช่วยทำให้มี อนิเมชัน และส่องสว่างได้จริงๆ ให้ บรรยากาศ cozy ใน
  // ตอนค่ำๆ"), in the picture's pixels: the camp fire's foot and the stoves' mouths, in the yard; and, of the house it is
  // from outside, its two lanterns, its two windows and its doorway.
  const lights = {
    fire: [-24, -124] as [number, number],
    mouths: [[-242, -206], [-137, -206], [68, -206]] as Array<[number, number]>,
    lanterns: [[-74, -106], [77, -106]] as Array<[number, number]>,
    windows: [[-248, -127, -172, -68], [172, -127, 249, -68]] as Array<[number, number, number, number]>,
    door: [-46, -93, 49, -34] as [number, number, number, number],
  };
  return { stage: process.env.NODE_ENV !== "production" ? 2 : 1, foot, tiles, near, ways, way, floor, stands, posts, places, wash, seats, tops, feast, lights };
})();
/** A place at one of the cooking yard's tables is told to the room as this much more than its number (a bench of the town's is told by its own number). */
export const YARD_SEATS = 500;
/** The place at a table that somebody's `sit` names, if it names one. */
export const yardSeat = (sit: number | undefined) => (KITCHEN.stage === 2 && sit !== undefined && sit >= YARD_SEATS ? KITCHEN.seats[sit - YARD_SEATS] : undefined);
/**
 * The two who keep shop in town (the owner, 2026-10-03), in front of the Popoto
 * Shop while it is being built: the uncle, who sells tools, seeds and bait from
 * his stall, and the banker, who changes popoto into Popoto coins at his
 * counter. `stand` is where the stall or counter stands, `at` where the popoto
 * does, in front of it; `tiles` are the ones they close.
 */
export interface Keeper { id: "uncle" | "banker"; stand: Vec; at: Vec; tiles: Array<[number, number]> }
export const KEEPERS: Keeper[] = [
  { id: "uncle", stand: { x: 45.5, y: 27.6 }, at: { x: 45.0, y: 28.5 }, tiles: [[45, 27], [46, 26], [44, 28], [45, 28]] },
  { id: "banker", stand: { x: 47.5, y: 25.6 }, at: { x: 47.3, y: 26.5 }, tiles: [[47, 25], [48, 24], [47, 26]] },
];

/* ── to come: a look-only preview, in `next dev` only ───────────────────── */

/**
 * Whether what is to come is here: the bridge over the river, the blacksmith, the mountain's foot and the cave
 * under it (the owner, 2026-10-08: he wants to see the maps and their pictures before any game is built on them).
 * In `next dev` only. A production build has none of it, and neither has a test, where the town is as its members
 * have it: what is to come is tested by a test that says so (lib/town/preview.test.ts).
 */
export const PREVIEW = process.env.NODE_ENV === "development";
/**
 * Whether something is being laid out as the town was before any of this (see asBuilt): the bridge is not walked
 * on then and the blacksmith closes no tile, so that what the database keeps a copy of (the insects' haunts, the
 * places to fish from) comes out as it always did.
 */
let asWas = false;
/**
 * The bridge over the river, where the west path meets the water. The river runs straight down the screen there
 * and the path's two ends face each other across it, so the bridge lies straight across the screen: along tiles
 * whose x + y is the same.
 *
 * The village builds it, a span at a time, from the town's bank outwards (a deed of its own, not built here):
 * `spans` is how many are laid, 0 for none and 6 for the whole of it. It is walked on only once it is whole and
 * `open` says so: that it is drawn does not open it, and until then the gate beyond it leads nowhere. Whole and open
 * in the preview (`setBridge`, and `&townBridge=` in `next dev`, show the rest).
 *
 * `tiles` are its six spans' tiles, the town's first: each span the tile on the bridge's middle line with the one
 * behind it and the one before it as the screen sees them (the floor is three rows of tiles deep, so that a walker
 * crosses it in one straight line). Ten of the eighteen are water: the first span stands on the town's bank and the
 * last on the far one. `foot` is the tile of the town's bank the first span is laid from. `ends` are the middles of
 * its floor's two ends, the town's first: the picture is stood between them.
 */
export const BRIDGE = {
  spans: 6, open: true,
  foot: [11, 27] as [number, number],
  tiles: PREVIEW ? Array.from({ length: 6 }, (_, i): Array<[number, number]> => [[10 - i, 28 + i], [9 - i, 28 + i], [10 - i, 29 + i]]) : [],
  ends: [{ x: 11, y: 28 }, { x: 5, y: 34 }] as [Vec, Vec],
};
const bridgeAt = new Set(BRIDGE.tiles.flat().map(([x, y]) => `${x},${y}`));
/** Whether the bridge is walked on here now: whole, and opened. */
export const bridgeOpen = () => PREVIEW && !asWas && BRIDGE.open && BRIDGE.spans >= BRIDGE.tiles.length;
/** How much of the bridge there is, and whether it is opened (it cannot be, short of whole). Each page works out where one may walk from this, as from setBuilt. */
export function setBridge(spans: number, open = true) {
  BRIDGE.spans = Math.max(0, Math.min(BRIDGE.tiles.length, Math.floor(spans)));
  BRIDGE.open = open && BRIDGE.spans >= BRIDGE.tiles.length;
}
/**
 * The blacksmith: a third popoto keeping shop, beyond the banker in the row before the Popoto Shop. He will smelt
 * ore, forge tools and set gems; for now he only talks (lib/town/smith). `stand` is where his forge stands (the
 * furnace, the anvil, the tub and the rack, one picture facing the viewer as the stall and the counter do), `at`
 * where he does, before it and to its right, by the anvil; `board` and `sign` are the notice board beside him and the post his sign hangs from, behind the forge;
 * `fire` is the furnace's mouth, from the forge's ground point in its picture's own pixels (across, up), which glows.
 * `tiles` are the ones they close. Not one of KEEPERS yet: he keeps no shop, and nothing of the town's was laid out
 * round him.
 */
export const SMITH = {
  id: "smith" as const,
  stand: { x: 50.2, y: 24.1 }, at: { x: 51.1, y: 23.7 }, board: { x: 52.94, y: 23.25 }, sign: { x: 50.54, y: 23.26 },
  fire: [-19, 30] as [number, number],
  tiles: (PREVIEW ? [[50, 24], [49, 24], [50, 23], [51, 23], [52, 23]] : []) as Array<[number, number]>,
};
const smithAt = new Set(SMITH.tiles.map(([x, y]) => `${x},${y}`));

/**
 * A river round the left of the map (the owner's call, 2026-10-02: "แม่น้ำขนาด
 * กลางที่ยังไม่สามารถข้ามได้"), with sandy banks. It runs down the screen, so it
 * cuts the west and the south paths about as far from the plaza as each other;
 * the far side waits for a bridge. On screen the left is y − x, and down is
 * x + y, so the river's middle wanders in y − x as it goes down.
 *
 * Twice as wide since 2026-10-03 (the owner: "เพิ่มขนาดแม่น้ำความกว้างเป็นสองเท่าจาก
 * ตอนนี้"), six tiles of water and more. It grew away from the town: the town's
 * own bank is exactly where it was, and the far bank a good three tiles further
 * off, so its middle moved half the old width that way.
 */
/** Half the water's width, and the sand's beyond it, in tiles of y − x. */
const RIVER_HALF = 3.2, BANK = 1.6;
/** Half the river's width as the town was laid out. */
const RIVER_THEN = 1.6;
export function riverMiddle(t: number): number {
  return 24 + (RIVER_HALF - RIVER_THEN) + 2.4 * Math.sin(t / 9) + 1.2 * Math.sin(t / 4.3 + 1);
}
/** How far a point is across the river from its middle, in tiles of y − x. */
const acrossRiver = (x: number, y: number) => Math.abs(y - x - riverMiddle(x + y - 1));
/** Tiles, by their middles: water, and the sandy bank beside it. */
const isWater = (x: number, y: number) => acrossRiver(x + 0.5, y + 0.5) < RIVER_HALF;
const isBank = (x: number, y: number) => !isWater(x, y) && acrossRiver(x + 0.5, y + 0.5) < RIVER_HALF + BANK;
/**
 * The river and its banks as they were when the town was laid out, half as
 * wide. The layout (PROPS) still keeps clear of that river, and what it put
 * where the water is now is taken away afterwards: so nothing else in the town
 * moved when the river widened.
 */
const wetThen = (x: number, y: number) => Math.abs(y - x - (riverMiddle(x + y) - (RIVER_HALF - RIVER_THEN))) < RIVER_THEN + BANK;

/**
 * The paths (the owner's call, 2026-10-02: "ทางเดินให้ดูธรรมชาติกว่านี้ ตอนนี้มัน
 * ดูตรงเกินไป"): four dirt paths leave the plaza's four sides, straight at its
 * mouth and wandering more the further they go, a little wider here and a
 * little narrower there. They are shapes, not tiles: the ground is drawn from
 * them point by point, so a bend is a curve on screen; a tile is path when its
 * middle is.
 */
const MOUTH = 32;
/** 0 at the plaza's side, 1 from seven tiles out: how much a path may wander. */
function bend(d: number): number {
  const k = Math.min(1, Math.max(0, d / 7));
  return k * k * (3 - 2 * k);
}
/** Where a path's middle is, across it, at a point along it. */
function pathMiddle(along: number, out: number, seed: number): number {
  return MOUTH + bend(out) * (2.4 * Math.sin(along / 6.2 + seed) + 0.9 * Math.sin(along / 2.6 + seed * 2.3));
}
/** Half a path's width at a point along it. */
function pathHalf(along: number, seed: number): number {
  return 1 + 0.16 * Math.sin(along / 3.1 + seed) + 0.07 * Math.sin(along * 1.7 + seed);
}
/** The four paths: which way each runs, and its own shape. */
const ARMS = [
  { dir: "N", seed: 1.3 }, { dir: "S", seed: 4.1 }, { dir: "W", seed: 2.2 }, { dir: "E", seed: 5.7 },
] as const;
type Arm = (typeof ARMS)[number];
/** A point's place on an arm: how far along, how far out of the plaza, and across. */
function onArm(arm: Arm, x: number, y: number): { along: number; out: number; across: number } | null {
  const P0 = PLAZA.x, P1 = PLAZA.x + PLAZA.w;
  switch (arm.dir) {
    case "N": return y < P0 ? { along: y, out: P0 - y, across: x } : null;
    case "S": return y >= P1 ? { along: y, out: y - P1, across: x } : null;
    case "W": return x < P0 ? { along: x, out: P0 - x, across: y } : null;
    case "E": return x >= P1 ? { along: x, out: x - P1, across: y } : null;
  }
}
/** A short trail off the plaza, over to the shop's plot. (The Popoto Board stands on the grass, no path to it: the owner's call.) */
const TRAILS: Array<[Vec, Vec, number]> = [
  [{ x: 40.5, y: 26.8 }, { x: 37.4, y: 29.2 }, 0.7],
];
function nearSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Whether a point (not a tile) is on a path. */
function pathAt(x: number, y: number): boolean {
  for (const arm of ARMS) {
    const a = onArm(arm, x, y);
    if (a && Math.abs(a.across - pathMiddle(a.along, a.out, arm.seed)) < pathHalf(a.along, arm.seed)) return true;
  }
  for (const [a, b, w] of TRAILS) if (nearSegment({ x, y }, a, b) < w) return true;
  return false;
}

/** Which way something faces, as the screen sees it: down-right, down-left, up-right, up-left. */
export type Facing = "SE" | "SW" | "NE" | "NW";
/** The tile in front of something facing that way (where you stand to sit on a bench). */
export const FRONT: Record<Facing, Vec> = { SE: { x: 1, y: 0 }, SW: { x: 0, y: 1 }, NE: { x: 0, y: -1 }, NW: { x: -1, y: 0 } };

/** What stands about the town, drawn from the scenery picture (lib/town/scenery). */
export type PropKind = "tree" | "pine" | "bush" | "rock" | "lamp" | "bench" | "flowers" | "barrel" | "planter" | "signpost" | "bin" | "flowerbed"
  // the farm's own
  | "fence" | "well" | "shed" | "scarecrow" | "hay"
  // the plaza's storage box (lib/town/box)
  | "storebox"
  // the forest's own
  | "oak" | "birch" | "bamboo" | "fern" | "log" | "stump" | "boulder" | "campfire" | "logseat" | "tent"
  // the mountain's own, to come (lib/town/mountain): a tree of one of its three kinds at one of four ages, a rock, a signpost
  | "mtree" | "mrock" | "msign";
export interface Prop {
  kind: PropKind; x: number; y: number;
  /** Whether it stops a walker (flowers do not). */
  solid: boolean;
  /** Benches: the way the seat faces. */
  facing?: Facing;
  /** The mountain's trees: which kind (1 a pine, 2 an ironwood, 3 a moonwood). Its rocks: which of their looks. And the number that is a tree's or a rock's own (lib/town/mountain). */
  tier?: 1 | 2 | 3; look?: number; id?: number;
}

const within = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const isPlaza = (x: number, y: number) => within(x, y, PLAZA);
const isShop = (x: number, y: number) => within(x, y, SHOP);
const isRoad = (x: number, y: number) => !isPlaza(x, y) && !isWater(x, y) && !isBank(x, y) && pathAt(x + 0.5, y + 0.5);
/** A path's tile when the town was laid out, beside the narrower river (see wetThen). */
const roadThen = (x: number, y: number) => !isPlaza(x, y) && !wetThen(x, y) && pathAt(x + 0.5, y + 0.5);
const isBoard = (x: number, y: number) => within(x, y, BOARD);
const pierAt = new Set(PIER.tiles.map(([x, y]) => `${x},${y}`));
const isPier = (x: number, y: number) => pierAt.has(`${x},${y}`);
const deckAt = new Set(PIER.deck.map(([x, y]) => `${x},${y}`));
/** Whether a tile is one of the finished deck's boards (never, while it is being built). */
export const onDeck = (x: number, y: number) => PIER.stage === 2 && deckAt.has(`${x},${y}`);
/** The row behind the finished deck's far railing: nobody stands there, in front of what stands on the deck. */
const behindDeck = (x: number, y: number) => PIER.stage === 2 && y === 37 && x >= 16 && x <= 27;
/** Whether a step from one tile to the next goes up or down the deck's steps. */
const bySteps = (ax: number, ay: number, bx: number, by: number) => {
  const { top: [tx, ty], foot: [fx, fy] } = PIER.steps;
  return (ax === tx && ay === ty && bx === fx && by === fy) || (ax === fx && ay === fy && bx === tx && by === ty);
};
const kitchenAt = new Set(KITCHEN.tiles.map(([x, y]) => `${x},${y}`));
const isKitchen = (x: number, y: number) => kitchenAt.has(`${x},${y}`);
const yardAt = new Set(KITCHEN.floor.map(([x, y]) => `${x},${y}`)), yardWay = new Set(KITCHEN.way.map(([x, y]) => `${x},${y}`));
/** Whether a tile is the finished cooking yard's floor (never, while it is being built). */
export const onYard = (x: number, y: number) => KITCHEN.stage === 2 && yardAt.has(`${x},${y}`);
/** Whether a tile is of the yard's floor as it is when finished, whatever this page shows of it: what a rule that whoever keeps the game holds to asks (the database has the same tiles: the catalog's `cooking.feast.floor`). */
export const yardFloor = (x: number, y: number) => yardAt.has(`${x},${y}`);
/** Whether a step from one tile to the next crosses the yard's kerb: allowed only by one of its two ways in. */
const overKerb = (ax: number, ay: number, bx: number, by: number) =>
  onYard(ax, ay) !== onYard(bx, by) && !yardWay.has(onYard(ax, ay) ? `${ax},${ay}` : `${bx},${by}`);
const placeAt = new Map(KITCHEN.places.map((p) => [`${p.at[0]},${p.at[1]}`, p.kind])), washAt = new Set(KITCHEN.wash.map(([x, y]) => `${x},${y}`));
/** What somebody standing on a tile of the finished yard stands at: a stove, a worktable or the fire (a place to cook), or the washing tub; or nothing. */
export const yardPlace = (x: number, y: number): "stove" | "table" | "fire" | "wash" | null =>
  (KITCHEN.stage !== 2 ? null : washAt.has(`${x},${y}`) ? "wash" : placeAt.get(`${x},${y}`) ?? null);
/** The deck's plot as a rectangle: the box round its tiles. */
const PIER_BOX = (() => {
  const xs = PIER.tiles.map(([x]) => x), ys = PIER.tiles.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
})();
/** A site's plot and a step round it, on the sides people see it from: no tree, bush or rock stands in front of it. */
const bySite = (x: number, y: number) => [PIER_BOX].some((s) => within(x, y, { x: s.x - 1, y: s.y - 1, w: s.w + 3, h: s.h + 3 })) || KITCHEN.near(x, y);
const keeperAt = new Set(KEEPERS.flatMap((k) => k.tiles.map(([x, y]) => `${x},${y}`)));
const isKeeper = (x: number, y: number) => keeperAt.has(`${x},${y}`);

/**
 * Road works (the owner's call, 2026-10-02): the north and east paths, the two
 * the river does not cut, were closed where they leave the map, "กำลังซ่อม
 * ทางเดิน", with a barrier across each and a popoto worker waving a flag.
 * Where each stands: the path's middle a tile in from the map's edge.
 *
 * The east path's were finished on 2026-10-03, when the farm opened beyond it
 * (GATES), and the north path's on 2026-10-05, when the forest did: no path is
 * closed now. Where they stood is still kept (`closedThen`), since the town
 * was laid out round them.
 */
type Works = { x: number; y: number; arm: "N" | "E" };
const WORKS: Works[] = (["N", "E"] as const).map((dir) => {
  const arm = ARMS.find((a) => a.dir === dir)!;
  const along = dir === "N" ? 1.2 : COLS - 1.2, out = dir === "N" ? PLAZA.y - along : along - PLAZA.x - PLAZA.w;
  const across = pathMiddle(along, out, arm.seed);
  return dir === "N" ? { x: across, y: along, arm: dir } : { x: along, y: across, arm: dir };
});
export const ROADWORKS: Works[] = [];
/** The tiles road works close: across the path and a tile beyond each side, two deep. */
const tilesOf = (works: Works[]) => {
  const out = new Set<string>();
  for (const w of works) for (let d = -3; d <= 3; d++) for (let k = -1; k <= 0; k++) {
    const x = w.arm === "N" ? Math.floor(w.x) + d : COLS - 1 + k, y = w.arm === "N" ? k + 1 : Math.floor(w.y) + d;
    out.add(x + "," + y);
  }
  return out;
};
const closed = tilesOf(ROADWORKS);
const isClosed = (x: number, y: number) => closed.has(x + "," + y);
/** The tiles both road works closed when the town was laid out: the layout below still keeps clear of them, so nothing in the town moved when the east path opened. */
const closedThen = tilesOf(WORKS);

/** Which way faces the fountain from (x, y). */
function towardFountain(x: number, y: number): Facing {
  const dx = FOUNTAIN.x + FOUNTAIN.w / 2 - (x + 0.5), dy = FOUNTAIN.y + FOUNTAIN.h / 2 - (y + 0.5);
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "SE" : "NW";
  return dy > 0 ? "SW" : "NE";
}

/** The stretch of the town's map the north path leaves by: where its woods thicken towards the forest's gate. */
export const NORTH_WOOD = { x: 14, w: 38, h: 9 };

/**
 * The town's scenery, laid out by a fixed seed so every screen has the same
 * town: in town, lamps round the plaza and along the paths, benches facing the
 * fountain and the paths, planters at the plaza's corners; outside, woods and
 * meadows. Nothing grows on a path, the plaza or the shop's plot, nor right
 * beside them, so nobody's way is blocked.
 */
export const PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const taken = new Set<string>();
  const put = (kind: PropKind, x: number, y: number, solid = true, facing?: Facing) => {
    out.push(facing ? { kind, x, y, solid, facing } : { kind, x, y, solid }); taken.add(`${x},${y}`);
  };
  // The layout (the owner's call, 2026-10-02: "ไฟถนน ม้านั่ง ควรจัดให้ดีกว่านี้"): the plaza
  // has a lamp and a flower bed at each corner and benches round the fountain, facing it, a
  // bin at the end of each pair, and a signpost; each path is lit on both sides where it
  // leaves the plaza, then has two resting places on the way out of town, a bench facing
  // the path with a bin and flowers beside it and a lamp across the way, on alternate sides.
  for (const [x, y] of [[26, 26], [37, 26], [26, 37], [37, 37]]) put("lamp", x, y);
  for (const [x, y] of [[27, 27], [36, 27], [27, 36], [36, 36]]) put("flowerbed", x, y);
  for (const [x, y] of [[31, 28], [32, 28], [28, 31], [28, 32], [35, 31], [35, 32], [31, 35], [32, 35]]) put("bench", x, y, true, towardFountain(x, y));
  for (const [x, y] of [[33, 28], [28, 30], [35, 33], [30, 35]]) put("bin", x, y);
  put("signpost", 34, 29);
  /** The tile just off an arm's side at a point along it: -1 the low side, 1 the high side. */
  const beside = (arm: Arm, along: number, side: -1 | 1): Vec => {
    const upDown = arm.dir === "N" || arm.dir === "S";
    const out = along < PLAZA.x ? PLAZA.x - along : along - PLAZA.x - PLAZA.w;
    const mid = pathMiddle(along + 0.5, out + 0.5, arm.seed), half = pathHalf(along + 0.5, arm.seed);
    let across = Math.floor(mid + side * (half + 0.2));
    while (upDown ? roadThen(across, along) : roadThen(along, across)) across += side;
    return upDown ? { x: across, y: along } : { x: along, y: across };
  };
  /** Where a point `out` tiles from the plaza is along an arm. */
  const alongAt = (arm: Arm, out: number) => (arm.dir === "N" || arm.dir === "W" ? PLAZA.x - 1 - out : PLAZA.x + PLAZA.w + out);
  /** The way a bench beside an arm faces to look at the path. */
  const facingPath = (arm: Arm, side: -1 | 1): Facing =>
    arm.dir === "N" || arm.dir === "S" ? (side < 0 ? "SE" : "NW") : (side < 0 ? "SW" : "NE");
  /** Put something down only where nothing is and nobody walks a path. */
  const free = (p: Vec) => !taken.has(`${p.x},${p.y}`) && !roadThen(p.x, p.y) && !isPlaza(p.x, p.y) && !isShop(p.x, p.y) && !isBoard(p.x, p.y);
  ARMS.forEach((arm, i) => {
    // lit on both sides where it leaves the plaza
    for (const side of [-1, 1] as const) { const p = beside(arm, alongAt(arm, 1), side); if (free(p)) put("lamp", p.x, p.y); }
    // two resting places, on alternate sides, each arm starting on its own side
    const first: -1 | 1 = i % 2 ? 1 : -1;
    for (const [out, side] of [[5, first], [9, -first as -1 | 1]] as const) {
      const at = alongAt(arm, out), bench = beside(arm, at, side);
      if (!free(bench)) continue;
      put("bench", bench.x, bench.y, true, facingPath(arm, side));
      // the bin on the plaza's side of it, flowers on the other
      const toward = arm.dir === "N" || arm.dir === "W" ? 1 : -1;
      const bin = beside(arm, at + toward, side), fl = beside(arm, at - toward, side);
      if (free(bin)) put("bin", bin.x, bin.y);
      if (free(fl)) put("flowers", fl.x, fl.y, false);
      const lamp = beside(arm, at, (-side) as -1 | 1);
      if (free(lamp)) put("lamp", lamp.x, lamp.y);
    }
  });
  let a = 20261002;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clear = (x: number, y: number, r: number) => {
    if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) return false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (taken.has(`${X},${Y}`) || roadThen(X, Y) || isPlaza(X, Y) || isShop(X, Y) || isBoard(X, Y) || wetThen(X, Y) || closedThen.has(`${X},${Y}`)) return false;
    }
    return true;
  };
  const scatter = (kind: PropKind, n: number, r: number, inTown: boolean, solid = true) => {
    for (let tries = 0, placed = 0; placed < n && tries < n * 80; tries++) {
      const x = Math.floor(rnd() * COLS), y = Math.floor(rnd() * ROWS);
      if (within(x, y, TOWN) !== inTown || !clear(x, y, r)) continue;
      put(kind, x, y, solid); placed++;
    }
  };
  // town: a few trees and plenty of flowers
  scatter("tree", 14, 1, true); scatter("bush", 12, 1, true); scatter("flowers", 28, 0, true, false);
  // countryside: woods and meadows
  scatter("tree", 150, 0, false); scatter("pine", 90, 0, false); scatter("bush", 60, 0, false);
  scatter("rock", 30, 0, false); scatter("flowers", 90, 0, false, false);
  // The fishing deck, the cooking yard and the two shopkeepers came after the town was laid out:
  // what grew where they stand is cleared (and the trees, bushes and rocks a step round the two
  // sites, which hid their near edges), rather than kept off it above, so everything else in the
  // town stays exactly where it was.
  const wild = (p: Prop) => p.kind === "tree" || p.kind === "pine" || p.kind === "bush" || p.kind === "rock";
  // And the river is twice as wide as when they were laid out: what stood where it runs now is gone.
  const stands = out.filter((p) => !isPier(p.x, p.y) && !isKitchen(p.x, p.y) && !isKeeper(p.x, p.y) && !(wild(p) && bySite(p.x, p.y))
    && !isWater(p.x, p.y) && !isBank(p.x, p.y));
  // The north path ends at the forest's gate (2026-10-05), and its last stretch is to look like the way into a
  // forest (the owner: "ทางเข้าทำให้ดูเป้นป่ากว่านี้"): the woods close in on it there, thick at the map's edge and
  // thinning towards the town, laid after everything else and each tree from its own tile, so that nothing that
  // stood before has moved. None on the path or right beside it; what ground they shut in, nobody had to walk on.
  const there = new Set(stands.map((p) => `${p.x},${p.y}`));
  for (let y = 0; y < NORTH_WOOD.h; y++) for (let x = NORTH_WOOD.x; x < NORTH_WOOD.x + NORTH_WOOD.w; x++) {
    if (there.has(`${x},${y}`) || wetThen(x, y) || [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => roadThen(x + dx, y + dy) || isRoad(x + dx, y + dy)))) continue;
    let h = Math.imul(x + 977, 374761393) ^ Math.imul(y + 331, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const k = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    if (k < (y < 5 ? 0.5 : 0.5 - (y - 4) * 0.09)) stands.push({ kind: k < 0.2 ? "pine" : "tree", x, y, solid: true });
  }
  // The storage box came last of all (2026-10-05), and is the list's last, so that nothing before it has another
  // number than it had. One closed tile in the open plaza: no way is shut by it, and nothing that was laid out from
  // where one may walk has moved (the insects' haunts, the places to fish from: each made with and without it and
  // compared, the day it came; lib/town/box.test.ts holds the tiles about it open).
  stands.push({ kind: "storebox", x: STOREBOX.x, y: STOREBOX.y, solid: true });
  return stands;
})();

/**
 * The benches, in a fixed order: somebody sitting is told to the room by this index. The town's come first, as they
 * always were; the logs round the forest camp's fire are added after them, where the forest is laid out (the owner,
 * 2026-10-05: "ท่อนไม้แถว กองไฟ ช่วยทำให้นั่งได้ด้วย เหมือนเก้าอี้").
 */
export const BENCHES: Prop[] = PROPS.filter((p) => p.kind === "bench");

/**
 * Sitting on the ground where you stand (the emote window, the owner's call, 2026-10-02), told to the room in
 * place of a bench's index. The sitting pose is drawn on the ground already; a bench only lifts it onto its seat.
 */
export const SIT_HERE = -2;

/** The bench on a tile, as an index into BENCHES, or −1. */
export function benchAt(tx: number, ty: number): number {
  return BENCHES.findIndex((b) => b.x === tx && b.y === ty);
}

const solidAt = new Set(PROPS.filter((p) => p.solid).map((p) => `${p.x},${p.y}`));

/* ── the farm ───────────────────────────────────────────────────────────── */

/**
 * The farm (the owner, 2026-10-03: "แปลงผักจะเป็นแมพใหม่ ด้านขวา ต้องเปลี่ยนแมพ",
 * then "แปลงปลูกผักของแมพกว้างๆเลย คนจะได้มาปลูกกันเยอะๆ"): a map of its own, out
 * of the town's east path. It lies in the same tile space as the town, far off
 * to the east, so which map somebody is on is simply where they stand: nothing
 * more is told to the room, and no tile of one map can be taken for the
 * other's. Nothing joins the two but the gates (GATES): step on one and you
 * stand at the other.
 *
 * Its ground is beds of plots, one seed to a plot: four quarters of three beds
 * by two, a bed seven plots by seven with a tile of grass between; a lane from
 * the gate in the west across to the east, and another across that; woods at
 * the rim. Nothing can be done in it yet: there are no tools.
 */
export const FARM = { x: 128, y: 0, w: 60, h: 44 };
/**
 * The forest (the owner, 2026-10-05: "หาของป่า จะมี map ใหม่ เป็นป่าใหญ่ๆ สามารถเดินเข้าไป
 * เก็บของป่า"): a third map, out of the town's north path, where its road works
 * were. Like the farm it lies far off in the same tile space (below the farm
 * and clear of it on the screen, and no further east than a path's tiles are
 * numbered: findPath's SPAN), so which map somebody is on is where they stand.
 * What it is made of is further down, under "the forest".
 */
export const FOREST = { x: 144, y: 112, w: 96, h: 80 };
export type Place = "town" | "farm" | "forest"
  // to come (the preview, `next dev` only): the mountain's foot, and the cave under it, all of whose floors are the one place
  | "mountain" | "cave";
/** Which map a point is on, or null for nowhere. */
export function placeOf(x: number, y: number): Place | null {
  if (x >= 0 && y >= 0 && x < COLS && y < ROWS) return "town";
  // ── to come ── (both lie below every other map in the tile space)
  if (PREVIEW && y >= MOUNTAIN.y) return within(x, y, MOUNTAIN) ? "mountain" : floorOf(x, y) ? "cave" : null;
  return within(x, y, FARM) ? "farm" : within(x, y, FOREST) ? "forest" : null;
}
/** Whether a farm tile, counted from the farm's own corner, is a plot. */
function isPlot(u: number, v: number): boolean {
  const a = u >= 4 && u < 27 ? u - 4 : u >= 33 && u < 56 ? u - 33 : -1;
  const b = v >= 4 && v < 19 ? v - 4 : v >= 25 && v < 40 ? v - 25 : -1;
  return a >= 0 && b >= 0 && a % 8 !== 7 && b % 8 !== 7;
}
/** Whether a tile is one of the farm's plots. */
export const plotAt = (tx: number, ty: number) => within(tx, ty, FARM) && isPlot(tx - FARM.x, ty - FARM.y);
/** How many beds the farm has: six across, four down. */
export const BEDS_IN_FARM = 24;
/** Which of the farm's beds a plot is in, counted along the rows from the north-west corner; −1 for a tile that is not a plot. */
export function bedOf(tx: number, ty: number): number {
  if (!plotAt(tx, ty)) return -1;
  const u = tx - FARM.x, v = ty - FARM.y;
  const a = u < 27 ? u - 4 : u - 33, b = v < 19 ? v - 4 : v - 25;
  return ((v < 19 ? 0 : 2) + Math.floor(b / 8)) * 6 + (u < 27 ? 0 : 3) + Math.floor(a / 8);
}
/** The row of its bed that a plot is in: the bed's plots that share its y, from one end to the other (none, off the beds). */
export function rowOf(tx: number, ty: number): Array<[number, number]> {
  const bed = bedOf(tx, ty);
  if (bed < 0) return [];
  const [bx] = bedCorner(bed);
  return Array.from({ length: 8 }, (_, i): [number, number] => [bx + i, ty]).filter(([x, y]) => bedOf(x, y) === bed);
}
/** A bed's corner tile nearest the top of the screen (its smallest x and y). */
export function bedCorner(bed: number): [number, number] {
  const col = bed % 6, row = Math.floor(bed / 6);
  return [FARM.x + (col < 3 ? 4 : 33) + (col % 3) * 8, FARM.y + (row < 2 ? 4 : 25) + (row % 2) * 8];
}
/**
 * The farm's well, where its lanes cross (the owner, 2026-10-03: "ต้องมีคนขนน้ำมา
 * จากแม่น้ำมาใส่บ่อตรงกลางแมพแปลงผัก"): watering cans are filled at it, and it is
 * filled by buckets carried from the town's river. Somebody on a tile beside
 * it is at it.
 */
export const WELL = { x: FARM.x + 28, y: FARM.y + 23 };
export const atWell = (tx: number, ty: number) => Math.max(Math.abs(tx - WELL.x), Math.abs(ty - WELL.y)) === 1;
/** The farm's ground at a point counted from its own corner: its two lanes, its plots, and grass. */
function farmGround(u: number, v: number): "road" | "field" | "grass" {
  if ((v >= 21 && v < 23 && u < 58) || (u >= 29 && u < 31 && v >= 3 && v < 41)) return "road";
  return isPlot(Math.floor(u), Math.floor(v)) ? "field" : "grass";
}
/**
 * What stands about the farm, laid out by a fixed seed like the town: a fence
 * along the edge the lane comes in by (the gateway over the lane is GATES'),
 * the tool shed and hay by the gate, a well where the lanes cross, and woods
 * along the other three sides. A fence is three tiles long, and the shed three
 * across (as the screen sees it). (A scarecrow stood in each quarter until
 * 2026-10-07, when the owner had them taken off the map: "เอาหุ่นไล่กาออกจากแมพฟาร์มไปเลย".
 * Its tile stays closed, for the great pumpkin that sat at its foot and sits
 * in the middle of the tile now: `FARM_PUMPKINS`. Had the four tiles opened,
 * everything laid out from the tiles one can walk on would have moved: the
 * insects' haunts above all, which the database keeps a copy of and holds a
 * catch to. The scarecrow's picture stays in the scenery, used by nothing.)
 */
/** The four tiles of the farm a great pumpkin sits on, one in each quarter (counted from the farm's corner): closed, as they were under the scarecrows. */
export const FARM_PUMPKINS: Array<[u: number, v: number]> = [[11, 11], [48, 11], [19, 32], [40, 32]];
export const FARM_PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const put = (kind: PropKind, u: number, v: number, solid = true) => { out.push({ kind, x: FARM.x + u, y: FARM.y + v, solid }); };
  for (const v of [5, 8, 11, 14, 17, 26, 29, 32, 35, 38]) put("fence", 0, v);
  put("shed", 2, 18);
  for (const [u, v] of [[3, 20], [2, 24], [27, 20], [32, 24]]) put("hay", u, v);
  put("well", 28, 23); // (WELL)
  let a = 20261003;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const taken = new Set<string>();
  for (let tries = 0, placed = 0; placed < 80 && tries < 6000; tries++) {
    const u = Math.floor(rnd() * FARM.w), v = Math.floor(rnd() * FARM.h), kind = rnd();
    if (!(v < 3 || v >= 41 || u >= 57) || taken.has(`${u},${v}`) || farmGround(u + 0.5, v + 0.5) !== "grass") continue;
    taken.add(`${u},${v}`);
    put(kind < 0.5 ? "tree" : kind < 0.8 ? "pine" : "bush", u, v);
    placed++;
  }
  return out;
})();
/** The farm's tiles that stop a walker: what stands on them, a fence's three, the shed's three, and the gateway's two posts either side of the lane. */
const farmSolid = new Set([`${FARM.x + 1},${FARM.y + 20}`, `${FARM.x + 1},${FARM.y + 23}`, ...FARM_PUMPKINS.map(([u, v]) => `${FARM.x + u},${FARM.y + v}`), ...FARM_PROPS.flatMap((p) => {
  const at = (dx: number, dy: number) => `${p.x + dx},${p.y + dy}`;
  if (p.kind === "fence") return [at(0, -1), at(0, 0), at(0, 1)];
  if (p.kind === "shed") return [at(-1, 1), at(0, 0), at(1, -1)];
  return p.solid ? [at(0, 0)] : [];
})]);

/* ── the forest ─────────────────────────────────────────────────────────── */

/**
 * The forest's ground (FOREST, above). It is entered from its south edge, the
 * screen's lower left. A trail runs from the gate up through a meadow at the
 * wood's edge to a camp in a clearing, and on over a stream to the deep woods
 * and the great tree; one goes off west to a bamboo grove and north from it to
 * a glade, one east to a rocky rise and round to the pool under the waterfall,
 * where the stream begins. The stream runs west across the whole map and is
 * crossed only at its fords, and a cliff shuts the pool's far side: the deep
 * woods are the other side of water.
 *
 * Everything here is in the forest's own tiles, (u, v) from its top corner,
 * and a shape, not a tile, as the town's paths are: the ground is drawn from
 * them point by point, and a tile is what its middle is.
 */
/** The stream: where its middle is at a point along it, and half its width there (it widens into a pond a third of the way across). */
const streamMid = (u: number) => 27 + 3.2 * Math.sin(u / 11 + 0.6) + 1.4 * Math.sin(u / 4.7 + 2);
const streamHalf = (u: number) => 1.25 + 0.25 * Math.sin(u / 5.3) + 2.3 * Math.exp(-(((u - 30) / 5) ** 2));
/** Where the stream begins, and the pool it runs out of. */
const SPRING = 86;
const POOL = { u: 87.5, v: streamMid(SPRING), r: 4.4 };
/** Where the stream is crossed, along it: stones across the water, two tiles wide. */
export const FORDS = [18, 50, 70];
const inPool = (u: number, v: number, more = 0) => Math.hypot(u - POOL.u, (v - POOL.v) * 1.15) < POOL.r + more;
const byStream = (u: number, v: number, more: number) => u <= SPRING + more && Math.abs(v - streamMid(Math.min(u, SPRING))) < streamHalf(Math.min(u, SPRING)) + more;
const inStream = (u: number, v: number) => inPool(u, v) || (byStream(u, v, 0) && !FORDS.some((f) => Math.abs(u - f) < 1.1));
/** The cliff the water falls from, behind the pool and round its far end: nobody walks there. */
const onCliff = (u: number, v: number) => (u >= 83 && v >= POOL.v - 8.5 && v < POOL.v - 3.7) || (u >= 92 && v >= POOL.v - 8.5 && v < POOL.v + 5.5);
/** The trails, as lines from point to point. */
const TRAILS_IN: Array<Array<[number, number]>> = [
  // from the gate up through the meadow to the camp, and on over the middle ford to the great tree
  [[48, 80.5], [47.5, 73], [50, 66], [48, 58], [49, 52.5]],
  [[49, 41.5], [51, 37], [50, 31], [50, 24], [48.5, 18], [46.5, 14], [48, 11.5]],
  // west to the bamboo grove, and north from it over the west ford to a glade
  [[43.5, 47.5], [37, 49.5], [28, 46.5], [19, 49], [11, 47]],
  [[19, 49], [18, 41], [18.5, 33], [18.5, 27], [19.5, 21], [20, 17.5]],
  // east to the rocky rise, and round to the pool under the waterfall
  [[54.5, 46.5], [62, 44.5], [70, 48.5], [78, 46], [84, 49.5]],
  [[70, 48.5], [73, 41.5], [78, 36.5], [82.5, 35.2]],
];
const onTrail = (u: number, v: number) => {
  const half = 0.95 + 0.12 * Math.sin(u * 0.9 + v * 0.7), p = { x: u, y: v };
  return TRAILS_IN.some((line) => line.some(([x, y], i) => i > 0 && nearSegment(p, { x: line[i - 1][0], y: line[i - 1][1] }, { x, y }) < half));
};
/** Where no tree stands: the camp, the great tree's, and a few glades. */
const CLEARINGS = [
  { u: 49, v: 47, r: 5.6 }, { u: 48.5, v: 7.5, r: 5.2 },
  { u: 20, v: 14, r: 3.4 }, { u: 76, v: 10, r: 3.2 }, { u: 13, v: 57, r: 2.8 }, { u: 84, v: 53, r: 3 },
];
const inClearing = (u: number, v: number) =>
  CLEARINGS.some((c) => Math.hypot(u - c.u, v - c.v) < c.r + 0.35 * Math.sin(Math.atan2(v - c.v, u - c.u) * 5 + c.u));
/** Where the meadow at the wood's edge ends and the trees begin, along the map. */
const meadowLine = (u: number) => 63 + 2 * Math.sin(u / 7) + 0.8 * Math.sin(u / 2.3);
/**
 * And where the meadow ends on its other side: the forest is entered through a belt of woods (the owner, 2026-10-05:
 * "ทางเข้าทำให้ดูเป้นป่ากว่านี้"), which the trail comes out of into the meadow.
 */
const gateWood = (u: number) => 72.6 + 1.3 * Math.sin(u / 5.3) + 0.6 * Math.sin(u / 1.9);
/** Whether a point is in that belt and off the trail through it: thick woods, which nobody walks in. */
const inGateWood = (u: number, v: number) => v > gateWood(u) && Math.abs(u - 48) > 2.6;
/** The forest's ground at a point counted from its own corner. */
function forestGround(u: number, v: number): "water" | "sand" | "road" | "grass" | "wood" {
  if (inStream(u, v)) return "water";
  if (inPool(u, v, 1) || byStream(u, v, 0.9)) return "sand";
  if (onTrail(u, v)) return "road";
  return (v > meadowLine(u) && v < gateWood(u)) || inClearing(u, v) ? "grass" : "wood";
}
/**
 * The parts of the forest, each with things of its own to find (lib/town/forest): the meadow at its edge, the woods,
 * the bamboo grove, the banks of the stream, the deep woods beyond it, the rocky rise, and the camp's clearing.
 */
export type Zone = "edge" | "woods" | "bamboo" | "stream" | "deep" | "rise" | "camp";
/** Which part of the forest a tile is in; null outside it. */
export function zoneAt(tx: number, ty: number): Zone | null {
  if (!within(tx, ty, FOREST)) return null;
  const u = tx - FOREST.x + 0.5, v = ty - FOREST.y + 0.5;
  if (Math.hypot(u - CLEARINGS[0].u, v - CLEARINGS[0].v) < CLEARINGS[0].r + 0.5) return "camp";
  if (inPool(u, v, 2.5) || byStream(u, v, 2.5)) return "stream";
  if (v < streamMid(Math.min(u, SPRING))) return "deep";
  if (v > meadowLine(u)) return "edge";
  return u < 32 ? "bamboo" : u > 66 ? "rise" : "woods";
}
/**
 * The camp in the middle of the forest: a fire in a ring of stones with logs to sit on round it and a tent beside.
 * Somebody on a tile beside the fire is at it (what is roasted there is lib/town/forest's to say).
 */
export const CAMP = { fire: { x: FOREST.x + 49, y: FOREST.y + 47 } };
export const atFire = (tx: number, ty: number) => Math.max(Math.abs(tx - CAMP.fire.x), Math.abs(ty - CAMP.fire.y)) === 1;
/** The great tree of the deep woods, three tiles by three, and where the waterfall's foot stands, at the back of its pool. */
export const GREAT_TREE = { x: FOREST.x + 47, y: FOREST.y + 5, w: 3, h: 3 };
export const WATERFALL = { x: FOREST.x + 87.5, y: FOREST.y + Math.round((POOL.v - 3.6) * 10) / 10 };
/**
 * What stands about the forest, laid out by a fixed seed like the town: trees of the wood's own kinds, thicker the
 * deeper in; bamboo in its grove; rocks on the rise; ferns and flowers underfoot; fallen logs and stumps; the camp's
 * things; and a line of trees round the rim. Nothing solid stands on a trail or beside one, on the meadow's gate, or
 * touching another solid thing even at a corner: so nothing but the stream and the cliff ever shuts a way.
 */
export const FOREST_PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const solid = new Set<string>(), used = new Set<string>();
  const put = (kind: PropKind, u: number, v: number, isSolid = true) => {
    out.push({ kind, x: FOREST.x + u, y: FOREST.y + v, solid: isSolid });
    used.add(`${u},${v}`);
    if (isSolid) solid.add(`${u},${v}`);
  };
  const ground = (u: number, v: number) => forestGround(u + 0.5, v + 0.5);
  // the camp: the fire, four logs to sit on along its two far sides (each facing the fire and whoever looks on), a
  // tent at the clearing's back
  put("campfire", 49, 47);
  for (const [u, v, facing] of [[47, 46, "SE"], [47, 47, "SE"], [48, 45, "SW"], [49, 45, "SW"]] as const) {
    put("logseat", u, v);
    out[out.length - 1].facing = facing;
  }
  put("tent", 53, 44);
  // kept clear: the great tree's own tiles and the cliff (closed further down), and the gate's way in
  const kept = (u: number, v: number) => within(FOREST.x + u, FOREST.y + v, GREAT_TREE) || onCliff(u + 0.5, v + 0.5) || (v >= 76 && Math.abs(u + 0.5 - 48) < 3);
  let a = 20261005;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const around = (u: number, v: number, is: (x: number, y: number) => boolean) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (is(u + dx, v + dy)) return true;
    return false;
  };
  // the rim: two rows of trees, every other tile of each, so the edge of the world is behind a wood
  const rim = (u: number, v: number) => {
    if ((u + v) % 2 || used.has(`${u},${v}`) || kept(u, v) || (ground(u, v) !== "wood" && ground(u, v) !== "grass")) return;
    put(rnd() < 0.5 ? "pine" : rnd() < 0.5 ? "oak" : "tree", u, v);
  };
  for (let u = 0; u < FOREST.w; u++) for (const v of [0, 1, FOREST.h - 2, FOREST.h - 1]) rim(u, v);
  for (let v = 2; v < FOREST.h - 2; v++) for (const u of [0, 1, FOREST.w - 2, FOREST.w - 1]) rim(u, v);
  /** So many of some kinds, by their shares, somewhere in these parts of the forest, on this ground. */
  const grow = (n: number, zones: Zone[], kinds: Array<[PropKind, number]>, isSolid = true, on: Array<ReturnType<typeof forestGround>> = ["wood"]) => {
    for (let tries = 0, placed = 0; placed < n && tries < n * 60; tries++) {
      const u = 2 + Math.floor(rnd() * (FOREST.w - 4)), v = 2 + Math.floor(rnd() * (FOREST.h - 4)), k = rnd();
      if (used.has(`${u},${v}`) || kept(u, v) || !on.includes(ground(u, v)) || !zones.includes(zoneAt(FOREST.x + u, FOREST.y + v)!)) continue;
      if (isSolid && (around(u, v, (x, y) => solid.has(`${x},${y}`)) || around(u, v, (x, y) => ground(x, y) === "road"))) continue;
      let acc = 0;
      put(kinds.find(([, share]) => (acc += share) > k)?.[0] ?? kinds[kinds.length - 1][0], u, v, isSolid);
      placed++;
    }
  };
  grow(250, ["deep"], [["oak", 0.5], ["pine", 0.25], ["tree", 0.25]]);
  grow(90, ["woods"], [["tree", 0.4], ["birch", 0.3], ["pine", 0.2], ["oak", 0.1]]);
  grow(120, ["bamboo"], [["bamboo", 0.8], ["tree", 0.1], ["birch", 0.1]]);
  grow(70, ["rise"], [["boulder", 0.45], ["rock", 0.25], ["pine", 0.3]]);
  grow(40, ["stream"], [["birch", 0.5], ["tree", 0.3], ["rock", 0.2]]);
  grow(40, ["edge"], [["tree", 0.5], ["birch", 0.35], ["bush", 0.15]], true, ["grass"]);
  // (the belt of woods the gate is in: thick, as a forest's edge is from outside. Nobody walks in it but along the
  // trail: all of it is closed, further down)
  for (let v = 2; v < FOREST.h - 2; v++) for (let u = 2; u < FOREST.w - 2; u++) {
    if (!inGateWood(u + 0.5, v + 0.5) || used.has(`${u},${v}`) || around(u, v, (x, y) => ground(x, y) === "road")) continue;
    const k = rnd();
    if (k < 0.5) put(k < 0.2 ? "oak" : k < 0.35 ? "pine" : "tree", u, v);
  }
  grow(46, ["woods", "deep", "bamboo", "rise"], [["log", 0.5], ["stump", 0.5]]);
  grow(250, ["woods", "deep", "stream", "bamboo", "edge"], [["fern", 1]], false);
  grow(80, ["edge", "camp", "deep", "bamboo", "rise"], [["flowers", 1]], false, ["grass"]);
  // the cliff: rock on every other tile of it (all of it is closed, below)
  for (let v = 0; v < FOREST.h; v++) for (let u = 0; u < FOREST.w; u++) {
    if (onCliff(u + 0.5, v + 0.5) && !used.has(`${u},${v}`) && (u + v) % 2 === 0) put(rnd() < 0.7 ? "boulder" : "rock", u, v);
  }
  return out;
})();
/**
 * The forest's tiles that stop a walker: what stands on them, the great tree's nine, the cliff, the tent's second
 * tile, the gateway's two posts either side of the trail, the belt of thick woods the gate is in (but for the
 * trail through it), and the outermost ring of the map but for the gate (its trees stand on every other tile, and
 * nobody is to be shut in between two of them).
 */
const forestSolid = (() => {
  const out = new Set(FOREST_PROPS.filter((p) => p.solid).map((p) => `${p.x},${p.y}`));
  for (let y = 0; y < FOREST.h; y++) for (let x = 0; x < FOREST.w; x++) {
    const rim = x === 0 || y === 0 || x === FOREST.w - 1 || (y === FOREST.h - 1 && x !== 47 && x !== 48);
    if (rim || onCliff(x + 0.5, y + 0.5) || inGateWood(x + 0.5, y + 0.5) || within(FOREST.x + x, FOREST.y + y, GREAT_TREE)) out.add(`${FOREST.x + x},${FOREST.y + y}`);
  }
  for (const [u, v] of [[54, 44], [46, 78], [49, 78]]) out.add(`${FOREST.x + u},${FOREST.y + v}`);
  return out;
})();
const isForestWater = (tx: number, ty: number) => inStream(tx - FOREST.x + 0.5, ty - FOREST.y + 0.5);
// (the camp's logs are benches: sat on like the town's, told to the room by their place in the same list)
BENCHES.push(...FOREST_PROPS.filter((p) => p.kind === "logseat"));

/* ── to come: the mountain's foot, and the cave under it (the preview, `next dev` only) ── */

/**
 * The mountain's foot ("ตีนเขา"; lib/town/mountain lays it out): a fourth map, out of the town's west path and over
 * the bridge. Like the farm and the forest it lies far off in the same tile space: below all of them (clear of the
 * town, the farm, the forest and the woods seen beyond their gates) and no further east than a path's tiles are
 * numbered, so which map somebody is on is still where they stand. It climbs towards the screen's upper left, which
 * is the way x falls: its gate back to the town is in its east edge.
 */
export const MOUNTAIN = { x: 0, y: 208, w: MOUNTAIN_W, h: MOUNTAIN_H };
const mountainLaid = PREVIEW ? layMountain() : [];
/** What stands about it, in the world's own tiles (nothing at all, outside the preview). */
export const MOUNTAIN_PROPS: Prop[] = mountainLaid.map(({ u, v, ...p }) => ({ ...p, x: MOUNTAIN.x + u, y: MOUNTAIN.y + v }));
/** Its tiles that stop a walker, by their place from its own corner: the cliffs, the rim, what stands there. */
const mountainShut = PREVIEW ? closedOf(mountainLaid) : new Set<string>();
/**
 * Its great things, in the world's tiles: the ancient cedar's three tiles by three; the lookout's deck at the
 * summit's far end, which is walked on; where the mine's mouth stands at the foot of the first cliff, and the two
 * tiles of the yard before it that are its threshold, the way into the cave.
 */
export const MOUNTAIN_AT = {
  cedar: { x: MOUNTAIN.x + CEDAR.u, y: MOUNTAIN.y + CEDAR.v, w: CEDAR.w, h: CEDAR.h },
  lookout: { x: MOUNTAIN.x + LOOKOUT_AT.u, y: MOUNTAIN.y + LOOKOUT_AT.v, w: LOOKOUT_AT.w, h: LOOKOUT_AT.h },
  mouth: { x: MOUNTAIN.x + MOUTH_AT.u, y: MOUNTAIN.y + MOUTH_AT.v },
  mouthTiles: MINE_MOUTH.map(([u, v]): [number, number] => [MOUNTAIN.x + u, MOUNTAIN.y + v]),
};
// (the camp's logs and the lookout's bench are sat on: added after the forest's, so that no bench before them has another number)
BENCHES.push(...MOUNTAIN_PROPS.filter((p) => p.kind === "logseat" || p.kind === "bench"));
/**
 * The mountain's trees, each with the number that is its own (its place in this list: 0 to 59 are the slope's pines,
 * 60 to 99 the upper terrace's ironwoods, 100 to 119 the summit's moonwoods), its tile and its kind. And its rocks
 * the same way (0 to 39 are the slope's), each with which of its three looks it has. The numbers are the same on
 * every screen and stay so while the layout does. How a tree looks just now and whether a rock still stands are for
 * whoever keeps the game to say: the map draws what it is told (components/town/mountain-art).
 */
export interface MountainTree { id: number; x: number; y: number; tier: 1 | 2 | 3 }
export interface MountainRock { id: number; x: number; y: number; look: number }
export const MOUNTAIN_TREES: MountainTree[] = MOUNTAIN_PROPS.filter((p) => p.kind === "mtree").map((p) => ({ id: p.id!, x: p.x, y: p.y, tier: p.tier! }));
export const MOUNTAIN_ROCKS: MountainRock[] = MOUNTAIN_PROPS.filter((p) => p.kind === "mrock").map((p) => ({ id: p.id!, x: p.x, y: p.y, look: p.look! }));

/**
 * The cave (lib/town/cave makes its floors, each from its number and the day's). Its floors lie side by side in the
 * same tile space, below the mountain: four to a row, each in a square of its own and far enough from the next that
 * no floor is ever on the screen with another. So which floor somebody is on is where they stand (`floorOf`), as
 * which map is: nothing more is told to the room.
 *
 * `laid` are the floors the preview has: the first three are walked down to, each by the one before's ladder; the
 * three resting floors (10, 20, 30), and the floors under the first two of them (11, 21), which with them show the
 * earth of the cave's two deeper thirds. A ladder leads on only where the next floor is laid: from 10 to 11 and
 * from 20 to 21, and back; nothing leads down to 10, 20 or 30 yet.
 */
export const CAVE = { x: 0, y: 320, across: 4, apart: 64, size: CAVE_SIZE, laid: (PREVIEW ? [1, 2, 3, 10, 11, 20, 21, 30] : []) as number[] };
/** The top corner of a floor's square. */
export const floorCorner = (n: number): Vec => ({ x: CAVE.x + ((n - 1) % CAVE.across) * CAVE.apart, y: CAVE.y + Math.floor((n - 1) / CAVE.across) * CAVE.apart });
/** Which floor of the cave a point is on (1 is the first under the mouth), or 0 for none: where it is says. */
export function floorOf(x: number, y: number): number {
  if (!PREVIEW || x < CAVE.x || y < CAVE.y) return 0;
  const col = Math.floor((x - CAVE.x) / CAVE.apart), row = Math.floor((y - CAVE.y) / CAVE.apart);
  if (col >= CAVE.across || x - CAVE.x - col * CAVE.apart >= CAVE.size || y - CAVE.y - row * CAVE.apart >= CAVE.size) return 0;
  const n = row * CAVE.across + col + 1;
  return CAVE.laid.includes(n) ? n : 0;
}
let caveDay = 0;
const caveFloors = new Map<number, CaveFloor>();
/**
 * The day whose cave this is: every floor is another one each day. Whoever keeps the game will say which day it is
 * (the map does for now, by Bangkok's calendar); the floors made for another day are forgotten.
 */
export function setCaveDay(day: number) {
  if (day === caveDay) return;
  caveDay = day;
  caveFloors.clear();
}
export const caveDayNow = () => caveDay;
/** A floor of the cave as it is today (kept once made). */
export function caveToday(n: number): CaveFloor {
  let f = caveFloors.get(n);
  if (!f) { f = caveFloor(n, caveDay); caveFloors.set(n, f); }
  return f;
}
/** A tile of a floor, from the floor's own corner, as a point of the world: its middle. */
const inCave = (n: number, [u, v]: readonly [number, number]): Vec => { const c = floorCorner(n); return { x: c.x + u + 0.5, y: c.y + v + 0.5 }; };
/** A rock of a floor of the cave as it is today, in the world's tiles: its number on that floor (lib/town/cave), its tile, and which of its looks it has (3 has crystals in it). */
export interface CaveRockAt { id: number; x: number; y: number; look: number }
export function caveRocks(n: number): CaveRockAt[] {
  const c = floorCorner(n);
  return caveToday(n).rocks.map((r) => ({ id: r.id, x: c.x + r.u, y: c.y + r.v, look: r.look }));
}
/**
 * Where a floor's things are today, in the world's tiles: the ladder come down by, where one stands on arriving, the
 * ladder down; and on a resting floor its lift, its fire, and the tile before the lift where one stands to take it.
 */
export function caveSpots(n: number): { up: [number, number]; arrive: [number, number]; down: [number, number]; lift?: [number, number]; liftAt?: [number, number]; fire?: [number, number] } {
  const f = caveToday(n), c = floorCorner(n), at = ([u, v]: readonly [number, number]): [number, number] => [c.x + u, c.y + v];
  return { up: at(f.up), arrive: at(f.arrive), down: at(f.down), ...(f.rest ? { lift: at(f.rest.lift), liftAt: at([f.rest.lift[0] + 1, f.rest.lift[1] + 1]), fire: at(f.rest.fire) } : {}) };
}
/** The logs round each resting floor's fire: benches, like the forest camp's (a resting floor is the same every day, so they are where they are for good). */
export const CAVE_SEATS: Prop[] = CAVE.laid.filter((n) => caveFloor(n, 0).rest).flatMap((n) => {
  const c = floorCorner(n);
  return caveFloor(n, 0).rest!.seats.map((s): Prop => ({ kind: "logseat", x: c.x + s.u, y: c.y + s.v, solid: true, facing: s.facing }));
});
BENCHES.push(...CAVE_SEATS);
/** Whether a tile of the mountain or of the cave stops a walker: a cliff, the rim, what stands there; rock, and a rock. */
function moreShut(tx: number, ty: number): boolean {
  if (within(tx, ty, MOUNTAIN)) return mountainShut.has(`${tx - MOUNTAIN.x},${ty - MOUNTAIN.y}`);
  const n = floorOf(tx, ty);
  if (!n) return true;
  const c = floorCorner(n);
  return caveToday(n).open[(ty - c.y) * CAVE_SIZE + tx - c.x] !== 1;
}
/**
 * The gates of what is to come that are not in GATES, because they are made anew with the cave each day: the mine's
 * mouth, which puts one beside the first floor's ladder, and every floor's two ladders (the one come down by goes
 * back up, to stand beside the ladder down of the floor above, or before the mouth; the ladder down goes on, where
 * the floor below is laid). And the gate beyond the bridge, which leads nowhere until the bridge is open. Gives the
 * place a gate leads to, null where what looks like one leads nowhere, and nothing where this has no say.
 */
function moreGate(tx: number, ty: number): Vec | null | undefined {
  if (ty < MOUNTAIN.y) return tx >= 0 && tx < 2 && ty < ROWS && !bridgeOpen() ? null : undefined;
  if (within(tx, ty, MOUNTAIN)) {
    if (!MOUNTAIN_AT.mouthTiles.some(([x, y]) => x === tx && y === ty)) return undefined;
    return CAVE.laid.includes(1) ? inCave(1, caveToday(1).arrive) : null;
  }
  const n = floorOf(tx, ty);
  if (!n) return null;
  const f = caveToday(n), c = floorCorner(n), u = tx - c.x, v = ty - c.y;
  if (u === f.up[0] && v === f.up[1]) {
    if (n === 1) return { x: MOUNTAIN_AT.mouth.x + 2.5, y: MOUNTAIN_AT.mouth.y - 0.5 };
    if (!CAVE.laid.includes(n - 1)) return null;
    const above = caveToday(n - 1);
    return inCave(n - 1, [above.down[0] + 1, above.down[1] + 1]);
  }
  if (u === f.down[0] && v === f.down[1]) return CAVE.laid.includes(n + 1) ? inCave(n + 1, caveToday(n + 1).arrive) : null;
  return null;
}
/** The ground of what is to come, beyond the town's own kinds: bare stony earth, a cliff's face (a cave's wall is one too), a stair, snow, a cave's floor and the top of its rock. */
export type MoreGround = "rock" | "cliff" | "stair" | "snow" | "cavefloor" | "cavewall";
/** Those kinds, for whoever lays the ground (lib/town/scenery): none outside the preview. */
export const MORE_GROUND: MoreGround[] = PREVIEW ? ["rock", "cliff", "stair", "snow", "cavefloor", "cavewall"] : [];
/** How far down the screen from a point of a cave's rock its floor begins, in tiles (a point is down the screen from another when both its x and its y are greater), as far as a wall stands tall; more than that where there is none so near. */
const CAVE_WALL = 1.3;
function wallOver(f: CaveFloor, u: number, v: number): number {
  for (let t = 0.125; t <= CAVE_WALL; t += 0.125) if (hollowAt(f, u + t, v + t)) return t;
  return 9;
}

/**
 * The woods seen beyond a gate, where no map is (the owner, 2026-10-05: "ทางทิศเหนือใกล้ทางเข้า ช่วยทำให้ด้านหลังเป้นเหมือนป่าไป
 * เลย (แทนที่พื้นที่ว่างๆสีดำ)"): beyond the town's north edge about its gate, and beyond the forest's south edge all
 * along it. Ground and trees to look at, with the path running on into them; nobody walks there (it is on no map:
 * `placeOf` is null), and nothing is kept of it.
 */
export const BEYOND = {
  north: { x: 12, y: -16, w: 42, h: 16 },
  south: { x: FOREST.x - 8, y: FOREST.y + FOREST.h, w: FOREST.w + 16, h: 14 },
};
/** The north path's own shape, which runs on into the wood beyond its gate. */
const NORTH_SEED = ARMS.find((a) => a.dir === "N")!.seed;
/** Whether a point has ground to draw: it is on a map, or in the woods seen beyond a gate. */
export const seenAt = (x: number, y: number) => placeOf(x, y) !== null || within(x, y, BEYOND.north) || within(x, y, BEYOND.south)
  // ── to come ── (and what is seen beyond the town's west gate and beyond the mountain's map)
  || (PREVIEW && (y >= BEYOND_MORE.low.y ? within(x, y, BEYOND_MORE.low) || within(x, y, BEYOND_MORE.high) : x < 0 && within(x, y, BEYOND_MORE.west)));
/** The ground of those woods at a point: the path running on through them, and the forest's floor. */
function beyondGround(x: number, y: number): "road" | "wood" {
  if (within(x, y, BEYOND.north)) return Math.abs(x - pathMiddle(y, PLAZA.y - y, NORTH_SEED)) < pathHalf(y, NORTH_SEED) ? "road" : "wood";
  const u = x - FOREST.x, v = y - FOREST.y;
  return Math.abs(u - 48 - 0.6 * Math.sin(v / 2.4)) < 0.95 ? "road" : "wood";
}
/** Their trees: thick, on about every other tile, none on the path or right beside it. From the tile itself, so the same for everybody. */
function beyondTrees(r: { x: number; y: number; w: number; h: number }): Prop[] {
  const out: Prop[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    let h = Math.imul(x + 977, 374761393) ^ Math.imul(y + 331, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const k = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    if (k > 0.56 || [-1, 0, 1].some((d) => beyondGround(x + d + 0.5, y + 0.5) === "road")) continue;
    out.push({ kind: k < 0.2 ? "pine" : k < 0.38 ? "oak" : k < 0.5 ? "tree" : "birch", x, y, solid: true });
  }
  return out;
}
export const BEYOND_PROPS = { north: beyondTrees(BEYOND.north), south: beyondTrees(BEYOND.south) };

/* ── to come: what is seen beyond the mountain's gates (the preview, `next dev` only) ── */

/**
 * Mountains seen beyond the town's west gate, where its map ends (`west`: the path runs on into them); and about the
 * mountain's own map, the low country one has come up from beyond its east edge (`low`) and the peaks beyond its
 * summit (`high`). Ground and things to look at, as the woods beyond the forest's gates are: on no map, never walked.
 */
export const BEYOND_MORE = {
  west: { x: -18, y: 12, w: 18, h: 42 },
  low: { x: MOUNTAIN.x + MOUNTAIN.w, y: MOUNTAIN.y - 6, w: 14, h: MOUNTAIN.h + 12 },
  high: { x: MOUNTAIN.x - 14, y: MOUNTAIN.y - 6, w: 14, h: MOUNTAIN.h + 12 },
};
const WEST_SEED = ARMS.find((a) => a.dir === "W")!.seed;
/** The ground of what is to come at a point, for drawing: the mountain's, a cave floor's, and what lies beyond their edges; and the dirt the bridge's two ends stand on. Null where this has no say. */
function moreLook(x: number, y: number): Ground | MoreGround | null {
  if (y >= BEYOND_MORE.low.y) {
    if (within(x, y, MOUNTAIN)) return mountainGround(x - MOUNTAIN.x, y - MOUNTAIN.y);
    const n = floorOf(x, y);
    if (n) {
      const f = caveToday(n), c = floorCorner(n), u = x - c.x, v = y - c.y;
      return hollowAt(f, u, v) ? "cavefloor" : wallOver(f, u, v) <= CAVE_WALL ? "cliff" : "cavewall";
    }
    // the low country: grass, and the trail running on down through it
    if (within(x, y, BEYOND_MORE.low)) return Math.abs(y - MOUNTAIN.y - 30 - 0.5 * Math.sin(x / 2.4)) < 0.95 ? "road" : "grass";
    // beyond the summit: snow, and bare rock showing through it
    if (within(x, y, BEYOND_MORE.high)) return Math.sin(x / 2.3 + y / 3.1) * Math.cos(y / 2.7 - x / 4.3) > 0.35 ? "rock" : "snow";
    return null;
  }
  if (x < 0) {
    if (!within(x, y, BEYOND_MORE.west)) return null;
    // beyond the town's west gate: the path running on, grass giving way to stony ground and then to snow
    if (Math.abs(y - pathMiddle(x, PLAZA.x - x, WEST_SEED)) < pathHalf(x, WEST_SEED)) return "road";
    return x > -3.2 + 0.9 * Math.sin(y / 2.9) ? "grass" : x > -9.5 + 1.4 * Math.sin(y / 3.7) ? "rock" : "snow";
  }
  // the bridge: a little trodden earth where each of its ends meets the path (drawn only: nothing is laid out from it)
  if (x < 14 && y > 26 && y < 36 && BRIDGE.spans > 0 && acrossRiver(x, y) >= RIVER_HALF
    && (nearSegment({ x, y }, { x: 10.7, y: 28.3 }, { x: 12.9, y: 28.9 }) < 0.95 || (BRIDGE.spans >= BRIDGE.tiles.length && nearSegment({ x, y }, { x: 5.3, y: 33.7 }, { x: 3.6, y: 33.3 }) < 0.95))) return "road";
  return null;
}
/** How far up a cliff's face a point is, 0 at its foot and 1 at its top: the mountain's cliffs, and a cave's walls. Null off them. */
export function faceRise(x: number, y: number): number | null {
  if (!PREVIEW) return null;
  if (within(x, y, MOUNTAIN)) return cliffAt(x - MOUNTAIN.x, y - MOUNTAIN.y)?.rise ?? null;
  const n = floorOf(x, y);
  if (!n) return null;
  const c = floorCorner(n), over = wallOver(caveToday(n), x - c.x, y - c.y);
  return over <= CAVE_WALL ? over / CAVE_WALL : null;
}
/** What a cave's earth and rock are tinted with, by its depth (lib/town/cave's depthOf): red, green and blue, each a share of the texture's own. Earth-brown at first, colder further down, a dull red at the deepest. */
const CAVE_TINTS: ReadonlyArray<readonly [number, number, number]> = [[1, 1, 1], [0.8, 0.93, 1.12], [1.14, 0.82, 0.78]];
/**
 * How the ground of what is to come is shaded at a point, over its texture: red, green and blue, each a share of
 * what the texture has there. A cliff's face is dark at its foot and lighter up it, with a bright lip where the
 * terrace above begins; a stair is its steps, two to a tile, each a light tread with a bright edge and a dark riser; a cave's earth
 * and rock take the colour of their depth, its walls are lit at the floor and go dark above, and the top of its rock
 * is all but black. Null where the texture is left as it is.
 */
export function groundTone(kind: MoreGround, x: number, y: number): readonly [number, number, number] | null {
  if (!PREVIEW || kind === "rock" || kind === "snow") return null;
  const n = floorOf(x, y);
  if (n) {
    const tint = CAVE_TINTS[depthOf(n)], k = kind === "cavefloor" ? 1 : kind === "cavewall" ? 0.5 : 0.92 - 0.5 * (faceRise(x, y) ?? 1);
    return k === 1 && tint === CAVE_TINTS[0] ? null : [tint[0] * k, tint[1] * k, tint[2] * k];
  }
  if (kind === "cliff") { const r = faceRise(x, y) ?? 0.5, k = r > 0.9 ? 1.28 : 0.66 + 0.42 * r; return [k, k, k]; }
  if (kind === "stair") { const step = (((x - MOUNTAIN.x) * 2) % 1 + 1) % 1, k = step < 0.34 ? 0.5 : step < 0.42 ? 1.3 : 1.12; return [k, k, k]; }
  return null;
}
/** A tile's own number from 0 to 1: the same on every screen. */
function tileChance(x: number, y: number): number {
  let h = Math.imul(x + 4409, 374761393) ^ Math.imul(y + 733, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** What stands in one of those strips: from each tile's own number, so the same for everybody; nothing on the path or within three tiles of it (a gateway stands there, and what is beyond it is before it on the screen). */
function beyondMore(r: { x: number; y: number; w: number; h: number }, what: (k: number, x: number, y: number) => Prop["kind"] | null): Prop[] {
  const out: Prop[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    if ([-3, -2, -1, 0, 1, 2, 3].some((d) => moreLook(x + 0.5, y + d + 0.5) === "road")) continue;
    const kind = what(tileChance(x, y), x, y);
    if (kind) out.push({ kind, x, y, solid: true });
  }
  return out;
}
/** What stands there: pines thinning into rocks towards the peaks, beyond the town; the town's own trees in the low country; rocks beyond the summit. */
export const BEYOND_MORE_PROPS = PREVIEW ? {
  west: beyondMore(BEYOND_MORE.west, (k, x) => (x > -10 ? (k < 0.24 ? "pine" : k < 0.3 ? "rock" : k < 0.34 ? "bush" : null) : k < 0.1 ? "rock" : null)),
  low: beyondMore(BEYOND_MORE.low, (k, x) => (x < MOUNTAIN.x + MOUNTAIN.w + 1 ? null : k < 0.16 ? "tree" : k < 0.27 ? "pine" : k < 0.34 ? "bush" : null)),
  high: beyondMore(BEYOND_MORE.high, (k) => (k < 0.1 ? "mrock" : null)),
} : { west: [], low: [], high: [] };
/**
 * The peaks themselves, far off: where each one's foot is, which of the two pictures, and how many times its
 * picture's size it is drawn. A row of them behind the town's west gate, and another beyond the mountain's summit.
 */
export const PEAKS: Array<{ x: number; y: number; art: 1 | 2; k: number; mirror?: boolean }> = PREVIEW ? [
  { x: -11, y: 17, art: 2, k: 2.6 }, { x: -13.5, y: 24, art: 1, k: 3 }, { x: -10.5, y: 30.5, art: 2, k: 2.8, mirror: true }, { x: -14, y: 37, art: 1, k: 3.2, mirror: true },
  { x: -11, y: 44, art: 2, k: 2.7 }, { x: -14.5, y: 50, art: 1, k: 2.9 },
  ...[[-7, 4, 2, 2.4], [-10.5, 13, 1, 3], [-7.5, 22, 2, 2.6], [-11, 31, 1, 3.2], [-7.5, 40, 2, 2.6], [-10.5, 49, 1, 2.9], [-7.5, 57, 2, 2.4]]
    .map(([u, v, art, k], i) => ({ x: MOUNTAIN.x + u, y: MOUNTAIN.y + v, art: art as 1 | 2, k, mirror: i % 2 === 1 })),
] : [];

/**
 * The gates between the maps: the tiles that are one, where stepping on it
 * puts you (`to`, a couple of tiles inside the other map, so nobody arrives on
 * a gate), where its gateway stands, in the middle of the way, and which map
 * it leads to. The town's are the ends of the east path and of the north one,
 * where the road works were; the farm's is the lane's first tiles, the
 * forest's the foot of its trail. `across` is for a gateway over a way that
 * runs up the map and not along it: its picture is turned the other way.
 */
const EAST = ARMS.find((a) => a.dir === "E")!, NORTH = ARMS.find((a) => a.dir === "N")!;
const eastRow = (x: number) => Math.floor(pathMiddle(x + 0.5, x + 0.5 - PLAZA.x - PLAZA.w, EAST.seed));
const northCol = (y: number) => Math.floor(pathMiddle(y + 0.5, PLAZA.y - y - 0.5, NORTH.seed));
export const GATES: Array<{ from: Place; leads: Place; tiles: Array<[number, number]>; to: Vec; arch: Vec; across?: boolean }> = [
  {
    from: "town", leads: "farm",
    tiles: [COLS - 2, COLS - 1].flatMap((x) => [...Array(ROWS).keys()].filter((y) => isRoad(x, y)).map((y): [number, number] => [x, y])),
    to: { x: FARM.x + 2.5, y: FARM.y + 21.5 },
    arch: { x: COLS - 1.5, y: pathMiddle(COLS - 1.5, COLS - 1.5 - PLAZA.x - PLAZA.w, EAST.seed) },
  },
  {
    from: "farm", leads: "town",
    tiles: [[FARM.x, FARM.y + 21], [FARM.x, FARM.y + 22]],
    to: { x: COLS - 3.5, y: eastRow(COLS - 4) + 0.5 },
    arch: { x: FARM.x + 1.5, y: FARM.y + 22 },
  },
  {
    from: "town", leads: "forest", across: true,
    tiles: [0, 1].flatMap((y) => [...Array(COLS).keys()].filter((x) => isRoad(x, y)).map((x): [number, number] => [x, y])),
    to: { x: FOREST.x + 48.5, y: FOREST.y + 76.5 },
    arch: { x: pathMiddle(1.5, PLAZA.y - 1.5, NORTH.seed), y: 1.5 },
  },
  {
    from: "forest", leads: "town", across: true,
    tiles: [[FOREST.x + 47, FOREST.y + 79], [FOREST.x + 48, FOREST.y + 79]],
    to: { x: northCol(3) + 0.5, y: 3.5 },
    arch: { x: FOREST.x + 48, y: FOREST.y + 78.5 },
  },
  // ── to come ── (the preview, `next dev` only; after the others, so that each of those is found as it was) the end
  // of the town's west path, on the far bank of the river, and the mountain's own gate back in its east edge. The
  // first leads nowhere until the bridge is open (gateAt). The mine's mouth and the cave's ladders are gates too, made
  // anew with the cave each day: gateAt knows them, and they are not listed here.
  ...(PREVIEW ? [
    {
      from: "town" as const, leads: "mountain" as const,
      tiles: [0, 1].flatMap((x) => [...Array(ROWS).keys()].filter((y) => isRoad(x, y)).map((y): [number, number] => [x, y])),
      to: { x: MOUNTAIN.x + MOUNTAIN.w - 3.5, y: MOUNTAIN.y + GATE_ROWS[0] + 0.5 },
      arch: { x: 1.5, y: pathMiddle(1.5, PLAZA.x - 1.5, WEST_SEED) },
    },
    {
      from: "mountain" as const, leads: "town" as const,
      tiles: GATE_ROWS.map((v): [number, number] => [MOUNTAIN.x + MOUNTAIN.w - 1, MOUNTAIN.y + v]),
      to: { x: 3.5, y: [...Array(ROWS).keys()].find((y) => isRoad(3, y))! + 0.5 },
      arch: { x: MOUNTAIN.x + MOUNTAIN.w - 1.5, y: MOUNTAIN.y + GATE_ROWS[1] },
    },
  ] : []),
];
/** Where the gate under a point leads, or null when there is none there. */
export function gateAt(x: number, y: number): Vec | null {
  const tx = Math.floor(x), ty = Math.floor(y);
  // ── to come ── (the mine's mouth and the cave's ladders; and the gate beyond the bridge, while the bridge is not open)
  if (PREVIEW) { const more = moreGate(tx, ty); if (more !== undefined) return more; }
  return GATES.find((g) => g.tiles.some(([gx, gy]) => gx === tx && gy === ty))?.to ?? null;
}

/** What stands on a tile and stops a walker, if anything. */
export function thingAt(tx: number, ty: number): Building | "fountain" | "shop" | "board" | "pier" | "kitchen" | "keeper" | "roadworks" | "water" | "prop" | null {
  // ── to come ── (the mountain's foot and the cave: a cliff, the rim, rock, and what stands there)
  if (PREVIEW && ty >= MOUNTAIN.y) return moreShut(tx, ty) ? "prop" : null;
  if (within(tx, ty, FARM)) return farmSolid.has(`${tx},${ty}`) ? "prop" : null;
  if (within(tx, ty, FOREST)) return forestSolid.has(`${tx},${ty}`) ? "prop" : isForestWater(tx, ty) ? "water" : null;
  for (const b of BUILDINGS) if (within(tx, ty, b)) return b;
  if (within(tx, ty, FOUNTAIN)) return "fountain";
  if (isShop(tx, ty)) return "shop";
  if (isBoard(tx, ty)) return "board";
  if (onDeck(tx, ty)) return null;
  if (isPier(tx, ty) || behindDeck(tx, ty)) return "pier";
  if (onYard(tx, ty)) return null;
  if (isKitchen(tx, ty)) return "kitchen";
  if (isKeeper(tx, ty)) return "keeper";
  // ── to come ── (the blacksmith's tiles are closed; the bridge's are walked on once it is whole and open, the water under it too)
  if (PREVIEW && !asWas) {
    if (smithAt.has(`${tx},${ty}`)) return "keeper";
    if (BRIDGE.open && BRIDGE.spans >= BRIDGE.tiles.length && bridgeAt.has(`${tx},${ty}`)) return null;
  }
  if (isClosed(tx, ty)) return "roadworks";
  if (isWater(tx, ty)) return "water";
  if (solidAt.has(`${tx},${ty}`)) return "prop";
  return null;
}

/** Can somebody stand on this tile? */
export function walkable(tx: number, ty: number): boolean {
  if (placeOf(tx, ty) === null) return false;
  return thingAt(tx, ty) === null;
}

/* ── fishing ────────────────────────────────────────────────────────────── */

/**
 * Where a line can be dropped from (the owner, 2026-10-03: "อยากให้ area ที่ตกปลาได้
 * เยอะกว่านี้ ตอนนี้ดูจะน้อยไปหน่อย"; asked how, he chose: every part of the deck a
 * line reaches the water from, and the town's bank all along the river, the
 * bank's water being shallow, with only the common fish, so that the deck
 * still means something).
 *
 * `reach` is how far a line is cast from the deck and `least` the nearest it
 * lands, in tiles. A line from the bank lands `out` tiles of y − x beyond the
 * water's edge, straight across the screen from where one stands; a float
 * keeps `clear` of the water's edge, wherever it lands.
 */
export const CAST = { reach: 3.2, least: 1.2, out: 1.3, clear: 0.5 };
/** A place to fish from: where its float lands, and whether that is deep water (off the deck) or the shallows (off the bank). */
export interface Fishing { float: Vec; deep: boolean }

/**
 * The tiles the deck's picture is drawn over: its boards; the edge and the
 * posts below them (a tile down the screen from the boards); the rails at the
 * ends of its two jetties; where its posts stand; and the row behind its far
 * railing. A float there would be under the picture, or on it.
 */
const underDeck = new Set([
  ...PIER.deck.flatMap(([x, y]) => [`${x},${y}`, `${x + 1},${y + 1}`]),
  ...PIER.tiles.map(([x, y]) => `${x},${y}`),
  // (the posts at the floor's two left corners, and the rails at the jetties' ends)
  "15,37", "15,38", "17,43", "18,44", "12,40", "19,47", "19,48", "20,48",
]);
/** Whether a float can ride at a point: on water a little way from its edge, and clear of the deck's picture all round. */
function openWater(x: number, y: number): boolean {
  if (acrossRiver(x, y) > RIVER_HALF - CAST.clear) return false;
  for (const dx of [-0.7, 0, 0.7]) for (const dy of [-0.7, 0, 0.7]) {
    const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
    if (underDeck.has(`${tx},${ty}`) || (ty === 37 && tx >= 16 && tx <= 27)) return false;
  }
  return true;
}
/** The eight ways a line can be cast, as steps of a tile. */
const WAYS: Vec[] = [[-1, 1], [-1, 0], [0, 1], [-1, -1], [1, 1], [0, -1], [1, 0], [1, -1]].map(([x, y]) => ({ x: x / Math.hypot(x, y), y: y / Math.hypot(x, y) }));
const fishing = new Map<string, Fishing | null>();
/**
 * Whether the fishing deck and the cooking yard are finished, for whoever looks at this page.
 *
 * They are where the town's game is played, so they are finished for whoever the game is open to and building
 * sites for everybody else: the owner finished them in `next dev` only while the game was a trial there ("เฉพาะใน
 * dev", 2026-10-03), and the game now goes up shut, the admins' first, his to open (v115's knob). The map says so
 * when its keeper answers (Town.tsx). Until then: finished in `next dev`, sites in production, as before.
 *
 * So two people may see them differently for as long as the game is open to one and not the other: an admin on the
 * deck stands, for a member, on the site. Nothing is kept of where anybody may walk; each page works that out.
 */
export function setBuilt(done: boolean) {
  const stage = done ? 2 : 1;
  if (PIER.stage === stage && KITCHEN.stage === stage) return;
  PIER.stage = stage;
  KITCHEN.stage = stage;
  // (where a line can be dropped from was worked out with the deck as it was)
  fishing.clear();
}
/** Whether they are finished here now. */
export const isBuilt = () => PIER.stage === 2 && KITCHEN.stage === 2;
/**
 * Something worked out with the two finished, whatever this page shows at the moment.
 *
 * For whatever the database keeps a copy of and holds a member to (the insects' haunts, where a line may be dropped
 * from: lib/town/catalog): it has to come out the same on every page, and a page in a production build begins with the
 * two as building sites, before its keeper has answered. The haunts were once laid out as the page stood at that
 * moment: on the site itself nearly every one lay somewhere else than the database's, and a catch there was refused as
 * too far away (found 2026-10-05, the morning the insects came, by a member).
 */
export function asBuilt<T>(make: () => T): T {
  const pier = PIER.stage, kitchen = KITCHEN.stage, same = pier === 2 && kitchen === 2;
  if (!same) { PIER.stage = 2; KITCHEN.stage = 2; fishing.clear(); }
  // ── to come ── (and as the town was before the bridge and the blacksmith: what the database keeps was laid out
  // with neither, and has to come out so in the preview too)
  const was = asWas;
  asWas = true;
  try { return make(); } finally {
    asWas = was;
    if (!same) { PIER.stage = pier; KITCHEN.stage = kitchen; fishing.clear(); }
  }
}
/**
 * Whether somebody standing on a tile can fish from it, and where their float
 * lands.
 *
 * - **On the finished deck**: any tile of its boards with open water within a
 *   cast. The line goes towards the middle of the river if it can (straight
 *   across the screen), otherwise the nearest way round; deep water.
 * - **On the town's bank**: any tile somebody can stand on beside the water,
 *   all along the river. The line lands a little way out; the shallows.
 */
export function fishFrom(tx: number, ty: number): Fishing | null {
  const key = `${tx},${ty}`, known = fishing.get(key);
  if (known !== undefined) return known;
  let found: Fishing | null = null;
  const cx = tx + 0.5, cy = ty + 0.5;
  // which side of the river's middle: the town's is below it in y − x
  const side = cy - cx - riverMiddle(cx + cy - 1);
  if (onDeck(tx, ty)) {
    // towards the middle of the river first, then round from there; a way further round has to be nearer to be chosen
    let best = Infinity;
    // (tiles in a row across the screen would all land on the same spot: each casts a little further than the next)
    const further = [0, 0.5, 1][(((tx + 2 * ty) % 3) + 3) % 3];
    WAYS.forEach((w, n) => {
      const way = side < 0 ? w : { x: -w.x, y: -w.y };
      for (let d = CAST.least; d <= CAST.reach + 1e-9; d += 0.1) {
        if (!openWater(cx + way.x * d, cy + way.y * d)) continue;
        if (d + n * 0.35 < best) {
          best = d + n * 0.35;
          const far = [further, further / 2, 0].map((more) => d + more).find((at) => at <= CAST.reach + 1e-9 && openWater(cx + way.x * at, cy + way.y * at))!;
          found = { float: { x: Math.round((cx + way.x * far) * 100) / 100, y: Math.round((cy + way.y * far) * 100) / 100 }, deep: true };
        }
        break;
      }
    });
  } else if (placeOf(tx, ty) === "town" && side < 0 && isBank(tx, ty) && walkable(tx, ty)) {
    // straight across the screen, out to where the water is a little way from its edge; further if the deck is in the way
    const across = -side;
    for (let more = 0; more <= 2.5 && !found; more += 0.25) {
      const k = (across - (RIVER_HALF - CAST.out) + more) / 2, x = cx - k, y = cy + k;
      if (k * Math.SQRT2 <= CAST.reach && openWater(x, y)) found = { float: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }, deep: false };
    }
  }
  fishing.set(key, found);
  return found;
}

/** The kinds of ground: the town's, the farm's plots, and the floor of the forest under its trees. */
export type Ground = "plaza" | "road" | "grass" | "water" | "sand" | "field" | "wood";

/** The kind of ground, for drawing. */
export function groundAt(tx: number, ty: number): Ground {
  // ── to come ── (of the mountain and the cave, only what the town's own kinds can say: a trail or a stair is road,
  // grass and a wood's floor are themselves, and bare rock, snow, a cliff and all of a cave are sand. What they are
  // drawn as is groundLook's to say)
  if (PREVIEW && ty >= MOUNTAIN.y) { const g = moreLook(tx + 0.5, ty + 0.5); return g === "road" || g === "stair" ? "road" : g === "grass" || g === "wood" ? g : "sand"; }
  if (within(tx, ty, FARM)) return farmGround(tx - FARM.x + 0.5, ty - FARM.y + 0.5);
  if (within(tx, ty, FOREST)) return forestGround(tx - FOREST.x + 0.5, ty - FOREST.y + 0.5);
  if (isWater(tx, ty)) return "water";
  if (isBank(tx, ty)) return "sand";
  if (isPlaza(tx, ty)) return "plaza";
  if (isRoad(tx, ty) || isShop(tx, ty)) return "road";
  return "grass";
}

/**
 * The ground at a point (not a tile), for drawing: the same shapes as the
 * tiles, but with curved edges, and the river's sand a band of its own that
 * frays a little at its edge.
 */
export function groundLook(x: number, y: number): Ground | MoreGround {
  // ── to come ── (the mountain, the cave's floors, what is seen beyond them, and the earth at the bridge's two ends)
  if (PREVIEW) { const more = moreLook(x, y); if (more) return more; }
  if (within(x, y, FARM)) return farmGround(x - FARM.x, y - FARM.y);
  if (within(x, y, FOREST)) return forestGround(x - FOREST.x, y - FOREST.y);
  if (within(x, y, BEYOND.north) || within(x, y, BEYOND.south)) return beyondGround(x, y);
  const r = acrossRiver(x, y);
  if (r < RIVER_HALF) return "water";
  if (r < RIVER_HALF + 0.9 + 0.22 * Math.sin(x * 1.9) * Math.sin(y * 2.3)) return "sand";
  if (within(x, y, PLAZA)) return "plaza";
  if (within(x, y, SHOP) || pathAt(x, y)) return "road";
  return "grass";
}

/* ── projection ─────────────────────────────────────────────────────────── */

/** Tile coordinates to unscaled isometric pixels, origin at the map's top corner. */
export function toIso(x: number, y: number): Vec {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

/** The inverse: unscaled isometric pixels back to tile coordinates. */
export function fromIso(ix: number, iy: number): Vec {
  const a = ix / (TILE_W / 2);
  const b = iy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/* ── paths ──────────────────────────────────────────────────────────────── */

const DIRS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * A* across the tile grid, eight ways, never cutting a corner past something
 * solid. Returns the tile centres to walk through after the start, ending at
 * the goal's centre, or null when the goal cannot be reached. Deterministic:
 * the same start and goal give the same path on every client.
 */
export function findPath(from: Vec, to: Vec): Vec[] | null {
  const sx = Math.floor(from.x), sy = Math.floor(from.y);
  const gx = Math.floor(to.x), gy = Math.floor(to.y);
  if (!walkable(gx, gy)) return null;
  if (sx === gx && sy === gy) return [{ x: gx + 0.5, y: gy + 0.5 }];
  // No walking from one map to the other: only a gate goes there.
  if (placeOf(sx, sy) !== placeOf(gx, gy)) return null;

  // A tile's number: wider than the farthest tile east (the forest's), so no two tiles share one.
  const SPAN = 256;
  const key = (x: number, y: number) => y * SPAN + x;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - gx), dy = Math.abs(y - gy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map<number, number>([[key(sx, sy), 0]]);
  const came = new Map<number, number>();
  // Small grid, so a sorted array is fast enough and keeps ties deterministic.
  const open: Array<{ x: number; y: number; f: number; n: number }> = [{ x: sx, y: sy, f: h(sx, sy), n: 0 }];
  const closed = new Set<number>();
  let order = 0;

  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.n - b.n);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === gx && cur.y === gy) {
      const path: Vec[] = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(sx, sy)) {
        path.push({ x: (k % SPAN) + 0.5, y: Math.floor(k / SPAN) + 0.5 });
        k = came.get(k);
      }
      return path.reverse();
    }
    closed.add(ck);
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!walkable(nx, ny)) continue;
      // Onto the finished deck and off it only by its steps.
      if (onDeck(nx, ny) !== onDeck(cur.x, cur.y) && !bySteps(cur.x, cur.y, nx, ny)) continue;
      // Into the finished yard and out of it only by its two ways in.
      if (overKerb(cur.x, cur.y, nx, ny)) continue;
      // Diagonals only where both sides are open, so nobody clips a corner. (But across the finished yard's floor
      // they are straight up, down and across the screen, which is how its furniture stands: there they are free.)
      if (dx && dy && (!walkable(cur.x + dx, cur.y) || !walkable(cur.x, cur.y + dy)) && !(onYard(cur.x, cur.y) && onYard(nx, ny))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cost = (g.get(ck) ?? 0) + (dx && dy ? Math.SQRT2 : 1);
      if (cost < (g.get(nk) ?? Infinity)) {
        g.set(nk, cost);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: cost + h(nx, ny), n: ++order });
      }
    }
  }
  return null;
}

/**
 * Walk `dist` tiles along a path. Returns where that leaves you and what is
 * left of the path; an empty path means you have arrived.
 */
export function stepAlong(pos: Vec, path: Vec[], dist: number): { pos: Vec; path: Vec[] } {
  let p = { ...pos };
  const rest = [...path];
  let left = dist;
  while (rest.length && left > 0) {
    const next = rest[0];
    // ── to come ── (from one floor of the cave to another there is no walking: whoever is told to go is stood there at once)
    if (PREVIEW && floorOf(p.x, p.y) !== floorOf(next.x, next.y)) { p = { ...next }; rest.shift(); continue; }
    const dx = next.x - p.x, dy = next.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      p = { ...next };
      rest.shift();
      left -= d;
    } else {
      p = { x: p.x + (dx / d) * left, y: p.y + (dy / d) * left };
      left = 0;
    }
  }
  return { pos: p, path: rest };
}

/* ── hearing ────────────────────────────────────────────────────────────── */

export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Volume (0–1) of somebody `d` tiles away. */
export function hearing(d: number, proximity = PROXIMITY): number {
  if (!proximity) return 1;
  if (d <= NEAR) return 1;
  if (d >= FAR) return 0;
  return 1 - (d - NEAR) / (FAR - NEAR);
}

/* ── who to keep a voice line to ────────────────────────────────────────── */

/**
 * Lines open to people within FAR (where they become audible), and stay open
 * until they are past DROP: the gap stops a line flapping open and shut as
 * somebody walks along the edge, and covers the fraction of a tile by which
 * two screens may disagree about where somebody is.
 */
export const DROP = 9.5;

/**
 * At most this many lines are opened, nearest first. Each line uploads the
 * microphone once more, so the cap is what lets a crowded room work on a
 * phone: in a crowd you talk to the people around you, as in life.
 */
export const MAX_LINES = 8;

/**
 * Who to have a voice line to: everybody already connected and still within
 * DROP, plus the nearest within FAR up to MAX_LINES in all. Lines the other
 * side opened are kept the same way, so both ends agree without talking it
 * over.
 */
export function pickLines(
  me: Vec,
  others: Array<{ id: string; pos: Vec }>,
  connected: ReadonlySet<string>,
  proximity = PROXIMITY,
): Set<string> {
  // One room, everybody together: a line to everybody in voice.
  if (!proximity) return new Set(others.map((o) => o.id));
  const near = others
    .map((o) => ({ id: o.id, d: distance(me, o.pos) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  const keep = new Set<string>();
  for (const o of near) if (connected.has(o.id) && o.d <= DROP) keep.add(o.id);
  for (const o of near) {
    if (keep.size >= MAX_LINES) break;
    if (o.d <= FAR) keep.add(o.id);
  }
  return keep;
}

/* ── arriving ───────────────────────────────────────────────────────────── */

/** The tiles around the fountain where people appear. */
const SPAWNS: Vec[] = (() => {
  const out: Vec[] = [];
  for (let y = FOUNTAIN.y - 2; y <= FOUNTAIN.y + FOUNTAIN.h + 1; y++) for (let x = FOUNTAIN.x - 2; x <= FOUNTAIN.x + FOUNTAIN.w + 1; x++) {
    if (walkable(x, y)) out.push({ x: x + 0.5, y: y + 0.5 });
  }
  return out;
})();

/** Where somebody appears, the same spot for the same person every time. */
export function spawnFor(id: string): Vec {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SPAWNS[Math.abs(hash) % SPAWNS.length];
}
