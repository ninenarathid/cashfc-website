import {
  describe, expect, it, vi } from "vitest";
import {
  BENCHES, BEYOND, BEYOND_PROPS, BOARD, CAMP, COLS, DROP, FARM, FARM_PROPS, FORDS, FOREST, FOREST_PROPS, GATES, GREAT_TREE, KEEPERS, KITCHEN, ROADWORKS, FAR, FOUNTAIN, FRONT, MAX_LINES, MOVE_BUDGET, NEAR, PIER, PLAZA, PROPS, ROWS, SHOP, TOWN, benchAt, findPath, fromIso, gateAt, groundAt, hearing, groundLook, moveEvery, onDeck, fishFrom, CAST, pickLines, placeOf, plotAt, spawnFor, stepAlong, thingAt, toIso, walkable, onYard, yardPlace,
  YARD_SEATS, atFire, isBuilt, seenAt, setBuilt, yardSeat, zoneAt, type Zone,
} from "./world";

describe("projection", () => {
  it("goes to isometric pixels and back", () => {
    for (const [x, y] of [[0, 0], [3.5, 7.25], [17.9, 0.1], [9, 9]]) {
      const back = fromIso(toIso(x, y).x, toIso(x, y).y);
      expect(back.x).toBeCloseTo(x, 9);
      expect(back.y).toBeCloseTo(y, 9);
    }
  });
});

