import { describe, expect, it } from "vitest";
import { CAVE_SIZE, caveFloor, depthOf, isRest } from "./cave";
import { CAVE_AT, cornerOf, floorAtTile, floorRocks, floorSpots, floorTile } from "./cave-state";
import { catalogOf } from "./catalog";
import { giftsOf } from "./gifts";
import { ITEMS } from "./items";
import { MINING, oreOf } from "./mining";
import { caveLayout, miningRow } from "./mining-row";
import { POUCHES } from "./pouches";
import { ELEMENTS, GEM_FX, LEVELS, OPTIONS, OPTION_IDS, ORES } from "./tools";
import { VEIN } from "./vein";

describe("what the database is told of mining", () => {
  const row = miningRow();

  it("is a row of the catalog, and a document of plain numbers, words and lists", () => {
    expect(catalogOf().mining).toEqual(row);
    expect(JSON.parse(JSON.stringify(row))).toEqual(row);
  });

  it("has every knob of the miners' as the code names it, and the vein's whole", () => {
    for (const k of Object.keys(MINING) as Array<keyof typeof MINING>) expect(row[k], k).toEqual(MINING[k]);
    expect(row.vein).toEqual(VEIN);
    expect(row.ores).toEqual(ORES);
    expect(row.at).toEqual({ ...CAVE_AT, size: CAVE_SIZE });
    for (const id of [row.mushroom, row.torch, ...row.ores.flatMap((o) => [o.shard, o.ore])]) expect(id in ITEMS, id).toBe(true);
  });

  it("says which floors rest and which depth a floor is in, as the cave does", () => {
    for (let n = -1; n <= 64; n++) {
      expect(n > 0 && n % row.rest === 0, `rest ${n}`).toBe(isRest(n));
      expect(row.depths.filter((last) => n > last).length, `depth ${n}`).toBe(depthOf(n));
    }
    // (read as the database reads it: the fragments a place's rocks leave are the ore's of its depth)
    for (let n = 0; n <= MINING.floors; n++) expect(row.ores[n <= 0 ? 0 : row.depths.filter((last) => n > last).length].shard, `ore ${n}`).toBe(oreOf(n));
    expect(row.hardness.depth.length).toBe(row.depths.length + 1);
  });

  it("has the pick as the miners' game reads it: its levels, its own options, what each gem does", () => {
    expect(row.pick.power).toEqual(LEVELS.pick.power);
    expect(row.pick.strikes).toEqual(LEVELS.pick.strikes);
    const mine = OPTION_IDS.filter((id) => (OPTIONS[id].tools as readonly string[]).includes("pick"));
    expect(Object.keys(row.pick.opts).sort()).toEqual([...mine].sort());
    for (const id of mine) expect(row.pick.opts[id], id).toEqual({ pool: OPTIONS[id].pool, n: OPTIONS[id].n, ...("use" in OPTIONS[id] ? { use: (OPTIONS[id] as { use: unknown }).use } : {}) });
    for (const e of ELEMENTS) expect(row.pick.gems[e], e).toEqual(GEM_FX[e].pick);
  });

  it("has the pouches in the order things are put into them, each a gift there is, holding things there are", () => {
    const all = catalogOf();
    expect(all.pouches).toEqual(POUCHES.map((p) => ({ gift: p.gift, slots: p.slots, holds: [...p.holds] })));
    for (const p of all.pouches) {
      expect(p.gift in all.gifts.gifts, p.gift).toBe(true);
      for (const id of p.holds) expect(id in all.items, id).toBe(true);
      // (and whoever has the gift is read as having it)
      expect(giftsOf({ gifts: { had: [p.gift], charms: [], owed: 0, familiar: null, used: {} } } as never).had).toEqual([p.gift]);
    }
  });
});

describe("a floor of the cave as the database keeps it", () => {
  const DAYS = [20_735, 20_736, 20_800];

  it("is the floor the rules read, tile for tile, in the world's tiles", () => {
    for (const day of DAYS.slice(0, 2)) for (const floor of [1, 9, 10, 11, 20, 28, 30]) {
      const l = caveLayout(floor, day), c = cornerOf(floor);
      expect(JSON.parse(JSON.stringify(l))).toEqual(l);
      expect(l.rocks.map(([id, x, y, look]) => ({ id, x, y, look }))).toEqual(floorRocks(floor, day));
      expect(l.open.length).toBe(CAVE_SIZE * CAVE_SIZE);
      expect(/^[012]+$/.test(l.open)).toBe(true);
      // (every tile is the layout's own; and as the database reads one, the character at its place in the row by row
      // string, a tile is floor to stand on where the rules say it is: asked of a tile in seven, the rule lays the
      // floor out anew each time it is asked)
      expect(l.open).toBe(Array.from(caveFloor(floor, day).open).join(""));
      for (let k = (floor + day) % 7; k < CAVE_SIZE * CAVE_SIZE; k += 7) {
        const u = k % CAVE_SIZE, v = Math.floor(k / CAVE_SIZE);
        if ((l.open[k] === "1") !== floorTile(floor, day, c.x + u, c.y + v)) throw new Error(`floor ${floor}, day ${day}, tile ${u},${v}`);
      }
      const spots = floorSpots(floor, day);
      expect({ up: l.up, arrive: l.arrive, down: l.down, ...(l.lift ? { lift: l.lift, liftAt: l.liftAt } : {}) }).toEqual(spots);
      expect(!!l.lift).toBe(isRest(floor));
      // (a resting floor has no rock, every other floor some)
      expect(l.rocks.length > 0).toBe(!isRest(floor));
      for (const [, x, y] of l.rocks) expect(floorAtTile(x, y)).toBe(floor);
    }
  });

  it("is the same whoever makes it, another the next day, and a resting floor's the same every day", () => {
    expect(caveLayout(7, DAYS[0])).toEqual(caveLayout(7, DAYS[0]));
    expect(caveLayout(7, DAYS[0])).not.toEqual(caveLayout(7, DAYS[1]));
    expect(caveLayout(20, DAYS[0])).toEqual(caveLayout(20, DAYS[2]));
  });
});
