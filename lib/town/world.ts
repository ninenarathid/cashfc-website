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
  // The near benches are not sat on for now (the owner, 2026-10-04, of somebody sitting there with their back to the
  // viewer: "นั่งมุมนี้ ถอดออกไปก่อน ทำให้นั่งไม่ได้ก่อน เราจะค่อยแก้ทีหลัง"): only the far ones are places. Everything a near
  // place needs is still here (its point, its floor tile, the pose seen from behind): put `true` back in SIDES when
  // that pose is right.
  const SIDES = [false];
  const seats = [[-270, -214, -158], [141, 197, 253]].flatMap((xs, table) => SIDES.flatMap((back) => xs.map((x) => {
    const p = { x, y: back ? -64 : -131 };
    const stand = floor.map((tile) => { const c = px(tile[0] + 0.5, tile[1] + 0.5); return { tile, c, far: Math.hypot(c.x - p.x, c.y - p.y) }; })
      .filter(({ c }) => !back || (c.y > -96 && c.y < -40)).sort((a, b) => a.far - b.far)[0].tile;
    return { at: at(p.x, p.y), px: p.x, py: p.y, back, table, stand };
  })));
  const tops: Array<[number, number, number, number]> = [[-309, -127, -116, -84], [95, -127, 299, -84]];
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
  return { stage: process.env.NODE_ENV !== "production" ? 2 : 1, foot, tiles, near, ways, way, floor, stands, posts, places, wash, seats, tops, lights };
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
  | "fence" | "well" | "shed" | "scarecrow" | "hay";
export interface Prop {
  kind: PropKind; x: number; y: number;
  /** Whether it stops a walker (flowers do not). */
  solid: boolean;
  /** Benches: the way the seat faces. */
  facing?: Facing;
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
 * (GATES): only the north path is closed now.
 */
type Works = { x: number; y: number; arm: "N" | "E" };
const WORKS: Works[] = (["N", "E"] as const).map((dir) => {
  const arm = ARMS.find((a) => a.dir === dir)!;
  const along = dir === "N" ? 1.2 : COLS - 1.2, out = dir === "N" ? PLAZA.y - along : along - PLAZA.x - PLAZA.w;
  const across = pathMiddle(along, out, arm.seed);
  return dir === "N" ? { x: across, y: along, arm: dir } : { x: along, y: across, arm: dir };
});
export const ROADWORKS: Works[] = WORKS.filter((w) => w.arm === "N");
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
  return out.filter((p) => !isPier(p.x, p.y) && !isKitchen(p.x, p.y) && !isKeeper(p.x, p.y) && !(wild(p) && bySite(p.x, p.y))
    && !isWater(p.x, p.y) && !isBank(p.x, p.y));
})();