describe("walking", () => {
  it("keeps people off the fountain, trees and lamps and the edge of the world, but not flowers", () => {
    expect(walkable(FOUNTAIN.x, FOUNTAIN.y)).toBe(false);
    for (const p of PROPS) expect(walkable(p.x, p.y)).toBe(!p.solid);
    expect(walkable(-1, 3)).toBe(false);
    expect(walkable(COLS, 3)).toBe(false);
    expect(walkable(0, 0)).toBe(true);
  });

  it("keeps the paths and the plaza clear of trees, so nobody's way is blocked", () => {
    // (the plaza's furniture, and the storage box that stands on it: lib/town/box)
    for (const p of PROPS) if (!["lamp", "bench", "barrel", "planter", "signpost", "bin", "flowerbed", "storebox"].includes(p.kind)) expect(groundAt(p.x, p.y)).toBe("grass");
    // and nothing at all stands on a path
    for (const p of PROPS) expect(groundAt(p.x, p.y)).not.toBe("road");
    // every bit of path is walkable (but the shop, on its dirt plot)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (groundAt(x, y) === "road") expect(walkable(x, y) || thingAt(x, y) === "shop").toBe(true);
    }
    // and the north path goes out to the forest's gate, the east one to the farm's; the river stops the other two
    for (const g of [GATES[0], GATES[2]]) expect(findPath({ x: 32.5, y: 31.5 }, { x: g.tiles[0][0] + 0.5, y: g.tiles[0][1] + 0.5 })).not.toBeNull();
  });

  it("winds its paths: each wanders across, but leaves the plaza straight", () => {
    const across = (row: (i: number) => number[]) => {
      const mids: number[] = [];
      for (let i = 0; i < 26; i++) { const r = row(i); if (r.length) mids.push(r.reduce((a, b) => a + b, 0) / r.length); }
      return mids;
    };
    const north = across((y) => [...Array(COLS).keys()].filter((x) => x > 20 && x < 44 && groundAt(x, y) === "road"));
    const east = across((i) => [...Array(ROWS).keys()].filter((y) => y > 20 && y < 44 && groundAt(COLS - 1 - i, y) === "road"));
    for (const mids of [north, east]) {
      expect(mids.length).toBeGreaterThan(20);
      expect(Math.max(...mids) - Math.min(...mids)).toBeGreaterThan(2.5);
    }
    // at the plaza's sides, the paths are its two middle tiles
    for (const [x, y] of [[31, 25], [32, 25], [38, 31], [38, 32], [31, 38], [32, 38], [25, 31], [25, 32]]) expect(groundAt(x, y)).toBe("road");
    // drawn with curves: a tile's middle looks like the tile
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const g = groundAt(x, y);
      if (g !== "sand" && g !== "grass") expect(groundLook(x + 0.5, y + 0.5)).toBe(g);
    }
  });

  it("has no road works left: the north path and the east one are walked to their very ends", () => {
    expect(ROADWORKS).toEqual([]);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) expect(thingAt(x, y)).not.toBe("roadworks");
    for (let y = 0; y < ROWS; y++) if (groundAt(COLS - 1, y) === "road") expect(walkable(COLS - 1, y)).toBe(true);
    let north = 0;
    for (let x = 0; x < COLS; x++) if (groundAt(x, 0) === "road") { north++; expect(walkable(x, 0)).toBe(true); }
    expect(north).toBeGreaterThanOrEqual(2);
  });

  it("has a river on the left that nobody can cross yet, with a sandy bank", () => {
    const water: Array<[number, number]> = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (groundAt(x, y) === "water") water.push([x, y]);
    expect(water.length).toBeGreaterThan(200);
    // twice as wide as it was (the owner, 2026-10-03), away from the town: four tiles of water or more across
    // any row (it was two), and the town's own bank where it always was, by the west path's end
    for (const y of [29, 36, 44, 50]) expect(water.filter(([, wy]) => wy === y).length).toBeGreaterThanOrEqual(4);
    expect(groundAt(9, 29)).toBe("water");
    expect(groundAt(10, 29)).toBe("sand");
    expect(groundAt(12, 29)).toBe("road");
    for (const [x, y] of water) {
      // nobody walks on water, but over it on the finished deck's boards
      expect(walkable(x, y)).toBe(onDeck(x, y));
      // on the left of the map: down-left of the town's middle on the screen
      expect(y - x).toBeGreaterThan(10);
    }
    // every water tile has a bank of sand or more water beside it, towards the town
    for (const [x, y] of water) if (x + 1 < COLS) expect(["water", "sand"]).toContain(groundAt(x + 1, y));
    // it cuts the west and south roads: their far ends can't be reached from the fountain
    expect(findPath({ x: 32.5, y: 31.5 }, { x: 0.5, y: 31.5 })).toBeNull();
    expect(findPath({ x: 32.5, y: 31.5 }, { x: 32.5, y: ROWS - 0.5 })).toBeNull();
    // but the town itself is all on this side
    expect(findPath({ x: 32.5, y: 31.5 }, { x: 16.5, y: 31.5 })).not.toBeNull();
  });

  it("stands the Popoto Board north of the fountain, in the way of nobody", () => {
    expect(BOARD.x + BOARD.y).toBeLessThan(FOUNTAIN.x + FOUNTAIN.y);
    expect(Math.abs(BOARD.x - BOARD.y)).toBeLessThanOrEqual(1);
    for (let y = BOARD.y; y < BOARD.y + BOARD.h; y++) for (let x = BOARD.x; x < BOARD.x + BOARD.w; x++) expect(walkable(x, y)).toBe(false);
    expect(findPath({ x: 32.5, y: 31.5 }, { x: 31.5, y: 2.5 })).not.toBeNull();
    // somewhere to stand in front of it, to read it
    expect(walkable(BOARD.x + BOARD.w, BOARD.y + BOARD.h)).toBe(true);
  });

  it("stands the fishing deck on the town's bank, between the west and south paths and on neither", () => {
    expect(PIER.tiles.length).toBeGreaterThan(60);
    const kinds = new Set<string>();
    for (const [x, y] of PIER.tiles) kinds.add(groundAt(x, y));
    // on the bank, with its left end over the river, and on no path
    expect([...kinds].sort()).toEqual(["grass", "sand", "water"]);
    // its post stands in the water
    expect(groundAt(Math.floor(PIER.post.x), Math.floor(PIER.post.y))).toBe("water");
    const xs = PIER.tiles.map(([x]) => x), ys = PIER.tiles.map(([, y]) => y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    // straight left of the plaza on the screen (as far down it as the plaza's middle, give or take), below its left corner
    expect(Math.abs((x0 + x1 + 1) / 2 + (y0 + y1 + 1) / 2 - (PLAZA.x + PLAZA.y + PLAZA.w))).toBeLessThan(3);
    expect(y0).toBeGreaterThanOrEqual(PLAZA.y + PLAZA.h);
    // nothing of the town's layout is left standing on it, and no tree or bush in front of it
    const on = new Set(PIER.tiles.map(([x, y]) => `${x},${y}`));
    for (const p of PROPS) {
      expect(on.has(`${p.x},${p.y}`)).toBe(false);
      if (p.kind === "tree" || p.kind === "bush") expect(p.x >= x0 - 1 && p.x <= x1 + 2 && p.y >= y0 - 1 && p.y <= y1 + 2).toBe(false);
    }
    // people walk up to it: to the foot of its steps (from the south path, which stays clear beside it), and in front
    for (const [x, y] of [[x1 + 1.5, y0 + 2.5], [x0 + 8.5, y1 + 1.5]])
      expect(findPath({ x: 32.5, y: 31.5 }, { x, y })).not.toBeNull();
    // the west path's end, where the deck first stood, is clear again
    expect(walkable(13, 31)).toBe(true);
  });

  it("is finished in `next dev`: walked onto by its steps and nowhere else", () => {
    expect(PIER.stage).toBe(2);
    expect(PIER.deck.length).toBeGreaterThan(50);
    for (const [x, y] of PIER.deck) {
      expect(onDeck(x, y)).toBe(true);
      expect(thingAt(x, y)).toBeNull();
      expect(walkable(x, y)).toBe(true);
    }
    // where its posts stand and no boards are drawn, nobody stands; nor behind its far railing
    const deck = new Set(PIER.deck.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of PIER.tiles) if (!deck.has(`${x},${y}`)) expect(thingAt(x, y)).toBe("pier");
    for (let x = 16; x <= 27; x++) expect(walkable(x, 37)).toBe(false);
    // the steps: the deck's tile at their top, the ground's at their foot, side by side
    const { top, foot } = PIER.steps;
    expect(onDeck(top[0], top[1])).toBe(true);
    expect(onDeck(foot[0], foot[1])).toBe(false);
    expect(walkable(foot[0], foot[1])).toBe(true);
    expect(Math.abs(top[0] - foot[0]) + Math.abs(top[1] - foot[1])).toBe(1);
    // every board is walked to from the fountain, and the way there goes up the steps: the last tile of ground
    // before the deck is their foot, and the first board their top
    for (const [x, y] of PIER.deck) {
      const path = findPath({ x: 32.5, y: 31.5 }, { x: x + 0.5, y: y + 0.5 });
      expect(path).not.toBeNull();
      const first = path!.findIndex((p) => onDeck(Math.floor(p.x), Math.floor(p.y)));
      expect([Math.floor(path![first].x), Math.floor(path![first].y)]).toEqual(top);
      expect([Math.floor(path![first - 1].x), Math.floor(path![first - 1].y)]).toEqual(foot);
      // and once on it, it stays on it
      for (const p of path!.slice(first)) expect(onDeck(Math.floor(p.x), Math.floor(p.y))).toBe(true);
    }
    // and off it the same way
    const down = findPath({ x: 12.5, y: 39.5 }, { x: foot[0] + 2.5, y: foot[1] + 0.5 })!;
    const last = down.findIndex((p) => !onDeck(Math.floor(p.x), Math.floor(p.y)));
    expect([Math.floor(down[last].x), Math.floor(down[last].y)]).toEqual(foot);
  });

  it("can be fished from wherever a line reaches open water (the owner: \"อยากให้ area ที่ตกปลาได้ เยอะกว่านี้\")", () => {
    const from = PIER.deck.filter(([x, y]) => fishFrom(x, y));
    // far more than the eight places there were, but not the whole floor: its landward part is too far from the water
    expect(from.length).toBeGreaterThanOrEqual(20);
    expect(from.length).toBeLessThan(PIER.deck.length);
    // every tile of the two jetties; none by the steps
    for (const [x, y] of [[12, 39], [13, 39], [14, 39], [15, 39], [19, 44], [19, 45], [19, 46]]) expect(fishFrom(x, y)).not.toBeNull();
    expect(fishFrom(PIER.steps.top[0], PIER.steps.top[1])).toBeNull();
    const seen = new Set<string>();
    for (const [x, y] of from) {
      const f = fishFrom(x, y)!;
      expect(f.deep).toBe(true);
      // the float is on open water: off the boards and clear of where the posts stand, a cast away and no further
      expect(groundLook(f.float.x, f.float.y)).toBe("water");
      const fx = Math.floor(f.float.x), fy = Math.floor(f.float.y);
      expect(onDeck(fx, fy)).toBe(false);
      expect(thingAt(fx, fy)).toBe("water");
      const far = Math.hypot(f.float.x - x - 0.5, f.float.y - y - 0.5);
      expect(far).toBeGreaterThanOrEqual(CAST.least - 0.01);
      expect(far).toBeLessThanOrEqual(CAST.reach + 0.01);
      seen.add(`${f.float.x},${f.float.y}`);
    }
    // no two land on the same spot, and a tile's answer is the same every time
    expect(seen.size).toBe(from.length);
    expect(fishFrom(17, 40)).toEqual(fishFrom(17, 40));
  });

  it("lets the town's bank be fished from all along the river, in the shallows", () => {
    const bank: Array<[number, number]> = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!onDeck(x, y) && fishFrom(x, y)) bank.push([x, y]);
    expect(bank.length).toBeGreaterThan(40);
    for (const [x, y] of bank) {
      const f = fishFrom(x, y)!;
      expect(f.deep).toBe(false);
      // somebody can stand there, on the sand; the float is on the water, straight across the screen and not far
      expect(walkable(x, y)).toBe(true);
      expect(groundAt(x, y)).toBe("sand");
      expect(groundLook(f.float.x, f.float.y)).toBe("water");
      expect(f.float.x + f.float.y).toBeCloseTo(x + y + 1, 1);
      expect(Math.hypot(f.float.x - x - 0.5, f.float.y - y - 0.5)).toBeLessThanOrEqual(CAST.reach + 0.01);
      // the town's side of the river: the float is further from the plaza than the one who cast it
      expect(Math.hypot(x + 0.5 - 32, y + 0.5 - 32)).toBeLessThan(Math.hypot(f.float.x - 32, f.float.y - 32));
    }
    // all along it: above the deck and below it, towards both ends of the map
    const down = bank.map(([x, y]) => x + y);
    expect(Math.min(...down)).toBeLessThan(40);
    expect(Math.max(...down)).toBeGreaterThan(90);
    // and nowhere else: not from the plaza, the grass, the far bank, the farm
    expect(fishFrom(32, 32)).toBeNull();
    expect(fishFrom(40, 30)).toBeNull();
    expect(fishFrom(10, 40)).toBeNull();
    expect(fishFrom(FARM.x + 5, FARM.y + 5)).toBeNull();
  });

  it("is still a building site in a production build: every tile of it closed", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    try {
      const built = await import("./world");
      expect(built.PIER.stage).toBe(1);
      for (const [x, y] of built.PIER.tiles) expect(built.thingAt(x, y)).toBe("pier");
      // no tile is a board yet, and nobody walks over the water where the jetties will be
      for (const [x, y] of built.PIER.deck) {
        expect(built.onDeck(x, y)).toBe(false);
        if (built.groundAt(x, y) === "water") expect(built.walkable(x, y)).toBe(false);
      }
      // nobody fishes from boards that are not laid; the bank beside it is still the bank
      for (const [x, y] of built.PIER.deck) if (built.groundAt(x, y) !== "sand" || !built.walkable(x, y)) expect(built.fishFrom(x, y)).toBeNull();
      // behind it people walk as they always did, and up to where the steps will be
      expect(built.thingAt(20, 37)).not.toBe("pier");
      expect(built.findPath({ x: 32.5, y: 31.5 }, { x: 28.5, y: 40.5 })).not.toBeNull();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("builds the cooking yard below the plaza, lying across the screen, clear of the east and south paths", () => {
    // twice as long and twice as deep as the first one drawn (which closed some forty tiles)
    expect(KITCHEN.tiles.length).toBeGreaterThan(140);
    for (const [x, y] of KITCHEN.tiles) {
      // (finished, its floor is walked on; the rest of it stands in the way as before)
      expect(thingAt(x, y)).toBe(onYard(x, y) ? null : "kitchen");
      expect(groundAt(x, y)).toBe("grass");
    }
    // across the screen is x − y, down it x + y: it is wide, not deep, and its near and far edges are level
    const across = KITCHEN.tiles.map(([x, y]) => x - y), down = KITCHEN.tiles.map(([x, y]) => x + y);
    const wide = (Math.max(...across) - Math.min(...across)) * 32, deep = (Math.max(...down) - Math.min(...down)) * 16;
    expect(wide).toBeGreaterThan(640);
    expect(wide).toBeGreaterThan(2.5 * deep);
    // below the plaza's lowest corner on the screen, and about under it
    expect(Math.min(...down)).toBeGreaterThan(PLAZA.x + PLAZA.w + PLAZA.y + PLAZA.h);
    expect(Math.abs((Math.max(...across) + Math.min(...across)) / 2 - (PLAZA.x - PLAZA.y))).toBeLessThan(4);
    // on no path, and with grass between it and each of them (the owner: "อย่าทับทางเดินด้วย")
    for (const [x, y] of KITCHEN.tiles) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const g = groundAt(x + dx, y + dy);
      expect(g === "road" || g === "plaza" || g === "water" || g === "sand").toBe(false);
    }
    // nothing of the town's layout is left standing on it, and no tree, bush or rock stands over its near kerb
    for (const p of PROPS) {
      expect(thingAt(p.x, p.y)).not.toBe("kitchen");
      if (p.kind === "tree" || p.kind === "pine" || p.kind === "bush" || p.kind === "rock") expect(KITCHEN.near(p.x, p.y)).toBe(false);
    }
    // its picture stands by its front, by the way in: walked up to there, and round its back and both its ends
    expect(walkable(Math.floor(KITCHEN.foot.x), Math.floor(KITCHEN.foot.y))).toBe(true);
    // (a point of its picture, in pixels from its ground point, as a point of the map; and the walkable tile nearest one)
    const at = (px: number, py: number) => ({ x: KITCHEN.foot.x + (py / 16 + px / 32) / 2, y: KITCHEN.foot.y + (py / 16 - px / 32) / 2 });
    const by = (p: { x: number; y: number }) => {
      for (let r = 0; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy;
        if (walkable(x, y)) return { x: x + 0.5, y: y + 0.5 };
      }
      return null;
    };
    for (const p of [KITCHEN.foot, at(-430, -130), at(430, -130), at(0, -300)]) {
      const stand = by(p);
      expect(stand).not.toBeNull();
      expect(findPath({ x: 32.5, y: 31.5 }, stand!)).not.toBeNull();
    }
  });

  it("is finished in `next dev`: its floor walked on, by its two ways in, between what stands on it", () => {
    expect(KITCHEN.stage).toBe(2);
    expect(KITCHEN.floor.length).toBeGreaterThan(60);
    // every tile of its floor is reached from the plaza, and only through one of the two ways in
    for (const [x, y] of KITCHEN.floor) {
      expect(onYard(x, y)).toBe(true);
      expect(walkable(x, y)).toBe(true);
      const path = findPath({ x: 32.5, y: 31.5 }, { x: x + 0.5, y: y + 0.5 });
      expect(path).not.toBeNull();
      const first = path!.findIndex((p) => onYard(Math.floor(p.x), Math.floor(p.y)));
      expect(KITCHEN.way.some(([wx, wy]) => wx === Math.floor(path![first].x) && wy === Math.floor(path![first].y))).toBe(true);
    }
    // somewhere to stand at every stove, both worktables and the fire, and at the tub
    const at = (kind: string) => KITCHEN.places.filter((p) => p.kind === kind).length;
    expect(at("stove")).toBeGreaterThanOrEqual(3);
    expect(at("table")).toBeGreaterThanOrEqual(2);
    expect(at("fire")).toBeGreaterThanOrEqual(1);
    expect(KITCHEN.wash.length).toBeGreaterThanOrEqual(1);
    for (const p of KITCHEN.places) expect(yardPlace(p.at[0], p.at[1])).toBe(p.kind);
    for (const [x, y] of KITCHEN.wash) expect(yardPlace(x, y)).toBe("wash");
    expect(yardPlace(32, 32)).toBeNull();
    // nothing stands where the floor is: each tile's middle is outside every stove, table and tub as it stands on the ground
    const px = (x: number, y: number) => ({ x: (x - y - (KITCHEN.foot.x - KITCHEN.foot.y)) * 32, y: (x + y + 1 - (KITCHEN.foot.x + KITCHEN.foot.y)) * 16 });
    for (const [x, y] of KITCHEN.floor) {
      if (KITCHEN.way.some(([wx, wy]) => wx === x && wy === y)) continue;
      const p = px(x, y);
      for (const st of KITCHEN.stands) expect(p.x > st.box[0] && p.x < st.box[2] && p.y > st.box[1] + st.rise && p.y < st.box[3]).toBe(false);
    }
  });

  it("is still a building site in a production build: nobody walks on the yard", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    try {
      const built = await import("./world");
      expect(built.KITCHEN.stage).toBe(1);
      for (const [x, y] of built.KITCHEN.tiles) { expect(built.thingAt(x, y)).toBe("kitchen"); expect(built.onYard(x, y)).toBe(false); expect(built.yardPlace(x, y)).toBeNull(); }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("stands the two shopkeepers in front of the Popoto Shop, off the paths", () => {
    expect(KEEPERS.map((k) => k.id)).toEqual(["uncle", "banker"]);
    for (const k of KEEPERS) {
      for (const [x, y] of k.tiles) {
        expect(thingAt(x, y)).toBe("keeper");
        expect(groundAt(x, y)).toBe("grass");
      }
      // each stands on a tile of its own, in front of its stand (lower on the screen)
      expect(k.tiles.some(([x, y]) => x === Math.floor(k.at.x) && y === Math.floor(k.at.y))).toBe(true);
      expect(k.at.x + k.at.y).toBeGreaterThan(k.stand.x + k.stand.y);
      // on the shop's side of town: below it and to its right on the screen
      expect(k.stand.x).toBeGreaterThan(SHOP.x + SHOP.w);
      expect(k.stand.x + k.stand.y).toBeGreaterThan(SHOP.x + SHOP.w + SHOP.y + SHOP.h);
    }
    for (const p of PROPS) expect(thingAt(p.x, p.y)).not.toBe("keeper");
    // somebody can walk up to each of them
    for (const k of KEEPERS) expect(findPath({ x: 32.5, y: 31.5 }, { x: Math.floor(k.at.x) + 0.5, y: Math.floor(k.at.y) + 1.5 })).not.toBeNull();
  });

  it("has a farm of its own, far to the east, that only a gate reaches", () => {
    expect(placeOf(32, 32)).toBe("town");
    expect(placeOf(FARM.x + 5, FARM.y + 5)).toBe("farm");
    expect(placeOf(COLS + 10, 10)).toBeNull();
    expect(FARM.x).toBeGreaterThan(COLS + 32);
    // wide: plots for everybody, a seed to a plot
    let plots = 0;
    for (let y = FARM.y; y < FARM.y + FARM.h; y++) for (let x = FARM.x; x < FARM.x + FARM.w; x++) {
      if (!plotAt(x, y)) continue;
      plots++;
      expect(groundAt(x, y)).toBe("field");
      expect(walkable(x, y)).toBe(true);
      expect(groundLook(x + 0.5, y + 0.5)).toBe("field");
    }
    expect(plots).toBeGreaterThan(1000);
    expect(plotAt(32, 32)).toBe(false);
    // everything of the farm's is in the farm, and nothing stands on a plot or a lane
    for (const p of FARM_PROPS) {
      expect(placeOf(p.x, p.y)).toBe("farm");
      expect(plotAt(p.x, p.y)).toBe(false);
      expect(groundAt(p.x, p.y)).toBe("grass");
    }
    expect(FARM_PROPS.filter((p) => p.kind === "scarecrow").length).toBe(4);
    // no walking between the maps
    const [town, farm] = GATES;
    expect(findPath({ x: 32.5, y: 31.5 }, farm.to)).not.toBeNull();
    expect(findPath({ x: 32.5, y: 31.5 }, town.to)).toBeNull();
    expect(findPath(town.to, { x: 32.5, y: 31.5 })).toBeNull();
    expect(walkable(COLS + 10, 10)).toBe(false);
    // from where the town's gate puts you, every corner of the farm is walked to, and the gate back
    for (const [u, v] of [[5, 5], [55, 5], [5, 39], [55, 39], [29, 21]]) expect(findPath(town.to, { x: FARM.x + u + 0.5, y: FARM.y + v + 0.5 })).not.toBeNull();
    expect(findPath(town.to, { x: farm.tiles[0][0] + 0.5, y: farm.tiles[0][1] + 0.5 })).not.toBeNull();
  });

  it("joins the maps by gates: the east path's end and the farm lane's, the north path's end and the foot of the forest's trail", () => {
    const [town, farm, north, forest] = GATES;
    expect(GATES.map((g) => [g.from, g.leads])).toEqual([["town", "farm"], ["farm", "town"], ["town", "forest"], ["forest", "town"]]);
    expect(town.tiles.length).toBeGreaterThanOrEqual(2);
    expect(north.tiles.length).toBeGreaterThanOrEqual(2);
    // the north one is at the top of the town's map, and no tile is a gate to two places
    for (const [, y] of north.tiles) expect(y).toBeLessThan(2);
    expect(new Set(GATES.flatMap((g) => g.tiles.map(([x, y]) => `${x},${y}`))).size).toBe(GATES.reduce((n, g) => n + g.tiles.length, 0));
    expect(placeOf(north.to.x, north.to.y)).toBe("forest");
    expect(placeOf(forest.to.x, forest.to.y)).toBe("town");
    expect(findPath({ x: 32.5, y: 31.5 }, forest.to)).not.toBeNull();
    expect(findPath(north.to, { x: forest.tiles[0][0] + 0.5, y: forest.tiles[0][1] + 0.5 })).not.toBeNull();
    for (const g of GATES) {
      for (const [x, y] of g.tiles) {
        expect(placeOf(x, y)).toBe(g.from);
        expect(groundAt(x, y)).toBe("road");
        expect(walkable(x, y)).toBe(true);
        expect(gateAt(x + 0.5, y + 0.5)).toEqual(g.to);
      }
      // it puts you on the other map, on a walkable tile of path that is not itself a gate
      expect(placeOf(g.to.x, g.to.y)).not.toBe(g.from);
      expect(walkable(Math.floor(g.to.x), Math.floor(g.to.y))).toBe(true);
      expect(groundAt(Math.floor(g.to.x), Math.floor(g.to.y))).toBe("road");
      expect(gateAt(g.to.x, g.to.y)).toBeNull();
    }
    expect(gateAt(32.5, 31.5)).toBeNull();
    // walked to from the fountain, and from the farm's far corner
    expect(findPath({ x: 32.5, y: 31.5 }, { x: town.tiles[0][0] + 0.5, y: town.tiles[0][1] + 0.5 })).not.toBeNull();
    expect(findPath({ x: FARM.x + 55.5, y: FARM.y + 39.5 }, { x: farm.tiles[0][0] + 0.5, y: farm.tiles[0][1] + 0.5 })).not.toBeNull();
  });

  it("has a forest of its own, out of the north path, that only a gate reaches", () => {
    expect(placeOf(FOREST.x + 5, FOREST.y + 5)).toBe("forest");
    expect(placeOf(FOREST.x - 1, FOREST.y + 5)).toBeNull();
    // clear of the farm, and no further east than a path's tiles are numbered
    expect(FOREST.y).toBeGreaterThan(FARM.y + FARM.h + 32);
    expect(FOREST.x + FOREST.w).toBeLessThanOrEqual(256);
    const [, , north] = GATES;
    expect(findPath({ x: 32.5, y: 31.5 }, north.to)).toBeNull();
    expect(findPath(north.to, { x: 32.5, y: 31.5 })).toBeNull();
    expect(findPath(north.to, { x: FARM.x + 5.5, y: FARM.y + 5.5 })).toBeNull();
    // a big map with every kind of ground a forest has, and every part of it
    const grounds = new Map<string, number>(), zones = new Map<Zone, number>();
    for (let y = FOREST.y; y < FOREST.y + FOREST.h; y++) for (let x = FOREST.x; x < FOREST.x + FOREST.w; x++) {
      const g = groundAt(x, y);
      grounds.set(g, (grounds.get(g) ?? 0) + 1);
      zones.set(zoneAt(x, y)!, (zones.get(zoneAt(x, y)!) ?? 0) + 1);
      // drawn with curves: a tile's middle looks like the tile; and nobody walks on water
      expect(groundLook(x + 0.5, y + 0.5)).toBe(g);
      if (g === "water") expect(walkable(x, y)).toBe(false);
    }
    expect([...grounds.keys()].sort()).toEqual(["grass", "road", "sand", "water", "wood"]);
    expect(grounds.get("wood")!).toBeGreaterThan(3000);
    expect([...zones.keys()].sort()).toEqual(["bamboo", "camp", "deep", "edge", "rise", "stream", "woods"]);
    for (const n of zones.values()) expect(n).toBeGreaterThan(100);
    expect(zoneAt(32, 32)).toBeNull();
    expect(zoneAt(FARM.x + 5, FARM.y + 5)).toBeNull();
  });

  it("lays the forest out so that nothing but the stream and the cliff shuts a way", () => {
    const at = (p: { x: number; y: number }) => `${p.x},${p.y}`;
    const solid = new Set(FOREST_PROPS.filter((p) => p.solid).map(at));
    for (const p of FOREST_PROPS) {
      expect(placeOf(p.x, p.y)).toBe("forest");
      expect(walkable(p.x, p.y)).toBe(!p.solid && thingAt(p.x, p.y) === null);
      // nothing stands on a trail or in the water, and nothing solid right beside a trail
      expect(["road", "water"]).not.toContain(groundAt(p.x, p.y));
      if (!p.solid) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) expect(groundAt(p.x + dx, p.y + dy)).not.toBe("road");
    }
    // within the forest (its rim and its cliff apart) no two solid things touch, even at a corner
    const inner = (p: { x: number; y: number; kind: string }) => p.x > FOREST.x + 1 && p.y > FOREST.y + 1 && p.x < FOREST.x + FOREST.w - 2 && p.y < FOREST.y + 70
      && p.kind !== "boulder" && p.kind !== "rock" && p.kind !== "tent" && p.kind !== "logseat" && p.kind !== "campfire";
    for (const p of FOREST_PROPS) if (p.solid && inner(p)) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) {
        const q = FOREST_PROPS.find((o) => o.solid && o.x === p.x + dx && o.y === p.y + dy);
        if (q && inner(q)) expect(`${at(p)} beside ${at(q)}`).toBe("");
      }
    }
    expect(solid.size).toBeGreaterThan(900);
    // so from where the gate puts somebody, all of it is walked to (a handful of corners by the water apart)
    const [, , north] = GATES, start: [number, number] = [Math.floor(north.to.x), Math.floor(north.to.y)];
    const seen = new Set([start.join(",")]), queue = [start];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (!seen.has(k) && walkable(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); }
      }
    }
    let open = 0;
    for (let y = FOREST.y; y < FOREST.y + FOREST.h; y++) for (let x = FOREST.x; x < FOREST.x + FOREST.w; x++) if (walkable(x, y)) open++;
    expect(open).toBeGreaterThan(5200);
    expect(open - seen.size).toBeLessThan(10);
    // the camp, the grove, the rise, the pool's shore and the great tree's foot
    for (const [u, v] of [[49, 50], [10, 47], [84, 50], [82, 35], [48, 10], [20, 14], [76, 10]]) expect(seen.has(`${FOREST.x + u},${FOREST.y + v}`)).toBe(true);
  });

  it("keeps the deep woods the far side of the stream: reached only over a ford", () => {
    const [, , north] = GATES;
    const way = findPath(north.to, { x: GREAT_TREE.x + 1.5, y: GREAT_TREE.y + GREAT_TREE.h + 1.5 })!;
    expect(way).not.toBeNull();
    // the walk to the great tree crosses the stream on stones, at one of the fords
    const stones = way.filter((p) => groundAt(Math.floor(p.x), Math.floor(p.y)) === "sand" && FORDS.some((f) => Math.abs(p.x - FOREST.x - f) < 1.1));
    expect(stones.length).toBeGreaterThan(0);
    // and with the fords shut there is no way at all: every tile of them is where the stream would be
    const banks = new Set<string>();
    for (const f of FORDS) for (let v = 0; v < FOREST.h; v++) for (const u of [f - 1, f]) if (groundAt(FOREST.x + u, FOREST.y + v) === "sand") banks.add(`${FOREST.x + u},${FOREST.y + v}`);
    const seen = new Set([`${Math.floor(north.to.x)},${Math.floor(north.to.y)}`]), queue: Array<[number, number]> = [[Math.floor(north.to.x), Math.floor(north.to.y)]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (!seen.has(k) && !banks.has(k) && walkable(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); }
      }
    }
    for (let y = FOREST.y; y < FOREST.y + FOREST.h; y++) for (let x = FOREST.x; x < FOREST.x + FOREST.w; x++) if (seen.has(`${x},${y}`)) expect(zoneAt(x, y)).not.toBe("deep");
    // the great tree is closed, with a clearing round it; the camp's fire is stood beside
    for (let y = GREAT_TREE.y; y < GREAT_TREE.y + GREAT_TREE.h; y++) for (let x = GREAT_TREE.x; x < GREAT_TREE.x + GREAT_TREE.w; x++) expect(walkable(x, y)).toBe(false);
    expect(zoneAt(GREAT_TREE.x, GREAT_TREE.y)).toBe("deep");
    expect(walkable(CAMP.fire.x, CAMP.fire.y)).toBe(false);
    expect(zoneAt(CAMP.fire.x, CAMP.fire.y)).toBe("camp");
    expect(atFire(CAMP.fire.x + 1, CAMP.fire.y)).toBe(true);
    expect(atFire(CAMP.fire.x + 1, CAMP.fire.y + 1)).toBe(true);
    expect(atFire(CAMP.fire.x, CAMP.fire.y)).toBe(false);
    expect(atFire(CAMP.fire.x + 2, CAMP.fire.y)).toBe(false);
    expect(walkable(CAMP.fire.x + 1, CAMP.fire.y)).toBe(true);
  });

  it("is entered through woods on both sides of its gate, with woods beyond them where no map is", () => {
    const [, , north, forest] = GATES;
    // the town's side: the north path's last stretch has trees thick about it, none on it, and it is still walked to its end
    const about = PROPS.filter((p) => (p.kind === "tree" || p.kind === "pine") && p.y < 9 && Math.abs(p.x - north.tiles[0][0]) < 14);
    expect(about.length).toBeGreaterThan(70);
    for (const p of about) expect(groundAt(p.x, p.y)).not.toBe("road");
    expect(findPath({ x: 32.5, y: 31.5 }, { x: north.tiles[0][0] + 0.5, y: north.tiles[0][1] + 0.5 })).not.toBeNull();
    // the forest's side: the gate is in a belt of woods, and the meadow opens beyond it
    expect(groundAt(forest.tiles[0][0] - 6, forest.tiles[0][1] - 2)).toBe("wood");
    expect(groundAt(forest.tiles[0][0] - 6, forest.tiles[0][1] - 11)).toBe("grass");
    expect(FOREST_PROPS.filter((p) => p.solid && p.y >= FOREST.y + 73 && p.y < FOREST.y + 78).length).toBeGreaterThan(150);
    // (thick woods, walked through only by the trail)
    expect(walkable(forest.tiles[0][0] - 6, forest.tiles[0][1] - 2)).toBe(false);
    expect(findPath(north.to, { x: forest.tiles[0][0] + 0.5, y: forest.tiles[0][1] - 9.5 })).not.toBeNull();
    // beyond each: ground to look at and trees on it, on no map, the path running on between them
    for (const [r, trees] of [[BEYOND.north, BEYOND_PROPS.north], [BEYOND.south, BEYOND_PROPS.south]] as const) {
      expect(trees.length).toBeGreaterThan(r.w * r.h * 0.35);
      for (const p of trees) {
        expect(placeOf(p.x, p.y)).toBeNull();
        expect(walkable(p.x, p.y)).toBe(false);
        expect(seenAt(p.x + 0.5, p.y + 0.5)).toBe(true);
        expect(groundLook(p.x + 0.5, p.y + 0.5)).toBe("wood");
      }
    }
    expect(BEYOND.north.y + BEYOND.north.h).toBe(0);
    expect(BEYOND.south.y).toBe(FOREST.y + FOREST.h);
    const across = (y: number, from: number, to: number) => Array.from({ length: (to - from) * 4 }, (_, i) => from + i / 4).filter((x) => groundLook(x, y) === "road");
    for (const y of [-2.5, -9.5]) { const way = across(y, BEYOND.north.x, BEYOND.north.x + BEYOND.north.w); expect(way.length).toBeGreaterThanOrEqual(6); expect(Math.abs(way[0] - north.tiles[0][0])).toBeLessThan(8); }
    for (const y of [3.5, 10.5]) expect(across(FOREST.y + FOREST.h + y, forest.tiles[0][0] - 4, forest.tiles[0][0] + 6).length).toBeGreaterThanOrEqual(6);
    expect(seenAt(32, 32)).toBe(true);
    expect(seenAt(-5, 32)).toBe(false);
    expect(findPath({ x: 33.5, y: 3.5 }, { x: 33.5, y: -1.5 })).toBeNull();
  });

  it("has logs round the forest camp's fire that are sat on like the town's benches", () => {
    const logs = BENCHES.filter((b) => b.kind === "logseat");
    expect(logs.length).toBe(4);
    // after the town's own, so that every bench's number is what it was
    expect(BENCHES.findIndex((b) => b.kind === "logseat")).toBe(BENCHES.length - 4);
    for (const b of logs) {
      expect(zoneAt(b.x, b.y)).toBe("camp");
      expect(benchAt(b.x, b.y)).toBe(BENCHES.indexOf(b));
      // each faces whoever looks on, and is walked up to from the fire's side
      expect(["SE", "SW"]).toContain(b.facing);
      const f = FRONT[b.facing!];
      expect(walkable(b.x + f.x, b.y + f.y)).toBe(true);
      expect(Math.max(Math.abs(b.x + f.x - CAMP.fire.x), Math.abs(b.y + f.y - CAMP.fire.y))).toBeLessThanOrEqual(2);
      expect(findPath(GATES[2].to, { x: b.x + f.x + 0.5, y: b.y + f.y + 0.5 })).not.toBeNull();
    }
  });

  it("finds a way across the whole forest quickly", () => {
    const [, , north] = GATES, t0 = performance.now();
    for (const [u, v] of [[90, 6], [4, 6], [86, 51], [8, 47]]) expect(findPath(north.to, { x: FOREST.x + u + 0.5, y: FOREST.y + v + 0.5 })).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(400);
  });

  it("puts the plaza in the middle and the fountain in the plaza", () => {
    expect(groundAt(PLAZA.x, PLAZA.y)).toBe("plaza");
    expect(groundAt(FOUNTAIN.x, FOUNTAIN.y)).toBe("plaza");
    expect([...Array(COLS).keys()].some((x) => groundAt(x, 2) === "road")).toBe(true);
    expect(groundAt(2, 2)).toBe("grass");
    expect(walkable(SHOP.x + 1, SHOP.y + 1)).toBe(false);
    expect(PLAZA.x >= TOWN.x && PLAZA.x + PLAZA.w <= TOWN.x + TOWN.w).toBe(true);
  });

  it("has benches facing every way, each with a free tile in front to sit down from", () => {
    expect(new Set(BENCHES.map((b) => b.facing))).toEqual(new Set(["SE", "SW", "NE", "NW"]));
    for (const [i, b] of BENCHES.entries()) {
      const f = FRONT[b.facing!];
      expect(walkable(b.x + f.x, b.y + f.y)).toBe(true);
      expect(benchAt(b.x, b.y)).toBe(i);
    }
  });

  it("finds a path around the fountain, never through it", () => {
    const path = findPath({ x: 29.5, y: 31.5 }, { x: 34.5, y: 31.5 })!;
    expect(path).not.toBeNull();
    expect(path.at(-1)).toEqual({ x: 34.5, y: 31.5 });
    for (const p of path) expect(walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
  });

  it("never cuts a corner past something solid", () => {
    const path = findPath({ x: 0.5, y: 0.5 }, { x: 17.5, y: 17.5 })!;
    let prev = { x: 0.5, y: 0.5 };
    for (const p of path) {
      const dx = Math.sign(p.x - prev.x), dy = Math.sign(p.y - prev.y);
      if (dx && dy) {
        expect(walkable(Math.floor(prev.x) + dx, Math.floor(prev.y))).toBe(true);
        expect(walkable(Math.floor(prev.x), Math.floor(prev.y) + dy)).toBe(true);
      }
      prev = p;
    }
  });

  it("refuses a destination nobody can stand on", () => {
    expect(findPath({ x: 0.5, y: 0.5 }, { x: FOUNTAIN.x + 1.5, y: FOUNTAIN.y + 1.5 })).toBeNull();
  });

  it("is the same path every time, so every client draws the same walk", () => {
    const a = JSON.stringify(findPath({ x: 29.5, y: 29.5 }, { x: 60.5, y: 31.5 }));
    const b = JSON.stringify(findPath({ x: 29.5, y: 29.5 }, { x: 60.5, y: 31.5 }));
    expect(JSON.parse(a)).not.toBeNull();
    expect(a).toBe(b);
  });

  it("walks a distance along the path and stops at the end", () => {
    const path = [{ x: 2.5, y: 0.5 }, { x: 2.5, y: 2.5 }];
    const half = stepAlong({ x: 0.5, y: 0.5 }, path, 1);
    expect(half.pos.x).toBeCloseTo(1.5);
    expect(half.path).toHaveLength(2);
    const end = stepAlong({ x: 0.5, y: 0.5 }, path, 99);
    expect(end.pos).toEqual({ x: 2.5, y: 2.5 });
    expect(end.path).toHaveLength(0);
  });
});

