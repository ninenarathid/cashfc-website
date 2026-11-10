import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/*
 * The barns of 8 and 16 and the yard behind each (the owner, 2026-11-10: "ข ดีกว่า ทำเลย"; lib/town/pasture's yard), on
 * both farms: the editor's (live since 2026-11-08), loaded here as a page with `farmMap=farm2` loads it, and the first
 * one (the backup), as every other test has it.
 */
type Pasture = typeof import("./pasture");
type World = typeof import("./world");
type Farm2 = typeof import("./farm2");

for (const map of ["farm2", "classic"] as const) {
  describe(`a barn's yard on the ${map === "farm2" ? "editor's" : "first"} farm`, () => {
    let P: Pasture, W: World, F: Farm2;
    beforeAll(async () => {
      vi.resetModules();
      (globalThis as { __cashTownFarm?: string }).__cashTownFarm = map;
      P = await import("./pasture");
      W = await import("./world");
      F = await import("./farm2");
      await import("./pasture-garden");
    });
    afterAll(() => { P.setYards([]); delete (globalThis as { __cashTownFarm?: string }).__cashTownFarm; vi.resetModules(); });
    const all16 = () => P.BARNS.map((b) => ({ barn: b.i, room: 16 }));

    it("is two rows deep at 8 and as deep as the ground behind allows at 16, the six short barns two", () => {
      expect(P.yardRowsOf(5, 4)).toBe(0);
      expect(P.yardRowsOf(5, 8)).toBe(2);
      expect(P.yardRowsOf(5, 16)).toBe(4);
      for (const i of [0, 1, 2, 3, 14, 15]) expect(P.yardRowsOf(i, 16), `barn ${i + 1}`).toBe(map === "farm2" ? 2 : P.YARD_MOST[i]);
      if (map !== "farm2") return;
      // (the table is the map's: every row of a yard at its most is ground of the pasture, not a lane; past it, for the six
      // short ones, the lane)
      for (const b of P.BARNS) {
        const most = P.YARD_MOST[b.i];
        for (let y = b.y - most; y < b.y; y++) for (let x = b.x; x < b.x + b.w; x++) {
          expect(F.f2TileGround(x, y), `barn ${b.i + 1} ${x},${y}`).not.toBe("road");
          expect(P.inPasture(x, y)).toBe(true);
          expect(P.barnAt(x, y)).toBe(-1);
        }
        if (most < 4) expect(Array.from({ length: b.w }, (_, k) => F.f2TileGround(b.x + k, b.y - most - 1)).includes("road"), `the lane behind barn ${b.i + 1}`).toBe(true);
      }
    });

    it("is walked into only through its gate, from the strip beside the barn, and the barn's back wall stays a wall", () => {
      P.setYards(all16());
      try {
        for (const b of P.BARNS) {
          const rows = P.yardRowsOf(b.i, 16), g = P.yardGate(b);
          for (let y = b.y - rows; y < b.y; y++) for (let x = b.x; x < b.x + b.w; x++) {
            expect(P.yardAt(x, y)).toBe(b.i);
            expect(W.walkable(x, y), `barn ${b.i + 1} yard ${x},${y}`).toBe(true);
          }
          expect(W.walkable(g.outside[0], g.outside[1]), `barn ${b.i + 1}'s gate, outside`).toBe(true);
          // (a way from the lane in front to the yard's far corner goes through the gate, crossing no wall or fence)
          const from = { x: b.x + 5.5, y: b.y + b.h + 1.5 }, way = W.findPath(from, { x: b.x + 0.5, y: b.y - rows + 0.5 });
          expect(way, `barn ${b.i + 1}`).not.toBeNull();
          let was = { x: Math.floor(from.x), y: Math.floor(from.y) };
          for (const p of way!) { const t = { x: Math.floor(p.x), y: Math.floor(p.y) }; expect(P.barnWall(was.x, was.y, t.x, t.y), `barn ${b.i + 1} ${was.x},${was.y}>${t.x},${t.y}`).toBe(false); was = t; }
          expect(way!.some((p) => Math.floor(p.x) === g.inside[0] && Math.floor(p.y) === g.inside[1])).toBe(true);
          // (its fences elsewhere, and the barn's back wall)
          expect(P.barnWall(g.outside[0], g.outside[1], g.inside[0], g.inside[1])).toBe(false);
          expect(P.barnWall(b.x - 1, b.y - 1, b.x, b.y - 1)).toBe(true);
          expect(P.barnWall(b.x + b.w, b.y - rows, b.x + b.w - 1, b.y - rows)).toBe(true);
          expect(P.barnWall(b.x + 2, b.y - rows - 1, b.x + 2, b.y - rows)).toBe(true);
          expect(P.barnWall(b.x + 2, b.y - 1, b.x + 2, b.y)).toBe(true);
          expect(P.barnWall(g.outside[0], g.outside[1] - 1, g.inside[0], g.inside[1])).toBe(true);
          // (the gate's open leaf, along the north edge of the tile inside it)
          expect(P.barnWall(g.inside[0], g.inside[1], g.inside[0], g.inside[1] - 1)).toBe(true);
          expect(P.barnWall(g.inside[0] - 1, g.inside[1] - 1, g.inside[0], g.inside[1])).toBe(true);
          expect(P.barnWall(g.inside[0], g.inside[1], g.inside[0] - 1, g.inside[1])).toBe(false);
        }
      } finally { P.setYards([]); }
      // (no yard built: nothing of it stands, and the ground behind a barn is as the map has it)
      expect(P.yardAt(P.BARNS[5].x + 1, P.BARNS[5].y - 1)).toBe(-1);
      expect(P.barnWall(P.BARNS[5].x - 1, P.BARNS[5].y - 1, P.BARNS[5].x, P.BARNS[5].y - 1)).toBe(false);
    });

    it("stands its animals apart at rest: the floor's in one row up to 8 or two at 16, the yard's in its rows, each with its tray behind it", () => {
      for (const b of P.BARNS) for (const room of [2, 4, 8, 16]) {
        const spots = P.barnSpots(b, room), rows = P.yardRowsOf(b.i, room);
        P.setYards([{ barn: b.i, room }]);
        expect(spots.length).toBe(room);
        expect(spots.filter((p) => !p.yard).length).toBe(P.floorOf(b.i, room));
        expect(spots.filter((p) => p.yard).length).toBe(room <= 4 ? 0 : room === 8 || rows < 4 ? 4 : 8);
        for (const [i, p] of spots.entries()) {
          if (p.yard) { expect(P.yardAt(p.at.x, p.at.y), `barn ${b.i + 1} at ${room}: place ${i}`).toBe(b.i); expect(P.yardAt(p.tray.x, p.tray.y)).toBe(b.i); expect(p.at.y).toBeGreaterThan(b.y - rows); }
          else { expect(P.barnAt(p.at.x, p.at.y)).toBe(b.i); expect(p.trayYard ? P.yardAt(p.tray.x, p.tray.y) : P.barnAt(p.tray.x, p.tray.y)).toBe(b.i); }
          // (never on the gate's tile, the hay or the nest)
          const t = [Math.floor(p.at.x), Math.floor(p.at.y)], g = P.yardGate(b);
          for (const [x, y] of [g.inside, b.hay, b.nest]) expect(t[0] === x && t[1] === y, `barn ${b.i + 1} place ${i} on ${x},${y}`).toBe(false);
        }
        const near = Math.min(...spots.flatMap((p, i) => spots.slice(i + 1).map((q) => Math.hypot(p.at.x - q.at.x, p.at.y - q.at.y))));
        if (room > 1) expect(near, `barn ${b.i + 1} at ${room}`).toBeGreaterThanOrEqual(room <= 4 ? 1.7 : rows < 4 && room === 16 ? 1.0 : 1.4);
      }
      P.setYards([]);
    });

    it("rests its yard's animals in the yard, the floor's in the barn, by day and by night, door shut", () => {
      const T = Date.UTC(2026, 10, 10, 3, 0, 0), night = Date.UTC(2026, 10, 10, 15, 0, 0), door: Array<[number, number | null]> = [[T - 50 * 3_600_000, T - 40 * 3_600_000]];
      P.setYards(all16());
      try {
        for (const b of P.BARNS.filter((_, i) => i % 5 === 0)) for (let slot = 0; slot < 16; slot++) for (const now of [T, night]) {
          const s = P.animalSpot({ id: `cow-${b.i}-${slot}`, species: "cow", young: false }, b.i, slot, door, now, undefined, 16);
          const yard = P.barnSpots(b, 16)[slot].yard;
          expect(yard ? P.yardAt(s.x, s.y) : P.barnAt(s.x, s.y), `barn ${b.i + 1} slot ${slot}`).toBe(b.i);
          expect(s.inside).toBe(yard ? -1 : b.i);
        }
      } finally { P.setYards([]); }
    });

    it("lets its yard's animals out through the gate and down the strip to the lane, crossing no wall, as the floor's go out of the door", () => {
      P.setYards(all16());
      try {
        for (const room of [8, 16]) for (const w of P.waysOut(room)) for (const pts of w.pts.slice(0, 3)) {
          let was = { x: Math.floor(pts[0].x), y: Math.floor(pts[0].y) };
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], z = pts[i], n = Math.max(1, Math.ceil(Math.hypot(z.x - a.x, z.y - a.y) * 4));
            for (let k = 1; k <= n; k++) {
              const t = { x: Math.floor(a.x + ((z.x - a.x) * k) / n), y: Math.floor(a.y + ((z.y - a.y) * k) / n) };
              if (t.x === was.x && t.y === was.y) continue;
              expect(P.barnWall(was.x, was.y, t.x, t.y), `barn ${w.barn + 1} slot ${w.slot} (${room}) ${was.x},${was.y}>${t.x},${t.y}`).toBe(false);
              was = t;
            }
          }
          if (w.yard) { const g = P.yardGate(P.BARNS[w.barn]); expect(pts.some((p) => Math.floor(p.x) === g.outside[0] && Math.floor(p.y) === g.outside[1])).toBe(true); }
        }
      } finally { P.setYards([]); }
    });

    it("closes no tile that the town's pinned things stand on (eggs, forage, lamps, benches, wells, chests), and its haunts are reached by the gate", async () => {
      if (map !== "farm2") return;
      P.setYards(all16());
      try {
        const inYard = ([x, y]: readonly [number, number]) => P.yardAt(x, y) >= 0;
        for (const s of [...P.EGG_SPOTS, ...P.MEADOW_SPOTS]) expect(inYard(s), `spot ${s}`).toBe(false);
        for (const l of F.F2_LAMPS) expect(inYard([l.x, l.y]), `lamp ${l.x},${l.y}`).toBe(false);
        for (const b of F.F2_BENCHES) expect(inYard([b.x, b.y]), `bench ${b.x},${b.y}`).toBe(false);
        for (const w of F.F2_WELLS) expect(inYard([w.x, w.y])).toBe(false);
        for (const c of F.F2_CHESTS) for (const t of c.tiles) expect(inYard(t)).toBe(false);
        for (const f of F.F2_FIRES) expect(inYard([f.x, f.y])).toBe(false);
        for (const s of F.F2_SCARECROWS) expect(inYard([s.x, s.y])).toBe(false);
        // (one haunt of the insects', number 30, has perches where barn 14's yard is at 16: they stay to be walked to, by the gate)
        const { HAUNTS } = await import("./insects");
        const caught = HAUNTS.filter((h) => inYard([h.x, h.y]) || h.perches.some((p) => inYard([p.x, p.y])));
        expect(caught.map((h) => h.id)).toEqual([30]);
        for (const p of caught[0].perches.filter((q) => inYard([q.x, q.y]))) {
          expect(W.walkable(Math.floor(p.x), Math.floor(p.y))).toBe(true);
          expect(W.findPath({ x: 236.5, y: 68.5 }, { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 }), `perch ${p.x},${p.y}`).not.toBeNull();
        }
      } finally { P.setYards([]); }
    });
  });
}