/** The benches, in a fixed order: somebody sitting is told to the room by this index. */
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
export type Place = "town" | "farm";
/** Which map a point is on, or null for nowhere. */
export function placeOf(x: number, y: number): Place | null {
  if (x >= 0 && y >= 0 && x < COLS && y < ROWS) return "town";
  return within(x, y, FARM) ? "farm" : null;
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
 * the tool shed and hay by the gate, a well where the lanes cross, a scarecrow
 * in each quarter, and woods along the other three sides. A fence is three
 * tiles long, and the shed three across (as the screen sees it).
 */
export const FARM_PROPS: Prop[] = (() => {
  const out: Prop[] = [];
  const put = (kind: PropKind, u: number, v: number, solid = true) => { out.push({ kind, x: FARM.x + u, y: FARM.y + v, solid }); };
  for (const v of [5, 8, 11, 14, 17, 26, 29, 32, 35, 38]) put("fence", 0, v);
  put("shed", 2, 18);
  for (const [u, v] of [[3, 20], [2, 24], [27, 20], [32, 24]]) put("hay", u, v);
  put("well", 28, 23); // (WELL)
  for (const [u, v] of [[11, 11], [48, 11], [19, 32], [40, 32]]) put("scarecrow", u, v);
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
const farmSolid = new Set([`${FARM.x + 1},${FARM.y + 20}`, `${FARM.x + 1},${FARM.y + 23}`, ...FARM_PROPS.flatMap((p) => {
  const at = (dx: number, dy: number) => `${p.x + dx},${p.y + dy}`;
  if (p.kind === "fence") return [at(0, -1), at(0, 0), at(0, 1)];
  if (p.kind === "shed") return [at(-1, 1), at(0, 0), at(1, -1)];
  return p.solid ? [at(0, 0)] : [];
})]);

/**
 * The gates between the maps: the tiles that are one, where stepping on it
 * puts you (`to`, a couple of tiles inside the other map, so nobody arrives on
 * a gate), and where its gateway stands, in the middle of the way. The town's
 * is the end of the east path, where the road works were; the farm's is the
 * lane's first tiles.
 */
const EAST = ARMS.find((a) => a.dir === "E")!;
const eastRow = (x: number) => Math.floor(pathMiddle(x + 0.5, x + 0.5 - PLAZA.x - PLAZA.w, EAST.seed));
export const GATES: Array<{ from: Place; tiles: Array<[number, number]>; to: Vec; arch: Vec }> = [
  {
    from: "town",
    tiles: [COLS - 2, COLS - 1].flatMap((x) => [...Array(ROWS).keys()].filter((y) => isRoad(x, y)).map((y): [number, number] => [x, y])),
    to: { x: FARM.x + 2.5, y: FARM.y + 21.5 },
    arch: { x: COLS - 1.5, y: pathMiddle(COLS - 1.5, COLS - 1.5 - PLAZA.x - PLAZA.w, EAST.seed) },
  },
  {
    from: "farm",
    tiles: [[FARM.x, FARM.y + 21], [FARM.x, FARM.y + 22]],
    to: { x: COLS - 3.5, y: eastRow(COLS - 4) + 0.5 },
    arch: { x: FARM.x + 1.5, y: FARM.y + 22 },
  },
];
/** Where the gate under a point leads, or null when there is none there. */
export function gateAt(x: number, y: number): Vec | null {
  const tx = Math.floor(x), ty = Math.floor(y);
  return GATES.find((g) => g.tiles.some(([gx, gy]) => gx === tx && gy === ty))?.to ?? null;
}

/** What stands on a tile and stops a walker, if anything. */
export function thingAt(tx: number, ty: number): Building | "fountain" | "shop" | "board" | "pier" | "kitchen" | "keeper" | "roadworks" | "water" | "prop" | null {
  if (within(tx, ty, FARM)) return farmSolid.has(`${tx},${ty}`) ? "prop" : null;
  for (const b of BUILDINGS) if (within(tx, ty, b)) return b;
  if (within(tx, ty, FOUNTAIN)) return "fountain";
  if (isShop(tx, ty)) return "shop";
  if (isBoard(tx, ty)) return "board";
  if (onDeck(tx, ty)) return null;
  if (isPier(tx, ty) || behindDeck(tx, ty)) return "pier";
  if (onYard(tx, ty)) return null;
  if (isKitchen(tx, ty)) return "kitchen";
  if (isKeeper(tx, ty)) return "keeper";
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

/** The kinds of ground: the town's, and the farm's plots. */
export type Ground = "plaza" | "road" | "grass" | "water" | "sand" | "field";

/** The kind of ground, for drawing. */
export function groundAt(tx: number, ty: number): Ground {
  if (within(tx, ty, FARM)) return farmGround(tx - FARM.x + 0.5, ty - FARM.y + 0.5);
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
export function groundLook(x: number, y: number): Ground {
  if (within(x, y, FARM)) return farmGround(x - FARM.x, y - FARM.y);
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

  // A tile's number: wider than the farthest tile east (the farm's), so no two tiles share one.
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