describe("hearing", () => {
  it("with distance: full up close, silent far away, and fades in between", () => {
    expect(hearing(0, true)).toBe(1);
    expect(hearing(NEAR, true)).toBe(1);
    expect(hearing(FAR, true)).toBe(0);
    expect(hearing(30, true)).toBe(0);
    const mid = hearing((NEAR + FAR) / 2, true);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it("without distance: everybody at full volume, wherever they stand", () => {
    expect(hearing(0, false)).toBe(1);
    expect(hearing(30, false)).toBe(1);
  });
});

describe("voice lines", () => {
  const me = { x: 9, y: 6 };
  const at = (id: string, d: number) => ({ id, pos: { x: 9 + d, y: 6 } });

  it("with distance: opens lines to people within earshot, not beyond", () => {
    const lines = pickLines(me, [at("near", 2), at("edge", FAR), at("far", FAR + 0.5)], new Set(), true);
    expect([...lines].sort()).toEqual(["edge", "near"]);
  });

  it("with distance: keeps an open line until somebody is past DROP, so the edge does not flap", () => {
    const keep = pickLines(me, [at("walking", FAR + 1)], new Set(["walking"]), true);
    expect(keep.has("walking")).toBe(true);
    const gone = pickLines(me, [at("walking", DROP + 0.1)], new Set(["walking"]), true);
    expect(gone.has("walking")).toBe(false);
  });

  it("with distance: opens no more than MAX_LINES, nearest first", () => {
    const crowd = Array.from({ length: 20 }, (_, i) => at(`p${String(i).padStart(2, "0")}`, 0.2 + i * 0.3));
    const lines = pickLines(me, crowd, new Set(), true);
    expect(lines.size).toBe(MAX_LINES);
    expect(lines.has("p00")).toBe(true);
    expect(lines.has("p19")).toBe(false);
  });

  it("without distance: a line to everybody in voice, however far", () => {
    const lines = pickLines(me, [at("near", 1), at("far", 30)], new Set(), false);
    expect([...lines].sort()).toEqual(["far", "near"]);
  });
});

describe("announcing steps", () => {
  it("is quick in a small room", () => {
    expect(moveEvery(2)).toBe(300);
    expect(moveEvery(6)).toBe(300);
  });

  it("keeps a whole room's steps within the budget, even if everybody clicks nonstop", () => {
    for (let n = 2; n <= 40; n++) {
      expect((n * (n - 1) * 1000) / moveEvery(n)).toBeLessThanOrEqual(MOVE_BUDGET);
    }
  });

  it("slows down as the room fills", () => {
    expect(moveEvery(30)).toBe(3480);
    expect(moveEvery(30)).toBeGreaterThan(moveEvery(20));
  });
});

describe("arriving", () => {
  it("puts the same person in the same walkable spot every time", () => {
    const a = spawnFor("00000000-0000-0000-0000-000000000001");
    expect(spawnFor("00000000-0000-0000-0000-000000000001")).toEqual(a);
    expect(walkable(Math.floor(a.x), Math.floor(a.y))).toBe(true);
    expect(a.x).toBeLessThan(COLS);
    expect(a.y).toBeLessThan(ROWS);
  });
});
describe("the deck and the cooking yard, finished or building sites", () => {
  const deckTile = PIER.deck.find(([x, y]) => { setBuilt(true); return fishFrom(x, y) !== null; })!;
  const stove = KITCHEN.places[0].at, floor = KITCHEN.floor[0];

  it("are finished in a test, as in next dev", () => {
    setBuilt(true);
    expect(isBuilt()).toBe(true);
    expect(onDeck(deckTile[0], deckTile[1])).toBe(true);
    expect(walkable(deckTile[0], deckTile[1])).toBe(true);
    expect(fishFrom(deckTile[0], deckTile[1])?.deep).toBe(true);
    expect(onYard(floor[0], floor[1])).toBe(true);
    expect(yardPlace(stove[0], stove[1])).not.toBeNull();
    expect(yardSeat(YARD_SEATS)).toBeDefined();
  });

  it("are sites for whoever the game is not open to: no deck to stand or fish on, no place to cook at, no seat", () => {
    try {
      setBuilt(false);
      expect(isBuilt()).toBe(false);
      expect(onDeck(deckTile[0], deckTile[1])).toBe(false);
      expect(thingAt(deckTile[0], deckTile[1])).not.toBeNull();
      expect(walkable(deckTile[0], deckTile[1])).toBe(false);
      // (where a line can be dropped from is worked out again: the deck's tiles are no longer places)
      expect(fishFrom(deckTile[0], deckTile[1])).toBeNull();
      expect(onYard(floor[0], floor[1])).toBe(false);
      expect(walkable(floor[0], floor[1])).toBe(false);
      expect(yardPlace(stove[0], stove[1])).toBeNull();
      expect(yardSeat(YARD_SEATS)).toBeUndefined();
      // the river's bank is a place to fish from all the same: the shallows
      let bank = 0;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const at = fishFrom(x, y); if (at) { expect(at.deep).toBe(false); bank++; } }
      expect(bank).toBeGreaterThan(20);
    } finally {
      setBuilt(true);
    }
    expect(fishFrom(deckTile[0], deckTile[1])?.deep).toBe(true);
    expect(walkable(deckTile[0], deckTile[1])).toBe(true);
  });
});
