import { describe, expect, it } from "vitest";
import {
  BENCHES, BOARD, COLS, DROP, KEEPERS, KITCHEN, ROADWORKS, FAR, FOUNTAIN, FRONT, MAX_LINES, MOVE_BUDGET, NEAR, PIER, PLAZA, PROPS, ROWS, SHOP, TOWN, benchAt, findPath, fromIso, groundAt, hearing,
  groundLook, moveEvery, pickLines, spawnFor, stepAlong, thingAt, toIso, walkable,
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
    for (const p of PROPS) if (!["lamp", "bench", "barrel", "planter", "signpost", "bin", "flowerbed"].includes(p.kind)) expect(groundAt(p.x, p.y)).toBe("grass");
    // and nothing at all stands on a path
    for (const p of PROPS) expect(groundAt(p.x, p.y)).not.toBe("road");
    // every bit of path is walkable, but where the road works close it (and the shop, on its dirt plot)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (groundAt(x, y) === "road") expect(walkable(x, y) || thingAt(x, y) === "roadworks" || thingAt(x, y) === "shop").toBe(true);
    }
    // and the north and east paths go out to the road works; the river stops the other two
    const n = ROADWORKS.find((w) => w.arm === "N")!, e = ROADWORKS.find((w) => w.arm === "E")!;
    expect(findPath({ x: 32.5, y: 31.5 }, { x: Math.floor(n.x) + 0.5, y: 2.5 })).not.toBeNull();
    expect(findPath({ x: 32.5, y: 31.5 }, { x: COLS - 2.5, y: Math.floor(e.y) + 0.5 })).not.toBeNull();
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

  it("closes the north and east paths with road works at the map's edge", () => {
    expect(ROADWORKS.map((w) => w.arm)).toEqual(["N", "E"]);
    for (const w of ROADWORKS) {
      expect(groundAt(Math.floor(w.x), Math.floor(w.y))).toBe("road");
      expect(thingAt(Math.floor(w.x), Math.floor(w.y))).toBe("roadworks");
    }
    // nobody gets past them along the path
    const n = ROADWORKS[0], e = ROADWORKS[1];
    expect(findPath({ x: 32.5, y: 31.5 }, { x: Math.floor(n.x) + 0.5, y: 0.5 })).toBeNull();
    expect(findPath({ x: 32.5, y: 31.5 }, { x: COLS - 0.5, y: Math.floor(e.y) + 0.5 })).toBeNull();
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
      expect(walkable(x, y)).toBe(false);
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

  it("builds the fishing deck on the town's bank, between the west and south paths and on neither", () => {
    expect(PIER.tiles.length).toBeGreaterThan(60);
    const kinds = new Set<string>();
    for (const [x, y] of PIER.tiles) {
      expect(thingAt(x, y)).toBe("pier");
      kinds.add(groundAt(x, y));
    }
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
    for (const p of PROPS) {
      expect(thingAt(p.x, p.y)).not.toBe("pier");
      if (p.kind === "tree" || p.kind === "bush") expect(p.x >= x0 - 1 && p.x <= x1 + 2 && p.y >= y0 - 1 && p.y <= y1 + 2).toBe(false);
    }
    // people walk up to it: behind it, to where its steps will be (from the south path, which stays clear beside it), and in front
    for (const [x, y] of [[x0 + 6.5, y0 - 0.5], [x1 + 1.5, y0 + 2.5], [x0 + 8.5, y1 + 1.5]])
      expect(findPath({ x: 32.5, y: 31.5 }, { x, y })).not.toBeNull();
    for (let y = y0; y <= y1; y++) expect(walkable(x1 + 1, y) || walkable(x1 + 2, y) || walkable(x1 + 3, y)).toBe(true);
    // the west path's end, where the deck first stood, is clear again
    expect(walkable(13, 31)).toBe(true);
  });

  it("builds the cooking yard below the plaza, lying across the screen, clear of the east and south paths", () => {
    // twice as long and twice as deep as the first one drawn (which closed some forty tiles)
    expect(KITCHEN.tiles.length).toBeGreaterThan(140);
    for (const [x, y] of KITCHEN.tiles) {
      expect(thingAt(x, y)).toBe("kitchen");
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
